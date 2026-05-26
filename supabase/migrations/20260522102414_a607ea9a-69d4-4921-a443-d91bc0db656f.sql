
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
