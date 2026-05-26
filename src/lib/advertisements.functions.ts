import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AD_BUCKET = "login-advertisements";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function adPublicUrl(path: string) {
  return supabaseAdmin.storage.from(AD_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function requirePlatformAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("platform_admins")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Unauthorized");
}

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

const UploadAdvertisementSchema = z.object({
  title: z.string().trim().max(160).optional(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  dataBase64: z.string().min(1),
});

const DeleteAdvertisementSchema = z.object({
  id: z.string().uuid(),
});

export type AdvertisementRecord = {
  id: string;
  title: string | null;
  image_path: string;
  imageUrl: string;
  created_at: string;
  sort_order: number;
};

export type AdminAdvertisementRecord = AdvertisementRecord & {
  is_active: boolean;
  updated_at: string;
};

export const listAdvertisements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as any;
    await requirePlatformAdmin(userId);

    const { data, error } = await supabaseAdmin
      .from("login_advertisements")
      .select("id,title,image_path,is_active,sort_order,created_at,updated_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return {
      advertisements: (data ?? []).map((item): AdminAdvertisementRecord => ({
        ...item,
        imageUrl: adPublicUrl(item.image_path),
      })),
    };
  });

export const listActiveAdvertisements = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("login_advertisements")
    .select("id,title,image_path,sort_order,created_at")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return {
    advertisements: (data ?? []).map((item): AdvertisementRecord => ({
      ...item,
      imageUrl: adPublicUrl(item.image_path),
    })),
  };
});

export const uploadAdvertisement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UploadAdvertisementSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    await requirePlatformAdmin(userId);

    const buffer = Buffer.from(data.dataBase64, "base64");
    if (!buffer.byteLength) throw new Error("Image data is empty");
    if (buffer.byteLength > MAX_IMAGE_SIZE) throw new Error("Image must be 5 MB or smaller");

    const ext = fileExtension(data.fileName, data.mimeType);
    const storagePath = `public/${Date.now()}-${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(AD_BUCKET)
      .upload(storagePath, buffer, {
        contentType: data.mimeType,
        upsert: false,
      });
    if (uploadError) throw new Error(uploadError.message);

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("login_advertisements")
      .insert({
        title: data.title || null,
        image_path: storagePath,
        created_by: userId,
      })
      .select("id,title,image_path,is_active,sort_order,created_at,updated_at")
      .single();

    if (insertError) {
      await supabaseAdmin.storage.from(AD_BUCKET).remove([storagePath]);
      throw new Error(insertError.message);
    }

    return {
      advertisement: {
        ...inserted,
        imageUrl: adPublicUrl(inserted.image_path),
      },
    };
  });

export const deleteAdvertisement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteAdvertisementSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    await requirePlatformAdmin(userId);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("login_advertisements")
      .select("id,image_path")
      .eq("id", data.id)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);
    if (!existing) throw new Error("Advertisement not found");

    const { error: deleteError } = await supabaseAdmin
      .from("login_advertisements")
      .delete()
      .eq("id", data.id);
    if (deleteError) throw new Error(deleteError.message);

    const { error: storageError } = await supabaseAdmin.storage
      .from(AD_BUCKET)
      .remove([existing.image_path]);
    if (storageError) throw new Error(storageError.message);

    return { ok: true };
  });
