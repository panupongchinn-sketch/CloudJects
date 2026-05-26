
-- Replace old documents table (empty) with new schema
DROP TABLE IF EXISTS public.documents CASCADE;

-- Enums
DO $$ BEGIN
  CREATE TYPE public.document_status AS ENUM (
    'Draft','Submitted','Waiting Review','Waiting Approval',
    'Approved','Rejected','Revision Required','Archived','Cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.document_approval_status AS ENUM (
    'Pending','Reviewing','Approved','Rejected','Revision Required','Cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);
CREATE INDEX idx_doc_cat_org ON public.document_categories(organization_id);

CREATE TABLE public.document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  category_id uuid REFERENCES public.document_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text NOT NULL,
  requires_approval boolean NOT NULL DEFAULT false,
  allow_client_view boolean NOT NULL DEFAULT false,
  is_confidential boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);
CREATE INDEX idx_doc_types_org ON public.document_types(organization_id);
CREATE INDEX idx_doc_types_cat ON public.document_types(category_id);

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id uuid,
  report_id uuid,
  document_type_id uuid REFERENCES public.document_types(id) ON DELETE SET NULL,
  document_category_id uuid REFERENCES public.document_categories(id) ON DELETE SET NULL,
  document_no text,
  document_name text NOT NULL,
  description text,
  status public.document_status NOT NULL DEFAULT 'Draft',
  current_version_id uuid,
  is_confidential boolean NOT NULL DEFAULT false,
  share_to_client boolean NOT NULL DEFAULT false,
  tags text[],
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  rejected_reason text,
  revision_note text,
  expiry_date date,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_org ON public.documents(organization_id);
CREATE INDEX idx_documents_project ON public.documents(project_id);
CREATE INDEX idx_documents_task ON public.documents(task_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_type ON public.documents(document_type_id);
CREATE INDEX idx_documents_category ON public.documents(document_category_id);
CREATE INDEX idx_documents_created ON public.documents(created_at DESC);
CREATE INDEX idx_documents_no ON public.documents(document_no);
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  version_no text NOT NULL,
  file_name text NOT NULL,
  file_url text,
  file_path text NOT NULL,
  file_type text,
  file_extension text,
  file_size numeric NOT NULL DEFAULT 0,
  change_note text,
  status public.document_status NOT NULL DEFAULT 'Draft',
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_versions_doc ON public.document_versions(document_id);
CREATE INDEX idx_doc_versions_org ON public.document_versions(organization_id);
CREATE INDEX idx_doc_versions_current ON public.document_versions(is_current);

ALTER TABLE public.documents
  ADD CONSTRAINT fk_documents_current_version
  FOREIGN KEY (current_version_id) REFERENCES public.document_versions(id) ON DELETE SET NULL;

CREATE TABLE public.document_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  document_version_id uuid REFERENCES public.document_versions(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  status public.document_approval_status NOT NULL DEFAULT 'Pending',
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  rejected_reason text,
  revision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_appr_org ON public.document_approvals(organization_id);
CREATE INDEX idx_doc_appr_doc ON public.document_approvals(document_id);
CREATE INDEX idx_doc_appr_status ON public.document_approvals(status);
CREATE TRIGGER trg_doc_appr_updated BEFORE UPDATE ON public.document_approvals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.document_approval_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  approval_id uuid REFERENCES public.document_approvals(id) ON DELETE SET NULL,
  action text NOT NULL,
  old_status text,
  new_status text,
  comment text,
  acted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  acted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_appr_log_doc ON public.document_approval_logs(document_id);
CREATE INDEX idx_doc_appr_log_org ON public.document_approval_logs(organization_id);

CREATE TABLE public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  template_type text,
  fields_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  requires_approval boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);
CREATE INDEX idx_doc_tpl_org ON public.document_templates(organization_id);
CREATE TRIGGER trg_doc_tpl_updated BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.document_templates(id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  generated_type text NOT NULL,
  file_url text,
  file_path text,
  generated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_gen_doc_org ON public.generated_documents(organization_id);
CREATE INDEX idx_gen_doc_project ON public.generated_documents(project_id);

CREATE TABLE public.document_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  shared_with_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with_role text,
  can_view boolean NOT NULL DEFAULT true,
  can_download boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  shared_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_shares_doc ON public.document_shares(document_id);
CREATE INDEX idx_doc_shares_user ON public.document_shares(shared_with_user_id);
CREATE INDEX idx_doc_shares_org ON public.document_shares(organization_id);

CREATE TABLE public.document_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  document_version_id uuid REFERENCES public.document_versions(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  detail_json jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_audit_org ON public.document_audit_logs(organization_id);
CREATE INDEX idx_doc_audit_doc ON public.document_audit_logs(document_id);
CREATE INDEX idx_doc_audit_user ON public.document_audit_logs(user_id);
CREATE INDEX idx_doc_audit_created ON public.document_audit_logs(created_at DESC);

-- Helper functions
CREATE OR REPLACE FUNCTION public.can_view_document(_document_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = _document_id
      AND (
        public.is_platform_admin(_user_id)
        OR (
          public.same_organization(d.organization_id, _user_id)
          AND (
            public.is_admin(_user_id)
            OR (d.project_id IS NOT NULL AND public.is_project_member(d.project_id, _user_id))
            OR d.created_by = _user_id
            OR d.share_to_client = true
            OR EXISTS (SELECT 1 FROM public.document_shares s WHERE s.document_id = d.id AND s.shared_with_user_id = _user_id)
          )
          AND (
            d.is_confidential = false
            OR public.is_admin(_user_id)
            OR EXISTS (SELECT 1 FROM public.document_shares s WHERE s.document_id = d.id AND s.shared_with_user_id = _user_id)
          )
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_upload_document(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _project_id IS NULL
      OR public.is_admin(_user_id)
      OR public.is_project_member(_project_id, _user_id)
$$;

CREATE OR REPLACE FUNCTION public.can_update_document(_document_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = _document_id
      AND public.same_organization(d.organization_id, _user_id)
      AND (
        public.is_admin(_user_id)
        OR (d.created_by = _user_id AND d.status::text IN ('Draft','Revision Required','Rejected'))
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_delete_document(_document_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = _document_id
      AND public.same_organization(d.organization_id, _user_id)
      AND d.status = 'Draft'
      AND (d.created_by = _user_id OR public.is_admin(_user_id))
  )
$$;

CREATE OR REPLACE FUNCTION public.can_approve_document(_document_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = _document_id
      AND public.same_organization(d.organization_id, _user_id)
      AND public.can_manage_project(_user_id)
  )
$$;

-- Enable RLS
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_approval_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Org read categories" ON public.document_categories FOR SELECT TO authenticated
  USING (same_organization(organization_id, auth.uid()) OR is_platform_admin(auth.uid()));
CREATE POLICY "Admin manage categories" ON public.document_categories FOR ALL TO authenticated
  USING (same_organization(organization_id, auth.uid()) AND is_admin(auth.uid()))
  WITH CHECK (same_organization(organization_id, auth.uid()) AND is_admin(auth.uid()));
CREATE POLICY "Platform admin manage categories" ON public.document_categories FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Org read types" ON public.document_types FOR SELECT TO authenticated
  USING (same_organization(organization_id, auth.uid()) OR is_platform_admin(auth.uid()));
CREATE POLICY "Admin manage types" ON public.document_types FOR ALL TO authenticated
  USING (same_organization(organization_id, auth.uid()) AND is_admin(auth.uid()))
  WITH CHECK (same_organization(organization_id, auth.uid()) AND is_admin(auth.uid()));
CREATE POLICY "Platform admin manage types" ON public.document_types FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Read documents" ON public.documents FOR SELECT TO authenticated
  USING (can_view_document(id, auth.uid()));
CREATE POLICY "Insert documents" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    same_organization(organization_id, auth.uid())
    AND can_upload_document(project_id, auth.uid())
    AND created_by = auth.uid()
  );
CREATE POLICY "Update documents" ON public.documents FOR UPDATE TO authenticated
  USING (can_update_document(id, auth.uid()) OR can_approve_document(id, auth.uid()))
  WITH CHECK (same_organization(organization_id, auth.uid()));
CREATE POLICY "Delete documents" ON public.documents FOR DELETE TO authenticated
  USING (can_delete_document(id, auth.uid()));

CREATE POLICY "Read versions" ON public.document_versions FOR SELECT TO authenticated
  USING (can_view_document(document_id, auth.uid()));
CREATE POLICY "Insert versions" ON public.document_versions FOR INSERT TO authenticated
  WITH CHECK (
    same_organization(organization_id, auth.uid())
    AND EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id
      AND (can_update_document(d.id, auth.uid()) OR d.created_by = auth.uid() OR is_admin(auth.uid())))
  );
CREATE POLICY "Update versions" ON public.document_versions FOR UPDATE TO authenticated
  USING (
    same_organization(organization_id, auth.uid())
    AND (is_admin(auth.uid()) OR uploaded_by = auth.uid())
    AND status NOT IN ('Approved')
  )
  WITH CHECK (same_organization(organization_id, auth.uid()));

CREATE POLICY "Read approvals" ON public.document_approvals FOR SELECT TO authenticated
  USING (can_view_document(document_id, auth.uid()));
CREATE POLICY "Insert approvals" ON public.document_approvals FOR INSERT TO authenticated
  WITH CHECK (
    same_organization(organization_id, auth.uid())
    AND requested_by = auth.uid()
    AND can_view_document(document_id, auth.uid())
  );
CREATE POLICY "Update approvals" ON public.document_approvals FOR UPDATE TO authenticated
  USING (
    same_organization(organization_id, auth.uid())
    AND (can_approve_document(document_id, auth.uid()) OR requested_by = auth.uid())
  )
  WITH CHECK (same_organization(organization_id, auth.uid()));

CREATE POLICY "Read approval logs" ON public.document_approval_logs FOR SELECT TO authenticated
  USING (can_view_document(document_id, auth.uid()) OR is_platform_admin(auth.uid()));
CREATE POLICY "Insert approval logs" ON public.document_approval_logs FOR INSERT TO authenticated
  WITH CHECK (same_organization(organization_id, auth.uid()) AND acted_by = auth.uid());

CREATE POLICY "Read templates" ON public.document_templates FOR SELECT TO authenticated
  USING (same_organization(organization_id, auth.uid()) OR is_platform_admin(auth.uid()));
CREATE POLICY "Admin manage templates" ON public.document_templates FOR ALL TO authenticated
  USING (same_organization(organization_id, auth.uid()) AND is_admin(auth.uid()))
  WITH CHECK (same_organization(organization_id, auth.uid()) AND is_admin(auth.uid()));

CREATE POLICY "Read generated" ON public.generated_documents FOR SELECT TO authenticated
  USING (same_organization(organization_id, auth.uid()) OR is_platform_admin(auth.uid()));
CREATE POLICY "Insert generated" ON public.generated_documents FOR INSERT TO authenticated
  WITH CHECK (same_organization(organization_id, auth.uid()) AND generated_by = auth.uid());

CREATE POLICY "Read shares" ON public.document_shares FOR SELECT TO authenticated
  USING (
    same_organization(organization_id, auth.uid())
    AND (shared_with_user_id = auth.uid() OR shared_by = auth.uid() OR is_admin(auth.uid()))
  );
CREATE POLICY "Manage shares" ON public.document_shares FOR ALL TO authenticated
  USING (same_organization(organization_id, auth.uid()) AND (is_admin(auth.uid()) OR shared_by = auth.uid()))
  WITH CHECK (same_organization(organization_id, auth.uid()) AND shared_by = auth.uid());

CREATE POLICY "Admin read audit logs" ON public.document_audit_logs FOR SELECT TO authenticated
  USING ((same_organization(organization_id, auth.uid()) AND is_admin(auth.uid())) OR is_platform_admin(auth.uid()));
CREATE POLICY "Insert audit logs" ON public.document_audit_logs FOR INSERT TO authenticated
  WITH CHECK (same_organization(organization_id, auth.uid()) AND user_id = auth.uid());

-- Storage
INSERT INTO storage.buckets (id, name, public) VALUES
  ('project-documents','project-documents', false),
  ('generated-reports','generated-reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org read project-documents" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND (is_platform_admin(auth.uid()) OR same_organization(((storage.foldername(name))[1])::uuid, auth.uid()))
  );
CREATE POLICY "Org write project-documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-documents'
    AND same_organization(((storage.foldername(name))[1])::uuid, auth.uid())
  );
CREATE POLICY "Org update project-documents" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND same_organization(((storage.foldername(name))[1])::uuid, auth.uid())
  );
CREATE POLICY "Org delete project-documents" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND same_organization(((storage.foldername(name))[1])::uuid, auth.uid())
    AND is_admin(auth.uid())
  );

CREATE POLICY "Org read generated-reports" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'generated-reports'
    AND (is_platform_admin(auth.uid()) OR same_organization(((storage.foldername(name))[1])::uuid, auth.uid()))
  );
CREATE POLICY "Org write generated-reports" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'generated-reports'
    AND same_organization(((storage.foldername(name))[1])::uuid, auth.uid())
  );

-- Seed
DO $$
DECLARE
  default_org uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  cat_pre uuid; cat_progress uuid; cat_inspect uuid;
  cat_approval uuid; cat_finance uuid; cat_closure uuid;
BEGIN
  INSERT INTO public.document_categories (organization_id, name, code, sort_order) VALUES
    (default_org, 'เอกสารก่อนเริ่มโครงการ', 'pre_project', 1) RETURNING id INTO cat_pre;
  INSERT INTO public.document_categories (organization_id, name, code, sort_order) VALUES
    (default_org, 'เอกสารระหว่างดำเนินงาน', 'in_progress', 2) RETURNING id INTO cat_progress;
  INSERT INTO public.document_categories (organization_id, name, code, sort_order) VALUES
    (default_org, 'เอกสารตรวจงาน', 'inspection', 3) RETURNING id INTO cat_inspect;
  INSERT INTO public.document_categories (organization_id, name, code, sort_order) VALUES
    (default_org, 'เอกสารอนุมัติ', 'approval', 4) RETURNING id INTO cat_approval;
  INSERT INTO public.document_categories (organization_id, name, code, sort_order) VALUES
    (default_org, 'เอกสารการเงิน', 'financial', 5) RETURNING id INTO cat_finance;
  INSERT INTO public.document_categories (organization_id, name, code, sort_order) VALUES
    (default_org, 'เอกสารส่งมอบและปิดโครงการ', 'closure', 6) RETURNING id INTO cat_closure;

  INSERT INTO public.document_types (organization_id, category_id, name, code, requires_approval) VALUES
    (default_org, cat_pre, 'Quotation / ใบเสนอราคา', 'quotation', true),
    (default_org, cat_pre, 'Contract / สัญญาจ้าง', 'contract', true),
    (default_org, cat_pre, 'Purchase Order / ใบสั่งซื้อ', 'purchase_order', true),
    (default_org, cat_pre, 'BOQ / รายการปริมาณงาน', 'boq', true),
    (default_org, cat_pre, 'Scope of Work / ขอบเขตงาน', 'scope_of_work', true),
    (default_org, cat_pre, 'Project Plan / แผนงานโครงการ', 'project_plan', false),
    (default_org, cat_pre, 'Drawing / แบบงาน', 'drawing', true),
    (default_org, cat_pre, 'Specification / รายละเอียดสเปก', 'spec', false),
    (default_org, cat_pre, 'Customer Document', 'customer_doc', false),
    (default_org, cat_pre, 'Approval to Start Work', 'start_approval', true);

  INSERT INTO public.document_types (organization_id, category_id, name, code, requires_approval) VALUES
    (default_org, cat_progress, 'Daily Report / รายงานประจำวัน', 'daily_report', true),
    (default_org, cat_progress, 'Weekly Report / รายงานประจำสัปดาห์', 'weekly_report', true),
    (default_org, cat_progress, 'Progress Report / รายงานความคืบหน้า', 'progress_report', true),
    (default_org, cat_progress, 'Site Photo Report', 'photo_report', false),
    (default_org, cat_progress, 'Material Request', 'material_request', true),
    (default_org, cat_progress, 'Material Approval', 'material_approval', true),
    (default_org, cat_progress, 'Change Request', 'change_request', true),
    (default_org, cat_progress, 'Work Instruction', 'work_instruction', false),
    (default_org, cat_progress, 'Meeting Minutes', 'meeting_minutes', false),
    (default_org, cat_progress, 'Issue Report', 'issue_report', false);

  INSERT INTO public.document_types (organization_id, category_id, name, code, requires_approval) VALUES
    (default_org, cat_inspect, 'Inspection Report', 'inspection_report', true),
    (default_org, cat_inspect, 'Quality Checklist', 'quality_checklist', false),
    (default_org, cat_inspect, 'Safety Report', 'safety_report', true),
    (default_org, cat_inspect, 'Safety Checklist', 'safety_checklist', false),
    (default_org, cat_inspect, 'Defect Report', 'defect_report', true),
    (default_org, cat_inspect, 'NCR Report', 'ncr_report', true),
    (default_org, cat_inspect, 'Test Report', 'test_report', false),
    (default_org, cat_inspect, 'Commissioning Report', 'commissioning', true);

  INSERT INTO public.document_types (organization_id, category_id, name, code, requires_approval, is_confidential) VALUES
    (default_org, cat_finance, 'Invoice / ใบแจ้งหนี้', 'invoice', true, true),
    (default_org, cat_finance, 'Receipt / ใบเสร็จรับเงิน', 'receipt', false, true),
    (default_org, cat_finance, 'Payment Record', 'payment_record', false, true),
    (default_org, cat_finance, 'Credit Note / ใบลดหนี้', 'credit_note', true, true),
    (default_org, cat_finance, 'Tax Invoice / ใบกำกับภาษี', 'tax_invoice', false, true),
    (default_org, cat_finance, 'Budget Report', 'budget_report', false, true),
    (default_org, cat_finance, 'Cost Summary', 'cost_summary', false, true),
    (default_org, cat_finance, 'Additional Cost Request', 'add_cost_request', true, true);

  INSERT INTO public.document_types (organization_id, category_id, name, code, requires_approval, allow_client_view) VALUES
    (default_org, cat_closure, 'Handover Document', 'handover', true, true),
    (default_org, cat_closure, 'Completion Report', 'completion_report', true, true),
    (default_org, cat_closure, 'Final Inspection Report', 'final_inspection', true, true),
    (default_org, cat_closure, 'As-built Drawing', 'as_built', true, true),
    (default_org, cat_closure, 'Warranty Document', 'warranty', false, true),
    (default_org, cat_closure, 'Manual Document', 'manual', false, true),
    (default_org, cat_closure, 'Training Document', 'training_doc', false, true),
    (default_org, cat_closure, 'Project Closing Report', 'closing_report', true, false);
END $$;
