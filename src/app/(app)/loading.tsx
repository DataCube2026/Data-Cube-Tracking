// แสดงทันทีระหว่างรอโหลดข้อมูลจากฐานข้อมูล — ทำให้การเปลี่ยนหน้ารู้สึกไว
export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-4 w-72 animate-pulse rounded bg-slate-100" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
      <div className="flex items-center justify-center gap-3 py-6 text-sm text-slate-400">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
        กำลังโหลดข้อมูล...
      </div>
    </div>
  );
}
