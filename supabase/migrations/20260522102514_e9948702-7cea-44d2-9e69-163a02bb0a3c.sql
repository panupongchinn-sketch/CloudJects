
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
