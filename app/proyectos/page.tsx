"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  ClipboardList,
  Eye,
  FileText,
  FolderKanban,
  Loader2,
  Plus,
  Search,
  UserRound,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import StatCard from "@/components/vam/enterprise/StatCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type Proyecto = {
  id: number;
  condominio_id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  area_afectada: string | null;
  fecha_inicio_estimada: string | null;
  fecha_fin_estimada: string | null;
  presupuesto_estimado: number | null;
  requiere_cuota_extraordinaria: boolean;
  activo: boolean;
  created_at: string;
  proyectos_tipos: { nombre: string | null } | null;
  proyectos_prioridades: {
    nombre: string | null;
    codigo: string | null;
    color: string | null;
  } | null;
  proyectos_estados: {
    nombre: string | null;
    codigo: string | null;
    color: string | null;
  } | null;
  proyectos_fuentes_financiamiento: { nombre: string | null } | null;
};

type Solicitante = {
  proyecto_id: number;
  nombre_solicitante: string | null;
  cargo_o_representacion: string | null;
  es_principal: boolean;
  activo: boolean;
};

type Aviso = {
  tipo: "error" | "info";
  titulo: string;
  mensaje: string;
};

function dinero(valor: number | string | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatoFecha(fecha?: string | null) {
  if (!fecha) return "-";
  const limpia = String(fecha).split("T")[0];
  const partes = limpia.split("-");
  if (partes.length !== 3) return fecha;
  const [anio, mes, dia] = partes;
  return `${dia}/${mes}/${anio}`;
}

function colorEstado(proyecto: Proyecto) {
  const codigo = proyecto.proyectos_estados?.codigo || "";
  if (codigo === "APROBADO") return "bg-emerald-100 text-emerald-800";
  if (codigo === "EN_EVALUACION") return "bg-blue-100 text-blue-800";
  if (codigo === "PENDIENTE_APROBACION") return "bg-amber-100 text-amber-800";
  if (codigo === "RECHAZADO") return "bg-red-100 text-red-800";
  if (codigo === "CANCELADO") return "bg-slate-200 text-slate-700";
  return "bg-slate-100 text-slate-700";
}

function colorPrioridad(proyecto: Proyecto) {
  const codigo = proyecto.proyectos_prioridades?.codigo || "";
  if (codigo === "URGENTE") return "bg-red-100 text-red-800";
  if (codigo === "ALTA") return "bg-orange-100 text-orange-800";
  if (codigo === "NORMAL") return "bg-blue-100 text-blue-800";
  return "bg-slate-100 text-slate-700";
}

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [solicitantes, setSolicitantes] = useState<Map<number, Solicitante>>(new Map());
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroPrioridad, setFiltroPrioridad] = useState("");
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      setAviso({
        tipo: "error",
        titulo: "Condominio no identificado",
        mensaje: "No hay condominio activo. Debe iniciar sesión nuevamente.",
      });
      return;
    }

    const nombreFinal = nombre || `Condominio ID ${id}`;
    setCondominioId(id);
    setCondominioNombre(nombreFinal);
    cargarProyectos(id);
  }, []);

  async function cargarProyectos(id: string) {
    if (!id) return;

    try {
      setCargando(true);
      setAviso(null);

      const { data: proyectosData, error: proyectosError } = await supabase
        .from("proyectos")
        .select(`
          id,
          condominio_id,
          codigo,
          nombre,
          descripcion,
          area_afectada,
          fecha_inicio_estimada,
          fecha_fin_estimada,
          presupuesto_estimado,
          requiere_cuota_extraordinaria,
          activo,
          created_at,
          proyectos_tipos(nombre),
          proyectos_prioridades(nombre, codigo, color),
          proyectos_estados(nombre, codigo, color),
          proyectos_fuentes_financiamiento(nombre)
        `)
        .eq("condominio_id", Number(id))
        .eq("activo", true)
        .order("created_at", { ascending: false });

      if (proyectosError) throw proyectosError;

      const listaProyectos = (proyectosData || []) as unknown as Proyecto[];
      setProyectos(listaProyectos);

      const ids = listaProyectos.map((proyecto) => proyecto.id);
      if (ids.length === 0) {
        setSolicitantes(new Map());
        return;
      }

      const { data: solicitantesData, error: solicitantesError } = await supabase
        .from("proyectos_solicitantes")
        .select("proyecto_id, nombre_solicitante, cargo_o_representacion, es_principal, activo")
        .in("proyecto_id", ids)
        .eq("activo", true)
        .eq("es_principal", true);

      if (solicitantesError) throw solicitantesError;

      const mapa = new Map<number, Solicitante>();
      for (const solicitante of (solicitantesData || []) as Solicitante[]) {
        mapa.set(Number(solicitante.proyecto_id), solicitante);
      }
      setSolicitantes(mapa);
    } catch (error: unknown) {
      setAviso({
        tipo: "error",
        titulo: "No se pudieron cargar los proyectos",
        mensaje: error instanceof Error ? error.message : "Ocurrió un error consultando los proyectos.",
      });
      setProyectos([]);
      setSolicitantes(new Map());
    } finally {
      setCargando(false);
    }
  }

  const estadosDisponibles = useMemo(() => {
    const valores = new Map<string, string>();
    for (const proyecto of proyectos) {
      const codigo = proyecto.proyectos_estados?.codigo;
      const nombre = proyecto.proyectos_estados?.nombre;
      if (codigo && nombre) valores.set(codigo, nombre);
    }
    return Array.from(valores.entries());
  }, [proyectos]);

  const prioridadesDisponibles = useMemo(() => {
    const valores = new Map<string, string>();
    for (const proyecto of proyectos) {
      const codigo = proyecto.proyectos_prioridades?.codigo;
      const nombre = proyecto.proyectos_prioridades?.nombre;
      if (codigo && nombre) valores.set(codigo, nombre);
    }
    return Array.from(valores.entries());
  }, [proyectos]);

  const proyectosFiltrados = useMemo(() => {
    const textoBuscar = buscar.trim().toLowerCase();

    return proyectos.filter((proyecto) => {
      const solicitante = solicitantes.get(proyecto.id);
      const cumpleEstado = !filtroEstado || proyecto.proyectos_estados?.codigo === filtroEstado;
      const cumplePrioridad = !filtroPrioridad || proyecto.proyectos_prioridades?.codigo === filtroPrioridad;

      const texto = [
        proyecto.codigo,
        proyecto.nombre,
        proyecto.descripcion,
        proyecto.area_afectada,
        proyecto.proyectos_tipos?.nombre,
        proyecto.proyectos_prioridades?.nombre,
        proyecto.proyectos_estados?.nombre,
        proyecto.proyectos_fuentes_financiamiento?.nombre,
        solicitante?.nombre_solicitante,
        solicitante?.cargo_o_representacion,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return cumpleEstado && cumplePrioridad && (!textoBuscar || texto.includes(textoBuscar));
    });
  }, [proyectos, solicitantes, buscar, filtroEstado, filtroPrioridad]);

  const presupuestoTotal = proyectosFiltrados.reduce(
    (total, proyecto) => total + Number(proyecto.presupuesto_estimado || 0),
    0,
  );

  const cantidadBorradores = proyectosFiltrados.filter(
    (proyecto) => proyecto.proyectos_estados?.codigo === "BORRADOR",
  ).length;

  const cantidadUrgentes = proyectosFiltrados.filter(
    (proyecto) => proyecto.proyectos_prioridades?.codigo === "URGENTE",
  ).length;

  const cantidadCuotaExtraordinaria = proyectosFiltrados.filter(
    (proyecto) => proyecto.requiere_cuota_extraordinaria,
  ).length;

  return (
    <PageContainer>
      <ModuleMenu
        title="Proyectos"
        subtitle="Planificación, evaluación, ejecución y seguimiento de proyectos."
        tone="blue"
        items={[
          { href: "/proyectos", label: "Proyectos", icon: FolderKanban },
          { href: "/proyectos/nuevo", label: "Nuevo proyecto", icon: Plus },
        ]}
      />

      <ModuleToolbar
        title="Gestión de Proyectos"
        subtitle="Consulta y seguimiento de los proyectos registrados para el condominio activo."
        icon={FolderKanban}
        actions={
          <ModuleActions
            onRefresh={() => cargarProyectos(condominioId)}
            extra={
              <Link
                href="/proyectos/nuevo"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
              >
                <Plus className="h-4 w-4" />
                Nuevo proyecto
              </Link>
            }
          />
        }
      />

      {aviso && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-black">{aviso.titulo}</p>
              <p className="mt-1 text-sm font-medium">{aviso.mensaje}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Proyectos" value={proyectosFiltrados.length} subtitle="Según filtros" icon={FolderKanban} tone="blue" />
        <StatCard title="Presupuesto estimado" value={`RD$ ${dinero(presupuestoTotal)}`} subtitle="Total de proyectos" icon={WalletCards} tone="green" />
        <StatCard title="Borradores" value={cantidadBorradores} subtitle="Pendientes de completar" icon={FileText} tone="slate" />
        <StatCard title="Urgentes" value={cantidadUrgentes} subtitle="Prioridad urgente" icon={AlertCircle} tone="red" />
        <StatCard title="Cuota extraordinaria" value={cantidadCuotaExtraordinaria} subtitle="Proyectos que la requieren" icon={ClipboardList} tone="amber" />
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase text-slate-500">Condominio activo</p>
            <p className="text-lg font-black text-slate-900">{condominioNombre || "No seleccionado"}</p>
            <p className="text-xs font-semibold text-slate-500">Solo se muestran proyectos correspondientes a este condominio.</p>
          </div>
        </div>
      </div>

      <SectionCard title="Filtros" subtitle="Busque por código, proyecto, solicitante, tipo, área o fuente de financiamiento.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Estado</label>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full rounded-xl border bg-white px-4 py-3 text-sm">
              <option value="">Todos los estados</option>
              {estadosDisponibles.map(([codigo, nombre]) => <option key={codigo} value={codigo}>{nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Prioridad</label>
            <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)} className="w-full rounded-xl border bg-white px-4 py-3 text-sm">
              <option value="">Todas las prioridades</option>
              {prioridadesDisponibles.map(([codigo, nombre]) => <option key={codigo} value={codigo}>{nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Buscar</label>
            <div className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input type="text" value={buscar} onChange={(e) => setBuscar(e.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Código, proyecto o solicitante..." />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Proyectos registrados"
        subtitle="Listado general de proyectos del condominio activo."
        action={<div className="text-lg font-black text-blue-700">RD$ {dinero(presupuestoTotal)}</div>}
      >
        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando proyectos...
          </div>
        ) : proyectosFiltrados.length === 0 ? (
          <EmptyState title="Sin proyectos" description="No hay proyectos registrados para esta consulta." />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Proyecto</th>
                <th className="px-4 py-3 text-left">Solicitado por</th>
                <th className="px-4 py-3 text-left">Tipo / área</th>
                <th className="px-4 py-3 text-center">Prioridad</th>
                <th className="px-4 py-3 text-right">Presupuesto</th>
                <th className="px-4 py-3 text-left">Planificación</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {proyectosFiltrados.map((proyecto) => {
                const solicitante = solicitantes.get(proyecto.id);
                return (
                  <tr key={proyecto.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-black text-blue-700">{proyecto.codigo}</p>
                      <p className="mt-1 text-xs text-slate-500">ID: {proyecto.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-black text-slate-900">{proyecto.nombre}</p>
                      {proyecto.descripcion && <p className="mt-1 max-w-sm truncate text-xs text-slate-500" title={proyecto.descripcion}>{proyecto.descripcion}</p>}
                      <p className="mt-1 text-xs font-semibold text-slate-500">{proyecto.proyectos_fuentes_financiamiento?.nombre || "Fuente no indicada"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <div>
                          <p className="font-bold text-slate-800">{solicitante?.nombre_solicitante || "No indicado"}</p>
                          <p className="mt-1 text-xs text-slate-500">{solicitante?.cargo_o_representacion || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{proyecto.proyectos_tipos?.nombre || "-"}</p>
                      <p className="mt-1 text-xs text-slate-500">{proyecto.area_afectada || "Área no indicada"}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${colorPrioridad(proyecto)}`}>
                        {proyecto.proyectos_prioridades?.nombre || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-black whitespace-nowrap">RD$ {dinero(proyecto.presupuesto_estimado)}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 text-xs text-slate-600">
                        <p className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Inicio: {formatoFecha(proyecto.fecha_inicio_estimada)}</p>
                        <p>Fin: {formatoFecha(proyecto.fecha_fin_estimada)}</p>
                        <p className="text-slate-400">Creado: {formatoFecha(proyecto.created_at)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${colorEstado(proyecto)}`}>
                        {proyecto.proyectos_estados?.nombre || "Sin estado"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link href={`/proyectos/${proyecto.id}`} className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800">
                        <Eye className="h-3.5 w-3.5" />Ver proyecto
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </SectionCard>
    </PageContainer>
  );
}
