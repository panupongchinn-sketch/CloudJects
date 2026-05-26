import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/portal/tasks")({
  component: MyTasksPage,
});

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  progress: number;
  project_id: string;
  project?: { name: string; code: string };
};

const STATUSES = ["To Do", "In Progress", "Waiting Review", "Waiting Approval", "Completed"];

function MyTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("Open");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("id,title,description,status,priority,due_date,progress,project_id, projects!inner(name,code)")
      .eq("assignee_id", user.id)
      .order("due_date", { ascending: true, nullsFirst: false });
    setTasks(
      (data ?? []).map((t: any) => ({ ...t, project: t.projects })),
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("tasks").update({ status: status as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("อัปเดตสถานะแล้ว");
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const today = new Date().toISOString().slice(0, 10);
  const visible = tasks.filter((t) => {
    if (filter === "Open") return t.status !== "Completed";
    if (filter === "Overdue") return t.status !== "Completed" && t.due_date && t.due_date < today;
    if (filter === "Done") return t.status === "Completed";
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {["Open", "Overdue", "Done", "All"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "h-9 px-3 rounded-lg text-sm " +
              (filter === f
                ? "bg-primary text-primary-foreground font-medium"
                : "border border-border bg-background hover:bg-accent")
            }
          >
            {f === "Open" ? "ค้างอยู่" : f === "Overdue" ? "เลยกำหนด" : f === "Done" ? "เสร็จแล้ว" : "ทั้งหมด"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> โหลดงานของฉัน...
        </div>
      ) : visible.length === 0 ? (
        <div className="card-surface p-10 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <div className="mt-3">ไม่มีงานในหมวดนี้</div>
        </div>
      ) : (
        <div className="card-surface divide-y divide-border">
          {visible.map((t) => {
            const overdue = t.due_date && t.due_date < today && t.status !== "Completed";
            return (
              <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge kind="task" value={t.status as any} />
                    <StatusBadge kind="priority" value={t.priority as any} />
                    {overdue && (
                      <span className="text-[11px] inline-flex items-center gap-1 text-destructive">
                        <AlertTriangle className="h-3 w-3" /> เลยกำหนด
                      </span>
                    )}
                  </div>
                  <div className="mt-1 font-medium truncate">{t.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <Link to="/projects/$projectId" params={{ projectId: t.project_id }} className="hover:text-primary truncate">
                      {t.project?.code} · {t.project?.name}
                    </Link>
                    {t.due_date && (
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {t.due_date}</span>
                    )}
                  </div>
                </div>
                <select
                  value={t.status}
                  onChange={(e) => updateStatus(t.id, e.target.value)}
                  className="h-9 px-2 rounded-md border border-border bg-background text-sm"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
