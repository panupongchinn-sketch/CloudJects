
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
