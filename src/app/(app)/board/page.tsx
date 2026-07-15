import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { updateStatus } from "@/lib/actions";
import {
  STATUSES,
  PRIORITIES,
  fmtDate,
  isOverdue,
  slaInfo,
  ticketCode,
  buShort,
} from "@/lib/constants";
import { PriorityBadge } from "@/components/Badge";
import { IconChevronLeft, IconChevronRight, IconSearch } from "@/components/Icons";
import { KanbanQuickAdd } from "@/components/KanbanQuickAdd";

export const dynamic = "force-dynamic";

type Search = {
  q?: string;
  bu?: string;
  priority?: string;
  assignee?: string;
  from?: string;
  to?: string;
};

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { q, bu, priority, assignee, from, to } = searchParams;

  const [tickets, users, busRows] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        ...(bu ? { bu } : {}),
        ...(priority ? { priority } : {}),
        ...(assignee ? { assignees: { some: { id: assignee } } } : {}),
        ...(from || to
          ? {
              dueDate: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
              },
            }
          : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q } },
                { customer: { contains: q } },
                { bu: { contains: q } },
              ],
            }
          : {}),
      },
      include: { assignees: true, subtasks: { select: { done: true } } },
      orderBy: { number: "asc" },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.businessUnit.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const busNames = busRows.map((b) => b.name);
  const userOpts = users.map((u) => ({ id: u.id, name: u.name }));

  // ลิงก์ "เดือนนี้": กำหนดส่งภายในเดือนปัจจุบัน
  const now = new Date();
  const mFirst = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const mLast = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  ).padStart(2, "0")}`;
  const monthQS = new URLSearchParams({
    ...(q ? { q } : {}),
    ...(bu ? { bu } : {}),
    ...(priority ? { priority } : {}),
    ...(assignee ? { assignee } : {}),
    from: mFirst,
    to: mLast,
  }).toString();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">จัดการงาน</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          มุมมอง Kanban — กด + เพิ่มงานในคอลัมน์ หรือใช้ลูกศรบนการ์ดย้ายสถานะ
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

      {/* ฟิลเตอร์ + ค้นหา + วันที่ */}
      <form className="flex flex-wrap items-center gap-2" method="GET">
        <div className="relative">
          <IconSearch
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="ค้นหางาน / ลูกค้า"
            className="input w-48 pl-9"
          />
        </div>
        <select name="bu" defaultValue={bu ?? ""} className="input max-w-40">
          <option value="">BU: ทั้งหมด</option>
          {busNames.map((b) => (
            <option key={b} value={b}>{buShort(b)}</option>
          ))}
        </select>
        <select name="priority" defaultValue={priority ?? ""} className="input max-w-40">
          <option value="">ความสำคัญ: ทั้งหมด</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select name="assignee" defaultValue={assignee ?? ""} className="input max-w-40">
          <option value="">ผู้รับผิดชอบ: ทั้งหมด</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <span className="text-sm text-slate-500">กำหนดส่ง:</span>
        <input name="from" type="date" defaultValue={from} className="input max-w-36" />
        <span className="text-slate-400">ถึง</span>
        <input name="to" type="date" defaultValue={to} className="input max-w-36" />
        <button className="btn-secondary">กรอง</button>
        <Link
          href={`/board?${monthQS}`}
          className={`rounded-lg border px-3 py-2 text-sm transition ${
            from === mFirst && to === mLast
              ? "border-brand-600 bg-brand-50 text-brand-700"
              : "border-slate-300 text-slate-600 hover:bg-slate-100"
          }`}
        >
          เดือนนี้
        </Link>
        {(q || bu || priority || assignee || from || to) && (
          <Link href="/board" className="text-sm text-slate-400 hover:text-slate-600">
            ล้างฟิลเตอร์
          </Link>
        )}
      </form>

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
                {items.map((t) => {
                  const sla = slaInfo(t.dueDate, t.status);
                  return (
                    <div
                      key={t.id}
                      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          {ticketCode(t.number)}
                        </span>
                        {sla && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              sla.tone === "over"
                                ? "bg-brand-50 text-brand-700"
                                : sla.tone === "warn"
                                  ? "bg-amber-50 text-amber-600"
                                  : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {sla.label}
                          </span>
                        )}
                        {t.status === "DONE" && t.completedAt && (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                            เสร็จ {fmtDate(t.completedAt)}
                          </span>
                        )}
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
                                width: `${(t.subtasks.filter((x) => x.done).length / t.subtasks.length) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {t.subtasks.filter((x) => x.done).length}/{t.subtasks.length}
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
                          {t.assignees.length === 0 ? (
                            "—"
                          ) : (
                            <>
                              <span className="flex -space-x-1.5">
                                {t.assignees.slice(0, 3).map((a) => (
                                  <span
                                    key={a.id}
                                    title={a.name}
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white ring-2 ring-white"
                                  >
                                    {a.name.charAt(0)}
                                  </span>
                                ))}
                              </span>
                              <span className="truncate">
                                {t.assignees.length === 1
                                  ? t.assignees[0].name
                                  : `+${t.assignees.length} คน`}
                              </span>
                            </>
                          )}
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
                  );
                })}
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                    ไม่มีงาน
                  </div>
                )}
              </div>

              {/* + เพิ่มงานในคอลัมน์นี้ */}
              <KanbanQuickAdd status={s.value} users={userOpts} busNames={busNames} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
