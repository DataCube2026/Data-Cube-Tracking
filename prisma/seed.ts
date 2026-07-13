import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const day = 24 * 60 * 60 * 1000;

async function main() {
  const password = await bcrypt.hash("datacube123", 10);

  // ทีมงาน 2 คน (แอดมินทั้งคู่) — เพิ่มสมาชิกคนอื่นได้ที่หน้า "ทีมงาน"
  const [amm, eak] = await Promise.all(
    [
      { username: "amm", name: "Amm", role: "ADMIN" },
      { username: "eak", name: "Dr.Eak", role: "ADMIN" },
    ].map((u) =>
      prisma.user.upsert({
        where: { username: u.username },
        update: { name: u.name, role: u.role },
        create: { ...u, passwordHash: password },
      })
    )
  );

  // กลุ่ม BU ลูกค้า 9 กลุ่ม (จัดการเพิ่ม/ลด/เปิดปิดได้ที่หน้า "ทีมงาน")
  const BUS = [
    "Jaymart Mobile (JMB)",
    "JElite (JPoint)",
    "Brewing Happiness (BH)",
    "JAS Asset (JAS)",
    "SG Capital (SGC)",
    "Rawmat Coffee (RMC)",
    "CEO Business (Gen II)",
    "Jaymart Holding (JMH)",
    "Jaymart (JMT)",
  ];
  for (const name of BUS) {
    await prisma.businessUnit.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const count = await prisma.ticket.count();
  if (count === 0) {
    const tomorrow = new Date(Date.now() + 1 * day);
    tomorrow.setHours(10, 0, 0, 0);

    // ----- Ticket จริง #1: ขอยอด SG กำแพงเพชร (ส่งมอบแล้ว 6 July) -----
    await prisma.ticket.create({
      data: {
        number: 1,
        title:
          "ขอยอด SG จังหวัดกำแพงเพชร (MTD) รายร้านค้า Dealer / รายสาขา Jaymart + NPL ล่าสุด",
        bu: "SG Capital (SGC)",
        customer: "Dr.Eak",
        description:
          "ขอยอด SG ในจังหวัดกำแพงเพชร MTD แยกรายร้านค้า Dealer และรายสาขา Jaymart พร้อม NPL ล่าสุดในจังหวัดนี้\n- Request วันที่ 6 July\n- ส่งมอบวันที่ 6 July",
        status: "DONE",
        priority: "MEDIUM",
        jobType: "Report",
        contactChannel: "LINE",
        createdAt: new Date("2026-07-06T09:00:00+07:00"),
        dueDate: new Date("2026-07-06T00:00:00+07:00"),
        assigneeId: amm.id,
        createdById: eak.id,
      },
    });

    // ----- Ticket จริง #2: point balance JPoint ไม่ตรงกัน -----
    const t2 = await prisma.ticket.create({
      data: {
        number: 2,
        title: "ตรวจสอบ point balance ของ JPoint ไม่ตรงกัน",
        bu: "JElite (JPoint)",
        customer: "Dr.Eak",
        description:
          "ยอด point balance ของ JPoint ไม่ตรงกัน นัดประชุมตรวจสอบร่วมกันพรุ่งนี้ 10:00 น.",
        status: "IN_PROGRESS",
        priority: "HIGH",
        jobType: "Database",
        contactChannel: "ประชุม / Onsite",
        dueDate: tomorrow,
        assigneeId: amm.id,
        createdById: eak.id,
      },
    });
    await prisma.comment.create({
      data: {
        ticketId: t2.id,
        authorId: eak.id,
        body: "@amm มีเรื่อง point balance ของ JPoint ไม่ตรงกัน เลยนัดประชุมพรุ่งนี้ 10:00 น.",
      },
    });
    await prisma.subtask.createMany({
      data: [
        { ticketId: t2.id, title: "เตรียมข้อมูล point balance ก่อนประชุม", assigneeId: amm.id },
        { ticketId: t2.id, title: "ประชุมตรวจสอบร่วมกัน 10:00 น.", dueDate: tomorrow },
        {
          ticketId: t2.id,
          title: "อัพเดต script สรุป point balance (สิ้นเดือน 5/2026, สิ้นเดือน 6/2026)",
          assigneeId: amm.id,
        },
        { ticketId: t2.id, title: "สรุปสาเหตุและแนวทางแก้ไข" },
      ],
    });

    // ----- Ticket จริง #3: Stock allocation (คุณ Ray) -----
    const t3 = await prisma.ticket.create({
      data: {
        number: 3,
        title: "Stock allocation ติดอยู่ฝั่งเรา — นัดคุยกับคุณ Ray",
        bu: "Jaymart Mobile (JMB)",
        customer: "คุณ Ray (@Ray_RaZXiFeTy)",
        description:
          "คุณ Ray สอบถามเรื่อง stock allocation พี่ลี่แจ้งว่าติดอยู่ทางฝั่งเรา ต้องนัดคุยกับลูกค้าเพื่อเคลียร์ประเด็น",
        status: "ASSIGNED",
        priority: "HIGH",
        jobType: "อื่น ๆ",
        contactChannel: "LINE",
        contactInfo: "@Ray_RaZXiFeTy",
        dueDate: new Date(Date.now() + 3 * day),
        assigneeId: amm.id,
        createdById: eak.id,
      },
    });
    await prisma.comment.create({
      data: {
        ticketId: t3.id,
        authorId: eak.id,
        body: "@amm ใส่ task นี้ไปด้วยนะครับ เดี๋ยวต้องนัดคุยกับเค้าหน่อย",
      },
    });
  }

  console.log("Seed เสร็จสิ้น — login: amm หรือ eak (รหัสผ่าน datacube123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
