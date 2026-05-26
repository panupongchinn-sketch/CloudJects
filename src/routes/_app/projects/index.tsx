import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Building2, Filter, LayoutGrid, List, Loader2, MapPin, MoreVertical, Plus, Search, Star, User } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { CloudJectLoading } from "@/components/loading/cloudject-loading";
import { StatusBadge } from "@/components/status-badge";
import { ProgressBar } from "@/components/progress-bar";
import { fetchProjects, money, type ProjectRow } from "@/lib/app-data";
import { createProject } from "@/lib/projects.functions";
import {
  PROJECT_HEADER_BACKGROUND_OPTIONS,
  getProjectHeaderBackgroundStyle,
} from "@/lib/project-header-backgrounds";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ProjectListItem = Awaited<ReturnType<typeof fetchProjects>>[number];

export const Route = createFileRoute("/_app/projects/")({
  component: ProjectsPage,
  head: () => ({ meta: [{ title: "Projects - CloudJect" }] }),
});

function ProjectsPage() {
  const createProjectFn = useServerFn(createProject);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    clientName: "",
    location: "",
    startDate: "",
    endDate: "",
    budget: "",
    status: "Planning",
  });

  const loadProjects = (cancelledRef?: { cancelled: boolean }) => {
    setLoading(true);
    setError(null);

    return fetchProjects()
      .then((rows) => {
        if (!cancelledRef?.cancelled) setProjects(rows);
      })
      .catch((err) => {
        if (!cancelledRef?.cancelled) setError(err.message ?? "โหลดข้อมูลโครงการไม่สำเร็จ");
      })
      .finally(() => {
        if (!cancelledRef?.cancelled) setLoading(false);
      });
  };

  useEffect(() => {
    const ref = { cancelled: false };
    void loadProjects(ref);

    return () => {
      ref.cancelled = true;
    };
  }, []);

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm({
      code: "",
      name: "",
      clientName: "",
      location: "",
      startDate: "",
      endDate: "",
      budget: "",
      status: "Planning",
    });
  };

  const handleCreateProject = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    try {
      const project = await createProjectFn({
        data: {
          code: form.code,
          name: form.name,
          clientName: form.clientName,
          location: form.location,
          startDate: form.startDate,
          endDate: form.endDate,
          budget: form.budget ? Number(form.budget) : undefined,
          status: form.status as ProjectRow["status"],
        },
      });
      setProjects((current) => [project as ProjectListItem, ...current]);
      resetForm();
      setCreateOpen(false);
      toast.success("สร้างโครงการสำเร็จ");
      void loadProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "สร้างโครงการไม่สำเร็จ");
    } finally {
      setCreating(false);
    }
  };

  const visibleProjects = projects.filter((project) => {
    const text = [
      project.code,
      project.name,
      project.client?.name,
      project.manager?.full_name,
      project.manager?.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });

  return (
    <>
      <Header title="โครงการ" subtitle="จัดการโครงการทั้งหมดของบริษัท" />
      <main className="flex-1 p-4 lg:p-6 space-y-4">
        <div className="card-surface p-3 lg:p-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center h-10 flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 text-sm">
            <Search className="h-4 w-4 mr-2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาโครงการ, รหัส, ลูกค้า..."
              className="flex-1 bg-transparent outline-none"
            />
          </div>
          <button className="h-10 px-3 rounded-lg border border-border bg-background text-sm inline-flex items-center gap-1.5 hover:bg-accent">
            <Filter className="h-4 w-4" /> Status
          </button>
          <div className="h-10 rounded-lg border border-border bg-background p-0.5 inline-flex">
            <button className="h-full px-2.5 rounded-md bg-card shadow-sm text-sm inline-flex items-center gap-1.5">
              <LayoutGrid className="h-4 w-4" /> Card
            </button>
            <button className="h-full px-2.5 rounded-md text-sm text-muted-foreground inline-flex items-center gap-1.5">
              <List className="h-4 w-4" /> Table
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="h-10 px-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5 hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" /> สร้างโครงการ
          </button>
        </div>

        {loading ? (
          <CloudJectLoading />
        ) : error ? (
          <EmptyBlock text={error} />
        ) : visibleProjects.length === 0 ? (
          <EmptyBlock text="ยังไม่มีโครงการในฐานข้อมูล" />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {visibleProjects.map((project, index) => (
              <ProjectShowcaseCard key={project.id} project={project} imageIndex={index} />
            ))}
          </div>
        )}

        <CreateProjectDialog
          open={createOpen}
          creating={creating}
          form={form}
          onOpenChange={setCreateOpen}
          onSubmit={handleCreateProject}
          onChange={updateForm}
        />
      </main>
    </>
  );
}

function CreateProjectDialog({
  open,
  creating,
  form,
  onOpenChange,
  onSubmit,
  onChange,
}: {
  open: boolean;
  creating: boolean;
  form: {
    code: string;
    name: string;
    clientName: string;
    location: string;
    startDate: string;
    endDate: string;
    budget: string;
    status: string;
  };
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent) => void;
  onChange: (key: keyof typeof form, value: string) => void;
}) {
  const budgetValue = Number(form.budget || 0);
  const codePreview = form.code.trim() || "AUTO-GENERATE";
  const statusTone =
    form.status === "In Progress"
      ? "bg-[#0f6b5a]"
      : form.status === "Completed"
        ? "bg-[#163a63]"
        : form.status === "On Hold"
          ? "bg-[#bf5a00]"
          : form.status === "Cancelled"
            ? "bg-[#a30f3d]"
            : "bg-[#2f3b52]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[1120px] overflow-hidden rounded-none border-slate-300 bg-[#f6f8fb] p-0 shadow-2xl">
        <div className="flex h-12 items-center justify-between border-b border-slate-300 bg-white px-4">
          <DialogHeader className="space-y-0 text-left">
            <DialogTitle className="text-[15px] font-semibold text-slate-950">Project Control Center</DialogTitle>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Create project workflow</p>
          </DialogHeader>
        </div>

        <form className="max-h-[calc(92vh-48px)] overflow-y-auto p-4 md:p-6" onSubmit={onSubmit}>
          <div className="mb-5 grid gap-3 md:grid-cols-4">
            <MetricCard label="PROJECT CODE" value={codePreview} helper="Auto when blank" />
            <MetricCard label="BUDGET" value={money(budgetValue)} helper="Project estimate" />
            <MetricCard label="STATUS" value={form.status} helper="Initial workflow state" dark />
            <MetricCard label="SCHEDULE" value={form.startDate || "Not set"} helper={`End: ${form.endDate || "-"}`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              <section className="border border-slate-300 bg-white">
                <div className="flex items-center justify-between border-b border-slate-300 bg-slate-100 px-4 py-2">
                  <h3 className="text-sm font-semibold text-slate-950">Project Information</h3>
                  <span className="text-xs text-blue-700">Required fields</span>
                </div>
                <div className="grid gap-0 sm:grid-cols-2">
                  <FormCell label="ชื่อโครงการ" required className="sm:col-span-2">
                    <Input
                      required
                      value={form.name}
                      onChange={(event) => onChange("name", event.target.value)}
                      placeholder="เช่น งานก่อสร้างอาคารสำนักงาน"
                      className="h-10 rounded-none border-slate-300 bg-white"
                    />
                  </FormCell>
                  <FormCell label="รหัสโครงการ">
                    <Input
                      value={form.code}
                      onChange={(event) => onChange("code", event.target.value)}
                      placeholder="เว้นว่างเพื่อสร้างอัตโนมัติ"
                      className="h-10 rounded-none border-slate-300 bg-white"
                    />
                  </FormCell>
                  <FormCell label="ลูกค้า">
                    <Input
                      value={form.clientName}
                      onChange={(event) => onChange("clientName", event.target.value)}
                      placeholder="ชื่อลูกค้า"
                      className="h-10 rounded-none border-slate-300 bg-white"
                    />
                  </FormCell>
                  <FormCell label="สถานที่" className="sm:col-span-2">
                    <Input
                      value={form.location}
                      onChange={(event) => onChange("location", event.target.value)}
                      placeholder="ที่ตั้งโครงการ"
                      className="h-10 rounded-none border-slate-300 bg-white"
                    />
                  </FormCell>
                </div>
              </section>

              <section className="border border-slate-300 bg-white">
                <div className="border-b border-slate-300 bg-slate-100 px-4 py-2">
                  <h3 className="text-sm font-semibold text-slate-950">Cost & Schedule</h3>
                </div>
                <div className="grid gap-0 sm:grid-cols-2">
                  <FormCell label="วันเริ่ม">
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(event) => onChange("startDate", event.target.value)}
                      className="h-10 rounded-none border-slate-300 bg-white"
                    />
                  </FormCell>
                  <FormCell label="วันสิ้นสุด">
                    <Input
                      type="date"
                      value={form.endDate}
                      onChange={(event) => onChange("endDate", event.target.value)}
                      className="h-10 rounded-none border-slate-300 bg-white"
                    />
                  </FormCell>
                  <FormCell label="งบประมาณ">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.budget}
                      onChange={(event) => onChange("budget", event.target.value)}
                      placeholder="0.00"
                      className="h-10 rounded-none border-slate-300 bg-white"
                    />
                  </FormCell>
                  <FormCell label="สถานะ">
                    <select
                      value={form.status}
                      onChange={(event) => onChange("status", event.target.value)}
                      className="h-10 w-full rounded-none border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-1 focus:ring-slate-500"
                    >
                      <option value="Planning">Planning</option>
                      <option value="In Progress">In Progress</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </FormCell>
                </div>
              </section>
            </div>

            <aside className="space-y-3">
              <StatusPanel className={statusTone} label="CURRENT PROJECT STATUS" value={form.status} />
              <StatusPanel className="bg-[#163a63]" label="PROJECT CODE" value={codePreview} />
              <StatusPanel className="bg-[#0f6b5a]" label="BUDGET CONTROL" value={money(budgetValue)} />
              <div className="border border-slate-300 bg-white">
                <div className="border-b border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950">
                  Create Checklist
                </div>
                <div className="grid gap-2 p-4 text-sm">
                  <CheckRow done={!!form.name.trim()} label="Project name" />
                  <CheckRow done={!!form.clientName.trim()} label="Customer" />
                  <CheckRow done={!!form.startDate && !!form.endDate} label="Schedule" />
                  <CheckRow done={budgetValue > 0} label="Budget" />
                </div>
              </div>
            </aside>
          </div>

          <DialogFooter className="mt-5 border-t border-slate-300 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={creating || !form.name.trim()} className="bg-[#163a63] hover:bg-[#0f2e50]">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              สร้างโครงการ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MetricCard({ label, value, helper, dark }: { label: string; value: string; helper: string; dark?: boolean }) {
  return (
    <div className={dark ? "border border-[#163a63] bg-[#163a63] p-4 text-white" : "border border-slate-300 bg-white p-4"}>
      <div className={dark ? "text-[11px] font-medium text-blue-100" : "text-[11px] font-medium text-slate-500"}>
        {label}
      </div>
      <div className="mt-2 truncate text-xl font-bold tabular-nums">{value}</div>
      <div className={dark ? "mt-1 text-xs text-blue-100" : "mt-1 text-xs text-slate-500"}>{helper}</div>
    </div>
  );
}

function FormCell({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block border-b border-slate-200 p-4 ${className ?? ""}`}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function StatusPanel({ className, label, value }: { className: string; label: string; value: string }) {
  return (
    <div className={`${className} flex min-h-16 items-center justify-between px-4 py-3 text-white`}>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white/80">{label}</div>
        <div className="mt-1 text-base font-bold">{value}</div>
      </div>
      <span className="text-2xl text-white/70">›</span>
    </div>
  );
}

function CheckRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between border border-slate-200 px-3 py-2">
      <span>{label}</span>
      <span className={done ? "font-semibold text-[#0f6b5a]" : "text-slate-400"}>{done ? "READY" : "OPEN"}</span>
    </div>
  );
}

function ProjectShowcaseCard({ project, imageIndex }: { project: ProjectListItem; imageIndex: number }) {
  const statusClass =
    project.status === "In Progress"
      ? "bg-emerald-500 text-white shadow-emerald-900/20"
      : project.status === "Completed"
        ? "bg-violet-500 text-white shadow-violet-900/20"
        : project.status === "On Hold"
          ? "bg-amber-500 text-white shadow-amber-900/20"
          : project.status === "Cancelled"
            ? "bg-rose-500 text-white shadow-rose-900/20"
            : "bg-blue-600 text-white shadow-blue-900/20";
  const progressClass =
    project.status === "In Progress"
      ? "from-emerald-500 to-green-400"
      : project.status === "Completed"
        ? "from-violet-500 to-indigo-400"
        : project.status === "On Hold"
          ? "from-amber-500 to-orange-400"
          : "from-blue-600 to-sky-400";
  const fallbackBackground =
    PROJECT_HEADER_BACKGROUND_OPTIONS[imageIndex % PROJECT_HEADER_BACKGROUND_OPTIONS.length].value;
  const headerStyle = getProjectHeaderBackgroundStyle(project.header_background ?? fallbackBackground);
  const totalTasks = Math.max(project.taskCount, 24);
  const teamCount = Math.max(project.memberCount ?? 0, project.manager ? 1 : 0);

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div className="relative min-h-[132px] overflow-hidden p-4 text-white" style={headerStyle}>
        <div className="relative z-10 flex items-start justify-between">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-lg ${statusClass}`}>
            {project.status}
          </span>
          <span className="rounded-lg border border-white/25 bg-slate-950/45 px-2.5 py-1.5 font-mono text-xs font-semibold text-white shadow-lg backdrop-blur">
            {project.code}
          </span>
        </div>
        <div className="relative z-10 mt-12">
          <h2 className="text-lg font-bold leading-tight tracking-tight text-white drop-shadow-md group-hover:text-blue-100">
            {project.name}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border p-4">
        <ProjectInfoItem icon={<Building2 className="h-4 w-4" />} label="ลูกค้า" value={project.client?.name ?? "-"} />
        <ProjectInfoItem icon={<User className="h-4 w-4" />} label="PM" value={project.manager?.full_name ?? project.manager?.email ?? "-"} />
        <ProjectInfoItem icon={<MapPin className="h-4 w-4" />} label="สถานที่" value={project.location ?? "-"} />
      </div>

      <div className="grid gap-3 border-t border-border px-4 py-4 md:grid-cols-[1fr_1fr_0.8fr]">
        <div>
          <div className="text-xs text-muted-foreground">งบประมาณ</div>
          <div className="mt-1 text-base font-bold tabular-nums text-foreground">{money(project.budget)}</div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">ความคืบหน้า</span>
            <span className="font-semibold tabular-nums text-foreground">{project.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${progressClass}`}
              style={{ width: `${Math.min(Math.max(project.progress, 0), 100)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">งานทั้งหมด</div>
          <div className="mt-1 text-base font-bold tabular-nums text-foreground">
            {project.taskCount} <span className="text-xs font-medium text-muted-foreground">/ {totalTasks} tasks</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3">
        <div>
          <div className="mb-2 text-xs text-muted-foreground">ทีมงาน</div>
          <div className="flex items-center -space-x-2">
            {Array.from({ length: Math.min(Math.max(teamCount, 1), 3) }).map((_, index) => (
              <div
                key={index}
                className="grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-primary-soft text-[10px] font-semibold text-primary"
              >
                {index === 0 ? "PM" : index + 1}
              </div>
            ))}
            {teamCount > 3 ? (
              <div className="grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-secondary text-[10px] font-semibold text-muted-foreground">
                +{teamCount - 3}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
            รายละเอียด <ArrowRight className="h-4 w-4" />
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground group-hover:bg-accent">
            <Star className="h-4 w-4" />
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground group-hover:bg-accent">
            <MoreVertical className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function ProjectInfoItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-2 px-3 first:pl-0 last:pr-0">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-0.5 truncate text-xs font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectListItem }) {
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="card-surface p-5 hover:shadow-elevated transition-shadow group"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono text-muted-foreground">{project.code}</div>
          <div className="mt-0.5 font-semibold group-hover:text-primary">{project.name}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{project.client?.name ?? "-"}</div>
        </div>
        <StatusBadge kind="project" value={project.status as ProjectRow["status"]} />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">ความคืบหน้า</span>
        <span className="font-semibold tabular-nums">{project.progress}%</span>
      </div>
      <ProgressBar
        value={project.progress}
        tone={project.overdueCount > 0 ? "danger" : "default"}
        className="mt-1.5"
      />

      <dl className="mt-4 grid grid-cols-2 gap-y-1.5 text-xs">
        <dt className="text-muted-foreground">PM</dt>
        <dd className="text-right truncate">{project.manager?.full_name ?? project.manager?.email ?? "-"}</dd>
        <dt className="text-muted-foreground">สถานที่</dt>
        <dd className="text-right truncate">{project.location ?? "-"}</dd>
        <dt className="text-muted-foreground">งบ</dt>
        <dd className="text-right truncate">{money(project.budget)}</dd>
        <dt className="text-muted-foreground">ระยะเวลา</dt>
        <dd className="text-right tabular-nums">
          {project.start_date ?? "-"} - {project.end_date ?? "-"}
        </dd>
      </dl>

      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {project.taskCount} tasks
          {project.overdueCount > 0 ? (
            <span className="text-primary font-semibold"> · {project.overdueCount} overdue</span>
          ) : null}
        </span>
        <span className="text-primary font-medium">ดูรายละเอียด →</span>
      </div>
    </Link>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={className ? `space-y-1.5 ${className}` : "space-y-1.5"}>
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="card-surface p-10 text-center text-sm text-muted-foreground">{text}</div>
  );
}
