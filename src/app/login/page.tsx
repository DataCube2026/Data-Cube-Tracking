import { login } from "@/lib/actions";
import { Logo } from "@/components/Logo";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Logo size={64} />
          <h1 className="text-2xl font-semibold text-slate-900">
            DATA<span className="text-brand-600">CUBE</span> Tracker
          </h1>
          <p className="text-sm text-slate-500">
            Turning Data into Real Business Value
          </p>
        </div>

        {searchParams.error && (
          <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-700">
            ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง
          </div>
        )}

        <form action={login} className="space-y-4">
          <div>
            <label className="label">ชื่อผู้ใช้</label>
            <input name="username" className="input" required autoFocus />
          </div>
          <div>
            <label className="label">รหัสผ่าน</label>
            <input name="password" type="password" className="input" required />
          </div>
          <button className="btn-primary w-full">เข้าสู่ระบบ</button>
        </form>
      </div>
    </main>
  );
}
