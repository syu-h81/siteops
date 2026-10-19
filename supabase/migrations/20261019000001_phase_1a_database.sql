-- SiteOps Phase 1-A: core schema, tenant isolation, and legal consent history.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

create or replace function public.prevent_organization_id_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id cannot be changed' using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_owner_user_id_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_user_id is distinct from old.owner_user_id then
    raise exception 'owner_user_id cannot be changed' using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_created_by_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by cannot be changed' using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_user_legal_consent_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'user legal consents are append-only' using errcode = '23514';
end;
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.prevent_organization_id_change() from public;
revoke all on function public.prevent_owner_user_id_change() from public;
revoke all on function public.prevent_created_by_change() from public;
revoke all on function public.prevent_user_legal_consent_mutation() from public;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_owner_user_id_key unique (owner_user_id),
  constraint organizations_owner_user_id_fkey
    foreign key (owner_user_id) references auth.users (id) on delete restrict,
  constraint organizations_name_check
    check (char_length(btrim(name)) between 1 and 200)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  name text not null,
  contact_name text,
  email text,
  phone text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_organization_id_id_key unique (organization_id, id),
  constraint clients_organization_id_fkey
    foreign key (organization_id) references public.organizations (id) on delete restrict,
  constraint clients_name_check
    check (char_length(btrim(name)) between 1 and 200),
  constraint clients_contact_name_check
    check (contact_name is null or char_length(contact_name) <= 200),
  constraint clients_email_check
    check (email is null or char_length(email) <= 320),
  constraint clients_phone_check
    check (phone is null or char_length(phone) <= 50),
  constraint clients_memo_check
    check (memo is null or char_length(memo) <= 5000)
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null,
  name text not null,
  url text not null,
  cms text not null default 'other',
  status text not null default 'active',
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sites_organization_id_id_key unique (organization_id, id),
  constraint sites_organization_id_fkey
    foreign key (organization_id) references public.organizations (id) on delete restrict,
  constraint sites_organization_id_client_id_fkey
    foreign key (organization_id, client_id)
    references public.clients (organization_id, id) on delete restrict,
  constraint sites_name_check
    check (char_length(btrim(name)) between 1 and 200),
  constraint sites_url_check
    check (char_length(url) between 1 and 2048 and url ~* '^https?://'),
  constraint sites_cms_check check (cms in ('wordpress', 'studio', 'other')),
  constraint sites_status_check check (status in ('active', 'inactive')),
  constraint sites_memo_check check (memo is null or char_length(memo) <= 5000)
);

create table public.site_services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  site_id uuid not null,
  type text not null,
  provider text,
  account_label text,
  renewal_date date,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_services_organization_id_id_key unique (organization_id, id),
  constraint site_services_organization_id_fkey
    foreign key (organization_id) references public.organizations (id) on delete restrict,
  constraint site_services_organization_id_site_id_fkey
    foreign key (organization_id, site_id)
    references public.sites (organization_id, id) on delete restrict,
  constraint site_services_type_check
    check (type in ('domain', 'server', 'dns', 'ssl', 'cms', 'other')),
  constraint site_services_provider_check
    check (provider is null or char_length(provider) <= 200),
  constraint site_services_account_label_check
    check (account_label is null or char_length(account_label) <= 200),
  constraint site_services_memo_check
    check (memo is null or char_length(memo) <= 5000)
);

create table public.maintenance_contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null,
  name text not null,
  monthly_price_jpy integer not null,
  start_date date not null,
  renewal_date date,
  status text not null,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_contracts_organization_id_id_key unique (organization_id, id),
  constraint maintenance_contracts_organization_id_fkey
    foreign key (organization_id) references public.organizations (id) on delete restrict,
  constraint maintenance_contracts_organization_id_client_id_fkey
    foreign key (organization_id, client_id)
    references public.clients (organization_id, id) on delete restrict,
  constraint maintenance_contracts_name_check
    check (char_length(btrim(name)) between 1 and 200),
  constraint maintenance_contracts_monthly_price_jpy_check
    check (monthly_price_jpy >= 0),
  constraint maintenance_contracts_status_check
    check (status in ('active', 'paused', 'ended')),
  constraint maintenance_contracts_memo_check
    check (memo is null or char_length(memo) <= 5000)
);

create table public.maintenance_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  site_id uuid not null,
  title text not null,
  description text,
  due_date date,
  status text not null default 'todo',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_tasks_organization_id_id_key unique (organization_id, id),
  constraint maintenance_tasks_organization_id_fkey
    foreign key (organization_id) references public.organizations (id) on delete restrict,
  constraint maintenance_tasks_organization_id_site_id_fkey
    foreign key (organization_id, site_id)
    references public.sites (organization_id, id) on delete restrict,
  constraint maintenance_tasks_title_check
    check (char_length(btrim(title)) between 1 and 200),
  constraint maintenance_tasks_description_check
    check (description is null or char_length(description) <= 5000),
  constraint maintenance_tasks_status_check check (status in ('todo', 'done')),
  constraint maintenance_tasks_completion_check
    check (
      (status = 'todo' and completed_at is null)
      or (status = 'done' and completed_at is not null)
    )
);

create table public.work_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  site_id uuid not null,
  title text not null,
  description text,
  worked_minutes integer not null,
  worked_on date not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_logs_organization_id_id_key unique (organization_id, id),
  constraint work_logs_organization_id_fkey
    foreign key (organization_id) references public.organizations (id) on delete restrict,
  constraint work_logs_organization_id_site_id_fkey
    foreign key (organization_id, site_id)
    references public.sites (organization_id, id) on delete restrict,
  constraint work_logs_created_by_fkey
    foreign key (created_by) references auth.users (id) on delete restrict,
  constraint work_logs_title_check
    check (char_length(btrim(title)) between 1 and 200),
  constraint work_logs_description_check
    check (description is null or char_length(description) <= 5000),
  constraint work_logs_worked_minutes_check
    check (worked_minutes between 1 and 1440)
);

create table public.legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_type text not null,
  version text not null,
  published_at timestamptz not null,
  effective_at timestamptz not null,
  content_path text not null,
  content_hash text not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  constraint legal_document_versions_document_type_version_key
    unique (document_type, version),
  constraint legal_document_versions_document_type_check
    check (document_type in ('terms', 'privacy')),
  constraint legal_document_versions_version_check
    check (char_length(btrim(version)) between 1 and 50),
  constraint legal_document_versions_effective_at_check
    check (effective_at >= published_at),
  constraint legal_document_versions_content_path_check
    check (char_length(btrim(content_path)) between 1 and 2048),
  constraint legal_document_versions_content_hash_check
    check (content_hash ~ '^[0-9a-f]{64}$')
);

create unique index legal_document_versions_current_type_key
  on public.legal_document_versions (document_type)
  where is_current;

create table public.user_legal_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  document_version_id uuid not null,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint user_legal_consents_user_id_document_version_id_key
    unique (user_id, document_version_id),
  constraint user_legal_consents_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete restrict,
  constraint user_legal_consents_document_version_id_fkey
    foreign key (document_version_id)
    references public.legal_document_versions (id) on delete restrict
);

create index clients_organization_id_idx on public.clients (organization_id);
create index sites_organization_id_idx on public.sites (organization_id);
create index sites_organization_id_client_id_idx
  on public.sites (organization_id, client_id);
create index sites_organization_id_status_idx
  on public.sites (organization_id, status);
create index site_services_organization_id_idx on public.site_services (organization_id);
create index site_services_organization_id_site_id_idx
  on public.site_services (organization_id, site_id);
create index site_services_organization_id_type_idx
  on public.site_services (organization_id, type);
create index site_services_organization_id_renewal_date_idx
  on public.site_services (organization_id, renewal_date)
  where renewal_date is not null;
create index maintenance_contracts_organization_id_idx
  on public.maintenance_contracts (organization_id);
create index maintenance_contracts_organization_id_client_id_idx
  on public.maintenance_contracts (organization_id, client_id);
create index maintenance_contracts_organization_id_status_idx
  on public.maintenance_contracts (organization_id, status);
create index maintenance_contracts_organization_id_renewal_date_idx
  on public.maintenance_contracts (organization_id, renewal_date)
  where renewal_date is not null;
create index maintenance_tasks_organization_id_idx
  on public.maintenance_tasks (organization_id);
create index maintenance_tasks_organization_id_site_id_idx
  on public.maintenance_tasks (organization_id, site_id);
create index maintenance_tasks_organization_id_status_due_date_idx
  on public.maintenance_tasks (organization_id, status, due_date);
create index work_logs_organization_id_idx on public.work_logs (organization_id);
create index work_logs_organization_id_site_id_worked_on_idx
  on public.work_logs (organization_id, site_id, worked_on desc);
create index work_logs_organization_id_worked_on_idx
  on public.work_logs (organization_id, worked_on desc);
create index work_logs_created_by_idx on public.work_logs (created_by);
create index user_legal_consents_user_id_accepted_at_idx
  on public.user_legal_consents (user_id, accepted_at desc);
create index user_legal_consents_document_version_id_idx
  on public.user_legal_consents (document_version_id);

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger organizations_prevent_owner_user_id_change
before update on public.organizations
for each row execute function public.prevent_owner_user_id_change();

create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create trigger clients_prevent_organization_id_change
before update on public.clients
for each row execute function public.prevent_organization_id_change();

create trigger sites_set_updated_at
before update on public.sites
for each row execute function public.set_updated_at();

create trigger sites_prevent_organization_id_change
before update on public.sites
for each row execute function public.prevent_organization_id_change();

create trigger site_services_set_updated_at
before update on public.site_services
for each row execute function public.set_updated_at();

create trigger site_services_prevent_organization_id_change
before update on public.site_services
for each row execute function public.prevent_organization_id_change();

create trigger maintenance_contracts_set_updated_at
before update on public.maintenance_contracts
for each row execute function public.set_updated_at();

create trigger maintenance_contracts_prevent_organization_id_change
before update on public.maintenance_contracts
for each row execute function public.prevent_organization_id_change();

create trigger maintenance_tasks_set_updated_at
before update on public.maintenance_tasks
for each row execute function public.set_updated_at();

create trigger maintenance_tasks_prevent_organization_id_change
before update on public.maintenance_tasks
for each row execute function public.prevent_organization_id_change();

create trigger work_logs_set_updated_at
before update on public.work_logs
for each row execute function public.set_updated_at();

create trigger work_logs_prevent_organization_id_change
before update on public.work_logs
for each row execute function public.prevent_organization_id_change();

create trigger work_logs_prevent_created_by_change
before update on public.work_logs
for each row execute function public.prevent_created_by_change();

create trigger user_legal_consents_prevent_mutation
before update or delete on public.user_legal_consents
for each row execute function public.prevent_user_legal_consent_mutation();

alter table public.organizations enable row level security;
alter table public.clients enable row level security;
alter table public.sites enable row level security;
alter table public.site_services enable row level security;
alter table public.maintenance_contracts enable row level security;
alter table public.maintenance_tasks enable row level security;
alter table public.work_logs enable row level security;
alter table public.legal_document_versions enable row level security;
alter table public.user_legal_consents enable row level security;

revoke all on table public.organizations from anon, authenticated;
revoke all on table public.clients from anon, authenticated;
revoke all on table public.sites from anon, authenticated;
revoke all on table public.site_services from anon, authenticated;
revoke all on table public.maintenance_contracts from anon, authenticated;
revoke all on table public.maintenance_tasks from anon, authenticated;
revoke all on table public.work_logs from anon, authenticated;
revoke all on table public.legal_document_versions from anon, authenticated;
revoke all on table public.user_legal_consents from anon, authenticated;

grant select, insert, update on table public.organizations to authenticated;
grant select, insert, update, delete on table public.clients to authenticated;
grant select, insert, update, delete on table public.sites to authenticated;
grant select, insert, update, delete on table public.site_services to authenticated;
grant select, insert, update, delete on table public.maintenance_contracts to authenticated;
grant select, insert, update, delete on table public.maintenance_tasks to authenticated;
grant select, insert, update, delete on table public.work_logs to authenticated;
grant select on table public.legal_document_versions to anon, authenticated;
grant select on table public.user_legal_consents to authenticated;

create policy organizations_select_own
on public.organizations for select to authenticated
using (owner_user_id = (select auth.uid()));

create policy organizations_insert_own
on public.organizations for insert to authenticated
with check (owner_user_id = (select auth.uid()));

create policy organizations_update_own
on public.organizations for update to authenticated
using (owner_user_id = (select auth.uid()))
with check (owner_user_id = (select auth.uid()));

create policy clients_select_own_organization
on public.clients for select to authenticated
using (
  exists (
    select 1 from public.organizations as organization
    where organization.id = clients.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy clients_insert_own_organization
on public.clients for insert to authenticated
with check (
  exists (
    select 1 from public.organizations as organization
    where organization.id = clients.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy clients_update_own_organization
on public.clients for update to authenticated
using (
  exists (
    select 1 from public.organizations as organization
    where organization.id = clients.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.organizations as organization
    where organization.id = clients.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy clients_delete_own_organization
on public.clients for delete to authenticated
using (
  exists (
    select 1 from public.organizations as organization
    where organization.id = clients.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy sites_select_own_organization
on public.sites for select to authenticated
using (
  exists (
    select 1 from public.organizations as organization
    where organization.id = sites.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy sites_insert_own_organization
on public.sites for insert to authenticated
with check (
  exists (
    select 1 from public.organizations as organization
    where organization.id = sites.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy sites_update_own_organization
on public.sites for update to authenticated
using (
  exists (
    select 1 from public.organizations as organization
    where organization.id = sites.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.organizations as organization
    where organization.id = sites.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy sites_delete_own_organization
on public.sites for delete to authenticated
using (
  exists (
    select 1 from public.organizations as organization
    where organization.id = sites.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy site_services_select_own_organization
on public.site_services for select to authenticated
using (
  exists (
    select 1 from public.organizations as organization
    where organization.id = site_services.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy site_services_insert_own_organization
on public.site_services for insert to authenticated
with check (
  exists (
    select 1 from public.organizations as organization
    where organization.id = site_services.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy site_services_update_own_organization
on public.site_services for update to authenticated
using (
  exists (
    select 1 from public.organizations as organization
    where organization.id = site_services.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.organizations as organization
    where organization.id = site_services.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy site_services_delete_own_organization
on public.site_services for delete to authenticated
using (
  exists (
    select 1 from public.organizations as organization
    where organization.id = site_services.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy maintenance_contracts_select_own_organization
on public.maintenance_contracts for select to authenticated
using (
  exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_contracts.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy maintenance_contracts_insert_own_organization
on public.maintenance_contracts for insert to authenticated
with check (
  exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_contracts.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy maintenance_contracts_update_own_organization
on public.maintenance_contracts for update to authenticated
using (
  exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_contracts.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_contracts.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy maintenance_contracts_delete_own_organization
on public.maintenance_contracts for delete to authenticated
using (
  exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_contracts.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy maintenance_tasks_select_own_organization
on public.maintenance_tasks for select to authenticated
using (
  exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_tasks.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy maintenance_tasks_insert_own_organization
on public.maintenance_tasks for insert to authenticated
with check (
  exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_tasks.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy maintenance_tasks_update_own_organization
on public.maintenance_tasks for update to authenticated
using (
  exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_tasks.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_tasks.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy maintenance_tasks_delete_own_organization
on public.maintenance_tasks for delete to authenticated
using (
  exists (
    select 1 from public.organizations as organization
    where organization.id = maintenance_tasks.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy work_logs_select_own_organization
on public.work_logs for select to authenticated
using (
  exists (
    select 1 from public.organizations as organization
    where organization.id = work_logs.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy work_logs_insert_own_organization
on public.work_logs for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = work_logs.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy work_logs_update_own_organization
on public.work_logs for update to authenticated
using (
  exists (
    select 1 from public.organizations as organization
    where organization.id = work_logs.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
)
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.organizations as organization
    where organization.id = work_logs.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy work_logs_delete_own_organization
on public.work_logs for delete to authenticated
using (
  exists (
    select 1 from public.organizations as organization
    where organization.id = work_logs.organization_id
      and organization.owner_user_id = (select auth.uid())
  )
);

create policy legal_document_versions_select_published
on public.legal_document_versions for select to anon, authenticated
using (published_at <= now());

create policy user_legal_consents_select_own
on public.user_legal_consents for select to authenticated
using (user_id = (select auth.uid()));

create or replace function public.accept_current_legal_documents()
returns setof public.user_legal_consents
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  terms_document_id uuid;
  privacy_document_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication is required' using errcode = '42501';
  end if;

  select document.id
  into terms_document_id
  from public.legal_document_versions as document
  where document.document_type = 'terms'
    and document.is_current
    and document.published_at <= now()
    and document.effective_at <= now();

  select document.id
  into privacy_document_id
  from public.legal_document_versions as document
  where document.document_type = 'privacy'
    and document.is_current
    and document.published_at <= now()
    and document.effective_at <= now();

  if terms_document_id is null or privacy_document_id is null then
    raise exception 'current legal documents are not configured' using errcode = 'P0001';
  end if;

  insert into public.user_legal_consents (user_id, document_version_id)
  values
    (current_user_id, terms_document_id),
    (current_user_id, privacy_document_id)
  on conflict (user_id, document_version_id) do nothing;

  return query
  select consent.*
  from public.user_legal_consents as consent
  where consent.user_id = current_user_id
    and consent.document_version_id in (terms_document_id, privacy_document_id)
  order by consent.document_version_id;
end;
$$;

revoke all on function public.accept_current_legal_documents() from public;
revoke all on function public.accept_current_legal_documents() from anon;
grant execute on function public.accept_current_legal_documents() to authenticated;
