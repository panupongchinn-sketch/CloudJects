import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listVersions, listApprovalHistory, createSignedUrl } from "@/lib/documents.functions";
import { Download, Eye, CheckCircle2, Clock, FileText, Send, XCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documentId: string;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Draft: "bg-secondary text-foreground",
    "Waiting Approval": "bg-amber-100 text-amber-700",
    Approved: "bg-emerald-100 text-emerald-700",
    Rejected: "bg-primary/10 text-primary",
    "Revision Required": "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${map[status] || "bg-secondary"}`}>
      {status}
    </span>
  );
}

function actionIcon(action: string) {
  if (action === "approve") return CheckCircle2;
  if (action === "reject") return XCircle;
  if (action === "request_revision") return RotateCcw;
  if (action === "submit_for_approval") return Send;
  return Clock;
}

export function VersionHistoryDialog({ open, onOpenChange, documentId }: Props) {
  const loadVersions = useServerFn(listVersions);
  const loadHistory = useServerFn(listApprovalHistory);
  const signUrl = useServerFn(createSignedUrl);

  const { data: versions = [], isLoading: lv } = useQuery({
    queryKey: ["doc-versions", documentId],
    queryFn: () => loadVersions({ data: { documentId } }),
    enabled: open,
  });
  const { data: history = [], isLoading: lh } = useQuery({
    queryKey: ["doc-history", documentId],
    queryFn: () => loadHistory({ data: { documentId } }),
    enabled: open,
  });

  async function open_(versionId: string, download = false) {
    try {
      const { url } = await signUrl({ data: { versionId, download } });
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e?.message || "เปิดไม่สำเร็จ");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ประวัติเอกสาร</DialogTitle>
        </DialogHeader>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">เวอร์ชัน</h3>
          {lv && <p className="text-sm text-muted-foreground">กำลังโหลด...</p>}
          {!lv && versions.length === 0 && <p className="text-sm text-muted-foreground">ไม่มีเวอร์ชัน</p>}
          <ul className="divide-y divide-border rounded-md border border-border">
            {versions.map((v: any) => (
              <li key={v.id} className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-primary-soft text-primary grid place-items-center">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium flex items-center gap-2">
                    v{v.version_no}
                    {v.is_current && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground">CURRENT</span>}
                    <StatusPill status={v.status} />
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {v.file_name} · {(Number(v.file_size) / 1024 / 1024).toFixed(2)} MB · {v.uploader?.full_name || v.uploader?.email || "—"}
                  </div>
                  {v.change_note && <div className="text-xs text-muted-foreground mt-0.5">📝 {v.change_note}</div>}
                </div>
                <div className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {new Date(v.uploaded_at).toLocaleDateString("th-TH")}
                </div>
                <Button variant="ghost" size="icon" onClick={() => open_(v.id, false)}><Eye className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => open_(v.id, true)}><Download className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3 mt-4">
          <h3 className="text-sm font-semibold">ประวัติอนุมัติ</h3>
          {lh && <p className="text-sm text-muted-foreground">กำลังโหลด...</p>}
          {!lh && history.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีประวัติ</p>}
          <ul className="space-y-2">
            {history.map((h: any) => {
              const Icon = actionIcon(h.action);
              return (
                <li key={h.id} className="flex items-start gap-3 p-3 rounded-md border border-border">
                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{h.action} → {h.new_status || "—"}</div>
                    <div className="text-xs text-muted-foreground">{h.actor?.full_name || h.actor?.email || "—"} · {new Date(h.acted_at).toLocaleString("th-TH")}</div>
                    {h.comment && <div className="text-xs mt-1">{h.comment}</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </DialogContent>
    </Dialog>
  );
}
