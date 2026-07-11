// ไอคอน SVG แบบเส้น (stroke) โทนเดียวกันทั้งระบบ
type P = { size?: number; className?: string };

function base(size?: number) {
  return {
    width: size ?? 16,
    height: size ?? 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

export function IconDashboard({ size, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

export function IconTable({ size, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 10v10" />
    </svg>
  );
}

export function IconBoard({ size, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="10" rx="1.5" />
      <rect x="17" y="4" width="4" height="13" rx="1.5" />
    </svg>
  );
}

export function IconPlus({ size, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconUsers({ size, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M17.5 15.5c2.2.6 3.5 2.2 3.5 4.5" />
    </svg>
  );
}

export function IconSearch({ size, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function IconChat({ size, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z" />
    </svg>
  );
}

export function IconWarning({ size, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 10v4M12 17.5v.5" />
    </svg>
  );
}

export function IconLogout({ size, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  );
}

export function IconBell({ size, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 15 18 9Z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </svg>
  );
}

export function IconHistory({ size, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function IconUser({ size, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1-3.5 4-5.5 7.5-5.5s6.5 2 7.5 5.5" />
    </svg>
  );
}

export function IconPaperclip({ size, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m21 11.5-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8l8.5-8.5a3.7 3.7 0 0 1 5.2 5.2l-8.5 8.5a1.8 1.8 0 0 1-2.6-2.6l7.8-7.8" />
    </svg>
  );
}

export function IconLink({ size, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </svg>
  );
}

export function IconDownload({ size, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 21h16" />
    </svg>
  );
}

export function IconChevronLeft({ size, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m14 6-6 6 6 6" />
    </svg>
  );
}

export function IconChevronRight({ size, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m10 6 6 6-6 6" />
    </svg>
  );
}
