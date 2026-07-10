"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  Filter,
  Printer,
  RefreshCw,
  Search,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type Unidad = {
  id: number;
  codigo: string;
  tipo: string | null;
  cuota_mensual_actual: number | null;
  activa: boolean | null;
};

type PropietarioApartamento = {
  id: number;
  condominio_id: number;
  no_apartamento: string | null;
  nombre_propietario: string | null;
  cedula: string | null;
  telefono: string | null;
  correo: string | null;
  estado: string | null;
};

type Cargo = {
  id: number;
  periodo: string | null;
  concepto: string | null;
  tipo_cargo: string | null;
  monto: number | null;
  monto_pagado: number | null;
  balance: number | null;
  estado: string | null;
};

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizar(valor: string | null | undefined) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function claseEstado(estado: string | null | undefined) {
  const valor = normalizar(estado);

  if (valor === "PAGADO") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  if (valor === "PARCIAL") {
    return "bg-yellow-50 text-yellow-700 border-yellow-100";
  }

  if (valor === "ANULADO") {
    return "bg-slate-100 text-slate-700 border-slate-200";
  }

  return "bg-red-50 text-red-700 border-red-100";
}

export default function ConsultaEstadoPage() {
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [propietarios, setPropietarios] = useState<PropietarioApartamento[]>(
    [],
  );
  const [cargos, setCargos] = useState<Cargo[]>([]);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [unidadId, setUnidadId] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [cargandoBase, setCargandoBase] = useState(false);

  useEffect(() => {
    const idGuardado = localStorage.getItem("condominio_id") || "";
    const nombreGuardado =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(idGuardado);
    setCondominioNombre(nombreGuardado);

    if (!idGuardado) {
      setMensaje(
        "No hay condominio seleccionado en la sesión. Debe iniciar sesión nuevamente.",
      );
      return;
    }

    cargarBase(idGuardado);
  }, []);

  async function cargarBase(id: string) {
    setCargandoBase(true);
    setUnidadId("");
    setCargos([]);
    setMensaje("");

    await Promise.all([cargarUnidades(id), cargarPropietarios(id)]);

    setCargandoBase(false);
  }

  async function cargarUnidades(id: string) {
    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo, tipo, cuota_mensual_actual, activa")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo", { ascending: true });

    if (error) {
      setMensaje("Error cargando unidades: " + error.message);
      setUnidades([]);
      return;
    }

    setUnidades((data as Unidad[]) || []);
  }

  async function cargarPropietarios(id: string) {
    const { data, error } = await supabase
      .from("propietarios_apartamentos")
      .select(
        "id, condominio_id, no_apartamento, nombre_propietario, cedula, telefono, correo, estado",
      )
      .eq("condominio_id", Number(id))
      .order("no_apartamento", { ascending: true });

    if (error) {
      setMensaje("Error cargando propietarios: " + error.message);
      setPropietarios([]);
      return;
    }

    setPropietarios((data as PropietarioApartamento[]) || []);
  }

  async function consultarEstado(idUnidad?: string) {
    const unidadConsulta = idUnidad || unidadId;

    if (!condominioId || !unidadConsulta) {
      setMensaje("Debe seleccionar una unidad/apartamento.");
      return;
    }

    setLoading(true);
    setMensaje("");
    setCargos([]);

    const { data, error } = await supabase
      .from("cargos_periodicos")
      .select(
        `
        id,
        periodo,
        concepto,
        tipo_cargo,
        monto,
        monto_pagado,
        balance,
        estado
      `,
      )
      .eq("condominio_id", Number(condominioId))
      .eq("unidad_id", Number(unidadConsulta))
      .order("periodo", { ascending: true });

    setLoading(false);

    if (error) {
      setMensaje("Error consultando estado: " + error.message);
      return;
    }

    setCargos((data as Cargo[]) || []);

    if (!data || data.length === 0) {
      setMensaje("No hay cargos registrados para esta unidad.");
    }
  }

  async function refrescar() {
    if (!condominioId) return;

    await cargarBase(condominioId);

    if (unidadId) {
      await consultarEstado(unidadId);
    }
  }

  function limpiarConsulta() {
    setUnidadId("");
    setCargos([]);
    setMensaje("");
    setBusqueda("");
  }

  function imprimirEstado() {
    window.print();
  }

  function obtenerPropietario(unidad: Unidad | null) {
    if (!unidad) return null;

    return (
      propietarios.find(
        (p) => normalizar(p.no_apartamento) === normalizar(unidad.codigo),
      ) || null
    );
  }

  const unidadesFiltradas = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto) return unidades;

    return unidades.filter((unidad) => {
      const propietario = obtenerPropietario(unidad);

      const combinado = `
        ${unidad.codigo || ""}
        ${unidad.tipo || ""}
        ${propietario?.nombre_propietario || ""}
        ${propietario?.cedula || ""}
        ${propietario?.telefono || ""}
        ${propietario?.correo || ""}
      `.toLowerCase();

      return combinado.includes(texto);
    });
  }, [unidades, propietarios, busqueda]);

  const unidadSeleccionada = useMemo(() => {
    return unidades.find((u) => String(u.id) === String(unidadId)) || null;
  }, [unidades, unidadId]);

  const propietarioSeleccionado = useMemo(() => {
    return obtenerPropietario(unidadSeleccionada);
  }, [unidadSeleccionada, propietarios]);

  const totalFacturado = cargos.reduce(
    (sum, c) => sum + Number(c.monto || 0),
    0,
  );

  const totalPagado = cargos.reduce(
    (sum, c) => sum + Number(c.monto_pagado || 0),
    0,
  );

  const balancePendiente = cargos.reduce(
    (sum, c) => sum + Number(c.balance || 0),
    0,
  );

  const mesesPagados = cargos.filter(
    (c) => normalizar(c.estado) === "PAGADO" || Number(c.balance || 0) <= 0,
  ).length;

  const mesesPendientes = cargos.filter(
    (c) => Number(c.balance || 0) > 0,
  ).length;

  return (
    <PageContainer>
      <ModuleMenu
        title="Control y Seguimiento"
        subtitle="Revisión de pagos, créditos, estados de cuenta y reportes financieros."
        tone="blue"
        items={[
          {
            href: "/finanzas/pagos/cuadre-propietario",
            label: "Cuadre de pagos",
            icon: ClipboardCheck,
          },
          {
            href: "/creditos-propietarios",
            label: "Saldos a favor",
            icon: WalletCards,
          },
          {
            href: "/consulta-estado",
            label: "Estado de cuenta",
            icon: FileText,
          },
          {
            href: "/reportes",
            label: "Reporte financiero",
            icon: BarChart3,
          },
        ]}
      />

      <ModuleToolbar
        title="Consulta de Estado de Cuenta"
        subtitle={`Consulta de cargos, pagos y balance pendiente por apartamento. Condominio: ${
          condominioNombre || "No seleccionado"
        }.`}
        icon={FileText}
        actions={
          <ModuleActions
            onRefresh={refrescar}
            extra={
              <button
                type="button"
                onClick={imprimirEstado}
                disabled={cargos.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </button>
            }
          />
        }
      />

      {mensaje && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          {mensaje}
        </div>
      )}

      <SectionCard
        title="Seleccionar apartamento"
        subtitle="Busque por apartamento, propietario, teléfono, cédula o correo."
        action={
          cargandoBase ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <Filter className="h-4 w-4" />
              Unidades: {unidadesFiltradas.length}
            </div>
          )
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm font-semibold">
              Condominio
            </label>

            <input
              type="text"
              value={condominioNombre || `Condominio ID ${condominioId}`}
              disabled
              className="w-full rounded-xl border bg-slate-100 px-4 py-3 text-sm text-slate-700"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold">
              Buscar propietario
            </label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />

              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-xl border px-10 py-3 text-sm"
                placeholder="Apto, propietario, teléfono..."
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Apartamento / unidad
            </label>

            <select
              value={unidadId}
              onChange={(e) => {
                const valor = e.target.value;
                setUnidadId(valor);
                setCargos([]);
                setMensaje("");

                if (valor) {
                  consultarEstado(valor);
                }
              }}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Seleccione apartamento</option>

              {unidadesFiltradas.map((u) => {
                const propietario = obtenerPropietario(u);

                return (
                  <option key={u.id} value={u.id}>
                    {u.codigo} -{" "}
                    {propietario?.nombre_propietario || "Sin propietario"}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => consultarEstado()}
              disabled={loading || !unidadId}
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {loading ? "Consultando..." : "Consultar"}
            </button>

            <button
              onClick={limpiarConsulta}
              type="button"
              className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              Limpiar
            </button>
          </div>
        </div>
      </SectionCard>

      {unidadSeleccionada && (
        <SectionCard
          title="Datos del propietario"
          subtitle="Información principal del apartamento consultado."
          action={
            <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
              {unidadSeleccionada.codigo}
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <InfoLine label="Apartamento" value={unidadSeleccionada.codigo} />

            <InfoLine
              label="Propietario"
              value={
                propietarioSeleccionado?.nombre_propietario || "Sin propietario"
              }
            />

            <InfoLine
              label="Teléfono"
              value={propietarioSeleccionado?.telefono || "-"}
            />

            <InfoLine
              label="Correo"
              value={propietarioSeleccionado?.correo || "-"}
            />

            <InfoLine
              label="Cuota actual"
              value={`RD$ ${dinero(unidadSeleccionada.cuota_mensual_actual)}`}
              highlight
            />
          </div>
        </SectionCard>
      )}

      {cargos.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
            <InfoBox
              label="Total facturado"
              value={`RD$ ${dinero(totalFacturado)}`}
              tone="blue"
            />

            <InfoBox
              label="Total pagado"
              value={`RD$ ${dinero(totalPagado)}`}
              tone="emerald"
            />

            <InfoBox
              label="Balance pendiente"
              value={`RD$ ${dinero(balancePendiente)}`}
              tone="red"
            />

            <InfoBox
              label="Meses pagados"
              value={`${mesesPagados}`}
              tone="emerald"
            />

            <InfoBox
              label="Meses pendientes"
              value={`${mesesPendientes}`}
              tone="yellow"
            />
          </div>

          <SectionCard
            title={`Estado de cuenta detallado ${
              unidadSeleccionada ? `- ${unidadSeleccionada.codigo}` : ""
            }`}
            subtitle="Detalle de cargos, pagos, balances y estado por período."
            action={
              <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                Registros: {cargos.length}
              </div>
            }
          >
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Período</th>
                  <th className="px-4 py-3 text-left">Concepto</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-right">Facturado</th>
                  <th className="px-4 py-3 text-right">Pagado</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {cargos.map((c) => (
                  <tr key={c.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 font-black">
                      {c.periodo || "-"}
                    </td>

                    <td className="min-w-64 px-4 py-3">
                      {c.concepto || "-"}
                    </td>

                    <td className="px-4 py-3">{c.tipo_cargo || "-"}</td>

                    <td className="px-4 py-3 text-right font-bold text-blue-700">
                      RD$ {dinero(c.monto)}
                    </td>

                    <td className="px-4 py-3 text-right font-black text-emerald-700">
                      RD$ {dinero(c.monto_pagado)}
                    </td>

                    <td className="px-4 py-3 text-right font-black text-red-700">
                      RD$ {dinero(c.balance)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${claseEstado(
                          c.estado,
                        )}`}
                      >
                        {c.estado || "PENDIENTE"}
                      </span>
                    </td>
                  </tr>
                ))}

                <tr className="bg-slate-100 font-black">
                  <td className="px-4 py-3" colSpan={3}>
                    TOTAL
                  </td>

                  <td className="px-4 py-3 text-right text-blue-700">
                    RD$ {dinero(totalFacturado)}
                  </td>

                  <td className="px-4 py-3 text-right text-emerald-700">
                    RD$ {dinero(totalPagado)}
                  </td>

                  <td className="px-4 py-3 text-right text-red-700">
                    RD$ {dinero(balancePendiente)}
                  </td>

                  <td className="px-4 py-3 text-center">-</td>
                </tr>
              </tbody>
            </DataTable>
          </SectionCard>
        </>
      )}

      {!unidadSeleccionada && !loading && (
        <SectionCard
          title="Estado de cuenta"
          subtitle="Seleccione un apartamento para consultar su estado."
        >
          <EmptyState
            title="Seleccione un apartamento"
            description="Al seleccionar una unidad, el sistema mostrará sus cargos, pagos y balance pendiente."
          />
        </SectionCard>
      )}

      <style jsx global>{`
        @media print {
          nav,
          aside,
          header,
          .print-hidden {
            display: none !important;
          }

          body {
            background: white !important;
          }
        }
      `}</style>
    </PageContainer>
  );
}

function InfoBox({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "blue" | "emerald" | "red" | "yellow";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : tone === "emerald"
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : tone === "red"
          ? "bg-red-50 text-red-700 border-red-100"
          : tone === "yellow"
            ? "bg-yellow-50 text-yellow-700 border-yellow-100"
            : "bg-white text-slate-800 border-slate-200";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2 className="mt-2 text-2xl font-black">{value}</h2>
    </div>
  );
}

function InfoLine({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p
        className={`mt-1 text-sm font-black ${
          highlight ? "text-blue-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}