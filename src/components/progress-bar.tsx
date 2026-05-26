import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  tone = "default",
}: {
  value: number;
  className?: string;
  tone?: "default" | "danger" | "success";
}) {
  const color =
    tone === "danger"
      ? "bg-primary"
      : tone === "success"
        ? "bg-success"
        : value >= 100
          ? "bg-success"
          : "bg-primary";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-all", color)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
