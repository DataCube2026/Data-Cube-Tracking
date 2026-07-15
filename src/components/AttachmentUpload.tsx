"use client";

// ฟอร์มอัปโหลดไฟล์ + เพิ่มลิงก์ ในการ์ดไฟล์แนบ พร้อมสถานะ "กำลังอัปโหลด..."
import { useRef, useState } from "react";
import { addAttachment } from "@/lib/actions";
import { toast, toastLoading } from "@/components/Toaster";

export function AttachmentUpload({ ticketId }: { ticketId: string }) {
  const fileFormRef = useRef<HTMLFormElement>(null);
  const linkFormRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {/* อัปโหลดไฟล์ */}
        <form
          ref={fileFormRef}
          action={async (fd) => {
            if (busy) return;
            setBusy(true);
            toastLoading("กำลังอัปโหลดไฟล์ขึ้น Google Drive...");
            try {
              await addAttachment(fd); // สำเร็จจะ redirect + toast จาก server
              // มาถึงตรงนี้ = ไฟล์ไม่ผ่านเงื่อนไข (ใหญ่เกิน/ว่าง)
              toast("อัปโหลดไม่สำเร็จ — ไฟล์ต้องไม่เกิน 4MB");
            } catch {
              /* redirect = สำเร็จ ปล่อยให้ระบบนำทาง */
            } finally {
              setBusy(false);
              fileFormRef.current?.reset();
            }
          }}
          className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 p-2.5"
        >
          <input type="hidden" name="ticketId" value={ticketId} />
          <input type="hidden" name="kind" value="file" />
          <input
            type="file"
            name="file"
            required
            disabled={busy}
            className="min-w-0 flex-1 text-xs text-slate-500 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:text-slate-600 disabled:opacity-50"
          />
          <button disabled={busy} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
            {busy ? "กำลังอัปโหลด..." : "อัปโหลด"}
          </button>
        </form>

        {/* เพิ่มลิงก์ */}
        <form
          ref={linkFormRef}
          action={async (fd) => {
            if (busy) return;
            setBusy(true);
            toastLoading("กำลังบันทึกลิงก์...");
            try {
              await addAttachment(fd);
              toast("บันทึกลิงก์ไม่สำเร็จ — เช็ค URL อีกครั้ง");
            } catch {
              /* redirect = สำเร็จ */
            } finally {
              setBusy(false);
              linkFormRef.current?.reset();
            }
          }}
          className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 p-2.5"
        >
          <input type="hidden" name="ticketId" value={ticketId} />
          <input type="hidden" name="kind" value="link" />
          <input
            name="url"
            type="url"
            required
            disabled={busy}
            placeholder="https://..."
            className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand-500 disabled:opacity-50"
          />
          <input
            name="name"
            disabled={busy}
            placeholder="ชื่อลิงก์"
            className="w-24 rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand-500 disabled:opacity-50"
          />
          <button disabled={busy} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
            เพิ่มลิงก์
          </button>
        </form>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        ไฟล์ไม่เกิน 4MB (เก็บใน Google Drive ทีม แยกโฟลเดอร์ตามเลขงาน) —
        ไฟล์ใหญ่ให้อัปโหลดขึ้น Drive เองแล้ววางลิงก์
      </p>
    </>
  );
}
