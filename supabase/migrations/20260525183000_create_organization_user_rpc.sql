create or replace function public.create_organization_user_with_app_auth(
  p_token text,
  p_full_name text,
  p_email text,
  p_password_hash text,
  p_role text
)
returns table(user_id uuid, email text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_session_user_id uuid;
  v_session_expires_at timestamptz;
  v_actor_org_id uuid;
  v_is_platform_admin boolean := false;
  v_can_manage_users boolean := false;
  v_role public.app_role;
  v_email text := lower(trim(p_email));
  v_user_id uuid := gen_random_uuid();
begin
  if coalesce(trim(p_token), '') = '' then
    raise exception 'Unauthorized';
  end if;

  select s.user_id, s.expires_at
  into v_session_user_id, v_session_expires_at
  from public.app_sessions s
  where s.token = p_token
  limit 1;

  if v_session_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if v_session_expires_at <= now() then
    raise exception 'Session expired';
  end if;

  select p.organization_id
  into v_actor_org_id
  from public.profiles p
  where p.id = v_session_user_id;

  if v_actor_org_id is null then
    raise exception 'Organization not found';
  end if;

  select exists(
    select 1
    from public.platform_admins pa
    where pa.user_id = v_session_user_id
      and pa.is_active = true
  )
  into v_is_platform_admin;

  select exists(
    select 1
    from public.user_roles ur
    where ur.user_id = v_session_user_id
      and ur.role in ('super_admin', 'company_admin')
  )
  into v_can_manage_users;

  if not (v_is_platform_admin or v_can_manage_users) then
    raise exception 'You do not have permission to create users';
  end if;

  begin
    v_role := p_role::public.app_role;
  exception
    when others then
      raise exception 'Invalid role';
  end;

  if exists(select 1 from auth.users where lower(auth.users.email) = v_email)
    or exists(select 1 from public.profiles where lower(public.profiles.email) = v_email)
    or exists(select 1 from public.app_users where lower(public.app_users.email) = v_email)
  then
    raise exception 'Email already exists';
  end if;

  insert into auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data
  )
  values (
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    'app-managed-login',
    now(),
    now(),
    jsonb_build_object('full_name', p_full_name),
    '{}'::jsonb
  );

  update public.profiles
  set
    full_name = p_full_name,
    email = v_email,
    organization_id = v_actor_org_id
  where id = v_user_id;

  delete from public.user_roles where user_id = v_user_id;

  insert into public.user_roles (user_id, role)
  values (v_user_id, v_role);

  insert into public.app_users (user_id, email, password_hash, is_active)
  values (v_user_id, v_email, p_password_hash, true);

  return query
  select v_user_id, v_email;
end;
$$;

grant execute on function public.create_organization_user_with_app_auth(text, text, text, text, text) to anon, authenticated;
