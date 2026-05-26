alter table public.projects
  add column if not exists header_background text not null default 'none';
