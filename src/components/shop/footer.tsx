import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 bg-forest text-mist">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[2fr_1fr_1fr] md:px-6">
        <div className="max-w-sm">
          <p className="font-display text-2xl">Sombra de Bucare</p>
          <p className="mt-3 text-sm leading-relaxed text-mist/70">
            Tienda de demostración hecha para un portafolio. Los cafés, fincas y productores son ficticios; las regiones cafetaleras sí existen.
            Los pagos son simulados: no se cobra dinero real.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Tienda</p>
          <ul className="mt-3 space-y-2 text-mist/75">
            <li><Link className="hover:text-white" href="/tienda">Todos los cafés</Link></li>
            <li><Link className="hover:text-white" href="/tienda?tueste=claro">Tueste claro</Link></li>
            <li><Link className="hover:text-white" href="/tienda?tueste=oscuro">Tueste oscuro</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Proyecto</p>
          <ul className="mt-3 space-y-2 text-mist/75">
            <li><Link className="hover:text-white" href="/admin">Panel de administración</Link></li>
            <li><a className="hover:text-white" href="https://github.com/xTorres97/tienda-cafe" target="_blank" rel="noreferrer">Código en GitHub</a></li>
            <li><a className="hover:text-white" href="https://github.com/xTorres97" target="_blank" rel="noreferrer">Hecho por Jose Torres</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
