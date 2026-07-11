export function Logo({ size = 32 }: { size?: number }) {
  // โลโก้ลูกบาศก์สีแดงสไตล์ DataCube (SVG)
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <g>
        {/* top face */}
        <path d="M32 6 L54 18 L32 30 L10 18 Z" fill="#e54848" />
        {/* left face */}
        <path d="M10 18 L32 30 L32 54 L10 42 Z" fill="#b0141f" />
        {/* right face */}
        <path d="M54 18 L32 30 L32 54 L54 42 Z" fill="#d21f2a" />
        {/* floating cubes */}
        <rect x="50" y="4" width="7" height="7" rx="1" fill="#d21f2a" />
        <rect x="58" y="14" width="5" height="5" rx="1" fill="#e54848" />
        <rect x="55" y="24" width="4" height="4" rx="1" fill="#f07676" />
      </g>
    </svg>
  );
}
