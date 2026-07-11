// กราฟ SVG แบบไม่ต้องพึ่ง library ภายนอก (render ฝั่ง server)

export function LineChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const W = 600;
  const H = 210;
  const P = 30;
  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? (W - P * 2) / (data.length - 1) : 0;
  const pts = data.map(
    (d, i) =>
      [P + i * stepX, H - P - (d.value / max) * (H - P * 2)] as [number, number]
  );
  const line = pts.map((p) => p.join(",")).join(" ");
  const area =
    data.length > 1
      ? `${P},${H - P} ${line} ${P + (data.length - 1) * stepX},${H - P}`
      : "";
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line
            x1={P}
            x2={W - P}
            y1={H - P - f * (H - P * 2)}
            y2={H - P - f * (H - P * 2)}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
          <text
            x={P - 6}
            y={H - P - f * (H - P * 2) + 4}
            fontSize={10}
            fill="#94a3b8"
            textAnchor="end"
          >
            {Math.round(f * max)}
          </text>
        </g>
      ))}
      {area && <polygon points={area} fill="#d21f2a" fillOpacity={0.08} />}
      <polyline points={line} fill="none" stroke="#d21f2a" strokeWidth={2} />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r={2.5} fill="#d21f2a" />
          {i % labelEvery === 0 && (
            <text
              x={p[0]}
              y={H - P + 14}
              fontSize={10}
              fill="#94a3b8"
              textAnchor="middle"
            >
              {data[i].label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function DonutChart({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const total = data.reduce((a, b) => a + b.value, 0);
  const r = 54;
  const C = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0">
        <circle cx={70} cy={70} r={r} fill="none" stroke="#f1f5f9" strokeWidth={22} />
        {total > 0 &&
          data.map((d, i) => {
            const frac = d.value / total;
            const el = (
              <circle
                key={i}
                cx={70}
                cy={70}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={22}
                strokeDasharray={`${frac * C} ${C}`}
                strokeDashoffset={-acc * C}
                transform="rotate(-90 70 70)"
              />
            );
            acc += frac;
            return el;
          })}
        <text x={70} y={66} textAnchor="middle" fontSize={20} fontWeight={600} fill="#0f172a">
          {total}
        </text>
        <text x={70} y={82} textAnchor="middle" fontSize={10} fill="#94a3b8">
          งาน
        </text>
      </svg>
      <div className="min-w-40 flex-1 space-y-1.5 text-sm">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-slate-600">{d.label}</span>
            <span className="ml-auto pl-4 text-xs text-slate-400">
              {d.value} ({total ? Math.round((d.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
        {data.length === 0 && (
          <span className="text-sm text-slate-400">ยังไม่มีข้อมูล</span>
        )}
      </div>
    </div>
  );
}
