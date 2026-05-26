import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Wallet, FolderKanban, Users, AlertTriangle, Receipt } from "lucide-react";
import { fetchAdminProjects, fetchOrganizations, money } from "@/lib/app-data";

type OrganizationItem = Awaited<ReturnType<typeof fetchOrganizations>>[number];
type AdminProject = Awaited<ReturnType<typeof fetchAdminProjects>>[number];

export const Route = createFileRoute("/_admin/admin/")({
  component: AdminDashboard,
});

function KpiCard({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: string; sub?: string; accent?: "red" | "green" | "blue" }) {
  const dotCls = accent === "red" ? "bg-primary" : accent === "green" ? "bg-emerald-500" : "bg-blue-500";
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[12px] uppercase tracking-wider text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
          {sub ? <div className="mt-1 text-[12px] text-slate-500 flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />{sub}</div> : null}
        </div>
        <div className="grid place-items-center h-10 w-10 rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [companies, setCompanies] = useState<OrganizationItem[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);

  useEffect(() => {
    Promise.all([fetchOrganizations(), fetchAdminProjects()]).then(([orgRows, projectRows]) => {
      setCompanies(orgRows);
      setProjects(projectRows);
    });
  }, []);

  const activeCompanies = companies.filter((company) => company.status === "active").length;
  const totalUsers = companies.reduce((sum, company) => sum + company.users, 0);
  const mrr = companies.reduce((sum, company) => sum + company.monthlyPrice, 0);
  const pendingPayments = companies.filter((company) => company.payment !== "paid").length;
  const totalBudget = projects.reduce((sum, project) => sum + Number(project.budget ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ภาพรวมระบบ Platform</h1>
          <p className="text-sm text-slate-500 mt-1">ข้อมูลจริงจาก Supabase</p>
        </div>
        <div className="text-xs text-slate-500">อัปเดต {new Date().toLocaleString("th-TH")}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Building2} label="Total Companies" value={companies.length.toString()} sub={`${activeCompanies} active`} accent="green" />
        <KpiCard icon={Wallet} label="Monthly Revenue" value={money(mrr)} sub="จาก subscriptions" accent="green" />
        <KpiCard icon={FolderKanban} label="Total Projects" value={projects.length.toLocaleString()} sub={`Budget ${money(totalBudget)}`} />
        <KpiCard icon={Users} label="Total Users" value={totalUsers.toLocaleString()} />
        <KpiCard icon={AlertTriangle} label="Pending Payments" value={pendingPayments.toString()} sub="ต้องตรวจสอบ" accent="red" />
        <KpiCard icon={Receipt} label="Trial Companies" value={companies.filter((company) => company.status === "trial").length.toString()} sub="กำลังทดลองใช้" accent="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3">โปรเจคงบสูงสุด</h3>
          <div className="space-y-2">
            {projects.length === 0 ? (
              <Empty text="ยังไม่มีโครงการ" />
            ) : (
              projects.slice().sort((a, b) => Number(b.budget ?? 0) - Number(a.budget ?? 0)).slice(0, 5).map((project) => (
                <div key={project.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{project.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{project.clientName}</div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-sm font-semibold text-slate-900">{money(project.budget)}</div>
                    <div className="text-[11px] text-slate-500">{project.progress}% · {project.overdueCount} ล่าช้า</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3">บริษัทล่าสุด</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">บริษัท</th>
                  <th className="py-2 pr-4">แพ็กเกจ</th>
                  <th className="py-2 pr-4">โปรเจค</th>
                  <th className="py-2 pr-4">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {companies.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-500">ยังไม่มีบริษัท</td></tr>
                ) : (
                  companies.slice(0, 6).map((company) => (
                    <tr key={company.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-medium text-slate-900">{company.name}</td>
                      <td className="py-3 pr-4 text-slate-600">{company.planName}</td>
                      <td className="py-3 pr-4 text-slate-600">{company.projects}</td>
                      <td className="py-3 pr-4 uppercase text-xs">{company.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="py-8 text-center text-sm text-slate-500">{text}</div>;
}
