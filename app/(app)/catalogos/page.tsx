"use client";

import Link from "next/link";
import {
  Building2,
  FolderOpen,
  Tags,
  WalletCards,
  CalendarDays,
  Settings,
  FileSpreadsheet,
  ArrowRight,
} from "lucide-react";

type ModuloCatalogo = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
  fondo: string;
  iconoColor: string;
};

export default function CatalogosPage() {
  const modulos: ModuloCatalogo[] = [
    {
      titulo: "Proveedores",
      descripcion:
        "Registrar y administrar proveedores de servicios del condominio.",
      href: "/catalogos/proveedores",
      icono: Building2,
      fondo: "from-blue-600 to-blue-800",
      iconoColor: "text-blue-700",
    },
    {
      titulo: "Categorías de Gastos",
      descripcion:
        "Crear categorías para clasificar gastos operativos y financieros.",
      href: "/catalogos/categorias-gastos",
      icono: FolderOpen,
      fondo: "from-emerald-600 to-emerald-800",
      iconoColor: "text-emerald-700",
    },
    {
      titulo: "Tipos de Cargos",
      descripcion:
        "Configurar tipos de cargos como mantenimiento, mora, multa u otros.",
      href: "/catalogos/tipos-cargos",
      icono: Tags,
      fondo: "from-purple-600 to-purple-800",
      iconoColor: "text-purple-700",
    },
    {
      titulo: "Fondos",
      descripcion:
        "Definir fondos ordinarios, extraordinarios, reserva y otros fondos.",
      href: "/catalogos/fondos",
      icono: WalletCards,
      fondo: "from-amber-500 to-orange-700",
      iconoColor: "text-amber-700",
    },
    {
      titulo: "Áreas Sociales",
      descripcion:
        "Administrar áreas comunes disponibles para reservas de residentes.",
      href: "/areas-sociales",
      icono: CalendarDays,
      fondo: "from-pink-600 to-rose-800",
      iconoColor: "text-pink-700",
    },
    {
      titulo: "Parámetros Generales",
      descripcion:
        "Mantener parámetros y valores auxiliares usados por el sistema.",
      href: "/catalogos/parametros",
      icono: Settings,
      fondo: "from-slate-700 to-slate-950",
      iconoColor: "text-slate-700",
    },
    {
      titulo: "Importaciones",
      descripcion:
        "Importar catálogos o datos base desde archivos de Excel.",
      href: "/catalogos/importaciones",
      icono: FileSpreadsheet,
      fondo: "from-indigo-600 to-indigo-900",
      iconoColor: "text-indigo-700",
    },
  ];

  return (
    <main className="space-y-5">
      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
              Módulo
            </p>

            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
              Catálogos
            </h1>

            <p className="text-sm text-slate-500 mt-2 max-w-3xl">
              Administre los catálogos base del sistema: proveedores,
              categorías, tipos de cargos, fondos, áreas sociales y parámetros.
            </p>
          </div>

          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-600 to-slate-900 flex items-center justify-center shadow-lg">
            <FolderOpen className="h-9 w-9 text-white" />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            Opciones de Catálogos
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Seleccione una opción para continuar trabajando.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {modulos.map((modulo) => {
            const Icono = modulo.icono;

            return (
              <Link
                key={modulo.href}
                href={modulo.href}
                className="group rounded-2xl border bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition overflow-hidden"
              >
                <div
                  className={`h-20 bg-gradient-to-br ${modulo.fondo} flex items-center justify-center relative`}
                >
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_white,_transparent_35%)]" />

                  <div className="h-14 w-14 rounded-2xl bg-white/95 flex items-center justify-center shadow-md relative z-10 group-hover:scale-105 transition">
                    <Icono className={`h-8 w-8 ${modulo.iconoColor}`} />
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-black text-slate-900 text-base group-hover:text-purple-700">
                    {modulo.titulo}
                  </h3>

                  <p className="text-xs text-slate-500 mt-2 min-h-[54px] leading-relaxed">
                    {modulo.descripcion}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-xs font-bold text-purple-700">
                    <span>Abrir módulo</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm p-5">
        <h2 className="text-lg font-bold">Flujo recomendado Catálogos</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-sm">
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-purple-300 font-bold">1. Proveedores</p>
            <p className="text-slate-300 mt-1 text-xs">
              Registrar suplidores y datos de contacto.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-purple-300 font-bold">2. Categorías</p>
            <p className="text-slate-300 mt-1 text-xs">
              Clasificar gastos, cargos y operaciones.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-purple-300 font-bold">3. Fondos</p>
            <p className="text-slate-300 mt-1 text-xs">
              Organizar cuentas y fondos financieros.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-purple-300 font-bold">4. Parámetros</p>
            <p className="text-slate-300 mt-1 text-xs">
              Mantener datos auxiliares del sistema.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}