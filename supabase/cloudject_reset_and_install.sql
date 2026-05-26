-- ============================================================
-- CloudJect reset + install
-- WARNING: This drops CloudJect tables, functions, policies, and enum types
-- before reinstalling the full schema. Use only on an empty/test project
-- or when you intentionally want to reset CloudJect data.
-- ============================================================

-- Storage policies created by CloudJect migrations
DROP POLICY IF EXISTS "Members upload project photos" ON storage.objects;
DROP POLICY IF EXISTS "Owners update project photos" ON storage.objects;
DROP POLICY IF EXISTS "Owners delete project photos" ON storage.objects;
DROP POLICY IF EXISTS "Org read project-documents" ON storage.objects;
DROP POLICY IF EXISTS "Org write project-documents" ON storage.objects;
DROP POLICY IF EXISTS "Org update project-documents" ON storage.objects;
DROP POLICY IF EXISTS "Org delete project-documents" ON storage.objects;
DROP POLICY IF EXISTS "Org read generated-reports" ON storage.objects;
DROP POLICY IF EXISTS "Org write generated-reports" ON storage.objects;

-- Auth trigger installed by CloudJect
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Tables, newest/dependent first
DROP TABLE IF EXISTS public.document_audit_logs CASCADE;
DROP TABLE IF EXISTS public.document_shares CASCADE;
DROP TABLE IF EXISTS public.generated_documents CASCADE;
DROP TABLE IF EXISTS public.document_templates CASCADE;
DROP TABLE IF EXISTS public.document_approval_logs CASCADE;
DROP TABLE IF EXISTS public.document_approvals CASCADE;
DROP TABLE IF EXISTS public.document_versions CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.document_types CASCADE;
DROP TABLE IF EXISTS public.document_categories CASCADE;
DROP TABLE IF EXISTS public.admin_audit_logs CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.subscription_usage CASCADE;
DROP TABLE IF EXISTS public.organization_subscriptions CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;
DROP TABLE IF EXISTS public.platform_admins CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.checklist_items CASCADE;
DROP TABLE IF EXISTS public.approvals CASCADE;
DROP TABLE IF EXISTS public.daily_reports CASCADE;
DROP TABLE IF EXISTS public.photos CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- Functions
DROP FUNCTION IF EXISTS public.can_delete_document(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_approve_document(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_update_document(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_upload_document(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_view_document(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_company_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.same_organization(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_my_organization_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_platform_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.can_manage_project(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_project_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_any_role(uuid, public.app_role[]) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;

-- Enum types
DROP TYPE IF EXISTS public.document_approval_status CASCADE;
DROP TYPE IF EXISTS public.document_status CASCADE;
DROP TYPE IF EXISTS public.invoice_status CASCADE;
DROP TYPE IF EXISTS public.billing_cycle CASCADE;
DROP TYPE IF EXISTS public.payment_status CASCADE;
DROP TYPE IF EXISTS public.subscription_status CASCADE;
DROP TYPE IF EXISTS public.org_status CASCADE;
DROP TYPE IF EXISTS public.approval_ref_type CASCADE;
DROP TYPE IF EXISTS public.approval_status CASCADE;
DROP TYPE IF EXISTS public.report_status CASCADE;
DROP TYPE IF EXISTS public.priority CASCADE;
DROP TYPE IF EXISTS public.task_status CASCADE;
DROP TYPE IF EXISTS public.project_status CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- ============================================================
-- Reinstall full schema
-- ============================================================

-- ============================================================
-- Migration: 20260522102414_a607ea9a-69d4-4921-a443-d91bc0db656f.sql
-- ============================================================


-- =========================================================
-- ENUMS
-- =========================================================
create type public.app_role as enum (
  'super_admin','company_admin','project_manager','site_engineer','foreman','client','viewer'
);
create type public.project_status as enum (
  'Planning','In Progress','On Hold','Completed','Cancelled'
);
create type public.task_status as enum (
  'To Do','In Progress','Waiting Review','Waiting Approval','Completed','Rejected'
);
create type public.priority as enum ('Low','Medium','High','Urgent');
create type public.report_status as enum ('Draft','Submitted','Approved','Rejected');
create type public.approval_status as enum ('Pending','Approved','Rejected','Cancelled');
create type public.approval_ref_type as enum (
  'Daily Report','Document','Checklist','Change Request','Task Completion','Defect Close'
);

-- =========================================================
-- PROFILES
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- =========================================================
-- USER_ROLES
-- =========================================================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Security definer helpers (avoid RLS recursion)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.has_any_role(_user_id uuid, _roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = any(_roles))
$$;

-- =========================================================
-- CLIENTS
-- =========================================================
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);
alter table public.clients enable row level security;

-- =========================================================
-- PROJECTS
-- =========================================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  client_id uuid references public.clients(id) on delete set null,
  location text,
  start_date date,
  end_date date,
  status public.project_status not null default 'Planning',
  progress int not null default 0 check (progress between 0 and 100),
  budget numeric(14,2),
  manager_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;

-- =========================================================
-- PROJECT_MEMBERS
-- =========================================================
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);
alter table public.project_members enable row level security;

-- helpers
create or replace function public.is_project_member(_project_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_members where project_id = _project_id and user_id = _user_id
  ) or exists (
    select 1 from public.projects where id = _project_id and manager_id = _user_id
  )
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_any_role(_user_id, array['super_admin','company_admin']::public.app_role[])
$$;

create or replace function public.can_manage_project(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_any_role(_user_id,
    array['super_admin','company_admin','project_manager']::public.app_role[])
$$;

-- =========================================================
-- TASKS
-- =========================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  assignee_id uuid references auth.users(id) on delete set null,
  status public.task_status not null default 'To Do',
  priority public.priority not null default 'Medium',
  start_date date,
  due_date date,
  progress int not null default 0 check (progress between 0 and 100),
  parent_id uuid references public.tasks(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tasks enable row level security;

-- =========================================================
-- PHOTOS
-- =========================================================
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  uploader_id uuid references auth.users(id) on delete set null,
  storage_path text not null,
  caption text,
  taken_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.photos enable row level security;

-- =========================================================
-- DOCUMENTS
-- =========================================================
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  uploader_id uuid references auth.users(id) on delete set null,
  name text not null,
  storage_path text not null,
  mime text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
alter table public.documents enable row level security;

-- =========================================================
-- DAILY_REPORTS
-- =========================================================
create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  report_date date not null,
  weather text,
  summary text,
  status public.report_status not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.daily_reports enable row level security;

-- =========================================================
-- APPROVALS
-- =========================================================
create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  requester_id uuid references auth.users(id) on delete set null,
  approver_id uuid references auth.users(id) on delete set null,
  ref_type public.approval_ref_type not null,
  ref_id uuid,
  status public.approval_status not null default 'Pending',
  note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table public.approvals enable row level security;

-- =========================================================
-- CHECKLIST_ITEMS
-- =========================================================
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  assignee_id uuid references auth.users(id) on delete set null,
  ordering int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.checklist_items enable row level security;

-- =========================================================
-- CHAT_MESSAGES
-- =========================================================
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;

-- =========================================================
-- TRIGGERS: updated_at
-- =========================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();
create trigger trg_tasks_updated before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger trg_reports_updated before update on public.daily_reports
  for each row execute function public.set_updated_at();

-- =========================================================
-- TRIGGER: auto-create profile + default role on signup
-- =========================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into public.user_roles (user_id, role) values (new.id, 'viewer');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- profiles
create policy "Authenticated can view profiles" on public.profiles
  for select to authenticated using (true);
create policy "Users can update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- user_roles
create policy "Users can view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "Admins manage roles" on public.user_roles
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- clients
create policy "Authenticated read clients" on public.clients
  for select to authenticated using (true);
create policy "PM+ manage clients" on public.clients
  for all to authenticated
  using (public.can_manage_project(auth.uid()))
  with check (public.can_manage_project(auth.uid()));

-- projects
create policy "Members can view projects" on public.projects
  for select to authenticated
  using (public.is_project_member(id, auth.uid()) or public.is_admin(auth.uid()));
create policy "PM+ insert projects" on public.projects
  for insert to authenticated with check (public.can_manage_project(auth.uid()));
create policy "PM+ update projects" on public.projects
  for update to authenticated using (public.can_manage_project(auth.uid()));
create policy "PM+ delete projects" on public.projects
  for delete to authenticated using (public.can_manage_project(auth.uid()));

-- project_members
create policy "Members view project_members" on public.project_members
  for select to authenticated
  using (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()));
create policy "PM+ manage members" on public.project_members
  for all to authenticated
  using (public.can_manage_project(auth.uid()))
  with check (public.can_manage_project(auth.uid()));

-- Generic project-scoped policy template (members read+write)
-- tasks
create policy "Members read tasks" on public.tasks
  for select to authenticated
  using (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()));
create policy "Members write tasks" on public.tasks
  for all to authenticated
  using (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()));

-- photos
create policy "Members read photos" on public.photos
  for select to authenticated
  using (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()));
create policy "Members write photos" on public.photos
  for all to authenticated
  using (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()));

-- documents
create policy "Members read documents" on public.documents
  for select to authenticated
  using (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()));
create policy "Members write documents" on public.documents
  for all to authenticated
  using (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()));

-- daily_reports
create policy "Members read reports" on public.daily_reports
  for select to authenticated
  using (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()));
create policy "Members write reports" on public.daily_reports
  for all to authenticated
  using (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()));

-- approvals
create policy "Members read approvals" on public.approvals
  for select to authenticated
  using (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()));
create policy "Members write approvals" on public.approvals
  for all to authenticated
  using (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()));

-- checklist_items
create policy "Members read checklist" on public.checklist_items
  for select to authenticated
  using (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()));
create policy "Members write checklist" on public.checklist_items
  for all to authenticated
  using (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()));

-- chat_messages
create policy "Members read chat" on public.chat_messages
  for select to authenticated
  using (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()));
create policy "Members send chat" on public.chat_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()))
  );

-- notifications
create policy "User reads own notifications" on public.notifications
  for select to authenticated using (auth.uid() = user_id);
create policy "User updates own notifications" on public.notifications
  for update to authenticated using (auth.uid() = user_id);
create policy "System inserts notifications" on public.notifications
  for insert to authenticated with check (true);

-- =========================================================
-- INDEXES
-- =========================================================
create index idx_projects_manager on public.projects(manager_id);
create index idx_project_members_user on public.project_members(user_id);
create index idx_tasks_project on public.tasks(project_id);
create index idx_tasks_assignee on public.tasks(assignee_id);
create index idx_photos_project on public.photos(project_id);
create index idx_reports_project on public.daily_reports(project_id);
create index idx_approvals_project on public.approvals(project_id);
create index idx_approvals_status on public.approvals(status);
create index idx_notifications_user on public.notifications(user_id, read);


-- ============================================================
-- Migration: 20260522102514_e9948702-7cea-44d2-9e69-163a02bb0a3c.sql
-- ============================================================


-- Fix mutable search_path on set_updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- Tighten notifications insert policy
drop policy if exists "System inserts notifications" on public.notifications;
create policy "User inserts own notifications" on public.notifications
  for insert to authenticated with check (auth.uid() = user_id);

-- Lock down SECURITY DEFINER helpers (only callable via RLS internals)
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.has_any_role(uuid, public.app_role[]) from public, anon, authenticated;
revoke execute on function public.is_project_member(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.is_admin(uuid) from public, anon, authenticated;
revoke execute on function public.can_manage_project(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;


-- ============================================================
-- Migration: 20260522103042_e32198cb-335b-487d-850a-7180b7636e59.sql
-- ============================================================


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

-- Default org à¸ªà¸³à¸«à¸£à¸±à¸š backfill à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹€à¸”à¸´à¸¡
insert into public.organizations (id, name, status, contact_name, email)
values ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'active', 'System', 'admin@example.com');

-- =========================================
-- 2. ADD organization_id à¹ƒà¸«à¹‰à¸•à¸²à¸£à¸²à¸‡à¸«à¸¥à¸±à¸
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
('Starter','starter','à¹€à¸«à¸¡à¸²à¸°à¸ªà¸³à¸«à¸£à¸±à¸šà¸šà¸£à¸´à¸©à¸±à¸—à¹€à¸¥à¹‡à¸à¸«à¸£à¸·à¸­à¸—à¸µà¸¡à¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™',1490,14900,10,5,5,false,false,false,false,false,1),
('Professional','professional','à¹€à¸«à¸¡à¸²à¸°à¸ªà¸³à¸«à¸£à¸±à¸šà¸šà¸£à¸´à¸©à¸±à¸—à¸‚à¸™à¸²à¸”à¸à¸¥à¸²à¸‡à¸—à¸µà¹ˆà¸¡à¸µà¸«à¸¥à¸²à¸¢à¹‚à¸›à¸£à¹€à¸ˆà¸„',3990,39900,50,30,50,true,false,true,false,false,2),
('Enterprise','enterprise','à¹€à¸«à¸¡à¸²à¸°à¸ªà¸³à¸«à¸£à¸±à¸šà¸šà¸£à¸´à¸©à¸±à¸—à¹ƒà¸«à¸à¹ˆà¸«à¸£à¸·à¸­à¸­à¸‡à¸„à¹Œà¸à¸£à¸—à¸µà¹ˆà¸¡à¸µà¸«à¸¥à¸²à¸¢à¸—à¸µà¸¡',9900,99000,200,-1,300,true,true,true,true,true,3);

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

-- à¸œà¸¹à¸ default org à¸à¸±à¸š Enterprise
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
-- 10. RLS POLICIES â€” new tables
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

-- subscription_plans (à¸­à¹ˆà¸²à¸™à¹„à¸”à¹‰à¸—à¸¸à¸à¸„à¸™, à¹€à¸‚à¸µà¸¢à¸™à¹€à¸‰à¸žà¸²à¸° platform admin)
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
-- 11. ADD platform_admin BYPASS à¹ƒà¸«à¹‰à¸•à¸²à¸£à¸²à¸‡à¹€à¸”à¸´à¸¡
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
-- 12. UPDATE handle_new_user â€” link to default org
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


-- ============================================================
-- Migration: 20260522105016_fe6b1b27-e290-4cdf-b3db-308336407266.sql
-- ============================================================


ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- Migration: 20260522110910_76bd4a09-5bad-4fe4-a717-3b129b4691cc.sql
-- ============================================================


-- Replace old documents table (empty) with new schema
DROP TABLE IF EXISTS public.documents CASCADE;

-- Enums
DO $$ BEGIN
  CREATE TYPE public.document_status AS ENUM (
    'Draft','Submitted','Waiting Review','Waiting Approval',
    'Approved','Rejected','Revision Required','Archived','Cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.document_approval_status AS ENUM (
    'Pending','Reviewing','Approved','Rejected','Revision Required','Cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);
CREATE INDEX idx_doc_cat_org ON public.document_categories(organization_id);

CREATE TABLE public.document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  category_id uuid REFERENCES public.document_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text NOT NULL,
  requires_approval boolean NOT NULL DEFAULT false,
  allow_client_view boolean NOT NULL DEFAULT false,
  is_confidential boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);
CREATE INDEX idx_doc_types_org ON public.document_types(organization_id);
CREATE INDEX idx_doc_types_cat ON public.document_types(category_id);

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id uuid,
  report_id uuid,
  document_type_id uuid REFERENCES public.document_types(id) ON DELETE SET NULL,
  document_category_id uuid REFERENCES public.document_categories(id) ON DELETE SET NULL,
  document_no text,
  document_name text NOT NULL,
  description text,
  status public.document_status NOT NULL DEFAULT 'Draft',
  current_version_id uuid,
  is_confidential boolean NOT NULL DEFAULT false,
  share_to_client boolean NOT NULL DEFAULT false,
  tags text[],
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  rejected_reason text,
  revision_note text,
  expiry_date date,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_org ON public.documents(organization_id);
CREATE INDEX idx_documents_project ON public.documents(project_id);
CREATE INDEX idx_documents_task ON public.documents(task_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_type ON public.documents(document_type_id);
CREATE INDEX idx_documents_category ON public.documents(document_category_id);
CREATE INDEX idx_documents_created ON public.documents(created_at DESC);
CREATE INDEX idx_documents_no ON public.documents(document_no);
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  version_no text NOT NULL,
  file_name text NOT NULL,
  file_url text,
  file_path text NOT NULL,
  file_type text,
  file_extension text,
  file_size numeric NOT NULL DEFAULT 0,
  change_note text,
  status public.document_status NOT NULL DEFAULT 'Draft',
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_versions_doc ON public.document_versions(document_id);
CREATE INDEX idx_doc_versions_org ON public.document_versions(organization_id);
CREATE INDEX idx_doc_versions_current ON public.document_versions(is_current);

ALTER TABLE public.documents
  ADD CONSTRAINT fk_documents_current_version
  FOREIGN KEY (current_version_id) REFERENCES public.document_versions(id) ON DELETE SET NULL;

CREATE TABLE public.document_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  document_version_id uuid REFERENCES public.document_versions(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  status public.document_approval_status NOT NULL DEFAULT 'Pending',
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  rejected_reason text,
  revision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_appr_org ON public.document_approvals(organization_id);
CREATE INDEX idx_doc_appr_doc ON public.document_approvals(document_id);
CREATE INDEX idx_doc_appr_status ON public.document_approvals(status);
CREATE TRIGGER trg_doc_appr_updated BEFORE UPDATE ON public.document_approvals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.document_approval_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  approval_id uuid REFERENCES public.document_approvals(id) ON DELETE SET NULL,
  action text NOT NULL,
  old_status text,
  new_status text,
  comment text,
  acted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  acted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_appr_log_doc ON public.document_approval_logs(document_id);
CREATE INDEX idx_doc_appr_log_org ON public.document_approval_logs(organization_id);

CREATE TABLE public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  template_type text,
  fields_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  requires_approval boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);
CREATE INDEX idx_doc_tpl_org ON public.document_templates(organization_id);
CREATE TRIGGER trg_doc_tpl_updated BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.document_templates(id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  generated_type text NOT NULL,
  file_url text,
  file_path text,
  generated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_gen_doc_org ON public.generated_documents(organization_id);
CREATE INDEX idx_gen_doc_project ON public.generated_documents(project_id);

CREATE TABLE public.document_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  shared_with_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with_role text,
  can_view boolean NOT NULL DEFAULT true,
  can_download boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  shared_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_shares_doc ON public.document_shares(document_id);
CREATE INDEX idx_doc_shares_user ON public.document_shares(shared_with_user_id);
CREATE INDEX idx_doc_shares_org ON public.document_shares(organization_id);

CREATE TABLE public.document_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  document_version_id uuid REFERENCES public.document_versions(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  detail_json jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_audit_org ON public.document_audit_logs(organization_id);
CREATE INDEX idx_doc_audit_doc ON public.document_audit_logs(document_id);
CREATE INDEX idx_doc_audit_user ON public.document_audit_logs(user_id);
CREATE INDEX idx_doc_audit_created ON public.document_audit_logs(created_at DESC);

-- Helper functions
CREATE OR REPLACE FUNCTION public.can_view_document(_document_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = _document_id
      AND (
        public.is_platform_admin(_user_id)
        OR (
          public.same_organization(d.organization_id, _user_id)
          AND (
            public.is_admin(_user_id)
            OR (d.project_id IS NOT NULL AND public.is_project_member(d.project_id, _user_id))
            OR d.created_by = _user_id
            OR d.share_to_client = true
            OR EXISTS (SELECT 1 FROM public.document_shares s WHERE s.document_id = d.id AND s.shared_with_user_id = _user_id)
          )
          AND (
            d.is_confidential = false
            OR public.is_admin(_user_id)
            OR EXISTS (SELECT 1 FROM public.document_shares s WHERE s.document_id = d.id AND s.shared_with_user_id = _user_id)
          )
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_upload_document(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _project_id IS NULL
      OR public.is_admin(_user_id)
      OR public.is_project_member(_project_id, _user_id)
$$;

CREATE OR REPLACE FUNCTION public.can_update_document(_document_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = _document_id
      AND public.same_organization(d.organization_id, _user_id)
      AND (
        public.is_admin(_user_id)
        OR (d.created_by = _user_id AND d.status::text IN ('Draft','Revision Required','Rejected'))
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_delete_document(_document_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = _document_id
      AND public.same_organization(d.organization_id, _user_id)
      AND d.status = 'Draft'
      AND (d.created_by = _user_id OR public.is_admin(_user_id))
  )
$$;

CREATE OR REPLACE FUNCTION public.can_approve_document(_document_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = _document_id
      AND public.same_organization(d.organization_id, _user_id)
      AND public.can_manage_project(_user_id)
  )
$$;

-- Enable RLS
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_approval_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Org read categories" ON public.document_categories FOR SELECT TO authenticated
  USING (same_organization(organization_id, auth.uid()) OR is_platform_admin(auth.uid()));
CREATE POLICY "Admin manage categories" ON public.document_categories FOR ALL TO authenticated
  USING (same_organization(organization_id, auth.uid()) AND is_admin(auth.uid()))
  WITH CHECK (same_organization(organization_id, auth.uid()) AND is_admin(auth.uid()));
CREATE POLICY "Platform admin manage categories" ON public.document_categories FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Org read types" ON public.document_types FOR SELECT TO authenticated
  USING (same_organization(organization_id, auth.uid()) OR is_platform_admin(auth.uid()));
CREATE POLICY "Admin manage types" ON public.document_types FOR ALL TO authenticated
  USING (same_organization(organization_id, auth.uid()) AND is_admin(auth.uid()))
  WITH CHECK (same_organization(organization_id, auth.uid()) AND is_admin(auth.uid()));
CREATE POLICY "Platform admin manage types" ON public.document_types FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Read documents" ON public.documents FOR SELECT TO authenticated
  USING (can_view_document(id, auth.uid()));
CREATE POLICY "Insert documents" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    same_organization(organization_id, auth.uid())
    AND can_upload_document(project_id, auth.uid())
    AND created_by = auth.uid()
  );
CREATE POLICY "Update documents" ON public.documents FOR UPDATE TO authenticated
  USING (can_update_document(id, auth.uid()) OR can_approve_document(id, auth.uid()))
  WITH CHECK (same_organization(organization_id, auth.uid()));
CREATE POLICY "Delete documents" ON public.documents FOR DELETE TO authenticated
  USING (can_delete_document(id, auth.uid()));

CREATE POLICY "Read versions" ON public.document_versions FOR SELECT TO authenticated
  USING (can_view_document(document_id, auth.uid()));
CREATE POLICY "Insert versions" ON public.document_versions FOR INSERT TO authenticated
  WITH CHECK (
    same_organization(organization_id, auth.uid())
    AND EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id
      AND (can_update_document(d.id, auth.uid()) OR d.created_by = auth.uid() OR is_admin(auth.uid())))
  );
CREATE POLICY "Update versions" ON public.document_versions FOR UPDATE TO authenticated
  USING (
    same_organization(organization_id, auth.uid())
    AND (is_admin(auth.uid()) OR uploaded_by = auth.uid())
    AND status NOT IN ('Approved')
  )
  WITH CHECK (same_organization(organization_id, auth.uid()));

CREATE POLICY "Read approvals" ON public.document_approvals FOR SELECT TO authenticated
  USING (can_view_document(document_id, auth.uid()));
CREATE POLICY "Insert approvals" ON public.document_approvals FOR INSERT TO authenticated
  WITH CHECK (
    same_organization(organization_id, auth.uid())
    AND requested_by = auth.uid()
    AND can_view_document(document_id, auth.uid())
  );
CREATE POLICY "Update approvals" ON public.document_approvals FOR UPDATE TO authenticated
  USING (
    same_organization(organization_id, auth.uid())
    AND (can_approve_document(document_id, auth.uid()) OR requested_by = auth.uid())
  )
  WITH CHECK (same_organization(organization_id, auth.uid()));

CREATE POLICY "Read approval logs" ON public.document_approval_logs FOR SELECT TO authenticated
  USING (can_view_document(document_id, auth.uid()) OR is_platform_admin(auth.uid()));
CREATE POLICY "Insert approval logs" ON public.document_approval_logs FOR INSERT TO authenticated
  WITH CHECK (same_organization(organization_id, auth.uid()) AND acted_by = auth.uid());

CREATE POLICY "Read templates" ON public.document_templates FOR SELECT TO authenticated
  USING (same_organization(organization_id, auth.uid()) OR is_platform_admin(auth.uid()));
CREATE POLICY "Admin manage templates" ON public.document_templates FOR ALL TO authenticated
  USING (same_organization(organization_id, auth.uid()) AND is_admin(auth.uid()))
  WITH CHECK (same_organization(organization_id, auth.uid()) AND is_admin(auth.uid()));

CREATE POLICY "Read generated" ON public.generated_documents FOR SELECT TO authenticated
  USING (same_organization(organization_id, auth.uid()) OR is_platform_admin(auth.uid()));
CREATE POLICY "Insert generated" ON public.generated_documents FOR INSERT TO authenticated
  WITH CHECK (same_organization(organization_id, auth.uid()) AND generated_by = auth.uid());

CREATE POLICY "Read shares" ON public.document_shares FOR SELECT TO authenticated
  USING (
    same_organization(organization_id, auth.uid())
    AND (shared_with_user_id = auth.uid() OR shared_by = auth.uid() OR is_admin(auth.uid()))
  );
CREATE POLICY "Manage shares" ON public.document_shares FOR ALL TO authenticated
  USING (same_organization(organization_id, auth.uid()) AND (is_admin(auth.uid()) OR shared_by = auth.uid()))
  WITH CHECK (same_organization(organization_id, auth.uid()) AND shared_by = auth.uid());

CREATE POLICY "Admin read audit logs" ON public.document_audit_logs FOR SELECT TO authenticated
  USING ((same_organization(organization_id, auth.uid()) AND is_admin(auth.uid())) OR is_platform_admin(auth.uid()));
CREATE POLICY "Insert audit logs" ON public.document_audit_logs FOR INSERT TO authenticated
  WITH CHECK (same_organization(organization_id, auth.uid()) AND user_id = auth.uid());

-- Storage
INSERT INTO storage.buckets (id, name, public) VALUES
  ('project-documents','project-documents', false),
  ('generated-reports','generated-reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org read project-documents" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND (is_platform_admin(auth.uid()) OR same_organization(((storage.foldername(name))[1])::uuid, auth.uid()))
  );
CREATE POLICY "Org write project-documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-documents'
    AND same_organization(((storage.foldername(name))[1])::uuid, auth.uid())
  );
CREATE POLICY "Org update project-documents" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND same_organization(((storage.foldername(name))[1])::uuid, auth.uid())
  );
CREATE POLICY "Org delete project-documents" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND same_organization(((storage.foldername(name))[1])::uuid, auth.uid())
    AND is_admin(auth.uid())
  );

CREATE POLICY "Org read generated-reports" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'generated-reports'
    AND (is_platform_admin(auth.uid()) OR same_organization(((storage.foldername(name))[1])::uuid, auth.uid()))
  );
CREATE POLICY "Org write generated-reports" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'generated-reports'
    AND same_organization(((storage.foldername(name))[1])::uuid, auth.uid())
  );

-- Seed
DO $$
DECLARE
  default_org uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  cat_pre uuid; cat_progress uuid; cat_inspect uuid;
  cat_approval uuid; cat_finance uuid; cat_closure uuid;
BEGIN
  INSERT INTO public.document_categories (organization_id, name, code, sort_order) VALUES
    (default_org, 'à¹€à¸­à¸à¸ªà¸²à¸£à¸à¹ˆà¸­à¸™à¹€à¸£à¸´à¹ˆà¸¡à¹‚à¸„à¸£à¸‡à¸à¸²à¸£', 'pre_project', 1) RETURNING id INTO cat_pre;
  INSERT INTO public.document_categories (organization_id, name, code, sort_order) VALUES
    (default_org, 'à¹€à¸­à¸à¸ªà¸²à¸£à¸£à¸°à¸«à¸§à¹ˆà¸²à¸‡à¸”à¸³à¹€à¸™à¸´à¸™à¸‡à¸²à¸™', 'in_progress', 2) RETURNING id INTO cat_progress;
  INSERT INTO public.document_categories (organization_id, name, code, sort_order) VALUES
    (default_org, 'à¹€à¸­à¸à¸ªà¸²à¸£à¸•à¸£à¸§à¸ˆà¸‡à¸²à¸™', 'inspection', 3) RETURNING id INTO cat_inspect;
  INSERT INTO public.document_categories (organization_id, name, code, sort_order) VALUES
    (default_org, 'à¹€à¸­à¸à¸ªà¸²à¸£à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´', 'approval', 4) RETURNING id INTO cat_approval;
  INSERT INTO public.document_categories (organization_id, name, code, sort_order) VALUES
    (default_org, 'à¹€à¸­à¸à¸ªà¸²à¸£à¸à¸²à¸£à¹€à¸‡à¸´à¸™', 'financial', 5) RETURNING id INTO cat_finance;
  INSERT INTO public.document_categories (organization_id, name, code, sort_order) VALUES
    (default_org, 'à¹€à¸­à¸à¸ªà¸²à¸£à¸ªà¹ˆà¸‡à¸¡à¸­à¸šà¹à¸¥à¸°à¸›à¸´à¸”à¹‚à¸„à¸£à¸‡à¸à¸²à¸£', 'closure', 6) RETURNING id INTO cat_closure;

  INSERT INTO public.document_types (organization_id, category_id, name, code, requires_approval) VALUES
    (default_org, cat_pre, 'Quotation / à¹ƒà¸šà¹€à¸ªà¸™à¸­à¸£à¸²à¸„à¸²', 'quotation', true),
    (default_org, cat_pre, 'Contract / à¸ªà¸±à¸à¸à¸²à¸ˆà¹‰à¸²à¸‡', 'contract', true),
    (default_org, cat_pre, 'Purchase Order / à¹ƒà¸šà¸ªà¸±à¹ˆà¸‡à¸‹à¸·à¹‰à¸­', 'purchase_order', true),
    (default_org, cat_pre, 'BOQ / à¸£à¸²à¸¢à¸à¸²à¸£à¸›à¸£à¸´à¸¡à¸²à¸“à¸‡à¸²à¸™', 'boq', true),
    (default_org, cat_pre, 'Scope of Work / à¸‚à¸­à¸šà¹€à¸‚à¸•à¸‡à¸²à¸™', 'scope_of_work', true),
    (default_org, cat_pre, 'Project Plan / à¹à¸œà¸™à¸‡à¸²à¸™à¹‚à¸„à¸£à¸‡à¸à¸²à¸£', 'project_plan', false),
    (default_org, cat_pre, 'Drawing / à¹à¸šà¸šà¸‡à¸²à¸™', 'drawing', true),
    (default_org, cat_pre, 'Specification / à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¸ªà¹€à¸›à¸', 'spec', false),
    (default_org, cat_pre, 'Customer Document', 'customer_doc', false),
    (default_org, cat_pre, 'Approval to Start Work', 'start_approval', true);

  INSERT INTO public.document_types (organization_id, category_id, name, code, requires_approval) VALUES
    (default_org, cat_progress, 'Daily Report / à¸£à¸²à¸¢à¸‡à¸²à¸™à¸›à¸£à¸°à¸ˆà¸³à¸§à¸±à¸™', 'daily_report', true),
    (default_org, cat_progress, 'Weekly Report / à¸£à¸²à¸¢à¸‡à¸²à¸™à¸›à¸£à¸°à¸ˆà¸³à¸ªà¸±à¸›à¸”à¸²à¸«à¹Œ', 'weekly_report', true),
    (default_org, cat_progress, 'Progress Report / à¸£à¸²à¸¢à¸‡à¸²à¸™à¸„à¸§à¸²à¸¡à¸„à¸·à¸šà¸«à¸™à¹‰à¸²', 'progress_report', true),
    (default_org, cat_progress, 'Site Photo Report', 'photo_report', false),
    (default_org, cat_progress, 'Material Request', 'material_request', true),
    (default_org, cat_progress, 'Material Approval', 'material_approval', true),
    (default_org, cat_progress, 'Change Request', 'change_request', true),
    (default_org, cat_progress, 'Work Instruction', 'work_instruction', false),
    (default_org, cat_progress, 'Meeting Minutes', 'meeting_minutes', false),
    (default_org, cat_progress, 'Issue Report', 'issue_report', false);

  INSERT INTO public.document_types (organization_id, category_id, name, code, requires_approval) VALUES
    (default_org, cat_inspect, 'Inspection Report', 'inspection_report', true),
    (default_org, cat_inspect, 'Quality Checklist', 'quality_checklist', false),
    (default_org, cat_inspect, 'Safety Report', 'safety_report', true),
    (default_org, cat_inspect, 'Safety Checklist', 'safety_checklist', false),
    (default_org, cat_inspect, 'Defect Report', 'defect_report', true),
    (default_org, cat_inspect, 'NCR Report', 'ncr_report', true),
    (default_org, cat_inspect, 'Test Report', 'test_report', false),
    (default_org, cat_inspect, 'Commissioning Report', 'commissioning', true);

  INSERT INTO public.document_types (organization_id, category_id, name, code, requires_approval, is_confidential) VALUES
    (default_org, cat_finance, 'Invoice / à¹ƒà¸šà¹à¸ˆà¹‰à¸‡à¸«à¸™à¸µà¹‰', 'invoice', true, true),
    (default_org, cat_finance, 'Receipt / à¹ƒà¸šà¹€à¸ªà¸£à¹‡à¸ˆà¸£à¸±à¸šà¹€à¸‡à¸´à¸™', 'receipt', false, true),
    (default_org, cat_finance, 'Payment Record', 'payment_record', false, true),
    (default_org, cat_finance, 'Credit Note / à¹ƒà¸šà¸¥à¸”à¸«à¸™à¸µà¹‰', 'credit_note', true, true),
    (default_org, cat_finance, 'Tax Invoice / à¹ƒà¸šà¸à¸³à¸à¸±à¸šà¸ à¸²à¸©à¸µ', 'tax_invoice', false, true),
    (default_org, cat_finance, 'Budget Report', 'budget_report', false, true),
    (default_org, cat_finance, 'Cost Summary', 'cost_summary', false, true),
    (default_org, cat_finance, 'Additional Cost Request', 'add_cost_request', true, true);

  INSERT INTO public.document_types (organization_id, category_id, name, code, requires_approval, allow_client_view) VALUES
    (default_org, cat_closure, 'Handover Document', 'handover', true, true),
    (default_org, cat_closure, 'Completion Report', 'completion_report', true, true),
    (default_org, cat_closure, 'Final Inspection Report', 'final_inspection', true, true),
    (default_org, cat_closure, 'As-built Drawing', 'as_built', true, true),
    (default_org, cat_closure, 'Warranty Document', 'warranty', false, true),
    (default_org, cat_closure, 'Manual Document', 'manual', false, true),
    (default_org, cat_closure, 'Training Document', 'training_doc', false, true),
    (default_org, cat_closure, 'Project Closing Report', 'closing_report', true, false);
END $$;


-- ============================================================
-- Migration: 20260522111702_83c3c74f-bc07-4b0f-a2bd-3f1b7092e75b.sql
-- ============================================================


ALTER TABLE public.documents REPLICA IDENTITY FULL;
ALTER TABLE public.document_approvals REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.document_approvals;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- Migration: 20260522112526_0876cb83-f521-4c12-9e2f-06395026cab9.sql
-- ============================================================

ALTER TABLE public.document_templates
  ADD COLUMN IF NOT EXISTS body_html text,
  ADD COLUMN IF NOT EXISTS document_category_id uuid,
  ADD COLUMN IF NOT EXISTS document_type_id uuid,
  ADD COLUMN IF NOT EXISTS paper_size text NOT NULL DEFAULT 'A4',
  ADD COLUMN IF NOT EXISTS orientation text NOT NULL DEFAULT 'portrait';


-- ============================================================
-- Migration: 20260522154056_3e4200b1-22cc-42a6-b306-0c508778e70c.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20260522162401_781b0955-6e56-4c09-a266-eeccfe2d5aca.sql
-- ============================================================


-- Create public bucket for project photos
insert into storage.buckets (id, name, public)
values ('project-photos', 'project-photos', true)
on conflict (id) do nothing;

-- Helper to extract projectId from storage path "{projectId}/{userId}/{filename}"
-- Read: public bucket so anon can read; but require auth + project membership/admin to write.

-- Insert policy: must be authenticated, file path's first folder must be a project user is a member of
create policy "Members upload project photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-photos'
  and (
    public.is_admin(auth.uid())
    or public.is_project_member(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);

-- Update/delete policy: only uploader or admin
create policy "Owners update project photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'project-photos'
  and (owner = auth.uid() or public.is_admin(auth.uid()))
);

create policy "Owners delete project photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-photos'
  and (owner = auth.uid() or public.is_admin(auth.uid()))
);


