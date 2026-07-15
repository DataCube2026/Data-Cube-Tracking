"use client";

// เซลล์แบบคลิกแก้ไขได้ (สไตล์ monday) — optimistic UI: สีเปลี่ยนทันที บันทึกเบื้องหลัง
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STATUSES, PRIORITIES, statusOf, priorityOf } from "@/lib/constants";
import {
  setTicketStatus,
  setTicketPriority,
  toggleTicketAssignee,
} from "@/lib/actions";
import { toast } from "@/components/Toaster";

type UserOption = { id: string; name: string };

function Dropdown({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute left-1/2 top-full z-20 mt-1 w-44 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
        {children}
      </div>
    </>
  );
}

export function StatusCell({
  ticketId,
  status,
}: {
  ticketId: string;
  status: string;
}) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(status);
  const [, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => setVal(status), [status]);
  const s = statusOf(val);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full min-w-32 rounded px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
        style={{ backgroundColor: s.color }}
        title="คลิกเพื่อเปลี่ยนสถานะ"
      >
        {s.label}
      </button>
      <Dropdown open={open} onClose={() => setOpen(false)}>
        {STATUSES.map((o) => (
          <button
            type="button"
            key={o.value}
            onClick={() => {
              setOpen(false);
              setVal(o.value); // เปลี่ยนสีทันที
              toast("บันทึกการแก้ไขเรียบร้อยแล้ว");
              startTransition(async () => {
                await setTicketStatus(ticketId, o.value);
                router.refresh();
              });
            }}
            className="mb-1 block w-full rounded px-3 py-1.5 text-xs font-medium text-white transition last:mb-0 hover:opacity-85"
            style={{ backgroundColor: o.color }}
          >
            {o.label}
          </button>
        ))}
      </Dropdown>
    </div>
  );
}

export function PriorityCell({
  ticketId,
  priority,
}: {
  ticketId: string;
  priority: string;
}) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(priority);
  const [, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => setVal(priority), [priority]);
  const p = priorityOf(val);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full min-w-24 rounded px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
        style={{ backgroundColor: p.color }}
        title="คลิกเพื่อเปลี่ยนความสำคัญ"
      >
        {p.label}
      </button>
      <Dropdown open={open} onClose={() => setOpen(false)}>
        {PRIORITIES.map((o) => (
          <button
            type="button"
            key={o.value}
            onClick={() => {
              setOpen(false);
              setVal(o.value);
              toast("บันทึกการแก้ไขเรียบร้อยแล้ว");
              startTransition(async () => {
                await setTicketPriority(ticketId, o.value);
                router.refresh();
              });
            }}
            className="mb-1 block w-full rounded px-3 py-1.5 text-xs font-medium text-white transition last:mb-0 hover:opacity-85"
            style={{ backgroundColor: o.color }}
          >
            {o.label}
          </button>
        ))}
      </Dropdown>
    </div>
  );
}

// ผู้รับผิดชอบหลายคน — ติ๊กเพิ่ม/ถอดได้จาก dropdown
export function AssigneesCell({
  ticketId,
  assignees,
  users,
}: {
  ticketId: string;
  assignees: UserOption[];
  users: UserOption[];
}) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<UserOption[]>(assignees);
  const [, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => setList(assignees), [assignees]);

  const toggle = (u: UserOption) => {
    const has = list.some((a) => a.id === u.id);
    setList(has ? list.filter((a) => a.id !== u.id) : [...list, u]); // แสดงผลทันที
    toast(
      has
        ? `ถอด ${u.name} ออกจากงานแล้ว`
        : `มอบหมายงานให้ ${u.name} เรียบร้อยแล้ว`
    );
    startTransition(async () => {
      await toggleTicketAssignee(ticketId, u.id);
      router.refresh();
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-slate-100"
        title="คลิกเพื่อมอบหมาย (เลือกได้หลายคน)"
      >
        {list.length === 0 ? (
          <>
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-slate-300 text-xs text-slate-400">
              +
            </span>
            <span className="text-sm text-slate-400">มอบหมาย</span>
          </>
        ) : (
          <>
            <span className="flex -space-x-2">
              {list.slice(0, 3).map((a) => (
                <span
                  key={a.id}
                  title={a.name}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white ring-2 ring-white"
                >
                  {a.name.charAt(0)}
                </span>
              ))}
            </span>
            <span className="text-sm text-slate-600">
              {list.length === 1
                ? list[0].name
                : `${list[0].name} +${list.length - 1}`}
            </span>
          </>
        )}
      </button>
      <Dropdown open={open} onClose={() => setOpen(false)}>
        {users.map((u) => {
          const has = list.some((a) => a.id === u.id);
          return (
            <button
              type="button"
              key={u.id}
              onClick={() => toggle(u)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-100"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                  has
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-300 text-transparent"
                }`}
              >
                ✓
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                {u.name.charAt(0)}
              </span>
              {u.name}
            </button>
          );
        })}
        <p className="border-t border-slate-100 px-2 pb-0.5 pt-1.5 text-[10px] text-slate-400">
          เลือกได้หลายคน — คลิกชื่อเพื่อเพิ่ม/ถอด
        </p>
      </Dropdown>
    </div>
  );
}

// แถบความคืบหน้าในหน้ารายละเอียด — กดแล้วสีวิ่งทันที
export function StatusProgress({
  ticketId,
  status,
}: {
  ticketId: string;
  status: string;
}) {
  const [cur, setCur] = useState(status);
  const [, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => setCur(status), [status]);
  const idx = STATUSES.findIndex((s) => s.value === cur);

  return (
    <div className="flex items-center gap-1">
      {STATUSES.map((s, i) => (
        <button
          type="button"
          key={s.value}
          onClick={() => {
            setCur(s.value); // สีเปลี่ยนทันที
            toast(`เปลี่ยนสถานะเป็น "${s.label}" เรียบร้อยแล้ว`);
            startTransition(async () => {
              await setTicketStatus(ticketId, s.value);
              router.refresh();
            });
          }}
          className="flex-1 rounded-lg px-2 py-2 text-center text-xs font-medium transition"
          style={
            i <= idx
              ? { backgroundColor: s.color, color: "#fff" }
              : { backgroundColor: "#f1f5f9", color: "#94a3b8" }
          }
          title={`เปลี่ยนสถานะเป็น ${s.label}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
