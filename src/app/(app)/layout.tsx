import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logout } from "@/lib/actions";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import {
  IconDashboard,
  IconTable,
  IconBoard,
  IconPlus,
  IconUsers,
  IconLogout,
  IconHistory,
  IconUser,
} from "@/components/Icons";

const NAV = [
  { href: "/", label: "แดชบอร์ด", icon: IconDashboard },
  { href: "/tickets", label: "งานทั้งหมด", icon: IconTable },
  { href: "/board", label: "บอร์ด Kanban", icon: IconBoard },
  { href: "/tickets/new", label: "สร้างงานใหม่", icon: IconPlus },
  { href: "/team", label: "ทีมงาน", icon: IconUsers },
  { href: "/activity", label: "ประวัติการใช้งาน", icon: IconHistory },
  { href: "/profile", label: "โปรไฟล์ของฉัน", icon: IconUser },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const me = session
    ? await prisma.user.findUnique({ where: { id: session.id } })
    : null;

  const avatar = me?.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={me.avatarUrl}
      alt={me.name}
      className="h-7 w-7 rounded-full border border-slate-200 object-cover"
    />
  ) : (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
      {session?.name?.charAt(0)}
    </span>
  );

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={30} />
          <span className="text-[15px] font-semibold tracking-wide text-slate-900">
            DATA<span className="text-brand-600">CUBE</span>
            <span className="ml-2 border-l border-slate-200 pl-2 text-xs font-normal tracking-normal text-slate-400">
              Task Tracking System
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-slate-400 lg:block">
            Turning Data into Real Business Value
          </span>
          <NotificationBell />
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 transition hover:bg-slate-50"
            title="โปรไฟล์ของฉัน"
          >
            {avatar}
            <span className="text-sm font-medium text-slate-700">
              {session?.name}
            </span>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 pt-14">
        {/* Sidebar */}
        <aside className="fixed bottom-0 left-0 top-14 z-10 flex w-60 flex-col border-r border-slate-200 bg-white">
          <div className="px-5 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Workspace
          </div>
          <div className="mx-3 mb-3 flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-600 text-xs font-bold text-white">
              D
            </span>
            Data Cube Team
          </div>

          <div className="px-5 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            เมนูหลัก
          </div>
          <nav className="flex-1 space-y-0.5 px-3">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <Icon size={17} className="text-slate-400" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 px-4 py-4">
            <div className="mb-0.5 text-sm font-medium text-slate-800">
              {session?.name}
            </div>
            <div className="mb-2 text-xs text-slate-400">@{session?.username}</div>
            <form action={logout}>
              <button className="flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-brand-600">
                <IconLogout size={13} />
                ออกจากระบบ
              </button>
            </form>
          </div>
        </aside>

        <main className="ml-60 flex-1 p-7">{children}</main>
      </div>

      {/* เวอร์ชันระบบ (เวลาที่ build) — มุมขวาล่าง */}
      <div
        className="fixed bottom-2 right-3 z-10 rounded bg-white/80 px-2 py-0.5 text-[10px] text-slate-400"
        title="เวลาที่ deploy เวอร์ชันนี้"
      >
        อัปเดตระบบล่าสุด:{" "}
        {process.env.NEXT_PUBLIC_BUILD_TIME
          ? new Date(process.env.NEXT_PUBLIC_BUILD_TIME).toLocaleString("th-TH", {
              timeZone: "Asia/Bangkok",
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-"}{" "}
        น.
      </div>
    </div>
  );
}
