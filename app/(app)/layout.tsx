"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  Users,
  ReceiptText,
  FolderOpen,
  Megaphone,
  AlertTriangle,
  CalendarDays,
  ClipboardCheck,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";
import AuthGuard from "./AuthGuard";

type CondominioActual = {
  id: string;
  nombre: string;
  logoUrl: string;
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const router = useRouter();

  const [condominio, setCondominio] =
    useState<CondominioActual>({
      id: "",
      nombre: "",
      logoUrl: "",
    });

  const [rol, setRol] =
    useState("");

  useEffect(() => {

    const id =
      localStorage.getItem(
        "condominio_id"
      ) || "";

    const nombre =
      localStorage.getItem(
        "condominio_nombre"
      ) || "";

    const logoUrl =
      localStorage.getItem(
        "condominio_logo_url"
      ) || "";

    const rolGuardado =
      localStorage.getItem(
        "usuario_rol"
      ) || "";

    setRol(rolGuardado);

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

  const grupos = [

    {
      titulo: "Dashboard",
      roles: [
        "Super Admin",
        "Administrador",
        "Presidente",
        "Consulta",
      ],
      items: [
        {
          href: "/dashboard",
          label: "Dashboard Financiero",
          icon: Home,
        },
      ],
    },

    {
      titulo: "Condominio",
      roles: [
        "Super Admin",
        "Administrador",
      ],
      items: [

        {
          href: "/unidades",
          label: "Unidades",
          icon: Building2,
        },

        {
          href: "/propietarios",
          label: "Propietarios",
          icon: Users,
        },

        {
          href: "/areas-sociales",
          label: "Áreas Sociales",
          icon: Building2,
        },

        {
          href: "/reservas-areas",
          label: "Reservas",
          icon: CalendarDays,
        },
       {
        href: "/reportes/presupuesto-anual",
        label: "Presupuesto Anual",
        icon: BarChart3,
       },

      ],
    },

    {
      titulo: "Cobros",
      roles: [
        "Super Admin",
        "Administrador",
        "Tesorero",
      ],
      items: [

        {
          href: "/configuracion-cargos",
          label: "Configuración Cargos",
          icon: Settings,
        },

        {
          href: "/cargos-mantenimiento",
          label: "Cargos Mantenimiento",
          icon: FileSpreadsheet,
        },

        {
          href: "/cargos-extraordinarios",
          label: "Cargos Extraordinarios",
          icon: ReceiptText,
        },

        {
          href: "/pagos-mantenimiento",
          label: "Pagos Mantenimiento",
          icon: WalletCards,
        },

        {
          href: "/pagos-propietarios",
          label: "Pagos Propietarios",
          icon: ClipboardCheck,
        },

        {
          href: "/consulta-estado",
          label: "Estado de Cuenta",
          icon: FileSpreadsheet,
        },

      ],
    },

    {
      titulo: "Finanzas",
      roles: [
        "Super Admin",
        "Administrador",
        "Tesorero",
        "Presidente",
      ],
      items: [

        {
          href: "/gastos",
          label: "Gastos",
          icon: ReceiptText,
        },

        {
          href: "/solicitudes-pago",
          label: "Solicitudes Pago",
          icon: ClipboardCheck,
        },

        {
          href: "/aprobacion-tesorero",
          label: "Aprobación Tesorero",
          icon: ClipboardCheck,
        },

        {
          href: "/aprobacion-presidente",
          label: "Aprobación Presidente",
          icon: ClipboardCheck,
        },

        {
          href: "/tesoreria",
          label: "Tesorería",
          icon: WalletCards,
        },

        {
          href: "/configuracion-financiera",
          label: "Configuración Financiera",
          icon: Settings,
        },

      ],
    },

    {
      titulo: "Banco",
      roles: [
        "Super Admin",
        "Administrador",
        "Tesorero",
      ],
      items: [

        {
          href: "/archivo-banco/importar",
          label: "Importar Banco",
          icon: Upload,
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

        {
          href: "/apartamento-banco-alias/importar",
          label: "Alias Apartamentos",
          icon: FileSpreadsheet,
        },

      ],
    },

    {
      titulo: "Caja Chica",
      roles: [
        "Super Admin",
        "Administrador",
        "Tesorero",
      ],
      items: [

        {
          href: "/caja-chica",
          label: "Movimientos",
          icon: Coins,
        },

        {
          href: "/caja-chica/fondos",
          label: "Fondos",
          icon: WalletCards,
        },

        {
          href: "/caja-chica/balance",
          label: "Balance",
          icon: BarChart3,
        },

        {
          href: "/caja-chica/reporte",
          label: "Reportes",
          icon: FileSpreadsheet,
        },

      ],
    },

    {
      titulo: "Operaciones",
      roles: [
        "Super Admin",
        "Administrador",
        "Soporte",
      ],
      items: [

        {
          href: "/incidencias",
          label: "Incidencias",
          icon: AlertTriangle,
        },

        {
          href: "/anuncios",
          label: "Anuncios",
          icon: Megaphone,
        },

      ],
    },

    {
      titulo: "Catálogos",
      roles: [
        "Super Admin",
        "Administrador",
      ],
      items: [

        {
          href: "/catalogos/proveedores",
          label: "Proveedores",
          icon: Building2,
        },

        {
          href: "/catalogos/categorias-gastos",
          label: "Categorías Gastos",
          icon: FolderOpen,
        },

      ],
    },

    {
      titulo: "Sistema",
      roles: [
        "Super Admin",
      ],
      items: [

        {
          href: "/reportes",
          label: "Reportes",
          icon: BarChart3,
        },

        {
          href: "/condominios",
          label: "Condominios",
          icon: Building2,
        },

        {
          href: "/configuracion",
          label: "Configuración",
          icon: Settings,
        },

      ],
    },

  ];

  const gruposFiltrados =
    grupos.filter((g) =>
      g.roles.includes(rol)
    );

  async function cerrarSesion() {

    localStorage.clear();

    await supabase.auth.signOut();

    router.push("/login");
  }

  function cambiarCondominio() {

    localStorage.clear();

    router.push("/login");
  }

  if (!condominio.id) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-slate-100">

      <aside className="w-80 bg-slate-950 text-white p-5 hidden md:flex flex-col overflow-y-auto">

        <div className="flex items-center gap-3 mb-6">

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
              Sistema de Condominios
            </h1>

            <p className="text-xs text-slate-300">
              {rol || "Administrador"}
            </p>

          </div>

        </div>

        <div className="mb-6 bg-slate-900 rounded-2xl p-4 border border-slate-800">

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

        <nav className="space-y-5 flex-1">

          {gruposFiltrados.map((grupo) => (

            <div key={grupo.titulo}>

              <p className="text-xs uppercase tracking-wider text-slate-400 mb-2 px-2">
                {grupo.titulo}
              </p>

              <div className="space-y-1">

                {grupo.items.map((item) => {

                  const Icon =
                    item.icon;

                  return (

                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 hover:text-white transition"
                    >

                      <Icon className="h-5 w-5" />

                      {item.label}

                    </Link>

                  );
                })}

              </div>

            </div>

          ))}

        </nav>

        <button
          onClick={cerrarSesion}
          className="mt-6 flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-200 hover:bg-red-900/40 transition"
        >

          <LogOut className="h-5 w-5" />

          Cerrar sesión

        </button>

      </aside>

      <main className="flex-1 p-6">
        <AuthGuard>
          {children}
        </AuthGuard>
      </main>

    </div>
  );
}