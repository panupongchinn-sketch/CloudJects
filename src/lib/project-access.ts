import { supabase } from "@/integrations/supabase/client";
import type { AppSessionUser } from "@/lib/app-auth-client";

const ADMIN_ROLES = new Set(["super_admin", "company_admin"]);
const PROJECT_MANAGER_ROLES = new Set(["project_manager"]);

type AppUserAccessRow = {
  id: string;
  user_id: string | null;
  role: string | null;
};

export type ProjectSettingsAccess = {
  canManageSettings: boolean;
  isPlatformAdmin: boolean;
  userIds: string[];
  roles: string[];
};

export async function fetchProjectSettingsAccess(
  projectId: string,
  user: AppSessionUser | null,
): Promise<ProjectSettingsAccess> {
  if (!user) return { canManageSettings: false, isPlatformAdmin: false, userIds: [], roles: [] };

  const userIds = new Set<string>([user.id]);
  const roles = new Set<string>();

  const [appUserByIdResult, appUserByAuthIdResult, appUserByEmailResult, projectResult] =
    await Promise.all([
      supabase.from("app_users").select("id,user_id,role").eq("id", user.id).maybeSingle(),
      supabase.from("app_users").select("id,user_id,role").eq("user_id", user.id).maybeSingle(),
      user.email
        ? supabase.from("app_users").select("id,user_id,role").eq("email", user.email).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from("projects").select("manager_id").eq("id", projectId).maybeSingle(),
    ]);

  const appUsers = [
    appUserByIdResult.data,
    appUserByAuthIdResult.data,
    appUserByEmailResult.data,
  ].filter(Boolean) as AppUserAccessRow[];

  for (const appUser of appUsers) {
    userIds.add(appUser.id);
    if (appUser.user_id) userIds.add(appUser.user_id);
    if (appUser.role) roles.add(appUser.role);
  }

  const resolvedUserIds = Array.from(userIds);
  const [authRolesResult, platformAdminByUserResult, platformAdminByEmailResult] = await Promise.all([
    resolvedUserIds.length
      ? supabase.from("user_roles").select("role").in("user_id", resolvedUserIds)
      : Promise.resolve({ data: [], error: null }),
    resolvedUserIds.length
      ? supabase.from("platform_admins").select("id").in("user_id", resolvedUserIds).eq("is_active", true)
      : Promise.resolve({ data: [], error: null }),
    user.email
      ? supabase.from("platform_admins").select("id").eq("email", user.email).eq("is_active", true)
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const roleRow of authRolesResult.data ?? []) {
    if (roleRow.role) roles.add(roleRow.role);
  }

  const memberResult = resolvedUserIds.length
    ? await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .in("user_id", resolvedUserIds)
    : { data: [], error: null };

  const isAdmin = Array.from(roles).some((role) => ADMIN_ROLES.has(role));
  const isPlatformAdmin = Boolean((platformAdminByUserResult.data ?? []).length || (platformAdminByEmailResult.data ?? []).length);
  const isProjectManager =
    Boolean(projectResult.data?.manager_id && userIds.has(projectResult.data.manager_id)) ||
    (memberResult.data ?? []).some((member) => PROJECT_MANAGER_ROLES.has(member.role));

  return {
    canManageSettings: isAdmin || isPlatformAdmin || isProjectManager,
    isPlatformAdmin,
    userIds: resolvedUserIds,
    roles: Array.from(roles),
  };
}
