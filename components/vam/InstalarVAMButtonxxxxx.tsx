"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Download, Share2, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

function esIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function estaInstalada() {
  if (typeof window === "undefined") return false;

  const modoStandalone = window.matchMedia(
    "(display-mode: standalone)"
  ).matches;

  const navegadorIOS = navigator as Navigator & {
    standalone?: boolean;
  };

  return modoStandalone || navegadorIOS.standalone === true;
}

export default function InstalarVAMButton() {
  const [eventoInstalacion, setEventoInstalacion] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [instalada, setInstalada] = useState(false);
  const [mostrarAyuda, setMostrarAyuda] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setIos(esIOS());
    setInstalada(estaInstalada());

    const capturarInstalacion = (event: Event) => {
      event.preventDefault();
      setEventoInstalacion(event as BeforeInstallPromptEvent);
    };

    const confirmarInstalacion = () => {
      setInstalada(true);
      setEventoInstalacion(null);
      setMostrarAyuda(false);
    };

    window.addEventListener(
      "beforeinstallprompt",
      capturarInstalacion
    );

    window.addEventListener(
      "appinstalled",
      confirmarInstalacion
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        capturarInstalacion
      );

      window.removeEventListener(
        "appinstalled",
        confirmarInstalacion
      );
    };
  }, []);

  async function instalar() {
    if (instalada) return;

    if (eventoInstalacion) {
      await eventoInstalacion.prompt();

      const eleccion = await eventoInstalacion.userChoice;

      if (eleccion.outcome === "accepted") {
        setInstalada(true);
      }

      setEventoInstalacion(null);
      return;
    }

    setMostrarAyuda(true);
  }

  if (instalada) return null;

  return (
    <>
      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-800 text-white shadow-sm">
            <Smartphone className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-900">
              Tenga VAM siempre a mano
            </p>

            <p className="mt-0.5 text-xs leading-5 text-slate-600">
              Instale el icono de VAM en su celular. Solo se hace una vez.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void instalar()}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 text-sm font-black text-white transition hover:bg-blue-900 active:scale-[0.99]"
        >
          <Download className="h-4 w-4" />
          Instalar VAM en mi celular
        </button>
      </div>

      {mostrarAyuda && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="text-sm font-black text-slate-900">
                  Instalar VAM
                </p>
                <p className="text-xs text-slate-500">
                  Siga estos pasos una sola vez
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMostrarAyuda(false)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar instrucciones"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {ios ? (
                <>
                  <Paso
                    numero="1"
                    titulo="Abra VAM en Safari"
                    texto="La instalación en iPhone debe hacerse desde Safari."
                  />

                  <Paso
                    numero="2"
                    titulo="Toque Compartir"
                    texto="Pulse el botón de compartir en la parte inferior de Safari."
                    icono={<Share2 className="h-4 w-4" />}
                  />

                  <Paso
                    numero="3"
                    titulo="Añadir a pantalla de inicio"
                    texto='Seleccione "Añadir a pantalla de inicio" y luego pulse "Añadir".'
                  />
                </>
              ) : (
                <>
                  <Paso
                    numero="1"
                    titulo="Abra el menú del navegador"
                    texto="En Chrome, toque los tres puntos ⋮."
                  />

                  <Paso
                    numero="2"
                    titulo="Instale VAM"
                    texto='Seleccione "Instalar aplicación" o "Agregar a pantalla principal".'
                  />

                  <Paso
                    numero="3"
                    titulo="Confirme"
                    texto="Pulse Instalar. El icono de VAM aparecerá en su celular."
                  />
                </>
              )}

              <button
                type="button"
                onClick={() => setMostrarAyuda(false)}
                className="h-11 w-full rounded-xl bg-slate-900 text-sm font-black text-white"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Paso({
  numero,
  titulo,
  texto,
  icono,
}: {
  numero: string;
  titulo: string;
  texto: string;
  icono?: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-800">
        {icono || numero}
      </div>

      <div>
        <p className="text-sm font-black text-slate-900">
          {titulo}
        </p>

        <p className="mt-0.5 text-xs leading-5 text-slate-600">
          {texto}
        </p>
      </div>
    </div>
  );
}
