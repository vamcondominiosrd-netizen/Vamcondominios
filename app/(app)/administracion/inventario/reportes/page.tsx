"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  BarChart3,
  Boxes,
  ClipboardList,
  DollarSign,
  FolderTree,
  MapPin,
  Package,
  Tags,
  UserRound,
  Wrench,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type GrupoReporte = "Inventario" | "Operaciones" | "Financiero";

type Reporte = {
  titulo: string;
  descripcion: string;
  href: string;
  grupo: GrupoReporte;
  icon: any;
};

const reportes: Reporte[] = [
  {
    titulo: "Inventario General",
    descripcion:
      "Listado completo de artículos, activos, herramientas y equipos registrados.",
    href: "/administracion/inventario/reportes/general",
    grupo: "Inventario",
    icon: ClipboardList,
  },
  {
    titulo: "Por Categoría",
    descripcion: "Resumen y detalle agrupado por categoría de inventario.",
    href: "/administracion/inventario/reportes/categorias",
    grupo: "Inventario",
    icon: FolderTree,
  },
  {
    titulo: "Por Responsable",
    descripcion: "Control de activos asignados por empleado o responsable.",
    href: "/administracion/inventario/reportes/responsables",
    grupo: "Inventario",
    icon: UserRound,
  },
  {
    titulo: "Por Ubicación",
    descripcion:
      "Activos organizados por ubicación física dentro del condominio.",
    href: "/administracion/inventario/reportes/ubicaciones",
    grupo: "Inventario",
    icon: MapPin,
  },
  {
    titulo: "Movimientos",
    descripcion:
      "Entradas, salidas, asignaciones, devoluciones, reparaciones y bajas.",
    href: "/administracion/inventario/reportes/movimientos",
    grupo: "Operaciones",
    icon: ArrowRightLeft,
  },
  {
    titulo: "Mantenimientos",
    descripcion:
      "Plan, vencimientos, prioridades y costos de mantenimiento preventivo.",
    href: "/administracion/inventario/reportes/mantenimientos",
    grupo: "Operaciones",
    icon: Wrench,
  },
  {
    titulo: "Costos y Valorización",
    descripcion:
      "Valor de adquisición, valor actual y mantenimiento acumulado.",
    href: "/administracion/inventario/reportes/costos",
    grupo: "Financiero",
    icon: DollarSign,
  },
];

export default function ReportesInventarioPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      setMensaje(
        "No se encontró el condominio activo. Debe iniciar sesión nuevamente.",
      );
    }
  }, []);

  async function refrescar() {
    if (!condominioId) return;

    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioNombre(nombre);
  }

  const grupos = useMemo(() => {
    return ["Inventario", "Operaciones", "Financiero"] as GrupoReporte[];
  }, []);

  return (
    <PageContainer>
      <ModuleMenu
        title="Inventario"
        subtitle="Control de activos, artículos, movimientos, mantenimiento y reportes del condominio."
        tone="blue"
        items={[
          {
            href: "/administracion/inventario",
            label: "Inicio inventario",
            icon: Package,
          },
          {
            href: "/administracion/inventario/articulos",
            label: "Artículos",
            icon: Boxes,
          },
          {
            href: "/administracion/inventario/movimientos",
            label: "Movimientos",
            icon: ArrowRightLeft,
          },
          {
            href: "/administracion/inventario/mantenimiento",
            label: "Mantenimiento",
            icon: Wrench,
          },
          {
            href: "/administracion/inventario/reportes",
            label: "Reportes",
            icon: BarChart3,
          },
          {
            href: "/administracion/inventario/catalogos",
            label: "Catálogos",
            icon: Tags,
          },
        ]}
      />

      <ModuleToolbar
        title="Reportes de Inventario"
        subtitle={`Centro de reportes para activos, movimientos, mantenimiento y valorización. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={BarChart3}
        actions={<ModuleActions onRefresh={refrescar} />}
      />

      {mensaje && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          {mensaje}
        </div>
      )}

      {grupos.map((grupo) => {
        const reportesGrupo = reportes.filter(
          (reporte) => reporte.grupo === grupo,
        );

        return (
          <SectionCard
            key={grupo}
            title={`Opciones de ${grupo}`}
            subtitle={
              grupo === "Inventario"
                ? "Seleccione una opción para consultar reportes de existencia, ubicación y asignación."
                : grupo === "Operaciones"
                  ? "Seleccione una opción para consultar movimientos y mantenimientos."
                  : "Seleccione una opción para consultar costos, valorización y mantenimiento acumulado."
            }
          >
            {reportesGrupo.length === 0 ? (
              <EmptyState
                title="Sin reportes"
                description="No hay reportes disponibles para este grupo."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {reportesGrupo.map((reporte) => (
                  <ReporteOptionCard key={reporte.href} reporte={reporte} />
                ))}
              </div>
            )}
          </SectionCard>
        );
      })}
    </PageContainer>
  );
}

function ReporteOptionCard({ reporte }: { reporte: Reporte }) {
  const Icon = reporte.icon;

  return (
    <Link href={reporte.href} className="block h-full">
      <div className="flex h-full gap-4 rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="text-lg font-black text-slate-900">
            {reporte.titulo}
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            {reporte.descripcion}
          </p>

          <div className="mt-4 text-sm font-black text-emerald-700">
            Abrir módulo →
          </div>
        </div>
      </div>
    </Link>
  );
}