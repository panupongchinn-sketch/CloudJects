import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { uploadNewVersion } from "@/lib/documents.functions";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documentId: string;
  projectId?: string | null;
  currentVersionNo?: string | null;
}

function bumpVersion(v?: string | null): string {
  if (!v) return "1.0";
  const m = v.match(/^(\d+)\.(\d+)$/);
  if (!m) return "2.0";
  const minor = parseInt(m[2], 10) + 1;
  return `${m[1]}.${minor}`;
}

export function NewVersionDialog({ open, onOpenChange, documentId, projectId, currentVersionNo }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const uploadFn = useServerFn(uploadNewVersion);

  const [file, setFile] = useState<File | null>(null);
  const [versionNo, setVersionNo] = useState("");
  const [changeNote, setChangeNote] = useState("");

  useEffect(() => {
    if (open) {
      setVersionNo(bumpVersion(currentVersionNo));
      setFile(null); setChangeNote("");
    }
  }, [open, currentVersionNo]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("กรุณาเลือกไฟล์");
      if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
      const { data: prof, error: pe } = await supabase
        .from("profiles").select("organization_id").eq("id", user.id).single();
      if (pe || !prof) throw new Error("ไม่พบโปรไฟล์");

      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
      const path = `${prof.organization_id}/${projectId ?? "general"}/${documentId}/${versionNo}/${safeName}`;

      const { error: ue } = await supabase.storage
        .from("project-documents")
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (ue) throw new Error(ue.message);

      try {
        await uploadFn({
          data: {
            documentId, versionNo,
            changeNote: changeNote || null,
            filePath: path, fileName: file.name,
            fileSize: file.size, fileType: file.type || null,
            fileExtension: ext || null,
          },
        });
      } catch (e) {
        await supabase.storage.from("project-documents").remove([path]);
        throw e;
      }
    },
    onSuccess: () => {
      toast.success("อัปโหลดเวอร์ชันใหม่สำเร็จ");
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["doc-versions", documentId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || "อัปโหลดไม่สำเร็จ"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>อัปโหลดเวอร์ชันใหม่</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>ไฟล์</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && (
              <p className="text-xs text-muted-foreground mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>
          <div>
            <Label>หมายเลขเวอร์ชัน</Label>
            <Input value={versionNo} onChange={(e) => setVersionNo(e.target.value)} placeholder="1.1" />
            {currentVersionNo && (
              <p className="text-xs text-muted-foreground mt-1">ปัจจุบัน: v{currentVersionNo}</p>
            )}
          </div>
          <div>
            <Label>หมายเหตุการเปลี่ยนแปลง</Label>
            <Textarea rows={3} value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder="อธิบายว่ามีการแก้ไขอะไรบ้าง..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mut.isPending}>ยกเลิก</Button>
          <Button onClick={() => mut.mutate()} disabled={!file || !versionNo || mut.isPending}>
            {mut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            อัปโหลด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
