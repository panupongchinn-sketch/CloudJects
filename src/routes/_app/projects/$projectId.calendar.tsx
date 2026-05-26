import { useEffect, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetchProjectBundle, type DailyReportRow, type TaskRow } from "@/lib/app-data";

export const Route = createFileRoute("/_app/projects/$projectId/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const { projectId } = useParams({ from: "/_app/projects/$projectId/calendar" });
  const [bundle, setBundle] = useState<NonNullable<Awaited<ReturnType<typeof fetchProjectBundle>>> | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();

  useEffect(() => {
    let cancelled = false;
    fetchProjectBundle(projectId).then((result) => {
      if (!cancelled) setBundle(result);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const tasks = bundle?.tasks ?? [];
  const reports = bundle?.reports ?? [];
  const cells: { day: number | null; tasks: TaskRow[]; reports: DailyReportRow[] }[] = [];

  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, tasks: [], reports: [] });
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateStr(visibleMonth, day);
    cells.push({
      day,
      tasks: tasks.filter((task) => taskOccursOnDate(task, dateStr)),
      reports: reports.filter((report) => report.report_date === dateStr),
    });
  }

  return (
    <section className="card-surface p-4 lg:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">
          {visibleMonth.toLocaleString("th-TH", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setVisibleMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              const today = new Date();
              setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
            }}
            className="grid h-9 place-items-center rounded-lg border border-border px-3 text-sm hover:bg-accent"
          >
            Month
          </button>
          <button
            onClick={() => setVisibleMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 text-xs font-medium text-muted-foreground">
        {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => (
          <div key={day} className="py-1.5 text-center">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, index) => (
          <div
            key={index}
            className={"min-h-[88px] rounded-lg border p-1.5 " + (cell.day ? "border-border bg-card" : "border-transparent")}
          >
            {cell.day ? (
              <>
                <div className="mb-1 text-[11px] font-medium text-muted-foreground">{cell.day}</div>
                <div className="space-y-1">
                  {cell.tasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className={"truncate rounded px-1.5 py-0.5 text-[10px] " + taskCalendarClass(task, cell.day, visibleMonth)}
                      title={`${task.title} (${task.start_date ?? "-"} - ${task.due_date ?? "-"})`}
                    >
                      {taskCalendarLabel(task, cell.day, visibleMonth)}
                    </div>
                  ))}
                  {cell.tasks.length > 3 ? (
                    <div className="text-[10px] text-muted-foreground">+{cell.tasks.length - 3} งาน</div>
                  ) : null}
                  {cell.reports.map((report) => (
                    <div key={report.id} className="truncate rounded bg-info/15 px-1.5 py-0.5 text-[10px] text-info">
                      Daily Report
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function formatDateStr(month: Date, day: number) {
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function taskOccursOnDate(task: TaskRow, dateStr: string) {
  const start = task.start_date ?? task.due_date;
  const end = task.due_date ?? task.start_date;
  if (!start || !end) return false;
  return dateStr >= start && dateStr <= end;
}

function taskDateStr(day: number | null | undefined, month: Date) {
  if (!day) return "";
  return formatDateStr(month, day);
}

function taskCalendarLabel(task: TaskRow, day: number | null | undefined, month: Date) {
  const dateStr = taskDateStr(day, month);
  if (task.start_date && dateStr === task.start_date) return `เริ่ม: ${task.title}`;
  if (task.due_date && dateStr === task.due_date) return `ส่ง: ${task.title}`;
  return task.title;
}

function taskCalendarClass(task: TaskRow, day: number | null | undefined, month: Date) {
  const dateStr = taskDateStr(day, month);
  if (task.start_date && dateStr === task.start_date) return "bg-blue-100 text-blue-700";
  if (task.due_date && dateStr === task.due_date) return "bg-primary-soft text-primary-dark";
  return "bg-slate-100 text-slate-600";
}
