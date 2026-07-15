# คู่มือเชื่อม Google Drive (เก็บไฟล์แนบใน Drive ทีม)

> ตั้งค่าแล้ว: ไฟล์ที่แนบผ่านระบบจะถูกอัปเข้า Google Drive อัตโนมัติ
> แยกเป็น**โฟลเดอร์ย่อยตามเลขงาน** เช่น `DataCube-Attachments/TCUBE-004/รายงาน.xlsx`
> ระบบเก็บลิงก์ไว้ให้ เวลาเปิดจะดึงจาก Drive ตรง — ไม่กินพื้นที่ Supabase เลย
> (ไม่ตั้งค่าก็ได้ — ระบบจะเก็บบน Supabase Storage ตามเดิม)

---

## ขั้นที่ 1: สร้าง Service Account (บัญชีหุ่นยนต์ของระบบ)

1. เข้า **https://console.cloud.google.com** → login ด้วย Google บัญชีทีม
2. แถบบนสุด กด **Select a project → New Project** → ตั้งชื่อ `datacube-tracker` → Create
3. ช่องค้นหาด้านบน พิมพ์ **Google Drive API** → เลือก → กด **Enable**
4. เมนูซ้าย **APIs & Services → Credentials** → **+ Create Credentials → Service account**
5. ตั้งชื่อ `datacube-uploader` → Create and Continue → (ข้าม role ได้) → Done
6. คลิกที่ service account ที่เพิ่งสร้าง → แท็บ **Keys** → **Add Key → Create new key → JSON** → Create
   - ไฟล์ `.json` จะถูกดาวน์โหลด — **เก็บไว้ดี ๆ ห้ามแชร์**

## ขั้นที่ 2: สร้างโฟลเดอร์หลักใน Drive แล้วแชร์ให้ระบบ

1. เข้า **drive.google.com** → สร้างโฟลเดอร์ใหม่ชื่อ `DataCube-Attachments`
2. คลิกขวาโฟลเดอร์ → **Share** → วางอีเมลของ service account
   (ดูจากไฟล์ .json ช่อง `client_email` เช่น `datacube-uploader@....iam.gserviceaccount.com`)
   → สิทธิ์ **Editor** → Send
3. เปิดโฟลเดอร์ แล้วคัดลอก **ID จาก URL**: ส่วนท้ายของ
   `https://drive.google.com/drive/folders/`**`1AbCdEfGh...`** ← ก้อนนี้คือ Folder ID

## ขั้นที่ 3: ใส่ค่าใน .env (และ Vercel)

เปิดไฟล์ `.json` ที่ดาวน์โหลดมา แล้วคัดลอก 2 ค่า มาใส่ `.env`:

```
GDRIVE_CLIENT_EMAIL="datacube-uploader@xxxx.iam.gserviceaccount.com"
GDRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...ทั้งก้อน...\n-----END PRIVATE KEY-----\n"
GDRIVE_ROOT_FOLDER_ID="1AbCdEfGh..."
```

**ข้อควรระวัง `GDRIVE_PRIVATE_KEY`:** คัดลอกค่า `private_key` จากไฟล์ .json มาทั้งก้อน
(มันจะมี `\n` อยู่ในข้อความอยู่แล้ว — ให้คงไว้แบบนั้น อย่าลบ)

จากนั้นใส่ **3 ตัวเดียวกันใน Vercel** → Settings → Environment Variables → แล้ว **Redeploy**

## ขั้นที่ 4: ทดสอบ

1. เปิดงานใดก็ได้ → โพสต์อัปเดตพร้อมแนบไฟล์ หรืออัปโหลดที่การ์ดไฟล์แนบ
2. เข้า Drive → โฟลเดอร์ `DataCube-Attachments` → ต้องเห็นโฟลเดอร์ย่อยชื่อเลขงาน (เช่น `TCUBE-004`) พร้อมไฟล์ข้างใน
3. คลิกชื่อไฟล์ในระบบ → เปิดผ่าน Drive ได้ทันที

## เรื่องที่ควรรู้

| เรื่อง | รายละเอียด |
|---|---|
| ขนาดไฟล์สูงสุดผ่านระบบ | ~4MB ต่อไฟล์ (เพดานของ Vercel) — ไฟล์ใหญ่กว่านั้นอัปเข้า Drive เองแล้วใช้ "เพิ่มลิงก์" |
| พื้นที่เก็บ | นับโควต้าของ service account (ฟรี 15GB) ไม่กิน Drive ส่วนตัวของทีม |
| ลบไฟล์แนบในระบบ | ไฟล์ใน Drive ถูกลบตามด้วยอัตโนมัติ |
| รูปโปรไฟล์ | เก็บในโฟลเดอร์ย่อย `Profile` |
| ปิดการเชื่อม | ลบ/คอมเมนต์ 3 ตัวแปร GDRIVE_* ออก — ระบบกลับไปใช้ Supabase Storage เอง |
