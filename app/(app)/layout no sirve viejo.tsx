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
  ChevronDown,
  Menu,
  X,
  ClipboardList,
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
  rolCondominio: string;
};

type SubMenuItem = {
  href: string;
  label: string;
  moduloCodigo?: string;
};

type MenuItem = {
  href: string;
  label: string;
  icon: any;
  moduloCodigo: string;
  submenu?: SubMenuItem[];
};

function leerListaLocalStorage(clave: string): string[] | null {
  const valor = localStorage.getItem(clave);

  if (valor === null) return null;

  try {
    const datos = JSON.parse(valor);
    return Array.isArray(datos)
      ? datos.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

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
    rolCondominio: "",
  });

  const [menuMovil, setMenuMovil] = useState(false);
  const [modulosHabilitados, setModulosHabilitados] = useState<string[] | null>(
    null,
  );

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
      rolCondominio: localStorage.getItem("rol_condominio") || "",
    });

    setModulosHabilitados(leerListaLocalStorage("modulos_habilitados"));
  }, [router]);

  const menuPrincipal: MenuItem[] = [
    {
      href: "/dashboard",
      label: "Inicio",
      icon: Home,
      moduloCodigo: "dashboard",
    },
    {
      href: "/administracion",
      label: "Residencial",
      icon: Building2,
      moduloCodigo: "residencial",
      submenu: [
        { href: "/administracion", label: "Dashboard Residencial" },
        { href: "/propietarios", label: "Propietarios" },
        { href: "/unidades", label: "Unidades" },
        { href: "/administracion/vehiculos", label: "Vehículos" },
        { href: "/administracion/documentos", label: "Documentos" },
        { href: "/administracion/directorio", label: "Directorio" },
        { href: "/reservas-areas", label: "Reservas" },
        { href: "/anuncios", label: "Anuncios" },
      ],
    },
    {
      href: "/finanzas",
      label: "Financiero",
      icon: WalletCards,
      moduloCodigo: "finanzas",
      submenu: [
        { href: "/finanzas", label: "Dashboard Financiero" },
        { href: "/finanzas/pagos", label: "Pagos" },
        { href: "/pagos-mantenimiento", label: "Pagos Mantenimiento" },
        { href: "/gastos", label: "Gastos" },
        { href: "/finanzas/caja-chica", label: "Caja Chica" },
        { href: "/banco", label: "Banco" },
        { href: "/solicitudes-pago", label: "Solicitudes de Pago" },
        { href: "/presupuesto", label: "Presupuesto" },
      ],
    },
    {
      href: "/operaciones",
      label: "Operativo",
      icon: Megaphone,
      moduloCodigo: "operaciones",
      submenu: [
        { href: "/operaciones", label: "Dashboard Operativo" },
        { href: "/incidencias", label: "Incidencias" },
        { href: "/autorizaciones", label: "Autorizaciones" },
        { href: "/gas", label: "Gas" },
        { href: "/checklist-visitas", label: "Checklist" },
      ],
    },
    {
      href: "/administracion/inventario",
      label: "Inventario",
      icon: Package,
      moduloCodigo: "inventario",
      submenu: [
        { href: "/administracion/inventario", label: "Dashboard Inventario" },
        { href: "/administracion/inventario/items", label: "Artículos" },
        { href: "/administracion/inventario/movimientos", label: "Movimientos" },
        { href: "/administracion/inventario/mantenimiento", label: "Mantenimiento" },
        { href: "/administracion/inventario/reportes", label: "Reportes" },
        { href: "/administracion/inventario/catalogos", label: "Catálogos" },
      ],
    },
    {
      href: "/recursos-humanos",
      label: "Capital Humano",
      icon: Users,
      moduloCodigo: "recursos_humanos",
      submenu: [
        { href: "/recursos-humanos", label: "Dashboard RH" },
        { href: "/recursos-humanos/empleados", label: "Empleados" },
        {
          href: "/recursos-humanos/nomina",
          label: "Nómina",
          moduloCodigo: "nomina",
        },
        { href: "/recursos-humanos/vacaciones", label: "Vacaciones" },
        { href: "/recursos-humanos/prestaciones", label: "Prestaciones" },
        { href: "/recursos-humanos/reportes", label: "Reportes" },
      ],
    },
    {
      href: "/contabilidad/dashboard",
      label: "Contable",
      icon: Calculator,
      moduloCodigo: "contabilidad",
      submenu: [
        { href: "/contabilidad/dashboard", label: "Dashboard Contable" },
        { href: "/contabilidad/plan-cuentas", label: "Plan de Cuentas" },
        { href: "/contabilidad/configuracion", label: "Configuración" },
        { href: "/contabilidad/asientos", label: "Asientos" },
        { href: "/contabilidad/mayor-general", label: "Mayor" },
        { href: "/contabilidad/balance-comprobacion", label: "Balance" },
        { href: "/contabilidad/estado-resultados", label: "Resultados" },
        { href: "/contabilidad/balance-general", label: "Balance General" },
        { href: "/contabilidad/flujo-efectivo", label: "Flujo" },
        { href: "/contabilidad/fondo-reserva", label: "Reserva" },
        { href: "/contabilidad/conciliacion-bancaria", label: "Conciliación" },
        { href: "/contabilidad/cierre-mensual", label: "Cierre" },
      ],
    },
    {
      href: "/proyectos",
      label: "Proyectos",
      icon: ClipboardList,
      moduloCodigo: "proyectos",
    },
    {
      href: "/reportes",
      label: "BI",
      icon: BarChart3,
      moduloCodigo: "reportes",
    },
    {
      href: "/seguridad",
      label: "Seguridad",
      icon: ShieldCheck,
      moduloCodigo: "seguridad",
      submenu: [
        { href: "/seguridad", label: "Usuarios" },
        { href: "/roles", label: "Roles" },
        { href: "/permisos", label: "Permisos" },
        { href: "/auditoria", label: "Auditoría" },
      ],
    },
    {
      href: "/configuracion",
      label: "Config.",
      icon: Settings,
      moduloCodigo: "configuracion",
      submenu: [
        { href: "/configuracion/modulos", label: "Módulos habilitados" },
        { href: "/catalogos", label: "Catálogos" },
        { href: "/finanzas/configuraciones", label: "Finanzas" },
        { href: "/configuracion/bancos", label: "Bancos" },
        {
          href: "/portal-movil",
          label: "Portal Móvil",
          moduloCodigo: "portal_movil",
        },
      ],
    },
  ];

  function moduloDisponible(codigo: string) {
    // Compatibilidad temporal: si el login anterior todavía no guardó la
    // lista, se mantiene el menú completo hasta el próximo inicio de sesión.
    if (modulosHabilitados === null) return true;
    return modulosHabilitados.includes(codigo);
  }

  const menuVisible = useMemo(() => {
    return menuPrincipal
      .filter((item) => moduloDisponible(item.moduloCodigo))
      .map((item) => ({
        ...item,
        submenu: item.submenu?.filter(
          (sub) => !sub.moduloCodigo || moduloDisponible(sub.moduloCodigo),
        ),
      }));
  }, [modulosHabilitados]);

  function estaActivo(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function cerrarSesion() {
    localStorage.clear();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function cambiarCondominio() {
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
    localStorage.removeItem("usuario_condominio_id");
    localStorage.removeItem("rol_condominio");
    localStorage.removeItem("modulos_habilitados");
    router.push("/login");
  }

  if (!sesion.condominioId) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <div className="flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            {sesion.condominioLogoUrl ? (
              <img
                src={sesion.condominioLogoUrl}
                alt={sesion.condominioNombre}
                className="h-8 w-8 rounded-lg border bg-white object-contain p-1"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
                <Building2 className="h-5 w-5 text-white" />
              </div>
            )}

            <div className="min-w-0">
              <p className="font-black leading-none text-slate-900">
                VAM Enterprise
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {sesion.empresaNombre}
              </p>
            </div>
          </div>

          <div className="hidden max-w-md flex-1 items-center rounded-xl border bg-slate-100 px-3 py-2 xl:flex">
            <Search size={16} className="text-slate-400" />
            <input
              placeholder="Buscar propietario, apartamento, vehículo..."
              className="w-full bg-transparent px-2 text-sm outline-none"
            />
          </div>

          <div className="hidden items-center gap-3 text-sm lg:flex">
            <button
              onClick={cambiarCondominio}
              className="max-w-xs truncate font-bold text-slate-700 hover:text-blue-700"
              title={sesion.condominioNombre}
            >
              📍 {sesion.condominioNombre}
            </button>

            <button className="relative rounded-xl p-2 hover:bg-slate-100">
              <Bell size={18} />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>

            <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2">
              <User size={16} />
              <div className="leading-tight">
                <p className="font-bold text-slate-800">{sesion.usuarioNombre}</p>
                <p className="text-[11px] text-slate-500">
                  {sesion.rolCondominio || sesion.usuarioRol}
                </p>
              </div>
            </div>

            <button
              onClick={cerrarSesion}
              className="rounded-xl bg-red-600 px-3 py-2 font-bold text-white hover:bg-red-700"
            >
              <LogOut size={17} />
            </button>
          </div>

          <button
            onClick={() => setMenuMovil(!menuMovil)}
            className="rounded-xl bg-slate-100 p-2 lg:hidden"
          >
            {menuMovil ? <X /> : <Menu />}
          </button>
        </div>

        <nav className="hidden h-11 items-center gap-1 overflow-x-auto bg-slate-950 px-4 text-white lg:flex">
          {menuVisible.map((item) => {
            const Icon = item.icon;
            const activo = estaActivo(item.href);
            const tieneSubmenu = item.submenu && item.submenu.length > 0;

            return (
              <div key={item.href} className="group relative">
                <Link
                  href={item.href}
                  className={`inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-bold ${
                    activo
                      ? "bg-blue-700 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                  {tieneSubmenu && <ChevronDown size={14} />}
                </Link>

                {tieneSubmenu && (
                  <div className="absolute left-0 top-10 z-50 hidden w-72 rounded-2xl border bg-white p-2 text-slate-800 shadow-2xl group-hover:block">
                    {item.submenu?.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className="block rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-blue-50 hover:text-blue-700"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {menuMovil && (
          <div className="space-y-2 bg-slate-950 p-4 text-white lg:hidden">
            <p className="text-xs text-slate-400">
              {sesion.condominioNombre} · {sesion.usuarioNombre}
            </p>

            <div className="grid grid-cols-2 gap-2">
              {menuVisible.map((item) => {
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
              className="w-full rounded-xl bg-red-600 py-3 font-bold"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </header>

      <main className="p-4">
        <AuthGuard>{children}</AuthGuard>
      </main>
    </div>
  );
}
