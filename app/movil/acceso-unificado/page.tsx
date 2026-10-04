"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import InstalarVAMUniversal from "@/components/vam/InstalarVAMUniversal";
import {
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type ContextoUsuario = {
  ok?: boolean;
  codigo?: string;
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
    <main className="min-h-dvh bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-3 py-4 sm:px-5">
      <div className="mx-auto flex min-h-[calc(100dvh-32px)] w-full max-w-md items-center justify-center">
        <section className="w-full overflow-hidden rounded-[1.8rem] bg-white shadow-2xl shadow-black/30">
          <header className="bg-gradient-to-r from-blue-800 via-blue-900 to-slate-950 px-5 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-white text-lg font-black text-blue-950 shadow-lg">
                VAM
              </div>

              <div className="min-w-0">
                <p className="text-xl font-black tracking-tight">VAM Móvil</p>
                <p className="mt-0.5 text-xs text-blue-100">
                  Acceso seguro al condominio
                </p>
              </div>

              <div className="ml-auto rounded-full bg-white/10 p-2.5">
                <ShieldCheck className="h-5 w-5 text-blue-100" />
              </div>
            </div>
          </header>

          <form onSubmit={entrar} className="space-y-4 p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-2">
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

            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                Iniciar sesión
              </h1>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Use el correo registrado en VAM y su contraseña.
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
              <label className="mb-1 block text-xs font-bold text-slate-700">
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
                  placeholder="Digite su contraseña"
                  disabled={cargando}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />

                <button
                  type="button"
                  onClick={() => setMostrarClave((valor) => !valor)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label={
                    mostrarClave ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {mostrarClave ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => router.push("/movil/activar-cuenta")}
                className="mt-2 text-xs font-bold text-blue-700 hover:text-blue-900"
              >
                ¿Olvidó su contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 text-sm font-black text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparando accesos...
                </>
              ) : (
                <>
                  <LockKeyhole className="h-4 w-4" />
                  Entrar a VAM
                </>
              )}
            </button>

            <InstalarVAMUniversal />

            <button
              type="button"
              onClick={() => router.push("/movil/activar-cuenta")}
              disabled={cargando}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-800 transition hover:bg-blue-100 disabled:opacity-60"
            >
              <UserPlus className="h-4 w-4" />
              Activar mi cuenta por primera vez
            </button>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <MessageCircle className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900">
                    ¿Necesita ayuda?
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-600">
                    Soporte VAM por WhatsApp
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-black text-emerald-800">
                    <Phone className="h-3.5 w-3.5" />
                    829-792-9292
                  </p>
                </div>
              </div>

              <a
                href="https://wa.me/18297929292?text=Hola%20VAM%2C%20necesito%20ayuda%20con%20mi%20acceso%20a%20VAM%20Condominios."
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700 active:scale-[0.99]"
              >
                <MessageCircle className="h-4 w-4" />
                Contactar soporte por WhatsApp
              </a>
            </div>

            <div className="border-t border-slate-100 pt-3 text-center">
              <p className="text-[10px] font-semibold text-slate-400">
                VAM Administración de Condominios · Acceso unificado v1.3
              </p>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
