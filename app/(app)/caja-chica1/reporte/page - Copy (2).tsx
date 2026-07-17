"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import * as XLSX from "xlsx";

type CajaChica = {
  id: number;
  condominio: string;
  fecha: string;
  concepto: string;
  detalle_gasto: string;
  monto: number;
  responsable: string;
  comprobante: string;
  factura_url: string;
  estado: string;
  created_at: string;
};

type CajaChicaFondo = {
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

export default function ReporteCajaChicaPage() {
  const [gastos, setGastos] = useState<CajaChica[]>([]);
  const [fondos, setFondos] = useState<CajaChicaFondo[]>([]);
  const [loading, setLoading] = useState(false);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [tesorero, setTesorero] = useState<DirectivaCondominio | null>(null);
  const [presidente, setPresidente] =
    useState<DirectivaCondominio | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    setCondominioId(id);
    setCondominioNombre(nombre);
    setFechaDesde(primerDia);
    setFechaHasta(ultimoDia);

    if (id || nombre) {
      cargarReporte(id, nombre);
      cargarDirectiva(id);
    }
  }, []);

  function normalizarTexto(valor: string | null | undefined) {
    return String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  async function cargarDirectiva(idCondominio: string) {
    if (!idCondominio) return;

    const { data: directivaData, error } = await supabase
      .from("directiva_condominio")
      .select("id, condominio_id, nombre, cargo, estado")
      .eq("condominio_id", Number(idCondominio));

    if (error) {
      alert("Error cargando directiva del condominio: " + error.message);
      return;
    }

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

  async function cargarReporte(idCondominio: string, nombreCondominio: string) {
    setLoading(true);

    await Promise.all([
      cargarGastos(nombreCondominio),
      cargarFondos(idCondominio, nombreCondominio),
    ]);

    setLoading(false);
  }

  async function cargarGastos(nombreCondominio: string) {
    if (!nombreCondominio) {
      setGastos([]);
      return;
    }

    const { data, error } = await supabase
      .from("caja_chica")
      .select(
        "id, condominio, fecha, concepto, detalle_gasto, monto, responsable, comprobante, factura_url, estado, created_at"
      )
      .ilike("condominio", `%${nombreCondominio}%`)
      .order("fecha", { ascending: false });

    if (error) {
      alert("Error cargando gastos de caja chica: " + error.message);
      setGastos([]);
      return;
    }

    setGastos(data || []);
  }

  async function cargarFondos(idCondominio: string, nombreCondominio: string) {
    let fondosData: CajaChicaFondo[] = [];

    if (idCondominio) {
      const { data, error } = await supabase
        .from("caja_chica_fondos")
        .select(
          "id, condominio_id, numero_fondo, condominio, fecha, tipo, monto, descripcion, responsable, created_at"
        )
        .eq("condominio_id", Number(idCondominio))
        .order("fecha", { ascending: false });

      if (error) {
        alert("Error cargando fondos de caja chica: " + error.message);
        setFondos([]);
        return;
      }

      fondosData = (data || []) as CajaChicaFondo[];
    }

    if (fondosData.length === 0 && nombreCondominio) {
      const { data, error } = await supabase
        .from("caja_chica_fondos")
        .select(
          "id, condominio_id, numero_fondo, condominio, fecha, tipo, monto, descripcion, responsable, created_at"
        )
        .ilike("condominio", `%${nombreCondominio}%`)
        .order("fecha", { ascending: false });

      if (error) {
        alert("Error cargando fondos de caja chica: " + error.message);
        setFondos([]);
        return;
      }

      fondosData = (data || []) as CajaChicaFondo[];
    }

    setFondos(fondosData);
  }

  const gastosFiltrados = gastos.filter((g) => {
    const cumpleDesde = fechaDesde === "" || g.fecha >= fechaDesde;
    const cumpleHasta = fechaHasta === "" || g.fecha <= fechaHasta;

    return cumpleDesde && cumpleHasta;
  });

  const fondosFiltrados = fondos.filter((f) => {
    const cumpleDesde = fechaDesde === "" || f.fecha >= fechaDesde;
    const cumpleHasta = fechaHasta === "" || f.fecha <= fechaHasta;

    return cumpleDesde && cumpleHasta;
  });

  const totalFondos = fondosFiltrados.reduce(
    (sum, f) => sum + Number(f.monto || 0),
    0
  );

  const totalGastos = gastosFiltrados.reduce(
    (sum, g) => sum + Number(g.monto || 0),
    0
  );

  const disponible = totalFondos - totalGastos;

  function dinero(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

function formatoFecha(fecha?: string | null) {
  if (!fecha) return "-";

  const fechaLimpia = String(fecha).split("T")[0];
  const partes = fechaLimpia.split("-");

  if (partes.length === 3) {
    const [year, month, day] = partes;
    return `${day}/${month}/${year}`;
  }

  return fecha;
}

  function fechaHoy() {
    return new Date().toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function imprimir() {
    window.print();
  }

  function exportarExcel() {
    if (fondosFiltrados.length === 0 && gastosFiltrados.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const resumenExcel = [
      {
        Concepto: "Total fondos / entradas",
        "Monto RD$": totalFondos,
      },
      {
        Concepto: "Total gastos / salidas",
        "Monto RD$": totalGastos,
      },
      {
        Concepto: "Disponible caja chica",
        "Monto RD$": disponible,
      },
    ];

    const fondosExcel = fondosFiltrados.map((f) => ({
      Tipo: "FONDO / ENTRADA",
      "No. Fondo": String(f.numero_fondo || f.id).padStart(5, "0"),
      Condominio: f.condominio,
      Fecha: f.fecha,
      Concepto: f.tipo || "fondo_inicial",
      Detalle: f.descripcion || "",
      "Monto RD$": Number(f.monto || 0),
      Responsable: f.responsable || "",
      Estado: "",
      "Fecha registro": f.created_at
        ? new Date(f.created_at).toLocaleDateString("es-DO")
        : "",
    }));

    const gastosExcel = gastosFiltrados.map((g) => ({
      Tipo: "GASTO / SALIDA",
      "No. Fondo": "",
      Condominio: g.condominio,
      Fecha: g.fecha,
      Concepto: g.concepto,
      Detalle: g.detalle_gasto,
      "Monto RD$": Number(g.monto || 0),
      Responsable: g.responsable,
      Comprobante: g.comprobante,
      Estado: g.estado,
      "Fecha registro": g.created_at
        ? new Date(g.created_at).toLocaleDateString("es-DO")
        : "",
    }));

    const hojaResumen = XLSX.utils.json_to_sheet(resumenExcel);
    const hojaMovimientos = XLSX.utils.json_to_sheet([
      ...fondosExcel,
      ...gastosExcel,
    ]);

    hojaResumen["!cols"] = [{ wch: 35 }, { wch: 18 }];
    hojaMovimientos["!cols"] = [
      { wch: 18 },
      { wch: 12 },
      { wch: 40 },
      { wch: 15 },
      { wch: 30 },
      { wch: 50 },
      { wch: 15 },
      { wch: 25 },
      { wch: 18 },
      { wch: 18 },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hojaResumen, "Resumen");
    XLSX.utils.book_append_sheet(libro, hojaMovimientos, "Movimientos");

    XLSX.writeFile(
      libro,
      `Reporte_Caja_Chica_${condominioNombre.replaceAll(" ", "_")}.xlsx`
    );
  }

  function limpiarFiltros() {
    setFechaDesde("");
    setFechaHasta("");
  }

  function recargar() {
    cargarReporte(condominioId, condominioNombre);
    cargarDirectiva(condominioId);
  }

  if (loading) {
    return <div className="p-6">Cargando reporte de caja chica...</div>;
  }

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.35in;
          }

          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .print-card {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }

          .print-table {
            font-size: 8.5px !important;
          }

          .print-table th,
          .print-table td {
            padding: 3px !important;
          }

          .page-break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .resumen-compacto {
            margin-top: 10px !important;
          }

          .resumen-compacto-titulo {
            font-size: 10px !important;
            padding: 4px 8px !important;
          }

          .resumen-compacto-celda {
            padding: 6px !important;
          }

          .resumen-compacto-celda p {
            line-height: 1.1 !important;
          }

          .resumen-compacto-monto {
            font-size: 13px !important;
          }
        }
      `}</style>

      <div className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reporte de Caja Chica</h1>
          <p className="text-slate-500">
            Consulta fondos, gastos y disponible actual de caja chica del
            condominio activo.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <button
            type="button"
            onClick={recargar}
            className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
          >
            Recargar
          </button>

          <button
            type="button"
            onClick={imprimir}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800"
          >
            Imprimir reporte
          </button>

          <button
            type="button"
            onClick={exportarExcel}
            className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800"
          >
            Exportar a Excel
          </button>
        </div>
      </div>

      <div className="no-print bg-white rounded-2xl p-6 shadow-sm border">
        <h2 className="text-xl font-bold mb-4">Filtros del reporte</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Condominio
            </label>

            <input
              type="text"
              value={condominioNombre}
              readOnly
              className="border rounded-lg px-3 py-2 w-full bg-slate-100 text-slate-700"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Fecha desde
            </label>

            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Fecha hasta
            </label>

            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="button"
              onClick={limpiarFiltros}
              className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 w-full md:w-auto"
            >
              Limpiar fechas
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border print-card">
        <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between gap-4">
          <div className="text-center flex-1">
            <h1 className="text-lg font-black uppercase leading-tight">
              {condominioNombre || "Condominio"}
            </h1>

            <h2 className="text-base font-black uppercase mt-1">
              Reporte General de Caja Chica
            </h2>

            <p className="text-xs mt-1">
              Detalle de fondos, gastos y disponible por rango de fecha
            </p>
          </div>

          <div className="text-xs border rounded-lg p-2 min-w-[170px]">
            <p>
              <strong>Impresión:</strong> {fechaHoy()}
            </p>
            <p>
              <strong>Desde:</strong> {formatoFecha(fechaDesde)}
            </p>
            <p>
              <strong>Hasta:</strong> {formatoFecha(fechaHasta)}
            </p>
          </div>
        </div>

        <div className="border rounded-lg mt-4 page-break-inside-avoid overflow-hidden resumen-compacto">
          <div className="bg-slate-900 text-white px-3 py-1.5 font-black uppercase text-[11px] resumen-compacto-titulo">
            Resumen general de caja chica
          </div>

          <div className="grid grid-cols-3 text-center text-[11px]">
            <div className="border-r p-2 bg-green-50 resumen-compacto-celda">
              <p className="font-bold text-slate-600">Fondos / entradas</p>
              <p className="text-[15px] font-black text-green-700 resumen-compacto-monto">
                RD$ {dinero(totalFondos)}
              </p>
            </div>

            <div className="border-r p-2 bg-red-50 resumen-compacto-celda">
              <p className="font-bold text-slate-600">Gastos / salidas</p>
              <p className="text-[15px] font-black text-red-700 resumen-compacto-monto">
                RD$ {dinero(totalGastos)}
              </p>
            </div>

            <div className="p-2 bg-blue-50 resumen-compacto-celda">
              <p className="font-bold text-slate-600">Disponible</p>
              <p
                className={`text-[15px] font-black resumen-compacto-monto ${
                  disponible >= 0 ? "text-blue-700" : "text-red-700"
                }`}
              >
                RD$ {dinero(disponible)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-black uppercase border-b pb-1 mb-2">
            Fondos registrados en el período
          </h3>

          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm print-table">
              <thead className="bg-green-100">
                <tr>
                  <th className="p-2 border">No.</th>
                  <th className="p-2 border">Fecha</th>
                  <th className="p-2 border">Descripción</th>
                  <th className="p-2 border">Responsable</th>
                  <th className="p-2 border">Monto</th>
                </tr>
              </thead>

              <tbody>
                {fondosFiltrados.map((f) => (
                  <tr key={f.id}>
                    <td className="p-2 border text-center font-bold">
                      {String(f.numero_fondo || f.id).padStart(5, "0")}
                    </td>
                    <td className="p-2 border">{formatoFecha(f.fecha)}</td>
                    <td className="p-2 border">{f.descripcion || "-"}</td>
                    <td className="p-2 border">{f.responsable || "-"}</td>
                    <td className="p-2 border text-right font-bold">
                      RD$ {dinero(Number(f.monto || 0))}
                    </td>
                  </tr>
                ))}

                {fondosFiltrados.length === 0 && (
                  <tr>
                    <td className="p-3 border text-center" colSpan={5}>
                      No hay fondos registrados en este período.
                    </td>
                  </tr>
                )}
              </tbody>

              {fondosFiltrados.length > 0 && (
                <tfoot className="bg-green-100 font-bold">
                  <tr>
                    <td className="p-2 border text-right" colSpan={4}>
                      TOTAL FONDOS
                    </td>
                    <td className="p-2 border text-right">
                      RD$ {dinero(totalFondos)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-black uppercase border-b pb-1 mb-2">
            Detalle de gastos del período
          </h3>

          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm print-table">
              <thead className="bg-red-100">
                <tr>
                  <th className="p-2 border">Fecha</th>
                  <th className="p-2 border">Concepto</th>
                  <th className="p-2 border">Detalle</th>
                  <th className="p-2 border">Responsable</th>
                  <th className="p-2 border">Comprobante</th>
                  <th className="p-2 border">Monto</th>
                </tr>
              </thead>

              <tbody>
                {gastosFiltrados.map((g) => (
                  <tr key={g.id}>
                    <td className="p-2 border">{formatoFecha(g.fecha)}</td>
                    <td className="p-2 border font-semibold">{g.concepto}</td>
                    <td className="p-2 border">{g.detalle_gasto || "-"}</td>
                    <td className="p-2 border">{g.responsable || "-"}</td>
                    <td className="p-2 border">{g.comprobante || "-"}</td>
                    <td className="p-2 border text-right font-bold">
                      RD$ {dinero(Number(g.monto || 0))}
                    </td>
                  </tr>
                ))}

                {gastosFiltrados.length === 0 && (
                  <tr>
                    <td className="p-3 border text-center" colSpan={6}>
                      No hay gastos registrados en este período.
                    </td>
                  </tr>
                )}
              </tbody>

              {gastosFiltrados.length > 0 && (
                <tfoot className="bg-red-100 font-bold">
                  <tr>
                    <td className="p-2 border text-right" colSpan={5}>
                      TOTAL GASTOS
                    </td>
                    <td className="p-2 border text-right">
                      RD$ {dinero(totalGastos)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="border rounded-lg p-4 mt-5 page-break-inside-avoid">
          <div className="flex items-center justify-between gap-3 border-b pb-1 mb-4">
            <h3 className="font-black uppercase">
              Aprobación y autorización
            </h3>

            <div className="border rounded-md px-2 py-1 text-right min-w-[180px] bg-slate-50">
              <p className="text-[10px] uppercase font-bold text-slate-500">
                Período
              </p>
              <p className="font-black text-sm">
                {formatoFecha(fechaDesde)} - {formatoFecha(fechaHasta)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10">
            <div>
              <p className="font-black text-center uppercase">Tesorero</p>

              <div className="mt-1 text-center min-h-[28px]">
                <p className="font-bold">
                  {tesorero?.nombre || "No configurado"}
                </p>
              </div>

              <div className="mt-14 border-t border-slate-900 pt-1 text-center">
                Firma del tesorero
              </div>
            </div>

            <div>
              <p className="font-black text-center uppercase">Presidente</p>

              <div className="mt-1 text-center min-h-[28px]">
                <p className="font-bold">
                  {presidente?.nombre || "No configurado"}
                </p>
              </div>

              <div className="mt-14 border-t border-slate-900 pt-1 text-center">
                Firma del presidente
              </div>
            </div>
          </div>
        </div>

        <div className="text-[9px] text-slate-500 flex justify-between border-t mt-5 pt-2">
          <span>Reporte general de caja chica para revisión y archivo.</span>
          <span>Generado por VAM Administración de Condominios</span>
        </div>
      </div>
    </div>
  );
}