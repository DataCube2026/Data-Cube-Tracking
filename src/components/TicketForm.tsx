import { STATUSES, PRIORITIES, JOB_TYPES, CHANNELS } from "@/lib/constants";
import type { Ticket, User } from "@prisma/client";

export function TicketForm({
  users,
  ticket,
  action,
  submitLabel,
  businessUnits,
}: {
  users: User[];
  ticket?: Ticket;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  businessUnits: string[];
}) {
  // ถ้า BU เดิมของงานถูกปิดใช้งานไปแล้ว ให้ยังแสดงในตัวเลือกได้
  const buOptions =
    ticket?.bu && !businessUnits.includes(ticket.bu)
      ? [ticket.bu, ...businessUnits]
      : businessUnits;
  const due = ticket?.dueDate
    ? new Date(ticket.dueDate).toISOString().slice(0, 10)
    : "";

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="label">ชื่องาน *</label>
          <input name="title" defaultValue={ticket?.title} className="input" required />
        </div>

        <div>
          <label className="label">กลุ่ม BU ลูกค้า *</label>
          <select name="bu" defaultValue={ticket?.bu ?? ""} className="input" required>
            <option value="" disabled>— เลือกกลุ่ม BU —</option>
            {buOptions.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">ชื่อลูกค้า / ผู้ติดต่อ *</label>
          <input
            name="customer"
            defaultValue={ticket?.customer}
            placeholder="เช่น คุณสมชาย ฝ่ายการตลาด"
            className="input"
            required
          />
        </div>

        <div>
          <label className="label">ผู้รับผิดชอบ</label>
          <select name="assigneeId" defaultValue={ticket?.assigneeId ?? ""} className="input">
            <option value="">— ยังไม่มอบหมาย —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {ticket && (
          <div>
            <label className="label">สถานะ</label>
            <select name="status" defaultValue={ticket.status} className="input">
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label">ความสำคัญ</label>
          <select name="priority" defaultValue={ticket?.priority ?? "MEDIUM"} className="input">
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">ประเภทงาน</label>
          <select name="jobType" defaultValue={ticket?.jobType ?? JOB_TYPES[0]} className="input">
            {JOB_TYPES.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">กำหนดส่ง</label>
          <input name="dueDate" type="date" defaultValue={due} className="input" />
        </div>

        <div>
          <label className="label">ช่องทางติดต่อลูกค้า</label>
          <select
            name="contactChannel"
            defaultValue={ticket?.contactChannel ?? CHANNELS[0]}
            className="input"
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">ข้อมูลติดต่อ (LINE ID / อีเมล / เบอร์)</label>
          <input name="contactInfo" defaultValue={ticket?.contactInfo ?? ""} className="input" />
        </div>

        <div className="md:col-span-2">
          <label className="label">รายละเอียดงาน</label>
          <textarea
            name="description"
            defaultValue={ticket?.description ?? ""}
            rows={4}
            className="input"
          />
        </div>
      </div>

      <button className="btn-primary">{submitLabel}</button>
    </form>
  );
}
