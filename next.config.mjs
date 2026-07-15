/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // ยอมรับไฟล์แนบได้ถึง ~4MB (เพดานของ Vercel)
      bodySizeLimit: "4mb",
    },
  },
  env: {
    // เวลาที่ build เวอร์ชันนี้ — แสดงมุมขวาล่างของระบบ ใช้เช็คว่า deploy เวอร์ชันใหม่แล้วหรือยัง
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
