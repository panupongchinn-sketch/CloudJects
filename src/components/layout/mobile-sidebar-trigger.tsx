import { useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";
import { AdminSidebarNav } from "./admin-sidebar-nav";

export function MobileSidebarTrigger({ variant = "app" }: { variant?: "app" | "admin" }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border hover:bg-accent"
          aria-label="เปิดเมนู"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72 border-0">
        {variant === "admin" ? (
          <AdminSidebarNav onNavigate={() => setOpen(false)} />
        ) : (
          <SidebarNav onNavigate={() => setOpen(false)} />
        )}
      </SheetContent>
    </Sheet>
  );
}
