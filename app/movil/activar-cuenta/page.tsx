"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Mail, MessageCircle, Send, ShieldCheck, TriangleAlert } from "lucide-react";

function normalizarCorreo(valor: string) {
  return String(valor || "").trim().toLowerCase();
}

function correoValido(valor: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizarCorreo(valor));
}

type RespuestaActivacion = {
  ok?: boolean;
  estado?: "ENLACE_ENVIADO" | "NO_REGISTRADO";
  mensaje?: string;
  error?: string;
};

export default function ActivarCuentaVAMPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [correoConsultado, setCorreoConsultado] = useState("");
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [noRegistrado, setNoRegistrado] = useState(false);
  const [error, setError] = useState("");

  const whatsappUrl = useMemo(() => {
    const email = normalizarCorreo(correoConsultado || correo);
    const mensaje = email
      ? `Hola VAM, necesito ayuda para activar mi cuenta. Mi correo es: ${email}`
      : "Hola VAM, necesito ayuda para activar mi cuenta en VAM Condominios.";
    return `https://wa.me/18297929292?text=${encodeURIComponent(mensaje)}`;
  }, [correo, correoConsultado]);

  async function solicitar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = normalizarCorreo(correo);

    if (!correoValido(email)) {
      setError("Indique un correo electrónico válido.");
      return;
    }

    setCargando(true);
    setError("");
    setNoRegistrado(false);
    setEnviado(false);
    setCorreoConsultado(email);

    try {
      const response = await fetch("/api/auth/solicitar-activacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as RespuestaActivacion;

      if (!response.ok || data.ok !== true) {
        throw new Error(data.error || data.mensaje || "No fue posible procesar la solicitud.");
      }

      if (data.estado === "NO_REGISTRADO") {
        setNoRegistrado(true);
        return;
      }

      setEnviado(true);
    } catch (e) {
      console.error("Activación VAM:", e);
      setError(e instanceof Error ? e.message : "No fue posible procesar la solicitud.");
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
              <button type="button" onClick={() => router.replace("/movil/acceso-unificado")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10" aria-label="Volver al acceso">
                <ArrowLeft size={19} />
              </button>
              <div>
                <p className="text-xl font-black tracking-tight">Activar mi cuenta</p>
                <p className="mt-0.5 text-xs text-blue-100">Validación segura mediante correo electrónico</p>
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
                  <h1 className="text-xl font-black text-slate-900">Verifique su correo</h1>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Escriba el correo registrado en VAM para activar o recuperar su acceso.</p>
                </div>

                {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">{error}</div>}

                {noRegistrado && (
                  <div role="alert" className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <TriangleAlert size={19} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">Correo no registrado en VAM</p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">No encontramos un acceso activo asociado a <span className="font-bold">{correoConsultado}</span>. Verifique el correo o comuníquese con nuestra mesa de ayuda.</p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2.5 text-center text-xs font-bold text-slate-700">Mesa de ayuda VAM · 829-792-9292</div>
                    <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700">
                      <MessageCircle className="h-4 w-4" /> Contactar por WhatsApp
                    </a>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Correo electrónico</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" autoComplete="email" value={correo} onChange={(event) => { setCorreo(event.target.value); setNoRegistrado(false); setError(""); }} placeholder="correo@ejemplo.com" disabled={cargando} className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" />
                  </div>
                </div>

                <button type="submit" disabled={cargando} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 text-sm font-black text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60">
                  {cargando ? <><Loader2 className="h-4 w-4 animate-spin" />Verificando...</> : <><Send className="h-4 w-4" />Enviarme enlace seguro</>}
                </button>

                {!noRegistrado && <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-[11px] leading-5 text-blue-800">Si tiene inconvenientes con su correo o acceso, puede comunicarse con la mesa de ayuda VAM al <span className="font-black">829-792-9292</span>.</div>}

                <button type="button" onClick={() => router.replace("/movil/acceso-unificado")} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-black text-slate-600 transition hover:bg-slate-100">
                  <ArrowLeft className="h-4 w-4" /> Volver a iniciar sesión
                </button>
              </form>
            ) : (
              <div className="space-y-4 py-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={28} /></div>
                <div className="text-center">
                  <h1 className="text-xl font-black text-slate-900">Revise su correo</h1>
                  <p className="mt-2 text-sm leading-6 text-slate-600">VAM envió un enlace seguro a <span className="font-bold">{correoConsultado}</span>. Ábralo para crear o actualizar su contraseña.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">Si no lo encuentra, revise también la carpeta de correo no deseado o spam.</div>
                <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-700"><MessageCircle className="h-4 w-4" /> Mesa de ayuda por WhatsApp</a>
                <button type="button" onClick={() => router.replace("/movil/acceso-unificado")} className="h-11 w-full rounded-xl bg-slate-900 text-sm font-black text-white">Volver al acceso de VAM</button>
              </div>
            )}

            <div className="mt-5 border-t border-slate-100 pt-3 text-center"><p className="text-[10px] font-semibold text-slate-400">Activación por correo · v1.1</p></div>
          </div>
        </section>
      </div>
    </main>
  );
}
