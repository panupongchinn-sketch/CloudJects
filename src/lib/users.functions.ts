import { randomBytes, scryptSync } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifySignedAppSessionToken } from "@/lib/app-session-token";

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const CreateOrganizationUserSchema = z.object({
  token: z.string().min(1),
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  password: z.string().min(6).max(128),
  role: z.enum(["company_admin", "project_manager", "site_engineer", "foreman", "client", "viewer"]),
});

const UpdateOrganizationUserSchema = z.object({
  token: z.string().min(1),
  userId: z.string().uuid(),
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  role: z.enum(["company_admin", "project_manager", "site_engineer", "foreman", "client", "viewer"]),
  isActive: z.boolean(),
});

const DeleteOrganizationUserSchema = z.object({
  token: z.string().min(1),
  userId: z.string().uuid(),
});

async function resolveActorSession(token: string) {
  const signedSession = verifySignedAppSessionToken(token);
  if (signedSession) {
    return { userId: signedSession.userId };
  }

  const { data: session, error } = await supabaseAdmin
    .from("app_sessions")
    .select("user_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!session) throw new Error("Unauthorized");
  if (new Date(session.expires_at).getTime() <= Date.now()) throw new Error("Session expired");

  return { userId: session.user_id };
}

async function resolveActorAccess(token: string) {
  const actorSession = await resolveActorSession(token);
  const [{ data: actorProfile, error: actorProfileError }, { data: platformAdmin, error: platformAdminError }, { data: actorRoles, error: actorRolesError }] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("organization_id").eq("id", actorSession.userId).maybeSingle(),
      supabaseAdmin
        .from("platform_admins")
        .select("id")
        .eq("user_id", actorSession.userId)
        .eq("is_active", true)
        .maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", actorSession.userId),
    ]);

  if (actorProfileError) throw new Error(actorProfileError.message);
  if (platformAdminError) throw new Error(platformAdminError.message);
  if (actorRolesError) throw new Error(actorRolesError.message);

  if (!actorProfile?.organization_id) {
    throw new Error("Organization not found");
  }

  const canManageUsers =
    !!platformAdmin ||
    (actorRoles ?? []).some((role) => role.role === "super_admin" || role.role === "company_admin");

  if (!canManageUsers) {
    throw new Error("You do not have permission to manage users");
  }

  return {
    actorUserId: actorSession.userId,
    organizationId: actorProfile.organization_id,
  };
}

export const createOrganizationUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateOrganizationUserSchema.parse(d))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();
    const access = await resolveActorAccess(data.token);
    const { data: existingUser, error: existingUserError } =
      await supabaseAdmin.from("app_users").select("id").eq("email", email).maybeSingle();

    if (existingUserError) throw new Error(existingUserError.message);
    if (existingUser) {
      throw new Error("Email already exists");
    }

    const { data: created, error } = await supabaseAdmin
      .from("app_users")
      .insert({
        full_name: data.fullName,
        email,
        password_hash: hashPassword(data.password),
        role: data.role,
        organization_id: access.organizationId,
        is_active: true,
      })
      .select("id,email")
      .single();

    if (error) throw new Error(error.message);
    if (!created?.id) throw new Error("Unable to create user");

    return {
      userId: created.id as string,
      email: created.email as string,
    };
  });

export const updateOrganizationUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UpdateOrganizationUserSchema.parse(d))
  .handler(async ({ data }) => {
    const access = await resolveActorAccess(data.token);
    const email = data.email.toLowerCase();
    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from("app_users")
      .select("id,organization_id")
      .eq("id", data.userId)
      .maybeSingle();

    if (targetUserError) throw new Error(targetUserError.message);
    if (!targetUser) throw new Error("User not found");
    if (targetUser.organization_id !== access.organizationId) {
      throw new Error("You do not have permission to update this user");
    }

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from("app_users")
      .select("id")
      .eq("email", email)
      .neq("id", data.userId)
      .maybeSingle();

    if (existingUserError) throw new Error(existingUserError.message);
    if (existingUser) throw new Error("Email already exists");

    const { error } = await supabaseAdmin
      .from("app_users")
      .update({
        full_name: data.fullName,
        email,
        role: data.role,
        is_active: data.isActive,
      })
      .eq("id", data.userId);

    if (error) throw new Error(error.message);

    return { userId: data.userId };
  });

export const deleteOrganizationUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DeleteOrganizationUserSchema.parse(d))
  .handler(async ({ data }) => {
    const access = await resolveActorAccess(data.token);
    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from("app_users")
      .select("id,organization_id")
      .eq("id", data.userId)
      .maybeSingle();

    if (targetUserError) throw new Error(targetUserError.message);
    if (!targetUser) throw new Error("User not found");
    if (targetUser.organization_id !== access.organizationId) {
      throw new Error("You do not have permission to delete this user");
    }

    if (data.userId === access.actorUserId) {
      throw new Error("You cannot delete your own account");
    }

    const { error } = await supabaseAdmin.from("app_users").delete().eq("id", data.userId);
    if (error) throw new Error(error.message);

    return { userId: data.userId };
  });
