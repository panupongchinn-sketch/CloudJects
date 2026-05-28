alter table if exists public.signup_accounts disable row level security;

do $$
declare
  policy_name text;
begin
  for policy_name in
    select pol.polname
    from pg_policy pol
    join pg_class cls on cls.oid = pol.polrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public'
      and cls.relname = 'signup_accounts'
  loop
    execute format('drop policy if exists %I on public.signup_accounts', policy_name);
  end loop;
end
$$;
