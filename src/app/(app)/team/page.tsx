import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  createUser,
  deleteUser,
  addBusinessUnit,
  toggleBusinessUnit,
  deleteBusinessUnit,
  saveNotificationSettings,
} from "@/lib/actions";
import { UserEditModal } from "@/components/UserEditModal";
import { ConfirmButton } from "@/components/Confirm";
import { Avatar } from "@/components/Badge";
import { buShort } from "@/lib/constants";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  duplicate: "ชื่อผู้ใช้นี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น",
  invalid: "กรุณากรอกข้อมูลให้ครบ (รหัสผ่านอย่างน้อย 4 ตัวอักษร)",
  forbidden: "เฉพาะแอดมินเท่านั้นที่จัดการส่วนนี้ได้",
  self: "ไม่สามารถลบหรือเปลี่ยนตำแหน่งตัวเองได้",
  hasdata: "ลบไม่ได้ — สมาชิกคนนี้มีงาน/อัปเดต/ไฟล์ผูกอยู่ในระบบ (เปลี่ยนเป็นสมาชิกธรรมดาแทนได้)",
  budup: "มีกลุ่ม BU ชื่อนี้อยู่แล้ว",
};

export default async function TeamPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const session = await getSession();
  const [users, me, bus, notificationSettings] = await Promise.all([
    prisma.user.findMany({
      include: {
        _count: { select: { assignedTickets: true } },
        assignedTickets: { where: { status: { not: "DONE" } }, select: { id: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findUnique({ where: { id: session?.id ?? "" } }),
    prisma.businessUnit.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.notificationSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    }),
  ]);
  const isAdmin = me?.role === "ADMIN";

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">ทีมงานและการตั้งค่า</h1>
        <p className="text-sm text-slate-500">
          สมาชิกทั้งหมด {users.length} คน
          {isAdmin ? " — คุณเป็นแอดมิน จัดการสมาชิกและกลุ่ม BU ได้" : ""}
        </p>
      </div>

      {searchParams.error && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-700">
          {ERRORS[searchParams.error] ?? "เกิดข้อผิดพลาด"}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {/* สมาชิก */}
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-slate-900">สมาชิก</h2>
          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-3">
                {u.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={u.avatarUrl}
                    alt={u.name}
                    className="h-9 w-9 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <Avatar name={u.name} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-800">
                      {u.name}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        u.role === "ADMIN"
                          ? "bg-brand-50 text-brand-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {u.role === "ADMIN" ? "แอดมิน" : "สมาชิก"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    @{u.username} · ค้าง {u.assignedTickets.length} งาน / ทั้งหมด{" "}
                    {u._count.assignedTickets}
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <UserEditModal
                      user={{
                        id: u.id,
                        username: u.username,
                        name: u.name,
                        role: u.role,
                      }}
                      isSelf={u.id === me?.id}
                    />
                    {u.id !== me?.id && (
                      <ConfirmButton
                        message={`ต้องการลบสมาชิก "${u.name}" (@${u.username}) ใช่ไหม? งานที่ถืออยู่จะกลายเป็น "ไม่มอบหมาย"`}
                        confirmLabel="ลบสมาชิก"
                        action={deleteUser}
                        hidden={{ userId: u.id }}
                        className="rounded border border-slate-200 px-2 py-1 text-xs text-brand-600 transition hover:bg-brand-50"
                      >
                        ลบ
                      </ConfirmButton>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {/* เพิ่มสมาชิก (เฉพาะแอดมิน) */}
          {isAdmin && (
            <div className="card p-5">
              <h2 className="mb-4 font-semibold text-slate-900">เพิ่มสมาชิกใหม่</h2>
              <form action={createUser} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">ชื่อที่แสดง</label>
                    <input name="name" className="input" required />
                  </div>
                  <div>
                    <label className="label">ชื่อผู้ใช้ (login)</label>
                    <input name="username" className="input" required />
                  </div>
                  <div>
                    <label className="label">รหัสผ่านเริ่มต้น</label>
                    <input name="password" type="password" className="input" required minLength={4} />
                  </div>
                  <div>
                    <label className="label">ตำแหน่ง</label>
                    <select name="role" defaultValue="MEMBER" className="input">
                      <option value="MEMBER">สมาชิก</option>
                      <option value="ADMIN">แอดมิน</option>
                    </select>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  สมาชิกใหม่จะถูกให้ตั้งรหัสผ่านเองตอน login ครั้งแรก
                </p>
                <button className="btn-primary w-full">เพิ่มสมาชิก</button>
              </form>
            </div>
          )}

          {/* จัดการกลุ่ม BU (เฉพาะแอดมิน) */}
          {isAdmin && (
            <div className="card p-5">
              <h2 className="mb-1 font-semibold text-slate-900">จัดการกลุ่ม BU ลูกค้า</h2>
              <p className="mb-3 text-xs text-slate-400">
                ปิดการใช้งาน = ไม่ขึ้นให้เลือกตอนสร้างงานใหม่ (งานเก่าไม่กระทบ)
              </p>
              <div className="divide-y divide-slate-100">
                {bus.map((b) => (
                  <div key={b.id} className="flex items-center gap-2 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        b.active
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {buShort(b.name)}
                    </span>
                    <span
                      className={`flex-1 truncate text-sm ${
                        b.active ? "text-slate-700" : "text-slate-400 line-through"
                      }`}
                    >
                      {b.name}
                    </span>
                    <form action={toggleBusinessUnit}>
                      <input type="hidden" name="buId" value={b.id} />
                      <button
                        className={`rounded border px-2 py-0.5 text-xs transition ${
                          b.active
                            ? "border-slate-200 text-slate-500 hover:bg-slate-100"
                            : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        {b.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                      </button>
                    </form>
                    <ConfirmButton
                      message={`ต้องการลบกลุ่ม BU "${b.name}" ใช่ไหม? (งานเก่าที่ใช้ BU นี้ไม่กระทบ)`}
                      confirmLabel="ลบ BU"
                      action={deleteBusinessUnit}
                      hidden={{ buId: b.id }}
                      className="rounded px-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-brand-600"
                    >
                      ×
                    </ConfirmButton>
                  </div>
                ))}
              </div>
              <form action={addBusinessUnit} className="mt-3 flex gap-2">
                <input
                  name="name"
                  placeholder="เพิ่มกลุ่ม BU เช่น Jaymart (JMT)"
                  required
                  className="input flex-1"
                />
                <button className="btn-secondary shrink-0">เพิ่ม</button>
              </form>
            </div>
          )}

          {isAdmin && (
            <div className="card p-5">
              <h2 className="mb-1 font-semibold text-slate-900">Notification & SLA</h2>
              <p className="mb-4 text-xs text-slate-400">
                ตั้งกติกาแจ้งเตือนในระบบ ผู้เกี่ยวข้องกับงานจะได้รับก่อน escalation
              </p>
              <form action={saveNotificationSettings} className="space-y-4">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  {[
                    ["notifyAssignment", "แจ้งเมื่อมอบหมายงาน"],
                    ["notifyStatusChange", "แจ้งเมื่อเปลี่ยนสถานะ"],
                    ["notifyComment", "แจ้งเมื่อมี comment/reply"],
                    ["notifyMention", "แจ้งเมื่อถูก @mention"],
                    ["notifyDueSoon", "แจ้งงานใกล้ครบกำหนด"],
                    ["notifyOverdue", "แจ้งงานเกินกำหนด"],
                  ].map(([name, label]) => (
                    <label key={name} className="flex items-center gap-2 text-slate-700">
                      <input
                        type="checkbox"
                        name={name}
                        defaultChecked={notificationSettings[name as keyof typeof notificationSettings] === true}
                        className="h-4 w-4 accent-brand-600"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="label">
                    เตือนล่วงหน้า (ชั่วโมง)
                    <input name="dueSoonHours" type="number" min="1" max="720" defaultValue={notificationSettings.dueSoonHours} className="input mt-1" />
                  </label>
                  <label className="label">
                    Escalate ถึง Admin หลัง overdue (ชั่วโมง)
                    <input name="overdueEscalationHours" type="number" min="1" max="720" defaultValue={notificationSettings.overdueEscalationHours} className="input mt-1" />
                  </label>
                </div>
                <button className="btn-primary">บันทึกการตั้งค่า</button>
              </form>
            </div>
          )}

          {!isAdmin && (
            <div className="card p-5 text-sm text-slate-500">
              การเพิ่ม/ลบสมาชิก เปลี่ยนตำแหน่ง และจัดการกลุ่ม BU
              ทำได้เฉพาะผู้ที่มีตำแหน่ง <b>แอดมิน</b>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
