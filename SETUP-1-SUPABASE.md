# คู่มือติดตั้ง Supabase (ฐานข้อมูล) — ทีละขั้น

> Supabase คือที่เก็บฐานข้อมูล PostgreSQL บน cloud (ฟรี) — ทุกคนในทีมใช้ข้อมูลชุดเดียวกัน

---

## 1. สมัครและสร้างโปรเจกต์

1. เข้า **https://supabase.com** → กด **Start your project** → สมัครด้วย GitHub หรืออีเมล
2. กด **New project**
3. กรอก:
   - **Name:** `datacube-tracker`
   - **Database Password:** ตั้งรหัสผ่าน **แล้วจดเก็บไว้** (ต้องใช้ในขั้นถัดไป)
   - **Region:** `Southeast Asia (Singapore)` — ใกล้ไทยที่สุด
4. กด **Create new project** รอประมาณ 1–2 นาที

## 2. คัดลอก Connection String

1. กดปุ่ม **Connect** (ด้านบนของหน้า Dashboard)
2. เลือกแท็บ **ORMs** → เลือก **Prisma**
   (อย่าใช้แท็บ App Frameworks — อันนั้นคนละแบบ)
3. จะเห็นค่า 2 บรรทัด:
   - `DATABASE_URL` → ต้องเป็น **port 6543**
   - `DIRECT_URL` → ต้องเป็น **port 5432**
4. คัดลอกทั้งสองบรรทัด

## 3. เติมค่าในไฟล์ .env

เปิดไฟล์ `.env` ในโฟลเดอร์โปรเจกต์ แล้ววางค่าให้เป็นรูปแบบนี้:

```
DATABASE_URL="postgresql://postgres.xxxx:รหัสผ่าน@aws-0-xxx.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxx:รหัสผ่าน@aws-0-xxx.pooler.supabase.com:5432/postgres"
AUTH_SECRET="ข้อความสุ่มยาวๆ"
```

**ข้อควรระวัง:**
- แทน `[YOUR-PASSWORD]` ด้วยรหัสผ่านจริง **และลบวงเล็บเหลี่ยม `[ ]` ออกด้วย**
- `DATABASE_URL` ต้องมี `?pgbouncer=true` ต่อท้าย
- สร้าง `AUTH_SECRET` ด้วยคำสั่ง:
  ```
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

## 4. สร้างตาราง + ข้อมูลเริ่มต้น (ครั้งเดียว)

เปิดเทอร์มินัลในโฟลเดอร์โปรเจกต์ แล้วรัน:

```
npm run db:setup
```

สำเร็จเมื่อเห็น:
```
Your database is now in sync with your Prisma schema.
Seed เสร็จสิ้น — login: amm หรือ eak (รหัสผ่าน datacube123)
```

## 5. ทดสอบ

```
npm run dev
```
เปิด http://localhost:3000 → login `amm` / `datacube123` (ครั้งแรกระบบให้ตั้งรหัสใหม่)

---

## เกร็ดที่ใช้บ่อย

| ทำอะไร | ที่ไหน |
|---|---|
| ดู/แก้ข้อมูลดิบในตาราง | Supabase Dashboard → **Table Editor** |
| ลืมรหัสผ่านฐานข้อมูล | Project Settings → Database → **Reset database password** (แล้วแก้ .env ใหม่) |
| แก้โครงสร้างตาราง (schema) | แก้ `prisma/schema.prisma` แล้วรัน `npx prisma db push` |
| ล้างข้อมูลทั้งหมดเริ่มใหม่ | Table Editor ลบข้อมูล หรือรัน `npx prisma db push --force-reset` แล้ว `npm run db:seed` |

## ปัญหาที่เจอบ่อย

- **Error P1001 (Can't reach database server)** → เน็ต/DNS ของเครื่องมีปัญหา หรือเครือข่ายบล็อก port 5432/6543 — ลองสลับเป็น hotspot มือถือ
- **Error P1000 (Authentication failed)** → รหัสผ่านใน .env ผิด หรือลืมลบวงเล็บ `[ ]`
