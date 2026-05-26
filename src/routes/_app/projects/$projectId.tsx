import { useEffect, useState } from "react";
import { Link, Outlet, createFileRoute, useParams, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Settings,
  ShieldCheck,
  Users,
  Camera,
  BarChart3,
} from "lucide-react";
import { CloudJectLoading } from "@/components/loading/cloudject-loading";
import { Header } from "@/components/layout/header";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { fetchProjectBundle, isOverdue } from "@/lib/app-data";
import { fetchProjectSettingsAccess } from "@/lib/project-access";
import { getProjectHeaderBackgroundStyle } from "@/lib/project-header-backgrounds";
import { cn } from "@/lib/utils";

type ProjectBundle = NonNullable<Awaited<ReturnType<typeof fetchProjectBundle>>>;

const tabs = [
  { to: "/projects/$projectId", label: "Overview", icon: LayoutDashboard },
  { to: "/projects/$projectId/tasks", label: "Tasks", icon: ClipboardList },
  { to: "/projects/$projectId/gantt", label: "Gantt", icon: BarChart3 },
  { to: "/projects/$projectId/calendar", label: "Calendar", icon: Calendar },
  { to: "/projects/$projectId/photos", label: "Photos", icon: Camera },
  { to: "/projects/$projectId/documents", label: "Documents", icon: FileText },
  { to: "/projects/$projectId/reports", label: "Reports", icon: FileText },
  { to: "/projects/$projectId/checklists", label: "Checklist", icon: ShieldCheck },
  { to: "/projects/$projectId/chat", label: "Chat", icon: MessageSquare },
  { to: "/projects/$projectId/team", label: "Team", icon: Users },
  { to: "/projects/$projectId/settings", label: "Settings", icon: Settings },
] as const;

export const Route = createFileRoute("/_app/projects/$projectId")({
  component: ProjectLayout,
});

function ProjectLayout() {
  const { projectId } = useParams({ from: "/_app/projects/$projectId" });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading: authLoading } = useAuth();
  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canManageSettings, setCanManageSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchProjectBundle(projectId)
      .then((result) => {
        if (!cancelled) setBundle(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "โหลดข้อมูลโครงการไม่สำเร็จ");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    setCanManageSettings(false);

    fetchProjectSettingsAccess(projectId, user)
      .then((access) => {
        if (!cancelled) setCanManageSettings(access.canManageSettings);
      })
      .catch(() => {
        if (!cancelled) setCanManageSettings(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, projectId, user]);

  const project = bundle?.project;
  const overdueCount = bundle?.tasks.filter((task) => isOverdue(task)).length ?? 0;
  const headerBackgroundStyle = getProjectHeaderBackgroundStyle(project?.header_background);

  return (
    <>
      <Header
        title={project?.name ?? "โครงการ"}
        subtitle={project ? `${project.code} · ${bundle?.client?.name ?? ""}` : ""}
      />
      {loading ? <CloudJectLoading /> : null}
      <main className="flex-1 space-y-5 p-4 lg:p-6">
        <section
          className="rounded-xl border border-border bg-card shadow-sm"
          style={headerBackgroundStyle}
        >
          <div className="border-b border-border px-4 py-4 sm:px-5 lg:px-6">
            {loading ? (
              <div className="text-sm text-muted-foreground">กำลังโหลดข้อมูลโครงการจาก Supabase...</div>
            ) : error ? (
              <div className="text-sm text-primary">{error}</div>
            ) : !project ? (
              <div className="text-sm text-muted-foreground">ไม่พบโครงการนี้ในฐานข้อมูล</div>
            ) : (
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 space-y-3">
                  <Link
                    to="/projects"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    โครงการทั้งหมด
                  </Link>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-secondary px-2 py-1 font-mono text-xs text-muted-foreground">
                        {project.code}
                      </span>
                      <StatusBadge kind="project" value={project.status} />
                      {overdueCount > 0 ? (
                        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                          {overdueCount} overdue
                        </span>
                      ) : null}
                    </div>
                    <h1 className="text-xl font-semibold leading-tight tracking-normal text-foreground lg:text-2xl">
                      {project.name}
                    </h1>
                  </div>

                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {bundle?.client?.name ?? "-"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {project.location ?? "-"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {project.start_date ?? "-"} - {project.end_date ?? "-"}
                    </span>
                  </div>
                </div>

                <div className="w-full xl:w-[360px]">
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">ความคืบหน้า</span>
                      <span className="font-semibold tabular-nums">{project.progress}%</span>
                    </div>
                    <ProgressBar
                      value={project.progress}
                      tone={overdueCount > 0 ? "danger" : "default"}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <nav className="overflow-x-auto px-2 py-2">
            <ul className="flex min-w-max items-center gap-1">
              {tabs
                .filter((tab) => tab.to !== "/projects/$projectId/settings" || canManageSettings)
                .map((tab) => {
                const href = tab.to.replace("$projectId", projectId);
                const active = pathname === href;
                const Icon = tab.icon;
                return (
                  <li key={tab.to}>
                    <Link
                      to={tab.to}
                      params={{ projectId }}
                      className={cn(
                        "inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </section>

        <Outlet />
      </main>
    </>
  );
}
