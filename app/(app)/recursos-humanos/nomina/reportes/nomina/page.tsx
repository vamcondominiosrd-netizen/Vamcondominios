"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";
import NominaMenu from "../../NominaMenu";

type Nomina = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  empleado_id: number;
  numero_empleado: string | null;
  nombre_empleado: string | null;
  cargo: string | null;
  departamento: string | null;
  periodo: string | null;
  fecha_pago: string | null;
  salario_base: number | null;
  dias_trabajados: number | null;
  horas_extras: number | null;
  monto_horas_extras: number | null;
  bonificacion: number | null;
  vacaciones_id: number | null;
  pago_vacaciones: number | null;
  dias_vacaciones: number | null;
  tipo_nomina_id: number | null;
  tipo_nomina: string | null;
  afp: number | null;
  sfs: number | null;
  isr: number | null;
  otros_descuentos: number | null;
  total_ingresos: number | null;
  total_descuentos: number | null;
  neto_pagar: number | null;
  estado: string | null;
  observacion: string | null;
  pagado_por: string | null;
  fecha_registro_pago: string | null;
  gasto_id: number | null;
  gasto_generado: boolean | null;
  solicitud_pago_id: number | null;
  solicitud_pago_generada: boolean | null;
  created_at: string | null;
};

const estados = ["Todos", "Pendiente", "Aprobada", "Pagada", "Anulada"];

export default function ReporteNominaPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [nominas, setNominas] = useState<Nomina[]>([]);
  const [loading, setLoading] = useState(false);

  const [periodoDesde, setPeriodoDesde] = useState(new Date().toISOString().slice(0, 7));
  const [periodoHasta, setPeriodoHasta] = useState(new Date().toISOString().slice(0, 7));
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroTipoNomina, setFiltroTipoNomina] = useState("Todos");
  const [filtroDepartamento, setFiltroDepartamento] = useState("Todos");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) cargarNomina(id);
  }, []);

  async function cargarNomina(id: string) {
    setLoading(true);

    let query = supabase
      .from("rh_nomina")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("periodo", { ascending: false })
      .order("created_at", { ascending: false });

    if (periodoDesde) query = query.gte("periodo", periodoDesde);
    if (periodoHasta) query = query.lte("periodo", periodoHasta);

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      alert("Error cargando reporte de nómina: " + error.message);
      return;
    }

    setNominas((data as Nomina[]) || []);
  }

  function moneda(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function numero(valor: number | null | undefined) {
    return Number(valor || 0);
  }

  function fecha(valor: string | null | undefined) {
    if (!valor) return "-";
    const partes = valor.split("-");
    if (partes.length !== 3) return valor;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  const tiposNomina = useMemo(() => {
    const lista = nominas.map((n) => n.tipo_nomina || "").filter((x) => x.trim() !== "");
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [nominas]);

  const departamentos = useMemo(() => {
    const lista = nominas.map((n) => n.departamento || "").filter((x) => x.trim() !== "");
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [nominas]);

  const nominasFiltradas = nominas.filter((n) => {
    const texto = `${n.numero_empleado || ""} ${n.nombre_empleado || ""} ${
      n.cargo || ""
    } ${n.departamento || ""} ${n.periodo || ""} ${n.tipo_nomina || ""}`
      .toLowerCase()
      .trim();

    return (
      texto.includes(busqueda.toLowerCase().trim()) &&
      (filtroEstado === "Todos" || (n.estado || "") === filtroEstado) &&
      (filtroTipoNomina === "Todos" || n.tipo_nomina === filtroTipoNomina) &&
      (filtroDepartamento === "Todos" || n.departamento === filtroDepartamento)
    );
  });

  const totalRegistros = nominasFiltradas.length;
  const totalPendientes = nominasFiltradas.filter((n) => n.estado === "Pendiente").length;
  const totalAprobadas = nominasFiltradas.filter((n) => n.estado === "Aprobada").length;
  const totalPagadas = nominasFiltradas.filter((n) => n.estado === "Pagada").length;

  const totalIngresos = nominasFiltradas.reduce((s, n) => s + numero(n.total_ingresos), 0);
  const totalSalarioBase = nominasFiltradas.reduce((s, n) => s + numero(n.salario_base), 0);
  const totalVacaciones = nominasFiltradas.reduce((s, n) => s + numero(n.pago_vacaciones), 0);
  const totalHorasExtras = nominasFiltradas.reduce((s, n) => s + numero(n.monto_horas_extras), 0);
  const totalBonificacion = nominasFiltradas.reduce((s, n) => s + numero(n.bonificacion), 0);
  const totalAFP = nominasFiltradas.reduce((s, n) => s + numero(n.afp), 0);
  const totalSFS = nominasFiltradas.reduce((s, n) => s + numero(n.sfs), 0);
  const totalISR = nominasFiltradas.reduce((s, n) => s + numero(n.isr), 0);
  const totalOtrosDescuentos = nominasFiltradas.reduce((s, n) => s + numero(n.otros_descuentos), 0);
  const totalDescuentos = nominasFiltradas.reduce((s, n) => s + numero(n.total_descuentos), 0);
  const totalNeto = nominasFiltradas.reduce((s, n) => s + numero(n.neto_pagar), 0);

  function limpiarFiltros() {
    setPeriodoDesde(new Date().toISOString().slice(0, 7));
    setPeriodoHasta(new Date().toISOString().slice(0, 7));
    setBusqueda("");
    setFiltroEstado("Todos");
    setFiltroTipoNomina("Todos");
    setFiltroDepartamento("Todos");
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
      "Salario Base",
      "Pago Vacaciones",
      "Total Ingresos",
      "AFP",
      "SFS",
      "ISR",
      "Otros Descuentos",
      "Total Descuentos",
      "Neto Pagar",
      "Estado",
      "Solicitud Pago",
      "Gasto",
    ];

    const filas = nominasFiltradas.map((n) => [
      n.periodo || "",
      n.numero_empleado || "",
      n.nombre_empleado || "",
      n.cargo || "",
      n.departamento || "",
      n.tipo_nomina || "",
      n.fecha_pago || "",
      numero(n.salario_base).toFixed(2),
      numero(n.pago_vacaciones).toFixed(2),
      numero(n.total_ingresos).toFixed(2),
      numero(n.afp).toFixed(2),
      numero(n.sfs).toFixed(2),
      numero(n.isr).toFixed(2),
      numero(n.otros_descuentos).toFixed(2),
      numero(n.total_descuentos).toFixed(2),
      numero(n.neto_pagar).toFixed(2),
      n.estado || "",
      n.solicitud_pago_id || "",
      n.gasto_id || "",
    ]);

    const contenido = [encabezados, ...filas]
      .map((fila) => fila.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `reporte_nomina_${periodoDesde || "desde"}_${periodoHasta || "hasta"}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
  const labelClass = "mb-1 block text-xs font-semibold text-slate-700";

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-2 pb-6">
      <div className="no-print">
        <NominaMenu />
      </div>

      <div className="no-print rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Reporte de Nómina</h1>
            <p className="text-sm text-slate-500">
              Reporte imprimible y exportable de nóminas, descuentos y neto a pagar.
            </p>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm">
              <span className="text-slate-500">Condominio: </span>
              <span className="font-bold text-slate-800">
                {condominioNombre || "No identificado"}
              </span>
            </div>

            <Link
              href="/recursos-humanos"
              className="rounded-lg bg-slate-700 px-4 py-2 text-center text-sm font-bold text-white hover:bg-slate-800"
            >
              Volver a RH
            </Link>
          </div>
        </div>
      </div>

      <div className="no-print grid grid-cols-2 gap-3 md:grid-cols-7">
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">Registros</p>
          <h2 className="text-2xl font-black">{totalRegistros}</h2>
        </div>

        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">Pendientes</p>
          <h2 className="text-2xl font-black text-yellow-700">{totalPendientes}</h2>
        </div>

        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">Aprobadas</p>
          <h2 className="text-2xl font-black text-blue-700">{totalAprobadas}</h2>
        </div>

        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">Pagadas</p>
          <h2 className="text-2xl font-black text-green-700">{totalPagadas}</h2>
        </div>

        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">Ingresos</p>
          <h2 className="text-lg font-black text-green-700">RD${moneda(totalIngresos)}</h2>
        </div>

        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">Descuentos</p>
          <h2 className="text-lg font-black text-red-700">RD${moneda(totalDescuentos)}</h2>
        </div>

        <div className="rounded-xl border bg-slate-900 p-3 shadow-sm">
          <p className="text-xs text-slate-300">Neto</p>
          <h2 className="text-lg font-black text-white">RD${moneda(totalNeto)}</h2>
        </div>
      </div>

      <div className="no-print rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-black text-slate-900">Filtros</h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div>
            <label className={labelClass}>Período desde</label>
            <input
              type="month"
              value={periodoDesde}
              onChange={(e) => setPeriodoDesde(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Período hasta</label>
            <input
              type="month"
              value={periodoHasta}
              onChange={(e) => setPeriodoHasta(e.target.value)}
              className={inputClass}
            />
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

          <div>
            <label className={labelClass}>Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              {estados.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Tipo nómina</label>
            <select
              value={filtroTipoNomina}
              onChange={(e) => setFiltroTipoNomina(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              {tiposNomina.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Departamento</label>
            <select
              value={filtroDepartamento}
              onChange={(e) => setFiltroDepartamento(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              {departamentos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 md:flex-row">
          <button
            onClick={() => condominioId && cargarNomina(condominioId)}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
          >
            Buscar / Actualizar
          </button>

          <button
            onClick={limpiarFiltros}
            className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
          >
            Limpiar
          </button>

          <button
            onClick={exportarCSV}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800"
          >
            Exportar Excel
          </button>

          <button
            onClick={imprimir}
            className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-bold text-white hover:bg-purple-800"
          >
            Imprimir / PDF
          </button>
        </div>
      </div>

      <div className="print-area rounded-xl border bg-white p-4 shadow-sm">
        <div className="hidden print:block mb-4 border-b pb-3">
          <h1 className="text-center text-2xl font-black">REPORTE DE NÓMINA</h1>
          <p className="text-center font-bold">{condominioNombre}</p>
          <p className="text-center text-sm">
            Período: {periodoDesde || "-"} al {periodoHasta || "-"} · Fecha impresión:{" "}
            {new Date().toLocaleDateString("es-DO")}
          </p>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-black text-slate-900">Detalle de nómina</h2>
          <p className="text-sm text-slate-500">
            {nominasFiltradas.length} registro(s) encontrado(s).
          </p>
        </div>

        {loading ? (
          <div className="text-sm text-slate-500">Cargando nómina...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border p-2 text-left">Empleado</th>
                  <th className="border p-2 text-left">Período</th>
                  <th className="border p-2 text-left">Tipo</th>
                  <th className="border p-2 text-right">Salario</th>
                  <th className="border p-2 text-right">Vacaciones</th>
                  <th className="border p-2 text-right">Otros Ing.</th>
                  <th className="border p-2 text-right">Ingresos</th>
                  <th className="border p-2 text-right">AFP</th>
                  <th className="border p-2 text-right">SFS</th>
                  <th className="border p-2 text-right">ISR</th>
                  <th className="border p-2 text-right">Otros Desc.</th>
                  <th className="border p-2 text-right">Desc.</th>
                  <th className="border p-2 text-right">Neto</th>
                  <th className="border p-2 text-center">Estado</th>
                  <th className="border p-2 text-center">Finanzas</th>
                </tr>
              </thead>

              <tbody>
                {nominasFiltradas.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="border p-2">
                      <p className="font-black">{n.nombre_empleado || "-"}</p>
                      <p className="text-[11px] text-slate-500">
                        {n.numero_empleado || "-"} · {n.cargo || "-"}
                      </p>
                      <p className="text-[11px] text-slate-500">{n.departamento || "-"}</p>
                    </td>

                    <td className="border p-2">
                      <p className="font-bold">{n.periodo || "-"}</p>
                      <p className="text-[11px] text-slate-500">
                        Fecha pago: {fecha(n.fecha_pago)}
                      </p>
                    </td>

                    <td className="border p-2">
                      <p className="font-bold">{n.tipo_nomina || "-"}</p>
                      <p className="text-[11px] text-slate-500">
                        Días: {numero(n.dias_trabajados)}
                      </p>
                    </td>

                    <td className="border p-2 text-right">RD${moneda(n.salario_base)}</td>

                    <td className="border p-2 text-right">
                      <p>RD${moneda(n.pago_vacaciones)}</p>
                      {numero(n.dias_vacaciones) > 0 && (
                        <p className="text-[11px] text-slate-500">
                          {numero(n.dias_vacaciones).toFixed(2)} días
                        </p>
                      )}
                    </td>

                    <td className="border p-2 text-right">
                      RD${moneda(numero(n.monto_horas_extras) + numero(n.bonificacion))}
                    </td>

                    <td className="border p-2 text-right font-bold text-green-700">
                      RD${moneda(n.total_ingresos)}
                    </td>

                    <td className="border p-2 text-right text-red-700">RD${moneda(n.afp)}</td>
                    <td className="border p-2 text-right text-red-700">RD${moneda(n.sfs)}</td>
                    <td className="border p-2 text-right text-red-700">RD${moneda(n.isr)}</td>
                    <td className="border p-2 text-right text-red-700">
                      RD${moneda(n.otros_descuentos)}
                    </td>

                    <td className="border p-2 text-right font-bold text-red-700">
                      RD${moneda(n.total_descuentos)}
                    </td>

                    <td className="border p-2 text-right font-black text-blue-700">
                      RD${moneda(n.neto_pagar)}
                    </td>

                    <td className="border p-2 text-center">
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                          n.estado === "Pagada"
                            ? "bg-green-100 text-green-700"
                            : n.estado === "Aprobada"
                            ? "bg-blue-100 text-blue-700"
                            : n.estado === "Anulada"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {n.estado || "-"}
                      </span>
                    </td>

                    <td className="border p-2 text-center">
                      <p className="text-[11px]">Solicitud: {n.solicitud_pago_id || "-"}</p>
                      <p className="text-[11px]">Gasto: {n.gasto_id || "-"}</p>
                      <p className="text-[11px] text-slate-500">
                        {n.gasto_generado ? "Gasto generado" : "Sin gasto"}
                      </p>
                    </td>
                  </tr>
                ))}

                {nominasFiltradas.length === 0 && (
                  <tr>
                    <td className="border p-4 text-center text-slate-500" colSpan={15}>
                      No hay nómina para esta consulta.
                    </td>
                  </tr>
                )}
              </tbody>

              {nominasFiltradas.length > 0 && (
                <tfoot className="bg-slate-100 font-black">
                  <tr>
                    <td className="border p-2" colSpan={3}>
                      Totales
                    </td>
                    <td className="border p-2 text-right">RD${moneda(totalSalarioBase)}</td>
                    <td className="border p-2 text-right">RD${moneda(totalVacaciones)}</td>
                    <td className="border p-2 text-right">
                      RD${moneda(totalHorasExtras + totalBonificacion)}
                    </td>
                    <td className="border p-2 text-right text-green-700">
                      RD${moneda(totalIngresos)}
                    </td>
                    <td className="border p-2 text-right text-red-700">RD${moneda(totalAFP)}</td>
                    <td className="border p-2 text-right text-red-700">RD${moneda(totalSFS)}</td>
                    <td className="border p-2 text-right text-red-700">RD${moneda(totalISR)}</td>
                    <td className="border p-2 text-right text-red-700">
                      RD${moneda(totalOtrosDescuentos)}
                    </td>
                    <td className="border p-2 text-right text-red-700">
                      RD${moneda(totalDescuentos)}
                    </td>
                    <td className="border p-2 text-right text-blue-700">
                      RD${moneda(totalNeto)}
                    </td>
                    <td className="border p-2" colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          .no-print,
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