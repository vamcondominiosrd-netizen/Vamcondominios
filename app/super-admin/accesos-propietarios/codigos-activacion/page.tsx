"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  Clock3,
  Home,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type Condominio = {
  id: number;
  nombre: string;
  logo_url?: string | null;
};

type Unidad = {
  id: number;
  codigo: string;
};

type CodigoActivacion = {
  id: number;
  unidad_id: number;
  no_apartamento: string;
  propietario_id: number;
  nombre_propietario: string;
  vence_at: string;
  usado_at: string | null;
  revocado_at: string | null;
  intentos_fallidos: number;
  estado: "VIGENTE" | "USADO" | "REVOCADO" | "VENCIDO" | "BLOQUEADO";
  created_at: string;
};

type RespuestaGeneracion = {
  ok?: boolean;
  mensaje?: string;
  codigo?: string;
  vence_at?: string;
  condominio_id?: number;
  unidad_id?: number;
  no_apartamento?: string;
  nombre_propietario?: string;
};

type RespuestaAccion = {
  ok?: boolean;
  mensaje?: string;
};

function extraerRespuesta<T extends object>(valor: unknown): T {
  if (Array.isArray(valor)) return (valor[0] || {}) as T;
  if (valor && typeof valor === "object") return valor as T;
  return {} as T;
}

function formatearFecha(fecha?: string | null) {
  if (!fecha) return "—";

  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fecha));
}

function claseEstado(estado: CodigoActivacion["estado"]) {
  switch (estado) {
    case "VIGENTE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "USADO":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "VENCIDO":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "BLOQUEADO":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

export default function SuperAdminCodigosActivacionPropietariosPage() {
  const router = useRouter();

  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [codigos, setCodigos] = useState<CodigoActivacion[]>([]);

  const [condominioId, setCondominioId] = useState("");
  const [unidadId, setUnidadId] = useState("");
  const [vigenciaDias, setVigenciaDias] = useState("15");

  const [codigoGenerado, setCodigoGenerado] =
    useState<RespuestaGeneracion | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [superNombre, setSuperNombre] = useState("");

  useEffect(() => {
    void validarAccesoYCargar();
  }, []);

  const condominioSeleccionado = useMemo(
    () =>
      condominios.find((item) => String(item.id) === condominioId) || null,
    [condominios, condominioId]
  );

  async function validarAccesoYCargar() {
    setCargandoDatos(true);
    setError("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.replace("/super-login");
      return;
    }

    const { data: superData, error: superError } = await supabase
      .from("super_admins")
      .select("id, nombre, activo")
      .eq("user_id", userData.user.id)
      .eq("activo", true)
      .maybeSingle();

    if (superError || !superData) {
      await supabase.auth.signOut();
      router.replace("/super-login");
      return;
    }

    setSuperNombre(superData.nombre || "Full Administrador");
    await cargarCondominios();
  }

  async function cargarCondominios() {
    setCargandoDatos(true);
    setError("");

    const { data, error: consultaError } = await supabase.rpc(
      "listar_condominios_portal"
    );

    setCargandoDatos(false);

    if (consultaError) {
      setError(consultaError.message);
      return;
    }

    setCondominios((data || []) as Condominio[]);
  }

  async function seleccionarCondominio(id: string) {
    setCondominioId(id);
    setUnidadId("");
    setUnidades([]);
    setCodigos([]);
    setCodigoGenerado(null);
    setMensaje("");
    setError("");

    if (!id) return;

    setCargandoDatos(true);

    const [unidadesResultado, codigosResultado] = await Promise.all([
      supabase.rpc("listar_unidades_activacion", {
        p_condominio_id: Number(id),
      }),
      supabase.rpc("listar_codigos_activacion_propietarios", {
        p_condominio_id: Number(id),
      }),
    ]);

    setCargandoDatos(false);

    if (unidadesResultado.error) {
      setError(unidadesResultado.error.message);
      return;
    }

    if (codigosResultado.error) {
      setError(codigosResultado.error.message);
      return;
    }

    setUnidades((unidadesResultado.data || []) as Unidad[]);
    setCodigos((codigosResultado.data || []) as CodigoActivacion[]);
  }

  async function recargarCodigos() {
    if (!condominioId) return;

    const { data, error: consultaError } = await supabase.rpc(
      "listar_codigos_activacion_propietarios",
      { p_condominio_id: Number(condominioId) }
    );

    if (consultaError) {
      setError(consultaError.message);
      return;
    }

    setCodigos((data || []) as CodigoActivacion[]);
  }

  async function generarCodigo() {
    setMensaje("");
    setError("");
    setCodigoGenerado(null);
    setCopiado(false);

    if (!condominioId || !unidadId) {
      setError("Seleccione el condominio y la unidad.");
      return;
    }

    const dias = Number(vigenciaDias);

    if (!Number.isInteger(dias) || dias < 1 || dias > 90) {
      setError("La vigencia debe estar entre 1 y 90 días.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: generacionError } = await supabase.rpc(
        "generar_codigo_activacion_propietario",
        {
          p_condominio_id: Number(condominioId),
          p_unidad_id: Number(unidadId),
          p_vigencia_dias: dias,
        }
      );

      if (generacionError) {
        setError(generacionError.message);
        return;
      }

      const respuesta = extraerRespuesta<RespuestaGeneracion>(data);

      if (!respuesta.ok || !respuesta.codigo) {
        setError(respuesta.mensaje || "No fue posible generar el código.");
        return;
      }

      setCodigoGenerado(respuesta);
      setMensaje("Código generado correctamente. Compártalo solo con el propietario.");
      await recargarCodigos();
    } finally {
      setLoading(false);
    }
  }

  async function copiarCodigo() {
    if (!codigoGenerado?.codigo) return;

    await navigator.clipboard.writeText(codigoGenerado.codigo);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  }

  async function revocarCodigo(codigo: CodigoActivacion) {
    const confirmado = window.confirm(
      `¿Desea revocar el código de la unidad ${codigo.no_apartamento}?`
    );

    if (!confirmado) return;

    setLoading(true);
    setMensaje("");
    setError("");

    try {
      const { data, error: revocacionError } = await supabase.rpc(
        "revocar_codigo_activacion_propietario",
        { p_codigo_id: codigo.id }
      );

      if (revocacionError) {
        setError(revocacionError.message);
        return;
      }

      const respuesta = extraerRespuesta<RespuestaAccion>(data);

      if (!respuesta.ok) {
        setError(respuesta.mensaje || "No fue posible revocar el código.");
        return;
      }

      setMensaje(respuesta.mensaje || "Código revocado correctamente.");
      await recargarCodigos();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-slate-100 px-3 py-4 sm:px-5">
      <div className="mx-auto w-full max-w-3xl">
        <header className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              {condominioSeleccionado?.logo_url ? (
                <img
                  src={condominioSeleccionado.logo_url}
                  alt={condominioSeleccionado.nombre}
                  className="h-12 w-12 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-1.5"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  <KeyRound className="h-6 w-6" />
                </div>
              )}

              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                  Centro de Administración VAM
                </p>
                <h1 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">
                  Códigos de activación
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Acceso inicial y seguro de propietarios.
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Administrador: {superNombre || "Full Administrador"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push("/super-admin")}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800"
              >
                <Home className="h-4 w-4" />
                Menú principal
              </button>

              <button
                type="button"
                onClick={() => router.push("/super-admin/accesos-propietarios")}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-200 px-4 text-sm font-black text-slate-800 transition hover:bg-slate-300"
              >
                <ArrowLeft className="h-4 w-4" />
                Accesos propietarios
              </button>

              <span className="inline-flex h-11 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-800">
                <ShieldCheck className="h-4 w-4" />
                Full Administrador
              </span>
            </div>
          </div>
        </header>

        <section className="mt-4 rounded-[1.5rem] bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900">
                Generar código para una unidad
              </h1>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Cada código es de un solo uso. Al generar uno nuevo, el código
                anterior de esa unidad queda revocado.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Condominio
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={condominioId}
                  onChange={(event) =>
                    void seleccionarCondominio(event.target.value)
                  }
                  disabled={cargandoDatos || loading}
                  className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  <option value="">Seleccione</option>
                  {condominios.map((condominio) => (
                    <option key={condominio.id} value={condominio.id}>
                      {condominio.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Apartamento / Unidad
              </label>
              <select
                value={unidadId}
                onChange={(event) => setUnidadId(event.target.value)}
                disabled={!condominioId || cargandoDatos || loading}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              >
                <option value="">Seleccione</option>
                {unidades.map((unidad) => (
                  <option key={unidad.id} value={unidad.id}>
                    {unidad.codigo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Vigencia en días
              </label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={vigenciaDias}
                  onChange={(event) => setVigenciaDias(event.target.value)}
                  disabled={loading}
                  className="h-12 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">
              {error}
            </div>
          )}

          {mensaje && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-700">
              {mensaje}
            </div>
          )}

          <button
            type="button"
            onClick={() => void generarCodigo()}
            disabled={loading || cargandoDatos}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 text-sm font-black text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {loading ? "Procesando..." : "Generar código de activación"}
          </button>
        </section>

        {codigoGenerado?.codigo && (
          <section className="mt-4 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-emerald-900">
                  Código listo para entregar
                </p>
                <p className="mt-1 text-xs text-emerald-700">
                  {codigoGenerado.nombre_propietario} · Unidad {" "}
                  {codigoGenerado.no_apartamento}
                </p>

                <div className="mt-4 flex items-center gap-2">
                  <div className="min-w-0 flex-1 rounded-xl border border-emerald-300 bg-white px-4 py-3 text-center font-mono text-2xl font-black tracking-[0.18em] text-slate-900">
                    {codigoGenerado.codigo}
                  </div>
                  <button
                    type="button"
                    onClick={() => void copiarCodigo()}
                    className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white transition hover:bg-emerald-800"
                    aria-label="Copiar código"
                  >
                    {copiado ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Clipboard className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <p className="mt-3 flex items-center gap-2 text-[11px] text-emerald-700">
                  <Clock3 className="h-4 w-4" />
                  Vence: {formatearFecha(codigoGenerado.vence_at)}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="mt-4 overflow-hidden rounded-[1.5rem] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Historial de códigos
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                No se muestra el código después de generado.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void recargarCodigos()}
              disabled={!condominioId || loading}
              className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
              aria-label="Recargar"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3 p-4 sm:p-6">
            {!condominioId ? (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Seleccione un condominio para consultar sus códigos.
              </div>
            ) : cargandoDatos ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando información...
              </div>
            ) : codigos.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No hay códigos generados para este condominio.
              </div>
            ) : (
              codigos.map((codigo) => (
                <article
                  key={codigo.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <UserRound className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-900">
                            Unidad {codigo.no_apartamento}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {codigo.nombre_propietario}
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${claseEstado(
                            codigo.estado
                          )}`}
                        >
                          {codigo.estado}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-1 text-[11px] text-slate-500 sm:grid-cols-2">
                        <span>Generado: {formatearFecha(codigo.created_at)}</span>
                        <span>Vence: {formatearFecha(codigo.vence_at)}</span>
                        <span>Intentos fallidos: {codigo.intentos_fallidos}</span>
                        {codigo.usado_at && (
                          <span>Usado: {formatearFecha(codigo.usado_at)}</span>
                        )}
                      </div>

                      {codigo.estado === "VIGENTE" && (
                        <button
                          type="button"
                          onClick={() => void revocarCodigo(codigo)}
                          disabled={loading}
                          className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-black text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <Ban className="h-4 w-4" />
                          Revocar código
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
