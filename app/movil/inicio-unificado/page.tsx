"use client";

import {
  Building2,
  ChevronRight,
  FileText,
  Landmark,
  Loader2,
  LogOut,
  ReceiptText,
  ShieldCheck,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type Propiedad = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  condominio_logo_url?: string | null;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario?: string | null;
  telefono?: string | null;
  correo?: string | null;
};

type Directiva = {
  directiva_id: number;
  condominio_id: number;
  condominio_nombre: string;
  condominio_logo_url?: string | null;
  nombre?: string | null;
  cargo?: string | null;
  empresa_id?: number | null;
};

type ContextoUsuario = {
  ok?: boolean;
  mensaje?: string;
  user_id?: string;
  email?: string;
  nombre?: string;
  puede_propietario?: boolean;
  puede_directiva?: boolean;
  propiedades?: Propiedad[];
  directivas?: Directiva[];
};

type SesionCompatPropietario = {
  ok?: boolean;
  codigo?: string;
  mensaje?: string;
  token?: string;
  expira_en?: string;
  propietario?: Propiedad;
};

function normalizarRespuesta<T extends object>(valor: unknown): T {
  if (Array.isArray(valor)) return (valor[0] || {}) as T;
  if (valor && typeof valor === "object") return valor as T;
  return {} as T;
}

function limpiarLocales() {
  const claves = [
    "vam_contexto_usuario",
    "propietario_actual",
    "propietario_token",
    "propietario_token_expira",
    "directiva_actual",
    "usuario_actual",
    "sesion_usuario",
    "usuario",
    "usuario_nombre",
    "usuario_rol",
    "usuario_admin_id",
    "condominio_id",
    "condominio_nombre",
    "condominio_logo_url",
  ];

  claves.forEach((clave) => localStorage.removeItem(clave));
}

export default function InicioUnificadoVAMPage() {
  const router = useRouter();

  const [contexto, setContexto] = useState<ContextoUsuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [abriendo, setAbriendo] = useState("");
  const [error, setError] = useState("");

  const cargarContexto = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/movil/acceso-unificado");
        return;
      }

      const { data, error: rpcError } = await supabase.rpc(
        "vam_preparar_contexto_usuario_unificado"
      );

      if (rpcError) throw rpcError;

      const respuesta = normalizarRespuesta<ContextoUsuario>(data);

      if (respuesta.ok !== true) {
        throw new Error(
          respuesta.mensaje || "No fue posible cargar sus accesos."
        );
      }

      setContexto(respuesta);
      localStorage.setItem(
        "vam_contexto_usuario",
        JSON.stringify(respuesta)
      );
    } catch (e) {
      console.error("Inicio unificado:", e);
      setError(
        e instanceof Error
          ? e.message
          : "No fue posible cargar sus módulos."
      );
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    void cargarContexto();
  }, [cargarContexto]);

  const propiedades = useMemo(
    () => (Array.isArray(contexto?.propiedades) ? contexto!.propiedades! : []),
    [contexto]
  );

  const directivas = useMemo(
    () => (Array.isArray(contexto?.directivas) ? contexto!.directivas! : []),
    [contexto]
  );

  async function abrirPropiedad(propiedad: Propiedad) {
    const clave = `p-${propiedad.condominio_id}-${propiedad.unidad_id}`;
    setAbriendo(clave);
    setError("");

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "vam_propietario_crear_sesion_compat",
        {
          p_condominio_id: Number(propiedad.condominio_id),
          p_unidad_id: Number(propiedad.unidad_id),
        }
      );

      if (rpcError) throw rpcError;

      const respuesta =
        normalizarRespuesta<SesionCompatPropietario>(data);

      if (
        respuesta.ok !== true ||
        !respuesta.token ||
        !respuesta.propietario
      ) {
        throw new Error(
          respuesta.mensaje ||
            "Esta propiedad todavía requiere completar la migración de acceso."
        );
      }

      const prop = respuesta.propietario;

      localStorage.removeItem("directiva_actual");
      localStorage.setItem(
        "propietario_actual",
        JSON.stringify({
          tipo_usuario: "PROPIETARIO",
          propietario_id: Number(prop.propietario_id),
          condominio_id: Number(prop.condominio_id),
          condominio_nombre: prop.condominio_nombre,
          condominio_logo_url: prop.condominio_logo_url || "",
          unidad_id: Number(prop.unidad_id),
          no_apartamento: prop.no_apartamento,
          nombre_propietario: prop.nombre_propietario || "",
          telefono: prop.telefono || "",
          correo: prop.correo || contexto?.email || "",
        })
      );

      localStorage.setItem("propietario_token", respuesta.token);

      if (respuesta.expira_en) {
        localStorage.setItem(
          "propietario_token_expira",
          respuesta.expira_en
        );
      }

      localStorage.setItem(
        "condominio_id",
        String(prop.condominio_id)
      );
      localStorage.setItem(
        "condominio_nombre",
        prop.condominio_nombre || "Condominio"
      );
      localStorage.setItem(
        "condominio_logo_url",
        prop.condominio_logo_url || ""
      );

      router.push("/movil/propietarios/dashboard");
    } catch (e) {
      console.error("Abrir propiedad:", e);
      setError(
        e instanceof Error
          ? e.message
          : "No fue posible abrir el módulo de Propietario."
      );
    } finally {
      setAbriendo("");
    }
  }

  async function abrirDirectiva(directiva: Directiva) {
    const clave = `d-${directiva.directiva_id}-${directiva.condominio_id}`;
    setAbriendo(clave);
    setError("");

    try {
      const { data, error: accesoError } = await supabase.rpc(
        "vam_validar_acceso_directiva_unificado",
        {
          p_condominio_id: Number(directiva.condominio_id),
        }
      );

      if (accesoError) throw accesoError;

      const acceso = normalizarRespuesta<{
        ok?: boolean;
        mensaje?: string;
        rol?: string;
        empresa_id?: number;
      }>(data);

      if (acceso.ok !== true) {
        throw new Error(
          acceso.mensaje ||
            "No tiene autorización para abrir este módulo de Directiva."
        );
      }

      const sesionDirectiva = {
        tipo_usuario: "DIRECTIVA",
        usuario_nombre:
          directiva.nombre || contexto?.nombre || "Miembro de la directiva",
        rol: acceso.rol || directiva.cargo || "Directiva",
        condominio_id: Number(directiva.condominio_id),
        condominio_nombre: directiva.condominio_nombre,
        condominio_logo_url: directiva.condominio_logo_url || "",
        empresa_id: acceso.empresa_id || directiva.empresa_id || null,
      };

      localStorage.removeItem("propietario_actual");
      localStorage.removeItem("propietario_token");
      localStorage.removeItem("propietario_token_expira");

      localStorage.setItem(
        "directiva_actual",
        JSON.stringify(sesionDirectiva)
      );
      localStorage.setItem(
        "condominio_id",
        String(sesionDirectiva.condominio_id)
      );
      localStorage.setItem(
        "condominio_nombre",
        sesionDirectiva.condominio_nombre
      );
      localStorage.setItem(
        "condominio_logo_url",
        sesionDirectiva.condominio_logo_url
      );
      localStorage.setItem(
        "usuario_nombre",
        sesionDirectiva.usuario_nombre
      );
      localStorage.setItem(
        "usuario_rol",
        sesionDirectiva.rol
      );

      router.push("/movil/directiva");
    } catch (e) {
      console.error("Abrir Directiva:", e);
      setError(
        e instanceof Error
          ? e.message
          : "No fue posible abrir el módulo de Directiva."
      );
    } finally {
      setAbriendo("");
    }
  }

  async function salir() {
    setAbriendo("salir");
    try {
      await supabase.auth.signOut();
    } finally {
      limpiarLocales();
      router.replace("/movil/acceso-unificado");
    }
  }

  if (cargando) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            <Loader2 className="animate-spin text-blue-700" size={20} />
            Preparando sus módulos...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-100 pb-10">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-20 pt-5 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white font-black text-blue-950 shadow-lg">
                VAM
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
                Mi cuenta VAM
              </p>
              <h1 className="mt-1 truncate text-xl font-black">
                {contexto?.nombre || "Bienvenido"}
              </h1>
              <p className="mt-1 truncate text-xs text-blue-100">
                {contexto?.email}
              </p>
            </div>

            <button
              type="button"
              onClick={salir}
              disabled={abriendo === "salir"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 transition hover:bg-white/20 disabled:opacity-60"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              {abriendo === "salir" ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <LogOut size={18} />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="-mt-14 mx-auto max-w-lg space-y-5 px-4">
        <section className="rounded-[1.7rem] border border-white/70 bg-white p-5 shadow-xl shadow-slate-900/10">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ShieldCheck size={23} />
            </span>
            <div>
              <h2 className="font-black text-slate-900">
                Acceso personalizado
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                VAM muestra solamente las propiedades y funciones de Directiva
                vinculadas a esta cuenta de Supabase.
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {error}
          </div>
        )}

        {propiedades.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3 px-1">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">
                  Propietario
                </p>
                <h2 className="text-lg font-black text-slate-900">
                  Mi propiedad
                </h2>
              </div>
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black text-blue-800">
                {propiedades.length}
              </span>
            </div>

            {propiedades.map((propiedad) => {
              const clave = `p-${propiedad.condominio_id}-${propiedad.unidad_id}`;
              const estaAbriendo = abriendo === clave;

              return (
                <button
                  key={clave}
                  type="button"
                  onClick={() => abrirPropiedad(propiedad)}
                  disabled={Boolean(abriendo)}
                  className="w-full rounded-[1.5rem] border border-blue-100 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md disabled:opacity-60"
                >
                  <div className="flex items-center gap-4">
                    {propiedad.condominio_logo_url ? (
                      <img
                        src={propiedad.condominio_logo_url}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-2xl border border-slate-100 bg-white object-contain p-1.5"
                      />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
                        <Building2 size={23} />
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-black text-slate-900">
                        {propiedad.condominio_nombre}
                      </h3>
                      <p className="mt-0.5 text-xs font-bold text-blue-800">
                        Unidad {propiedad.no_apartamento}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <MiniBadge icon={FileText} texto="Estado de cuenta" />
                        <MiniBadge icon={ReceiptText} texto="Pagos" />
                        <MiniBadge icon={WalletCards} texto="Servicios" />
                      </div>
                    </div>

                    {estaAbriendo ? (
                      <Loader2
                        className="shrink-0 animate-spin text-blue-700"
                        size={20}
                      />
                    ) : (
                      <ChevronRight
                        className="shrink-0 text-slate-400"
                        size={21}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </section>
        )}

        {directivas.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3 px-1">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
                  Gobierno del condominio
                </p>
                <h2 className="text-lg font-black text-slate-900">
                  Directiva
                </h2>
              </div>
              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-black text-slate-700">
                {directivas.length}
              </span>
            </div>

            {directivas.map((directiva) => (
              <button
                key={`${directiva.directiva_id}-${directiva.condominio_id}`}
                type="button"
                onClick={() => abrirDirectiva(directiva)}
                disabled={Boolean(abriendo)}
                className="w-full rounded-[1.5rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md disabled:opacity-60"
              >
                <div className="flex items-center gap-4">
                  {directiva.condominio_logo_url ? (
                    <img
                      src={directiva.condominio_logo_url}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-2xl border border-slate-100 bg-white object-contain p-1.5"
                    />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <UsersRound size={23} />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-black text-slate-900">
                      {directiva.condominio_nombre}
                    </h3>
                    <p className="mt-0.5 text-xs font-bold text-slate-700">
                      {directiva.cargo || "Directiva"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <MiniBadge icon={Landmark} texto="Finanzas" />
                      <MiniBadge icon={WalletCards} texto="Caja chica" />
                      <MiniBadge icon={UserRound} texto="Gestión" />
                    </div>
                  </div>

                  <ChevronRight
                    className="shrink-0 text-slate-400"
                    size={21}
                  />
                </div>
              </button>
            ))}
          </section>
        )}

        {propiedades.length === 0 && directivas.length === 0 && (
          <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Su cuenta de Supabase está activa, pero todavía no tiene una
            propiedad o cargo de Directiva vinculado.
          </section>
        )}

        <p className="pt-2 text-right text-[10px] font-semibold text-slate-400">
          Inicio Unificado VAM · v1.2
        </p>
      </div>
    </main>
  );
}

function MiniBadge({
  icon: Icon,
  texto,
}: {
  icon: React.ComponentType<{ size?: number }>;
  texto: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">
      <Icon size={11} />
      {texto}
    </span>
  );
}
