"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BarChart3,
  CreditCard,
  Download,
  FileSpreadsheet,
  Landmark,
  MessageSquareText,
  RefreshCw,
  ReceiptText,
  Search,
  WalletCards,
} from "lucide-react";
import * as XLSX from "xlsx";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type CargoPendiente = {
  id: number;
  condominio_id: number;
  unidad_id: number;
  propietario_id: number | null;
  periodo: string | null;
  anio: number | null;
  mes: number | null;
  concepto: string | null;
  tipo_cargo: string | null;
  monto: number | null;
  monto_pagado: number | null;
  balance: number | null;
  estado: string | null;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
};

type UnidadInfo = {
  id: number;
  codigo: string | null;
  propietario_nombre: string | null;
  propietario_cedula: string | null;
  propietario_telefono: string | null;
  propietario_id: number | null;
  cuota_mensual_actual: number | null;
};

type PropietarioApartamento = {
  id: number;
  condominio_id: number | null;
  no_apartamento: string | null;
  nombre_propietario: string | null;
  cedula: string | null;
  telefono: string | null;
  correo: string | null;
  estado: string | null;
};

type PagoUltimo = {
  id: number;
  condominio_id: number;
  unidad_id: number;
  fecha_pago: string | null;
  monto: number | null;
  referencia: string | null;
  metodo_pago: string | null;
  metodo: string | null;
};

type MorosidadUnidad = {
  unidad_id: number;
  propietario_id: number | null;
  unidad: string;
  propietario: string;
  telefono: string;
  correo: string;
  balance_total: number;
  balance_vencido: number;
  cargos_pendientes: number;
  meses_vencidos: number;
  periodo_mas_antiguo: string;
  ultimo_pago_fecha: string;
  ultimo_pago_monto: number;
  estado: "AL_DIA" | "LEVE" | "MEDIO" | "CRITICO" | "LEGAL";
  cargos: CargoPendiente[];
};

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  });
}

function fechaCorta(valor?: string | null) {
  if (!valor) return "-";
  return String(valor).split("T")[0];
}

function normalizarTexto(valor: string | null | undefined) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function periodoTexto(valor?: string | null) {
  return valor || "-";
}

function obtenerEstado(mesesVencidos: number, balanceTotal: number): MorosidadUnidad["estado"] {
  if (balanceTotal <= 0) return "AL_DIA";
  if (mesesVencidos >= 6) return "LEGAL";
  if (mesesVencidos >= 3) return "CRITICO";
  if (mesesVencidos === 2) return "MEDIO";
  return "LEVE";
}

function estadoLabel(estado: MorosidadUnidad["estado"]) {
  if (estado === "AL_DIA") return "Al día";
  if (estado === "LEVE") return "Moroso leve";
  if (estado === "MEDIO") return "Moroso medio";
  if (estado === "CRITICO") return "Moroso crítico";
  return "Legal / Junta";
}

export default function MorosidadPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [cargos, setCargos] = useState<CargoPendiente[]>([]);
  const [pagos, setPagos] = useState<PagoUltimo[]>([]);
  const [unidades, setUnidades] = useState<UnidadInfo[]>([]);
  const [propietarios, setPropietarios] = useState<PropietarioApartamento[]>([]);
  const [loading, setLoading] = useState(false);

  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [filtroMeses, setFiltroMeses] = useState("TODOS");
  const [hastaPeriodo, setHastaPeriodo] = useState(() => {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    return `${anio}-${mes}`;
  });

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarMorosidad(id);
  }, []);

  async function cargarMorosidad(id = condominioId) {
    if (!id) return;

    setLoading(true);

    const { data: dataCargos, error: errorCargos } = await supabase
      .from("cargos_periodicos")
      .select(
        "id, condominio_id, unidad_id, propietario_id, periodo, anio, mes, concepto, tipo_cargo, monto, monto_pagado, balance, estado, fecha_emision, fecha_vencimiento",
      )
      .eq("condominio_id", Number(id))
      .gt("balance", 0)
      .order("unidad_id", { ascending: true })
      .order("periodo", { ascending: true });

    if (errorCargos) {
      setLoading(false);
      alert("Error cargando cargos pendientes: " + errorCargos.message);
      return;
    }

    const unidadIds = Array.from(
      new Set(((dataCargos as CargoPendiente[]) || []).map((c) => c.unidad_id).filter(Boolean)),
    );

    let dataUnidades: UnidadInfo[] = [];

    if (unidadIds.length > 0) {
      const { data: unidadesData, error: errorUnidades } = await supabase
        .from("unidades")
        .select("id, codigo, propietario_nombre, propietario_cedula, propietario_telefono, propietario_id, cuota_mensual_actual")
        .eq("condominio_id", Number(id))
        .in("id", unidadIds);

      if (errorUnidades) {
        setLoading(false);
        alert("Error cargando unidades: " + errorUnidades.message);
        return;
      }

      dataUnidades = (unidadesData as UnidadInfo[]) || [];
    }

    const { data: propietariosData, error: errorPropietarios } = await supabase
      .from("propietarios_apartamentos")
      .select(
        "id, condominio_id, no_apartamento, nombre_propietario, cedula, telefono, correo, estado",
      )
      .eq("condominio_id", Number(id));

    if (errorPropietarios) {
      setLoading(false);
      alert("Error cargando propietarios: " + errorPropietarios.message);
      return;
    }

    const dataPropietarios = (propietariosData as PropietarioApartamento[]) || [];

    const { data: dataPagos, error: errorPagos } = await supabase
      .from("pagos")
      .select("id, condominio_id, unidad_id, fecha_pago, monto, referencia, metodo_pago, metodo")
      .eq("condominio_id", Number(id))
      .order("fecha_pago", { ascending: false })
      .limit(1000);

    setLoading(false);

    if (errorPagos) {
      alert("Error cargando últimos pagos: " + errorPagos.message);
      return;
    }

    setCargos((dataCargos as CargoPendiente[]) || []);
    setUnidades(dataUnidades);
    setPropietarios(dataPropietarios);
    setPagos((dataPagos as PagoUltimo[]) || []);
  }

  const ultimoPagoPorUnidad = useMemo(() => {
    const mapa = new Map<number, PagoUltimo>();

    pagos.forEach((p) => {
      if (!p.unidad_id) return;
      if (!mapa.has(p.unidad_id)) mapa.set(p.unidad_id, p);
    });

    return mapa;
  }, [pagos]);

  const unidadPorId = useMemo(() => {
    const mapa = new Map<number, UnidadInfo>();

    unidades.forEach((u) => {
      if (u.id) mapa.set(Number(u.id), u);
    });

    return mapa;
  }, [unidades]);

  const propietarioPorApartamento = useMemo(() => {
    const mapa = new Map<string, PropietarioApartamento>();

    propietarios.forEach((p) => {
      const llave = normalizarTexto(p.no_apartamento);
      if (llave) mapa.set(llave, p);
    });

    return mapa;
  }, [propietarios]);

  const morosidad = useMemo(() => {
    const mapa = new Map<number, MorosidadUnidad>();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    cargos.forEach((cargo) => {
      const unidadId = Number(cargo.unidad_id || 0);
      if (!unidadId) return;

      const infoUnidad = unidadPorId.get(unidadId);
      const unidad = infoUnidad?.codigo || `Unidad ${unidadId}`;
      const infoPropietario = propietarioPorApartamento.get(normalizarTexto(unidad));

      const propietario =
        infoUnidad?.propietario_nombre ||
        infoPropietario?.nombre_propietario ||
        "Sin propietario";

      const telefono =
        infoUnidad?.propietario_telefono ||
        infoPropietario?.telefono ||
        "";

      const correo = infoPropietario?.correo || "";
      const balance = Number(cargo.balance || 0);
      const fechaVencimiento = cargo.fecha_vencimiento
        ? new Date(`${cargo.fecha_vencimiento}T00:00:00`)
        : null;
      const vencido =
        fechaVencimiento && fechaVencimiento.getTime() < hoy.getTime();

      if (!mapa.has(unidadId)) {
        const ultimoPago = ultimoPagoPorUnidad.get(unidadId);

        mapa.set(unidadId, {
          unidad_id: unidadId,
          propietario_id: cargo.propietario_id || null,
          unidad,
          propietario,
          telefono,
          correo,
          balance_total: 0,
          balance_vencido: 0,
          cargos_pendientes: 0,
          meses_vencidos: 0,
          periodo_mas_antiguo: cargo.periodo || "",
          ultimo_pago_fecha: ultimoPago?.fecha_pago || "",
          ultimo_pago_monto: Number(ultimoPago?.monto || 0),
          estado: "AL_DIA",
          cargos: [],
        });
      }

      const item = mapa.get(unidadId)!;
      item.balance_total += balance;
      item.balance_vencido += vencido ? balance : 0;
      item.cargos_pendientes += 1;
      item.meses_vencidos += vencido ? 1 : 0;
      item.periodo_mas_antiguo =
        !item.periodo_mas_antiguo ||
        String(cargo.periodo || "") < item.periodo_mas_antiguo
          ? cargo.periodo || ""
          : item.periodo_mas_antiguo;
      item.cargos.push(cargo);
    });

    return Array.from(mapa.values())
      .map((item) => ({
        ...item,
        estado: obtenerEstado(item.meses_vencidos, item.balance_total),
      }))
      .sort((a, b) => {
        if (b.meses_vencidos !== a.meses_vencidos) {
          return b.meses_vencidos - a.meses_vencidos;
        }
        return b.balance_total - a.balance_total;
      });
  }, [cargos, ultimoPagoPorUnidad, unidadPorId, propietarioPorApartamento]);

  const morosidadFiltrada = useMemo(() => {
    const filtro = normalizarTexto(buscar);

    return morosidad.filter((item) => {
      const texto = normalizarTexto(
        `${item.unidad} ${item.propietario} ${item.telefono} ${item.correo}`,
      );

      const coincideTexto = !filtro || texto.includes(filtro);
      const coincideEstado =
        filtroEstado === "TODOS" || item.estado === filtroEstado;

      let coincideMeses = true;
      if (filtroMeses === "1") coincideMeses = item.meses_vencidos === 1;
      if (filtroMeses === "2") coincideMeses = item.meses_vencidos === 2;
      if (filtroMeses === "3") coincideMeses = item.meses_vencidos >= 3;
      if (filtroMeses === "6") coincideMeses = item.meses_vencidos >= 6;

      const coincidePeriodo =
        !hastaPeriodo ||
        item.cargos.some((cargo) => String(cargo.periodo || "") <= hastaPeriodo);

      return coincideTexto && coincideEstado && coincideMeses && coincidePeriodo;
    });
  }, [morosidad, buscar, filtroEstado, filtroMeses, hastaPeriodo]);

  const resumen = useMemo(() => {
    const totalAdeudado = morosidadFiltrada.reduce(
      (acc, item) => acc + item.balance_total,
      0,
    );

    const totalVencido = morosidadFiltrada.reduce(
      (acc, item) => acc + item.balance_vencido,
      0,
    );

    return {
      totalAdeudado,
      totalVencido,
      morosos: morosidadFiltrada.length,
      leve: morosidadFiltrada.filter((i) => i.estado === "LEVE").length,
      medio: morosidadFiltrada.filter((i) => i.estado === "MEDIO").length,
      critico: morosidadFiltrada.filter(
        (i) => i.estado === "CRITICO" || i.estado === "LEGAL",
      ).length,
    };
  }, [morosidadFiltrada]);

  function exportarExcel() {
    if (morosidadFiltrada.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const dataExcel = morosidadFiltrada.map((item) => ({
      Condominio: condominioNombre,
      Unidad: item.unidad,
      Propietario: item.propietario,
      Teléfono: item.telefono,
      Correo: item.correo,
      "Último pago": fechaCorta(item.ultimo_pago_fecha),
      "Monto último pago": item.ultimo_pago_monto,
      "Periodo más antiguo": item.periodo_mas_antiguo,
      "Cargos pendientes": item.cargos_pendientes,
      "Meses vencidos": item.meses_vencidos,
      "Balance vencido": item.balance_vencido,
      "Balance total": item.balance_total,
      Estado: estadoLabel(item.estado),
    }));

    const hoja = XLSX.utils.json_to_sheet(dataExcel);
    hoja["!cols"] = [
      { wch: 35 },
      { wch: 14 },
      { wch: 35 },
      { wch: 18 },
      { wch: 30 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Morosidad");

    XLSX.writeFile(
      libro,
      `Morosidad_${(condominioNombre || condominioId || "Condominio").replaceAll(
        " ",
        "_",
      )}_${hastaPeriodo || "actual"}.xlsx`,
    );
  }

  return (
    <PageContainer>
      <ModuleMenu
        title="Finanzas"
        subtitle="Control financiero del condominio: pagos, gastos, solicitudes, caja chica, bancos, reportes y morosidad."
        tone="blue"
        items={[
          {
            href: "/finanzas",
            label: "Inicio finanzas",
            icon: WalletCards,
          },
          {
            href: "/pagos-mantenimiento",
            label: "Pagos",
            icon: CreditCard,
          },
          {
            href: "/gastos",
            label: "Gastos",
            icon: ReceiptText,
          },
          {
            href: "/banco",
            label: "Banco / Fondos",
            icon: Landmark,
          },
          {
            href: "/finanzas/morosidad",
            label: "Morosidad",
            icon: AlertTriangle,
          },
          {
            href: "/consulta-estado",
            label: "Estado de Cuenta",
            icon: ReceiptText,
          },
          {
            href: "/reportes",
            label: "Reportes",
            icon: BarChart3,
          },
        ]}
      />

      <ModuleToolbar
        title="Morosidad"
        subtitle={`Control de propietarios con balances pendientes, meses vencidos y seguimiento de cobros. Condominio: ${
          condominioNombre || "No seleccionado"
        }.`}
        icon={AlertTriangle}
        actions={
          <ModuleActions
            onRefresh={() => cargarMorosidad(condominioId)}
            extra={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={exportarExcel}
                  disabled={morosidadFiltrada.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Exportar Excel
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Imprimir
                </button>
              </div>
            }
          />
        }
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3 xl:grid-cols-6">
        <InfoBox label="Total adeudado" value={dinero(resumen.totalAdeudado)} tone="red" />
        <InfoBox label="Balance vencido" value={dinero(resumen.totalVencido)} tone="amber" />
        <InfoBox label="Unidades morosas" value={`${resumen.morosos}`} tone="slate" />
        <InfoBox label="Moroso leve" value={`${resumen.leve}`} tone="yellow" />
        <InfoBox label="Moroso medio" value={`${resumen.medio}`} tone="orange" />
        <InfoBox label="Crítico / Junta" value={`${resumen.critico}`} tone="black" />
      </div>

      <SectionCard
        title="Filtros de morosidad"
        subtitle="Filtre por período, unidad, propietario, estado o cantidad de meses vencidos."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Periodo hasta</label>
            <input
              type="month"
              value={hastaPeriodo}
              onChange={(e) => setHastaPeriodo(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="TODOS">Todos</option>
              <option value="LEVE">Moroso leve</option>
              <option value="MEDIO">Moroso medio</option>
              <option value="CRITICO">Moroso crítico</option>
              <option value="LEGAL">Legal / Junta</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Meses vencidos</label>
            <select
              value={filtroMeses}
              onChange={(e) => setFiltroMeses(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="TODOS">Todos</option>
              <option value="1">1 mes</option>
              <option value="2">2 meses</option>
              <option value="3">3 meses o más</option>
              <option value="6">6 meses o más</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Buscar</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="w-full rounded-xl border px-10 py-3 text-sm"
                placeholder="Unidad, propietario, teléfono..."
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Listado de morosidad"
        subtitle="Deuda agrupada por unidad y calculada desde cargos periódicos con balance pendiente."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : (
            <div className="rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-700">
              Registros: {morosidadFiltrada.length}
            </div>
          )
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500">Cargando morosidad...</p>
        ) : !condominioId ? (
          <EmptyState
            title="Condominio no identificado"
            description="No se encontró un condominio activo. Debe iniciar sesión nuevamente."
          />
        ) : morosidadFiltrada.length === 0 ? (
          <EmptyState
            title="Sin morosidad"
            description="No hay balances pendientes que coincidan con los filtros seleccionados."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Unidad</th>
                <th className="px-4 py-3 text-left">Propietario</th>
                <th className="px-4 py-3 text-left">Último pago</th>
                <th className="px-4 py-3 text-center">Meses</th>
                <th className="px-4 py-3 text-right">Vencido</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {morosidadFiltrada.map((item) => (
                <tr key={item.unidad_id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-900">{item.unidad}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Desde: {periodoTexto(item.periodo_mas_antiguo)}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{item.propietario}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.telefono || "Sin teléfono"}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-700">
                      {fechaCorta(item.ultimo_pago_fecha)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.ultimo_pago_monto > 0
                        ? dinero(item.ultimo_pago_monto)
                        : "Sin pago registrado"}
                    </p>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                      {item.meses_vencidos}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right font-bold text-amber-700">
                    {dinero(item.balance_vencido)}
                  </td>

                  <td className="px-4 py-3 text-right font-black text-red-700">
                    {dinero(item.balance_total)}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <EstadoMorosidadBadge estado={item.estado} />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-center gap-2">
                      <Link
                        href={`/consulta-estado?unidad_id=${item.unidad_id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800"
                      >
                        <ReceiptText className="h-3.5 w-3.5" />
                        Estado
                      </Link>

                      <Link
                        href={`/finanzas/morosidad/${item.unidad_id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        Detalle
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      <SectionCard
        title="Flujo recomendado de cobro"
        subtitle="Orden sugerido para gestionar la morosidad del condominio."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FlujoPaso
            numero="1"
            titulo="Revisar"
            descripcion="Validar balances pendientes y meses vencidos por unidad."
          />

          <FlujoPaso
            numero="2"
            titulo="Notificar"
            descripcion="Enviar estado de cuenta o aviso formal al propietario."
          />

          <FlujoPaso
            numero="3"
            titulo="Gestionar"
            descripcion="Registrar acuerdos, llamadas y seguimiento administrativo."
          />

          <FlujoPaso
            numero="4"
            titulo="Escalar"
            descripcion="Pasar casos críticos a junta, cierre de gas o proceso legal."
          />
        </div>
      </SectionCard>
    </PageContainer>
  );
}

function InfoBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "red" | "amber" | "slate" | "yellow" | "orange" | "black";
}) {
  const toneClass =
    tone === "red"
      ? "bg-red-50 text-red-700 border-red-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : tone === "yellow"
          ? "bg-yellow-50 text-yellow-700 border-yellow-100"
          : tone === "orange"
            ? "bg-orange-50 text-orange-700 border-orange-100"
            : tone === "black"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-800 border-slate-200";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2 className="mt-2 text-2xl font-black">{value}</h2>
    </div>
  );
}

function EstadoMorosidadBadge({ estado }: { estado: MorosidadUnidad["estado"] }) {
  const className =
    estado === "LEVE"
      ? "bg-yellow-50 text-yellow-700"
      : estado === "MEDIO"
        ? "bg-orange-50 text-orange-700"
        : estado === "CRITICO"
          ? "bg-red-50 text-red-700"
          : estado === "LEGAL"
            ? "bg-slate-900 text-white"
            : "bg-emerald-50 text-emerald-700";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${className}`}>
      {estadoLabel(estado)}
    </span>
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
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-700 text-sm font-black text-white">
        {numero}
      </div>

      <p className="font-black text-slate-900">{titulo}</p>

      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {descripcion}
      </p>
    </div>
  );
}
