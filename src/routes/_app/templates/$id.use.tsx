import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getTemplate } from "@/lib/templates.functions";
import {
  createDocumentWithVersion,
  submitForApproval,
} from "@/lib/documents.functions";
import {
  defaultBodyHtml,
  htmlToPdfBlob,
  renderTemplate,
  type TemplateField,
} from "@/lib/template-render";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileDown, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/templates/$id/use")({
  component: UseTemplatePage,
  validateSearch: (s: Record<string, unknown>) => ({
    projectId: typeof s.projectId === "string" ? s.projectId : undefined,
  }),
});

function UseTemplatePage() {
  const { id } = Route.useParams();
  const { projectId } = Route.useSearch();
  const nav = useNavigate();
  const { user } = useAuth();

  const load = useServerFn(getTemplate);
  const createDoc = useServerFn(createDocumentWithVersion);
  const submit = useServerFn(submitForApproval);

  const { data, isLoading } = useQuery({
    queryKey: ["template", id],
    queryFn: () => load({ data: { id } }),
  });

  const tpl = data?.template;
  const fields: TemplateField[] = useMemo(
    () => (Array.isArray(tpl?.fields_json) ? tpl!.fields_json : []),
    [tpl],
  );

  const [values, setValues] = useState<Record<string, any>>({});
  const [docName, setDocName] = useState("");
  const [docNo, setDocNo] = useState("");
  const [submitAfter, setSubmitAfter] = useState(false);

  useEffect(() => {
    if (!tpl) return;
    setDocName(`${tpl.name} - ${new Date().toLocaleDateString("th-TH")}`);
    const init: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.type === "table") init[f.key] = [];
      else init[f.key] = "";
    });
    setValues(init);
  }, [tpl, fields]);

  const previewHtml = useMemo(() => {
    if (!tpl) return "";
    return renderTemplate(
      tpl.body_html || defaultBodyHtml(fields),
      fields,
      values,
    );
  }, [tpl, fields, values]);

  const set = (k: string, v: any) => setValues((cur) => ({ ...cur, [k]: v }));

  const addRow = (f: TemplateField) => {
    const empty = Object.fromEntries((f.columns ?? []).map((c) => [c.key, ""]));
    set(f.key, [...(values[f.key] ?? []), empty]);
  };
  const updateCell = (k: string, ri: number, ck: string, v: any) => {
    const rows = [...(values[k] ?? [])];
    rows[ri] = { ...rows[ri], [ck]: v };
    set(k, rows);
  };
  const removeRow = (k: string, ri: number) => {
    set(k, (values[k] ?? []).filter((_: any, i: number) => i !== ri));
  };

  const generate = useMutation({
    mutationFn: async () => {
      if (!tpl) throw new Error("ไม่พบ Template");
      if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
      // Validate required
      for (const f of fields) {
        if (f.required) {
          const v = values[f.key];
          const empty =
            v === "" || v === null || v === undefined ||
            (Array.isArray(v) && v.length === 0);
          if (empty) throw new Error(`กรุณากรอก "${f.label}"`);
        }
      }
      const html = renderTemplate(
        tpl.body_html || defaultBodyHtml(fields),
        fields,
        values,
      );
      const blob = await htmlToPdfBlob(html, tpl.paper_size as any, tpl.orientation as any);

      const { data: prof } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      if (!prof) throw new Error("ไม่พบโปรไฟล์");

      const documentId = crypto.randomUUID();
      const fileName = `${docName || tpl.name}.pdf`.replace(/[^\w.\-ก-๙ ]+/g, "_");
      const pathProjectId = projectId ?? "general";
      const filePath = `${prof.organization_id}/${pathProjectId}/${documentId}/1.0/${fileName}`;

      const { error: ue } = await supabase.storage
        .from("project-documents")
        .upload(filePath, blob, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (ue) throw new Error(ue.message);

      try {
        await createDoc({
          data: {
            documentId,
            projectId: projectId ?? null,
            documentName: docName || tpl.name,
            documentNo: docNo || null,
            description: `สร้างจาก Template: ${tpl.name}`,
            categoryId: tpl.document_category_id ?? null,
            typeId: tpl.document_type_id ?? null,
            isConfidential: false,
            shareToClient: false,
            filePath,
            fileName,
            fileSize: blob.size,
            fileType: "application/pdf",
            fileExtension: "pdf",
          },
        });
      } catch (e) {
        await supabase.storage.from("project-documents").remove([filePath]);
        throw e;
      }

      if (submitAfter) {
        await submit({ data: { documentId } });
      }
      return { documentId };
    },
    onSuccess: () => {
      toast.success("สร้างเอกสารสำเร็จ");
      nav({ to: projectId ? "/projects/$projectId/documents" : "/documents", params: projectId ? { projectId } : (undefined as any) });
    },
    onError: (e: any) => toast.error(e?.message || "สร้างเอกสารไม่สำเร็จ"),
  });

  const downloadPreviewPdf = async () => {
    if (!tpl) return;
    const blob = await htmlToPdfBlob(previewHtml, tpl.paper_size as any, tpl.orientation as any);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docName || tpl.name}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !tpl) return <div className="text-sm text-muted-foreground">กำลังโหลด...</div>;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => nav({ to: "/templates" })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> กลับ
          </Button>
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold">{tpl.name}</h1>
            <p className="text-xs text-muted-foreground">{tpl.code}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadPreviewPdf}>
            <FileDown className="h-4 w-4 mr-2" /> ดาวน์โหลด PDF
          </Button>
          <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            บันทึกเป็นเอกสาร
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">กรอกข้อมูล</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ชื่อเอกสาร *</Label>
                <Input value={docName} onChange={(e) => setDocName(e.target.value)} />
              </div>
              <div>
                <Label>เลขที่เอกสาร</Label>
                <Input value={docNo} onChange={(e) => setDocNo(e.target.value)} />
              </div>
            </div>

            {fields.map((f) => (
              <div key={f.key}>
                <Label>
                  {f.label} {f.required && <span className="text-destructive">*</span>}
                </Label>
                {f.type === "text" && (
                  <Input value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
                )}
                {f.type === "textarea" && (
                  <Textarea rows={3} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
                )}
                {f.type === "number" && (
                  <Input type="number" value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
                )}
                {f.type === "date" && (
                  <Input type="date" value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                )}
                {f.type === "select" && (
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)}>
                    <option value="">— เลือก —</option>
                    {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
                {f.type === "table" && (
                  <div className="space-y-2 rounded-md border p-2">
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${(f.columns?.length ?? 0) + 1}, minmax(0,1fr))` }}>
                      {(f.columns ?? []).map((c) => (
                        <div key={c.key} className="text-xs font-semibold">{c.label}</div>
                      ))}
                      <div />
                    </div>
                    {(values[f.key] ?? []).map((row: any, ri: number) => (
                      <div key={ri} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${(f.columns?.length ?? 0) + 1}, minmax(0,1fr))` }}>
                        {(f.columns ?? []).map((c) => (
                          <Input key={c.key} type={c.type === "number" ? "number" : "text"} value={row[c.key] ?? ""}
                            onChange={(e) => updateCell(f.key, ri, c.key, e.target.value)} />
                        ))}
                        <Button size="sm" variant="ghost" onClick={() => removeRow(f.key, ri)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => addRow(f)}>
                      <Plus className="h-4 w-4 mr-1" /> เพิ่มแถว
                    </Button>
                  </div>
                )}
              </div>
            ))}

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="text-sm">ส่งขออนุมัติทันทีหลังบันทึก</div>
              <Switch checked={submitAfter} onCheckedChange={setSubmitAfter} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-4 lg:self-start">
          <CardHeader><CardTitle className="text-base">พรีวิว PDF</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border bg-white p-4 max-h-[700px] overflow-auto text-black">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
