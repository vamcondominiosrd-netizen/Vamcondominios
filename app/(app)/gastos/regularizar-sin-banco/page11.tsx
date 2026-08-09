"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

type Proveedor = {
  id: number;
  nombre_proveedor: string | null;
};

type Categoria = {
  id: number;
  nombre_categoria: string | null;
};

type SolicitudRelacionada = {
  id: number;
  numero_solicitud: number | null;
  gasto_generado_id: number | null;
  soporte_url: string | null;
  factura_url?: string | null;
  cheque_url?: string | null;
  estado_operativo?: string | null;
};

type GastoSinBanco = {
  id: number;
  client_id: number | null;
  condominio_id: number;
  condominio: string | null;
  fecha: string | null;
  concepto: string | null;
  detalle_gasto: string | null;
  proveedor: string | null;
  proveedor_id: number | null;
  categoria_id: number | null;
  monto: number | string | null;
  itbis: number | string | null;
  total: number | string | null;
  no_factura: string | null;
  ncf: string | null;
  metodo_pago: string | null;
  cuenta_banco: string | null;
  factura_url: string | null;
  cheque_url: string | null;
  numero_cheque: string | null;
  fecha_pago: string | null;
  pagado: boolean | null;
  estado: string | null;
  catalogo_proveedores?:
    | { nombre_proveedor: string | null }
    | { nombre_proveedor: string | null }[]
    | null;
  catalogo_categoria_gastos?:
    | { nombre_categoria: string | null }
    | { nombre_categoria: string | null }[]
    | null;
  solicitud?: SolicitudRelacionada | null;
};

type FormularioGasto = {
  fecha: string;
  fecha_pago: string;
  proveedor_id: string;
  categoria_id: string;
  concepto: string;
  detalle_gasto: string;
  monto: string;
  itbis: string;
  no_factura: string;
  ncf: string;
  metodo_pago: string;
  cuenta_banco: string;
  numero_cheque: string;
  factura_url: string;
  cheque_url: string;
  motivo: string;
};

type StorageRef = {
  bucket: string;
  path: string;
};

const BUCKET_FACTURAS = "facturas-gastos";
const BUCKET_SOPORTES = "soportes-solicitudes-pago";
const BUCKET_DOCUMENTOS = "gastos-documentos";
const MAX_ARCHIVO = 10 * 1024 * 1024;
const EXTENSIONES = ["pdf", "jpg", "jpeg", "png", "webp"];

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function numero(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const limpio = String(value || "")
    .replace(/RD\$/gi, "")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .trim();

  const resultado = Number(limpio);
  return Number.isFinite(resultado) ? resultado : 0;
}

function dinero(value: unknown): string {
  return moneda.format(numero(value));
}

function fechaISO(value: unknown): string {
  return String(value || "").slice(0, 10);
}

function fechaTexto(value: unknown): string {
  const iso = fechaISO(value);
  if (!iso) return "-";

  const [anio, mes, dia] = iso.split("-");
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : iso;
}

function limpiar(value: unknown, fallback = "-"): string {
  const resultado = String(value || "").trim();
  return resultado || fallback;
}

function nombreRelacion(
  relacion:
    | Record<string, string | null>
    | Record<string, string | null>[]
    | null
    | undefined,
  campo: string
): string {
  if (Array.isArray(relacion)) {
    return limpiar(relacion[0]?.[campo], "");
  }

  return limpiar(relacion?.[campo], "");
}

function nombreProveedor(gasto: GastoSinBanco): string {
  return (
    nombreRelacion(
      gasto.catalogo_proveedores as
        | Record<string, string | null>
        | Record<string, string | null>[]
        | null,
      "nombre_proveedor"
    ) ||
    limpiar(gasto.proveedor, "Proveedor no identificado")
  );
}

function nombreCategoria(gasto: GastoSinBanco): string {
  return (
    nombreRelacion(
      gasto.catalogo_categoria_gastos as
        | Record<string, string | null>
        | Record<string, string | null>[]
        | null,
      "nombre_categoria"
    ) || "Sin categoría"
  );
}

function formularioInicial(gasto: GastoSinBanco): FormularioGasto {
  return {
    fecha: fechaISO(gasto.fecha || gasto.fecha_pago),
    fecha_pago: fechaISO(gasto.fecha_pago || gasto.fecha),
    proveedor_id: gasto.proveedor_id
      ? String(gasto.proveedor_id)
      : "",
    categoria_id: gasto.categoria_id
      ? String(gasto.categoria_id)
      : "",
    concepto: gasto.concepto || "",
    detalle_gasto: gasto.detalle_gasto || "",
    monto: String(numero(gasto.monto)),
    itbis: String(numero(gasto.itbis)),
    no_factura: gasto.no_factura || "",
    ncf: gasto.ncf || "",
    metodo_pago: gasto.metodo_pago || "Cheque",
    cuenta_banco: gasto.cuenta_banco || "",
    numero_cheque: gasto.numero_cheque || "",
    factura_url:
      gasto.factura_url ||
      gasto.solicitud?.factura_url ||
      gasto.solicitud?.soporte_url ||
      "",
    cheque_url:
      gasto.cheque_url ||
      gasto.solicitud?.cheque_url ||
      "",
    motivo: "Corrección administrativa antes de pasar al banco",
  };
}

function extensionArchivo(nombre: string): string {
  return nombre.split(".").pop()?.toLowerCase() || "";
}

function nombreSeguro(nombre: string): string {
  const extension = extensionArchivo(nombre);
  const base = nombre
    .replace(/\.[^/.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70);

  return `${base || "soporte"}.${extension || "pdf"}`;
}

function referenciaStorage(
  url: unknown
): StorageRef | null {
  const texto = String(url || "").trim();
  if (!texto) return null;

  if (!/^https?:\/\//i.test(texto)) {
    return null;
  }

  try {
    const parsed = new URL(texto);
    const patrones = [
      "/storage/v1/object/public/",
      "/storage/v1/object/sign/",
      "/storage/v1/object/authenticated/",
    ];

    for (const patron of patrones) {
      const posicion = parsed.pathname.indexOf(patron);
      if (posicion < 0) continue;

      const resto = decodeURIComponent(
        parsed.pathname.slice(posicion + patron.length)
      );

      const [bucket, ...partes] = resto.split("/");

      if (!bucket || partes.length === 0) return null;

      return {
        bucket,
        path: partes.join("/"),
      };
    }
  } catch {
    return null;
  }

  return null;
}

async function eliminarObjetosStorage(
  referencias: StorageRef[]
): Promise<void> {
  const unicas = new Map<string, StorageRef>();

  referencias.forEach((referencia) => {
    if (!referencia.bucket || !referencia.path) return;
    unicas.set(
      `${referencia.bucket}::${referencia.path}`,
      referencia
    );
  });

  const porBucket = new Map<string, string[]>();

  unicas.forEach(({ bucket, path }) => {
    const rutas = porBucket.get(bucket) || [];
    rutas.push(path);
    porBucket.set(bucket, rutas);
  });

  for (const [bucket, rutas] of porBucket) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove(rutas);

    if (error) {
      console.warn(
        `No se pudieron limpiar archivos del bucket ${bucket}:`,
        error.message
      );
    }
  }
}

export default function RegularizarGastosSinBancoPage() {

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] =
    useState("");

  const [gastos, setGastos] = useState<GastoSinBanco[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>(
    []
  );
  const [categorias, setCategorias] = useState<Categoria[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const [buscar, setBuscar] = useState("");
  const [periodo, setPeriodo] = useState("");

  const [seleccionado, setSeleccionado] =
    useState<GastoSinBanco | null>(null);
  const [formulario, setFormulario] =
    useState<FormularioGasto | null>(null);

  const [mensaje, setMensaje] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

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
    setCondominioNombre(
      nombre || `Condominio ID ${id}`
    );

    void cargarTodo(id);
  }, []);

  const gastosFiltrados = useMemo(() => {
    const termino = buscar.toLowerCase().trim();

    return gastos.filter((gasto) => {
      const fechaFiltro = fechaISO(
        gasto.fecha_pago || gasto.fecha
      );

      const cumplePeriodo =
        !periodo || fechaFiltro.startsWith(periodo);

      const textoBusqueda = [
        gasto.id,
        nombreProveedor(gasto),
        nombreCategoria(gasto),
        gasto.concepto,
        gasto.detalle_gasto,
        gasto.no_factura,
        gasto.ncf,
        gasto.numero_cheque,
        gasto.solicitud?.numero_solicitud,
        gasto.total,
      ]
        .filter(
          (valor) =>
            valor !== null && valor !== undefined
        )
        .join(" ")
        .toLowerCase();

      return (
        cumplePeriodo &&
        (!termino || textoBusqueda.includes(termino))
      );
    });
  }, [gastos, buscar, periodo]);

  const totalPendiente = useMemo(
    () =>
      gastosFiltrados.reduce(
        (suma, gasto) =>
          suma + numero(gasto.total ?? gasto.monto),
        0
      ),
    [gastosFiltrados]
  );

  const totalFormulario = useMemo(() => {
    if (!formulario) return 0;

    return (
      numero(formulario.monto) +
      numero(formulario.itbis)
    );
  }, [formulario]);

  async function cargarTodo(id: string) {
    setLoading(true);
    setError(null);

    try {
      const condominio = Number(id);
      const gastoIdSolicitado =
        typeof window !== "undefined"
          ? Number(
              new URLSearchParams(window.location.search).get(
                "gasto_id"
              ) || 0
            )
          : 0;

      const {
        data: solicitudesData,
        error: solicitudesError,
      } = await supabase
        .from("v_solicitudes_pago_operativas")
        .select(`
          solicitud_id,
          numero_solicitud,
          gasto_generado_id,
          gasto_id,
          soporte_url,
          factura_url,
          cheque_url,
          estado_operativo
        `)
        .eq("condominio_id", condominio)
        .eq(
          "estado_operativo",
          "Revisar: pagado sin banco"
        )
        .order("fecha_pago", { ascending: true })
        .order("solicitud_id", { ascending: true });

      if (solicitudesError) {
        throw new Error(
          "Error cargando solicitudes pendientes: " +
            solicitudesError.message
        );
      }

      const solicitudesBase = (solicitudesData || []).map(
        (solicitud: any): SolicitudRelacionada & {
          gasto_id?: number | null;
        } => ({
          id: Number(solicitud.solicitud_id),
          numero_solicitud:
            solicitud.numero_solicitud ?? null,
          gasto_generado_id:
            solicitud.gasto_generado_id ?? null,
          gasto_id: solicitud.gasto_id ?? null,
          soporte_url: solicitud.soporte_url ?? null,
          factura_url: solicitud.factura_url ?? null,
          cheque_url: solicitud.cheque_url ?? null,
          estado_operativo:
            solicitud.estado_operativo ?? null,
        })
      );

      const solicitudPorGasto = new Map<
        number,
        SolicitudRelacionada
      >();

      for (const solicitud of solicitudesBase) {
        const gastoId = Number(
          solicitud.gasto_id ||
            solicitud.gasto_generado_id ||
            0
        );

        if (gastoId > 0) {
          solicitudPorGasto.set(gastoId, solicitud);
        }
      }

      const ids = Array.from(solicitudPorGasto.keys());

      const [
        gastosResponse,
        proveedoresResponse,
        categoriasResponse,
      ] = await Promise.all([
        ids.length > 0
          ? supabase
              .from("gastos")
              .select(`
                id,
                client_id,
                condominio_id,
                condominio,
                fecha,
                concepto,
                detalle_gasto,
                proveedor,
                proveedor_id,
                categoria_id,
                monto,
                itbis,
                total,
                no_factura,
                ncf,
                metodo_pago,
                cuenta_banco,
                factura_url,
                cheque_url,
                numero_cheque,
                fecha_pago,
                pagado,
                estado,
                catalogo_proveedores(nombre_proveedor),
                catalogo_categoria_gastos(nombre_categoria)
              `)
              .eq("condominio_id", condominio)
              .eq("pagado", true)
              .in("id", ids)
              .order("fecha_pago", { ascending: true })
              .order("id", { ascending: true })
          : Promise.resolve({ data: [], error: null }),

        supabase
          .from("catalogo_proveedores")
          .select("id, nombre_proveedor")
          .eq("condominio_id", condominio)
          .order("nombre_proveedor", { ascending: true }),

        supabase
          .from("catalogo_categoria_gastos")
          .select("id, nombre_categoria")
          .eq("condominio_id", condominio)
          .order("nombre_categoria", { ascending: true }),
      ]);

      if (gastosResponse.error) {
        throw new Error(
          "Error cargando gastos relacionados: " +
            gastosResponse.error.message
        );
      }

      if (proveedoresResponse.error) {
        throw new Error(
          "Error cargando proveedores: " +
            proveedoresResponse.error.message
        );
      }

      if (categoriasResponse.error) {
        throw new Error(
          "Error cargando categorías: " +
            categoriasResponse.error.message
        );
      }

      const pendientes = (
        (gastosResponse.data || []) as GastoSinBanco[]
      ).map((gasto) => {
        const solicitud =
          solicitudPorGasto.get(gasto.id) || null;

        return {
          ...gasto,
          factura_url:
            gasto.factura_url ||
            solicitud?.factura_url ||
            solicitud?.soporte_url ||
            null,
          cheque_url:
            gasto.cheque_url ||
            solicitud?.cheque_url ||
            null,
          solicitud,
        };
      });

      setGastos(pendientes);
      setProveedores(
        (proveedoresResponse.data || []) as Proveedor[]
      );
      setCategorias(
        (categoriasResponse.data || []) as Categoria[]
      );

      if (gastoIdSolicitado > 0) {
        const solicitado = pendientes.find(
          (gasto) => gasto.id === gastoIdSolicitado
        );

        if (solicitado) {
          setBuscar(String(gastoIdSolicitado));
          setSeleccionado(solicitado);
          setFormulario(formularioInicial(solicitado));
        }
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "No se pudo cargar el módulo de regularización."
      );
      setGastos([]);
    } finally {
      setLoading(false);
    }
  }

  function abrirEdicion(gasto: GastoSinBanco) {
    setSeleccionado(gasto);
    setFormulario(formularioInicial(gasto));
    setError(null);
    setMensaje(null);
  }

  function cerrarEdicion() {
    if (guardando || subiendo || eliminando) return;

    setSeleccionado(null);
    setFormulario(null);
  }

  function cambiarCampo(
    campo: keyof FormularioGasto,
    valor: string
  ) {
    setFormulario((actual) =>
      actual
        ? {
            ...actual,
            [campo]: valor,
          }
        : actual
    );
  }

  function validarFormulario(): string | null {
    if (!formulario) return "No hay un gasto seleccionado.";
    if (!formulario.fecha)
      return "La fecha del gasto es obligatoria.";
    if (!formulario.fecha_pago)
      return "La fecha de pago es obligatoria.";
    if (!formulario.concepto.trim())
      return "El concepto es obligatorio.";
    if (numero(formulario.monto) <= 0)
      return "El monto debe ser mayor que cero.";
    if (numero(formulario.itbis) < 0)
      return "El ITBIS no puede ser negativo.";
    if (formulario.motivo.trim().length < 8)
      return "Indica un motivo de al menos 8 caracteres.";

    return null;
  }

  async function guardarCambios() {
    if (!seleccionado || !formulario) return;

    const validacion = validarFormulario();

    if (validacion) {
      setError(validacion);
      return;
    }

    const confirmar = window.confirm(
      [
        `Gasto ID: ${seleccionado.id}`,
        `Proveedor: ${nombreProveedor(seleccionado)}`,
        `Nuevo total: ${dinero(totalFormulario)}`,
        `Fecha de pago: ${fechaTexto(
          formulario.fecha_pago
        )}`,
        "",
        "¿Deseas guardar estos cambios?",
      ].join("\n")
    );

    if (!confirmar) return;

    setGuardando(true);
    setError(null);
    setMensaje(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "actualizar_gasto_sin_banco",
        {
          p_gasto_id: seleccionado.id,
          p_condominio_id: Number(condominioId),
          p_fecha: formulario.fecha,
          p_fecha_pago: formulario.fecha_pago,
          p_proveedor_id: formulario.proveedor_id
            ? Number(formulario.proveedor_id)
            : null,
          p_categoria_id: formulario.categoria_id
            ? Number(formulario.categoria_id)
            : null,
          p_concepto: formulario.concepto,
          p_detalle_gasto: formulario.detalle_gasto,
          p_monto: numero(formulario.monto),
          p_itbis: numero(formulario.itbis),
          p_no_factura: formulario.no_factura,
          p_ncf: formulario.ncf,
          p_metodo_pago: formulario.metodo_pago,
          p_cuenta_banco: formulario.cuenta_banco,
          p_numero_cheque: formulario.numero_cheque,
          p_motivo: formulario.motivo,
        }
      );

      if (rpcError) throw rpcError;

      setMensaje(
        data?.mensaje ||
          "Gasto actualizado correctamente."
      );

      setSeleccionado(null);
      setFormulario(null);
      await cargarTodo(condominioId);
    } catch (err: any) {
      setError(
        err?.message ||
          "No se pudieron guardar los cambios."
      );
    } finally {
      setGuardando(false);
    }
  }

  function validarArchivo(archivo: File): string | null {
    const extension = extensionArchivo(archivo.name);

    if (!EXTENSIONES.includes(extension)) {
      return "Solo se permiten archivos PDF, JPG, JPEG, PNG o WEBP.";
    }

    if (archivo.size > MAX_ARCHIVO) {
      return "El archivo no puede superar los 10 MB.";
    }

    return null;
  }

  async function reemplazarArchivo(
    archivo: File,
    tipo: "FACTURA" | "CHEQUE"
  ) {
    if (!seleccionado || !formulario) return;

    const validacion = validarArchivo(archivo);

    if (validacion) {
      setError(validacion);
      return;
    }

    if (formulario.motivo.trim().length < 8) {
      setError(
        "Indica el motivo del cambio antes de reemplazar un archivo."
      );
      return;
    }

    const urlActual =
      tipo === "FACTURA"
        ? formulario.factura_url
        : formulario.cheque_url;

    const etiqueta =
      tipo === "FACTURA"
        ? "factura o soporte"
        : "cheque o comprobante";

    const confirmar = window.confirm(
      urlActual
        ? `¿Deseas reemplazar el ${etiqueta} actual?`
        : `¿Deseas adjuntar este ${etiqueta}?`
    );

    if (!confirmar) return;

    setSubiendo(true);
    setError(null);
    setMensaje(null);

    const bucket =
      tipo === "FACTURA"
        ? BUCKET_FACTURAS
        : BUCKET_SOPORTES;

    const carpeta =
      tipo === "FACTURA"
        ? "facturas"
        : "cheques-pagos";

    const ruta = `${condominioId}/regularizacion/gasto-${
      seleccionado.id
    }/${carpeta}/${Date.now()}-${nombreSeguro(archivo.name)}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(ruta, archivo, {
          cacheControl: "3600",
          upsert: false,
          contentType: archivo.type || undefined,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from(bucket)
        .getPublicUrl(ruta);

      const nuevaUrl = publicData.publicUrl;

      const { data, error: rpcError } = await supabase.rpc(
        "reemplazar_archivo_gasto_sin_banco",
        {
          p_gasto_id: seleccionado.id,
          p_condominio_id: Number(condominioId),
          p_tipo_archivo: tipo,
          p_archivo_url: nuevaUrl,
          p_motivo: formulario.motivo,
        }
      );

      if (rpcError) {
        await supabase.storage.from(bucket).remove([ruta]);
        throw rpcError;
      }

      const anterior = referenciaStorage(
        data?.url_anterior
      );

      if (
        anterior &&
        data?.url_anterior !== data?.url_nueva
      ) {
        await eliminarObjetosStorage([anterior]);
      }

      setFormulario((actual) =>
        actual
          ? {
              ...actual,
              ...(tipo === "FACTURA"
                ? { factura_url: nuevaUrl }
                : { cheque_url: nuevaUrl }),
            }
          : actual
      );

      setMensaje(
        data?.mensaje ||
          "Archivo reemplazado correctamente."
      );

      await cargarTodo(condominioId);
    } catch (err: any) {
      setError(
        err?.message ||
          "No se pudo reemplazar el archivo."
      );
    } finally {
      setSubiendo(false);
    }
  }

  async function eliminarGasto() {
    if (!seleccionado || !formulario) return;

    if (formulario.motivo.trim().length < 8) {
      setError(
        "Indica el motivo de la eliminación con al menos 8 caracteres."
      );
      return;
    }

    const confirmacion1 = window.confirm(
      [
        "Esta operación eliminará el gasto.",
        "",
        `Gasto ID: ${seleccionado.id}`,
        `Proveedor: ${nombreProveedor(seleccionado)}`,
        `Concepto: ${limpiar(seleccionado.concepto)}`,
        `Monto: ${dinero(
          seleccionado.total ?? seleccionado.monto
        )}`,
        "",
        "La solicitud relacionada se conservará, pero quedará desvinculada del gasto.",
        "¿Deseas continuar?",
      ].join("\n")
    );

    if (!confirmacion1) return;

    const codigo = window.prompt(
      `Para confirmar, escribe el ID del gasto: ${seleccionado.id}`
    );

    if (codigo !== String(seleccionado.id)) {
      setError(
        "La confirmación no coincide. El gasto no fue eliminado."
      );
      return;
    }

    setEliminando(true);
    setError(null);
    setMensaje(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "eliminar_gasto_sin_banco",
        {
          p_gasto_id: seleccionado.id,
          p_condominio_id: Number(condominioId),
          p_motivo: formulario.motivo,
        }
      );

      if (rpcError) throw rpcError;

      const referencias: StorageRef[] = [];

      const rutas = Array.isArray(data?.rutas_documentos)
        ? data.rutas_documentos
        : [];

      rutas.forEach((ruta: unknown) => {
        if (!ruta) return;

        referencias.push({
          bucket: BUCKET_DOCUMENTOS,
          path: String(ruta),
        });
      });

      // La factura/soporte se conserva porque la solicitud permanece
      // registrada y puede seguir utilizando el mismo archivo.
      const chequeRef = referenciaStorage(
        data?.cheque_url
      );
      if (chequeRef) referencias.push(chequeRef);

      await eliminarObjetosStorage(referencias);

      setSeleccionado(null);
      setFormulario(null);

      setMensaje(
        data?.mensaje ||
          "Gasto eliminado correctamente."
      );

      await cargarTodo(condominioId);
    } catch (err: any) {
      setError(
        err?.message ||
          "No se pudo eliminar el gasto."
      );
    } finally {
      setEliminando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                Gastos
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-950">
                Regularización antes de pasar al banco
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-slate-500">
                Aquí solo aparecen gastos pagados que no
                tienen un movimiento bancario activo.
                Puedes corregirlos, reemplazar el archivo
                anexo o eliminar los registros equivocados.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p>
                <span className="font-black">
                  Condominio:
                </span>{" "}
                {condominioNombre || "-"}
              </p>

              <p className="mt-1">
                <span className="font-black">
                  Registros pendientes:
                </span>{" "}
                {gastos.length}
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Resumen
            titulo="Pendientes"
            valor={String(gastosFiltrados.length)}
            subtitulo="Sin movimiento bancario"
          />

          <Resumen
            titulo="Monto filtrado"
            valor={dinero(totalPendiente)}
            subtitulo="Pendiente de revisión"
          />

          <Resumen
            titulo="Protección"
            valor="Activa"
            subtitulo="Bloquea registros que ya tengan banco"
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_240px_auto] md:items-end">
            <label className="text-sm font-bold text-slate-700">
              Buscar
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={buscar}
                  onChange={(event) =>
                    setBuscar(event.target.value)
                  }
                  placeholder="ID, proveedor, concepto, factura, NCF o cheque"
                  className="w-full bg-transparent outline-none"
                />
              </div>
            </label>

            <label className="text-sm font-bold text-slate-700">
              Periodo de pago
              <input
                type="month"
                value={periodo}
                onChange={(event) =>
                  setPeriodo(event.target.value)
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <button
              type="button"
              onClick={() => void cargarTodo(condominioId)}
              disabled={loading || !condominioId}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Actualizar
            </button>
          </div>
        </section>

        {error && (
          <Aviso tipo="error" texto={error} />
        )}

        {mensaje && (
          <Aviso tipo="ok" texto={mensaje} />
        )}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="font-black text-slate-900">
              Gastos disponibles para corregir
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-white text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">
                    Fecha pago
                  </th>
                  <th className="px-4 py-3">
                    Proveedor
                  </th>
                  <th className="px-4 py-3">
                    Concepto
                  </th>
                  <th className="px-4 py-3">
                    Solicitud
                  </th>
                  <th className="px-4 py-3">
                    Cheque
                  </th>
                  <th className="px-4 py-3 text-right">
                    Total
                  </th>
                  <th className="px-4 py-3 text-center">
                    Archivo
                  </th>
                  <th className="px-4 py-3 text-center">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Cargando gastos...
                    </td>
                  </tr>
                ) : gastosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No hay gastos pagados sin movimiento
                      bancario para esta consulta.
                    </td>
                  </tr>
                ) : (
                  gastosFiltrados.map((gasto) => (
                    <tr
                      key={gasto.id}
                      className="border-t border-slate-100 align-top"
                    >
                      <td className="px-4 py-3 font-black">
                        {gasto.id}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {fechaTexto(
                          gasto.fecha_pago || gasto.fecha
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-semibold">
                          {nombreProveedor(gasto)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {nombreCategoria(gasto)}
                        </p>
                      </td>

                      <td className="max-w-md px-4 py-3">
                        <p className="font-semibold">
                          {limpiar(gasto.concepto)}
                        </p>
                        {gasto.detalle_gasto && (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                            {gasto.detalle_gasto}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {gasto.solicitud ? (
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">
                            No.{" "}
                            {gasto.solicitud.numero_solicitud ??
                              gasto.solicitud.id}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Sin solicitud
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {limpiar(
                          gasto.numero_cheque,
                          "Sin número"
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-black text-red-700">
                        {dinero(gasto.total ?? gasto.monto)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {gasto.factura_url ? (
                          <a
                            href={gasto.factura_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Ver factura
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Sin archivo
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            abrirEdicion(gasto)
                          }
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-3 py-2 text-xs font-black text-white hover:bg-blue-900"
                        >
                          <Edit3 className="h-4 w-4" />
                          Revisar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {seleccionado && formulario && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-4">
          <div className="mx-auto my-4 max-w-5xl rounded-3xl bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                  Gasto ID {seleccionado.id}
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Editar gasto sin movimiento bancario
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Los cambios también se sincronizan con la
                  solicitud relacionada.
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarEdicion}
                disabled={
                  guardando || subiendo || eliminando
                }
                className="rounded-xl border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="space-y-6 p-5">
              <section className="grid gap-4 md:grid-cols-4">
                <Campo
                  label="Fecha del gasto"
                  type="date"
                  value={formulario.fecha}
                  onChange={(valor) =>
                    cambiarCampo("fecha", valor)
                  }
                />

                <Campo
                  label="Fecha de pago"
                  type="date"
                  value={formulario.fecha_pago}
                  onChange={(valor) =>
                    cambiarCampo("fecha_pago", valor)
                  }
                />

                <label className="text-sm font-bold text-slate-700">
                  Proveedor
                  <select
                    value={formulario.proveedor_id}
                    onChange={(event) =>
                      cambiarCampo(
                        "proveedor_id",
                        event.target.value
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="">
                      Seleccione
                    </option>
                    {proveedores.map((proveedor) => (
                      <option
                        key={proveedor.id}
                        value={proveedor.id}
                      >
                        {proveedor.nombre_proveedor ||
                          `Proveedor ${proveedor.id}`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-bold text-slate-700">
                  Categoría
                  <select
                    value={formulario.categoria_id}
                    onChange={(event) =>
                      cambiarCampo(
                        "categoria_id",
                        event.target.value
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="">
                      Seleccione
                    </option>
                    {categorias.map((categoria) => (
                      <option
                        key={categoria.id}
                        value={categoria.id}
                      >
                        {categoria.nombre_categoria ||
                          `Categoría ${categoria.id}`}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="md:col-span-2">
                  <Campo
                    label="Concepto"
                    value={formulario.concepto}
                    onChange={(valor) =>
                      cambiarCampo("concepto", valor)
                    }
                  />
                </div>

                <Campo
                  label="Monto"
                  type="number"
                  step="0.01"
                  value={formulario.monto}
                  onChange={(valor) =>
                    cambiarCampo("monto", valor)
                  }
                />

                <Campo
                  label="ITBIS"
                  type="number"
                  step="0.01"
                  value={formulario.itbis}
                  onChange={(valor) =>
                    cambiarCampo("itbis", valor)
                  }
                />

                <div className="md:col-span-4">
                  <label className="text-sm font-bold text-slate-700">
                    Detalle
                    <textarea
                      value={formulario.detalle_gasto}
                      onChange={(event) =>
                        cambiarCampo(
                          "detalle_gasto",
                          event.target.value
                        )
                      }
                      rows={4}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                    />
                  </label>
                </div>

                <Campo
                  label="No. factura"
                  value={formulario.no_factura}
                  onChange={(valor) =>
                    cambiarCampo("no_factura", valor)
                  }
                />

                <Campo
                  label="NCF"
                  value={formulario.ncf}
                  onChange={(valor) =>
                    cambiarCampo("ncf", valor)
                  }
                />

                <label className="text-sm font-bold text-slate-700">
                  Método de pago
                  <select
                    value={formulario.metodo_pago}
                    onChange={(event) =>
                      cambiarCampo(
                        "metodo_pago",
                        event.target.value
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="Cheque">
                      Cheque
                    </option>
                    <option value="Transferencia">
                      Transferencia
                    </option>
                    <option value="Efectivo">
                      Efectivo
                    </option>
                    <option value="Depósito">
                      Depósito
                    </option>
                    <option value="Cargo bancario">
                      Cargo bancario
                    </option>
                  </select>
                </label>

                <Campo
                  label="No. cheque / documento"
                  value={formulario.numero_cheque}
                  onChange={(valor) =>
                    cambiarCampo(
                      "numero_cheque",
                      valor
                    )
                  }
                />

                <div className="md:col-span-2">
                  <Campo
                    label="Cuenta / banco"
                    value={formulario.cuenta_banco}
                    onChange={(valor) =>
                      cambiarCampo(
                        "cuenta_banco",
                        valor
                      )
                    }
                  />
                </div>

                <div className="rounded-xl bg-slate-900 p-4 text-white md:col-span-2">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-300">
                    Total calculado
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {dinero(totalFormulario)}
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <label className="text-sm font-black text-amber-950">
                  Motivo de la corrección
                  <textarea
                    value={formulario.motivo}
                    onChange={(event) =>
                      cambiarCampo(
                        "motivo",
                        event.target.value
                      )
                    }
                    rows={3}
                    placeholder="Explique por qué se modifica, reemplaza o elimina este gasto."
                    className="mt-1 w-full rounded-xl border border-amber-300 bg-white px-3 py-2"
                  />
                </label>
                <p className="mt-2 text-xs text-amber-800">
                  Este motivo quedará guardado en el historial de auditoría.
                </p>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <ArchivoCard
                  titulo="Factura / soporte"
                  descripcion="Actualiza la factura del gasto y el soporte de la solicitud relacionada."
                  url={formulario.factura_url}
                  subiendo={subiendo}
                  onFile={(archivo) =>
                    void reemplazarArchivo(archivo, "FACTURA")
                  }
                />

                <ArchivoCard
                  titulo="Cheque / comprobante"
                  descripcion="Permite agregar o reemplazar el cheque o comprobante del pago histórico."
                  url={formulario.cheque_url}
                  subiendo={subiendo}
                  onFile={(archivo) =>
                    void reemplazarArchivo(archivo, "CHEQUE")
                  }
                />
              </section>

              <section className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => void eliminarGasto()}
                  disabled={
                    eliminando || guardando || subiendo
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 font-black text-white hover:bg-red-800 disabled:opacity-60"
                >
                  {eliminando ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Trash2 className="h-5 w-5" />
                  )}
                  Borrar gasto
                </button>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={cerrarEdicion}
                    disabled={
                      eliminando || guardando || subiendo
                    }
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-700 disabled:opacity-60"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={() => void guardarCambios()}
                    disabled={
                      guardando || eliminando || subiendo
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-black text-white hover:bg-emerald-800 disabled:opacity-60"
                  >
                    {guardando ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Save className="h-5 w-5" />
                    )}
                    Guardar cambios
                  </button>
                </div>
              </section>

              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                  Este módulo no crea movimientos bancarios.
                  Si el gasto obtiene un movimiento activo,
                  dejará de aparecer aquí y quedará bloqueado
                  para edición o eliminación.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ArchivoCard({
  titulo,
  descripcion,
  url,
  subiendo,
  onFile,
}: {
  titulo: string;
  descripcion: string;
  url: string;
  subiendo: boolean;
  onFile: (archivo: File) => void;
}) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <h3 className="font-black text-blue-950">
        {titulo}
      </h3>
      <p className="mt-1 text-sm text-blue-800">
        {descripcion}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white"
          >
            <FileText className="h-4 w-4" />
            Ver archivo actual
          </a>
        )}

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-800 px-4 py-2 text-sm font-black text-white hover:bg-blue-900">
          {subiendo ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {url ? "Reemplazar archivo" : "Adjuntar archivo"}
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            disabled={subiendo}
            className="hidden"
            onChange={(event) => {
              const archivo = event.target.files?.[0];
              if (archivo) onFile(archivo);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
}) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input
        type={type}
        step={step}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
      />
    </label>
  );
}

function Resumen({
  titulo,
  valor,
  subtitulo,
}: {
  titulo: string;
  valor: string;
  subtitulo: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {titulo}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-950">
        {valor}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {subtitulo}
      </p>
    </div>
  );
}

function Aviso({
  tipo,
  texto,
}: {
  tipo: "ok" | "error";
  texto: string;
}) {
  const ok = tipo === "ok";

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
      ) : (
        <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
      )}
      <p>{texto}</p>
    </div>
  );
}
