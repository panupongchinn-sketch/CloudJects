import { AdminSidebarNav } from "./admin-sidebar-nav";

export function AdminSidebar() {
  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <AdminSidebarNav />
    </aside>
  );
}
