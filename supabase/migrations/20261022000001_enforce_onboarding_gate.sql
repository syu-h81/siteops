-- Require acceptance of both current legal documents before organization creation.

drop policy if exists organizations_insert_own on public.organizations;

create policy organizations_insert_own
on public.organizations for insert to authenticated
with check (
  owner_user_id = (select auth.uid())
  and (
    select count(distinct document.document_type)
    from public.legal_document_versions as document
    inner join public.user_legal_consents as consent
      on consent.document_version_id = document.id
    where document.document_type in ('terms', 'privacy')
      and document.is_current
      and document.published_at <= now()
      and document.effective_at <= now()
      and consent.user_id = (select auth.uid())
  ) = 2
);
