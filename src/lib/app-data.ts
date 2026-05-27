import { supabase } from "@/integrations/supabase/client";
import { getStoredAppSession } from "@/lib/app-auth-client";

export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  organization_id?: string | null;
  organization_name?: string | null;
  role?: string | null;
  is_active?: boolean | null;
};

export type ClientRow = {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
};

export type ProjectRow = {
  id: string;
  code: string;
  header_background?: string | null;
  name: string;
  client_id: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "Planning" | "In Progress" | "On Hold" | "Completed" | "Cancelled";
  progress: number;
  budget: number | null;
  manager_id: string | null;
  organization_id?: string;
  created_at?: string;
  updated_at?: string;
  clients?: ClientRow | null;
};

export type TaskRow = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  status: "To Do" | "In Progress" | "Waiting Review" | "Waiting Approval" | "Completed" | "Rejected";
  priority: "Low" | "Medium" | "High" | "Urgent";
  start_date: string | null;
  due_date: string | null;
  progress: number;
  created_at?: string;
  updated_at?: string;
};

export type ProjectMemberRow = {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  created_at?: string;
};

export type DailyReportRow = {
  id: string;
  project_id: string;
  reporter_id: string | null;
  report_date: string;
  weather: string | null;
  summary: string | null;
  status: "Draft" | "Submitted" | "Approved" | "Rejected";
  created_at: string;
};

export type PhotoRow = {
  id: string;
  project_id: string;
  task_id: string | null;
  uploader_id: string | null;
  storage_path: string;
  caption: string | null;
  created_at: string;
};

export type ApprovalRow = {
  id: string;
  project_id: string;
  requester_id: string | null;
  approver_id: string | null;
  ref_type: string;
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  note: string | null;
  created_at: string;
  projects?: Pick<ProjectRow, "id" | "name" | "code"> | null;
};

export type OrganizationRow = {
  id: string;
  name: string;
  email: string | null;
  contact_name: string | null;
  phone?: string | null;
  address?: string | null;
  status: string;
  created_at: string;
};

export type SubscriptionPlanRow = {
  id: string;
  name: string;
  code: string;
  monthly_price: number;
  max_users: number;
  max_projects: number;
  max_storage_gb: number;
};

export type OrganizationSubscriptionRow = {
  id: string;
  organization_id: string;
  plan_id: string;
  status: string;
  monthly_price: number;
  next_billing_date: string | null;
  subscription_plans?: SubscriptionPlanRow | null;
};

export function initials(name?: string | null, email?: string | null) {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function money(value?: number | null) {
  return `฿${Number(value ?? 0).toLocaleString()}`;
}

export function photoUrl(path?: string | null) {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return supabase.storage.from("project-photos").getPublicUrl(path).data.publicUrl;
}

export function isOverdue(task: Pick<TaskRow, "status" | "due_date">, today = new Date()) {
  if (!task.due_date || task.status === "Completed") return false;
  const yyyyMmDd = today.toISOString().slice(0, 10);
  return task.due_date < yyyyMmDd;
}

function currentAppUserId() {
  return getStoredAppSession()?.user.id ?? null;
}

async function currentAppUserIds() {
  const session = getStoredAppSession();
  const sessionUserId = session?.user.id ?? null;
  if (!sessionUserId) return [];

  const ids = new Set([sessionUserId]);
  const [{ data: byId }, { data: byUserId }] = await Promise.all([
    supabase.from("app_users").select("id,user_id").eq("id", sessionUserId).maybeSingle(),
    supabase.from("app_users").select("id,user_id").eq("user_id", sessionUserId).maybeSingle(),
  ]);

  for (const user of [byId, byUserId]) {
    if (user?.id) ids.add(user.id);
    if (user?.user_id) ids.add(user.user_id);
  }

  return Array.from(ids);
}

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,email,phone,avatar_url,organization_id")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProfileRow[];
}

export async function fetchManagedUsers() {
  const { data, error } = await supabase
    .from("app_users")
    .select("id,full_name,email,avatar_url,role,organization_id,is_active")
    .order("full_name", { ascending: true });
  if (!error) {
    const users = (data ?? []) as ProfileRow[];
    const organizationIds = [...new Set(users.map((user) => user.organization_id).filter(Boolean) as string[])];

    if (organizationIds.length === 0) return users;

    const { data: organizations, error: organizationError } = await supabase
      .from("organizations")
      .select("id,name")
      .in("id", organizationIds);

    if (organizationError) return users;

    const organizationNames = new Map((organizations ?? []).map((org) => [org.id, org.name]));
    return users.map((user) => ({
      ...user,
      organization_name: user.organization_id ? organizationNames.get(user.organization_id) ?? null : null,
    }));
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from("app_users")
    .select("id,email")
    .order("email", { ascending: true });
  if (fallbackError) throw fallbackError;

  return (fallbackData ?? []).map((user) => ({
    id: user.id,
    full_name: user.email?.split("@")[0] ?? null,
    email: user.email,
    role: null,
    organization_id: null,
    is_active: null,
  })) as ProfileRow[];
}

export async function fetchOrganizationAssignableUsers(organizationId?: string | null) {
  if (!organizationId) return [];

  const { data, error } = await supabase
    .from("app_users")
    .select("id,user_id,full_name,email,avatar_url,role,organization_id,is_active")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("full_name", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((user: any) => ({
    id: user.user_id ?? user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    organization_id: user.organization_id,
    is_active: user.is_active,
  })) as ProfileRow[];
}

export async function fetchProfileMap(ids: Array<string | null | undefined>) {
  const uniqueIds = [...new Set(ids.filter(Boolean) as string[])];
  if (uniqueIds.length === 0) return new Map<string, ProfileRow>();

  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,email,phone,avatar_url,organization_id")
    .in("id", uniqueIds);
  if (error) throw error;

  const profiles = new Map((data ?? []).map((profile) => [profile.id, profile as ProfileRow]));
  const missingIds = uniqueIds.filter((id) => !profiles.has(id));

  if (missingIds.length > 0) {
    const [appUsersByIdResult, appUsersByProfileIdResult] = await Promise.all([
      supabase
        .from("app_users")
        .select("id,user_id,full_name,email,avatar_url,role,organization_id,is_active")
        .in("id", missingIds),
      supabase
        .from("app_users")
        .select("id,user_id,full_name,email,avatar_url,role,organization_id,is_active")
        .in("user_id", missingIds),
    ]);

    const appUsers = [...(appUsersByIdResult.data ?? []), ...(appUsersByProfileIdResult.data ?? [])];

    for (const user of appUsers ?? []) {
      const profile = user.user_id ? profiles.get(user.user_id) : null;
      const resolvedProfile = {
        id: user.user_id ?? user.id,
        full_name: user.full_name ?? profile?.full_name ?? null,
        email: user.email ?? profile?.email ?? null,
        phone: profile?.phone ?? null,
        avatar_url: user.avatar_url ?? profile?.avatar_url ?? null,
        role: user.role,
        organization_id: user.organization_id ?? profile?.organization_id ?? null,
        is_active: user.is_active,
      } satisfies ProfileRow;

      profiles.set(user.id, { ...resolvedProfile, id: user.id });
      if (user.user_id && !profiles.has(user.user_id)) {
        profiles.set(user.user_id, resolvedProfile);
      }
    }
  }

  return profiles;
}

export type DashboardProjectRow = Pick<
  ProjectRow,
  "id" | "name" | "status" | "progress" | "created_at"
> & {
  client?: Pick<ClientRow, "id" | "name"> | null;
  taskCount: number;
  overdueCount: number;
};

export type DashboardApprovalRow = Pick<
  ApprovalRow,
  "id" | "ref_type" | "status" | "note" | "created_at"
> & {
  projects?: Pick<ProjectRow, "id" | "name" | "code"> | null;
};

export type DashboardData = {
  totalProjects: number;
  activeProjects: number;
  overdueTasks: number;
  pendingApprovals: number;
  projects: DashboardProjectRow[];
  approvals: DashboardApprovalRow[];
};

export async function fetchDashboardData(): Promise<DashboardData> {
  const today = new Date().toISOString().slice(0, 10);
  const [projectsCountResult, activeProjectsCountResult, overdueTasksCountResult, pendingApprovalsCountResult, projectsResult, approvalsResult] =
    await Promise.all([
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "In Progress"),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .neq("status", "Completed")
        .lt("due_date", today),
      supabase.from("approvals").select("id", { count: "exact", head: true }).eq("status", "Pending"),
      supabase
        .from("projects")
        .select("id,name,status,progress,created_at,clients(id,name)")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("approvals")
        .select("id,ref_type,status,note,created_at,projects(id,name,code)")
        .eq("status", "Pending")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  if (projectsCountResult.error) throw projectsCountResult.error;
  if (activeProjectsCountResult.error) throw activeProjectsCountResult.error;
  if (overdueTasksCountResult.error) throw overdueTasksCountResult.error;
  if (pendingApprovalsCountResult.error) throw pendingApprovalsCountResult.error;
  if (projectsResult.error) throw projectsResult.error;
  if (approvalsResult.error) throw approvalsResult.error;

  const projectRows = (projectsResult.data ?? []) as Array<
    Pick<ProjectRow, "id" | "name" | "status" | "progress" | "created_at"> & {
      clients?: Pick<ClientRow, "id" | "name"> | null;
    }
  >;
  const projectIds = projectRows.map((project) => project.id);

  const projectTasksResult = await (
    projectIds.length
      ? supabase.from("tasks").select("id,project_id,status,due_date").in("project_id", projectIds)
      : Promise.resolve({ data: [], error: null })
  );

  if (projectTasksResult.error) throw projectTasksResult.error;

  const taskStats = new Map<string, { total: number; overdue: number }>();
  for (const task of projectTasksResult.data ?? []) {
    const current = taskStats.get(task.project_id) ?? { total: 0, overdue: 0 };
    current.total += 1;
    if (isOverdue(task)) current.overdue += 1;
    taskStats.set(task.project_id, current);
  }

  return {
    totalProjects: projectsCountResult.count ?? 0,
    activeProjects: activeProjectsCountResult.count ?? 0,
    overdueTasks: overdueTasksCountResult.count ?? 0,
    pendingApprovals: pendingApprovalsCountResult.count ?? 0,
    projects: projectRows.map((project) => {
      const stats = taskStats.get(project.id) ?? { total: 0, overdue: 0 };
      return {
        ...project,
        client: project.clients ?? null,
        taskCount: stats.total,
        overdueCount: stats.overdue,
      };
    }),
    approvals: (approvalsResult.data ?? []) as DashboardApprovalRow[],
  };
}

export async function fetchProjects(options: { includeAll?: boolean } = {}) {
  const { data, error } = await supabase
    .from("projects")
    .select("*, clients(id,name,contact,phone,email)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as ProjectRow[];
  const ids = rows.map((project) => project.id);
  const managerIds = rows.map((project) => project.manager_id);

  const [tasksResult, membersResult, managers] = await Promise.all([
    ids.length
      ? supabase.from("tasks").select("id,project_id,status,due_date").in("project_id", ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? supabase.from("project_members").select("id,project_id,user_id,role,created_at").in("project_id", ids)
      : Promise.resolve({ data: [], error: null }),
    fetchProfileMap(managerIds),
  ]);

  if (tasksResult.error) throw tasksResult.error;
  if (membersResult.error) throw membersResult.error;

  const tasks = (tasksResult.data ?? []) as Pick<TaskRow, "id" | "project_id" | "status" | "due_date">[];
  const members = (membersResult.data ?? []) as ProjectMemberRow[];
  const currentUserIds = options.includeAll ? [] : await currentAppUserIds();
  const visibleProjectIds = new Set(
    currentUserIds.length
      ? members.filter((member) => currentUserIds.includes(member.user_id)).map((member) => member.project_id)
      : [],
  );
  const visibleRows = options.includeAll
    ? rows
    : rows.filter(
        (project) =>
          currentUserIds.length &&
          ((project.manager_id && currentUserIds.includes(project.manager_id)) || visibleProjectIds.has(project.id)),
      );

  return visibleRows.map((project) => {
    const projectTasks = tasks.filter((task) => task.project_id === project.id);
    const memberCount = members.filter((member) => member.project_id === project.id).length;
    return {
      ...project,
      client: project.clients ?? null,
      manager: project.manager_id ? managers.get(project.manager_id) ?? null : null,
      taskCount: projectTasks.length,
      overdueCount: projectTasks.filter((task) => isOverdue(task)).length,
      memberCount,
    };
  });
}

export async function fetchProjectBundle(projectId: string, options: { includeAll?: boolean } = {}) {
  const { data: project, error } = await supabase
    .from("projects")
    .select("*, clients(id,name,contact,phone,email)")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!project) return null;

  const [tasksResult, membersResult, reportsResult, photosResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("id,project_id,title,description,assignee_id,status,priority,start_date,due_date,progress,created_at,updated_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("project_members")
      .select("id,project_id,user_id,role,created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("daily_reports")
      .select("id,project_id,reporter_id,report_date,weather,summary,status,created_at")
      .eq("project_id", projectId)
      .order("report_date", { ascending: false }),
    supabase
      .from("photos")
      .select("id,project_id,task_id,uploader_id,storage_path,caption,created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
  ]);

  if (tasksResult.error) throw tasksResult.error;
  if (membersResult.error) throw membersResult.error;
  if (reportsResult.error) throw reportsResult.error;
  if (photosResult.error) throw photosResult.error;

  const tasks = (tasksResult.data ?? []) as TaskRow[];
  const members = (membersResult.data ?? []) as ProjectMemberRow[];
  const currentUserIds = options.includeAll ? [] : await currentAppUserIds();
  const canView =
    options.includeAll ||
    (currentUserIds.length > 0 &&
      (((project as ProjectRow).manager_id && currentUserIds.includes((project as ProjectRow).manager_id as string)) ||
        members.some((member) => currentUserIds.includes(member.user_id))));

  if (!canView) return null;

  const reports = (reportsResult.data ?? []) as DailyReportRow[];
  const photos = (photosResult.data ?? []) as PhotoRow[];
  const profiles = await fetchProfileMap([
    project.manager_id,
    ...tasks.map((task) => task.assignee_id),
    ...members.map((member) => member.user_id),
    ...reports.map((report) => report.reporter_id),
    ...photos.map((photo) => photo.uploader_id),
  ]);

  return {
    project: project as ProjectRow,
    client: (project as ProjectRow).clients ?? null,
    manager: project.manager_id ? profiles.get(project.manager_id) ?? null : null,
    tasks,
    members,
    reports,
    photos,
    profiles,
  };
}

export async function fetchApprovals() {
  const { data, error } = await supabase
    .from("approvals")
    .select("id,project_id,requester_id,approver_id,ref_type,status,note,created_at, projects(id,name,code)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as ApprovalRow[];
  const profiles = await fetchProfileMap(rows.flatMap((row) => [row.requester_id, row.approver_id]));
  return rows.map((row) => ({
    ...row,
    requester: row.requester_id ? profiles.get(row.requester_id) ?? null : null,
    approver: row.approver_id ? profiles.get(row.approver_id) ?? null : null,
  }));
}

export async function fetchOrganizations() {
  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id,name,email,contact_name,phone,address,status,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const ids = (orgs ?? []).map((org) => org.id);
  const [profilesResult, projectsResult, subsResult, invoicesResult] = await Promise.all([
    ids.length
      ? supabase.from("profiles").select("id,organization_id").in("organization_id", ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? supabase.from("projects").select("id,organization_id,budget,progress").in("organization_id", ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? supabase
          .from("organization_subscriptions")
          .select("id,organization_id,plan_id,status,monthly_price,next_billing_date, subscription_plans(id,name,code,monthly_price,max_users,max_projects,max_storage_gb)")
          .in("organization_id", ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? supabase.from("invoices").select("id,organization_id,status,amount,due_date").in("organization_id", ids)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (projectsResult.error) throw projectsResult.error;
  if (subsResult.error) throw subsResult.error;
  if (invoicesResult.error) throw invoicesResult.error;

  return ((orgs ?? []) as OrganizationRow[]).map((org) => {
    const projects = (projectsResult.data ?? []).filter((project: any) => project.organization_id === org.id);
    const subscription = (subsResult.data ?? []).find((sub: any) => sub.organization_id === org.id) as
      | OrganizationSubscriptionRow
      | undefined;
    const invoice = (invoicesResult.data ?? []).find((row: any) => row.organization_id === org.id && row.status !== "paid");

    return {
      ...org,
      users: (profilesResult.data ?? []).filter((profile: any) => profile.organization_id === org.id).length,
      projects: projects.length,
      budget: projects.reduce((sum: number, project: any) => sum + Number(project.budget ?? 0), 0),
      progress: projects.length
        ? Math.round(projects.reduce((sum: number, project: any) => sum + Number(project.progress ?? 0), 0) / projects.length)
        : 0,
      plan: subscription?.subscription_plans?.code ?? "none",
      planName: subscription?.subscription_plans?.name ?? "-",
      nextBilling: subscription?.next_billing_date ?? "-",
      payment: invoice?.status ?? "paid",
      monthlyPrice: Number(subscription?.monthly_price ?? subscription?.subscription_plans?.monthly_price ?? 0),
      limits: subscription?.subscription_plans ?? null,
    };
  });
}

export async function fetchAdminProjects() {
  const projects = await fetchProjects({ includeAll: true });
  return projects.map((project) => ({
    ...project,
    company: project.organization_id ?? "-",
    clientName: project.client?.name ?? "-",
    managerName: project.manager?.full_name ?? project.manager?.email ?? "-",
  }));
}
