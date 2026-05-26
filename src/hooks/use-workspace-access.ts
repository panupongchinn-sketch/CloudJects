import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const ADMIN_ROLES = new Set(["super_admin", "company_admin"]);
const ACCESS_TIMEOUT_MS = 8000;

export function useWorkspaceAccess() {
  const { user, loading: authLoading } = useAuth();
  const [canUseFullWorkspace, setCanUseFullWorkspace] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCanUseFullWorkspace(false);
      setLoading(false);
      return;
    }
    if (user.isPlatformAdmin) {
      setCanUseFullWorkspace(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setCanUseFullWorkspace(false);
        setLoading(false);
      }
    }, ACCESS_TIMEOUT_MS);

    (async () => {
      const [appUserByIdResult, appUserByAuthIdResult, appUserByEmailResult, roleResult] = await Promise.all([
        supabase.from("app_users").select("role").eq("id", user.id).maybeSingle(),
        supabase.from("app_users").select("role").eq("user_id", user.id).maybeSingle(),
        user.email
          ? supabase.from("app_users").select("role").eq("email", user.email).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      if (cancelled) return;

      const appRoles = [
        appUserByIdResult.data?.role,
        appUserByAuthIdResult.data?.role,
        appUserByEmailResult.data?.role,
      ].filter(Boolean) as string[];
      const authRoles = (roleResult.data ?? []).map((row) => row.role as string);
      window.clearTimeout(timeoutId);
      setCanUseFullWorkspace([...appRoles, ...authRoles].some((role) => ADMIN_ROLES.has(role)));
      setLoading(false);
    })().catch(() => {
      if (!cancelled) {
        window.clearTimeout(timeoutId);
        setCanUseFullWorkspace(false);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [user, authLoading]);

  return { canUseFullWorkspace, loading: loading || authLoading };
}
