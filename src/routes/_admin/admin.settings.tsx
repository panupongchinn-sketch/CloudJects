import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">ชื่อ Platform</label>
          <input className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" defaultValue="CloudJect" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">อีเมลผู้ดูแล</label>
          <input className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" defaultValue="admin@apexfield.io" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Trial Days สำหรับบริษัทใหม่</label>
          <input type="number" className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" defaultValue={14} />
        </div>
        <div className="pt-3 border-t border-slate-200">
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
