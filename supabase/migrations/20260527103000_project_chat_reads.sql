create table if not exists public.project_chat_reads (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table public.project_chat_reads enable row level security;

drop policy if exists "Members read project chat reads" on public.project_chat_reads;
create policy "Members read project chat reads" on public.project_chat_reads
  for select to authenticated
  using (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "Members manage own project chat reads" on public.project_chat_reads;
create policy "Members manage own project chat reads" on public.project_chat_reads
  for all to authenticated
  using (
    user_id = auth.uid()
    and (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()))
  )
  with check (
    user_id = auth.uid()
    and (public.is_project_member(project_id, auth.uid()) or public.is_admin(auth.uid()))
  );

drop trigger if exists trg_project_chat_reads_updated on public.project_chat_reads;
create trigger trg_project_chat_reads_updated
  before update on public.project_chat_reads
  for each row execute function public.set_updated_at();

create index if not exists idx_project_chat_reads_user_project
  on public.project_chat_reads (user_id, project_id, last_read_at desc);
