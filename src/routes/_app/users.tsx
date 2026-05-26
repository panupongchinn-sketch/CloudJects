import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { getStoredAppSession } from "@/lib/app-auth-client";
import { fetchManagedUsers, initials, type ProfileRow } from "@/lib/app-data";
import { createOrganizationUser, deleteOrganizationUser, updateOrganizationUser } from "@/lib/users.functions";

export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
});

const ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer" },
  { value: "client", label: "Client" },
  { value: "foreman", label: "Foreman" },
  { value: "site_engineer", label: "Site Engineer" },
  { value: "project_manager", label: "Project Manager" },
  { value: "company_admin", label: "Company Admin" },
] as const;

type RoleValue = (typeof ROLE_OPTIONS)[number]["value"];

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((option) => [option.value, option.label]),
);

function UsersPage() {
  const createUser = useServerFn(createOrganizationUser);
  const updateUser = useServerFn(updateOrganizationUser);
  const removeUser = useServerFn(deleteOrganizationUser);
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "viewer" as RoleValue,
    isActive: true,
  });

  const isEditing = editingUserId !== null;

  const loadUsers = async () => {
    try {
      setUsers(await fetchManagedUsers());
    } catch (error) {
      console.error(error);
      setUsers([]);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const visibleUsers = users.filter((user) =>
    `${user.full_name ?? ""} ${user.email ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const resetForm = () => {
    setForm({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "viewer",
      isActive: true,
    });
    setEditingUserId(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (user: ProfileRow) => {
    setEditingUserId(user.id);
    setForm({
      fullName: user.full_name ?? "",
      email: user.email ?? "",
      password: "",
      confirmPassword: "",
      role: (user.role as RoleValue) ?? "viewer",
      isActive: user.is_active !== false,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const submitUser = async () => {
    const session = getStoredAppSession();
    if (!session?.token) {
      toast.error("กรุณาเข้าสู่ระบบใหม่");
      return;
    }

    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error("กรอกข้อมูลให้ครบ");
      return;
    }

    if (!isEditing && !form.password) {
      toast.error("กรอกข้อมูลให้ครบ");
      return;
    }

    if (!isEditing && form.password.length < 6) {
      toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (!isEditing && form.password !== form.confirmPassword) {
      toast.error("รหัสผ่านไม่ตรงกัน");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await updateUser({
          data: {
            token: session.token,
            userId: editingUserId,
            fullName: form.fullName.trim(),
            email: form.email.trim().toLowerCase(),
            role: form.role,
            isActive: form.isActive,
          },
        });
        toast.success("แก้ไขผู้ใช้แล้ว");
      } else {
        await createUser({
          data: {
            token: session.token,
            fullName: form.fullName.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
            role: form.role,
          },
        });
        toast.success("เพิ่มผู้ใช้แล้ว");
      }

      closeForm();
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : isEditing ? "แก้ไขผู้ใช้ไม่สำเร็จ" : "เพิ่มผู้ใช้ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: ProfileRow) => {
    const session = getStoredAppSession();
    if (!session?.token) {
      toast.error("กรุณาเข้าสู่ระบบใหม่");
      return;
    }

    if (!window.confirm(`ลบผู้ใช้ "${user.full_name ?? user.email ?? "-"}" ?`)) {
      return;
    }

    setDeletingUserId(user.id);
    try {
      await removeUser({
        data: {
          token: session.token,
          userId: user.id,
        },
      });
      toast.success("ลบผู้ใช้แล้ว");
      if (editingUserId === user.id) {
        closeForm();
      }
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ลบผู้ใช้ไม่สำเร็จ");
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <>
      <Header title="ผู้ใช้งาน" subtitle="จัดการผู้ใช้และสิทธิ์การเข้าถึง" />
      <main className="flex-1 space-y-4 p-4 lg:p-6">
        <div className="card-surface flex items-center gap-2 p-3">
          <div className="flex h-10 min-w-0 flex-1 items-center rounded-lg border border-border bg-background px-3 text-sm">
            <Search className="mr-2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาผู้ใช้..."
              className="flex-1 bg-transparent outline-none"
            />
          </div>
          <button
            onClick={() => {
              if (showForm) {
                closeForm();
                return;
              }
              openCreateForm();
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "ปิด" : "เพิ่มผู้ใช้"}
          </button>
        </div>

        {showForm ? (
          <section className="card-surface space-y-4 p-4">
            <div>
              <h2 className="text-sm font-semibold">{isEditing ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้"}</h2>
              <p className="text-xs text-muted-foreground">
                {isEditing ? "ปรับข้อมูลผู้ใช้ สิทธิ์ และสถานะการใช้งาน" : "เพิ่มชื่อ อีเมล รหัสผ่าน และสิทธิ์ของผู้ใช้ใหม่"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label="ชื่อผู้ใช้"
                value={form.fullName}
                onChange={(value) => setForm((prev) => ({ ...prev, fullName: value }))}
              />
              <Field
                label="อีเมล"
                type="email"
                value={form.email}
                onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
              />
              {!isEditing ? (
                <>
                  <Field
                    label="รหัสผ่าน"
                    type="password"
                    value={form.password}
                    onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
                  />
                  <Field
                    label="ยืนยันรหัสผ่าน"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(value) => setForm((prev) => ({ ...prev, confirmPassword: value }))}
                  />
                </>
              ) : null}
              <label className="block md:col-span-2">
                <span className="text-xs font-medium text-muted-foreground">สิทธิ์</span>
                <select
                  value={form.role}
                  onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as RoleValue }))}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {isEditing ? (
                <label className="flex items-center gap-2 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                    className="h-4 w-4 rounded border border-border"
                  />
                  <span className="text-sm text-foreground">เปิดใช้งาน</span>
                </label>
              ) : null}
            </div>

            <div className="flex gap-2 border-t border-border pt-4">
              <button
                onClick={() => void submitUser()}
                disabled={submitting}
                className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isEditing ? "บันทึกการแก้ไข" : "เพิ่มผู้ใช้"}
              </button>
              <button
                onClick={closeForm}
                disabled={submitting}
                className="inline-flex h-10 items-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
              >
                ยกเลิก
              </button>
            </div>
          </section>
        ) : null}

        <div className="card-surface overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">ผู้ใช้</th>
                <th className="hidden px-4 py-3 text-left font-medium md:table-cell">อีเมล</th>
                <th className="px-4 py-3 text-left font-medium">ตำแหน่ง</th>
                <th className="px-4 py-3 text-left font-medium">Organization</th>
                <th className="hidden px-4 py-3 text-left font-medium md:table-cell">สถานะ</th>
                <th className="px-4 py-3 text-right font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    ยังไม่มีผู้ใช้ในฐานข้อมูล
                  </td>
                </tr>
              ) : (
                visibleUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-accent/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                          {initials(user.full_name, user.email)}
                        </div>
                        <span className="font-medium">{user.full_name ?? user.email}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {user.role ? ROLE_LABELS[user.role] ?? user.role : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">
                        {user.organization_name ?? user.organization_id ?? "-"}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span
                        className={
                          user.is_active === false
                            ? "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                            : "rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success"
                        }
                      >
                        {user.is_active === false ? "Disabled" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditForm(user)}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-accent"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          แก้ไข
                        </button>
                        <button
                          onClick={() => void handleDeleteUser(user)}
                          disabled={deletingUserId === user.id}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingUserId === user.id ? (
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
      </main>
    </>
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
  type?: "text" | "email" | "password";
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
      />
    </label>
  );
}
