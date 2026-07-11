import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/constants";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  LOGIN: { label: "เข้าสู่ระบบ", color: "#00c875" },
  LOGOUT: { label: "ออกจากระบบ", color: "#797e93" },
  CREATE_TICKET: { label: "สร้างงาน", color: "#579bfc" },
  UPDATE_TICKET: { label: "แก้ไขงาน", color: "#fdab3d" },
  UPDATE_STATUS: { label: "เปลี่ยนสถานะ", color: "#a25ddc" },
  UPDATE_PRIORITY: { label: "เปลี่ยนความสำคัญ", color: "#a25ddc" },
  ASSIGN: { label: "มอบหมายงาน", color: "#ff5ac4" },
  DELETE_TICKET: { label: "ลบงาน", color: "#e2445c" },
  ADD_UPDATE: { label: "เพิ่มอัปเดต", color: "#579bfc" },
  CREATE_USER: { label: "เพิ่มสมาชิก", color: "#00c875" },
  CHANGE_PASSWORD: { label: "เปลี่ยนรหัสผ่าน", color: "#797e93" },
  UPDATE_PROFILE: { label: "แก้ไขโปรไฟล์", color: "#797e93" },
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: { user?: string };
}) {
  const [logs, users] = await Promise.all([
    prisma.activityLog.findMany({
      where: searchParams.user ? { userId: searchParams.user } : {},
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">ประวัติการใช้งาน (Activity Log)</h1>
        <p className="text-sm text-slate-500">
          บันทึกทุกการกระทำในระบบ — ใครทำอะไร เมื่อไหร่ (แสดง 200 รายการล่าสุด)
        </p>
      </div>

      <form method="GET" className="flex items-center gap-2">
        <select
          name="user"
          defaultValue={searchParams.user ?? ""}
          className="input max-w-52"
        >
          <option value="">ผู้ใช้: ทั้งหมด</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <button className="btn-secondary">กรอง</button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-4 py-2.5 font-medium">เวลา</th>
              <th className="px-3 py-2.5 font-medium">ผู้ใช้</th>
              <th className="px-3 py-2.5 font-medium">การกระทำ</th>
              <th className="px-3 py-2.5 font-medium">รายละเอียด</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  ยังไม่มีบันทึกการใช้งาน
                </td>
              </tr>
            )}
            {logs.map((l) => {
              const a = ACTION_LABELS[l.action] ?? { label: l.action, color: "#797e93" };
              return (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-400">
                    {fmtDateTime(l.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">
                        {l.user.name.charAt(0)}
                      </span>
                      <span className="text-slate-700">{l.user.name}</span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span
                      className="inline-flex rounded px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: a.color + "1a", color: a.color }}
                    >
                      {a.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{l.detail}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
