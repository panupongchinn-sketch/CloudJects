import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, Mail, Calendar, Power, Repeat, FileText } from "lucide-react";
import { fetchAdminProjects, fetchOrganizations, money } from "@/lib/app-data";

type OrganizationItem = Awaited<ReturnType<typeof fetchOrganizations>>[number];
type AdminProject = Awaited<ReturnType<typeof fetchAdminProjects>>[number];

export const Route = createFileRoute("/_admin/admin/companies/$companyId")({
  component: CompanyDetail,
});

function Pct({ used, max }: { used: number; max: number }) {
  if (max < 0) return <span className="text-xs text-slate-500">Unlimited</span>;
  const safeMax = max || Math.max(used, 1);
  const pct = Math.min((used / safeMax) * 100, 100);
  const color = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-600 w-20 text-right">{used} / {safeMax}</span>
    </div>
  );
}

function CompanyDetail() {
  const { companyId } = Route.useParams();
  const [company, setCompany] = useState<OrganizationItem | null>(null);
  const [projects, setProjects] = useState<AdminProject[]>([]);

  useEffect(() => {
    Promise.all([fetchOrganizations(), fetchAdminProjects()]).then(([companies, allProjects]) => {
      const found = companies.find((item) => item.id === companyId) ?? null;
      setCompany(found);
      setProjects(allProjects.filter((project) => project.organization_id === companyId));
    });
  }, [companyId]);

  if (!company) {
    return (
      <div className="space-y-6">
        <Link to="/admin/companies" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> กลับไปรายการบริษัท
        </Link>
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
          ไม่พบบริษัทนี้ในฐานข้อมูล
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/admin/companies" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> กลับไปรายการบริษัท
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start gap-4">
            <div className="grid place-items-center h-16 w-16 rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-8 w-8" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900">{company.name}</h1>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase bg-slate-100 text-slate-700">{company.status}</span>
                <span className="text-xs text-slate-500">สร้างเมื่อ {company.created_at.slice(0, 10)}</span>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {company.email ?? "-"}</div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-400" /> รอบบิลถัดไป {company.nextBilling}</div>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-slate-200 flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90">
              <Repeat className="h-4 w-4" /> เปลี่ยนแพ็กเกจ
            </button>
            <button className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50">
              <Power className="h-4 w-4" /> ระงับบริษัท
            </button>
            <button className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
              <FileText className="h-4 w-4" /> ดู Audit Log
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs uppercase text-slate-500">แพ็กเกจปัจจุบัน</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{company.planName}</div>
          <div className="text-sm text-slate-500 mt-1">รอบบิลรายเดือน</div>
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
            <div><div className="text-[11px] uppercase text-slate-500 mb-1">Users</div><Pct used={company.users} max={company.limits?.max_users ?? 0} /></div>
            <div><div className="text-[11px] uppercase text-slate-500 mb-1">Projects</div><Pct used={company.projects} max={company.limits?.max_projects ?? 0} /></div>
            <div><div className="text-[11px] uppercase text-slate-500 mb-1">Storage (GB)</div><Pct used={0} max={company.limits?.max_storage_gb ?? 0} /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="งบประมาณรวม" value={money(company.budget)} />
        <Stat label="ความคืบหน้าเฉลี่ย" value={`${company.progress}%`} />
        <Stat label="Projects" value={`${company.projects}`} />
        <Stat label="Users" value={`${company.users}`} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-3">โปรเจคในบริษัท</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-4">ชื่อโปรเจค</th>
                <th className="py-2 pr-4">ลูกค้า</th>
                <th className="py-2 pr-4">PM</th>
                <th className="py-2 pr-4 text-right">งบ</th>
                <th className="py-2 pr-4">Progress</th>
                <th className="py-2 pr-4 text-right">Task</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">ยังไม่มีโปรเจคในบริษัทนี้</td></tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-900">{project.name}</td>
                    <td className="py-3 pr-4 text-slate-600">{project.clientName}</td>
                    <td className="py-3 pr-4 text-slate-600">{project.managerName}</td>
                    <td className="py-3 pr-4 text-right font-medium text-slate-900">{money(project.budget)}</td>
                    <td className="py-3 pr-4">{project.progress}%</td>
                    <td className="py-3 pr-4 text-right text-slate-600">{project.taskCount}</td>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
