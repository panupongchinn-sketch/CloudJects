import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ProjectStatusSchema = z.enum(["Planning", "In Progress", "On Hold", "Completed", "Cancelled"]);

const CreateProjectSchema = z.object({
  code: z.string().trim().max(40).optional(),
  name: z.string().trim().min(1).max(180),
  clientName: z.string().trim().max(180).optional(),
  location: z.string().trim().max(240).optional(),
  projectImageUrl: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  budget: z.coerce.number().nonnegative().max(999999999999).optional(),
  status: ProjectStatusSchema.default("Planning"),
});

function defaultProjectCode() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `PRJ-${stamp}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function nullableDate(value?: string) {
  return value ? value : null;
}

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateProjectSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, organization_id")
      .eq("id", userId)
      .single();
    if (profileError || !profile?.organization_id) {
      throw new Error("Profile or organization not found");
    }

    let clientId: string | null = null;
    const clientName = data.clientName?.trim();
    if (clientName) {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({
          organization_id: profile.organization_id,
          name: clientName,
        })
        .select("id, name, contact, phone, email")
        .single();
      if (clientError) throw new Error(clientError.message);
      clientId = client.id;
    }

    const code = data.code?.trim() || defaultProjectCode();
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        organization_id: profile.organization_id,
        code,
        name: data.name,
        client_id: clientId,
        location: data.location?.trim() || null,
        project_image_url: data.projectImageUrl?.trim() || null,
        start_date: nullableDate(data.startDate),
        end_date: nullableDate(data.endDate),
        status: data.status,
        progress: data.status === "Completed" ? 100 : 0,
        budget: data.budget ?? null,
        manager_id: userId,
        created_by: userId,
      })
      .select("*, clients(id,name,contact,phone,email)")
      .single();
    if (projectError) throw new Error(projectError.message);

    await supabase.from("project_members").upsert(
      {
        project_id: project.id,
        user_id: userId,
        role: "project_manager",
      },
      { onConflict: "project_id,user_id" },
    );

    return {
      ...project,
      client: project.clients ?? null,
      manager: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
      },
      taskCount: 0,
      overdueCount: 0,
      memberCount: 1,
    };
  });
