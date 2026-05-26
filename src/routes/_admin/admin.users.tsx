import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PlatformAdmin = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
};

export const Route = createFileRoute("/_admin/admin/users")({
  component: PlatformUsersPage,
});

function PlatformUsersPage() {
  const [users, setUsers] = useState<PlatformAdmin[]>([]);

  useEffect(() => {
    supabase
      .from("platform_admins")
      .select("id,full_name,email,role,is_active,created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setUsers((data ?? []) as PlatformAdmin[]));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> เพิ่ม Admin
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
              <th className="py-3 px-4">ชื่อ</th>
              <th className="py-3 px-4">อีเมล</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">สถานะ</th>
              <th className="py-3 px-4">สร้างเมื่อ</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center text-slate-500">ยังไม่มี platform admin ในฐานข้อมูล</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-900">{user.full_name ?? "-"}</td>
                  <td className="py-3 px-4 text-slate-600">{user.email}</td>
                  <td className="py-3 px-4">{user.role}</td>
                  <td className="py-3 px-4">{user.is_active ? "Active" : "Disabled"}</td>
                  <td className="py-3 px-4 text-xs text-slate-500">{user.created_at.slice(0, 10)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
