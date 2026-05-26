import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TeamMemberSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
});

async function assertCanManageProjectTeam(projectId: string, actorUserId: string) {
  const [
    { data: project, error: projectError },
    { data: roles, error: rolesError },
    { data: appUserById, error: appUserByIdError },
    { data: appUserByAuthId, error: appUserByAuthIdError },
  ] = await Promise.all([
    supabaseAdmin.from("projects").select("id,manager_id,organization_id").eq("id", projectId).maybeSingle(),
    supabaseAdmin.from("user_roles").select("role").eq("user_id", actorUserId),
    supabaseAdmin.from("app_users").select("role").eq("id", actorUserId).maybeSingle(),
    supabaseAdmin.from("app_users").select("role").eq("user_id", actorUserId).maybeSingle(),
  ]);

  if (projectError) throw new Error(projectError.message);
  if (rolesError) throw new Error(rolesError.message);
  if (appUserByIdError) throw new Error(appUserByIdError.message);
  if (appUserByAuthIdError) throw new Error(appUserByAuthIdError.message);
  if (!project) throw new Error("Project not found");

  const roleNames = new Set<string>([
    ...(roles ?? []).map((row) => row.role),
    ...(appUserById?.role ? [appUserById.role] : []),
    ...(appUserByAuthId?.role ? [appUserByAuthId.role] : []),
  ]);
  const isAdmin = roleNames.has("super_admin") || roleNames.has("company_admin");
  const isManager = project.manager_id === actorUserId;
  if (!isAdmin && !isManager) throw new Error("You do not have permission to manage this team");

  return project as { id: string; manager_id: string | null; organization_id: string | null };
}

async function resolveProjectMemberUserId(selectedUserId: string, organizationId: string | null) {
  const [{ data: appUserById, error: appUserByIdError }, { data: appUserByAuthId, error: appUserByAuthIdError }] =
    await Promise.all([
      supabaseAdmin
        .from("app_users")
        .select("id,user_id,email,full_name,role,organization_id,is_active")
        .eq("id", selectedUserId)
        .maybeSingle(),
      supabaseAdmin
        .from("app_users")
        .select("id,user_id,email,full_name,role,organization_id,is_active")
        .eq("user_id", selectedUserId)
        .maybeSingle(),
    ]);

  if (appUserByIdError) throw new Error(appUserByIdError.message);
  if (appUserByAuthIdError) throw new Error(appUserByAuthIdError.message);

  const appUser = appUserById ?? appUserByAuthId;
  if (!appUser) {
    throw new Error("User not found");
  }
  if (organizationId && appUser.organization_id !== organizationId) {
    throw new Error("User is not in this project's company");
  }
  if (appUser.is_active === false) throw new Error("User is disabled");

  return (appUser.user_id ?? appUser.id) as string;
}

export const addProjectMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TeamMemberSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId: actorUserId } = context as { userId: string };
    const project = await assertCanManageProjectTeam(data.projectId, actorUserId);
    const memberUserId = await resolveProjectMemberUserId(data.userId, project.organization_id);

    const { error } = await supabaseAdmin.from("project_members").upsert(
      {
        project_id: data.projectId,
        user_id: memberUserId,
        role: "member",
      },
      { onConflict: "project_id,user_id" },
    );
    if (error) throw new Error(error.message);

    return { userId: memberUserId };
  });

export const removeProjectMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TeamMemberSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId: actorUserId } = context as { userId: string };
    const project = await assertCanManageProjectTeam(data.projectId, actorUserId);
    if (data.userId === project.manager_id) throw new Error("Cannot remove project manager");

    const { error } = await supabaseAdmin
      .from("project_members")
      .delete()
      .eq("project_id", data.projectId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);

    return { userId: data.userId };
  });
