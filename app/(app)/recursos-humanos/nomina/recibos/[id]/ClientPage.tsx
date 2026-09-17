"use client";
export const runtime = "edge";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type Nomina = {
  id: number;
  condominio_id: number;
  condominio: string;
  empleado_id: number;
  numero_empleado: string;
  nombre_empleado: string;
  cargo: string;
  departamento: string;
  periodo: string;
  fecha_pago: string;
  tipo_nomina: string;
  salario_base: number;
  dias_trabajados: number;
  horas_extras: number;
  monto_horas_extras: number;
  bonificacion: number;
  vacaciones_id: number | null;
  pago_vacaciones: number;
  dias_vacaciones: number;
  afp: number;
  sfs: number;
  isr: number;
  otros_descuentos: number;
  total_ingresos: number;
  total_descuentos: number;
  neto_pagar: number;
  estado: string;
  observacion: string;
  pagado_por: string;
  fecha_registro_pago: string;
  created_at: string;
};

type DescuentoNomina = {
  id: number;
  tipo_descuento_id: number;
  tipo_descuento: string;
  monto: number;
  observacion: string;
};

type Condominio = {
  id: number;
  nombre: string;
  rnc: string;
  direccion: string;
  telefono: string;
  correo: string;
  logo_url: string;
};

type EmpleadoDetalle = {
  id: number;
  cedula: string;
};

export default function ReciboNominaPage() {
  const params = useParams();
  const nominaId = params?.id as string;

  const [nomina, setNomina] = useState<Nomina | null>(null);
  const [descuentos, setDescuentos] = useState<DescuentoNomina[]>([]);
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [empleadoDetalle, setEmpleadoDetalle] = useState<EmpleadoDetalle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const idCondominio = localStorage.getItem("condominio_id") || "";
    if (idCondominio && nominaId) {
      cargarDatos(idCondominio, nominaId);
    } else {
      setLoading(false);
    }
  }, [nominaId]);

  async function cargarDatos(idCondominio: string, idNomina: string) {
    setLoading(true);

    const { data: dataNomina, error: errorNomina } = await supabase
      .from("rh_nomina")
      .select("*")
      .eq("id", Number(idNomina))
      .eq("condominio_id", Number(idCondominio))
      .maybeSingle();

    if (errorNomina) {
      setLoading(false);
      alert("Error cargando recibo de nómina: " + errorNomina.message);
      return;
    }

    if (!dataNomina) {
      setLoading(false);
      alert("No se encontró la nómina seleccionada.");
      return;
    }

    const nominaData = dataNomina as Nomina;
    setNomina(nominaData);

    const { data: dataEmpleado } = await supabase
      .from("empleados")
      .select("id, cedula")
      .eq("id", Number(nominaData.empleado_id))
      .eq("condominio_id", Number(idCondominio))
      .maybeSingle();

    setEmpleadoDetalle((dataEmpleado as EmpleadoDetalle) || null);

    const { data: dataDescuentos, error: errorDescuentos } = await supabase
      .from("rh_nomina_descuentos")
      .select("id, tipo_descuento_id, tipo_descuento, monto, observacion")
      .eq("nomina_id", Number(idNomina))
      .eq("condominio_id", Number(idCondominio))
      .eq("estado", "Activo")
      .order("created_at", { ascending: true });

    if (errorDescuentos) {
      alert("Error cargando descuentos: " + errorDescuentos.message);
    } else {
      setDescuentos((dataDescuentos as DescuentoNomina[]) || []);
    }

    const { data: dataCondominio, error: errorCondominio } = await supabase
      .from("condominios")
      .select("id, nombre, rnc, direccion, telefono, correo, logo_url")
      .eq("id", Number(idCondominio))
      .maybeSingle();

    if (errorCondominio) {
      alert("Error cargando datos del condominio: " + errorCondominio.message);
    } else {
      setCondominio((dataCondominio as Condominio) || null);
    }

    setLoading(false);
  }

  function moneda(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function monedaSinDecimales(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  function imprimir() {
    window.print();
  }

  function codigoRecibo() {
    const anio = (nomina?.periodo || new Date().getFullYear().toString()).slice(0, 4);
    return `NOM-${anio}-${String(nomina?.id || 0).padStart(6, "0")}`;
  }

  function salarioDiario() {
    return Number(nomina?.salario_base || 0) / 23.83;
  }

  function valorSeguro(texto?: string | null) {
    return texto && String(texto).trim() ? texto : "-";
  }

  function formatearFecha(fecha?: string | null) {
    if (!fecha) return "-";
    const limpia = String(fecha).trim();
    if (!limpia) return "-";

    const soloFecha = limpia.includes("T") ? limpia.split("T")[0] : limpia;
    const partes = soloFecha.split("-");
    if (partes.length === 3) {
      const [anio, mes, dia] = partes;
      return `${dia}/${mes}/${anio}`;
    }

    return limpia;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-3xl border shadow-sm p-6">
          Cargando recibo de nómina...
        </div>
      </div>
    );
  }

  if (!nomina) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-3xl border shadow-sm p-6">
          No se encontró el recibo solicitado.
        </div>
      </div>
    );
  }

  const totalIngresos = Number(nomina.total_ingresos || 0);
  const fechaRegistroPago = nomina.fecha_registro_pago || nomina.fecha_pago || "-";
  const fechaPagoMostrar = nomina.fecha_pago || nomina.fecha_registro_pago || "-";

  const descuentosListado = descuentos.length
    ? descuentos
    : Number(nomina.otros_descuentos || 0) > 0
    ? [
        {
          id: 999999,
          tipo_descuento_id: 0,
          tipo_descuento: "Otros descuentos",
          monto: Number(nomina.otros_descuentos || 0),
          observacion: "",
        } as DescuentoNomina,
      ]
    : [];

  const ingresosBase = [
    {
      etiqueta: "Salario base",
      monto: Number(nomina.salario_base || 0),
      mostrar: true,
    },
    {
      etiqueta: `Horas extras (${nomina.horas_extras || 0})`,
      monto: Number(nomina.monto_horas_extras || 0),
      mostrar: Number(nomina.monto_horas_extras || 0) > 0 || Number(nomina.horas_extras || 0) > 0,
    },
    {
      etiqueta: `Vacaciones (${nomina.dias_vacaciones || 0} días)`,
      monto: Number(nomina.pago_vacaciones || 0),
      mostrar: Number(nomina.pago_vacaciones || 0) > 0,
    },
  ].filter((item) => item.mostrar);

  const descuentosBase = [
    {
      etiqueta: "AFP",
      monto: Number(nomina.afp || 0),
      mostrar: Number(nomina.afp || 0) > 0,
      observacion: "",
    },
    {
      etiqueta: "SFS",
      monto: Number(nomina.sfs || 0),
      mostrar: Number(nomina.sfs || 0) > 0,
      observacion: "",
    },
    {
      etiqueta: "ISR",
      monto: Number(nomina.isr || 0),
      mostrar: Number(nomina.isr || 0) > 0,
      observacion: "",
    },
  ].filter((item) => item.mostrar);

  function BloqueRecibo({
    copiaTitulo,
    copiaSubtitulo,
  }: {
    copiaTitulo: string;
    copiaSubtitulo: string;
  }) {
    return (
      <section className="recibo border border-slate-300 rounded-2xl p-4 bg-white">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex items-start gap-3 min-w-0">
            {condominio?.logo_url ? (
              <img
                src={condominio.logo_url}
                alt="Logo"
                className="h-12 w-12 object-contain shrink-0"
              />
            ) : null}

            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-900 leading-tight">
                {condominio?.nombre || nomina.condominio}
              </h2>

              <p className="text-[11px] text-slate-600 leading-tight">
                RNC: {valorSeguro(condominio?.rnc)} · Tel.: {valorSeguro(condominio?.telefono)}
              </p>

              <p className="text-[11px] text-slate-600 leading-tight">
                {valorSeguro(condominio?.direccion)}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {copiaSubtitulo}
            </p>
            <h3 className="text-lg font-black text-blue-800 leading-tight">
              {copiaTitulo}
            </h3>
            <p className="text-[11px] text-slate-600 mt-1">
              No. {codigoRecibo()}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-[11px]">
          <p><strong>Empleado:</strong> {nomina.nombre_empleado}</p>
          <p><strong>No. empleado:</strong> {valorSeguro(nomina.numero_empleado)}</p>
          <p><strong>Cédula:</strong> {valorSeguro(empleadoDetalle?.cedula)}</p>
          <p><strong>Cargo:</strong> {valorSeguro(nomina.cargo)}</p>
          <p><strong>Departamento:</strong> {valorSeguro(nomina.departamento)}</p>
          <p><strong>Período:</strong> {valorSeguro(nomina.periodo)}</p>
          <p><strong>Fecha pago:</strong> {formatearFecha(fechaPagoMostrar)}</p>
          <p><strong>Fecha registro:</strong> {formatearFecha(fechaRegistroPago)}</p>
          <p><strong>Tipo nómina:</strong> {valorSeguro(nomina.tipo_nomina || "Nómina Regular")}</p>
          <p><strong>Días trabajados:</strong> {nomina.dias_trabajados || 0}</p>
          <p><strong>Salario diario:</strong> RD${moneda(salarioDiario())}</p>
          <p><strong>Estado:</strong> {valorSeguro(nomina.estado)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <h4 className="font-black text-slate-900 text-sm mb-1">Ingresos</h4>
            <table className="w-full text-[11px] border border-slate-300">
              <tbody>
                {ingresosBase.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-slate-300 px-2 py-1">{item.etiqueta}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-bold">
                      RD${moneda(item.monto)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-green-50">
                  <td className="border border-slate-300 px-2 py-1 font-black">Total ingresos</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-black text-green-700">
                    RD${moneda(totalIngresos)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-black text-slate-900 text-sm mb-1">Descuentos</h4>
            <table className="w-full text-[11px] border border-slate-300">
              <tbody>
                {descuentosBase.map((item, idx) => (
                  <tr key={`base-${idx}`}>
                    <td className="border border-slate-300 px-2 py-1">{item.etiqueta}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-bold text-red-700">
                      RD${moneda(item.monto)}
                    </td>
                  </tr>
                ))}

                {descuentosListado.map((item) => (
                  <tr key={item.id}>
                    <td className="border border-slate-300 px-2 py-1">
                      {item.tipo_descuento}
                      {item.observacion ? (
                        <p className="text-[10px] text-slate-500 leading-tight">
                          {item.observacion}
                        </p>
                      ) : null}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-bold text-red-700">
                      RD${moneda(item.monto)}
                    </td>
                  </tr>
                ))}

                {descuentosBase.length === 0 && descuentosListado.length === 0 && (
                  <tr>
                    <td className="border border-slate-300 px-2 py-1">Sin descuentos</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-bold">
                      RD$0.00
                    </td>
                  </tr>
                )}

                <tr className="bg-red-50">
                  <td className="border border-slate-300 px-2 py-1 font-black">Total descuentos</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-black text-red-700">
                    RD${moneda(nomina.total_descuentos)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] text-blue-700 font-semibold">Neto pagado al empleado</p>
            <h2 className="text-2xl font-black text-blue-800 leading-none">
              RD${monedaSinDecimales(nomina.neto_pagar)}
            </h2>
          </div>

          <div className="text-right text-[11px] text-slate-600">
            <p><strong>Recibo:</strong> {codigoRecibo()}</p>
            <p><strong>Condominio:</strong> {condominio?.nombre || nomina.condominio}</p>
          </div>
        </div>

        {nomina.observacion ? (
          <div className="mt-2 rounded-xl border border-slate-200 px-3 py-2">
            <p className="text-[11px]">
              <strong>Observación:</strong> {nomina.observacion}
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-8 mt-5 pt-4">
          <div className="text-center">
            <div className="border-t border-slate-400 pt-2">
              <p className="text-[11px] font-bold">Recibido conforme</p>
              <p className="text-[10px] text-slate-500">
                {nomina.nombre_empleado || "Firma del empleado"}
              </p>
            </div>
          </div>

          <div className="text-center">
            <div className="border-t border-slate-400 pt-2">
              <p className="text-[11px] font-bold">Autorizado por</p>
              <p className="text-[10px] text-slate-500">
                Administración / Recursos Humanos
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="no-print bg-white rounded-3xl border shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Recibo de Nómina Compacto
          </h1>

          <p className="text-slate-500 mt-1">
            Formato ecológico: imprime dos recibos en una sola página.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <Link
            href="/recursos-humanos/nomina"
            className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-center"
          >
            Volver a Nómina
          </Link>

          <button
            onClick={imprimir}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      <div className="print-sheet bg-white border shadow-sm rounded-3xl p-4 max-w-4xl mx-auto">
        <BloqueRecibo
          copiaTitulo="RECIBO DE PAGO"
          copiaSubtitulo="Copia del empleado"
        />

        <div className="no-screen my-3 border-t-2 border-dashed border-slate-400"></div>

        <BloqueRecibo
          copiaTitulo="CONSTANCIA DE PAGO"
          copiaSubtitulo="Copia administrativa"
        />
      </div>

      <style jsx global>{`
        .no-screen {
          display: block;
        }

        @media print {
          html,
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 11px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print,
          aside,
          nav,
          header {
            display: none !important;
          }

          .no-screen {
            display: block !important;
          }

          .print-sheet {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .recibo {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
          }

          .recibo h2 {
            font-size: 16px !important;
            line-height: 1.1 !important;
          }

          .recibo h3 {
            font-size: 16px !important;
            line-height: 1.1 !important;
          }

          .recibo h4 {
            font-size: 12px !important;
            margin-bottom: 3px !important;
          }

          .recibo p,
          .recibo td,
          .recibo th,
          .recibo div,
          .recibo span {
            line-height: 1.15 !important;
          }

          .recibo img {
            max-height: 42px !important;
            max-width: 42px !important;
          }

          .recibo table td,
          .recibo table th {
            padding: 4px 6px !important;
          }

          .recibo .text-2xl {
            font-size: 22px !important;
          }

          .recibo .p-4 {
            padding: 10px !important;
          }

          .recibo .mt-5 {
            margin-top: 12px !important;
          }

          .recibo .mt-3 {
            margin-top: 8px !important;
          }

          .recibo .mt-2 {
            margin-top: 6px !important;
          }

          .recibo .pt-4 {
            padding-top: 8px !important;
          }

          .my-3 {
            margin-top: 8px !important;
            margin-bottom: 8px !important;
          }

          @page {
            size: letter;
            margin: 0.35in;
          }
        }
      `}</style>
    </div>
  );
}
