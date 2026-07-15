export type Option = { value: string; label: string; color: string };

// ชุดสีสไตล์ monday.com
export const STATUSES: Option[] = [
  { value: "NEW", label: "งานใหม่", color: "#579bfc" },
  { value: "ASSIGNED", label: "มอบหมายแล้ว", color: "#a25ddc" },
  { value: "IN_PROGRESS", label: "กำลังดำเนินการ", color: "#fdab3d" },
  { value: "REVIEW", label: "รอตรวจสอบ", color: "#ff5ac4" },
  { value: "DONE", label: "เสร็จสิ้น", color: "#00c875" },
];

export const PRIORITIES: Option[] = [
  { value: "LOW", label: "ต่ำ", color: "#797e93" },
  { value: "MEDIUM", label: "ปานกลาง", color: "#579bfc" },
  { value: "HIGH", label: "สูง", color: "#fdab3d" },
  { value: "URGENT", label: "ด่วนมาก", color: "#e2445c" },
];

export const JOB_TYPES = [
  "Dashboard",
  "Report",
  "Data Pipeline / ETL",
  "Data Cleansing",
  "Database",
  "API / Integration",
  "Training / อบรม",
  "อื่น ๆ",
];

// กลุ่ม BU ลูกค้า
export const BUSINESS_UNITS = [
  "Jaymart Mobile (JMB)",
  "JElite (JPoint)",
  "Brewing Happiness (BH)",
  "JAS Asset (JAS)",
  "SG Capital (SGC)",
  "Rawmat Coffee (RMC)",
  "CEO Business (Gen II)",
  "Jaymart Holding (JMH)",
];

// ดึงตัวย่อในวงเล็บ เช่น "Jaymart Mobile (JMB)" -> "JMB"
export function buShort(bu: string): string {
  const m = bu.match(/\(([^)]+)\)/);
  return m ? m[1] : bu;
}

export const CHANNELS = [
  "LINE",
  "Email",
  "โทรศัพท์",
  "ประชุม / Onsite",
  "Facebook",
  "เว็บไซต์",
  "อื่น ๆ",
];

export function statusOf(value: string): Option {
  return STATUSES.find((s) => s.value === value) ?? STATUSES[0];
}

export function priorityOf(value: string): Option {
  return PRIORITIES.find((p) => p.value === value) ?? PRIORITIES[1];
}

export function ticketCode(n: number): string {
  return `TCUBE-${String(n).padStart(3, "0")}`;
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function fmtDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// SLA: เหลือเวลาอีกเท่าไหร่ก่อนถึงกำหนดส่ง
export function slaInfo(
  dueDate: Date | string | null,
  status: string
): { label: string; tone: "ok" | "warn" | "over" } | null {
  if (!dueDate || status === "DONE") return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { label: `เกินกำหนด ${-days} วัน`, tone: "over" };
  if (days === 0) return { label: "ครบกำหนดวันนี้", tone: "warn" };
  if (days <= 2) return { label: `เหลือ ${days} วัน`, tone: "warn" };
  return { label: `เหลือ ${days} วัน`, tone: "ok" };
}

export function isOverdue(dueDate: Date | null, status: string): boolean {
  if (!dueDate || status === "DONE") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate) < today;
}
