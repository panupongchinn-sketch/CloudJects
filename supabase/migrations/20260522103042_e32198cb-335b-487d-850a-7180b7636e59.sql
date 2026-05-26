
-- =========================================
-- 1. ORGANIZATIONS
-- =========================================
create type public.org_status as enum ('active','trial','suspended','cancelled','expired');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  address text,
  phone text,
  email text,
  contact_name text,
  status public.org_status not null default 'trial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.organizations enable row level security;

create trigger trg_organizations_updated
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- Default org สำหรับ backfill ข้อมูลเดิม
insert into public.organizations (id, name, status, contact_name, email)
values ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'active', 'System', 'admin@example.com');

-- =========================================
-- 2. ADD organization_id ให้ตารางหลัก
-- =========================================
alter table public.profiles add column organization_id uuid references public.organizations(id);
update public.profiles set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
alter table public.profiles alter column organization_id set not null;
alter table public.profiles alter column organization_id set default '00000000-0000-0000-0000-000000000001';

alter table public.projects add column organization_id uuid references public.organizations(id);
update public.projects set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
alter table public.projects alter column organization_id set not null;
alter table public.projects alter column organization_id set default '00000000-0000-0000-0000-000000000001';

alter table public.clients add column organization_id uuid references public.organizations(id);
update public.clients set organization_id = '00000000-0000-0000-0000-000000000001' where organization_id is null;
alter table public.clients alter column organization_id set not null;
alter table public.clients alter column organization_id set default '00000000-0000-0000-0000-000000000001';

create index idx_projects_org on public.projects(organization_id);
create index idx_profiles_org on public.profiles(organization_id);
create index idx_clients_org on public.clients(organization_id);

-- =========================================
-- 3. PLATFORM ADMINS
-- =========================================
create table public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'platform_admin', -- platform_admin | support_staff | billing_admin
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
create trigger trg_platform_admins_updated before update on public.platform_admins
  for each row execute function public.set_updated_at();

-- =========================================
-- 4. HELPER FUNCTIONS
-- =========================================
create or replace function public.is_platform_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = _user_id and is_active = true)
$$;

create or replace function public.get_my_organization_id(_user_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = _user_id limit 1
$$;

create or replace function public.same_organization(_org_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select _org_id = public.get_my_organization_id(_user_id)
$$;

create or replace function public.is_company_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_any_role(_user_id, array['super_admin','company_admin']::public.app_role[])
$$;

-- =========================================
-- 5. SUBSCRIPTION PLANS
-- =========================================
create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  monthly_price numeric(12,2) not null default 0,
  yearly_price numeric(12,2),
  max_users integer not null default 10,
  max_projects integer not null default 5,        -- -1 = unlimited
  max_storage_gb integer not null default 5,
  can_use_gantt boolean not null default false,
  can_use_custom_form boolean not null default false,
  can_use_client_portal boolean not null default false,
  can_use_advanced_approval boolean not null default false,
  can_use_api boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscription_plans enable row level security;
create trigger trg_subscription_plans_updated before update on public.subscription_plans
  for each row execute function public.set_updated_at();

insert into public.subscription_plans (name, code, description, monthly_price, yearly_price, max_users, max_projects, max_storage_gb, can_use_gantt, can_use_custom_form, can_use_client_portal, can_use_advanced_approval, can_use_api, sort_order) values
('Starter','starter','เหมาะสำหรับบริษัทเล็กหรือทีมเริ่มต้น',1490,14900,10,5,5,false,false,false,false,false,1),
('Professional','professional','เหมาะสำหรับบริษัทขนาดกลางที่มีหลายโปรเจค',3990,39900,50,30,50,true,false,true,false,false,2),
('Enterprise','enterprise','เหมาะสำหรับบริษัทใหญ่หรือองค์กรที่มีหลายทีม',9900,99000,200,-1,300,true,true,true,true,true,3);

-- =========================================
-- 6. ORGANIZATION SUBSCRIPTIONS
-- =========================================
create type public.subscription_status as enum ('trial','active','past_due','suspended','cancelled','expired');
create type public.payment_status as enum ('paid','pending','failed','overdue');
create type public.billing_cycle as enum ('monthly','yearly');

create table public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status public.subscription_status not null default 'trial',
  billing_cycle public.billing_cycle not null default 'monthly',
  monthly_price numeric(12,2) not null default 0,
  start_date date not null default current_date,
  end_date date,
  next_billing_date date,
  trial_ends_at date,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.organization_subscriptions enable row level security;
create trigger trg_org_subs_updated before update on public.organization_subscriptions
  for each row execute function public.set_updated_at();
create index idx_org_subs_org on public.organization_subscriptions(organization_id);

-- ผูก default org กับ Enterprise
insert into public.organization_subscriptions (organization_id, plan_id, status, monthly_price, start_date, next_billing_date)
select '00000000-0000-0000-0000-000000000001', id, 'active', monthly_price, current_date, current_date + interval '30 days'
from public.subscription_plans where code = 'enterprise';

-- =========================================
-- 7. SUBSCRIPTION USAGE
-- =========================================
create table public.subscription_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid references public.organization_subscriptions(id) on delete set null,
  users_count integer not null default 0,
  projects_count integer not null default 0,
  storage_used_mb numeric(14,2) not null default 0,
  photos_count integer not null default 0,
  documents_count integer not null default 0,
  reports_count integer not null default 0,
  tasks_count integer not null default 0,
  usage_month text,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.subscription_usage enable row level security;
create index idx_usage_org on public.subscription_usage(organization_id);

-- =========================================
-- 8. INVOICES & PAYMENTS
-- =========================================
create type public.invoice_status as enum ('paid','pending','overdue','cancelled');

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid references public.organization_subscriptions(id) on delete set null,
  invoice_no text not null unique,
  billing_month text,
  amount numeric(12,2) not null default 0,
  due_date date,
  paid_at timestamptz,
  status public.invoice_status not null default 'pending',
  payment_method text,
  invoice_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.invoices enable row level security;
create trigger trg_invoices_updated before update on public.invoices
  for each row execute function public.set_updated_at();
create index idx_invoices_org on public.invoices(organization_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  amount numeric(12,2) not null default 0,
  payment_method text,
  payment_reference text,
  payment_date timestamptz not null default now(),
  status public.payment_status not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payments enable row level security;
create trigger trg_payments_updated before update on public.payments
  for each row execute function public.set_updated_at();
create index idx_payments_org on public.payments(organization_id);

-- =========================================
-- 9. ADMIN AUDIT LOGS
-- =========================================
create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  platform_admin_id uuid references public.platform_admins(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  action text not null,
  ref_type text,
  ref_id uuid,
  detail_json jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_logs enable row level security;
create index idx_audit_org on public.admin_audit_logs(organization_id);

-- =========================================
-- 10. RLS POLICIES — new tables
-- =========================================

-- organizations
create policy "Members read own org" on public.organizations for select to authenticated
  using (id = public.get_my_organization_id(auth.uid()) or public.is_platform_admin(auth.uid()));
create policy "Platform admin manage orgs" on public.organizations for all to authenticated
  using (public.is_platform_admin(auth.uid())) with check (public.is_platform_admin(auth.uid()));

-- platform_admins
create policy "Platform admin read admins" on public.platform_admins for select to authenticated
  using (public.is_platform_admin(auth.uid()) or user_id = auth.uid());
create policy "Platform admin manage admins" on public.platform_admins for all to authenticated
  using (public.is_platform_admin(auth.uid())) with check (public.is_platform_admin(auth.uid()));

-- subscription_plans (อ่านได้ทุกคน, เขียนเฉพาะ platform admin)
create policy "Anyone read active plans" on public.subscription_plans for select to authenticated using (true);
create policy "Platform admin manage plans" on public.subscription_plans for all to authenticated
  using (public.is_platform_admin(auth.uid())) with check (public.is_platform_admin(auth.uid()));

-- organization_subscriptions
create policy "Members read own sub" on public.organization_subscriptions for select to authenticated
  using (public.same_organization(organization_id, auth.uid()) or public.is_platform_admin(auth.uid()));
create policy "Platform admin manage subs" on public.organization_subscriptions for all to authenticated
  using (public.is_platform_admin(auth.uid())) with check (public.is_platform_admin(auth.uid()));

-- subscription_usage
create policy "Members read own usage" on public.subscription_usage for select to authenticated
  using (public.same_organization(organization_id, auth.uid()) or public.is_platform_admin(auth.uid()));
create policy "Platform admin manage usage" on public.subscription_usage for all to authenticated
  using (public.is_platform_admin(auth.uid())) with check (public.is_platform_admin(auth.uid()));

-- invoices
create policy "Members read own invoices" on public.invoices for select to authenticated
  using (public.same_organization(organization_id, auth.uid()) or public.is_platform_admin(auth.uid()));
create policy "Platform admin manage invoices" on public.invoices for all to authenticated
  using (public.is_platform_admin(auth.uid())) with check (public.is_platform_admin(auth.uid()));

-- payments
create policy "Members read own payments" on public.payments for select to authenticated
  using (public.same_organization(organization_id, auth.uid()) or public.is_platform_admin(auth.uid()));
create policy "Platform admin manage payments" on public.payments for all to authenticated
  using (public.is_platform_admin(auth.uid())) with check (public.is_platform_admin(auth.uid()));

-- admin_audit_logs
create policy "Platform admin read audit" on public.admin_audit_logs for select to authenticated
  using (public.is_platform_admin(auth.uid()));
create policy "Platform admin insert audit" on public.admin_audit_logs for insert to authenticated
  with check (public.is_platform_admin(auth.uid()));

-- =========================================
-- 11. ADD platform_admin BYPASS ให้ตารางเดิม
-- =========================================
create policy "Platform admin read all projects" on public.projects for select to authenticated
  using (public.is_platform_admin(auth.uid()));
create policy "Platform admin read all tasks" on public.tasks for select to authenticated
  using (public.is_platform_admin(auth.uid()));
create policy "Platform admin read all reports" on public.daily_reports for select to authenticated
  using (public.is_platform_admin(auth.uid()));
create policy "Platform admin read all photos" on public.photos for select to authenticated
  using (public.is_platform_admin(auth.uid()));
create policy "Platform admin read all documents" on public.documents for select to authenticated
  using (public.is_platform_admin(auth.uid()));
create policy "Platform admin read all approvals" on public.approvals for select to authenticated
  using (public.is_platform_admin(auth.uid()));
create policy "Platform admin read all members" on public.project_members for select to authenticated
  using (public.is_platform_admin(auth.uid()));
create policy "Platform admin read all profiles" on public.profiles for select to authenticated
  using (public.is_platform_admin(auth.uid()));

-- =========================================
-- 12. UPDATE handle_new_user — link to default org
-- =========================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url, organization_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    '00000000-0000-0000-0000-000000000001'
  );
  insert into public.user_roles (user_id, role) values (new.id, 'viewer');
  return new;
end $$;

-- ensure trigger exists
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
