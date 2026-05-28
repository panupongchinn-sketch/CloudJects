import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PROJECT_PHOTO_BUCKET = "project-photos";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const UploadProjectPhotoSchema = z.object({
  projectId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  dataBase64: z.string().min(1),
});

function fileExtension(fileName: string, mimeType: string) {
  const explicit = fileName.split(".").pop()?.trim().toLowerCase();
  if (explicit && /^[a-z0-9]+$/.test(explicit)) return explicit;

  const byMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };

  return byMime[mimeType] ?? "jpg";
}

async function assertCanUploadProjectPhoto(projectId: string, userId: string) {
  const [{ data: project, error: projectError }, { data: membership, error: memberError }] = await Promise.all([
    supabaseAdmin.from("projects").select("id").eq("id", projectId).maybeSingle(),
    supabaseAdmin.from("project_members").select("id").eq("project_id", projectId).eq("user_id", userId).maybeSingle(),
  ]);

  if (projectError) throw new Error(projectError.message);
  if (memberError) throw new Error(memberError.message);
  if (!project) throw new Error("Project not found");
  if (!membership) throw new Error("You do not have permission to upload project photos");
}

export const uploadProjectPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UploadProjectPhotoSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await assertCanUploadProjectPhoto(data.projectId, userId);

    const buffer = Buffer.from(data.dataBase64, "base64");
    if (!buffer.byteLength) throw new Error("Image data is empty");
    if (buffer.byteLength > MAX_IMAGE_SIZE) throw new Error("Image must be 10 MB or smaller");

    const ext = fileExtension(data.fileName, data.mimeType);
    const storagePath = `${data.projectId}/${userId}/${Date.now()}-${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage.from(PROJECT_PHOTO_BUCKET).upload(storagePath, buffer, {
      contentType: data.mimeType,
      upsert: false,
    });
    if (uploadError) throw new Error(uploadError.message);

    const { data: photo, error: insertError } = await supabaseAdmin
      .from("photos")
      .insert({
        project_id: data.projectId,
        uploader_id: userId,
        storage_path: storagePath,
        caption: data.fileName,
        taken_at: new Date().toISOString(),
      })
      .select("id,project_id,task_id,uploader_id,storage_path,caption,created_at")
      .single();

    if (insertError) {
      await supabaseAdmin.storage.from(PROJECT_PHOTO_BUCKET).remove([storagePath]);
      throw new Error(insertError.message);
    }

    return { photo };
  });
