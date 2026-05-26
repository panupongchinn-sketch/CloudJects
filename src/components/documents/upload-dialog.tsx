import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import {
  listCategoriesAndTypes,
  createDocumentWithVersion,
} from "@/lib/documents.functions";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId?: string | null;
}

export function UploadDocumentDialog({ open, onOpenChange, projectId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const loadMeta = useServerFn(listCategoriesAndTypes);
  const createDoc = useServerFn(createDocumentWithVersion);

  const { data: meta } = useQuery({
    queryKey: ["doc-meta"],
    queryFn: () => loadMeta({}),
    enabled: open,
  });

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [docNo, setDocNo] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [typeId, setTypeId] = useState<string>("");
  const [isConfidential, setIsConfidential] = useState(false);
  const [shareToClient, setShareToClient] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null); setName(""); setDocNo(""); setDescription("");
      setCategoryId(""); setTypeId(""); setIsConfidential(false); setShareToClient(false);
    }
  }, [open]);

  const filteredTypes = (meta?.types ?? []).filter(
    (t: any) => !categoryId || t.category_id === categoryId,
  );

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("กรุณาเลือกไฟล์");
      if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
      const docName = name.trim() || file.name;

      const { data: prof, error: pe } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      if (pe || !prof) throw new Error("ไม่พบโปรไฟล์ผู้ใช้");

      const documentId = crypto.randomUUID();
      const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const pathProjectId = projectId ?? "general";
      const filePath = `${prof.organization_id}/${pathProjectId}/${documentId}/1.0/${safeName}`;

      const { error: ue } = await supabase.storage
        .from("project-documents")
        .upload(filePath, file, { upsert: false, contentType: file.type || undefined });
      if (ue) throw new Error(ue.message);

      try {
        await createDoc({
          data: {
            documentId,
            projectId: projectId ?? null,
            documentName: docName,
            documentNo: docNo || null,
            description: description || null,
            categoryId: categoryId || null,
            typeId: typeId || null,
            isConfidential,
            shareToClient,
            filePath,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || null,
            fileExtension: ext || null,
          },
        });
      } catch (e) {
        // rollback storage if metadata insert failed
        await supabase.storage.from("project-documents").remove([filePath]);
        throw e;
      }
    },
    onSuccess: () => {
      toast.success("อัปโหลดเอกสารสำเร็จ");
      qc.invalidateQueries({ queryKey: ["documents"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || "อัปโหลดไม่สำเร็จ"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>อัปโหลดเอกสาร</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>ไฟล์</Label>
            <Input
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !name) setName(f.name.replace(/\.[^.]+$/, ""));
              }}
            />
            {file && (
              <p className="text-xs text-muted-foreground mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || "ไม่ทราบประเภท"}
              </p>
            )}
          </div>
          <div>
            <Label>ชื่อเอกสาร *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น สัญญาก่อสร้างหลัก" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>เลขที่เอกสาร</Label>
              <Input value={docNo} onChange={(e) => setDocNo(e.target.value)} placeholder="DOC-001" />
            </div>
            <div>
              <Label>หมวด</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={categoryId}
                onChange={(e) => { setCategoryId(e.target.value); setTypeId(""); }}
              >
                <option value="">— เลือก —</option>
                {(meta?.categories ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label>ประเภทเอกสาร</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
            >
              <option value="">— เลือก —</option>
              {filteredTypes.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>รายละเอียด</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="text-sm">เอกสารลับ (Confidential)</div>
            <Switch checked={isConfidential} onCheckedChange={setIsConfidential} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="text-sm">แชร์ให้ลูกค้าเห็น</div>
            <Switch checked={shareToClient} onCheckedChange={setShareToClient} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={upload.isPending}>
            ยกเลิก
          </Button>
          <Button onClick={() => upload.mutate()} disabled={!file || upload.isPending}>
            {upload.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            อัปโหลด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
