"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type FondoCajaChica = {
  id: number;
  condominio_id: number | null;
  numero_fondo: number | null;
  condominio: string;
  fecha: string;
  tipo: string;
  monto: number;
  descripcion: string | null;
  responsable: string | null;
  created_at: string | null;
};

type DirectivaCondominio = {
  id: number;
  condominio_id: number;
  nombre: string;
  cargo: string;
  estado: string | null;
};

export default function ReporteFondoCajaChicaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const fondoId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [fondo, setFondo] = useState<FondoCajaChica | null>(null);
  const [tesorero, setTesorero] = useState<DirectivaCondominio | null>(null);
  const [presidente, setPresidente] =
    useState<DirectivaCondominio | null>(null);

  useEffect(() => {
    cargarReporte();
  }, [fondoId]);

  function normalizarTexto(valor: string | null | undefined) {
    return String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  async function cargarReporte() {
    if (!fondoId) {
      setMensaje("No se encontró el ID del fondo inicial.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMensaje("");

    const { data: fondoData, error: fondoError } = await supabase
      .from("caja_chica_fondos")
      .select(
        "id, condominio_id, numero_fondo, condominio, fecha, tipo, monto, descripcion, responsable, created_at"
      )
      .eq("id", Number(fondoId))
      .maybeSingle();

    if (fondoError || !fondoData) {
      setMensaje(
        "No se pudo cargar el fondo inicial: " +
          (fondoError?.message || "Fondo no encontrado.")
      );
      setLoading(false);
      return;
    }

    const fondoActual = fondoData as FondoCajaChica;
    setFondo(fondoActual);

    const condominioId =
      fondoActual.condominio_id ||
      Number(localStorage.getItem("condominio_id") || 0);

    if (condominioId) {
      const { data: directivaData } = await supabase
        .from("directiva_condominio")
        .select("id, condominio_id, nombre, cargo, estado")
        .eq("condominio_id", Number(condominioId));

      const directiva = (directivaData || []) as DirectivaCondominio[];

      const miembrosActivos = directiva.filter((m) => {
        const estado = normalizarTexto(m.estado);
        return !estado || estado === "activo";
      });

      const tesoreroEncontrado =
        miembrosActivos.find(
          (m) => normalizarTexto(m.cargo) === "tesorero"
        ) ||
        miembrosActivos.find((m) =>
          normalizarTexto(m.cargo).includes("tesorer")
        );

      const presidenteEncontrado =
        miembrosActivos.find(
          (m) => normalizarTexto(m.cargo) === "presidente"
        ) ||
        miembrosActivos.find((m) =>
          normalizarTexto(m.cargo).includes("president")
        );

      setTesorero(tesoreroEncontrado || null);
      setPresidente(presidenteEncontrado || null);
    }

    setLoading(false);
  }

  function formatoFecha(fecha?: string | null) {
    if (!fecha) return "-";

    const d = new Date(fecha);

    if (Number.isNaN(d.getTime())) return fecha;

    return d.toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function fechaHoy() {
    return new Date().toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function dinero(valor?: number | null) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function imprimir() {
    window.print();
  }

  const numeroReporte = String(fondo?.numero_fondo || fondo?.id || "").padStart(
    5,
    "0"
  );

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded-2xl shadow p-6">
          Cargando reporte de fondo inicial...
        </div>
      </main>
    );
  }

  if (mensaje || !fondo) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded-2xl shadow p-6 max-w-lg">
          <p className="text-red-700 font-bold">{mensaje}</p>

          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 bg-slate-800 text-white px-4 py-2 rounded-xl"
          >
            Volver
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-200 p-4 print:bg-white print:p-0">
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0;
          }

          html,
          body {
            width: 8.5in;
            height: 11in;
            margin: 0;
            padding: 0;
            overflow: hidden;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          * {
            box-sizing: border-box !important;
          }

          .no-print {
            display: none !important;
          }

          .pagina-carta {
            width: 8.5in !important;
            height: 11in !important;
            min-height: 11in !important;
            max-height: 11in !important;
            padding-top: 0.35in !important;
            padding-right: 0.42in !important;
            padding-bottom: 0.35in !important;
            padding-left: 0.22in !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            overflow: hidden !important;
          }

          .contenido-reporte {
            height: 7.28in !important;
            max-height: 7.28in !important;
            overflow: visible !important;
          }

          .espacio-blanco-final {
            height: 3in !important;
            min-height: 3in !important;
            max-height: 3in !important;
          }

          .pie-reporte {
            height: 0.08in !important;
            font-size: 7.5px !important;
            line-height: 1 !important;
          }
        }
      `}</style>

      <div className="no-print max-w-4xl mx-auto mb-4 flex justify-between gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold"
        >
          Volver
        </button>

        <button
          type="button"
          onClick={imprimir}
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl font-bold"
        >
          Imprimir reporte
        </button>
      </div>

      <section className="pagina-carta max-w-[8.5in] mx-auto bg-white rounded-2xl shadow border text-[10.5px] text-slate-900">
        <div className="contenido-reporte">
          <div className="border-b-2 border-slate-900 pb-3 flex items-center gap-3">
            <div className="flex-1 text-center">
              <h1 className="text-[15px] font-black uppercase leading-tight">
                {fondo.condominio || "Condominio"}
              </h1>

              <h2 className="text-[14px] font-black uppercase mt-1">
                Solicitud Inicial de Fondo para Caja Chica
              </h2>

              <p className="text-[10px] mt-1">
                Documento para autorización, firma y archivo administrativo
              </p>
            </div>

            <div className="w-36 text-[9.5px] border rounded-lg p-2">
              <p>
                <strong>No.:</strong> {numeroReporte}
              </p>
              <p>
                <strong>Impresión:</strong> {fechaHoy()}
              </p>
              <p>
                <strong>Tipo:</strong> {fondo.tipo || "fondo_inicial"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="border rounded-lg p-3">
              <h3 className="font-black uppercase border-b pb-1 mb-2">
                Datos del fondo
              </h3>

              <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                <p className="font-bold">Fecha:</p>
                <p>{formatoFecha(fondo.fecha)}</p>

                <p className="font-bold">Responsable:</p>
                <p>{fondo.responsable || "-"}</p>

                <p className="font-bold">Registro:</p>
                <p>{formatoFecha(fondo.created_at)}</p>

                <p className="font-bold">Condominio:</p>
                <p>{fondo.condominio}</p>
              </div>
            </div>

            <div className="border rounded-lg p-3">
              <h3 className="font-black uppercase border-b pb-1 mb-2">
                Resumen económico
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between border-b pb-1">
                  <span className="font-bold">Monto asignado:</span>
                  <span>RD$ {dinero(fondo.monto)}</span>
                </div>

                <div className="flex justify-between text-[15px] font-black bg-slate-100 rounded-md p-2">
                  <span>Total fondo inicial:</span>
                  <span>RD$ {dinero(fondo.monto)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-3 mt-3">
            <h3 className="font-black uppercase border-b pb-1 mb-2">
              Descripción / justificación
            </h3>

            <div className="h-[70px] overflow-hidden">
              <p className="leading-tight">
                {fondo.descripcion || "Fondo inicial de caja chica."}
              </p>
            </div>
          </div>

          <div className="border rounded-lg p-3 mt-3">
            <div className="flex items-center justify-between gap-3 border-b pb-1 mb-3">
              <h3 className="font-black uppercase">
                Aprobación y autorización
              </h3>

              <div className="border rounded-md px-2 py-1 text-right min-w-[150px] bg-slate-50">
                <p className="text-[8.5px] uppercase font-bold text-slate-500">
                  Fecha fondo
                </p>
                <p className="font-black">{formatoFecha(fondo.fecha)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="font-black text-center uppercase">Tesorero</p>

                <div className="mt-1 text-center min-h-[26px]">
                  <p className="font-bold">
                    {tesorero?.nombre || "No configurado"}
                  </p>
                </div>

                <div className="mt-12 border-t border-slate-900 pt-1 text-center">
                  Firma del tesorero
                </div>
              </div>

              <div>
                <p className="font-black text-center uppercase">Presidente</p>

                <div className="mt-1 text-center min-h-[26px]">
                  <p className="font-bold">
                    {presidente?.nombre || "No configurado"}
                  </p>
                </div>

                <div className="mt-12 border-t border-slate-900 pt-1 text-center">
                  Firma del presidente
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-3 mt-3">
            <h3 className="font-black uppercase border-b pb-1 mb-2">
              Recibo del fondo
            </h3>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="font-bold">Entregado por:</p>
                <div className="border-b border-slate-900 h-8" />
              </div>

              <div>
                <p className="font-bold">Recibido por:</p>
                <div className="border-b border-slate-900 h-8" />
              </div>
            </div>
          </div>
        </div>

        <div className="espacio-blanco-final h-[3in]" />

        <div className="pie-reporte text-[8px] text-slate-500 flex justify-between border-t pt-1">
          <span>Soporte físico de autorización y archivo.</span>
          <span>Generado por VAM Administración de Condominios</span>
        </div>
      </section>
    </main>
  );
}