import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { Plus, CloudSun, AlertTriangle, Calendar } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { fetchProjectBundle } from "@/lib/app-data";

export const Route = createFileRoute("/_app/projects/$projectId/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { projectId } = useParams({ from: "/_app/projects/$projectId/reports" });
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

  const reports = bundle?.reports ?? [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Daily Report</h2>
          <p className="text-xs text-muted-foreground">รายงานประจำวันจากตาราง daily_reports</p>
        </div>
        <button className="h-10 px-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5 hover:bg-primary-hover">
          <Plus className="h-4 w-4" /> สร้างรายงาน
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-surface p-5 lg:col-span-1 order-2 lg:order-1">
          <h3 className="font-semibold mb-3">รายงานวันนี้</h3>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <Field label="วันที่" icon={Calendar}>
                <input type="date" className="bg-transparent outline-none w-full" />
              </Field>
              <Field label="สภาพอากาศ" icon={CloudSun}>
                <input className="bg-transparent outline-none w-full" />
              </Field>
            </div>

            <Textarea label="สรุปงานวันนี้" placeholder="ระบุงานที่ดำเนินการ..." />
            <Textarea
              label="ปัญหาที่พบ"
              placeholder="หากไม่มี ใส่ '-'"
              icon={<AlertTriangle className="h-3.5 w-3.5 text-warning" />}
            />

            <div className="flex items-center gap-2 pt-2">
              <button className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover">
                ส่งรายงาน
              </button>
              <button className="h-10 px-4 rounded-lg border border-border text-sm font-medium">บันทึก Draft</button>
            </div>
          </div>
        </div>

        <div className="space-y-3 order-1 lg:order-2">
          {!bundle ? (
            <Empty text="กำลังโหลดรายงาน..." />
          ) : reports.length === 0 ? (
            <Empty text="ยังไม่มีรายงานสำหรับโครงการนี้" />
          ) : (
            reports.map((report) => {
              const reporter = report.reporter_id ? bundle.profiles.get(report.reporter_id) : null;
              return (
                <article key={report.id} className="card-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        {report.report_date} · {report.weather ?? "-"}
                      </div>
                      <h4 className="mt-1 font-medium">สรุปงาน</h4>
                      <p className="text-sm text-muted-foreground">{report.summary ?? "-"}</p>
                    </div>
                    <StatusBadge kind="report" value={report.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 text-xs">
                    <dt className="text-muted-foreground">ผู้รายงาน</dt>
                    <dd>{reporter?.full_name ?? reporter?.email ?? "-"}</dd>
                    <dt className="text-muted-foreground">สร้างเมื่อ</dt>
                    <dd>{report.created_at?.slice(0, 10)}</dd>
                  </dl>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="card-surface p-10 text-center text-sm text-muted-foreground">{text}</div>;
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1 h-10 flex items-center gap-2 rounded-lg border border-border bg-background px-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {children}
      </div>
    </label>
  );
}

function Textarea({
  label,
  placeholder,
  icon,
}: {
  label: string;
  placeholder: string;
  icon?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
        {icon}
        {label}
      </span>
      <textarea
        rows={2}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
      />
    </label>
  );
}
