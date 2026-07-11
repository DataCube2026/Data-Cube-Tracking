# คู่มือติดตั้ง GitHub (เก็บซอร์สโค้ด) — ทีละขั้น

> GitHub คือที่เก็บโค้ดของโปรเจกต์ ใช้เป็นตัวกลางไป deploy บน Vercel และสำรองโค้ดไว้ในตัว

---

## 1. เตรียมเครื่อง (ครั้งเดียว)

1. ติดตั้ง **Git**: ดาวน์โหลดจาก https://git-scm.com/download/win → ติดตั้งแบบกด Next ทั้งหมด
2. เปิดเทอร์มินัลใหม่ แล้วตั้งชื่อ/อีเมลประจำเครื่อง:
   ```
   git config --global user.name "Amm"
   git config --global user.email "nalatikan.a@gmail.com"
   ```
3. สมัครบัญชีที่ https://github.com (ถ้ายังไม่มี)

## 2. สร้าง Repository บน GitHub

1. เข้า **https://github.com/new**
2. กรอก:
   - **Repository name:** `datacube-tracker`
   - **Visibility:** เลือก **Private** (สำคัญ — โค้ดภายในบริษัท)
   - **ไม่ต้องติ๊ก** Add README / .gitignore / license (โปรเจกต์มีอยู่แล้ว)
3. กด **Create repository** — จะได้หน้าที่มี URL เช่น
   `https://github.com/ชื่อคุณ/datacube-tracker.git`

## 3. Push โค้ดขึ้นครั้งแรก

เปิดเทอร์มินัลในโฟลเดอร์ `datacube-tracker` แล้วรันทีละบรรทัด:

```
git init
git add .
git commit -m "DataCube Tracker v1"
git remote add origin https://github.com/ชื่อคุณ/datacube-tracker.git
git branch -M main
git push -u origin main
```

- ตอน push ครั้งแรก จะมีหน้าต่างให้ login GitHub → กด **Sign in with your browser**
- ไฟล์ลับถูกกันไว้อัตโนมัติแล้ว: `.env` (รหัสฐานข้อมูล), `public/uploads/` (ไฟล์แนบ), `node_modules/`

เช็คผล: รีเฟรชหน้า repo บน GitHub — ต้องเห็นไฟล์โค้ดทั้งหมด แต่**ต้องไม่เห็นไฟล์ `.env`**

## 4. การอัปเดตโค้ดครั้งถัดไป

ทุกครั้งที่แก้โค้ดเสร็จ:

```
git add .
git commit -m "อธิบายสั้นๆ ว่าแก้อะไร"
git push
```

(ถ้าเชื่อม Vercel ไว้ ระบบจะ deploy เวอร์ชันใหม่ให้อัตโนมัติทุกครั้งที่ push)

## 5. ให้เพื่อนร่วมทีมเข้าถึงโค้ด (ถ้าต้องการ)

หน้า repo → **Settings → Collaborators → Add people** → ใส่ username GitHub ของทีม

---

## ปัญหาที่เจอบ่อย

- **`git` is not recognized** → ยังไม่ได้ติดตั้ง Git หรือยังไม่ได้เปิดเทอร์มินัลใหม่หลังติดตั้ง
- **remote origin already exists** → เคย add แล้ว ใช้ `git remote set-url origin URL-ใหม่` แทน
- **Permission denied / 403** → login ผิดบัญชี — รัน `git credential-manager github logout` แล้ว push ใหม่
- **push แล้วมีไฟล์ .env หลุดขึ้นไป** → ลบ repo แล้วสร้างใหม่ + เปลี่ยนรหัสฐานข้อมูลทันที (Supabase → Reset database password)

---

ขั้นถัดไป (deploy ให้ทีมใช้ผ่านเน็ต): ดู **DEPLOY.md ขั้นที่ 3** — เชื่อม Vercel กับ repo นี้
