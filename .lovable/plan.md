# แผนพัฒนาระบบ Document Management

ระบบนี้มีขนาดใหญ่มาก (8 ตาราง, 20+ หน้า, 25+ components, PDF/Excel generation, Approval workflow, Version control, Audit log, Storage quota). ผมขอแบ่งเป็น **5 Phase** เพื่อให้ส่งมอบทีละส่วนที่ใช้งานได้จริง ไม่ใช่ส่งครึ่งๆ กลางๆ ทั้งระบบ

---

## Phase 1 — Database & Storage Foundation (เริ่มทันที)

**Migration ครั้งเดียว:**
- สร้าง 8 ตาราง: `document_categories`, `document_types`, `documents`, `document_versions`, `document_approvals`, `document_approval_logs`, `document_templates`, `generated_documents`, `document_shares`, `document_audit_logs`
- Indexes ทั้งหมดตามสเปก §37
- RLS Policies + Helper functions: `can_view_document`, `can_upload_document`, `can_update_document`, `can_delete_document`, `can_approve_document`, `can_download_document`, `can_share_document`, `can_view_confidential_document`
- Storage buckets: `project-documents` (private), `generated-reports` (private) + Storage RLS ตาม org_id ใน path
- Seed: Document Categories 6 กลุ่ม + Document Types ตาม §25 (ผูกกับ default org)

## Phase 2 — Core Document Pages (UI + CRUD จริง)

- หน้า `/documents` — Table/Card/Folder view, search, 7 filters, sort, action menu
- หน้า `/projects/$projectId/documents` — แยกหมวด + Summary Cards 6 ใบ
- เพิ่ม Tab "Documents" ในหน้า Project Detail (มีอยู่แล้ว — ขยาย)
- เพิ่มเมนูใน Sidebar: Documents (+ sub menu 9 รายการตาม §24)
- Components: `DocumentTable`, `DocumentCard`, `DocumentStatusBadge`, `DocumentTypeBadge`, `DocumentSearchFilter`, `DocumentCategoryFilter`, `DocumentActionMenu`
- Upload Modal: drag-drop, progress bar, validate file type/size, เช็ค storage quota ก่อน upload
- Preview Modal: PDF/รูป preview ใน modal, อื่นๆ แสดง file info + download
- Detail Drawer แสดงข้อมูล document เต็ม

## Phase 3 — Version Control & Approval Workflow

- `DocumentVersionHistory` component — แสดง version, uploader, date, status, change note
- Upload New Version flow — ระบบ auto bump v1.0 → v1.1 / v2.0
- Lock approved version, ห้ามแก้
- Approval workflow: Submit → Review → Approve / Reject (บังคับ reason) / Revision (บังคับ note)
- `DocumentApprovalPanel`, `DocumentRejectModal`, `DocumentRevisionModal`
- เขียน approval_logs ทุก transition
- ผูกกับเมนู `/approvals` ที่มีอยู่
- Notifications: insert ลง `notifications` table ทุก event ตาม §42

## Phase 4 — Document Generation & Export

- PDF generation: Daily Report (เริ่มก่อน), Progress Report, Photo Report ตาม §33
  - ใช้ `@react-pdf/renderer` (Worker-compatible)
  - มี Logo, ชื่อบริษัท, โปรเจค, เลขเอกสาร, ลายเซ็น, footer
- Excel export: Project list, Task list, Document list (`xlsx` package)
- หน้า `/documents/templates` — list + builder เบื้องต้น (field-based, JSON config)
- บันทึกผลลง `generated_documents` + อัปโหลด Storage

## Phase 5 — Audit, Share, Permissions, Polish

- Audit log ทุก action (view/upload/download/approve/reject/delete/share)
- `DocumentAuditLog` component
- `DocumentShareModal` — share เอกสารให้ user/role + expiry
- เช็ค Package limit (storage, custom template, advanced approval) ก่อนใช้งาน → Upgrade modal
- Dashboard widgets: Document Summary (Company + Project + Platform Admin)
- Mobile responsive ทุกหน้า (Table → Card List, ปุ่ม upload ใหญ่, รองรับกล้องมือถือ)
- Expiring document alerts

---

## Technical notes (สำหรับผม)

- ใช้ `createServerFn` + `requireSupabaseAuth` ทุก mutation (upload, approve, generate PDF)
- Storage path: `{org_id}/{project_id}/{document_id}/{version}/{filename}` ตาม §35
- Signed URL เท่านั้นสำหรับ preview/download
- ธีมสี: ขาว/แดง/เทา ตาม §44 — สีแดงเฉพาะ primary button, reject status, active menu
- ใช้ semantic tokens จาก `src/styles.css` (มี --primary แดงอยู่แล้ว)

---

## ขอ Confirm ก่อนเริ่ม

ขอให้ยืนยันว่า:

1. **เริ่ม Phase 1 (Database + Storage + RLS + Seed) ก่อนเลยใช่ไหม?** — เป็น migration ใหญ่ก้อนเดียว ต้องอนุมัติ
2. หลัง Phase 1 ผ่าน ให้ทำต่อ Phase 2-5 ตามลำดับโดยไม่ต้องถามอีก หรือจะให้หยุดถามทุก phase?
3. **PDF library**: ใช้ `@react-pdf/renderer` (รัน server-side ใน Worker ได้) — โอเคไหม?

ถ้าตอบ "เริ่ม Phase 1" หรือ "ทำตามแผน" ผมจะลุยทันที