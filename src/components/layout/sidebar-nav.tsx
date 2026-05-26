import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  FilePlus2,
  ClipboardCheck,
  Bell,
  Users,
  Settings,
  Shield,
  Briefcase,
} from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { useWorkspaceAccess } from "@/hooks/use-workspace-access";
import { useEffect, useState } from "react";

const items = [
  { to: "/portal", label: "My Portal", labelTh: "พอร์ทัลของฉัน", icon: Briefcase },
  { to: "/dashboard", label: "Dashboard", labelTh: "ภาพรวม", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", labelTh: "โครงการ", icon: FolderKanban },
  { to: "/documents", label: "Documents", labelTh: "เอกสาร", icon: FileText },
  { to: "/templates", label: "Templates", labelTh: "Template เอกสาร", icon: FilePlus2 },
  { to: "/approvals", label: "Approvals", labelTh: "การอนุมัติ", icon: ClipboardCheck },
  { to: "/notifications", label: "Notifications", labelTh: "แจ้งเตือน", icon: Bell },
  { to: "/users", label: "Users", labelTh: "ผู้ใช้งาน", icon: Users },
  { to: "/settings", label: "Settings", labelTh: "ตั้งค่า", icon: Settings },
];


export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { isPlatformAdmin } = usePlatformAdmin();
  const { canUseFullWorkspace } = useWorkspaceAccess();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const visibleItems = canUseFullWorkspace
    ? items
    : items.filter((item) => item.to === "/portal" || item.to === "/settings");

  const displayName =
    (user?.user_metadata?.full_name as string) ||
    user?.email?.split("@")[0] ||
    "User";
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <BrandLogo className="h-8 w-8 shrink-0 object-contain" />
        <div className="leading-tight">
          <div className="text-sm font-bold text-[#0b1f3a]">CloudJect</div>
          <div className="text-[10px] uppercase tracking-wide text-sidebar-muted">Project Management</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="px-2 pb-2 text-[10px] uppercase tracking-wider text-sidebar-muted">
          Workspace
        </div>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 border-l-2 px-2.5 py-2 text-sm transition-colors",
                active
                  ? "border-l-primary bg-sidebar-active font-semibold text-[#0b3b75]"
                  : "border-l-transparent text-sidebar-foreground/85 hover:bg-sidebar-hover",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.labelTh}</span>
              <span className="text-[10px] text-sidebar-muted group-hover:text-sidebar-foreground/70">
                {item.label}
              </span>
            </Link>
          );
        })}

        {isPlatformAdmin && (
          <>
            <div className="px-2 pb-2 pt-4 text-[10px] uppercase tracking-wider text-sidebar-muted">
              Platform
            </div>
            <Link
              to="/admin"
              onClick={onNavigate}
              className="group flex items-center gap-3 border-l-2 border-l-blue-600 bg-blue-50 px-2.5 py-2 text-sm text-blue-700 transition-colors hover:bg-blue-100"
            >
              <Shield className="h-4 w-4" />
              <span className="flex-1">Admin Console</span>
              <span className="text-[10px] text-sidebar-muted">/admin</span>
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3" suppressHydrationWarning>
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {mounted ? initials : ""}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold">{mounted ? displayName : ""}</div>
            <div className="truncate text-[10px] text-sidebar-muted">{mounted ? user?.email : ""}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
