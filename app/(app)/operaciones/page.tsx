"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  FileText,
  Megaphone,
  Package,
  Wrench,
} from "lucide-react";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import SectionCard from "@/components/vam/enterprise/SectionCard";

type ModuloOperaciones = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
  color: string;
  bg: string;
};

export default function OperacionesPage() {
  const modulos: ModuloOperaciones[] = [
    {
      titulo: "Incidencias",
      descripcion:
        "Registrar, revisar y dar seguimiento a reportes de propietarios y residentes.",
      href: "/incidencias",
      icono: AlertTriangle,
      color: "text-red-700",
      bg: "bg-red-50",
    },
    {
      titulo: "Reservas",
      descripcion:
        "Consultar, aprobar y controlar reservas de áreas sociales del condominio.",
      href: "/reservas-areas",
      icono: CalendarDays,
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      titulo: "Anuncios",
      descripcion:
        "Publicar avisos, comunicados e informaciones para propietarios y residentes.",
      href: "/anuncios",
      icono: Megaphone,
      color: "text-amber-700",
      bg: "bg-amber-50",
    },
    {
      titulo: "Documentos",
      descripcion:
        "Administrar documentos internos, reglamentos, actas y comunicados.",
      href: "/administracion/documentos",
      icono: FileText,
      color: "text-purple-700",
      bg: "bg-purple-50",
    },
    {
      titulo: "Mantenimiento",
      descripcion:
        "Asignar trabajos, reparaciones y mantenimiento de áreas comunes.",
      href: "/trabajos-tecnicos",
      icono: Wrench,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      titulo: "Inventario",
      descripcion:
        "Control de equipos, herramientas, activos, movimientos y mantenimiento.",
      href: "/administracion/inventario",
      icono: Package,
      color: "text-slate-700",
      bg: "bg-slate-100",
    },
  ];

  return (
    <PageContainer>
      <ModuleMenu
        title="Operaciones"
        subtitle="Gestión operativa del condominio: incidencias, reservas, anuncios, documentos, mantenimiento e inventario."
        tone="orange"
        items={[
          {
            href: "/operaciones",
            label: "Inicio operaciones",
            icon: ClipboardList,
          },
          {
            href: "/incidencias",
            label: "Incidencias",
            icon: AlertTriangle,
          },
          {
            href: "/reservas-areas",
            label: "Reservas",
            icon: CalendarDays,
          },
          {
            href: "/anuncios",
            label: "Anuncios",
            icon: Megaphone,
          },
          {
            href: "/administracion/documentos",
            label: "Documentos",
            icon: FileText,
          },
          {
            href: "/trabajos-tecnicos",
            label: "Mantenimiento",
            icon: Wrench,
          },
          {
            href: "/administracion/inventario",
            label: "Inventario",
            icon: Package,
          },
        ]}
      />

      <ModuleToolbar
        title="Operaciones"
        subtitle="Administre las tareas operativas del condominio desde un solo panel."
        icon={ClipboardList}
      />

      <SectionCard
        title="Opciones de Operaciones"
        subtitle="Seleccione una opción para continuar trabajando."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {modulos.map((modulo) => {
            const Icono = modulo.icono;

            return (
              <Link
                key={modulo.href}
                href={modulo.href}
                className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${modulo.bg}`}
                  >
                    <Icono className={`h-6 w-6 ${modulo.color}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black text-slate-900 group-hover:text-orange-700">
                      {modulo.titulo}
                    </h3>

                    <p className="mt-1 min-h-[52px] text-sm leading-relaxed text-slate-500">
                      {modulo.descripcion}
                    </p>

                    <div className="mt-3 flex items-center gap-2 text-sm font-black text-orange-700">
                      <span>Abrir módulo</span>
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Flujo recomendado de Operaciones"
        subtitle="Orden sugerido para mantener el control operativo del condominio."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FlujoPaso
            numero="1"
            titulo="Incidencias"
            descripcion="Recibir, revisar y clasificar reportes de residentes."
          />

          <FlujoPaso
            numero="2"
            titulo="Seguimiento"
            descripcion="Asignar tareas, responsables y fechas de solución."
          />

          <FlujoPaso
            numero="3"
            titulo="Comunicación"
            descripcion="Publicar anuncios y mantener informados a los residentes."
          />

          <FlujoPaso
            numero="4"
            titulo="Control"
            descripcion="Mantener documentos, reservas e inventario organizados."
          />
        </div>
      </SectionCard>
    </PageContainer>
  );
}

function FlujoPaso({
  numero,
  titulo,
  descripcion,
}: {
  numero: string;
  titulo: string;
  descripcion: string;
}) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-orange-700 text-sm font-black text-white">
        {numero}
      </div>

      <p className="font-black text-slate-900">{titulo}</p>

      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {descripcion}
      </p>
    </div>
  );
}