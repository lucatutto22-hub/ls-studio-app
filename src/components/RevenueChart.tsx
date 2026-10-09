import { eur } from "@/lib/format";

// Histogramme du CA encaissé par mois. Le mois en cours est en pointillés.
export function RevenueChart({ months }: { months: { label: string; value: number; current: boolean }[] }) {
  const W = 640, H = 240, L = 52, R = 8, T = 16, B = 28;
  const top = Math.max(...months.map((m) => m.value), 1);
  const step = niceStep(top / 4);
  const max = Math.ceil(top / step) * step;
  const ih = H - T - B;
  const bw = (W - L - R) / months.length;
  const y = (v: number) => T + ih - (v / max) * ih;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const best = months.reduce((a, m, i) => (m.value > months[a].value ? i : a), 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Chiffre d'affaires encaissé par mois">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end">{v >= 1000 ? `${v / 1000} k€` : `${v} €`}</text>
        </g>
      ))}
      {months.map((m, i) => {
        const x = L + i * bw + bw * 0.18, w = bw * 0.64;
        return (
          <g key={i}>
            <rect
              x={x} y={y(m.value)} width={w} height={Math.max(0, T + ih - y(m.value))} rx={3}
              fill={m.current ? "var(--accent-soft)" : "var(--accent)"}
              stroke={m.current ? "var(--accent)" : "none"} strokeDasharray={m.current ? "3 3" : undefined}
            >
              <title>{`${m.label} : ${eur(m.value)}`}</title>
            </rect>
            <text x={x + w / 2} y={H - 8} textAnchor="middle">{m.label}</text>
            {i === best && m.value > 0 && (
              <text x={x + w / 2} y={y(m.value) - 6} textAnchor="middle" style={{ fill: "var(--ink)", fontWeight: 600 }}>
                {eur(m.value)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function niceStep(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}
