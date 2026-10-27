"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  Send,
  ShieldCheck,
} from "lucide-react";

function normalizarCorreo(valor: string) {
  return String(valor || "").trim().toLowerCase();
}

function correoValido(valor: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizarCorreo(valor));
}

export default function ActivarCuentaVAMPage() {
  const router = useRouter();

  const [correo, setCorreo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  async function solicitar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = normalizarCorreo(correo);

    if (!correoValido(email)) {
      setError("Indique un correo electrónico válido.");
      return;
    }

    setCargando(true);
    setError("");

    try {
      const response = await fetch("/api/auth/solicitar-activacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        mensaje?: string;
        error?: string;
      };

      if (!response.ok || data.ok !== true) {
        throw new Error(
          data.error ||
            data.mensaje ||
            "No fue posible procesar la solicitud."
        );
      }

      setEnviado(true);
    } catch (e) {
      console.error("Activación VAM:", e);
      setError(
        e instanceof Error
          ? e.message
          : "No fue posible procesar la solicitud."
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
              <button
                type="button"
                onClick={() => router.replace("/movil/acceso-unificado")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10"
                aria-label="Volver al acceso"
              >
                <ArrowLeft size={19} />
              </button>

              <div>
                <p className="text-xl font-black tracking-tight">
                  Activar mi cuenta
                </p>
                <p className="mt-0.5 text-xs text-blue-100">
                  Validación segura mediante correo electrónico
                </p>
              </div>

              <div className="ml-auto rounded-full bg-white/10 p-2.5">
                <ShieldCheck className="h-5 w-5 text-blue-100" />
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-5">
            {!enviado ? (
              <form onSubmit={solicitar} className="space-y-4">
                <div>
                  <h1 className="text-xl font-black text-slate-900">
                    Verifique su correo
                  </h1>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Escriba el correo registrado en VAM. Si corresponde a una
                    cuenta autorizada, recibirá un enlace seguro para activar
                    o recuperar su acceso.
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
                      autoComplete="email"
                      value={correo}
                      onChange={(event) => setCorreo(event.target.value)}
                      placeholder="correo@ejemplo.com"
                      disabled={cargando}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-[11px] leading-5 text-blue-800">
                  Por seguridad, VAM no confirma públicamente si un correo está
                  registrado. Si el correo tiene acceso autorizado, VAM le
                  enviará el enlace correspondiente.
                </div>

                <button
                  type="submit"
                  disabled={cargando}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 text-sm font-black text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cargando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Enviarme enlace seguro
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => router.replace("/movil/acceso-unificado")}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-black text-slate-600 transition hover:bg-slate-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver a iniciar sesión
                </button>
              </form>
            ) : (
              <div className="space-y-4 py-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={28} />
                </div>

                <div className="text-center">
                  <h1 className="text-xl font-black text-slate-900">
                    Revise su correo
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Si el correo está registrado en VAM, recibirá un enlace
                    seguro de Supabase. Ábralo desde el mismo dispositivo para
                    crear o actualizar su contraseña.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  Si no lo encuentra, revise también la carpeta de correo no
                  deseado o spam.
                </div>

                <button
                  type="button"
                  onClick={() => router.replace("/movil/acceso-unificado")}
                  className="h-11 w-full rounded-xl bg-slate-900 text-sm font-black text-white"
                >
                  Volver al acceso de VAM
                </button>
              </div>
            )}

            <div className="mt-5 border-t border-slate-100 pt-3 text-center">
              <p className="text-[10px] font-semibold text-slate-400">
                Activación por correo · v1.0
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
