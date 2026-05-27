import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Camera,
  MessageSquare,
  Search,
  Bell,
  Plus,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { MobileSidebarTrigger } from "@/components/layout/mobile-sidebar-trigger";
import { cn } from "@/lib/utils";
import { signOut, useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/portal")({
  component: PortalLayout,
  head: () => ({ meta: [{ title: "พอร์ทัลพนักงาน — CloudJect" }] }),
});

const tabs: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/portal", label: "ภาพรวม", icon: LayoutDashboard, exact: true },
  { to: "/portal/tasks", label: "งานของฉัน", icon: CheckSquare },
  { to: "/portal/reports", label: "รายงานประจำวัน", icon: FileText },
  { to: "/portal/photos", label: "อัปโหลดรูป", icon: Camera },
  { to: "/portal/chat", label: "แชทโครงการ", icon: MessageSquare },
];

function PortalLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    await signOut();
    toast.success("ออกจากระบบแล้ว");
    navigate({ to: "/login", replace: true });
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-14 border-b border-[#E5E7EB] bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur-sm">
        <div className="flex h-full items-center px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center justify-end">
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 xl:flex-none">
              <div className="hidden h-10 w-full items-center rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-500 shadow-sm transition-colors hover:border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 md:flex lg:max-w-[300px] xl:w-[400px]">
                <Search className="mr-3 h-4 w-4 shrink-0 text-slate-400" />
                <input
                  placeholder="ค้นหาโครงการ, งาน, เอกสาร..."
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
                />
                <kbd className="ml-3 hidden rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-400 sm:inline-flex">
                  Ctrl K
                </kbd>
              </div>

              <div className="flex items-center justify-end gap-2">
                <div className="lg:hidden">
                  <MobileSidebarTrigger />
                </div>

                <button
                  aria-label="การแจ้งเตือน"
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <Bell className="h-[18px] w-[18px]" />
                  <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-white" />
                </button>

                <button className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover lg:px-5">
                  <Plus className="h-4 w-4" />
                  สร้างใหม่
                </button>

                {user ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    title={user.email ?? "ออกจากระบบ"}
                    aria-label="ออกจากระบบ"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                  >
                    <LogOut className="h-[18px] w-[18px]" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-[#E5E7EB] bg-white">
        <nav className="flex h-12 gap-3 overflow-x-auto px-4 sm:h-14 sm:gap-5 sm:px-6 lg:gap-7 lg:px-8">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to as any}
                className={cn(
                  "shrink-0 inline-flex items-center gap-2 border-b-2 border-transparent text-sm transition-colors",
                  active
                    ? "border-primary font-semibold text-primary"
                    : "text-slate-500 hover:text-slate-900",
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </>
  );
}
