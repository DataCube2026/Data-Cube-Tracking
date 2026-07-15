"use client";

// ปุ่ม + ป็อปอัพยืนยันสวย ๆ แทน confirm() ของเบราว์เซอร์
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toaster";
import { IconWarning } from "@/components/Icons";

export function ConfirmButton({
  message,
  confirmLabel = "ลบ",
  toastMessage = "ลบข้อมูลเรียบร้อยแล้ว",
  children,
  className = "",
  action,
  hidden,
}: {
  message: string;
  confirmLabel?: string;
  toastMessage?: string;
  children: React.ReactNode;
  className?: string;
  action: (fd: FormData) => Promise<unknown>;
  hidden: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function run() {
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(hidden).forEach(([k, v]) => fd.append(k, v));
      await action(fd);
      setOpen(false);
      toast(toastMessage);
      router.refresh();
    } catch {
      // กรณี action redirect ไปหน้าอื่น จะเข้าทางนี้ — ปล่อยให้ระบบนำทางต่อเอง
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center gap-2 text-brand-600">
              <IconWarning size={20} />
              <span className="text-base font-semibold">ยืนยันการทำรายการ</span>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-slate-600">{message}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-secondary"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={run}
                className="btn-primary"
              >
                {busy ? "กำลังดำเนินการ..." : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
