do $$
declare
  v_user_id uuid;
  v_full_name text;
begin
  select
    id,
    coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
  into
    v_user_id,
    v_full_name
  from auth.users
  where lower(email) = 'panupong.chinn@gmail.com'
  limit 1;

  if v_user_id is null then
    raise exception 'User panupong.chinn@gmail.com not found in auth.users';
  end if;

  insert into public.user_roles (user_id, role)
  values (v_user_id, 'super_admin')
  on conflict (user_id, role) do nothing;

  insert into public.platform_admins (user_id, full_name, email, role, is_active)
  values (
    v_user_id,
    v_full_name,
    'panupong.chinn@gmail.com',
    'platform_admin',
    true
  )
  on conflict (user_id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role,
    is_active = true,
    updated_at = now();
end
$$;
