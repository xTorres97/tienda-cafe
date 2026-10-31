import type { BagPalette } from "@/db/schema";

/** Generador pseudoaleatorio determinista: la misma bolsa siempre se dibuja igual. */
function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Curvas de nivel alrededor de una cima: más altitud, más anillos. */
function contours(seed: string, altitude: number, cx: number, cy: number) {
  const rand = rng(seed);
  const rings = Math.max(4, Math.round(altitude / 220));
  const harmonics = Array.from({ length: 4 }, (_, k) => ({ k: k + 2, a: 0.04 + rand() * 0.09, p: rand() * Math.PI * 2 }));
  const paths: string[] = [];
  for (let r = 1; r <= rings; r++) {
    const base = 9 + r * 11;
    const pts: string[] = [];
    for (let i = 0; i <= 72; i++) {
      const th = (i / 72) * Math.PI * 2;
      let m = 1;
      for (const h of harmonics) m += h.a * Math.sin(h.k * th + h.p + r * 0.35);
      const rad = base * m;
      pts.push(`${(cx + Math.cos(th) * rad * 1.15).toFixed(1)},${(cy + Math.sin(th) * rad * 0.85).toFixed(1)}`);
    }
    paths.push(`M${pts.join("L")}Z`);
  }
  return paths;
}

export function BagArt({ slug, name, region, altitude, palette, className, title = true }: {
  slug: string; name: string; region: string; altitude: number; palette: BagPalette; className?: string; title?: boolean;
}) {
  const rand = rng(slug + "peak");
  const cx = 70 + rand() * 60;
  const cy = 112 + rand() * 30;
  const lines = contours(slug, altitude, cx, cy);
  const clip = `clip-${slug}`;
  const alt = altitude.toLocaleString("es-VE");

  return (
    <svg viewBox="0 0 200 260" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title ? `Bolsa de café ${name}, ${region}` : undefined}>
      <defs>
        <clipPath id={clip}>
          <path d="M28 34 L172 34 L180 246 Q180 252 174 252 L26 252 Q20 252 20 246 Z" />
        </clipPath>
      </defs>
      {/* sombra */}
      <ellipse cx="100" cy="254" rx="78" ry="5" fill="#15302a" opacity=".12" />
      {/* cuerpo */}
      <path d="M28 34 L172 34 L180 246 Q180 252 174 252 L26 252 Q20 252 20 246 Z" fill={palette.paper} />
      <g clipPath={`url(#${clip})`}>
        {lines.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={palette.ink} strokeOpacity={0.14 + (i / lines.length) * 0.22} strokeWidth={i === lines.length - 1 ? 1.4 : 0.9} />
        ))}
        <circle cx={cx} cy={cy} r="2.6" fill={palette.accent} />
        {/* pliegues laterales */}
        <path d="M34 34 L30 252" stroke={palette.ink} strokeOpacity=".12" strokeWidth="5" />
        <path d="M166 34 L170 252" stroke={palette.ink} strokeOpacity=".12" strokeWidth="5" />
      </g>
      {/* cierre dentado */}
      <path d="M26 20 L174 20 L174 34 L26 34 Z" fill={palette.paper} />
      <path d="M26 20 L174 20 L174 34 L26 34 Z" fill={palette.ink} opacity=".1" />
      <path d={`M26 20 ${Array.from({ length: 19 }, (_, i) => `L${26 + (i + 0.5) * 7.8} ${i % 2 ? 20 : 16}`).join(" ")} L174 20`} fill={palette.paper} />
      <rect x="40" y="25" width="120" height="3" rx="1.5" fill={palette.ink} opacity=".18" />
      {/* etiqueta */}
      <text x="100" y="196" textAnchor="middle" fill={palette.ink} style={{ fontFamily: "var(--font-display)", fontSize: Math.min(17, 200 / name.length) }}>{name}</text>
      <text x="100" y="214" textAnchor="middle" fill={palette.ink} opacity=".75" style={{ fontFamily: "var(--font-sans)", fontSize: 8.5, letterSpacing: ".08em" }}>
        {region.toUpperCase()} · {alt} MSNM
      </text>
      <text x="100" y="236" textAnchor="middle" fill={palette.accent} style={{ fontFamily: "var(--font-sans)", fontSize: 7, fontWeight: 700, letterSpacing: ".16em" }}>
        SOMBRA DE BUCARE
      </text>
    </svg>
  );
}
