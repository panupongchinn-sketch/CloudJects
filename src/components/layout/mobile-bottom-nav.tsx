import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Briefcase, ClipboardCheck, FolderKanban, LayoutDashboard, Settings } from "lucide-react";
import { useWorkspaceAccess } from "@/hooks/use-workspace-access";
import { cn } from "@/lib/utils";

const items = [
  { to: "/portal", label: "พอร์ทัล", icon: Briefcase },
  { to: "/dashboard", label: "ภาพรวม", icon: LayoutDashboard },
  { to: "/projects", label: "โครงการ", icon: FolderKanban },
  { to: "/approvals", label: "อนุมัติ", icon: ClipboardCheck },
  { to: "/notifications", label: "แจ้งเตือน", icon: Bell },
];

const limitedItems = [
  { to: "/portal", label: "พอร์ทัล", icon: Briefcase },
  { to: "/settings", label: "ตั้งค่า", icon: Settings },
];

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { canUseFullWorkspace } = useWorkspaceAccess();
  const visibleItems = canUseFullWorkspace ? items : limitedItems;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card lg:hidden">
      <ul className={cn("grid", canUseFullWorkspace ? "grid-cols-5" : "grid-cols-2")}>
        {visibleItems.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.to || (it.to !== "/dashboard" && pathname.startsWith(it.to));
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
