import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import portalHeroBackground from "@/assets/portal-hero.png";
import {
  ArrowRight,
  Building2,
  FolderKanban,
  MapPin,
  MoreVertical,
  Star,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyProjects, type MyProject } from "@/lib/portal-data";
import { money } from "@/lib/app-data";
import { CloudJectLoading } from "@/components/loading/cloudject-loading";
import {
  PROJECT_HEADER_BACKGROUND_OPTIONS,
  getProjectHeaderBackgroundStyle,
} from "@/lib/project-header-backgrounds";

export const Route = createFileRoute("/_app/portal/")({
  component: PortalHome,
});

function PortalHome() {
  const { user, loading } = useAuth();
  const [projects, setProjects] = useState<MyProject[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setBusy(true);
      const nextProjects = await fetchMyProjects(user.id);
      setProjects(nextProjects);
      setBusy(false);
    })();
  }, [user]);

  if (loading || busy) return <CloudJectLoading />;

  const heroStyle = {
    backgroundImage: `url(${portalHeroBackground})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
  const welcomeName =
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "ทีมงาน";

  return (
    <div className="space-y-6">
      <section
        className="relative overflow-hidden border border-slate-200/80 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.35)]"
        style={heroStyle}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.88)_34%,rgba(255,255,255,0.28)_72%,rgba(255,255,255,0.08)_100%)]" />
        <div className="relative z-10 px-6 py-8 md:px-7 md:py-9">
          <div className="max-w-3xl">
            <h1 className="portal-hero-title text-3xl text-slate-950 md:text-4xl">
              ยินดีต้อนรับ {welcomeName}
            </h1>
            <p className="portal-hero-copy mt-3 max-w-2xl text-sm leading-7 text-slate-700">
              ภาพรวมการดําเนินงานของโครงการที่คุณดูแลอยู่ พร้อมสถานะล่าสุด งานค้าง
              และรายการที่ต้องติดตามวันนี้
            </p>
          </div>
        </div>
      </section>

      <section className="card-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <FolderKanban className="h-4 w-4 text-primary" /> โครงการของฉัน
            </h2>
            <p className="text-xs text-muted-foreground">
              โครงการที่คุณเป็นสมาชิกหรือผู้จัดการ
            </p>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {projects.length} โครงการ
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            ยังไม่มีโครงการที่คุณเป็นสมาชิก
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project, index) => (
              <PortalProjectCard key={project.id} project={project} imageIndex={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PortalProjectCard({ project, imageIndex }: { project: MyProject; imageIndex: number }) {
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
            {project.taskCount}{" "}
            <span className="text-xs font-medium text-muted-foreground">/ {totalTasks} tasks</span>
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
