import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FolderKanban,
  Activity as ActivityIcon,
  AlertTriangle,
  ClipboardCheck,
  ArrowUpRight,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { StatusBadge } from "@/components/status-badge";
import { ProgressBar } from "@/components/progress-bar";
import { fetchDashboardData } from "@/lib/app-data";

type DashboardState = Awaited<ReturnType<typeof fetchDashboardData>>;

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard - CloudJect" }] }),
});

function DashboardPage() {
  const [data, setData] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData()
      .then((result) => {
        setData(result);
      })
      .finally(() => setLoading(false));
  }, []);

  const kpis = [
    { label: "โครงการทั้งหมด", sub: "All projects", value: data?.totalProjects ?? 0, icon: FolderKanban, tone: "info" },
    { label: "กำลังดำเนินการ", sub: "In progress", value: data?.activeProjects ?? 0, icon: ActivityIcon, tone: "primary" },
    { label: "งานล่าช้า", sub: "Overdue tasks", value: data?.overdueTasks ?? 0, icon: AlertTriangle, tone: "danger" },
    { label: "รออนุมัติ", sub: "Pending approvals", value: data?.pendingApprovals ?? 0, icon: ClipboardCheck, tone: "warning" },
  ];

  return (
    <>
      <Header title="Dashboard" subtitle="ภาพรวมการดำเนินงานจาก Supabase" />
      <main className="flex-1 space-y-6 p-4 lg:p-6">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            const toneBg =
              kpi.tone === "danger"
                ? "bg-primary-soft text-primary"
                : kpi.tone === "warning"
                  ? "bg-warning/15 text-warning"
                  : kpi.tone === "primary"
                    ? "bg-primary-soft text-primary"
                    : "bg-info/15 text-info";
            return (
              <div key={kpi.label} className="card-surface p-4 lg:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className={`grid h-10 w-10 place-items-center rounded-lg ${toneBg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-3 text-2xl font-semibold tabular-nums lg:text-3xl">
                  {loading ? "-" : kpi.value}
                </div>
                <div className="mt-1 text-sm font-medium">{kpi.label}</div>
                <div className="text-xs text-muted-foreground">{kpi.sub}</div>
              </div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="card-surface p-5 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">ความคืบหน้าโครงการ</h2>
                <p className="text-xs text-muted-foreground">Project progress overview</p>
              </div>
              <Link to="/projects" className="text-xs text-primary hover:underline">
                ดูทั้งหมด
              </Link>
            </div>
            <div className="space-y-4">
              {loading ? (
                <EmptyMini text="กำลังโหลด..." />
              ) : (data?.projects.length ?? 0) === 0 ? (
                <EmptyMini text="ยังไม่มีโครงการในฐานข้อมูล" />
              ) : (
                data!.projects.map((project) => (
                  <div key={project.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <Link
                        to="/projects/$projectId"
                        params={{ projectId: project.id }}
                        className="truncate text-sm font-medium hover:text-primary"
                      >
                        {project.name}
                      </Link>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge kind="project" value={project.status} />
                        <span className="w-10 text-right text-sm font-semibold tabular-nums">
                          {project.progress}%
                        </span>
                      </div>
                    </div>
                    <ProgressBar
                      value={project.progress}
                      tone={project.overdueCount > 0 ? "danger" : "default"}
                    />
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{project.client?.name ?? "-"}</span>
                      <span>{project.taskCount} tasks · {project.overdueCount} overdue</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card-surface p-5">
            <h2 className="font-semibold">รายการอนุมัติ</h2>
            <p className="text-xs text-muted-foreground">Pending approvals</p>
            <div className="mt-4 divide-y divide-border">
              {(data?.approvals ?? []).map((approval) => (
                <div key={approval.id} className="py-3">
                  <div className="text-sm font-medium">{approval.note || approval.ref_type}</div>
                  <div className="text-xs text-muted-foreground">
                    {approval.projects?.name ?? "-"} · {approval.created_at.slice(0, 10)}
                  </div>
                </div>
              ))}
              {!loading && (data?.pendingApprovals ?? 0) === 0 ? (
                <EmptyMini text="ไม่มีรายการรออนุมัติ" />
              ) : null}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function EmptyMini({ text }: { text: string }) {
  return <div className="py-8 text-center text-sm text-muted-foreground">{text}</div>;
}
