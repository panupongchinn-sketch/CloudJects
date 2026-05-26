import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Bell, CheckCheck, AlertTriangle, MessageCircle, CheckCircle2, FileCheck } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
          const row: any = payload.new;
          toast(row.title, { description: row.body });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user!.id)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const iconFor = (title: string) => {
    if (/อนุมัติ/.test(title) && !/รอ/.test(title)) return CheckCircle2;
    if (/ตีกลับ|ปฏิเสธ/.test(title)) return AlertTriangle;
    if (/แก้ไข/.test(title)) return FileCheck;
    if (/แชท|chat|mention/i.test(title)) return MessageCircle;
    return Bell;
  };
  const toneFor = (title: string) => {
    if (/ตีกลับ|ปฏิเสธ/.test(title)) return "bg-primary-soft text-primary";
    if (/อนุมัติ/.test(title) && !/รอ/.test(title)) return "bg-emerald-100 text-emerald-700";
    if (/รออนุมัติ|แก้ไข/.test(title)) return "bg-amber-100 text-amber-700";
    return "bg-secondary text-foreground";
  };

  return (
    <>
      <Header title="แจ้งเตือน" subtitle="Notifications" />
      <main className="flex-1 p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{items.length} รายการ</p>
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <CheckCheck className="h-4 w-4 mr-1.5" /> อ่านทั้งหมด
          </Button>
        </div>
        <div className="card-surface divide-y divide-border p-0 overflow-hidden">
          {isLoading && <div className="p-6 text-center text-sm text-muted-foreground">กำลังโหลด...</div>}
          {!isLoading && items.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">ยังไม่มีการแจ้งเตือน</div>}
          {items.map((it: any) => {
            const Icon = iconFor(it.title);
            const Wrapper: any = it.link ? Link : "div";
            const wrapperProps: any = it.link ? { to: it.link } : {};
            return (
              <Wrapper
                key={it.id}
                {...wrapperProps}
                onClick={() => !it.read && markOne(it.id)}
                className={"flex items-start gap-3 p-4 hover:bg-accent/40 transition-colors " + (!it.read ? "bg-primary-soft/20" : "")}
              >
                <div className={"h-10 w-10 rounded-lg grid place-items-center shrink-0 " + toneFor(it.title)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{it.title}</div>
                  {it.body && <div className="text-xs text-muted-foreground line-clamp-2">{it.body}</div>}
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(it.created_at).toLocaleString("th-TH")}
                  </div>
                </div>
                {!it.read && <span className="h-2 w-2 rounded-full bg-primary mt-2" />}
              </Wrapper>
            );
          })}
        </div>
      </main>
    </>
  );
}
