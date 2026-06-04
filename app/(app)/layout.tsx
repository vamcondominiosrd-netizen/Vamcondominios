"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  Home,
  Building2,
  WalletCards,
  Users,
  Landmark,
  Settings,
  BarChart3,
  Smartphone,
  LogOut,
  Megaphone,
  FolderOpen,
  ChevronDown,
  Circle,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";
import AuthGuard from "./AuthGuard";

type CondominioActual = {
  id: string;
  nombre: string;
  logoUrl: string;
};

type MenuItem = {
  href: string;
  label: string;
  descripcion: string;
  icon: any;
  submenu?: {
    href: string;
    label: string;
  }[];
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [condominio, setCondominio] = useState<CondominioActual>({
    id: "",
    nombre: "",
    logoUrl: "",
  });

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const logoUrl = localStorage.getItem("condominio_logo_url") || "";

    if (!id) {
      router.push("/login");
      return;
    }

    setCondominio({
      id,
      nombre,
      logoUrl,
    });
  }, [router]);

  const menuPrincipal: MenuItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      descripcion: "Resumen general",
      icon: Home,
    },
    {
      href: "/administracion",
      label: "Administración",
      descripcion: "Condominios, apartamentos y propietarios",
      icon: Building2,
    },
    {
      href: "/finanzas",
      label: "Finanzas",
      descripcion: "Configuraciones, pagos y caja chica",
      icon: WalletCards,
      submenu: [
        {
          href: "/finanzas/configuraciones",
          label: "Configuraciones",
        },
        {
          href: "/finanzas/pagos",
          label: "Pagos",
        },
        {
          href: "/finanzas/caja-chica",
          label: "Caja Chica",
        },
      ],
    },
    {
      href: "/recursos-humanos",
      label: "Recursos Humanos",
      descripcion: "Empleados, nómina y reportes RH",
      icon: Users,
    },
    {
      href: "/banco",
      label: "Banco",
      descripcion: "Importación y conciliación bancaria",
      icon: Landmark,
    },
    {
      href: "/operaciones",
      label: "Operaciones",
      descripcion: "Incidencias, reservas y anuncios",
      icon: Megaphone,
    },
    {
      href: "/catalogos",
      label: "Catálogos",
      descripcion: "Proveedores, categorías y parámetros",
      icon: FolderOpen,
    },
    {
      href: "/reportes",
      label: "Reportes",
      descripcion: "Estados financieros y análisis",
      icon: BarChart3,
    },
    {
      href: "/portal-movil",
      label: "Portal Móvil",
      descripcion: "Acceso móvil para residentes y directiva",
      icon: Smartphone,
    },
    {
      href: "/seguridad",
      label: "Seguridad",
      descripcion: "Usuarios, roles y permisos",
      icon: Settings,
    },
  ];

  async function cerrarSesion() {
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_admin_id");
    localStorage.removeItem("propietario_actual");

    await supabase.auth.signOut();

    router.push("/login");
  }

  function cambiarCondominio() {
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");

    router.push("/login");
  }

  function estaActivo(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  if (!condominio.id) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-80 bg-slate-950 text-white hidden md:flex flex-col border-r border-slate-800">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {condominio.logoUrl ? (
              <img
                src={condominio.logoUrl}
                alt={condominio.nombre}
                className="h-14 w-14 object-contain rounded-2xl border border-slate-700 bg-white p-2"
              />
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-amber-500 flex items-center justify-center">
                <Building2 className="h-7 w-7 text-slate-950" />
              </div>
            )}

            <div>
              <h1 className="font-bold text-base leading-tight">
                VAM Administración
              </h1>

              <p className="text-xs text-slate-300">
                Sistema de Condominios
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 border-b border-slate-800">
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">
              Condominio activo
            </p>

            <p className="font-semibold text-sm text-white leading-snug">
              {condominio.nombre}
            </p>

            <button
              onClick={cambiarCondominio}
              className="mt-3 text-xs text-amber-400 hover:text-amber-300"
            >
              Cambiar condominio
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuPrincipal.map((item) => {
            const Icon = item.icon;
            const activo = estaActivo(item.href);
            const tieneSubmenu = item.submenu && item.submenu.length > 0;

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-start gap-3 rounded-2xl px-4 py-3 transition border ${
                    activo
                      ? "bg-blue-700 border-blue-600 text-white shadow"
                      : "border-transparent text-slate-200 hover:bg-slate-900 hover:border-slate-800"
                  }`}
                >
                  <div
                    className={`mt-0.5 rounded-xl p-2 ${
                      activo ? "bg-white/15" : "bg-slate-900"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold leading-tight">
                        {item.label}
                      </p>

                      {tieneSubmenu && (
                        <ChevronDown className="h-4 w-4 opacity-80" />
                      )}
                    </div>

                    <p
                      className={`text-xs mt-1 leading-snug ${
                        activo ? "text-blue-100" : "text-slate-400"
                      }`}
                    >
                      {item.descripcion}
                    </p>
                  </div>
                </Link>

                {tieneSubmenu && activo && (
                  <div className="ml-6 mt-2 mb-2 space-y-1 border-l border-slate-700 pl-4">
                    {item.submenu?.map((sub) => {
                      const subActivo =
                        pathname === sub.href ||
                        pathname.startsWith(`${sub.href}/`);

                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                            subActivo
                              ? "bg-slate-800 text-amber-300 font-bold"
                              : "text-slate-300 hover:bg-slate-900 hover:text-white"
                          }`}
                        >
                          <Circle
                            className={`h-2.5 w-2.5 ${
                              subActivo ? "fill-amber-300" : ""
                            }`}
                          />
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={cerrarSesion}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-red-200 hover:bg-red-900/40 transition"
          >
            <LogOut className="h-5 w-5" />

            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        <AuthGuard>{children}</AuthGuard>
      </main>
    </div>
  );
}