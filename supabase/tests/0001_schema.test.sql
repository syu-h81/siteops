begin;

select no_plan();

select has_table('public', 'organizations', 'organizations table exists');
select has_table('public', 'clients', 'clients table exists');
select has_table('public', 'sites', 'sites table exists');
select has_table('public', 'site_services', 'site_services table exists');
select has_table('public', 'maintenance_contracts', 'maintenance_contracts table exists');
select has_table('public', 'maintenance_tasks', 'maintenance_tasks table exists');
select has_table('public', 'work_logs', 'work_logs table exists');
select has_table('public', 'legal_document_versions', 'legal_document_versions table exists');
select has_table('public', 'user_legal_consents', 'user_legal_consents table exists');

select has_pk('public', 'organizations', 'organizations has a primary key');
select has_pk('public', 'clients', 'clients has a primary key');
select has_pk('public', 'sites', 'sites has a primary key');
select has_pk('public', 'site_services', 'site_services has a primary key');
select has_pk('public', 'maintenance_contracts', 'maintenance_contracts has a primary key');
select has_pk('public', 'maintenance_tasks', 'maintenance_tasks has a primary key');
select has_pk('public', 'work_logs', 'work_logs has a primary key');
select has_pk('public', 'legal_document_versions', 'legal_document_versions has a primary key');
select has_pk('public', 'user_legal_consents', 'user_legal_consents has a primary key');

select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'sites_organization_id_client_id_fkey'
      and contype = 'f'
  ),
  'sites has the tenant-safe client composite foreign key'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'site_services_organization_id_site_id_fkey'
      and contype = 'f'
  ),
  'site_services has the tenant-safe site composite foreign key'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'maintenance_contracts_organization_id_client_id_fkey'
      and contype = 'f'
  ),
  'maintenance_contracts has the tenant-safe client composite foreign key'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'maintenance_tasks_organization_id_site_id_fkey'
      and contype = 'f'
  ),
  'maintenance_tasks has the tenant-safe site composite foreign key'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'work_logs_organization_id_site_id_fkey'
      and contype = 'f'
  ),
  'work_logs has the tenant-safe site composite foreign key'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'work_logs_worked_minutes_check'
      and contype = 'c'
  ),
  'work_logs has its worked_minutes check constraint'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'maintenance_tasks_completion_check'
      and contype = 'c'
  ),
  'maintenance_tasks enforces status and completed_at consistency'
);

select ok(
  (
    select bool_and(class.relrowsecurity)
    from pg_class as class
    join pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relname in (
        'organizations',
        'clients',
        'sites',
        'site_services',
        'maintenance_contracts',
        'maintenance_tasks',
        'work_logs',
        'legal_document_versions',
        'user_legal_consents'
      )
  ),
  'RLS is enabled on every Phase 1-A table'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'organizations'
  ),
  3::bigint,
  'organizations has SELECT, INSERT, and UPDATE policies only'
);
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'clients',
        'sites',
        'site_services',
        'maintenance_contracts',
        'maintenance_tasks',
        'work_logs'
      )
  ),
  24::bigint,
  'tenant tables have separate policies for all four operations'
);

select ok(
  not has_table_privilege('anon', 'public.clients', 'SELECT'),
  'anon has no access to business tables'
);
select ok(
  not exists (
    select 1
    from information_schema.role_table_grants
    where grantee = 'anon'
      and table_schema = 'public'
      and table_name in (
        'organizations',
        'clients',
        'sites',
        'site_services',
        'maintenance_contracts',
        'maintenance_tasks',
        'work_logs'
      )
  ),
  'anon has no privilege on any business table'
);
select ok(
  not has_table_privilege('authenticated', 'public.organizations', 'DELETE'),
  'authenticated users cannot delete organizations'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_legal_consents', 'INSERT'),
  'authenticated users cannot directly insert legal consents'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_legal_consents', 'UPDATE'),
  'authenticated users cannot update legal consents'
);
select ok(
  not has_table_privilege('authenticated', 'public.user_legal_consents', 'DELETE'),
  'authenticated users cannot delete legal consents'
);

select has_function(
  'public',
  'accept_current_legal_documents',
  array[]::text[],
  'legal consent RPC exists'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.accept_current_legal_documents()',
    'EXECUTE'
  ),
  'authenticated can execute the legal consent RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.accept_current_legal_documents()',
    'EXECUTE'
  ),
  'anon cannot execute the legal consent RPC'
);
select ok(
  not has_function_privilege(
    'service_role',
    'public.accept_current_legal_documents()',
    'EXECUTE'
  ),
  'service_role cannot execute the legal consent RPC'
);
select ok(
  (
    select routine.prosecdef
    from pg_proc as routine
    join pg_namespace as namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = 'public'
      and routine.proname = 'accept_current_legal_documents'
      and routine.pronargs = 0
  ),
  'legal consent RPC is SECURITY DEFINER'
);
select ok(
  (
    select 'search_path=""' = any(coalesce(routine.proconfig, '{}'::text[]))
    from pg_proc as routine
    join pg_namespace as namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = 'public'
      and routine.proname = 'accept_current_legal_documents'
      and routine.pronargs = 0
  ),
  'legal consent RPC has an empty fixed search_path'
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
  'PUBLIC has no EXECUTE grant on the legal consent RPC'
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
      and privilege.privilege_type = 'EXECUTE'
      and privilege.grantee not in (
        routine.proowner,
        'authenticated'::regrole::oid
      )
  ),
  'only the function owner and authenticated have EXECUTE grants'
);
select ok(
  exists (
    select 1
    from pg_trigger as trigger
    join pg_class as class on class.oid = trigger.tgrelid
    join pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relname = 'user_legal_consents'
      and trigger.tgname = 'user_legal_consents_force_accepted_at'
      and not trigger.tgisinternal
  ),
  'legal consent INSERTs force accepted_at through a database trigger'
);

select is(
  (
    select count(*)
    from pg_trigger as trigger
    join pg_class as class on class.oid = trigger.tgrelid
    join pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and trigger.tgname like '%_set_updated_at'
      and not trigger.tgisinternal
  ),
  7::bigint,
  'all seven business tables have an updated_at trigger'
);
select is(
  (
    select count(*)
    from pg_trigger as trigger
    join pg_class as class on class.oid = trigger.tgrelid
    join pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and trigger.tgname like '%_prevent_organization_id_change'
      and not trigger.tgisinternal
  ),
  6::bigint,
  'all tenant child tables prevent organization_id changes'
);

select * from finish();

rollback;
