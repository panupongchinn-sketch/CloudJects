import { useEffect, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { fetchProjectBundle, isOverdue, type TaskRow } from "@/lib/app-data";

const DAYS = 30;

export const Route = createFileRoute("/_app/projects/$projectId/gantt")({
  component: GanttPage,
});

function dayDiff(start: Date, value?: string | null) {
  if (!value) return 0;
  return Math.floor((+new Date(value) - +start) / 86400000);
}

function getTimelineStart(tasks: TaskRow[]) {
  const dates = tasks
    .map((task) => task.start_date ?? task.due_date)
    .filter(Boolean)
    .map((value) => new Date(value!))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (dates.length === 0) return new Date();

  const start = new Date(Math.min(...dates.map((date) => date.getTime())));
  start.setHours(0, 0, 0, 0);
  return start;
}

function formatMonthYear(date: Date) {
  return date.toLocaleString("th-TH", { month: "long", year: "numeric" });
}

function GanttPage() {
  const { projectId } = useParams({ from: "/_app/projects/$projectId/gantt" });
  const [bundle, setBundle] = useState<NonNullable<Awaited<ReturnType<typeof fetchProjectBundle>>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchProjectBundle(projectId).then((result) => {
      if (!cancelled) setBundle(result);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const rows = bundle?.tasks ?? [];
  const start = getTimelineStart(rows);
  const total = rows.length;
  const delayed = rows.filter((task) => isOverdue(task)).length;
  const efficiency = total ? Math.round(rows.reduce((sum, task) => sum + task.progress, 0) / total) : 0;
  const days = Array.from({ length: DAYS }, (_, index) => {
    const day = new Date(start);
    day.setDate(day.getDate() + index);
    return day;
  });
  const monthGroups = days.reduce<Array<{ key: string; label: string; count: number }>>((groups, day) => {
    const key = `${day.getFullYear()}-${day.getMonth()}`;
    const last = groups.at(-1);
    if (last?.key === key) {
      last.count += 1;
    } else {
      groups.push({ key, label: formatMonthYear(day), count: 1 });
    }
    return groups;
  }, []);
  const todayIdx = Math.floor((+new Date() - +start) / 86400000);

  return (
    <section className="card-surface p-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Gantt Timeline</h2>
          <p className="text-sm text-muted-foreground">แสดงจากข้อมูล tasks ใน Supabase</p>
        </div>
      </div>

      {!bundle ? (
        <div className="p-10 text-center text-sm text-muted-foreground">กำลังโหลด...</div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">ยังไม่มี task สำหรับทำ Gantt</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            <div className="flex border-b border-border bg-secondary/20">
              <div className="w-64 shrink-0 px-6 py-2 border-r border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                เดือน / ปี
              </div>
              <div className="flex flex-1">
                {monthGroups.map((month) => (
                  <div
                    key={month.key}
                    className="text-center text-xs font-semibold text-foreground py-2 border-r border-border/50"
                    style={{ flex: month.count }}
                  >
                    {month.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex border-b border-border">
              <div className="w-64 shrink-0 px-6 py-3 bg-secondary/40 border-r border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                งาน / Task
              </div>
              <div className="flex flex-1">
                {days.map((day, index) => (
                  <div
                    key={day.toISOString()}
                    className={
                      "flex-1 text-center text-[11px] font-medium py-2 border-r border-border/50 " +
                      (index === todayIdx ? "font-bold text-primary border-x-2 border-primary/30 bg-primary/5" : "text-muted-foreground")
                    }
                  >
                    {day.getDate()}
                  </div>
                ))}
              </div>
            </div>

            <div className="divide-y divide-border/60">
              {rows.map((task) => (
                <GanttRow
                  key={task.id}
                  task={task}
                  start={start}
                  days={days}
                  todayIdx={todayIdx}
                  assignee={task.assignee_id ? bundle.profiles.get(task.assignee_id) : null}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-3 bg-secondary/40 border-t border-border flex items-center justify-between">
        <div className="flex gap-6">
          <Metric label="Total Tasks" value={`${total}`} />
          <Metric label="Delayed" value={`${delayed}`} danger />
          <Metric label="Efficiency" value={`${efficiency}%`} />
        </div>
      </div>
    </section>
  );
}

function GanttRow({
  task,
  start,
  days,
  todayIdx,
  assignee,
}: {
  task: TaskRow;
  start: Date;
  days: Date[];
  todayIdx: number;
  assignee?: { full_name: string | null; email: string | null } | null;
}) {
  const barStart = Math.max(0, dayDiff(start, task.start_date));
  const barEnd = Math.min(DAYS, dayDiff(start, task.due_date) + 1);
  const span = Math.max(1, barEnd - barStart);
  const leftPct = (barStart / DAYS) * 100;
  const widthPct = (span / DAYS) * 100;
  const overdue = isOverdue(task);
  const done = task.status === "Completed";
  const trackCls = overdue ? "bg-destructive/10 border-destructive/30" : done ? "bg-success/10 border-success/30" : "bg-info/10 border-info/30";
  const fillCls = overdue ? "bg-destructive" : done ? "bg-success" : "bg-gradient-to-r from-info to-info/80";

  return (
    <div className="flex hover:bg-secondary/30 transition-colors group">
      <div className="w-64 shrink-0 px-6 py-4 border-r border-border flex flex-col justify-center">
        <span className="text-sm font-semibold truncate">{task.title}</span>
        <span className="text-[11px] text-muted-foreground truncate">{assignee?.full_name ?? assignee?.email ?? "-"}</span>
      </div>
      <div className="flex-1 relative py-5 flex items-center">
        <div className="absolute inset-0 flex pointer-events-none">
          {days.map((day, index) => (
            <div key={day.toISOString()} className={"flex-1 border-r border-border/40 " + (index === todayIdx ? "bg-primary/5" : day.getDay() === 0 || day.getDay() === 6 ? "bg-secondary/40" : "")} />
          ))}
        </div>
        <div
          className={"absolute h-7 rounded-lg border overflow-hidden shadow-sm group-hover:shadow-md transition-shadow " + trackCls}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        >
          <div className={"h-full flex items-center px-3 " + fillCls} style={{ width: `${Math.max(8, task.progress)}%` }}>
            <span className="text-[10px] font-bold text-primary-foreground whitespace-nowrap">{task.progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</div>
      <div className={"text-sm font-semibold " + (danger ? "text-destructive" : "")}>{value}</div>
    </div>
  );
}
