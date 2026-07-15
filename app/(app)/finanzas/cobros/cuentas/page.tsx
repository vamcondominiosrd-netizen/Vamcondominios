"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Eye,
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
import EmptyState from "@/components/vam/enterprise/EmptyState";

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

function fechaCorta(valor?: string | null) {
  if (!valor) return "-";

  return new Date(`${valor}T00:00:00`).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizar(valor?: string | null) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function claseAntiguedad(dias: number) {
  if (dias >= 91) return "border-red-200 bg-red-50 text-red-700";
  if (dias >= 61) return "border-orange-200 bg-orange-50 text-orange-700";
  if (dias >= 31) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default function CobrosCuentasPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [registros, setRegistros] = useState<DeudaUnidad[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroAntiguedad, setFiltroAntiguedad] = useState("TODOS");
  const [filtroContacto, setFiltroContacto] = useState("TODOS");

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

    cargarCuentas(id);
  }, []);

  async function cargarCuentas(id = condominioId) {
    if (!id) return;

    setLoading(true);
    setError("");

    const { data, error: consultaError } = await supabase
      .from("vw_cobros_deuda_unidades")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("balance_vencido", { ascending: false })
      .order("dias_vencido", { ascending: false });

    if (consultaError) {
      setRegistros([]);
      setError(
        "No se pudieron cargar las cuentas por cobrar: " +
          consultaError.message
      );
      setLoading(false);
      return;
    }

    setRegistros((data || []) as DeudaUnidad[]);
    setLoading(false);
  }

  const registrosFiltrados = useMemo(() => {
    const texto = normalizar(busqueda.trim());

    return registros.filter((item) => {
      const dias = Number(item.dias_vencido || 0);
      const tieneTelefono = Boolean(String(item.telefono || "").trim());
      const tieneCorreo =
        Boolean(String(item.correo || "").trim()) &&
        normalizar(item.correo) !== "sin datos";

      const coincideBusqueda =
        !texto ||
        normalizar(item.unidad_codigo).includes(texto) ||
        normalizar(item.nombre_propietario).includes(texto) ||
        normalizar(item.telefono).includes(texto) ||
        normalizar(item.correo).includes(texto);

      const coincideAntiguedad =
        filtroAntiguedad === "TODOS" ||
        (filtroAntiguedad === "1_30" && dias >= 1 && dias <= 30) ||
        (filtroAntiguedad === "31_60" && dias >= 31 && dias <= 60) ||
        (filtroAntiguedad === "61_90" && dias >= 61 && dias <= 90) ||
        (filtroAntiguedad === "91_MAS" && dias >= 91);

      const coincideContacto =
        filtroContacto === "TODOS" ||
        (filtroContacto === "CON_TELEFONO" && tieneTelefono) ||
        (filtroContacto === "SIN_TELEFONO" && !tieneTelefono) ||
        (filtroContacto === "CON_CORREO" && tieneCorreo) ||
        (filtroContacto === "SIN_CORREO" && !tieneCorreo);

      return coincideBusqueda && coincideAntiguedad && coincideContacto;
    });
  }, [registros, busqueda, filtroAntiguedad, filtroContacto]);

  const totalVencido = registros.reduce(
    (sum, item) => sum + Number(item.balance_vencido || 0),
    0
  );

  const totalCargos = registros.reduce(
    (sum, item) => sum + Number(item.cantidad_cargos_vencidos || 0),
    0
  );

  const sinTelefono = registros.filter(
    (item) => !String(item.telefono || "").trim()
  ).length;

  const mas90Dias = registros.filter(
    (item) => Number(item.dias_vencido || 0) >= 91
  ).length;

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
        title="Cuentas por Cobrar"
        subtitle={`Detalle de unidades con balances vencidos. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={Users}
        actions={
          <button
            type="button"
            onClick={() => cargarCuentas()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:bg-slate-100"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        }
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Balance vencido"
          value={`RD$ ${dinero(totalVencido)}`}
          subtitle={`${registros.length} unidad(es)`}
          icon={CircleDollarSign}
          tone="red"
        />

        <StatCard
          title="Cargos vencidos"
          value={String(totalCargos)}
          subtitle="Pendientes y parciales"
          icon={Building2}
          tone="amber"
        />

        <StatCard
          title="Más de 90 días"
          value={String(mas90Dias)}
          subtitle="Requieren prioridad"
          icon={CalendarClock}
          tone="red"
        />

        <StatCard
          title="Sin teléfono"
          value={String(sinTelefono)}
          subtitle="Contacto pendiente"
          icon={Users}
          tone="slate"
        />
      </div>

      <SectionCard
        title="Detalle de deuda"
        subtitle="Cada fila representa una unidad independiente."
      >
        <div className="mb-5 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_220px_220px]">
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
            <option value="1_30">De 1 a 30 días</option>
            <option value="31_60">De 31 a 60 días</option>
            <option value="61_90">De 61 a 90 días</option>
            <option value="91_MAS">Más de 90 días</option>
          </select>

          <select
            value={filtroContacto}
            onChange={(e) => setFiltroContacto(e.target.value)}
            className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-slate-700"
          >
            <option value="TODOS">Todos los contactos</option>
            <option value="CON_TELEFONO">Con teléfono</option>
            <option value="SIN_TELEFONO">Sin teléfono</option>
            <option value="CON_CORREO">Con correo</option>
            <option value="SIN_CORREO">Sin correo</option>
          </select>
        </div>

        {loading ? (
          <div className="rounded-xl border bg-slate-50 p-8 text-center text-sm text-slate-500">
            Cargando cuentas por cobrar...
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <EmptyState
            title="Sin cuentas"
            description="No existen unidades que coincidan con los filtros seleccionados."
          />
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
                  <th className="px-4 py-3">Vencimiento</th>
                  <th className="px-4 py-3 text-center">Antigüedad</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-center">Acción</th>
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
                        <p className="max-w-[220px] font-bold text-slate-800">
                          {item.nombre_propietario || "Sin propietario"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-700">
                          {item.telefono || "Sin teléfono"}
                        </p>
                        <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                          {item.correo &&
                          normalizar(item.correo) !== "sin datos"
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
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${claseAntiguedad(
                            dias
                          )}`}
                        >
                          {dias} días
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right text-base font-black text-red-700">
                        RD$ {dinero(item.balance_vencido)}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <Link
                          href={`/finanzas/cobros/cuentas/${item.unidad_id}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-200"
                        >
                          <Eye className="h-4 w-4" />
                          Ver cuenta
                        </Link>
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
                        (sum, item) =>
                          sum + Number(item.balance_vencido || 0),
                        0
                      )
                    )}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}
