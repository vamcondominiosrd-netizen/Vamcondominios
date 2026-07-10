"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

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
    const { error } = await supabase.rpc("recalcular_cierre_bancario_mensual", {
      p_condominio_id: Number(condominioId),
      p_cuenta_bancaria_id: Number(cuentaId),
      p_periodo: periodo,
    });
    setLoading(false);

    if (error) {
      alert("Error recalculando cierre: " + error.message);
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
      alert("Debe recalcular el mes antes de cerrarlo.");
      return;
    }

    const confirmar = confirm(
      `¿Seguro que desea cerrar el período ${nombrePeriodo(periodo)}?`,
    );
    if (!confirmar) return;

    const saldo = Number(saldoBanco || cierre.saldo_banco || 0);
    const diferencia = saldo - Number(totales.balanceFinal || 0);

    const { error } = await supabase
      .from("banco_cierres_mensuales")
      .update({
        saldo_banco: saldo,
        diferencia,
        conciliado: diferencia === 0,
        estado: "CERRADO",
        fecha_cierre: fechaActual(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", cierre.id);

    if (error) {
      alert("Error cerrando mes: " + error.message);
      return;
    }

    await cargarControlBancario();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-slate-900 text-2xl text-white shadow-sm">
              🏦
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                Finanzas
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
                Control Bancario
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Libro bancario mensual del condominio. Solo movimientos reales
                del banco: ingresos, cheques, transferencias, cargos, impuestos,
                intereses y ajustes bancarios.
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                Condominio activo: {condominioNombre}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:min-w-[520px]">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cuenta bancaria
              </label>
              <select
                value={cuentaId}
                onChange={(e) => setCuentaId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_banco} - {c.numero_cuenta}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Período
              </label>
              <input
                type="month"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>
      </div>

      {cuentas.length === 0 ? (
        <div className="rounded-2xl border bg-white p-6 text-slate-600 shadow-sm">
          No hay cuentas bancarias activas registradas para este condominio.
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {cuentaSeleccionada?.nombre_banco || "Cuenta bancaria"}
                </h2>
                <p className="text-sm text-slate-500">
                  Cuenta: {cuentaSeleccionada?.numero_cuenta || "-"} ·{" "}
                  {nombrePeriodo(periodo)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${colorEstado(cierre?.estado)}`}
                >
                  {cierre?.estado || "ABIERTO"}
                </span>
                <button
                  onClick={recalcularMes}
                  disabled={loading}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? "Recalculando..." : "Recalcular"}
                </button>
                <button
                  onClick={cerrarMes}
                  disabled={!cierre || cierre.estado === "CERRADO"}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  Cerrar mes
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Kpi
              titulo="Saldo inicial"
              valor={dinero(cierre?.balance_inicial)}
            />
            <Kpi
              titulo="Ingresos banco"
              valor={dinero(totales.ingresos)}
              color="text-green-700"
            />
            <Kpi
              titulo="Egresos banco"
              valor={dinero(totales.egresos)}
              color="text-red-700"
            />
            <Kpi
              titulo="Saldo al cierre"
              valor={dinero(totales.balanceFinal)}
              color="text-blue-700"
            />
            <Kpi
              titulo="Cargos / impuestos"
              valor={dinero(totales.cargosBanco)}
              color="text-orange-700"
            />
            <Kpi
              titulo="Intereses"
              valor={dinero(totales.intereses)}
              color="text-emerald-700"
            />
            <Kpi
              titulo="Saldo banco"
              valor={dinero(cierre?.saldo_banco)}
              color="text-slate-900"
            />
            <Kpi
              titulo="Diferencia"
              valor={dinero(totales.diferencia)}
              color={
                Number(totales.diferencia || 0) === 0
                  ? "text-green-700"
                  : "text-red-700"
              }
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap gap-2 border-b p-3">
              {[
                ["resumen", "Resumen"],
                ["movimientos", "Movimientos"],
                ["conciliacion", "Conciliación"],
                ["historico", "Histórico"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key as typeof tab)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    tab === key
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-5">
              {tab === "resumen" && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
                  <div className="xl:col-span-2">
                    <h2 className="text-xl font-bold">Resumen del período</h2>
                    <div className="mt-4 overflow-hidden rounded-2xl border">
                      <ResumenLinea
                        label="Saldo inicial"
                        valor={dinero(cierre?.balance_inicial)}
                      />
                      <ResumenLinea
                        label="+ Ingresos reales en banco"
                        valor={dinero(totales.ingresos)}
                        color="text-green-700"
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
                    <p className="mt-3 text-sm text-slate-500">
                      Este cálculo solo incluye movimientos reales del banco:
                      pagos de propietarios, cheques, transferencias, reposición
                      de caja chica, nómina pagada, cargos, impuestos, intereses
                      y ajustes bancarios.
                    </p>
                  </div>

                  <div className="rounded-2xl border p-5">
                    <h2 className="text-xl font-bold">Saldo inicial</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Balance con que inicia la cuenta en este período. No se
                      cuenta como ingreso.
                    </p>
                    <label className="mt-4 block text-sm font-medium text-slate-600">
                      Monto inicial del período
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={saldoInicial}
                      onChange={(e) => setSaldoInicial(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-4 py-3"
                      disabled={cierre?.estado === "CERRADO"}
                    />
                    <button
                      onClick={guardarSaldoInicial}
                      disabled={cierre?.estado === "CERRADO"}
                      className="mt-4 w-full rounded-xl bg-slate-800 px-4 py-3 font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
                    >
                      Guardar saldo inicial
                    </button>
                  </div>

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
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="rounded-2xl border p-5">
                    <h2 className="text-xl font-bold">Conciliación bancaria</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Coloque el saldo final que aparece en el estado de cuenta
                      del banco al cierre del mes.
                    </p>

                    <label className="mt-5 block text-sm font-medium text-slate-600">
                      Saldo según banco
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={saldoBanco}
                      onChange={(e) => setSaldoBanco(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-4 py-3"
                    />

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Saldo VAM</span>
                        <strong>{dinero(totales.balanceFinal)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Diferencia</span>
                        <strong
                          className={
                            Number(totales.diferencia || 0) === 0
                              ? "text-green-700"
                              : "text-red-700"
                          }
                        >
                          {dinero(totales.diferencia)}
                        </strong>
                      </div>
                    </div>

                    <button
                      onClick={guardarSaldoBanco}
                      className="mt-5 w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"
                    >
                      Guardar saldo banco
                    </button>
                  </div>

                  <div className="rounded-2xl border p-5">
                    <h2 className="text-xl font-bold">Estado de movimientos</h2>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <KpiSimple
                        label="Conciliados"
                        value={
                          movimientos.filter(
                            (m) =>
                              m.estado_banco === "CONCILIADO" || m.conciliado,
                          ).length
                        }
                      />
                      <KpiSimple
                        label="Pendientes"
                        value={
                          movimientos.filter(
                            (m) =>
                              m.estado_banco !== "CONCILIADO" && !m.conciliado,
                          ).length
                        }
                      />
                    </div>
                    <p className="mt-4 text-sm text-slate-500">
                      La conciliación debe comparar únicamente los movimientos
                      que aparecen en el banco, no operaciones internas.
                    </p>
                  </div>
                </div>
              )}

              {tab === "historico" && (
                <Historico cierres={cierres} setPeriodo={setPeriodo} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({
  titulo,
  valor,
  color = "text-slate-900",
}: {
  titulo: string;
  valor: string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {titulo}
          </p>
          <h3 className={`mt-2 text-xl font-bold ${color}`}>{valor}</h3>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-slate-100 text-lg">
          💳
        </div>
      </div>
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
    <div className="rounded-2xl border p-5">
      <h2 className="text-xl font-bold">Registrar movimiento bancario</h2>
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
          className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
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

      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
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
      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
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
