import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CloudJectLoading } from "@/components/loading/cloudject-loading";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchProjectSettingsAccess } from "@/lib/project-access";
import {
  PROJECT_HEADER_BACKGROUND_OPTIONS,
  getProjectHeaderBackgroundStyle,
  normalizeProjectHeaderBackground,
} from "@/lib/project-header-backgrounds";

export const Route = createFileRoute("/_app/projects/$projectId/settings")({
  component: SettingsPage,
});

type FormState = {
  name: string;
  code: string;
  location: string;
  budget: string;
  header_background: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  code: "",
  location: "",
  budget: "",
  header_background: "project-card-bg-01",
};

function SettingsPage() {
  const { projectId } = useParams({ from: "/_app/projects/$projectId/settings" });
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [canManageSettings, setCanManageSettings] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    setCheckingAccess(true);
    setCanManageSettings(false);

    fetchProjectSettingsAccess(projectId, user)
      .then(async (access) => {
        if (cancelled) return;
        setCanManageSettings(access.canManageSettings);
        setCheckingAccess(false);

        if (!access.canManageSettings) {
          toast.error("ไม่มีสิทธิ์เข้าหน้าตั้งค่าโครงการ");
          await navigate({ to: "/projects/$projectId", params: { projectId }, replace: true });
        }
      })
      .catch(async () => {
        if (cancelled) return;
        setCanManageSettings(false);
        setCheckingAccess(false);
        toast.error("ตรวจสอบสิทธิ์ไม่สำเร็จ");
        await navigate({ to: "/projects/$projectId", params: { projectId }, replace: true });
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, navigate, projectId, user]);

  useEffect(() => {
    if (checkingAccess || !canManageSettings) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("projects")
        .select("name, code, location, budget, header_background")
        .eq("id", projectId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        toast.error("โหลดการตั้งค่าโครงการไม่สำเร็จ", { description: error.message });
      } else if (data) {
        const nextForm = {
          name: data.name ?? "",
          code: data.code ?? "",
          location: data.location ?? "",
          budget: data.budget != null ? String(data.budget) : "",
          header_background: normalizeProjectHeaderBackground(data.header_background),
        };
        setForm(nextForm);
        setInitialForm(nextForm);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [canManageSettings, checkingAccess, projectId]);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!canManageSettings) {
      toast.error("ไม่มีสิทธิ์บันทึกการตั้งค่าโครงการ");
      return;
    }

    setSaving(true);
    const budgetValue = form.budget.trim() ? Number(form.budget.replace(/,/g, "")) : null;

    if (budgetValue != null && Number.isNaN(budgetValue)) {
      toast.error("งบประมาณไม่ถูกต้อง");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("projects")
      .update({
        name: form.name.trim(),
        code: form.code.trim(),
        location: form.location.trim() || null,
        budget: budgetValue,
        header_background: form.header_background,
      })
      .eq("id", projectId);

    setSaving(false);

    if (error) {
      toast.error("บันทึกไม่สำเร็จ", { description: error.message });
      return;
    }

    setInitialForm(form);
    toast.success("บันทึกการตั้งค่าแล้ว");
  };

  const removeProject = async () => {
    if (!canManageSettings) {
      toast.error("ไม่มีสิทธิ์ลบโครงการ");
      return;
    }

    if (!window.confirm("ยืนยันลบโครงการนี้? ข้อมูลที่เกี่ยวข้องอาจถูกลบไปด้วย")) return;

    setDeleting(true);
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    setDeleting(false);

    if (error) {
      toast.error("ลบโครงการไม่สำเร็จ", { description: error.message });
      return;
    }

    toast.success("ลบโครงการแล้ว");
    await navigate({ to: "/projects" });
  };

  if (checkingAccess || loading) return <CloudJectLoading />;

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2.25fr)_372px]">
        <section className="card-surface overflow-hidden">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-[28px] font-semibold tracking-tight">ตั้งค่าโครงการ</h2>
            <p className="mt-1 text-sm text-muted-foreground">Project settings</p>
          </div>

          <div className="space-y-5 px-6 py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="ชื่อโครงการ" value={form.name} onChange={(value) => updateField("name", value)} />
              <Field label="รหัสโครงการ" value={form.code} onChange={(value) => updateField("code", value)} />
              <Field label="สถานที่" value={form.location} onChange={(value) => updateField("location", value)} />
              <Field
                label="งบประมาณ (บาท)"
                value={form.budget}
                onChange={(value) => updateField("budget", value)}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-6 py-4 md:flex-row md:items-center md:justify-between">
            <button
              onClick={() => void removeProject()}
              disabled={saving || deleting}
              className="inline-flex h-10 items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              ลบโครงการ
            </button>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setForm(initialForm)}
                disabled={saving || deleting}
                className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => void save()}
                disabled={saving || deleting}
                className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                บันทึก
              </button>
            </div>
          </div>
        </section>

        <section className="card-surface overflow-hidden">
          <div className="border-b border-border px-5 py-5">
            <h3 className="text-[22px] font-semibold tracking-tight">พื้นหลังการ์ดหัวโครงการ</h3>
            <p className="mt-1 text-sm text-muted-foreground">เลือกรูปพื้นหลังสำหรับหัวโครงการ</p>
          </div>

          <div className="space-y-4 px-5 py-5">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">รูปพื้นหลัง</span>
              <select
                value={form.header_background}
                onChange={(event) => updateField("header_background", event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              >
                {PROJECT_HEADER_BACKGROUND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
              <div className="min-h-[128px]" style={getProjectHeaderBackgroundStyle(form.header_background)}>
                <div className="min-h-[128px] p-4 text-white">
                  <span className="rounded bg-white/20 px-2 py-1 font-mono text-[10px] font-semibold tracking-wide text-white/90">
                    {form.code || "PROJECT-CODE"}
                  </span>
                  <div className="mt-3 text-[15px] font-semibold">{form.name || "ชื่อโครงการ"}</div>
                  <div className="mt-1 text-xs text-white/75">{form.location || "สถานที่โครงการ"}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {PROJECT_HEADER_BACKGROUND_OPTIONS.map((option) => {
                const active = form.header_background === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField("header_background", option.value)}
                    className={`h-20 overflow-hidden rounded-xl border transition ${
                      active ? "border-primary ring-2 ring-primary/25" : "border-border hover:border-primary/40"
                    }`}
                    title={option.label}
                  >
                    <div
                      className="flex h-full w-full items-end bg-cover bg-center p-2"
                      style={getProjectHeaderBackgroundStyle(option.value)}
                    >
                      <span className="rounded bg-black/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
                        {option.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
      />
    </label>
  );
}
