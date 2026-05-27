import Link from "next/link";
import { Coins } from "lucide-react";
import {
  Home,
  Upload,
  FileSpreadsheet,
  SearchCheck,
  WalletCards,
  BarChart3,
  Settings,
  Building2,
} from "lucide-react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const menu = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/archivo-banco/importar", label: "Importar Archivo Banco", icon: Upload },
    { href: "/apartamento-banco-alias/importar", label: "Importar Alias Apartamentos", icon: FileSpreadsheet },
    { href: "/archivo-banco/identificar", label: "Identificar Pagos", icon: SearchCheck },
    { href: "/pagos-identificados", label: "Pagos Identificados", icon: WalletCards },
    { href: "/reportes", label: "Reportes", icon: BarChart3 },
    { href: "/configuracion", label: "Configuración", icon: Settings },
    { href: "/caja-chica", label: "Caja Chica", icon: Coins },
    { href: "/caja-chica/reporte", label: "Reporte Caja Chica", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-72 bg-slate-950 text-white p-5 hidden md:flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-2xl bg-amber-500 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-slate-950" />
          </div>

          <div>
            <h1 className="font-bold text-lg leading-tight">VAM / SOTECDOM</h1>
            <p className="text-xs text-slate-300">Sistema de pagos bancarios</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          {menu.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-slate-200 hover:bg-slate-800"
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="rounded-2xl bg-slate-900 p-4 border border-slate-800">
          <p className="text-xs text-slate-400">Condominios activos</p>
          <p className="text-lg font-bold mt-1">Lote 9 y Lote 11</p>
          <p className="text-xs text-slate-400 mt-2">104 apartamentos registrados</p>
        </div>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}