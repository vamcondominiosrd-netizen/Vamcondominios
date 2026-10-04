"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type ContextoUsuario = {
  ok?: boolean;
  mensaje?: string;
  user_id?: string;
  email?: string;
  nombre?: string;
  puede_propietario?: boolean;
  puede_directiva?: boolean;
  propiedades?: unknown[];
  directivas?: unknown[];
};

function normalizarCorreo(valor: string) {
  return String(valor || "").trim().toLowerCase();
}

function correoValido(valor: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizarCorreo(valor));
}

function normalizarRespuesta<T extends object>(valor: unknown): T {
  if (Array.isArray(valor)) return (valor[0] || {}) as T;
  if (valor && typeof valor === "object") return valor as T;
  return {} as T;
}

function limpiarSesionLocal() {
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

export default function AccesoUnificadoVAMPage() {
  const router = useRouter();

  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = normalizarCorreo(correo);

    if (!correoValido(email)) {
      setError("Indique un correo electrónico válido.");
      return;
    }

    if (!clave) {
      setError("Indique su contraseña.");
      return;
    }

    setCargando(true);
    setError("");

    try {
      limpiarSesionLocal();
      await supabase.auth.signOut();

      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password: clave,
        });

      if (loginError || !loginData.session || !loginData.user) {
        throw new Error("Correo o contraseña incorrectos.");
      }

      const { data: contextoData, error: contextoError } = await supabase.rpc(
        "vam_preparar_contexto_usuario_unificado"
      );

      if (contextoError) {
        await supabase.auth.signOut();
        throw new Error(contextoError.message);
      }

      const contexto =
        normalizarRespuesta<ContextoUsuario>(contextoData);

      if (contexto.ok !== true) {
        await supabase.auth.signOut();
        throw new Error(
          contexto.mensaje ||
            "Su cuenta no tiene accesos activos en VAM."
        );
      }

      const tienePropietario =
        contexto.puede_propietario === true ||
        (Array.isArray(contexto.propiedades) &&
          contexto.propiedades.length > 0);

      const tieneDirectiva =
        contexto.puede_directiva === true ||
        (Array.isArray(contexto.directivas) &&
          contexto.directivas.length > 0);

      if (!tienePropietario && !tieneDirectiva) {
        await supabase.auth.signOut();
        throw new Error(
          "Su cuenta está autenticada, pero no tiene módulos móviles asignados."
        );
      }

      localStorage.setItem(
        "vam_contexto_usuario",
        JSON.stringify(contexto)
      );

      router.replace("/movil/inicio-unificado");
    } catch (e) {
      console.error("Acceso unificado VAM:", e);
      setError(
        e instanceof Error
          ? e.message
          : "No fue posible iniciar sesión."
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-dvh bg-slate-100 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md items-center">
        <div className="w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
          <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-6 pb-8 pt-7 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-lg font-black text-blue-950 shadow-lg">
                  VAM
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
                  Acceso unificado
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight">
                  VAM Condominios
                </h1>
                <p className="mt-2 max-w-xs text-sm leading-6 text-blue-100">
                  Una sola cuenta. VAM mostrará únicamente los módulos
                  autorizados para su correo.
                </p>
              </div>

              <ShieldCheck className="mt-1 shrink-0 text-blue-200" size={30} />
            </div>
          </div>

          <form onSubmit={entrar} className="space-y-5 p-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
                <div className="flex items-center gap-2 text-blue-900">
                  <Building2 size={18} />
                  <span className="text-xs font-black">Propietario</span>
                </div>
                <p className="mt-1 text-[11px] leading-4 text-blue-700">
                  Cuenta, pagos y servicios.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <UsersRound size={18} />
                  <span className="text-xs font-black">Directiva</span>
                </div>
                <p className="mt-1 text-[11px] leading-4 text-slate-600">
                  Finanzas, firmas y control.
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-black text-slate-700">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  autoComplete="username"
                  value={correo}
                  onChange={(event) => setCorreo(event.target.value)}
                  placeholder="correo@ejemplo.com"
                  disabled={cargando}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-black text-slate-700">
                Contraseña
              </label>
              <div className="relative">
                <KeyRound
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={mostrarClave ? "text" : "password"}
                  autoComplete="current-password"
                  value={clave}
                  onChange={(event) => setClave(event.target.value)}
                  placeholder="Su contraseña"
                  disabled={cargando}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />

                <button
                  type="button"
                  onClick={() => setMostrarClave((valor) => !valor)}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                  aria-label={
                    mostrarClave ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {mostrarClave ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-800 text-sm font-black text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Preparando accesos...
                </>
              ) : (
                <>
                  <LockKeyhole size={18} />
                  Entrar a VAM
                </>
              )}
            </button>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold text-slate-700">
                ¿Primera vez en VAM?
              </p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                La activación se realizará mediante su correo electrónico y
                un código temporal enviado o generado por la administración.
              </p>
            </div>

            <p className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-400">
              <ShieldCheck size={13} />
              Autenticación centralizada con Supabase Auth
            </p>

            <p className="text-right text-[10px] font-semibold text-slate-400">
              Acceso Unificado VAM · v1.1
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
