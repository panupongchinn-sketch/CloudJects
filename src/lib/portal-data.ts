import { supabase } from "@/integrations/supabase/client";

export type MyProject = {
  id: string;
  name: string;
  code: string;
  status: string;
  progress: number;
  location: string | null;
  role: string;
};

export async function fetchMyProjects(userId: string): Promise<MyProject[]> {
  // Projects where I'm a member
  const { data: memberRows } = await supabase
    .from("project_members")
    .select("project_id, role")
    .eq("user_id", userId);

  const memberIds = (memberRows ?? []).map((r) => r.project_id);

  // Projects where I'm the manager
  const { data: managed } = await supabase
    .from("projects")
    .select("id, name, code, status, progress, location")
    .eq("manager_id", userId);

  let memberProjects: any[] = [];
  if (memberIds.length) {
    const { data } = await supabase
      .from("projects")
      .select("id, name, code, status, progress, location")
      .in("id", memberIds);
    memberProjects = data ?? [];
  }

  const roleMap = new Map<string, string>();
  for (const r of memberRows ?? []) roleMap.set(r.project_id, r.role);
  for (const p of managed ?? []) roleMap.set(p.id, "manager");

  const byId = new Map<string, any>();
  for (const p of [...(managed ?? []), ...memberProjects]) byId.set(p.id, p);

  return Array.from(byId.values()).map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    status: p.status,
    progress: p.progress ?? 0,
    location: p.location,
    role: roleMap.get(p.id) ?? "member",
  }));
}
