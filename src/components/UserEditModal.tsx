"use client";

// ป็อปอัพแก้ไขข้อมูลสมาชิก (เฉพาะแอดมิน)
import { useState } from "react";
import { updateUser } from "@/lib/actions";

type U = { id: string; username: string; name: string; role: string };

export function UserEditModal({ user, isSelf }: { user: U; isSelf: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100"
      >
        แก้ไข
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              แก้ไขสมาชิก — {user.name}
            </h3>
            <form action={updateUser} className="space-y-3">
              <input type="hidden" name="userId" value={user.id} />
              <div>
                <label className="label">ชื่อที่แสดง</label>
                <input name="name" defaultValue={user.name} className="input" required />
              </div>
              <div>
                <label className="label">ชื่อผู้ใช้ (login)</label>
                <input
                  name="username"
                  defaultValue={user.username}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">
                  ตำแหน่ง{" "}
                  {isSelf && (
                    <span className="text-xs font-normal text-slate-400">
                      (เปลี่ยนของตัวเองไม่ได้)
                    </span>
                  )}
                </label>
                <select
                  name="role"
                  defaultValue={user.role}
                  className="input"
                  disabled={isSelf}
                >
                  <option value="MEMBER">สมาชิก</option>
                  <option value="ADMIN">แอดมิน</option>
                </select>
              </div>
              <div>
                <label className="label">รีเซ็ตรหัสผ่าน (เว้นว่าง = ไม่เปลี่ยน)</label>
                <input
                  name="newPassword"
                  type="password"
                  className="input"
                  placeholder="รหัสผ่านใหม่ชั่วคราว"
                  minLength={4}
                />
                <p className="mt-1 text-xs text-slate-400">
                  ถ้าตั้งรหัสใหม่ สมาชิกจะถูกให้เปลี่ยนรหัสเองตอน login ครั้งถัดไป
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary"
                >
                  ยกเลิก
                </button>
                <button className="btn-primary">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
