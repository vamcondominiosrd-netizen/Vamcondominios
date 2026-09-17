"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarRange,
  CircleDollarSign,
  Gauge,
  Landmark,
  Loader2,
  RefreshCw,
  Scale,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";

type Presupuesto = {
  id: number;
  condominio_id: number;
  anio: number;
  nombre: string;
  estado: string | null;
};

type DetallePresupuesto = {
  id: number;
  presupuesto_id: number;
  condominio_id: number;
  categoria: string | null;
  concepto: string | null;
  monto_mensual_estimado: number | null;
  monto_anual_estimado: number | null;
};

type CargoPeriodico = {
  id: number;
  condominio_id: number;
  periodo: string | null;
  monto: number | null;
  monto_pagado: number | null;
  balance: number | null;
  estado: string | null;
};

type Pago = {
  id: number;
  condominio_id: number;
  fecha_pago: string | null;
  monto: number | null;
  tipo_fondo: string | null;
  origen: string | null;
};

type Gasto = {
  id: number;
  condominio_id: number;
  fecha: string | null;
  total: number | null;
  monto: number | null;
  categoria: string | null;
  estado: string | null;
};

type CuentaBancaria = {
  id: number;
  condominio_id: number;
  nombre_banco: string | null;
  numero_cuenta: string | null;
  balance_actual: number | null;
  fondo_tipo: string | null;
  fondo_ordinario: number | null;
  fondo_extraordinario: number | null;
  fondo_reserva: number | null;
};

type EstadoSalud = "SALUDABLE" | "ATENCION" | "ALERTA";

type ResumenMes = {
  mes: number;
  nombre: string;
  generado: number;
  cobrado: number;
  pendiente: number;
  recaudacion: number;
  gastos: number;
  presupuestoYTD: number;
  resultado: number;
};

function numero(valor: unknown): number {
  const n = Number(valor || 0);
  return Number.isFinite(n) ? n : 0;
}

function dinero(valor: unknown): string {
  return numero(valor).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function porcentaje(valor: number): string {
  return `${valor.toFixed(2)}%`;
}

function nombreMes(mes: number): string {
  const meses = [
    "",
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

  return meses[mes] || "";
}

function mesDesdePeriodo(periodo: string | null): number {
  if (!periodo) return 0;
  const partes = String(periodo).split("-");
  const mes = Number(partes[1] || 0);
  return mes >= 1 && mes <= 12 ? mes : 0;
}

function mesDesdeFecha(fecha: string | null): number {
  if (!fecha) return 0;
  const partes = String(fecha).slice(0, 10).split("-");
  const mes = Number(partes[1] || 0);
  return mes >= 1 && mes <= 12 ? mes : 0;
}

function montoGasto(gasto: Gasto): number {
  return numero(gasto.total || gasto.monto);
}

function claseEstado(estado: EstadoSalud) {
  if (estado === "SALUDABLE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (estado === "ATENCION") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-red-200 bg-red-50 text-red-800";
}

function textoEstado(estado: EstadoSalud) {
  if (estado === "SALUDABLE") return "Saludable";
  if (estado === "ATENCION") return "Atención";
  return "Alerta";
}

export default function ReporteGerencialFinancieroAnualPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mesCorte, setMesCorte] = useState(new Date().getMonth() + 1);

  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null);
  const [detallesPresupuesto, setDetallesPresupuesto] = useState<
    DetallePresupuesto[]
  >([]);
  const [cargos, setCargos] = useState<CargoPeriodico[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id || !Number(id)) {
      setMensaje("No se encontró el condominio activo.");
      setLoading(false);
      return;
    }

    void cargarTodo(id, anio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarTodo(id: string, anioSeleccionado: number) {
    setLoading(true);
    setMensaje("");

    try {
      await Promise.all([
        cargarPresupuesto(id, anioSeleccionado),
        cargarCargos(id, anioSeleccionado),
        cargarPagos(id, anioSeleccionado),
        cargarGastos(id, anioSeleccionado),
        cargarCuentas(id),
      ]);
    } catch (error: any) {
      setMensaje(
        error?.message || "No se pudo cargar el reporte gerencial financiero.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function cargarPresupuesto(id: string, anioSeleccionado: number) {
    const condominioIdNumero = Number(id);

    const { data, error } = await supabase
      .from("presupuesto_condominio")
      .select("id, condominio_id, anio, nombre, estado")
      .eq("condominio_id", condominioIdNumero)
      .eq("anio", anioSeleccionado)
      .order("id", { ascending: false });

    if (error) {
      throw new Error("Error cargando presupuesto: " + error.message);
    }

    const lista = (data || []) as Presupuesto[];

    if (lista.length === 0) {
      setPresupuesto(null);
      setDetallesPresupuesto([]);
      return;
    }

    const seleccionado =
      lista.find((item) => item.estado === "APROBADO") ||
      lista.find((item) => item.estado === "BORRADOR") ||
      lista[0];

    setPresupuesto(seleccionado);

    const { data: detalleData, error: detalleError } = await supabase
      .from("presupuesto_condominio_detalle")
      .select(
        `
        id,
        presupuesto_id,
        condominio_id,
        categoria,
        concepto,
        monto_mensual_estimado,
        monto_anual_estimado
      `,
      )
      .eq("condominio_id", condominioIdNumero)
      .eq("presupuesto_id", seleccionado.id);

    if (detalleError) {
      throw new Error(
        "Error cargando detalle del presupuesto: " + detalleError.message,
      );
    }

    setDetallesPresupuesto(
      ((detalleData || []) as DetallePresupuesto[]).filter(
        (item) =>
          Number(item.condominio_id) === condominioIdNumero &&
          Number(item.presupuesto_id) === Number(seleccionado.id),
      ),
    );
  }

  async function cargarCargos(id: string, anioSeleccionado: number) {
    const desde = `${anioSeleccionado}-01`;
    const hasta = `${anioSeleccionado}-12`;

    const { data, error } = await supabase
      .from("cargos_periodicos")
      .select(
        "id, condominio_id, periodo, monto, monto_pagado, balance, estado",
      )
      .eq("condominio_id", Number(id))
      .gte("periodo", desde)
      .lte("periodo", hasta)
      .order("periodo", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw new Error("Error cargando cargos periódicos: " + error.message);
    }

    setCargos((data || []) as CargoPeriodico[]);
  }

  async function cargarPagos(id: string, anioSeleccionado: number) {
    const fechaInicio = `${anioSeleccionado}-01-01`;
    const fechaFin = `${anioSeleccionado + 1}-01-01`;

    const { data, error } = await supabase
      .from("pagos")
      .select("id, condominio_id, fecha_pago, monto, tipo_fondo, origen")
      .eq("condominio_id", Number(id))
      .gte("fecha_pago", fechaInicio)
      .lt("fecha_pago", fechaFin)
      .order("fecha_pago", { ascending: true });

    if (error) {
      throw new Error("Error cargando pagos: " + error.message);
    }

    setPagos((data || []) as Pago[]);
  }

  async function cargarGastos(id: string, anioSeleccionado: number) {
    const fechaInicio = `${anioSeleccionado}-01-01`;
    const fechaFin = `${anioSeleccionado + 1}-01-01`;

    const { data, error } = await supabase
      .from("gastos")
      .select(
        "id, condominio_id, fecha, total, monto, categoria, estado",
      )
      .eq("condominio_id", Number(id))
      .gte("fecha", fechaInicio)
      .lt("fecha", fechaFin)
      .order("fecha", { ascending: true });

    if (error) {
      throw new Error("Error cargando gastos reales: " + error.message);
    }

    setGastos((data || []) as Gasto[]);
  }

  async function cargarCuentas(id: string) {
    const { data, error } = await supabase
      .from("cuentas_bancarias")
      .select(
        `
        id,
        condominio_id,
        nombre_banco,
        numero_cuenta,
        balance_actual,
        fondo_tipo,
        fondo_ordinario,
        fondo_extraordinario,
        fondo_reserva
      `,
      )
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("id", { ascending: true });

    if (error) {
      throw new Error("Error cargando cuentas bancarias: " + error.message);
    }

    setCuentas((data || []) as CuentaBancaria[]);
  }

  async function cambiarAnio(valor: number) {
    setAnio(valor);

    const hoy = new Date();
    if (valor === hoy.getFullYear()) {
      setMesCorte(hoy.getMonth() + 1);
    } else {
      setMesCorte(12);
    }

    if (!condominioId || !Number(condominioId)) return;
    await cargarTodo(condominioId, valor);
  }

  async function refrescar() {
    if (!condominioId || !Number(condominioId)) return;
    await cargarTodo(condominioId, anio);
  }

  const cargosYTD = useMemo(
    () =>
      cargos.filter((cargo) => {
        const mes = mesDesdePeriodo(cargo.periodo);
        return mes > 0 && mes <= mesCorte;
      }),
    [cargos, mesCorte],
  );

  const pagosYTD = useMemo(
    () =>
      pagos.filter((pago) => {
        const mes = mesDesdeFecha(pago.fecha_pago);
        return mes > 0 && mes <= mesCorte;
      }),
    [pagos, mesCorte],
  );

  const gastosYTD = useMemo(
    () =>
      gastos.filter((gasto) => {
        const mes = mesDesdeFecha(gasto.fecha);
        return mes > 0 && mes <= mesCorte;
      }),
    [gastos, mesCorte],
  );

  const totalGenerado = useMemo(
    () => cargosYTD.reduce((sum, cargo) => sum + numero(cargo.monto), 0),
    [cargosYTD],
  );

  const totalCobradoPorCargos = useMemo(
    () =>
      cargosYTD.reduce(
        (sum, cargo) => sum + numero(cargo.monto_pagado),
        0,
      ),
    [cargosYTD],
  );

  const totalPagosRecibidos = useMemo(
    () => pagosYTD.reduce((sum, pago) => sum + numero(pago.monto), 0),
    [pagosYTD],
  );

  const totalPendiente = useMemo(
    () => cargosYTD.reduce((sum, cargo) => sum + numero(cargo.balance), 0),
    [cargosYTD],
  );

  const totalGastos = useMemo(
    () => gastosYTD.reduce((sum, gasto) => sum + montoGasto(gasto), 0),
    [gastosYTD],
  );

  const presupuestoMensual = useMemo(
    () =>
      detallesPresupuesto.reduce(
        (sum, detalle) => sum + numero(detalle.monto_mensual_estimado),
        0,
      ),
    [detallesPresupuesto],
  );

  const presupuestoYTD = presupuestoMensual * mesCorte;

  const recaudacion =
    totalGenerado > 0 ? (totalCobradoPorCargos / totalGenerado) * 100 : 0;

  const resultadoOperativo = totalPagosRecibidos - totalGastos;

  const desviacionPresupuesto = totalGastos - presupuestoYTD;

  const desviacionPresupuestoPct =
    presupuestoYTD > 0 ? (desviacionPresupuesto / presupuestoYTD) * 100 : 0;

  const balanceBanco = useMemo(
    () => cuentas.reduce((sum, cuenta) => sum + numero(cuenta.balance_actual), 0),
    [cuentas],
  );

  const fondoOrdinario = useMemo(
    () =>
      cuentas.reduce(
        (sum, cuenta) =>
          sum +
          (numero(cuenta.fondo_ordinario) > 0
            ? numero(cuenta.fondo_ordinario)
            : String(cuenta.fondo_tipo || "").toUpperCase() === "ORDINARIO"
              ? numero(cuenta.balance_actual)
              : 0),
        0,
      ),
    [cuentas],
  );

  const fondoExtraordinario = useMemo(
    () =>
      cuentas.reduce(
        (sum, cuenta) =>
          sum +
          (numero(cuenta.fondo_extraordinario) > 0
            ? numero(cuenta.fondo_extraordinario)
            : String(cuenta.fondo_tipo || "").toUpperCase() ===
                "EXTRAORDINARIO"
              ? numero(cuenta.balance_actual)
              : 0),
        0,
      ),
    [cuentas],
  );

  const fondoReserva = useMemo(
    () =>
      cuentas.reduce(
        (sum, cuenta) =>
          sum +
          (numero(cuenta.fondo_reserva) > 0
            ? numero(cuenta.fondo_reserva)
            : String(cuenta.fondo_tipo || "").toUpperCase() === "RESERVA"
              ? numero(cuenta.balance_actual)
              : 0),
        0,
      ),
    [cuentas],
  );

  const estadoSalud: EstadoSalud = useMemo(() => {
    if (
      recaudacion < 80 ||
      desviacionPresupuestoPct > 10 ||
      resultadoOperativo < 0
    ) {
      return "ALERTA";
    }

    if (
      recaudacion < 90 ||
      desviacionPresupuestoPct > 5 ||
      resultadoOperativo < totalPagosRecibidos * 0.05
    ) {
      return "ATENCION";
    }

    return "SALUDABLE";
  }, [
    recaudacion,
    desviacionPresupuestoPct,
    resultadoOperativo,
    totalPagosRecibidos,
  ]);

  const resumenMensual = useMemo<ResumenMes[]>(() => {
    const resultado: ResumenMes[] = [];

    for (let mes = 1; mes <= mesCorte; mes += 1) {
      const cargosMes = cargos.filter(
        (cargo) => mesDesdePeriodo(cargo.periodo) === mes,
      );

      const pagosMes = pagos.filter(
        (pago) => mesDesdeFecha(pago.fecha_pago) === mes,
      );

      const gastosMes = gastos.filter(
        (gasto) => mesDesdeFecha(gasto.fecha) === mes,
      );

      const generado = cargosMes.reduce(
        (sum, cargo) => sum + numero(cargo.monto),
        0,
      );

      const cobrado = cargosMes.reduce(
        (sum, cargo) => sum + numero(cargo.monto_pagado),
        0,
      );

      const pendiente = cargosMes.reduce(
        (sum, cargo) => sum + numero(cargo.balance),
        0,
      );

      const ingresosCaja = pagosMes.reduce(
        (sum, pago) => sum + numero(pago.monto),
        0,
      );

      const gastosReal = gastosMes.reduce(
        (sum, gasto) => sum + montoGasto(gasto),
        0,
      );

      resultado.push({
        mes,
        nombre: nombreMes(mes),
        generado,
        cobrado,
        pendiente,
        recaudacion: generado > 0 ? (cobrado / generado) * 100 : 0,
        gastos: gastosReal,
        presupuestoYTD: presupuestoMensual,
        resultado: ingresosCaja - gastosReal,
      });
    }

    return resultado;
  }, [cargos, pagos, gastos, mesCorte, presupuestoMensual]);

  if (loading) {
    return (
      <PageContainer>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando reporte gerencial financiero...
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ModuleToolbar
        title="Reporte Gerencial Financiero Anual"
        subtitle={`Visión ejecutiva de ingresos, gastos, presupuesto y salud financiera. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={Gauge}
        actions={<ModuleActions onRefresh={refrescar} />}
      />

      {mensaje && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          {mensaje}
        </div>
      )}

      <SectionCard
        title="Período de análisis"
        subtitle="El reporte compara acumulados del año hasta el mes de corte seleccionado."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-bold text-slate-700">
            Año
            <input
              type="number"
              value={anio}
              onChange={(event) => cambiarAnio(Number(event.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </label>

          <label className="text-sm font-bold text-slate-700">
            Mes de corte
            <select
              value={mesCorte}
              onChange={(event) => setMesCorte(Number(event.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map(
                (mes) => (
                  <option key={mes} value={mes}>
                    {nombreMes(mes)}
                  </option>
                ),
              )}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={refrescar}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 py-3 text-sm font-black text-white hover:bg-blue-900"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar reporte
            </button>
          </div>
        </div>
      </SectionCard>

      <div className={`rounded-2xl border p-5 ${claseEstado(estadoSalud)}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80">
              Salud financiera del condominio
            </p>
            <h2 className="mt-1 text-3xl font-black">
              {textoEstado(estadoSalud)}
            </h2>
            <p className="mt-2 text-sm font-semibold opacity-90">
              Evaluación basada en recaudación, desviación presupuestaria y
              resultado operativo acumulado.
            </p>
          </div>

          {estadoSalud === "SALUDABLE" ? (
            <ShieldCheck className="h-12 w-12" />
          ) : (
            <AlertTriangle className="h-12 w-12" />
          )}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Cuotas generadas YTD"
          valor={`RD$ ${dinero(totalGenerado)}`}
          icon={<CircleDollarSign className="h-5 w-5" />}
          descripcion={`Enero a ${nombreMes(mesCorte)} ${anio}`}
        />
        <KpiCard
          label="Cobrado aplicado"
          valor={`RD$ ${dinero(totalCobradoPorCargos)}`}
          icon={<Banknote className="h-5 w-5" />}
          descripcion={`${porcentaje(recaudacion)} de recaudación`}
        />
        <KpiCard
          label="Pendiente de cobro"
          valor={`RD$ ${dinero(totalPendiente)}`}
          icon={<CalendarRange className="h-5 w-5" />}
          descripcion="Balance pendiente en cargos"
        />
        <KpiCard
          label="Ingresos recibidos"
          valor={`RD$ ${dinero(totalPagosRecibidos)}`}
          icon={<WalletCards className="h-5 w-5" />}
          descripcion="Pagos registrados por fecha bancaria"
        />
        <KpiCard
          label="Gastos reales YTD"
          valor={`RD$ ${dinero(totalGastos)}`}
          icon={<ArrowDownRight className="h-5 w-5" />}
          descripcion="Gastos registrados en el período"
        />
        <KpiCard
          label="Presupuesto YTD"
          valor={`RD$ ${dinero(presupuestoYTD)}`}
          icon={<Scale className="h-5 w-5" />}
          descripcion={
            presupuesto
              ? `${presupuesto.nombre} · ${presupuesto.estado || "-"}`
              : "Sin presupuesto activo"
          }
        />
        <KpiCard
          label="Resultado operativo"
          valor={`RD$ ${dinero(resultadoOperativo)}`}
          icon={
            resultadoOperativo >= 0 ? (
              <ArrowUpRight className="h-5 w-5" />
            ) : (
              <ArrowDownRight className="h-5 w-5" />
            )
          }
          descripcion={resultadoOperativo >= 0 ? "Superávit" : "Déficit"}
        />
        <KpiCard
          label="Desviación presupuesto"
          valor={`${desviacionPresupuestoPct >= 0 ? "+" : ""}${porcentaje(
            desviacionPresupuestoPct,
          )}`}
          icon={<AlertTriangle className="h-5 w-5" />}
          descripcion={`RD$ ${dinero(desviacionPresupuesto)}`}
        />
      </section>

      <SectionCard
        title="Posición bancaria"
        subtitle="Disponibilidad registrada en las cuentas bancarias activas."
      >
        <div className="grid gap-4 md:grid-cols-4">
          <InfoBanco
            label="Balance bancario total"
            valor={balanceBanco}
            icon={<Landmark className="h-5 w-5" />}
          />
          <InfoBanco
            label="Fondo ordinario"
            valor={fondoOrdinario}
            icon={<WalletCards className="h-5 w-5" />}
          />
          <InfoBanco
            label="Fondo extraordinario"
            valor={fondoExtraordinario}
            icon={<CircleDollarSign className="h-5 w-5" />}
          />
          <InfoBanco
            label="Fondo reserva"
            valor={fondoReserva}
            icon={<ShieldCheck className="h-5 w-5" />}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Comportamiento mensual"
        subtitle={`Detalle financiero de enero a ${nombreMes(mesCorte)} ${anio}.`}
      >
        <DataTable>
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">Mes</th>
              <th className="px-4 py-3 text-right">Generado</th>
              <th className="px-4 py-3 text-right">Cobrado</th>
              <th className="px-4 py-3 text-right">% Recaudación</th>
              <th className="px-4 py-3 text-right">Gastos</th>
              <th className="px-4 py-3 text-right">Presupuesto</th>
              <th className="px-4 py-3 text-right">Resultado</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {resumenMensual.map((item) => (
              <tr key={item.mes} className="bg-white hover:bg-slate-50">
                <td className="px-4 py-3 font-black">{item.nombre}</td>
                <td className="px-4 py-3 text-right">
                  RD$ {dinero(item.generado)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-blue-700">
                  RD$ {dinero(item.cobrado)}
                </td>
                <td className="px-4 py-3 text-right">
                  {porcentaje(item.recaudacion)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-red-700">
                  RD$ {dinero(item.gastos)}
                </td>
                <td className="px-4 py-3 text-right">
                  RD$ {dinero(item.presupuestoYTD)}
                </td>
                <td
                  className={`px-4 py-3 text-right font-black ${
                    item.resultado < 0 ? "text-red-700" : "text-emerald-700"
                  }`}
                >
                  RD$ {dinero(item.resultado)}
                </td>
              </tr>
            ))}

            <tr className="bg-slate-900 font-black text-white">
              <td className="px-4 py-3">TOTAL YTD</td>
              <td className="px-4 py-3 text-right">
                RD$ {dinero(totalGenerado)}
              </td>
              <td className="px-4 py-3 text-right">
                RD$ {dinero(totalCobradoPorCargos)}
              </td>
              <td className="px-4 py-3 text-right">
                {porcentaje(recaudacion)}
              </td>
              <td className="px-4 py-3 text-right">
                RD$ {dinero(totalGastos)}
              </td>
              <td className="px-4 py-3 text-right">
                RD$ {dinero(presupuestoYTD)}
              </td>
              <td className="px-4 py-3 text-right">
                RD$ {dinero(resultadoOperativo)}
              </td>
            </tr>
          </tbody>
        </DataTable>
      </SectionCard>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        <p className="font-black">Criterio de esta primera versión</p>
        <p className="mt-1">
          La recaudación se calcula usando monto pagado aplicado contra cargos
          generados. Los ingresos recibidos se muestran aparte usando los pagos
          registrados por fecha bancaria. Los pagos históricos no se mezclan
          todavía con la recaudación corriente.
        </p>
      </div>
    </PageContainer>
  );
}

function KpiCard({
  label,
  valor,
  icon,
  descripcion,
}: {
  label: string;
  valor: string;
  icon: React.ReactNode;
  descripcion: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <div className="text-slate-500">{icon}</div>
      </div>
      <p className="mt-2 text-xl font-black text-slate-950">{valor}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{descripcion}</p>
    </div>
  );
}

function InfoBanco({
  label,
  valor,
  icon,
}: {
  label: string;
  valor: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <div className="text-slate-500">{icon}</div>
      </div>
      <p className="mt-2 text-lg font-black text-slate-950">
        RD$ {dinero(valor)}
      </p>
    </div>
  );
}
