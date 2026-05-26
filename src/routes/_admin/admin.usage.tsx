import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { fetchOrganizations } from "@/lib/app-data";

type OrganizationItem = Awaited<ReturnType<typeof fetchOrganizations>>[number];

export const Route = createFileRoute("/_admin/admin/usage")({
  component: UsagePage,
});

function Bar({ used, max }: { used: number; max: number }) {
  const safeMax = max <= 0 ? Math.max(used, 1) : max;
  const pct = Math.min((used / safeMax) * 100, 100);
  const color = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs w-24 text-right ${pct >= 80 ? "text-amber-700 font-medium" : "text-slate-600"}`}>
        {used} / {max < 0 ? "∞" : safeMax}
      </span>
    </div>
  );
}

function UsagePage() {
  const [rows, setRows] = useState<OrganizationItem[]>([]);

  useEffect(() => {
    fetchOrganizations().then(setRows);
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
              <th className="py-3 px-4">บริษัท</th>
              <th className="py-3 px-4">แพ็กเกจ</th>
              <th className="py-3 px-4 w-64">Users</th>
              <th className="py-3 px-4 w-64">Projects</th>
              <th className="py-3 px-4 w-64">Storage (GB)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center text-slate-500">ยังไม่มีข้อมูล usage ในฐานข้อมูล</td></tr>
            ) : (
              rows.map((company) => (
                <tr key={company.id} className="border-b border-slate-100">
                  <td className="py-3 px-4 font-medium text-slate-900">{company.name}</td>
                  <td className="py-3 px-4 text-slate-600">{company.planName}</td>
                  <td className="py-3 px-4"><Bar used={company.users} max={company.limits?.max_users ?? 0} /></td>
                  <td className="py-3 px-4"><Bar used={company.projects} max={company.limits?.max_projects ?? 0} /></td>
                  <td className="py-3 px-4"><Bar used={0} max={company.limits?.max_storage_gb ?? 0} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
