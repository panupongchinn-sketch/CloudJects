create table if not exists public.login_advertisements (
  id uuid primary key default gen_random_uuid(),
  title text,
  image_path text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists login_advertisements_active_sort_idx
  on public.login_advertisements (is_active, sort_order, created_at desc);

drop trigger if exists trg_login_advertisements_updated on public.login_advertisements;
create trigger trg_login_advertisements_updated
before update on public.login_advertisements
for each row execute function public.set_updated_at();

alter table public.login_advertisements enable row level security;

drop policy if exists "Public read active login advertisements" on public.login_advertisements;
create policy "Public read active login advertisements"
on public.login_advertisements
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Platform admin manage login advertisements" on public.login_advertisements;
create policy "Platform admin manage login advertisements"
on public.login_advertisements
for all
to authenticated
using (public.is_platform_admin(auth.uid()))
with check (public.is_platform_admin(auth.uid()));

insert into storage.buckets (id, name, public)
values ('login-advertisements', 'login-advertisements', true)
on conflict (id) do update set public = excluded.public;
