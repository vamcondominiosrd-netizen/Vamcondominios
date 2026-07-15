"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  BarChart3,
  Calculator,
  CheckCircle2,
  FileSpreadsheet,
  Landmark,
  LockKeyhole,
  Plus,
  RefreshCw,
  Scale,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import StatCard from "@/components/vam/enterprise/StatCard";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type Cuenta = {
  id: number;
  client_id: number | null;
  condominio_id: number;
  nombre_banco: string;
  numero_cuenta: string;
  tipo_cuenta: string | null;
  moneda: string | null;
  fondo_tipo: string | null;
  balance_actual: number | null;
  activa: boolean | null;
};

type Cierre = {
  id: number;
  client_id: number | null;
  condominio_id: number;
  cuenta_bancaria_id: number;
  periodo: string;
  anio: number;
  mes: number;
  balance_inicial: number;
  total_ingresos: number;
  total_gastos: number;
  total_cargos_bancarios?: number | null;
  total_intereses_bancarios?: number | null;
  total_ajustes?: number | null;
  balance_final: number;
  saldo_banco?: number | null;
  diferencia?: number | null;
  conciliado?: boolean | null;
  estado: string;
  fecha_apertura: string | null;
  fecha_cierre: string | null;
  observacion: string | null;
  created_at: string;
  updated_at: string | null;
};

type Movimiento = {
  id: number;
  client_id: number | null;
  condominio_id: number;
  cuenta_bancaria_id: number;
  fecha_movimiento: string;
  fecha_banco?: string | null;
  periodo: string;
  tipo_movimiento: "INGRESO" | "EGRESO";
  origen: string | null;
  referencia_id?: number | null;
  descripcion: string | null;
  monto: number;
  numero_documento?: string | null;
  beneficiario?: string | null;
  conciliado?: boolean | null;
  estado_banco?: string | null;
  fecha_conciliacion?: string | null;
  referencia_banco?: string | null;
  created_at: string;
};

const MESES = [
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

const ORIGENES = [
  { value: "PAGO_PROPIETARIO", label: "Pago propietario", tipo: "INGRESO" },
  { value: "CHEQUE", label: "Cheque", tipo: "EGRESO" },
  { value: "TRANSFERENCIA", label: "Transferencia", tipo: "EGRESO" },
  {
    value: "REPOSICION_CAJA_CHICA",
    label: "Reposición caja chica",
    tipo: "EGRESO",
  },
  { value: "NOMINA", label: "Nómina", tipo: "EGRESO" },
  { value: "PAGO_PROVEEDOR", label: "Pago proveedor", tipo: "EGRESO" },
  { value: "CARGO_BANCARIO", label: "Cargo bancario", tipo: "EGRESO" },
  { value: "IMPUESTO_BANCARIO", label: "Impuesto bancario", tipo: "EGRESO" },
  { value: "INTERES_BANCARIO", label: "Interés bancario", tipo: "INGRESO" },
  { value: "AJUSTE_BANCARIO", label: "Ajuste bancario", tipo: "EGRESO" },
] as const;

function periodoActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function fechaActual() {
  return new Date().toISOString().slice(0, 10);
}

function dinero(valor: number | null | undefined) {
  return `RD$ ${Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function nombrePeriodo(periodo: string) {
  const [anio, mes] = periodo.split("-");
  const idx = Number(mes) - 1;
  return `${MESES[idx] || mes} ${anio}`;
}

function origenLabel(origen?: string | null) {
  return ORIGENES.find((o) => o.value === origen)?.label || origen || "-";
}

function colorEstado(estado?: string | null) {
  if (estado === "CERRADO") return "bg-slate-100 text-slate-700";
  if (estado === "CONCILIADO") return "bg-green-100 text-green-700";
  if (estado === "DIFERENCIA") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

export default function ControlBancarioPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cuentaId, setCuentaId] = useState("");
  const [periodo, setPeriodo] = useState(periodoActual());

  const [cierre, setCierre] = useState<Cierre | null>(null);
  const [cierres, setCierres] = useState<Cierre[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [tab, setTab] = useState<
    "resumen" | "movimientos" | "conciliacion" | "historico"
  >("resumen");

  const [fechaMovimiento, setFechaMovimiento] = useState(fechaActual());
  const [tipoMovimiento, setTipoMovimiento] = useState<"INGRESO" | "EGRESO">(
    "EGRESO",
  );
  const [origen, setOrigen] = useState("CARGO_BANCARIO");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [beneficiario, setBeneficiario] = useState("");
  const [referenciaBanco, setReferenciaBanco] = useState("");
  const [saldoBanco, setSaldoBanco] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("");

  const cuentaSeleccionada = useMemo(
    () => cuentas.find((c) => String(c.id) === String(cuentaId)) || null,
    [cuentas, cuentaId],
  );

  const totales = useMemo(() => {
    const ingresos = movimientos
      .filter((m) => m.tipo_movimiento === "INGRESO")
      .reduce((s, m) => s + Number(m.monto || 0), 0);

    const egresos = movimientos
      .filter((m) => m.tipo_movimiento === "EGRESO")
      .reduce((s, m) => s + Number(m.monto || 0), 0);

    const cargosBanco = movimientos
      .filter((m) =>
        ["CARGO_BANCARIO", "IMPUESTO_BANCARIO"].includes(
          String(m.origen || ""),
        ),
      )
      .reduce((s, m) => s + Number(m.monto || 0), 0);

    const intereses = movimientos
      .filter((m) => String(m.origen || "") === "INTERES_BANCARIO")
      .reduce((s, m) => s + Number(m.monto || 0), 0);

    const balanceFinal =
      Number(cierre?.balance_inicial || 0) + ingresos - egresos;
    const saldo = Number(cierre?.saldo_banco || 0);

    return {
      ingresos,
      egresos,
      cargosBanco,
      intereses,
      balanceFinal,
      diferencia: saldo
        ? saldo - balanceFinal
        : Number(cierre?.diferencia || 0),
    };
  }, [movimientos, cierre]);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id");
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      router.push("/login");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre);
    cargarCuentas(id);
  }, [router]);

  useEffect(() => {
    if (!condominioId || !cuentaId || !periodo) return;
    cargarControlBancario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condominioId, cuentaId, periodo]);

  async function cargarCuentas(id: string) {
    const { data, error } = await supabase
      .from("cuentas_bancarias")
      .select("*")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("id", { ascending: true });

    if (error) {
      alert("Error cargando cuentas bancarias: " + error.message);
      return;
    }

    const lista = (data || []) as Cuenta[];
    setCuentas(lista);

    if (lista.length > 0 && !cuentaId) {
      setCuentaId(String(lista[0].id));
    }
  }

  async function cargarControlBancario() {
    setLoading(true);

    // Importante: NO recalcular automáticamente al cargar.
    // Si el período tiene saldo inicial manual (origen_balance = SALDO_INICIAL),
    // recalcular en cada carga puede sobrescribirlo si la función SQL no está actualizada.
    // El recálculo queda solo para el botón "Recalcular mes" y para los movimientos.

    const { data: cierreData, error: cierreError } = await supabase
      .from("banco_cierres_mensuales")
      .select("*")
      .eq("condominio_id", Number(condominioId))
      .eq("cuenta_bancaria_id", Number(cuentaId))
      .eq("periodo", periodo)
      .maybeSingle();

    const { data: movimientosData, error: movimientosError } = await supabase
      .from("banco_movimientos")
      .select("*")
      .eq("condominio_id", Number(condominioId))
      .eq("cuenta_bancaria_id", Number(cuentaId))
      .eq("periodo", periodo)
      .neq("estado_banco", "ANULADO")
      .order("fecha_movimiento", { ascending: true })
      .order("id", { ascending: true });

    const { data: cierresData } = await supabase
      .from("banco_cierres_mensuales")
      .select("*")
      .eq("condominio_id", Number(condominioId))
      .eq("cuenta_bancaria_id", Number(cuentaId))
      .order("periodo", { ascending: false })
      .limit(18);

    setLoading(false);

    if (cierreError) {
      alert("Error cargando cierre mensual: " + cierreError.message);
      return;
    }

    if (movimientosError) {
      alert(
        "Error cargando movimientos bancarios: " + movimientosError.message,
      );
      return;
    }

    const cierreActual = cierreData as Cierre | null;
    setCierre(cierreActual);
    setMovimientos((movimientosData || []) as Movimiento[]);
    setCierres((cierresData || []) as Cierre[]);
    setSaldoBanco(String(Number(cierreActual?.saldo_banco || 0)));
    setSaldoInicial(String(Number(cierreActual?.balance_inicial || 0)));
  }

  async function recalcularMes() {
    if (!condominioId || !cuentaId || !periodo) return;

    setLoading(true);

    // Regla oficial: este botón solo recalcula el saldo acumulado
    // de los movimientos del estado de cuenta. NO debe actualizar
    // banco_cierres_mensuales ni cerrar períodos.
    const { error } = await supabase.rpc("recalcular_saldo_movimientos_banco", {
      p_condominio_id: Number(condominioId),
      p_cuenta_bancaria_id: Number(cuentaId),
      p_periodo: periodo,
    });

    setLoading(false);

    if (error) {
      alert("Error recalculando movimientos bancarios: " + error.message);
      return;
    }

    await cargarControlBancario();
  }

  function cambiarOrigen(nuevoOrigen: string) {
    setOrigen(nuevoOrigen);
    const config = ORIGENES.find((o) => o.value === nuevoOrigen);
    if (config) setTipoMovimiento(config.tipo as "INGRESO" | "EGRESO");
  }

  async function registrarMovimiento(e: React.FormEvent) {
    e.preventDefault();

    if (cierre?.estado === "CERRADO") {
      alert("Este período está cerrado. No se pueden registrar movimientos.");
      return;
    }

    if (!condominioId || !cuentaId) {
      alert("Debe seleccionar una cuenta bancaria.");
      return;
    }

    const valor = Number(monto || 0);
    if (!fechaMovimiento || !origen || !descripcion || valor <= 0) {
      alert("Complete fecha, origen, descripción y monto.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.rpc("registrar_movimiento_bancario_real", {
      p_condominio_id: Number(condominioId),
      p_cuenta_bancaria_id: Number(cuentaId),
      p_fecha_movimiento: fechaMovimiento,
      p_tipo_movimiento: tipoMovimiento,
      p_origen: origen,
      p_descripcion: descripcion,
      p_monto: valor,
      p_numero_documento: numeroDocumento || null,
      p_beneficiario: beneficiario || null,
      p_referencia_banco: referenciaBanco || null,
    });

    setGuardando(false);

    if (error) {
      alert("Error registrando movimiento: " + error.message);
      return;
    }

    setDescripcion("");
    setMonto("");
    setNumeroDocumento("");
    setBeneficiario("");
    setReferenciaBanco("");
    await cargarControlBancario();
  }

  async function cambiarEstadoMovimiento(movimiento: Movimiento) {
    const nuevoEstado =
      movimiento.estado_banco === "CONCILIADO" ? "PENDIENTE" : "CONCILIADO";

    const { error } = await supabase
      .from("banco_movimientos")
      .update({
        estado_banco: nuevoEstado,
        conciliado: nuevoEstado === "CONCILIADO",
        fecha_conciliacion: nuevoEstado === "CONCILIADO" ? fechaActual() : null,
      })
      .eq("id", movimiento.id);

    if (error) {
      alert("Error actualizando conciliación: " + error.message);
      return;
    }

    await cargarControlBancario();
  }

  async function guardarSaldoInicial() {
    if (!condominioId || !cuentaId || !periodo) {
      alert("Debe seleccionar cuenta y período.");
      return;
    }

    if (cierre?.estado === "CERRADO") {
      alert(
        "Este período está cerrado. No se puede modificar el saldo inicial.",
      );
      return;
    }

    const valorInicial = Number(saldoInicial || 0);
    const ingresos = Number(totales.ingresos || 0);
    const egresos = Number(totales.egresos || 0);
    const balanceFinal = valorInicial + ingresos - egresos;

    const [anioStr, mesStr] = periodo.split("-");
    const anio = Number(anioStr);
    const mes = Number(mesStr);

    const payload = {
      client_id: cuentaSeleccionada?.client_id || null,
      condominio_id: Number(condominioId),
      cuenta_bancaria_id: Number(cuentaId),
      periodo,
      anio,
      mes,
      balance_inicial: valorInicial,
      total_ingresos: ingresos,
      total_gastos: egresos,
      balance_final: balanceFinal,
      estado: cierre?.estado || "ABIERTO",
      origen_balance: "SALDO_INICIAL",
      fecha_apertura: `${periodo}-01`,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("banco_cierres_mensuales")
      .upsert(payload, {
        onConflict: "condominio_id,cuenta_bancaria_id,periodo",
      });

    if (error) {
      alert("Error guardando saldo inicial: " + error.message);
      return;
    }

    await cargarControlBancario();
  }

  async function guardarSaldoBanco() {
    if (!cierre) {
      alert("Debe recalcular el mes antes de guardar el saldo banco.");
      return;
    }

    const saldo = Number(saldoBanco || 0);
    const diferencia = saldo - Number(totales.balanceFinal || 0);

    const { error } = await supabase
      .from("banco_cierres_mensuales")
      .update({
        saldo_banco: saldo,
        diferencia,
        conciliado: diferencia === 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cierre.id);

    if (error) {
      alert("Error guardando saldo banco: " + error.message);
      return;
    }

    await cargarControlBancario();
  }

  async function cerrarMes() {
    if (!cierre) {
      alert("Debe existir el período bancario antes de cerrarlo.");
      return;
    }

    if (!condominioId || !cuentaId || !periodo) {
      alert("Debe seleccionar condominio, cuenta bancaria y período.");
      return;
    }

    if (cierre.estado === "CERRADO") {
      alert("Este período ya está cerrado.");
      return;
    }

    const confirmar = confirm(
      `¿Seguro que desea cerrar el período ${nombrePeriodo(periodo)}?\n\n` +
        `Ingresos: ${dinero(totales.ingresos)}\n` +
        `Egresos: ${dinero(totales.egresos)}\n` +
        `Balance final: ${dinero(totales.balanceFinal)}`,
    );

    if (!confirmar) return;

    setLoading(true);

    // Cierre oficial: la función SQL calcula total_ingresos,
    // total_gastos y balance_final desde banco_movimientos,
    // marca el mes como CERRADO y abre el mes siguiente.
    const { data, error } = await supabase.rpc("cerrar_periodo_bancario", {
      p_condominio_id: Number(condominioId),
      p_cuenta_bancaria_id: Number(cuentaId),
      p_periodo: periodo,
    });

    setLoading(false);

    if (error) {
      alert("Error cerrando mes: " + error.message);
      return;
    }

    alert(data?.mensaje || "Mes cerrado correctamente.");

    await cargarControlBancario();
  }

  return (
    <PageContainer>
      <ModuleToolbar
        title="Control Bancario"
        subtitle={`Libro bancario mensual y conciliación. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={Landmark}
        actions={
          <ModuleActions
            onRefresh={cargarControlBancario}
            extra={
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={recalcularMes}
                  disabled={loading || !cuentaId}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Recalcular mes
                </button>

                <button
                  type="button"
                  onClick={cerrarMes}
                  disabled={!cierre || cierre.estado === "CERRADO"}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <LockKeyhole className="h-4 w-4" />
                  Cerrar mes
                </button>
              </div>
            }
          />
        }
      />

      <SectionCard
        title="Cuenta y período"
        subtitle="Seleccione la cuenta bancaria y el mes que desea consultar."
        action={
          <span
            className={`inline-flex rounded-full px-4 py-2 text-sm font-black ${colorEstado(
              cierre?.estado
            )}`}
          >
            {cierre?.estado || "ABIERTO"}
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Cuenta bancaria
            </label>
            <select
              value={cuentaId}
              onChange={(e) => setCuentaId(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_banco} - {c.numero_cuenta}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Período
            </label>
            <input
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            />
          </div>
        </div>

        {cuentaSeleccionada && (
          <div className="mt-4 rounded-xl border bg-slate-50 px-4 py-3">
            <p className="font-black text-slate-900">
              {cuentaSeleccionada.nombre_banco}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Cuenta {cuentaSeleccionada.numero_cuenta} ·{" "}
              {cuentaSeleccionada.tipo_cuenta || "Tipo no indicado"} ·{" "}
              {nombrePeriodo(periodo)}
            </p>
          </div>
        )}
      </SectionCard>

      {cuentas.length === 0 ? (
        <EmptyState
          title="Sin cuentas bancarias"
          description="No existen cuentas bancarias activas para este condominio."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Saldo inicial"
              value={dinero(cierre?.balance_inicial)}
              subtitle="Inicio del período"
              icon={WalletCards}
              tone="slate"
            />
            <StatCard
              title="Ingresos banco"
              value={dinero(totales.ingresos)}
              subtitle="Movimientos de entrada"
              icon={TrendingUp}
              tone="green"
            />
            <StatCard
              title="Egresos banco"
              value={dinero(totales.egresos)}
              subtitle="Movimientos de salida"
              icon={TrendingDown}
              tone="red"
            />
            <StatCard
              title="Saldo al cierre"
              value={dinero(totales.balanceFinal)}
              subtitle="Saldo calculado por VAM"
              icon={Calculator}
              tone="blue"
            />
            <StatCard
              title="Cargos e impuestos"
              value={dinero(totales.cargosBanco)}
              subtitle="Costos bancarios"
              icon={Banknote}
              tone="amber"
            />
            <StatCard
              title="Intereses"
              value={dinero(totales.intereses)}
              subtitle="Ingresos financieros"
              icon={TrendingUp}
              tone="green"
            />
            <StatCard
              title="Saldo según banco"
              value={dinero(cierre?.saldo_banco)}
              subtitle="Estado de cuenta"
              icon={Landmark}
              tone="slate"
            />
            <StatCard
              title="Diferencia"
              value={dinero(totales.diferencia)}
              subtitle={
                Number(totales.diferencia || 0) === 0
                  ? "Cuenta conciliada"
                  : "Requiere revisión"
              }
              icon={
                Number(totales.diferencia || 0) === 0
                  ? CheckCircle2
                  : Scale
              }
              tone={
                Number(totales.diferencia || 0) === 0 ? "green" : "red"
              }
            />
          </div>

          <SectionCard
            title="Gestión del período"
            subtitle="Resumen, movimientos, conciliación e histórico mensual."
          >
            <div className="mb-5 flex flex-wrap gap-2 border-b pb-4">
              {[
                ["resumen", "Resumen", BarChart3],
                ["movimientos", "Movimientos", FileSpreadsheet],
                ["conciliacion", "Conciliación", Scale],
                ["historico", "Histórico", Banknote],
              ].map(([key, label, Icon]: any) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key as typeof tab)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${
                    tab === key
                      ? "bg-blue-700 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {tab === "resumen" && (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <section className="xl:col-span-2">
                  <SectionCard
                    title="Resumen del período"
                    subtitle="Cálculo basado exclusivamente en movimientos reales del banco."
                  >
                    <div className="overflow-hidden rounded-xl border">
                      <ResumenLinea
                        label="Saldo inicial"
                        valor={dinero(cierre?.balance_inicial)}
                      />
                      <ResumenLinea
                        label="+ Ingresos reales en banco"
                        valor={dinero(totales.ingresos)}
                        color="text-emerald-700"
                      />
                      <ResumenLinea
                        label="- Egresos reales en banco"
                        valor={dinero(totales.egresos)}
                        color="text-red-700"
                      />
                      <ResumenLinea
                        label="= Saldo al cierre"
                        valor={dinero(totales.balanceFinal)}
                        color="text-blue-700"
                        bold
                      />
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-slate-500">
                      Este cálculo incluye pagos de propietarios, cheques,
                      transferencias, reposiciones de caja chica, nómina,
                      cargos, impuestos, intereses y ajustes bancarios.
                    </p>
                  </SectionCard>
                </section>

                <section>
                  <SectionCard
                    title="Saldo inicial"
                    subtitle="Balance de apertura del período; no se registra como ingreso."
                  >
                    <label className="mb-1 block text-sm font-semibold">
                      Monto inicial
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={saldoInicial}
                      onChange={(e) => setSaldoInicial(e.target.value)}
                      className="w-full rounded-xl border px-4 py-3"
                      disabled={cierre?.estado === "CERRADO"}
                    />

                    <button
                      type="button"
                      onClick={guardarSaldoInicial}
                      disabled={cierre?.estado === "CERRADO"}
                      className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      Guardar saldo inicial
                    </button>
                  </SectionCard>
                </section>

                <section className="xl:col-span-3">
                  <FormularioMovimiento
                    cierreCerrado={cierre?.estado === "CERRADO"}
                    fechaMovimiento={fechaMovimiento}
                    setFechaMovimiento={setFechaMovimiento}
                    origen={origen}
                    cambiarOrigen={cambiarOrigen}
                    tipoMovimiento={tipoMovimiento}
                    setTipoMovimiento={setTipoMovimiento}
                    descripcion={descripcion}
                    setDescripcion={setDescripcion}
                    monto={monto}
                    setMonto={setMonto}
                    numeroDocumento={numeroDocumento}
                    setNumeroDocumento={setNumeroDocumento}
                    beneficiario={beneficiario}
                    setBeneficiario={setBeneficiario}
                    referenciaBanco={referenciaBanco}
                    setReferenciaBanco={setReferenciaBanco}
                    guardando={guardando}
                    registrarMovimiento={registrarMovimiento}
                  />
                </section>
              </div>
            )}

            {tab === "movimientos" && (
              <MovimientosTable
                movimientos={movimientos}
                balanceInicial={Number(cierre?.balance_inicial || 0)}
                cambiarEstadoMovimiento={cambiarEstadoMovimiento}
              />
            )}

            {tab === "conciliacion" && (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <SectionCard
                  title="Conciliación bancaria"
                  subtitle="Compare el saldo de VAM con el estado de cuenta del banco."
                >
                  <label className="mb-1 block text-sm font-semibold">
                    Saldo según banco
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={saldoBanco}
                    onChange={(e) => setSaldoBanco(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                  />

                  <div className="mt-4 space-y-3">
                    <InfoLine
                      label="Saldo VAM"
                      value={dinero(totales.balanceFinal)}
                    />
                    <InfoLine
                      label="Diferencia"
                      value={dinero(totales.diferencia)}
                      danger={Number(totales.diferencia || 0) !== 0}
                      success={Number(totales.diferencia || 0) === 0}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={guardarSaldoBanco}
                    className="mt-5 w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800"
                  >
                    Guardar saldo banco
                  </button>
                </SectionCard>

                <SectionCard
                  title="Estado de movimientos"
                  subtitle="Seguimiento de conciliación de los registros del mes."
                >
                  <div className="grid grid-cols-2 gap-4">
                    <KpiSimple
                      label="Conciliados"
                      value={
                        movimientos.filter(
                          (m) =>
                            m.estado_banco === "CONCILIADO" || m.conciliado
                        ).length
                      }
                    />
                    <KpiSimple
                      label="Pendientes"
                      value={
                        movimientos.filter(
                          (m) =>
                            m.estado_banco !== "CONCILIADO" && !m.conciliado
                        ).length
                      }
                    />
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-slate-500">
                    La conciliación compara únicamente movimientos presentes en
                    el banco; no incluye operaciones internas.
                  </p>
                </SectionCard>
              </div>
            )}

            {tab === "historico" && (
              <Historico cierres={cierres} setPeriodo={setPeriodo} />
            )}
          </SectionCard>
        </>
      )}
    </PageContainer>
  );
}

function InfoLine({
  label,
  value,
  danger = false,
  success = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span
        className={`text-sm font-black ${
          danger
            ? "text-red-700"
            : success
              ? "text-emerald-700"
              : "text-slate-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function KpiSimple({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function ResumenLinea({
  label,
  valor,
  color = "text-slate-900",
  bold = false,
}: {
  label: string;
  valor: string;
  color?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3 last:border-b-0">
      <span className={bold ? "font-bold" : "text-slate-600"}>{label}</span>
      <span
        className={`${bold ? "text-lg font-bold" : "font-semibold"} ${color}`}
      >
        {valor}
      </span>
    </div>
  );
}

function FormularioMovimiento(props: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">Registrar movimiento bancario</h2>
      <p className="mt-1 text-sm text-slate-500">
        Solo movimientos que aparecen o aparecerán en el estado del banco.
      </p>

      <form onSubmit={props.registrarMovimiento} className="mt-4 space-y-3">
        <input
          type="date"
          value={props.fechaMovimiento}
          onChange={(e) => props.setFechaMovimiento(e.target.value)}
          className="w-full rounded-xl border px-4 py-3"
        />

        <select
          value={props.origen}
          onChange={(e) => props.cambiarOrigen(e.target.value)}
          className="w-full rounded-xl border px-4 py-3"
        >
          {ORIGENES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={props.tipoMovimiento}
          onChange={(e) => props.setTipoMovimiento(e.target.value)}
          className="w-full rounded-xl border px-4 py-3"
        >
          <option value="INGRESO">Ingreso</option>
          <option value="EGRESO">Egreso</option>
        </select>

        <input
          type="text"
          value={props.descripcion}
          onChange={(e) => props.setDescripcion(e.target.value)}
          placeholder="Descripción"
          className="w-full rounded-xl border px-4 py-3"
        />
        <input
          type="number"
          step="0.01"
          value={props.monto}
          onChange={(e) => props.setMonto(e.target.value)}
          placeholder="Monto"
          className="w-full rounded-xl border px-4 py-3"
        />
        <input
          type="text"
          value={props.numeroDocumento}
          onChange={(e) => props.setNumeroDocumento(e.target.value)}
          placeholder="No. cheque / documento"
          className="w-full rounded-xl border px-4 py-3"
        />
        <input
          type="text"
          value={props.beneficiario}
          onChange={(e) => props.setBeneficiario(e.target.value)}
          placeholder="Beneficiario"
          className="w-full rounded-xl border px-4 py-3"
        />
        <input
          type="text"
          value={props.referenciaBanco}
          onChange={(e) => props.setReferenciaBanco(e.target.value)}
          placeholder="Referencia banco"
          className="w-full rounded-xl border px-4 py-3"
        />

        <button
          disabled={props.guardando || props.cierreCerrado}
          className="w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {props.cierreCerrado
            ? "Período cerrado"
            : props.guardando
              ? "Guardando..."
              : "Registrar movimiento"}
        </button>
      </form>
    </div>
  );
}

function MovimientosTable({
  movimientos,
  balanceInicial,
  cambiarEstadoMovimiento,
}: {
  movimientos: Movimiento[];
  balanceInicial: number;
  cambiarEstadoMovimiento: (m: Movimiento) => void;
}) {
  let balance = Number(balanceInicial || 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Movimientos del mes</h2>
        <span className="text-sm text-slate-500">
          {movimientos.length} movimientos
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Origen</th>
              <th className="px-4 py-3 text-left">Descripción</th>
              <th className="px-4 py-3 text-right">Ingreso</th>
              <th className="px-4 py-3 text-right">Egreso</th>
              <th className="px-4 py-3 text-right">Saldo banco</th>
              <th className="px-4 py-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((m) => {
              balance +=
                m.tipo_movimiento === "INGRESO"
                  ? Number(m.monto || 0)
                  : -Number(m.monto || 0);
              return (
                <tr key={m.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3">{m.fecha_movimiento}</td>
                  <td className="px-4 py-3 font-semibold">
                    {origenLabel(m.origen)}
                  </td>
                  <td className="px-4 py-3">
                    <div>{m.descripcion || "-"}</div>
                    <div className="text-xs text-slate-500">
                      {m.numero_documento ? `Doc: ${m.numero_documento}` : ""}{" "}
                      {m.beneficiario ? ` · ${m.beneficiario}` : ""}
                    </div>
                    {m.referencia_banco && (
                      <div className="text-xs text-slate-500">
                        Ref. banco: {m.referencia_banco}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">
                    {m.tipo_movimiento === "INGRESO" ? dinero(m.monto) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-700">
                    {m.tipo_movimiento === "EGRESO" ? dinero(m.monto) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {dinero(balance)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => cambiarEstadoMovimiento(m)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${colorEstado(m.estado_banco || (m.conciliado ? "CONCILIADO" : "PENDIENTE"))}`}
                    >
                      {m.estado_banco ||
                        (m.conciliado ? "CONCILIADO" : "PENDIENTE")}
                    </button>
                  </td>
                </tr>
              );
            })}

            {movimientos.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No hay movimientos registrados en este período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Historico({
  cierres,
  setPeriodo,
}: {
  cierres: Cierre[];
  setPeriodo: (p: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">Histórico de cierres mensuales</h2>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">Período</th>
              <th className="px-4 py-3 text-right">Inicial</th>
              <th className="px-4 py-3 text-right">Ingresos</th>
              <th className="px-4 py-3 text-right">Egresos</th>
              <th className="px-4 py-3 text-right">Final</th>
              <th className="px-4 py-3 text-right">Saldo banco</th>
              <th className="px-4 py-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {cierres.map((c) => (
              <tr
                key={c.id}
                className="cursor-pointer border-t hover:bg-slate-50"
                onClick={() => setPeriodo(c.periodo)}
              >
                <td className="px-4 py-3 font-semibold">
                  {nombrePeriodo(c.periodo)}
                </td>
                <td className="px-4 py-3 text-right">
                  {dinero(c.balance_inicial)}
                </td>
                <td className="px-4 py-3 text-right text-green-700">
                  {dinero(c.total_ingresos)}
                </td>
                <td className="px-4 py-3 text-right text-red-700">
                  {dinero(c.total_gastos)}
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  {dinero(c.balance_final)}
                </td>
                <td className="px-4 py-3 text-right">
                  {dinero(c.saldo_banco)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${colorEstado(c.estado)}`}
                  >
                    {c.estado}
                  </span>
                </td>
              </tr>
            ))}
            {cierres.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No hay cierres mensuales registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
