import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  ImageIcon,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { CloudJectLoading } from "@/components/loading/cloudject-loading";
import { ProgressBar } from "@/components/progress-bar";
import {
  fetchProjectBundle,
  initials,
  isOverdue,
  money,
  photoUrl,
  type TaskRow as ProjectTask,
} from "@/lib/app-data";

type ProjectBundle = NonNullable<Awaited<ReturnType<typeof fetchProjectBundle>>>;

export const Route = createFileRoute("/_app/projects/$projectId/")({
  component: Overview,
});

function Overview() {
  const { projectId } = useParams({ from: "/_app/projects/$projectId/" });
  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetchProjectBundle(projectId)
      .then((result) => {
        if (!cancelled) setBundle(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "โหลดข้อมูลไม่สำเร็จ");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) return <CloudJectLoading />;
  if (error) return <EmptyState text={error} boxed />;
  if (!bundle) return <EmptyState text="ไม่พบข้อมูลโครงการนี้" boxed />;

  const { project, client, manager, tasks, members, reports, photos, profiles } = bundle;
  const inProgressTasks = tasks.filter((task) => task.status === "In Progress");
  const overdueTasks = tasks.filter((task) => isOverdue(task));
  const completedTasks = tasks.filter((task) => task.status === "Completed");

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={CheckCircle2} label="Completed" value={`${completedTasks.length}/${tasks.length}`} helper="tasks closed" />
        <SummaryCard icon={Clock} label="In Progress" value={`${inProgressTasks.length}`} helper="active tasks" />
        <SummaryCard icon={AlertTriangle} label="Overdue" value={`${overdueTasks.length}`} helper="needs attention" tone="danger" />
        <SummaryCard icon={Users} label="Team" value={`${members.length}`} helper="assigned members" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">สถานะงาน</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  สรุปงานหลักและประเด็นที่ต้องติดตาม
                </p>
              </div>
              <Link
                to="/projects/$projectId/tasks"
                params={{ projectId }}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                เปิด Tasks
              </Link>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <TaskSection title="กำลังดำเนินการ" count={inProgressTasks.length}>
                {inProgressTasks.length === 0 ? (
                  <EmptyState text="ยังไม่มีงานที่กำลังดำเนินการ" />
                ) : (
                  inProgressTasks.slice(0, 4).map((task) => (
                    <ProjectTaskItem
                      key={task.id}
                      task={task}
                      assigneeName={displayProfile(profiles.get(task.assignee_id ?? ""))}
                    />
                  ))
                )}
              </TaskSection>

              <TaskSection title="ล่าช้า" count={overdueTasks.length} tone="danger">
                {overdueTasks.length === 0 ? (
                  <EmptyState text="ไม่มีงานล่าช้า" />
                ) : (
                  overdueTasks.slice(0, 4).map((task) => (
                    <ProjectTaskItem
                      key={task.id}
                      task={task}
                      assigneeName={displayProfile(profiles.get(task.assignee_id ?? ""))}
                      danger
                    />
                  ))
                )}
              </TaskSection>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">ข้อมูลโครงการ</h2>
            </div>

            <div className="mt-4 border-t border-border">
              <dl className="grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
                <ProjectInfoRow label="ลูกค้า" value={client?.name} />
                <ProjectInfoRow label="ผู้ติดต่อ" value={client?.contact} />
                <ProjectInfoRow label="โทรศัพท์" value={client?.phone} icon={Phone} />
                <ProjectInfoRow label="สถานที่" value={project.location} icon={MapPin} />
                <ProjectInfoRow label="ผู้จัดการ" value={displayProfile(manager)} />
                <ProjectInfoRow label="งบประมาณ" value={money(project.budget)} />
                <ProjectInfoRow label="เริ่ม" value={project.start_date} icon={CalendarDays} />
                <ProjectInfoRow label="สิ้นสุด" value={project.end_date} icon={CalendarDays} />
                <ProjectInfoRow label="สถานะ" value={project.status} />
              </dl>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">ทีมงาน</h2>
              <span className="text-sm text-muted-foreground">{members.length} คน</span>
            </div>

            <div className="mt-4 space-y-3">
              {members.length === 0 ? (
                <EmptyState text="ยังไม่มีทีมงานในโครงการนี้" />
              ) : (
                members.map((member) => {
                  const profile = profiles.get(member.user_id);
                  return (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-xs font-semibold">
                        {initials(profile?.full_name, profile?.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {displayProfile(profile)}
                        </div>
                        <div className="text-xs text-muted-foreground">{member.role}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">รายงานล่าสุด</h2>
              </div>
              <Link
                to="/projects/$projectId/reports"
                params={{ projectId }}
                className="text-sm font-medium text-primary hover:underline"
              >
                ทั้งหมด
              </Link>
            </div>

            <div className="mt-4 space-y-4">
              {reports.length === 0 ? (
                <EmptyState text="ยังไม่มีรายงาน" />
              ) : (
                reports.slice(0, 3).map((report) => (
                  <article key={report.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{report.report_date}</span>
                      <StatusBadge kind="report" value={report.status} />
                    </div>
                    <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {report.summary ?? "-"}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">รูปล่าสุด</h2>
              </div>
              <Link
                to="/projects/$projectId/photos"
                params={{ projectId }}
                className="text-sm font-medium text-primary hover:underline"
              >
                เปิดแกลเลอรี
              </Link>
            </div>

            {photos.length === 0 ? (
              <div className="mt-4">
                <EmptyState text="ยังไม่มีรูปภาพ" />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {photos.slice(0, 6).map((photo) => (
                  <img
                    key={photo.id}
                    src={photoUrl(photo.storage_path)}
                    alt={photo.caption ?? "Project photo"}
                    className="aspect-square w-full rounded-lg object-cover ring-1 ring-border"
                  />
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">ความคืบหน้าโครงการ</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              สถานะรวมของงานในโครงการ
            </p>
          </div>
          <StatusBadge kind="project" value={project.status} />
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} tone={overdueTasks.length > 0 ? "danger" : "default"} />
        </div>
      </section>
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "default",
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{helper}</div>
        </div>
        <div className={tone === "danger" ? "text-primary" : "text-muted-foreground"}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function TaskSection({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className={tone === "danger" ? "text-sm font-semibold text-primary" : "text-sm text-muted-foreground"}>
          {count}
        </span>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function ProjectTaskItem({
  task,
  assigneeName,
  danger = false,
}: {
  task: ProjectTask;
  assigneeName: string;
  danger?: boolean;
}) {
  return (
    <div className={danger ? "bg-primary-soft/30 px-4 py-3" : "px-4 py-3"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{task.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {assigneeName} · due {task.due_date ?? "-"}
          </div>
        </div>
        <StatusBadge kind={danger ? "task" : "priority"} value={danger ? "Overdue" : task.priority} />
      </div>
      {!danger ? (
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar value={task.progress} className="flex-1" />
          <span className="w-10 text-right text-xs font-medium tabular-nums">{task.progress}%</span>
        </div>
      ) : null}
    </div>
  );
}

function ProjectInfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  icon?: typeof MapPin;
}) {
  return (
    <div className="min-w-0 border-b border-border/70 py-4 last:border-b-0">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </dt>
      <dd className="mt-2 truncate text-sm font-semibold text-foreground">{value ?? "-"}</dd>
    </div>
  );
}

function displayProfile(profile?: { full_name: string | null; email: string | null } | null) {
  return profile?.full_name || profile?.email || "-";
}

function EmptyState({ text, boxed = false }: { text: string; boxed?: boolean }) {
  const className = boxed
    ? "rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground"
    : "px-4 py-6 text-center text-sm text-muted-foreground";
  return <div className={className}>{text}</div>;
}
