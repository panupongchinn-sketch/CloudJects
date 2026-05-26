do $$
begin
  update auth.users
  set
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    confirmed_at = coalesce(confirmed_at, now()),
    updated_at = now()
  where lower(email) = 'panupong.chinn@gmail.com';

  if not found then
    raise exception 'User panupong.chinn@gmail.com not found in auth.users';
  end if;
end
$$;
