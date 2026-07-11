// API แจ้งเตือน: ดึงรายการ + ทำเครื่องหมายว่าอ่านแล้ว
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.notification.count({
      where: { userId: session.id, read: false },
    }),
  ]);

  return NextResponse.json({ items, unread });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body.all) {
    await prisma.notification.updateMany({
      where: { userId: session.id, read: false },
      data: { read: true },
    });
  } else if (body.id) {
    await prisma.notification.updateMany({
      where: { id: String(body.id), userId: session.id },
      data: { read: true },
    });
  }
  return NextResponse.json({ ok: true });
}
