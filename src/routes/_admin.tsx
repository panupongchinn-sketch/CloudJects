import { Outlet, createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { MobileSidebarTrigger } from "@/components/layout/mobile-sidebar-trigger";
import { Bell, LogOut } from "lucide-react";
import { signOut, useAuth } from "@/hooks/use-auth";
import { getStoredAppSession } from "@/lib/app-auth-client";

export const Route = createFileRoute("/_admin")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const session = getStoredAppSession();
    if (!session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    if (!session.user.isPlatformAdmin) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const name = (user?.user_metadata?.full_name as string) || user?.email || "Admin";
  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login", replace: true });
  };
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-2 border-b border-border bg-white px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <MobileSidebarTrigger variant="admin" />
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="border border-border bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase text-slate-700">
                Platform
              </span>
              <span className="hidden truncate text-xs text-slate-500 md:inline">Platform admin console</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative h-8 w-8 border border-border hover:bg-slate-100">
              <Bell className="mx-auto h-4 w-4 text-slate-600" />
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
            </button>
            <div className="hidden border border-border bg-white px-3 py-1 text-xs sm:block">
              <div className="max-w-[160px] truncate font-semibold text-slate-900">{name}</div>
            </div>
            <button type="button" onClick={() => void handleLogout()} className="h-8 w-8 border border-border hover:bg-slate-100" title="Logout" aria-label="ออกจากระบบ">
              <LogOut className="mx-auto h-4 w-4 text-slate-600" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export { Link };
