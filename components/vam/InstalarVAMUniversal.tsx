"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  PlusSquare,
  Share2,
  Smartphone,
  X,
} from "lucide-react";
import InstalarVAMButton from "@/components/vam/InstalarVAMButton";

type Plataforma = "pendiente" | "ios" | "otra";

type NavigatorIOS = Navigator & { standalone?: boolean };

/** Conserva íntegramente el instalador Android existente y añade la guía iOS. */
export default function InstalarVAMUniversal() {
  const [plataforma, setPlataforma] = useState<Plataforma>("pendiente");
  const [esSafari, setEsSafari] = useState(false);
  const [instalada, setInstalada] = useState(false);
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const [enlace, setEnlace] = useState("");
  const [mensajeCopia, setMensajeCopia] = useState("");

  useEffect(() => {
    const navegador = navigator as NavigatorIOS;
    const agente = navigator.userAgent;
    const apple = /iPhone|iPad|iPod/i.test(agente) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    setPlataforma(apple ? "ios" : "otra");
    setEsSafari(
      /Version\/\d[\d.]*.*Safari/i.test(agente) &&
      !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|DuckDuckGo|FBAN|FBAV|Instagram/i.test(agente)
    );
    setEnlace(`${window.location.origin}${window.location.pathname}`);

    const actualizarInstalacion = () => {
      setInstalada(
        window.matchMedia("(display-mode: standalone)").matches ||
        navegador.standalone === true
      );
    };
    actualizarInstalacion();
    window.addEventListener("pageshow", actualizarInstalacion);
    document.addEventListener("visibilitychange", actualizarInstalacion);
    return () => {
      window.removeEventListener("pageshow", actualizarInstalacion);
      document.removeEventListener("visibilitychange", actualizarInstalacion);
    };
  }, []);

  useEffect(() => {
    if (!mostrarGuia) return;
    function cerrarConEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMostrarGuia(false);
    }
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [mostrarGuia]);

  async function copiarEnlace() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Portapapeles no disponible");
      await navigator.clipboard.writeText(enlace);
      setMensajeCopia("Enlace copiado. Abra Safari y péguelo en la barra de direcciones.");
    } catch {
      setMensajeCopia("Mantenga pulsado el enlace de abajo para copiarlo y abrirlo en Safari.");
    }
  }

  if (plataforma === "pendiente") return null;
  if (plataforma === "otra") return <InstalarVAMButton />;
  if (instalada) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMensajeCopia("");
          setMostrarGuia(true);
        }}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-800 transition hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        <Smartphone className="h-5 w-5 shrink-0" aria-hidden="true" />
        Instalar VAM en iPhone / iPad
      </button>

      {mostrarGuia && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-instalar-vam-ios"
            className="max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-3 bg-gradient-to-r from-blue-800 to-slate-950 p-5 text-white">
              <div className="flex min-w-0 items-start gap-3">
                <div className="rounded-xl bg-white/15 p-2.5">
                  <Smartphone className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-100">
                    Instalación iOS · v1.0.0
                  </p>
                  <h2 id="titulo-instalar-vam-ios" className="mt-1 text-xl font-black">
                    Instalar VAM Condominios
                  </h2>
                  <p className="mt-1 text-xs text-blue-100">
                    Agregue VAM a la pantalla de inicio de su iPhone o iPad.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarGuia(false)}
                aria-label="Cerrar instrucciones"
                className="shrink-0 rounded-lg p-2 hover:bg-white/15"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div className="space-y-4 p-5">
              {!esSafari && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  Está utilizando un navegador diferente de Safari o una aplicación interna.
                  Abra este mismo enlace en <strong>Safari</strong> para seguir la guía.
                  <button
                    type="button"
                    onClick={() => void copiarEnlace()}
                    className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-900 px-3 py-2 font-black text-white"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copiar enlace para Safari
                  </button>
                  {mensajeCopia && <p role="status" className="mt-2">{mensajeCopia}</p>}
                  <input
                    value={enlace}
                    readOnly
                    onFocus={(event) => event.currentTarget.select()}
                    aria-label="Enlace de acceso a VAM"
                    className="mt-2 w-full rounded-lg border border-amber-200 bg-white px-2 py-2 text-xs text-slate-700"
                  />
                </div>
              )}

              <ol className="space-y-3 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 font-black text-blue-800">1</span>
                  <div>
                    <p className="font-bold text-slate-900">Abra VAM en Safari</p>
                    <p className="mt-0.5 text-xs leading-5">Utilice la misma dirección de esta pantalla de acceso.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 font-black text-blue-800">2</span>
                  <div>
                    <p className="flex items-center gap-2 font-bold text-slate-900">
                      <Share2 className="h-4 w-4 text-blue-700" aria-hidden="true" /> Compartir
                    </p>
                    <p className="mt-0.5 text-xs leading-5">Toque Compartir (cuadrado con flecha hacia arriba). Según su versión de Safari, primero pulse el menú de la página.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 font-black text-blue-800">3</span>
                  <div>
                    <p className="flex items-center gap-2 font-bold text-slate-900">
                      <PlusSquare className="h-4 w-4 text-blue-700" aria-hidden="true" /> Agregar a Inicio
                    </p>
                    <p className="mt-0.5 text-xs leading-5">Deslice las opciones si es necesario. Si no aparece, entre en «Editar acciones» y agréguela.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 font-black text-blue-800">4</span>
                  <div>
                    <p className="font-bold text-slate-900">Activar y agregar</p>
                    <p className="mt-0.5 text-xs leading-5">Si aparece «Abrir como app web», manténgalo activado. Toque «Agregar».</p>
                  </div>
                </li>
              </ol>

              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Luego, abra el icono de VAM desde la pantalla de inicio. No necesita instalar un archivo APK ni IPA.
              </div>
              <button
                type="button"
                onClick={() => setMostrarGuia(false)}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 py-3 text-sm font-black text-white hover:bg-blue-900"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Entendido, continuar en Safari
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
