"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  vacaciones_id: number | null;
  pago_vacaciones: number;
  dias_vacaciones: number;
  tipo_nomina_id: number | null;
  tipo_nomina: string;
};

const estados = ["Todos", "Pendiente", "Aprobada", "Pagada", "Anulada"];

export default function ReporteNominaPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [nominas, setNominas] = useState<Nomina[]>([]);
  const [loading, setLoading] = useState(false);

  const [periodoDesde, setPeriodoDesde] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [periodoHasta, setPeriodoHasta] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [filtroTipoNomina, setFiltroTipoNomina] = useState("Todos");
  const [filtroDepartamento, setFiltroDepartamento] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarNominas(id);
    }
  }, []);

  async function cargarNominas(id: string) {
    setLoading(true);

    let query = supabase
      .from("rh_nomina")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("periodo", { ascending: false })
      .order("created_at", { ascending: false });

    if (periodoDesde) {
      query = query.gte("periodo", periodoDesde);
    }

    if (periodoHasta) {
      query = query.lte("periodo", periodoHasta);
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
      maximumFractionDigits: 2,
    });
  }

  function fecha(valor: string) {
    if (!valor) return "-";

    const partes = valor.split("-");
    if (partes.length !== 3) return valor;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  const tiposNomina = useMemo(() => {
    const lista = nominas
      .map((n) => n.tipo_nomina || "Nómina Regular")
      .filter((x) => x && x.trim() !== "");

    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [nominas]);

  const departamentos = useMemo(() => {
    const lista = nominas
      .map((n) => n.departamento)
      .filter((x) => x && x.trim() !== "");

    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [nominas]);

  const nominasFiltradas = nominas.filter((n) => {
    const texto = `${n.numero_empleado || ""} ${n.nombre_empleado || ""} ${
      n.cargo || ""
    } ${n.departamento || ""} ${n.tipo_nomina || ""}`
      .toLowerCase()
      .trim();

    const coincideBusqueda = texto.includes(busqueda.toLowerCase().trim());

    const coincideTipo =
      filtroTipoNomina === "Todos" ||
      (n.tipo_nomina || "Nómina Regular") === filtroTipoNomina;

    const coincideDepartamento =
      filtroDepartamento === "Todos" || n.departamento === filtroDepartamento;

    const coincideEstado =
      filtroEstado === "Todos" || n.estado === filtroEstado;

    return (
      coincideBusqueda &&
      coincideTipo &&
      coincideDepartamento &&
      coincideEstado
    );
  });

  const empleadosProcesados = new Set(
    nominasFiltradas.map((n) => n.empleado_id)
  ).size;

  const totalIngresos = nominasFiltradas.reduce(
    (sum, n) => sum + Number(n.total_ingresos || 0),
    0
  );

  const totalSalarioBase = nominasFiltradas.reduce(
    (sum, n) => sum + Number(n.salario_base || 0),
    0
  );

  const totalHorasExtras = nominasFiltradas.reduce(
    (sum, n) => sum + Number(n.monto_horas_extras || 0),
    0
  );

  const totalBonificacion = nominasFiltradas.reduce(
    (sum, n) => sum + Number(n.bonificacion || 0),
    0
  );

  const totalVacaciones = nominasFiltradas.reduce(
    (sum, n) => sum + Number(n.pago_vacaciones || 0),
    0
  );

  const totalAFP = nominasFiltradas.reduce(
    (sum, n) => sum + Number(n.afp || 0),
    0
  );

  const totalSFS = nominasFiltradas.reduce(
    (sum, n) => sum + Number(n.sfs || 0),
    0
  );

  const totalISR = nominasFiltradas.reduce(
    (sum, n) => sum + Number(n.isr || 0),
    0
  );

  const totalOtrosDescuentos = nominasFiltradas.reduce(
    (sum, n) => sum + Number(n.otros_descuentos || 0),
    0
  );

  const totalDescuentos = nominasFiltradas.reduce(
    (sum, n) => sum + Number(n.total_descuentos || 0),
    0
  );

  const totalNeto = nominasFiltradas.reduce(
    (sum, n) => sum + Number(n.neto_pagar || 0),
    0
  );

  function limpiarFiltros() {
    setPeriodoDesde(new Date().toISOString().slice(0, 7));
    setPeriodoHasta(new Date().toISOString().slice(0, 7));
    setFiltroTipoNomina("Todos");
    setFiltroDepartamento("Todos");
    setFiltroEstado("Todos");
    setBusqueda("");
  }

  function imprimir() {
    window.print();
  }

  function exportarCSV() {
    const encabezados = [
      "Periodo",
      "No. Empleado",
      "Empleado",
      "Cargo",
      "Departamento",
      "Tipo Nomina",
      "Fecha Pago",
      "Dias Trabajados",
      "Salario Base",
      "Horas Extras",
      "Monto Horas Extras",
      "Bonificacion",
      "Dias Vacaciones",
      "Pago Vacaciones",
      "Total Ingresos",
      "AFP",
      "SFS",
      "ISR",
      "Otros Descuentos",
      "Total Descuentos",
      "Neto Pagar",
      "Estado",
      "Pagado Por",
      "Fecha Registro Pago",
    ];

    const filas = nominasFiltradas.map((n) => [
      n.periodo || "",
      n.numero_empleado || "",
      n.nombre_empleado || "",
      n.cargo || "",
      n.departamento || "",
      n.tipo_nomina || "Nómina Regular",
      n.fecha_pago || "",
      n.dias_trabajados || 0,
      Number(n.salario_base || 0).toFixed(2),
      Number(n.horas_extras || 0).toFixed(2),
      Number(n.monto_horas_extras || 0).toFixed(2),
      Number(n.bonificacion || 0).toFixed(2),
      Number(n.dias_vacaciones || 0).toFixed(2),
      Number(n.pago_vacaciones || 0).toFixed(2),
      Number(n.total_ingresos || 0).toFixed(2),
      Number(n.afp || 0).toFixed(2),
      Number(n.sfs || 0).toFixed(2),
      Number(n.isr || 0).toFixed(2),
      Number(n.otros_descuentos || 0).toFixed(2),
      Number(n.total_descuentos || 0).toFixed(2),
      Number(n.neto_pagar || 0).toFixed(2),
      n.estado || "",
      n.pagado_por || "",
      n.fecha_registro_pago || "",
    ]);

    const contenido = [encabezados, ...filas]
      .map((fila) =>
        fila
          .map((campo) => `"${String(campo).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_nomina_${periodoDesde || "desde"}_${
      periodoHasta || "hasta"
    }.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <h1 className="text-4xl font-black text-slate-900">
          Reporte de Nómina
        </h1>

        <p className="text-slate-500 mt-2">
          Consulta general de nómina por período, tipo de nómina, departamento y estado.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border no-print">
        <p className="text-sm text-slate-500">Condominio activo</p>
        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 no-print">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Registros</p>
          <h2 className="text-3xl font-black">{nominasFiltradas.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Empleados</p>
          <h2 className="text-3xl font-black text-blue-700">
            {empleadosProcesados}
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
          <p className="text-sm text-slate-500">Neto pagado</p>
          <h2 className="text-2xl font-black text-blue-700">
            RD${moneda(totalNeto)}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <h2 className="text-xl font-black mb-4">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Período desde
            </label>
            <input
              type="month"
              value={periodoDesde}
              onChange={(e) => setPeriodoDesde(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Período hasta
            </label>
            <input
              type="month"
              value={periodoHasta}
              onChange={(e) => setPeriodoHasta(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Tipo de nómina
            </label>
            <select
              value={filtroTipoNomina}
              onChange={(e) => setFiltroTipoNomina(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {tiposNomina.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Departamento
            </label>
            <select
              value={filtroDepartamento}
              onChange={(e) => setFiltroDepartamento(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {departamentos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {estados.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">Buscar</label>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Empleado, código, cargo, departamento..."
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={limpiarFiltros}
              className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-3 rounded-xl font-bold w-full"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-5">
          <button
            onClick={() => condominioId && cargarNominas(condominioId)}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Buscar / Actualizar
          </button>

          <button
            onClick={exportarCSV}
            className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Exportar Excel
          </button>

          <button
            onClick={imprimir}
            className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Imprimir
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6 print-area">
        <div className="mb-5 hidden print:block">
          <h1 className="text-2xl font-black">Reporte de Nómina</h1>
          <p>{condominioNombre}</p>
          <p className="text-sm">
            Período: {periodoDesde || "-"} al {periodoHasta || "-"}
          </p>
          <p className="text-sm">
            Fecha: {new Date().toLocaleDateString("es-DO")}
          </p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-black">Detalle de nómina</h2>
            <p className="text-sm text-slate-500">
              {nominasFiltradas.length} registro(s) encontrado(s).
            </p>
          </div>

          <div className="text-sm text-slate-500">
            Neto pagado:{" "}
            <span className="font-black text-blue-700">
              RD${moneda(totalNeto)}
            </span>
          </div>
        </div>

        {loading ? (
          <div>Cargando reporte de nómina...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 border text-left">Empleado</th>
                  <th className="p-2 border text-left">Período</th>
                  <th className="p-2 border text-left">Tipo</th>
                  <th className="p-2 border text-right">Salario</th>
                  <th className="p-2 border text-right">Horas Ext.</th>
                  <th className="p-2 border text-right">Bonif.</th>
                  <th className="p-2 border text-right">Vacac.</th>
                  <th className="p-2 border text-right">Ingresos</th>
                  <th className="p-2 border text-right">AFP</th>
                  <th className="p-2 border text-right">SFS</th>
                  <th className="p-2 border text-right">ISR</th>
                  <th className="p-2 border text-right">Otros Desc.</th>
                  <th className="p-2 border text-right">Desc.</th>
                  <th className="p-2 border text-right">Neto</th>
                  <th className="p-2 border text-center">Estado</th>
                  <th className="p-2 border text-center no-print">Recibo</th>
                </tr>
              </thead>

              <tbody>
                {nominasFiltradas.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="p-2 border">
                      <p className="font-bold">{n.nombre_empleado}</p>
                      <p className="text-xs text-slate-500">
                        {n.numero_empleado || "-"} · {n.cargo || "-"} ·{" "}
                        {n.departamento || "-"}
                      </p>
                    </td>

                    <td className="p-2 border">
                      <p className="font-bold">{n.periodo}</p>
                      <p className="text-xs text-slate-500">
                        Pago: {fecha(n.fecha_pago)}
                      </p>
                    </td>

                    <td className="p-2 border">
                      {n.tipo_nomina || "Nómina Regular"}
                    </td>

                    <td className="p-2 border text-right">
                      RD${moneda(n.salario_base)}
                    </td>

                    <td className="p-2 border text-right">
                      RD${moneda(n.monto_horas_extras)}
                    </td>

                    <td className="p-2 border text-right">
                      RD${moneda(n.bonificacion)}
                    </td>

                    <td className="p-2 border text-right">
                      <p>RD${moneda(n.pago_vacaciones)}</p>
                      {Number(n.dias_vacaciones || 0) > 0 && (
                        <p className="text-xs text-slate-500">
                          {n.dias_vacaciones} días
                        </p>
                      )}
                    </td>

                    <td className="p-2 border text-right font-bold text-green-700">
                      RD${moneda(n.total_ingresos)}
                    </td>

                    <td className="p-2 border text-right text-red-700">
                      RD${moneda(n.afp)}
                    </td>

                    <td className="p-2 border text-right text-red-700">
                      RD${moneda(n.sfs)}
                    </td>

                    <td className="p-2 border text-right text-red-700">
                      RD${moneda(n.isr)}
                    </td>

                    <td className="p-2 border text-right text-red-700">
                      RD${moneda(n.otros_descuentos)}
                    </td>

                    <td className="p-2 border text-right font-bold text-red-700">
                      RD${moneda(n.total_descuentos)}
                    </td>

                    <td className="p-2 border text-right font-black text-blue-700">
                      RD${moneda(n.neto_pagar)}
                    </td>

                    <td className="p-2 border text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          n.estado === "Pagada"
                            ? "bg-green-100 text-green-700"
                            : n.estado === "Aprobada"
                            ? "bg-blue-100 text-blue-700"
                            : n.estado === "Anulada"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {n.estado}
                      </span>
                    </td>

                    <td className="p-2 border text-center no-print">
                      <Link
                        href={`/recursos-humanos/nomina/recibos/${n.id}`}
                        className="bg-purple-700 hover:bg-purple-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                      >
                        Recibo
                      </Link>
                    </td>
                  </tr>
                ))}

                {nominasFiltradas.length === 0 && (
                  <tr>
                    <td className="p-6 border text-center text-slate-500" colSpan={16}>
                      No hay registros de nómina para esta consulta.
                    </td>
                  </tr>
                )}
              </tbody>

              {nominasFiltradas.length > 0 && (
                <tfoot className="bg-slate-100 font-black">
                  <tr>
                    <td className="p-2 border" colSpan={3}>
                      Totales
                    </td>
                    <td className="p-2 border text-right">
                      RD${moneda(totalSalarioBase)}
                    </td>
                    <td className="p-2 border text-right">
                      RD${moneda(totalHorasExtras)}
                    </td>
                    <td className="p-2 border text-right">
                      RD${moneda(totalBonificacion)}
                    </td>
                    <td className="p-2 border text-right">
                      RD${moneda(totalVacaciones)}
                    </td>
                    <td className="p-2 border text-right text-green-700">
                      RD${moneda(totalIngresos)}
                    </td>
                    <td className="p-2 border text-right text-red-700">
                      RD${moneda(totalAFP)}
                    </td>
                    <td className="p-2 border text-right text-red-700">
                      RD${moneda(totalSFS)}
                    </td>
                    <td className="p-2 border text-right text-red-700">
                      RD${moneda(totalISR)}
                    </td>
                    <td className="p-2 border text-right text-red-700">
                      RD${moneda(totalOtrosDescuentos)}
                    </td>
                    <td className="p-2 border text-right text-red-700">
                      RD${moneda(totalDescuentos)}
                    </td>
                    <td className="p-2 border text-right text-blue-700">
                      RD${moneda(totalNeto)}
                    </td>
                    <td className="p-2 border" colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          aside,
          nav,
          header {
            display: none !important;
          }

          body {
            background: white !important;
            font-size: 10px !important;
          }

          .print-area {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }

          .print-area table {
            font-size: 8px !important;
          }

          .print-area th,
          .print-area td {
            padding: 3px 4px !important;
          }

          @page {
            size: landscape;
            margin: 0.25in;
          }
        }
      `}</style>
    </div>
  );
}
