"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setMessageType("error");
      setMessage("Completa el correo electrónico y la contraseña.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (!rememberMe) {
        sessionStorage.setItem("vam_sesion_temporal", "1");
      } else {
        sessionStorage.removeItem("vam_sesion_temporal");
      }

      setMessageType("success");
      setMessage("Acceso correcto. Redirigiendo...");

      router.replace("/condominios");
      router.refresh();
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : "No fue posible iniciar sesión.";

      setMessageType("error");

      if (
        detail.toLowerCase().includes("invalid login") ||
        detail.toLowerCase().includes("invalid credentials")
      ) {
        setMessage("Correo electrónico o contraseña incorrectos.");
      } else {
        setMessage(detail);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setMessageType("error");
      setMessage("Escribe tu correo para enviarte el enlace de recuperación.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/restablecer-contrasena`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        throw error;
      }

      setMessageType("success");
      setMessage("Te enviamos un enlace para restablecer tu contraseña.");
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible enviar el correo de recuperación."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="h-[100dvh] overflow-hidden bg-[#eef4fb] p-2 sm:p-3 lg:p-4">
      <section className="mx-auto grid h-full max-h-[920px] w-full max-w-[1360px] overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_28px_80px_rgba(20,49,92,0.18)] lg:grid-cols-[1.08fr_0.92fr]">
        <aside className="relative hidden overflow-hidden bg-[linear-gradient(145deg,#0f4c81_0%,#1378b5_48%,#57b8df_100%)] lg:flex lg:flex-col lg:justify-between lg:p-8 xl:p-10">
          <div className="absolute -left-24 -top-28 h-80 w-80 rounded-full border border-white/15 bg-white/10 blur-sm" />
          <div className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full border border-white/15 bg-white/10" />
          <div className="absolute left-[14%] top-[28%] h-24 w-24 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md" />
          <div className="absolute bottom-[18%] right-[14%] h-16 w-16 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-sm font-black tracking-tight text-[#125f96] shadow-lg">
                VAM
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
                  Plataforma integral
                </p>
                <p className="text-base font-bold text-white">
                  VAM Condominios
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_0_5px_rgba(110,231,183,0.12)]" />
              Administración conectada
            </div>

            <h1 className="max-w-[620px] text-4xl font-black leading-[1.04] tracking-[-0.04em] text-white xl:text-5xl">
              Gestiona cada condominio desde un solo lugar.
            </h1>

            <p className="mt-5 max-w-[560px] text-sm leading-6 text-white/78 xl:text-base xl:leading-7">
              Control financiero, propietarios, seguridad, recursos humanos y
              operaciones en una experiencia rápida, moderna y totalmente
              multicondominio.
            </p>

            <div className="mt-7 grid max-w-[610px] grid-cols-3 gap-3">
              {[
                ["01", "Control financiero"],
                ["02", "Operación segura"],
                ["03", "Datos centralizados"],
              ].map(([number, label]) => (
                <div
                  key={number}
                  className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-md"
                >
                  <p className="text-xs font-black text-white/55">{number}</p>
                  <p className="mt-2 text-sm font-semibold leading-5 text-white">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-[11px] font-medium text-white/55">
            <span>VAM Administración de Condominios</span>
            <span>Seguro · Ágil · Multicondominio</span>
          </div>
        </aside>

        <div className="relative flex min-h-0 items-center justify-center overflow-hidden px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-8 xl:px-14">
          <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_right,rgba(67,169,214,0.16),transparent_58%)] lg:hidden" />

          <div className="relative w-full max-w-[430px]">
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#125f96] text-xs font-black text-white shadow-md">
                  VAM
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Plataforma integral
                  </p>
                  <p className="text-sm font-extrabold text-slate-800">
                    VAM Condominios
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">
                Sistema activo
              </span>
            </div>

            <div className="mb-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-[#1481bd]">
                Acceso seguro
              </p>
              <h2 className="text-3xl font-black tracking-[-0.035em] text-slate-900 sm:text-[34px]">
                Bienvenido de nuevo
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ingresa tus credenciales para acceder al panel administrativo.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-[12px] font-bold text-slate-700"
                >
                  Correo electrónico
                </label>

                <div className="group flex h-12 items-center rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 transition focus-within:border-[#2d9ed1] focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4.5 w-4.5 flex-none text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M4 6.5h16v11H4z" />
                    <path d="m4.5 7 7.5 6 7.5-6" />
                  </svg>

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="usuario@correo.com"
                    className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-[12px] font-bold text-slate-700"
                  >
                    Contraseña
                  </label>

                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="text-[11px] font-bold text-[#167bb2] transition hover:text-[#0d5f90] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <div className="group flex h-12 items-center rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 transition focus-within:border-[#2d9ed1] focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4.5 w-4.5 flex-none text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect x="5" y="10" width="14" height="10" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Escribe tu contraseña"
                    className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="grid h-8 w-8 flex-none place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4.5 w-4.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.7 10.8a2 2 0 0 0 2.5 2.5" />
                        <path d="M9.9 4.2A11 11 0 0 1 21 12a14 14 0 0 1-2.1 3.4" />
                        <path d="M6.2 6.2A13 13 0 0 0 3 12s3.2 6 9 6a9 9 0 0 0 3.2-.6" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4.5 w-4.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M3 12s3.2-6 9-6 9 6 9 6-3.2 6-9 6-9-6-9-6Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-0.5">
                <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#167bb2]"
                  />
                  Mantener mi sesión iniciada
                </label>

                <span className="hidden text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 sm:block">
                  Acceso protegido
                </span>
              </div>

              {message && (
                <div
                  className={`rounded-2xl border px-3.5 py-2.5 text-xs font-semibold leading-5 ${
                    messageType === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#125f96_0%,#1e8fc2_55%,#39acd2_100%)] px-4 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(27,128,181,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(27,128,181,0.34)] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
              >
                <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.18),transparent)] transition duration-700 group-hover:translate-x-full" />

                {loading ? (
                  <span className="relative flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                    Procesando...
                  </span>
                ) : (
                  <span className="relative flex items-center gap-2">
                    Iniciar sesión
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  </span>
                )}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-semibold text-slate-400">
              <span className="h-px w-8 bg-slate-200" />
              <span>VAM Condominios © {currentYear}</span>
              <span className="h-px w-8 bg-slate-200" />
            </div>

            <p className="mt-2 text-center text-[10px] leading-4 text-slate-400">
              Plataforma segura para la administración integral de condominios.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
