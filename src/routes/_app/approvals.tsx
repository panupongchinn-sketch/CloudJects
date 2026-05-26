import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { Header } from "@/components/layout/header";
import { StatusBadge } from "@/components/status-badge";
import { fetchApprovals, initials } from "@/lib/app-data";

type ApprovalItem = Awaited<ReturnType<typeof fetchApprovals>>[number];

export const Route = createFileRoute("/_app/approvals")({
  component: ApprovalsPage,
  head: () => ({ meta: [{ title: "Approvals - CloudJect" }] }),
});

function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovals()
      .then(setApprovals)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Header title="การอนุมัติ" subtitle="รายการที่รออนุมัติทั้งหมด" />
      <main className="flex-1 p-4 lg:p-6 space-y-4">
        <div className="card-surface p-0 overflow-hidden">
          <div className="hidden md:grid grid-cols-12 px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground bg-secondary/60">
            <div className="col-span-4">รายการ</div>
            <div className="col-span-2">ประเภท</div>
            <div className="col-span-2">โครงการ</div>
            <div className="col-span-2">ผู้ส่ง</div>
            <div className="col-span-1">สถานะ</div>
            <div className="col-span-1 text-right">การกระทำ</div>
          </div>
          <ul className="divide-y divide-border">
            {loading ? (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">กำลังโหลด...</li>
            ) : approvals.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">ยังไม่มีรายการอนุมัติในฐานข้อมูล</li>
            ) : (
              approvals.map((approval) => (
                <li key={approval.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-accent/40">
                  <div className="md:col-span-4">
                    <div className="font-medium text-sm">{approval.note || approval.ref_type}</div>
                    <div className="text-xs text-muted-foreground md:hidden">
                      {approval.ref_type} · {approval.projects?.name}
                    </div>
                  </div>
                  <div className="hidden md:block md:col-span-2 text-sm text-muted-foreground">{approval.ref_type}</div>
                  <div className="hidden md:block md:col-span-2 text-sm truncate">{approval.projects?.name ?? "-"}</div>
                  <div className="hidden md:flex md:col-span-2 items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-secondary grid place-items-center text-[10px] font-semibold">
                      {initials(approval.requester?.full_name, approval.requester?.email)}
                    </div>
                    <span className="text-sm truncate">{approval.requester?.full_name ?? approval.requester?.email ?? "-"}</span>
                  </div>
                  <div className="md:col-span-1">
                    <StatusBadge kind="approval" value={approval.status} />
                  </div>
                  <div className="md:col-span-1 flex justify-end gap-1">
                    {approval.status === "Pending" ? (
                      <>
                        <button className="h-9 w-9 grid place-items-center rounded-lg bg-success/15 text-success hover:bg-success/25">
                          <Check className="h-4 w-4" />
                        </button>
                        <button className="h-9 w-9 grid place-items-center rounded-lg bg-primary-soft text-primary hover:bg-primary-soft/70">
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </main>
    </>
  );
}
