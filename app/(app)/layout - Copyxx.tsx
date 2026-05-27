import CondominioSelector from "../components/CondominioSelector";
import Link from "next/link";

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
    >
      {label}
    </Link>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-slate-800 text-white p-4 flex flex-col">
        <div className="rounded-2xl bg-slate-900 p-4">
          <div className="text-sm text-slate-300">Administradora</div>
          <div className="text-lg font-semibold">SOTECDOM</div>
        </div>
	<div className="mt-3">
  	<CondominioSelector />
	</div>

        <nav className="mt-4 space-y-1">
          <NavItem href="/dashboard" label="Dashboard" />
          <NavItem href="/unidades" label="Unidades" />
          <NavItem href="/cargos" label="Cargos & Pagos" />
          <NavItem href="/gastos" label="Gastos" />
          <NavItem href="/anuncios" label="Anuncios" />
        </nav>

        <div className="mt-auto pt-4 text-xs text-slate-400">
          © {new Date().getFullYear()} SOTECDOM
        </div>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
