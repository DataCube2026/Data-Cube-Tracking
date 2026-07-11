import { prisma } from "@/lib/prisma";
import { createUser } from "@/lib/actions";
import { Avatar } from "@/components/Badge";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const users = await prisma.user.findMany({
    include: {
      _count: { select: { assignedTickets: true } },
      assignedTickets: { where: { status: { not: "DONE" } }, select: { id: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">ทีมงาน</h1>
        <p className="text-sm text-slate-500">สมาชิกทั้งหมด {users.length} คน</p>
      </div>

      {searchParams.error === "duplicate" && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-700">
          ชื่อผู้ใช้นี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น
        </div>
      )}
      {searchParams.error === "invalid" && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-700">
          กรุณากรอกข้อมูลให้ครบ (รหัสผ่านอย่างน้อย 4 ตัวอักษร)
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-slate-900">สมาชิก</h2>
          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
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
                  <div>
                    <div className="text-sm font-medium text-slate-800">{u.name}</div>
                    <div className="text-xs text-slate-400">@{u.username}</div>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>
                    ค้าง <b className="text-brand-600">{u.assignedTickets.length}</b> งาน
                  </div>
                  <div>ทั้งหมด {u._count.assignedTickets} งาน</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card h-fit p-5">
          <h2 className="mb-4 font-semibold text-slate-900">เพิ่มสมาชิกใหม่</h2>
          <form action={createUser} className="space-y-3">
            <div>
              <label className="label">ชื่อที่แสดง</label>
              <input name="name" className="input" required />
            </div>
            <div>
              <label className="label">ชื่อผู้ใช้ (สำหรับ login)</label>
              <input name="username" className="input" required />
            </div>
            <div>
              <label className="label">รหัสผ่าน</label>
              <input name="password" type="password" className="input" required minLength={4} />
            </div>
            <button className="btn-primary w-full">เพิ่มสมาชิก</button>
          </form>
        </div>
      </div>
    </div>
  );
}
