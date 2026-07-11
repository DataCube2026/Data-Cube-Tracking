import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { updateAvatar, changePassword } from "@/lib/actions";
import { fmtDate } from "@/lib/constants";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  avatar: "อัปโหลดรูปไม่สำเร็จ (ไฟล์รูปไม่เกิน 5MB)",
  short: "รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัวอักษร",
  mismatch: "รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน",
  wrong: "รหัสผ่านปัจจุบันไม่ถูกต้อง",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { first?: string; error?: string; saved?: string; changed?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">โปรไฟล์ของฉัน</h1>
        <p className="text-sm text-slate-500">จัดการรูปโปรไฟล์และรหัสผ่าน</p>
      </div>

      {(searchParams.first || user.mustChangePassword) && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <b>เข้าสู่ระบบครั้งแรก</b> — กรุณาตั้งรหัสผ่านใหม่ของคุณเองก่อนเริ่มใช้งานระบบ
        </div>
      )}
      {searchParams.saved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          บันทึกรูปโปรไฟล์เรียบร้อย
        </div>
      )}
      {searchParams.changed && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          เปลี่ยนรหัสผ่านเรียบร้อย — ใช้รหัสใหม่ในการเข้าสู่ระบบครั้งถัดไป
        </div>
      )}
      {searchParams.error && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-700">
          {ERRORS[searchParams.error] ?? "เกิดข้อผิดพลาด"}
        </div>
      )}

      {/* รูปโปรไฟล์ */}
      <div className="card p-6">
        <h2 className="mb-4 font-semibold text-slate-900">รูปโปรไฟล์</h2>
        <div className="flex items-center gap-5">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-20 w-20 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-2xl font-semibold text-white">
              {user.name.charAt(0)}
            </span>
          )}
          <div>
            <div className="font-medium text-slate-800">{user.name}</div>
            <div className="mb-3 text-sm text-slate-400">
              @{user.username} · สมาชิกตั้งแต่ {fmtDate(user.createdAt)}
            </div>
            <form action={updateAvatar} className="flex items-center gap-2">
              <input
                type="file"
                name="avatar"
                accept="image/*"
                required
                className="text-xs text-slate-500 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:text-slate-600"
              />
              <button className="btn-secondary px-3 py-1.5 text-xs">อัปโหลดรูป</button>
            </form>
          </div>
        </div>
      </div>

      {/* เปลี่ยนรหัสผ่าน */}
      <div className="card p-6">
        <h2 className="mb-4 font-semibold text-slate-900">เปลี่ยนรหัสผ่าน</h2>
        <form action={changePassword} className="max-w-sm space-y-3">
          <div>
            <label className="label">รหัสผ่านปัจจุบัน</label>
            <input name="current" type="password" className="input" required />
          </div>
          <div>
            <label className="label">รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</label>
            <input name="next" type="password" className="input" required minLength={6} />
          </div>
          <div>
            <label className="label">ยืนยันรหัสผ่านใหม่</label>
            <input name="confirm" type="password" className="input" required minLength={6} />
          </div>
          <button className="btn-primary">เปลี่ยนรหัสผ่าน</button>
        </form>
      </div>
    </div>
  );
}
