import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, FileText, Cloud } from "lucide-react";
import { CloudJectLoading } from "@/components/loading/cloudject-loading";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProjects, type MyProject } from "@/lib/portal-data";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/portal/reports")({
  component: ReportsPage,
});

type Report = {
  id: string;
  project_id: string;
  report_date: string;
  weather: string | null;
  summary: string | null;
  status: string;
  created_at: string;
  project?: { name: string; code: string };
};

function ReportsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<MyProject[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weather, setWeather] = useState("แดด");
  const [summary, setSummary] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const ps = await fetchMyProjects(user.id);
    setProjects(ps);
    if (ps.length && !projectId) setProjectId(ps[0].id);

    const { data } = await supabase
      .from("daily_reports")
      .select("id, project_id, report_date, weather, summary, status, created_at, projects!inner(name,code)")
      .eq("reporter_id", user.id)
      .order("report_date", { ascending: false })
      .limit(30);
    setReports((data ?? []).map((r: any) => ({ ...r, project: r.projects })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !projectId) return;
    setSaving(true);
    const { error } = await supabase.from("daily_reports").insert({
      project_id: projectId,
      reporter_id: user.id,
      report_date: date,
      weather,
      summary,
      status: "Draft",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("บันทึกรายงานแล้ว");
    setSummary("");
    load();
  };

  if (loading) return <CloudJectLoading />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
      <form onSubmit={submit} className="card-surface p-5 space-y-3 h-fit">
        <h2 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> เขียนรายงานประจำวัน</h2>
        <div>
          <label className="text-xs text-muted-foreground">โครงการ</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
            required
          >
            <option value="" disabled>เลือกโครงการ</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">วันที่</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">สภาพอากาศ</label>
            <select value={weather} onChange={(e) => setWeather(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm">
              {["แดด","เมฆครึ้ม","ฝนตก","ฝนตกหนัก","อื่นๆ"].map((w) => <option key={w}>{w}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">สรุปการทำงาน</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={5}
            placeholder="งานที่ทำวันนี้ ปัญหาที่พบ คนงาน เครื่องจักร ฯลฯ"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            required
          />
        </div>
        <button
          type="submit"
          disabled={saving || !projectId}
          className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกรายงาน"}
        </button>
      </form>

      <div className="card-surface p-5">
        <h2 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> รายงานล่าสุดของฉัน</h2>
        <div className="mt-3 divide-y divide-border">
          {reports.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีรายงาน</div>
          ) : reports.map((r) => (
            <div key={r.id} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{r.report_date}</div>
                <span className="text-[11px] uppercase rounded bg-secondary px-1.5 py-0.5">{r.status}</span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>{r.project?.code} · {r.project?.name}</span>
                <span className="inline-flex items-center gap-1"><Cloud className="h-3 w-3" /> {r.weather}</span>
              </div>
              {r.summary && <p className="mt-1 text-sm whitespace-pre-wrap line-clamp-3">{r.summary}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
