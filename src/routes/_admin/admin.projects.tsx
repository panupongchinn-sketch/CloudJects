import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Download } from "lucide-react";
import { fetchAdminProjects, money } from "@/lib/app-data";

type AdminProject = Awaited<ReturnType<typeof fetchAdminProjects>>[number];

export const Route = createFileRoute("/_admin/admin/projects")({
  component: AllProjects,
});

function AllProjects() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [projects, setProjects] = useState<AdminProject[]>([]);

  useEffect(() => {
    fetchAdminProjects().then(setProjects);
  }, []);

  const rows = projects.filter((project) =>
    `${project.name} ${project.clientName} ${project.managerName}`.toLowerCase().includes(q.toLowerCase()) &&
    (status === "all" || project.status === status),
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50">
            <Download className="h-4 w-4" /> Export Excel
          </button>
          <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50">
            <Download className="h-4 w-4" /> Export PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อโปรเจค..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
          <option value="all">ทุกสถานะ</option>
          <option value="Planning">Planning</option>
          <option value="In Progress">In Progress</option>
          <option value="On Hold">On Hold</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4">โปรเจค</th>
                <th className="py-3 px-4">ลูกค้า</th>
                <th className="py-3 px-4">PM</th>
                <th className="py-3 px-4">สถานะ</th>
                <th className="py-3 px-4 text-right">งบ</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4 text-right">Task</th>
                <th className="py-3 px-4 text-right">ล่าช้า</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-slate-500">ยังไม่มีโครงการในฐานข้อมูล</td></tr>
              ) : (
                rows.map((project) => (
                  <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900">{project.name}</td>
                    <td className="py-3 px-4 text-slate-600">{project.clientName}</td>
                    <td className="py-3 px-4 text-slate-600">{project.managerName}</td>
                    <td className="py-3 px-4">{project.status}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">{money(project.budget)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${project.progress}%` }} />
                        </div>
                        <span className="text-xs text-slate-600 w-8">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">{project.taskCount}</td>
                    <td className={`py-3 px-4 text-right font-medium ${project.overdueCount > 0 ? "text-primary" : "text-slate-400"}`}>{project.overdueCount}</td>
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
