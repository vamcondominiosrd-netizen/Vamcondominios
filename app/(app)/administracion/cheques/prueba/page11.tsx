"use client";

import React, { useMemo, useState } from "react";

type Posicion = {
  x: number;
  y: number;
  fontSize: number;
};

type Configuracion = {
  fecha: Posicion;
  beneficiario: Posicion;
  monto: Posicion;
  letras: Posicion;
};

type AjustesHorizontales = {
  beneficiario: number;
  letras: number;
};

const CONFIG_INICIAL: Configuracion = {
  // Calibración obtenida en la prueba física actual.
  fecha: { x: 144, y: 30.5, fontSize: 18 },
  beneficiario: { x: 1.5, y: 53.5, fontSize: 11 },
  monto: { x: 128, y: 52.5, fontSize: 14 },
  letras: { x: 0, y: 65.5, fontSize: 9.5 },
};

const AJUSTES_HORIZONTALES_INICIALES: AjustesHorizontales = {
  // Ajustes independientes basados en la última impresión física.
  // Se aplican después de X/Y, sin mover Fecha ni Monto numérico.
  beneficiario: -22,
  letras: -50,
};

const CHEQUE_ANCHO_MM = 215;
const CHEQUE_ALTO_MM = 95;

function dosDigitos(n: number) {
  return String(n).padStart(2, "0");
}

function formatearFechaISO(fecha: string) {
  if (!fecha) return { dia: "", mes: "", anio: "" };
  const [anio, mes, dia] = fecha.split("-");
  return { dia, mes, anio };
}

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor || 0);
}

const UNIDADES = [
  "",
  "UNO",
  "DOS",
  "TRES",
  "CUATRO",
  "CINCO",
  "SEIS",
  "SIETE",
  "OCHO",
  "NUEVE",
];

const ESPECIALES: Record<number, string> = {
  10: "DIEZ",
  11: "ONCE",
  12: "DOCE",
  13: "TRECE",
  14: "CATORCE",
  15: "QUINCE",
  16: "DIECISÉIS",
  17: "DIECISIETE",
  18: "DIECIOCHO",
  19: "DIECINUEVE",
  20: "VEINTE",
  21: "VEINTIUNO",
  22: "VEINTIDÓS",
  23: "VEINTITRÉS",
  24: "VEINTICUATRO",
  25: "VEINTICINCO",
  26: "VEINTISÉIS",
  27: "VEINTISIETE",
  28: "VEINTIOCHO",
  29: "VEINTINUEVE",
};

const DECENAS = [
  "",
  "",
  "VEINTE",
  "TREINTA",
  "CUARENTA",
  "CINCUENTA",
  "SESENTA",
  "SETENTA",
  "OCHENTA",
  "NOVENTA",
];

const CENTENAS = [
  "",
  "CIENTO",
  "DOSCIENTOS",
  "TRESCIENTOS",
  "CUATROCIENTOS",
  "QUINIENTOS",
  "SEISCIENTOS",
  "SETECIENTOS",
  "OCHOCIENTOS",
  "NOVECIENTOS",
];

function menorDe100(n: number): string {
  if (n < 10) return UNIDADES[n];
  if (n <= 29) return ESPECIALES[n] ?? "";
  const decena = Math.floor(n / 10);
  const unidad = n % 10;
  return unidad === 0 ? DECENAS[decena] : `${DECENAS[decena]} Y ${UNIDADES[unidad]}`;
}

function menorDe1000(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  if (n < 100) return menorDe100(n);

  const centena = Math.floor(n / 100);
  const resto = n % 100;
  return resto === 0
    ? CENTENAS[centena]
    : `${CENTENAS[centena]} ${menorDe100(resto)}`;
}

function numeroALetrasEntero(n: number): string {
  if (n === 0) return "CERO";

  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1_000);
  const resto = n % 1_000;

  const partes: string[] = [];

  if (millones > 0) {
    partes.push(
      millones === 1
        ? "UN MILLÓN"
        : `${menorDe1000(millones)} MILLONES`
    );
  }

  if (miles > 0) {
    partes.push(miles === 1 ? "MIL" : `${menorDe1000(miles)} MIL`);
  }

  if (resto > 0) {
    partes.push(menorDe1000(resto));
  }

  return partes.join(" ");
}

function montoALetras(valor: number): string {
  const seguro = Number.isFinite(valor) ? Math.max(0, valor) : 0;
  const entero = Math.floor(seguro);
  const centavos = Math.round((seguro - entero) * 100);

  let letras = numeroALetrasEntero(entero);

  // Ajuste habitual antes de "PESOS".
  letras = letras
    .replace(/\bVEINTIUNO$/, "VEINTIÚN")
    .replace(/\bY UNO$/, "Y UN")
    .replace(/\bUNO$/, "UN");

  return `${letras} PESOS CON ${dosDigitos(centavos)}/100`;
}

function ajustarFuentePorLongitud(
  texto: string,
  base: number,
  limite: number,
  minimo: number
) {
  if (texto.length <= limite) return base;
  const factor = limite / texto.length;
  return Math.max(minimo, Number((base * factor).toFixed(2)));
}

function ControlOffset({
  etiqueta,
  valor,
  onChange,
}: {
  etiqueta: string;
  valor: number;
  onChange: (nuevo: number) => void;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="mb-2 text-sm font-semibold text-amber-900">{etiqueta}</div>
      <label className="text-xs text-amber-800">
        Ajuste horizontal adicional (mm)
        <input
          type="number"
          step="0.5"
          min="-80"
          max="40"
          value={valor}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-900"
        />
      </label>
      <p className="mt-2 text-xs leading-5 text-amber-800">
        Negativo mueve a la izquierda · Positivo mueve a la derecha.
      </p>
    </div>
  );
}

function CampoCalibracion({
  etiqueta,
  valor,
  onChange,
}: {
  etiqueta: string;
  valor: Posicion;
  onChange: (nuevo: Posicion) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-slate-800">{etiqueta}</div>

      <div className="grid grid-cols-3 gap-3">
        <label className="text-xs text-slate-500">
          X (mm)
          <input
            type="number"
            step="0.5"
            min="-20"
            max="230"
            value={valor.x}
            onChange={(e) => onChange({ ...valor, x: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900"
          />
        </label>

        <label className="text-xs text-slate-500">
          Y (mm)
          <input
            type="number"
            step="0.5"
            value={valor.y}
            onChange={(e) => onChange({ ...valor, y: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900"
          />
        </label>

        <label className="text-xs text-slate-500">
          Tamaño
          <input
            type="number"
            step="0.5"
            min="6"
            max="18"
            value={valor.fontSize}
            onChange={(e) =>
              onChange({ ...valor, fontSize: Number(e.target.value) })
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900"
          />
        </label>
      </div>
    </div>
  );
}

export default function PruebaImpresionChequesPage() {
  const hoy = new Date();
  const hoyISO = `${hoy.getFullYear()}-${dosDigitos(hoy.getMonth() + 1)}-${dosDigitos(
    hoy.getDate()
  )}`;

  const [numeroCheque, setNumeroCheque] = useState("000386");
  const [fecha, setFecha] = useState(hoyISO);
  const [beneficiario, setBeneficiario] = useState("PROVEEDOR DE PRUEBA SRL");
  const [montoTexto, setMontoTexto] = useState("10620.00");
  const [concepto, setConcepto] = useState("Limpieza de trampas de grasa");
  const [mostrarGuia, setMostrarGuia] = useState(true);
  const [modoPapel, setModoPapel] = useState<"cheque" | "carta">("cheque");
  const [config, setConfig] = useState<Configuracion>(CONFIG_INICIAL);
  const [ajustesHorizontales, setAjustesHorizontales] =
    useState<AjustesHorizontales>(AJUSTES_HORIZONTALES_INICIALES);

  const monto = useMemo(() => {
    const limpio = montoTexto.replace(/,/g, "").trim();
    const n = Number(limpio);
    return Number.isFinite(n) ? n : 0;
  }, [montoTexto]);

  const letras = useMemo(() => montoALetras(monto), [monto]);
  const partesFecha = useMemo(() => formatearFechaISO(fecha), [fecha]);

  const fuenteBeneficiario = useMemo(
    () =>
      ajustarFuentePorLongitud(
        beneficiario,
        config.beneficiario.fontSize,
        38,
        8
      ),
    [beneficiario, config.beneficiario.fontSize]
  );

  const fuenteLetras = useMemo(
    () =>
      ajustarFuentePorLongitud(
        letras,
        config.letras.fontSize,
        72,
        7.5
      ),
    [letras, config.letras.fontSize]
  );

  const actualizarCampo = (
    campo: keyof Configuracion,
    nuevo: Posicion
  ) => {
    setConfig((prev) => ({ ...prev, [campo]: nuevo }));
  };

  const imprimir = () => {
    window.print();
  };

  const restablecer = () => {
    setConfig(CONFIG_INICIAL);
    setAjustesHorizontales(AJUSTES_HORIZONTALES_INICIALES);
  };

  const copiarConfiguracion = async () => {
    const payload = {
      banco: "Banco Popular",
      plantilla: "Popular - Colinas del Oeste",
      ancho_mm: CHEQUE_ANCHO_MM,
      alto_mm: CHEQUE_ALTO_MM,
      ...config,
      ajustes_horizontales_mm: ajustesHorizontales,
    };

    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    alert("Configuración copiada al portapapeles.");
  };

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: ${modoPapel === "cheque" ? "95mm 215mm" : "Letter"};
            margin: 0;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          body * {
            visibility: hidden !important;
          }

          #zona-impresion,
          #zona-impresion * {
            visibility: visible !important;
          }

          #zona-impresion {
            position: absolute !important;
            /*
              ORIENTACIÓN FÍSICA EPSON:
              - Papel en driver: 95 mm ancho x 215 mm alto (Portrait).
              - El lado DERECHO del cheque (fecha / monto) entra primero.
              - Por eso el diseño horizontal se rota 90° antihorario al imprimir.
            */
            left: 0 !important;
            top: 215mm !important;
            width: 215mm !important;
            height: 95mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
            overflow: visible !important;
            clip: auto !important;
            transform: rotate(-90deg) !important;
            transform-origin: top left !important;
          }

          .solo-pantalla {
            display: none !important;
          }
        }
      `}</style>

      <main className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Prueba de Impresión de Cheques
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Banco Popular · VAM Administración de Condominios
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={restablecer}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Restablecer posiciones
              </button>

              <button
                type="button"
                onClick={copiarConfiguracion}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Copiar configuración
              </button>

              <button
                type="button"
                onClick={imprimir}
                className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Imprimir prueba
              </button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-slate-900">
                  Datos del cheque
                </h2>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-700">
                    Banco
                    <input
                      value="Banco Popular"
                      disabled
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-500"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Número de cheque
                    <input
                      value={numeroCheque}
                      onChange={(e) => setNumeroCheque(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Fecha
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Beneficiario
                    <input
                      value={beneficiario}
                      onChange={(e) => setBeneficiario(e.target.value.toUpperCase())}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Monto RD$
                    <input
                      inputMode="decimal"
                      value={montoTexto}
                      onChange={(e) => setMontoTexto(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Monto en letras
                    <textarea
                      readOnly
                      value={letras}
                      rows={3}
                      className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Concepto
                    <textarea
                      value={concepto}
                      onChange={(e) => setConcepto(e.target.value)}
                      rows={2}
                      className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-slate-900">
                  Configuración de impresión
                </h2>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-700">
                    Tamaño de papel
                    <select
                      value={modoPapel}
                      onChange={(e) =>
                        setModoPapel(e.target.value as "cheque" | "carta")
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                    >
                      <option value="cheque">Banco Popular · entrada vertical 95 × 215 mm</option>
                      <option value="carta">Carta 8.5 × 11 pulgadas</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={mostrarGuia}
                      onChange={(e) => setMostrarGuia(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Mostrar guía visual en pantalla
                  </label>

                  <p className="rounded-lg bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800">
                    La guía nunca se imprime. Solo se imprimen fecha, beneficiario,
                    monto y monto en letras.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div className="overflow-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Vista previa
                    </h2>
                    <p className="text-xs text-slate-500">
                      Cheque físico: 215 × 95 mm · entrada a impresora: 95 × 215 mm
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Modo prueba
                  </span>
                </div>

                <div
                  id="zona-impresion"
                  className="relative mx-auto overflow-visible bg-white shadow-md"
                  style={{
                    width: `${CHEQUE_ANCHO_MM}mm`,
                    height: `${CHEQUE_ALTO_MM}mm`,
                    minWidth: `${CHEQUE_ANCHO_MM}mm`,
                    minHeight: `${CHEQUE_ALTO_MM}mm`,
                    border: mostrarGuia ? "1px solid #94a3b8" : "none",
                  }}
                >
                  {mostrarGuia && (
                    <div className="solo-pantalla absolute inset-0 bg-[#ead19e]">
                      <div className="absolute left-[5mm] top-[5mm] text-[9px] font-bold leading-tight text-slate-700">
                        CONDOMINIO RESIDENCIAL COLINAS DEL OESTE
                        <br />
                        RNC. 430289002
                      </div>

                      <div className="absolute right-[6mm] top-[5mm] text-right text-[9px] font-semibold text-slate-700">
                        No. {numeroCheque}
                      </div>

                      <div className="absolute left-[5mm] top-[30mm] text-[8px] font-semibold text-slate-700">
                        PÁGUESE CONTRA ESTE
                        <br />
                        CHEQUE A LA ORDEN DE:
                      </div>

                      <div className="absolute left-[42mm] right-[57mm] top-[38mm] border-b border-slate-500" />

                      <div className="absolute right-[49mm] top-[31mm] text-[15px] font-bold text-slate-700">
                        RD$
                      </div>

                      <div className="absolute left-[5mm] right-[5mm] top-[50mm] border-b border-slate-500" />

                      <div className="absolute right-[5mm] top-[47mm] text-[8px] font-bold text-slate-700">
                        PESOS
                      </div>

                      <div className="absolute bottom-[8mm] left-[82mm] right-[5mm] border-b border-slate-500" />

                      <div className="absolute bottom-[4mm] left-[143mm] text-[7px] text-slate-600">
                        FIRMA(S)
                      </div>

                      <div className="absolute bottom-[10mm] left-[5mm] text-[18px] font-bold italic text-blue-800">
                        POPULAR
                      </div>
                    </div>
                  )}

                  <div
                    className="absolute whitespace-nowrap font-medium text-black"
                    style={{
                      left: `${config.fecha.x}mm`,
                      top: `${config.fecha.y}mm`,
                      fontSize: `${config.fecha.fontSize}pt`,
                      letterSpacing: "0.8mm",
                    }}
                  >
                    {partesFecha.dia} {partesFecha.mes} {partesFecha.anio}
                  </div>

                  <div
                    className="absolute whitespace-nowrap font-semibold uppercase text-black"
                    style={{
                      left: `${config.beneficiario.x}mm`,
                      top: `${config.beneficiario.y}mm`,
                      fontSize: `${fuenteBeneficiario}pt`,
                      width: "212mm",
                      maxWidth: "212mm",
                      overflow: "visible",
                      textOverflow: "clip",
                      transform: `translateX(${ajustesHorizontales.beneficiario}mm)`,
                      transformOrigin: "left top",
                    }}
                  >
                    {beneficiario || " "}
                  </div>

                  <div
                    className="absolute whitespace-nowrap text-right font-semibold tabular-nums text-black"
                    style={{
                      left: `${config.monto.x}mm`,
                      top: `${config.monto.y}mm`,
                      fontSize: `${config.monto.fontSize}pt`,
                      width: "34mm",
                    }}
                  >
                    {formatoMoneda(monto)}
                  </div>

                  <div
                    className="absolute whitespace-nowrap font-semibold uppercase text-black"
                    style={{
                      left: `${config.letras.x}mm`,
                      top: `${config.letras.y}mm`,
                      fontSize: `${fuenteLetras}pt`,
                      width: "214mm",
                      maxWidth: "214mm",
                      overflow: "visible",
                      textOverflow: "clip",
                      transform: `translateX(${ajustesHorizontales.letras}mm)`,
                      transformOrigin: "left top",
                    }}
                  >
                    {letras}
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  <strong className="text-slate-800">Concepto:</strong>{" "}
                  {concepto || "—"}
                  <div className="mt-1 text-xs text-slate-500">
                    El concepto se conserva para VAM, pero no se imprime en el
                    frente del cheque.
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Calibración milimétrica
                    </h2>
                    <p className="text-xs text-slate-500">
                      X mueve horizontalmente · Y mueve verticalmente. X admite valores negativos para afinar el borde izquierdo.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <CampoCalibracion
                    etiqueta="Fecha"
                    valor={config.fecha}
                    onChange={(v) => actualizarCampo("fecha", v)}
                  />

                  <CampoCalibracion
                    etiqueta="Beneficiario"
                    valor={config.beneficiario}
                    onChange={(v) => actualizarCampo("beneficiario", v)}
                  />

                  <CampoCalibracion
                    etiqueta="Monto numérico"
                    valor={config.monto}
                    onChange={(v) => actualizarCampo("monto", v)}
                  />

                  <CampoCalibracion
                    etiqueta="Monto en letras"
                    valor={config.letras}
                    onChange={(v) => actualizarCampo("letras", v)}
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <ControlOffset
                    etiqueta="Beneficiario · margen izquierdo"
                    valor={ajustesHorizontales.beneficiario}
                    onChange={(valor) =>
                      setAjustesHorizontales((prev) => ({
                        ...prev,
                        beneficiario: valor,
                      }))
                    }
                  />

                  <ControlOffset
                    etiqueta="Monto en letras · margen izquierdo"
                    valor={ajustesHorizontales.letras}
                    onChange={(valor) =>
                      setAjustesHorizontales((prev) => ({
                        ...prev,
                        letras: valor,
                      }))
                    }
                  />
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-600">
                  <strong className="text-slate-800">Importante:</strong> estos dos
                  ajustes trabajan de forma independiente. Fecha y monto numérico no
                  se mueven. Si un nombre o monto en letras es muy largo, VAM reduce
                  ligeramente el tamaño de fuente para evitar que se corte al final.
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-900">
                <div className="font-semibold">Primera prueba recomendada</div>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>Seleccione papel Carta para la primera impresión.</li>
                  <li>Imprima sobre una hoja blanca a escala 100%.</li>
                  <li>Coloque la hoja encima del cheque y verifique contra luz.</li>
                  <li>Ajuste X/Y en pasos de 0.5 mm.</li>
                  <li>Cuando coincida, haga la primera prueba con un cheque real.</li>
                </ol>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
