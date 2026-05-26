create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_company text;
  v_full_name text;
  v_org_id uuid;
  v_role public.app_role;
  v_plan_id uuid;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );
  v_company := nullif(trim(coalesce(new.raw_user_meta_data->>'company_name', '')), '');

  if v_company is not null then
    insert into public.organizations (name, email, contact_name, phone, address, status)
    values (
      v_company,
      new.email,
      v_full_name,
      nullif(trim(coalesce(new.raw_user_meta_data->>'phone_number', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data->>'company_address', '')), ''),
      'trial'
    )
    returning id into v_org_id;

    select id
    into v_plan_id
    from public.subscription_plans
    where code = 'starter'
    limit 1;

    if v_plan_id is not null then
      insert into public.organization_subscriptions (
        organization_id,
        plan_id,
        status,
        billing_cycle,
        monthly_price,
        start_date,
        next_billing_date,
        trial_ends_at
      )
      values (
        v_org_id,
        v_plan_id,
        'trial',
        'monthly',
        0,
        current_date,
        current_date + 15,
        current_date + 15
      );
    end if;

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
