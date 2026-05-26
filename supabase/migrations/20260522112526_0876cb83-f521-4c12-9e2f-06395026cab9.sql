ALTER TABLE public.document_templates
  ADD COLUMN IF NOT EXISTS body_html text,
  ADD COLUMN IF NOT EXISTS document_category_id uuid,
  ADD COLUMN IF NOT EXISTS document_type_id uuid,
  ADD COLUMN IF NOT EXISTS paper_size text NOT NULL DEFAULT 'A4',
  ADD COLUMN IF NOT EXISTS orientation text NOT NULL DEFAULT 'portrait';