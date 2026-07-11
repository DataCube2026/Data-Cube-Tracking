// Export งานเป็นไฟล์ CSV (เปิดใน Excel ได้ รองรับภาษาไทย)
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { statusOf, priorityOf, ticketCode } from "@/lib/constants";

export const dynamic = "force-dynamic";

function fmt(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function esc(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") ?? "";
  const priority = sp.get("priority") ?? "";
  const assignee = sp.get("assignee") ?? "";
  const bu = sp.get("bu") ?? "";
  const q = sp.get("q") ?? "";
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";

  const tickets = await prisma.ticket.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(assignee ? { assigneeId: assignee } : {}),
      ...(bu ? { bu } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { customer: { contains: q } },
              { bu: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      assignee: true,
      createdBy: true,
      subtasks: true,
      _count: { select: { comments: true } },
    },
    orderBy: { number: "asc" },
  });

  const header = [
    "Ticket ID",
    "ชื่องาน",
    "กลุ่ม BU",
    "ลูกค้า",
    "ผู้รับผิดชอบ",
    "สถานะ",
    "ความสำคัญ",
    "ประเภทงาน",
    "ช่องทางติดต่อ",
    "ข้อมูลติดต่อ",
    "วันที่สร้าง",
    "กำหนดส่ง",
    "งานย่อยเสร็จ",
    "งานย่อยทั้งหมด",
    "จำนวนอัปเดต",
    "ผู้สร้าง",
    "รายละเอียด",
  ];

  const rows = tickets.map((t) => [
    ticketCode(t.number),
    t.title,
    t.bu,
    t.customer,
    t.assignee?.name ?? "",
    statusOf(t.status).label,
    priorityOf(t.priority).label,
    t.jobType,
    t.contactChannel,
    t.contactInfo ?? "",
    fmt(t.createdAt),
    fmt(t.dueDate),
    t.subtasks.filter((s) => s.done).length,
    t.subtasks.length,
    t._count.comments,
    t.createdBy.name,
    t.description ?? "",
  ]);

  // BOM (﻿) ทำให้ Excel เปิดภาษาไทยถูกต้อง
  const csv =
    "﻿" +
    [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");

  const today = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="datacube-tasks-${today}.csv"`,
    },
  });
}
