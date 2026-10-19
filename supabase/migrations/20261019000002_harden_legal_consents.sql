-- Harden legal consent timestamps and RPC execution privileges without
-- rewriting the already-applied Phase 1-A migration or existing consent rows.

create or replace function public.force_user_legal_consent_accepted_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.accepted_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.force_user_legal_consent_accepted_at()
from public, anon, authenticated, service_role;

create trigger user_legal_consents_force_accepted_at
before insert on public.user_legal_consents
for each row execute function public.force_user_legal_consent_accepted_at();

alter function public.accept_current_legal_documents()
set search_path = '';

revoke all on function public.accept_current_legal_documents()
from public, anon, authenticated, service_role;

grant execute on function public.accept_current_legal_documents()
to authenticated;
