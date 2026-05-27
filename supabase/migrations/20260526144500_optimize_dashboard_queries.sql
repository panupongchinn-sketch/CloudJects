create index if not exists idx_projects_created_at_desc
on public.projects(created_at desc);

create index if not exists idx_tasks_overdue_lookup
on public.tasks(project_id, due_date)
where due_date is not null and status <> 'Completed';

create index if not exists idx_approvals_pending_created_at
on public.approvals(status, created_at desc);
