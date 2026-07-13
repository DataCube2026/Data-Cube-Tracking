# คู่มือติดตั้ง Vercel (ตัวรันเว็บจริง) — ละเอียดทุกคลิก

> Vercel คือเครื่องที่รันเว็บให้ทีมเข้าใช้ผ่านเน็ต (ฟรี) — ดึงโค้ดจาก GitHub อัตโนมัติ
> ทำครั้งเดียว หลังจากนั้นแค่อัปโหลดโค้ดใหม่ขึ้น GitHub ระบบจะ deploy เองตลอด

---

## ส่วนที่ 1: สร้างโปรเจกต์ (ถ้ายังไม่เคยทำ — ถ้าทำแล้วข้ามไปส่วนที่ 2)

1. เข้า **https://vercel.com** → กด **Sign Up / Log in** → เลือก **Continue with GitHub**
2. หน้า Dashboard กดปุ่ม **Add New...** (มุมขวาบน) → เลือก **Project**
3. จะเห็นรายชื่อ repo จาก GitHub → หา **Data-Cube-Tracking** → กด **Import**
   - ถ้าไม่เห็น repo: กด **Adjust GitHub App Permissions** → อนุญาตให้เข้าถึง repo นั้น
4. หน้า Configure Project: **อย่าเพิ่งกด Deploy** — ทำส่วนที่ 2 ก่อน

## ส่วนที่ 2: ใส่ Environment Variables (หัวใจสำคัญ — พลาดตรงนี้เว็บจะขึ้น Application error)

> ถ้าโปรเจกต์ถูกสร้างไปแล้ว: เข้าโปรเจกต์ → แท็บ **Settings** → เมนูซ้าย **Environment Variables**
> ถ้ากำลังสร้างใหม่: กางหัวข้อ **Environment Variables** ในหน้า Configure ได้เลย

ใส่ทีละตัว ทั้งหมด 3 ตัว:

**ตัวที่ 1**
- ช่อง **Key** พิมพ์: `DATABASE_URL`
- ช่อง **Value** วาง: ค่าจากไฟล์ `.env` บรรทัด DATABASE_URL
  - ⚠️ **ไม่ต้องใส่เครื่องหมายคำพูด `"` หัวท้าย** — เอาเฉพาะข้อความข้างใน เริ่มที่ `postgresql://...` จบที่ `...pgbouncer=true`
- Environment: ติ๊กครบทั้ง Production / Preview / Development (ค่าเริ่มต้นติ๊กครบอยู่แล้ว)
- กด **Save** (หรือ Add)

**ตัวที่ 2**
- Key: `DIRECT_URL`
- Value: ค่าจากบรรทัด DIRECT_URL (ไม่เอาเครื่องหมายคำพูดเช่นกัน) — สังเกตต้องเป็น **port 5432**
- กด **Save**

**ตัวที่ 3**
- Key: `AUTH_SECRET`
- Value: ค่าจากบรรทัด AUTH_SECRET (ข้อความสุ่มยาว 64 ตัว ไม่เอาเครื่องหมายคำพูด)
- กด **Save**

**เช็คผล:** ในหน้า Environment Variables ต้องเห็น 3 แถวเรียงกัน:
```
DATABASE_URL    ●●●●●●●●    All Environments
DIRECT_URL      ●●●●●●●●    All Environments
AUTH_SECRET     ●●●●●●●●    All Environments
```

## ส่วนที่ 3: Deploy / Redeploy

**กรณีสร้างโปรเจกต์ใหม่:** กดปุ่ม **Deploy** ได้เลย

**กรณีโปรเจกต์มีอยู่แล้ว (แก้ env ทีหลัง):** ต้อง build ใหม่ค่าถึงจะมีผล
1. แท็บ **Deployments**
2. แถวบนสุด (ล่าสุด) → กดปุ่ม **⋯** ท้ายแถว
3. เลือก **Redeploy** → กดยืนยัน **Redeploy** อีกครั้งใน popup
4. รอสถานะเปลี่ยนเป็น **Ready** (ประมาณ 1–2 นาที)

## ส่วนที่ 4: ทดสอบ

1. กดปุ่ม **Visit** หรือเปิด https://data-cube-tracking.vercel.app
2. ต้องเห็นหน้า login DATACUBE Tracker (พื้นเทา โลโก้แดง)
3. Login:
   - `amm` → ใช้รหัสที่คุณตั้งใหม่ตอนเข้าครั้งแรก (ฐานข้อมูลเดียวกับในเครื่อง)
   - `eak` → `datacube123` (จะถูกให้ตั้งรหัสใหม่ทันที)
4. ลองสร้างงาน 1 รายการ → เปิด Supabase → Table Editor → ตาราง Ticket ต้องมีแถวเพิ่ม = ครบวงจรจริง

## ถ้ายังขึ้น "Application error"

1. เช็คว่า **Redeploy หลังใส่ env แล้วจริง ๆ** (ใส่ env เฉย ๆ ไม่พอ ต้อง build ใหม่)
2. เช็คค่า env ทีละตัว — จุดพลาดบ่อย:
   - มีเครื่องหมายคำพูด `"` ติดมา
   - `DATABASE_URL` ไม่มี `?pgbouncer=true` ต่อท้าย
   - copy มาไม่ครบบรรทัด / มีเว้นวรรคหัวท้าย
3. ดูสาเหตุจริง: เมนู **Logs** (แถบซ้าย) → เปิดหน้าเว็บให้ error 1 ครั้ง → คลิกบรรทัดสีแดง → อ่านข้อความ error
   - `Environment variable not found: DATABASE_URL` = env ไม่ครบ/ยังไม่ redeploy
   - `Can't reach database server` = ค่า URL ผิด หรือ Supabase โปรเจกต์ถูก pause (เข้า supabase.com กด Restore)
   - `Authentication failed` = รหัสผ่านใน URL ผิด

## การอัปเดตระบบครั้งถัดไป

แก้โค้ดเสร็จ → อัปโหลดขึ้น GitHub (git push หรือลากวางทับ) → Vercel deploy ให้เองอัตโนมัติ ไม่ต้องแตะ Vercel อีก
