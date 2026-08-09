"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, ReceiptText } from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

type CajaChica = {
  id: number;
  fecha: string;
  concepto: string;
  detalle_gasto: string | null;
  monto: number;
  responsable: string | null;
  comprobante: string | null;
  condominio: string | null;
  estado: string | null;
  created_at: string | null;
  factura_url: string | null;
  condominio_id: number | null;
};

function dinero(valor: number | string | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fechaCorta(valor?: string | null) {
  if (!valor) return "-";

  const fecha = String(valor).split("T")[0];
  const partes = fecha.split("-");

  if (partes.length !== 3) return fecha;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export default function DesembolsoCajaChicaPage() {
  const params = useParams();
  const id = params?.id as string;

  const [registro, setRegistro] = useState<CajaChica | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorTexto, setErrorTexto] = useState("");

  useEffect(() => {
    if (!id) return;

    cargarRegistro();
  }, [id]);

  async function cargarRegistro() {
    try {
      setLoading(true);
      setErrorTexto("");

      const idNumerico = Number(id);

      if (!idNumerico) {
        setErrorTexto("No se recibió un ID válido para el reporte.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("caja_chica")
        .select(
          "id, fecha, concepto, detalle_gasto, monto, responsable, comprobante, condominio, estado, created_at, factura_url, condominio_id"
        )
        .eq("id", idNumerico)
        .single();

      setLoading(false);

      if (error) {
        setErrorTexto("No se pudo cargar el desembolso: " + error.message);
        return;
      }

      setRegistro(data as CajaChica);
    } catch (err: any) {
      setLoading(false);
      setErrorTexto(err?.message || "Error cargando el reporte.");
    }
  }

  function imprimir() {
    window.print();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link
            href="/finanzas/caja-chica"
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>

          <button
            type="button"
            onClick={imprimir}
            disabled={!registro}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2 text-sm font-bold text-white hover:bg-purple-800 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow">
            Cargando reporte de desembolso...
          </div>
        ) : errorTexto ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700 shadow">
            {errorTexto}
          </div>
        ) : !registro ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow">
            No se encontró el desembolso solicitado.
          </div>
        ) : (
          <section className="mx-auto bg-white p-8 shadow print:shadow-none">
            <div className="comprobante mx-auto max-w-3xl border border-slate-900 p-6">
              <div className="border-b border-slate-900 pb-3 text-center">
                <div className="text-lg font-black uppercase">
                  VAM Administradora de Condominios
                </div>

                <div className="mt-1 flex items-center justify-center gap-2 text-base font-bold">
                  <ReceiptText className="h-5 w-5 print:hidden" />
                  Constancia de Desembolso de Caja Chica
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-4 text-sm">
                <div className="col-span-3 sm:col-span-1">
                  <p className="font-black">Condominio</p>
                  <div className="mt-1 min-h-8 border-b border-slate-400 px-1 py-1">
                    {registro.condominio || "-"}
                  </div>
                </div>

                <div>
                  <p className="font-black">Fecha Registro</p>
                  <div className="mt-1 min-h-8 border-b border-slate-400 px-1 py-1">
                    {fechaCorta(registro.fecha)}
                  </div>
                </div>

                <div>
                  <p className="font-black">No. Registro</p>
                  <div className="mt-1 min-h-8 border-b border-slate-400 px-1 py-1">
                    CC-{String(registro.id).padStart(5, "0")}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="col-span-2">
                  <p className="font-black">Pagado a / Responsable</p>
                  <div className="mt-1 min-h-8 border-b border-slate-400 px-1 py-1">
                    {registro.responsable || "-"}
                  </div>
                </div>

                <div>
                  <p className="font-black">Monto</p>
                  <div className="mt-1 min-h-8 border-b border-slate-400 px-1 py-1 text-base font-black">
                    RD$ {dinero(registro.monto)}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm">
                <p className="font-black">Concepto</p>
                <div className="mt-1 min-h-12 whitespace-pre-wrap border-b border-slate-400 px-1 py-2">
                  {registro.concepto || "-"}
                </div>
              </div>

              {registro.detalle_gasto && (
                <div className="mt-4 text-sm">
                  <p className="font-black">Detalle</p>
                  <div className="mt-1 min-h-12 whitespace-pre-wrap border-b border-slate-400 px-1 py-2">
                    {registro.detalle_gasto}
                  </div>
                </div>
              )}

              {registro.comprobante && (
                <div className="mt-4 text-sm">
                  <p className="font-black">Comprobante / Factura</p>
                  <div className="mt-1 min-h-8 border-b border-slate-400 px-1 py-1">
                    {registro.comprobante}
                  </div>
                </div>
              )}

              <div className="mt-12 grid grid-cols-2 gap-10 text-center text-sm">
                <div>
                  <div className="border-t border-slate-900 pt-2 font-bold">
                    Aprobado por
                  </div>
                </div>

                <div>
                  <div className="border-t border-slate-900 pt-2 font-bold">
                    Recibido por
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-300 pt-3 text-center text-xs text-slate-600">
                Este documento sirve como constancia del desembolso realizado
                desde caja chica.
              </div>
            </div>
          </section>
        )}
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.45in;
          }

          body {
            background: white !important;
          }

          .comprobante {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}