"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Printer, ReceiptText, RefreshCw } from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

type CajaChica = {
  id: number;
  fecha: string | null;
  concepto: string | null;
  detalle_gasto: string | null;
  monto: number | string | null;
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

function fechaRD(valor?: string | null) {
  if (!valor) return "-";

  const fecha = String(valor).split("T")[0];
  const partes = fecha.split("-");

  if (partes.length !== 3) return fecha;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function estadoLegible(valor?: string | null) {
  if (!valor) return "Registrado";

  return String(valor)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

export default function DesembolsoCajaChicaPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  /*
    Este reporte debe estar ubicado en:
    app/(app)/caja-chica/reporte/Desembolso-caja-chica/[id]/page.tsx

    Ruta esperada:
    /caja-chica/reporte/Desembolso-caja-chica/15

    También acepta, como respaldo:
    /caja-chica/reporte/Desembolso-caja-chica?id=15
  */
  const idDesdeRuta = params?.id;
  const idRuta = Array.isArray(idDesdeRuta) ? idDesdeRuta[0] : idDesdeRuta;
  const idQuery = searchParams.get("id");
  const id = useMemo(() => String(idRuta || idQuery || ""), [idRuta, idQuery]);

  const [registro, setRegistro] = useState<CajaChica | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorTexto, setErrorTexto] = useState("");

  useEffect(() => {
    cargarRegistro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cargarRegistro() {
    try {
      setLoading(true);
      setErrorTexto("");
      setRegistro(null);

      const idNumerico = Number(id);

      if (!idNumerico) {
        setErrorTexto(
          "No se recibió un ID válido para el reporte. Abra el reporte desde el botón del gasto en Caja Chica."
        );
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

      if (error) {
        setErrorTexto("No se pudo cargar el desembolso: " + error.message);
        setLoading(false);
        return;
      }

      setRegistro(data as CajaChica);
      setLoading(false);
    } catch (err: any) {
      setErrorTexto(err?.message || "Error cargando el reporte.");
      setLoading(false);
    }
  }

  function imprimir() {
    window.print();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href="/caja-chica"
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Caja Chica
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cargarRegistro}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refrescar
            </button>

            <button
              type="button"
              onClick={imprimir}
              disabled={!registro}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-purple-800 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
          </div>
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
          <section className="mx-auto bg-white p-6 shadow print:p-0 print:shadow-none">
            <div className="comprobante mx-auto max-w-3xl rounded-xl border border-slate-900 bg-white p-5 print:rounded-none">
              <div className="flex items-start justify-between gap-4 border-b border-slate-900 pb-3">
                <div>
                  <div className="text-lg font-black uppercase leading-tight">
                    VAM Administradora de Condominios
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-base font-bold">
                    <ReceiptText className="h-5 w-5 print:hidden" />
                    Constancia de Desembolso de Caja Chica
                  </div>
                </div>

                <div className="min-w-[130px] rounded-lg border border-slate-900 px-3 py-2 text-center">
                  <p className="text-[10px] font-black uppercase text-slate-600">
                    No. Registro
                  </p>
                  <p className="mt-1 text-sm font-black">
                    CC-{String(registro.id).padStart(5, "0")}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <CampoReporte
                  label="Condominio"
                  value={registro.condominio || "-"}
                  className="sm:col-span-1"
                />

                <CampoReporte
                  label="Fecha Registro"
                  value={fechaRD(registro.fecha)}
                />

                <CampoReporte
                  label="Estado"
                  value={estadoLegible(registro.estado)}
                />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <CampoReporte
                  label="Pagado a / Responsable"
                  value={registro.responsable || "-"}
                  className="sm:col-span-2"
                />

                <CampoReporte
                  label="Monto"
                  value={`RD$ ${dinero(registro.monto)}`}
                  valueClassName="text-right text-base font-black"
                />
              </div>

              <CampoReporte
                label="Concepto"
                value={registro.concepto || "-"}
                className="mt-3"
                multiline
              />

              {registro.detalle_gasto && (
                <CampoReporte
                  label="Detalle"
                  value={registro.detalle_gasto}
                  className="mt-3"
                  multiline
                  compact
                />
              )}

              {registro.comprobante && (
                <CampoReporte
                  label="Comprobante / Factura"
                  value={registro.comprobante}
                  className="mt-3"
                />
              )}

              {registro.factura_url && (
                <div className="mt-3 text-sm print:hidden">
                  <p className="mb-1 font-black uppercase text-slate-900">
                    Soporte adjunto
                  </p>
                  <a
                    href={registro.factura_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    Ver factura / soporte
                  </a>
                </div>
              )}

              <div className="mt-11 grid grid-cols-2 gap-10 text-center text-sm">
                <div>
                  <div className="border-t border-slate-900 pt-2 font-bold">
                    Aprobado por
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    Firma autorizada
                  </div>
                </div>

                <div>
                  <div className="border-t border-slate-900 pt-2 font-bold">
                    Recibido por
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    Firma del responsable
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-300 pt-3 text-center text-xs text-slate-600">
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
            margin: 12mm;
          }

          html,
          body {
            background: white !important;
          }

          .comprobante {
            page-break-inside: avoid;
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}

function CampoReporte({
  label,
  value,
  className = "",
  valueClassName = "",
  multiline = false,
  compact = false,
}: {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
  multiline?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={className}>
      <p className="mb-1 text-[11px] font-black uppercase text-slate-900">
        {label}
      </p>

      <div
        className={`rounded-lg border border-slate-300 px-3 py-2 text-sm leading-snug ${
          multiline
            ? compact
              ? "min-h-[38px] whitespace-pre-wrap"
              : "min-h-[52px] whitespace-pre-wrap"
            : "min-h-[34px]"
        } ${valueClassName}`}
      >
        {value}
      </div>
    </div>
  );
}
