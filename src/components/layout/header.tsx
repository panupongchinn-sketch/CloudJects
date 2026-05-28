import { LogOut, Search } from "lucide-react";
import { redirectToLogin, signOut, useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { MobileSidebarTrigger } from "./mobile-sidebar-trigger";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user } = useAuth();

  const handleLogout = async () => {
    await signOut();
    toast.success("ออกจากระบบแล้ว");
    redirectToLogin();
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-white px-3 sm:gap-3 sm:px-4">
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

      {user ? (
        <button
          type="button"
          onClick={handleLogout}
          title={user.email ?? "ออกจากระบบ"}
          aria-label="ออกจากระบบ"
          className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </button>
      ) : null}
    </header>
  );
}
