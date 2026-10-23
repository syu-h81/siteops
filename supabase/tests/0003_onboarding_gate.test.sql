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
select
  format(
    '00000000-0000-0000-0000-%s',
    lpad(user_number::text, 12, '0')
  )::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  format('onboarding-%s@example.test', user_number),
  '',
  now(),
  now(),
  now()
from generate_series(1, 11) as user_number;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    insert into public.organizations (owner_user_id, name)
    values ('00000000-0000-0000-0000-000000000001', 'No documents')
  $$,
  '42501',
  null,
  'organization creation is rejected when no current legal documents exist'
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
  '00000000-0000-0000-0000-00000000d011',
  'terms',
  'onboarding-test-terms-only',
  now() - interval '1 day',
  now() - interval '1 day',
  '/legal/terms/onboarding-test-only',
  repeat('a', 64),
  E'# Onboarding terms only\n',
  'published',
  true
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    insert into public.organizations (owner_user_id, name)
    values ('00000000-0000-0000-0000-000000000002', 'Terms only')
  $$,
  '42501',
  null,
  'organization creation is rejected when only current terms exist'
);

reset role;

update public.legal_document_versions
set is_current = false
where id = '00000000-0000-0000-0000-00000000d011';

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
  '00000000-0000-0000-0000-00000000d002',
  'privacy',
  'onboarding-test-privacy-1',
  now() - interval '1 day',
  now() - interval '1 day',
  '/legal/privacy/onboarding-test-1',
  repeat('b', 64),
  E'# Onboarding privacy 1\n',
  'published',
  true
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    insert into public.organizations (owner_user_id, name)
    values ('00000000-0000-0000-0000-000000000003', 'Privacy only')
  $$,
  '42501',
  null,
  'organization creation is rejected when only a current privacy policy exists'
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
  '00000000-0000-0000-0000-00000000d001',
  'terms',
  'onboarding-test-terms-1',
  now() - interval '1 day',
  now() - interval '1 day',
  '/legal/terms/onboarding-test-1',
  repeat('a', 64),
  E'# Onboarding terms 1\n',
  'published',
  true
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    insert into public.organizations (owner_user_id, name)
    values ('00000000-0000-0000-0000-000000000004', 'No consent')
  $$,
  '42501',
  null,
  'organization creation is rejected without legal consent'
);

reset role;

insert into public.user_legal_consents (user_id, document_version_id)
values (
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-00000000d001'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000005","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    insert into public.organizations (owner_user_id, name)
    values ('00000000-0000-0000-0000-000000000005', 'Partial consent')
  $$,
  '42501',
  null,
  'organization creation is rejected after accepting only one current document'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000006","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)
    from public.accept_legal_documents(
      '00000000-0000-0000-0000-00000000d001',
      (
        select content_hash from public.legal_document_versions
        where id = '00000000-0000-0000-0000-00000000d001'
      ),
      '00000000-0000-0000-0000-00000000d002',
      (
        select content_hash from public.legal_document_versions
        where id = '00000000-0000-0000-0000-00000000d002'
      )
    )
  ),
  2::bigint,
  'the new RPC records both current legal consents before onboarding'
);

select lives_ok(
  $$
    insert into public.organizations (id, owner_user_id, name)
    values (
      '00000000-0000-0000-0000-00000000e001',
      '00000000-0000-0000-0000-000000000006',
      'Organization A'
    )
  $$,
  'organization creation succeeds after accepting both current documents'
);

select is(
  (
    select count(*)
    from public.organizations
    where owner_user_id = '00000000-0000-0000-0000-000000000006'
  ),
  1::bigint,
  'the accepted user owns exactly one organization'
);

reset role;

insert into public.user_legal_consents (user_id, document_version_id)
values
  (
    '00000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-00000000d001'
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-00000000d002'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000007","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    insert into public.organizations (owner_user_id, name)
    values ('00000000-0000-0000-0000-000000000008', 'Wrong owner')
  $$,
  '42501',
  null,
  'organization creation cannot assign another user as owner'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000006","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    insert into public.organizations (owner_user_id, name)
    values ('00000000-0000-0000-0000-000000000006', 'Second organization')
  $$,
  '23505',
  null,
  'the owner uniqueness constraint rejects a second organization'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000009","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)
    from public.accept_legal_documents(
      '00000000-0000-0000-0000-00000000d001',
      (
        select content_hash from public.legal_document_versions
        where id = '00000000-0000-0000-0000-00000000d001'
      ),
      '00000000-0000-0000-0000-00000000d002',
      (
        select content_hash from public.legal_document_versions
        where id = '00000000-0000-0000-0000-00000000d002'
      )
    )
  ),
  2::bigint,
  'a user accepts the first current legal document versions'
);

reset role;

update public.legal_document_versions
set is_current = false
where id = '00000000-0000-0000-0000-00000000d001';

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
  '00000000-0000-0000-0000-00000000d003',
  'terms',
  'onboarding-test-terms-2',
  now() - interval '1 hour',
  now() - interval '1 hour',
  '/legal/terms/onboarding-test-2',
  repeat('c', 64),
  E'# Onboarding terms 2\n',
  'published',
  true
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000009","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    insert into public.organizations (owner_user_id, name)
    values ('00000000-0000-0000-0000-000000000009', 'Stale consent')
  $$,
  '42501',
  null,
  'acceptance of an old terms version does not authorize organization creation'
);

reset role;

update public.legal_document_versions
set is_current = false
where id = '00000000-0000-0000-0000-00000000d003';

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
  '00000000-0000-0000-0000-00000000d004',
  'terms',
  'onboarding-test-terms-future',
  now() - interval '1 hour',
  now() + interval '1 day',
  '/legal/terms/onboarding-test-future',
  repeat('d', 64),
  E'# Onboarding future terms\n',
  'published',
  true
);

insert into public.user_legal_consents (user_id, document_version_id)
values
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-00000000d004'
  ),
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-00000000d002'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000010","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    insert into public.organizations (owner_user_id, name)
    values ('00000000-0000-0000-0000-000000000010', 'Future document')
  $$,
  '42501',
  null,
  'organization creation is rejected while a current document is not effective'
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$
    insert into public.organizations (owner_user_id, name)
    values ('00000000-0000-0000-0000-000000000011', 'Anonymous organization')
  $$,
  '42501',
  null,
  'anonymous users cannot create organizations'
);

reset role;

update public.legal_document_versions
set is_current = false
where id = '00000000-0000-0000-0000-00000000d004';

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
  '00000000-0000-0000-0000-00000000d005',
  'terms',
  'onboarding-test-terms-3',
  now() - interval '1 hour',
  now() - interval '1 hour',
  '/legal/terms/onboarding-test-3',
  repeat('e', 64),
  E'# Onboarding terms 3\n',
  'published',
  true
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000011","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)
    from public.accept_legal_documents(
      '00000000-0000-0000-0000-00000000d005',
      (
        select content_hash from public.legal_document_versions
        where id = '00000000-0000-0000-0000-00000000d005'
      ),
      '00000000-0000-0000-0000-00000000d002',
      (
        select content_hash from public.legal_document_versions
        where id = '00000000-0000-0000-0000-00000000d002'
      )
    )
  ),
  2::bigint,
  'organization B owner accepts the latest current documents'
);

select lives_ok(
  $$
    insert into public.organizations (id, owner_user_id, name)
    values (
      '00000000-0000-0000-0000-00000000e002',
      '00000000-0000-0000-0000-000000000011',
      'Organization B'
    )
  $$,
  'organization B is created after current consent'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000006","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)
    from public.accept_legal_documents(
      '00000000-0000-0000-0000-00000000d005',
      (
        select content_hash from public.legal_document_versions
        where id = '00000000-0000-0000-0000-00000000d005'
      ),
      '00000000-0000-0000-0000-00000000d002',
      (
        select content_hash from public.legal_document_versions
        where id = '00000000-0000-0000-0000-00000000d002'
      )
    )
  ),
  2::bigint,
  'organization A owner renews consent before business-data access'
);

select is(
  (select count(*) from public.organizations),
  1::bigint,
  'organization A owner still sees only organization A'
);

create temporary table onboarding_rls_results (
  operation text primary key,
  affected_rows bigint not null
) on commit drop;

with affected as (
  update public.organizations
  set name = 'Cross-tenant update'
  where id = '00000000-0000-0000-0000-00000000e002'
  returning 1
)
insert into onboarding_rls_results (operation, affected_rows)
select 'organization_update', count(*) from affected;

select is(
  (
    select affected_rows
    from onboarding_rls_results
    where operation = 'organization_update'
  ),
  0::bigint,
  'organization A owner cannot update organization B'
);

reset role;

select is(
  (
    select name
    from public.organizations
    where id = '00000000-0000-0000-0000-00000000e002'
  ),
  'Organization B',
  'organization B remains unchanged after a cross-tenant update attempt'
);

select * from finish();

rollback;
