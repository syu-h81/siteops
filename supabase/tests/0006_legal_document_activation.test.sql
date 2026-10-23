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
    '00000000-0000-0000-0000-000000f60001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'activation-owner@example.test',
    '',
    now(),
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000f60002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'activation-other@example.test',
    '',
    now(),
    now(),
    now()
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
    '00000000-0000-0000-0000-000000f60101',
    'terms',
    'activation-terms-1',
    now() - interval '3 days',
    now() - interval '3 days',
    'docs/legal/published/activation-terms-1.md',
    repeat('0', 64),
    E'# Activation terms 1\n',
    'published',
    true
  ),
  (
    '00000000-0000-0000-0000-000000f60102',
    'privacy',
    'activation-privacy-1',
    now() - interval '3 days',
    now() - interval '3 days',
    'docs/legal/published/activation-privacy-1.md',
    repeat('0', 64),
    E'# Activation privacy 1\n',
    'published',
    true
  ),
  (
    '00000000-0000-0000-0000-000000f60111',
    'terms',
    'activation-terms-future-effective',
    now() - interval '1 day',
    now() + interval '1 day',
    'docs/legal/published/activation-terms-future-effective.md',
    repeat('0', 64),
    E'# Future effective terms\n',
    'published',
    false
  ),
  (
    '00000000-0000-0000-0000-000000f60112',
    'privacy',
    'activation-privacy-future-published',
    now() + interval '1 day',
    now() + interval '2 days',
    'docs/legal/published/activation-privacy-future-published.md',
    repeat('0', 64),
    E'# Future published privacy\n',
    'published',
    false
  ),
  (
    '00000000-0000-0000-0000-000000f60121',
    'terms',
    'activation-terms-2',
    now() - interval '1 hour',
    now() - interval '1 hour',
    'docs/legal/published/activation-terms-2.md',
    repeat('0', 64),
    E'# Activation terms 2\n',
    'published',
    false
  ),
  (
    '00000000-0000-0000-0000-000000f60122',
    'privacy',
    'activation-privacy-2',
    now() - interval '1 hour',
    now() - interval '1 hour',
    'docs/legal/published/activation-privacy-2.md',
    repeat('0', 64),
    E'# Activation privacy 2\n',
    'published',
    false
  );

insert into public.user_legal_consents (user_id, document_version_id)
values
  (
    '00000000-0000-0000-0000-000000f60001',
    '00000000-0000-0000-0000-000000f60101'
  ),
  (
    '00000000-0000-0000-0000-000000f60001',
    '00000000-0000-0000-0000-000000f60102'
  );

select throws_ok(
  $$
    select public.set_current_legal_document(
      'terms',
      '00000000-0000-0000-0000-000000f60111'
    )
  $$,
  'P0001',
  'target legal document is not eligible to become current',
  'a published but not-yet-effective document is rejected'
);

select ok(
  (
    select is_current
    from public.legal_document_versions
    where id = '00000000-0000-0000-0000-000000f60101'
  ),
  'rejected effective-date activation preserves the old terms version'
);
select ok(
  not (
    select is_current
    from public.legal_document_versions
    where id = '00000000-0000-0000-0000-000000f60111'
  ),
  'rejected effective-date activation leaves the target non-current'
);
select ok(
  (
    select is_current
    from public.legal_document_versions
    where id = '00000000-0000-0000-0000-000000f60102'
  ),
  'rejected terms activation does not affect the current privacy version'
);
select is(
  (
    select count(*)
    from public.user_legal_consents
    where user_id = '00000000-0000-0000-0000-000000f60001'
  ),
  2::bigint,
  'rejected activation preserves existing consent history'
);

select throws_ok(
  $$
    select public.set_current_legal_document(
      'privacy',
      '00000000-0000-0000-0000-000000f60112'
    )
  $$,
  'P0001',
  'target legal document is not eligible to become current',
  'a document with a future publication time is rejected'
);

select ok(
  (
    select is_current
    from public.legal_document_versions
    where id = '00000000-0000-0000-0000-000000f60102'
  ),
  'rejected publication-date activation preserves the old privacy version'
);
select ok(
  not (
    select is_current
    from public.legal_document_versions
    where id = '00000000-0000-0000-0000-000000f60112'
  ),
  'rejected publication-date activation leaves the target non-current'
);
select is(
  (
    select count(*)
    from public.user_legal_consents
    where user_id = '00000000-0000-0000-0000-000000f60001'
  ),
  2::bigint,
  'a second rejected activation also preserves consent history'
);

select lives_ok(
  $$
    select public.set_current_legal_document(
      'terms',
      '00000000-0000-0000-0000-000000f60121'
    )
  $$,
  'an effective terms document can become current'
);
select ok(
  (
    select is_current
    from public.legal_document_versions
    where id = '00000000-0000-0000-0000-000000f60121'
  )
  and (
    select is_current
    from public.legal_document_versions
    where id = '00000000-0000-0000-0000-000000f60102'
  ),
  'switching terms leaves the current privacy version unchanged'
);

select lives_ok(
  $$
    select public.set_current_legal_document(
      'privacy',
      '00000000-0000-0000-0000-000000f60122'
    )
  $$,
  'an effective privacy document can become current independently'
);
select ok(
  (
    select is_current
    from public.legal_document_versions
    where id = '00000000-0000-0000-0000-000000f60121'
  )
  and (
    select is_current
    from public.legal_document_versions
    where id = '00000000-0000-0000-0000-000000f60122'
  ),
  'both independently activated document versions remain current'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000f60001","role":"authenticated"}',
  true
);

select throws_ok(
  $$select * from public.accept_current_legal_documents()$$,
  '42501',
  null,
  'authenticated still cannot execute the legacy consent RPC'
);

select is(
  (
    select count(*)
    from public.accept_legal_documents(
      '00000000-0000-0000-0000-000000f60121',
      (
        select content_hash
        from public.legal_document_versions
        where id = '00000000-0000-0000-0000-000000f60121'
      ),
      '00000000-0000-0000-0000-000000f60122',
      (
        select content_hash
        from public.legal_document_versions
        where id = '00000000-0000-0000-0000-000000f60122'
      )
    )
  ),
  2::bigint,
  'the new consent RPC still accepts the activated document pair'
);

select is(
  private.has_current_legal_consents(),
  true,
  'the current-consent predicate remains true after renewed consent'
);

select lives_ok(
  $$
    insert into public.organizations (owner_user_id, name)
    values (
      '00000000-0000-0000-0000-000000f60001',
      'Activation Test Organization'
    )
  $$,
  'renewed consent still permits the owner to create an organization'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000f60002","role":"authenticated"}',
  true
);

select is(
  private.has_current_legal_consents(),
  false,
  'a different user without consent remains blocked'
);
select is(
  (select count(*) from public.organizations),
  0::bigint,
  'RLS continues to hide another user organization'
);
select throws_ok(
  $$
    insert into public.organizations (owner_user_id, name)
    values (
      '00000000-0000-0000-0000-000000f60002',
      'Blocked Organization'
    )
  $$,
  '42501',
  null,
  'RLS continues to reject organization creation without consent'
);

reset role;

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
  'all business RLS policies retain the current-consent gate'
);

select * from finish();

rollback;
