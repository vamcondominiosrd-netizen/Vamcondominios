"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  FileSpreadsheet,
  FolderOpen,
  Package,
  Settings,
  Tags,
  WalletCards,
  Wrench,
} from "lucide-react";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import SectionCard from "@/components/vam/enterprise/SectionCard";

type ModuloCatalogo = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
  color: string;
  bg: string;
};

type SeccionCatalogo = {
  titulo: string;
  descripcion: string;
  modulos: ModuloCatalogo[];
};

export default function CatalogosPage() {
  const secciones: SeccionCatalogo[] = [
    {
      titulo: "Servicios y suplidores",
      descripcion:
        "Catálogos relacionados con suplidores, proveedores y servicios recurrentes del condominio.",
      modulos: [
        {
          titulo: "Proveedores",
          descripcion:
            "Registrar y administrar proveedores de servicios del condominio.",
          href: "/catalogos/proveedores",
          icono: Building2,
          color: "text-blue-700",
          bg: "bg-blue-50",
        },
        {
          titulo: "Catálogo de Técnicos",
          descripcion:
            "Crear y mantener el catálogo de técnicos disponibles para servicios y trabajos.",
          href: "/catalogo-tecnicos",
          icono: Wrench,
          color: "text-indigo-700",
          bg: "bg-indigo-50",
        },
      ],
    },
    {
      titulo: "Financieros",
      descripcion:
        "Catálogos auxiliares para clasificar gastos, fondos y operaciones financieras.",
      modulos: [
        {
          titulo: "Categorías de Gastos",
          descripcion:
            "Crear categorías para clasificar gastos operativos y financieros.",
          href: "/catalogos/categorias-gastos",
          icono: FolderOpen,
          color: "text-emerald-700",
          bg: "bg-emerald-50",
        },
        {
          titulo: "Fondos",
          descripcion:
            "Definir fondos ordinarios, extraordinarios, reserva y otros fondos.",
          href: "/catalogos/fondos",
          icono: WalletCards,
          color: "text-amber-700",
          bg: "bg-amber-50",
        },
      ],
    },
    {
      titulo: "Operativos",
      descripcion:
        "Catálogos usados en la operación diaria del condominio y sus áreas comunes.",
      modulos: [
        {
          titulo: "Áreas Sociales",
          descripcion:
            "Administrar áreas comunes disponibles para reservas de residentes.",
          href: "/areas-sociales",
          icono: CalendarDays,
          color: "text-pink-700",
          bg: "bg-pink-50",
        },
      ],
    },
    {
      titulo: "Sistema",
      descripcion:
        "Parámetros auxiliares y valores base usados por diferentes módulos de VAM.",
      modulos: [
        {
          titulo: "Parámetros Generales",
          descripcion:
            "Mantener parámetros y valores auxiliares usados por el sistema.",
          href: "/catalogos/parametros",
          icono: Settings,
          color: "text-slate-700",
          bg: "bg-slate-100",
        },
      ],
    },
  ];

  return (
    <PageContainer>
      <ModuleMenu
        title="Catálogos"
        subtitle="Administración de catálogos base del sistema VAM: proveedores, categorías, fondos, áreas sociales, técnicos y parámetros."
        tone="purple"
        items={[
          {
            href: "/catalogos",
            label: "Inicio catálogos",
            icon: FolderOpen,
          },
          {
            href: "/catalogos/proveedores",
            label: "Proveedores",
            icon: Building2,
          },
          {
            href: "/catalogos/categorias-gastos",
            label: "Categorías",
            icon: Tags,
          },
          {
            href: "/catalogos/fondos",
            label: "Fondos",
            icon: WalletCards,
          },
          {
            href: "/areas-sociales",
            label: "Áreas sociales",
            icon: CalendarDays,
          },
          {
            href: "/catalogo-tecnicos",
            label: "Técnicos",
            icon: Wrench,
          },
          {
            href: "/catalogos/parametros",
            label: "Parámetros",
            icon: Settings,
          },
        ]}
      />

      <ModuleToolbar
        title="Dashboard de Catálogos"
        subtitle="Centro de control para administrar catálogos base y datos auxiliares del sistema."
        icon={FolderOpen}
        actions={
          <Link
            href="/catalogos/proveedores"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-800"
          >
            <Building2 className="h-4 w-4" />
            Registrar proveedor
          </Link>
        }
      />

      {secciones.map((seccion) => (
        <SectionCard
          key={seccion.titulo}
          title={seccion.titulo}
          subtitle={seccion.descripcion}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {seccion.modulos.map((modulo) => {
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
                      <h3 className="text-base font-black text-slate-900 group-hover:text-purple-700">
                        {modulo.titulo}
                      </h3>

                      <p className="mt-1 min-h-[52px] text-sm leading-relaxed text-slate-500">
                        {modulo.descripcion}
                      </p>

                      <div className="mt-3 flex items-center gap-2 text-sm font-black text-purple-700">
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
      ))}

      <SectionCard
        title="Flujo recomendado"
        subtitle="Orden sugerido para mantener los catálogos organizados y evitar duplicidad de datos."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FlujoPaso
            numero="1"
            titulo="Servicios"
            descripcion="Registrar proveedores y técnicos antes de crear gastos o solicitudes."
          />

          <FlujoPaso
            numero="2"
            titulo="Financieros"
            descripcion="Definir categorías de gastos y fondos usados por los módulos financieros."
          />

          <FlujoPaso
            numero="3"
            titulo="Operativos"
            descripcion="Mantener áreas sociales y catálogos de operación diaria actualizados."
          />

          <FlujoPaso
            numero="4"
            titulo="Sistema"
            descripcion="Revisar parámetros generales antes de activar nuevos procesos."
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
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-purple-700 text-sm font-black text-white">
        {numero}
      </div>

      <p className="font-black text-slate-900">{titulo}</p>

      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {descripcion}
      </p>
    </div>
  );
}
