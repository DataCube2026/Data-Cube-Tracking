import { prisma } from "@/lib/prisma";
import { createTicket } from "@/lib/actions";
import { TicketForm } from "@/components/TicketForm";

export const dynamic = "force-dynamic";

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">สร้างงานใหม่</h1>
        <p className="text-sm text-slate-500">
          บันทึกงานที่ลูกค้าต้องการ ระบบจะตั้งสถานะเป็น "งานใหม่"
          หรือ "มอบหมายแล้ว" อัตโนมัติถ้าเลือกผู้รับผิดชอบ
        </p>
      </div>

      {searchParams.error && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-700">
          กรุณากรอกชื่องานและลูกค้าให้ครบถ้วน
        </div>
      )}

      <div className="card p-6">
        <TicketForm users={users} action={createTicket} submitLabel="บันทึกงาน" />
      </div>
    </div>
  );
}
