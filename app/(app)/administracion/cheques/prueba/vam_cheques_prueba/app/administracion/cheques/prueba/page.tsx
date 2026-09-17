"use client";

import React, { useEffect, useMemo, useState } from "react";

type Posicion = { x: number; y: number; fontSize: number };
type Configuracion = {
  fecha: Posicion;
  beneficiario: Posicion;
  monto: Posicion;
  letras: Posicion;
  offsetX: number;
  offsetY: number;
};

type PrintMode = "cheque" | "calibracion" | null;

const CHEQUE_ANCHO_MM = 203.2; // 8 pulgadas
const CHEQUE_ALTO_MM = 76.2;   // 3 pulgadas
const STORAGE_KEY = "vam-cheques-popular-config-v2";

const CONFIG_INICIAL: Configuracion = {
  // Posiciones iniciales aproximadas obtenidas del cheque escaneado enviado para prueba.
  // La impresora real puede introducir un pequeño desplazamiento; por eso existe offset global.
  fecha: { x: 163.0, y: 17.2, fontSize: 9.5 },
  beneficiario: { x: 40.0, y: 31.8, fontSize: 10.5 },
  monto: { x: 164.0, y: 31.0, fontSize: 10.5 },
  letras: { x: 11.0, y: 44.5, fontSize: 9.0 },
  offsetX: 0,
  offsetY: 0,
};

const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
const ESPECIALES: Record<number, string> = {
  10: "DIEZ", 11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE",
  16: "DIECISÉIS", 17: "DIECISIETE", 18: "DIECIOCHO", 19: "DIECINUEVE", 20: "VEINTE",
  21: "VEINTIUNO", 22: "VEINTIDÓS", 23: "VEINTITRÉS", 24: "VEINTICUATRO", 25: "VEINTICINCO",
  26: "VEINTISÉIS", 27: "VEINTISIETE", 28: "VEINTIOCHO", 29: "VEINTINUEVE",
};
const DECENAS = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

function dosDigitos(n: number) { return String(n).padStart(2, "0"); }

function menorDe100(n: number): string {
  if (n < 10) return UNIDADES[n];
  if (n <= 29) return ESPECIALES[n] ?? "";
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? DECENAS[d] : `${DECENAS[d]} Y ${UNIDADES[u]}`;
}

function menorDe1000(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  if (n < 100) return menorDe100(n);
  const c = Math.floor(n / 100);
  const r = n % 100;
  return r === 0 ? CENTENAS[c] : `${CENTENAS[c]} ${menorDe100(r)}`;
}

function numeroALetrasEntero(n: number): string {
  if (n === 0) return "CERO";
  if (n > 999_999_999) return String(n);

  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1_000);
  const resto = n % 1_000;
  const partes: string[] = [];

  if (millones > 0) partes.push(millones === 1 ? "UN MILLÓN" : `${menorDe1000(millones)} MILLONES`);
  if (miles > 0) partes.push(miles === 1 ? "MIL" : `${menorDe1000(miles)} MIL`);
  if (resto > 0) partes.push(menorDe1000(resto));

  return partes.join(" ");
}

function montoALetras(valor: number): string {
  const seguro = Number.isFinite(valor) ? Math.max(0, valor) : 0;
  const entero = Math.floor(seguro);
  const centavos = Math.round((seguro - entero) * 100);
  let letras = numeroALetrasEntero(entero)
    .replace(/\bVEINTIUNO$/, "VEINTIÚN")
    .replace(/\bY UNO$/, "Y UN")
    .replace(/\bUNO$/, "UN");
  return `${letras} PESOS CON ${dosDigitos(centavos)}/100`;
}

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor || 0);
}

function fechaPartes(fecha: string) {
  if (!fecha) return { dia: "", mes: "", anio: "" };
  const [anio, mes, dia] = fecha.split("-");
  return { dia, mes, anio };
}

function CampoCalibracion({ etiqueta, valor, onChange }: {
  etiqueta: string;
  valor: Posicion;
  onChange: (nuevo: Posicion) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-slate-800">{etiqueta}</div>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-xs text-slate-500">X (mm)
          <input type="number" step="0.5" value={valor.x}
            onChange={(e) => onChange({ ...valor, x: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900" />
        </label>
        <label className="text-xs text-slate-500">Y (mm)
          <input type="number" step="0.5" value={valor.y}
            onChange={(e) => onChange({ ...valor, y: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900" />
        </label>
        <label className="text-xs text-slate-500">Tamaño
          <input type="number" step="0.5" min="6" max="18" value={valor.fontSize}
            onChange={(e) => onChange({ ...valor, fontSize: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900" />
        </label>
      </div>
    </div>
  );
}

export default function PruebaImpresionChequesPage() {
  const hoy = new Date();
  const hoyISO = `${hoy.getFullYear()}-${dosDigitos(hoy.getMonth() + 1)}-${dosDigitos(hoy.getDate())}`;

  const [numeroCheque, setNumeroCheque] = useState("000386");
  const [fecha, setFecha] = useState(hoyISO);
  const [beneficiario, setBeneficiario] = useState("PROVEEDOR DE PRUEBA SRL");
  const [montoTexto, setMontoTexto] = useState("10620.00");
  const [concepto, setConcepto] = useState("Limpieza de trampas de grasa");
  const [config, setConfig] = useState<Configuracion>(CONFIG_INICIAL);
  const [mostrarReferencia, setMostrarReferencia] = useState(true);
  const [printMode, setPrintMode] = useState<PrintMode>(null);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (guardado) setConfig({ ...CONFIG_INICIAL, ...JSON.parse(guardado) });
    } catch {}
    setCargado(true);
  }, []);

  useEffect(() => {
    if (!cargado) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config, cargado]);

  useEffect(() => {
    const limpiar = () => setPrintMode(null);
    window.addEventListener("afterprint", limpiar);
    return () => window.removeEventListener("afterprint", limpiar);
  }, []);

  const monto = useMemo(() => {
    const n = Number(montoTexto.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : 0;
  }, [montoTexto]);
  const letras = useMemo(() => montoALetras(monto), [monto]);
  const partesFecha = useMemo(() => fechaPartes(fecha), [fecha]);

  const actualizar = (campo: "fecha" | "beneficiario" | "monto" | "letras", valor: Posicion) =>
    setConfig((prev) => ({ ...prev, [campo]: valor }));

  const imprimir = (modo: Exclude<PrintMode, null>) => {
    setPrintMode(modo);
    window.setTimeout(() => window.print(), 80);
  };

  const restablecer = () => {
    setConfig(CONFIG_INICIAL);
    localStorage.removeItem(STORAGE_KEY);
  };

  const descargarConfig = () => {
    const payload = {
      banco: "BANCO POPULAR DOMINICANO",
      plantilla: "Popular - Condominio Residencial Colinas del Oeste",
      cheque_ancho_mm: CHEQUE_ANCHO_MM,
      cheque_alto_mm: CHEQUE_ALTO_MM,
      ...config,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-cheque-popular-vam.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const px = (base: Posicion) => ({
    left: `${base.x + config.offsetX}mm`,
    top: `${base.y + config.offsetY}mm`,
    fontSize: `${base.fontSize}pt`,
  });

  return (
    <>
      <style>{`
        @media print {
          @page { size: 203.2mm 76.2mm; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; width: 203.2mm !important; height: 76.2mm !important; background: white !important; }
          body * { visibility: hidden !important; }
          #zona-impresion, #zona-impresion * { visibility: visible !important; }
          #zona-impresion { position: absolute !important; left: 0 !important; top: 0 !important; margin: 0 !important; box-shadow: none !important; }
          .ocultar-al-imprimir { display: none !important; }
        }
      `}</style>

      <main className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Prueba de Impresión de Cheques</h1>
              <p className="mt-1 text-sm text-slate-500">Banco Popular · plantilla de laboratorio VAM</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => imprimir("calibracion")}
                className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                Imprimir calibración
              </button>
              <button onClick={() => imprimir("cheque")}
                className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800">
                Imprimir cheque
              </button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 font-semibold text-slate-900">Datos de prueba</h2>
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-700">Banco
                    <input value="Banco Popular" disabled className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-500" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">Número de cheque
                    <input value={numeroCheque} onChange={(e) => setNumeroCheque(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
                    <span className="mt-1 block text-xs text-slate-500">Se usa para control; no se sobreimprime porque ya viene impreso en el cheque.</span>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">Fecha
                    <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">Beneficiario
                    <input value={beneficiario} onChange={(e) => setBeneficiario(e.target.value.toUpperCase())}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">Monto RD$
                    <input inputMode="decimal" value={montoTexto} onChange={(e) => setMontoTexto(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">Monto en letras
                    <textarea readOnly value={letras} rows={3}
                      className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">Concepto
                    <textarea value={concepto} onChange={(e) => setConcepto(e.target.value)} rows={2}
                      className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 font-semibold text-slate-900">Ajuste general de impresora</h2>
                <p className="mb-4 text-xs leading-5 text-slate-500">Use estos dos valores si todos los campos salen desplazados en la misma dirección. Es mejor corregir aquí que mover cada campo.</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-slate-500">Offset X (mm)
                    <input type="number" step="0.5" value={config.offsetX}
                      onChange={(e) => setConfig((p) => ({ ...p, offsetX: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label className="text-xs text-slate-500">Offset Y (mm)
                    <input type="number" step="0.5" value={config.offsetY}
                      onChange={(e) => setConfig((p) => ({ ...p, offsetY: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div className="overflow-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">Vista previa sobre el cheque real</h2>
                    <p className="text-xs text-slate-500">Referencia aproximada: 8 × 3 pulgadas (203.2 × 76.2 mm)</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={mostrarReferencia} onChange={(e) => setMostrarReferencia(e.target.checked)} />
                    Mostrar cheque de referencia
                  </label>
                </div>

                <div
                  id="zona-impresion"
                  className="relative mx-auto overflow-hidden bg-white shadow-lg"
                  style={{ width: `${CHEQUE_ANCHO_MM}mm`, height: `${CHEQUE_ALTO_MM}mm`, minWidth: `${CHEQUE_ANCHO_MM}mm` }}
                >
                  {/* La imagen sirve únicamente para alinear en pantalla. Nunca se imprime en modo cheque. */}
                  {mostrarReferencia && printMode !== "cheque" && (
                    <img src="/cheques/banco-popular-colinas-referencia.jpg" alt="Referencia cheque Banco Popular"
                      className={printMode === "calibracion" ? "absolute inset-0 h-full w-full object-fill opacity-35" : "ocultar-al-imprimir absolute inset-0 h-full w-full object-fill"} />
                  )}

                  {printMode === "calibracion" && (
                    <div className="absolute inset-0 border border-black">
                      <div className="absolute left-[2mm] top-[2mm] text-[6pt] font-bold">VAM · HOJA DE CALIBRACIÓN · 8 × 3 PULGADAS</div>
                    </div>
                  )}

                  <div className="absolute whitespace-nowrap font-medium text-black" style={{ ...px(config.fecha), letterSpacing: "0.7mm" }}>
                    {partesFecha.dia} {partesFecha.mes} {partesFecha.anio}
                  </div>
                  <div className="absolute max-w-[116mm] truncate whitespace-nowrap font-semibold uppercase text-black" style={px(config.beneficiario)}>
                    {beneficiario || " "}
                  </div>
                  <div className="absolute w-[31mm] whitespace-nowrap text-right font-semibold tabular-nums text-black" style={px(config.monto)}>
                    {formatoMoneda(monto)}
                  </div>
                  <div className="absolute max-w-[177mm] whitespace-nowrap font-semibold uppercase text-black" style={px(config.letras)}>
                    {letras}
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  <strong className="text-slate-800">Concepto:</strong> {concepto || "—"}
                  <div className="mt-1 text-xs text-slate-500">El concepto queda para el control de VAM; no se imprime en el frente del cheque.</div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-slate-900">Calibración por campo</h2>
                    <p className="text-xs text-slate-500">Ajuste en pasos de 0.5 mm luego de la primera impresión.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={restablecer} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Restablecer</button>
                    <button onClick={descargarConfig} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Descargar configuración</button>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <CampoCalibracion etiqueta="Fecha" valor={config.fecha} onChange={(v) => actualizar("fecha", v)} />
                  <CampoCalibracion etiqueta="Beneficiario" valor={config.beneficiario} onChange={(v) => actualizar("beneficiario", v)} />
                  <CampoCalibracion etiqueta="Monto numérico" valor={config.monto} onChange={(v) => actualizar("monto", v)} />
                  <CampoCalibracion etiqueta="Monto en letras" valor={config.letras} onChange={(v) => actualizar("letras", v)} />
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
                <div className="font-semibold">Cómo hacer la primera prueba</div>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>Use <b>Imprimir calibración</b> y coloque una hoja blanca de prueba.</li>
                  <li>En el cuadro de impresión del navegador use <b>Escala 100%</b> o <b>Tamaño real</b>, nunca “Ajustar a página”.</li>
                  <li>Compare la hoja con el cheque físico contra luz.</li>
                  <li>Si todo está corrido igual, ajuste Offset X/Y. Si solo un campo está mal, ajuste ese campo.</li>
                  <li>Cuando coincida, coloque un cheque real y use <b>Imprimir cheque</b>.</li>
                </ol>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
