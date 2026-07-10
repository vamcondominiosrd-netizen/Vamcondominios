"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import NominaMenu from "../NominaMenu";

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

const estadosNomina = ["Todos", "Pendiente", "Aprobada", "Pagada", "Anulada"];

export default function ReportesNominaPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [nominas, setNominas] = useState<Nomina[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroPeriodo, setFiltroPeriodo] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    setCondominioId(id);
    setCondominioNombre(nombre);
    if (id) cargarReporte(id, filtroPeriodo);
  }, []);

  async function cargarReporte(id: string, periodoBuscar: string) {
    setLoading(true);

    let query = supabase
      .from("rh_nomina")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("nombre_empleado", { ascending: true });

    if (periodoBuscar) query = query.eq("periodo", periodoBuscar);

    const { data, error } = await query;
    setLoading(false);

    if (error) {
      alert("Error cargando reporte de nómina: " + error.message);
      return;
    }

    setNominas((data as Nomina[]) || []);
  }

  function moneda(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  function buscar() {
    if (!condominioId) return;
    cargarReporte(condominioId, filtroPeriodo);
  }

  function imprimir() {
    window.print();
  }

  const reportesFiltrados = nominas.filter((item) => {
    const texto = `${item.nombre_empleado || ""} ${item.numero_empleado || ""} ${
      item.cargo || ""
    } ${item.departamento || ""}`
      .toLowerCase()
      .trim();

    const coincideBusqueda = texto.includes(busqueda.toLowerCase().trim());
    const coincideEstado =
      filtroEstado === "Todos" ? true : item.estado === filtroEstado;

    return coincideBusqueda && coincideEstado;
  });

  function exportarCSV() {
    const encabezados = [
      "Periodo",
      "No. Empleado",
      "Empleado",
      "Cargo",
      "Departamento",
      "Salario Base",
      "Horas Extras RD$",
      "Bonificacion",
      "Pago Vacaciones",
      "Total Ingresos",
      "AFP",
      "SFS",
      "ISR",
      "Otros Descuentos",
      "Total Descuentos",
      "Neto Pagar",
      "Estado",
      "Fecha Pago",
      "Pagado Por",
    ];

    const contenido = [
      encabezados.join(","),
      ...reportesFiltrados.map((item) =>
        [
          item.periodo || "",
          item.numero_empleado || "",
          item.nombre_empleado || "",
          item.cargo || "",
          item.departamento || "",
          Number(item.salario_base || 0),
          Number(item.monto_horas_extras || 0),
          Number(item.bonificacion || 0),
          Number(item.pago_vacaciones || 0),
          Number(item.total_ingresos || 0),
          Number(item.afp || 0),
          Number(item.sfs || 0),
          Number(item.isr || 0),
          Number(item.otros_descuentos || 0),
          Number(item.total_descuentos || 0),
          Number(item.neto_pagar || 0),
          item.estado || "",
          item.fecha_pago || "",
          item.pagado_por || "",
        ]
          .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `reporte-nomina-${filtroPeriodo || "general"}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  const totalEmpleados = new Set(
    reportesFiltrados.map((item) => item.empleado_id)
  ).size;

  const totalSalarioBase = reportesFiltrados.reduce(
    (sum, item) => sum + Number(item.salario_base || 0),
    0
  );

  const totalHorasExtras = reportesFiltrados.reduce(
    (sum, item) => sum + Number(item.monto_horas_extras || 0),
    0
  );

  const totalBonificacion = reportesFiltrados.reduce(
    (sum, item) => sum + Number(item.bonificacion || 0),
    0
  );

  const totalVacaciones = reportesFiltrados.reduce(
    (sum, item) => sum + Number(item.pago_vacaciones || 0),
    0
  );

  const totalIngresos = reportesFiltrados.reduce(
    (sum, item) => sum + Number(item.total_ingresos || 0),
    0
  );

  const totalAFP = reportesFiltrados.reduce(
    (sum, item) => sum + Number(item.afp || 0),
    0
  );

  const totalSFS = reportesFiltrados.reduce(
    (sum, item) => sum + Number(item.sfs || 0),
    0
  );

  const totalISR = reportesFiltrados.reduce(
    (sum, item) => sum + Number(item.isr || 0),
    0
  );

  const totalOtrosDescuentos = reportesFiltrados.reduce(
    (sum, item) => sum + Number(item.otros_descuentos || 0),
    0
  );

  const totalDescuentos = reportesFiltrados.reduce(
    (sum, item) => sum + Number(item.total_descuentos || 0),
    0
  );

  const totalNeto = reportesFiltrados.reduce(
    (sum, item) => sum + Number(item.neto_pagar || 0),
    0
  );

  const pendientes = reportesFiltrados.filter(
    (item) => item.estado === "Pendiente"
  ).length;

  const aprobadas = reportesFiltrados.filter(
    (item) => item.estado === "Aprobada"
  ).length;

  const pagadas = reportesFiltrados.filter(
    (item) => item.estado === "Pagada"
  ).length;

  const anuladas = reportesFiltrados.filter(
    (item) => item.estado === "Anulada"
  ).length;

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

  const labelClass = "mb-1 block text-xs font-semibold text-slate-700";

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-2 pb-6">
      <NominaMenu />

      <div className="no-print rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Reportes de Nómina
            </h1>
            <p className="text-sm text-slate-500">
              Resumen financiero por período, empleado, estado y conceptos.
            </p>
          </div>

          <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm">
            <span className="text-slate-500">Condominio: </span>
            <span className="font-bold text-slate-800">
              {condominioNombre || "No identificado"}
            </span>
          </div>
        </div>
      </div>

      <div className="no-print rounded-xl border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <label className={labelClass}>Período</label>
            <input
              type="month"
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              {estadosNomina.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Buscar</label>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={inputClass}
              placeholder="Empleado, cargo..."
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={buscar}
              className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
            >
              Buscar
            </button>
          </div>

          <div className="flex items-end">
            <button
              onClick={exportarCSV}
              className="w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800"
            >
              Exportar
            </button>
          </div>
        </div>
      </div>

      <div className="print-area space-y-4">
        <div className="hidden print:block">
          <h1 className="text-2xl font-black">Reporte de Nómina</h1>
          <p>
            <strong>Condominio:</strong> {condominioNombre || "-"}
          </p>
          <p>
            <strong>Período:</strong> {filtroPeriodo || "General"}
          </p>
          <p>
            <strong>Estado:</strong> {filtroEstado}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-xl border bg-white p-3 shadow-sm">
            <p className="text-xs text-slate-500">Registros</p>
            <h2 className="text-2xl font-black">{reportesFiltrados.length}</h2>
          </div>

          <div className="rounded-xl border bg-white p-3 shadow-sm">
            <p className="text-xs text-slate-500">Empleados</p>
            <h2 className="text-2xl font-black text-blue-700">
              {totalEmpleados}
            </h2>
          </div>

          <div className="rounded-xl border bg-white p-3 shadow-sm">
            <p className="text-xs text-slate-500">Ingresos</p>
            <h2 className="text-xl font-black text-green-700">
              RD${moneda(totalIngresos)}
            </h2>
          </div>

          <div className="rounded-xl border bg-white p-3 shadow-sm">
            <p className="text-xs text-slate-500">Descuentos</p>
            <h2 className="text-xl font-black text-red-700">
              RD${moneda(totalDescuentos)}
            </h2>
          </div>

          <div className="rounded-xl border bg-white p-3 shadow-sm">
            <p className="text-xs text-slate-500">Neto</p>
            <h2 className="text-xl font-black text-blue-700">
              RD${moneda(totalNeto)}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border bg-white p-3 shadow-sm">
            <p className="text-xs text-slate-500">Pendientes</p>
            <h2 className="text-2xl font-black text-yellow-700">
              {pendientes}
            </h2>
          </div>

          <div className="rounded-xl border bg-white p-3 shadow-sm">
            <p className="text-xs text-slate-500">Aprobadas</p>
            <h2 className="text-2xl font-black text-blue-700">{aprobadas}</h2>
          </div>

          <div className="rounded-xl border bg-white p-3 shadow-sm">
            <p className="text-xs text-slate-500">Pagadas</p>
            <h2 className="text-2xl font-black text-green-700">{pagadas}</h2>
          </div>

          <div className="rounded-xl border bg-white p-3 shadow-sm">
            <p className="text-xs text-slate-500">Anuladas</p>
            <h2 className="text-2xl font-black text-red-700">{anuladas}</h2>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Resumen por concepto
              </h2>
              <p className="text-sm text-slate-500">
                Totales agrupados de ingresos, deducciones y neto.
              </p>
            </div>

            <button
              onClick={imprimir}
              className="no-print rounded-lg bg-slate-700 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              Imprimir / PDF
            </button>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border p-2 text-left">Concepto</th>
                  <th className="border p-2 text-right">Monto</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td className="border p-2 font-bold">Salario base</td>
                  <td className="border p-2 text-right font-bold">
                    RD${moneda(totalSalarioBase)}
                  </td>
                </tr>

                <tr>
                  <td className="border p-2 font-bold">Horas extras</td>
                  <td className="border p-2 text-right font-bold">
                    RD${moneda(totalHorasExtras)}
                  </td>
                </tr>

                <tr>
                  <td className="border p-2 font-bold">Bonificación</td>
                  <td className="border p-2 text-right font-bold">
                    RD${moneda(totalBonificacion)}
                  </td>
                </tr>

                <tr>
                  <td className="border p-2 font-bold">Pago vacaciones</td>
                  <td className="border p-2 text-right font-bold text-purple-700">
                    RD${moneda(totalVacaciones)}
                  </td>
                </tr>

                <tr className="bg-green-50">
                  <td className="border p-2 font-black">Total ingresos</td>
                  <td className="border p-2 text-right font-black text-green-700">
                    RD${moneda(totalIngresos)}
                  </td>
                </tr>

                <tr>
                  <td className="border p-2 font-bold">AFP</td>
                  <td className="border p-2 text-right font-bold text-red-700">
                    RD${moneda(totalAFP)}
                  </td>
                </tr>

                <tr>
                  <td className="border p-2 font-bold">SFS</td>
                  <td className="border p-2 text-right font-bold text-red-700">
                    RD${moneda(totalSFS)}
                  </td>
                </tr>

                <tr>
                  <td className="border p-2 font-bold">ISR</td>
                  <td className="border p-2 text-right font-bold text-red-700">
                    RD${moneda(totalISR)}
                  </td>
                </tr>

                <tr>
                  <td className="border p-2 font-bold">Otros descuentos</td>
                  <td className="border p-2 text-right font-bold text-red-700">
                    RD${moneda(totalOtrosDescuentos)}
                  </td>
                </tr>

                <tr className="bg-red-50">
                  <td className="border p-2 font-black">Total descuentos</td>
                  <td className="border p-2 text-right font-black text-red-700">
                    RD${moneda(totalDescuentos)}
                  </td>
                </tr>

                <tr className="bg-blue-50">
                  <td className="border p-2 font-black">Neto pagado</td>
                  <td className="border p-2 text-right font-black text-blue-700">
                    RD${moneda(totalNeto)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-slate-900">
            Detalle por empleado
          </h2>

          {loading ? (
            <div className="text-sm text-slate-500">Cargando reporte...</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border p-2 text-left">Empleado</th>
                    <th className="border p-2 text-left">Cargo</th>
                    <th className="border p-2 text-right">Ingresos</th>
                    <th className="border p-2 text-right">Vacaciones</th>
                    <th className="border p-2 text-right">AFP</th>
                    <th className="border p-2 text-right">SFS</th>
                    <th className="border p-2 text-right">ISR</th>
                    <th className="border p-2 text-right">Otros</th>
                    <th className="border p-2 text-right">Descuentos</th>
                    <th className="border p-2 text-right">Neto</th>
                    <th className="border p-2 text-center">Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {reportesFiltrados.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="border p-2">
                        <p className="font-bold">{item.nombre_empleado}</p>
                        <p className="text-[11px] text-slate-500">
                          {item.numero_empleado || "-"} · {item.periodo}
                        </p>
                      </td>

                      <td className="border p-2">
                        <p>{item.cargo || "-"}</p>
                        <p className="text-[11px] text-slate-500">
                          {item.departamento || "-"}
                        </p>
                      </td>

                      <td className="border p-2 text-right font-bold text-green-700">
                        RD${moneda(item.total_ingresos)}
                      </td>

                      <td className="border p-2 text-right font-bold text-purple-700">
                        RD${moneda(item.pago_vacaciones)}
                      </td>

                      <td className="border p-2 text-right font-bold text-red-700">
                        RD${moneda(item.afp)}
                      </td>

                      <td className="border p-2 text-right font-bold text-red-700">
                        RD${moneda(item.sfs)}
                      </td>

                      <td className="border p-2 text-right font-bold text-red-700">
                        RD${moneda(item.isr)}
                      </td>

                      <td className="border p-2 text-right font-bold text-red-700">
                        RD${moneda(item.otros_descuentos)}
                      </td>

                      <td className="border p-2 text-right font-bold text-red-700">
                        RD${moneda(item.total_descuentos)}
                      </td>

                      <td className="border p-2 text-right font-black text-blue-700">
                        RD${moneda(item.neto_pagar)}
                      </td>

                      <td className="border p-2 text-center">
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                            item.estado === "Pagada"
                              ? "bg-green-100 text-green-700"
                              : item.estado === "Aprobada"
                              ? "bg-blue-100 text-blue-700"
                              : item.estado === "Anulada"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {item.estado}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {reportesFiltrados.length === 0 && (
                    <tr>
                      <td
                        className="border p-4 text-center text-slate-500"
                        colSpan={11}
                      >
                        No hay datos para este reporte.
                      </td>
                    </tr>
                  )}
                </tbody>

                {reportesFiltrados.length > 0 && (
                  <tfoot className="bg-slate-100 font-black">
                    <tr>
                      <td className="border p-2" colSpan={2}>
                        Totales
                      </td>
                      <td className="border p-2 text-right text-green-700">
                        RD${moneda(totalIngresos)}
                      </td>
                      <td className="border p-2 text-right text-purple-700">
                        RD${moneda(totalVacaciones)}
                      </td>
                      <td className="border p-2 text-right text-red-700">
                        RD${moneda(totalAFP)}
                      </td>
                      <td className="border p-2 text-right text-red-700">
                        RD${moneda(totalSFS)}
                      </td>
                      <td className="border p-2 text-right text-red-700">
                        RD${moneda(totalISR)}
                      </td>
                      <td className="border p-2 text-right text-red-700">
                        RD${moneda(totalOtrosDescuentos)}
                      </td>
                      <td className="border p-2 text-right text-red-700">
                        RD${moneda(totalDescuentos)}
                      </td>
                      <td className="border p-2 text-right text-blue-700">
                        RD${moneda(totalNeto)}
                      </td>
                      <td className="border p-2"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          html,
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 10px !important;
          }

          .no-print,
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
          }

          .print-area table {
            font-size: 9px !important;
            line-height: 1.1 !important;
          }

          .print-area td,
          .print-area th {
            padding: 4px 5px !important;
          }

          @page {
            size: letter landscape;
            margin: 0.25in;
          }
        }
      `}</style>
    </div>
  );
}