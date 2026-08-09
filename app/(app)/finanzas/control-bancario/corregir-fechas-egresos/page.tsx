"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Loader2,
  RefreshCw,
  Save,
  Search,
  XCircle,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

type Perfil = {
  condominio_id: number | null;
  condominio: string | null;
};

type Cuenta = {
  id: number;
  nombre_banco: string | null;
  numero_cuenta: string | null;
};

type Movimiento = {
  id: number;
  condominio_id: number;
  cuenta_bancaria_id: number;
  fecha_movimiento: string | null;
  periodo: string | null;
  tipo_movimiento: string | null;
  origen: string | null;
  referencia_id: number | null;
  descripcion: string | null;
  monto: number | string | null;
  numero_documento: string | null;
  beneficiario: string | null;
  estado_banco: string | null;
};

type Gasto = {
  id: number;
  fecha_pago: string | null;
  numero_cheque: string | null;
  concepto: string | null;
  descripcion: string | null;
  proveedor: string | null;
  proveedor_id: number | null;
};

type Fila = {
  movimiento: Movimiento;
  gasto: Gasto | null;
  proveedor: string;
};

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
});

function toNumber(value: unknown): number {
  const numero =
    typeof value === "number"
      ? value
      : Number(
          String(value || "")
            .replace(/RD\$/gi, "")
            .replace(/\$/g, "")
            .replace(/,/g, "")
            .trim()
        );

  return Number.isFinite(numero) ? numero : 0;
}

function dinero(value: unknown): string {
  return moneda.format(toNumber(value));
}

function texto(value: unknown, fallback = "-"): string {
  const resultado = String(value || "").trim();
  return resultado || fallback;
}

function fechaTexto(value: unknown): string {
  if (!value) return "-";

  const iso = String(value).slice(0, 10);
  const fecha = new Date(`${iso}T12:00:00`);

  if (Number.isNaN(fecha.getTime())) return iso;

  return fecha.toLocaleDateString("es-DO");
}

function periodoActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(
    hoy.getMonth() + 1
  ).padStart(2, "0")}`;
}

function periodos(cantidad = 36): string[] {
  const hoy = new Date();
  const lista: string[] = [];

  for (let i = 0; i < cantidad; i += 1) {
    const fecha = new Date(
      hoy.getFullYear(),
      hoy.getMonth() - i,
      1
    );

    lista.push(
      `${fecha.getFullYear()}-${String(
        fecha.getMonth() + 1
      ).padStart(2, "0")}`
    );
  }

  return lista;
}

function nombrePeriodo(periodo: string): string {
  const [anio, mes] = periodo.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, 1);

  const nombre = fecha.toLocaleDateString("es-DO", {
    month: "long",
  });

  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

export default function CorregirFechasEgresosPage() {
  const [loading, setLoading] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);

  const [periodo, setPeriodo] = useState(periodoActual());
  const [movimientoId, setMovimientoId] = useState("");
  const [monto, setMonto] = useState("");

  const [filas, setFilas] = useState<Fila[]>([]);
  const [seleccionado, setSeleccionado] = useState<Fila | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    void iniciar();
  }, []);

  async function iniciar() {
    setLoading(true);
    setError(null);

    try {
      const contexto = await obtenerContexto();

      if (!contexto.condominio_id) {
        throw new Error("No se pudo identificar el condominio activo.");
      }

      setPerfil(contexto);

      const cuentaActiva = await obtenerCuenta(
        contexto.condominio_id
      );

      if (!cuentaActiva) {
        throw new Error(
          "El condominio no tiene una cuenta bancaria activa."
        );
      }

      setCuenta(cuentaActiva);
    } catch (err: any) {
      setError(err?.message || "No se pudo iniciar el módulo.");
    } finally {
      setLoading(false);
    }
  }

  async function obtenerContexto(): Promise<Perfil> {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user) throw new Error("No hay usuario logueado.");

    async function buscar(campo: string, valor: string) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq(campo, valor)
        .maybeSingle();

      return data;
    }

    let profile: any = await buscar("id", user.id);

    if (!profile) profile = await buscar("user_id", user.id);
    if (!profile) profile = await buscar("auth_id", user.id);
    if (!profile && user.email) {
      profile = await buscar("email", user.email);
    }

    let condominioId =
      profile?.condominio_id ??
      profile?.id_condominio ??
      profile?.condominioId ??
      null;

    let condominioNombre =
      profile?.condominio ??
      profile?.nombre_condominio ??
      profile?.condominio_nombre ??
      null;

    if (!condominioId && typeof window !== "undefined") {
      const llaves = [
        "condominio_id",
        "condominioId",
        "selectedCondominioId",
        "vam_condominio_id",
        "condominio_actual",
        "vam_condominio_actual",
        "condominioSeleccionado",
      ];

      for (const llave of llaves) {
        const raw = localStorage.getItem(llave);
        if (!raw) continue;

        try {
          const parsed = JSON.parse(raw);
          const posibleId =
            parsed?.id ??
            parsed?.condominio_id ??
            parsed?.id_condominio ??
            raw;

          const numeroId = Number(posibleId);

          if (Number.isFinite(numeroId) && numeroId > 0) {
            condominioId = numeroId;
            condominioNombre =
              parsed?.nombre ??
              parsed?.condominio ??
              condominioNombre;
            break;
          }
        } catch {
          const numeroId = Number(raw);

          if (Number.isFinite(numeroId) && numeroId > 0) {
            condominioId = numeroId;
            break;
          }
        }
      }
    }

    if (!condominioId) {
      return { condominio_id: null, condominio: null };
    }

    const { data: condominio } = await supabase
      .from("condominios")
      .select("id, nombre")
      .eq("id", Number(condominioId))
      .maybeSingle();

    return {
      condominio_id: Number(condominioId),
      condominio:
        condominio?.nombre ||
        condominioNombre ||
        "Condominio",
    };
  }

  async function obtenerCuenta(
    condominioId: number
  ): Promise<Cuenta | null> {
    const { data, error } = await supabase
      .from("cuentas_bancarias")
      .select("id, nombre_banco, numero_cuenta")
      .eq("condominio_id", condominioId)
      .eq("activa", true)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return (data as Cuenta) || null;
  }

  async function buscarRegistros() {
    if (!perfil?.condominio_id || !cuenta?.id) return;

    setConsultando(true);
    setError(null);
    setMensaje(null);
    setSeleccionado(null);

    try {
      let query = supabase
        .from("banco_movimientos")
        .select("*")
        .eq("condominio_id", perfil.condominio_id)
        .eq("cuenta_bancaria_id", cuenta.id)
        .eq("tipo_movimiento", "EGRESO")
        .neq("estado_banco", "ANULADO");

      const id = Number(movimientoId);

      if (movimientoId.trim() && Number.isFinite(id) && id > 0) {
        query = query.eq("id", id);
      } else {
        query = query.eq("periodo", periodo);
      }

      const montoExacto = toNumber(monto);

      if (monto.trim() && montoExacto > 0) {
        query = query.eq("monto", montoExacto);
      }

      const { data, error } = await query
        .order("fecha_movimiento", { ascending: true })
        .order("id", { ascending: true })
        .limit(200);

      if (error) throw error;

      const movimientos = (data || []) as Movimiento[];

      const gastoIds = Array.from(
        new Set(
          movimientos
            .map((item) => Number(item.referencia_id || 0))
            .filter((id) => id > 0)
        )
      );

      const gastos = new Map<number, Gasto>();

      if (gastoIds.length > 0) {
        const { data: gastosData, error: gastosError } =
          await supabase
            .from("gastos")
            .select(`
              id,
              fecha_pago,
              numero_cheque,
              concepto,
              descripcion,
              proveedor,
              proveedor_id
            `)
            .in("id", gastoIds);

        if (gastosError) throw gastosError;

        ((gastosData || []) as Gasto[]).forEach((gasto) => {
          gastos.set(gasto.id, gasto);
        });
      }

      const proveedorIds = Array.from(
        new Set(
          Array.from(gastos.values())
            .map((gasto) => Number(gasto.proveedor_id || 0))
            .filter((id) => id > 0)
        )
      );

      const proveedores = new Map<number, string>();

      if (proveedorIds.length > 0) {
        const { data: proveedoresData } = await supabase
          .from("catalogo_proveedores")
          .select("id, nombre_proveedor")
          .in("id", proveedorIds);

        (proveedoresData || []).forEach((item: any) => {
          proveedores.set(
            Number(item.id),
            texto(item.nombre_proveedor, "")
          );
        });
      }

      const resultado = movimientos.map((movimiento) => {
        const gasto = movimiento.referencia_id
          ? gastos.get(Number(movimiento.referencia_id)) || null
          : null;

        const proveedor =
          (gasto?.proveedor_id
            ? proveedores.get(Number(gasto.proveedor_id))
            : "") ||
          texto(
            gasto?.proveedor || movimiento.beneficiario,
            "Proveedor no identificado"
          );

        return { movimiento, gasto, proveedor };
      });

      setFilas(resultado);

      if (resultado.length === 0) {
        setMensaje("No se encontraron registros.");
      }
    } catch (err: any) {
      setError(err?.message || "No se pudo realizar la búsqueda.");
      setFilas([]);
    } finally {
      setConsultando(false);
    }
  }

  function editar(fila: Fila) {
    setSeleccionado(fila);
    setNuevaFecha(
      String(
        fila.movimiento.fecha_movimiento ||
          fila.gasto?.fecha_pago ||
          ""
      ).slice(0, 10)
    );
    setError(null);
    setMensaje(null);
  }

  async function guardar() {
    if (!seleccionado || !nuevaFecha) return;

    const confirmado = window.confirm(
      [
        `Movimiento: ${seleccionado.movimiento.id}`,
        `Gasto: ${seleccionado.gasto?.id || "-"}`,
        `Monto: ${dinero(seleccionado.movimiento.monto)}`,
        `Fecha actual: ${fechaTexto(
          seleccionado.movimiento.fecha_movimiento
        )}`,
        `Nueva fecha: ${fechaTexto(nuevaFecha)}`,
        `Nuevo periodo: ${nuevaFecha.slice(0, 7)}`,
        "",
        "¿Confirmas la corrección?",
      ].join("\n")
    );

    if (!confirmado) return;

    setGuardando(true);
    setError(null);
    setMensaje(null);

    try {
      const { data, error } = await supabase.rpc(
        "corregir_fecha_egreso_bancario",
        {
          p_banco_movimiento_id:
            seleccionado.movimiento.id,
          p_nueva_fecha: nuevaFecha,
        }
      );

      if (error) throw error;

      setMensaje(
        data?.mensaje || "Fecha corregida correctamente."
      );
      setSeleccionado(null);
      setNuevaFecha("");

      await buscarRegistros();
    } catch (err: any) {
      setError(err?.message || "No se pudo guardar la corrección.");
    } finally {
      setGuardando(false);
    }
  }

  function limpiar() {
    setMovimientoId("");
    setMonto("");
    setPeriodo(periodoActual());
    setFilas([]);
    setSeleccionado(null);
    setNuevaFecha("");
    setError(null);
    setMensaje(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-8">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
            Control Bancario
          </p>

          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-950">
                Corrección de fechas de egresos
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Actualiza conjuntamente el gasto y el movimiento bancario.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p>
                <strong>Condominio:</strong>{" "}
                {perfil?.condominio || "-"}
              </p>
              <p className="mt-1">
                <strong>Cuenta:</strong>{" "}
                {cuenta
                  ? `${cuenta.nombre_banco || "Banco"} - ${
                      cuenta.numero_cuenta || "Sin número"
                    }`
                  : "-"}
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-4">
            <Campo
              label="ID movimiento"
              value={movimientoId}
              onChange={setMovimientoId}
              type="number"
              placeholder="399"
            />

            <Campo
              label="Monto exacto"
              value={monto}
              onChange={setMonto}
              type="number"
              placeholder="20491.12"
            />

            <label className="text-sm font-bold text-slate-700">
              Periodo
              <select
                value={periodo}
                onChange={(event) => setPeriodo(event.target.value)}
                disabled={Boolean(movimientoId.trim())}
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 disabled:bg-slate-100"
              >
                {periodos().map((item) => (
                  <option key={item} value={item}>
                    {nombrePeriodo(item)}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={buscarRegistros}
                disabled={consultando}
                className="flex-1 rounded-xl bg-blue-800 px-4 py-2 font-black text-white disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-2">
                  {consultando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Buscar
                </span>
              </button>

              <button
                type="button"
                onClick={limpiar}
                className="rounded-xl border p-2"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        {error && <Aviso tipo="error" texto={error} />}
        {mensaje && <Aviso tipo="ok" texto={mensaje} />}

        <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="border-b bg-slate-50 px-5 py-4">
            <h2 className="font-black">Egresos encontrados</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Periodo</th>
                  <th className="px-4 py-3">Cheque</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Concepto</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {filas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Busca por ID, monto o periodo.
                    </td>
                  </tr>
                ) : (
                  filas.map((fila) => (
                    <tr
                      key={fila.movimiento.id}
                      className="border-t"
                    >
                      <td className="px-4 py-3 font-black">
                        {fila.movimiento.id}
                      </td>
                      <td className="px-4 py-3">
                        {fechaTexto(
                          fila.movimiento.fecha_movimiento
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {fila.movimiento.periodo}
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {texto(
                          fila.gasto?.numero_cheque ||
                            fila.movimiento.numero_documento
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {fila.proveedor}
                      </td>
                      <td className="max-w-md px-4 py-3">
                        {texto(
                          fila.gasto?.concepto ||
                            fila.gasto?.descripcion ||
                            fila.movimiento.descripcion
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-red-700">
                        {dinero(fila.movimiento.monto)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => editar(fila)}
                          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white"
                        >
                          <Edit3 className="h-4 w-4" />
                          Corregir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {seleccionado && (
          <section className="rounded-3xl border-2 border-blue-700 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black">
              Corregir movimiento {seleccionado.movimiento.id}
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <Dato
                label="Monto"
                valor={dinero(seleccionado.movimiento.monto)}
              />
              <Dato
                label="Fecha actual"
                valor={fechaTexto(
                  seleccionado.movimiento.fecha_movimiento
                )}
              />
              <Dato
                label="Periodo actual"
                valor={seleccionado.movimiento.periodo || "-"}
              />
              <Dato
                label="Gasto relacionado"
                valor={String(seleccionado.gasto?.id || "-")}
              />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="text-sm font-black">
                Nueva fecha
                <input
                  type="date"
                  value={nuevaFecha}
                  onChange={(event) =>
                    setNuevaFecha(event.target.value)
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </label>

              <Dato
                label="Nuevo periodo"
                valor={nuevaFecha.slice(0, 7) || "-"}
              />

              <button
                type="button"
                onClick={guardar}
                disabled={guardando || !nuevaFecha}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-black text-white disabled:opacity-60"
              >
                {guardando ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                Guardar
              </button>
            </div>

            <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p>
                No crea movimientos nuevos. Si el mes de origen o
                destino está cerrado, la operación será bloqueada.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  type,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: string;
  placeholder: string;
}) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border px-3 py-2"
      />
    </label>
  );
}

function Dato({
  label,
  valor,
}: {
  label: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-black">{valor}</p>
    </div>
  );
}

function Aviso({
  tipo,
  texto: contenido,
}: {
  tipo: "ok" | "error";
  texto: string;
}) {
  const ok = tipo === "ok";

  return (
    <div
      className={`flex gap-3 rounded-2xl border p-4 text-sm ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="h-5 w-5 shrink-0" />
      ) : (
        <XCircle className="h-5 w-5 shrink-0" />
      )}
      <p>{contenido}</p>
    </div>
  );
}
