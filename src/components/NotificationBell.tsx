"use client";

// กระดิ่งแจ้งเตือนแบบ Facebook: badge + dropdown + เด้ง notification บนเดสก์ท็อป
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconBell } from "@/components/Icons";

type Noti = {
  id: string;
  message: string;
  url: string | null;
  read: boolean;
  createdAt: string;
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "เมื่อสักครู่";
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชม.ที่แล้ว`;
  return `${Math.floor(s / 86400)} วันที่แล้ว`;
}

export function NotificationBell() {
  const [items, setItems] = useState<Noti[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const seen = useRef<Set<string>>(new Set());
  const first = useRef(true);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: Noti[]; unread: number };
      setItems(data.items);
      setUnread(data.unread);

      // เด้ง desktop notification เฉพาะรายการใหม่ (ไม่เด้งตอนโหลดครั้งแรก)
      for (const n of data.items) {
        if (!n.read && !seen.current.has(n.id)) {
          if (!first.current && typeof Notification !== "undefined" && Notification.permission === "granted") {
            const noti = new Notification("DataCube Tracker", { body: n.message });
            noti.onclick = () => {
              window.focus();
              if (n.url) window.location.href = n.url;
            };
          }
          seen.current.add(n.id);
        }
      }
      first.current = false;
    } catch {
      /* เงียบไว้ */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000); // เช็คทุก 20 วินาที
    return () => clearInterval(t);
  }, [load]);

  function toggle() {
    setOpen(!open);
    // ขอสิทธิ์เด้งแจ้งเตือนบนเดสก์ท็อปครั้งแรกที่กดกระดิ่ง
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  async function openItem(n: Noti) {
    setOpen(false);
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: n.id }),
    });
    await load();
    if (n.url) router.push(n.url);
  }

  async function markAll() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await load();
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        title="การแจ้งเตือน"
      >
        <IconBell size={19} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <span className="text-sm font-semibold text-slate-800">การแจ้งเตือน</span>
              {unread > 0 && (
                <button
                  onClick={markAll}
                  className="text-xs text-brand-600 hover:underline"
                >
                  อ่านทั้งหมดแล้ว
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-slate-400">
                  ยังไม่มีการแจ้งเตือน
                </p>
              )}
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`block w-full border-b border-slate-50 px-4 py-2.5 text-left transition hover:bg-slate-50 ${
                    n.read ? "" : "bg-brand-50/50"
                  }`}
                >
                  <p
                    className={`text-sm leading-snug ${
                      n.read ? "text-slate-500" : "font-medium text-slate-800"
                    }`}
                  >
                    {!n.read && (
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-brand-600" />
                    )}
                    {n.message}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
