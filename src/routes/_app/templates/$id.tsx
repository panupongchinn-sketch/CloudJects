import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  getTemplate,
  saveTemplate,
} from "@/lib/templates.functions";
import { listCategoriesAndTypes } from "@/lib/documents.functions";
import {
  defaultBodyHtml,
  htmlToPdfBlob,
  renderTemplate,
  type TemplateField,
} from "@/lib/template-render";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Loader2, Wand2, FileDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/templates/$id")({
  component: TemplateEditorPage,
});

type FieldType = TemplateField["type"];

const EMPTY_FIELD = (n: number): TemplateField => ({
  key: `field_${n}`,
  label: `ฟิลด์ ${n}`,
  type: "text",
  required: false,
});

function TemplateEditorPage() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const nav = useNavigate();
  const load = useServerFn(getTemplate);
  const loadMeta = useServerFn(listCategoriesAndTypes);
  const save = useServerFn(saveTemplate);

  const { data: meta } = useQuery({
    queryKey: ["doc-meta"],
    queryFn: () => loadMeta({}),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["template", id],
    queryFn: () => load({ data: { id } }),
    enabled: !isNew,
  });

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateType, setTemplateType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [paperSize, setPaperSize] = useState<"A4" | "A5" | "Letter">("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [bodyHtml, setBodyHtml] = useState("");

  useEffect(() => {
    if (!data?.template) return;
    const t = data.template;
    setCode(t.code ?? "");
    setName(t.name ?? "");
    setDescription(t.description ?? "");
    setTemplateType(t.template_type ?? "");
    setCategoryId(t.document_category_id ?? "");
    setTypeId(t.document_type_id ?? "");
    setRequiresApproval(!!t.requires_approval);
    setIsActive(t.is_active !== false);
    setPaperSize((t.paper_size ?? "A4") as any);
    setOrientation((t.orientation ?? "portrait") as any);
    setFields(Array.isArray(t.fields_json) ? t.fields_json : []);
    setBodyHtml(t.body_html ?? "");
  }, [data]);

  const filteredTypes = useMemo(
    () => (meta?.types ?? []).filter((t: any) => !categoryId || t.category_id === categoryId),
    [meta, categoryId],
  );

  const previewValues = useMemo(() => {
    const v: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.type === "table" && f.columns?.length) {
        v[f.key] = [
          Object.fromEntries(f.columns.map((c) => [c.key, c.type === "number" ? 100 : "ตัวอย่าง"])),
          Object.fromEntries(f.columns.map((c) => [c.key, c.type === "number" ? 200 : "ตัวอย่าง"])),
        ];
      } else if (f.type === "number") v[f.key] = 1000;
      else if (f.type === "date") v[f.key] = new Date().toISOString();
      else v[f.key] = `[${f.label}]`;
    });
    return v;
  }, [fields]);

  const previewHtml = useMemo(
    () => renderTemplate(bodyHtml || defaultBodyHtml(fields), fields, previewValues),
    [bodyHtml, fields, previewValues],
  );

  const updateField = (idx: number, patch: Partial<TemplateField>) => {
    setFields((cur) => cur.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };
  const addField = () => setFields((cur) => [...cur, EMPTY_FIELD(cur.length + 1)]);
  const removeField = (idx: number) => setFields((cur) => cur.filter((_, i) => i !== idx));
  const moveField = (idx: number, dir: -1 | 1) => {
    setFields((cur) => {
      const next = [...cur];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return cur;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const mut = useMutation({
    mutationFn: async () => {
      if (!code.trim()) throw new Error("กรุณากรอกรหัส Template");
      if (!name.trim()) throw new Error("กรุณากรอกชื่อ Template");
      const finalBody = bodyHtml.trim() || defaultBodyHtml(fields);
      return save({
        data: {
          id: isNew ? undefined : id,
          code: code.trim(),
          name: name.trim(),
          description: description || null,
          template_type: templateType || null,
          document_category_id: categoryId || null,
          document_type_id: typeId || null,
          requires_approval: requiresApproval,
          paper_size: paperSize,
          orientation,
          fields_json: fields,
          body_html: finalBody,
          is_active: isActive,
        },
      });
    },
    onSuccess: (res: any) => {
      toast.success("บันทึก Template แล้ว");
      if (isNew && res?.id) nav({ to: "/templates/$id", params: { id: res.id } });
    },
    onError: (e: any) => toast.error(e?.message || "บันทึกไม่สำเร็จ"),
  });

  if (!isNew && isLoading) {
    return <div className="text-sm text-muted-foreground">กำลังโหลด...</div>;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => nav({ to: "/templates" })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> กลับ
          </Button>
          <h1 className="text-xl lg:text-2xl font-semibold">
            {isNew ? "สร้าง Template ใหม่" : `แก้ไข: ${name}`}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const blob = await htmlToPdfBlob(previewHtml, paperSize, orientation);
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${name || code || "template"}-preview.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (e: any) {
                toast.error(e?.message || "Export PDF ไม่สำเร็จ");
              }
            }}
          >
            <FileDown className="h-4 w-4 mr-2" /> Export PDF
          </Button>
          {!isNew && (
            <Button variant="outline" onClick={() => nav({ to: "/templates/$id/use", params: { id } })}>
              <Wand2 className="h-4 w-4 mr-2" /> ทดลองใช้งาน
            </Button>
          )}
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            บันทึก
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">ข้อมูลทั่วไป</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>รหัส *</Label>
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="QUOTATION_V1" />
                </div>
                <div>
                  <Label>ประเภท Template</Label>
                  <Input value={templateType} onChange={(e) => setTemplateType(e.target.value)} placeholder="quotation, contract..." />
                </div>
              </div>
              <div>
                <Label>ชื่อ *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ใบเสนอราคา (มาตรฐาน)" />
              </div>
              <div>
                <Label>คำอธิบาย</Label>
                <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>หมวดเอกสาร</Label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setTypeId(""); }}>
                    <option value="">— เลือก —</option>
                    {(meta?.categories ?? []).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>ประเภทเอกสาร</Label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                    <option value="">— เลือก —</option>
                    {filteredTypes.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>ขนาดกระดาษ</Label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={paperSize} onChange={(e) => setPaperSize(e.target.value as any)}>
                    <option value="A4">A4</option>
                    <option value="A5">A5</option>
                    <option value="Letter">Letter</option>
                  </select>
                </div>
                <div>
                  <Label>แนวกระดาษ</Label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={orientation} onChange={(e) => setOrientation(e.target.value as any)}>
                    <option value="portrait">แนวตั้ง</option>
                    <option value="landscape">แนวนอน</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="text-sm">เอกสารต้องผ่านอนุมัติ</div>
                <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="text-sm">เปิดใช้งาน</div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">ฟิลด์ที่กรอก ({fields.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={addField}>
                <Plus className="h-4 w-4 mr-1" /> เพิ่ม
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  ยังไม่มีฟิลด์ — กดปุ่ม "เพิ่ม" เพื่อเริ่ม
                </p>
              )}
              {fields.map((f, idx) => (
                <div key={idx} className="rounded-md border p-3 space-y-2 bg-card">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="text-xs text-muted-foreground font-mono">#{idx + 1}</div>
                    <div className="ml-auto flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => moveField(idx, -1)}>↑</Button>
                      <Button size="sm" variant="ghost" onClick={() => moveField(idx, 1)}>↓</Button>
                      <Button size="sm" variant="ghost" onClick={() => removeField(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Key (ใช้ใน {`{{key}}`})</Label>
                      <Input value={f.key} onChange={(e) => updateField(idx, { key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })} />
                    </div>
                    <div>
                      <Label className="text-xs">ป้ายชื่อ</Label>
                      <Input value={f.label} onChange={(e) => updateField(idx, { label: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">ชนิด</Label>
                      <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                        value={f.type} onChange={(e) => updateField(idx, { type: e.target.value as FieldType })}>
                        <option value="text">ข้อความสั้น</option>
                        <option value="textarea">ข้อความยาว</option>
                        <option value="number">ตัวเลข</option>
                        <option value="date">วันที่</option>
                        <option value="select">ตัวเลือก</option>
                        <option value="table">ตาราง</option>
                      </select>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Switch checked={!!f.required} onCheckedChange={(v) => updateField(idx, { required: v })} />
                        บังคับกรอก
                      </div>
                    </div>
                  </div>
                  {f.type === "select" && (
                    <div>
                      <Label className="text-xs">ตัวเลือก (คั่นด้วย ,)</Label>
                      <Input
                        value={(f.options ?? []).join(", ")}
                        onChange={(e) => updateField(idx, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                      />
                    </div>
                  )}
                  {f.type === "table" && (
                    <div className="space-y-2">
                      <Label className="text-xs">คอลัมน์ตาราง</Label>
                      <div className="space-y-1">
                        {(f.columns ?? []).map((c, ci) => (
                          <div key={ci} className="flex gap-1">
                            <Input className="flex-1" placeholder="key" value={c.key}
                              onChange={(e) => updateField(idx, { columns: f.columns!.map((cc, i) => i === ci ? { ...cc, key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") } : cc) })} />
                            <Input className="flex-1" placeholder="ป้ายชื่อ" value={c.label}
                              onChange={(e) => updateField(idx, { columns: f.columns!.map((cc, i) => i === ci ? { ...cc, label: e.target.value } : cc) })} />
                            <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={c.type ?? "text"}
                              onChange={(e) => updateField(idx, { columns: f.columns!.map((cc, i) => i === ci ? { ...cc, type: e.target.value as any } : cc) })}>
                              <option value="text">ข้อความ</option>
                              <option value="number">ตัวเลข</option>
                            </select>
                            <Button size="sm" variant="ghost" onClick={() => updateField(idx, { columns: f.columns!.filter((_, i) => i !== ci) })}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => updateField(idx, { columns: [...(f.columns ?? []), { key: `col${(f.columns?.length ?? 0) + 1}`, label: "คอลัมน์", type: "text" }] })}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> คอลัมน์
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:sticky lg:top-4 lg:self-start">
          <CardHeader>
            <CardTitle className="text-base">เนื้อหาเอกสาร & พรีวิว</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview">
              <TabsList>
                <TabsTrigger value="preview">พรีวิว</TabsTrigger>
                <TabsTrigger value="html">HTML ({`{{key}}`})</TabsTrigger>
              </TabsList>
              <TabsContent value="preview">
                <div className="rounded-md border bg-white p-4 max-h-[600px] overflow-auto text-black">
                  <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ใช้ค่าตัวอย่างจากชื่อฟิลด์
                </p>
              </TabsContent>
              <TabsContent value="html">
                <Textarea
                  rows={20}
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  placeholder={defaultBodyHtml(fields)}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  ใช้ <code className="px-1 bg-muted rounded">{`{{field_key}}`}</code> แทนค่า — เว้นว่างเพื่อใช้ template มาตรฐาน
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
