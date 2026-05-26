import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ListSchema = z.object({
  projectId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  categoryId: z.string().uuid().optional(),
  status: z.string().max(40).optional(),
});

export const listDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    let q = supabase
      .from("documents")
      .select(
        "id, document_name, document_no, status, is_confidential, share_to_client, created_at, updated_at, project_id, document_category_id, document_type_id, current_version_id, created_by",
      )
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(500);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.categoryId) q = q.eq("document_category_id", data.categoryId);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) q = q.ilike("document_name", `%${data.search}%`);
    const { data: docs, error } = await q;
    if (error) throw new Error(error.message);

    const versionIds = (docs ?? []).map((d: any) => d.current_version_id).filter(Boolean);
    let versionsById: Record<string, any> = {};
    if (versionIds.length) {
      const { data: vs } = await supabase
        .from("document_versions")
        .select("id, version_no, file_name, file_size, file_extension, file_type, file_path, uploaded_at")
        .in("id", versionIds);
      versionsById = Object.fromEntries((vs ?? []).map((v: any) => [v.id, v]));
    }
    const userIds = Array.from(new Set((docs ?? []).map((d: any) => d.created_by).filter(Boolean)));
    let profilesById: Record<string, any> = {};
    if (userIds.length) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      profilesById = Object.fromEntries((ps ?? []).map((p: any) => [p.id, p]));
    }
    const projectIds = Array.from(new Set((docs ?? []).map((d: any) => d.project_id).filter(Boolean)));
    let projectsById: Record<string, any> = {};
    if (projectIds.length) {
      const { data: pr } = await supabase
        .from("projects")
        .select("id, name, code")
        .in("id", projectIds);
      projectsById = Object.fromEntries((pr ?? []).map((p: any) => [p.id, p]));
    }

    return (docs ?? []).map((d: any) => ({
      ...d,
      version: d.current_version_id ? versionsById[d.current_version_id] : null,
      uploader: d.created_by ? profilesById[d.created_by] : null,
      project: d.project_id ? projectsById[d.project_id] : null,
    }));
  });

export const listCategoriesAndTypes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as any;
    const [{ data: cats }, { data: types }] = await Promise.all([
      supabase.from("document_categories").select("id, name, code, sort_order").eq("is_active", true).order("sort_order"),
      supabase.from("document_types").select("id, name, code, category_id, requires_approval, is_confidential").eq("is_active", true).order("name"),
    ]);
    return { categories: cats ?? [], types: types ?? [] };
  });

const CreateSchema = z.object({
  documentId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(),
  documentName: z.string().min(1).max(255),
  documentNo: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  typeId: z.string().uuid().optional().nullable(),
  isConfidential: z.boolean().optional(),
  shareToClient: z.boolean().optional(),
  filePath: z.string().min(1).max(1000),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().nonnegative(),
  fileType: z.string().max(120).optional().nullable(),
  fileExtension: z.string().max(20).optional().nullable(),
});

export const createDocumentWithVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    // Lookup organization_id via profile
    const { data: prof, error: pe } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", userId)
      .single();
    if (pe || !prof) throw new Error("Profile not found");
    const orgId = prof.organization_id;

    const { data: doc, error: de } = await supabase
      .from("documents")
      .insert({
        id: data.documentId,
        organization_id: orgId,
        project_id: data.projectId ?? null,
        document_name: data.documentName,
        document_no: data.documentNo ?? null,
        description: data.description ?? null,
        document_category_id: data.categoryId ?? null,
        document_type_id: data.typeId ?? null,
        is_confidential: !!data.isConfidential,
        share_to_client: !!data.shareToClient,
        status: "Draft",
        created_by: userId,
      })
      .select()
      .single();
    if (de) throw new Error(de.message);

    const { data: ver, error: ve } = await supabase
      .from("document_versions")
      .insert({
        document_id: doc.id,
        organization_id: orgId,
        version_no: "1.0",
        file_path: data.filePath,
        file_name: data.fileName,
        file_size: data.fileSize,
        file_type: data.fileType ?? null,
        file_extension: data.fileExtension ?? null,
        status: "Draft",
        uploaded_by: userId,
        is_current: true,
      })
      .select()
      .single();
    if (ve) throw new Error(ve.message);

    await supabase
      .from("documents")
      .update({ current_version_id: ver.id })
      .eq("id", doc.id);

    await supabase.from("document_audit_logs").insert({
      organization_id: orgId,
      document_id: doc.id,
      document_version_id: ver.id,
      user_id: userId,
      action: "upload",
      detail_json: { file_name: data.fileName, size: data.fileSize },
    });

    return { id: doc.id };
  });

const SignedUrlSchema = z.object({
  versionId: z.string().uuid(),
  download: z.boolean().optional(),
});

export const createSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SignedUrlSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: ver, error } = await supabase
      .from("document_versions")
      .select("id, file_path, file_name, document_id, organization_id")
      .eq("id", data.versionId)
      .single();
    if (error || !ver) throw new Error("Version not found");

    const { data: signed, error: se } = await supabase.storage
      .from("project-documents")
      .createSignedUrl(ver.file_path, 60 * 10, data.download ? { download: ver.file_name } : undefined);
    if (se) throw new Error(se.message);

    await supabase.from("document_audit_logs").insert({
      organization_id: ver.organization_id,
      document_id: ver.document_id,
      document_version_id: ver.id,
      user_id: userId,
      action: data.download ? "download" : "preview",
    });

    return { url: signed.signedUrl };
  });

const SubmitSchema = z.object({ documentId: z.string().uuid() });
export const submitForApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SubmitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: doc, error } = await supabase
      .from("documents")
      .select("id, organization_id, project_id, current_version_id, status")
      .eq("id", data.documentId)
      .single();
    if (error || !doc) throw new Error("Document not found");

    const { error: ue } = await supabase
      .from("documents")
      .update({ status: "Waiting Approval", submitted_by: userId, submitted_at: new Date().toISOString() })
      .eq("id", doc.id);
    if (ue) throw new Error(ue.message);

    if (doc.current_version_id) {
      await supabase
        .from("document_versions")
        .update({ status: "Waiting Approval" })
        .eq("id", doc.current_version_id);
    }

    await supabase.from("document_approvals").insert({
      document_id: doc.id,
      document_version_id: doc.current_version_id,
      organization_id: doc.organization_id,
      project_id: doc.project_id,
      status: "Pending",
      requested_by: userId,
    });

    await supabase.from("document_audit_logs").insert({
      organization_id: doc.organization_id,
      document_id: doc.id,
      document_version_id: doc.current_version_id,
      user_id: userId,
      action: "submit_for_approval",
    });

    // Notify project manager (if project doc)
    if (doc.project_id) {
      const { data: pr } = await supabase
        .from("projects")
        .select("manager_id, name")
        .eq("id", doc.project_id)
        .single();
      if (pr?.manager_id && pr.manager_id !== userId) {
        await supabase.from("notifications").insert({
          user_id: pr.manager_id,
          title: "เอกสารรออนุมัติ",
          body: `มีเอกสารใหม่รออนุมัติในโครงการ ${pr.name}`,
          link: `/projects/${doc.project_id}/documents`,
        });
      }
    }
    return { ok: true };
  });

const DecideSchema = z.object({
  documentId: z.string().uuid(),
  approve: z.boolean(),
  reason: z.string().max(1000).optional(),
});
export const decideApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DecideSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: doc, error } = await supabase
      .from("documents")
      .select("id, organization_id, current_version_id, created_by, document_name, project_id")
      .eq("id", data.documentId)
      .single();
    if (error || !doc) throw new Error("Document not found");

    const now = new Date().toISOString();
    const newStatus = data.approve ? "Approved" : "Rejected";

    const docUpdate: any = { status: newStatus };
    if (data.approve) {
      docUpdate.approved_by = userId;
      docUpdate.approved_at = now;
    } else {
      docUpdate.rejected_by = userId;
      docUpdate.rejected_at = now;
      docUpdate.rejected_reason = data.reason ?? null;
    }
    await supabase.from("documents").update(docUpdate).eq("id", doc.id);

    if (doc.current_version_id) {
      await supabase
        .from("document_versions")
        .update({ status: newStatus })
        .eq("id", doc.current_version_id);
    }

    const { data: appr } = await supabase
      .from("document_approvals")
      .select("id")
      .eq("document_id", doc.id)
      .eq("status", "Pending")
      .order("requested_at", { ascending: false })
      .limit(1);
    const apprId = appr?.[0]?.id;
    if (apprId) {
      const apprUpdate: any = {
        status: newStatus,
        reviewed_by: userId,
        reviewed_at: now,
      };
      if (data.approve) {
        apprUpdate.approved_by = userId;
        apprUpdate.approved_at = now;
      } else {
        apprUpdate.rejected_by = userId;
        apprUpdate.rejected_at = now;
        apprUpdate.rejected_reason = data.reason ?? null;
      }
      await supabase.from("document_approvals").update(apprUpdate).eq("id", apprId);
      await supabase.from("document_approval_logs").insert({
        organization_id: doc.organization_id,
        document_id: doc.id,
        approval_id: apprId,
        acted_by: userId,
        action: data.approve ? "approve" : "reject",
        new_status: newStatus,
        comment: data.reason ?? null,
      });
    }

    await supabase.from("document_audit_logs").insert({
      organization_id: doc.organization_id,
      document_id: doc.id,
      document_version_id: doc.current_version_id,
      user_id: userId,
      action: data.approve ? "approve" : "reject",
      detail_json: data.reason ? { reason: data.reason } : null,
    });

    // Notify the creator about decision
    if (doc.created_by && doc.created_by !== userId) {
      await supabase.from("notifications").insert({
        user_id: doc.created_by,
        title: data.approve ? "เอกสารได้รับการอนุมัติ" : "เอกสารถูกตีกลับ",
        body: `${doc.document_name}${data.reason ? ` — ${data.reason}` : ""}`,
        link: doc.project_id ? `/projects/${doc.project_id}/documents` : `/documents`,
      });
    }

    return { ok: true };
  });

// ---------- Versioning ----------
const NewVersionSchema = z.object({
  documentId: z.string().uuid(),
  versionNo: z.string().min(1).max(20),
  changeNote: z.string().max(2000).optional().nullable(),
  filePath: z.string().min(1).max(1000),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().nonnegative(),
  fileType: z.string().max(120).optional().nullable(),
  fileExtension: z.string().max(20).optional().nullable(),
});

export const uploadNewVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => NewVersionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: doc, error } = await supabase
      .from("documents")
      .select("id, organization_id")
      .eq("id", data.documentId)
      .single();
    if (error || !doc) throw new Error("Document not found");

    // Unset previous current flags
    await supabase
      .from("document_versions")
      .update({ is_current: false })
      .eq("document_id", doc.id);

    const { data: ver, error: ve } = await supabase
      .from("document_versions")
      .insert({
        document_id: doc.id,
        organization_id: doc.organization_id,
        version_no: data.versionNo,
        change_note: data.changeNote ?? null,
        file_path: data.filePath,
        file_name: data.fileName,
        file_size: data.fileSize,
        file_type: data.fileType ?? null,
        file_extension: data.fileExtension ?? null,
        status: "Draft",
        uploaded_by: userId,
        is_current: true,
      })
      .select()
      .single();
    if (ve) throw new Error(ve.message);

    await supabase
      .from("documents")
      .update({
        current_version_id: ver.id,
        status: "Draft",
        rejected_reason: null,
        rejected_at: null,
        rejected_by: null,
        revision_note: null,
      })
      .eq("id", doc.id);

    await supabase.from("document_audit_logs").insert({
      organization_id: doc.organization_id,
      document_id: doc.id,
      document_version_id: ver.id,
      user_id: userId,
      action: "new_version",
      detail_json: { version: data.versionNo, change_note: data.changeNote ?? null },
    });

    return { versionId: ver.id };
  });

const RevisionSchema = z.object({
  documentId: z.string().uuid(),
  reason: z.string().min(1).max(1000),
});

export const requestRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RevisionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: doc, error } = await supabase
      .from("documents")
      .select("id, organization_id, current_version_id, created_by, document_name, project_id")
      .eq("id", data.documentId)
      .single();
    if (error || !doc) throw new Error("Document not found");

    const now = new Date().toISOString();
    await supabase
      .from("documents")
      .update({
        status: "Revision Required",
        revision_note: data.reason,
        rejected_reason: data.reason,
        rejected_at: now,
        rejected_by: userId,
      })
      .eq("id", doc.id);

    if (doc.current_version_id) {
      await supabase
        .from("document_versions")
        .update({ status: "Revision Required" })
        .eq("id", doc.current_version_id);
    }

    const { data: appr } = await supabase
      .from("document_approvals")
      .select("id")
      .eq("document_id", doc.id)
      .eq("status", "Pending")
      .order("requested_at", { ascending: false })
      .limit(1);
    const apprId = appr?.[0]?.id;
    if (apprId) {
      await supabase
        .from("document_approvals")
        .update({
          status: "Revision Required",
          reviewed_by: userId,
          reviewed_at: now,
          revision_note: data.reason,
        })
        .eq("id", apprId);
      await supabase.from("document_approval_logs").insert({
        organization_id: doc.organization_id,
        document_id: doc.id,
        approval_id: apprId,
        acted_by: userId,
        action: "request_revision",
        new_status: "Revision Required",
        comment: data.reason,
      });
    }

    await supabase.from("document_audit_logs").insert({
      organization_id: doc.organization_id,
      document_id: doc.id,
      document_version_id: doc.current_version_id,
      user_id: userId,
      action: "request_revision",
      detail_json: { reason: data.reason },
    });

    if (doc.created_by && doc.created_by !== userId) {
      await supabase.from("notifications").insert({
        user_id: doc.created_by,
        title: "ขอให้แก้ไขเอกสาร",
        body: `${doc.document_name} — ${data.reason}`,
        link: doc.project_id ? `/projects/${doc.project_id}/documents` : `/documents`,
      });
    }

    return { ok: true };
  });

const VersionsSchema = z.object({ documentId: z.string().uuid() });
export const listVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VersionsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { data: versions, error } = await supabase
      .from("document_versions")
      .select("id, version_no, file_name, file_size, file_extension, file_type, status, change_note, uploaded_at, uploaded_by, is_current")
      .eq("document_id", data.documentId)
      .order("uploaded_at", { ascending: false });
    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set((versions ?? []).map((v: any) => v.uploaded_by).filter(Boolean)));
    let profilesById: Record<string, any> = {};
    if (userIds.length) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      profilesById = Object.fromEntries((ps ?? []).map((p: any) => [p.id, p]));
    }
    return (versions ?? []).map((v: any) => ({ ...v, uploader: profilesById[v.uploaded_by] ?? null }));
  });

export const listApprovalHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VersionsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { data: logs, error } = await supabase
      .from("document_approval_logs")
      .select("id, action, old_status, new_status, comment, acted_by, acted_at")
      .eq("document_id", data.documentId)
      .order("acted_at", { ascending: false });
    if (error) throw new Error(error.message);
    const userIds = Array.from(new Set((logs ?? []).map((l: any) => l.acted_by).filter(Boolean)));
    let profilesById: Record<string, any> = {};
    if (userIds.length) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      profilesById = Object.fromEntries((ps ?? []).map((p: any) => [p.id, p]));
    }
    return (logs ?? []).map((l: any) => ({ ...l, actor: profilesById[l.acted_by] ?? null }));
  });

const DeleteSchema = z.object({ documentId: z.string().uuid() });
export const archiveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: doc } = await supabase
      .from("documents")
      .select("organization_id")
      .eq("id", data.documentId)
      .single();
    const { error } = await supabase
      .from("documents")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", data.documentId);
    if (error) throw new Error(error.message);
    if (doc) {
      await supabase.from("document_audit_logs").insert({
        organization_id: doc.organization_id,
        document_id: data.documentId,
        user_id: userId,
        action: "archive",
      });
    }
    return { ok: true };
  });
