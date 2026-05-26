create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  email text not null unique,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_app_users_updated'
      and tgrelid = 'public.app_users'::regclass
  ) then
    create trigger trg_app_users_updated
    before update on public.app_users
    for each row execute function public.set_updated_at();
  end if;
end
$$;

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_sessions_token on public.app_sessions(token);
create index if not exists idx_app_sessions_user on public.app_sessions(user_id);

alter table public.app_users disable row level security;
alter table public.app_sessions disable row level security;

do $$
declare
  v_user_id uuid;
begin
  select p.id
  into v_user_id
  from public.profiles p
  where lower(p.email) = 'panupong.chinn@gmail.com'
  limit 1;

  if v_user_id is null then
    select u.id
    into v_user_id
    from auth.users u
    where lower(u.email) = 'panupong.chinn@gmail.com'
    limit 1;

    if v_user_id is not null then
      insert into public.profiles (id, full_name, email, organization_id)
      select
        u.id,
        coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
        u.email,
        '00000000-0000-0000-0000-000000000001'::uuid
      from auth.users u
      where u.id = v_user_id
      on conflict (id) do nothing;
    end if;
  end if;

  if v_user_id is not null then
    insert into public.app_users (user_id, email, password_hash, is_active)
    values (
      v_user_id,
      'panupong.chinn@gmail.com',
      '38c056291c3baed54e4746fb54f14538:7961685e29de75cdc85a2f06932603e1b6a3c7dd06591c14b9a048f8ecc6fc9ed0bd7349ec490c7f6964f3b929e74591e7190d4885a53ca73d9d5daf6d912fa3',
      true
    )
    on conflict (email) do update
    set
      user_id = excluded.user_id,
      password_hash = excluded.password_hash,
      is_active = true,
      updated_at = now();
  end if;
end
$$;

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not in ('schema_migrations')
  loop
    execute format('alter table %I.%I disable row level security', r.schemaname, r.tablename);
  end loop;
end
$$;
