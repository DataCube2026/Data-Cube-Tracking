# DataCube Tracker

ระบบเก็บงานลูกค้า (Ticket) มอบหมายงานให้ทีม และติดตามสถานะ พร้อม Dashboard ภาพรวม
ธีมสีแดงตาม CI ของ DataCube ฟอนต์ Kanit

## เทคโนโลยี

Next.js 14 (App Router) + Prisma ORM + SQLite (ตอน dev) / PostgreSQL (ตอน deploy จริง)

## วิธีรันบนเครื่องตัวเอง (VS Code)

ต้องมี **Node.js 18 ขึ้นไป** (แนะนำ 20+) — ตรวจสอบด้วย `node --version`

เปิดโฟลเดอร์ `datacube-tracker` ใน VS Code แล้วรันใน Terminal:

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. สร้างฐานข้อมูล + ข้อมูลตัวอย่าง (ทำครั้งแรกครั้งเดียว)
npm run db:setup

# 3. รันเซิร์ฟเวอร์
npm run dev
```

เปิดเบราว์เซอร์ที่ **http://localhost:3000**

### บัญชีผู้ใช้ (จาก seed)

| username | password | ชื่อ |
|---|---|---|
| amm | datacube123 | Amm |
| eak | datacube123 | Dr.Eak |

เพิ่มสมาชิกใหม่ได้ที่หน้า "ทีมงาน" ในระบบ

## ฟีเจอร์

- **แดชบอร์ด** — สรุปงานตามสถานะ, งานเลยกำหนด, ภาระงานรายคน, งานใกล้ครบกำหนด
- **งานทั้งหมด** — ตาราง ticket พร้อมค้นหา/กรองตามสถานะ ความสำคัญ ผู้รับผิดชอบ
- **บอร์ดสถานะ** — มุมมอง Kanban 5 คอลัมน์ ย้ายสถานะได้จากการ์ด
- **รายละเอียดงาน** — แก้ไขข้อมูล, เปลี่ยนสถานะด้วยแถบความคืบหน้า, บันทึกความคืบหน้า (comment)
- **ทีมงาน** — ดูภาระงานแต่ละคน + เพิ่มสมาชิก
- **Login** ด้วย username/password (bcrypt + JWT cookie)

สถานะงาน 5 ระดับ: งานใหม่ → มอบหมายแล้ว → กำลังดำเนินการ → รอตรวจสอบ → เสร็จสิ้น

## Deploy ระบบจริง (GitHub + Supabase + Vercel)

ระบบใช้ **PostgreSQL บน Supabase** เป็นฐานข้อมูลหลักแล้ว — ดูขั้นตอนละเอียดทั้งหมดใน **[DEPLOY.md](./DEPLOY.md)**

สรุปสั้น: สร้าง project บน Supabase → เติม `DATABASE_URL` / `DIRECT_URL` / `AUTH_SECRET` ใน `.env` (ดูตัวอย่างจาก `.env.example`) → `npm run db:setup` → push โค้ดขึ้น GitHub → deploy บน Vercel หรือ server บริษัท

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | รันโหมดพัฒนา (hot reload) |
| `npm run build` + `npm start` | รันโหมด production |
| `npm run db:setup` | สร้าง DB + seed ข้อมูลตัวอย่าง |
| `npm run db:studio` | เปิด Prisma Studio ดู/แก้ข้อมูลใน DB |

## โครงสร้างโปรเจกต์

```
datacube-tracker/
├── prisma/
│   ├── schema.prisma      # โครงสร้างฐานข้อมูล (User, Ticket, Comment)
│   └── seed.ts            # ข้อมูลตัวอย่าง
└── src/
    ├── middleware.ts      # บังคับ login ทุกหน้า
    ├── lib/
    │   ├── constants.ts   # สถานะ/ความสำคัญ/ประเภทงาน/ช่องทางติดต่อ (แก้ตัวเลือกที่นี่)
    │   ├── actions.ts     # Server actions (CRUD ทั้งหมด)
    │   ├── auth.ts        # JWT session
    │   └── prisma.ts      # Prisma client
    ├── components/        # Logo, Badge, TicketForm
    └── app/
        ├── login/         # หน้า login
        └── (app)/         # หน้าที่ต้อง login
            ├── page.tsx           # แดชบอร์ด
            ├── tickets/           # รายการงาน / สร้าง / รายละเอียด
            ├── board/             # Kanban board
            └── team/              # ทีมงาน
```

ต้องการเพิ่ม/แก้ตัวเลือกประเภทงานหรือช่องทางติดต่อ แก้ได้ที่ `src/lib/constants.ts` ไฟล์เดียว
