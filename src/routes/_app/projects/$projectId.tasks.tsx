import { useEffect, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { CheckSquare, Loader2, MessageCircle, Paperclip, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { supabase } from "@/integrations/supabase/client";
import { fetchProjectBundle, initials, isOverdue, type ProfileRow, type TaskRow } from "@/lib/app-data";

const COLUMNS: TaskRow["status"][] = [
  "To Do",
  "In Progress",
  "Waiting Review",
  "Waiting Approval",
  "Completed",
  "Rejected",
];

const PRIORITIES: TaskRow["priority"][] = ["Low", "Medium", "High", "Urgent"];

type ProjectBundle = NonNullable<Awaited<ReturnType<typeof fetchProjectBundle>>>;

type TaskForm = {
  title: string;
  description: string;
  assignee_id: string;
  status: TaskRow["status"];
  priority: TaskRow["priority"];
  start_date: string;
  due_date: string;
  progress: string;
};

const EMPTY_FORM: TaskForm = {
  title: "",
  description: "",
  assignee_id: "__none",
  status: "To Do",
  priority: "Medium",
  start_date: "",
  due_date: "",
  progress: "0",
};

export const Route = createFileRoute("/_app/projects/$projectId/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const { projectId } = useParams({ from: "/_app/projects/$projectId/tasks" });
  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const result = await fetchProjectBundle(projectId);
      setBundle(result);
    } catch (error) {
      toast.error("โหลด Task Board ไม่สำเร็จ", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, [projectId]);

  const projectTasks = bundle?.tasks ?? [];
  const assignees =
    bundle?.members
      .map((member) => bundle.profiles.get(member.user_id))
      .filter(Boolean)
      .filter((profile, index, rows) => rows.findIndex((row) => row?.id === profile?.id) === index) ?? [];

  const openCreateTask = (status: TaskRow["status"] = "To Do") => {
    setSelectedTaskId(null);
    setForm({ ...EMPTY_FORM, status, progress: status === "Completed" ? "100" : "0" });
    setDialogOpen(true);
  };

  const openTask = (task: TaskRow) => {
    setSelectedTaskId(task.id);
    setForm({
      title: task.title,
      description: task.description ?? "",
      assignee_id: task.assignee_id ?? "__none",
      status: task.status,
      priority: task.priority,
      start_date: task.start_date ?? "",
      due_date: task.due_date ?? "",
      progress: String(task.progress ?? 0),
    });
    setDialogOpen(true);
  };

  const validateForm = () => {
    const title = form.title.trim();
    if (!title) {
      toast.error("กรุณากรอกชื่องาน");
      return null;
    }

    const progress = Number(form.progress);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      toast.error("ความคืบหน้าต้องอยู่ระหว่าง 0-100");
      return null;
    }

    return {
      title,
      description: form.description.trim() || null,
      assignee_id: form.assignee_id === "__none" ? null : form.assignee_id,
      status: form.status,
      priority: form.priority,
      start_date: form.start_date || null,
      due_date: form.due_date || null,
      progress: Math.round(progress),
    };
  };

  const createTask = async () => {
    const payload = validateForm();
    if (!payload) return;

    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      project_id: projectId,
      ...payload,
    });
    setSaving(false);

    if (error) {
      toast.error("เพิ่ม Task ไม่สำเร็จ", { description: error.message });
      return;
    }

    toast.success("เพิ่ม Task แล้ว");
    closeDialog();
    await loadTasks();
  };

  const updateTask = async () => {
    if (!selectedTaskId) return;
    const payload = validateForm();
    if (!payload) return;

    setSaving(true);
    const { error } = await supabase.from("tasks").update(payload).eq("id", selectedTaskId);
    setSaving(false);

    if (error) {
      toast.error("บันทึก Task ไม่สำเร็จ", { description: error.message });
      return;
    }

    toast.success("บันทึก Task แล้ว");
    closeDialog();
    await loadTasks();
  };

  const deleteTask = async () => {
    if (!selectedTaskId) return;
    if (!window.confirm("ยืนยันลบ Task นี้?")) return;

    setSaving(true);
    const { error } = await supabase.from("tasks").delete().eq("id", selectedTaskId);
    setSaving(false);

    if (error) {
      toast.error("ลบ Task ไม่สำเร็จ", { description: error.message });
      return;
    }

    toast.success("ลบ Task แล้ว");
    closeDialog();
    await loadTasks();
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedTaskId(null);
    setForm(EMPTY_FORM);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Task Board</h2>
          <p className="text-xs text-muted-foreground">
            {loading ? "กำลังโหลด..." : `${projectTasks.length} งานจาก Supabase`}
          </p>
        </div>
        <button
          onClick={() => openCreateTask("To Do")}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          เพิ่ม Task
        </button>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <div className="flex min-w-max gap-3 lg:grid lg:min-w-0 lg:grid-cols-6">
          {COLUMNS.map((column) => {
            const items = projectTasks.filter((task) => task.status === column);
            return (
              <div key={column} className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-secondary/60 lg:w-auto">
                <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <StatusBadge kind="task" value={column} />
                    <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
                  </div>
                  <button
                    onClick={() => openCreateTask(column)}
                    className="grid h-6 w-6 place-items-center rounded-md hover:bg-card"
                    title={`เพิ่ม Task ใน ${column}`}
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="max-h-[70vh] space-y-2 overflow-y-auto p-2">
                  {items.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/70 py-6 text-center text-xs text-muted-foreground">
                      ยังไม่มีงาน
                    </div>
                  ) : (
                    items.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        assignee={task.assignee_id ? bundle?.profiles.get(task.assignee_id) : null}
                        onClick={() => openTask(task)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TaskDialog
        open={dialogOpen}
        saving={saving}
        mode={selectedTaskId ? "edit" : "create"}
        form={form}
        assignees={assignees}
        onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}
        onFormChange={setForm}
        onSubmit={selectedTaskId ? updateTask : createTask}
        onDelete={selectedTaskId ? deleteTask : undefined}
      />
    </section>
  );
}

function TaskCard({
  task,
  assignee,
  onClick,
}: {
  task: TaskRow;
  assignee?: ProfileRow | null;
  onClick: () => void;
}) {
  const overdue = isOverdue(task);
  return (
    <article
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-snug">{task.title}</h3>
        <StatusBadge kind="priority" value={task.priority} />
      </div>
      <div className="mt-2.5">
        <ProgressBar value={task.progress} tone={overdue ? "danger" : "default"} />
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className={overdue ? "font-medium text-primary" : ""}>due {task.due_date ?? "-"}</span>
          <span className="tabular-nums">{task.progress}%</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CheckSquare className="h-3.5 w-3.5" />
            0/0
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />0
          </span>
          <span className="inline-flex items-center gap-1">
            <Paperclip className="h-3.5 w-3.5" />0
          </span>
        </div>
        <div
          className="grid h-6 w-6 place-items-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary"
          title={assignee?.full_name ?? assignee?.email ?? ""}
        >
          {initials(assignee?.full_name, assignee?.email)}
        </div>
      </div>
    </article>
  );
}

function TaskDialog({
  open,
  saving,
  mode,
  form,
  assignees,
  onOpenChange,
  onFormChange,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  saving: boolean;
  mode: "create" | "edit";
  form: TaskForm;
  assignees: ProfileRow[];
  onOpenChange: (open: boolean) => void;
  onFormChange: React.Dispatch<React.SetStateAction<TaskForm>>;
  onSubmit: () => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "รายละเอียด Task" : "เพิ่ม Task"}</DialogTitle>
          <DialogDescription>
            {mode === "edit" ? "ดูและแก้ไขข้อมูลงานนี้" : "สร้างงานใหม่ในโปรเจกต์นี้"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>ชื่องาน</Label>
            <Input
              value={form.title}
              onChange={(event) => onFormChange((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="เช่น ตรวจหน้างาน, เทคอนกรีต, ส่งเอกสาร"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>รายละเอียด</Label>
            <Textarea
              value={form.description}
              onChange={(event) => onFormChange((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="รายละเอียดงานเพิ่มเติม..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TaskSelect
              label="สถานะ"
              value={form.status}
              onValueChange={(value) => onFormChange((prev) => ({ ...prev, status: value as TaskRow["status"] }))}
              options={COLUMNS}
            />
            <TaskSelect
              label="ความสำคัญ"
              value={form.priority}
              onValueChange={(value) => onFormChange((prev) => ({ ...prev, priority: value as TaskRow["priority"] }))}
              options={PRIORITIES}
            />
            <div className="space-y-2">
              <Label>ผู้รับผิดชอบ</Label>
              <Select
                value={form.assignee_id}
                onValueChange={(value) => onFormChange((prev) => ({ ...prev, assignee_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกผู้รับผิดชอบ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">ไม่ระบุ</SelectItem>
                  {assignees.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.full_name ?? assignee.email ?? assignee.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ความคืบหน้า (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.progress}
                onChange={(event) => onFormChange((prev) => ({ ...prev, progress: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>วันเริ่ม</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(event) => onFormChange((prev) => ({ ...prev, start_date: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>กำหนดส่ง</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(event) => onFormChange((prev) => ({ ...prev, due_date: event.target.value }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {onDelete ? (
                <Button type="button" variant="destructive" onClick={() => void onDelete()} disabled={saving}>
                  <Trash2 className="h-4 w-4" />
                  ลบ Task
                </Button>
              ) : null}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                ยกเลิก
              </Button>
              <Button type="button" onClick={() => void onSubmit()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "create" ? <Plus className="h-4 w-4" /> : null}
                {mode === "edit" ? "บันทึก" : "เพิ่ม Task"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
