import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { updateStatus } from "@/lib/actions";
import { STATUSES, fmtDate, isOverdue, ticketCode, buShort } from "@/lib/constants";
import { PriorityBadge, Avatar } from "@/components/Badge";
import { IconChevronLeft, IconChevronRight } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const tickets = await prisma.ticket.findMany({
    include: { assignee: true, subtasks: { select: { done: true } } },
    orderBy: { number: "asc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">จัดการงาน</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          มุมมอง Kanban — คลิกปุ่มลูกศรบนการ์ดเพื่อย้ายสถานะ
        </p>
        <div className="mt-3 flex gap-1 border-b border-slate-200 text-sm">
          <Link href="/tickets" className="px-3 py-2 text-slate-500 hover:text-slate-900">
            ตารางหลัก
          </Link>
          <span className="border-b-2 border-brand-600 px-3 py-2 font-medium text-slate-900">
            Kanban
          </span>
          <Link href="/" className="px-3 py-2 text-slate-500 hover:text-slate-900">
            แดชบอร์ด
          </Link>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        {STATUSES.map((s, colIdx) => {
          const items = tickets.filter((t) => t.status === s.value);
          return (
            <div key={s.value} className="rounded-xl bg-slate-100 p-2.5">
              <div
                className="mb-2.5 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: s.color }}
              >
                <span>{s.label}</span>
                <span className="rounded-full bg-black/20 px-2 text-xs">
                  {items.length}
                </span>
              </div>

              <div className="space-y-2">
                {items.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <div className="mb-1 text-[10px] text-slate-400">
                      {ticketCode(t.number)}
                    </div>
                    <Link
                      href={`/tickets/${t.id}`}
                      className="block text-sm font-medium leading-snug text-slate-800 hover:text-brand-600"
                    >
                      {t.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      {t.bu && (
                        <span
                          className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-semibold text-slate-600"
                          title={t.bu}
                        >
                          {buShort(t.bu)}
                        </span>
                      )}
                      {t.customer}
                    </div>
                    {t.subtasks.length > 0 && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                          <div
                            className="h-1.5 rounded-full bg-emerald-500"
                            style={{
                              width: `${(t.subtasks.filter((s) => s.done).length / t.subtasks.length) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {t.subtasks.filter((s) => s.done).length}/{t.subtasks.length}
                        </span>
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <PriorityBadge priority={t.priority} />
                      {t.dueDate && (
                        <span
                          className={`text-xs ${
                            isOverdue(t.dueDate, t.status)
                              ? "font-semibold text-brand-600"
                              : "text-slate-400"
                          }`}
                        >
                          {fmtDate(t.dueDate)}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                      <span className="flex items-center gap-1.5 truncate text-xs text-slate-600">
                        <Avatar name={t.assignee?.name} />
                        {t.assignee?.name ?? "—"}
                      </span>
                      <div className="flex gap-1">
                        {colIdx > 0 && (
                          <form action={updateStatus}>
                            <input type="hidden" name="ticketId" value={t.id} />
                            <input
                              type="hidden"
                              name="status"
                              value={STATUSES[colIdx - 1].value}
                            />
                            <button
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                              title={`ย้ายไป ${STATUSES[colIdx - 1].label}`}
                            >
                              <IconChevronLeft size={14} />
                            </button>
                          </form>
                        )}
                        {colIdx < STATUSES.length - 1 && (
                          <form action={updateStatus}>
                            <input type="hidden" name="ticketId" value={t.id} />
                            <input
                              type="hidden"
                              name="status"
                              value={STATUSES[colIdx + 1].value}
                            />
                            <button
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                              title={`ย้ายไป ${STATUSES[colIdx + 1].label}`}
                            >
                              <IconChevronRight size={14} />
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                    ไม่มีงาน
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
