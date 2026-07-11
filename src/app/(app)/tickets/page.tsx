import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { quickAddTicket } from "@/lib/actions";
import {
  STATUSES,
  PRIORITIES,
  BUSINESS_UNITS,
  buShort,
} from "@/lib/constants";
import { IconSearch, IconDownload } from "@/components/Icons";
import { TicketRow, type RowTicket } from "@/components/TicketRow";
import type { Ticket, User, Subtask } from "@prisma/client";

export const dynamic = "force-dynamic";

type TicketWithRelations = Ticket & {
  assignee: User | null;
  _count: { comments: number };
  subtasks: (Subtask & { assignee: User | null })[];
};

type Search = {
  status?: string;
  priority?: string;
  assignee?: string;
  bu?: string;
  q?: string;
  group?: string;
  from?: string;
  to?: string;
};

function toRow(t: TicketWithRelations): RowTicket {
  return {
    id: t.id,
    number: t.number,
    title: t.title,
    bu: t.bu,
    customer: t.customer,
    status: t.status,
    priority: t.priority,
    jobType: t.jobType,
    dueDate: t.dueDate,
    commentCount: t._count.comments,
    assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name } : null,
    subtasks: t.subtasks.map((s) => ({
      id: s.id,
      title: s.title,
      done: s.done,
      dueDate: s.dueDate,
      assignee: s.assignee ? { name: s.assignee.name } : null,
    })),
  };
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { status, priority, assignee, bu, q, from, to } = searchParams;
  const groupBy = searchParams.group ?? "status";

  const [tickets, users] = (await Promise.all([
    prisma.ticket.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(assignee ? { assigneeId: assignee } : {}),
        ...(bu ? { bu } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
              },
            }
          : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q } },
                { customer: { contains: q } },
                { bu: { contains: q } },
              ],
            }
          : {}),
      },
      include: {
        assignee: true,
        _count: { select: { comments: true } },
        subtasks: { include: { assignee: true }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { number: "asc" },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ])) as [TicketWithRelations[], User[]];

  // จัดกลุ่มสไตล์ monday
  let groups: {
    key: string;
    label: string;
    color: string;
    items: TicketWithRelations[];
  }[];
  if (groupBy === "assignee") {
    groups = [
      ...users.map((u) => ({
        key: u.id,
        label: u.name,
        color: "#579bfc",
        items: tickets.filter((t) => t.assigneeId === u.id),
      })),
      {
        key: "none",
        label: "ยังไม่มอบหมาย",
        color: "#797e93",
        items: tickets.filter((t) => !t.assigneeId),
      },
    ].filter((g) => g.items.length > 0);
  } else if (groupBy === "none") {
    groups = [{ key: "all", label: "งานทั้งหมด", color: "#d21f2a", items: tickets }];
  } else {
    groups = STATUSES.map((s) => ({
      key: s.value,
      label: s.label,
      color: s.color,
      items: tickets.filter((t) => t.status === s.value),
    }));
  }

  const userOpts = users.map((u) => ({ id: u.id, name: u.name }));

  const exportQS = new URLSearchParams({
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(assignee ? { assignee } : {}),
    ...(bu ? { bu } : {}),
    ...(q ? { q } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString();

  return (
    <div className="space-y-5">
      {/* หัวเรื่อง + แท็บ */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">จัดการงาน</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          ติดตามและมอบหมายงานของทีม Data Cube — กดลูกศรหน้าชื่องานเพื่อดูงานย่อย
        </p>
        <div className="mt-3 flex gap-1 border-b border-slate-200 text-sm">
          <span className="border-b-2 border-brand-600 px-3 py-2 font-medium text-slate-900">
            ตารางหลัก
          </span>
          <Link href="/board" className="px-3 py-2 text-slate-500 hover:text-slate-900">
            Kanban
          </Link>
          <Link href="/" className="px-3 py-2 text-slate-500 hover:text-slate-900">
            แดชบอร์ด
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <form className="flex flex-wrap items-center gap-2" method="GET">
        <input type="hidden" name="group" value={groupBy} />
        <Link href="/tickets/new" className="btn-primary">+ งานใหม่</Link>
        <div className="relative">
          <IconSearch
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="ค้นหางาน / ลูกค้า"
            className="input w-52 pl-9"
          />
        </div>
        <select name="bu" defaultValue={bu ?? ""} className="input max-w-44">
          <option value="">BU: ทั้งหมด</option>
          {BUSINESS_UNITS.map((b) => (
            <option key={b} value={b}>{buShort(b)}</option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ""} className="input max-w-40">
          <option value="">สถานะ: ทั้งหมด</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select name="priority" defaultValue={priority ?? ""} className="input max-w-40">
          <option value="">ความสำคัญ: ทั้งหมด</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select name="assignee" defaultValue={assignee ?? ""} className="input max-w-40">
          <option value="">ผู้รับผิดชอบ: ทั้งหมด</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <span className="text-sm text-slate-500">วันที่สร้าง:</span>
        <input name="from" type="date" defaultValue={from} className="input max-w-36" title="วันที่สร้าง จาก" />
        <span className="text-slate-400">ถึง</span>
        <input name="to" type="date" defaultValue={to} className="input max-w-36" title="วันที่สร้าง ถึง" />
        <button className="btn-secondary">กรอง</button>
        <a
          href={`/api/export${exportQS ? `?${exportQS}` : ""}`}
          className="btn-secondary"
          title="ดาวน์โหลดงานตามฟิลเตอร์ที่เลือกเป็นไฟล์ CSV"
        >
          <IconDownload size={15} />
          Export CSV
        </a>
        <div className="ml-auto flex items-center gap-1 text-xs text-slate-500">
          จัดกลุ่มตาม:
          {[
            { v: "status", l: "สถานะ" },
            { v: "assignee", l: "ผู้รับผิดชอบ" },
            { v: "none", l: "ไม่จัดกลุ่ม" },
          ].map((g) => (
            <Link
              key={g.v}
              href={`/tickets?group=${g.v}`}
              className={`rounded px-2 py-1 ${
                groupBy === g.v
                  ? "bg-slate-200 text-slate-900"
                  : "hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {g.l}
            </Link>
          ))}
        </div>
      </form>

      {/* กลุ่มตาราง */}
      {groups.map((g) => (
        <TicketGroup key={g.key} group={g} groupBy={groupBy} users={userOpts} />
      ))}
    </div>
  );
}

function TicketGroup({
  group,
  groupBy,
  users,
}: {
  group: {
    key: string;
    label: string;
    color: string;
    items: TicketWithRelations[];
  };
  groupBy: string;
  users: { id: string; name: string }[];
}) {
  const items = group.items;

  const prioDist = PRIORITIES.map((p) => ({
    ...p,
    n: items.filter((t) => t.priority === p.value).length,
  })).filter((p) => p.n > 0);
  const statusDist = STATUSES.map((s) => ({
    ...s,
    n: items.filter((t) => t.status === s.value).length,
  })).filter((s) => s.n > 0);

  return (
    <section>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-sm font-semibold" style={{ color: group.color }}>
          ▾ {group.label}
        </span>
        <span className="text-xs text-slate-400">{items.length} งาน</span>
      </div>

      <div
        className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm"
        style={{ borderLeft: `5px solid ${group.color}` }}
      >
        <table className="w-full min-w-[950px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-4 py-2.5 font-medium">งาน</th>
              <th className="px-3 py-2.5 font-medium">ลูกค้า</th>
              <th className="px-3 py-2.5 font-medium">ผู้รับผิดชอบ</th>
              <th className="w-36 px-2 py-2.5 text-center font-medium">สถานะ</th>
              <th className="w-28 px-2 py-2.5 text-center font-medium">ความสำคัญ</th>
              <th className="px-3 py-2.5 font-medium">Ticket ID</th>
              <th className="px-3 py-2.5 font-medium">ประเภท</th>
              <th className="px-3 py-2.5 font-medium">กำหนดส่ง</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((t) => (
              <TicketRow key={t.id} ticket={toRow(t)} users={users} />
            ))}

            {/* + เพิ่มงานด่วน */}
            <tr>
              <td colSpan={8} className="px-4 py-1.5">
                <form action={quickAddTicket} className="flex flex-wrap items-center gap-2">
                  <input
                    type="hidden"
                    name="status"
                    value={groupBy === "status" ? group.key : "NEW"}
                  />
                  <span className="text-slate-400">+</span>
                  <input
                    name="title"
                    placeholder="เพิ่มงาน..."
                    className="w-64 rounded border border-transparent bg-transparent px-2 py-1 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                    required
                  />
                  <select
                    name="bu"
                    defaultValue=""
                    required
                    className="rounded border border-transparent bg-transparent px-2 py-1 text-sm text-slate-500 outline-none focus:border-slate-300 focus:bg-white"
                  >
                    <option value="" disabled>กลุ่ม BU...</option>
                    {BUSINESS_UNITS.map((b) => (
                      <option key={b} value={b}>{buShort(b)}</option>
                    ))}
                  </select>
                  <input
                    name="customer"
                    placeholder="ชื่อลูกค้า *"
                    required
                    className="w-40 rounded border border-transparent bg-transparent px-2 py-1 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                  />
                  <select
                    name="assigneeId"
                    defaultValue=""
                    className="rounded border border-transparent bg-transparent px-2 py-1 text-sm text-slate-500 outline-none focus:border-slate-300 focus:bg-white"
                  >
                    <option value="">มอบหมายให้...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <button className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    บันทึก
                  </button>
                </form>
              </td>
            </tr>

            {/* แถบสรุปสี */}
            {items.length > 0 && (
              <tr className="bg-slate-50/60">
                <td className="px-4 py-2 text-xs text-slate-400">สรุป</td>
                <td colSpan={2} />
                <td className="px-2 py-2">
                  <div className="flex h-5 overflow-hidden rounded">
                    {statusDist.map((s) => (
                      <div
                        key={s.value}
                        title={`${s.label}: ${s.n}`}
                        style={{
                          backgroundColor: s.color,
                          width: `${(s.n / items.length) * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <div className="flex h-5 overflow-hidden rounded">
                    {prioDist.map((p) => (
                      <div
                        key={p.value}
                        title={`${p.label}: ${p.n}`}
                        style={{
                          backgroundColor: p.color,
                          width: `${(p.n / items.length) * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                </td>
                <td colSpan={3} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
