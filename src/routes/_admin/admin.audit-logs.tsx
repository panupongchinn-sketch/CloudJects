import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type AuditLog = {
  id: string;
  created_at: string;
  action: string;
  ref_type: string | null;
  ref_id: string | null;
  detail_json: unknown;
};

export const Route = createFileRoute("/_admin/admin/audit-logs")({
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    supabase
      .from("admin_audit_logs")
      .select("id,created_at,action,ref_type,ref_id,detail_json")
      .order("created_at", { ascending: false })
      .then(({ data }) => setLogs((data ?? []) as AuditLog[]));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
              <th className="py-3 px-4">เวลา</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">เป้าหมาย</th>
              <th className="py-3 px-4">รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={4} className="py-10 text-center text-slate-500">ยังไม่มี audit log ในฐานข้อมูล</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100">
                  <td className="py-3 px-4 text-xs text-slate-500 font-mono">{new Date(log.created_at).toLocaleString("th-TH")}</td>
                  <td className="py-3 px-4"><span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">{log.action}</span></td>
                  <td className="py-3 px-4 text-slate-700">{log.ref_type ?? "-"} {log.ref_id ?? ""}</td>
                  <td className="py-3 px-4 text-slate-500 text-xs">{log.detail_json ? JSON.stringify(log.detail_json) : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
