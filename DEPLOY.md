# คู่มือ Deploy ระบบจริง — GitHub + Supabase

ภาพรวม: โค้ดเก็บบน **GitHub** · ฐานข้อมูลอยู่บน **Supabase (PostgreSQL ฟรี)** · ตัวเว็บรันบน **Vercel (ฟรี)** หรือ server ของบริษัท

---

## ขั้นที่ 1 — สร้างฐานข้อมูลบน Supabase

1. สมัคร/เข้าสู่ระบบที่ https://supabase.com → **New project**
2. ตั้งชื่อ project เช่น `datacube-tracker`, ตั้ง **Database Password** (จดไว้), เลือก region `Southeast Asia (Singapore)`
3. เมื่อสร้างเสร็จ ไปที่ **Project Settings → Database → Connection string** จะได้ 2 ค่า:
   - **Transaction pooler** (port `6543`) → ใช้เป็น `DATABASE_URL` และต่อท้ายด้วย `?pgbouncer=true&connection_limit=1`
   - **Direct connection / Session** (port `5432`) → ใช้เป็น `DIRECT_URL`
4. เปิดไฟล์ `.env` ในโปรเจกต์ เติมค่าทั้งสอง (แทน `[YOUR-PASSWORD]` ด้วยรหัสที่ตั้งไว้)
5. ตั้ง `AUTH_SECRET` เป็นข้อความสุ่มยาว ๆ สร้างได้ด้วย:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
6. สร้างตาราง + ข้อมูลเริ่มต้น (รันครั้งเดียว):
   ```bash
   npm run db:setup
   ```
   เสร็จแล้วทดสอบ `npm run dev` → login ด้วย `amm` / `datacube123`

> ตั้งแต่นี้เครื่อง dev และ production ใช้ฐานข้อมูล Supabase ตัวเดียวกัน — ไฟล์ `prisma/dev.db` (SQLite เดิม) ไม่ถูกใช้แล้ว ลบทิ้งได้

---

## ขั้นที่ 2 — เอาโค้ดขึ้น GitHub

ต้องมี [Git](https://git-scm.com/download/win) ติดตั้งไว้ แล้วรันในโฟลเดอร์ `datacube-tracker`:

```bash
git init
git add .
git commit -m "DataCube Tracker v1"
```

จากนั้นสร้าง repository ใหม่บน https://github.com/new (ตั้งเป็น **Private**) แล้ว:

```bash
git remote add origin https://github.com/USERNAME/datacube-tracker.git
git branch -M main
git push -u origin main
```

ไฟล์ลับ (`.env`) และไฟล์แนบผู้ใช้ (`public/uploads/`) ถูกกันไม่ให้ขึ้น GitHub โดยอัตโนมัติแล้ว

---

## ขั้นที่ 3 — Deploy ตัวเว็บ

### ทางเลือก A: Vercel (ง่ายสุด ฟรี)

1. เข้า https://vercel.com → **Add New → Project** → เลือก repo `datacube-tracker` จาก GitHub
2. ในหน้า Configure ใส่ **Environment Variables** 3 ตัว:
   - `DATABASE_URL` (ค่า pooler port 6543 พร้อม `?pgbouncer=true&connection_limit=1`)
   - `DIRECT_URL` (ค่า direct port 5432)
   - `AUTH_SECRET` (ข้อความสุ่มเดียวกับใน .env)
3. กด **Deploy** — เสร็จแล้วได้ URL เช่น `https://datacube-tracker.vercel.app` แชร์ให้ทีมใช้ได้ทันที
4. อัปเดตระบบครั้งถัดไป: แค่ `git push` — Vercel deploy ให้อัตโนมัติ

> **ข้อจำกัดบน Vercel:** ไฟล์ที่ผู้ใช้อัปโหลด (ไฟล์แนบใน ticket) จะ**หายเมื่อ deploy ใหม่** เพราะ Vercel ไม่มี disk ถาวร — ฟีเจอร์ลิงก์ใช้ได้ปกติ ถ้าต้องการเก็บไฟล์ถาวรให้ใช้ทางเลือก B หรือให้ต่อ Supabase Storage เพิ่มภายหลัง

### ทางเลือก B: Server ของบริษัท (ไฟล์แนบเก็บถาวร)

บนเครื่อง server (ต้องมี Node.js 18+):

```bash
git clone https://github.com/USERNAME/datacube-tracker.git
cd datacube-tracker
# สร้างไฟล์ .env แล้วเติมค่า Supabase + AUTH_SECRET เหมือนขั้นที่ 1
npm install
npm run build
npm start          # เปิดที่ http://SERVER-IP:3000
```

แนะนำใช้ [PM2](https://pm2.keymetrics.io) ให้ระบบรันค้างและ restart เองเมื่อ server รีบูต:

```bash
npm install -g pm2
pm2 start npm --name datacube -- start
pm2 save && pm2 startup
```

---

## สรุปคำสั่งที่ใช้บ่อยหลัง deploy

| ทำอะไร | คำสั่ง |
|---|---|
| แก้โค้ดแล้วอัปเดต production (Vercel) | `git add . && git commit -m "..." && git push` |
| แก้ schema ฐานข้อมูล | `npx prisma db push` (รันจากเครื่องไหนก็ได้ที่มี .env) |
| ดู/แก้ข้อมูลใน Supabase | Supabase Dashboard → Table Editor หรือ `npm run db:studio` |
| เพิ่มผู้ใช้ | หน้า "ทีมงาน" ในระบบ (คนใหม่ถูกบังคับตั้งรหัสผ่านเองตอน login ครั้งแรก) |
