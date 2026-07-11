"use client";

// แถวงานในตารางหลัก พร้อมกาง Subitems ได้แบบ monday
import { useState } from "react";
import Link from "next/link";
import { ticketCode, fmtDate, isOverdue, buShort } from "@/lib/constants";
import { StatusCell, PriorityCell, OwnerCell } from "@/components/Cells";
import { IconChat, IconChevronRight } from "@/components/Icons";
import { addSubtask, toggleSubtask, deleteSubtask } from "@/lib/actions";

export type SubItem = {
  id: string;
  title: string;
  done: boolean;
  dueDate: Date | null;
  assignee: { name: string } | null;
};

export type RowTicket = {
  id: string;
  number: number;
  title: string;
  bu: string;
  customer: string;
  status: string;
  priority: string;
  jobType: string;
  dueDate: Date | null;
  commentCount: number;
  assignee: { id: string; name: string } | null;
  subtasks: SubItem[];
};

export function TicketRow({
  ticket: t,
  users,
}: {
  ticket: RowTicket;
  users: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const done = t.subtasks.filter((s) => s.done).length;

  return (
    <>
      <tr className="transition hover:bg-slate-50">
        <td className="px-2 py-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setOpen(!open)}
              className={`shrink-0 rounded p-0.5 text-slate-400 transition-transform hover:bg-slate-100 hover:text-slate-600 ${
                open ? "rotate-90" : ""
              }`}
              title={open ? "ซ่อนงานย่อย" : "แสดงงานย่อย"}
            >
              <IconChevronRight size={13} />
            </button>
            <Link
              href={`/tickets/${t.id}`}
              className="font-medium text-slate-800 hover:text-brand-600"
            >
              {t.title}
            </Link>
            {t.commentCount > 0 && (
              <span className="ml-1.5 inline-flex items-center gap-1 text-xs text-slate-400">
                <IconChat size={12} />
                {t.commentCount}
              </span>
            )}
            {t.subtasks.length > 0 && (
              <span
                className={`ml-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  done === t.subtasks.length
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-slate-100 text-slate-500"
                }`}
                title="งานย่อย"
              >
                ✓ {done}/{t.subtasks.length}
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            {t.bu && (
              <span
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600"
                title={t.bu}
              >
                {buShort(t.bu)}
              </span>
            )}
            <span className="text-slate-600">{t.customer}</span>
          </div>
        </td>
        <td className="px-3 py-2">
          <OwnerCell ticketId={t.id} assignee={t.assignee} users={users} />
        </td>
        <td className="px-1 py-1 text-center">
          <StatusCell ticketId={t.id} status={t.status} />
        </td>
        <td className="px-1 py-1 text-center">
          <PriorityCell ticketId={t.id} priority={t.priority} />
        </td>
        <td className="px-3 py-2 text-xs text-slate-400">{ticketCode(t.number)}</td>
        <td className="px-3 py-2 text-xs text-slate-500">{t.jobType}</td>
        <td
          className={`px-3 py-2 text-xs ${
            t.status === "DONE"
              ? "text-slate-400 line-through"
              : isOverdue(t.dueDate, t.status)
                ? "font-semibold text-brand-600"
                : "text-slate-500"
          }`}
        >
          {fmtDate(t.dueDate)}
          {isOverdue(t.dueDate, t.status) && (
            <span className="ml-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
              เลยกำหนด
            </span>
          )}
        </td>
      </tr>

      {/* Subitems กางในตาราง */}
      {open && (
        <tr className="bg-slate-50/70">
          <td colSpan={8} className="px-4 pb-3 pt-1">
            <div className="ml-6 overflow-hidden rounded-lg border border-slate-200 bg-white"
              style={{ borderLeft: "4px solid #f07676" }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] text-slate-400">
                    <th className="px-3 py-2 font-medium">Subitem</th>
                    <th className="px-3 py-2 font-medium">ผู้รับผิดชอบ</th>
                    <th className="w-28 px-3 py-2 text-center font-medium">สถานะ</th>
                    <th className="px-3 py-2 font-medium">วันที่</th>
                    <th className="w-8 px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {t.subtasks.map((st) => (
                    <tr key={st.id}>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <form action={toggleSubtask}>
                            <input type="hidden" name="subtaskId" value={st.id} />
                            <button
                              className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] transition ${
                                st.done
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-slate-300 bg-white text-transparent hover:border-emerald-400"
                              }`}
                              title={st.done ? "ยกเลิกเสร็จ" : "ทำเสร็จแล้ว"}
                            >
                              ✓
                            </button>
                          </form>
                          <span
                            className={
                              st.done
                                ? "text-slate-400 line-through"
                                : "text-slate-700"
                            }
                          >
                            {st.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-xs text-slate-500">
                        {st.assignee?.name ?? "—"}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-[10px] font-medium text-white ${
                            st.done ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        >
                          {st.done ? "เสร็จแล้ว" : "ยังไม่เสร็จ"}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-xs text-slate-500">
                        {fmtDate(st.dueDate)}
                      </td>
                      <td className="px-2 py-1.5">
                        <form action={deleteSubtask}>
                          <input type="hidden" name="subtaskId" value={st.id} />
                          <button
                            className="rounded px-1 text-slate-300 transition hover:bg-slate-100 hover:text-brand-600"
                            title="ลบงานย่อย"
                          >
                            ×
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={5} className="px-3 py-1.5">
                      <form action={addSubtask} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="ticketId" value={t.id} />
                        <span className="text-slate-400">+</span>
                        <input
                          name="title"
                          placeholder="Add subitem..."
                          required
                          className="w-56 rounded border border-transparent bg-transparent px-2 py-1 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                        />
                        <select
                          name="assigneeId"
                          defaultValue=""
                          className="rounded border border-transparent bg-transparent px-2 py-1 text-sm text-slate-500 outline-none focus:border-slate-300 focus:bg-white"
                        >
                          <option value="">มอบหมายให้...</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                        <input
                          name="dueDate"
                          type="date"
                          className="rounded border border-transparent bg-transparent px-2 py-1 text-xs text-slate-500 outline-none focus:border-slate-300 focus:bg-white"
                        />
                        <button className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                          บันทึก
                        </button>
                      </form>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
