import { cn } from "@/lib/utils";

const projectStatusMap: Record<string, string> = {
  Planning: "bg-secondary text-secondary-foreground",
  "In Progress": "bg-primary-soft text-primary-dark",
  "On Hold": "bg-warning/15 text-warning",
  Completed: "bg-success/15 text-success",
  Cancelled: "bg-muted text-muted-foreground",
};

const taskStatusMap: Record<string, string> = {
  "To Do": "bg-muted text-muted-foreground",
  "In Progress": "bg-primary-soft text-primary-dark",
  "Waiting Review": "bg-warning/15 text-warning",
  "Waiting Approval": "bg-warning/20 text-[oklch(0.55_0.16_60)]",
  Completed: "bg-success/15 text-success",
  Rejected: "bg-primary text-primary-foreground",
  Overdue: "bg-primary text-primary-foreground",
};

const reportStatusMap: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Submitted: "bg-info/15 text-info",
  Approved: "bg-success/15 text-success",
  Rejected: "bg-primary text-primary-foreground",
};

const approvalStatusMap: Record<string, string> = {
  Pending: "bg-warning/15 text-warning",
  Approved: "bg-success/15 text-success",
  Rejected: "bg-primary text-primary-foreground",
  Cancelled: "bg-muted text-muted-foreground",
};

const priorityMap: Record<string, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-info/15 text-info",
  High: "bg-warning/15 text-warning",
  Urgent: "bg-primary text-primary-foreground",
};

export type BadgeKind = "project" | "task" | "report" | "approval" | "priority";

const maps: Record<BadgeKind, Record<string, string>> = {
  project: projectStatusMap,
  task: taskStatusMap,
  report: reportStatusMap,
  approval: approvalStatusMap,
  priority: priorityMap,
};

export function StatusBadge({
  kind,
  value,
  className,
}: {
  kind: BadgeKind;
  value: string;
  className?: string;
}) {
  const cls = maps[kind][value] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        cls,
        className,
      )}
    >
      {value}
    </span>
  );
}
