alter table public.chat_messages
  add column if not exists image_path text;

alter table public.chat_messages
  alter column body drop not null;

alter table public.chat_messages
  alter column body set default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_messages_body_or_image_check'
  ) then
    alter table public.chat_messages
      add constraint chat_messages_body_or_image_check
      check (nullif(btrim(coalesce(body, '')), '') is not null or image_path is not null);
  end if;
end $$;

create index if not exists chat_messages_project_created_idx
  on public.chat_messages (project_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Members upload chat images" on storage.objects;
create policy "Members upload chat images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-images'
  and (
    public.is_admin(auth.uid())
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
  and (owner = auth.uid() or public.is_admin(auth.uid()))
);

drop policy if exists "Owners delete chat images" on storage.objects;
create policy "Owners delete chat images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-images'
  and (owner = auth.uid() or public.is_admin(auth.uid()))
);
