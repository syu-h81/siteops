begin;

select no_plan();

select has_column(
  'public',
  'legal_document_versions',
  'content_markdown',
  'legal documents store their Markdown body'
);
select has_column(
  'public',
  'legal_document_versions',
  'publication_status',
  'legal documents store their publication status'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'legal_document_versions_published_content_check'
      and contype = 'c'
  ),
  'published legal document content has a check constraint'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'legal_document_versions_current_published_check'
      and contype = 'c'
  ),
  'current legal documents must be published'
);

select is(
  current_setting('server_encoding'),
  'UTF8',
  'legal document content is stored in a UTF8 database'
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
values (
  '00000000-0000-0000-0000-00000000f001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'legal-v2@example.test',
  '',
  now(),
  now(),
  now()
);

select lives_ok(
  $$
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
    ) values (
      '00000000-0000-0000-0000-00000000f010',
      'terms',
      'legacy-test',
      now() - interval '2 days',
      now() - interval '2 days',
      'docs/legal/legacy-test.md',
      repeat('f', 64),
      'legacy',
      false
    )
  $$,
  'legacy rows remain insertable for migration compatibility'
);

select throws_ok(
  $$
    insert into public.legal_document_versions (
      document_type,
      version,
      published_at,
      effective_at,
      content_path,
      content_hash,
      publication_status,
      is_current
    ) values (
      'terms',
      'legacy-current-test',
      now(),
      now(),
      'docs/legal/legacy-current-test.md',
      repeat('f', 64),
      'legacy',
      true
    )
  $$,
  '23514',
  null,
  'new current rows must be published'
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
    '00000000-0000-0000-0000-00000000f101',
    'terms',
    'legal-v2-terms-1',
    now() - interval '1 day',
    now() - interval '1 day',
    'docs/legal/published/legal-v2-terms-1.md',
    repeat('0', 64),
    E'# Terms version 1\n',
    'published',
    true
  ),
  (
    '00000000-0000-0000-0000-00000000f102',
    'privacy',
    'legal-v2-privacy-1',
    now() - interval '1 day',
    now() - interval '1 day',
    'docs/legal/published/legal-v2-privacy-1.md',
    repeat('0', 64),
    E'# Privacy version 1\n',
    'published',
    true
  );

select is(
  (
    select content_hash
    from public.legal_document_versions
    where id = '00000000-0000-0000-0000-00000000f101'
  ),
  pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(E'# Terms version 1\n', 'UTF8'),
      'sha256'
    ),
    'hex'
  ),
  'the database computes SHA-256 from the stored Markdown body'
);

select ok(
  (
    select content_hash = pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(content_markdown, 'UTF8'),
        'sha256'
      ),
      'hex'
    )
    from public.legal_document_versions
    where id = '00000000-0000-0000-0000-00000000f102'
  ),
  'stored published content and content_hash match'
);

select throws_ok(
  $$
    insert into public.legal_document_versions (
      document_type,
      version,
      published_at,
      effective_at,
      content_path,
      content_hash,
      content_markdown,
      publication_status
    ) values (
      'terms',
      'empty-content-test',
      now(),
      now(),
      'docs/legal/published/empty-content-test.md',
      repeat('0', 64),
      E'\n',
      'published'
    )
  $$,
  '23514',
  null,
  'published documents reject an empty Markdown body'
);

select throws_ok(
  $$
    insert into public.legal_document_versions (
      document_type,
      version,
      published_at,
      effective_at,
      content_path,
      content_hash,
      content_markdown,
      publication_status
    ) values (
      'terms',
      'oversize-content-test',
      now(),
      now(),
      'docs/legal/published/oversize-content-test.md',
      repeat('0', 64),
      repeat('a', 1048576) || E'\n',
      'published'
    )
  $$,
  '23514',
  null,
  'published documents reject Markdown larger than one MiB'
);

select throws_ok(
  $$
    insert into public.legal_document_versions (
      document_type,
      version,
      published_at,
      effective_at,
      content_path,
      content_hash,
      content_markdown,
      publication_status
    ) values (
      'terms',
      'legal-v2-draft',
      now(),
      now(),
      'docs/legal/published/legal-v2-terms.md',
      repeat('0', 64),
      E'# Draft version test\n',
      'published'
    )
  $$,
  '23514',
  null,
  'a draft version cannot be marked published'
);

select throws_ok(
  $$
    insert into public.legal_document_versions (
      document_type,
      version,
      published_at,
      effective_at,
      content_path,
      content_hash,
      content_markdown,
      publication_status
    ) values (
      'terms',
      'legal-v2-path-test',
      now(),
      now(),
      'docs/legal/terms_draft.md',
      repeat('0', 64),
      E'# Draft path test\n',
      'published'
    )
  $$,
  '23514',
  null,
  'a draft content path cannot be marked published'
);

select throws_ok(
  $$
    insert into public.legal_document_versions (
      document_type,
      version,
      published_at,
      effective_at,
      content_path,
      content_hash,
      content_markdown,
      publication_status
    ) values (
      'terms',
      'crlf-content-test',
      now(),
      now(),
      'docs/legal/published/crlf-content-test.md',
      repeat('0', 64),
      E'# CRLF\r\n',
      'published'
    )
  $$,
  '23514',
  null,
  'published documents reject CRLF content'
);

select throws_ok(
  $$
    insert into public.legal_document_versions (
      document_type,
      version,
      published_at,
      effective_at,
      content_path,
      content_hash,
      content_markdown,
      publication_status
    ) values (
      'terms',
      'trailing-newlines-test',
      now(),
      now(),
      'docs/legal/published/trailing-newlines-test.md',
      repeat('0', 64),
      E'# Two trailing newlines\n\n',
      'published'
    )
  $$,
  '23514',
  null,
  'published documents require exactly one terminal LF'
);

select throws_ok(
  $$
    update public.legal_document_versions
    set content_markdown = E'# Changed terms\n'
    where id = '00000000-0000-0000-0000-00000000f101'
  $$,
  '23514',
  'published legal documents are immutable',
  'published Markdown cannot be changed'
);

select throws_ok(
  $$
    update public.legal_document_versions
    set version = 'legal-v2-terms-changed'
    where id = '00000000-0000-0000-0000-00000000f101'
  $$,
  '23514',
  'published legal documents are immutable',
  'published document metadata cannot be changed'
);

select throws_ok(
  $$
    delete from public.legal_document_versions
    where id = '00000000-0000-0000-0000-00000000f101'
  $$,
  '23514',
  'published legal documents cannot be deleted',
  'published legal documents cannot be deleted'
);

select has_function(
  'public',
  'accept_legal_documents',
  array['uuid', 'text', 'uuid', 'text'],
  'the expectation-bound legal consent RPC exists'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.accept_legal_documents(uuid,text,uuid,text)',
    'EXECUTE'
  ),
  'authenticated can execute the new legal consent RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.accept_legal_documents(uuid,text,uuid,text)',
    'EXECUTE'
  ),
  'anon cannot execute the new legal consent RPC'
);
select ok(
  not has_function_privilege(
    'service_role',
    'public.accept_legal_documents(uuid,text,uuid,text)',
    'EXECUTE'
  ),
  'service_role cannot execute the new legal consent RPC'
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
      and routine.proname = 'accept_legal_documents'
      and routine.pronargs = 4
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  'PUBLIC has no EXECUTE grant on the new legal consent RPC'
);
select ok(
  (
    select routine.prosecdef
      and 'search_path=""' = any(coalesce(routine.proconfig, '{}'::text[]))
    from pg_proc as routine
    join pg_namespace as namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = 'public'
      and routine.proname = 'accept_legal_documents'
      and routine.pronargs = 4
  ),
  'the new RPC is SECURITY DEFINER with an empty search_path'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.set_current_legal_document(text,uuid)',
    'EXECUTE'
  ),
  'authenticated cannot execute the administrative current-version switch'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$
    select * from public.accept_legal_documents(
      '00000000-0000-0000-0000-00000000f101',
      repeat('0', 64),
      '00000000-0000-0000-0000-00000000f102',
      repeat('0', 64)
    )
  $$,
  '42501',
  null,
  'anon cannot execute the new legal consent RPC'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000f001","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    select * from public.accept_legal_documents(
      '00000000-0000-0000-0000-00000000ffff',
      repeat('0', 64),
      '00000000-0000-0000-0000-00000000f102',
      repeat('0', 64)
    )
  $$,
  'P0001',
  null,
  'the new RPC rejects an unexpected document ID'
);

select throws_ok(
  $$
    select * from public.accept_legal_documents(
      '00000000-0000-0000-0000-00000000f101',
      repeat('0', 64),
      '00000000-0000-0000-0000-00000000f102',
      repeat('0', 64)
    )
  $$,
  'P0001',
  null,
  'the new RPC rejects unexpected content hashes'
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
  '00000000-0000-0000-0000-00000000f103',
  'terms',
  'legal-v2-terms-old',
  now() - interval '2 days',
  now() - interval '2 days',
  'docs/legal/published/legal-v2-terms-old.md',
  repeat('0', 64),
  E'# Old terms\n',
  'published',
  false
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000f001","role":"authenticated"}',
  true
);

select throws_ok(
  format(
    $statement$
      select * from public.accept_legal_documents(
        '00000000-0000-0000-0000-00000000f103',
        %L,
        '00000000-0000-0000-0000-00000000f102',
        %L
      )
    $statement$,
    (
      select content_hash
      from public.legal_document_versions
      where id = '00000000-0000-0000-0000-00000000f103'
    ),
    (
      select content_hash
      from public.legal_document_versions
      where id = '00000000-0000-0000-0000-00000000f102'
    )
  ),
  'P0001',
  null,
  'the new RPC rejects a pair containing one old document'
);

select is(
  (
    select count(*)
    from public.accept_legal_documents(
      '00000000-0000-0000-0000-00000000f101',
      (
        select content_hash
        from public.legal_document_versions
        where id = '00000000-0000-0000-0000-00000000f101'
      ),
      '00000000-0000-0000-0000-00000000f102',
      (
        select content_hash
        from public.legal_document_versions
        where id = '00000000-0000-0000-0000-00000000f102'
      )
    )
  ),
  2::bigint,
  'the new RPC records both displayed legal documents atomically'
);

select is(
  (
    select count(*)
    from public.accept_legal_documents(
      '00000000-0000-0000-0000-00000000f101',
      (
        select content_hash
        from public.legal_document_versions
        where id = '00000000-0000-0000-0000-00000000f101'
      ),
      '00000000-0000-0000-0000-00000000f102',
      (
        select content_hash
        from public.legal_document_versions
        where id = '00000000-0000-0000-0000-00000000f102'
      )
    )
  ),
  2::bigint,
  'the new RPC is idempotent'
);

select is(
  (
    select count(*)
    from public.user_legal_consents
    where user_id = '00000000-0000-0000-0000-00000000f001'
  ),
  2::bigint,
  'double submission leaves exactly two consent rows'
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
  '00000000-0000-0000-0000-00000000f104',
  'terms',
  'legal-v2-terms-2',
  now() - interval '1 hour',
  now() - interval '1 hour',
  'docs/legal/published/legal-v2-terms-2.md',
  repeat('0', 64),
  E'# Terms version 2\n',
  'published',
  false
);

select public.set_current_legal_document(
  'terms',
  '00000000-0000-0000-0000-00000000f104'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000f001","role":"authenticated"}',
  true
);

select throws_ok(
  format(
    $statement$
      select * from public.accept_legal_documents(
        '00000000-0000-0000-0000-00000000f101',
        %L,
        '00000000-0000-0000-0000-00000000f102',
        %L
      )
    $statement$,
    (
      select content_hash
      from public.legal_document_versions
      where id = '00000000-0000-0000-0000-00000000f101'
    ),
    (
      select content_hash
      from public.legal_document_versions
      where id = '00000000-0000-0000-0000-00000000f102'
    )
  ),
  'P0001',
  null,
  'the new RPC rejects the previously current version after a switch'
);

select * from finish();

rollback;
