import { useEffect, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { Plus, CheckSquare, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ChecklistItem = {
  id: string;
  title: string;
  done: boolean;
  ordering: number;
  assignee_id: string | null;
};

export const Route = createFileRoute("/_app/projects/$projectId/checklists")({
  component: ChecklistsPage,
});

function ChecklistsPage() {
  const { projectId } = useParams({ from: "/_app/projects/$projectId/checklists" });
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("checklist_items")
      .select("id,title,done,ordering,assignee_id")
      .eq("project_id", projectId)
      .order("ordering", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setItems((data ?? []) as ChecklistItem[]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const done = items.filter((item) => item.done).length;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="space-y-3 lg:col-span-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Checklist</h3>
          <button className="h-8 px-2.5 rounded-md text-xs border border-border inline-flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>
        <div className="card-surface p-4 ring-2 ring-primary/20">
          <div className="flex items-center justify-between">
            <div className="font-medium text-sm">รายการตรวจของโครงการ</div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {done}/{items.length}
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 card-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">Checklist Items</h2>
            <p className="text-xs text-muted-foreground">ข้อมูลจากตาราง checklist_items</p>
          </div>
        </div>

        {loading ? (
          <Empty text="กำลังโหลด..." />
        ) : items.length === 0 ? (
          <Empty text="ยังไม่มี checklist ในฐานข้อมูล" />
        ) : (
          <ol className="space-y-2">
            {items.map((item) => {
              const Icon = item.done ? CheckSquare : Square;
              return (
                <li
                  key={item.id}
                  className={"flex items-start gap-3 p-3 rounded-lg border " + (item.done ? "bg-success/5 border-success/20" : "border-border")}
                >
                  <Icon className={"h-5 w-5 mt-0.5 " + (item.done ? "text-success" : "text-muted-foreground")} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.title}</div>
                    {item.done ? <div className="text-xs text-muted-foreground mt-0.5">ตรวจแล้ว</div> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            ความคืบหน้า {done} / {items.length} รายการ
          </div>
          <button className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover">
            บันทึก
          </button>
        </div>
      </div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{text}</div>;
}
