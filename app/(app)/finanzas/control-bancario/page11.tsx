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
  total_cargos_bancarios: number;
  total_intereses_bancarios: number;
  total_ajustes: number;
  balance_final: number;
  saldo_banco: number;
  diferencia: number;
  conciliado: boolean;
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
  periodo: string;
  tipo_movimiento: "INGRESO" | "EGRESO";
  origen: string | null;
  referencia_id: number | null;
  descripcion: string | null;
  monto: number;
  conciliado: boolean | null;
  fecha_conciliacion: string | null;
  referencia_banco: string | null;
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

function periodoActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function fechaActual() {
  const hoy = new Date();
  return hoy.toISOString().slice(0, 10);
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

function colorTipo(tipo: string) {
  return tipo === "INGRESO" ? "text-green-700" : "text-red-700";
}

function signoTipo(tipo: string) {
  return tipo === "INGRESO" ? "+" : "-";
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

  const [fechaMovimiento, setFechaMovimiento] = useState(fechaActual());
  const [tipoMovimiento, setTipoMovimiento] = useState<"INGRESO" | "EGRESO">("EGRESO");
  const [origen, setOrigen] = useState("CARGO_BANCARIO");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [referenciaBanco, setReferenciaBanco] = useState("");
  const [saldoBanco, setSaldoBanco] = useState("");

  const cuentaSeleccionada = useMemo(
    () => cuentas.find((c) => String(c.id) === String(cuentaId)) || null,
    [cuentas, cuentaId]
  );

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
  }, [condominioId, cuentaId, periodo]);

  async function cargarCuentas(id: string) {
    const { data, error } = await supabase
      .from("cuentas_bancarias")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("id", { ascending: true });

    if (error) {
      alert("Error cargando cuentas bancarias: " + error.message);
      return;
    }

    const lista = data || [];
    setCuentas(lista);

    if (lista.length > 0) {
      setCuentaId(String(lista[0].id));
    }
  }

  async function cargarControlBancario() {
    setLoading(true);

    await supabase.rpc("recalcular_cierre_bancario_mensual", {
      p_condominio_id: Number(condominioId),
      p_cuenta_bancaria_id: Number(cuentaId),
      p_periodo: periodo,
    });

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
      .order("fecha_movimiento", { ascending: true })
      .order("id", { ascending: true });

    const { data: cierresData } = await supabase
      .from("banco_cierres_mensuales")
      .select("*")
      .eq("condominio_id", Number(condominioId))
      .eq("cuenta_bancaria_id", Number(cuentaId))
      .order("periodo", { ascending: false })
      .limit(12);

    setLoading(false);

    if (cierreError) {
      alert("Error cargando cierre mensual: " + cierreError.message);
      return;
    }

    if (movimientosError) {
      alert("Error cargando movimientos: " + movimientosError.message);
      return;
    }

    setCierre(cierreData as Cierre | null);
    setMovimientos((movimientosData || []) as Movimiento[]);
    setCierres((cierresData || []) as Cierre[]);
    setSaldoBanco(String(Number(cierreData?.saldo_banco || 0)));
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

    if (nuevoOrigen === "INTERES_BANCARIO") {
      setTipoMovimiento("INGRESO");
      return;
    }

    if (nuevoOrigen === "CARGO_BANCARIO" || nuevoOrigen === "IMPUESTO_BANCARIO") {
      setTipoMovimiento("EGRESO");
      return;
    }
  }

  async function registrarMovimiento(e: React.FormEvent) {
    e.preventDefault();

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

    const { error } = await supabase.rpc("registrar_movimiento_bancario_manual", {
      p_condominio_id: Number(condominioId),
      p_cuenta_bancaria_id: Number(cuentaId),
      p_fecha_movimiento: fechaMovimiento,
      p_tipo_movimiento: tipoMovimiento,
      p_origen: origen,
      p_descripcion: descripcion,
      p_monto: valor,
      p_referencia_banco: referenciaBanco || null,
    });

    setGuardando(false);

    if (error) {
      alert("Error registrando movimiento: " + error.message);
      return;
    }

    setDescripcion("");
    setMonto("");
    setReferenciaBanco("");
    await cargarControlBancario();
  }

  async function marcarConciliado(movimiento: Movimiento) {
    const { error } = await supabase
      .from("banco_movimientos")
      .update({
        conciliado: !movimiento.conciliado,
        fecha_conciliacion: !movimiento.conciliado ? fechaActual() : null,
      })
      .eq("id", movimiento.id);

    if (error) {
      alert("Error actualizando conciliación: " + error.message);
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
    const diferencia = saldo - Number(cierre.balance_final || 0);

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
      `¿Seguro que desea cerrar el período ${nombrePeriodo(periodo)}?`
    );

    if (!confirmar) return;

    const saldo = Number(saldoBanco || cierre.saldo_banco || 0);
    const diferencia = saldo - Number(cierre.balance_final || 0);

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Control Bancario</h1>
          <p className="text-slate-500">Condominio activo: {condominioNombre}</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <select
            value={cuentaId}
            onChange={(e) => setCuentaId(e.target.value)}
            className="border rounded-xl px-4 py-3 bg-white"
          >
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre_banco} - {c.numero_cuenta}
              </option>
            ))}
          </select>

          <input
            type="month"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="border rounded-xl px-4 py-3 bg-white"
          />
        </div>
      </div>

      {cuentas.length === 0 ? (
        <div className="bg-white rounded-2xl border p-6 text-slate-600">
          No hay cuentas bancarias registradas para este condominio.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  {cuentaSeleccionada?.nombre_banco || "Cuenta bancaria"}
                </h2>
                <p className="text-slate-500">
                  Cuenta: {cuentaSeleccionada?.numero_cuenta || "-"} · Período: {nombrePeriodo(periodo)}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={recalcularMes}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl"
                >
                  Recalcular mes
                </button>
                <button
                  onClick={cerrarMes}
                  disabled={!cierre || cierre.estado === "CERRADO"}
                  className="bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white px-4 py-2 rounded-xl"
                >
                  Cerrar mes
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border p-5 shadow-sm">
              <p className="text-sm text-slate-500">Saldo inicial</p>
              <h3 className="text-2xl font-bold mt-2">{dinero(cierre?.balance_inicial)}</h3>
            </div>

            <div className="bg-white rounded-2xl border p-5 shadow-sm">
              <p className="text-sm text-slate-500">Ingresos</p>
              <h3 className="text-2xl font-bold text-green-700 mt-2">{dinero(cierre?.total_ingresos)}</h3>
            </div>

            <div className="bg-white rounded-2xl border p-5 shadow-sm">
              <p className="text-sm text-slate-500">Gastos</p>
              <h3 className="text-2xl font-bold text-red-700 mt-2">{dinero(cierre?.total_gastos)}</h3>
            </div>

            <div className="bg-white rounded-2xl border p-5 shadow-sm">
              <p className="text-sm text-slate-500">Saldo contable</p>
              <h3 className="text-2xl font-bold text-blue-700 mt-2">{dinero(cierre?.balance_final)}</h3>
            </div>

            <div className="bg-white rounded-2xl border p-5 shadow-sm">
              <p className="text-sm text-slate-500">Cargos / impuestos banco</p>
              <h3 className="text-2xl font-bold text-orange-700 mt-2">{dinero(cierre?.total_cargos_bancarios)}</h3>
            </div>

            <div className="bg-white rounded-2xl border p-5 shadow-sm">
              <p className="text-sm text-slate-500">Intereses bancarios</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-2">{dinero(cierre?.total_intereses_bancarios)}</h3>
            </div>

            <div className="bg-white rounded-2xl border p-5 shadow-sm">
              <p className="text-sm text-slate-500">Ajustes</p>
              <h3 className="text-2xl font-bold mt-2">{dinero(cierre?.total_ajustes)}</h3>
            </div>

            <div className="bg-white rounded-2xl border p-5 shadow-sm">
              <p className="text-sm text-slate-500">Estado</p>
              <h3 className={`text-2xl font-bold mt-2 ${cierre?.conciliado ? "text-green-700" : "text-amber-700"}`}>
                {cierre?.estado || "ABIERTO"}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border shadow-sm p-6 xl:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Movimientos del mes</h2>
                <span className="text-sm text-slate-500">{movimientos.length} movimientos</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Origen</th>
                      <th className="px-4 py-3 text-left">Descripción</th>
                      <th className="px-4 py-3 text-right">Monto</th>
                      <th className="px-4 py-3 text-center">Conciliado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {movimientos.map((m) => (
                      <tr key={m.id} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-3">{m.fecha_movimiento}</td>
                        <td className="px-4 py-3 font-semibold">{m.origen || "-"}</td>
                        <td className="px-4 py-3">
                          <div>{m.descripcion || "-"}</div>
                          {m.referencia_banco && (
                            <div className="text-xs text-slate-500">Ref. banco: {m.referencia_banco}</div>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${colorTipo(m.tipo_movimiento)}`}>
                          {signoTipo(m.tipo_movimiento)} {dinero(m.monto)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => marcarConciliado(m)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              m.conciliado
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {m.conciliado ? "Sí" : "Pendiente"}
                          </button>
                        </td>
                      </tr>
                    ))}

                    {movimientos.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-500">
                          No hay movimientos registrados en este período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h2 className="text-xl font-bold mb-4">Registrar movimiento manual</h2>

                <form onSubmit={registrarMovimiento} className="space-y-3">
                  <input
                    type="date"
                    value={fechaMovimiento}
                    onChange={(e) => setFechaMovimiento(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3"
                  />

                  <select
                    value={origen}
                    onChange={(e) => cambiarOrigen(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3"
                  >
                    <option value="CARGO_BANCARIO">Cargo bancario</option>
                    <option value="IMPUESTO_BANCARIO">Impuesto bancario / transferencia</option>
                    <option value="INTERES_BANCARIO">Interés bancario</option>
                    <option value="AJUSTE">Ajuste</option>
                  </select>

                  <select
                    value={tipoMovimiento}
                    onChange={(e) => setTipoMovimiento(e.target.value as "INGRESO" | "EGRESO")}
                    className="w-full border rounded-xl px-4 py-3"
                  >
                    <option value="INGRESO">Ingreso</option>
                    <option value="EGRESO">Egreso</option>
                  </select>

                  <input
                    type="text"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Descripción"
                    className="w-full border rounded-xl px-4 py-3"
                  />

                  <input
                    type="number"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="Monto"
                    className="w-full border rounded-xl px-4 py-3"
                  />

                  <input
                    type="text"
                    value={referenciaBanco}
                    onChange={(e) => setReferenciaBanco(e.target.value)}
                    placeholder="Referencia banco opcional"
                    className="w-full border rounded-xl px-4 py-3"
                  />

                  <button
                    type="submit"
                    disabled={guardando}
                    className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white px-4 py-3 rounded-xl font-semibold"
                  >
                    {guardando ? "Guardando..." : "Registrar movimiento"}
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h2 className="text-xl font-bold mb-4">Conciliación bancaria</h2>

                <label className="text-sm text-slate-600">Saldo según banco</label>
                <input
                  type="number"
                  step="0.01"
                  value={saldoBanco}
                  onChange={(e) => setSaldoBanco(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 mt-1 mb-3"
                />

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span>Saldo contable VAM</span>
                    <strong>{dinero(cierre?.balance_final)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Diferencia</span>
                    <strong className={Number(cierre?.diferencia || 0) === 0 ? "text-green-700" : "text-red-700"}>
                      {dinero(cierre?.diferencia)}
                    </strong>
                  </div>
                </div>

                <button
                  onClick={guardarSaldoBanco}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-semibold"
                >
                  Guardar saldo banco
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-bold">Historial de cierres mensuales</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Período</th>
                    <th className="px-4 py-3 text-right">Inicial</th>
                    <th className="px-4 py-3 text-right">Ingresos</th>
                    <th className="px-4 py-3 text-right">Gastos</th>
                    <th className="px-4 py-3 text-right">Cargos banco</th>
                    <th className="px-4 py-3 text-right">Final</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {cierres.map((c) => (
                    <tr
                      key={c.id}
                      className="border-t hover:bg-slate-50 cursor-pointer"
                      onClick={() => setPeriodo(c.periodo)}
                    >
                      <td className="px-4 py-3 font-semibold">{nombrePeriodo(c.periodo)}</td>
                      <td className="px-4 py-3 text-right">{dinero(c.balance_inicial)}</td>
                      <td className="px-4 py-3 text-right text-green-700">{dinero(c.total_ingresos)}</td>
                      <td className="px-4 py-3 text-right text-red-700">{dinero(c.total_gastos)}</td>
                      <td className="px-4 py-3 text-right text-orange-700">{dinero(c.total_cargos_bancarios)}</td>
                      <td className="px-4 py-3 text-right font-bold">{dinero(c.balance_final)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          c.estado === "CERRADO"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-green-100 text-green-700"
                        }`}>
                          {c.estado}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {cierres.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">
                        No hay cierres mensuales registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
