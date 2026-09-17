"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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

const MODULO_NOMBRE = "Estado de Cuenta de Cargos";
const MODULO_VERSION = "v1.2.3";
const MODULO_FECHA = "16/09/2026";

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
  monto: number | null;
  monto_pagado: number | null;
  balance: number | null;
  estado: string | null;
  fecha_pago: string | null;
  fecha_fuente?: "APLICACION" | "IDENTIFICADO" | "PERIODO" | "NO_VINCULADA";
  fechas_multiples?: number;
};

type PagoReal = {
  id: number;
  fecha_pago: string | null;
  monto: number | null;
  periodo: string | null;
  referencia: string | null;
  descripcion: string | null;
  origen: string | null;
  pago_identificado_id: number | null;
  periodo_identificado?: string | null;
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

function formatoFecha(fecha: string | null | undefined) {
  if (!fecha) return "-";

  const limpia = String(fecha).slice(0, 10);
  const [anio, mes, dia] = limpia.split("-");

  if (!anio || !mes || !dia) return String(fecha);

  return `${dia}/${mes}/${anio}`;
}

function periodoBonito(periodo: string | null | undefined) {
  if (!periodo) return "-";

  const [anio, mes] = String(periodo).split("-");
  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const indice = Number(mes || 0) - 1;
  if (!anio || indice < 0 || indice > 11) return String(periodo);

  return `${meses[indice]} ${anio}`;
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
  const [impresionMontada, setImpresionMontada] = useState(false);

  useEffect(() => {
    setImpresionMontada(true);
  }, []);

  const [unidadId, setUnidadId] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [cargandoBase, setCargandoBase] = useState(false);
  const [saldoFavorDisponible, setSaldoFavorDisponible] = useState(0);
  const [pagosReales, setPagosReales] = useState<PagoReal[]>([]);
  const [alertaFechas, setAlertaFechas] = useState("");

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
    setSaldoFavorDisponible(0);
    setPagosReales([]);
    setAlertaFechas("");
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
    setPagosReales([]);
    setSaldoFavorDisponible(0);
    setAlertaFechas("");

    try {
      const { data, error } = await supabase
        .from("cargos_periodicos")
        .select("id, periodo, concepto, monto, monto_pagado, balance, estado")
        .eq("condominio_id", Number(condominioId))
        .eq("unidad_id", Number(unidadConsulta))
        .order("periodo", { ascending: true });

      if (error) throw new Error("Error consultando cargos: " + error.message);
      const cargosBase = (data || []) as Omit<Cargo, "fecha_pago">[];
      if (!cargosBase.length) {
        setMensaje("No hay cargos registrados para esta unidad.");
        return;
      }

      const [pagosResult, aplicacionesResult, creditosResult] = await Promise.all([
        supabase
          .from("pagos")
          .select("id, fecha_pago, monto, periodo, referencia, descripcion, origen, pago_identificado_id")
          .eq("condominio_id", Number(condominioId))
          .eq("unidad_id", Number(unidadConsulta))
          .order("fecha_pago", { ascending: true })
          .order("id", { ascending: true }),
        supabase
          .from("pagos_aplicaciones")
          .select("cargo_periodico_id, pago_id, monto_aplicado, observacion")
          .in("cargo_periodico_id", cargosBase.map((cargo) => Number(cargo.id))),
        supabase
          .from("creditos_propietarios")
          .select("monto_disponible")
          .eq("condominio_id", Number(condominioId))
          .eq("unidad_id", Number(unidadConsulta))
          .eq("estado", "DISPONIBLE")
          .gt("monto_disponible", 0),
      ]);

      if (pagosResult.error) throw new Error("Error consultando pagos reales: " + pagosResult.error.message);
      if (aplicacionesResult.error) throw new Error("Error consultando aplicaciones: " + aplicacionesResult.error.message);
      if (creditosResult.error) throw new Error("Error consultando créditos: " + creditosResult.error.message);

      const pagosUnidad = (pagosResult.data || []) as PagoReal[];
      const mapaPagos = new Map(pagosUnidad.map((pago) => [Number(pago.id), pago]));
      const identificadosIds = Array.from(new Set(pagosUnidad
        .map((pago) => Number(pago.pago_identificado_id || 0))
        .filter((id) => id > 0)));
      const identificados = new Map<number, { periodo: string | null; fecha_posteo: string | null }>();

      if (identificadosIds.length) {
        const { data: identificadosData, error: identificadosError } = await supabase
          .from("pagos_identificados")
          .select("id, periodo, fecha_posteo")
          .in("id", identificadosIds);
        if (identificadosError) {
          // No inventamos fechas si el identificador bancario no puede consultarse.
          setAlertaFechas("No se pudo consultar la identificación de algunos pagos bancarios. Revise el detalle de depósitos.");
        } else {
          (identificadosData || []).forEach((fila: any) => {
            identificados.set(Number(fila.id), {
              periodo: fila.periodo ? String(fila.periodo) : null,
              fecha_posteo: fila.fecha_posteo ? String(fila.fecha_posteo).slice(0, 10) : null,
            });
          });
        }
      }

      const fechasPorCargo = new Map<number, Array<{ fecha: string; origen: Cargo["fecha_fuente"] }>>();
      const pagosConAplicacion = new Set<number>();
      for (const aplicacion of (aplicacionesResult.data || []) as any[]) {
        const cargoId = Number(aplicacion.cargo_periodico_id || 0);
        const pagoId = Number(aplicacion.pago_id || 0);
        const pagoAsociado = mapaPagos.get(pagoId);
        if (!cargoId || !pagoAsociado) continue;
        pagosConAplicacion.add(pagoId);
        const fecha = String(pagoAsociado.fecha_pago || "").slice(0, 10);
        if (!fecha) continue;
        const lista = fechasPorCargo.get(cargoId) || [];
        lista.push({ fecha, origen: "APLICACION" });
        fechasPorCargo.set(cargoId, lista);
      }

      // Respaldo para cargos anteriores a pagos_aplicaciones: usar SOLO períodos
      // explícitos en el pago o en pagos_identificados; nunca deducir el mes
      // desde la fecha del banco ni repartir depósitos a meses arbitrarios.
      const cargoPorPeriodo = new Map<string, number[]>();
      for (const cargo of cargosBase) {
        const clave = String(cargo.periodo || "").trim();
        if (!clave) continue;
        cargoPorPeriodo.set(clave, [...(cargoPorPeriodo.get(clave) || []), cargo.id]);
      }
      for (const pagoReal of pagosUnidad) {
        if (pagosConAplicacion.has(Number(pagoReal.id))) continue;
        const identificacion = identificados.get(Number(pagoReal.pago_identificado_id || 0));
        const periodo = String(pagoReal.periodo || identificacion?.periodo || "").trim();
        const periodos = periodo.split(",").map((item) => item.trim()).filter(Boolean);
        // Sin asignación inequívoca no mostramos una fecha como si estuviera
        // vinculada al cargo: la fecha del depósito queda en el detalle real.
        if (periodos.length !== 1 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(periodos[0])) continue;
        const candidatos = cargoPorPeriodo.get(periodos[0]) || [];
        if (candidatos.length !== 1) continue;
        const fecha = String(pagoReal.fecha_pago || identificacion?.fecha_posteo || "").slice(0, 10);
        if (!fecha) continue;
        const cargoId = candidatos[0];
        // No atribuir el depósito completo a un solo cargo si supera mucho la
        // cuota y no existe distribución documental por períodos.
        const cargo = cargosBase.find((c) => c.id === cargoId);
        if (Number(pagoReal.monto || 0) > Number(cargo?.monto || 0) * 1.1) continue;
        const lista = fechasPorCargo.get(cargoId) || [];
        lista.push({ fecha, origen: pagoReal.periodo ? "PERIODO" : "IDENTIFICADO" });
        fechasPorCargo.set(cargoId, lista);
      }

      const cargosConFecha: Cargo[] = cargosBase.map((cargo) => {
        const vinculadas = fechasPorCargo.get(Number(cargo.id)) || [];
        const fechas = Array.from(new Set(vinculadas.map((item) => item.fecha))).sort();
        const fechaFuente = vinculadas.some((item) => item.origen === "APLICACION")
          ? "APLICACION"
          : vinculadas[0]?.origen || "NO_VINCULADA";
        return {
          ...cargo,
          fecha_pago: fechas.at(-1) || null,
          fecha_fuente: fechaFuente,
          fechas_multiples: fechas.length,
        };
      });

      setCargos(cargosConFecha);
      setPagosReales(pagosUnidad.map((registro) => ({
        ...registro,
        periodo_identificado: identificados.get(Number(registro.pago_identificado_id || 0))?.periodo || null,
      })));
      setSaldoFavorDisponible((creditosResult.data || []).reduce(
        (sum: number, credito: any) => sum + Number(credito.monto_disponible || 0), 0,
      ));
    } catch (error: any) {
      setMensaje(error?.message || "No se pudo consultar el estado de cuenta.");
    } finally {
      setLoading(false);
    }
  }

  async function refrescar() {
    if (!condominioId) return;
    // Refrescar no debe borrar la unidad escogida.
    await Promise.all([cargarUnidades(condominioId), cargarPropietarios(condominioId)]);
    if (unidadId) await consultarEstado(unidadId);
  }

  function limpiarConsulta() {
    setUnidadId("");
    setCargos([]);
    setSaldoFavorDisponible(0);
    setPagosReales([]);
    setAlertaFechas("");
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

  const totalAplicado = cargos.reduce(
    (sum, c) => sum + Number(c.monto_pagado || 0),
    0,
  );

  // Total recibido: cada registro de pagos se cuenta UNA sola vez, no por
  // cantidad de cargos cubiertos. No equivale a "aplicado + saldo disponible".
  const anioConsulta = useMemo(() => {
    const primerPeriodo = cargos.find((c) => c.periodo)?.periodo || "";
    return String(primerPeriodo).slice(0, 4) || String(new Date().getFullYear());
  }, [cargos]);

  const pagosDelAnio = pagosReales.filter((pago) =>
    String(pago.fecha_pago || "").startsWith(`${anioConsulta}-`),
  );
  const totalRecibido = pagosDelAnio.reduce(
    (sum, pago) => sum + Number(pago.monto || 0), 0,
  );

  const balancePendiente = cargos.reduce(
    (sum, c) => sum + Number(c.balance || 0),
    0,
  );

  const cantidadCargosPendientes = cargos.filter((cargo) => Number(cargo.balance || 0) > 0).length;
  const periodosConsultados = cargos.length
    ? `${cargos[0].periodo || "Sin período"} a ${cargos[cargos.length - 1].periodo || "Sin período"}`
    : "Sin períodos";
  const situacionFinanciera = balancePendiente > 0 ? "CON BALANCE PENDIENTE" : "AL DÍA";

  const fechasSinVinculo = cargos.filter((cargo) =>
    Number(cargo.monto_pagado || 0) > 0 && !cargo.fecha_pago,
  ).length;
  const fechaEmision = new Date().toLocaleDateString("es-DO", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <PageContainer>
      <div className="vam-screen-content">
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
        subtitle={`Consulta rediseñada de cargos generados, pagos aplicados, fecha real de pago y saldo a favor por apartamento. Condominio: ${
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
                setSaldoFavorDisponible(0);
                setPagosReales([]);
                setAlertaFechas("");
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
                    {u.codigo} - {" "}
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
          <SectionCard
            title={`Estado de cuenta de cargos del año ${anioConsulta}`}
            subtitle="Resumen basado en cargos generados, pagos aplicados y saldo a favor disponible."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <ResumenBox
                label={`Total recibido ${anioConsulta}`}
                value={`RD$ ${dinero(totalRecibido)}`}
                tone="slate"
              />

              <ResumenBox
                label="Aplicado a cargos generados"
                value={`RD$ ${dinero(totalAplicado)}`}
                tone="emerald"
              />

              <ResumenBox
                label="Saldo a favor disponible"
                value={`RD$ ${dinero(saldoFavorDisponible)}`}
                tone="blue"
              />
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-300">
              <DataTable>
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Período / concepto</th>
                    <th className="px-4 py-3 text-right">Cargo total</th>
                    <th className="px-4 py-3 text-right">Pago aplicado</th>
                    <th className="px-4 py-3 text-center">Fecha real pago</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {cargos.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 align-top">
                        <div className="font-black text-slate-900">
                          {periodoBonito(c.periodo)}
                        </div>
                        <div className="text-sm text-slate-600">
                          {c.concepto || `Mantenimiento ${c.periodo || ""}`}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        RD$ {dinero(c.monto)}
                      </td>

                      <td className="px-4 py-3 text-right font-black text-emerald-700">
                        RD$ {dinero(c.monto_pagado)}
                      </td>

                      <td className="px-4 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">
                        {c.fecha_pago ? formatoFecha(c.fecha_pago) : (
                          <span className="text-xs font-medium text-amber-700" title="No existe relación verificable entre depósito y cargo; revise el detalle de depósitos.">
                            Sin vincular
                          </span>
                        )}
                        {Number(c.fechas_multiples || 0) > 1 && (
                          <div className="text-[10px] font-normal text-slate-500">Último de {c.fechas_multiples} abonos</div>
                        )}
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

                  <tr className="bg-slate-100 font-black text-slate-900">
                    <td className="px-4 py-3">TOTALES</td>
                    <td className="px-4 py-3 text-right text-slate-900">
                      RD$ {dinero(totalFacturado)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700">
                      RD$ {dinero(totalAplicado)}
                    </td>
                    <td className="px-4 py-3 text-center">-</td>
                    <td className="px-4 py-3 text-right text-red-700">
                      RD$ {dinero(balancePendiente)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {balancePendiente <= 0 ? "Al día" : "Con balance pendiente"}
                    </td>
                  </tr>
                </tbody>
              </DataTable>
            </div>

            {(fechasSinVinculo > 0 || alertaFechas) && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                {alertaFechas || `${fechasSinVinculo} período(s) pagado(s) sin fecha vinculada de forma verificable.`}
                {" "}No se asignan fechas por aproximación. Consulte los depósitos reales que aparecen debajo.
              </p>
            )}

            <div className="mt-5 rounded-xl border border-slate-200 p-4">
              <h3 className="mb-1 text-sm font-black uppercase text-slate-900">Depósitos registrados en {anioConsulta}</h3>
              <p className="mb-3 text-xs text-slate-600">Cada pago aparece una sola vez. La fecha corresponde al dinero recibido, aunque se haya aplicado a varios meses.</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-xs">
                  <thead className="bg-slate-100 text-left text-slate-700">
                    <tr><th className="px-3 py-2">Fecha depósito</th><th className="px-3 py-2">Pago ID</th><th className="px-3 py-2">Referencia</th><th className="px-3 py-2">Período en pagos</th><th className="px-3 py-2 text-right">Monto real</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagosDelAnio.map((registro) => (
                      <tr key={registro.id}>
                        <td className="px-3 py-2">{formatoFecha(registro.fecha_pago)}</td>
                        <td className="px-3 py-2">{registro.id}</td>
                        <td className="px-3 py-2 break-all">{registro.referencia || "-"}</td>
                        <td className="px-3 py-2">{registro.periodo || registro.periodo_identificado || "Sin período identificado"}</td>
                        <td className="px-3 py-2 text-right font-bold">RD$ {dinero(registro.monto)}</td>
                      </tr>
                    ))}
                    {!pagosDelAnio.length && <tr><td colSpan={5} className="p-3 text-center">No hay depósitos registrados en este año.</td></tr>}
                  </tbody>
                  <tfoot className="bg-slate-100 font-black"><tr><td colSpan={4} className="px-3 py-2">TOTAL RECIBIDO</td><td className="px-3 py-2 text-right">RD$ {dinero(totalRecibido)}</td></tr></tfoot>
                </table>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                {MODULO_NOMBRE} · {MODULO_VERSION} · {MODULO_FECHA}
              </div>
            </div>
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
            description="Al seleccionar una unidad, el sistema mostrará sus cargos generados, pagos aplicados, fecha real de pago y saldo pendiente."
          />
        </SectionCard>
      )}

      </div>

      {/* Se monta fuera del diseño administrativo para imprimir sin encabezados superpuestos. */}
      {impresionMontada && cargos.length > 0 && unidadSeleccionada && createPortal(
        <article className="vam-print-sheet" aria-label="Estado de cuenta financiero imprimible del propietario">
          <div className="vam-print-heading">
            <div>
              <p className="vam-brand">VAM <span>ADMINISTRADORA DE CONDOMINIOS</span></p>
              <h1>ESTADO DE CUENTA</h1>
              <p className="vam-print-subtitle">Estado financiero del propietario</p>
              <p className="vam-print-condo"><strong>CONDOMINIO:</strong> {condominioNombre || (condominioId ? `Condominio ID ${condominioId}` : "Condominio no seleccionado")}</p>
              <p className="vam-print-range">Períodos consultados: {periodosConsultados}</p>
            </div>
            <div className="vam-document-meta">
              <strong>Fecha de emisión</strong><br />{fechaEmision}<br />
              <strong>Apartamento</strong><br />{unidadSeleccionada.codigo}
            </div>
          </div>

          <div className="vam-print-owner">
            <div><small>PROPIETARIO</small><strong>{propietarioSeleccionado?.nombre_propietario || "No registrado"}</strong></div>
            <div><small>APARTAMENTO</small><strong>{unidadSeleccionada.codigo}</strong></div>
            <div><small>CUOTA MENSUAL ACTUAL</small><strong>RD$ {dinero(unidadSeleccionada.cuota_mensual_actual)}</strong></div>
          </div>

          <div className={`vam-print-status ${balancePendiente > 0 ? "vam-print-status-due" : "vam-print-status-current"}`}>
            <span>SITUACIÓN FINANCIERA: <strong>{situacionFinanciera}</strong></span>
            <span>Saldo pendiente: <strong>RD$ {dinero(balancePendiente)}</strong></span>
          </div>

          <h2>RESUMEN FINANCIERO</h2>
          <div className="vam-print-metrics">
            <div><small>Total facturado (cargos consultados)</small><strong>RD$ {dinero(totalFacturado)}</strong></div>
            <div><small>Aplicado a esos cargos</small><strong>RD$ {dinero(totalAplicado)}</strong></div>
            <div><small>Balance pendiente de cargos</small><strong>RD$ {dinero(balancePendiente)}</strong></div>
            <div><small>Depósitos recibidos en {anioConsulta}</small><strong>RD$ {dinero(totalRecibido)}</strong></div>
            <div><small>Saldo a favor disponible</small><strong>RD$ {dinero(saldoFavorDisponible)}</strong></div>
            <div><small>Cargos con balance pendiente</small><strong>{cantidadCargosPendientes}</strong></div>
          </div>

          <h2>DETALLE DEL ESTADO DE CUENTA POR PERÍODO</h2>
          <table className="vam-print-table">
            <thead><tr>
              <th>Período</th><th>Concepto</th><th>Facturado RD$</th><th>Aplicado RD$</th><th>Fecha pago*</th><th>Balance RD$</th><th>Estado</th>
            </tr></thead>
            <tbody>
              {cargos.map((cargo) => (
                <tr key={cargo.id}>
                  <td>{periodoBonito(cargo.periodo)}</td>
                  <td>{cargo.concepto || "Mantenimiento"}</td>
                  <td className="vam-num">{dinero(cargo.monto)}</td>
                  <td className="vam-num">{dinero(cargo.monto_pagado)}</td>
                  <td className="vam-center">
                    {cargo.fecha_pago ? formatoFecha(cargo.fecha_pago) : Number(cargo.monto_pagado || 0) > 0 ? "Sin vincular" : "—"}
                    {Number(cargo.fechas_multiples || 0) > 1 ? ` (último de ${cargo.fechas_multiples})` : ""}
                  </td>
                  <td className="vam-num">{dinero(cargo.balance)}</td>
                  <td className="vam-center">{cargo.estado || "PENDIENTE"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr>
              <td colSpan={2}>TOTALES DE CARGOS</td><td className="vam-num">{dinero(totalFacturado)}</td>
              <td className="vam-num">{dinero(totalAplicado)}</td><td>—</td>
              <td className="vam-num">{dinero(balancePendiente)}</td>
              <td className="vam-center">{balancePendiente <= 0 ? "Al día" : "Con deuda"}</td>
            </tr></tfoot>
          </table>

          <div className="vam-print-note">
            <strong>Notas de lectura:</strong> El total facturado, lo aplicado y el balance se obtienen de los cargos consultados; los depósitos recibidos se suman una sola vez por pago y corresponden al año bancario indicado. Por diferencia de períodos, anticipos o registros históricos, el total recibido no necesariamente coincide con el total aplicado.
            {fechasSinVinculo > 0 ? ` ${fechasSinVinculo} cargo(s) pagado(s) no tienen fecha de depósito vinculada de forma inequívoca: la fecha se indica como «Sin vincular» para evitar atribuir fechas supuestas.` : ""}
            {alertaFechas ? ` Advertencia de consulta: ${alertaFechas}` : ""}
            El saldo a favor se muestra por separado y no equivale a pagar cargos futuros hasta su aplicación.
          </div>
          <div className="vam-print-footer">
            <span>VAM Administradora de Condominios · 829-792-9292</span>
            <span>{MODULO_NOMBRE} · {MODULO_VERSION} · {MODULO_FECHA}</span>
          </div>
        </article>,
        document.body,
      )}

      <style jsx global>{`
        .vam-print-sheet { display: none; }
        @media print {
          @page { size: letter portrait; margin: 0.38in; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; color: #14243a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          /* Ocultar por completo el dashboard y su encabezado VAM Enterprise. */
          body > *:not(.vam-print-sheet) { display: none !important; }
          body > .vam-print-sheet { display: block !important; }
          .vam-screen-content { display: none !important; }
          .vam-print-sheet { display: block !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; font-family: Arial, sans-serif; font-size: 9px; line-height: 1.25; }
          .vam-print-heading { display: flex; justify-content: space-between; align-items: start; gap: 14px; border-bottom: 2px solid #10294d; padding-bottom: 9px; margin-bottom: 10px; break-inside: avoid; }
          .vam-brand { margin: 0 0 5px; font-size: 17px; font-weight: 900; color: #153f81; letter-spacing: 1px; }
          .vam-brand span { font-size: 8px; color: #334155; letter-spacing: 0.3px; }
          .vam-print-heading h1 { margin: 0; font-size: 17px; letter-spacing: 0.5px; font-weight: 900; color: #10294d; }
          .vam-print-heading p { margin: 4px 0 0; }
          .vam-print-subtitle { font-size: 10px; font-weight: 700; color: #334155; }
          .vam-print-condo { font-size: 11px; font-weight: 800; color: #10294d; overflow-wrap: anywhere; }
          .vam-print-condo strong { font-size: 8px; letter-spacing: 0.3px; color: #475569; }
          .vam-document-meta { text-align: right; min-width: 105px; line-height: 1.6; }
          .vam-print-owner { display: grid; grid-template-columns: 2fr 0.7fr 1fr; gap: 6px; margin: 9px 0; break-inside: avoid; }
          .vam-print-owner > div, .vam-print-metrics > div { border: 1px solid #cbd5e1; padding: 7px; border-radius: 3px; }
          .vam-print-owner small, .vam-print-metrics small { display: block; font-size: 7px; color: #475569; font-weight: 700; margin-bottom: 3px; }
          .vam-print-owner strong, .vam-print-metrics strong { font-size: 10px; display: block; }
          .vam-print-status { display: flex; justify-content: space-between; gap: 9px; padding: 7px 9px; margin: 10px 0; border: 1px solid #a5b4c7; font-size: 10px; break-inside: avoid; }
          .vam-print-status-due { background: #fff4f2 !important; border-color: #f4b4aa; color: #991b1b; }
          .vam-print-status-current { background: #ecfdf5 !important; border-color: #a7f3d0; color: #065f46; }
          .vam-print-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 7px 0 11px; break-inside: avoid; }
          .vam-print-metrics > div:nth-child(3) { background: #fff4f2 !important; }
          .vam-print-metrics > div:nth-child(5) { background: #eff6ff !important; }
          .vam-print-range { font-size: 8px; color: #475569; }
          .vam-print-sheet h2 { font-size: 9px; font-weight: 900; margin: 10px 0 5px; border-bottom: 1px solid #94a3b8; padding-bottom: 3px; }
          .vam-print-table { width: 100%; border-collapse: collapse; table-layout: auto; font-size: 8px; }
          .vam-print-table th, .vam-print-table td { border: 1px solid #cbd5e1; padding: 4px 3px; vertical-align: top; }
          .vam-print-table thead { display: table-header-group; }
          .vam-print-table th { background: #eaf0f7 !important; font-weight: 800; text-align: left; }
          .vam-print-table tfoot { background: #eaf0f7 !important; font-weight: 900; }
          .vam-print-table tr { break-inside: avoid; page-break-inside: avoid; }
          .vam-print-sheet h2 { break-after: avoid; page-break-after: avoid; }
          .vam-print-table { break-before: avoid; }
          .vam-print-note, .vam-print-footer { break-inside: avoid; page-break-inside: avoid; }
          .vam-num { text-align: right; white-space: nowrap; }
          .vam-center { text-align: center; white-space: nowrap; }
          .vam-print-note { margin: 9px 0 0; font-size: 7px; color: #475569; }
          .vam-print-footer { margin-top: 12px; padding-top: 6px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; gap: 10px; font-size: 7px; color: #475569; }
        }
      `}</style>
    </PageContainer>
  );
}

function ResumenBox({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "blue" | "emerald";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : tone === "emerald"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-80">
        {label}
      </p>
      <h2 className="mt-2 text-3xl font-black">{value}</h2>
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
