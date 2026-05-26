import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FolderKanban, CheckSquare, FileText, Camera, ArrowRight, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProjects, type MyProject } from "@/lib/portal-data";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { CloudJectLoading } from "@/components/loading/cloudject-loading";

export const Route = createFileRoute("/_app/portal/")({
  component: PortalHome,
});

function PortalHome() {
  const { user, loading } = useAuth();
  const [projects, setProjects] = useState<MyProject[]>([]);
  const [counts, setCounts] = useState({ tasks: 0, overdue: 0, reports: 0, photos: 0 });
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setBusy(true);
      const ps = await fetchMyProjects(user.id);
      setProjects(ps);

      const today = new Date().toISOString().slice(0, 10);
      const [t, ov, r, ph] = await Promise.all([
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("assignee_id", user.id).neq("status", "Completed"),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("assignee_id", user.id).neq("status", "Completed").lt("due_date", today),
        supabase.from("daily_reports").select("id", { count: "exact", head: true }).eq("reporter_id", user.id),
        supabase.from("photos").select("id", { count: "exact", head: true }).eq("uploader_id", user.id),
      ]);
      setCounts({
        tasks: t.count ?? 0,
        overdue: ov.count ?? 0,
        reports: r.count ?? 0,
        photos: ph.count ?? 0,
      });
      setBusy(false);
    })();
  }, [user]);

  if (loading || busy) return <CloudJectLoading />;

  const kpis = [
    { label: "งานที่ค้างอยู่", value: counts.tasks, icon: CheckSquare, tone: "primary" },
    { label: "งานเลยกำหนด", value: counts.overdue, icon: ClipboardList, tone: "danger" },
    { label: "รายงานที่เขียน", value: counts.reports, icon: FileText, tone: "info" },
    { label: "รูปที่อัปโหลด", value: counts.photos, icon: Camera, tone: "warning" },
  ];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          const tone =
            k.tone === "primary"
              ? "bg-primary-soft text-primary"
              : k.tone === "danger"
                ? "bg-destructive/15 text-destructive"
                : k.tone === "warning"
                  ? "bg-warning/15 text-warning"
                  : "bg-info/15 text-info";
          return (
            <div key={k.label} className="card-surface p-4 lg:p-5">
              <div className={`grid h-10 w-10 place-items-center rounded-lg ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-3 text-2xl font-semibold tabular-nums lg:text-3xl">{k.value}</div>
              <div className="mt-1 text-sm font-medium">{k.label}</div>
            </div>
          );
        })}
      </section>

      <section className="card-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <FolderKanban className="h-4 w-4 text-primary" /> โครงการของฉัน
            </h2>
            <p className="text-xs text-muted-foreground">โครงการที่คุณเป็นสมาชิกหรือผู้จัดการ</p>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{projects.length} โครงการ</span>
        </div>

        {projects.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            ยังไม่มีโครงการที่คุณเป็นสมาชิก
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                to="/projects/$projectId"
                params={{ projectId: p.id }}
                className="rounded-lg border border-border p-4 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono text-muted-foreground">{p.code}</div>
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{p.location ?? "-"}</div>
                  </div>
                  <StatusBadge kind="project" value={p.status as any} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">ความคืบหน้า</span>
                  <span className="font-semibold tabular-nums">{p.progress}%</span>
                </div>
                <ProgressBar value={p.progress} className="mt-1.5" />
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="rounded bg-secondary px-1.5 py-0.5 uppercase tracking-wide">{p.role}</span>
                  <span className="inline-flex items-center gap-1 text-primary">เปิด <ArrowRight className="h-3 w-3" /></span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
