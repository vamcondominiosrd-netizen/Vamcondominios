"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type SolicitudPago = {
  id: number;
  condominio_id: number | null;
  condominio?: string | null;
  fecha_solicitud?: string | null;
  fecha?: string | null;
  concepto?: string | null;
  detalle?: string | null;
  detalle_gasto?: string | null;
  monto?: number | null;
  itbis?: number | null;
  total?: number | null;
  no_factura?: string | null;
  ncf?: string | null;
  metodo_pago?: string | null;
  cuenta_banco?: string | null;
  soporte_url?: string | null;
  estado?: string | null;
  proveedor_id?: number | null;
  categoria_id?: number | null;
  aprobado_tesorero?: boolean | null;
  aprobado_presidente?: boolean | null;
  fecha_aprobacion_tesorero?: string | null;
  fecha_aprobacion_presidente?: string | null;
  aprobado_tesorero_at?: string | null;
  aprobado_presidente_at?: string | null;
  gasto_generado_id?: number | null;
  created_at?: string | null;
};

type Condominio = {
  id: number;
  nombre: string;
  logo_url: string | null;
  rnc?: string | null;
  telefono?: string | null;
  direccion?: string | null;
};

type DirectivaCondominio = {
  id: number;
  condominio_id: number;
  nombre: string;
  cargo: string;
  cedula: string | null;
  telefono: string | null;
  correo: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string | null;
  observacion: string | null;
};

type GastoRelacionado = {
  id: number;
  estado: string | null;
  pagado: boolean | null;
  numero_cheque: string | null;
  fecha_pago: string | null;
  cheque_url: string | null;
  cuenta_banco: string | null;
};

export default function ReporteSolicitudPagoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const solicitudId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const [solicitud, setSolicitud] = useState<SolicitudPago | null>(null);
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [gastoRelacionado, setGastoRelacionado] =
    useState<GastoRelacionado | null>(null);

  const [proveedorNombre, setProveedorNombre] = useState("");
  const [categoriaNombre, setCategoriaNombre] = useState("");

  const [tesorero, setTesorero] = useState<DirectivaCondominio | null>(null);
  const [presidente, setPresidente] =
    useState<DirectivaCondominio | null>(null);

  useEffect(() => {
    cargarReporte();
  }, [solicitudId]);

  function normalizarTexto(valor: string | null | undefined) {
    return String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  async function cargarReporte() {
    if (!solicitudId) {
      setMensaje("No se encontró el ID de la solicitud.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMensaje("");

    const { data: solicitudData, error: solicitudError } = await supabase
      .from("solicitudes_pago")
      .select("*")
      .eq("id", Number(solicitudId))
      .maybeSingle();

    if (solicitudError || !solicitudData) {
      setMensaje(
        "No se pudo cargar la solicitud: " +
          (solicitudError?.message || "Solicitud no encontrada.")
      );
      setLoading(false);
      return;
    }

    const solicitudActual = solicitudData as SolicitudPago;
    setSolicitud(solicitudActual);

    const condominioId =
      solicitudActual.condominio_id ||
      Number(localStorage.getItem("condominio_id") || 0);

    if (condominioId) {
      const { data: condominioData } = await supabase
        .from("condominios")
        .select("id, nombre, logo_url, rnc, telefono, direccion")
        .eq("id", Number(condominioId))
        .maybeSingle();

      if (condominioData) {
        setCondominio(condominioData as Condominio);
      }

      const { data: directivaData, error: directivaError } = await supabase
        .from("directiva_condominio")
        .select(
          "id, condominio_id, nombre, cargo, cedula, telefono, correo, fecha_inicio, fecha_fin, estado, observacion"
        )
        .eq("condominio_id", Number(condominioId));

      if (!directivaError && directivaData) {
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
    }

    if (solicitudActual.gasto_generado_id) {
      const { data: gastoData } = await supabase
        .from("gastos")
        .select(
          "id, estado, pagado, numero_cheque, fecha_pago, cheque_url, cuenta_banco"
        )
        .eq("id", solicitudActual.gasto_generado_id)
        .maybeSingle();

      if (gastoData) {
        setGastoRelacionado(gastoData as GastoRelacionado);
      }
    }

    if (solicitudActual.proveedor_id) {
      const { data: proveedorData } = await supabase
        .from("catalogo_proveedores")
        .select("nombre_proveedor")
        .eq("id", solicitudActual.proveedor_id)
        .maybeSingle();

      setProveedorNombre(proveedorData?.nombre_proveedor || "");
    }

    if (solicitudActual.categoria_id) {
      const { data: categoriaData } = await supabase
        .from("catalogo_categoria_gastos")
        .select("nombre_categoria")
        .eq("id", solicitudActual.categoria_id)
        .maybeSingle();

      setCategoriaNombre(categoriaData?.nombre_categoria || "");
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

  const fechaSolicitud =
    solicitud?.fecha_solicitud || solicitud?.fecha || solicitud?.created_at;

  const detalle =
    solicitud?.detalle || solicitud?.detalle_gasto || "Sin detalle registrado.";

  const pagadoFinal = gastoRelacionado?.pagado || false;

  const fechaPagoFinal = gastoRelacionado?.fecha_pago || null;

  const numeroChequeFinal = gastoRelacionado?.numero_cheque || "-";

  const bancoFinal =
    gastoRelacionado?.cuenta_banco || solicitud?.cuenta_banco || "-";

  const estadoFinal =
    gastoRelacionado?.estado || solicitud?.estado || "Sin estado";

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded-2xl shadow p-6">
          Cargando reporte de solicitud...
        </div>
      </main>
    );
  }

  if (mensaje || !solicitud) {
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
            margin: 0.35in;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .print-page {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
          }

          .espacio-blanco-final {
            height: 3in !important;
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

      <section className="print-page max-w-4xl mx-auto bg-white rounded-2xl shadow border p-7 text-[12px] text-slate-900">
        <div className="border-b-2 border-slate-900 pb-3 flex items-center gap-4">
          <div className="w-20 h-20 border rounded-xl flex items-center justify-center bg-white overflow-hidden">
            {condominio?.logo_url ? (
              <img
                src={condominio.logo_url}
                alt={condominio.nombre}
                className="w-full h-full object-contain p-1"
              />
            ) : (
              <span className="text-[10px] text-slate-400">LOGO</span>
            )}
          </div>

          <div className="flex-1 text-center">
            <h1 className="text-[18px] font-black uppercase leading-tight">
              {condominio?.nombre || solicitud.condominio || "Condominio"}
            </h1>

            <h2 className="text-[16px] font-black uppercase mt-1">
              Reporte de Solicitud de Pago
            </h2>

            <p className="text-[11px] mt-1">
              Documento para autorización, firma y archivo administrativo
            </p>
          </div>

          <div className="w-36 text-[11px] border rounded-xl p-2">
            <p>
              <strong>No.:</strong> {String(solicitud.id).padStart(5, "0")}
            </p>
            <p>
              <strong>Impresión:</strong> {fechaHoy()}
            </p>
            <p>
              <strong>Estado:</strong> {estadoFinal}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="border rounded-xl p-3">
            <h3 className="font-black uppercase border-b pb-1 mb-2">
              Datos de la solicitud
            </h3>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <p className="font-bold">Fecha solicitud:</p>
              <p>{formatoFecha(fechaSolicitud)}</p>

              <p className="font-bold">Proveedor:</p>
              <p>{proveedorNombre || "-"}</p>

              <p className="font-bold">Categoría:</p>
              <p>{categoriaNombre || "-"}</p>

              <p className="font-bold">No. Factura:</p>
              <p>{solicitud.no_factura || "-"}</p>

              <p className="font-bold">NCF:</p>
              <p>{solicitud.ncf || "-"}</p>

              <p className="font-bold">Método pago:</p>
              <p>{solicitud.metodo_pago || "-"}</p>

              <p className="font-bold">Cuenta/Banco:</p>
              <p>{bancoFinal}</p>
            </div>
          </div>

          <div className="border rounded-xl p-3">
            <h3 className="font-black uppercase border-b pb-1 mb-2">
              Resumen económico
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between border-b pb-1">
                <span className="font-bold">Subtotal:</span>
                <span>RD$ {dinero(solicitud.monto)}</span>
              </div>

              <div className="flex justify-between border-b pb-1">
                <span className="font-bold">ITBIS:</span>
                <span>RD$ {dinero(solicitud.itbis)}</span>
              </div>

              <div className="flex justify-between text-[16px] font-black bg-slate-100 rounded-lg p-2">
                <span>Total a pagar:</span>
                <span>RD$ {dinero(solicitud.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border rounded-xl p-3 mt-3">
          <h3 className="font-black uppercase border-b pb-1 mb-2">
            Concepto y justificación
          </h3>

          <p>
            <strong>Concepto:</strong> {solicitud.concepto || "-"}
          </p>

          <div className="mt-2 min-h-[54px]">
            <p className="font-bold">Detalle:</p>
            <p className="leading-snug">{detalle}</p>
          </div>
        </div>

        <div className="border rounded-xl p-3 mt-3">
          <div className="flex items-center justify-between gap-4 border-b pb-2 mb-3">
            <h3 className="font-black uppercase">
              Aprobación y autorización
            </h3>

            <div className="border rounded-lg px-3 py-2 text-right min-w-[180px] bg-slate-50">
              <p className="text-[10px] uppercase font-bold text-slate-500">
                Fecha solicitud
              </p>
              <p className="font-black">{formatoFecha(fechaSolicitud)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="font-black text-center uppercase">Tesorero</p>

              <div className="mt-2 text-center min-h-[30px]">
                <p className="font-bold">
                  {tesorero?.nombre || "No configurado"}
                </p>
              </div>

              <div className="mt-10 border-t border-slate-900 pt-1 text-center">
                Firma del tesorero
              </div>
            </div>

            <div>
              <p className="font-black text-center uppercase">Presidente</p>

              <div className="mt-2 text-center min-h-[30px]">
                <p className="font-bold">
                  {presidente?.nombre || "No configurado"}
                </p>
              </div>

              <div className="mt-10 border-t border-slate-900 pt-1 text-center">
                Firma del presidente
              </div>
            </div>
          </div>
        </div>

        <div className="border rounded-xl p-3 mt-3">
          <h3 className="font-black uppercase border-b pb-1 mb-2">
            Datos del pago
          </h3>

          <div className="grid grid-cols-4 gap-x-3 gap-y-2">
            <p className="font-bold">Pagado:</p>
            <p>{pagadoFinal ? "Sí" : "No"}</p>

            <p className="font-bold">Fecha pago:</p>
            <p>{formatoFecha(fechaPagoFinal)}</p>

            <p className="font-bold">No. cheque/ref.:</p>
            <p>{numeroChequeFinal}</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-6">
            <div>
              <p className="font-bold">Recibido por:</p>
              <div className="border-b border-slate-900 h-7" />
            </div>

            <div>
              <p className="font-bold">Firma recibido:</p>
              <div className="border-b border-slate-900 h-7" />
            </div>
          </div>
        </div>

        <div className="espacio-blanco-final h-[3in]" />

        <div className="mt-3 text-[10px] text-slate-500 flex justify-between border-t pt-2">
          <span>
            Este documento sirve como soporte físico de autorización y archivo.
          </span>

          <span>Generado por VAM Administración de Condominios</span>
        </div>
      </section>
    </main>
  );
}