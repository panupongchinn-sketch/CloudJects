import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Upload, FileText, FileSpreadsheet, FileImage, Download, Eye, Search,
  CheckCircle2, XCircle, Clock, Send, MoreVertical, Trash2, History, FilePlus, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UploadDocumentDialog } from "./upload-dialog";
import { NewVersionDialog } from "./new-version-dialog";
import { VersionHistoryDialog } from "./version-history-dialog";
import { ReasonDialog } from "./reason-dialog";
import {
  listDocuments,
  createSignedUrl,
  submitForApproval,
  decideApproval,
  requestRevision,
  archiveDocument,
  listCategoriesAndTypes,
} from "@/lib/documents.functions";

function iconFor(ext?: string | null) {
  const e = (ext || "").toLowerCase();
  if (["xlsx", "xls", "csv"].includes(e)) return FileSpreadsheet;
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(e)) return FileImage;
  return FileText;
}

function formatSize(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const STATUS_META: Record<string, { label: string; cls: string; Icon: any }> = {
  Draft: { label: "ฉบับร่าง", cls: "bg-secondary text-foreground", Icon: FileText },
  "Waiting Approval": { label: "รออนุมัติ", cls: "bg-amber-100 text-amber-700", Icon: Clock },
  Submitted: { label: "ส่งแล้ว", cls: "bg-amber-100 text-amber-700", Icon: Clock },
  Approved: { label: "อนุมัติ", cls: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  Rejected: { label: "ตีกลับ", cls: "bg-primary/10 text-primary", Icon: XCircle },
  "Revision Required": { label: "ต้องแก้ไข", cls: "bg-amber-100 text-amber-700", Icon: RotateCcw },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] || STATUS_META.Draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${m.cls}`}>
      <m.Icon className="h-3 w-3" /> {m.label}
    </span>
  );
}

interface Props {
  projectId?: string;
  showProjectColumn?: boolean;
}

export function DocumentList({ projectId, showProjectColumn }: Props) {
  const qc = useQueryClient();
  const loadDocs = useServerFn(listDocuments);
  const loadMeta = useServerFn(listCategoriesAndTypes);
  const signUrl = useServerFn(createSignedUrl);
  const submit = useServerFn(submitForApproval);
  const decide = useServerFn(decideApproval);
  const revise = useServerFn(requestRevision);
  const archive = useServerFn(archiveDocument);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<any>(null);
  const [versionOpen, setVersionOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);

  const queryKey = ["documents", { projectId: projectId ?? null, search, categoryId, status }];
  const { data: docs = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => loadDocs({ data: {
      projectId,
      search: search || undefined,
      categoryId: categoryId || undefined,
      status: status || undefined,
    } }),
  });

  const { data: meta } = useQuery({
    queryKey: ["doc-meta"],
    queryFn: () => loadMeta({}),
  });

  // Realtime: refresh on any document change
  useEffect(() => {
    const ch = supabase
      .channel(`documents-rt-${projectId ?? "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" },
        () => qc.invalidateQueries({ queryKey: ["documents"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "document_approvals" },
        () => qc.invalidateQueries({ queryKey: ["documents"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [projectId, qc]);

  async function openFile(versionId: string, download = false) {
    try {
      const { url } = await signUrl({ data: { versionId, download } });
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e?.message || "ไม่สามารถเปิดไฟล์");
    }
  }

  const submitMut = useMutation({
    mutationFn: (documentId: string) => submit({ data: { documentId } }),
    onSuccess: () => { toast.success("ส่งขออนุมัติแล้ว"); qc.invalidateQueries({ queryKey: ["documents"] }); },
    onError: (e: any) => toast.error(e?.message || "ส่งขออนุมัติไม่สำเร็จ"),
  });
  const archiveMut = useMutation({
    mutationFn: (documentId: string) => archive({ data: { documentId } }),
    onSuccess: () => { toast.success("ลบเอกสารแล้ว"); qc.invalidateQueries({ queryKey: ["documents"] }); },
    onError: (e: any) => toast.error(e?.message || "ลบไม่สำเร็จ"),
  });

  return (
    <section className="space-y-4">
      <div className="card-surface p-3 lg:p-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center h-10 flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 text-sm">
          <Search className="h-4 w-4 mr-2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเอกสาร..."
            className="flex-1 bg-transparent outline-none"
          />
        </div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-10 px-3 rounded-lg border border-border bg-background text-sm"
        >
          <option value="">ทุกหมวด</option>
          {(meta?.categories ?? []).map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 px-3 rounded-lg border border-border bg-background text-sm"
        >
          <option value="">ทุกสถานะ</option>
          <option value="Draft">ฉบับร่าง</option>
          <option value="Waiting Approval">รออนุมัติ</option>
          <option value="Approved">อนุมัติแล้ว</option>
          <option value="Rejected">ตีกลับ</option>
          <option value="Revision Required">ต้องแก้ไข</option>
        </select>
        <Button variant="outline" asChild>
          <a href={projectId ? `/templates?projectId=${projectId}` : "/templates"}>
            <FilePlus className="h-4 w-4 mr-1.5" /> สร้างจาก Template
          </a>
        </Button>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-1.5" /> อัปโหลด
        </Button>
      </div>

      <div className="card-surface overflow-hidden p-0">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">ชื่อเอกสาร</th>
                {showProjectColumn && <th className="text-left font-medium px-4 py-3">โครงการ</th>}
                <th className="text-left font-medium px-4 py-3">สถานะ</th>
                <th className="text-left font-medium px-4 py-3">Version</th>
                <th className="text-left font-medium px-4 py-3">ขนาด</th>
                <th className="text-left font-medium px-4 py-3">ผู้อัปโหลด</th>
                <th className="text-left font-medium px-4 py-3">อัปเดต</th>
                <th className="text-right font-medium px-4 py-3">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={showProjectColumn ? 8 : 7} className="px-4 py-8 text-center text-muted-foreground">กำลังโหลด...</td></tr>
              )}
              {!isLoading && docs.length === 0 && (
                <tr><td colSpan={showProjectColumn ? 8 : 7} className="px-4 py-8 text-center text-muted-foreground">ยังไม่มีเอกสาร</td></tr>
              )}
              {docs.map((d: any) => {
                const Icon = iconFor(d.version?.file_extension);
                return (
                  <tr key={d.id} className="hover:bg-accent/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-md bg-primary-soft text-primary grid place-items-center">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{d.document_name}</div>
                          {d.document_no && <div className="text-[11px] text-muted-foreground">{d.document_no}</div>}
                        </div>
                      </div>
                    </td>
                    {showProjectColumn && (
                      <td className="px-4 py-3 text-muted-foreground">{d.project?.name || "—"}</td>
                    )}
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 font-mono text-xs">{d.version?.version_no ? `v${d.version.version_no}` : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatSize(Number(d.version?.file_size) || 0)}</td>
                    <td className="px-4 py-3">{d.uploader?.full_name || d.uploader?.email || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{new Date(d.updated_at).toLocaleDateString("th-TH")}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" disabled={!d.version} onClick={() => d.version && openFile(d.version.id, false)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled={!d.version} onClick={() => d.version && openFile(d.version.id, true)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setActiveDoc(d); setHistoryOpen(true); }}>
                              <History className="h-4 w-4 mr-2" /> ดูเวอร์ชัน / ประวัติ
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setActiveDoc(d); setVersionOpen(true); }}>
                              <FilePlus className="h-4 w-4 mr-2" /> อัปโหลดเวอร์ชันใหม่
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {(d.status === "Draft" || d.status === "Revision Required" || d.status === "Rejected") && (
                              <DropdownMenuItem onClick={() => submitMut.mutate(d.id)}>
                                <Send className="h-4 w-4 mr-2" /> ส่งขออนุมัติ
                              </DropdownMenuItem>
                            )}
                            {(d.status === "Waiting Approval" || d.status === "Submitted") && (
                              <>
                                <DropdownMenuItem onClick={() => { setActiveDoc(d); decideQuick(d.id, true); }}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" /> อนุมัติ
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setActiveDoc(d); setReviseOpen(true); }}>
                                  <RotateCcw className="h-4 w-4 mr-2" /> ขอให้แก้ไข
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setActiveDoc(d); setRejectOpen(true); }}>
                                  <XCircle className="h-4 w-4 mr-2" /> ตีกลับ
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-primary"
                              onClick={() => {
                                if (window.confirm("ลบเอกสารนี้?")) archiveMut.mutate(d.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> ลบ
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ul className="md:hidden divide-y divide-border">
          {isLoading && <li className="p-6 text-center text-sm text-muted-foreground">กำลังโหลด...</li>}
          {!isLoading && docs.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">ยังไม่มีเอกสาร</li>}
          {docs.map((d: any) => {
            const Icon = iconFor(d.version?.file_extension);
            return (
              <li key={d.id} className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-primary-soft text-primary grid place-items-center">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{d.document_name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <StatusBadge status={d.status} />
                    <span>· {d.version?.version_no ? `v${d.version.version_no}` : "—"}</span>
                  </div>
                </div>
                <Button variant="outline" size="icon" onClick={() => { setActiveDoc(d); setHistoryOpen(true); }}>
                  <History className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" disabled={!d.version} onClick={() => d.version && openFile(d.version.id, true)}>
                  <Download className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      </div>

      <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} projectId={projectId} />

      {activeDoc && (
        <>
          <VersionHistoryDialog
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            documentId={activeDoc.id}
          />
          <NewVersionDialog
            open={versionOpen}
            onOpenChange={setVersionOpen}
            documentId={activeDoc.id}
            projectId={activeDoc.project_id}
            currentVersionNo={activeDoc.version?.version_no}
          />
          <ReasonDialog
            open={rejectOpen}
            onOpenChange={setRejectOpen}
            title="ตีกลับเอกสาร"
            description="ระบุเหตุผลที่ตีกลับเอกสารนี้"
            confirmLabel="ตีกลับ"
            confirmVariant="destructive"
            onConfirm={async (reason) => {
              try {
                await decide({ data: { documentId: activeDoc.id, approve: false, reason } });
                toast.success("ตีกลับเอกสารแล้ว");
                qc.invalidateQueries({ queryKey: ["documents"] });
              } catch (e: any) { toast.error(e?.message || "ไม่สำเร็จ"); }
            }}
          />
          <ReasonDialog
            open={reviseOpen}
            onOpenChange={setReviseOpen}
            title="ขอให้แก้ไขเอกสาร"
            description="ระบุสิ่งที่ต้องการให้แก้ไข"
            confirmLabel="ส่งคำขอแก้ไข"
            onConfirm={async (reason) => {
              try {
                await revise({ data: { documentId: activeDoc.id, reason } });
                toast.success("ส่งคำขอให้แก้ไขแล้ว");
                qc.invalidateQueries({ queryKey: ["documents"] });
              } catch (e: any) { toast.error(e?.message || "ไม่สำเร็จ"); }
            }}
          />
        </>
      )}
    </section>
  );

  async function decideQuick(documentId: string, approve: boolean) {
    try {
      await decide({ data: { documentId, approve } });
      toast.success(approve ? "อนุมัติแล้ว" : "บันทึกแล้ว");
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (e: any) { toast.error(e?.message || "ไม่สำเร็จ"); }
  }
}
