/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // เวลาที่ build เวอร์ชันนี้ — แสดงมุมขวาล่างของระบบ ใช้เช็คว่า deploy เวอร์ชันใหม่แล้วหรือยัง
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
