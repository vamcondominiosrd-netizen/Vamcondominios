"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Search,
  WalletCards,
} from "lucide-react";
import * as XLSX from "xlsx";

import { supabase } from "@/app/lib/supabaseClient";
import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import SectionCard from "@/components/vam/enterprise/SectionCard";

type Condominio = {
  id: number;
  nombre: string | null;
  rnc: string | null;
  direccion: string | null;
  telefono: string | null;
  logo_url: string | null;
};

type Cuenta = {
  id: number;
  nombre_banco: string | null;
  numero_cuenta: string | null;
};

type Unidad = {
  id: number;
  condominio_id: number;
  codigo: string | null;
  propietario_id: number | null;
  propietario_nombre: string | null;
  propietario_telefono: string | null;
  activa: boolean | null;
};

type PagoUnidad = {
  id: number;
  codigo: string | null;
  propietario_id: number | null;
  propietario_nombre: string | null;
  propietario_telefono: string | null;
};

type Pago = {
  id: number;
  condominio_id: number;
  unidad_id: number | null;
  cuenta_bancaria_id: number | null;
  fecha_pago: string | null;
  periodo: string | null;
  monto: number | null;
  referencia: string | null;
  metodo: string | null;
  metodo_pago: string | null;
  descripcion: string | null;
  comprobante_url: string | null;
  unidades: PagoUnidad | PagoUnidad[] | null;
};

type MovimientoBanco = {
  id: number;
  cuenta_bancaria_id: number | null;
  fecha_movimiento: string | null;
  periodo: string | null;
  monto: number | null;
  numero_documento: string | null;
  beneficiario: string | null;
  referencia_banco: string | null;
  descripcion: string | null;
  estado_banco: string | null;
};

type EstadoCruce = "CUADRADO" | "DIFERENCIA" | "SIN_BANCO";

type PagoDetalle = {
  pago: Pago;
  unidad: PagoUnidad | null;
  movimiento: MovimientoBanco | null;
  montoPago: number;
  montoBanco: number;
  diferencia: number;
  estado: EstadoCruce;
};

type Grupo = {
  clave: string;
  unidad_id: number | null;
  unidad: string;
  propietario: string;
  telefono: string;
  propietario_id: number | null;
  cantidadPagos: number;
  totalIngresado: number;
  totalBanco: number;
  diferencia: number;
  periodos: string[];
  estado: EstadoCruce;
  detalles: PagoDetalle[];
};

const MESES = [
  ["01", "Enero"],
  ["02", "Febrero"],
  ["03", "Marzo"],
  ["04", "Abril"],
  ["05", "Mayo"],
  ["06", "Junio"],
  ["07", "Julio"],
  ["08", "Agosto"],
  ["09", "Septiembre"],
  ["10", "Octubre"],
  ["11", "Noviembre"],
  ["12", "Diciembre"],
];

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fechaCorta(valor: string | null | undefined) {
  if (!valor) return "-";
  const partes = String(valor).split("T")[0].split("-");
  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : String(valor);
}

function fechaISO(valor: string | null | undefined) {
  return valor ? String(valor).split("T")[0] : "";
}

function normalizar(valor: string | null | undefined) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function relacion<T>(valor: T | T[] | null | undefined): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? valor[0] || null : valor;
}

function nombreMes(mes: string) {
  return MESES.find(([valor]) => valor === mes)?.[1] || mes;
}

function fechaInicio(anio: string, mes: string) {
  return `${anio}-${mes}-01`;
}

function fechaFinExclusiva(anio: string, mes: string) {
  const siguiente = new Date(Number(anio), Number(mes), 1);
  return `${siguiente.getFullYear()}-${String(
    siguiente.getMonth() + 1,
  ).padStart(2, "0")}-01`;
}

function metodoPago(pago: Pago) {
  return pago.metodo_pago || pago.metodo || "-";
}

function estadoTexto(estado: EstadoCruce) {
  if (estado === "CUADRADO") return "Cuadrado";
  if (estado === "DIFERENCIA") return "Diferencia";
  return "Sin banco";
}

function estadoClase(estado: EstadoCruce) {
  if (estado === "CUADRADO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (estado === "DIFERENCIA") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function nombreArchivo(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_");
}

export default function IngresosPropietariosMensualPage() {
  const hoy = new Date();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombreLocal, setCondominioNombreLocal] = useState("");
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);

  const [anioFiltro, setAnioFiltro] = useState(String(hoy.getFullYear()));
  const [mesFiltro, setMesFiltro] = useState(
    String(hoy.getMonth() + 1).padStart(2, "0"),
  );
  const [cuentaFiltro, setCuentaFiltro] = useState("");

  const [anioReporte, setAnioReporte] = useState(String(hoy.getFullYear()));
  const [mesReporte, setMesReporte] = useState(
    String(hoy.getMonth() + 1).padStart(2, "0"),
  );
  const [cuentaReporte, setCuentaReporte] = useState("");

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoBanco[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [fechaGeneracion, setFechaGeneracion] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombreLocal(nombre);

    if (!id) {
      setMensaje("No se encontró el condominio activo.");
      setLoading(false);
      return;
    }

    void inicializar(id);
  }, []);

  async function inicializar(id: string) {
    setLoading(true);

    const [condominioResp, cuentasResp, unidadesResp] = await Promise.all([
      supabase
        .from("condominios")
        .select("id, nombre, rnc, direccion, telefono, logo_url")
        .eq("id", Number(id))
        .maybeSingle(),
      supabase
        .from("cuentas_bancarias")
        .select("id, nombre_banco, numero_cuenta")
        .eq("condominio_id", Number(id))
        .eq("activa", true)
        .order("nombre_banco"),
      supabase
        .from("unidades")
        .select(
          "id, condominio_id, codigo, propietario_id, propietario_nombre, propietario_telefono, activa",
        )
        .eq("condominio_id", Number(id))
        .eq("activa", true)
        .order("codigo"),
    ]);

    if (condominioResp.error || cuentasResp.error || unidadesResp.error) {
      setMensaje(
        condominioResp.error?.message ||
          cuentasResp.error?.message ||
          unidadesResp.error?.message ||
          "No se pudieron cargar los datos iniciales.",
      );
      setLoading(false);
      return;
    }

    setCondominio((condominioResp.data as Condominio | null) || null);
    setCuentas((cuentasResp.data as Cuenta[]) || []);
    setUnidades((unidadesResp.data as Unidad[]) || []);

    await cargarReporte(
      id,
      anioFiltro,
      mesFiltro,
      cuentaFiltro,
      false,
    );
  }

  async function cargarReporte(
    id: string,
    anio: string,
    mes: string,
    cuentaId: string,
    cambiarPeriodo = true,
  ) {
    if (!id || !anio || !mes) return;

    setLoading(true);
    setMensaje("");

    const desde = fechaInicio(anio, mes);
    const hasta = fechaFinExclusiva(anio, mes);
    const periodo = `${anio}-${mes}`;

    let pagosQuery = supabase
      .from("pagos")
      .select(
        `
        id,
        condominio_id,
        unidad_id,
        cuenta_bancaria_id,
        fecha_pago,
        periodo,
        monto,
        referencia,
        metodo,
        metodo_pago,
        descripcion,
        comprobante_url,
        unidades (
          id,
          codigo,
          propietario_id,
          propietario_nombre,
          propietario_telefono
        )
      `,
      )
      .eq("condominio_id", Number(id))
      .gte("fecha_pago", desde)
      .lt("fecha_pago", hasta)
      .order("fecha_pago")
      .order("id");

    let bancoQuery = supabase
      .from("banco_movimientos")
      .select(
        "id, cuenta_bancaria_id, fecha_movimiento, periodo, monto, numero_documento, beneficiario, referencia_banco, descripcion, estado_banco",
      )
      .eq("condominio_id", Number(id))
      .eq("periodo", periodo)
      .eq("tipo_movimiento", "INGRESO")
      .eq("origen", "PAGO_PROPIETARIO")
      .order("fecha_movimiento")
      .order("id");

    if (cuentaId) {
      pagosQuery = pagosQuery.eq("cuenta_bancaria_id", Number(cuentaId));
      bancoQuery = bancoQuery.eq("cuenta_bancaria_id", Number(cuentaId));
    }

    const [pagosResp, bancoResp] = await Promise.all([
      pagosQuery,
      bancoQuery,
    ]);

    if (pagosResp.error || bancoResp.error) {
      setMensaje(
        pagosResp.error?.message ||
          bancoResp.error?.message ||
          "No se pudo cargar el reporte.",
      );
      setLoading(false);
      return;
    }

    setPagos(((pagosResp.data || []) as unknown) as Pago[]);
    setMovimientos(
      ((bancoResp.data || []) as MovimientoBanco[]).filter(
        (item) => normalizar(item.estado_banco) !== "ANULADO",
      ),
    );

    if (cambiarPeriodo) {
      setAnioReporte(anio);
      setMesReporte(mes);
      setCuentaReporte(cuentaId);
    }

    setFechaGeneracion(
      new Date().toLocaleString("es-DO", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    );
    setLoading(false);
  }

  const pagosDetalle = useMemo<PagoDetalle[]>(() => {
    const usados = new Set<number>();

    return pagos.map((pago) => {
      const montoPago = Number(pago.monto || 0);
      const referencia = normalizar(pago.referencia);

      let movimiento =
        movimientos.find(
          (item) =>
            !usados.has(item.id) &&
            String(item.numero_documento || "").trim() === String(pago.id),
        ) || null;

      if (!movimiento && referencia) {
        movimiento =
          movimientos.find(
            (item) =>
              !usados.has(item.id) &&
              normalizar(item.referencia_banco) === referencia &&
              Math.abs(Number(item.monto || 0) - montoPago) < 0.01,
          ) || null;
      }

      if (!movimiento) {
        movimiento =
          movimientos.find(
            (item) =>
              !usados.has(item.id) &&
              fechaISO(item.fecha_movimiento) === fechaISO(pago.fecha_pago) &&
              Math.abs(Number(item.monto || 0) - montoPago) < 0.01,
          ) || null;
      }

      if (movimiento) usados.add(movimiento.id);

      const montoBanco = Number(movimiento?.monto || 0);
      const diferencia = montoPago - montoBanco;

      let estado: EstadoCruce = "SIN_BANCO";

      if (movimiento && Math.abs(diferencia) < 0.01) {
        estado = "CUADRADO";
      } else if (movimiento) {
        estado = "DIFERENCIA";
      }

      return {
        pago,
        unidad: relacion(pago.unidades),
        movimiento,
        montoPago,
        montoBanco,
        diferencia,
        estado,
      };
    });
  }, [pagos, movimientos]);

  const movimientosUsados = useMemo(
    () =>
      new Set(
        pagosDetalle
          .map((item) => item.movimiento?.id)
          .filter((id): id is number => Boolean(id)),
      ),
    [pagosDetalle],
  );

  const bancoSinVincular = useMemo(
    () => movimientos.filter((item) => !movimientosUsados.has(item.id)),
    [movimientos, movimientosUsados],
  );

  const grupos = useMemo<Grupo[]>(() => {
    const mapa = new Map<string, Grupo>();

    pagosDetalle.forEach((detalle) => {
      const unidadId = detalle.pago.unidad_id || detalle.unidad?.id || null;
      const clave = unidadId ? `UNIDAD-${unidadId}` : `PAGO-${detalle.pago.id}`;
      const unidad =
        detalle.unidad?.codigo || `Unidad ${unidadId || "sin asignar"}`;
      const propietario =
        detalle.unidad?.propietario_nombre || "Propietario no identificado";

      const grupo =
        mapa.get(clave) ||
        ({
          clave,
          unidad_id: unidadId,
          unidad,
          propietario,
          telefono: detalle.unidad?.propietario_telefono || "-",
          propietario_id: detalle.unidad?.propietario_id || null,
          cantidadPagos: 0,
          totalIngresado: 0,
          totalBanco: 0,
          diferencia: 0,
          periodos: [],
          estado: "CUADRADO",
          detalles: [],
        } satisfies Grupo);

      grupo.detalles.push(detalle);
      grupo.cantidadPagos += 1;
      grupo.totalIngresado += detalle.montoPago;
      grupo.totalBanco += detalle.montoBanco;
      grupo.diferencia = grupo.totalIngresado - grupo.totalBanco;

      if (detalle.pago.periodo) {
        grupo.periodos.push(
          ...String(detalle.pago.periodo)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        );
      }

      grupo.periodos = Array.from(new Set(grupo.periodos)).sort();

      if (grupo.detalles.some((item) => item.estado === "DIFERENCIA")) {
        grupo.estado = "DIFERENCIA";
      } else if (grupo.detalles.some((item) => item.estado === "SIN_BANCO")) {
        grupo.estado = "SIN_BANCO";
      } else {
        grupo.estado = "CUADRADO";
      }

      mapa.set(clave, grupo);
    });

    return Array.from(mapa.values()).sort((a, b) =>
      a.unidad.localeCompare(b.unidad, "es", { numeric: true }),
    );
  }, [pagosDetalle]);

  const gruposFiltrados = useMemo(() => {
    const texto = normalizar(busqueda);

    return grupos.filter((grupo) => {
      if (estadoFiltro !== "TODOS" && grupo.estado !== estadoFiltro) {
        return false;
      }

      if (!texto) return true;

      const contenido = normalizar(
        `${grupo.unidad} ${grupo.propietario} ${grupo.telefono} ${grupo.periodos.join(
          " ",
        )} ${grupo.detalles
          .map(
            (item) =>
              `${item.pago.referencia || ""} ${
                item.movimiento?.referencia_banco || ""
              }`,
          )
          .join(" ")}`,
      );

      return contenido.includes(texto);
    });
  }, [grupos, busqueda, estadoFiltro]);

  const unidadesConPago = useMemo(
    () =>
      new Set(
        grupos
          .map((grupo) => grupo.unidad_id)
          .filter((id): id is number => Boolean(id)),
      ),
    [grupos],
  );

  const unidadesSinIngresos = useMemo(
    () => unidades.filter((unidad) => !unidadesConPago.has(unidad.id)),
    [unidades, unidadesConPago],
  );

  const totalIngresado = pagos.reduce(
    (total, item) => total + Number(item.monto || 0),
    0,
  );

  const totalBanco = movimientos.reduce(
    (total, item) => total + Number(item.monto || 0),
    0,
  );

  const diferenciaGeneral = totalIngresado - totalBanco;

  const propietariosConIngresos = new Set(
    grupos.map(
      (grupo) =>
        grupo.propietario_id ||
        `${normalizar(grupo.unidad)}-${normalizar(grupo.propietario)}`,
    ),
  ).size;

  const nombreCondominio =
    condominio?.nombre || condominioNombreLocal || "Condominio no identificado";

  const cuentaSeleccionada = cuentas.find(
    (cuenta) => String(cuenta.id) === cuentaReporte,
  );

  function alternar(clave: string) {
    setExpandidos((actual) => {
      const nuevo = new Set(actual);
      nuevo.has(clave) ? nuevo.delete(clave) : nuevo.add(clave);
      return nuevo;
    });
  }

  function exportarExcel() {
    const resumen = [
      {
        Condominio: nombreCondominio,
        Período: `${nombreMes(mesReporte)} ${anioReporte}`,
        Cuenta: cuentaSeleccionada
          ? `${cuentaSeleccionada.nombre_banco} ${cuentaSeleccionada.numero_cuenta}`
          : "Todas las cuentas",
        "Total ingresado RD$": totalIngresado,
        "Total banco RD$": totalBanco,
        "Diferencia RD$": diferenciaGeneral,
        "Cantidad de pagos": pagos.length,
        "Propietarios con ingresos": propietariosConIngresos,
        "Banco sin vincular": bancoSinVincular.length,
        "Unidades sin ingresos": unidadesSinIngresos.length,
      },
    ];

    const porPropietario = grupos.map((grupo) => ({
      Unidad: grupo.unidad,
      Propietario: grupo.propietario,
      Teléfono: grupo.telefono,
      Pagos: grupo.cantidadPagos,
      "Períodos aplicados": grupo.periodos.join(", "),
      "Total ingresado RD$": grupo.totalIngresado,
      "Total banco RD$": grupo.totalBanco,
      "Diferencia RD$": grupo.diferencia,
      Estado: estadoTexto(grupo.estado),
    }));

    const detalle = pagosDetalle.map((item) => ({
      "Pago ID": item.pago.id,
      Unidad: item.unidad?.codigo || "",
      Propietario: item.unidad?.propietario_nombre || "",
      Fecha: fechaCorta(item.pago.fecha_pago),
      Referencia: item.pago.referencia || "",
      Método: metodoPago(item.pago),
      "Período aplicado": item.pago.periodo || "",
      "Pago RD$": item.montoPago,
      "Banco RD$": item.montoBanco,
      "Diferencia RD$": item.diferencia,
      Estado: estadoTexto(item.estado),
    }));

    const bancoPendiente = bancoSinVincular.map((item) => ({
      Fecha: fechaCorta(item.fecha_movimiento),
      Beneficiario: item.beneficiario || "",
      Referencia: item.referencia_banco || "",
      Documento: item.numero_documento || "",
      Descripción: item.descripcion || "",
      "Monto RD$": Number(item.monto || 0),
    }));

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.json_to_sheet(resumen),
      "Resumen",
    );
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.json_to_sheet(porPropietario),
      "Por propietario",
    );
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.json_to_sheet(detalle),
      "Detalle de pagos",
    );
    XLSX.utils.book_append_sheet(
      libro,
      XLSX.utils.json_to_sheet(bancoPendiente),
      "Banco sin vincular",
    );

    XLSX.writeFile(
      libro,
      `Ingresos_Propietarios_${nombreArchivo(
        nombreCondominio,
      )}_${anioReporte}_${mesReporte}.xlsx`,
    );
  }

  function imprimir() {
    setFechaGeneracion(
      new Date().toLocaleString("es-DO", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    );
    window.setTimeout(() => window.print(), 100);
  }

  return (
    <PageContainer>
      <div className="no-print">
        <ModuleMenu
          title="Ingresos de Propietarios"
          subtitle="Consulta mensual, sumatorias por propietario y validación bancaria."
          tone="green"
          items={[
            {
              href: "/pagos-mantenimiento",
              label: "Registrar pagos",
              icon: WalletCards,
            },
            {
              href: "/finanzas/reportes/ingresos-propietarios",
              label: "Ingresos por mes",
              icon: FileSpreadsheet,
            },
            {
              href: "/finanzas/pagos/cuadre-propietario",
              label: "Cuadre propietario",
              icon: CheckCircle2,
            },
            {
              href: "/finanzas/control-bancario",
              label: "Control bancario",
              icon: Banknote,
            },
          ]}
        />

        <ModuleToolbar
          title="Ingresos mensuales por propietarios"
          subtitle={`Sumatoria por fecha real del pago. Condominio: ${nombreCondominio}.`}
          icon={FileSpreadsheet}
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  void cargarReporte(
                    condominioId,
                    anioReporte,
                    mesReporte,
                    cuentaReporte,
                    false,
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </button>
              <button
                type="button"
                onClick={exportarExcel}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
              >
                <Download className="h-4 w-4" />
                Excel
              </button>
              <button
                type="button"
                onClick={imprimir}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
              >
                <Printer className="h-4 w-4" />
                Imprimir / PDF
              </button>
            </div>
          }
        />

        {mensaje && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {mensaje}
          </div>
        )}

        <SectionCard
          title="Seleccionar período"
          subtitle="El mes se determina por la fecha real del ingreso, no por el período de mantenimiento pagado."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:items-end">
            <div>
              <label className="mb-1 block text-sm font-bold">Año</label>
              <select
                value={anioFiltro}
                onChange={(event) => setAnioFiltro(event.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3"
              >
                {Array.from({ length: 8 }, (_, index) => {
                  const anio = hoy.getFullYear() - 5 + index;
                  return (
                    <option key={anio} value={anio}>
                      {anio}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold">Mes</label>
              <select
                value={mesFiltro}
                onChange={(event) => setMesFiltro(event.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3"
              >
                {MESES.map(([valor, nombre]) => (
                  <option key={valor} value={valor}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold">
                Cuenta bancaria
              </label>
              <select
                value={cuentaFiltro}
                onChange={(event) => setCuentaFiltro(event.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3"
              >
                <option value="">Todas las cuentas</option>
                {cuentas.map((cuenta) => (
                  <option key={cuenta.id} value={cuenta.id}>
                    {cuenta.nombre_banco} · {cuenta.numero_cuenta}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                void cargarReporte(
                  condominioId,
                  anioFiltro,
                  mesFiltro,
                  cuentaFiltro,
                  true,
                )
              }
              className="inline-flex h-[50px] items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 font-black text-white disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {loading ? "Consultando..." : "Consultar ingresos"}
            </button>
          </div>
        </SectionCard>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Indicador
            titulo={`Total ingresado en ${nombreMes(mesReporte)}`}
            valor={`RD$ ${dinero(totalIngresado)}`}
            clase="border-emerald-300 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400"
          />
          <Indicador
            titulo="Total Control Bancario"
            valor={`RD$ ${dinero(totalBanco)}`}
            clase="border-blue-200 bg-blue-50 text-blue-800"
          />
          <Indicador
            titulo="Diferencia"
            valor={`RD$ ${dinero(diferenciaGeneral)}`}
            clase={
              Math.abs(diferenciaGeneral) < 0.01
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }
          />
          <Indicador
            titulo="Propietarios con ingresos"
            valor={String(propietariosConIngresos)}
            clase="border-violet-200 bg-violet-50 text-violet-800"
          />
          <Indicador
            titulo="Cantidad de pagos"
            valor={String(pagos.length)}
            clase="border-slate-200 bg-white text-slate-800"
          />
          <Indicador
            titulo="Banco sin vincular"
            valor={String(bancoSinVincular.length)}
            clase="border-amber-200 bg-amber-50 text-amber-800"
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
          <SectionCard
            title="Sumatoria por propietario"
            subtitle="Una fila por unidad con el total ingresado durante el mes."
          >
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_190px]">
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar unidad, propietario o referencia..."
                className="rounded-xl border px-4 py-3"
              />
              <select
                value={estadoFiltro}
                onChange={(event) => setEstadoFiltro(event.target.value)}
                className="rounded-xl border bg-white px-4 py-3"
              >
                <option value="TODOS">Todos</option>
                <option value="CUADRADO">Cuadrados</option>
                <option value="DIFERENCIA">Con diferencia</option>
                <option value="SIN_BANCO">Sin banco</option>
              </select>
            </div>

            <div className="overflow-x-auto rounded-2xl border">
              <table className="min-w-[1000px] w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="w-12 px-3 py-3" />
                    <th className="px-4 py-3 text-left">Unidad</th>
                    <th className="px-4 py-3 text-left">Propietario</th>
                    <th className="px-4 py-3 text-center">Pagos</th>
                    <th className="px-4 py-3 text-left">Períodos aplicados</th>
                    <th className="px-4 py-3 text-right">Ingresado</th>
                    <th className="px-4 py-3 text-right">Banco</th>
                    <th className="px-4 py-3 text-right">Diferencia</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center">
                        Cargando...
                      </td>
                    </tr>
                  ) : gruposFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center">
                        No hay ingresos en el período seleccionado.
                      </td>
                    </tr>
                  ) : (
                    gruposFiltrados.map((grupo) => (
                      <GrupoFilas
                        key={grupo.clave}
                        grupo={grupo}
                        expandido={expandidos.has(grupo.clave)}
                        onToggle={() => alternar(grupo.clave)}
                      />
                    ))
                  )}
                </tbody>

                <tfoot className="bg-emerald-950 text-white">
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-right font-black">
                      TOTAL INGRESADO EN {nombreMes(mesReporte).toUpperCase()}{" "}
                      {anioReporte}
                    </td>
                    <td className="px-4 py-4 text-right font-black">
                      RD$ {dinero(totalIngresado)}
                    </td>
                    <td className="px-4 py-4 text-right font-black">
                      RD$ {dinero(totalBanco)}
                    </td>
                    <td className="px-4 py-4 text-right font-black">
                      RD$ {dinero(diferenciaGeneral)}
                    </td>
                    <td className="px-4 py-4 text-center font-black">
                      {Math.abs(diferenciaGeneral) < 0.01
                        ? "CUADRADO"
                        : "REVISAR"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>

          <div className="space-y-5">
            <SectionCard
              title="Unidades sin ingresos"
              subtitle="Unidades activas sin pagos en el mes."
            >
              <p className="text-4xl font-black text-red-700">
                {unidadesSinIngresos.length}
              </p>
              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                {unidadesSinIngresos.map((unidad) => (
                  <div
                    key={unidad.id}
                    className="rounded-xl border bg-slate-50 px-3 py-2"
                  >
                    <p className="font-black">{unidad.codigo}</p>
                    <p className="text-xs text-slate-500">
                      {unidad.propietario_nombre || "Sin propietario"}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Banco sin vincular"
              subtitle="Ingresos bancarios sin pago relacionado."
            >
              <p className="text-4xl font-black text-amber-700">
                {bancoSinVincular.length}
              </p>
              <p className="font-bold text-amber-800">
                RD${" "}
                {dinero(
                  bancoSinVincular.reduce(
                    (total, item) => total + Number(item.monto || 0),
                    0,
                  ),
                )}
              </p>
              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                {bancoSinVincular.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"
                  >
                    <div className="flex justify-between gap-2 font-black">
                      <span>{fechaCorta(item.fecha_movimiento)}</span>
                      <span>RD$ {dinero(item.monto)}</span>
                    </div>
                    <p className="mt-1 text-xs">
                      {item.beneficiario || item.descripcion || "-"}
                    </p>
                    <p className="mt-1 text-[11px]">
                      Ref.: {item.referencia_banco || "-"}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>

      <article
        id="reporte-ingresos"
        className="mx-auto mt-6 max-w-[1200px] bg-white p-5 shadow-sm ring-1 ring-slate-200 print:mt-0 print:max-w-none print:p-0 print:shadow-none print:ring-0"
      >
        <header className="grid grid-cols-[180px_1fr_210px] items-center gap-4 border-b-2 border-slate-900 pb-3">
          <div className="font-black text-blue-950">
            <p className="text-2xl">VAM</p>
            <p className="text-[9px] uppercase">
              Administradora de Condominios
            </p>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-black uppercase">
              Ingresos mensuales por propietarios
            </h1>
            <p className="mt-1 text-sm font-bold uppercase">
              {nombreCondominio}
            </p>
          </div>
          <div className="border p-2 text-[10px]">
            <p>
              <strong>Período:</strong> {nombreMes(mesReporte)} {anioReporte}
            </p>
            <p>
              <strong>Cuenta:</strong>{" "}
              {cuentaSeleccionada
                ? `${cuentaSeleccionada.nombre_banco} ${cuentaSeleccionada.numero_cuenta}`
                : "Todas"}
            </p>
            <p>
              <strong>Generado:</strong> {fechaGeneracion || "-"}
            </p>
          </div>
        </header>

        <div className="mt-3 grid grid-cols-4 border text-center">
          <Resumen titulo="Total ingresado" valor={`RD$ ${dinero(totalIngresado)}`} />
          <Resumen titulo="Control Bancario" valor={`RD$ ${dinero(totalBanco)}`} />
          <Resumen titulo="Diferencia" valor={`RD$ ${dinero(diferenciaGeneral)}`} />
          <Resumen
            titulo="Propietarios con ingresos"
            valor={String(propietariosConIngresos)}
          />
        </div>

        <table className="tabla-print mt-3 w-full table-fixed border-collapse text-[8px]">
          <thead>
            <tr className="bg-slate-100 uppercase">
              <th className="w-[9%] border px-1 py-2">Unidad</th>
              <th className="w-[23%] border px-1 py-2">Propietario</th>
              <th className="w-[7%] border px-1 py-2">Pagos</th>
              <th className="w-[25%] border px-1 py-2">Períodos</th>
              <th className="w-[12%] border px-1 py-2">Ingresado</th>
              <th className="w-[12%] border px-1 py-2">Banco</th>
              <th className="w-[7%] border px-1 py-2">Diferencia</th>
              <th className="w-[5%] border px-1 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((grupo) => (
              <tr key={`print-${grupo.clave}`}>
                <td className="border px-2 py-2 text-center font-black">
                  {grupo.unidad}
                </td>
                <td className="border px-2 py-2">{grupo.propietario}</td>
                <td className="border px-2 py-2 text-center">
                  {grupo.cantidadPagos}
                </td>
                <td className="border px-2 py-2">
                  {grupo.periodos.join(", ") || "-"}
                </td>
                <td className="border px-2 py-2 text-right font-black">
                  {dinero(grupo.totalIngresado)}
                </td>
                <td className="border px-2 py-2 text-right">
                  {dinero(grupo.totalBanco)}
                </td>
                <td className="border px-2 py-2 text-right">
                  {dinero(grupo.diferencia)}
                </td>
                <td className="border px-2 py-2 text-center">
                  {estadoTexto(grupo.estado)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-950 text-white">
            <tr>
              <td colSpan={4} className="border px-2 py-3 text-right font-black">
                TOTAL INGRESADO EN {nombreMes(mesReporte).toUpperCase()}{" "}
                {anioReporte}
              </td>
              <td className="border px-2 py-3 text-right font-black">
                RD$ {dinero(totalIngresado)}
              </td>
              <td className="border px-2 py-3 text-right font-black">
                RD$ {dinero(totalBanco)}
              </td>
              <td className="border px-2 py-3 text-right font-black">
                {dinero(diferenciaGeneral)}
              </td>
              <td className="border px-2 py-3 text-center font-black">
                {Math.abs(diferenciaGeneral) < 0.01 ? "CUADRADO" : "REVISAR"}
              </td>
            </tr>
          </tfoot>
        </table>

        <footer className="mt-5 border-t pt-2 text-center text-[8px]">
          Los totales se calculan por la fecha real del pago recibido.
        </footer>
      </article>

      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 7mm;
        }

        @media print {
          body * {
            visibility: hidden !important;
          }

          #reporte-ingresos,
          #reporte-ingresos * {
            visibility: visible !important;
          }

          #reporte-ingresos {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            margin: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          .tabla-print thead {
            display: table-header-group;
          }

          .tabla-print tr {
            break-inside: avoid;
          }
        }
      `}</style>
    </PageContainer>
  );
}

function GrupoFilas({
  grupo,
  expandido,
  onToggle,
}: {
  grupo: Grupo;
  expandido: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="bg-white hover:bg-slate-50">
        <td className="px-3 py-3 text-center">
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg border p-1.5"
          >
            {expandido ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="px-4 py-3 font-black">{grupo.unidad}</td>
        <td className="px-4 py-3">
          <p className="font-bold">{grupo.propietario}</p>
          <p className="text-xs text-slate-500">{grupo.telefono}</p>
        </td>
        <td className="px-4 py-3 text-center font-black">
          {grupo.cantidadPagos}
        </td>
        <td className="px-4 py-3 text-xs">
          {grupo.periodos.join(", ") || "-"}
        </td>
        <td className="px-4 py-3 text-right font-black text-emerald-700">
          RD$ {dinero(grupo.totalIngresado)}
        </td>
        <td className="px-4 py-3 text-right font-black text-blue-700">
          RD$ {dinero(grupo.totalBanco)}
        </td>
        <td className="px-4 py-3 text-right font-black">
          RD$ {dinero(grupo.diferencia)}
        </td>
        <td className="px-4 py-3 text-center">
          <span
            className={`rounded-full border px-2 py-1 text-xs font-black ${estadoClase(
              grupo.estado,
            )}`}
          >
            {estadoTexto(grupo.estado)}
          </span>
        </td>
      </tr>

      {expandido && (
        <tr className="bg-slate-50">
          <td colSpan={9} className="p-4">
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="min-w-[900px] w-full text-xs">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Referencia</th>
                    <th className="px-3 py-2 text-left">Método</th>
                    <th className="px-3 py-2 text-left">Período</th>
                    <th className="px-3 py-2 text-right">Pago</th>
                    <th className="px-3 py-2 text-right">Banco</th>
                    <th className="px-3 py-2 text-left">Referencia banco</th>
                    <th className="px-3 py-2 text-center">Recibo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {grupo.detalles.map((item) => (
                    <tr key={item.pago.id}>
                      <td className="px-3 py-2">
                        {fechaCorta(item.pago.fecha_pago)}
                      </td>
                      <td className="px-3 py-2">
                        {item.pago.referencia || "-"}
                      </td>
                      <td className="px-3 py-2">{metodoPago(item.pago)}</td>
                      <td className="px-3 py-2">
                        {item.pago.periodo || "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-black text-emerald-700">
                        RD$ {dinero(item.montoPago)}
                      </td>
                      <td className="px-3 py-2 text-right font-black text-blue-700">
                        RD$ {dinero(item.montoBanco)}
                      </td>
                      <td className="px-3 py-2">
                        {item.movimiento?.referencia_banco || "-"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Link
                          href={`/recibos/pago/mantenimiento/${item.pago.id}`}
                          className="font-black text-blue-700"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Indicador({
  titulo,
  valor,
  clase,
}: {
  titulo: string;
  valor: string;
  clase: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${clase}`}>
      <p className="text-xs font-bold uppercase opacity-80">{titulo}</p>
      <p className="mt-2 text-xl font-black">{valor}</p>
    </div>
  );
}

function Resumen({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="border-l p-3 first:border-l-0">
      <p className="text-[8px] font-black uppercase">{titulo}</p>
      <p className="mt-2 text-[13px] font-black">{valor}</p>
    </div>
  );
}
