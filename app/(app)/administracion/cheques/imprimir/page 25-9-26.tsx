"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

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
  comentario: Posicion;
};

type AjustesHorizontales = {
  beneficiario: number;
  letras: number;
};

type PlantillaGuardada = {
  id: string;
  nombre: string;
  config: Configuracion;
  ajustesHorizontales: AjustesHorizontales;
  actualizadoEn: string;
};

type DatosChequePago = {
  solicitud_id: number;
  numero_solicitud: string;
  beneficiario: string;
  beneficiario_manual?: string;
  comentario?: string;
  monto: number;
  fecha: string;
  numero_cheque: string;
  concepto: string;
  banco: string;
  cuenta_bancaria_id: number;
  numero_cuenta: string;
  condominio: string;
  es_reimpresion?: boolean;
};

const CONFIG_INICIAL: Configuracion = {
  // Calibración física validada con Epson L4160 + cheque Banco Popular.
  fecha: { x: 147, y: 30.5, fontSize: 18 },
  beneficiario: { x: -11, y: 53.5, fontSize: 16 },
  monto: { x: 128, y: 52.5, fontSize: 16 },
  letras: { x: -20, y: 65.5, fontSize: 16 },

  // Comentario opcional: zona inferior izquierda del cheque.
  // Se deja calibrable porque algunas impresoras pueden variar algunos mm.
  comentario: { x: -80, y: 105, fontSize: 10.5 },
};

const AJUSTES_HORIZONTALES_INICIALES: AjustesHorizontales = {
  beneficiario: -22,
  letras: -50,
};

const CHEQUE_ANCHO_MM = 215;
const CHEQUE_ALTO_MM = 95;

const PLANTILLA_ID = "BANCO_POPULAR_EPSON_L4160_215X95_V1";
const PLANTILLA_NOMBRE = "Banco Popular · Epson L4160";
const PLANTILLA_STORAGE_KEY = `vam-cheque-plantilla:${PLANTILLA_ID}`;
const DATOS_PAGO_STORAGE_KEY = "vam_cheque_impresion_actual";

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
            min="-100"
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
  const [beneficiarioManual, setBeneficiarioManual] = useState("");
  const [comentario, setComentario] = useState("");
  const [montoTexto, setMontoTexto] = useState("10620.00");
  const [concepto, setConcepto] = useState("Limpieza de trampas de grasa");
  const [mostrarGuia, setMostrarGuia] = useState(true);
  const [modoPapel, setModoPapel] = useState<"cheque" | "carta">("cheque");
  const [config, setConfig] = useState<Configuracion>(CONFIG_INICIAL);
  const [ajustesHorizontales, setAjustesHorizontales] =
    useState<AjustesHorizontales>(AJUSTES_HORIZONTALES_INICIALES);
  const [modoCalibracion, setModoCalibracion] = useState(false);
  const [plantillaGuardada, setPlantillaGuardada] = useState(false);
  const [datosPago, setDatosPago] = useState<DatosChequePago | null>(null);
  const [pendienteConfirmarImpresion, setPendienteConfirmarImpresion] =
    useState(false);
  const [registrandoImpresion, setRegistrandoImpresion] = useState(false);
  const [impresionConfirmada, setImpresionConfirmada] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DATOS_PAGO_STORAGE_KEY);
      if (!raw) return;

      const datos = JSON.parse(raw) as DatosChequePago;

      if (datos.beneficiario) {
        setBeneficiario(String(datos.beneficiario).toUpperCase());
      }

      if (datos.beneficiario_manual) {
        setBeneficiarioManual(
          String(datos.beneficiario_manual).toUpperCase(),
        );
      } else {
        setBeneficiarioManual("");
      }

      if (datos.comentario) {
        setComentario(String(datos.comentario).slice(0, 100));
      } else {
        setComentario("");
      }

      if (Number(datos.monto) > 0) {
        setMontoTexto(String(Number(datos.monto).toFixed(2)));
      }

      if (datos.fecha) {
        setFecha(String(datos.fecha).split("T")[0]);
      }

      if (datos.numero_cheque) {
        setNumeroCheque(String(datos.numero_cheque));
      }

      if (datos.concepto) {
        setConcepto(String(datos.concepto));
      }

      setDatosPago(datos);
    } catch (error) {
      console.error("No fue posible cargar los datos del cheque para impresión:", error);
    }
  }, []);

  useEffect(() => {
    try {
      const guardada = localStorage.getItem(PLANTILLA_STORAGE_KEY);
      if (!guardada) return;

      const parsed = JSON.parse(guardada) as PlantillaGuardada;
      if (parsed?.config && parsed?.ajustesHorizontales) {
        setConfig({
          fecha: parsed.config.fecha || CONFIG_INICIAL.fecha,
          beneficiario:
            parsed.config.beneficiario || CONFIG_INICIAL.beneficiario,
          monto: parsed.config.monto || CONFIG_INICIAL.monto,
          letras: parsed.config.letras || CONFIG_INICIAL.letras,
          comentario:
            parsed.config.comentario || CONFIG_INICIAL.comentario,
        });
        setAjustesHorizontales(parsed.ajustesHorizontales);
        setPlantillaGuardada(true);
      }
    } catch {
      // Si hay una plantilla local dañada, usamos la calibración validada por defecto.
    }
  }, []);

  const beneficiarioCheque = useMemo(() => {
    const manual = beneficiarioManual.trim();

    return manual
      ? manual.toUpperCase()
      : String(beneficiario || "").trim().toUpperCase();
  }, [beneficiarioManual, beneficiario]);

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
        beneficiarioCheque,
        config.beneficiario.fontSize,
        34,
        9
      ),
    [beneficiarioCheque, config.beneficiario.fontSize]
  );

  const fuenteLetras = useMemo(
    () =>
      ajustarFuentePorLongitud(
        letras,
        config.letras.fontSize,
        58,
        9
      ),
    [letras, config.letras.fontSize]
  );

  const fuenteComentario = useMemo(
    () =>
      ajustarFuentePorLongitud(
        comentario.trim(),
        config.comentario.fontSize,
        55,
        6.5
      ),
    [comentario, config.comentario.fontSize]
  );

  const actualizarCampo = (
    campo: keyof Configuracion,
    nuevo: Posicion
  ) => {
    setConfig((prev) => ({ ...prev, [campo]: nuevo }));
  };

  const imprimir = () => {
    window.print();

    // El navegador no puede saber con certeza si el usuario imprimió o
    // canceló el diálogo. Por auditoría, VAM pide una confirmación explícita.
    if (datosPago?.solicitud_id) {
      setPendienteConfirmarImpresion(true);
      setImpresionConfirmada(false);
    }
  };

  async function confirmarChequeImpreso() {
    if (!datosPago?.solicitud_id) return;

    try {
      setRegistrandoImpresion(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Buscar el cheque vigente de esta solicitud. Una solicitud puede
      // conservar cheques anulados en histórico, pero solo uno activo.
      const { data: chequeActual, error: lecturaError } = await supabase
        .from("cheques_emitidos")
        .select(
          "id, solicitud_pago_id, numero_cheque, estado",
        )
        .eq("solicitud_pago_id", datosPago.solicitud_id)
        .neq("estado", "ANULADO")
        .maybeSingle();

      if (lecturaError) {
        throw new Error(
          "No fue posible consultar el cheque vigente: " +
            lecturaError.message,
        );
      }

      let chequeId: number;

      if (chequeActual?.id) {
        // Reimpresión del mismo cheque. Actualizamos únicamente los datos
        // documentales que todavía corresponden al cheque antes del pago.
        const { data: chequeActualizado, error: updateError } = await supabase
          .from("cheques_emitidos")
          .update({
            cuenta_bancaria_id: datosPago.cuenta_bancaria_id,
            numero_cheque: datosPago.numero_cheque,
            fecha_emision: datosPago.fecha,
            beneficiario: beneficiarioCheque,
            monto: Number(datosPago.monto || 0),
            concepto: datosPago.concepto || null,
            comentario: comentario.trim() || null,
            estado: "IMPRESO",
          })
          .eq("id", chequeActual.id)
          .select("id")
          .single();

        if (updateError) {
          throw new Error(
            "No fue posible actualizar el cheque para reimpresión: " +
              updateError.message,
          );
        }

        chequeId = Number(chequeActualizado.id);
      } else {
        // Primera impresión: se crea el documento de cheque vinculado a la
        // solicitud. Esto NO registra pago ni movimiento bancario.
        const { data: chequeCreado, error: insertError } = await supabase
          .from("cheques_emitidos")
          .insert({
            solicitud_pago_id: datosPago.solicitud_id,
            condominio_id: Number(
              localStorage.getItem("condominio_id") || 0,
            ),
            cuenta_bancaria_id: datosPago.cuenta_bancaria_id,
            numero_cheque: datosPago.numero_cheque,
            fecha_emision: datosPago.fecha,
            beneficiario: beneficiarioCheque,
            monto: Number(datosPago.monto || 0),
            concepto: datosPago.concepto || null,
            comentario: comentario.trim() || null,
            estado: "IMPRESO",
            emitido_por: user?.id || null,
          })
          .select("id")
          .single();

        if (insertError) {
          throw new Error(
            "No fue posible registrar el cheque emitido: " +
              insertError.message,
          );
        }

        chequeId = Number(chequeCreado.id);
      }

      const { count, error: conteoError } = await supabase
        .from("cheques_impresiones")
        .select("id", { count: "exact", head: true })
        .eq("cheque_id", chequeId);

      if (conteoError) {
        throw new Error(
          "No fue posible verificar el historial de impresión: " +
            conteoError.message,
        );
      }

      const tipoImpresion =
        Number(count || 0) > 0 ? "REIMPRESION" : "IMPRESION";

      const { error: impresionError } = await supabase
        .from("cheques_impresiones")
        .insert({
          cheque_id: chequeId,
          tipo: tipoImpresion,
          impreso_por: user?.id || null,
        });

      if (impresionError) {
        throw new Error(
          "El cheque fue registrado, pero no se pudo guardar el historial de impresión: " +
            impresionError.message,
        );
      }

      setPendienteConfirmarImpresion(false);
      setImpresionConfirmada(true);

      const actualizado = {
        ...datosPago,
        beneficiario_manual:
          beneficiarioCheque !==
          String(datosPago.beneficiario || "").trim().toUpperCase()
            ? beneficiarioCheque
            : "",
        comentario: comentario.trim(),
        es_reimpresion: true,
      };

      localStorage.setItem(
        DATOS_PAGO_STORAGE_KEY,
        JSON.stringify(actualizado),
      );
      setDatosPago(actualizado);
    } catch (error: any) {
      alert(
        error?.message ||
          "No fue posible registrar la impresión del cheque.",
      );
    } finally {
      setRegistrandoImpresion(false);
    }
  }

  const restablecer = () => {
    setConfig(CONFIG_INICIAL);
    setAjustesHorizontales(AJUSTES_HORIZONTALES_INICIALES);
  };

  const guardarPlantilla = () => {
    const payload: PlantillaGuardada = {
      id: PLANTILLA_ID,
      nombre: PLANTILLA_NOMBRE,
      config,
      ajustesHorizontales,
      actualizadoEn: new Date().toISOString(),
    };

    localStorage.setItem(PLANTILLA_STORAGE_KEY, JSON.stringify(payload));
    setPlantillaGuardada(true);
    alert("Plantilla de impresión guardada en este equipo.");
  };

  const restaurarPlantillaValidada = () => {
    setConfig(CONFIG_INICIAL);
    setAjustesHorizontales(AJUSTES_HORIZONTALES_INICIALES);
    localStorage.removeItem(PLANTILLA_STORAGE_KEY);
    setPlantillaGuardada(false);
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
        @media screen {
          .solo-impresion {
            position: fixed !important;
            left: -10000px !important;
            top: 0 !important;
            pointer-events: none !important;
          }
        }

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
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {datosPago ? "Impresión de Cheque" : "Prueba de Impresión de Cheques"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Banco Popular · VAM Administración de Condominios
              </p>
              {datosPago && (
                <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                  Solicitud {datosPago.numero_solicitud} · {datosPago.banco}
                  {datosPago.numero_cuenta ? ` · Cuenta ${datosPago.numero_cuenta}` : ""}
                  {datosPago.condominio ? ` · ${datosPago.condominio}` : ""}
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                  Plantilla: {PLANTILLA_NOMBRE}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 font-semibold ${
                    plantillaGuardada
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {plantillaGuardada ? "Calibración guardada" : "Calibración validada"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {modoCalibracion && (
                <button
                  type="button"
                  onClick={restaurarPlantillaValidada}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Restaurar calibración validada
                </button>
              )}

              <button
                type="button"
                onClick={() => setModoCalibracion((v) => !v)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {modoCalibracion ? "Cerrar calibración" : "Calibrar plantilla"}
              </button>

              <button
                type="button"
                onClick={imprimir}
                className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                {datosPago
                  ? datosPago.es_reimpresion
                    ? "Reimprimir cheque"
                    : "Imprimir cheque"
                  : "Imprimir prueba"}
              </button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
                    Proveedor de la solicitud
                    <input
                      value={beneficiario}
                      readOnly
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-600"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Beneficiario opcional del cheque
                    <input
                      value={beneficiarioManual}
                      onChange={(e) =>
                        setBeneficiarioManual(e.target.value.toUpperCase())
                      }
                      className="mt-1 w-full rounded-lg border border-blue-300 bg-blue-50/40 px-3 py-2 text-slate-900"
                      placeholder="Dejar vacío para usar el proveedor"
                    />
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Si se completa, este nombre sustituye solamente al
                      beneficiario impreso en el cheque. No cambia el proveedor
                      de la solicitud.
                    </p>
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

                  <label className="block text-sm font-medium text-slate-700">
                    Comentario opcional para imprimir
                    <textarea
                      value={comentario}
                      onChange={(e) =>
                        setComentario(e.target.value.slice(0, 100))
                      }
                      rows={2}
                      maxLength={100}
                      className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="Ej.: Pago factura 458 / Servicio agosto 2026"
                    />
                    <div className="mt-1 flex justify-between text-xs text-slate-500">
                      <span>Se imprimirá en la zona inferior izquierda.</span>
                      <span>{comentario.length}/100</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
                    La guía nunca se imprime. Se imprimen fecha, beneficiario,
                    monto, monto en letras y el comentario opcional.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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

                {modoCalibracion ? (
                  <div className="solo-pantalla">
                    <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
                      Vista de calibración real: los cambios de X, Y, tamaño y márgenes
                      se reflejan aquí inmediatamente.
                    </div>

                    <div className="overflow-auto rounded-xl border border-slate-300 bg-slate-100 p-3">
                      <div
                        className="relative bg-white shadow-sm"
                        style={{
                          width: `${CHEQUE_ANCHO_MM}mm`,
                          height: `${CHEQUE_ALTO_MM}mm`,
                          minWidth: `${CHEQUE_ANCHO_MM}mm`,
                          minHeight: `${CHEQUE_ALTO_MM}mm`,
                          border: mostrarGuia ? "1px solid #94a3b8" : "none",
                        }}
                      >
                        {mostrarGuia && (
                          <div className="absolute inset-0 bg-[#ead19e]">
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
                          {beneficiarioCheque || " "}
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
                          className="absolute whitespace-nowrap font-medium uppercase text-black"
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

                        {comentario.trim() && (
                          <div
                            className="absolute whitespace-pre-wrap font-medium text-black"
                            style={{
                              left: `${config.comentario.x}mm`,
                              top: `${config.comentario.y}mm`,
                              fontSize: `${fuenteComentario}pt`,
                              width: "95mm",
                              maxWidth: "95mm",
                              lineHeight: 1.05,
                              overflow: "visible",
                            }}
                          >
                            {comentario.trim()}
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="mt-2 text-center text-[11px] text-slate-500">
                      Esta vista usa exactamente las mismas coordenadas de la impresión.
                      En pantallas pequeñas puede desplazarse horizontalmente.
                    </p>
                  </div>
                ) : (
                <div className="solo-pantalla mx-auto w-full max-w-[860px]">
                  <div
                    className="relative w-full overflow-hidden rounded-xl border border-slate-300 bg-[#ead19e] shadow-sm"
                    style={{ aspectRatio: "215 / 95" }}
                  >
                    {/* Vista visual responsiva para operación normal. */}
                    <div className="absolute left-[2.4%] top-[5%] text-[clamp(7px,0.75vw,10px)] font-bold leading-tight text-slate-700">
                      CONDOMINIO RESIDENCIAL COLINAS DEL OESTE
                      <br />
                      RNC. 430289002
                    </div>

                    <div className="absolute right-[2.5%] top-[5%] text-right text-[clamp(7px,0.75vw,10px)] font-semibold text-slate-700">
                      No. {numeroCheque}
                    </div>

                    <div className="absolute left-[2.4%] top-[34%] text-[clamp(6px,0.68vw,9px)] font-semibold leading-tight text-slate-700">
                      PÁGUESE CONTRA ESTE
                      <br />
                      CHEQUE A LA ORDEN DE:
                    </div>

                    <div className="absolute left-[20%] right-[26%] top-[45%] border-b border-slate-500" />

                    <div className="absolute right-[23%] top-[35%] text-[clamp(10px,1.15vw,16px)] font-bold text-slate-700">
                      RD$
                    </div>

                    <div className="absolute left-[2.4%] right-[2.4%] top-[57%] border-b border-slate-500" />

                    <div className="absolute right-[2.4%] top-[53%] text-[clamp(6px,0.7vw,9px)] font-bold text-slate-700">
                      PESOS
                    </div>

                    <div className="absolute bottom-[9%] left-[39%] right-[2.4%] border-b border-slate-500" />
                    <div className="absolute bottom-[4%] left-[66%] text-[clamp(6px,0.65vw,8px)] text-slate-600">
                      FIRMA(S)
                    </div>

                    <div className="absolute bottom-[10%] left-[2.5%] text-[clamp(15px,2vw,25px)] font-bold italic text-blue-800">
                      POPULAR
                    </div>

                    {/* Datos variables en posiciones físicas visuales del cheque */}
                    <div
                      className="absolute whitespace-nowrap font-medium text-black"
                      style={{
                        left: "79.1%",
                        top: "22%",
                        fontSize: "clamp(10px, 1.35vw, 18px)",
                        letterSpacing: "0.12em",
                      }}
                    >
                      {partesFecha.dia} {partesFecha.mes} {partesFecha.anio}
                    </div>

                    <div
                      className="absolute max-w-[49%] overflow-hidden text-ellipsis whitespace-nowrap font-semibold uppercase text-black"
                      style={{
                        left: "23.25%",
                        top: "41%",
                        fontSize: "clamp(9px, 1.22vw, 16px)",
                      }}
                      title={beneficiarioCheque}
                    >
                      {beneficiarioCheque || " "}
                    </div>

                    <div
                      className="absolute w-[17%] whitespace-nowrap text-right font-semibold tabular-nums text-black"
                      style={{
                        right: "2.4%",
                        top: "41%",
                        fontSize: "clamp(9px, 1.22vw, 16px)",
                      }}
                    >
                      {formatoMoneda(monto)}
                    </div>

                    <div
                      className="absolute max-w-[83%] overflow-hidden text-ellipsis whitespace-nowrap font-medium uppercase text-black"
                      style={{
                        left: "9.3%",
                        top: "53%",
                        fontSize: "clamp(8px, 1.05vw, 14px)",
                      }}
                      title={letras}
                    >
                      {letras}
                    </div>

                    {comentario.trim() && (
                      <div
                        className="absolute max-w-[47%] whitespace-pre-wrap font-medium leading-tight text-black"
                        style={{
                          left: "4%",
                          top: "73%",
                          fontSize: "clamp(6px, 0.72vw, 9px)",
                        }}
                        title={comentario}
                      >
                        {comentario}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Beneficiario
                      </div>
                      <div className="truncate text-sm font-semibold text-slate-800">
                        {beneficiarioCheque || "—"}
                      </div>
                    </div>

                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Monto
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        RD$ {formatoMoneda(monto)}
                      </div>
                    </div>

                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Fecha
                      </div>
                      <div className="text-sm font-semibold text-slate-800">
                        {partesFecha.dia}/{partesFecha.mes}/{partesFecha.anio}
                      </div>
                    </div>
                  </div>

                  <p className="mt-2 text-center text-[11px] text-slate-400">
                    Vista visual adaptada a la pantalla. La impresión conserva exactamente la calibración Banco Popular / Epson L4160.
                  </p>
                </div>
                )}

                <div
                  id="zona-impresion"
                  className="solo-impresion relative mx-auto overflow-visible bg-white shadow-md"
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
                    {beneficiarioCheque || " "}
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
                    className="absolute whitespace-nowrap font-medium uppercase text-black"
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

                  {comentario.trim() && (
                    <div
                      className="absolute whitespace-pre-wrap font-medium text-black"
                      style={{
                        left: `${config.comentario.x}mm`,
                        top: `${config.comentario.y}mm`,
                        fontSize: `${fuenteComentario}pt`,
                        width: "95mm",
                        maxWidth: "95mm",
                        lineHeight: 1.05,
                        overflow: "visible",
                      }}
                    >
                      {comentario.trim()}
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  <strong className="text-slate-800">Concepto:</strong>{" "}
                  {concepto || "—"}
                  <div className="mt-1 text-xs text-slate-500">
                    El concepto de la solicitud se conserva para VAM. Solo el
                    campo “Comentario opcional para imprimir” se imprime en la
                    zona inferior izquierda del cheque.
                  </div>
                </div>
              </div>

              {modoCalibracion && (
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Calibración milimétrica
                    </h2>
                    <p className="text-xs text-slate-500">
                      X mueve horizontalmente · Y mueve verticalmente. Los cambios se ven arriba en tiempo real.
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                    Vista real activa
                  </span>
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

                  <CampoCalibracion
                    etiqueta="Comentario inferior izquierdo"
                    valor={config.comentario}
                    onChange={(v) => actualizarCampo("comentario", v)}
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

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={guardarPlantilla}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                  >
                    Guardar plantilla
                  </button>
                  <button
                    type="button"
                    onClick={copiarConfiguracion}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Copiar configuración
                  </button>
                </div>
              </div>
              )}

              {datosPago && pendienteConfirmarImpresion && (
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                  <div className="font-black text-cyan-900">
                    ¿El cheque se imprimió correctamente?
                  </div>
                  <p className="mt-1 text-sm leading-6 text-cyan-800">
                    Confirme solamente después de verificar físicamente el cheque.
                    Esta acción cambia su estado a <strong>Cheque impreso</strong>.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={registrandoImpresion}
                      onClick={confirmarChequeImpreso}
                      className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-800 disabled:opacity-50"
                    >
                      {registrandoImpresion
                        ? "Registrando..."
                        : "Sí, registrar cheque impreso"}
                    </button>

                    <button
                      type="button"
                      disabled={registrandoImpresion}
                      onClick={() => setPendienteConfirmarImpresion(false)}
                      className="rounded-lg border border-cyan-300 bg-white px-4 py-2 text-sm font-bold text-cyan-800 hover:bg-cyan-100"
                    >
                      No, necesito corregir / reimprimir
                    </button>
                  </div>
                </div>
              )}

              {datosPago && impresionConfirmada && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                  <strong>Cheque impreso registrado.</strong> Al volver al listado,
                  VAM mostrará la acción <strong>Reimprimir cheque</strong>. Esto no
                  registra pago ni egreso bancario.
                </div>
              )}

              {datosPago && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  <strong>Control VAM:</strong> el estado “Cheque impreso” solo
                  confirma la emisión física del documento. No significa pago y no
                  afecta el banco. Después de las firmas de Tesorero y Presidente,
                  procese el pago, suba el cheque firmado y registre el egreso bancario.
                </div>
              )}

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-900">
                <div className="font-semibold">Configuración operativa</div>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Papel personalizado: 95 × 215 mm.</li>
                  <li>Orientación: Vertical / Portrait.</li>
                  <li>Escala: 100% / Tamaño real.</li>
                  <li>Sin “Ajustar a página / Fit to page”.</li>
                  <li>El cheque entra por el lado de fecha y monto.</li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
