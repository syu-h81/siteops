-- Require acceptance of both current published legal documents for every
-- business-data operation. Legal-document viewing and consent remain available.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;

create or replace function private.has_current_legal_consents()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    auth.uid() is not null
    and (
      select count(distinct document.document_type) = 2
      from public.legal_document_versions as document
      inner join public.user_legal_consents as consent
        on consent.document_version_id = document.id
      where document.document_type in ('terms', 'privacy')
        and document.publication_status = 'published'
        and document.is_current
        and document.published_at <= pg_catalog.now()
        and document.effective_at <= pg_catalog.now()
        and consent.user_id = auth.uid()
    );
$$;

revoke all on function private.has_current_legal_consents()
from public, anon, authenticated, service_role;
grant execute on function private.has_current_legal_consents()
to authenticated;

revoke all on function public.accept_current_legal_documents()
from public, anon, authenticated, service_role;

revoke all on function public.accept_legal_documents(uuid, text, uuid, text)
from public, anon, authenticated, service_role;
grant execute on function public.accept_legal_documents(uuid, text, uuid, text)
to authenticated;

drop policy if exists organizations_select_own on public.organizations;
drop policy if exists organizations_insert_own on public.organizations;
drop policy if exists organizations_update_own on public.organizations;

create policy organizations_select_own
on public.organizations for select to authenticated
using (
  (select private.has_current_legal_consents())
  and owner_user_id = (select auth.uid())
);

create policy organizations_insert_own
on public.organizations for insert to authenticated
with check (
  (select private.has_current_legal_consents())
  and owner_user_id = (select auth.uid())
);

create policy organizations_update_own
on public.organizations for update to authenticated
using (
  (select private.has_current_legal_consents())
  and owner_user_id = (select auth.uid())
)
with check (
  (select private.has_current_legal_consents())
  and owner_user_id = (select auth.uid())
);

drop policy if exists clients_select_own_organization on public.clients;
drop policy if exists clients_insert_own_organization on public.clients;
drop policy if exists clients_update_own_organization on public.clients;
drop policy if exists clients_delete_own_organization on public.clients;

create policy clients_select_own_organization
on public.clients for select to authenticated
using (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = clients.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy clients_insert_own_organization
on public.clients for insert to authenticated
with check (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = clients.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy clients_update_own_organization
on public.clients for update to authenticated
using (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = clients.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
)
with check (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = clients.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy clients_delete_own_organization
on public.clients for delete to authenticated
using (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = clients.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

drop policy if exists sites_select_own_organization on public.sites;
drop policy if exists sites_insert_own_organization on public.sites;
drop policy if exists sites_update_own_organization on public.sites;
drop policy if exists sites_delete_own_organization on public.sites;

create policy sites_select_own_organization
on public.sites for select to authenticated
using (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = sites.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy sites_insert_own_organization
on public.sites for insert to authenticated
with check (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = sites.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy sites_update_own_organization
on public.sites for update to authenticated
using (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = sites.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
)
with check (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = sites.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy sites_delete_own_organization
on public.sites for delete to authenticated
using (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = sites.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

drop policy if exists site_services_select_own_organization on public.site_services;
drop policy if exists site_services_insert_own_organization on public.site_services;
drop policy if exists site_services_update_own_organization on public.site_services;
drop policy if exists site_services_delete_own_organization on public.site_services;

create policy site_services_select_own_organization
on public.site_services for select to authenticated
using (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = site_services.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy site_services_insert_own_organization
on public.site_services for insert to authenticated
with check (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = site_services.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy site_services_update_own_organization
on public.site_services for update to authenticated
using (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = site_services.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
)
with check (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = site_services.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy site_services_delete_own_organization
on public.site_services for delete to authenticated
using (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = site_services.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

drop policy if exists maintenance_contracts_select_own_organization
on public.maintenance_contracts;
drop policy if exists maintenance_contracts_insert_own_organization
on public.maintenance_contracts;
drop policy if exists maintenance_contracts_update_own_organization
on public.maintenance_contracts;
drop policy if exists maintenance_contracts_delete_own_organization
on public.maintenance_contracts;

create policy maintenance_contracts_select_own_organization
on public.maintenance_contracts for select to authenticated
using (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_contracts.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy maintenance_contracts_insert_own_organization
on public.maintenance_contracts for insert to authenticated
with check (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_contracts.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy maintenance_contracts_update_own_organization
on public.maintenance_contracts for update to authenticated
using (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_contracts.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
)
with check (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_contracts.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy maintenance_contracts_delete_own_organization
on public.maintenance_contracts for delete to authenticated
using (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_contracts.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

drop policy if exists maintenance_tasks_select_own_organization
on public.maintenance_tasks;
drop policy if exists maintenance_tasks_insert_own_organization
on public.maintenance_tasks;
drop policy if exists maintenance_tasks_update_own_organization
on public.maintenance_tasks;
drop policy if exists maintenance_tasks_delete_own_organization
on public.maintenance_tasks;

create policy maintenance_tasks_select_own_organization
on public.maintenance_tasks for select to authenticated
using (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_tasks.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy maintenance_tasks_insert_own_organization
on public.maintenance_tasks for insert to authenticated
with check (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_tasks.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy maintenance_tasks_update_own_organization
on public.maintenance_tasks for update to authenticated
using (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_tasks.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
)
with check (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_tasks.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy maintenance_tasks_delete_own_organization
on public.maintenance_tasks for delete to authenticated
using (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_tasks.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

drop policy if exists work_logs_select_own_organization on public.work_logs;
drop policy if exists work_logs_insert_own_organization on public.work_logs;
drop policy if exists work_logs_update_own_organization on public.work_logs;
drop policy if exists work_logs_delete_own_organization on public.work_logs;

create policy work_logs_select_own_organization
on public.work_logs for select to authenticated
using (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = work_logs.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy work_logs_insert_own_organization
on public.work_logs for insert to authenticated
with check (
  (select private.has_current_legal_consents())
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = work_logs.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy work_logs_update_own_organization
on public.work_logs for update to authenticated
using (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = work_logs.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
)
with check (
  (select private.has_current_legal_consents())
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = work_logs.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy work_logs_delete_own_organization
on public.work_logs for delete to authenticated
using (
  (select private.has_current_legal_consents())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = work_logs.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);
