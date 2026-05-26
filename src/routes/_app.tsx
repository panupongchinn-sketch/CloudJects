import { useEffect } from "react";
import { Outlet, createFileRoute, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { getStoredAppSession } from "@/lib/app-auth-client";
import { CloudJectLoading } from "@/components/loading/cloudject-loading";
import { useWorkspaceAccess } from "@/hooks/use-workspace-access";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const session = getStoredAppSession();
    if (!session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { canUseFullWorkspace, loading } = useWorkspaceAccess();
  const allowedForLimitedUser =
    pathname.startsWith("/portal") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/projects/");

  useEffect(() => {
    if (!loading && !canUseFullWorkspace && !allowedForLimitedUser) {
      navigate({ to: "/portal", replace: true });
    }
  }, [allowedForLimitedUser, canUseFullWorkspace, loading, navigate]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
        {loading || (!canUseFullWorkspace && !allowedForLimitedUser) ? <CloudJectLoading /> : <Outlet />}
      </div>
      <MobileBottomNav />
    </div>
  );
}
