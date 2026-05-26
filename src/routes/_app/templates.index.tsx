import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listTemplates, deleteTemplate, duplicateTemplate } from "@/lib/templates.functions";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, FileText, Pencil, Trash2, Wand2, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/templates/")({
  component: TemplatesPage,
});

function TemplatesPage() {
  const load = useServerFn(listTemplates);
  const del = useServerFn(deleteTemplate);
  const dup = useServerFn(duplicateTemplate);
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: () => load({}),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("ลบ Template แล้ว");
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (e: any) => toast.error(e?.message || "ลบไม่สำเร็จ"),
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => dup({ data: { id } }),
    onSuccess: (res: any) => {
      toast.success("คัดลอก Template แล้ว");
      qc.invalidateQueries({ queryKey: ["templates"] });
      if (res?.id) nav({ to: "/templates/$id", params: { id: res.id } });
    },
    onError: (e: any) => toast.error(e?.message || "คัดลอกไม่สำเร็จ"),
  });

  return (
    <>
      <Header
        title="Template เอกสาร"
        subtitle="สร้างแบบฟอร์มสำหรับ generate เอกสาร PDF ในระบบ"
      />
      <main className="flex-1 p-4 lg:p-6">
        <section className="space-y-4">
          <div className="flex items-center justify-end">
            <Button onClick={() => nav({ to: "/templates/$id", params: { id: "new" } })}>
              <Plus className="mr-2 h-4 w-4" />
              สร้าง Template
            </Button>
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">กำลังโหลด...</div>
          ) : (data?.templates ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
                ยังไม่มี Template - กดปุ่ม "สร้าง Template" เพื่อเริ่ม
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {data!.templates.map((t: any) => (
                <Card key={t.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4 text-primary" />
                      {t.name}
                    </CardTitle>
                    <div className="font-mono text-xs text-muted-foreground">
                      {t.code}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3">
                    <p className="min-h-[2.5rem] line-clamp-2 text-sm text-muted-foreground">
                      {t.description || "-"}
                    </p>
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <span className="rounded bg-muted px-2 py-0.5">
                        {t.paper_size} · {t.orientation === "landscape" ? "แนวนอน" : "แนวตั้ง"}
                      </span>
                      {t.requires_approval && (
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">
                          ต้องอนุมัติ
                        </span>
                      )}
                      {!t.is_active && (
                        <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">
                          ปิดใช้งาน
                        </span>
                      )}
                    </div>
                    <div className="mt-auto flex gap-2 pt-1">
                      <Button
                        asChild
                        size="sm"
                        className="flex-1"
                      >
                        <Link to="/templates/$id/use" params={{ id: t.id }}>
                          <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                          ใช้งาน
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/templates/$id" params={{ id: t.id }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => duplicate.mutate(t.id)}
                        disabled={duplicate.isPending}
                        title="คัดลอก Template"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm(`ลบ Template "${t.name}"?`)) remove.mutate(t.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
