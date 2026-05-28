import { useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  Heart,
  HelpCircle,
  ImagePlus,
  Loader2,
  MapPin,
  Phone,
  Thermometer,
  Users,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { ProgressBar } from "@/components/progress-bar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { initials, isOverdue, money, photoUrl, type TaskRow as ProjectTask } from "@/lib/app-data";
import { useProjectLayoutContext } from "@/lib/project-layout-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/projects/$projectId/")({
  component: Overview,
});

function Overview() {
  const { projectId } = useParams({ from: "/_app/projects/$projectId/" });
  const { user } = useAuth();
  const { bundle, loading, error, setBundle } = useProjectLayoutContext();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  if (loading && !bundle) return null;
  if (error && !bundle) return <EmptyState text={error} boxed />;
  if (!bundle) return <EmptyState text="Project not found" boxed />;

  const handlePhotoUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Supported formats: JPG, PNG, WebP, GIF");
      return;
    }

    if (!user) {
      toast.error("Please sign in before uploading a project photo");
      return;
    }

    setUploadingPhoto(true);
    try {
      const projectImageUrl = await readFileAsDataUrl(file);
      const { error: updateError } = await supabase
        .from("projects")
        .update({
          project_image_url: projectImageUrl,
        })
        .eq("id", projectId);

      if (updateError) {
        throw updateError;
      }

      setBundle((current) =>
        current
          ? {
              ...current,
              project: {
                ...current.project,
                project_image_url: projectImageUrl,
              },
            }
          : current,
      );
      toast.success("Project photo updated");
    } catch (uploadError: any) {
      toast.error(uploadError?.message ?? "Project photo upload failed");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const { project, client, manager, tasks, members, reports, photos, profiles } = bundle;
  const inProgressTasks = tasks.filter((task) => task.status === "In Progress");
  const overdueTasks = tasks.filter((task) => isOverdue(task));
  const completedTasks = tasks.filter((task) => task.status === "Completed");
  const mapLinkUrl = getProjectMapLinkUrl(project.location);
  const mapEmbedUrl = getProjectMapEmbedUrl(project.location);
  const projectAge = getProjectAgeLabel(project.start_date, project.end_date);
  const latestReportDate = reports[0]?.report_date ?? project.updated_at?.slice(0, 10) ?? "-";
  const featurePhotoUrl = project.project_image_url || (photos[0] ? photoUrl(photos[0].storage_path) : null);
  const actualProgress = tasks.length
    ? Math.round(tasks.reduce((sum, task) => sum + Number(task.progress ?? 0), 0) / tasks.length)
    : Number(project.progress ?? 0);
  const progressValue = Math.max(0, Math.min(100, actualProgress));

  return (
    <section className="space-y-5">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handlePhotoUpload(event.target.files)}
        disabled={uploadingPhoto}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={CheckCircle2} label="Completed" value={`${completedTasks.length}/${tasks.length}`} helper="tasks closed" />
        <SummaryCard icon={Clock} label="In Progress" value={`${inProgressTasks.length}`} helper="active tasks" />
        <SummaryCard icon={AlertTriangle} label="Overdue" value={`${overdueTasks.length}`} helper="needs attention" tone="danger" />
        <SummaryCard icon={Users} label={`${members.length}`} value="Team" helper="assigned members" swap />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.82fr)_minmax(500px,1.08fr)]">
        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Work Status</h2>
                <p className="mt-1 text-sm text-muted-foreground">Summary of active work and items that need attention</p>
              </div>
              <Link
                to="/projects/$projectId/tasks"
                params={{ projectId }}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                Open Tasks
              </Link>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <TaskSection title="In Progress" count={inProgressTasks.length}>
                {inProgressTasks.length === 0 ? (
                  <EmptyState text="No tasks in progress" />
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

              <TaskSection title="Overdue" count={overdueTasks.length} tone="danger">
                {overdueTasks.length === 0 ? (
                  <EmptyState text="No overdue tasks" />
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
              <h2 className="text-base font-semibold text-foreground">Project Information</h2>
            </div>

            <div className="mt-4 border-t border-border">
              <dl className="grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
                <ProjectInfoRow label="Client" value={client?.name} />
                <ProjectInfoRow label="Contact" value={client?.contact} />
                <ProjectInfoRow label="Phone" value={client?.phone} icon={Phone} />
                <ProjectInfoRow label="Location" value={project.location} icon={MapPin} />
                <ProjectInfoRow label="Manager" value={displayProfile(manager)} />
                <ProjectInfoRow label="Budget" value={money(project.budget)} />
                <ProjectInfoRow label="Start Date" value={project.start_date} icon={CalendarDays} />
                <ProjectInfoRow label="End Date" value={project.end_date} icon={CalendarDays} />
                <ProjectInfoRow label="Status" value={project.status} />
              </dl>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <div className="relative h-[280px] overflow-hidden bg-[#e8f0ec]">
              {mapEmbedUrl ? (
                <iframe
                  title={`Project map for ${project.name}`}
                  src={mapEmbedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0 h-full w-full border-0"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-slate-100 text-center text-sm text-slate-500">
                  <div>
                    <MapPin className="mx-auto mb-2 h-6 w-6" />
                    <p>No project location</p>
                  </div>
                </div>
              )}

              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/80 to-transparent" />

              {mapLinkUrl ? (
                <a
                  href={mapLinkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-7 right-7 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-xl"
                >
                  <HelpCircle className="h-5 w-5" />
                </a>
              ) : (
                <button className="absolute bottom-7 right-7 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-xl">
                  <HelpCircle className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="relative grid grid-cols-12 gap-3 bg-slate-50 p-3">
              <div className="col-span-12 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:col-span-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[21px] font-semibold text-slate-900">Location</h2>
                    <p className="mt-2 text-sm text-slate-700">{project.location?.trim() || "No project location yet"}</p>
                    <p className="mt-1 text-sm text-slate-500">{project.code || "-"}</p>
                  </div>

                  <div className="text-right">
                    <Heart className="ml-auto h-[18px] w-[18px] fill-amber-400 text-amber-400" />
                    <p className="mt-5 text-xs text-slate-500">{latestReportDate}</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <RichInfoTileCompact icon={Building2} label="Project Age" value={projectAge} />
                  <RichInfoTileCompact icon={Users} label="Team Members" value={members.length.toLocaleString()} />
                  <RichInfoTileCompact icon={Camera} label="Project Photos" value={photos.length.toLocaleString()} />
                </div>
              </div>

              <div className="col-span-12 min-h-[200px] overflow-hidden rounded-2xl border border-slate-100 shadow-sm lg:col-span-4">
                {featurePhotoUrl ? (
                  <div className="relative h-full min-h-[200px]">
                    <img
                      src={featurePhotoUrl}
                      alt={photos[0]?.caption ?? project.name}
                      className="h-full min-h-[200px] w-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-blue-600 shadow-sm"
                      aria-label="Upload project photo"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,#d7e3f4_0%,#f3f0e8_55%,#d8cec2_100%)] px-4 text-center text-xs text-slate-500"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-blue-600 shadow-sm">
                      {uploadingPhoto ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
                    </span>
                    <span className="font-medium text-blue-600">Add project photo</span>
                    No project photo yet
                  </button>
                )}
              </div>

              <div className="col-span-12 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:col-span-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[21px] font-semibold text-slate-900">Progress</h2>
                    <p className="mt-2 text-sm leading-snug text-slate-500">
                      Overall
                      <br />
                      status of this
                      <br />
                      project
                    </p>
                  </div>

                  <div className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                    {progressValue}%
                  </div>
                </div>

                <div className="relative mt-5 flex h-28 items-end justify-center">
                  <div className="absolute bottom-0 h-20 w-40 rounded-t-full border-[20px] border-b-0 border-slate-100" />
                  <div
                    className="absolute bottom-0 h-20 w-40 rounded-t-full border-[20px] border-b-0 border-amber-400"
                    style={{ clipPath: `polygon(0 0, ${Math.max(35, progressValue)}% 0, ${Math.max(35, progressValue)}% 100%, 0 100%)` }}
                  />

                  <div className="relative z-10 pb-2 text-center">
                    <p className="text-3xl font-light text-slate-900">{progressValue}%</p>
                    <p className="text-xs text-slate-500">completed</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span>Completed tasks</span>
                    <span>
                      {completedTasks.length}/{tasks.length}
                    </span>
                  </div>
                  <ProgressBar value={progressValue} />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Team</h2>
              <span className="text-sm text-muted-foreground">{members.length} people</span>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">Project team</p>

            <div className="mt-6">
              {members.length === 0 ? (
                <EmptyState text="No team members in this project yet" />
              ) : (
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 sm:gap-6">
                  {members.map((member) => {
                    const profile = profiles.get(member.user_id);
                    return (
                      <div key={member.id} className="flex flex-col items-center text-center">
                        <div className="relative">
                          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-secondary text-lg font-semibold text-foreground shadow-sm sm:h-24 sm:w-24">
                            {profile?.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt={profile.full_name ?? profile.email ?? "Team member"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              initials(profile?.full_name, profile?.email)
                            )}
                          </div>
                          <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400 shadow-sm" />
                        </div>
                        <div className="mt-3 max-w-full">
                          <div className="truncate text-base font-semibold text-foreground">{displayProfile(profile)}</div>
                          <div className="mt-0.5 text-sm text-muted-foreground">{member.role}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "default",
  swap = false,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "danger";
  swap?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase text-muted-foreground">{swap ? value : label}</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{swap ? label : value}</div>
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
  children: ReactNode;
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
          <div className="mt-1 text-xs text-muted-foreground">{assigneeName} · due {task.due_date ?? "-"}</div>
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

function RichInfoTileCompact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex h-28 flex-col justify-between rounded-xl bg-slate-100 p-3">
      <Icon className="h-5 w-5 text-slate-400" />
      <div>
        <p className="text-[11px] text-slate-500">{label}</p>
        <p className="text-3xl font-light text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function displayProfile(profile?: { full_name: string | null; email: string | null } | null) {
  return profile?.full_name || profile?.email || "-";
}

function getProjectMapLinkUrl(location?: string | null) {
  const normalized = location?.trim();
  if (!normalized) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalized)}`;
}

function getProjectMapEmbedUrl(location?: string | null) {
  const normalized = location?.trim();
  if (!normalized) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(normalized)}&z=15&output=embed`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Cannot read image file"));
    reader.readAsDataURL(file);
  });
}

function getProjectAgeLabel(startDate?: string | null, endDate?: string | null) {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : new Date();
  if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) return "-";

  const diffMs = Math.max(0, end.getTime() - start.getTime());
  const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  if (years >= 1) return `${Math.max(1, Math.round(years))}Y`;

  const months = diffMs / (1000 * 60 * 60 * 24 * 30.44);
  return `${Math.max(1, Math.round(months))}M`;
}

function EmptyState({ text, boxed = false }: { text: string; boxed?: boolean }) {
  const className = boxed
    ? "rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground"
    : "px-4 py-6 text-center text-sm text-muted-foreground";
  return <div className={className}>{text}</div>;
}
