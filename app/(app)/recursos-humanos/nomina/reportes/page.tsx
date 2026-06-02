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

    if (id) {
      cargarReporte(id, filtroPeriodo);
    }
  }, []);

  async function cargarReporte(id: string, periodoBuscar: string) {
    setLoading(true);

    let query = supabase
      .from("rh_nomina")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("nombre_empleado", { ascending: true });

    if (periodoBuscar) {
      query = query.eq("periodo", periodoBuscar);
    }

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

  function exportarCSV() {
    const filas = reportesFiltrados.map((item) => ({
      periodo: item.periodo || "",
      numero_empleado: item.numero_empleado || "",
      empleado: item.nombre_empleado || "",
      cargo: item.cargo || "",
      departamento: item.departamento || "",
      salario_base: Number(item.salario_base || 0),
      horas_extras: Number(item.monto_horas_extras || 0),
      bonificacion: Number(item.bonificacion || 0),
      pago_vacaciones: Number(item.pago_vacaciones || 0),
      total_ingresos: Number(item.total_ingresos || 0),
      afp: Number(item.afp || 0),
      sfs: Number(item.sfs || 0),
      isr: Number(item.isr || 0),
      otros_descuentos: Number(item.otros_descuentos || 0),
      total_descuentos: Number(item.total_descuentos || 0),
      neto_pagar: Number(item.neto_pagar || 0),
      estado: item.estado || "",
      fecha_pago: item.fecha_pago || "",
      pagado_por: item.pagado_por || "",
    }));

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
      ...filas.map((fila) =>
        [
          fila.periodo,
          fila.numero_empleado,
          fila.empleado,
          fila.cargo,
          fila.departamento,
          fila.salario_base,
          fila.horas_extras,
          fila.bonificacion,
          fila.pago_vacaciones,
          fila.total_ingresos,
          fila.afp,
          fila.sfs,
          fila.isr,
          fila.otros_descuentos,
          fila.total_descuentos,
          fila.neto_pagar,
          fila.estado,
          fila.fecha_pago,
          fila.pagado_por,
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

  const reportesFiltrados = nominas.filter((item) => {
    const texto = `${item.nombre_empleado || ""} ${
      item.numero_empleado || ""
    } ${item.cargo || ""} ${item.departamento || ""}`
      .toLowerCase()
      .trim();

    const coincideBusqueda = texto.includes(busqueda.toLowerCase().trim());

    const coincideEstado =
      filtroEstado === "Todos" ? true : item.estado === filtroEstado;

    return coincideBusqueda && coincideEstado;
  });

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

  return (
    <div className="space-y-6">
      <NominaMenu />

      <div className="no-print bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">
          Reportes de Nómina
        </h1>

        <p className="text-slate-500 mt-2">
          Resumen financiero de nómina por período, empleado, estado y conceptos.
        </p>
      </div>

      <div className="no-print bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>

        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="no-print bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Filtros del reporte</h2>

            <p className="text-sm text-slate-500">
              Filtra por período, estado, empleado, cargo o departamento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 w-full md:w-auto">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Período
              </label>

              <input
                type="month"
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Estado</label>

              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                {estadosNomina.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Buscar
              </label>

              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Empleado, cargo..."
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={buscar}
                className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold w-full"
              >
                Buscar
              </button>
            </div>

            <div className="flex items-end">
              <button
                onClick={exportarCSV}
                className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-xl font-bold w-full"
              >
                Exportar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="print-area space-y-6">
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

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Registros</p>
            <h2 className="text-3xl font-black">{reportesFiltrados.length}</h2>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Empleados</p>
            <h2 className="text-3xl font-black text-blue-700">
              {totalEmpleados}
            </h2>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Total ingresos</p>
            <h2 className="text-2xl font-black text-green-700">
              RD${moneda(totalIngresos)}
            </h2>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Total descuentos</p>
            <h2 className="text-2xl font-black text-red-700">
              RD${moneda(totalDescuentos)}
            </h2>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Total neto</p>
            <h2 className="text-2xl font-black text-blue-700">
              RD${moneda(totalNeto)}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Pendientes</p>
            <h2 className="text-3xl font-black text-yellow-700">
              {pendientes}
            </h2>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Aprobadas</p>
            <h2 className="text-3xl font-black text-blue-700">{aprobadas}</h2>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Pagadas</p>
            <h2 className="text-3xl font-black text-green-700">{pagadas}</h2>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Anuladas</p>
            <h2 className="text-3xl font-black text-red-700">{anuladas}</h2>
          </div>
        </div>

        <div className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-black">Resumen por concepto</h2>

              <p className="text-sm text-slate-500">
                Totales agrupados de ingresos, deducciones y neto.
              </p>
            </div>

            <button
              onClick={imprimir}
              className="no-print bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold"
            >
              Imprimir / PDF
            </button>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Concepto</th>
                  <th className="p-3 border text-right">Monto</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td className="p-3 border font-bold">Salario base</td>
                  <td className="p-3 border text-right font-bold">
                    RD${moneda(totalSalarioBase)}
                  </td>
                </tr>

                <tr>
                  <td className="p-3 border font-bold">Horas extras</td>
                  <td className="p-3 border text-right font-bold">
                    RD${moneda(totalHorasExtras)}
                  </td>
                </tr>

                <tr>
                  <td className="p-3 border font-bold">Bonificación</td>
                  <td className="p-3 border text-right font-bold">
                    RD${moneda(totalBonificacion)}
                  </td>
                </tr>

                <tr>
                  <td className="p-3 border font-bold">Pago vacaciones</td>
                  <td className="p-3 border text-right font-bold text-purple-700">
                    RD${moneda(totalVacaciones)}
                  </td>
                </tr>

                <tr className="bg-green-50">
                  <td className="p-3 border font-black">Total ingresos</td>
                  <td className="p-3 border text-right font-black text-green-700">
                    RD${moneda(totalIngresos)}
                  </td>
                </tr>

                <tr>
                  <td className="p-3 border font-bold">AFP</td>
                  <td className="p-3 border text-right font-bold text-red-700">
                    RD${moneda(totalAFP)}
                  </td>
                </tr>

                <tr>
                  <td className="p-3 border font-bold">SFS</td>
                  <td className="p-3 border text-right font-bold text-red-700">
                    RD${moneda(totalSFS)}
                  </td>
                </tr>

                <tr>
                  <td className="p-3 border font-bold">ISR</td>
                  <td className="p-3 border text-right font-bold text-red-700">
                    RD${moneda(totalISR)}
                  </td>
                </tr>

                <tr>
                  <td className="p-3 border font-bold">Otros descuentos</td>
                  <td className="p-3 border text-right font-bold text-red-700">
                    RD${moneda(totalOtrosDescuentos)}
                  </td>
                </tr>

                <tr className="bg-red-50">
                  <td className="p-3 border font-black">Total descuentos</td>
                  <td className="p-3 border text-right font-black text-red-700">
                    RD${moneda(totalDescuentos)}
                  </td>
                </tr>

                <tr className="bg-blue-50">
                  <td className="p-3 border font-black">Neto pagado</td>
                  <td className="p-3 border text-right font-black text-blue-700">
                    RD${moneda(totalNeto)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-3xl border shadow-sm p-6">
          <h2 className="text-xl font-black mb-4">Detalle por empleado</h2>

          {loading ? (
            <div>Cargando reporte...</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3 border text-left">Empleado</th>
                    <th className="p-3 border text-left">Cargo</th>
                    <th className="p-3 border text-right">Ingresos</th>
                    <th className="p-3 border text-right">Vacaciones</th>
                    <th className="p-3 border text-right">AFP</th>
                    <th className="p-3 border text-right">SFS</th>
                    <th className="p-3 border text-right">ISR</th>
                    <th className="p-3 border text-right">Otros desc.</th>
                    <th className="p-3 border text-right">Descuentos</th>
                    <th className="p-3 border text-right">Neto</th>
                    <th className="p-3 border text-center">Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {reportesFiltrados.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3 border">
                        <p className="font-bold">{item.nombre_empleado}</p>
                        <p className="text-xs text-slate-500">
                          {item.numero_empleado || "-"} · {item.periodo}
                        </p>
                      </td>

                      <td className="p-3 border">
                        <p>{item.cargo || "-"}</p>
                        <p className="text-xs text-slate-500">
                          {item.departamento || "-"}
                        </p>
                      </td>

                      <td className="p-3 border text-right font-bold text-green-700">
                        RD${moneda(item.total_ingresos)}
                      </td>

                      <td className="p-3 border text-right font-bold text-purple-700">
                        RD${moneda(item.pago_vacaciones)}
                      </td>

                      <td className="p-3 border text-right font-bold text-red-700">
                        RD${moneda(item.afp)}
                      </td>

                      <td className="p-3 border text-right font-bold text-red-700">
                        RD${moneda(item.sfs)}
                      </td>

                      <td className="p-3 border text-right font-bold text-red-700">
                        RD${moneda(item.isr)}
                      </td>

                      <td className="p-3 border text-right font-bold text-red-700">
                        RD${moneda(item.otros_descuentos)}
                      </td>

                      <td className="p-3 border text-right font-bold text-red-700">
                        RD${moneda(item.total_descuentos)}
                      </td>

                      <td className="p-3 border text-right font-black text-blue-700">
                        RD${moneda(item.neto_pagar)}
                      </td>

                      <td className="p-3 border text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
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
                        className="p-6 border text-center text-slate-500"
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
                      <td className="p-3 border" colSpan={2}>
                        Totales
                      </td>

                      <td className="p-3 border text-right text-green-700">
                        RD${moneda(totalIngresos)}
                      </td>

                      <td className="p-3 border text-right text-purple-700">
                        RD${moneda(totalVacaciones)}
                      </td>

                      <td className="p-3 border text-right text-red-700">
                        RD${moneda(totalAFP)}
                      </td>

                      <td className="p-3 border text-right text-red-700">
                        RD${moneda(totalSFS)}
                      </td>

                      <td className="p-3 border text-right text-red-700">
                        RD${moneda(totalISR)}
                      </td>

                      <td className="p-3 border text-right text-red-700">
                        RD${moneda(totalOtrosDescuentos)}
                      </td>

                      <td className="p-3 border text-right text-red-700">
                        RD${moneda(totalDescuentos)}
                      </td>

                      <td className="p-3 border text-right text-blue-700">
                        RD${moneda(totalNeto)}
                      </td>

                      <td className="p-3 border"></td>
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
          }

          .print-area .rounded-3xl,
          .print-area .rounded-2xl {
            border-radius: 6px !important;
          }

          .print-area .p-6,
          .print-area .p-5 {
            padding: 8px !important;
          }

          .print-area .gap-4,
          .print-area .gap-6 {
            gap: 6px !important;
          }

          .print-area h1 {
            font-size: 20px !important;
            line-height: 1.1 !important;
          }

          .print-area h2 {
            font-size: 15px !important;
            line-height: 1.1 !important;
          }

          .print-area p {
            margin: 1px 0 !important;
            line-height: 1.15 !important;
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