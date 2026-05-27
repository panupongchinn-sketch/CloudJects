import { fetchProfileMap, type ClientRow, type ProfileRow } from "@/lib/app-data";
import { supabase } from "@/integrations/supabase/client";

export type MyProject = {
  id: string;
  name: string;
  code: string;
  status: string;
  progress: number;
  location: string | null;
  budget: number | null;
  role: string;
  header_background?: string | null;
  client?: Pick<ClientRow, "id" | "name"> | null;
  manager?: Pick<ProfileRow, "full_name" | "email"> | null;
  taskCount: number;
  overdueCount: number;
  memberCount: number;
};

function isOverdue(task: { status: string | null; due_date: string | null }, today = new Date()) {
  if (!task.due_date || task.status === "Completed") return false;
  const yyyyMmDd = today.toISOString().slice(0, 10);
  return task.due_date < yyyyMmDd;
}

export async function fetchMyProjects(userId: string): Promise<MyProject[]> {
  const [{ data: memberRows }, { data: managedRows }] = await Promise.all([
    supabase.from("project_members").select("project_id, role").eq("user_id", userId),
    supabase
      .from("projects")
      .select("id, name, code, status, progress, location, budget, header_background, manager_id, clients(id,name)")
      .eq("manager_id", userId),
  ]);

  const memberIds = (memberRows ?? []).map((row) => row.project_id);

  let memberProjects: any[] = [];
  if (memberIds.length) {
    const { data } = await supabase
      .from("projects")
      .select("id, name, code, status, progress, location, budget, header_background, manager_id, clients(id,name)")
      .in("id", memberIds);
    memberProjects = data ?? [];
  }

  const roleMap = new Map<string, string>();
  for (const row of memberRows ?? []) roleMap.set(row.project_id, row.role);
  for (const project of managedRows ?? []) roleMap.set(project.id, "manager");

  const projectsById = new Map<string, any>();
  for (const project of [...(managedRows ?? []), ...memberProjects]) {
    projectsById.set(project.id, project);
  }

  const projects = Array.from(projectsById.values());
  const projectIds = projects.map((project) => project.id);
  const managerIds = projects.map((project) => project.manager_id).filter(Boolean);

  const [tasksResult, membersResult, managerProfiles] = await Promise.all([
    projectIds.length
      ? supabase.from("tasks").select("id, project_id, status, due_date").in("project_id", projectIds)
      : Promise.resolve({ data: [], error: null }),
    projectIds.length
      ? supabase.from("project_members").select("id, project_id, user_id").in("project_id", projectIds)
      : Promise.resolve({ data: [], error: null }),
    fetchProfileMap(managerIds),
  ]);

  if (tasksResult.error) throw tasksResult.error;
  if (membersResult.error) throw membersResult.error;

  const tasks = tasksResult.data ?? [];
  const members = membersResult.data ?? [];

  return projects.map((project) => {
    const projectTasks = tasks.filter((task) => task.project_id === project.id);
    const memberCount = members.filter((member) => member.project_id === project.id).length;

    return {
      id: project.id,
      name: project.name,
      code: project.code,
      status: project.status,
      progress: project.progress ?? 0,
      location: project.location ?? null,
      budget: project.budget ?? 0,
      header_background: project.header_background ?? null,
      client: project.clients ?? null,
      manager: project.manager_id ? managerProfiles.get(project.manager_id) ?? null : null,
      taskCount: projectTasks.length,
      overdueCount: projectTasks.filter((task) => isOverdue(task)).length,
      memberCount,
      role: roleMap.get(project.id) ?? "member",
    } satisfies MyProject;
  });
}
