"use client";
import AuthGuard from "./AuthGuard";
import Link from "next/link";
import { Users } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Home,
  Upload,
  FileSpreadsheet,
  SearchCheck,
  WalletCards,
  BarChart3,
  Settings,
  Building2,
  Coins,
  LogOut,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const menu = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    {
      href: "/archivo-banco/importar",
      label: "Importar Archivo Banco",
      icon: Upload,
    },
    {
      href: "/apartamento-banco-alias/importar",
      label: "Importar Alias Apartamentos",
      icon: FileSpreadsheet,
    },
    {
      href: "/archivo-banco/identificar",
      label: "Identificar Pagos",
      icon: SearchCheck,
    },
    {
      href: "/pagos-identificados",
      label: "Pagos Identificados",
      icon: WalletCards,
    },
    { href: "/caja-chica", label: "Caja Chica", icon: Coins },
    { href: "/propietarios", label: "Propietarios", icon: Users },
    { href: "/catalogos/proveedores", label: "Proveedores", icon: Users },
    { href: "/catalogos/categorias-gastos", label: "Categorías Gastos", icon: BarChart3 },
    { href: "/caja-chica/reporte", label: "Reporte Caja Chica", icon: BarChart3 },
    { href: "/caja-chica/fondos", label: "Fondos Caja Chica", icon: Coins },
    { href: "/caja-chica/balance", label: "Balance Caja Chica", icon: BarChart3 },
    { href: "/reportes", label: "Reportes", icon: BarChart3 },
    { href: "/configuracion", label: "Configuración", icon: Settings },
  ];

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-72 bg-slate-950 text-white p-5 hidden md:flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-2xl bg-amber-500 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-slate-950" />
          </div>

          <div>
            <h1 className="font-bold text-lg leading-tight">VAM / SOTECDOM</h1>
            <p className="text-xs text-slate-300">Sistema administrativo</p>
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

        <button
          onClick={cerrarSesion}
          className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-red-200 hover:bg-red-900/40"
        >
          <LogOut className="h-5 w-5" />
          Cerrar sesión
        </button>
      </aside>
     <main className="flex-1 p-6">
        <AuthGuard>{children}</AuthGuard>
      </main>
    </div>
  );
}