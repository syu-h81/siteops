-- Only an already published, effective, and internally consistent legal
-- document may become current. Keep the lock order shared with the consent RPC:
-- transaction advisory lock, ordered row locks, validation, then updates.

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
  activation_time timestamptz := pg_catalog.now();
  target_is_eligible boolean;
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

  select
    document.publication_status = 'published'
    and document.published_at <= activation_time
    and document.effective_at <= activation_time
    and document.content_markdown is not null
    and document.content_markdown ~ '[^[:space:]]'
    and pg_catalog.octet_length(document.content_markdown) <= 1048576
    and pg_catalog.strpos(document.content_markdown, pg_catalog.chr(13)) = 0
    and pg_catalog.right(document.content_markdown, 1) = E'\n'
    and (
      pg_catalog.octet_length(document.content_markdown) = 1
      or pg_catalog.right(document.content_markdown, 2) <> E'\n\n'
    )
    and document.content_hash = pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(document.content_markdown, 'UTF8'),
        'sha256'
      ),
      'hex'
    )
  into target_is_eligible
  from public.legal_document_versions as document
  where document.id = p_document_id
    and document.document_type = p_document_type;

  if target_is_eligible is distinct from true then
    raise exception 'target legal document is not eligible to become current'
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
