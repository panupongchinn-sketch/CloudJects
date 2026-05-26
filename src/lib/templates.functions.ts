import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const FieldSchema = z.object({
  key: z.string().min(1).max(60).regex(/^[a-zA-Z0-9_]+$/),
  label: z.string().min(1).max(120),
  type: z.enum(["text", "textarea", "number", "date", "select", "table"]),
  required: z.boolean().optional(),
  placeholder: z.string().max(200).optional(),
  options: z.array(z.string().max(120)).max(50).optional(),
  // for table type
  columns: z
    .array(
      z.object({
        key: z.string().min(1).max(40),
        label: z.string().min(1).max(80),
        type: z.enum(["text", "number"]).optional(),
      }),
    )
    .max(12)
    .optional(),
});

export type TemplateField = z.infer<typeof FieldSchema>;

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as any;
    const { data, error } = await supabase
      .from("document_templates")
      .select(
        "id, code, name, description, template_type, requires_approval, is_active, paper_size, orientation, document_category_id, document_type_id, created_at, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { templates: data ?? [] };
  });

export const getTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { data: tpl, error } = await supabase
      .from("document_templates")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !tpl) throw new Error("ไม่พบ Template");
    return { template: tpl };
  });

const SaveSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1).max(60),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  template_type: z.string().max(60).optional().nullable(),
  document_category_id: z.string().uuid().optional().nullable(),
  document_type_id: z.string().uuid().optional().nullable(),
  requires_approval: z.boolean().optional(),
  paper_size: z.enum(["A4", "A5", "Letter"]).optional(),
  orientation: z.enum(["portrait", "landscape"]).optional(),
  fields_json: z.array(FieldSchema).max(80),
  body_html: z.string().max(200000).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const saveTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: prof } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", userId)
      .single();
    if (!prof) throw new Error("ไม่พบโปรไฟล์");
    const payload: any = {
      organization_id: prof.organization_id,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      template_type: data.template_type ?? null,
      document_category_id: data.document_category_id ?? null,
      document_type_id: data.document_type_id ?? null,
      requires_approval: !!data.requires_approval,
      paper_size: data.paper_size ?? "A4",
      orientation: data.orientation ?? "portrait",
      fields_json: data.fields_json,
      body_html: data.body_html ?? null,
      is_active: data.is_active ?? true,
    };
    if (data.id) {
      const { error } = await supabase
        .from("document_templates")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await supabase
      .from("document_templates")
      .insert({ ...payload, created_by: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { error } = await supabase
      .from("document_templates")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: src, error: e1 } = await supabase
      .from("document_templates")
      .select("*")
      .eq("id", data.id)
      .single();
    if (e1 || !src) throw new Error("ไม่พบ Template ต้นฉบับ");
    const copy: any = { ...src };
    delete copy.id;
    delete copy.created_at;
    delete copy.updated_at;
    copy.code = `${src.code}_COPY_${Date.now().toString(36).slice(-4).toUpperCase()}`;
    copy.name = `${src.name} (สำเนา)`;
    copy.created_by = userId;
    const { data: ins, error: e2 } = await supabase
      .from("document_templates")
      .insert(copy)
      .select("id")
      .single();
    if (e2) throw new Error(e2.message);
    return { id: ins.id };
  });
