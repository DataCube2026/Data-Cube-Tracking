import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  updateTicket,
  deleteTicket,
  updateInfo,
  updateDescription,
  addSubtask,
  toggleSubtask,
  deleteSubtask,
  addAttachment,
  deleteAttachment,
} from "@/lib/actions";
import { IconPaperclip, IconLink } from "@/components/Icons";
import {
  fmtDate,
  fmtDateTime,
  isOverdue,
  ticketCode,
  buShort,
  JOB_TYPES,
  CHANNELS,
} from "@/lib/constants";
import {
  StatusCell,
  PriorityCell,
  OwnerCell,
  StatusProgress,
} from "@/components/Cells";
import { CommentBox } from "@/components/CommentBox";
import { CommentThread } from "@/components/CommentThread";
import { TicketForm } from "@/components/TicketForm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [ticket, users, busRows] = await Promise.all([
    prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        assignee: true,
        createdBy: true,
        comments: {
          where: { parentId: null },
          include: {
            author: true,
            attachments: true,
            replies: {
              include: { author: true, attachments: true },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        subtasks: { include: { assignee: true }, orderBy: { createdAt: "asc" } },
        attachments: { include: { uploader: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.businessUnit.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!ticket) notFound();

  const session = await getSession();
  const busNames = busRows.map((b) => b.name);
  const buOptions =
    ticket.bu && !busNames.includes(ticket.bu)
      ? [ticket.bu, ...busNames]
      : busNames;

  const updateTicketWithId = updateTicket.bind(null, ticket.id);
  const doneSubtasks = ticket.subtasks.filter((s) => s.done).length;
  const userOpts = users.map((u) => ({ id: u.id, name: u.name }));
  const dueStr = ticket.dueDate
    ? new Date(ticket.dueDate).toISOString().slice(0, 10)
    : "";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* หัวเรื่อง */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/tickets" className="text-sm text-slate-400 hover:text-brand-600">
            ← กลับไปงานทั้งหมด
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            <span className="mr-2 text-base font-normal text-slate-400">
              {ticketCode(ticket.number)}
            </span>
            {ticket.title}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            สร้างเมื่อ {fmtDate(ticket.createdAt)} โดย {ticket.createdBy.name}
          </p>
        </div>
        <form action={deleteTicket}>
          <input type="hidden" name="ticketId" value={ticket.id} />
          <button className="btn-secondary text-brand-600 hover:bg-brand-50">ลบงาน</button>
        </form>
      </div>

      {/* แถบความคืบหน้าสถานะ */}
      <div className="card p-5">
        <div className="mb-3 text-sm font-medium text-slate-600">ความคืบหน้า</div>
        <StatusProgress ticketId={ticket.id} status={ticket.status} />
        <p className="mt-2 text-xs text-slate-400">คลิกที่สถานะเพื่อเปลี่ยนได้ทันที</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* ซ้าย: Info + Description + งานย่อย + ฟอร์มแก้ไข */}
        <div className="space-y-5 lg:col-span-3">
          {/* Info — แก้ไขได้โดยตรง */}
          <div className="card p-5">
            <h2 className="mb-4 font-semibold text-slate-900">
              ข้อมูลงาน (Info){" "}
              <span className="text-xs font-normal text-slate-400">
                — แก้ไขแล้วกด "บันทึกข้อมูลงาน"
              </span>
            </h2>
            <form action={updateInfo}>
              <input type="hidden" name="ticketId" value={ticket.id} />
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-3">
                <div>
                  <div className="label">ผู้รับผิดชอบ</div>
                  <OwnerCell
                    ticketId={ticket.id}
                    assignee={
                      ticket.assignee
                        ? { id: ticket.assignee.id, name: ticket.assignee.name }
                        : null
                    }
                    users={userOpts}
                  />
                </div>
                <div>
                  <div className="label">สถานะ</div>
                  <StatusCell ticketId={ticket.id} status={ticket.status} />
                </div>
                <div>
                  <div className="label">ความสำคัญ</div>
                  <PriorityCell ticketId={ticket.id} priority={ticket.priority} />
                </div>
                <div>
                  <div className="label">Ticket ID</div>
                  <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                    {ticketCode(ticket.number)}
                  </div>
                </div>
                <div>
                  <div className="label">กลุ่ม BU</div>
                  <select
                    name="bu"
                    defaultValue={ticket.bu}
                    className="input px-3 py-1.5 text-sm"
                  >
                    <option value="">— ไม่ระบุ —</option>
                    {buOptions.map((b) => (
                      <option key={b} value={b}>{buShort(b)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="label">ลูกค้า</div>
                  <input
                    name="customer"
                    defaultValue={ticket.customer}
                    required
                    className="input px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <div className="label">ประเภทงาน</div>
                  <select
                    name="jobType"
                    defaultValue={ticket.jobType}
                    className="input px-3 py-1.5 text-sm"
                  >
                    {JOB_TYPES.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="label">
                    กำหนดส่ง
                    {isOverdue(ticket.dueDate, ticket.status) && (
                      <span className="ml-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                        เลยกำหนด
                      </span>
                    )}
                  </div>
                  <input
                    name="dueDate"
                    type="date"
                    defaultValue={dueStr}
                    className="input px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <div className="label">ช่องทางติดต่อ</div>
                  <div className="flex gap-2">
                    <select
                      name="contactChannel"
                      defaultValue={ticket.contactChannel}
                      className="input px-2 py-1.5 text-sm"
                    >
                      {CHANNELS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      name="contactInfo"
                      defaultValue={ticket.contactInfo ?? ""}
                      placeholder="ID / เบอร์"
                      className="input px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button className="btn-primary px-4 py-1.5 text-xs">
                  บันทึกข้อมูลงาน
                </button>
              </div>
            </form>
          </div>

          {/* Description */}
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-slate-900">รายละเอียดงาน (Description)</h2>
            <form action={updateDescription} className="space-y-2">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <textarea
                name="description"
                rows={4}
                defaultValue={ticket.description ?? ""}
                placeholder="อธิบายรายละเอียดงาน ขอบเขต และสิ่งที่ลูกค้าต้องการ..."
                className="input"
              />
              <button className="btn-secondary px-3 py-1.5 text-xs">บันทึกรายละเอียด</button>
            </form>
          </div>

          {/* ไฟล์แนบและลิงก์ */}
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-slate-900">
              ไฟล์แนบและลิงก์{" "}
              <span className="text-sm font-normal text-slate-400">
                ({ticket.attachments.length})
              </span>
            </h2>

            <div className="divide-y divide-slate-100">
              {ticket.attachments.map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-2">
                  <span className="text-slate-400">
                    {a.kind === "link" ? <IconLink size={15} /> : <IconPaperclip size={15} />}
                  </span>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 truncate text-sm font-medium text-slate-700 hover:text-brand-600 hover:underline"
                  >
                    {a.name}
                  </a>
                  <span className="text-xs text-slate-400">
                    {a.uploader.name} · {fmtDate(a.createdAt)}
                  </span>
                  <form action={deleteAttachment}>
                    <input type="hidden" name="attachmentId" value={a.id} />
                    <button
                      className="rounded px-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-brand-600"
                      title="ลบ"
                    >
                      ×
                    </button>
                  </form>
                </div>
              ))}
              {ticket.attachments.length === 0 && (
                <p className="py-1 text-sm text-slate-400">ยังไม่มีไฟล์แนบหรือลิงก์</p>
              )}
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <form
                action={addAttachment}
                className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 p-2.5"
              >
                <input type="hidden" name="ticketId" value={ticket.id} />
                <input type="hidden" name="kind" value="file" />
                <input
                  type="file"
                  name="file"
                  required
                  className="min-w-0 flex-1 text-xs text-slate-500 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:text-slate-600"
                />
                <button className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
                  อัปโหลด
                </button>
              </form>
              <form
                action={addAttachment}
                className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 p-2.5"
              >
                <input type="hidden" name="ticketId" value={ticket.id} />
                <input type="hidden" name="kind" value="link" />
                <input
                  name="url"
                  type="url"
                  required
                  placeholder="https://..."
                  className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand-500"
                />
                <input
                  name="name"
                  placeholder="ชื่อลิงก์"
                  className="w-24 rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand-500"
                />
                <button className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
                  เพิ่มลิงก์
                </button>
              </form>
            </div>
            <p className="mt-2 text-xs text-slate-400">ไฟล์ขนาดไม่เกิน 20MB</p>
          </div>

          {/* งานย่อย */}
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">
                งานย่อย{" "}
                <span className="text-sm font-normal text-slate-400">
                  ({doneSubtasks}/{ticket.subtasks.length})
                </span>
              </h2>
              {ticket.subtasks.length > 0 && (
                <div className="h-2 w-40 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${(doneSubtasks / ticket.subtasks.length) * 100}%` }}
                  />
                </div>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {ticket.subtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-3 py-2">
                  <form action={toggleSubtask}>
                    <input type="hidden" name="subtaskId" value={st.id} />
                    <button
                      className={`flex h-5 w-5 items-center justify-center rounded border text-xs transition ${
                        st.done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-300 bg-white text-transparent hover:border-emerald-400"
                      }`}
                      title={st.done ? "ยกเลิกเสร็จ" : "ทำเสร็จแล้ว"}
                    >
                      ✓
                    </button>
                  </form>
                  <span
                    className={`flex-1 text-sm ${
                      st.done ? "text-slate-400 line-through" : "text-slate-700"
                    }`}
                  >
                    {st.title}
                  </span>
                  {st.assignee && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">
                        {st.assignee.name.charAt(0)}
                      </span>
                      {st.assignee.name}
                    </span>
                  )}
                  {st.dueDate && (
                    <span className="text-xs text-slate-400">{fmtDate(st.dueDate)}</span>
                  )}
                  <form action={deleteSubtask}>
                    <input type="hidden" name="subtaskId" value={st.id} />
                    <button
                      className="rounded px-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-brand-600"
                      title="ลบงานย่อย"
                    >
                      ×
                    </button>
                  </form>
                </div>
              ))}
            </div>

            <form action={addSubtask} className="mt-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <span className="text-slate-400">+</span>
              <input
                name="title"
                placeholder="เพิ่มงานย่อย..."
                required
                className="w-64 rounded border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
              />
              <select
                name="assigneeId"
                defaultValue=""
                className="rounded border border-transparent bg-transparent px-2 py-1.5 text-sm text-slate-500 outline-none focus:border-slate-300 focus:bg-white"
              >
                <option value="">มอบหมายให้...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <input
                name="dueDate"
                type="date"
                className="rounded border border-transparent bg-transparent px-2 py-1 text-sm text-slate-500 outline-none focus:border-slate-300 focus:bg-white"
              />
              <button className="btn-secondary px-3 py-1.5 text-xs">เพิ่ม</button>
            </form>
          </div>

          {/* ฟอร์มแก้ไขทั้งหมด (พับเก็บ) */}
          <details className="card p-5">
            <summary className="cursor-pointer font-semibold text-slate-900">
              แก้ไขรายละเอียดทั้งหมด
            </summary>
            <div className="mt-4">
              <TicketForm
                users={users}
                ticket={ticket}
                action={updateTicketWithId}
                submitLabel="บันทึกการแก้ไข"
                businessUnits={busNames}
              />
            </div>
          </details>
        </div>

        {/* ขวา: Item updates */}
        <div className="lg:col-span-2">
          <div className="card flex flex-col p-5">
            <h2 className="mb-4 font-semibold text-slate-900">
              อัปเดตงาน (Item updates){" "}
              <span className="text-sm font-normal text-slate-400">
                {ticket.comments.length} รายการ
              </span>
            </h2>

            <CommentBox
              ticketId={ticket.id}
              users={users.map((u) => ({
                id: u.id,
                username: u.username,
                name: u.name,
              }))}
            />

            <CommentThread
              ticketId={ticket.id}
              me={session?.id ?? ""}
              users={users.map((u) => ({
                id: u.id,
                username: u.username,
                name: u.name,
              }))}
              comments={ticket.comments.map((c) => ({
                id: c.id,
                body: c.body,
                createdAt: c.createdAt,
                author: { id: c.author.id, name: c.author.name },
                attachments: c.attachments.map((a) => ({
                  id: a.id,
                  name: a.name,
                  url: a.url,
                })),
                replies: c.replies.map((r) => ({
                  id: r.id,
                  body: r.body,
                  createdAt: r.createdAt,
                  author: { id: r.author.id, name: r.author.name },
                  attachments: r.attachments.map((a) => ({
                    id: a.id,
                    name: a.name,
                    url: a.url,
                  })),
                })),
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
