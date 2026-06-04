"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Megaphone,
  FileText,
  Wrench,
  ClipboardList,
  ArrowRight,
} from "lucide-react";

type ModuloOperaciones = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
  fondo: string;
  iconoColor: string;
};

export default function OperacionesPage() {
  const modulos: ModuloOperaciones[] = [
    {
      titulo: "Incidencias",
      descripcion:
        "Registrar, revisar y dar seguimiento a reportes de propietarios.",
      href: "/incidencias",
      icono: AlertTriangle,
      fondo: "from-red-600 to-red-800",
      iconoColor: "text-red-700",
    },
    {
      titulo: "Reservas",
      descripcion:
        "Consultar y aprobar reservas de áreas sociales del condominio.",
      href: "/reservas-areas",
      icono: CalendarDays,
      fondo: "from-blue-600 to-blue-800",
      iconoColor: "text-blue-700",
    },
    {
      titulo: "Anuncios",
      descripcion:
        "Publicar avisos, comunicados e informaciones para residentes.",
      href: "/anuncios",
      icono: Megaphone,
      fondo: "from-amber-500 to-orange-700",
      iconoColor: "text-amber-700",
    },
    {
      titulo: "Documentos",
      descripcion:
        "Administrar documentos internos, reglamentos y comunicados.",
      href: "/documentos",
      icono: FileText,
      fondo: "from-purple-600 to-purple-800",
      iconoColor: "text-purple-700",
    },
    {
      titulo: "Mantenimiento",
      descripcion:
        "Controlar trabajos, reparaciones y mantenimiento de áreas comunes.",
      href: "/mantenimiento",
      icono: Wrench,
      fondo: "from-emerald-600 to-emerald-800",
      iconoColor: "text-emerald-700",
    },
    {
      titulo: "Tareas Operativas",
      descripcion:
        "Seguimiento de pendientes, actividades y asignaciones internas.",
      href: "/operaciones/tareas",
      icono: ClipboardList,
      fondo: "from-slate-700 to-slate-950",
      iconoColor: "text-slate-700",
    },
  ];

  return (
    <main className="space-y-5">
      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
              Módulo
            </p>

            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
              Operaciones
            </h1>

            <p className="text-sm text-slate-500 mt-2 max-w-3xl">
              Administre incidencias, reservas, anuncios, documentos,
              mantenimiento de áreas comunes y tareas operativas del condominio.
            </p>
          </div>

          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-600 to-slate-900 flex items-center justify-center shadow-lg">
            <ClipboardList className="h-9 w-9 text-white" />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            Opciones de Operaciones
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
                  <h3 className="font-black text-slate-900 text-base group-hover:text-orange-700">
                    {modulo.titulo}
                  </h3>

                  <p className="text-xs text-slate-500 mt-2 min-h-[54px] leading-relaxed">
                    {modulo.descripcion}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-xs font-bold text-orange-700">
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
        <h2 className="text-lg font-bold">Flujo recomendado Operaciones</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-sm">
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-orange-300 font-bold">1. Incidencias</p>
            <p className="text-slate-300 mt-1 text-xs">
              Recibir y clasificar reportes de los residentes.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-orange-300 font-bold">2. Seguimiento</p>
            <p className="text-slate-300 mt-1 text-xs">
              Asignar tareas y dar respuesta a cada caso.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-orange-300 font-bold">3. Comunicación</p>
            <p className="text-slate-300 mt-1 text-xs">
              Publicar anuncios y avisos importantes.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-orange-300 font-bold">4. Control</p>
            <p className="text-slate-300 mt-1 text-xs">
              Mantener documentos, reservas y actividades organizadas.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}