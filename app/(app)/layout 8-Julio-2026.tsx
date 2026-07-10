"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Building2,
  WalletCards,
  Users,
  Calculator,
  Megaphone,
  Package,
  BarChart3,
  Settings,
  ShieldCheck,
  LogOut,
  Search,
  Bell,
  User,
  Menu,
  X,
  LayoutDashboard,
  UserCog,
  CalendarDays,
  FileText,
  Phone,
  Car,
  ClipboardList,
  Wrench,
  Boxes,
  MapPin,
  BadgeDollarSign,
  Clock,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";
import AuthGuard from "./AuthGuard";

type SesionActual = {
  empresaNombre: string;
  condominioId: string;
  condominioNombre: string;
  condominioLogoUrl: string;
  usuarioNombre: string;
  usuarioRol: string;
};

type MenuItem = {
  href: string;
  label: string;
  icon: any;
};

const submenuResidencial: MenuItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/condominios", label: "Condominios", icon: Building2 },
  { href: "/unidades", label: "Unidades", icon: Home },
  { href: "/propietarios", label: "Propietarios", icon: Users },
  { href: "/usuarios", label: "Directiva", icon: UserCog },
  { href: "/areas-sociales", label: "Áreas", icon: CalendarDays },
  { href: "/reservas-areas", label: "Reservas", icon: CalendarDays },
  { href: "/configuracion-cargos", label: "Cuotas", icon: WalletCards },
  { href: "/administracion/documentos", label: "Documentos", icon: FileText },
  { href: "/administracion/directorio", label: "Directorio", icon: Phone },
  { href: "/vehiculos", label: "Vehículos", icon: Car },
  { href: "/anuncios", label: "Anuncios", icon: Megaphone },
];

const submenuFinanciero: MenuItem[] = [
  { href: "/finanzas", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pagos-mantenimiento", label: "Mantenimiento", icon: WalletCards },
  { href: "/gastos", label: "Gastos", icon: FileText },
  { href: "/finanzas/caja-chica", label: "Caja Chica", icon: WalletCards },
  { href: "/banco", label: "Banco", icon: Building2 },
  { href: "/solicitudes-pago", label: "Solicitudes", icon: FileText },
  { href: "/finanzas/configuraciones/presupuesto", label: "Presupuesto", icon: BarChart3 },
  { href: "/finanzas/control-bancario", label: "Control Bancario", icon: BarChart3 },
];

const submenuInventario: MenuItem[] = [
  { href: "/administracion/inventario", label: "Dashboard", icon: LayoutDashboard },
  { href: "/administracion/inventario/articulos", label: "Artículos", icon: Package },
  { href: "/administracion/inventario/mantenimiento", label: "Mant Preventivo", icon: Wrench },
  { href: "/administracion/inventario/movimientos", label: "Movimientos", icon: ClipboardList },
  { href: "/administracion/inventario/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/administracion/inventario/catalogos", label: "Catálogos", icon: Boxes },
];

const submenuOperativo: MenuItem[] = [
  { href: "/operaciones", label: "Dashboard", icon: LayoutDashboard },
  { href: "/incidencias", label: "Incidencias", icon: Megaphone },
  { href: "/autorizaciones", label: "Autorizaciones", icon: ShieldCheck },
  { href: "/gas", label: "Gas", icon: BadgeDollarSign },
  { href: "/checklist-visitas", label: "Checklist", icon: ClipboardList },
];

const submenuRecursosHumanos: MenuItem[] = [
  { href: "/recursos-humanos/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/recursos-humanos/personal", label: "Empleados", icon: Users },
  { href: "/recursos-humanos/nomina", label: "Nómina", icon: BadgeDollarSign },
  { href: "/recursos-humanos/vacaciones", label: "Vacaciones", icon: CalendarDays },
  { href: "/recursos-humanos/prestaciones", label: "Prestaciones", icon: FileText },
  { href: "/recursos-humanos/asistencia", label: "Asistencia", icon: Clock },
  { href: "/recursos-humanos/nomina/reportes", label: "Reportes", icon: BarChart3 },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [sesion, setSesion] = useState<SesionActual>({
    empresaNombre: "",
    condominioId: "",
    condominioNombre: "",
    condominioLogoUrl: "",
    usuarioNombre: "",
    usuarioRol: "",
  });

  const [menuMovil, setMenuMovil] = useState(false);

  useEffect(() => {
    const condominioId = localStorage.getItem("condominio_id") || "";

    if (!condominioId) {
      router.push("/login");
      return;
    }

    setSesion({
      empresaNombre: localStorage.getItem("empresa_nombre") || "VAM Enterprise",
      condominioId,
      condominioNombre: localStorage.getItem("condominio_nombre") || "",
      condominioLogoUrl: localStorage.getItem("condominio_logo_url") || "",
      usuarioNombre: localStorage.getItem("usuario_nombre") || "Usuario",
      usuarioRol: localStorage.getItem("usuario_rol") || "Sin rol",
    });
  }, [router]);

  const menuPrincipal: MenuItem[] = [
    { href: "/dashboard", label: "Inicio", icon: Home },
    { href: "/condominios", label: "Residencial", icon: Building2 },
    { href: "/finanzas", label: "Financiero", icon: WalletCards },
    { href: "/operaciones", label: "Operativo", icon: Megaphone },
    { href: "/administracion/inventario", label: "Inventario", icon: Package },
    { href: "/recursos-humanos/dashboard", label: "Capital Humano", icon: Users },
    { href: "/contabilidad/dashboard", label: "Contable", icon: Calculator },
    { href: "/reportes", label: "BI", icon: BarChart3 },
    { href: "/seguridad", label: "Seguridad", icon: ShieldCheck },
    { href: "/catalogos", label: "Config.", icon: Settings },
  ];

function esRutaResidencial(path: string) {
  return (
    path === "/dashboard" ||
    path === "/administracion" ||
    path.startsWith("/administracion/documentos") ||
    path.startsWith("/administracion/directorio") ||
    path.startsWith("/vehiculos") ||
    path.startsWith("/condominios") ||
    path.startsWith("/unidades") ||
    path.startsWith("/propietarios") ||
    path.startsWith("/usuarios") ||
    path.startsWith("/areas-sociales") ||
    path.startsWith("/reservas-areas") ||
    path.startsWith("/configuracion-cargos") ||
    path.startsWith("/anuncios")
  );
}
  function esRutaFinanciera(path: string) {
    return (
      path === "/finanzas" ||
      path.startsWith("/finanzas/") ||
      path.startsWith("/pagos-mantenimiento") ||
      path.startsWith("/gastos") ||
      path.startsWith("/banco") ||
      path.startsWith("/solicitudes-pago") ||
      path.startsWith("/presupuesto")
    );
  }

  function esRutaInventario(path: string) {
    return path.startsWith("/administracion/inventario");
  }

  function esRutaOperativa(path: string) {
    return (
      path === "/operaciones" ||
      path.startsWith("/operaciones/") ||
      path.startsWith("/incidencias") ||
      path.startsWith("/autorizaciones") ||
      path.startsWith("/gas") ||
      path.startsWith("/checklist-visitas")
    );
  }

  function esRutaRecursosHumanos(path: string) {
    return (
      path === "/recursos-humanos" ||
      path.startsWith("/recursos-humanos/")
    );
  }

  function estaActivo(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/administracion") return esRutaResidencial(pathname);
    if (href === "/finanzas") return esRutaFinanciera(pathname);
    if (href === "/operaciones") return esRutaOperativa(pathname);
    if (href === "/administracion/inventario") return esRutaInventario(pathname);
    if (href === "/recursos-humanos/dashboard") return esRutaRecursosHumanos(pathname);
    if (href === "/contabilidad/dashboard") return pathname.startsWith("/contabilidad");

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const centroActivo = useMemo(() => {
    if (esRutaInventario(pathname)) {
      return { color: "purple", submenu: submenuInventario };
    }

    if (esRutaResidencial(pathname)) {
      return { color: "blue", submenu: submenuResidencial };
    }

    if (esRutaFinanciera(pathname)) {
      return { color: "green", submenu: submenuFinanciero };
    }

    if (esRutaOperativa(pathname)) {
      return { color: "orange", submenu: submenuOperativo };
    }

    if (esRutaRecursosHumanos(pathname)) {
      return { color: "cyan", submenu: submenuRecursosHumanos };
    }

    return null;
  }, [pathname]);

  async function cerrarSesion() {
    localStorage.clear();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function cambiarCondominio() {
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
    router.push("/login");
  }

  function clasesCentro(activo: boolean) {
    if (!centroActivo) return "";

    if (activo) {
      if (centroActivo.color === "green") return "bg-emerald-600 text-white shadow-sm";
      if (centroActivo.color === "orange") return "bg-orange-600 text-white shadow-sm";
      if (centroActivo.color === "purple") return "bg-purple-600 text-white shadow-sm";
      if (centroActivo.color === "cyan") return "bg-cyan-600 text-white shadow-sm";
      return "bg-blue-600 text-white shadow-sm";
    }

    if (centroActivo.color === "green") {
      return "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700";
    }

    if (centroActivo.color === "orange") {
      return "bg-slate-100 text-slate-700 hover:bg-orange-50 hover:text-orange-700";
    }

    if (centroActivo.color === "purple") {
      return "bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-purple-700";
    }

    if (centroActivo.color === "cyan") {
      return "bg-slate-100 text-slate-700 hover:bg-cyan-50 hover:text-cyan-700";
    }

    return "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700";
  }

  if (!sesion.condominioId) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="h-14 px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {sesion.condominioLogoUrl ? (
              <img
                src={sesion.condominioLogoUrl}
                alt={sesion.condominioNombre}
                className="h-8 w-8 object-contain rounded-lg border bg-white p-1"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
            )}

            <div className="min-w-0">
              <p className="font-black text-slate-900 leading-none">
                VAM Enterprise
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {sesion.empresaNombre}
              </p>
            </div>
          </div>

          <div className="hidden xl:flex flex-1 max-w-md items-center bg-slate-100 border rounded-xl px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              placeholder="Buscar propietario, apartamento, vehículo..."
              className="bg-transparent outline-none text-sm px-2 w-full"
            />
          </div>

          <div className="hidden lg:flex items-center gap-3 text-sm">
            <button
              onClick={cambiarCondominio}
              className="font-bold text-slate-700 hover:text-blue-700 max-w-xs truncate"
              title={sesion.condominioNombre}
            >
              📍 {sesion.condominioNombre}
            </button>

            <button className="relative p-2 rounded-xl hover:bg-slate-100">
              <Bell size={18} />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
            </button>

            <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
              <User size={16} />
              <div className="leading-tight">
                <p className="font-bold text-slate-800">
                  {sesion.usuarioNombre}
                </p>
                <p className="text-[11px] text-slate-500">
                  {sesion.usuarioRol}
                </p>
              </div>
            </div>

            <button
              onClick={cerrarSesion}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-3 py-2 font-bold"
            >
              <LogOut size={17} />
            </button>
          </div>

          <button
            onClick={() => setMenuMovil(!menuMovil)}
            className="lg:hidden p-2 rounded-xl bg-slate-100"
          >
            {menuMovil ? <X /> : <Menu />}
          </button>
        </div>

        <nav className="hidden lg:flex h-11 px-4 items-center gap-1 bg-slate-950 text-white overflow-x-auto">
          {menuPrincipal.map((item) => {
            const Icon = item.icon;
            const activo = estaActivo(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`h-9 inline-flex items-center gap-2 px-3 rounded-xl text-sm font-bold whitespace-nowrap ${
                  activo
                    ? "bg-blue-700 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {centroActivo && (
          <div className="hidden lg:block border-t border-slate-200 bg-white">
            <div className="px-4 py-2">
              <nav className="flex min-w-max gap-2 overflow-x-auto">
                {centroActivo.submenu.map((item) => {
                  const Icon = item.icon;
                  const activo =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold whitespace-nowrap transition ${clasesCentro(
                        activo
                      )}`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {menuMovil && (
          <div className="lg:hidden bg-slate-950 text-white p-4 space-y-2">
            <p className="text-xs text-slate-400">
              {sesion.condominioNombre} · {sesion.usuarioNombre}
            </p>

            <div className="grid grid-cols-2 gap-2">
              {menuPrincipal.map((item) => {
                const Icon = item.icon;
                const activo = estaActivo(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuMovil(false)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-bold ${
                      activo ? "bg-blue-700" : "bg-slate-900"
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <button
              onClick={cerrarSesion}
              className="w-full bg-red-600 rounded-xl py-3 font-bold"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </header>

      <main>
        <AuthGuard>{children}</AuthGuard>
      </main>
    </div>
  );
}