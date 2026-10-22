begin;

select no_plan();

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
    '00000000-0000-0000-0000-000000000a01',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'tenant-a@example.test',
    '',
    now(),
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000b01',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'tenant-b@example.test',
    '',
    now(),
    now(),
    now()
  );

insert into public.organizations (id, owner_user_id, name)
values
  (
    '00000000-0000-0000-0000-000000000a10',
    '00000000-0000-0000-0000-000000000a01',
    'Organization A'
  ),
  (
    '00000000-0000-0000-0000-000000000b10',
    '00000000-0000-0000-0000-000000000b01',
    'Organization B'
  );

insert into public.clients (id, organization_id, name)
values
  (
    '00000000-0000-0000-0000-000000000a20',
    '00000000-0000-0000-0000-000000000a10',
    'Client A'
  ),
  (
    '00000000-0000-0000-0000-000000000b20',
    '00000000-0000-0000-0000-000000000b10',
    'Client B'
  );

insert into public.sites (id, organization_id, client_id, name, url)
values
  (
    '00000000-0000-0000-0000-000000000a30',
    '00000000-0000-0000-0000-000000000a10',
    '00000000-0000-0000-0000-000000000a20',
    'Site A',
    'https://a.example.test'
  ),
  (
    '00000000-0000-0000-0000-000000000b30',
    '00000000-0000-0000-0000-000000000b10',
    '00000000-0000-0000-0000-000000000b20',
    'Site B',
    'https://b.example.test'
  );

insert into public.site_services (id, organization_id, site_id, type)
values
  (
    '00000000-0000-0000-0000-000000000a40',
    '00000000-0000-0000-0000-000000000a10',
    '00000000-0000-0000-0000-000000000a30',
    'domain'
  ),
  (
    '00000000-0000-0000-0000-000000000b40',
    '00000000-0000-0000-0000-000000000b10',
    '00000000-0000-0000-0000-000000000b30',
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
    '00000000-0000-0000-0000-000000000a50',
    '00000000-0000-0000-0000-000000000a10',
    '00000000-0000-0000-0000-000000000a20',
    'Contract A',
    10000,
    current_date,
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000b50',
    '00000000-0000-0000-0000-000000000b10',
    '00000000-0000-0000-0000-000000000b20',
    'Contract B',
    10000,
    current_date,
    'active'
  );

insert into public.maintenance_tasks (id, organization_id, site_id, title)
values
  (
    '00000000-0000-0000-0000-000000000a60',
    '00000000-0000-0000-0000-000000000a10',
    '00000000-0000-0000-0000-000000000a30',
    'Task A'
  ),
  (
    '00000000-0000-0000-0000-000000000b60',
    '00000000-0000-0000-0000-000000000b10',
    '00000000-0000-0000-0000-000000000b30',
    'Task B'
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
    '00000000-0000-0000-0000-000000000a70',
    '00000000-0000-0000-0000-000000000a10',
    '00000000-0000-0000-0000-000000000a30',
    'Work A',
    30,
    current_date,
    '00000000-0000-0000-0000-000000000a01'
  ),
  (
    '00000000-0000-0000-0000-000000000b70',
    '00000000-0000-0000-0000-000000000b10',
    '00000000-0000-0000-0000-000000000b30',
    'Work B',
    30,
    current_date,
    '00000000-0000-0000-0000-000000000b01'
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
values
  (
    '00000000-0000-0000-0000-000000000d01',
    'terms',
    'test-1',
    now() - interval '1 day',
    now() - interval '1 day',
    '/legal/terms/test-1',
    repeat('a', 64),
    E'# Test terms\n',
    'published',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000d02',
    'privacy',
    'test-1',
    now() - interval '1 day',
    now() - interval '1 day',
    '/legal/privacy/test-1',
    repeat('b', 64),
    E'# Test privacy policy\n',
    'published',
    true
  );

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$select * from public.clients$$,
  '42501',
  null,
  'anon cannot select business data'
);
select throws_ok(
  $$select * from public.accept_current_legal_documents()$$,
  '42501',
  null,
  'anon cannot execute the legal consent RPC'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000a01","role":"authenticated"}',
  true
);

select is((select count(*) from public.organizations), 1::bigint, 'A sees only organization A');
select is((select count(*) from public.clients), 1::bigint, 'A sees only clients in organization A');
select is((select count(*) from public.sites), 1::bigint, 'A sees only sites in organization A');
select is((select count(*) from public.site_services), 1::bigint, 'A sees only services in organization A');
select is((select count(*) from public.maintenance_contracts), 1::bigint, 'A sees only contracts in organization A');
select is((select count(*) from public.maintenance_tasks), 1::bigint, 'A sees only tasks in organization A');
select is((select count(*) from public.work_logs), 1::bigint, 'A sees only work logs in organization A');
select is(
  (
    select count(*)
    from public.sites
    where id = '00000000-0000-0000-0000-000000000b30'
  ),
  0::bigint,
  'A cannot select organization B sites'
);
select is(
  (
    select count(*)
    from public.site_services
    where id = '00000000-0000-0000-0000-000000000b40'
  ),
  0::bigint,
  'A cannot select organization B services'
);
select is(
  (
    select count(*)
    from public.maintenance_contracts
    where id = '00000000-0000-0000-0000-000000000b50'
  ),
  0::bigint,
  'A cannot select organization B contracts'
);
select is(
  (
    select count(*)
    from public.maintenance_tasks
    where id = '00000000-0000-0000-0000-000000000b60'
  ),
  0::bigint,
  'A cannot select organization B tasks'
);
select is(
  (
    select count(*)
    from public.work_logs
    where id = '00000000-0000-0000-0000-000000000b70'
  ),
  0::bigint,
  'A cannot select organization B work logs'
);

select throws_ok(
  $$
    insert into public.clients (organization_id, name)
    values ('00000000-0000-0000-0000-000000000b10', 'Cross-tenant client')
  $$,
  '42501',
  null,
  'A cannot insert into organization B'
);

create temporary table rls_operation_results (
  operation text primary key,
  affected_rows bigint not null
) on commit drop;

with affected as (
  update public.clients
  set name = 'Cross-tenant update'
  where id = '00000000-0000-0000-0000-000000000b20'
  returning 1
)
insert into rls_operation_results (operation, affected_rows)
select 'clients_update', count(*) from affected;

with affected as (
  delete from public.clients
  where id = '00000000-0000-0000-0000-000000000b20'
  returning 1
)
insert into rls_operation_results (operation, affected_rows)
select 'clients_delete', count(*) from affected;

with affected as (
  update public.sites
  set name = 'Cross-tenant update'
  where id = '00000000-0000-0000-0000-000000000b30'
  returning 1
)
insert into rls_operation_results (operation, affected_rows)
select 'sites_update', count(*) from affected;

with affected as (
  delete from public.sites
  where id = '00000000-0000-0000-0000-000000000b30'
  returning 1
)
insert into rls_operation_results (operation, affected_rows)
select 'sites_delete', count(*) from affected;

with affected as (
  update public.site_services
  set provider = 'Cross-tenant update'
  where id = '00000000-0000-0000-0000-000000000b40'
  returning 1
)
insert into rls_operation_results (operation, affected_rows)
select 'site_services_update', count(*) from affected;

with affected as (
  delete from public.site_services
  where id = '00000000-0000-0000-0000-000000000b40'
  returning 1
)
insert into rls_operation_results (operation, affected_rows)
select 'site_services_delete', count(*) from affected;

with affected as (
  update public.maintenance_contracts
  set name = 'Cross-tenant update'
  where id = '00000000-0000-0000-0000-000000000b50'
  returning 1
)
insert into rls_operation_results (operation, affected_rows)
select 'maintenance_contracts_update', count(*) from affected;

with affected as (
  delete from public.maintenance_contracts
  where id = '00000000-0000-0000-0000-000000000b50'
  returning 1
)
insert into rls_operation_results (operation, affected_rows)
select 'maintenance_contracts_delete', count(*) from affected;

with affected as (
  update public.maintenance_tasks
  set title = 'Cross-tenant update'
  where id = '00000000-0000-0000-0000-000000000b60'
  returning 1
)
insert into rls_operation_results (operation, affected_rows)
select 'maintenance_tasks_update', count(*) from affected;

with affected as (
  delete from public.maintenance_tasks
  where id = '00000000-0000-0000-0000-000000000b60'
  returning 1
)
insert into rls_operation_results (operation, affected_rows)
select 'maintenance_tasks_delete', count(*) from affected;

with affected as (
  update public.work_logs
  set title = 'Cross-tenant update'
  where id = '00000000-0000-0000-0000-000000000b70'
  returning 1
)
insert into rls_operation_results (operation, affected_rows)
select 'work_logs_update', count(*) from affected;

with affected as (
  delete from public.work_logs
  where id = '00000000-0000-0000-0000-000000000b70'
  returning 1
)
insert into rls_operation_results (operation, affected_rows)
select 'work_logs_delete', count(*) from affected;

select is(
  (select affected_rows from rls_operation_results where operation = 'clients_update'),
  0::bigint,
  'A update affects zero organization B clients'
);
select is(
  (select affected_rows from rls_operation_results where operation = 'clients_delete'),
  0::bigint,
  'A delete affects zero organization B clients'
);
select is(
  (select affected_rows from rls_operation_results where operation = 'sites_update'),
  0::bigint,
  'A update affects zero organization B sites'
);
select is(
  (select affected_rows from rls_operation_results where operation = 'sites_delete'),
  0::bigint,
  'A delete affects zero organization B sites'
);
select is(
  (select affected_rows from rls_operation_results where operation = 'site_services_update'),
  0::bigint,
  'A update affects zero organization B services'
);
select is(
  (select affected_rows from rls_operation_results where operation = 'site_services_delete'),
  0::bigint,
  'A delete affects zero organization B services'
);
select is(
  (select affected_rows from rls_operation_results where operation = 'maintenance_contracts_update'),
  0::bigint,
  'A update affects zero organization B contracts'
);
select is(
  (select affected_rows from rls_operation_results where operation = 'maintenance_contracts_delete'),
  0::bigint,
  'A delete affects zero organization B contracts'
);
select is(
  (select affected_rows from rls_operation_results where operation = 'maintenance_tasks_update'),
  0::bigint,
  'A update affects zero organization B tasks'
);
select is(
  (select affected_rows from rls_operation_results where operation = 'maintenance_tasks_delete'),
  0::bigint,
  'A delete affects zero organization B tasks'
);
select is(
  (select affected_rows from rls_operation_results where operation = 'work_logs_update'),
  0::bigint,
  'A update affects zero organization B work logs'
);
select is(
  (select affected_rows from rls_operation_results where operation = 'work_logs_delete'),
  0::bigint,
  'A delete affects zero organization B work logs'
);

select throws_ok(
  $$
    insert into public.sites (organization_id, client_id, name, url)
    values (
      '00000000-0000-0000-0000-000000000a10',
      '00000000-0000-0000-0000-000000000b20',
      'Cross-tenant site',
      'https://cross.example.test'
    )
  $$,
  '23503',
  null,
  'composite foreign key rejects a cross-tenant parent reference'
);

select throws_ok(
  $$
    update public.clients
    set organization_id = '00000000-0000-0000-0000-000000000b10'
    where id = '00000000-0000-0000-0000-000000000a20'
  $$,
  '23514',
  null,
  'organization_id cannot be changed'
);

select throws_ok(
  $$
    update public.organizations
    set owner_user_id = '00000000-0000-0000-0000-000000000b01'
    where id = '00000000-0000-0000-0000-000000000a10'
  $$,
  '23514',
  null,
  'owner_user_id cannot be changed'
);

select throws_ok(
  $$
    update public.work_logs
    set created_by = '00000000-0000-0000-0000-000000000b01'
    where id = '00000000-0000-0000-0000-000000000a70'
  $$,
  '23514',
  null,
  'created_by cannot be changed'
);

select throws_ok(
  $$
    insert into public.work_logs (
      organization_id,
      site_id,
      title,
      worked_minutes,
      worked_on
    )
    values (
      '00000000-0000-0000-0000-000000000a10',
      '00000000-0000-0000-0000-000000000a30',
      'Invalid zero minutes',
      0,
      current_date
    )
  $$,
  '23514',
  null,
  'worked_minutes rejects zero'
);
select throws_ok(
  $$
    insert into public.work_logs (
      organization_id,
      site_id,
      title,
      worked_minutes,
      worked_on
    )
    values (
      '00000000-0000-0000-0000-000000000a10',
      '00000000-0000-0000-0000-000000000a30',
      'Invalid excessive minutes',
      1441,
      current_date
    )
  $$,
  '23514',
  null,
  'worked_minutes rejects values above 1440'
);

select throws_ok(
  $$
    insert into public.user_legal_consents (user_id, document_version_id)
    values (
      '00000000-0000-0000-0000-000000000a01',
      '00000000-0000-0000-0000-000000000d01'
    )
  $$,
  '42501',
  null,
  'authenticated users cannot directly insert legal consent rows'
);

select is(
  (select count(*) from public.accept_current_legal_documents()),
  2::bigint,
  'RPC records both current legal documents'
);
select is(
  (select count(*) from public.accept_current_legal_documents()),
  2::bigint,
  'RPC is idempotent when submitted twice'
);
select is(
  (select count(*) from public.user_legal_consents),
  2::bigint,
  'double submission does not create duplicate consent rows'
);
select results_eq(
  $$
    select document_version_id::text
    from public.user_legal_consents
    order by document_version_id
  $$,
  $$
    values
      ('00000000-0000-0000-0000-000000000d01'::text),
      ('00000000-0000-0000-0000-000000000d02'::text)
  $$,
  'RPC resolves the current terms and privacy document versions in the database'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000b01","role":"authenticated"}',
  true
);

select is(
  (select count(*) from public.user_legal_consents),
  0::bigint,
  'B cannot see A legal consent history'
);

reset role;
select set_config('request.jwt.claims', '{}', true);

select throws_ok(
  $$select * from public.accept_current_legal_documents()$$,
  '42501',
  'authentication is required',
  'legal consent RPC rejects a null auth.uid()'
);

insert into public.user_legal_consents (
  id,
  user_id,
  document_version_id,
  accepted_at
)
values (
  '00000000-0000-0000-0000-000000000c01',
  '00000000-0000-0000-0000-000000000b01',
  '00000000-0000-0000-0000-000000000d01',
  '2000-01-01 00:00:00+00'
);

select is(
  (
    select accepted_at
    from public.user_legal_consents
    where id = '00000000-0000-0000-0000-000000000c01'
  ),
  transaction_timestamp(),
  'database overwrites a supplied accepted_at with its transaction timestamp'
);

select is(
  (
    select name
    from public.clients
    where id = '00000000-0000-0000-0000-000000000b20'
  ),
  'Client B',
  'organization B data is unchanged after A cross-tenant update'
);
select is(
  (
    select count(*)
    from public.clients
    where id = '00000000-0000-0000-0000-000000000b20'
  ),
  1::bigint,
  'organization B data remains after A cross-tenant delete'
);

select throws_ok(
  $$
    update public.user_legal_consents
    set accepted_at = now()
    where user_id = '00000000-0000-0000-0000-000000000a01'
  $$,
  '23514',
  null,
  'legal consent history cannot be updated even by the table owner'
);
select throws_ok(
  $$
    delete from public.user_legal_consents
    where user_id = '00000000-0000-0000-0000-000000000a01'
  $$,
  '23514',
  null,
  'legal consent history cannot be deleted even by the table owner'
);

select * from finish();

rollback;
