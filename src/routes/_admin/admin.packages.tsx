import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, X, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/app-data";

type Plan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthly_price: number;
  max_users: number;
  max_projects: number;
  max_storage_gb: number;
  can_use_gantt: boolean;
  can_use_custom_form: boolean;
  can_use_client_portal: boolean;
  can_use_advanced_approval: boolean;
  can_use_api: boolean;
};

export const Route = createFileRoute("/_admin/admin/packages")({
  component: PackagesPage,
});

const featureRows = [
  { key: "can_use_gantt", label: "Gantt Chart" },
  { key: "can_use_custom_form", label: "Custom Form Builder" },
  { key: "can_use_client_portal", label: "Client Portal" },
  { key: "can_use_advanced_approval", label: "Advanced Approval Workflow" },
  { key: "can_use_api", label: "API Access" },
] as const;

function PackagesPage() {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    supabase
      .from("subscription_plans")
      .select("id,code,name,description,monthly_price,max_users,max_projects,max_storage_gb,can_use_gantt,can_use_custom_form,can_use_client_portal,can_use_advanced_approval,can_use_api,sort_order")
      .order("sort_order", { ascending: true })
      .then(({ data }) => setPlans((data ?? []) as Plan[]));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">แพ็กเกจ</h1>
          <p className="text-sm text-slate-500 mt-1">{plans.length} แพ็กเกจจาก subscription_plans</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          เพิ่มแพ็กเกจ
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">ยังไม่มีแพ็กเกจในฐานข้อมูล</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-xl border-2 border-slate-200 p-6 relative">
              <div className="text-xs uppercase text-slate-500">{plan.code}</div>
              <h3 className="mt-1 text-xl font-bold text-slate-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-500 min-h-[40px]">{plan.description ?? "-"}</p>
              <div className="mt-4">
                <span className="text-3xl font-bold text-slate-900">{money(plan.monthly_price)}</span>
                <span className="text-sm text-slate-500">/เดือน</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li className="flex justify-between"><span>ผู้ใช้</span><span className="font-medium">สูงสุด {plan.max_users}</span></li>
                <li className="flex justify-between"><span>โปรเจค</span><span className="font-medium">{plan.max_projects < 0 ? "ไม่จำกัด" : plan.max_projects}</span></li>
                <li className="flex justify-between"><span>Storage</span><span className="font-medium">{plan.max_storage_gb} GB</span></li>
              </ul>
              <button className="mt-5 w-full inline-flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm">
                <Edit2 className="h-4 w-4" /> แก้ไขแพ็กเกจ
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">เปรียบเทียบฟีเจอร์</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
              <th className="py-3 px-4">ฟีเจอร์</th>
              {plans.map((plan) => <th key={plan.id} className="py-3 px-4 text-center">{plan.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {featureRows.map((feature) => (
              <tr key={feature.key} className="border-b border-slate-100">
                <td className="py-3 px-4 text-slate-700">{feature.label}</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="py-3 px-4 text-center">
                    {plan[feature.key] ? <Check className="h-4 w-4 text-emerald-600 inline" /> : <X className="h-4 w-4 text-slate-300 inline" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
