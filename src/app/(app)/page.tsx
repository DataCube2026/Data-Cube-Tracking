import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { STATUSES, PRIORITIES, fmtDate, isOverdue } from "@/lib/constants";
import { StatusBadge, PriorityBadge } from "@/components/Badge";
import { IconWarning, IconDownload } from "@/components/Icons";
import { buShort } from "@/lib/constants";
import { LineChart, DonutChart } from "@/components/Charts";

export const dynamic = "force-dynamic";

const CHART_COLORS = [
  "#d21f2a", "#579bfc", "#00c875", "#fdab3d",
  "#a25ddc", "#ff5ac4", "#797e93", "#0ea5e9", "#8b5a3c",
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { bu?: string; assignee?: string; from?: string; to?: string };
}) {
  const { bu, assignee, from, to } = searchParams;

  const [tickets, users, busRows] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        ...(bu ? { bu } : {}),
        ...(assignee ? { assigneeId: assignee } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
              },
            }
          : {}),
      },
      include: { assignee: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.businessUnit.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const busNames = busRows.map((b) => b.name);

  const exportQS = new URLSearchParams({
    ...(bu ? { bu } : {}),
    ...(assignee ? { assignee } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString();

  // ข้อมูลกราฟเส้น: จำนวนงานที่สร้างต่อวัน
  const endD = to ? new Date(to) : new Date();
  const startD = from
    ? new Date(from)
    : new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
  startD.setHours(0, 0, 0, 0);
  endD.setHours(0, 0, 0, 0);
  const nDays = Math.min(
    90,
    Math.max(1, Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1)
  );
  const lineData = Array.from({ length: nDays }, (_, i) => {
    const d = new Date(startD.getTime() + i * 86400000);
    const next = new Date(d.getTime() + 86400000);
    return {
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      value: tickets.filter((t) => t.createdAt >= d && t.createdAt < next).length,
    };
  });

  // ข้อมูลกราฟวงกลม: สัดส่วนงานตาม BU
  const buNames = Array.from(new Set(tickets.map((t) => t.bu || "ไม่ระบุ")));
  const donutData = buNames
    .map((name, i) => ({
      label: name === "ไม่ระบุ" ? name : buShort(name),
      value: tickets.filter((t) => (t.bu || "ไม่ระบุ") === name).length,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  const byStatus = STATUSES.map((s) => ({
    ...s,
    count: tickets.filter((t) => t.status === s.value).length,
  }));
  const byPriority = PRIORITIES.map((p) => ({
    ...p,
    count: tickets.filter((t) => t.priority === p.value && t.status !== "DONE").length,
  }));
  const overdue = tickets.filter((t) => isOverdue(t.dueDate, t.status));
  const active = tickets.filter((t) => t.status !== "DONE");
  const workload = users
    .map((u) => ({
      name: u.name,
      count: active.filter((t) => t.assigneeId === u.id).length,
    }))
    .sort((a, b) => b.count - a.count);
  const maxLoad = Math.max(1, ...workload.map((w) => w.count));

  const dueSoon = active
    .filter((t) => t.dueDate)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">แดชบอร์ด</h1>
          <p className="text-sm text-slate-500">ภาพรวมงานทั้งหมดของทีม DataCube</p>
        </div>
        <Link href="/tickets/new" className="btn-primary">+ สร้างงานใหม่</Link>
      </div>

      {/* ฟิลเตอร์ + Export */}
      <form
        method="GET"
        className="card flex flex-wrap items-center gap-2 p-3"
      >
        <span className="text-sm font-medium text-slate-600">ฟิลเตอร์:</span>
        <select name="bu" defaultValue={bu ?? ""} className="input max-w-48">
          <option value="">กลุ่ม BU: ทั้งหมด</option>
          {busNames.map((b) => (
            <option key={b} value={b}>{buShort(b)}</option>
          ))}
        </select>
        <select name="assignee" defaultValue={assignee ?? ""} className="input max-w-44">
          <option value="">ผู้รับผิดชอบ: ทั้งหมด</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <span className="text-sm text-slate-500">วันที่สร้าง:</span>
        <input name="from" type="date" defaultValue={from} className="input max-w-40" />
        <span className="text-slate-400">ถึง</span>
        <input name="to" type="date" defaultValue={to} className="input max-w-40" />
        <button className="btn-secondary">กรอง</button>
        {(bu || assignee || from || to) && (
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">
            ล้างฟิลเตอร์
          </Link>
        )}
        <a
          href={`/api/export${exportQS ? `?${exportQS}` : ""}`}
          className="btn-secondary ml-auto"
        >
          <IconDownload size={15} />
          Export CSV
        </a>
      </form>

      {/* สรุปตามสถานะ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <div className="card border-l-4 border-l-brand-600 p-4">
          <div className="text-sm text-slate-500">งานทั้งหมด</div>
          <div className="text-3xl font-semibold text-slate-900">{tickets.length}</div>
        </div>
        {byStatus.map((s) => (
          <Link
            key={s.value}
            href={`/tickets?status=${s.value}`}
            className="card p-4 transition hover:shadow-md"
            style={{ borderLeft: `4px solid ${s.color}` }}
          >
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className="text-3xl font-semibold" style={{ color: s.color }}>
              {s.count}
            </div>
          </Link>
        ))}
      </div>

      {overdue.length > 0 && (
        <div className="card border-brand-200 bg-brand-50 p-4">
          <div className="mb-2 flex items-center gap-2 font-medium text-brand-700">
            <IconWarning size={16} />
            งานเลยกำหนดส่ง {overdue.length} งาน
          </div>
          <div className="flex flex-wrap gap-2">
            {overdue.map((t) => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="rounded-lg bg-white px-3 py-1.5 text-sm text-brand-700 shadow-sm hover:underline"
              >
                {t.title} · ครบกำหนด {fmtDate(t.dueDate)}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* กราฟ */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-2 font-semibold text-slate-900">
            จำนวนงานที่สร้างต่อวัน
            <span className="ml-2 text-sm font-normal text-slate-400">
              {from || to ? "ตามช่วงวันที่ที่เลือก" : "30 วันล่าสุด"}
            </span>
          </h2>
          <LineChart data={lineData} />
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">สัดส่วนงานตามกลุ่ม BU</h2>
          <DonutChart data={donutData} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ภาระงานรายคน */}
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-slate-900">ภาระงานรายคน (ยังไม่เสร็จ)</h2>
          <div className="space-y-3">
            {workload.map((w) => (
              <div key={w.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-700">{w.name}</span>
                  <span className="text-slate-400">{w.count} งาน</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-brand-600"
                    style={{ width: `${(w.count / maxLoad) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ความสำคัญ */}
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-slate-900">งานค้างตามความสำคัญ</h2>
          <div className="space-y-3">
            {byPriority.map((p) => (
              <Link
                key={p.value}
                href={`/tickets?priority=${p.value}`}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 transition hover:bg-slate-50"
              >
                <PriorityBadge priority={p.value} />
                <span className="text-lg font-semibold" style={{ color: p.color }}>
                  {p.count}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* ใกล้ครบกำหนด */}
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-slate-900">ใกล้ครบกำหนดส่ง</h2>
          <div className="space-y-2">
            {dueSoon.length === 0 && (
              <p className="text-sm text-slate-400">ไม่มีงานที่มีกำหนดส่ง</p>
            )}
            {dueSoon.map((t) => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="block rounded-lg border border-slate-100 px-3 py-2 transition hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-800">
                    {t.title}
                  </span>
                  <span
                    className={`shrink-0 text-xs ${
                      isOverdue(t.dueDate, t.status)
                        ? "font-semibold text-brand-600"
                        : "text-slate-500"
                    }`}
                  >
                    {fmtDate(t.dueDate)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={t.status} />
                  <span className="text-xs text-slate-400">
                    {t.assignee?.name ?? "ยังไม่มอบหมาย"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* งานล่าสุด */}
      <div className="card p-5">
        <h2 className="mb-4 font-semibold text-slate-900">อัปเดตล่าสุด</h2>
        <div className="divide-y divide-slate-100">
          {tickets.slice(0, 8).map((t) => (
            <Link
              key={t.id}
              href={`/tickets/${t.id}`}
              className="flex items-center justify-between gap-4 py-2.5 transition hover:bg-slate-50"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-800">{t.title}</div>
                <div className="text-xs text-slate-500">
                  {t.customer} · {t.assignee?.name ?? "ยังไม่มอบหมาย"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <PriorityBadge priority={t.priority} />
                <StatusBadge status={t.status} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
