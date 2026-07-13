"use client";

// แถวงานในตารางหลัก — ทุกช่องคลิกแก้ไขได้ทันที + กาง Subitems ได้แบบ monday
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ticketCode, fmtDate, isOverdue, buShort, JOB_TYPES } from "@/lib/constants";
import { StatusCell, PriorityCell, OwnerCell } from "@/components/Cells";
import { IconChat, IconChevronRight } from "@/components/Icons";
import {
  addSubtask,
  toggleSubtask,
  deleteSubtask,
  setTicketInline,
  setSubtaskInline,
} from "@/lib/actions";
import { toast } from "@/components/Toaster";

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

// ---------- ตัวแก้ไข inline ขนาดเล็ก ----------

function InlineText({
  value,
  onSave,
  className = "",
  width = "w-40",
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  width?: string;
}) {
  const [editing, setEditing] = useState(false);
  if (editing)
    return (
      <input
        autoFocus
        defaultValue={value}
        className={`${width} rounded border border-slate-300 bg-white px-2 py-0.5 text-sm outline-none focus:border-brand-500`}
        onBlur={(e) => {
          setEditing(false);
          const v = e.target.value.trim();
          if (v && v !== value) onSave(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="คลิกเพื่อแก้ไข"
      className={`rounded px-1 py-0.5 text-left transition hover:bg-slate-100 ${className}`}
    >
      {value || "—"}
    </button>
  );
}

function InlineSelect({
  display,
  value,
  options,
  onSave,
  title,
}: {
  display: React.ReactNode;
  value: string;
  options: { v: string; l: string }[];
  onSave: (v: string) => void;
  title?: string;
}) {
  const [editing, setEditing] = useState(false);
  if (editing)
    return (
      <select
        autoFocus
        defaultValue={value}
        className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs outline-none focus:border-brand-500"
        onBlur={() => setEditing(false)}
        onChange={(e) => {
          onSave(e.target.value);
          setEditing(false);
        }}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.l}</option>
        ))}
      </select>
    );
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title={title ?? "คลิกเพื่อแก้ไข"}
      className="rounded transition hover:bg-slate-100"
    >
      {display}
    </button>
  );
}

function InlineDate({
  value,
  onSave,
  children,
}: {
  value: Date | string | null;
  onSave: (v: string) => void;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const str = value ? new Date(value).toISOString().slice(0, 10) : "";
  if (editing)
    return (
      <input
        type="date"
        autoFocus
        defaultValue={str}
        className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs outline-none"
        onBlur={() => setEditing(false)}
        onChange={(e) => {
          onSave(e.target.value);
          setEditing(false);
        }}
      />
    );
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="คลิกเพื่อแก้วันที่"
      className="rounded px-1 py-0.5 transition hover:bg-slate-100"
    >
      {children}
    </button>
  );
}

// ---------- แถวงาน ----------

export function TicketRow({
  ticket: t,
  users,
  busNames,
}: {
  ticket: RowTicket;
  users: { id: string; name: string }[];
  busNames: string[];
}) {
  const [open, setOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const done = t.subtasks.filter((s) => s.done).length;

  function save(patch: Parameters<typeof setTicketInline>[1]) {
    toast("บันทึกการแก้ไขเรียบร้อยแล้ว");
    startTransition(async () => {
      await setTicketInline(t.id, patch);
      router.refresh();
    });
  }

  function saveSub(id: string, patch: Parameters<typeof setSubtaskInline>[1]) {
    toast("บันทึกการแก้ไขเรียบร้อยแล้ว");
    startTransition(async () => {
      await setSubtaskInline(id, patch);
      router.refresh();
    });
  }

  const buOpts = [
    { v: "", l: "— ไม่ระบุ —" },
    ...busNames.map((b) => ({ v: b, l: buShort(b) })),
    ...(t.bu && !busNames.includes(t.bu) ? [{ v: t.bu, l: buShort(t.bu) }] : []),
  ];

  return (
    <>
      <tr className="group transition hover:bg-slate-50">
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

            {editingTitle ? (
              <input
                autoFocus
                defaultValue={t.title}
                className="w-72 rounded border border-slate-300 bg-white px-2 py-0.5 text-sm outline-none focus:border-brand-500"
                onBlur={(e) => {
                  setEditingTitle(false);
                  const v = e.target.value.trim();
                  if (v && v !== t.title) save({ title: v });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                  if (e.key === "Escape") setEditingTitle(false);
                }}
              />
            ) : (
              <>
                <Link
                  href={`/tickets/${t.id}`}
                  className="font-medium text-slate-800 hover:text-brand-600"
                >
                  {t.title}
                </Link>
                <button
                  type="button"
                  onClick={() => setEditingTitle(true)}
                  className="ml-1 hidden shrink-0 text-slate-300 hover:text-slate-500 group-hover:inline"
                  title="แก้ชื่องาน"
                >
                  ✎
                </button>
              </>
            )}

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

        {/* ลูกค้า: BU + ชื่อ แก้ได้ */}
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <InlineSelect
              value={t.bu}
              options={buOpts}
              onSave={(v) => save({ bu: v })}
              title="คลิกเพื่อเปลี่ยนกลุ่ม BU"
              display={
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                  {t.bu ? buShort(t.bu) : "BU?"}
                </span>
              }
            />
            <InlineText
              value={t.customer}
              onSave={(v) => save({ customer: v })}
              className="text-slate-600"
            />
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

        {/* ประเภท: แก้ได้ */}
        <td className="px-3 py-2 text-xs">
          <InlineSelect
            value={t.jobType}
            options={JOB_TYPES.map((j) => ({ v: j, l: j }))}
            onSave={(v) => save({ jobType: v })}
            title="คลิกเพื่อเปลี่ยนประเภทงาน"
            display={<span className="px-1 py-0.5 text-slate-500">{t.jobType}</span>}
          />
        </td>

        {/* กำหนดส่ง: แก้ได้ */}
        <td className="px-3 py-2 text-xs">
          <InlineDate value={t.dueDate} onSave={(v) => save({ dueDate: v || null })}>
            <span
              className={
                t.status === "DONE"
                  ? "text-slate-400 line-through"
                  : isOverdue(t.dueDate, t.status)
                    ? "font-semibold text-brand-600"
                    : "text-slate-500"
              }
            >
              {t.dueDate ? fmtDate(t.dueDate) : "กำหนดวัน"}
            </span>
            {isOverdue(t.dueDate, t.status) && (
              <span className="ml-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                เลยกำหนด
              </span>
            )}
          </InlineDate>
        </td>
      </tr>

      {/* Subitems กางในตาราง */}
      {open && (
        <tr className="bg-slate-50/70">
          <td colSpan={8} className="px-4 pb-3 pt-1">
            <div
              className="ml-6 overflow-hidden rounded-lg border border-slate-200 bg-white"
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
                          <InlineText
                            value={st.title}
                            width="w-72"
                            onSave={(v) => saveSub(st.id, { title: v })}
                            className={
                              st.done
                                ? "text-slate-400 line-through"
                                : "text-slate-700"
                            }
                          />
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-xs">
                        <InlineSelect
                          value=""
                          options={[
                            { v: "", l: "— ไม่มอบหมาย —" },
                            ...users.map((u) => ({ v: u.id, l: u.name })),
                          ]}
                          onSave={(v) => saveSub(st.id, { assigneeId: v || null })}
                          title="คลิกเพื่อมอบหมาย"
                          display={
                            <span className="px-1 py-0.5 text-slate-500">
                              {st.assignee?.name ?? "—"}
                            </span>
                          }
                        />
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
                        <InlineDate
                          value={st.dueDate}
                          onSave={(v) => saveSub(st.id, { dueDate: v || null })}
                        >
                          {st.dueDate ? fmtDate(st.dueDate) : "กำหนดวัน"}
                        </InlineDate>
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
