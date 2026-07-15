"use client";

// ป็อปอัพแจ้งผลกลางล่างจอ — รองรับ 2 แบบ:
//   toast("ข้อความ")        = สำเร็จ (✓ เขียว หายเองใน 3 วิ)
//   toastLoading("ข้อความ") = กำลังทำงาน (วงหมุน ค้างไว้จนมี toast ถัดไปมาแทน)
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  created: "สร้างงานเรียบร้อยแล้ว",
  added: "ดำเนินการเพิ่มเรียบร้อยแล้ว",
  updated: "บันทึกการแก้ไขเรียบร้อยแล้ว",
  deleted: "ลบข้อมูลเรียบร้อยแล้ว",
};

type ToastData = { message: string; kind: "success" | "loading" };

function dispatch(data: ToastData) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("datacube:toast", { detail: data }));
  }
}

export function toast(message: string) {
  dispatch({ message, kind: "success" });
}

export function toastLoading(message: string) {
  dispatch({ message, kind: "loading" });
}

function ToastInner() {
  const [data, setData] = useState<ToastData | null>(null);
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // รับจาก URL ?toast=... (server actions)
  useEffect(() => {
    const t = sp.get("toast");
    if (t) {
      setData({
        message: MESSAGES[t] ?? "ดำเนินการเรียบร้อยแล้ว",
        kind: "success",
      });
      const params = new URLSearchParams(sp.toString());
      params.delete("toast");
      router.replace(pathname + (params.toString() ? `?${params}` : ""), {
        scroll: false,
      });
    }
  }, [sp, pathname, router]);

  // รับจาก event ฝั่ง client
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail;
      setData(
        typeof d === "string" ? { message: d, kind: "success" } : (d as ToastData)
      );
    };
    window.addEventListener("datacube:toast", h);
    return () => window.removeEventListener("datacube:toast", h);
  }, []);

  // แบบสำเร็จหายเองใน 3 วินาที — แบบ loading ค้างไว้จนถูกแทนที่
  useEffect(() => {
    if (!data || data.kind === "loading") return;
    const t = setTimeout(() => setData(null), 3000);
    return () => clearTimeout(t);
  }, [data]);

  if (!data) return null;
  return (
    <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-lg bg-slate-900/90 px-4 py-2.5 text-sm text-white shadow-xl">
      {data.kind === "loading" ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-white" />
      ) : (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold">
          ✓
        </span>
      )}
      {data.message}
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
