begin;

select no_plan();

select has_function(
  'private',
  'has_current_legal_consents',
  array[]::text[],
  'the shared current-consent predicate exists'
);
select ok(
  not (
    select routine.prosecdef
    from pg_proc as routine
    join pg_namespace as namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = 'private'
      and routine.proname = 'has_current_legal_consents'
      and routine.pronargs = 0
  ),
  'the shared current-consent predicate is SECURITY INVOKER'
);
select ok(
  (
    select 'search_path=""' = any(coalesce(routine.proconfig, '{}'::text[]))
    from pg_proc as routine
    join pg_namespace as namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = 'private'
      and routine.proname = 'has_current_legal_consents'
      and routine.pronargs = 0
  ),
  'the shared predicate has an empty fixed search_path'
);
select ok(
  has_schema_privilege('authenticated', 'private', 'USAGE')
  and has_function_privilege(
    'authenticated',
    'private.has_current_legal_consents()',
    'EXECUTE'
  ),
  'authenticated can evaluate the private predicate for RLS'
);
select ok(
  not has_schema_privilege('anon', 'private', 'USAGE')
  and not has_function_privilege(
    'anon',
    'private.has_current_legal_consents()',
    'EXECUTE'
  ),
  'anon cannot evaluate the private predicate'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.accept_current_legal_documents()',
    'EXECUTE'
  ),
  'authenticated cannot execute the legacy consent RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.accept_current_legal_documents()',
    'EXECUTE'
  ),
  'anon cannot execute the legacy consent RPC'
);
select ok(
  not has_function_privilege(
    'service_role',
    'public.accept_current_legal_documents()',
    'EXECUTE'
  ),
  'service_role cannot execute the legacy consent RPC'
);
select ok(
  not exists (
    select 1
    from pg_proc as routine
    join pg_namespace as namespace on namespace.oid = routine.pronamespace
    cross join lateral aclexplode(
      coalesce(routine.proacl, acldefault('f', routine.proowner))
    ) as privilege
    where namespace.nspname = 'public'
      and routine.proname = 'accept_current_legal_documents'
      and routine.pronargs = 0
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  'PUBLIC has no EXECUTE privilege on the legacy consent RPC'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.accept_legal_documents(uuid,text,uuid,text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.accept_legal_documents(uuid,text,uuid,text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'service_role',
    'public.accept_legal_documents(uuid,text,uuid,text)',
    'EXECUTE'
  ),
  'only authenticated can execute the new consent RPC'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'organizations',
        'clients',
        'sites',
        'site_services',
        'maintenance_contracts',
        'maintenance_tasks',
        'work_logs'
      )
  ),
  27::bigint,
  'business tables have exactly one policy for each permitted operation'
);
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'organizations',
        'clients',
        'sites',
        'site_services',
        'maintenance_contracts',
        'maintenance_tasks',
        'work_logs'
      )
      and (
        coalesce(qual, '') || ' ' || coalesce(with_check, '')
      ) like '%has_current_legal_consents%'
  ),
  27::bigint,
  'every business policy includes the current-consent predicate without an OR bypass'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000c4d001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'current-consent-a@example.test',
    '',
    now(),
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000c4d002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'current-consent-b@example.test',
    '',
    now(),
    now(),
    now()
  );

insert into public.organizations (id, owner_user_id, name)
values
  (
    '00000000-0000-0000-0000-000000c4d101',
    '00000000-0000-0000-0000-000000c4d001',
    'Current Consent Organization A'
  ),
  (
    '00000000-0000-0000-0000-000000c4d102',
    '00000000-0000-0000-0000-000000c4d002',
    'Current Consent Organization B'
  );

insert into public.clients (id, organization_id, name)
values
  (
    '00000000-0000-0000-0000-000000c4d201',
    '00000000-0000-0000-0000-000000c4d101',
    'Current Consent Client A'
  ),
  (
    '00000000-0000-0000-0000-000000c4d202',
    '00000000-0000-0000-0000-000000c4d102',
    'Current Consent Client B'
  );

insert into public.sites (id, organization_id, client_id, name, url)
values
  (
    '00000000-0000-0000-0000-000000c4d301',
    '00000000-0000-0000-0000-000000c4d101',
    '00000000-0000-0000-0000-000000c4d201',
    'Current Consent Site A',
    'https://current-a.example.test'
  ),
  (
    '00000000-0000-0000-0000-000000c4d302',
    '00000000-0000-0000-0000-000000c4d102',
    '00000000-0000-0000-0000-000000c4d202',
    'Current Consent Site B',
    'https://current-b.example.test'
  );

insert into public.site_services (id, organization_id, site_id, type)
values
  (
    '00000000-0000-0000-0000-000000c4d401',
    '00000000-0000-0000-0000-000000c4d101',
    '00000000-0000-0000-0000-000000c4d301',
    'domain'
  ),
  (
    '00000000-0000-0000-0000-000000c4d402',
    '00000000-0000-0000-0000-000000c4d102',
    '00000000-0000-0000-0000-000000c4d302',
    'domain'
  );

insert into public.maintenance_contracts (
  id,
  organization_id,
  client_id,
  name,
  monthly_price_jpy,
  start_date,
  status
)
values
  (
    '00000000-0000-0000-0000-000000c4d501',
    '00000000-0000-0000-0000-000000c4d101',
    '00000000-0000-0000-0000-000000c4d201',
    'Current Consent Contract A',
    10000,
    current_date,
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000c4d502',
    '00000000-0000-0000-0000-000000c4d102',
    '00000000-0000-0000-0000-000000c4d202',
    'Current Consent Contract B',
    10000,
    current_date,
    'active'
  );

insert into public.maintenance_tasks (id, organization_id, site_id, title)
values
  (
    '00000000-0000-0000-0000-000000c4d601',
    '00000000-0000-0000-0000-000000c4d101',
    '00000000-0000-0000-0000-000000c4d301',
    'Current Consent Task A'
  ),
  (
    '00000000-0000-0000-0000-000000c4d602',
    '00000000-0000-0000-0000-000000c4d102',
    '00000000-0000-0000-0000-000000c4d302',
    'Current Consent Task B'
  );

insert into public.work_logs (
  id,
  organization_id,
  site_id,
  title,
  worked_minutes,
  worked_on,
  created_by
)
values
  (
    '00000000-0000-0000-0000-000000c4d701',
    '00000000-0000-0000-0000-000000c4d101',
    '00000000-0000-0000-0000-000000c4d301',
    'Current Consent Work A',
    30,
    current_date,
    '00000000-0000-0000-0000-000000c4d001'
  ),
  (
    '00000000-0000-0000-0000-000000c4d702',
    '00000000-0000-0000-0000-000000c4d102',
    '00000000-0000-0000-0000-000000c4d302',
    'Current Consent Work B',
    30,
    current_date,
    '00000000-0000-0000-0000-000000c4d002'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000c4d001","role":"authenticated"}',
  true
);

select is(
  private.has_current_legal_consents(),
  false,
  'no formal documents means no current consent'
);
select throws_ok(
  $$select * from public.accept_current_legal_documents()$$,
  '42501',
  null,
  'authenticated cannot invoke the legacy consent RPC'
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$select * from public.accept_current_legal_documents()$$,
  '42501',
  null,
  'anon cannot invoke the legacy consent RPC'
);

reset role;

insert into public.legal_document_versions (
  id,
  document_type,
  version,
  published_at,
  effective_at,
  content_path,
  content_hash,
  publication_status,
  is_current
)
values (
  '00000000-0000-0000-0000-000000c4d801',
  'terms',
  'legacy-current-consent-test',
  now() - interval '2 days',
  now() - interval '2 days',
  'docs/legal/legacy-current-consent-test.md',
  repeat('0', 64),
  'legacy',
  false
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000c4d001","role":"authenticated"}',
  true
);
select is(
  private.has_current_legal_consents(),
  false,
  'a legacy document never satisfies current consent'
);
reset role;

insert into public.legal_document_versions (
  id,
  document_type,
  version,
  published_at,
  effective_at,
  content_path,
  content_hash,
  content_markdown,
  publication_status,
  is_current
)
values
  (
    '00000000-0000-0000-0000-000000c4d811',
    'terms',
    'current-consent-terms-1',
    now() - interval '1 day',
    now() - interval '1 day',
    'docs/legal/published/current-consent-terms-1.md',
    repeat('0', 64),
    E'# Current consent terms 1\n',
    'published',
    true
  ),
  (
    '00000000-0000-0000-0000-000000c4d812',
    'privacy',
    'current-consent-privacy-1',
    now() - interval '1 day',
    now() - interval '1 day',
    'docs/legal/published/current-consent-privacy-1.md',
    repeat('0', 64),
    E'# Current consent privacy 1\n',
    'published',
    true
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000c4d001","role":"authenticated"}',
  true
);
select is(private.has_current_legal_consents(), false, 'no consent is false');
reset role;

insert into public.user_legal_consents (user_id, document_version_id)
values (
  '00000000-0000-0000-0000-000000c4d001',
  '00000000-0000-0000-0000-000000c4d811'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000c4d001","role":"authenticated"}',
  true
);
select is(
  private.has_current_legal_consents(),
  false,
  'accepting only one current document is false'
);
reset role;

insert into public.user_legal_consents (user_id, document_version_id)
values (
  '00000000-0000-0000-0000-000000c4d001',
  '00000000-0000-0000-0000-000000c4d812'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000c4d001","role":"authenticated"}',
  true
);
select is(
  private.has_current_legal_consents(),
  true,
  'accepting both current documents is true'
);
reset role;

insert into public.legal_document_versions (
  id,
  document_type,
  version,
  published_at,
  effective_at,
  content_path,
  content_hash,
  content_markdown,
  publication_status,
  is_current
)
values (
  '00000000-0000-0000-0000-000000c4d813',
  'privacy',
  'current-consent-privacy-future',
  now() - interval '1 hour',
  now() + interval '1 day',
  'docs/legal/published/current-consent-privacy-future.md',
  repeat('0', 64),
  E'# Current consent future privacy\n',
  'published',
  false
);

select public.set_current_legal_document(
  'privacy',
  '00000000-0000-0000-0000-000000c4d813'
);
insert into public.user_legal_consents (user_id, document_version_id)
values (
  '00000000-0000-0000-0000-000000c4d001',
  '00000000-0000-0000-0000-000000c4d813'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000c4d001","role":"authenticated"}',
  true
);
select is(
  private.has_current_legal_consents(),
  false,
  'an accepted but not-yet-effective document is false'
);
reset role;

select public.set_current_legal_document(
  'privacy',
  '00000000-0000-0000-0000-000000c4d812'
);

insert into public.legal_document_versions (
  id,
  document_type,
  version,
  published_at,
  effective_at,
  content_path,
  content_hash,
  content_markdown,
  publication_status,
  is_current
)
values (
  '00000000-0000-0000-0000-000000c4d814',
  'terms',
  'current-consent-terms-2',
  now() - interval '1 hour',
  now() - interval '1 hour',
  'docs/legal/published/current-consent-terms-2.md',
  repeat('0', 64),
  E'# Current consent terms 2\n',
  'published',
  false
);
select public.set_current_legal_document(
  'terms',
  '00000000-0000-0000-0000-000000c4d814'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000c4d001","role":"authenticated"}',
  true
);

select is(
  private.has_current_legal_consents(),
  false,
  'switching a current document requires renewed consent'
);
select is((select count(*) from public.organizations), 0::bigint, 'stale consent hides organizations');
select is((select count(*) from public.clients), 0::bigint, 'stale consent hides clients');
select is((select count(*) from public.sites), 0::bigint, 'stale consent hides sites');
select is((select count(*) from public.site_services), 0::bigint, 'stale consent hides site services');
select is((select count(*) from public.maintenance_contracts), 0::bigint, 'stale consent hides contracts');
select is((select count(*) from public.maintenance_tasks), 0::bigint, 'stale consent hides tasks');
select is((select count(*) from public.work_logs), 0::bigint, 'stale consent hides work logs');

select is(
  (
    select count(*)
    from public.legal_document_versions
    where is_current
      and publication_status = 'published'
  ),
  2::bigint,
  'current legal documents remain readable before renewed consent'
);
select ok(
  (select count(*) from public.user_legal_consents) >= 2,
  'the user can still read their consent history before renewed consent'
);

select throws_ok(
  $$
    insert into public.organizations (owner_user_id, name)
    values (
      '00000000-0000-0000-0000-000000c4d001',
      'Blocked duplicate organization'
    )
  $$,
  '42501',
  null,
  'stale consent blocks organization inserts'
);
select throws_ok(
  $$
    insert into public.clients (organization_id, name)
    values ('00000000-0000-0000-0000-000000c4d101', 'Blocked client')
  $$,
  '42501', null, 'stale consent blocks client inserts'
);
select throws_ok(
  $$
    insert into public.sites (organization_id, client_id, name, url)
    values (
      '00000000-0000-0000-0000-000000c4d101',
      '00000000-0000-0000-0000-000000c4d201',
      'Blocked site',
      'https://blocked.example.test'
    )
  $$,
  '42501', null, 'stale consent blocks site inserts'
);
select throws_ok(
  $$
    insert into public.site_services (organization_id, site_id, type)
    values (
      '00000000-0000-0000-0000-000000c4d101',
      '00000000-0000-0000-0000-000000c4d301',
      'ssl'
    )
  $$,
  '42501', null, 'stale consent blocks site-service inserts'
);
select throws_ok(
  $$
    insert into public.maintenance_contracts (
      organization_id, client_id, name, monthly_price_jpy, start_date, status
    ) values (
      '00000000-0000-0000-0000-000000c4d101',
      '00000000-0000-0000-0000-000000c4d201',
      'Blocked contract', 1000, current_date, 'active'
    )
  $$,
  '42501', null, 'stale consent blocks contract inserts'
);
select throws_ok(
  $$
    insert into public.maintenance_tasks (organization_id, site_id, title)
    values (
      '00000000-0000-0000-0000-000000c4d101',
      '00000000-0000-0000-0000-000000c4d301',
      'Blocked task'
    )
  $$,
  '42501', null, 'stale consent blocks task inserts'
);
select throws_ok(
  $$
    insert into public.work_logs (
      organization_id, site_id, title, worked_minutes, worked_on
    ) values (
      '00000000-0000-0000-0000-000000c4d101',
      '00000000-0000-0000-0000-000000c4d301',
      'Blocked work', 30, current_date
    )
  $$,
  '42501', null, 'stale consent blocks work-log inserts'
);

create temporary table stale_consent_operation_results (
  operation text primary key,
  affected_rows bigint not null
) on commit drop;

with changed as (
  update public.organizations set name = 'Blocked' returning 1
)
insert into stale_consent_operation_results (operation, affected_rows)
select 'organizations_update', count(*) from changed;

select throws_ok(
  $$delete from public.organizations where id = '00000000-0000-0000-0000-000000c4d101'$$,
  '42501', null, 'organization deletes remain unavailable'
);

with changed as (update public.clients set name = 'Blocked' returning 1)
insert into stale_consent_operation_results (operation, affected_rows)
select 'clients_update', count(*) from changed;
with changed as (delete from public.clients returning 1)
insert into stale_consent_operation_results (operation, affected_rows)
select 'clients_delete', count(*) from changed;

with changed as (update public.sites set name = 'Blocked' returning 1)
insert into stale_consent_operation_results (operation, affected_rows)
select 'sites_update', count(*) from changed;
with changed as (delete from public.sites returning 1)
insert into stale_consent_operation_results (operation, affected_rows)
select 'sites_delete', count(*) from changed;

with changed as (update public.site_services set provider = 'Blocked' returning 1)
insert into stale_consent_operation_results (operation, affected_rows)
select 'site_services_update', count(*) from changed;
with changed as (delete from public.site_services returning 1)
insert into stale_consent_operation_results (operation, affected_rows)
select 'site_services_delete', count(*) from changed;

with changed as (update public.maintenance_contracts set name = 'Blocked' returning 1)
insert into stale_consent_operation_results (operation, affected_rows)
select 'maintenance_contracts_update', count(*) from changed;
with changed as (delete from public.maintenance_contracts returning 1)
insert into stale_consent_operation_results (operation, affected_rows)
select 'maintenance_contracts_delete', count(*) from changed;

with changed as (update public.maintenance_tasks set title = 'Blocked' returning 1)
insert into stale_consent_operation_results (operation, affected_rows)
select 'maintenance_tasks_update', count(*) from changed;
with changed as (delete from public.maintenance_tasks returning 1)
insert into stale_consent_operation_results (operation, affected_rows)
select 'maintenance_tasks_delete', count(*) from changed;

with changed as (update public.work_logs set title = 'Blocked' returning 1)
insert into stale_consent_operation_results (operation, affected_rows)
select 'work_logs_update', count(*) from changed;
with changed as (delete from public.work_logs returning 1)
insert into stale_consent_operation_results (operation, affected_rows)
select 'work_logs_delete', count(*) from changed;

select is(
  (select affected_rows from stale_consent_operation_results where operation = 'organizations_update'),
  0::bigint, 'stale consent blocks organization updates'
);
select is(
  (select affected_rows from stale_consent_operation_results where operation = 'clients_update'),
  0::bigint, 'stale consent blocks client updates'
);
select is(
  (select affected_rows from stale_consent_operation_results where operation = 'clients_delete'),
  0::bigint, 'stale consent blocks client deletes'
);
select is(
  (select affected_rows from stale_consent_operation_results where operation = 'sites_update'),
  0::bigint, 'stale consent blocks site updates'
);
select is(
  (select affected_rows from stale_consent_operation_results where operation = 'sites_delete'),
  0::bigint, 'stale consent blocks site deletes'
);
select is(
  (select affected_rows from stale_consent_operation_results where operation = 'site_services_update'),
  0::bigint, 'stale consent blocks site-service updates'
);
select is(
  (select affected_rows from stale_consent_operation_results where operation = 'site_services_delete'),
  0::bigint, 'stale consent blocks site-service deletes'
);
select is(
  (select affected_rows from stale_consent_operation_results where operation = 'maintenance_contracts_update'),
  0::bigint, 'stale consent blocks contract updates'
);
select is(
  (select affected_rows from stale_consent_operation_results where operation = 'maintenance_contracts_delete'),
  0::bigint, 'stale consent blocks contract deletes'
);
select is(
  (select affected_rows from stale_consent_operation_results where operation = 'maintenance_tasks_update'),
  0::bigint, 'stale consent blocks task updates'
);
select is(
  (select affected_rows from stale_consent_operation_results where operation = 'maintenance_tasks_delete'),
  0::bigint, 'stale consent blocks task deletes'
);
select is(
  (select affected_rows from stale_consent_operation_results where operation = 'work_logs_update'),
  0::bigint, 'stale consent blocks work-log updates'
);
select is(
  (select affected_rows from stale_consent_operation_results where operation = 'work_logs_delete'),
  0::bigint, 'stale consent blocks work-log deletes'
);

select is(
  (
    select count(*)
    from public.accept_legal_documents(
      '00000000-0000-0000-0000-000000c4d814',
      (
        select content_hash from public.legal_document_versions
        where id = '00000000-0000-0000-0000-000000c4d814'
      ),
      '00000000-0000-0000-0000-000000c4d812',
      (
        select content_hash from public.legal_document_versions
        where id = '00000000-0000-0000-0000-000000c4d812'
      )
    )
  ),
  2::bigint,
  'the new RPC remains executable before renewed consent'
);
select is(
  private.has_current_legal_consents(),
  true,
  'renewed consent restores the shared predicate'
);

select is((select count(*) from public.organizations), 1::bigint, 'renewed consent restores organization SELECT');
select is((select count(*) from public.clients), 1::bigint, 'renewed consent restores client SELECT');
select is((select count(*) from public.sites), 1::bigint, 'renewed consent restores site SELECT');
select is((select count(*) from public.site_services), 1::bigint, 'renewed consent restores site-service SELECT');
select is((select count(*) from public.maintenance_contracts), 1::bigint, 'renewed consent restores contract SELECT');
select is((select count(*) from public.maintenance_tasks), 1::bigint, 'renewed consent restores task SELECT');
select is((select count(*) from public.work_logs), 1::bigint, 'renewed consent restores work-log SELECT');

select lives_ok(
  $$update public.organizations set name = 'Organization A Updated' where id = '00000000-0000-0000-0000-000000c4d101'$$,
  'renewed consent restores organization UPDATE'
);
select lives_ok(
  $$insert into public.clients (id, organization_id, name) values ('00000000-0000-0000-0000-000000c4d211', '00000000-0000-0000-0000-000000c4d101', 'Temporary client')$$,
  'renewed consent restores client INSERT'
);
select lives_ok(
  $$insert into public.sites (id, organization_id, client_id, name, url) values ('00000000-0000-0000-0000-000000c4d311', '00000000-0000-0000-0000-000000c4d101', '00000000-0000-0000-0000-000000c4d201', 'Temporary site', 'https://temporary.example.test')$$,
  'renewed consent restores site INSERT'
);
select lives_ok(
  $$insert into public.site_services (id, organization_id, site_id, type) values ('00000000-0000-0000-0000-000000c4d411', '00000000-0000-0000-0000-000000c4d101', '00000000-0000-0000-0000-000000c4d301', 'ssl')$$,
  'renewed consent restores site-service INSERT'
);
select lives_ok(
  $$insert into public.maintenance_contracts (id, organization_id, client_id, name, monthly_price_jpy, start_date, status) values ('00000000-0000-0000-0000-000000c4d511', '00000000-0000-0000-0000-000000c4d101', '00000000-0000-0000-0000-000000c4d201', 'Temporary contract', 1000, current_date, 'active')$$,
  'renewed consent restores contract INSERT'
);
select lives_ok(
  $$insert into public.maintenance_tasks (id, organization_id, site_id, title) values ('00000000-0000-0000-0000-000000c4d611', '00000000-0000-0000-0000-000000c4d101', '00000000-0000-0000-0000-000000c4d301', 'Temporary task')$$,
  'renewed consent restores task INSERT'
);
select lives_ok(
  $$insert into public.work_logs (id, organization_id, site_id, title, worked_minutes, worked_on) values ('00000000-0000-0000-0000-000000c4d711', '00000000-0000-0000-0000-000000c4d101', '00000000-0000-0000-0000-000000c4d301', 'Temporary work', 30, current_date)$$,
  'renewed consent restores work-log INSERT'
);

select lives_ok(
  $$update public.clients set name = 'Temporary client updated' where id = '00000000-0000-0000-0000-000000c4d211'$$,
  'renewed consent restores client UPDATE'
);
select lives_ok(
  $$update public.sites set name = 'Temporary site updated' where id = '00000000-0000-0000-0000-000000c4d311'$$,
  'renewed consent restores site UPDATE'
);
select lives_ok(
  $$update public.site_services set provider = 'Temporary provider' where id = '00000000-0000-0000-0000-000000c4d411'$$,
  'renewed consent restores site-service UPDATE'
);
select lives_ok(
  $$update public.maintenance_contracts set name = 'Temporary contract updated' where id = '00000000-0000-0000-0000-000000c4d511'$$,
  'renewed consent restores contract UPDATE'
);
select lives_ok(
  $$update public.maintenance_tasks set title = 'Temporary task updated' where id = '00000000-0000-0000-0000-000000c4d611'$$,
  'renewed consent restores task UPDATE'
);
select lives_ok(
  $$update public.work_logs set title = 'Temporary work updated' where id = '00000000-0000-0000-0000-000000c4d711'$$,
  'renewed consent restores work-log UPDATE'
);

select lives_ok(
  $$delete from public.clients where id = '00000000-0000-0000-0000-000000c4d211'$$,
  'renewed consent restores client DELETE'
);
select lives_ok(
  $$delete from public.sites where id = '00000000-0000-0000-0000-000000c4d311'$$,
  'renewed consent restores site DELETE'
);
select lives_ok(
  $$delete from public.site_services where id = '00000000-0000-0000-0000-000000c4d411'$$,
  'renewed consent restores site-service DELETE'
);
select lives_ok(
  $$delete from public.maintenance_contracts where id = '00000000-0000-0000-0000-000000c4d511'$$,
  'renewed consent restores contract DELETE'
);
select lives_ok(
  $$delete from public.maintenance_tasks where id = '00000000-0000-0000-0000-000000c4d611'$$,
  'renewed consent restores task DELETE'
);
select lives_ok(
  $$delete from public.work_logs where id = '00000000-0000-0000-0000-000000c4d711'$$,
  'renewed consent restores work-log DELETE'
);

select is(
  (
    select count(*)
    from public.organizations
    where id = '00000000-0000-0000-0000-000000c4d102'
  ),
  0::bigint,
  'renewed consent does not expose another organization'
);
select is((select count(*) from public.clients where id = '00000000-0000-0000-0000-000000c4d202'), 0::bigint, 'another organization client remains hidden');
select is((select count(*) from public.sites where id = '00000000-0000-0000-0000-000000c4d302'), 0::bigint, 'another organization site remains hidden');
select is((select count(*) from public.site_services where id = '00000000-0000-0000-0000-000000c4d402'), 0::bigint, 'another organization site service remains hidden');
select is((select count(*) from public.maintenance_contracts where id = '00000000-0000-0000-0000-000000c4d502'), 0::bigint, 'another organization contract remains hidden');
select is((select count(*) from public.maintenance_tasks where id = '00000000-0000-0000-0000-000000c4d602'), 0::bigint, 'another organization task remains hidden');
select is((select count(*) from public.work_logs where id = '00000000-0000-0000-0000-000000c4d702'), 0::bigint, 'another organization work log remains hidden');

select throws_ok(
  $$
    insert into public.sites (organization_id, client_id, name, url)
    values (
      '00000000-0000-0000-0000-000000c4d101',
      '00000000-0000-0000-0000-000000c4d202',
      'Cross-tenant parent',
      'https://cross-parent.example.test'
    )
  $$,
  '23503',
  null,
  'the tenant-safe composite foreign key remains enforced'
);
select throws_ok(
  $$
    update public.work_logs
    set created_by = '00000000-0000-0000-0000-000000c4d002'
    where id = '00000000-0000-0000-0000-000000c4d701'
  $$,
  '23514',
  null,
  'the created_by immutability trigger remains enforced'
);

select * from finish();

rollback;
