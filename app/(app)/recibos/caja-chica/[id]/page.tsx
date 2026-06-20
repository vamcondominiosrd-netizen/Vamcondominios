"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type CajaChicaRecibo = {
  id: number;
  condominio_id: number | null;
  condominio: string | null;
  fecha: string | null;
  concepto: string | null;
  detalle_gasto: string | null;
  monto: number | null;
  responsable: string | null;
  comprobante: string | null;
  factura_url: string | null;
  estado: string | null;
  created_at: string | null;
};

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function numeroALetrasEntero(numero: number): string {
  const unidades = [
    "",
    "uno",
    "dos",
    "tres",
    "cuatro",
    "cinco",
    "seis",
    "siete",
    "ocho",
    "nueve",
    "diez",
    "once",
    "doce",
    "trece",
    "catorce",
    "quince",
    "dieciséis",
    "diecisiete",
    "dieciocho",
    "diecinueve",
  ];

  const decenas = [
    "",
    "",
    "veinte",
    "treinta",
    "cuarenta",
    "cincuenta",
    "sesenta",
    "setenta",
    "ochenta",
    "noventa",
  ];

  const centenas = [
    "",
    "ciento",
    "doscientos",
    "trescientos",
    "cuatrocientos",
    "quinientos",
    "seiscientos",
    "setecientos",
    "ochocientos",
    "novecientos",
  ];

  if (numero === 0) return "cero";
  if (numero === 100) return "cien";

  if (numero < 20) {
    return unidades[numero];
  }

  if (numero < 30) {
    if (numero === 20) return "veinte";
    return "veinti" + unidades[numero - 20];
  }

  if (numero < 100) {
    const d = Math.floor(numero / 10);
    const u = numero % 10;

    if (u === 0) return decenas[d];

    return `${decenas[d]} y ${unidades[u]}`;
  }

  if (numero < 1000) {
    const c = Math.floor(numero / 100);
    const resto = numero % 100;

    if (resto === 0) return centenas[c];

    return `${centenas[c]} ${numeroALetrasEntero(resto)}`;
  }

  if (numero < 1000000) {
    const miles = Math.floor(numero / 1000);
    const resto = numero % 1000;

    const textoMiles =
      miles === 1 ? "mil" : `${numeroALetrasEntero(miles)} mil`;

    if (resto === 0) return textoMiles;

    return `${textoMiles} ${numeroALetrasEntero(resto)}`;
  }

  if (numero < 1000000000) {
    const millones = Math.floor(numero / 1000000);
    const resto = numero % 1000000;

    const textoMillones =
      millones === 1
        ? "un millón"
        : `${numeroALetrasEntero(millones)} millones`;

    if (resto === 0) return textoMillones;

    return `${textoMillones} ${numeroALetrasEntero(resto)}`;
  }

  return String(numero);
}

function montoEnLetras(valor: number | null | undefined) {
  const monto = Number(valor || 0);
  const entero = Math.floor(monto);
  const centavos = Math.round((monto - entero) * 100);

  const letras = numeroALetrasEntero(entero).toUpperCase();
  const centavosTexto = String(centavos).padStart(2, "0");

  return `${letras} PESOS DOMINICANOS CON ${centavosTexto}/100`;
}

function fechaDominicana(fecha: string | null | undefined) {
  if (!fecha) return "-";

  const fechaLimpia = fecha.includes("T") ? fecha.split("T")[0] : fecha;
  const [anio, mes, dia] = fechaLimpia.split("-");

  if (!anio || !mes || !dia) return fecha;

  return `${dia}/${mes}/${anio}`;
}

function numeroRecibo(id: number | null | undefined) {
  return `CC-${String(id || 0).padStart(6, "0")}`;
}

export default function ReciboCajaChicaPage() {
  const params = useParams();
  const id = String(params?.id || "");

  const [recibo, setRecibo] = useState<CajaChicaRecibo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const [condominioActivoId, setCondominioActivoId] = useState("");
  const [condominioActivoNombre, setCondominioActivoNombre] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    const idLocal = localStorage.getItem("condominio_id") || "";
    const nombreLocal = localStorage.getItem("condominio_nombre") || "";
    const logoLocal = localStorage.getItem("condominio_logo_url") || "";

    setCondominioActivoId(idLocal);
    setCondominioActivoNombre(nombreLocal);
    setLogoUrl(logoLocal);

    if (id) {
      cargarRecibo(id, idLocal);
    }
  }, [id]);

  async function cargarRecibo(idRecibo: string, idCondominioActivo: string) {
    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("caja_chica")
      .select(
        "id, condominio_id, condominio, fecha, concepto, detalle_gasto, monto, responsable, comprobante, factura_url, estado, created_at"
      )
      .eq("id", Number(idRecibo))
      .single();

    setLoading(false);

    if (error) {
      setMensaje("No se pudo cargar el recibo: " + error.message);
      setRecibo(null);
      return;
    }

    if (
      idCondominioActivo &&
      data?.condominio_id &&
      Number(data.condominio_id) !== Number(idCondominioActivo)
    ) {
      setMensaje(
        "Este recibo no pertenece al condominio activo. Verifique que esté en el condominio correcto."
      );
      setRecibo(null);
      return;
    }

    setRecibo(data as CajaChicaRecibo);
  }

  function imprimir() {
    window.print();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-4">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl border shadow-sm p-6">
          Cargando recibo de caja chica...
        </div>
      </main>
    );
  }

  if (mensaje || !recibo) {
    return (
      <main className="min-h-screen bg-slate-100 p-4">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl border shadow-sm p-6">
          <h1 className="text-xl font-black text-red-700">
            Recibo no disponible
          </h1>

          <p className="text-slate-600 mt-2">
            {mensaje || "No se encontró el recibo solicitado."}
          </p>

          <Link
            href="/mobile/admin/caja-chica"
            className="inline-block mt-5 bg-blue-700 text-white px-5 py-3 rounded-xl font-bold"
          >
            Volver a Caja Chica
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-4 print:space-y-0">
        <div className="flex justify-between items-center print:hidden">
          <Link
            href="/mobile/admin/caja-chica"
            className="bg-slate-700 text-white px-4 py-2 rounded-xl font-bold"
          >
            ← Volver
          </Link>

          <button
            onClick={imprimir}
            className="bg-blue-700 text-white px-4 py-2 rounded-xl font-bold"
          >
            Imprimir / PDF
          </button>
        </div>

        <section className="bg-white border shadow-sm rounded-2xl p-8 print:shadow-none print:border-none print:rounded-none">
          <div className="flex justify-between items-start gap-4 border-b pb-5">
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-20 w-20 object-contain"
                />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-blue-800 text-white flex items-center justify-center font-black text-2xl">
                  CC
                </div>
              )}

              <div>
                <h1 className="text-2xl font-black text-slate-900">
                  RECIBO DE DESEMBOLSO
                </h1>

                <p className="text-sm text-slate-600 mt-1">
                  Caja Chica del Condominio
                </p>

                <p className="font-bold text-slate-800 mt-1">
                  {recibo.condominio ||
                    condominioActivoNombre ||
                    "Condominio no identificado"}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase text-slate-500">No. Recibo</p>
              <p className="text-2xl font-black text-blue-800">
                {numeroRecibo(recibo.id)}
              </p>

              <p className="text-xs uppercase text-slate-500 mt-3">Fecha</p>
              <p className="font-bold text-slate-800">
                {fechaDominicana(recibo.fecha)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            <div className="border rounded-2xl p-4">
              <p className="text-xs uppercase text-slate-500">Concepto</p>
              <p className="text-lg font-black text-slate-900 mt-1">
                {recibo.concepto || "-"}
              </p>
            </div>

            <div className="border rounded-2xl p-4">
              <p className="text-xs uppercase text-slate-500">
                Monto desembolsado
              </p>
              <p className="text-2xl font-black text-red-700 mt-1">
                RD$ {dinero(recibo.monto)}
              </p>
            </div>

            <div className="border rounded-2xl p-4">
              <p className="text-xs uppercase text-slate-500">Pagado a</p>
              <p className="font-bold text-slate-900 mt-1">
                {recibo.responsable || "-"}
              </p>
            </div>

            <div className="border rounded-2xl p-4">
              <p className="text-xs uppercase text-slate-500">
                Comprobante / factura
              </p>
              <p className="font-bold text-slate-900 mt-1">
                {recibo.comprobante || "-"}
              </p>
            </div>

            <div className="border rounded-2xl p-4">
              <p className="text-xs uppercase text-slate-500">Estado</p>
              <p className="font-bold text-green-700 mt-1">
                {recibo.estado || "registrado"}
              </p>
            </div>

            <div className="border rounded-2xl p-4">
              <p className="text-xs uppercase text-slate-500">
                Fecha de registro
              </p>
              <p className="font-bold text-slate-900 mt-1">
                {fechaDominicana(recibo.created_at)}
              </p>
            </div>
          </div>

          <div className="border rounded-2xl p-4 mt-5">
            <p className="text-xs uppercase text-slate-500">
              Monto pagado en letras
            </p>

            <p className="font-black text-slate-900 mt-2">
              {montoEnLetras(recibo.monto)}
            </p>
          </div>

          <div className="border rounded-2xl p-4 mt-5 min-h-28">
            <p className="text-xs uppercase text-slate-500">
              Detalle del desembolso
            </p>

            <p className="text-slate-800 mt-2 whitespace-pre-wrap">
              {recibo.detalle_gasto || "-"}
            </p>
          </div>

          {recibo.factura_url && (
            <div className="print:hidden mt-5">
              <a
                href={recibo.factura_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-slate-900 text-white px-5 py-3 rounded-xl font-bold"
              >
                Ver soporte / factura
              </a>
            </div>
          )}

          <div className="grid grid-cols-2 gap-10 mt-16">
            <div className="text-center">
              <div className="border-t border-slate-700 pt-2">
                <p className="font-bold">Entregado por</p>
                <p className="text-sm text-slate-500">
                  Administración / Caja Chica
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="border-t border-slate-700 pt-2">
                <p className="font-bold">Recibido por</p>
                <p className="text-sm text-slate-500">
                  {recibo.responsable || "Pagado a"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t pt-4 text-xs text-slate-500 text-center">
            Este documento sirve como constancia del desembolso realizado desde
            caja chica. Generado por VAM Administradora de Condominios.
          </div>
        </section>
      </div>
    </main>
  );
}