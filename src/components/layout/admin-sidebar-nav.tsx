import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  Package,
  Repeat,
  Receipt,
  Gauge,
  UserCog,
  ScrollText,
  Settings,
  ArrowLeft,
  Image,
} from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { cn } from "@/lib/utils";

const items = [
  { to: "/admin", label: "Dashboard", labelTh: "ภาพรวมระบบ", icon: LayoutDashboard, exact: true },
  { to: "/admin/companies", label: "Companies", labelTh: "บริษัท", icon: Building2 },
  { to: "/admin/projects", label: "All Projects", labelTh: "โครงการทั้งหมด", icon: FolderKanban },
  { to: "/admin/packages", label: "Packages", labelTh: "แพ็กเกจ", icon: Package },
  { to: "/admin/subscriptions", label: "Subscriptions", labelTh: "การสมัคร", icon: Repeat },
  { to: "/admin/payments", label: "Payments", labelTh: "การชำระเงิน", icon: Receipt },
  { to: "/admin/usage", label: "Usage", labelTh: "การใช้งาน", icon: Gauge },
  { to: "/admin/users", label: "Platform Users", labelTh: "ผู้ดูแลระบบ", icon: UserCog },
  { to: "/admin/advertisements", label: "Advertisements", labelTh: "โฆษณา", icon: Image },
  { to: "/admin/audit-logs", label: "Audit Logs", labelTh: "บันทึก", icon: ScrollText },
  { to: "/admin/settings", label: "Settings", labelTh: "ตั้งค่า", icon: Settings },
];

export function AdminSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <BrandLogo className="h-8 w-8 shrink-0 object-contain" />
        <div className="leading-tight">
          <div className="text-sm font-bold text-[#0b1f3a]">CloudJect</div>
          <div className="text-[10px] uppercase tracking-wide text-sidebar-muted">Platform Console</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="px-2 pb-2 text-[10px] uppercase tracking-wider text-sidebar-muted">
          Platform Admin
        </div>
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === item.to
            : pathname === item.to || pathname.startsWith(item.to + "/");
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
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2 border-l-2 border-l-transparent px-2.5 py-2 text-sm text-sidebar-foreground/85 hover:bg-sidebar-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับไปแอปหลัก
        </Link>
      </div>
    </div>
  );
}
