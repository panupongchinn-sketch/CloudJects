import { useEffect, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Search, ShieldCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchOrganizationAssignableUsers, fetchProjectBundle, initials, type ProfileRow } from "@/lib/app-data";
import { addProjectMember, removeProjectMember } from "@/lib/project-team.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/projects/$projectId/team")({
  component: TeamPage,
});

function TeamPage() {
  const { projectId } = useParams({ from: "/_app/projects/$projectId/team" });
  const addMemberFn = useServerFn(addProjectMember);
  const removeMemberFn = useServerFn(removeProjectMember);
  const [bundle, setBundle] = useState<NonNullable<Awaited<ReturnType<typeof fetchProjectBundle>>> | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  async function reload() {
    const projectBundle = await fetchProjectBundle(projectId);
    const companyUsers = projectBundle ? await fetchOrganizationAssignableUsers(projectBundle.project.organization_id) : [];
    setBundle(projectBundle);
    setProfiles(companyUsers);
  }

  useEffect(() => {
    reload();
  }, [projectId]);

  const normalizedQuery = query.trim().toLowerCase();
  const memberIds = new Set((bundle?.members ?? []).map((member) => member.user_id));
  const availableProfiles = profiles.filter((profile) => {
    const alreadyInProject = memberIds.has(profile.id);
    const matchQuery =
      normalizedQuery.length === 0 ||
      (profile.full_name ?? "").toLowerCase().includes(normalizedQuery) ||
      (profile.email ?? "").toLowerCase().includes(normalizedQuery);
    return !alreadyInProject && matchQuery;
  });

  async function addMember(userId: string) {
    setSaving(true);
    try {
      await addMemberFn({
        data: {
          projectId,
          userId,
        },
      });
      await reload();
      toast.success("เพิ่มคนเข้าทีมแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เพิ่มคนเข้าทีมไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(userId: string) {
    if (userId === bundle?.project.manager_id) return;
    setSaving(true);
    try {
      await removeMemberFn({
        data: {
          projectId,
          userId,
        },
      });
      await reload();
      toast.success("ถอดออกจากทีมแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ถอดออกจากทีมไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">ทีมงานรับผิดชอบโครงการ</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">เพิ่ม/ถอดผู้รับผิดชอบในตาราง project_members</p>
          </div>
          <div className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-foreground">
            {bundle?.members.length ?? 0} คนในทีม
          </div>
        </div>

        <div className="divide-y divide-border">
          {!bundle ? (
            <div className="p-8 text-center text-sm text-muted-foreground">กำลังโหลด...</div>
          ) : bundle.members.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">ยังไม่มีทีมงานในโครงการนี้</div>
          ) : (
            bundle.members.map((member) => {
              const profile = bundle.profiles.get(member.user_id);
              const assignedTasks = bundle.tasks.filter((task) => task.assignee_id === member.user_id);
              const isManager = member.user_id === bundle.project.manager_id;
              return (
                <article key={member.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_180px_120px]">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                      {initials(profile?.full_name, profile?.email)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-foreground">{profile?.full_name ?? profile?.email ?? member.user_id}</h3>
                        {isManager ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground">
                            <ShieldCheck className="h-3 w-3" /> Project Manager
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{profile?.email ?? "-"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-1">
                    <div>
                      <div className="text-[11px] font-medium uppercase text-muted-foreground">Role</div>
                      <div className="mt-1 font-medium text-foreground">{member.role}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium uppercase text-muted-foreground">Assigned</div>
                      <div className="mt-1 font-medium text-foreground">{assignedTasks.length} tasks</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-start lg:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isManager || saving}
                      onClick={() => removeMember(member.user_id)}
                      className={cn(isManager && "opacity-60")}
                    >
                      <Trash2 className="h-4 w-4" />
                      ถอดออก
                    </Button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      <aside className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-foreground">เพิ่มคนเข้าทีม</h2>
          <p className="mt-1 text-sm text-muted-foreground">ค้นหาผู้ใช้งานจากบริษัทของโครงการ แล้วบันทึกลงทีม</p>
        </div>

        <label className="mt-4 flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 focus-within:ring-2 focus-within:ring-ring/40">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาชื่อหรืออีเมล..."
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="mt-4 space-y-3">
          {availableProfiles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              ไม่มีผู้ใช้ที่ตรงกับเงื่อนไข หรืออยู่ในทีมแล้ว
            </div>
          ) : (
            availableProfiles.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
                    {initials(profile.full_name, profile.email)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{profile.full_name ?? profile.email}</div>
                    <div className="truncate text-xs text-muted-foreground">{profile.email}</div>
                  </div>
                </div>
                <Button type="button" size="sm" disabled={saving} onClick={() => addMember(profile.id)}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} เพิ่ม
                </Button>
              </div>
            ))
          )}
        </div>
      </aside>
    </section>
  );
}
