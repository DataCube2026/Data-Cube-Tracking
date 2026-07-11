import { statusOf, priorityOf } from "@/lib/constants";

// ป้ายสีทึบเต็มช่องสไตล์ monday.com
export function StatusBadge({
  status,
  block = false,
}: {
  status: string;
  block?: boolean;
}) {
  const s = statusOf(status);
  return (
    <span
      className={`inline-flex items-center justify-center rounded px-3 py-1 text-xs font-medium text-white ${
        block ? "w-full min-w-32 py-1.5" : ""
      }`}
      style={{ backgroundColor: s.color }}
    >
      {s.label}
    </span>
  );
}

export function PriorityBadge({
  priority,
  block = false,
}: {
  priority: string;
  block?: boolean;
}) {
  const p = priorityOf(priority);
  return (
    <span
      className={`inline-flex items-center justify-center rounded px-3 py-1 text-xs font-medium text-white ${
        block ? "w-full min-w-24 py-1.5" : ""
      }`}
      style={{ backgroundColor: p.color }}
    >
      {p.label}
    </span>
  );
}

export function Avatar({ name }: { name?: string | null }) {
  if (!name)
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-slate-300 text-xs text-slate-400">
        ?
      </span>
    );
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
      {name.charAt(0)}
    </span>
  );
}
