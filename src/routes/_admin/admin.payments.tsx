import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/app-data";

type Invoice = {
  id: string;
  invoice_no: string;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  status: string;
  billing_month: string | null;
  payment_method: string | null;
  organizations?: { name: string } | null;
};

export const Route = createFileRoute("/_admin/admin/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const [rows, setRows] = useState<Invoice[]>([]);

  useEffect(() => {
    supabase
      .from("invoices")
      .select("id,invoice_no,amount,due_date,paid_at,status,billing_month,payment_method, organizations(name)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data ?? []) as Invoice[]));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="grid grid-cols-3 gap-3">
          <Kpi label="Paid" value={rows.filter((row) => row.status === "paid").length} tone="green" />
          <Kpi label="Pending" value={rows.filter((row) => row.status === "pending").length} tone="amber" />
          <Kpi label="Overdue" value={rows.filter((row) => row.status === "overdue").length} tone="red" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
              <th className="py-3 px-4">Invoice No.</th>
              <th className="py-3 px-4">บริษัท</th>
              <th className="py-3 px-4">รอบบิล</th>
              <th className="py-3 px-4 text-right">จำนวนเงิน</th>
              <th className="py-3 px-4">ครบกำหนด</th>
              <th className="py-3 px-4">วันที่ชำระ</th>
              <th className="py-3 px-4">ช่องทาง</th>
              <th className="py-3 px-4">สถานะ</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="py-10 text-center text-slate-500">ยังไม่มี invoice ในฐานข้อมูล</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono text-xs text-slate-700">{row.invoice_no}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{row.organizations?.name ?? "-"}</td>
                  <td className="py-3 px-4 text-slate-600">{row.billing_month ?? "-"}</td>
                  <td className="py-3 px-4 text-right font-medium text-slate-900">{money(row.amount)}</td>
                  <td className="py-3 px-4 text-xs text-slate-500">{row.due_date ?? "-"}</td>
                  <td className="py-3 px-4 text-xs text-slate-500">{row.paid_at?.slice(0, 10) ?? "-"}</td>
                  <td className="py-3 px-4 text-slate-600">{row.payment_method ?? "-"}</td>
                  <td className="py-3 px-4 uppercase text-xs">{row.status}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1.5">
                      <button className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
                        <Download className="h-3 w-3" /> Invoice
                      </button>
                      {row.status !== "paid" ? (
                        <button className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 text-white hover:opacity-90">
                          <CheckCircle2 className="h-3 w-3" /> Mark Paid
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "red" }) {
  const color = tone === "green" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : "text-primary";
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-2">
      <div className="text-[11px] uppercase text-slate-500">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}
