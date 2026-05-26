CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_company text;
  v_full_name text;
  v_org_id uuid;
  v_role public.app_role;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );
  v_company := nullif(trim(coalesce(new.raw_user_meta_data->>'company_name', '')), '');

  if v_company is not null then
    insert into public.organizations (name, email, contact_name, status)
    values (v_company, new.email, v_full_name, 'trial')
    returning id into v_org_id;
    v_role := 'company_admin';
  else
    v_org_id := '00000000-0000-0000-0000-000000000001'::uuid;
    v_role := 'viewer';
  end if;

  insert into public.profiles (id, full_name, email, avatar_url, organization_id)
  values (
    new.id,
    v_full_name,
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    v_org_id
  );

  insert into public.user_roles (user_id, role) values (new.id, v_role);

  return new;
end;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS "Company admin update own org" ON public.organizations;
CREATE POLICY "Company admin update own org"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (id = public.get_my_organization_id(auth.uid()) AND public.is_company_admin(auth.uid()))
  WITH CHECK (id = public.get_my_organization_id(auth.uid()) AND public.is_company_admin(auth.uid()));