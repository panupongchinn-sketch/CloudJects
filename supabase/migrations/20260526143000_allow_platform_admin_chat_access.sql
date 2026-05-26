drop policy if exists "Members read chat" on public.chat_messages;
create policy "Members read chat"
on public.chat_messages
for select
to authenticated
using (
  public.is_project_member(project_id, auth.uid())
  or public.is_admin(auth.uid())
  or public.is_platform_admin(auth.uid())
);

drop policy if exists "Members send chat" on public.chat_messages;
create policy "Members send chat"
on public.chat_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and (
    public.is_project_member(project_id, auth.uid())
    or public.is_admin(auth.uid())
    or public.is_platform_admin(auth.uid())
  )
);

drop policy if exists "Members upload chat images" on storage.objects;
create policy "Members upload chat images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-images'
  and (
    public.is_admin(auth.uid())
    or public.is_platform_admin(auth.uid())
    or public.is_project_member(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);

drop policy if exists "Owners update chat images" on storage.objects;
create policy "Owners update chat images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'chat-images'
  and (
    owner = auth.uid()
    or public.is_admin(auth.uid())
    or public.is_platform_admin(auth.uid())
  )
);

drop policy if exists "Owners delete chat images" on storage.objects;
create policy "Owners delete chat images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-images'
  and (
    owner = auth.uid()
    or public.is_admin(auth.uid())
    or public.is_platform_admin(auth.uid())
  )
);
