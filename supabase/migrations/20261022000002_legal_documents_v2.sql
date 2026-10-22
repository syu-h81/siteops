-- Store immutable published legal-document content in PostgreSQL and provide
-- an optimistic, concurrency-safe consent RPC. Existing rows remain legacy
-- until their exact source content has been verified and backfilled.

do $$
begin
  if current_setting('server_encoding') <> 'UTF8' then
    raise exception 'legal document storage requires UTF8 server encoding';
  end if;
end;
$$;

alter table public.legal_document_versions
  add column content_markdown text,
  add column publication_status text not null default 'legacy';

alter table public.legal_document_versions
  add constraint legal_document_versions_publication_status_check
    check (publication_status in ('legacy', 'published')),
  add constraint legal_document_versions_published_content_check
    check (
      publication_status = 'legacy'
      or (
        content_markdown is not null
        and content_markdown ~ '[^[:space:]]'
        and octet_length(content_markdown) <= 1048576
        and position(chr(13) in content_markdown) = 0
        and right(content_markdown, 1) = E'\n'
        and (
          octet_length(content_markdown) = 1
          or right(content_markdown, 2) <> E'\n\n'
        )
        and version !~* 'draft'
        and content_path !~* 'draft'
        and content_hash = pg_catalog.encode(
          extensions.digest(
            pg_catalog.convert_to(content_markdown, 'UTF8'),
            'sha256'
          ),
          'hex'
        )
      )
    ),
  add constraint legal_document_versions_current_published_check
    check (not is_current or publication_status = 'published') not valid;

comment on column public.legal_document_versions.content_markdown is
  'Immutable Markdown body for a formally published legal document.';
comment on column public.legal_document_versions.publication_status is
  'legacy preserves pre-v2 rows; published identifies immutable formal documents.';
comment on column public.legal_document_versions.content_path is
  'Repository-relative provenance path. Runtime rendering uses content_markdown.';

create or replace function public.lock_legal_document_versions()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('siteops:legal-document-versions', 0)
  );
  return null;
end;
$$;

revoke all on function public.lock_legal_document_versions()
from public, anon, authenticated, service_role;

create trigger legal_document_versions_00_lock_mutations
before insert or update or delete or truncate
on public.legal_document_versions
for each statement execute function public.lock_legal_document_versions();

create or replace function public.prepare_legal_document_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.publication_status = 'published' then
    if new.id is distinct from old.id
      or new.document_type is distinct from old.document_type
      or new.version is distinct from old.version
      or new.published_at is distinct from old.published_at
      or new.effective_at is distinct from old.effective_at
      or new.content_path is distinct from old.content_path
      or new.content_markdown is distinct from old.content_markdown
      or new.content_hash is distinct from old.content_hash
      or new.publication_status is distinct from old.publication_status
      or new.created_at is distinct from old.created_at then
      raise exception 'published legal documents are immutable'
        using errcode = '23514';
    end if;
  end if;

  if new.publication_status = 'published' and new.content_markdown is not null then
    new.content_hash := pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(new.content_markdown, 'UTF8'),
        'sha256'
      ),
      'hex'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.prepare_legal_document_version()
from public, anon, authenticated, service_role;

create trigger legal_document_versions_prepare
before insert or update on public.legal_document_versions
for each row execute function public.prepare_legal_document_version();

create or replace function public.prevent_published_legal_document_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.publication_status = 'published' then
    raise exception 'published legal documents cannot be deleted'
      using errcode = '23514';
  end if;

  return old;
end;
$$;

revoke all on function public.prevent_published_legal_document_delete()
from public, anon, authenticated, service_role;

create trigger legal_document_versions_prevent_published_delete
before delete on public.legal_document_versions
for each row execute function public.prevent_published_legal_document_delete();

create or replace function public.prevent_legal_document_versions_truncate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'legal document history cannot be truncated'
    using errcode = '23514';
end;
$$;

revoke all on function public.prevent_legal_document_versions_truncate()
from public, anon, authenticated, service_role;

create trigger legal_document_versions_prevent_truncate
before truncate on public.legal_document_versions
for each statement execute function public.prevent_legal_document_versions_truncate();

create or replace function public.set_current_legal_document(
  p_document_type text,
  p_document_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_is_published boolean;
begin
  if p_document_type not in ('terms', 'privacy') then
    raise exception 'invalid legal document type' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('siteops:legal-document-versions', 0)
  );

  perform 1
  from public.legal_document_versions as document
  where document.document_type = p_document_type
    and (document.is_current or document.id = p_document_id)
  order by document.id
  for update;

  select document.publication_status = 'published'
  into target_is_published
  from public.legal_document_versions as document
  where document.id = p_document_id
    and document.document_type = p_document_type;

  if target_is_published is distinct from true then
    raise exception 'target legal document is not published'
      using errcode = 'P0001';
  end if;

  update public.legal_document_versions as document
  set is_current = false
  where document.document_type = p_document_type
    and document.is_current;

  update public.legal_document_versions as document
  set is_current = true
  where document.id = p_document_id
    and document.document_type = p_document_type;

  if not found then
    raise exception 'target legal document was not found'
      using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.set_current_legal_document(text, uuid)
from public, anon, authenticated, service_role;

create or replace function public.accept_legal_documents(
  p_terms_document_id uuid,
  p_terms_content_hash text,
  p_privacy_document_id uuid,
  p_privacy_content_hash text
)
returns table (
  document_type text,
  document_version_id uuid,
  content_hash text,
  accepted_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  matched_document_count integer;
  consent_time timestamptz := pg_catalog.now();
begin
  if current_user_id is null then
    raise exception 'authentication is required' using errcode = '42501';
  end if;

  if p_terms_document_id is null
    or p_privacy_document_id is null
    or p_terms_content_hash !~ '^[0-9a-f]{64}$'
    or p_privacy_content_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid legal document expectations'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('siteops:legal-document-versions', 0)
  );

  select count(*)
  into matched_document_count
  from (
    select document.id
    from public.legal_document_versions as document
    where (
        document.document_type = 'terms'
        and document.id = p_terms_document_id
        and document.content_hash = p_terms_content_hash
      )
      or (
        document.document_type = 'privacy'
        and document.id = p_privacy_document_id
        and document.content_hash = p_privacy_content_hash
      )
    order by document.document_type, document.id
    for share
  ) as locked_document
  inner join public.legal_document_versions as document
    on document.id = locked_document.id
  where document.publication_status = 'published'
    and document.is_current
    and document.published_at <= consent_time
    and document.effective_at <= consent_time
    and document.content_markdown is not null
    and document.content_hash = pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(document.content_markdown, 'UTF8'),
        'sha256'
      ),
      'hex'
    );

  if matched_document_count <> 2 then
    raise exception 'legal documents do not match the current published versions'
      using errcode = 'P0001';
  end if;

  insert into public.user_legal_consents (user_id, document_version_id)
  values
    (current_user_id, p_terms_document_id),
    (current_user_id, p_privacy_document_id)
  on conflict on constraint user_legal_consents_user_id_document_version_id_key
  do nothing;

  return query
  select
    document.document_type,
    consent.document_version_id,
    document.content_hash,
    consent.accepted_at
  from public.user_legal_consents as consent
  inner join public.legal_document_versions as document
    on document.id = consent.document_version_id
  where consent.user_id = current_user_id
    and consent.document_version_id in (
      p_terms_document_id,
      p_privacy_document_id
    )
  order by document.document_type;
end;
$$;

revoke all on function public.accept_legal_documents(uuid, text, uuid, text)
from public, anon, authenticated, service_role;

grant execute on function public.accept_legal_documents(uuid, text, uuid, text)
to authenticated;

drop policy if exists legal_document_versions_select_published
on public.legal_document_versions;

create policy legal_document_versions_select_published
on public.legal_document_versions for select to anon, authenticated
using (
  publication_status = 'published'
  and published_at <= now()
);
