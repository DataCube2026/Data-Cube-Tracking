"use client";

// แถวเพิ่มงานด่วน — ล็อคปุ่มระหว่างบันทึก กันกดซ้ำ + ล้างช่องเมื่อสำเร็จ
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { quickAddTicket } from "@/lib/actions";
import { toast } from "@/components/Toaster";
import { buShort } from "@/lib/constants";

export function QuickAddRow({
  status,
  users,
  busNames,
}: {
  status: string;
  users: { id: string; name: string }[];
  busNames: string[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        if (busy) return; // กันกดซ้ำระหว่างรอ
        setBusy(true);
        try {
          await quickAddTicket(fd);
          formRef.current?.reset();
          toast("สร้างงานเรียบร้อยแล้ว");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="status" value={status} />
      <span className="text-slate-400">+</span>
      <input
        name="title"
        placeholder="เพิ่มงาน..."
        required
        disabled={busy}
        className="w-64 rounded border border-transparent bg-transparent px-2 py-1 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white disabled:opacity-50"
      />
      <select
        name="bu"
        defaultValue=""
        required
        disabled={busy}
        className="rounded border border-transparent bg-transparent px-2 py-1 text-sm text-slate-500 outline-none focus:border-slate-300 focus:bg-white disabled:opacity-50"
      >
        <option value="" disabled>กลุ่ม BU...</option>
        {busNames.map((b) => (
          <option key={b} value={b}>{buShort(b)}</option>
        ))}
      </select>
      <input
        name="customer"
        placeholder="ชื่อลูกค้า *"
        required
        disabled={busy}
        className="w-40 rounded border border-transparent bg-transparent px-2 py-1 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white disabled:opacity-50"
      />
      <select
        name="assigneeId"
        defaultValue=""
        disabled={busy}
        className="rounded border border-transparent bg-transparent px-2 py-1 text-sm text-slate-500 outline-none focus:border-slate-300 focus:bg-white disabled:opacity-50"
      >
        <option value="">มอบหมายให้...</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
      <button
        disabled={busy}
        className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
      >
        {busy ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </form>
  );
}
