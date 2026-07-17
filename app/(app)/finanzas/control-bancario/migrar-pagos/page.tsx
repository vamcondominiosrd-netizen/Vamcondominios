"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  FileWarning,
  Landmark,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
  UploadCloud,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";
import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import SectionCard from "@/components/vam/enterprise/SectionCard";

type CuentaBancaria = {
  id: number;
  nombre_banco: string | null;
  numero_cuenta: string | null;
  tipo_cuenta: string | null;
  moneda: string | null;
  activa: boolean | null;
};

type CierreBancario = {
  id: number;
  periodo: string;
  estado: string;
  balance_inicial: number | null;
  total_ingresos: number | null;
  total_gastos: number | null;
  balance_final: number | null;
};

type VistaMigracion = {
  tipo_registro: "PAGO_NORMAL" | "PAGO_HISTORICO";
  registro_id: number;
  pago_id: number | null;
  pago_historico_id: number | null;
  fecha_pago: string;
  fecha_bancaria: string;
  periodo_bancario: string;
  unidad_id: number;
  unidad: string | null;
  propietario: string | null;
  periodo_pagado: string | null;
  monto: number;
  archivo_banco_id: number | null;
  pago_identificado_id: number | null;
  movimiento_banco_id: number | null;
  fecha_movimiento_existente: string | null;
  monto_movimiento_existente: number | null;
  estado_migracion: string;
  accion: string;
  tipo_movimiento_previsto: string;
  origen_previsto: string;
  referencia_id_prevista: number | null;
  referencia_banco_prevista: string | null;
  numero_documento_previsto: string | null;
  beneficiario_previsto: string | null;
  descripcion_movimiento_prevista: string | null;
};

type ResultadoMigracion = {
  ok: boolean;
  periodo: string;
  cantidad_insertada: number;
  total_insertado: number;
  mensaje: string;
  movimientos?: Array<Record<string, unknown>>;
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
] as const;

function dinero(valor: number | string | null | undefined) {
  return `RD$ ${Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fechaCorta(valor: string | null | undefined) {
  if (!valor) return "-";
  const fecha = String(valor).split("T")[0];
  const partes = fecha.split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fecha;
}

function normalizar(valor: string | null | undefined) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function esAdministrador(rol: string) {
  return [
    "superadmin",
    "fulladministrador",
    "administradorgeneral",
    "administradorcondominio",
    "administrador",
    "admin",
  ].includes(normalizar(rol));
}

function obtenerPermisos() {
  try {
    const valor = JSON.parse(localStorage.getItem("permisos_usuario") || "[]");
    if (!Array.isArray(valor)) return [];

    return valor.map((permiso) =>
      String(
        typeof permiso === "string"
          ? permiso
          : permiso?.codigo || permiso?.nombre || permiso?.permiso || "",
      ).toUpperCase(),
    );
  } catch {
    return (localStorage.getItem("permisos_usuario") || "")
      .split(",")
      .map((permiso) => permiso.trim().toUpperCase())
      .filter(Boolean);
  }
}

function nombreMes(mes: string) {
  return MESES.find(([valor]) => valor === mes)?.[1] || mes;
}

function textoEstado(estado: string) {
  const mapa: Record<string, string> = {
    PENDIENTE: "Pendiente de migrar",
    YA_MIGRADO: "Ya migrado",
    HISTORICO_YA_MIGRADO: "Histórico ya migrado",
    REVISAR_MOVIMIENTO_EXISTENTE: "Revisar movimiento",
    REVISAR_ARCHIVO_BANCO: "Revisar archivo",
    REVISAR_MONTO: "Revisar monto",
    REVISAR_HISTORICO: "Revisar histórico",
    HISTORICO_SIN_MOVIMIENTO: "Histórico sin movimiento",
  };

  return mapa[estado] || estado.replaceAll("_", " ");
}

function claseEstado(estado: string) {
  if (["YA_MIGRADO", "HISTORICO_YA_MIGRADO"].includes(estado)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (estado === "PENDIENTE") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (estado.includes("REVISAR") || estado === "HISTORICO_SIN_MOVIMIENTO") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function claseAccion(accion: string) {
  if (accion === "INSERTAR") return "bg-blue-600 text-white";
  if (accion === "NO_INSERTAR") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border border-amber-200 bg-amber-50 text-amber-800";
}

export default function MigrarPagosControlBancarioPage() {
  const router = useRouter();
  const hoy = new Date();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioRol, setUsuarioRol] = useState("");
  const [autorizado, setAutorizado] = useState<boolean | null>(null);

  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [cuentaId, setCuentaId] = useState("");
  const [anio, setAnio] = useState(String(hoy.getFullYear()));
  const [mes, setMes] = useState(String(hoy.getMonth() + 1).padStart(2, "0"));

  const [vista, setVista] = useState<VistaMigracion[]>([]);
  const [cierre, setCierre] = useState<CierreBancario | null>(null);
  const [consultado, setConsultado] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(false);
  const [migrando, setMigrando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [resultado, setResultado] = useState<ResultadoMigracion | null>(null);

  const cuentaSeleccionada = useMemo(
    () => cuentas.find((cuenta) => String(cuenta.id) === cuentaId) || null,
    [cuentas, cuentaId],
  );

  const periodo = `${anio}-${mes}`;
  const periodoCerrado =
    String(cierre?.estado || "").toUpperCase() === "CERRADO";

  const resumen = useMemo(() => {
    const normales = vista.filter(
      (item) => item.tipo_registro === "PAGO_NORMAL",
    );
    const historicos = vista.filter(
      (item) => item.tipo_registro === "PAGO_HISTORICO",
    );
    const pendientes = vista.filter((item) => item.accion === "INSERTAR");
    const migrados = vista.filter((item) => item.accion === "NO_INSERTAR");
    const revisar = vista.filter(
      (item) => !["INSERTAR", "NO_INSERTAR"].includes(item.accion),
    );

    const sumar = (lista: VistaMigracion[]) =>
      lista.reduce((total, item) => total + Number(item.monto || 0), 0);

    return {
      totalRegistros: vista.length,
      pagosNormales: normales.length,
      totalPagosNormales: sumar(normales),
      pagosHistoricos: historicos.length,
      totalPagosHistoricos: sumar(historicos),
      cantidadPorMigrar: pendientes.length,
      totalPorMigrar: sumar(pendientes),
      cantidadYaMigrada: migrados.length,
      totalYaMigrado: sumar(migrados),
      cantidadRevisar: revisar.length,
      totalMes: sumar(vista),
    };
  }, [vista]);

  const estadosDisponibles = useMemo(
    () =>
      Array.from(new Set(vista.map((item) => item.estado_migracion))).sort(),
    [vista],
  );

  const vistaFiltrada = useMemo(() => {
    const texto = normalizar(busqueda);

    return vista.filter((item) => {
      if (filtroEstado !== "TODOS" && item.estado_migracion !== filtroEstado) {
        return false;
      }

      if (!texto) return true;

      return normalizar(
        [
          item.pago_id,
          item.pago_historico_id,
          item.fecha_bancaria,
          item.unidad,
          item.propietario,
          item.periodo_pagado,
          item.archivo_banco_id,
          item.movimiento_banco_id,
          item.monto,
          item.descripcion_movimiento_prevista,
        ].join(" "),
      ).includes(texto);
    });
  }, [vista, busqueda, filtroEstado]);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const rol = localStorage.getItem("usuario_rol") || "";
    const permisos = obtenerPermisos();

    if (!id) {
      router.replace("/login");
      return;
    }

    const permisoExplicito = permisos.some((permiso) =>
      [
        "BANCO_MIGRAR_PAGOS",
        "CONTROL_BANCARIO_MIGRAR_PAGOS",
        "MIGRAR_PAGOS_BANCO",
      ].includes(permiso),
    );

    const acceso = esAdministrador(rol) || permisoExplicito;

    setCondominioId(id);
    setCondominioNombre(nombre);
    setUsuarioRol(rol);
    setAutorizado(acceso);

    if (acceso) void cargarCuentas(id);
  }, [router]);

  async function cargarCuentas(id: string) {
    const { data, error } = await supabase
      .from("cuentas_bancarias")
      .select("id, nombre_banco, numero_cuenta, tipo_cuenta, moneda, activa")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("nombre_banco")
      .order("id");

    if (error) {
      setMensaje(
        "No se pudieron cargar las cuentas bancarias: " + error.message,
      );
      return;
    }

    const lista = (data || []) as CuentaBancaria[];
    setCuentas(lista);

    if (lista.length > 0) {
      setCuentaId((actual) => actual || String(lista[0].id));
    }
  }

  function limpiarVista() {
    setVista([]);
    setCierre(null);
    setConsultado(false);
    setResultado(null);
    setExpandidos(new Set());
  }

  async function consultarVista() {
    if (!condominioId || !cuentaId || !anio || !mes) {
      setMensaje("Seleccione cuenta bancaria, año y mes.");
      return;
    }

    setLoading(true);
    setMensaje("");
    setResultado(null);
    setConsultado(false);
    setExpandidos(new Set());

    const [vistaResp, cierreResp] = await Promise.all([
      supabase.rpc("previsualizar_migracion_pagos_banco", {
        p_condominio_id: Number(condominioId),
        p_cuenta_bancaria_id: Number(cuentaId),
        p_anio: Number(anio),
        p_mes: Number(mes),
      }),
      supabase
        .from("banco_cierres_mensuales")
        .select(
          "id, periodo, estado, balance_inicial, total_ingresos, total_gastos, balance_final",
        )
        .eq("condominio_id", Number(condominioId))
        .eq("cuenta_bancaria_id", Number(cuentaId))
        .eq("periodo", periodo)
        .maybeSingle(),
    ]);

    setLoading(false);
    setConsultado(true);

    if (vistaResp.error) {
      setVista([]);
      setMensaje(
        "No se pudo generar la vista previa: " + vistaResp.error.message,
      );
      return;
    }

    if (cierreResp.error) {
      setVista([]);
      setMensaje(
        "No se pudo consultar el estado del periodo: " +
          cierreResp.error.message,
      );
      return;
    }

    const lista = ((vistaResp.data || []) as unknown as VistaMigracion[]).map(
      (item) => ({
        ...item,
        registro_id: Number(item.registro_id),
        pago_id: item.pago_id ? Number(item.pago_id) : null,
        pago_historico_id: item.pago_historico_id
          ? Number(item.pago_historico_id)
          : null,
        unidad_id: Number(item.unidad_id),
        monto: Number(item.monto || 0),
        archivo_banco_id: item.archivo_banco_id
          ? Number(item.archivo_banco_id)
          : null,
        pago_identificado_id: item.pago_identificado_id
          ? Number(item.pago_identificado_id)
          : null,
        movimiento_banco_id: item.movimiento_banco_id
          ? Number(item.movimiento_banco_id)
          : null,
        monto_movimiento_existente:
          item.monto_movimiento_existente !== null
            ? Number(item.monto_movimiento_existente)
            : null,
      }),
    );

    setVista(lista);
    setCierre((cierreResp.data as CierreBancario | null) || null);
  }

  function alternarDetalle(item: VistaMigracion) {
    const clave = `${item.tipo_registro}-${item.registro_id}`;

    setExpandidos((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(clave)) siguiente.delete(clave);
      else siguiente.add(clave);
      return siguiente;
    });
  }

  async function migrarPagos() {
    if (periodoCerrado) {
      alert(`El periodo ${periodo} está cerrado.`);
      return;
    }

    if (resumen.cantidadRevisar > 0) {
      alert("Existen registros que requieren revisión antes de migrar.");
      return;
    }

    if (resumen.cantidadPorMigrar === 0) {
      alert("No existen pagos pendientes de migrar.");
      return;
    }

    const confirmar = confirm(
      `MIGRACIÓN DE PAGOS AL CONTROL BANCARIO\n\n` +
        `Condominio: ${condominioNombre || condominioId}\n` +
        `Cuenta: ${cuentaSeleccionada?.nombre_banco || cuentaId} - ${
          cuentaSeleccionada?.numero_cuenta || ""
        }\n` +
        `Periodo: ${nombreMes(mes)} ${anio}\n\n` +
        `Movimientos: ${resumen.cantidadPorMigrar}\n` +
        `Monto total: ${dinero(resumen.totalPorMigrar)}\n\n` +
        `No se modificarán pagos, cargos ni créditos.\n\n` +
        `¿Desea continuar?`,
    );

    if (!confirmar) return;

    setMigrando(true);
    setMensaje("");
    setResultado(null);

    const { data, error } = await supabase.rpc(
      "migrar_pagos_pendientes_banco",
      {
        p_condominio_id: Number(condominioId),
        p_cuenta_bancaria_id: Number(cuentaId),
        p_anio: Number(anio),
        p_mes: Number(mes),
        p_cantidad_confirmada: resumen.cantidadPorMigrar,
        p_total_confirmado: resumen.totalPorMigrar,
      },
    );

    setMigrando(false);

    if (error) {
      setMensaje("No se pudo completar la migración: " + error.message);
      return;
    }

    const respuesta = data as unknown as ResultadoMigracion;
    setResultado({
      ...respuesta,
      cantidad_insertada: Number(respuesta?.cantidad_insertada || 0),
      total_insertado: Number(respuesta?.total_insertado || 0),
    });
    setMensaje(
      respuesta?.mensaje || "La migración fue completada correctamente.",
    );

    await consultarVista();
  }

  if (autorizado === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Validando acceso administrativo...
      </div>
    );
  }

  if (!autorizado) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <LockKeyhole className="mx-auto h-12 w-12 text-rose-600" />
        <h1 className="mt-4 text-2xl font-black text-slate-900">
          Acceso restringido
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Este módulo está disponible para administradores o usuarios con
          permiso de migración bancaria.
          <br />
          Rol actual: <strong>{usuarioRol || "Sin rol"}</strong>.
        </p>
        <Link
          href="/finanzas/control-bancario"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Control Bancario
        </Link>
      </div>
    );
  }

  return (
    <PageContainer>
      <ModuleMenu
        title="Control Bancario"
        subtitle="Movimientos, cierres, migraciones y herramientas administrativas."
        tone="blue"
        items={[
          {
            href: "/finanzas/control-bancario",
            label: "Control bancario",
            icon: Banknote,
          },
          {
            href: "/pagos-mantenimiento",
            label: "Registrar pagos",
            icon: WalletCards,
          },
          {
            href: "/finanzas/control-bancario/migrar-pagos",
            label: "Migrar pagos",
            icon: UploadCloud,
          },
          {
            href: "/finanzas/control-bancario/correcciones",
            label: "Correcciones",
            icon: ShieldCheck,
          },
        ]}
      />

      <ModuleToolbar
        title="Migración de pagos al Control Bancario"
        subtitle={`Vista previa y reconstrucción segura. Condominio: ${
          condominioNombre || condominioId
        }.`}
        icon={UploadCloud}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/finanzas/control-bancario"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
            <button
              type="button"
              onClick={() => void consultarVista()}
              disabled={loading || !cuentaId}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Actualizar vista
            </button>
          </div>
        }
      />

      {mensaje && (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            mensaje.toLowerCase().includes("no se pudo") ||
            mensaje.toLowerCase().includes("error")
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-blue-200 bg-blue-50 text-blue-800"
          }`}
        >
          {mensaje}
        </div>
      )}

      <SectionCard
        title="Periodo a analizar"
        subtitle="Seleccione la cuenta y el mes que será comparado con banco_movimientos."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm font-bold text-slate-700 xl:col-span-2">
            Cuenta bancaria
            <select
              value={cuentaId}
              onChange={(event) => {
                setCuentaId(event.target.value);
                limpiarVista();
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
            >
              <option value="">Seleccione una cuenta</option>
              {cuentas.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.nombre_banco || "Banco"} -{" "}
                  {cuenta.numero_cuenta || "Sin número"}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm font-bold text-slate-700">
            Año
            <select
              value={anio}
              onChange={(event) => {
                setAnio(event.target.value);
                limpiarVista();
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
            >
              {Array.from({ length: 7 }, (_, index) =>
                String(hoy.getFullYear() - 5 + index),
              ).map((valor) => (
                <option key={valor} value={valor}>
                  {valor}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm font-bold text-slate-700">
            Mes
            <select
              value={mes}
              onChange={(event) => {
                setMes(event.target.value);
                limpiarVista();
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
            >
              {MESES.map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="font-black text-slate-900">
              {cuentaSeleccionada
                ? `${cuentaSeleccionada.nombre_banco} - ${cuentaSeleccionada.numero_cuenta}`
                : "Seleccione la cuenta bancaria"}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Periodo solicitado: {nombreMes(mes)} {anio}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void consultarVista()}
            disabled={loading || !cuentaId}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            Consultar pagos
          </button>
        </div>
      </SectionCard>

      {consultado && (
        <>
          <div
            className={`rounded-2xl border p-4 ${
              periodoCerrado
                ? "border-slate-300 bg-slate-100 text-slate-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            <div className="flex items-start gap-3">
              {periodoCerrado ? (
                <LockKeyhole className="mt-0.5 h-5 w-5" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5" />
              )}
              <div>
                <p className="font-black">
                  {periodoCerrado
                    ? `Periodo ${periodo} cerrado: solo consulta`
                    : `Periodo ${periodo} disponible para migración`}
                </p>
                <p className="mt-1 text-sm">
                  {cierre
                    ? `Estado del cierre: ${cierre.estado}.`
                    : "El periodo todavía no tiene un registro de cierre mensual."}{" "}
                  Este proceso no modifica pagos, cargos ni créditos.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              {
                titulo: "Registros encontrados",
                cantidad: resumen.totalRegistros,
                total: dinero(resumen.totalMes),
                contenedor: "border-slate-200 bg-slate-50",
                etiqueta: "text-slate-600",
                valor: "text-slate-950",
                detalle: "text-slate-700",
              },
              {
                titulo: "Pagos normales",
                cantidad: resumen.pagosNormales,
                total: dinero(resumen.totalPagosNormales),
                contenedor: "border-blue-200 bg-blue-50",
                etiqueta: "text-blue-700",
                valor: "text-blue-950",
                detalle: "text-blue-800",
              },
              {
                titulo: "Pagos históricos",
                cantidad: resumen.pagosHistoricos,
                total: dinero(resumen.totalPagosHistoricos),
                contenedor: "border-amber-200 bg-amber-50",
                etiqueta: "text-amber-700",
                valor: "text-amber-950",
                detalle: "text-amber-800",
              },
              {
                titulo: "Ya migrados",
                cantidad: resumen.cantidadYaMigrada,
                total: dinero(resumen.totalYaMigrado),
                contenedor: "border-emerald-200 bg-emerald-50",
                etiqueta: "text-emerald-700",
                valor: "text-emerald-950",
                detalle: "text-emerald-800",
              },
              {
                titulo: "Pendientes",
                cantidad: resumen.cantidadPorMigrar,
                total: dinero(resumen.totalPorMigrar),
                contenedor: "border-indigo-200 bg-indigo-50",
                etiqueta: "text-indigo-700",
                valor: "text-indigo-950",
                detalle: "text-indigo-800",
              },
            ].map((tarjeta) => (
              <div
                key={tarjeta.titulo}
                className={`rounded-2xl border p-4 shadow-sm ${tarjeta.contenedor}`}
              >
                <p
                  className={`text-xs font-bold uppercase ${tarjeta.etiqueta}`}
                >
                  {tarjeta.titulo}
                </p>
                <p className={`mt-2 text-2xl font-black ${tarjeta.valor}`}>
                  {tarjeta.cantidad}
                </p>
                <p className={`mt-1 text-xs ${tarjeta.detalle}`}>
                  {tarjeta.total}
                </p>
              </div>
            ))}
          </div>

          {resumen.cantidadRevisar > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
              <div className="flex items-start gap-3">
                <FileWarning className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-black">
                    {resumen.cantidadRevisar} registro(s) requieren revisión
                  </p>
                  <p className="mt-1 text-sm">
                    La migración permanecerá bloqueada hasta corregirlos.
                  </p>
                </div>
              </div>
            </div>
          )}

          <SectionCard
            title="Pagos encontrados y movimiento previsto"
            subtitle="Expanda una fila para revisar exactamente qué será insertado."
          >
            <div className="mb-4 grid gap-3 md:grid-cols-[1fr_260px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Buscar pago, unidad, propietario o archivo..."
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm"
                />
              </label>

              <select
                value={filtroEstado}
                onChange={(event) => setFiltroEstado(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold"
              >
                <option value="TODOS">Todos los estados</option>
                {estadosDisponibles.map((estado) => (
                  <option key={estado} value={estado}>
                    {textoEstado(estado)}
                  </option>
                ))}
              </select>
            </div>

            {vistaFiltrada.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                No se encontraron registros.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[1250px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="w-12 px-3 py-3"></th>
                      <th className="px-3 py-3">Acción</th>
                      <th className="px-3 py-3">Fecha banco</th>
                      <th className="px-3 py-3">Registro</th>
                      <th className="px-3 py-3">Unidad / propietario</th>
                      <th className="px-3 py-3">Periodo pagado</th>
                      <th className="px-3 py-3">Archivo banco</th>
                      <th className="px-3 py-3">Movimiento existente</th>
                      <th className="px-3 py-3 text-right">Monto</th>
                      <th className="px-3 py-3">Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {vistaFiltrada.map((item) => {
                      const clave = `${item.tipo_registro}-${item.registro_id}`;
                      const expandido = expandidos.has(clave);

                      return (
                        <Fragment key={clave}>
                          <tr className="border-t border-slate-100 align-top hover:bg-slate-50">
                            <td className="px-3 py-3">
                              <button
                                type="button"
                                onClick={() => alternarDetalle(item)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200"
                              >
                                {expandido ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            </td>

                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${claseAccion(
                                  item.accion,
                                )}`}
                              >
                                {item.accion}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-3 py-3 font-semibold">
                              {fechaCorta(item.fecha_bancaria)}
                            </td>

                            <td className="px-3 py-3">
                              <p className="font-black text-slate-900">
                                {item.tipo_registro === "PAGO_NORMAL"
                                  ? `Pago #${item.pago_id}`
                                  : `Histórico #${item.pago_historico_id}`}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {item.tipo_registro === "PAGO_NORMAL"
                                  ? "Pago normal"
                                  : "Pago histórico"}
                              </p>
                            </td>

                            <td className="px-3 py-3">
                              <p className="font-black">{item.unidad || "-"}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {item.propietario || "Sin propietario"}
                              </p>
                            </td>

                            <td className="px-3 py-3">
                              {item.periodo_pagado || "-"}
                            </td>

                            <td className="px-3 py-3">
                              <p className="font-semibold">
                                {item.archivo_banco_id
                                  ? `#${item.archivo_banco_id}`
                                  : "Sin archivo"}
                              </p>
                              {item.pago_identificado_id && (
                                <p className="mt-1 text-xs text-slate-500">
                                  Identificado #{item.pago_identificado_id}
                                </p>
                              )}
                            </td>

                            <td className="px-3 py-3">
                              {item.movimiento_banco_id ? (
                                <>
                                  <p className="font-black text-emerald-700">
                                    #{item.movimiento_banco_id}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {fechaCorta(
                                      item.fecha_movimiento_existente,
                                    )}{" "}
                                    · {dinero(item.monto_movimiento_existente)}
                                  </p>
                                </>
                              ) : (
                                <span className="text-slate-400">
                                  No existe
                                </span>
                              )}
                            </td>

                            <td className="whitespace-nowrap px-3 py-3 text-right font-black">
                              {dinero(item.monto)}
                            </td>

                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${claseEstado(
                                  item.estado_migracion,
                                )}`}
                              >
                                {textoEstado(item.estado_migracion)}
                              </span>
                            </td>
                          </tr>

                          {expandido && (
                            <tr className="border-t border-blue-100 bg-blue-50/60">
                              <td colSpan={10} className="px-5 py-4">
                                <div className="grid gap-4 lg:grid-cols-4">
                                  <div>
                                    <p className="text-xs font-bold uppercase text-blue-700">
                                      Clasificación
                                    </p>
                                    <p className="mt-2 text-sm">
                                      Tipo:{" "}
                                      <strong>
                                        {item.tipo_movimiento_previsto}
                                      </strong>
                                    </p>
                                    <p className="mt-1 text-sm">
                                      Origen:{" "}
                                      <strong>{item.origen_previsto}</strong>
                                    </p>
                                    <p className="mt-1 text-sm">
                                      Periodo banco:{" "}
                                      <strong>{item.periodo_bancario}</strong>
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs font-bold uppercase text-blue-700">
                                      Referencias
                                    </p>
                                    <p className="mt-2 text-sm">
                                      referencia_id:{" "}
                                      <strong>
                                        {item.referencia_id_prevista || "-"}
                                      </strong>
                                    </p>
                                    <p className="mt-1 text-sm">
                                      Referencia banco:{" "}
                                      <strong>
                                        {item.referencia_banco_prevista || "-"}
                                      </strong>
                                    </p>
                                    <p className="mt-1 text-sm">
                                      Documento:{" "}
                                      <strong>
                                        {item.numero_documento_previsto || "-"}
                                      </strong>
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs font-bold uppercase text-blue-700">
                                      Beneficiario y monto
                                    </p>
                                    <p className="mt-2 font-black">
                                      {item.beneficiario_previsto || "-"}
                                    </p>
                                    <p className="mt-2 text-sm">
                                      Fecha:{" "}
                                      <strong>
                                        {fechaCorta(item.fecha_bancaria)}
                                      </strong>
                                    </p>
                                    <p className="mt-1 text-sm">
                                      Monto:{" "}
                                      <strong>{dinero(item.monto)}</strong>
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs font-bold uppercase text-blue-700">
                                      Descripción exacta
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-700">
                                      {item.descripcion_movimiento_prevista ||
                                        "-"}
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <section
            className={`rounded-3xl border p-5 shadow-sm ${
              periodoCerrado ||
              resumen.cantidadRevisar > 0 ||
              resumen.cantidadPorMigrar === 0
                ? "border-slate-200 bg-slate-50"
                : "border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50"
            }`}
          >
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">
                  Confirmación de migración
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-900">
                  {resumen.cantidadPorMigrar} movimientos por{" "}
                  {dinero(resumen.totalPorMigrar)}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Solo se insertarán los registros marcados como{" "}
                  <strong>INSERTAR</strong>. Los existentes no se duplicarán.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void migrarPagos()}
                disabled={
                  migrando ||
                  periodoCerrado ||
                  resumen.cantidadRevisar > 0 ||
                  resumen.cantidadPorMigrar === 0
                }
                className="inline-flex min-w-64 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {migrando ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <UploadCloud className="h-5 w-5" />
                )}
                {migrando ? "Migrando pagos..." : "Migrar pagos pendientes"}
              </button>
            </div>
          </section>
        </>
      )}

      {resultado && (
        <section className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" />
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Migración completada
              </h3>
              <p className="mt-1 text-sm text-slate-600">{resultado.mensaje}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase text-emerald-700">
                Periodo
              </p>
              <p className="mt-1 text-lg font-black">{resultado.periodo}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase text-emerald-700">
                Movimientos creados
              </p>
              <p className="mt-1 text-lg font-black">
                {resultado.cantidad_insertada}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase text-emerald-700">
                Total insertado
              </p>
              <p className="mt-1 text-lg font-black">
                {dinero(resultado.total_insertado)}
              </p>
            </div>
          </div>
        </section>
      )}

      {!consultado && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Landmark className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-lg font-black text-slate-900">
            Consulte un periodo para iniciar
          </h3>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">
            El sistema mostrará los pagos, la sumatoria y el contenido exacto
            que será enviado a banco_movimientos.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5" />
          <div>
            <p className="font-black">Alcance del módulo</p>
            <p className="mt-1 leading-6">
              Reconstruye movimientos bancarios faltantes desde pagos ya
              registrados. No reaplica pagos, no modifica cargos y no genera
              saldos a favor.
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
