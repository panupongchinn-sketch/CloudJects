import { Bell, LogOut, Plus, Search } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { signOut, useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { MobileSidebarTrigger } from "./mobile-sidebar-trigger";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    await signOut();
    toast.success("ออกจากระบบแล้ว");
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-white px-3 sm:gap-3 sm:px-4">
      <MobileSidebarTrigger />

      <div className="hidden min-w-0 flex-1 md:block">
        <div className="truncate text-sm font-semibold text-slate-950">{title}</div>
        {subtitle ? <div className="truncate text-[11px] text-slate-500">{subtitle}</div> : null}
      </div>
      <div className="min-w-0 flex-1 md:hidden" />

      <div className="hidden h-8 w-72 items-center rounded-sm border border-border bg-white px-3 text-xs text-muted-foreground md:flex">
        <Search className="mr-2 h-4 w-4" />
        <input
          placeholder="ค้นหาโครงการ, งาน, เอกสาร..."
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
        />
        <kbd className="ml-2 hidden border border-border bg-muted px-1.5 py-0.5 text-[10px] lg:inline">Ctrl K</kbd>
      </div>

      <button className="relative inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border hover:bg-accent">
        <Bell className="h-4 w-4" />
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
      </button>

      <button className="hidden h-8 items-center gap-1.5 rounded-sm bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover md:inline-flex">
        <Plus className="h-4 w-4" />
        สร้างใหม่
      </button>

      {user ? (
        <button
          onClick={handleLogout}
          title={user.email ?? "ออกจากระบบ"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </button>
      ) : null}
    </header>
  );
}
