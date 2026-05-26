alter table public.app_users alter column user_id drop not null;

alter table public.app_users disable row level security;

alter table public.app_users
  add column if not exists full_name text,
  add column if not exists role text not null default 'viewer',
  add column if not exists organization_id uuid references public.organizations(id);

update public.app_users au
set
  full_name = coalesce(au.full_name, p.full_name, split_part(au.email, '@', 1)),
  organization_id = coalesce(au.organization_id, p.organization_id)
from public.profiles p
where au.user_id = p.id;

update public.app_users
set organization_id = '00000000-0000-0000-0000-000000000001'::uuid
where organization_id is null;

alter table public.app_users
  alter column full_name set not null,
  alter column organization_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_users_role_check'
      and conrelid = 'public.app_users'::regclass
  ) then
    alter table public.app_users
      add constraint app_users_role_check
      check (role in ('company_admin', 'project_manager', 'site_engineer', 'foreman', 'client', 'viewer', 'super_admin'));
  end if;
end
$$;
