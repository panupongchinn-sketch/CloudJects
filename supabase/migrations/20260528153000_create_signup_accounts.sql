create table if not exists public.signup_accounts (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null unique references public.app_users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  company text not null,
  phone text not null,
  address text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'company_admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint signup_accounts_role_check
    check (role in ('company_admin', 'project_manager', 'site_engineer', 'foreman', 'client', 'viewer', 'super_admin'))
);

create index if not exists idx_signup_accounts_email on public.signup_accounts(email);
create index if not exists idx_signup_accounts_org on public.signup_accounts(organization_id);

alter table public.signup_accounts disable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_signup_accounts_updated'
      and tgrelid = 'public.signup_accounts'::regclass
  ) then
    create trigger trg_signup_accounts_updated
    before update on public.signup_accounts
    for each row execute function public.set_updated_at();
  end if;
end
$$;
