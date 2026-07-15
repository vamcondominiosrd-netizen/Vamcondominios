"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Building2,
  CalendarClock,
  CircleDollarSign,
  FileText,
  History,
  ListChecks,
  RefreshCw,
  Search,
  ShieldOff,
  Users,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import StatCard from "@/components/vam/enterprise/StatCard";
import SectionCard from "@/components/vam/enterprise/SectionCard";

type DeudaUnidad = {
  condominio_id: number;
  condominio_nombre: string | null;
  unidad_id: number;
  unidad_codigo: string | null;
  propietario_id: number | null;
  nombre_propietario: string | null;
  telefono: string | null;
  correo: string | null;
  cantidad_cargos_vencidos: number | null;
  balance_vencido: number | null;
  periodo_inicial: string | null;
  periodo_final: string | null;
  fecha_vencimiento_mas_antigua: string | null;
  dias_vencido: number | null;
  tiene_pago_parcial: boolean | null;
};

function dinero(valor: number | string | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fechaCorta(valor: string | null | undefined) {
  if (!valor) return "-";

  return new Date(`${valor}T00:00:00`).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizarTexto(valor: string | null | undefined) {
  return (valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function CobrosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [registros, setRegistros] = useState<DeudaUnidad[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroAntiguedad, setFiltroAntiguedad] = useState("TODOS");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      setError("No se encontró el condominio activo.");
      setLoading(false);
      return;
    }

    cargarDeudas(id);
  }, []);

  async function cargarDeudas(id = condominioId) {
    if (!id) return;

    setLoading(true);
    setError("");

    const { data, error: consultaError } = await supabase
      .from("vw_cobros_deuda_unidades")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("dias_vencido", { ascending: false })
      .order("unidad_codigo", { ascending: true });

    if (consultaError) {
      setRegistros([]);
      setError(
        `No se pudieron cargar las cuentas por cobrar: ${consultaError.message}`
      );
      setLoading(false);
      return;
    }

    setRegistros((data || []) as DeudaUnidad[]);
    setLoading(false);
  }

  const registrosFiltrados = useMemo(() => {
    const texto = normalizarTexto(busqueda.trim());

    return registros.filter((item) => {
      const coincideBusqueda =
        !texto ||
        normalizarTexto(item.unidad_codigo).includes(texto) ||
        normalizarTexto(item.nombre_propietario).includes(texto) ||
        normalizarTexto(item.telefono).includes(texto) ||
        normalizarTexto(item.correo).includes(texto);

      const dias = Number(item.dias_vencido || 0);

      const coincideAntiguedad =
        filtroAntiguedad === "TODOS" ||
        (filtroAntiguedad === "1_9" && dias >= 1 && dias <= 9) ||
        (filtroAntiguedad === "10_30" && dias >= 10 && dias <= 30) ||
        (filtroAntiguedad === "31_60" && dias >= 31 && dias <= 60) ||
        (filtroAntiguedad === "61_MAS" && dias >= 61);

      return coincideBusqueda && coincideAntiguedad;
    });
  }, [registros, busqueda, filtroAntiguedad]);

  const totalVencido = useMemo(
    () =>
      registros.reduce(
        (acumulado, item) => acumulado + Number(item.balance_vencido || 0),
        0
      ),
    [registros]
  );

  const totalCargos = useMemo(
    () =>
      registros.reduce(
        (acumulado, item) =>
          acumulado + Number(item.cantidad_cargos_vencidos || 0),
        0
      ),
    [registros]
  );

  const deudaPromedio =
    registros.length > 0 ? totalVencido / registros.length : 0;

  const mayorAntiguedad = useMemo(
    () =>
      registros.reduce(
        (maximo, item) => Math.max(maximo, Number(item.dias_vencido || 0)),
        0
      ),
    [registros]
  );

  function nivelAntiguedad(dias: number) {
    if (dias >= 61) {
      return "bg-red-100 text-red-700 border-red-200";
    }

    if (dias >= 31) {
      return "bg-orange-100 text-orange-700 border-orange-200";
    }

    if (dias >= 10) {
      return "bg-amber-100 text-amber-700 border-amber-200";
    }

    return "bg-blue-100 text-blue-700 border-blue-200";
  }

  return (
    <PageContainer>
      <ModuleMenu
        title="Cobros Inteligentes"
        subtitle="Gestión de deuda, automatizaciones y seguimiento de comunicaciones."
        tone="blue"
        items={[
          {
            href: "/finanzas/cobros",
            label: "Resumen",
            icon: CircleDollarSign,
          },
          {
            href: "/finanzas/cobros/cuentas",
            label: "Cuentas por cobrar",
            icon: Users,
          },
          {
            href: "/finanzas/cobros/agentes",
            label: "Agentes",
            icon: Bot,
          },
          {
            href: "/finanzas/cobros/plantillas",
            label: "Plantillas",
            icon: FileText,
          },
          {
            href: "/finanzas/cobros/exclusiones",
            label: "Exclusiones",
            icon: ShieldOff,
          },
          {
            href: "/finanzas/cobros/cola",
            label: "Cola",
            icon: ListChecks,
          },
          {
            href: "/finanzas/cobros/historial",
            label: "Historial",
            icon: History,
          },
        ]}
      />

      <ModuleToolbar
        title="Resumen de Cobros"
        subtitle={`Control de cuentas vencidas. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={CircleDollarSign}
        actions={
          <button
            type="button"
            onClick={() => cargarDeudas()}
            disabled={loading || !condominioId}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Balance vencido"
          value={`RD$ ${dinero(totalVencido)}`}
          subtitle={`${registros.length} unidad(es) con deuda`}
          icon={CircleDollarSign}
          tone="red"
        />

        <StatCard
          title="Unidades vencidas"
          value={String(registros.length)}
          subtitle={`${totalCargos} cargo(s) pendientes`}
          icon={Building2}
          tone="amber"
        />

        <StatCard
          title="Deuda promedio"
          value={`RD$ ${dinero(deudaPromedio)}`}
          subtitle="Promedio por unidad"
          icon={Users}
          tone="blue"
        />

        <StatCard
          title="Mayor antigüedad"
          value={`${mayorAntiguedad} días`}
          subtitle="Cargo vencido más antiguo"
          icon={CalendarClock}
          tone="slate"
        />
      </div>

      <SectionCard
        title="Cuentas por cobrar"
        subtitle={`Condominio activo: ${
          condominioNombre || "No identificado"
        }`}
      >
        <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_240px]">
          <div className="flex items-center rounded-xl border bg-white px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por unidad, propietario, teléfono o correo..."
              className="w-full bg-transparent px-3 py-3 text-sm outline-none"
            />
          </div>

          <select
            value={filtroAntiguedad}
            onChange={(e) => setFiltroAntiguedad(e.target.value)}
            className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700"
          >
            <option value="TODOS">Todas las antigüedades</option>
            <option value="1_9">De 1 a 9 días</option>
            <option value="10_30">De 10 a 30 días</option>
            <option value="31_60">De 31 a 60 días</option>
            <option value="61_MAS">Más de 60 días</option>
          </select>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border bg-slate-50 p-8 text-center text-sm text-slate-500">
            Cargando cuentas por cobrar...
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <p className="font-black text-emerald-800">
              No hay unidades que coincidan con los filtros.
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              La vista solo presenta cargos vencidos con balance pendiente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-[1180px] w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Propietario</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3 text-center">Cargos</th>
                  <th className="px-4 py-3">Periodos</th>
                  <th className="px-4 py-3">Vencimiento inicial</th>
                  <th className="px-4 py-3 text-center">Antigüedad</th>
                  <th className="px-4 py-3 text-right">Balance vencido</th>
                </tr>
              </thead>

              <tbody className="divide-y bg-white">
                {registrosFiltrados.map((item) => {
                  const dias = Number(item.dias_vencido || 0);

                  return (
                    <tr
                      key={`${item.condominio_id}-${item.unidad_id}`}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-black text-slate-900">
                          {item.unidad_codigo || "-"}
                        </p>
                        {item.tiene_pago_parcial && (
                          <span className="mt-1 inline-flex rounded-full bg-blue-100 px-2 py-1 text-[11px] font-black text-blue-700">
                            Pago parcial
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <p className="max-w-[230px] font-bold text-slate-800">
                          {item.nombre_propietario || "Sin propietario"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-700">
                          {item.telefono || "Sin teléfono"}
                        </p>
                        <p className="mt-1 max-w-[230px] truncate text-xs text-slate-500">
                          {item.correo && item.correo.toLowerCase() !== "sin datos"
                            ? item.correo
                            : "Sin correo"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-center font-black text-slate-800">
                        {Number(item.cantidad_cargos_vencidos || 0)}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-800">
                          {item.periodo_inicial || "-"}
                        </p>
                        <p className="text-xs text-slate-500">
                          hasta {item.periodo_final || "-"}
                        </p>
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-700">
                        {fechaCorta(item.fecha_vencimiento_mas_antigua)}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${nivelAntiguedad(
                            dias
                          )}`}
                        >
                          {dias} días
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <p className="text-base font-black text-red-700">
                          RD$ {dinero(item.balance_vencido)}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot className="border-t-2 bg-slate-100">
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-4 text-right font-black text-slate-700"
                  >
                    Total visible
                  </td>
                  <td className="px-4 py-4 text-right text-lg font-black text-red-700">
                    RD${" "}
                    {dinero(
                      registrosFiltrados.reduce(
                        (total, item) =>
                          total + Number(item.balance_vencido || 0),
                        0
                      )
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
        <p className="font-black">Operación segura</p>
        <p className="mt-1 leading-relaxed">
          Este panel es únicamente de consulta y seguimiento. No registra,
          modifica ni aplica pagos. Los pagos continúan realizándose
          exclusivamente por el módulo actual de VAM Condominios.
        </p>
      </div>
    </PageContainer>
  );
}
