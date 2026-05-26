import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { saveTemplate } from "@/lib/templates.functions";
import { listCategoriesAndTypes } from "@/lib/documents.functions";
import {
  defaultBodyHtml,
  renderTemplate,
  type TemplateField,
} from "@/lib/template-render";
import {
  DEFAULT_TEMPLATES,
  getDefaultTemplate,
  type DefaultTemplate,
} from "@/lib/default-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  Sparkles,
  FileText,
  FileSignature,
  ShoppingCart,
  Table2,
  ClipboardList,
  TrendingUp,
  ClipboardCheck,
  ShieldCheck,
  GitBranch,
  PackageOpen,
  PackageCheck,
  FlagTriangleRight,
  Receipt,
  BadgeCheck,
  FilePlus2,
} from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  preset: z.string().optional(),
});

export const Route = createFileRoute("/_app/templates/new")({
  validateSearch: (s) => searchSchema.parse(s),
  component: NewTemplatePage,
});

const ICON_MAP: Record<string, any> = {
  FileText,
  FileSignature,
  ShoppingCart,
  Table2,
  ClipboardList,
  TrendingUp,
  ClipboardCheck,
  ShieldCheck,
  GitBranch,
  PackageOpen,
  PackageCheck,
  FlagTriangleRight,
  Receipt,
  BadgeCheck,
};

const CATEGORY_GROUPS: { code: string; label: string }[] = [
  { code: "all", label: "ทั้งหมด" },
  { code: "pre_project", label: "ก่อนเริ่มโครงการ" },
  { code: "execution", label: "ระหว่างดำเนินงาน" },
  { code: "quality", label: "คุณภาพ" },
  { code: "safety", label: "ความปลอดภัย" },
  { code: "closeout", label: "ส่งมอบ/ปิดงาน" },
  { code: "finance", label: "การเงิน" },
];

function NewTemplatePage() {
  const { preset } = Route.useSearch();
  const nav = useNavigate();

  if (!preset) return <PresetGallery />;

  const tpl = getDefaultTemplate(preset);
  if (!tpl) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <p className="text-muted-foreground">ไม่พบแม่แบบที่เลือก</p>
          <Button onClick={() => nav({ to: "/templates/new", search: {} })}>
            <ArrowLeft className="h-4 w-4 mr-2" /> กลับไปเลือกแม่แบบ
          </Button>
        </CardContent>
      </Card>
    );
  }
  return <TemplateEditor preset={tpl} />;
}

// =========================================================================
// STEP 1 — PRESET GALLERY
// =========================================================================

function PresetGallery() {
  const nav = useNavigate();
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(
    () =>
      filter === "all"
        ? DEFAULT_TEMPLATES
        : DEFAULT_TEMPLATES.filter((t) => t.category_code === filter),
    [filter],
  );

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/templates" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> กลับ
        </Button>
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            เลือกแม่แบบเอกสารที่ต้องการสร้าง
          </h1>
          <p className="text-sm text-muted-foreground">
            เลือกแม่แบบสำเร็จรูป — ระบบจะเติมฟิลด์และเลย์เอาต์ A4 ให้อัตโนมัติ
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORY_GROUPS.map((g) => (
          <Button
            key={g.code}
            size="sm"
            variant={filter === g.code ? "default" : "outline"}
            onClick={() => setFilter(g.code)}
            className="rounded-full"
          >
            {g.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((t) => {
          const Icon = ICON_MAP[t.icon] ?? FileText;
          return (
            <Card
              key={t.code}
              className="group flex flex-col hover:border-primary transition-colors cursor-pointer"
              onClick={() =>
                nav({ to: "/templates/new", search: { preset: t.code } })
              }
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {t.paper_size} · {t.orientation === "landscape" ? "แนวนอน" : "แนวตั้ง"}
                  </Badge>
                </div>
                <CardTitle className="text-base mt-2">{t.name}</CardTitle>
                <p className="text-[11px] text-muted-foreground font-mono">{t.code}</p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-xs text-muted-foreground line-clamp-3 min-h-[3rem]">
                  {t.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-3 text-[10px]">
                  <Badge variant="secondary">{t.category}</Badge>
                  <Badge variant="secondary">{t.fields.length} ฟิลด์</Badge>
                  {t.requires_approval && (
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/15">
                      ต้องอนุมัติ
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  className="mt-3 w-full group-hover:bg-primary/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    nav({ to: "/templates/new", search: { preset: t.code } });
                  }}
                >
                  <FilePlus2 className="h-3.5 w-3.5 mr-1.5" />
                  ใช้แม่แบบนี้
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

// =========================================================================
// STEP 2 — TEMPLATE EDITOR (with preset prefilled)
// =========================================================================

function TemplateEditor({ preset }: { preset: DefaultTemplate }) {
  const nav = useNavigate();
  const loadMeta = useServerFn(listCategoriesAndTypes);
  const save = useServerFn(saveTemplate);

  const { data: meta } = useQuery({
    queryKey: ["doc-meta"],
    queryFn: () => loadMeta({}),
  });

  const [code, setCode] = useState(preset.code);
  const [name, setName] = useState(preset.name);
  const [description, setDescription] = useState(preset.description);
  const [templateType, setTemplateType] = useState(preset.type);
  const [categoryId, setCategoryId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(preset.requires_approval);
  const [isActive, setIsActive] = useState(true);
  const [paperSize, setPaperSize] = useState<"A4" | "A5" | "Letter">(preset.paper_size);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(preset.orientation);
  const [fields, setFields] = useState<TemplateField[]>(preset.fields);
  const [bodyHtml, setBodyHtml] = useState(preset.body_html);

  // Auto-suggest category/type from preset name when meta loads
  useEffect(() => {
    if (!meta?.categories?.length) return;
    if (categoryId) return;
    const matchCat = (meta.categories as any[]).find((c) =>
      c.name?.toLowerCase().includes(preset.category.toLowerCase()) ||
      preset.category.toLowerCase().includes(c.name?.toLowerCase() ?? ""),
    );
    if (matchCat) setCategoryId(matchCat.id);
  }, [meta, preset.category, categoryId]);

  const filteredTypes = useMemo(
    () =>
      (meta?.types ?? []).filter(
        (t: any) => !categoryId || t.category_id === categoryId,
      ),
    [meta, categoryId],
  );

  // Live editable values (user fills the document directly)
  const [values, setValues] = useState<Record<string, any>>({});
  useEffect(() => {
    const init: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.type === "table" && f.columns?.length) {
        init[f.key] = [
          Object.fromEntries(f.columns.map((c) => [c.key, ""])),
        ];
      } else init[f.key] = "";
    });
    setValues(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset.code]);

  // Render body with editable inputs replacing {{key}} tokens
  const editableHtml = useMemo(() => {
    let out = bodyHtml || defaultBodyHtml(fields);
    const fieldMap = new Map(fields.map((f) => [f.key, f]));
    out = out.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
      const f = fieldMap.get(key);
      const v = values[key] ?? "";
      const baseStyle =
        "background:#fef9c3;border:1px dashed #ca8a04;border-radius:4px;padding:2px 6px;min-width:80px;font:inherit;color:#0f172a;outline:none;";
      if (!f) {
        return `<input data-fkey="${key}" value="${String(v).replace(/"/g, "&quot;")}" style="${baseStyle}" />`;
      }
      if (f.type === "textarea") {
        return `<textarea data-fkey="${key}" rows="2" style="${baseStyle}width:100%;resize:vertical;display:block;">${String(v).replace(/</g, "&lt;")}</textarea>`;
      }
      if (f.type === "table") {
        const cols = f.columns ?? [];
        const head = cols
          .map(
            (c) =>
              `<th style="border:1px solid #cbd5e1;padding:6px 8px;background:#1e3a8a;color:#fff;text-align:left;font-size:12.5px;">${c.label}</th>`,
          )
          .join("");
        const rows = (Array.isArray(v) ? v : []).map((row: any, ri: number) => {
          const tds = cols
            .map((c) => {
              const cellVal = String(row?.[c.key] ?? "").replace(/"/g, "&quot;");
              return `<td style="border:1px solid #cbd5e1;padding:2px;"><input data-fkey="${f.key}" data-row="${ri}" data-col="${c.key}" value="${cellVal}" style="width:100%;border:none;padding:6px 8px;font:inherit;background:transparent;outline:none;${c.type === "number" ? "text-align:right;" : ""}" /></td>`;
            })
            .join("");
          return `<tr>${tds}</tr>`;
        }).join("");
        const addBtn = `<tr><td colspan="${cols.length}" style="padding:6px;text-align:center;"><button data-addrow="${f.key}" type="button" style="background:#1e3a8a;color:#fff;border:none;padding:4px 12px;border-radius:4px;font-size:12px;cursor:pointer;">+ เพิ่มแถว</button></td></tr>`;
        return `<table class="items" style="width:100%;border-collapse:collapse;margin:8px 0;font-size:13px;"><thead><tr>${head}</tr></thead><tbody>${rows}${addBtn}</tbody></table>`;
      }
      if (f.type === "select") {
        const opts = (f.options ?? [])
          .map(
            (o) =>
              `<option value="${o}" ${o === v ? "selected" : ""}>${o}</option>`,
          )
          .join("");
        return `<select data-fkey="${key}" style="${baseStyle}"><option value="">— เลือก —</option>${opts}</select>`;
      }
      const inputType = f.type === "number" ? "number" : f.type === "date" ? "date" : "text";
      return `<input data-fkey="${key}" type="${inputType}" value="${String(v).replace(/"/g, "&quot;")}" placeholder="${f.placeholder ?? ""}" style="${baseStyle}" />`;
    });
    return out;
  }, [bodyHtml, fields, values]);

  // The static rendered preview HTML (for HTML tab + save)
  const previewHtml = useMemo(
    () => renderTemplate(bodyHtml || defaultBodyHtml(fields), fields, values),
    [bodyHtml, fields, values],
  );

  // Event delegation for inline edits
  const handleDocInput = (e: React.FormEvent<HTMLDivElement>) => {
    const t = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const key = t.getAttribute("data-fkey");
    if (!key) return;
    const row = t.getAttribute("data-row");
    const col = t.getAttribute("data-col");
    if (row !== null && col) {
      setValues((cur) => {
        const rows = [...(cur[key] ?? [])];
        rows[Number(row)] = { ...rows[Number(row)], [col]: t.value };
        return { ...cur, [key]: rows };
      });
    } else {
      setValues((cur) => ({ ...cur, [key]: t.value }));
    }
  };
  const handleDocClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const btn = (e.target as HTMLElement).closest("[data-addrow]") as HTMLElement | null;
    if (!btn) return;
    e.preventDefault();
    const key = btn.getAttribute("data-addrow")!;
    const f = fields.find((x) => x.key === key);
    if (!f) return;
    const empty = Object.fromEntries((f.columns ?? []).map((c) => [c.key, ""]));
    setValues((cur) => ({ ...cur, [key]: [...(cur[key] ?? []), empty] }));
  };


  const updateField = (idx: number, patch: Partial<TemplateField>) =>
    setFields((cur) => cur.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  const addField = () =>
    setFields((cur) => [
      ...cur,
      {
        key: `field_${cur.length + 1}`,
        label: `ฟิลด์ ${cur.length + 1}`,
        type: "text",
        required: false,
      },
    ]);
  const removeField = (idx: number) =>
    setFields((cur) => cur.filter((_, i) => i !== idx));
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
      return save({
        data: {
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
          body_html: bodyHtml || defaultBodyHtml(fields),
          is_active: isActive,
        },
      });
    },
    onSuccess: (res: any) => {
      toast.success("บันทึก Template สำเร็จ");
      if (res?.id) nav({ to: "/templates/$id", params: { id: res.id } });
    },
    onError: (e: any) => toast.error(e?.message || "บันทึกไม่สำเร็จ"),
  });

  const Icon = ICON_MAP[preset.icon] ?? FileText;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => nav({ to: "/templates/new", search: {} })}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> เลือกแม่แบบใหม่
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg lg:text-xl font-semibold truncate">{name || "Template ใหม่"}</h1>
              <p className="text-xs text-muted-foreground truncate">
                ปรับแต่งฟิลด์และเนื้อหา แล้วบันทึกเพื่อนำไปสร้างเอกสาร
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending} size="lg">
          {mut.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          บันทึก Template
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">พรีวิวเอกสาร — กรอกข้อมูลในเอกสารได้เลย</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              คลิกที่ช่องสีเหลืองในเอกสารเพื่อพิมพ์ค่าได้ทันที
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {paperSize} · {orientation === "landscape" ? "แนวนอน" : "แนวตั้ง"}
          </Badge>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="preview">
            <TabsList>
              <TabsTrigger value="preview">เอกสาร (กรอกได้)</TabsTrigger>
              <TabsTrigger value="html">HTML</TabsTrigger>
            </TabsList>
            <TabsContent value="preview">
              <div className="rounded-md border bg-muted/30 p-4 lg:p-8 max-h-[calc(100vh-220px)] overflow-auto">
                <div
                  className="bg-white text-black mx-auto shadow-elevated"
                  style={{
                    width: orientation === "landscape" ? "29.7cm" : "21cm",
                    minHeight: orientation === "landscape" ? "21cm" : "29.7cm",
                    maxWidth: "100%",
                    padding: "1.5cm",
                    boxSizing: "border-box",
                  }}
                  onInput={handleDocInput}
                  onChange={handleDocInput}
                  onClick={handleDocClick}
                  dangerouslySetInnerHTML={{ __html: editableHtml }}
                />
              </div>
            </TabsContent>
            <TabsContent value="html">
              <Textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={20}
                className="font-mono text-xs"
              />
              <div className="mt-3 rounded-md border bg-white p-4 max-h-[400px] overflow-auto text-black">
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
}
