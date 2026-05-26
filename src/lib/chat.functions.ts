import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CHAT_IMAGE_BUCKET = "chat-images";
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const SendProjectChatMessageSchema = z
  .object({
    projectId: z.string().uuid(),
    body: z.string().trim().max(4000).optional(),
    fileName: z.string().trim().min(1).max(255).optional(),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).optional(),
    dataBase64: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    const hasBody = Boolean(value.body?.trim());
    const hasImage = Boolean(value.dataBase64);

    if (!hasBody && !hasImage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Message body or image is required",
      });
    }

    if (hasImage && (!value.fileName || !value.mimeType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Image metadata is incomplete",
      });
    }
  });

const ListProjectChatMessagesSchema = z.object({
  projectId: z.string().uuid(),
  limit: z.number().int().min(1).max(500).optional(),
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

async function assertProjectChatAccess(projectId: string, userId: string) {
  const [{ data: project, error: projectError }, { data: membership, error: memberError }, { data: adminRoles, error: roleError }, { data: platformAdmin, error: platformAdminError }] =
    await Promise.all([
      supabaseAdmin.from("projects").select("id, manager_id").eq("id", projectId).maybeSingle(),
      supabaseAdmin.from("project_members").select("id").eq("project_id", projectId).eq("user_id", userId).maybeSingle(),
      supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .in("role", ["super_admin", "company_admin"])
        .limit(1),
      supabaseAdmin.from("platform_admins").select("id").eq("user_id", userId).eq("is_active", true).maybeSingle(),
    ]);

  if (projectError) throw new Error(projectError.message);
  if (memberError) throw new Error(memberError.message);
  if (roleError) throw new Error(roleError.message);
  if (platformAdminError) throw new Error(platformAdminError.message);
  if (!project) throw new Error("Project not found");

  const allowed = project.manager_id === userId || Boolean(membership) || Boolean(adminRoles?.length) || Boolean(platformAdmin);
  if (!allowed) throw new Error("Unauthorized");
}

export const sendProjectChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SendProjectChatMessageSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await assertProjectChatAccess(data.projectId, userId);

    const body = data.body?.trim() || null;
    let imagePath: string | null = null;

    try {
      if (data.dataBase64 && data.fileName && data.mimeType) {
        const buffer = Buffer.from(data.dataBase64, "base64");
        if (!buffer.byteLength) throw new Error("Image data is empty");
        if (buffer.byteLength > MAX_IMAGE_SIZE) throw new Error("Image must be 8 MB or smaller");

        const ext = fileExtension(data.fileName, data.mimeType);
        imagePath = `${data.projectId}/${userId}/${Date.now()}-${randomUUID()}.${ext}`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from(CHAT_IMAGE_BUCKET)
          .upload(imagePath, buffer, {
            contentType: data.mimeType,
            upsert: false,
          });

        if (uploadError) throw new Error(uploadError.message);
      }

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("chat_messages")
        .insert({
          project_id: data.projectId,
          sender_id: userId,
          body,
          image_path: imagePath,
        })
        .select("id, project_id, sender_id, body, image_path, created_at")
        .single();

      if (insertError) throw new Error(insertError.message);
      return { message: inserted };
    } catch (error) {
      if (imagePath) {
        await supabaseAdmin.storage.from(CHAT_IMAGE_BUCKET).remove([imagePath]);
      }
      throw error;
    }
  });

export const listProjectChatMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListProjectChatMessagesSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await assertProjectChatAccess(data.projectId, userId);

    const { data: messages, error } = await supabaseAdmin
      .from("chat_messages")
      .select("id, project_id, sender_id, body, image_path, created_at")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: true })
      .limit(data.limit ?? 500);

    if (error) throw new Error(error.message);
    return { messages: messages ?? [] };
  });
