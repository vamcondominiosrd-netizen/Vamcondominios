"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileImage,
  FileText,
  Landmark,
  Loader2,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  condominio_logo_url?: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
};

type Gasto = {
  id: number;
  condominio_id: number | null;
  fecha: string | null;
  categoria: string | null;
  descripcion: string | null;
  proveedor: string | null;
  monto: number | string | null;
  concepto: string | null;
  detalle_gasto: string | null;
  itbis: number | string | null;
  total: number | string | null;
  no_factura: string | null;
  ncf: string | null;
  metodo_pago: string | null;
  cuenta_banco: string | null;
  tiene_factura?: boolean;
  estado: string | null;
  tiene_cheque?: boolean;
  numero_cheque: string | null;
  fecha_pago: string | null;
  pagado: boolean | null;
  periodo?: string | null;
};

type RespuestaDetalleGasto = {
  ok?: boolean;
  codigo?: string;
  mensaje?: string;
  propietario?: PropietarioActual | null;
  gasto?: Gasto | null;
};

const RPC_DETALLE_GASTO = "vam_propietario_detalle_gasto";
const API_SOPORTES_GASTO = "/api/propietarios/soportes-gastos";
const MODULO_VERSION = "2.0";

function normalizarRespuesta(data: unknown): RespuestaDetalleGasto {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as RespuestaDetalleGasto;
  }

  if (
    Array.isArray(data) &&
    data.length > 0 &&
    data[0] &&
    typeof data[0] === "object"
  ) {
    return data[0] as RespuestaDetalleGasto;
  }

  return {};
}

const money = (v: unknown) =>
  new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(v || 0));

const fmt = (v?: string | null) => {
  if (!v) return "-";
  const [y, m, d] = String(v).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : String(v);
};

const RUTA_RESUMEN =
  "/movil/propietarios/resumen-financiero";

export default function DetalleGastoPropietarioPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [propietario, setPropietario] =
    useState<PropietarioActual | null>(null);
  const [gasto, setGasto] = useState<Gasto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void cargar();
  }, [params?.id]);

  function limpiarSesionPropietario() {
    localStorage.removeItem("propietario_actual");
    localStorage.removeItem("propietario_token");
    localStorage.removeItem("propietario_token_expira");
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
  }

  function codigoSesionInvalida(codigo?: string) {
    return [
      "SESION_INVALIDA",
      "SESION_VENCIDA",
      "CUENTA_INACTIVA",
      "CAMBIO_CLAVE_PENDIENTE",
      "SIN_ACCESO",
    ].includes(String(codigo || ""));
  }

  function enviarALogin(mensaje?: string) {
    if (mensaje) setError(mensaje);

    limpiarSesionPropietario();

    window.setTimeout(() => {
      router.replace("/movil/propietarios/login");
    }, mensaje ? 700 : 0);
  }

  async function cargar() {
    setLoading(true);
    setError("");
    setGasto(null);

    try {
      const raw = localStorage.getItem("propietario_actual");
      const token = String(
        localStorage.getItem("propietario_token") || ""
      ).trim();

      if (!raw || !token) {
        enviarALogin();
        return;
      }

      const contexto = JSON.parse(raw) as PropietarioActual;

      if (
        !contexto?.propietario_id ||
        !contexto?.condominio_id ||
        !contexto?.unidad_id
      ) {
        enviarALogin();
        return;
      }

      const id = Number(params?.id);

      if (!Number.isFinite(id) || id <= 0) {
        setPropietario(contexto);
        setError("El gasto indicado no es válido.");
        return;
      }

      const { data, error: rpcError } = await supabase.rpc(
        RPC_DETALLE_GASTO,
        {
          p_token: token,
          p_condominio_id: Number(contexto.condominio_id),
          p_unidad_id: Number(contexto.unidad_id),
          p_gasto_id: id,
        }
      );

      if (rpcError) {
        console.error("Error cargando detalle del gasto:", rpcError);
        setPropietario(contexto);
        setError("No se pudo cargar el gasto en este momento.");
        return;
      }

      const respuesta = normalizarRespuesta(data);

      if (
        respuesta.ok !== true ||
        !respuesta.propietario ||
        !respuesta.gasto
      ) {
        if (codigoSesionInvalida(respuesta.codigo)) {
          enviarALogin(
            respuesta.mensaje ||
              "La sesión ha vencido. Inicie sesión nuevamente."
          );
          return;
        }

        setPropietario(contexto);
        setError(
          respuesta.mensaje ||
            "No se encontró el gasto o no está disponible para propietarios."
        );
        return;
      }

      setPropietario(respuesta.propietario);
      setGasto(respuesta.gasto);

      localStorage.setItem(
        "propietario_actual",
        JSON.stringify(respuesta.propietario)
      );
    } catch (e: any) {
      console.error("Error inesperado cargando gasto:", e);
      setError(e?.message || "No se pudo cargar el gasto.");
    } finally {
      setLoading(false);
    }
  }

  async function abrirSoporte(tipo: "factura" | "cheque") {
    if (!propietario || !gasto?.id) return;

    const token = String(
      localStorage.getItem("propietario_token") || ""
    ).trim();

    if (!token) {
      enviarALogin("La sesión ha vencido. Inicie sesión nuevamente.");
      return;
    }

    setError("");

    const ventana = window.open("", "_blank");

    try {
      const paramsSoporte = new URLSearchParams({
        gasto_id: String(gasto.id),
        condominio_id: String(propietario.condominio_id),
        unidad_id: String(propietario.unidad_id),
        tipo,
      });

      const response = await fetch(
        `${API_SOPORTES_GASTO}?${paramsSoporte.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const resultado = await response.json().catch(() => ({}));

      if (
        response.status === 401 ||
        codigoSesionInvalida(resultado?.codigo)
      ) {
        if (ventana) ventana.close();

        enviarALogin(
          resultado?.mensaje ||
            "La sesión ha vencido. Inicie sesión nuevamente."
        );
        return;
      }

      if (!response.ok || resultado?.ok !== true || !resultado?.url) {
        if (ventana) ventana.close();

        setError(
          resultado?.mensaje ||
            "El documento no está disponible."
        );
        return;
      }

      if (ventana) {
        ventana.opener = null;
        ventana.location.href = resultado.url;
      } else {
        window.location.href = resultado.url;
      }
    } catch (e) {
      if (ventana) ventana.close();

      console.error("Error abriendo soporte del gasto:", e);
      setError("No se pudo abrir el documento en este momento.");
    }
  }

  if (loading) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-600">
            <Loader2 size={20} className="animate-spin text-blue-700" />
            Cargando gasto...
          </div>
        </div>
      </main>
    );
  }

  if (!propietario) return null;

  if (error || !gasto) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={() => router.push(RUTA_RESUMEN)}
            className="mb-4 flex items-center gap-2 text-sm font-bold text-blue-800"
          >
            <ArrowLeft size={18} />
            Volver al resumen
          </button>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error || "No se encontró el gasto."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-100 pb-8">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-7 pt-4 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push(RUTA_RESUMEN)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"
              aria-label="Volver al resumen"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="text-[11px] uppercase tracking-[0.16em] text-blue-200">
                Transparencia financiera
              </p>
              <h1 className="truncate text-base font-black">
                Detalle del gasto
              </h1>
            </div>

            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10">
              <ShieldCheck size={18} />
            </span>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3">
            {propietario.condominio_logo_url ? (
              <img
                src={propietario.condominio_logo_url}
                alt={propietario.condominio_nombre}
                className="h-11 w-11 rounded-xl bg-white object-contain p-1.5"
              />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xs font-black text-blue-900">
                VAM
              </span>
            )}

            <div>
              <p className="text-sm font-extrabold">
                {propietario.condominio_nombre}
              </p>
              <p className="text-[11px] text-blue-100">
                Unidad {propietario.no_apartamento}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        <section className="rounded-[1.4rem] border bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">
            {gasto.categoria || "Gasto"}
          </p>

          <h2 className="mt-1 text-base font-black text-slate-900">
            {gasto.concepto ||
              gasto.descripcion ||
              gasto.detalle_gasto ||
              "Gasto operativo"}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {gasto.proveedor || "Proveedor no indicado"}
          </p>

          <div className="mt-4 rounded-2xl bg-gradient-to-br from-blue-800 to-blue-950 p-4 text-white">
            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-200">
              Total pagado
            </p>
            <p className="mt-1 text-2xl font-black">
              {money(gasto.total || gasto.monto)}
            </p>
          </div>
        </section>

        <section className="rounded-[1.4rem] border bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">
            Información del gasto
          </h3>

          <div className="mt-3 divide-y divide-slate-100">
            <Fila
              icono={<CalendarDays size={15} />}
              etiqueta="Fecha"
              valor={fmt(gasto.fecha_pago || gasto.fecha)}
            />
            <Fila
              icono={<ReceiptText size={15} />}
              etiqueta="Factura"
              valor={gasto.no_factura || "-"}
            />
            <Fila
              icono={<FileText size={15} />}
              etiqueta="NCF"
              valor={gasto.ncf || "-"}
            />
            <Fila
              icono={<WalletCards size={15} />}
              etiqueta="Método de pago"
              valor={gasto.metodo_pago || "-"}
            />
            <Fila
              icono={<Landmark size={15} />}
              etiqueta="Cuenta"
              valor={gasto.cuenta_banco || "-"}
            />
            <Fila
              icono={<FileText size={15} />}
              etiqueta="Cheque"
              valor={gasto.numero_cheque || "-"}
            />
            <Fila
              icono={<CheckCircle2 size={15} />}
              etiqueta="Estado"
              valor={
                gasto.pagado ? "Pagado" : gasto.estado || "Registrado"
              }
            />
          </div>
        </section>

        {(gasto.descripcion || gasto.detalle_gasto) && (
          <section className="rounded-[1.4rem] border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-black">Descripción</h3>
            <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">
              {gasto.detalle_gasto || gasto.descripcion}
            </p>
          </section>
        )}

        <section className="rounded-[1.4rem] border bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black">Documentos anexos</h3>
          <p className="mt-1 text-[10px] text-slate-500">
            Soportes cargados desde el módulo de gastos
          </p>

          <div className="mt-4 space-y-2">
            {gasto.tiene_factura && (
              <button
                type="button"
                onClick={() => abrirSoporte("factura")}
                className="flex h-11 w-full items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-extrabold text-blue-800"
              >
                <span className="flex items-center gap-2">
                  <FileImage size={16} />
                  Ver factura
                </span>
                <ExternalLink size={14} />
              </button>
            )}

            {gasto.tiene_cheque && (
              <button
                type="button"
                onClick={() => abrirSoporte("cheque")}
                className="flex h-11 w-full items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-extrabold text-emerald-800"
              >
                <span className="flex items-center gap-2">
                  <FileText size={16} />
                  Ver cheque o comprobante
                </span>
                <ExternalLink size={14} />
              </button>
            )}

            {!gasto.tiene_factura && !gasto.tiene_cheque && (
              <div className="rounded-xl bg-slate-100 px-3 py-4 text-center text-xs text-slate-500">
                Este gasto no tiene documentos anexos disponibles.
              </div>
            )}
          </div>
        </section>

        <footer className="pb-1 pt-1 text-center">
          <p className="text-[10px] text-slate-400">
            VAM Administración de Condominios · Detalle Gasto Propietario V{MODULO_VERSION}
          </p>
        </footer>
      </div>
    </main>
  );
}

function Fila({
  icono,
  etiqueta,
  valor,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        {icono}
      </span>

      <div>
        <p className="text-[10px] text-slate-400">{etiqueta}</p>
        <p className="text-xs font-extrabold text-slate-800">{valor}</p>
      </div>
    </div>
  );
}
