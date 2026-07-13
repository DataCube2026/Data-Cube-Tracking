"use client";

// ป็อปอัพแจ้งผลการทำงาน (เด้งกลางล่าง หายเองใน 3 วินาที)
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  created: "สร้างงานเรียบร้อยแล้ว",
  added: "ดำเนินการเพิ่มเรียบร้อยแล้ว",
  updated: "บันทึกการแก้ไขเรียบร้อยแล้ว",
  deleted: "ลบข้อมูลเรียบร้อยแล้ว",
};

// เรียกจากฝั่ง client component ได้โดยตรง
export function toast(message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("datacube:toast", { detail: message }));
  }
}

function ToastInner() {
  const [msg, setMsg] = useState<string | null>(null);
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // รับจาก URL ?toast=... (server actions)
  useEffect(() => {
    const t = sp.get("toast");
    if (t) {
      setMsg(MESSAGES[t] ?? "ดำเนินการเรียบร้อยแล้ว");
      const params = new URLSearchParams(sp.toString());
      params.delete("toast");
      router.replace(pathname + (params.toString() ? `?${params}` : ""), {
        scroll: false,
      });
    }
  }, [sp, pathname, router]);

  // รับจาก event ฝั่ง client (inline cells / comment box)
  useEffect(() => {
    const h = (e: Event) => setMsg(String((e as CustomEvent).detail));
    window.addEventListener("datacube:toast", h);
    return () => window.removeEventListener("datacube:toast", h);
  }, []);

  // หายเองใน 3 วินาที
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  if (!msg) return null;
  return (
    <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-lg bg-slate-900/90 px-4 py-2.5 text-sm text-white shadow-xl">
      <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold">
        ✓
      </span>
      {msg}
    </div>
  );
}

export function Toaster() {
  return (
    <Suspense fallback={null}>
      <ToastInner />
    </Suspense>
  );
}
