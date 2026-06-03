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

export default function ReciboNominaPage() {
  const params = useParams();
  const nominaId = params?.id as string;

  const [condominioId, setCondominioId] = useState("");
  const [nomina, setNomina] = useState<Nomina | null>(null);
  const [descuentos, setDescuentos] = useState<DescuentoNomina[]>([]);
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    setCondominioId(id);

    if (id && nominaId) {
      cargarDatos(id, nominaId);
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

    setNomina(dataNomina as Nomina);

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
    });
  }

  function imprimir() {
    window.print();
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

  const totalIngresos =
    Number(nomina.salario_base || 0) +
    Number(nomina.monto_horas_extras || 0) +
    Number(nomina.bonificacion || 0) +
    Number(nomina.pago_vacaciones || 0);

  return (
    <div className="space-y-6">
      <div className="no-print bg-white rounded-3xl border shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Recibo de Nómina
          </h1>

          <p className="text-slate-500 mt-1">
            Recibo imprimible del pago de nómina seleccionado.
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

      <div className="bg-white border shadow-sm rounded-3xl p-6 print-area max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-6 border-b pb-6">
          <div className="flex items-center gap-4">
            {condominio?.logo_url && (
              <img
                src={condominio.logo_url}
                alt="Logo"
                className="h-20 w-20 object-contain"
              />
            )}

            <div>
              <h2 className="text-2xl font-black text-slate-900">
                {condominio?.nombre || nomina.condominio}
              </h2>

              <p className="text-sm text-slate-600">
                RNC: {condominio?.rnc || "-"}
              </p>

              <p className="text-sm text-slate-600">
                {condominio?.direccion || "-"}
              </p>

              <p className="text-sm text-slate-600">
                Tel.: {condominio?.telefono || "-"} · Correo:{" "}
                {condominio?.correo || "-"}
              </p>
            </div>
          </div>

          <div className="text-right">
            <h1 className="text-3xl font-black text-blue-800">
              RECIBO DE PAGO
            </h1>

            <p className="text-sm text-slate-600 mt-2">
              Recibo No. RH-{String(nomina.id).padStart(6, "0")}
            </p>

            <p className="text-sm text-slate-600">
              Período: <strong>{nomina.periodo}</strong>
            </p>

            <p className="text-sm text-slate-600">
              Fecha de pago: <strong>{nomina.fecha_pago || "-"}</strong>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          <div className="border rounded-2xl p-5">
            <h3 className="font-black text-slate-900 mb-3">
              Datos del empleado
            </h3>

            <p>
              <strong>Empleado:</strong> {nomina.nombre_empleado}
            </p>

            <p>
              <strong>No. empleado:</strong> {nomina.numero_empleado || "-"}
            </p>

            <p>
              <strong>Cargo:</strong> {nomina.cargo || "-"}
            </p>

            <p>
              <strong>Departamento:</strong> {nomina.departamento || "-"}
            </p>
          </div>

          <div className="border rounded-2xl p-5">
            <h3 className="font-black text-slate-900 mb-3">
              Información de nómina
            </h3>

            <p>
              <strong>Días trabajados:</strong> {nomina.dias_trabajados || 0}
            </p>

            <p>
              <strong>Estado:</strong> {nomina.estado}
            </p>

            <p>
              <strong>Pagado por:</strong> {nomina.pagado_por || "-"}
            </p>

            <p>
              <strong>Fecha registro pago:</strong>{" "}
              {nomina.fecha_registro_pago || "-"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <h3 className="font-black text-slate-900 mb-3">Ingresos</h3>

            <table className="w-full text-sm border">
              <tbody>
                <tr>
                  <td className="p-3 border">Salario base</td>
                  <td className="p-3 border text-right font-bold">
                    RD${moneda(nomina.salario_base)}
                  </td>
                </tr>

                <tr>
                  <td className="p-3 border">
                    Horas extras ({nomina.horas_extras || 0})
                  </td>
                  <td className="p-3 border text-right font-bold">
                    RD${moneda(nomina.monto_horas_extras)}
                  </td>
                </tr>

                <tr>
                  <td className="p-3 border">Bonificación</td>
                  <td className="p-3 border text-right font-bold">
                    RD${moneda(nomina.bonificacion)}
                  </td>
                </tr>

                {Number(nomina.pago_vacaciones || 0) > 0 && (
                  <tr>
                    <td className="p-3 border">
                      Pago vacaciones ({nomina.dias_vacaciones || 0} días)
                    </td>
                    <td className="p-3 border text-right font-bold text-purple-700">
                      RD${moneda(nomina.pago_vacaciones)}
                    </td>
                  </tr>
                )}

                <tr className="bg-green-50">
                  <td className="p-3 border font-black">Total ingresos</td>
                  <td className="p-3 border text-right font-black text-green-700">
                    RD${moneda(totalIngresos)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="font-black text-slate-900 mb-3">Descuentos</h3>

            <table className="w-full text-sm border">
              <tbody>
                <tr>
                  <td className="p-3 border">AFP</td>
                  <td className="p-3 border text-right font-bold text-red-700">
                    RD${moneda(nomina.afp)}
                  </td>
                </tr>

                <tr>
                  <td className="p-3 border">SFS</td>
                  <td className="p-3 border text-right font-bold text-red-700">
                    RD${moneda(nomina.sfs)}
                  </td>
                </tr>

                <tr>
                  <td className="p-3 border">ISR</td>
                  <td className="p-3 border text-right font-bold text-red-700">
                    RD${moneda(nomina.isr)}
                  </td>
                </tr>

                {descuentos.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3 border">
                      {item.tipo_descuento}
                      {item.observacion && (
                        <p className="text-xs text-slate-500">
                          {item.observacion}
                        </p>
                      )}
                    </td>

                    <td className="p-3 border text-right font-bold text-red-700">
                      RD${moneda(item.monto)}
                    </td>
                  </tr>
                ))}

                {descuentos.length === 0 &&
                  Number(nomina.otros_descuentos || 0) > 0 && (
                    <tr>
                      <td className="p-3 border">Otros descuentos</td>
                      <td className="p-3 border text-right font-bold text-red-700">
                        RD${moneda(nomina.otros_descuentos)}
                      </td>
                    </tr>
                  )}

                <tr className="bg-red-50">
                  <td className="p-3 border font-black">Total descuentos</td>
                  <td className="p-3 border text-right font-black text-red-700">
                    RD${moneda(nomina.total_descuentos)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-blue-700">Neto pagado al empleado</p>
            <h2 className="text-4xl font-black text-blue-800">
              RD${moneda(nomina.neto_pagar)}
            </h2>
          </div>

          <div className="text-sm text-slate-600">
            <p>
              <strong>Estado:</strong> {nomina.estado}
            </p>

            <p>
              <strong>Período:</strong> {nomina.periodo}
            </p>
          </div>
        </div>

        {nomina.observacion && (
          <div className="mt-6 border rounded-2xl p-5">
            <h3 className="font-black mb-2">Observación</h3>
            <p className="text-sm text-slate-700">{nomina.observacion}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-14">
          <div className="text-center">
            <div className="border-t border-slate-400 pt-3">
              <p className="font-bold">Recibido conforme</p>
              <p className="text-sm text-slate-500">
                Firma del empleado
              </p>
            </div>
          </div>

          <div className="text-center">
            <div className="border-t border-slate-400 pt-3">
              <p className="font-bold">Autorizado por</p>
              <p className="text-sm text-slate-500">
                Administración / Recursos Humanos
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-500">
          Este recibo fue generado desde el módulo de Recursos Humanos / Nómina.
        </div>
      </div>

      <style jsx global>{`
  @media print {
    html,
    body {
      background: white !important;
      margin: 0 !important;
      padding: 0 !important;
      font-size: 11px !important;
    }

    .no-print {
      display: none !important;
    }

    aside,
    nav,
    header {
      display: none !important;
    }

    .print-area {
      box-shadow: none !important;
      border: none !important;
      max-width: 100% !important;
      width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      border-radius: 0 !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .print-area h1 {
      font-size: 22px !important;
      line-height: 1.1 !important;
      margin: 0 !important;
    }

    .print-area h2 {
      font-size: 18px !important;
      line-height: 1.1 !important;
      margin: 0 !important;
    }

    .print-area h3 {
      font-size: 13px !important;
      margin-bottom: 4px !important;
    }

    .print-area p {
      margin: 1px 0 !important;
      line-height: 1.2 !important;
    }

    .print-area table {
      font-size: 10px !important;
      line-height: 1.15 !important;
    }

    .print-area td,
    .print-area th {
      padding: 5px 6px !important;
    }

    .print-area img {
      max-height: 55px !important;
      max-width: 55px !important;
    }

    .print-area .rounded-3xl,
    .print-area .rounded-2xl {
      border-radius: 8px !important;
    }

    .print-area .p-8 {
      padding: 10px !important;
    }

    .print-area .p-6,
    .print-area .p-5 {
      padding: 8px !important;
    }

    .print-area .mt-14 {
      margin-top: 30px !important;
    }

    .print-area .mt-8,
    .print-area .mt-6 {
      margin-top: 10px !important;
    }

    .print-area .pb-6 {
      padding-bottom: 8px !important;
    }

    .print-area .gap-6,
    .print-area .gap-5,
    .print-area .gap-4 {
      gap: 8px !important;
    }

    .print-area .text-4xl {
      font-size: 24px !important;
      line-height: 1.1 !important;
    }

    .print-area .text-3xl {
      font-size: 20px !important;
      line-height: 1.1 !important;
    }

    .print-area .text-2xl {
      font-size: 16px !important;
      line-height: 1.1 !important;
    }

    @page {
      size: letter;
      margin: 0.25in;
    }
  }
`}</style>
    </div>
  );
}