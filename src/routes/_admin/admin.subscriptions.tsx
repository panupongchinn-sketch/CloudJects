import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { fetchOrganizations, money } from "@/lib/app-data";

type OrganizationItem = Awaited<ReturnType<typeof fetchOrganizations>>[number];

export const Route = createFileRoute("/_admin/admin/subscriptions")({
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const [rows, setRows] = useState<OrganizationItem[]>([]);
  const now = new Date();

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
              <th className="py-3 px-4 text-right">ราคา/เดือน</th>
              <th className="py-3 px-4">รอบบิลถัดไป</th>
              <th className="py-3 px-4">สถานะ</th>
              <th className="py-3 px-4">ชำระ</th>
              <th className="py-3 px-4">วันที่เหลือ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-slate-500">ยังไม่มี subscription ในฐานข้อมูล</td></tr>
            ) : (
              rows.map((company) => {
                const due = company.nextBilling && company.nextBilling !== "-" ? new Date(company.nextBilling) : null;
                const daysLeft = due ? Math.ceil((due.getTime() - now.getTime()) / 86400000) : null;
                return (
                  <tr key={company.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900">{company.name}</td>
                    <td className="py-3 px-4">{company.planName}</td>
                    <td className="py-3 px-4 text-right font-medium">{money(company.monthlyPrice)}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">{company.nextBilling}</td>
                    <td className="py-3 px-4 uppercase text-xs">{company.status}</td>
                    <td className="py-3 px-4 uppercase text-xs">{company.payment}</td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-600">
                      {daysLeft == null ? "-" : daysLeft < 0 ? `${Math.abs(daysLeft)} วันเกินกำหนด` : `${daysLeft} วัน`}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
