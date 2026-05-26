import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Eye, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getStoredAppSession } from "@/lib/app-auth-client";
import { fetchOrganizations, money } from "@/lib/app-data";
import { deleteCompany, saveCompany } from "@/lib/companies.functions";

type OrganizationItem = Awaited<ReturnType<typeof fetchOrganizations>>[number];
type CompanyStatus = "active" | "trial" | "suspended" | "cancelled" | "expired";
type PlanOption = {
  id: string;
  name: string;
  code: string;
  monthly_price: number;
};

const STATUS_OPTIONS: Array<{ value: CompanyStatus; label: string }> = [
  { value: "trial", label: "Trial" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

export const Route = createFileRoute("/_admin/admin/companies/")({
  component: CompaniesPage,
});

function CompaniesPage() {
  const saveCompanyFn = useServerFn(saveCompany);
  const deleteCompanyFn = useServerFn(deleteCompany);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState<OrganizationItem[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    contactName: "",
    phone: "",
    address: "",
    status: "trial" as CompanyStatus,
    planId: "",
  });

  const isEditing = editingId !== null;

  const loadRows = async () => {
    try {
      setRows(await fetchOrganizations());
    } catch (error) {
      console.error(error);
      toast.error("โหลดข้อมูลบริษัทไม่สำเร็จ");
    }
  };

  const loadPlans = async () => {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("id,name,code,monthly_price")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setPlans((data ?? []) as PlanOption[]);
  };

  useEffect(() => {
    void loadRows();
    void loadPlans();
  }, []);

  const visibleRows = rows.filter((company) => {
    const search = q.trim().toLowerCase();
    const matchesSearch =
      !search ||
      [company.name, company.email, company.contact_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));

    return matchesSearch && (status === "all" || company.status === status);
  });

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      contactName: "",
      phone: "",
      address: "",
      status: "trial",
      planId: "",
    });
    setEditingId(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (company: OrganizationItem) => {
    setEditingId(company.id);
    setForm({
      name: company.name,
      email: company.email ?? "",
      contactName: company.contact_name ?? "",
      phone: company.phone ?? "",
      address: company.address ?? "",
      status: (company.status as CompanyStatus) ?? "trial",
      planId: plans.find((plan) => plan.code === company.plan)?.id ?? "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const submitCompany = async () => {
    const session = getStoredAppSession();
    if (!session?.token) {
      toast.error("กรุณาเข้าสู่ระบบใหม่");
      return;
    }

    if (!form.name.trim()) {
      toast.error("กรอกชื่อบริษัท");
      return;
    }

    setSaving(true);
    try {
      await saveCompanyFn({
        data: {
          token: session.token,
          id: editingId ?? undefined,
          name: form.name.trim(),
          email: form.email.trim(),
          contactName: form.contactName.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          status: form.status,
          planId: form.planId || null,
        },
      });

      toast.success(isEditing ? "แก้ไขบริษัทแล้ว" : "เพิ่มบริษัทแล้ว");
      closeForm();
      await loadRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : isEditing ? "แก้ไขบริษัทไม่สำเร็จ" : "เพิ่มบริษัทไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (company: OrganizationItem) => {
    const session = getStoredAppSession();
    if (!session?.token) {
      toast.error("กรุณาเข้าสู่ระบบใหม่");
      return;
    }

    if (!window.confirm(`ลบบริษัท "${company.name}" ?`)) return;

    setDeletingId(company.id);
    try {
      await deleteCompanyFn({
        data: {
          token: session.token,
          id: company.id,
        },
      });

      toast.success("ลบบริษัทแล้ว");
      if (editingId === company.id) closeForm();
      await loadRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ลบบริษัทไม่สำเร็จ");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => {
            if (showForm) {
              closeForm();
              return;
            }
            openCreateForm();
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "ปิด" : "เพิ่มบริษัท"}
        </button>
      </div>

      {showForm ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-950">{isEditing ? "แก้ไขบริษัท" : "เพิ่มบริษัท"}</h2>
            <p className="text-xs text-slate-500">จัดการข้อมูลบริษัท สถานะ และแพ็กเกจ</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="ชื่อบริษัท" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
            <Field label="อีเมล" type="email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />
            <Field label="ผู้ติดต่อ" value={form.contactName} onChange={(value) => setForm((prev) => ({ ...prev, contactName: value }))} />
            <Field label="โทรศัพท์" value={form.phone} onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))} />
            <label className="block">
              <span className="text-xs font-medium text-slate-500">สถานะ</span>
              <select
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as CompanyStatus }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-500">แพ็กเกจ</span>
              <select
                value={form.planId}
                onChange={(event) => setForm((prev) => ({ ...prev, planId: event.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">ไม่ระบุ</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2 xl:col-span-3">
              <span className="text-xs font-medium text-slate-500">ที่อยู่</span>
              <textarea
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
            <button
              onClick={() => void submitCompany()}
              disabled={saving}
              className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEditing ? "บันทึกการแก้ไข" : "เพิ่มบริษัท"}
            </button>
            <button
              onClick={closeForm}
              disabled={saving}
              className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              ยกเลิก
            </button>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อบริษัท..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all">ทุกสถานะ</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-3">บริษัท</th>
                <th className="px-4 py-3">แพ็กเกจ</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3 text-right">Users</th>
                <th className="px-4 py-3 text-right">Projects</th>
                <th className="px-4 py-3 text-right">งบประมาณ</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">ชำระ</th>
                <th className="px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    ยังไม่มีบริษัทในฐานข้อมูล
                  </td>
                </tr>
              ) : (
                visibleRows.map((company) => (
                  <tr key={company.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{company.name}</td>
                    <td className="px-4 py-3">{company.planName}</td>
                    <td className="px-4 py-3 text-xs uppercase">{company.status}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{company.users}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{company.projects}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">{money(company.budget)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${company.progress}%` }} />
                        </div>
                        <span className="w-8 text-xs text-slate-600">{company.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs uppercase">{company.payment}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          to="/admin/companies/$companyId"
                          params={{ companyId: company.id }}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-primary hover:bg-slate-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          ดู
                        </Link>
                        <button
                          onClick={() => openEditForm(company)}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          แก้ไข
                        </button>
                        <button
                          onClick={() => void handleDelete(company)}
                          disabled={deletingId === company.id}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingId === company.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
      />
    </label>
  );
}
