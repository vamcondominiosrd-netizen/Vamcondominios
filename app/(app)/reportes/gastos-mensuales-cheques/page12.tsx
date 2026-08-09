"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  ReceiptText,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

type PerfilUsuario = {
  condominio_id: number | null;
  condominio: string | null;
  nombre?: string | null;
  rol?: string | null;
};

type GastoDB = {
  id: number;
  condominio_id: number | null;
  proveedor?: string | null;
  proveedor_id?: number | null;
  catalogo_proveedores?:
    | { nombre_proveedor?: string | null }
    | { nombre_proveedor?: string | null }[]
    | null;
  concepto?: string | null;
  descripcion?: string | null;
  detalle_gasto?: string | null;
  categoria?: string | null;
  total?: number | string | null;
  monto?: number | string | null;
  itbis?: number | string | null;
  no_factura?: string | null;
  ncf?: string | null;
  metodo_pago?: string | null;
  numero_cheque?: string | null;
  fecha?: string | null;
  fecha_pago?: string | null;
  created_at?: string | null;
};

type MovimientoBanco = {
  id: number;
  condominio_id: number | null;
  cuenta_bancaria_id: number | null;
  fecha_movimiento?: string | null;
  fecha_banco?: string | null;
  periodo?: string | null;
  tipo_movimiento?: string | null;
  origen?: string | null;
  referencia_id?: number | null;
  descripcion?: string | null;
  monto?: number | string | null;
  numero_documento?: string | null;
  referencia_banco?: string | null;
  beneficiario?: string | null;
  estado_banco?: string | null;
  created_at?: string | null;
};

type DetalleGasto = {
  id: string;
  fechaISO: string;
  fechaTexto: string;
  numeroCheque: string;
  numeroOrden: number | null;
  concepto: string;
  proveedor: string;
  metodoPago: string;
  monto: number;
};

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const limpio = String(value)
    .replace(/RD\$/gi, "")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .trim();

  const resultado = Number(limpio);
  return Number.isFinite(resultado) ? resultado : 0;
}

function formatMoney(value: unknown): string {
  return moneda.format(toNumber(value));
}

function limpiarTexto(value: unknown, fallback = "-"): string {
  if (value === null || value === undefined) return fallback;
  const texto = String(value).trim();
  return texto || fallback;
}

function periodoActual(): string {
  const hoy = new Date();

  return `${hoy.getFullYear()}-${String(
    hoy.getMonth() + 1
  ).padStart(2, "0")}`;
}

function nombrePeriodo(periodo: string): string {
  const [anioTexto, mesTexto] = periodo.split("-");
  const anio = Number(anioTexto);
  const mes = Number(mesTexto);

  if (!anio || !mes || mes < 1 || mes > 12) return periodo;

  const fecha = new Date(anio, mes - 1, 1);
  const nombreMes = fecha.toLocaleDateString("es-DO", {
    month: "long",
  });

  return `${nombreMes.charAt(0).toUpperCase()}${nombreMes.slice(1)} ${anio}`;
}

function rangoPeriodo(periodo: string) {
  const [anioTexto, mesTexto] = periodo.split("-");
  const anio = Number(anioTexto);
  const mes = Number(mesTexto);

  const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const siguiente = new Date(anio, mes, 1);

  const hasta = `${siguiente.getFullYear()}-${String(
    siguiente.getMonth() + 1
  ).padStart(2, "0")}-01`;

  return { desde, hasta };
}

function formatDate(value: unknown): string {
  if (!value) return "-";

  const texto = String(value);
  const fechaBase = texto.length === 10 ? `${texto}T12:00:00` : texto;
  const fecha = new Date(fechaBase);

  if (Number.isNaN(fecha.getTime())) return texto.slice(0, 10);

  return fecha.toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function extraerNumeroCheque(value: unknown): number | null {
  const texto = String(value || "").trim();

  if (!texto) return null;

  const coincidencia = texto.match(/\d+/);

  if (!coincidencia) return null;

  const numero = Number(coincidencia[0]);

  return Number.isFinite(numero) ? numero : null;
}

function tieneNumeroCheque(value: unknown): boolean {
  const texto = String(value || "").trim();

  if (!texto) return false;

  const normalizado = texto.toLowerCase();

  return ![
    "-",
    "n/a",
    "na",
    "ninguno",
    "sin cheque",
    "sin numero",
    "sin número",
  ].includes(normalizado);
}

function ordenarPorCheque(
  a: DetalleGasto,
  b: DetalleGasto
): number {
  if (
    a.numeroOrden !== null &&
    b.numeroOrden !== null &&
    a.numeroOrden !== b.numeroOrden
  ) {
    return a.numeroOrden - b.numeroOrden;
  }

  if (a.numeroOrden !== null && b.numeroOrden === null) return -1;
  if (a.numeroOrden === null && b.numeroOrden !== null) return 1;

  const cheque = a.numeroCheque.localeCompare(
    b.numeroCheque,
    "es",
    {
      numeric: true,
      sensitivity: "base",
    }
  );

  if (cheque !== 0) return cheque;

  const fecha = a.fechaISO.localeCompare(b.fechaISO);

  if (fecha !== 0) return fecha;

  return a.id.localeCompare(b.id);
}

function generarPeriodos(cantidad = 36): string[] {
  const hoy = new Date();
  const resultado: string[] = [];

  for (let i = 0; i < cantidad; i += 1) {
    const fecha = new Date(
      hoy.getFullYear(),
      hoy.getMonth() - i,
      1
    );

    resultado.push(
      `${fecha.getFullYear()}-${String(
        fecha.getMonth() + 1
      ).padStart(2, "0")}`
    );
  }

  return resultado;
}

export default function ReporteGastosMensualesChequesPage() {
  const [loading, setLoading] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [perfil, setPerfil] =
    useState<PerfilUsuario | null>(null);

  const [periodo, setPeriodo] = useState(periodoActual());

  const [gastos, setGastos] = useState<DetalleGasto[]>([]);
  const [totalEgresosBanco, setTotalEgresosBanco] = useState(0);

  const totalMes = useMemo(
    () =>
      gastos.reduce(
        (sum, item) => sum + item.monto,
        0
      ),
    [gastos]
  );

  const diferenciaControlBancario = totalEgresosBanco - totalMes;

  const promedioCheque = useMemo(
    () => (gastos.length > 0 ? totalMes / gastos.length : 0),
    [gastos.length, totalMes]
  );

  const chequeMayor = useMemo(() => {
    if (gastos.length === 0) return null;

    return [...gastos].sort(
      (a, b) => b.monto - a.monto
    )[0];
  }, [gastos]);

  useEffect(() => {
    inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (perfil?.condominio_id) {
      cargarReporte(perfil.condominio_id, periodo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, perfil?.condominio_id]);

  async function inicializar() {
    setLoading(true);
    setError(null);

    try {
      const contexto = await obtenerContextoUsuario();

      if (!contexto.condominio_id) {
        throw new Error(
          "No se pudo identificar el condominio activo del usuario."
        );
      }

      setPerfil(contexto);

      await cargarReporte(
        contexto.condominio_id,
        periodo
      );
    } catch (err: any) {
      setError(
        err?.message || "No se pudo cargar el reporte."
      );
    } finally {
      setLoading(false);
    }
  }

  async function obtenerContextoUsuario(): Promise<PerfilUsuario> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("No hay usuario logueado.");

    async function buscarPerfil(
      campo: string,
      valor: string
    ) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq(campo, valor)
          .maybeSingle();

        if (!error && data) return data;
      } catch {
        return null;
      }

      return null;
    }

    let perfilEncontrado: any = null;

    perfilEncontrado = await buscarPerfil("id", user.id);

    if (!perfilEncontrado) {
      perfilEncontrado = await buscarPerfil(
        "user_id",
        user.id
      );
    }

    if (!perfilEncontrado) {
      perfilEncontrado = await buscarPerfil(
        "auth_id",
        user.id
      );
    }

    if (!perfilEncontrado && user.email) {
      perfilEncontrado = await buscarPerfil(
        "email",
        user.email
      );
    }

    let condominioId =
      perfilEncontrado?.condominio_id ??
      perfilEncontrado?.id_condominio ??
      perfilEncontrado?.condominioId ??
      null;

    let condominioNombre =
      perfilEncontrado?.condominio ??
      perfilEncontrado?.nombre_condominio ??
      perfilEncontrado?.condominio_nombre ??
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
        "selectedCondominio",
        "condominio",
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
            parsed?.condominioId ??
            raw;

          const numeroId = Number(posibleId);

          if (
            Number.isFinite(numeroId) &&
            numeroId > 0
          ) {
            condominioId = numeroId;

            condominioNombre =
              parsed?.nombre ??
              parsed?.condominio ??
              parsed?.nombre_condominio ??
              parsed?.condominio_nombre ??
              condominioNombre;

            break;
          }
        } catch {
          const numeroId = Number(raw);

          if (
            Number.isFinite(numeroId) &&
            numeroId > 0
          ) {
            condominioId = numeroId;
            break;
          }
        }
      }
    }

    if (!condominioId) {
      return {
        condominio_id: null,
        condominio: null,
      };
    }

    try {
      const { data: condominioData } = await supabase
        .from("condominios")
        .select("id, nombre")
        .eq("id", Number(condominioId))
        .maybeSingle();

      if (condominioData?.nombre) {
        condominioNombre = condominioData.nombre;
      }
    } catch {
      // Conserva el nombre obtenido del perfil.
    }

    return {
      condominio_id: Number(condominioId),
      condominio: condominioNombre || "Condominio",
      nombre:
        perfilEncontrado?.nombre ??
        perfilEncontrado?.full_name ??
        perfilEncontrado?.name ??
        null,
      rol:
        perfilEncontrado?.rol ??
        perfilEncontrado?.role ??
        null,
    };
  }

  function esMovimientoActivo(row: MovimientoBanco): boolean {
    return String(row.estado_banco || "").toUpperCase() !== "ANULADO";
  }

  function esEgreso(row: MovimientoBanco): boolean {
    return String(row.tipo_movimiento || "").toUpperCase() === "EGRESO";
  }

  function perteneceAlPeriodo(
    row: MovimientoBanco,
    periodoSeleccionado: string
  ): boolean {
    if (String(row.periodo || "").slice(0, 7) === periodoSeleccionado) {
      return true;
    }

    const fecha = String(
      row.fecha_movimiento ||
        row.fecha_banco ||
        row.created_at ||
        ""
    ).slice(0, 7);

    return fecha === periodoSeleccionado;
  }

  function esCargoBancario(row: MovimientoBanco): boolean {
    const texto = [
      row.origen,
      row.descripcion,
      row.beneficiario,
      row.numero_documento,
      row.referencia_banco,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return (
      texto.includes("impuesto") ||
      texto.includes("cargo bancario") ||
      texto.includes("cargos bancarios") ||
      texto.includes("comision") ||
      texto.includes("itbis banco") ||
      texto.includes("ajuste bancario") ||
      texto.includes("ajuste_bancario")
    );
  }

  async function obtenerCuentaBancariaActiva(
    condominioId: number
  ): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from("cuentas_bancarias")
        .select("id")
        .eq("condominio_id", condominioId)
        .eq("activa", true)
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn(
          "No se pudo cargar la cuenta bancaria activa:",
          error.message
        );
        return null;
      }

      const id = Number(data?.id || 0);
      return Number.isFinite(id) && id > 0 ? id : null;
    } catch (error) {
      console.warn("Error buscando cuenta bancaria activa:", error);
      return null;
    }
  }

  async function cargarMovimientosBancarios(
    condominioId: number,
    periodoSeleccionado: string,
    cuentaBancariaId: number | null
  ): Promise<MovimientoBanco[]> {
    const { desde, hasta } = rangoPeriodo(periodoSeleccionado);

    async function ejecutar(query: any) {
      const { data, error } = await query
        .order("fecha_movimiento", { ascending: true })
        .order("id", { ascending: true })
        .limit(5000);

      if (error) {
        console.warn(
          "No se pudieron cargar movimientos bancarios:",
          error.message
        );
        return [];
      }

      return (data || []) as MovimientoBanco[];
    }

    let movimientos: MovimientoBanco[] = [];

    if (cuentaBancariaId) {
      movimientos = await ejecutar(
        supabase
          .from("banco_movimientos")
          .select("*")
          .eq("condominio_id", condominioId)
          .eq("cuenta_bancaria_id", cuentaBancariaId)
          .eq("periodo", periodoSeleccionado)
      );
    }

    if (movimientos.length === 0) {
      movimientos = await ejecutar(
        supabase
          .from("banco_movimientos")
          .select("*")
          .eq("condominio_id", condominioId)
          .eq("periodo", periodoSeleccionado)
      );
    }

    if (movimientos.length === 0 && cuentaBancariaId) {
      movimientos = await ejecutar(
        supabase
          .from("banco_movimientos")
          .select("*")
          .eq("condominio_id", condominioId)
          .eq("cuenta_bancaria_id", cuentaBancariaId)
          .gte("fecha_movimiento", desde)
          .lt("fecha_movimiento", hasta)
      );
    }

    return movimientos.filter(
      (row) =>
        esMovimientoActivo(row) &&
        perteneceAlPeriodo(row, periodoSeleccionado)
    );
  }

  async function cargarGastosRelacionados(
    movimientos: MovimientoBanco[]
  ): Promise<Map<number, GastoDB>> {
    const ids = Array.from(
      new Set(
        movimientos
          .map((row) => Number(row.referencia_id || 0))
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    );

    const mapa = new Map<number, GastoDB>();

    if (ids.length === 0) return mapa;

    const { data, error } = await supabase
      .from("gastos")
      .select(`
        id,
        condominio_id,
        proveedor,
        proveedor_id,
        catalogo_proveedores(nombre_proveedor),
        concepto,
        descripcion,
        detalle_gasto,
        total,
        monto,
        metodo_pago,
        numero_cheque,
        fecha,
        fecha_pago,
        created_at
      `)
      .in("id", ids);

    if (error) {
      console.warn(
        "No se pudieron cargar los gastos relacionados:",
        error.message
      );
      return mapa;
    }

    ((data || []) as GastoDB[]).forEach((row) => {
      mapa.set(Number(row.id), row);
    });

    return mapa;
  }

  function obtenerNombreProveedor(
    gasto: GastoDB | null,
    movimiento: MovimientoBanco
  ): string {
    const relacion = gasto?.catalogo_proveedores;

    const nombreRelacionado = Array.isArray(relacion)
      ? relacion[0]?.nombre_proveedor
      : relacion?.nombre_proveedor;

    return limpiarTexto(
      nombreRelacionado ||
        gasto?.proveedor ||
        movimiento.beneficiario,
      "Proveedor / beneficiario"
    );
  }

  function obtenerNumeroCheque(
    gasto: GastoDB | null,
    movimiento: MovimientoBanco
  ): string {
    const numeroGasto = limpiarTexto(
      gasto?.numero_cheque,
      ""
    );

    if (tieneNumeroCheque(numeroGasto)) {
      return numeroGasto;
    }

    const numeroDocumento = limpiarTexto(
      movimiento.numero_documento,
      ""
    );

    if (tieneNumeroCheque(numeroDocumento)) {
      return numeroDocumento;
    }

    const referenciaBanco = limpiarTexto(
      movimiento.referencia_banco,
      ""
    );

    if (tieneNumeroCheque(referenciaBanco)) {
      return referenciaBanco;
    }

    return "";
  }

  function mapearMovimiento(
    movimiento: MovimientoBanco,
    gasto: GastoDB | null
  ): DetalleGasto | null {
    const numeroCheque = obtenerNumeroCheque(
      gasto,
      movimiento
    );

    if (!tieneNumeroCheque(numeroCheque)) {
      return null;
    }

    const fechaISO = String(
      movimiento.fecha_movimiento ||
        movimiento.fecha_banco ||
        gasto?.fecha_pago ||
        gasto?.fecha ||
        movimiento.created_at ||
        ""
    ).slice(0, 10);

    return {
      id: `banco-${movimiento.id}`,
      fechaISO,
      fechaTexto: formatDate(fechaISO),
      numeroCheque,
      numeroOrden: extraerNumeroCheque(numeroCheque),
      concepto: limpiarTexto(
        gasto?.concepto ||
          gasto?.descripcion ||
          gasto?.detalle_gasto ||
          movimiento.descripcion,
        "Gasto operativo"
      ),
      proveedor: obtenerNombreProveedor(
        gasto,
        movimiento
      ),
      metodoPago: limpiarTexto(
        gasto?.metodo_pago || movimiento.origen,
        "Cheque"
      ),
      monto: toNumber(movimiento.monto),
    };
  }

  async function cargarReporte(
    condominioId: number,
    periodoSeleccionado: string
  ) {
    setConsultando(true);
    setError(null);

    try {
      const cuentaBancariaId =
        await obtenerCuentaBancariaActiva(condominioId);

      const movimientos =
        await cargarMovimientosBancarios(
          condominioId,
          periodoSeleccionado,
          cuentaBancariaId
        );

      const egresos = movimientos.filter(
        (row) => esEgreso(row)
      );

      setTotalEgresosBanco(
        egresos.reduce(
          (sum, row) => sum + toNumber(row.monto),
          0
        )
      );

      const gastosRelacionados =
        await cargarGastosRelacionados(egresos);

      const detalle = egresos
        .filter((row) => !esCargoBancario(row))
        .map((movimiento) => {
          const gastoId = Number(
            movimiento.referencia_id || 0
          );

          const gasto =
            gastoId > 0
              ? gastosRelacionados.get(gastoId) || null
              : null;

          return mapearMovimiento(
            movimiento,
            gasto
          );
        })
        .filter(
          (item): item is DetalleGasto =>
            item !== null && item.monto > 0
        )
        .sort(ordenarPorCheque);

      setGastos(detalle);
    } catch (err: any) {
      setError(
        err?.message ||
          "No se pudo consultar el reporte."
      );

      setGastos([]);
      setTotalEgresosBanco(0);
    } finally {
      setConsultando(false);
    }
  }

  function recargar() {
    if (!perfil?.condominio_id) return;

    cargarReporte(
      perfil.condominio_id,
      periodo
    );
  }

  function imprimirReporte() {
    window.print();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando reporte de gastos por cheque...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="reporte-gastos-cheques"
      className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:px-0 print:py-0"
    >
      <style jsx global>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 0.35in;
          }

          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body * {
            visibility: hidden !important;
          }

          #reporte-gastos-cheques,
          #reporte-gastos-cheques * {
            visibility: visible !important;
          }

          #reporte-gastos-cheques {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .print-card {
            max-width: none !important;
            width: 100% !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
          }

          .print-summary {
            grid-template-columns: repeat(
              4,
              minmax(0, 1fr)
            ) !important;
            gap: 5px !important;
          }

          .print-summary > div {
            padding: 7px !important;
            border-radius: 9px !important;
          }

          .print-summary p:first-child {
            font-size: 7.5px !important;
          }

          .print-summary p:last-child {
            font-size: 10.5px !important;
            margin-top: 3px !important;
          }

          .print-table {
            font-size: 8.5px !important;
            line-height: 1.15 !important;
          }

          .print-table th,
          .print-table td {
            padding: 3px 4px !important;
          }

          .print-table thead {
            display: table-header-group !important;
          }

          .print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .print-header {
            padding-bottom: 8px !important;
            margin-bottom: 8px !important;
          }

          .print-header h1 {
            font-size: 18px !important;
            line-height: 1.05 !important;
          }

          .print-header p {
            font-size: 9px !important;
          }

          .print-section-title {
            margin-top: 8px !important;
            margin-bottom: 5px !important;
            font-size: 11px !important;
          }

          .print-footer {
            margin-top: 10px !important;
            font-size: 8px !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-5 flex max-w-6xl flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">
            VAM Administración
          </p>

          <h1 className="mt-1 text-2xl font-black text-slate-900">
            Reporte de Gastos por Cheque
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Reporte mensual de los gastos que tienen
            número de cheque registrado.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="text-sm font-bold text-slate-700">
            Mes
            <select
              value={periodo}
              onChange={(event) =>
                setPeriodo(event.target.value)
              }
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 sm:w-56"
            >
              {generarPeriodos(36).map((item) => (
                <option key={item} value={item}>
                  {nombrePeriodo(item)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={recargar}
            disabled={consultando}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {consultando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualizar
          </button>

          <button
            type="button"
            onClick={imprimirReporte}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 py-2 text-sm font-black text-white hover:bg-blue-900"
          >
            <Printer className="h-4 w-4" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="no-print mx-auto mb-5 max-w-6xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {Math.abs(diferenciaControlBancario) > 0.01 && !consultando && (
        <div className="no-print mx-auto mb-5 max-w-6xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-black">Validación contra Control Bancario</p>
          <p className="mt-1">
            Total de egresos bancarios: {formatMoney(totalEgresosBanco)}. Total
            mostrado con número de cheque: {formatMoney(totalMes)}. Diferencia:
            {" "}{formatMoney(diferenciaControlBancario)}.
          </p>
        </div>
      )}

      <main className="print-card mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <header className="print-header mb-6 border-b-4 border-blue-900 pb-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-800">
                VAM Administradora de Condominios
              </p>

              <h1 className="mt-2 text-3xl font-black uppercase text-slate-950">
                Reporte de Gastos por Cheque
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                Detalle mensual de gastos pagados mediante cheque.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 md:min-w-80">
              <div className="flex justify-between gap-4">
                <span className="font-bold">
                  Condominio:
                </span>

                <span className="text-right">
                  {perfil?.condominio || "Condominio"}
                </span>
              </div>

              <div className="mt-2 flex justify-between gap-4">
                <span className="font-bold">
                  Periodo:
                </span>

                <span>{nombrePeriodo(periodo)}</span>
              </div>

              <div className="mt-2 flex justify-between gap-4">
                <span className="font-bold">
                  Fecha de emisión:
                </span>

                <span>
                  {formatDate(
                    new Date().toISOString()
                  )}
                </span>
              </div>

              <div className="mt-2 flex justify-between gap-4">
                <span className="font-bold">
                  Cheques:
                </span>

                <span>{gastos.length}</span>
              </div>
            </div>
          </div>
        </header>

        <section className="print-summary grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ResumenCard
            label="Total pagado"
            valor={formatMoney(totalMes)}
            icon={<WalletCards className="h-5 w-5" />}
            clase="border-blue-200 bg-blue-50 text-blue-900"
          />

          <ResumenCard
            label="Cantidad de cheques"
            valor={String(gastos.length)}
            icon={<ReceiptText className="h-5 w-5" />}
            clase="border-emerald-200 bg-emerald-50 text-emerald-800"
          />

          <ResumenCard
            label="Promedio por cheque"
            valor={formatMoney(promedioCheque)}
            icon={<CalendarDays className="h-5 w-5" />}
            clase="border-amber-200 bg-amber-50 text-amber-800"
          />

          <ResumenCard
            label="Cheque de mayor monto"
            valor={
              chequeMayor
                ? formatMoney(chequeMayor.monto)
                : formatMoney(0)
            }
            icon={<FileText className="h-5 w-5" />}
            clase="border-red-200 bg-red-50 text-red-800"
          />
        </section>

        <section>
          <div className="print-section-title mb-3 mt-8 flex items-end justify-between gap-4">
            <h2 className="text-lg font-black uppercase tracking-wide text-slate-900">
              Detalle de gastos con cheque
            </h2>

            <p className="text-sm font-black text-red-700">
              Total: {formatMoney(totalMes)}
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="print-table w-full min-w-[760px] text-left text-xs md:text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-3">
                    No. cheque
                  </th>

                  <th className="px-3 py-3">
                    Fecha
                  </th>

                  <th className="px-3 py-3">
                    Concepto
                  </th>

                  <th className="px-3 py-3">
                    Proveedor / Beneficiario
                  </th>

                  <th className="px-3 py-3 text-right">
                    Monto
                  </th>
                </tr>
              </thead>

              <tbody>
                {consultando ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Consultando gastos...
                    </td>
                  </tr>
                ) : gastos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay gastos con número de cheque
                      para {nombrePeriodo(periodo)}.
                    </td>
                  </tr>
                ) : (
                  gastos.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-slate-100 align-top"
                    >
                      <td className="px-3 py-3 font-black text-slate-800">
                        {item.numeroCheque}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        {item.fechaTexto}
                      </td>

                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-900">
                          {item.concepto}
                        </div>

                        {item.metodoPago !== "-" && (
                          <div className="mt-1 text-[11px] text-slate-500">
                            Método: {item.metodoPago}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {item.proveedor}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right font-black text-red-700">
                        {formatMoney(item.monto)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {gastos.length > 0 && (
                <tfoot className="bg-slate-900 text-white">
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-3 text-right font-black"
                    >
                      TOTAL PAGADO POR CHEQUE
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right text-base font-black">
                      {formatMoney(totalMes)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        <footer className="print-footer mt-7 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
          Reporte generado por VAM Administradora de
          Condominios. Solo incluye gastos que tienen
          número de cheque registrado.
        </footer>
      </main>
    </div>
  );
}

function ResumenCard({
  label,
  valor,
  icon,
  clase,
}: {
  label: string;
  valor: string;
  icon: React.ReactNode;
  clase: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${clase}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide opacity-80">
          {label}
        </p>

        {icon}
      </div>

      <p className="mt-3 text-2xl font-black">
        {valor}
      </p>
    </div>
  );
}
