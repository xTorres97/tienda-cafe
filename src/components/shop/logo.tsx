import Link from "next/link";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={className} aria-label="Sombra de Bucare, inicio">
      <span className="flex items-center gap-2.5">
        <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
          <circle cx="16" cy="16" r="15" fill="#15302a" />
          <path d="M5 22 L12 13 L16 18 L20 11 L27 22 Z" fill="#f2f5f1" />
          <circle cx="22.5" cy="8.5" r="2.4" fill="#d9482b" />
        </svg>
        <span className="font-display text-xl leading-none tracking-tight">Sombra de Bucare</span>
      </span>
    </Link>
  );
}
