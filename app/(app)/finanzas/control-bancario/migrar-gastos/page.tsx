"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ExternalLink,
  Landmark,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";
import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import SectionCard from "@/components/vam/enterprise/SectionCard";

type CuentaBancaria = {
  id: number;
  client_id: number | null;
  condominio_id: number;
  nombre_banco: string | null;
  numero_cuenta: string | null;
  tipo_cuenta: string | null;
  moneda: string | null;
  activa: boolean | null;
  balance_actual: number | string | null;
};

type SolicitudRevision = {
  solicitud_id: number;
  numero_solicitud: number | null;
  condominio_id: number | null;
  condominio: string | null;
  proveedor_id: number | null;
  categoria_id: number | null;
  concepto: string | null;
  detalle: string | null;
  gasto_generado_id: number | null;
  gasto_id: number | null;
  estado_operativo: string | null;
};

type Gasto = {
  id: number;
  condominio_id: number;
  fecha_pago: string | null;
  proveedor: string | null;
  proveedor_id: number | null;
  concepto: string | null;
  descripcion: string | null;
  monto: number | string | null;
  total: number | string | null;
  numero_cheque: string | null;
  metodo_pago: string | null;
  pagado: boolean | null;
  factura_url: string | null;
  cheque_url: string | null;
  cuenta_bancaria_id: number | null;
};

type MovimientoExistente = {
  id: number;
  referencia_id: number | null;
  numero_documento: string | null;
  referencia_banco: string | null;
  fecha_movimiento: string;
  monto: number | string;
  estado_banco: string | null;
};

type FilaMigracion = {
  solicitud: SolicitudRevision;
  gasto: Gasto;
  proveedorNombre: string;
  movimientoPorGasto: MovimientoExistente | null;
  movimientoPorDocumento: MovimientoExistente | null;
  estado:
    | "LISTO"
    | "YA_EN_BANCO"
    | "DOCUMENTO_EXISTE"
    | "FALTA_FECHA"
    | "FALTA_DOCUMENTO"
    | "MONTO_INVALIDO"
    | "NO_PAGADO";
  detalleEstado: string;
};

type ResultadoMigracion = {
  ok: boolean;
  cantidad_insertada: number;
  total_insertado: number;
  mensaje: string;
  movimientos?: Array<{
    movimiento_banco_id: number;
    gasto_id: number;
    numero_documento: string;
    monto: number;
  }>;
};

const ESTADO_REVISION = "Revisar: pagado sin banco";

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function numero(valor: unknown): number {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  const limpio = String(valor || "")
    .replace(/RD\$/gi, "")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .trim();

  const resultado = Number(limpio);
  return Number.isFinite(resultado) ? resultado : 0;
}

function dinero(valor: unknown): string {
  return moneda.format(numero(valor));
}

function fechaTexto(valor: unknown): string {
  const fecha = String(valor || "").split("T")[0];
  if (!fecha) return "-";

  const partes = fecha.split("-");
  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : fecha;
}

function texto(valor: unknown, alternativa = "-"): string {
  const resultado = String(valor || "").trim();
  return resultado || alternativa;
}

function normalizarDocumento(valor: unknown): string {
  return String(valor || "").trim().toUpperCase();
}

function numeroSolicitud(solicitud: SolicitudRevision): string {
  return solicitud.numero_solicitud
    ? String(solicitud.numero_solicitud).padStart(5, "0")
    : String(solicitud.solicitud_id);
}

function obtenerEstadoFila(
  gasto: Gasto,
  movimientoPorGasto: MovimientoExistente | null,
  movimientoPorDocumento: MovimientoExistente | null
): Pick<FilaMigracion, "estado" | "detalleEstado"> {
  if (movimientoPorGasto) {
    return {
      estado: "YA_EN_BANCO",
      detalleEstado: `Movimiento ID ${movimientoPorGasto.id}`,
    };
  }

  if (movimientoPorDocumento) {
    return {
      estado: "DOCUMENTO_EXISTE",
      detalleEstado: `Cheque/documento ya usado en movimiento ID ${movimientoPorDocumento.id}`,
    };
  }

  if (gasto.pagado !== true) {
    return {
      estado: "NO_PAGADO",
      detalleEstado: "El gasto no está marcado como pagado",
    };
  }

  if (!gasto.fecha_pago) {
    return {
      estado: "FALTA_FECHA",
      detalleEstado: "Falta la fecha real de pago",
    };
  }

  if (!normalizarDocumento(gasto.numero_cheque)) {
    return {
      estado: "FALTA_DOCUMENTO",
      detalleEstado: "Falta el número de cheque o documento",
    };
  }

  if (numero(gasto.total ?? gasto.monto) <= 0) {
    return {
      estado: "MONTO_INVALIDO",
      detalleEstado: "El monto no es válido",
    };
  }

  return {
    estado: "LISTO",
    detalleEstado: "Listo para pasar al banco",
  };
}

function claseEstado(estado: FilaMigracion["estado"]): string {
  if (estado === "LISTO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (estado === "YA_EN_BANCO") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

export default function MigrarGastosSinBancoPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [cuentaId, setCuentaId] = useState("");

  const [filas, setFilas] = useState<FilaMigracion[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(
    new Set()
  );

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

  const [loading, setLoading] = useState(true);
  const [migrando, setMigrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [resultado, setResultado] =
    useState<ResultadoMigracion | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      setError(
        "No hay un condominio activo. Inicia sesión nuevamente."
      );
      setLoading(false);
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre || `Condominio ID ${id}`);

    void cargarCuentas(id);
  }, []);

  useEffect(() => {
    if (!condominioId || !cuentaId) {
      setFilas([]);
      setSeleccionados(new Set());
      return;
    }

    void cargarPendientes(condominioId, cuentaId);
  }, [condominioId, cuentaId]);

  async function cargarCuentas(id: string) {
    setLoading(true);
    setError(null);

    const { data, error: cuentasError } = await supabase
      .from("cuentas_bancarias")
      .select(
        "id, client_id, condominio_id, nombre_banco, numero_cuenta, tipo_cuenta, moneda, activa, balance_actual"
      )
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("id", { ascending: true });

    if (cuentasError) {
      setError(
        "Error cargando cuentas bancarias: " +
          cuentasError.message
      );
      setCuentas([]);
      setLoading(false);
      return;
    }

    const lista = (data || []) as CuentaBancaria[];
    setCuentas(lista);

    if (lista.length === 1) {
      setCuentaId(String(lista[0].id));
    } else {
      const cuentaLote9 = lista.find((cuenta) => cuenta.id === 5);
      if (cuentaLote9) {
        setCuentaId(String(cuentaLote9.id));
      }
    }

    setLoading(false);
  }

  async function cargarPendientes(
    idCondominio: string,
    idCuenta: string
  ) {
    setLoading(true);
    setError(null);
    setMensaje(null);
    setResultado(null);
    setSeleccionados(new Set());

    try {
      const condominio = Number(idCondominio);
      const cuenta = Number(idCuenta);

      const {
        data: solicitudesData,
        error: solicitudesError,
      } = await supabase
        .from("v_solicitudes_pago_operativas")
        .select(`
          solicitud_id,
          numero_solicitud,
          condominio_id,
          condominio,
          proveedor_id,
          categoria_id,
          concepto,
          detalle,
          gasto_generado_id,
          gasto_id,
          estado_operativo
        `)
        .eq("condominio_id", condominio)
        .eq("estado_operativo", ESTADO_REVISION)
        .order("solicitud_id", { ascending: true });

      if (solicitudesError) {
        throw new Error(
          "Error cargando solicitudes: " +
            solicitudesError.message
        );
      }

      const solicitudes =
        (solicitudesData || []) as SolicitudRevision[];

      const gastoIds = Array.from(
        new Set(
          solicitudes
            .map((solicitud) =>
              Number(
                solicitud.gasto_id ||
                  solicitud.gasto_generado_id ||
                  0
              )
            )
            .filter((gastoId) => gastoId > 0)
        )
      );

      if (gastoIds.length === 0) {
        setFilas([]);
        return;
      }

      const [gastosResponse, proveedoresResponse] =
        await Promise.all([
          supabase
            .from("gastos")
            .select(`
              id,
              condominio_id,
              fecha_pago,
              proveedor,
              proveedor_id,
              concepto,
              descripcion,
              monto,
              total,
              numero_cheque,
              metodo_pago,
              pagado,
              factura_url,
              cheque_url,
              cuenta_bancaria_id
            `)
            .eq("condominio_id", condominio)
            .in("id", gastoIds),

          supabase
            .from("catalogo_proveedores")
            .select("id, nombre_proveedor")
            .eq("condominio_id", condominio),
        ]);

      if (gastosResponse.error) {
        throw new Error(
          "Error cargando gastos: " +
            gastosResponse.error.message
        );
      }

      if (proveedoresResponse.error) {
        throw new Error(
          "Error cargando proveedores: " +
            proveedoresResponse.error.message
        );
      }

      const gastos = (gastosResponse.data || []) as Gasto[];

      const { data: movimientosData, error: movimientosError } =
        await supabase
          .from("banco_movimientos")
          .select(
            "id, referencia_id, numero_documento, referencia_banco, fecha_movimiento, monto, estado_banco"
          )
          .eq("condominio_id", condominio)
          .eq("cuenta_bancaria_id", cuenta)
          .eq("tipo_movimiento", "EGRESO")
          .or("estado_banco.is.null,estado_banco.neq.ANULADO");

      if (movimientosError) {
        throw new Error(
          "Error validando movimientos existentes: " +
            movimientosError.message
        );
      }

      const movimientos =
        (movimientosData || []) as MovimientoExistente[];

      const movimientosPorGasto = new Map<
        number,
        MovimientoExistente
      >();

      const movimientosPorDocumento = new Map<
        string,
        MovimientoExistente
      >();

      movimientos.forEach((movimiento) => {
        if (movimiento.referencia_id) {
          movimientosPorGasto.set(
            Number(movimiento.referencia_id),
            movimiento
          );
        }

        [
          movimiento.numero_documento,
          movimiento.referencia_banco,
        ].forEach((documento) => {
          const normalizado =
            normalizarDocumento(documento);

          if (normalizado) {
            movimientosPorDocumento.set(
              normalizado,
              movimiento
            );
          }
        });
      });

      const proveedoresMap = new Map<number, string>(
        (proveedoresResponse.data || []).map(
          (proveedor: any) => [
            Number(proveedor.id),
            texto(
              proveedor.nombre_proveedor,
              `Proveedor ${proveedor.id}`
            ),
          ]
        )
      );

      const gastosMap = new Map<number, Gasto>();
      gastos.forEach((gasto) => {
        gastosMap.set(Number(gasto.id), gasto);
      });

      const resultadoFilas: FilaMigracion[] = [];

      solicitudes.forEach((solicitud) => {
        const gastoId = Number(
          solicitud.gasto_id ||
            solicitud.gasto_generado_id ||
            0
        );

        const gasto = gastosMap.get(gastoId);
        if (!gasto) return;

        const movimientoPorGasto =
          movimientosPorGasto.get(gasto.id) || null;

        const movimientoPorDocumento =
          movimientosPorDocumento.get(
            normalizarDocumento(gasto.numero_cheque)
          ) || null;

        const estado = obtenerEstadoFila(
          gasto,
          movimientoPorGasto,
          movimientoPorDocumento
        );

        resultadoFilas.push({
          solicitud,
          gasto,
          proveedorNombre:
            (gasto.proveedor_id
              ? proveedoresMap.get(gasto.proveedor_id)
              : "") ||
            texto(gasto.proveedor, "Proveedor no identificado"),
          movimientoPorGasto,
          movimientoPorDocumento,
          ...estado,
        });
      });

      setFilas(resultadoFilas);
    } catch (err: any) {
      setError(
        err?.message ||
          "No se pudo preparar la migración de gastos."
      );
      setFilas([]);
    } finally {
      setLoading(false);
    }
  }

  const filasFiltradas = useMemo(() => {
    const termino = busqueda.toLowerCase().trim();

    return filas.filter((fila) => {
      const cumpleEstado =
        filtroEstado === "TODOS" ||
        fila.estado === filtroEstado;

      const contenido = [
        fila.gasto.id,
        fila.solicitud.solicitud_id,
        fila.solicitud.numero_solicitud,
        fila.proveedorNombre,
        fila.gasto.concepto,
        fila.gasto.descripcion,
        fila.gasto.numero_cheque,
        fila.gasto.total,
        fila.detalleEstado,
      ]
        .filter(
          (valor) =>
            valor !== null && valor !== undefined
        )
        .join(" ")
        .toLowerCase();

      return (
        cumpleEstado &&
        (!termino || contenido.includes(termino))
      );
    });
  }, [filas, filtroEstado, busqueda]);

  const filasListas = useMemo(
    () => filas.filter((fila) => fila.estado === "LISTO"),
    [filas]
  );

  const filasSeleccionadas = useMemo(
    () =>
      filas.filter((fila) =>
        seleccionados.has(fila.gasto.id)
      ),
    [filas, seleccionados]
  );

  const totalSeleccionado = useMemo(
    () =>
      filasSeleccionadas.reduce(
        (suma, fila) =>
          suma +
          numero(fila.gasto.total ?? fila.gasto.monto),
        0
      ),
    [filasSeleccionadas]
  );

  function alternarSeleccion(gastoId: number) {
    setSeleccionados((actual) => {
      const siguiente = new Set(actual);

      if (siguiente.has(gastoId)) {
        siguiente.delete(gastoId);
      } else {
        siguiente.add(gastoId);
      }

      return siguiente;
    });
  }

  function seleccionarTodosListos() {
    const todos = new Set(
      filasListas.map((fila) => fila.gasto.id)
    );

    setSeleccionados(todos);
  }

  function limpiarSeleccion() {
    setSeleccionados(new Set());
  }

  async function migrarSeleccionados() {
    if (!cuentaId) {
      setError("Debe seleccionar la cuenta bancaria.");
      return;
    }

    if (filasSeleccionadas.length === 0) {
      setError("Debe seleccionar al menos un gasto listo.");
      return;
    }

    const noListos = filasSeleccionadas.filter(
      (fila) => fila.estado !== "LISTO"
    );

    if (noListos.length > 0) {
      setError(
        "La selección contiene gastos que requieren revisión."
      );
      return;
    }

    const detalle = filasSeleccionadas
      .map(
        (fila) =>
          `Gasto ${fila.gasto.id} · Cheque ${texto(
            fila.gasto.numero_cheque
          )} · ${dinero(
            fila.gasto.total ?? fila.gasto.monto
          )}`
      )
      .join("\n");

    const confirmado = window.confirm(
      [
        "Se crearán EGRESOS en el Control Bancario.",
        "",
        detalle,
        "",
        `Cantidad: ${filasSeleccionadas.length}`,
        `Total: ${dinero(totalSeleccionado)}`,
        "",
        "¿Deseas continuar?",
      ].join("\n")
    );

    if (!confirmado) return;

    setMigrando(true);
    setError(null);
    setMensaje(null);
    setResultado(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "migrar_gastos_sin_banco",
        {
          p_condominio_id: Number(condominioId),
          p_cuenta_bancaria_id: Number(cuentaId),
          p_gasto_ids: filasSeleccionadas.map(
            (fila) => fila.gasto.id
          ),
          p_cantidad_confirmada:
            filasSeleccionadas.length,
          p_total_confirmado: totalSeleccionado,
        }
      );

      if (rpcError) throw rpcError;

      const resultadoRpc = data as ResultadoMigracion;

      setResultado(resultadoRpc);
      setMensaje(
        resultadoRpc?.mensaje ||
          "Gastos pasados al banco correctamente."
      );

      await cargarPendientes(condominioId, cuentaId);
    } catch (err: any) {
      setError(
        err?.message ||
          "No se pudieron registrar los egresos bancarios."
      );
    } finally {
      setMigrando(false);
    }
  }

  const cuentaSeleccionada = cuentas.find(
    (cuenta) => String(cuenta.id) === cuentaId
  );

  return (
    <PageContainer>
      <ModuleMenu
        title="Control Bancario"
        subtitle="Migraciones controladas de ingresos y egresos."
        tone="blue"
        items={[
          {
            href: "/finanzas/control-bancario",
            label: "Control Bancario",
            icon: Landmark,
          },
          {
            href: "/finanzas/control-bancario/migrar-pagos",
            label: "Migrar ingresos",
            icon: Banknote,
          },
          {
            href: "/finanzas/control-bancario/migrar-gastos",
            label: "Migrar gastos",
            icon: WalletCards,
          },
          {
            href: "/gastos/regularizar-sin-banco",
            label: "Corregir gastos",
            icon: ShieldCheck,
          },
        ]}
      />

      <ModuleToolbar
        title="Pasar gastos al Control Bancario"
        subtitle={`Condominio activo: ${
          condominioNombre || "No seleccionado"
        }`}
        icon={WalletCards}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/gastos/regularizar-sin-banco"
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Corregir gastos
            </Link>

            <button
              type="button"
              onClick={() =>
                void cargarPendientes(condominioId, cuentaId)
              }
              disabled={loading || !cuentaId}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Actualizar
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {mensaje && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{mensaje}</p>
        </div>
      )}

      <SectionCard
        title="Cuenta bancaria"
        subtitle="La cuenta seleccionada recibirá los egresos históricos."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr]">
          <label className="text-sm font-semibold text-slate-700">
            Cuenta del condominio
            <select
              value={cuentaId}
              onChange={(event) =>
                setCuentaId(event.target.value)
              }
              className="mt-1 w-full rounded-xl border bg-white px-4 py-3"
            >
              <option value="">Seleccione cuenta</option>

              {cuentas.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {texto(cuenta.nombre_banco)} ·{" "}
                  {texto(cuenta.numero_cuenta)} ·{" "}
                  {dinero(cuenta.balance_actual)}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border bg-slate-50 p-4">
            <p className="text-xs font-black uppercase text-slate-500">
              Cuenta seleccionada
            </p>
            <p className="mt-1 font-black text-slate-900">
              {cuentaSeleccionada
                ? `${texto(
                    cuentaSeleccionada.nombre_banco
                  )} · ${texto(
                    cuentaSeleccionada.numero_cuenta
                  )}`
                : "Sin seleccionar"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Balance actual:{" "}
              {dinero(
                cuentaSeleccionada?.balance_actual
              )}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Resumen de la migración"
        subtitle="Los cheques ya existentes quedan bloqueados automáticamente."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Resumen
            titulo="Registros encontrados"
            valor={String(filas.length)}
            detalle="Pagados sin banco"
          />

          <Resumen
            titulo="Listos"
            valor={String(filasListas.length)}
            detalle="Disponibles para seleccionar"
          />

          <Resumen
            titulo="Seleccionados"
            valor={String(filasSeleccionadas.length)}
            detalle="Se enviarán al banco"
          />

          <Resumen
            titulo="Total seleccionado"
            valor={dinero(totalSeleccionado)}
            detalle="Monto de los egresos"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Gastos pendientes"
        subtitle={`Origen: solicitudes con estado "${ESTADO_REVISION}".`}
      >
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_240px]">
          <label className="text-sm font-semibold text-slate-700">
            Buscar
            <div className="mt-1 flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
                placeholder="Gasto, solicitud, proveedor, concepto o cheque"
                className="w-full bg-transparent outline-none"
              />
            </div>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Estado
            <select
              value={filtroEstado}
              onChange={(event) =>
                setFiltroEstado(event.target.value)
              }
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
            >
              <option value="TODOS">Todos</option>
              <option value="LISTO">Listos</option>
              <option value="YA_EN_BANCO">
                Ya vinculados
              </option>
              <option value="DOCUMENTO_EXISTE">
                Cheque ya existe
              </option>
              <option value="FALTA_FECHA">
                Falta fecha
              </option>
              <option value="FALTA_DOCUMENTO">
                Falta documento
              </option>
              <option value="MONTO_INVALIDO">
                Monto inválido
              </option>
            </select>
          </label>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={seleccionarTodosListos}
            disabled={filasListas.length === 0}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            Seleccionar todos los listos
          </button>

          <button
            type="button"
            onClick={limpiarSeleccion}
            disabled={seleccionados.size === 0}
            className="rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
          >
            Limpiar selección
          </button>
        </div>

        <div className="overflow-auto rounded-2xl border">
          <table className="min-w-[1180px] w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="border p-2 text-center">
                  Seleccionar
                </th>
                <th className="border p-2 text-left">
                  Gasto
                </th>
                <th className="border p-2 text-left">
                  Solicitud
                </th>
                <th className="border p-2 text-left">
                  Fecha
                </th>
                <th className="border p-2 text-left">
                  Proveedor
                </th>
                <th className="border p-2 text-left">
                  Concepto
                </th>
                <th className="border p-2 text-left">
                  Cheque
                </th>
                <th className="border p-2 text-right">
                  Monto
                </th>
                <th className="border p-2 text-center">
                  Estado
                </th>
                <th className="border p-2 text-center">
                  Soportes
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="border p-8 text-center text-slate-500"
                  >
                    Preparando validación...
                  </td>
                </tr>
              ) : filasFiltradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="border p-8 text-center text-slate-500"
                  >
                    No hay registros para esta consulta.
                  </td>
                </tr>
              ) : (
                filasFiltradas.map((fila) => {
                  const listo = fila.estado === "LISTO";
                  const seleccionado = seleccionados.has(
                    fila.gasto.id
                  );

                  return (
                    <tr
                      key={`${fila.solicitud.solicitud_id}-${fila.gasto.id}`}
                      className="hover:bg-slate-50"
                    >
                      <td className="border p-2 text-center align-top">
                        <input
                          type="checkbox"
                          checked={seleccionado}
                          disabled={!listo || migrando}
                          onChange={() =>
                            alternarSeleccion(fila.gasto.id)
                          }
                          className="h-4 w-4"
                        />
                      </td>

                      <td className="border p-2 align-top font-black">
                        ID {fila.gasto.id}
                      </td>

                      <td className="border p-2 align-top">
                        <div className="font-black">
                          No. {numeroSolicitud(fila.solicitud)}
                        </div>
                        <div className="text-xs text-slate-500">
                          ID {fila.solicitud.solicitud_id}
                        </div>
                      </td>

                      <td className="border p-2 align-top">
                        {fechaTexto(fila.gasto.fecha_pago)}
                      </td>

                      <td className="border p-2 align-top">
                        {fila.proveedorNombre}
                      </td>

                      <td className="border p-2 align-top">
                        <div className="font-semibold">
                          {texto(fila.gasto.concepto)}
                        </div>
                        {fila.gasto.descripcion && (
                          <div className="mt-1 max-w-md text-xs text-slate-500">
                            {fila.gasto.descripcion}
                          </div>
                        )}
                      </td>

                      <td className="border p-2 align-top font-black">
                        {texto(
                          fila.gasto.numero_cheque,
                          "Sin documento"
                        )}
                      </td>

                      <td className="border p-2 text-right align-top font-black text-red-700">
                        {dinero(
                          fila.gasto.total ??
                            fila.gasto.monto
                        )}
                      </td>

                      <td className="border p-2 text-center align-top">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${claseEstado(
                            fila.estado
                          )}`}
                        >
                          {fila.estado === "LISTO"
                            ? "Listo"
                            : fila.estado === "YA_EN_BANCO"
                              ? "Ya en banco"
                              : fila.estado ===
                                  "DOCUMENTO_EXISTE"
                                ? "Cheque ya existe"
                                : "Revisar"}
                        </span>

                        <div className="mt-1 max-w-xs text-xs text-slate-500">
                          {fila.detalleEstado}
                        </div>
                      </td>

                      <td className="border p-2 align-top">
                        <div className="flex flex-col items-center gap-1">
                          {fila.gasto.factura_url && (
                            <a
                              href={fila.gasto.factura_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Factura
                            </a>
                          )}

                          {fila.gasto.cheque_url && (
                            <a
                              href={fila.gasto.cheque_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1 text-xs font-bold text-white"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Cheque
                            </a>
                          )}

                          {!fila.gasto.factura_url &&
                            !fila.gasto.cheque_url && (
                              <span className="text-xs text-slate-400">
                                Sin archivos
                              </span>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-black text-blue-950">
              Confirmación de egresos
            </p>
            <p className="mt-1 text-sm text-blue-800">
              {filasSeleccionadas.length} gasto(s) ·{" "}
              {dinero(totalSeleccionado)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void migrarSeleccionados()}
            disabled={
              migrando ||
              filasSeleccionadas.length === 0 ||
              !cuentaId
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-black text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {migrando ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Banknote className="h-5 w-5" />
            )}
            Pasar seleccionados al banco
          </button>
        </div>
      </SectionCard>

      {resultado?.movimientos &&
        resultado.movimientos.length > 0 && (
          <SectionCard
            title="Movimientos creados"
            subtitle="Resultado de la última migración."
          >
            <div className="overflow-auto rounded-2xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border p-2 text-left">
                      Movimiento
                    </th>
                    <th className="border p-2 text-left">
                      Gasto
                    </th>
                    <th className="border p-2 text-left">
                      Documento
                    </th>
                    <th className="border p-2 text-right">
                      Monto
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.movimientos.map((movimiento) => (
                    <tr key={movimiento.movimiento_banco_id}>
                      <td className="border p-2 font-black">
                        {movimiento.movimiento_banco_id}
                      </td>
                      <td className="border p-2">
                        {movimiento.gasto_id}
                      </td>
                      <td className="border p-2">
                        {movimiento.numero_documento}
                      </td>
                      <td className="border p-2 text-right font-black">
                        {dinero(movimiento.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}
    </PageContainer>
  );
}

function Resumen({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: string;
  detalle: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-slate-500">
        {titulo}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-900">
        {valor}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {detalle}
      </p>
    </div>
  );
}
