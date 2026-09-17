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
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  X,
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

type TipoDetalle =
  | "GENERADO"
  | "COBRADO"
  | "PENDIENTE"
  | "INGRESOS"
  | "GASTOS"
  | "PRESUPUESTO"
  | "RESULTADO"
  | "MES"
  | "CATEGORIA"
  | "ALERTA";

type DetalleActivo = {
  tipo: TipoDetalle;
  titulo: string;
  subtitulo?: string;
  mes?: number;
  categoria?: string;
  alertaIndice?: number;
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


function colorMes(
  recaudacion: number,
  resultado: number,
  gastos: number,
  presupuesto: number,
) {
  const desviacion =
    presupuesto > 0 ? ((gastos - presupuesto) / presupuesto) * 100 : 0;

  if (resultado < 0 || recaudacion < 80 || desviacion > 10) {
    return {
      texto: "Alerta",
      badge: "bg-red-100 text-red-800 border-red-200",
      punto: "bg-red-500",
      fila: "bg-red-50/50",
    };
  }

  if (recaudacion < 90 || desviacion > 5) {
    return {
      texto: "Atención",
      badge: "bg-amber-100 text-amber-800 border-amber-200",
      punto: "bg-amber-500",
      fila: "bg-amber-50/40",
    };
  }

  return {
    texto: "Saludable",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    punto: "bg-emerald-500",
    fila: "",
  };
}

function GraficoLineas({
  datos,
}: {
  datos: ResumenMes[];
}) {
  const ancho = 900;
  const alto = 280;
  const paddingX = 48;
  const paddingY = 30;
  const maximo = Math.max(
    1,
    ...datos.flatMap((item) => [
      item.cobrado,
      item.gastos,
      item.presupuestoYTD,
    ]),
  );

  function x(index: number) {
    if (datos.length <= 1) return ancho / 2;
    return (
      paddingX +
      (index * (ancho - paddingX * 2)) / Math.max(1, datos.length - 1)
    );
  }

  function y(valor: number) {
    return alto - paddingY - (valor / maximo) * (alto - paddingY * 2);
  }

  function puntos(clave: "cobrado" | "gastos" | "presupuestoYTD") {
    return datos
      .map((item, index) => `${x(index)},${y(item[clave])}`)
      .join(" ");
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="mb-4 flex flex-wrap gap-4 text-xs font-black">
          <span className="flex items-center gap-2 text-emerald-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            Ingresos cobrados
          </span>
          <span className="flex items-center gap-2 text-red-700">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
            Gastos
          </span>
          <span className="flex items-center gap-2 text-blue-700">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            Presupuesto mensual
          </span>
        </div>

        <svg
          viewBox={`0 0 ${ancho} ${alto + 38}`}
          className="h-auto w-full rounded-2xl bg-gradient-to-b from-slate-50 to-white"
          role="img"
          aria-label="Ingresos, gastos y presupuesto mensual"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((factor) => {
            const valor = maximo * factor;
            const posY = y(valor);

            return (
              <g key={factor}>
                <line
                  x1={paddingX}
                  x2={ancho - paddingX}
                  y1={posY}
                  y2={posY}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text
                  x={4}
                  y={posY + 4}
                  fontSize="10"
                  fill="#64748b"
                >
                  {(valor / 1000).toFixed(0)}k
                </text>
              </g>
            );
          })}

          <polyline
            points={puntos("presupuestoYTD")}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
            strokeDasharray="8 6"
          />
          <polyline
            points={puntos("cobrado")}
            fill="none"
            stroke="#059669"
            strokeWidth="4"
          />
          <polyline
            points={puntos("gastos")}
            fill="none"
            stroke="#dc2626"
            strokeWidth="4"
          />

          {datos.map((item, index) => (
            <g key={item.mes}>
              <circle
                cx={x(index)}
                cy={y(item.cobrado)}
                r="5"
                fill="#059669"
              />
              <circle
                cx={x(index)}
                cy={y(item.gastos)}
                r="5"
                fill="#dc2626"
              />
              <text
                x={x(index)}
                y={alto + 18}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#475569"
              >
                {item.nombre.slice(0, 3)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function BarraProgreso({
  label,
  valor,
  maximo = 100,
  texto,
  estado = "neutral",
}: {
  label: string;
  valor: number;
  maximo?: number;
  texto: string;
  estado?: "bueno" | "atencion" | "alerta" | "neutral";
}) {
  const porcentajeBarra = Math.max(
    0,
    Math.min(100, maximo > 0 ? (valor / maximo) * 100 : 0),
  );

  const color =
    estado === "bueno"
      ? "bg-emerald-500"
      : estado === "atencion"
        ? "bg-amber-500"
        : estado === "alerta"
          ? "bg-red-500"
          : "bg-blue-600";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-700">{label}</span>
        <span className="text-sm font-black text-slate-950">{texto}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${porcentajeBarra}%` }}
        />
      </div>
    </div>
  );
}

export default function ReporteGerencialFinancieroAnualPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mesCorte, setMesCorte] = useState(new Date().getMonth() + 1);

  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const [detalleActivo, setDetalleActivo] = useState<DetalleActivo | null>(null);

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


  const ejecucionPresupuestaria =
    presupuestoYTD > 0 ? (totalGastos / presupuestoYTD) * 100 : 0;

  const margenOperativo =
    totalPagosRecibidos > 0
      ? (resultadoOperativo / totalPagosRecibidos) * 100
      : 0;

  const mesesDeficit = resumenMensual.filter(
    (item) => item.resultado < 0,
  ).length;

  const categoriasGasto = useMemo(() => {
    const mapa = new Map<string, number>();

    gastosYTD.forEach((gasto) => {
      const categoria = String(gasto.categoria || "Sin categoría").trim() || "Sin categoría";
      mapa.set(categoria, (mapa.get(categoria) || 0) + montoGasto(gasto));
    });

    return Array.from(mapa.entries())
      .map(([categoria, total]) => ({
        categoria,
        total,
        porcentaje: totalGastos > 0 ? (total / totalGastos) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [gastosYTD, totalGastos]);

  const alertasResumen = useMemo(() => {
    const alertas: Array<{
      nivel: "CRITICA" | "ATENCION" | "BIEN";
      titulo: string;
      detalle: string;
    }> = [];

    if (recaudacion < 80) {
      alertas.push({
        nivel: "CRITICA",
        titulo: "Recaudación crítica",
        detalle: `La recaudación acumulada está en ${porcentaje(recaudacion)}.`,
      });
    } else if (recaudacion < 90) {
      alertas.push({
        nivel: "ATENCION",
        titulo: "Recaudación requiere atención",
        detalle: `La recaudación acumulada está en ${porcentaje(recaudacion)}.`,
      });
    } else {
      alertas.push({
        nivel: "BIEN",
        titulo: "Recaudación saludable",
        detalle: `La recaudación acumulada está en ${porcentaje(recaudacion)}.`,
      });
    }

    if (desviacionPresupuestoPct > 10) {
      alertas.push({
        nivel: "CRITICA",
        titulo: "Gasto por encima del presupuesto",
        detalle: `El gasto YTD supera el presupuesto acumulado en ${porcentaje(
          desviacionPresupuestoPct,
        )}.`,
      });
    } else if (desviacionPresupuestoPct > 5) {
      alertas.push({
        nivel: "ATENCION",
        titulo: "Presupuesto bajo presión",
        detalle: `El gasto YTD supera el presupuesto acumulado en ${porcentaje(
          desviacionPresupuestoPct,
        )}.`,
      });
    } else {
      alertas.push({
        nivel: "BIEN",
        titulo: "Ejecución presupuestaria controlada",
        detalle: `La ejecución acumulada es ${porcentaje(
          ejecucionPresupuestaria,
        )}.`,
      });
    }

    if (mesesDeficit >= 2) {
      alertas.push({
        nivel: "CRITICA",
        titulo: `${mesesDeficit} meses con déficit`,
        detalle:
          "Existen varios meses donde los gastos registrados superaron los ingresos recibidos.",
      });
    } else if (mesesDeficit === 1) {
      alertas.push({
        nivel: "ATENCION",
        titulo: "Un mes cerró con déficit",
        detalle:
          "Conviene revisar el mes negativo para identificar los gastos que provocaron la desviación.",
      });
    } else {
      alertas.push({
        nivel: "BIEN",
        titulo: "Sin meses deficitarios",
        detalle:
          "En el período analizado no hay meses con gastos superiores a los ingresos recibidos.",
      });
    }

    return alertas;
  }, [
    recaudacion,
    desviacionPresupuestoPct,
    ejecucionPresupuestaria,
    mesesDeficit,
  ]);


  const cargosDetalleYTD = useMemo(
    () =>
      cargosYTD
        .map((cargo) => ({
          id: cargo.id,
          periodo: cargo.periodo || "-",
          monto: numero(cargo.monto),
          pagado: numero(cargo.monto_pagado),
          balance: numero(cargo.balance),
          estado: cargo.estado || "-",
        }))
        .sort((a, b) => a.periodo.localeCompare(b.periodo)),
    [cargosYTD],
  );

  const pagosDetalleYTD = useMemo(
    () =>
      pagosYTD
        .map((pago) => ({
          id: pago.id,
          fecha: pago.fecha_pago || "-",
          monto: numero(pago.monto),
          fondo: pago.tipo_fondo || "-",
          origen: pago.origen || "-",
        }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [pagosYTD],
  );

  const gastosDetalleYTD = useMemo(
    () =>
      gastosYTD
        .map((gasto) => ({
          id: gasto.id,
          fecha: gasto.fecha || "-",
          categoria: gasto.categoria || "Sin categoría",
          monto: montoGasto(gasto),
          estado: gasto.estado || "-",
        }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [gastosYTD],
  );

  function abrirDetalle(detalle: DetalleActivo) {
    setDetalleActivo(detalle);
  }

  function cerrarDetalle() {
    setDetalleActivo(null);
  }

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
          onClick={() =>
            abrirDetalle({
              tipo: "GENERADO",
              titulo: "Detalle de cuotas generadas",
              subtitulo: `Enero a ${nombreMes(mesCorte)} ${anio}`,
            })
          }
          label="Cuotas generadas YTD"
          valor={`RD$ ${dinero(totalGenerado)}`}
          icon={<CircleDollarSign className="h-5 w-5" />}
          descripcion={`Enero a ${nombreMes(mesCorte)} ${anio}`}
        />
        <KpiCard
          onClick={() =>
            abrirDetalle({
              tipo: "COBRADO",
              titulo: "Detalle de cobros aplicados",
              subtitulo: "Montos pagados aplicados a cargos del período",
            })
          }
          label="Cobrado aplicado"
          valor={`RD$ ${dinero(totalCobradoPorCargos)}`}
          icon={<Banknote className="h-5 w-5" />}
          descripcion={`${porcentaje(recaudacion)} de recaudación`}
        />
        <KpiCard
          onClick={() =>
            abrirDetalle({
              tipo: "PENDIENTE",
              titulo: "Detalle pendiente de cobro",
              subtitulo: "Cargos con balance pendiente",
            })
          }
          label="Pendiente de cobro"
          valor={`RD$ ${dinero(totalPendiente)}`}
          icon={<CalendarRange className="h-5 w-5" />}
          descripcion="Balance pendiente en cargos"
        />
        <KpiCard
          onClick={() =>
            abrirDetalle({
              tipo: "INGRESOS",
              titulo: "Detalle de ingresos recibidos",
              subtitulo: "Pagos registrados por fecha bancaria",
            })
          }
          label="Ingresos recibidos"
          valor={`RD$ ${dinero(totalPagosRecibidos)}`}
          icon={<WalletCards className="h-5 w-5" />}
          descripcion="Pagos registrados por fecha bancaria"
        />
        <KpiCard
          onClick={() =>
            abrirDetalle({
              tipo: "GASTOS",
              titulo: "Detalle de gastos reales",
              subtitulo: `Enero a ${nombreMes(mesCorte)} ${anio}`,
            })
          }
          label="Gastos reales YTD"
          valor={`RD$ ${dinero(totalGastos)}`}
          icon={<ArrowDownRight className="h-5 w-5" />}
          descripcion="Gastos registrados en el período"
        />
        <KpiCard
          onClick={() =>
            abrirDetalle({
              tipo: "PRESUPUESTO",
              titulo: "Detalle de presupuesto YTD",
              subtitulo: presupuesto?.nombre || "Presupuesto",
            })
          }
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
          onClick={() =>
            abrirDetalle({
              tipo: "RESULTADO",
              titulo: "Composición del resultado operativo",
              subtitulo: "Ingresos recibidos menos gastos reales",
            })
          }
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


      <section className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <SectionCard
          title="Ingresos vs. Gastos vs. Presupuesto"
          subtitle="Lectura visual del comportamiento mensual. Las líneas permiten detectar rápidamente meses fuera de tendencia."
        >
          {resumenMensual.length > 0 ? (
            <GraficoLineas datos={resumenMensual} />
          ) : (
            <div className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">
              No hay información mensual para graficar.
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Indicadores de control"
          subtitle="Semáforos rápidos para lectura gerencial."
        >
          <div className="space-y-6">
            <BarraProgreso
              label="Recaudación"
              valor={recaudacion}
              texto={porcentaje(recaudacion)}
              estado={
                recaudacion >= 90
                  ? "bueno"
                  : recaudacion >= 80
                    ? "atencion"
                    : "alerta"
              }
            />

            <BarraProgreso
              label="Ejecución presupuesto"
              valor={ejecucionPresupuestaria}
              maximo={120}
              texto={porcentaje(ejecucionPresupuestaria)}
              estado={
                ejecucionPresupuestaria <= 100
                  ? "bueno"
                  : ejecucionPresupuestaria <= 110
                    ? "atencion"
                    : "alerta"
              }
            />

            <BarraProgreso
              label="Margen operativo"
              valor={Math.max(0, margenOperativo)}
              texto={porcentaje(margenOperativo)}
              estado={
                margenOperativo >= 10
                  ? "bueno"
                  : margenOperativo >= 0
                    ? "atencion"
                    : "alerta"
              }
            />

            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Resultado YTD
                  </p>
                  <p className="mt-2 text-2xl font-black">
                    RD$ {dinero(resultadoOperativo)}
                  </p>
                </div>
                <Activity className="h-9 w-9 text-blue-300" />
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-300">
                {resultadoOperativo >= 0
                  ? "Superávit acumulado del período."
                  : "Déficit acumulado: requiere revisión."}
              </p>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <SectionCard
          title="Centro de Alertas Gerenciales"
          subtitle="Lectura automática de los principales indicadores del período."
        >
          <div className="space-y-3">
            {alertasResumen.map((alerta, index) => {
              const estilo =
                alerta.nivel === "CRITICA"
                  ? "border-red-200 bg-red-50 text-red-900"
                  : alerta.nivel === "ATENCION"
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-emerald-200 bg-emerald-50 text-emerald-900";

              return (
                <button
                  type="button"
                  key={`${alerta.titulo}-${index}`}
                  onClick={() =>
                    abrirDetalle({
                      tipo: "ALERTA",
                      titulo: alerta.titulo,
                      subtitulo: alerta.detalle,
                      alertaIndice: index,
                    })
                  }
                  className={`block w-full rounded-2xl border p-4 text-left transition hover:shadow-sm ${estilo}`}
                >
                  <div className="flex items-start gap-3">
                    {alerta.nivel === "BIEN" ? (
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    )}
                    <div>
                      <p className="font-black">{alerta.titulo}</p>
                      <p className="mt-1 text-sm font-semibold opacity-90">
                        {alerta.detalle}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Distribución de gastos"
          subtitle="Categorías con mayor participación en los gastos acumulados."
        >
          <div className="space-y-4">
            {categoriasGasto.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
                No hay gastos categorizados en el período.
              </div>
            ) : (
              categoriasGasto.map((item, index) => (
                <button
                  type="button"
                  key={item.categoria}
                  onClick={() =>
                    abrirDetalle({
                      tipo: "CATEGORIA",
                      titulo: `Gastos de ${item.categoria}`,
                      categoria: item.categoria,
                    })
                  }
                  className="block w-full rounded-xl p-2 text-left transition hover:bg-slate-50"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-black text-white">
                        {index + 1}
                      </span>
                      <span className="truncate text-sm font-black text-slate-800">
                        {item.categoria}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-950">
                        RD$ {dinero(item.total)}
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        {porcentaje(item.porcentaje)}
                      </p>
                    </div>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={
                        index === 0
                          ? "h-full rounded-full bg-blue-700"
                          : index === 1
                            ? "h-full rounded-full bg-slate-700"
                            : "h-full rounded-full bg-slate-400"
                      }
                      style={{ width: `${Math.min(100, item.porcentaje)}%` }}
                    />
                  </div>
                </button>
              ))
            )}
          </div>
        </SectionCard>
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
              <th className="px-4 py-3 text-center">Estado</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {resumenMensual.map((item) => {
              const estadoMes = colorMes(
                item.recaudacion,
                item.resultado,
                item.gastos,
                item.presupuestoYTD,
              );

              return (
              <tr
                key={item.mes}
                onClick={() =>
                  abrirDetalle({
                    tipo: "MES",
                    titulo: `Detalle financiero de ${item.nombre} ${anio}`,
                    mes: item.mes,
                  })
                }
                className={`${estadoMes.fila} cursor-pointer hover:bg-slate-100`}
              >
                <td className="px-4 py-3 font-black">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${estadoMes.punto}`} />
                    {item.nombre}
                  </div>
                </td>
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
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${estadoMes.badge}`}
                  >
                    {estadoMes.texto}
                  </span>
                </td>
              </tr>
              );
            })}

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
              <td className="px-4 py-3 text-center">
                {textoEstado(estadoSalud)}
              </td>
            </tr>
          </tbody>
        </DataTable>
      </SectionCard>


      {detalleActivo && (
        <DetalleLateral
          detalle={detalleActivo}
          cerrar={cerrarDetalle}
          cargos={cargosDetalleYTD}
          pagos={pagosDetalleYTD}
          gastos={gastosDetalleYTD}
          detallesPresupuesto={detallesPresupuesto}
          resumenMensual={resumenMensual}
          totalGenerado={totalGenerado}
          totalCobrado={totalCobradoPorCargos}
          totalPendiente={totalPendiente}
          totalIngresos={totalPagosRecibidos}
          totalGastos={totalGastos}
          presupuestoYTD={presupuestoYTD}
          resultadoOperativo={resultadoOperativo}
          mesCorte={mesCorte}
        />
      )}

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
  onClick,
}: {
  label: string;
  valor: string;
  icon: React.ReactNode;
  descripcion: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <div className="text-slate-500">{icon}</div>
      </div>
      <p className="mt-2 text-xl font-black text-slate-950">{valor}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{descripcion}</p>
      <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-blue-700">
        Ver detalle →
      </p>
    </button>
  );
}


function DetalleLateral({
  detalle,
  cerrar,
  cargos,
  pagos,
  gastos,
  detallesPresupuesto,
  resumenMensual,
  totalGenerado,
  totalCobrado,
  totalPendiente,
  totalIngresos,
  totalGastos,
  presupuestoYTD,
  resultadoOperativo,
  mesCorte,
}: {
  detalle: DetalleActivo;
  cerrar: () => void;
  cargos: Array<{
    id: number;
    periodo: string;
    monto: number;
    pagado: number;
    balance: number;
    estado: string;
  }>;
  pagos: Array<{
    id: number;
    fecha: string;
    monto: number;
    fondo: string;
    origen: string;
  }>;
  gastos: Array<{
    id: number;
    fecha: string;
    categoria: string;
    monto: number;
    estado: string;
  }>;
  detallesPresupuesto: DetallePresupuesto[];
  resumenMensual: ResumenMes[];
  totalGenerado: number;
  totalCobrado: number;
  totalPendiente: number;
  totalIngresos: number;
  totalGastos: number;
  presupuestoYTD: number;
  resultadoOperativo: number;
  mesCorte: number;
}) {
  const mes = detalle.mes || 0;

  const cargosFiltrados =
    mes > 0
      ? cargos.filter((item) => mesDesdePeriodo(item.periodo) === mes)
      : cargos;

  const pagosFiltrados =
    mes > 0
      ? pagos.filter((item) => mesDesdeFecha(item.fecha) === mes)
      : pagos;

  let gastosFiltrados =
    mes > 0
      ? gastos.filter((item) => mesDesdeFecha(item.fecha) === mes)
      : gastos;

  if (detalle.tipo === "CATEGORIA" && detalle.categoria) {
    gastosFiltrados = gastosFiltrados.filter(
      (item) => item.categoria === detalle.categoria,
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-slate-950/35 backdrop-blur-[1px]">
      <button
        type="button"
        aria-label="Cerrar detalle"
        onClick={cerrar}
        className="absolute inset-0"
      />

      <aside className="relative z-10 h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                Análisis inteligente
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                {detalle.titulo}
              </h2>
              {detalle.subtitulo && (
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {detalle.subtitulo}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={cerrar}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-5">
          {detalle.tipo === "GENERADO" && (
            <TablaCargos
              titulo="Cargos que forman el total generado"
              items={cargosFiltrados}
            />
          )}

          {detalle.tipo === "COBRADO" && (
            <TablaCargos
              titulo="Cargos con monto pagado aplicado"
              items={cargosFiltrados.filter((item) => item.pagado > 0)}
            />
          )}

          {detalle.tipo === "PENDIENTE" && (
            <TablaCargos
              titulo="Cargos pendientes"
              items={cargosFiltrados.filter((item) => item.balance > 0)}
            />
          )}

          {detalle.tipo === "INGRESOS" && (
            <TablaPagos titulo="Ingresos registrados" items={pagosFiltrados} />
          )}

          {detalle.tipo === "GASTOS" && (
            <TablaGastos titulo="Gastos registrados" items={gastosFiltrados} />
          )}

          {detalle.tipo === "CATEGORIA" && (
            <TablaGastos
              titulo={`Detalle de ${detalle.categoria || "categoría"}`}
              items={gastosFiltrados}
            />
          )}

          {detalle.tipo === "PRESUPUESTO" && (
            <div className="rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-black text-slate-900">
                  Partidas que forman el presupuesto
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Categoría</th>
                      <th className="px-4 py-3 text-left">Concepto</th>
                      <th className="px-4 py-3 text-right">Mensual</th>
                      <th className="px-4 py-3 text-right">YTD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detallesPresupuesto.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-bold">
                          {item.categoria || "Sin categoría"}
                        </td>
                        <td className="px-4 py-3">{item.concepto || "-"}</td>
                        <td className="px-4 py-3 text-right">
                          RD$ {dinero(item.monto_mensual_estimado)}
                        </td>
                        <td className="px-4 py-3 text-right font-black">
                          RD${" "}
                          {dinero(
                            numero(item.monto_mensual_estimado) * mesCorte,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {detalle.tipo === "RESULTADO" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <MiniDato
                label="Ingresos recibidos"
                valor={totalIngresos}
                clase="text-emerald-700"
              />
              <MiniDato
                label="Gastos reales"
                valor={totalGastos}
                clase="text-red-700"
              />
              <MiniDato
                label="Resultado operativo"
                valor={resultadoOperativo}
                clase={
                  resultadoOperativo >= 0
                    ? "text-emerald-700"
                    : "text-red-700"
                }
              />
              <MiniDato
                label="Presupuesto YTD"
                valor={presupuestoYTD}
                clase="text-blue-700"
              />
            </div>
          )}

          {detalle.tipo === "MES" && (
            <>
              {(() => {
                const item = resumenMensual.find(
                  (registro) => registro.mes === mes,
                );

                if (!item) return null;

                return (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <MiniDato label="Generado" valor={item.generado} />
                    <MiniDato label="Cobrado" valor={item.cobrado} />
                    <MiniDato label="Gastos" valor={item.gastos} />
                    <MiniDato
                      label="Resultado"
                      valor={item.resultado}
                      clase={
                        item.resultado >= 0
                          ? "text-emerald-700"
                          : "text-red-700"
                      }
                    />
                  </div>
                );
              })()}

              <TablaPagos titulo="Ingresos del mes" items={pagosFiltrados} />
              <TablaGastos titulo="Gastos del mes" items={gastosFiltrados} />
            </>
          )}

          {detalle.tipo === "ALERTA" && (
            <>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                <p className="font-black">¿Por qué se generó esta alerta?</p>
                <p className="mt-1">
                  {detalle.subtitulo ||
                    "La alerta se genera por una desviación detectada en los indicadores del período."}
                </p>
              </div>

              {detalle.alertaIndice === 0 && (
                <TablaCargos
                  titulo="Cargos relacionados con recaudación"
                  items={cargosFiltrados}
                />
              )}

              {detalle.alertaIndice === 1 && (
                <TablaGastos
                  titulo="Gastos relacionados con presupuesto"
                  items={gastosFiltrados}
                />
              )}

              {detalle.alertaIndice === 2 && (
                <div className="space-y-3">
                  {resumenMensual
                    .filter((item) => item.resultado < 0)
                    .map((item) => (
                      <div
                        key={item.mes}
                        className="rounded-2xl border border-red-200 bg-red-50 p-4"
                      >
                        <p className="font-black text-red-900">
                          {item.nombre}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-red-800">
                          Ingresos RD$ {dinero(
                            pagos
                              .filter(
                                (pago) =>
                                  mesDesdeFecha(pago.fecha) === item.mes,
                              )
                              .reduce((sum, pago) => sum + pago.monto, 0),
                          )}{" "}
                          · Gastos RD$ {dinero(item.gastos)} · Resultado RD${" "}
                          {dinero(item.resultado)}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}

          <div className="rounded-2xl bg-slate-950 p-4 text-sm text-white">
            <p className="font-black">Trazabilidad del reporte</p>
            <p className="mt-1 text-slate-300">
              Esta vista muestra los registros que componen cada indicador.
              En la siguiente etapa podremos enlazar cada fila con su recibo,
              factura, cheque, solicitud de pago o movimiento bancario.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function TablaCargos({
  titulo,
  items,
}: {
  titulo: string;
  items: Array<{
    id: number;
    periodo: string;
    monto: number;
    pagado: number;
    balance: number;
    estado: string;
  }>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="border-b bg-slate-50 px-4 py-3">
        <p className="font-black text-slate-900">
          {titulo} · {items.length} registro(s)
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Período</th>
              <th className="px-4 py-3 text-right">Cargo</th>
              <th className="px-4 py-3 text-right">Pagado</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-bold">#{item.id}</td>
                <td className="px-4 py-3">{item.periodo}</td>
                <td className="px-4 py-3 text-right">
                  RD$ {dinero(item.monto)}
                </td>
                <td className="px-4 py-3 text-right text-emerald-700">
                  RD$ {dinero(item.pagado)}
                </td>
                <td className="px-4 py-3 text-right font-black text-red-700">
                  RD$ {dinero(item.balance)}
                </td>
                <td className="px-4 py-3">{item.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TablaPagos({
  titulo,
  items,
}: {
  titulo: string;
  items: Array<{
    id: number;
    fecha: string;
    monto: number;
    fondo: string;
    origen: string;
  }>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="border-b bg-slate-50 px-4 py-3">
        <p className="font-black text-slate-900">
          {titulo} · {items.length} registro(s)
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Fondo</th>
              <th className="px-4 py-3 text-left">Origen</th>
              <th className="px-4 py-3 text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-bold">#{item.id}</td>
                <td className="px-4 py-3">{item.fecha}</td>
                <td className="px-4 py-3">{item.fondo}</td>
                <td className="px-4 py-3">{item.origen}</td>
                <td className="px-4 py-3 text-right font-black text-emerald-700">
                  RD$ {dinero(item.monto)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TablaGastos({
  titulo,
  items,
}: {
  titulo: string;
  items: Array<{
    id: number;
    fecha: string;
    categoria: string;
    monto: number;
    estado: string;
  }>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="border-b bg-slate-50 px-4 py-3">
        <p className="font-black text-slate-900">
          {titulo} · {items.length} registro(s)
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Categoría</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-bold">#{item.id}</td>
                <td className="px-4 py-3">{item.fecha}</td>
                <td className="px-4 py-3 font-bold">{item.categoria}</td>
                <td className="px-4 py-3">{item.estado}</td>
                <td className="px-4 py-3 text-right font-black text-red-700">
                  RD$ {dinero(item.monto)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MiniDato({
  label,
  valor,
  clase = "text-slate-950",
}: {
  label: string;
  valor: number;
  clase?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-xl font-black ${clase}`}>
        RD$ {dinero(valor)}
      </p>
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
