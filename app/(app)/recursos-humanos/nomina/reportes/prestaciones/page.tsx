"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type Prestacion = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  empleado_id: number;
  numero_empleado: string | null;
  nombre_empleado: string | null;
  cargo: string | null;
  departamento: string | null;
  fecha_ingreso: string | null;
  fecha_salida: string | null;
  salario_mensual: number | null;
  tipo_salida: string;
  tiempo_laborado: string | null;
  meses_laborados: number | null;
  anios_laborados: number | null;
  preaviso: number | null;
  cesantia: number | null;
  vacaciones_pendientes: number | null;
  regalia_proporcional: number | null;
  otros_pagos: number | null;
  descuentos: number | null;
  total_prestaciones: number | null;
  estado: string | null;
  observacion: string | null;
  calculado_por: string | null;
  fecha_calculo: string | null;
  created_at: string | null;
  salario_diario: number | null;
  dias_preaviso: number | null;
  dias_cesantia: number | null;
  dias_vacaciones: number | null;
};

const estados = ["Todos", "Pendiente", "Calculada", "Aprobada", "Pagada", "Anulada"];

export default function ReportePrestacionesPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [loading, setLoading] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroTipoSalida, setFiltroTipoSalida] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [anio, setAnio] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarPrestaciones(id);
    }
  }, []);

  async function cargarPrestaciones(id: string) {
    setLoading(true);

    let query = supabase
      .from("rh_prestaciones_laborales")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("fecha_salida", { ascending: false })
      .order("created_at", { ascending: false });

    if (anio) {
      query = query.gte("fecha_salida", `${anio}-01-01`).lte("fecha_salida", `${anio}-12-31`);
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      alert("Error cargando reporte de prestaciones: " + error.message);
      return;
    }

    setPrestaciones((data as Prestacion[]) || []);
  }

  function numero(valor: number | null | undefined) {
    return Number(valor || 0);
  }

  function moneda(valor: number | null | undefined) {
    return numero(valor).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function fecha(valor: string | null | undefined) {
    if (!valor) return "-";

    const partes = valor.split("-");
    if (partes.length !== 3) return valor;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  const tiposSalida = useMemo(() => {
    const lista = prestaciones
      .map((p) => p.tipo_salida || "")
      .filter((x) => x.trim() !== "");

    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [prestaciones]);

  const prestacionesFiltradas = prestaciones.filter((p) => {
    const texto = `${p.numero_empleado || ""} ${p.nombre_empleado || ""} ${
      p.cargo || ""
    } ${p.departamento || ""} ${p.tipo_salida || ""}`
      .toLowerCase()
      .trim();

    const coincideBusqueda = texto.includes(busqueda.toLowerCase().trim());

    const coincideTipo =
      filtroTipoSalida === "Todos" || p.tipo_salida === filtroTipoSalida;

    const coincideEstado =
      filtroEstado === "Todos" || p.estado === filtroEstado;

    const coincideDesde =
      !fechaDesde || (p.fecha_salida && p.fecha_salida >= fechaDesde);

    const coincideHasta =
      !fechaHasta || (p.fecha_salida && p.fecha_salida <= fechaHasta);

    return (
      coincideBusqueda &&
      coincideTipo &&
      coincideEstado &&
      coincideDesde &&
      coincideHasta
    );
  });

  const totalRegistros = prestacionesFiltradas.length;
  const totalPendientes = prestacionesFiltradas.filter(
    (p) => p.estado === "Pendiente" || p.estado === "Calculada"
  ).length;
  const totalAprobadas = prestacionesFiltradas.filter(
    (p) => p.estado === "Aprobada"
  ).length;
  const totalPagadas = prestacionesFiltradas.filter(
    (p) => p.estado === "Pagada"
  ).length;
  const totalAnuladas = prestacionesFiltradas.filter(
    (p) => p.estado === "Anulada"
  ).length;

  const totalPreaviso = prestacionesFiltradas.reduce(
    (sum, p) => sum + numero(p.preaviso),
    0
  );
  const totalCesantia = prestacionesFiltradas.reduce(
    (sum, p) => sum + numero(p.cesantia),
    0
  );
  const totalVacaciones = prestacionesFiltradas.reduce(
    (sum, p) => sum + numero(p.vacaciones_pendientes),
    0
  );
  const totalRegalia = prestacionesFiltradas.reduce(
    (sum, p) => sum + numero(p.regalia_proporcional),
    0
  );
  const totalOtrosPagos = prestacionesFiltradas.reduce(
    (sum, p) => sum + numero(p.otros_pagos),
    0
  );
  const totalDescuentos = prestacionesFiltradas.reduce(
    (sum, p) => sum + numero(p.descuentos),
    0
  );
  const totalGeneral = prestacionesFiltradas.reduce(
    (sum, p) => sum + numero(p.total_prestaciones),
    0
  );

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroTipoSalida("Todos");
    setFiltroEstado("Todos");
    setFechaDesde("");
    setFechaHasta("");
    setAnio(String(new Date().getFullYear()));
  }

  function imprimir() {
    window.print();
  }

  function exportarCSV() {
    const encabezados = [
      "No. Empleado",
      "Empleado",
      "Cargo",
      "Departamento",
      "Fecha Ingreso",
      "Fecha Salida",
      "Tipo Salida",
      "Tiempo Laborado",
      "Salario Mensual",
      "Salario Diario",
      "Dias Preaviso",
      "Preaviso",
      "Dias Cesantia",
      "Cesantia",
      "Dias Vacaciones",
      "Vacaciones Pendientes",
      "Regalia Proporcional",
      "Otros Pagos",
      "Descuentos",
      "Total Prestaciones",
      "Estado",
      "Calculado Por",
      "Fecha Calculo",
    ];

    const filas = prestacionesFiltradas.map((p) => [
      p.numero_empleado || "",
      p.nombre_empleado || "",
      p.cargo || "",
      p.departamento || "",
      p.fecha_ingreso || "",
      p.fecha_salida || "",
      p.tipo_salida || "",
      p.tiempo_laborado || "",
      numero(p.salario_mensual).toFixed(2),
      numero(p.salario_diario).toFixed(2),
      numero(p.dias_preaviso).toFixed(2),
      numero(p.preaviso).toFixed(2),
      numero(p.dias_cesantia).toFixed(2),
      numero(p.cesantia).toFixed(2),
      numero(p.dias_vacaciones).toFixed(2),
      numero(p.vacaciones_pendientes).toFixed(2),
      numero(p.regalia_proporcional).toFixed(2),
      numero(p.otros_pagos).toFixed(2),
      numero(p.descuentos).toFixed(2),
      numero(p.total_prestaciones).toFixed(2),
      p.estado || "",
      p.calculado_por || "",
      p.fecha_calculo || "",
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
    a.download = `reporte_prestaciones_${anio || "todos"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <h1 className="text-4xl font-black text-slate-900">
          Reporte de Prestaciones
        </h1>

        <p className="text-slate-500 mt-2">
          Consulta de prestaciones laborales por empleado, tipo de salida, estado y fecha.
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
          <h2 className="text-3xl font-black">{totalRegistros}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Pendientes/Calculadas</p>
          <h2 className="text-3xl font-black text-yellow-700">
            {totalPendientes}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Aprobadas</p>
          <h2 className="text-3xl font-black text-blue-700">
            {totalAprobadas}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Pagadas</p>
          <h2 className="text-3xl font-black text-green-700">
            {totalPagadas}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Anuladas</p>
          <h2 className="text-3xl font-black text-red-700">
            {totalAnuladas}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Preaviso</p>
          <h2 className="text-2xl font-black text-slate-700">
            RD${moneda(totalPreaviso)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Cesantía</p>
          <h2 className="text-2xl font-black text-slate-700">
            RD${moneda(totalCesantia)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Vacaciones</p>
          <h2 className="text-2xl font-black text-purple-700">
            RD${moneda(totalVacaciones)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Regalía</p>
          <h2 className="text-2xl font-black text-green-700">
            RD${moneda(totalRegalia)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Otros pagos</p>
          <h2 className="text-2xl font-black text-blue-700">
            RD${moneda(totalOtrosPagos)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Descuentos</p>
          <h2 className="text-2xl font-black text-red-700">
            RD${moneda(totalDescuentos)}
          </h2>
        </div>

        <div className="md:col-span-2 bg-slate-900 rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-300">Total prestaciones</p>
          <h2 className="text-3xl font-black text-white">
            RD${moneda(totalGeneral)}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <h2 className="text-xl font-black mb-4">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Año</label>
            <input
              type="number"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="2026"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Buscar</label>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Empleado, código, cargo..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Tipo de salida
            </label>
            <select
              value={filtroTipoSalida}
              onChange={(e) => setFiltroTipoSalida(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {tiposSalida.map((item) => (
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

          <div>
            <label className="block text-sm font-semibold mb-1">
              Salida desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Salida hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-5">
          <button
            onClick={() => condominioId && cargarPrestaciones(condominioId)}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Buscar / Actualizar
          </button>

          <button
            onClick={limpiarFiltros}
            className="bg-slate-600 hover:bg-slate-700 text-white px-5 py-3 rounded-xl font-bold"
          >
            Limpiar
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
          <h1 className="text-2xl font-black">Reporte de Prestaciones</h1>
          <p>{condominioNombre}</p>
          <p className="text-sm">Año: {anio || "Todos"}</p>
          <p className="text-sm">Fecha: {new Date().toLocaleDateString("es-DO")}</p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-black">Detalle de prestaciones</h2>
            <p className="text-sm text-slate-500">
              {prestacionesFiltradas.length} registro(s) encontrado(s).
            </p>
          </div>

          <div className="text-sm text-slate-500">
            Total prestaciones:{" "}
            <span className="font-black text-blue-700">
              RD${moneda(totalGeneral)}
            </span>
          </div>
        </div>

        {loading ? (
          <div>Cargando prestaciones...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 border text-left">Empleado</th>
                  <th className="p-2 border text-left">Salida</th>
                  <th className="p-2 border text-left">Tiempo</th>
                  <th className="p-2 border text-right">Preaviso</th>
                  <th className="p-2 border text-right">Cesantía</th>
                  <th className="p-2 border text-right">Vacaciones</th>
                  <th className="p-2 border text-right">Regalía</th>
                  <th className="p-2 border text-right">Otros</th>
                  <th className="p-2 border text-right">Desc.</th>
                  <th className="p-2 border text-right">Total</th>
                  <th className="p-2 border text-center">Estado</th>
                  <th className="p-2 border text-center no-print">Recibo</th>
                </tr>
              </thead>

              <tbody>
                {prestacionesFiltradas.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-2 border">
                      <p className="font-bold">{p.nombre_empleado}</p>
                      <p className="text-xs text-slate-500">
                        {p.numero_empleado || "-"} · {p.cargo || "-"} ·{" "}
                        {p.departamento || "-"}
                      </p>
                    </td>

                    <td className="p-2 border">
                      <p className="font-bold">{p.tipo_salida}</p>
                      <p className="text-xs text-slate-500">
                        {fecha(p.fecha_salida)}
                      </p>
                    </td>

                    <td className="p-2 border">
                      <p>{p.tiempo_laborado || "-"}</p>
                      <p className="text-xs text-slate-500">
                        Ingreso: {fecha(p.fecha_ingreso)}
                      </p>
                    </td>

                    <td className="p-2 border text-right">
                      <p>RD${moneda(p.preaviso)}</p>
                      {numero(p.dias_preaviso) > 0 && (
                        <p className="text-xs text-slate-500">
                          {numero(p.dias_preaviso).toFixed(2)} días
                        </p>
                      )}
                    </td>

                    <td className="p-2 border text-right">
                      <p>RD${moneda(p.cesantia)}</p>
                      {numero(p.dias_cesantia) > 0 && (
                        <p className="text-xs text-slate-500">
                          {numero(p.dias_cesantia).toFixed(2)} días
                        </p>
                      )}
                    </td>

                    <td className="p-2 border text-right">
                      <p>RD${moneda(p.vacaciones_pendientes)}</p>
                      {numero(p.dias_vacaciones) > 0 && (
                        <p className="text-xs text-slate-500">
                          {numero(p.dias_vacaciones).toFixed(2)} días
                        </p>
                      )}
                    </td>

                    <td className="p-2 border text-right">
                      RD${moneda(p.regalia_proporcional)}
                    </td>

                    <td className="p-2 border text-right">
                      RD${moneda(p.otros_pagos)}
                    </td>

                    <td className="p-2 border text-right text-red-700">
                      RD${moneda(p.descuentos)}
                    </td>

                    <td className="p-2 border text-right font-black text-blue-700">
                      RD${moneda(p.total_prestaciones)}
                    </td>

                    <td className="p-2 border text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          p.estado === "Pagada"
                            ? "bg-green-100 text-green-700"
                            : p.estado === "Aprobada"
                            ? "bg-blue-100 text-blue-700"
                            : p.estado === "Anulada"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {p.estado || "-"}
                      </span>
                    </td>

                    <td className="p-2 border text-center no-print">
                      <Link
                        href={`/recursos-humanos/prestaciones/recibo/${p.id}`}
                        className="bg-purple-700 hover:bg-purple-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                      >
                        Recibo
                      </Link>
                    </td>
                  </tr>
                ))}

                {prestacionesFiltradas.length === 0 && (
                  <tr>
                    <td className="p-6 border text-center text-slate-500" colSpan={12}>
                      No hay prestaciones para esta consulta.
                    </td>
                  </tr>
                )}
              </tbody>

              {prestacionesFiltradas.length > 0 && (
                <tfoot className="bg-slate-100 font-black">
                  <tr>
                    <td className="p-2 border" colSpan={3}>
                      Totales
                    </td>
                    <td className="p-2 border text-right">
                      RD${moneda(totalPreaviso)}
                    </td>
                    <td className="p-2 border text-right">
                      RD${moneda(totalCesantia)}
                    </td>
                    <td className="p-2 border text-right text-purple-700">
                      RD${moneda(totalVacaciones)}
                    </td>
                    <td className="p-2 border text-right text-green-700">
                      RD${moneda(totalRegalia)}
                    </td>
                    <td className="p-2 border text-right">
                      RD${moneda(totalOtrosPagos)}
                    </td>
                    <td className="p-2 border text-right text-red-700">
                      RD${moneda(totalDescuentos)}
                    </td>
                    <td className="p-2 border text-right text-blue-700">
                      RD${moneda(totalGeneral)}
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
