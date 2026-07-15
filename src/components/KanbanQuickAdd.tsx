"use client";

// ปุ่ม + เพิ่มงานในคอลัมน์ Kanban (สถานะตามคอลัมน์)
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { quickAddTicket } from "@/lib/actions";
import { toast, toastLoading } from "@/components/Toaster";
import { buShort } from "@/lib/constants";

export function KanbanQuickAdd({
  status,
  users,
  busNames,
}: {
  status: string;
  users: { id: string; name: string }[];
  busNames: string[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 w-full rounded-lg border border-dashed border-slate-300 py-1.5 text-sm text-slate-400 transition hover:border-brand-300 hover:text-brand-600"
      >
        + เพิ่มงาน
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        if (busy) return;
        setBusy(true);
        toastLoading("กำลังสร้างงาน...");
        try {
          await quickAddTicket(fd);
          formRef.current?.reset();
          setOpen(false);
          toast("สร้างงานเรียบร้อยแล้ว");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="mt-2 space-y-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
    >
      <input type="hidden" name="status" value={status} />
      <input
        name="title"
        placeholder="ชื่องาน..."
        required
        autoFocus
        disabled={busy}
        className="input px-2 py-1 text-sm"
      />
      <div className="flex gap-1.5">
        <select
          name="bu"
          defaultValue=""
          required
          disabled={busy}
          className="input flex-1 px-1.5 py-1 text-xs"
        >
          <option value="" disabled>BU...</option>
          {busNames.map((b) => (
            <option key={b} value={b}>{buShort(b)}</option>
          ))}
        </select>
        <input
          name="customer"
          placeholder="ลูกค้า *"
          required
          disabled={busy}
          className="input flex-1 px-2 py-1 text-xs"
        />
      </div>
      <select
        name="assigneeId"
        defaultValue=""
        disabled={busy}
        className="input px-1.5 py-1 text-xs"
      >
        <option value="">มอบหมายให้...</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-secondary flex-1 px-2 py-1 text-xs"
        >
          ยกเลิก
        </button>
        <button disabled={busy} className="btn-primary flex-1 px-2 py-1 text-xs">
          {busy ? "กำลังบันทึก..." : "เพิ่มงาน"}
        </button>
      </div>
    </form>
  );
}
