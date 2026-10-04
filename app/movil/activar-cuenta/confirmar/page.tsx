"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type ContextoUsuario = {
  ok?: boolean;
  codigo?: string;
  mensaje?: string;
  email?: string;
  nombre?: string;
  puede_propietario?: boolean;
  puede_directiva?: boolean;
  propiedades?: unknown[];
  directivas?: unknown[];
};

function normalizarRespuesta<T extends object>(valor: unknown): T {
  if (Array.isArray(valor)) return (valor[0] || {}) as T;
  if (valor && typeof valor === "object") return valor as T;
  return {} as T;
}

export default function ConfirmarActivacionVAMPage() {
  const router = useRouter();

  const [sesionLista, setSesionLista] = useState(false);
  const [validando, setValidando] = useState(true);
  const [clave, setClave] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [completado, setCompletado] = useState(false);

  useEffect(() => {
    let activo = true;

    function marcarSesion(session: unknown) {
      if (!activo || !session) return;
      setSesionLista(true);
      setValidando(false);
      setError("");
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      marcarSesion(session);
    });

    async function revisarSesion() {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const params =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;

      const descripcionHash = new URLSearchParams(
        hash.startsWith("#") ? hash.slice(1) : hash
      ).get("error_description");

      const descripcionQuery = params?.get("error_description");

      if (descripcionHash || descripcionQuery) {
        if (!activo) return;
        setValidando(false);
        setError(
          decodeURIComponent(
            descripcionHash ||
              descripcionQuery ||
              "El enlace de activación no es válido."
          )
        );
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!activo) return;

      if (sessionError) {
        setValidando(false);
        setError(sessionError.message);
        return;
      }

      if (data.session) {
        marcarSesion(data.session);
        return;
      }

      window.setTimeout(async () => {
        if (!activo) return;

        const { data: segundoIntento } = await supabase.auth.getSession();

        if (!activo) return;

        if (segundoIntento.session) {
          marcarSesion(segundoIntento.session);
        } else {
          setValidando(false);
          setError(
            "No se encontró una sesión válida. Abra nuevamente el enlace recibido por correo."
          );
        }
      }, 1500);
    }

    void revisarSesion();

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, []);

  async function guardarClave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sesionLista) {
      setError(
        "No existe una sesión válida de activación. Abra nuevamente el enlace del correo."
      );
      return;
    }

    if (clave.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (clave !== confirmarClave) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setGuardando(true);
    setError("");

    try {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: clave,
      });

      if (passwordError) {
        throw passwordError;
      }

      const { data: contextoData, error: contextoError } = await supabase.rpc(
        "vam_preparar_contexto_usuario_unificado"
      );

      if (contextoError) {
        throw contextoError;
      }

      const contexto =
        normalizarRespuesta<ContextoUsuario>(contextoData);

      const tienePropietario =
        contexto.puede_propietario === true ||
        (Array.isArray(contexto.propiedades) &&
          contexto.propiedades.length > 0);

      const tieneDirectiva =
        contexto.puede_directiva === true ||
        (Array.isArray(contexto.directivas) &&
          contexto.directivas.length > 0);

      if (
        contexto.ok !== true ||
        (!tienePropietario && !tieneDirectiva)
      ) {
        await supabase.auth.signOut();

        throw new Error(
          contexto.mensaje ||
            "La cuenta fue validada, pero el correo no tiene un acceso móvil activo en VAM. Contacte a la administración."
        );
      }

      localStorage.setItem(
        "vam_contexto_usuario",
        JSON.stringify(contexto)
      );

      setCompletado(true);

      window.setTimeout(() => {
        router.replace("/movil/inicio-unificado");
      }, 900);
    } catch (e) {
      console.error("Confirmar activación VAM:", e);
      setError(
        e instanceof Error
          ? e.message
          : "No fue posible completar la activación."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="min-h-dvh bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-3 py-4 sm:px-5">
      <div className="mx-auto flex min-h-[calc(100dvh-32px)] w-full max-w-md items-center justify-center">
        <section className="w-full overflow-hidden rounded-[1.8rem] bg-white shadow-2xl shadow-black/30">
          <header className="bg-gradient-to-r from-blue-800 via-blue-900 to-slate-950 px-5 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-base font-black text-blue-950">
                VAM
              </div>

              <div>
                <p className="text-xl font-black tracking-tight">
                  Seguridad de la cuenta
                </p>
                <p className="mt-0.5 text-xs text-blue-100">
                  Establezca su contraseña de acceso
                </p>
              </div>

              <ShieldCheck className="ml-auto text-blue-100" size={24} />
            </div>
          </header>

          <div className="p-4 sm:p-5">
            {validando ? (
              <div className="flex min-h-56 flex-col items-center justify-center text-center">
                <Loader2
                  className="animate-spin text-blue-700"
                  size={30}
                />
                <p className="mt-3 text-sm font-black text-slate-800">
                  Validando enlace seguro...
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Estamos verificando la sesión recibida desde Supabase.
                </p>
              </div>
            ) : completado ? (
              <div className="flex min-h-56 flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={28} />
                </div>
                <h1 className="mt-3 text-xl font-black text-slate-900">
                  Cuenta lista
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Su correo fue validado y la contraseña quedó establecida.
                  Preparando sus módulos de VAM...
                </p>
              </div>
            ) : sesionLista ? (
              <form onSubmit={guardarClave} className="space-y-4">
                <div>
                  <h1 className="text-xl font-black text-slate-900">
                    Crear contraseña
                  </h1>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    La contraseña será administrada por Supabase Auth. Utilice
                    al menos 8 caracteres.
                  </p>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700"
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <KeyRound
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type={mostrarClave ? "text" : "password"}
                      autoComplete="new-password"
                      value={clave}
                      onChange={(event) => setClave(event.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      disabled={guardando}
                      className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-12 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarClave((valor) => !valor)}
                      className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                      aria-label="Mostrar u ocultar contraseña"
                    >
                      {mostrarClave ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <KeyRound
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type={mostrarConfirmacion ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmarClave}
                      onChange={(event) =>
                        setConfirmarClave(event.target.value)
                      }
                      placeholder="Repita su contraseña"
                      disabled={guardando}
                      className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-12 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setMostrarConfirmacion((valor) => !valor)
                      }
                      className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                      aria-label="Mostrar u ocultar confirmación"
                    >
                      {mostrarConfirmacion ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={guardando}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 text-sm font-black text-white transition hover:bg-blue-900 disabled:opacity-60"
                >
                  {guardando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Activar mi cuenta
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-4 py-4">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                  {error ||
                    "No se pudo validar el enlace de activación."}
                </div>

                <button
                  type="button"
                  onClick={() => router.replace("/movil/activar-cuenta")}
                  className="h-11 w-full rounded-xl bg-blue-800 text-sm font-black text-white"
                >
                  Solicitar un nuevo enlace
                </button>

                <button
                  type="button"
                  onClick={() => router.replace("/movil/acceso-unificado")}
                  className="h-10 w-full rounded-xl text-xs font-black text-slate-600 hover:bg-slate-100"
                >
                  Volver al acceso de VAM
                </button>
              </div>
            )}

            <div className="mt-5 border-t border-slate-100 pt-3 text-center">
              <p className="text-[10px] font-semibold text-slate-400">
                Activación segura Supabase · v1.0
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
