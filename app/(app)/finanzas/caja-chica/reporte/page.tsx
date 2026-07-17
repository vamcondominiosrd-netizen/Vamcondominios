"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Coins,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import * as XLSX from "xlsx";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type CajaChica = {
  id: number;
  condominio_id: number | null;
  condominio: string | null;
  fecha: string | null;
  concepto: string | null;
  detalle_gasto: string | null;
  monto: number | null;
  responsable: string | null;
  comprobante: string | null;
  factura_url: string | null;
  estado: string | null;
  created_at: string | null;
};

type CajaChicaFondo = {
  id: number;
  condominio_id: number | null;
  numero_fondo: number | null;
  condominio: string | null;
  fecha: string | null;
  tipo: string | null;
  monto: number | null;
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

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fechaInput(fecha: Date) {
  return fecha.toISOString().split("T")[0];
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
  const hoy = new Date();
  const day = String(hoy.getDate()).padStart(2, "0");
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const year = hoy.getFullYear();

  return `${day}/${month}/${year}`;
}

function numeroFondoTexto(numero?: number | null, id?: number | null) {
  const numeroFinal = numero || id || 0;
  if (!numeroFinal) return "-";
  return String(numeroFinal).padStart(5, "0");
}

function tipoFondoTexto(tipo?: string | null) {
  const value = String(tipo || "").toLowerCase();

  if (value === "fondo_inicial") return "Fondo inicial";
  if (value === "reposicion") return "Reposición";

  return tipo || "-";
}

function normalizarTexto(valor: string | null | undefined) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function ReporteCajaChicaPage() {
  const [gastos, setGastos] = useState<CajaChica[]>([]);
  const [fondos, setFondos] = useState<CajaChicaFondo[]>([]);
  const [loading, setLoading] = useState(false);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [tesorero, setTesorero] = useState<DirectivaCondominio | null>(null);
  const [presidente, setPresidente] = useState<DirectivaCondominio | null>(
    null,
  );

  useEffect(() => {
    const idGuardado = localStorage.getItem("condominio_id") || "";
    const nombreGuardado =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    const hoy = new Date();
    const primerDia = fechaInput(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    const ultimoDia = fechaInput(
      new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0),
    );

    setCondominioId(idGuardado);
    setCondominioNombre(nombreGuardado);
    setFechaDesde(primerDia);
    setFechaHasta(ultimoDia);

    if (!idGuardado) {
      alert("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarReporte(idGuardado, nombreGuardado);
    cargarDirectiva(idGuardado);
  }, []);

  async function cargarDirectiva(idCondominio: string) {
    if (!idCondominio) return;

    const { data, error } = await supabase
      .from("directiva_condominio")
      .select("id, condominio_id, nombre, cargo, estado")
      .eq("condominio_id", Number(idCondominio));

    if (error) {
      alert("Error cargando directiva del condominio: " + error.message);
      return;
    }

    const directiva = (data || []) as DirectivaCondominio[];

    const miembrosActivos = directiva.filter((m) => {
      const estado = normalizarTexto(m.estado);
      return !estado || estado === "activo";
    });

    const tesoreroEncontrado =
      miembrosActivos.find((m) => normalizarTexto(m.cargo) === "tesorero") ||
      miembrosActivos.find((m) =>
        normalizarTexto(m.cargo).includes("tesorer"),
      );

    const presidenteEncontrado =
      miembrosActivos.find((m) => normalizarTexto(m.cargo) === "presidente") ||
      miembrosActivos.find((m) =>
        normalizarTexto(m.cargo).includes("president"),
      );

    setTesorero(tesoreroEncontrado || null);
    setPresidente(presidenteEncontrado || null);
  }

  async function cargarReporte(idCondominio?: string, nombreCondominio?: string) {
    const idActivo = idCondominio || condominioId;
    const nombreActivo = nombreCondominio || condominioNombre;

    if (!idActivo && !nombreActivo) return;

    setLoading(true);

    await Promise.all([
      cargarFondos(idActivo, nombreActivo),
      cargarGastos(idActivo, nombreActivo),
    ]);

    setLoading(false);
  }

  async function cargarFondos(idCondominio: string, nombreCondominio: string) {
    let fondosData: CajaChicaFondo[] = [];

    if (idCondominio) {
      const { data, error } = await supabase
        .from("caja_chica_fondos")
        .select(
          "id, condominio_id, numero_fondo, condominio, fecha, tipo, monto, descripcion, responsable, created_at",
        )
        .eq("condominio_id", Number(idCondominio))
        .order("fecha", { ascending: false })
        .order("id", { ascending: false });

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
          "id, condominio_id, numero_fondo, condominio, fecha, tipo, monto, descripcion, responsable, created_at",
        )
        .ilike("condominio", `%${nombreCondominio}%`)
        .order("fecha", { ascending: false })
        .order("id", { ascending: false });

      if (error) {
        alert("Error cargando fondos de caja chica: " + error.message);
        setFondos([]);
        return;
      }

      fondosData = (data || []) as CajaChicaFondo[];
    }

    setFondos(fondosData);
  }

  async function cargarGastos(idCondominio: string, nombreCondominio: string) {
    let gastosData: CajaChica[] = [];

    if (idCondominio) {
      const { data, error } = await supabase
        .from("caja_chica")
        .select(
          "id, condominio_id, condominio, fecha, concepto, detalle_gasto, monto, responsable, comprobante, factura_url, estado, created_at",
        )
        .eq("condominio_id", Number(idCondominio))
        .order("fecha", { ascending: false })
        .order("id", { ascending: false });

      if (error) {
        alert("Error cargando gastos de caja chica: " + error.message);
        setGastos([]);
        return;
      }

      gastosData = (data || []) as CajaChica[];
    }

    if (gastosData.length === 0 && nombreCondominio) {
      const { data, error } = await supabase
        .from("caja_chica")
        .select(
          "id, condominio_id, condominio, fecha, concepto, detalle_gasto, monto, responsable, comprobante, factura_url, estado, created_at",
        )
        .ilike("condominio", `%${nombreCondominio}%`)
        .order("fecha", { ascending: false })
        .order("id", { ascending: false });

      if (error) {
        alert("Error cargando gastos de caja chica: " + error.message);
        setGastos([]);
        return;
      }

      gastosData = (data || []) as CajaChica[];
    }

    setGastos(gastosData);
  }

  async function refrescar() {
    await cargarReporte(condominioId, condominioNombre);
    await cargarDirectiva(condominioId);
  }

  function limpiarFiltros() {
    setFechaDesde("");
    setFechaHasta("");
  }

  function imprimir() {
    window.print();
  }

  const gastosFiltrados = useMemo(() => {
    return gastos.filter((g) => {
      const fecha = String(g.fecha || "");
      const cumpleDesde = !fechaDesde || fecha >= fechaDesde;
      const cumpleHasta = !fechaHasta || fecha <= fechaHasta;

      return cumpleDesde && cumpleHasta;
    });
  }, [gastos, fechaDesde, fechaHasta]);

  const fondosFiltrados = useMemo(() => {
    return fondos.filter((f) => {
      const fecha = String(f.fecha || "");
      const cumpleDesde = !fechaDesde || fecha >= fechaDesde;
      const cumpleHasta = !fechaHasta || fecha <= fechaHasta;

      return cumpleDesde && cumpleHasta;
    });
  }, [fondos, fechaDesde, fechaHasta]);

  const totalFondos = useMemo(
    () => fondosFiltrados.reduce((sum, f) => sum + Number(f.monto || 0), 0),
    [fondosFiltrados],
  );

  const totalFondoInicial = useMemo(
    () =>
      fondosFiltrados
        .filter((f) => String(f.tipo || "").toLowerCase() === "fondo_inicial")
        .reduce((sum, f) => sum + Number(f.monto || 0), 0),
    [fondosFiltrados],
  );

  const totalReposiciones = useMemo(
    () =>
      fondosFiltrados
        .filter((f) => String(f.tipo || "").toLowerCase() === "reposicion")
        .reduce((sum, f) => sum + Number(f.monto || 0), 0),
    [fondosFiltrados],
  );

  const totalGastos = useMemo(
    () => gastosFiltrados.reduce((sum, g) => sum + Number(g.monto || 0), 0),
    [gastosFiltrados],
  );

  const balanceAnterior = useMemo(() => {
    if (!fechaDesde) return 0;

    const fondosAnteriores = fondos
      .filter((f) => String(f.fecha || "") < fechaDesde)
      .reduce((sum, f) => sum + Number(f.monto || 0), 0);

    const gastosAnteriores = gastos
      .filter((g) => String(g.fecha || "") < fechaDesde)
      .reduce((sum, g) => sum + Number(g.monto || 0), 0);

    return fondosAnteriores - gastosAnteriores;
  }, [fondos, gastos, fechaDesde]);

  const disponible = balanceAnterior + totalFondos - totalGastos;

  function exportarExcel() {
    if (fondosFiltrados.length === 0 && gastosFiltrados.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const resumenExcel = [
      {
        Condominio: condominioNombre,
        "Fecha desde": fechaDesde ? formatoFecha(fechaDesde) : "",
        "Fecha hasta": fechaHasta ? formatoFecha(fechaHasta) : "",
        "Balance anterior RD$": Number(balanceAnterior || 0),
        "Fondo inicial RD$": Number(totalFondoInicial || 0),
        "Reposiciones RD$": Number(totalReposiciones || 0),
        "Total fondos RD$": Number(totalFondos || 0),
        "Total gastos RD$": Number(totalGastos || 0),
        "Disponible RD$": Number(disponible || 0),
      },
    ];

    const fondosExcel = fondosFiltrados.map((f) => ({
      Tipo: "FONDO / ENTRADA",
      "No. Fondo": numeroFondoTexto(f.numero_fondo, f.id),
      Condominio: f.condominio || "",
      Fecha: formatoFecha(f.fecha),
      Concepto: tipoFondoTexto(f.tipo),
      Detalle: f.descripcion || "",
      "Monto RD$": Number(f.monto || 0),
      Responsable: f.responsable || "",
      Estado: "",
      "Fecha registro": f.created_at ? formatoFecha(f.created_at) : "",
    }));

    const gastosExcel = gastosFiltrados.map((g) => ({
      Tipo: "GASTO / SALIDA",
      "No. Fondo": "",
      Condominio: g.condominio || "",
      Fecha: formatoFecha(g.fecha),
      Concepto: g.concepto || "",
      Detalle: g.detalle_gasto || "",
      "Monto RD$": Number(g.monto || 0),
      Responsable: g.responsable || "",
      Comprobante: g.comprobante || "",
      Estado: g.estado || "",
      "Fecha registro": g.created_at ? formatoFecha(g.created_at) : "",
    }));

    const hojaResumen = XLSX.utils.json_to_sheet(resumenExcel);
    const hojaMovimientos = XLSX.utils.json_to_sheet([
      ...fondosExcel,
      ...gastosExcel,
    ]);

    hojaResumen["!cols"] = [
      { wch: 35 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
    ];

    hojaMovimientos["!cols"] = [
      { wch: 18 },
      { wch: 12 },
      { wch: 40 },
      { wch: 15 },
      { wch: 28 },
      { wch: 50 },
      { wch: 15 },
      { wch: 25 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
    ];

    const libro = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(libro, hojaResumen, "Resumen");
    XLSX.utils.book_append_sheet(libro, hojaMovimientos, "Movimientos");

    XLSX.writeFile(
      libro,
      `Reporte_Caja_Chica_${(condominioNombre || "Condominio").replaceAll(
        " ",
        "_",
      )}.xlsx`,
    );
  }

  return (
    <PageContainer>
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

          .bloque-firma-compacto {
            padding: 8px !important;
            margin-top: 10px !important;
          }

          .bloque-firma-compacto h3 {
            font-size: 10px !important;
          }

          .bloque-firma-texto {
            font-size: 9px !important;
          }

          .linea-firma {
            margin-top: 26px !important;
          }
        }
      `}</style>

      <div className="no-print">
        <ModuleMenu
          title="Caja Chica"
          subtitle="Movimientos, fondos, balance y reportes."
          tone="green"
          items={[
            {
              href: "/finanzas/caja-chica",
              label: "Dashboard",
              icon: BarChart3,
            },
            { href: "/finanzas/caja-chica/balance", label: "Balance", icon: BarChart3 },
            {
              href: "/finanzas/caja-chica/reporte",
              label: "Reporte",
              icon: FileSpreadsheet,
            },
            {
              href: "/finanzas/caja-chica/reporte1",
              label: "Reporte Mensual",
              icon: FileSpreadsheet,
            },
          ]}
        />

        <ModuleToolbar
          title="Reporte de Caja Chica"
          subtitle={`Herramientas del reporte. Condominio: ${
            condominioNombre || "No seleccionado"
          }.`}
          icon={FileSpreadsheet}
          actions={
            <ModuleActions
              onRefresh={refrescar}
              extra={
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={imprimir}
                    className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </button>

                  <button
                    type="button"
                    onClick={exportarExcel}
                    className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Exportar Excel
                  </button>
                </div>
              }
            />
          }
        />
      </div>

      <div className="mt-5 rounded-2xl border bg-white p-6 shadow-sm print-card">
        <div className="flex items-center justify-between gap-4 border-b-2 border-slate-900 pb-3">
          <div className="flex-1 text-center">
            <h1 className="inline-block bg-blue-700 px-2 text-lg font-black uppercase leading-tight text-white">
              {condominioNombre || "Condominio"}
            </h1>

            <br />

            <h2 className="mt-1 inline-block bg-blue-700 px-2 text-base font-black uppercase text-white">
              Reporte de Caja Chica
            </h2>

            <p className="mt-2 text-xs">
              Detalle de fondos, gastos y disponible por rango de fecha
            </p>
          </div>

          <div className="min-w-[170px] rounded-lg border p-2 text-xs">
            <p>
              <strong>Impresión:</strong> {fechaHoy()}
            </p>
            <p>
              <strong>Desde:</strong>{" "}
              {fechaDesde ? formatoFecha(fechaDesde) : "Todos"}
            </p>
            <p>
              <strong>Hasta:</strong>{" "}
              {fechaHasta ? formatoFecha(fechaHasta) : "Todos"}
            </p>
          </div>
        </div>

        <div className="resumen-compacto page-break-inside-avoid mt-4 overflow-hidden rounded-lg border">
          <div className="resumen-compacto-titulo bg-slate-900 px-3 py-1.5 text-[11px] font-black uppercase text-white">
            Resumen general de caja chica
          </div>

          <div className="grid grid-cols-4 text-center text-[11px]">
            <div className="resumen-compacto-celda border-r bg-slate-50 p-2">
              <p className="font-bold text-slate-600">Balance anterior</p>
              <p
                className={`resumen-compacto-monto text-[15px] font-black ${
                  balanceAnterior >= 0 ? "text-slate-800" : "text-red-700"
                }`}
              >
                RD$ {dinero(balanceAnterior)}
              </p>
            </div>

            <div className="resumen-compacto-celda border-r bg-green-50 p-2">
              <p className="font-bold text-slate-600">Fondos / entradas</p>
              <p className="resumen-compacto-monto text-[15px] font-black text-green-700">
                RD$ {dinero(totalFondos)}
              </p>
            </div>

            <div className="resumen-compacto-celda border-r bg-red-50 p-2">
              <p className="font-bold text-slate-600">Gastos / salidas</p>
              <p className="resumen-compacto-monto text-[15px] font-black text-red-700">
                RD$ {dinero(totalGastos)}
              </p>
            </div>

            <div className="resumen-compacto-celda bg-blue-50 p-2">
              <p className="font-bold text-slate-600">Disponible</p>
              <p
                className={`resumen-compacto-monto text-[15px] font-black ${
                  disponible >= 0 ? "text-blue-700" : "text-red-700"
                }`}
              >
                RD$ {dinero(disponible)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 border-b pb-1 font-black uppercase">
            Fondos registrados en el período
          </h3>

          <div className="overflow-auto rounded-lg border">
            <table className="print-table min-w-full text-sm">
              <thead className="bg-green-100">
                <tr>
                  <th className="border p-2">No.</th>
                  <th className="border p-2">Fecha</th>
                  <th className="border p-2">Tipo</th>
                  <th className="border p-2">Descripción</th>
                  <th className="border p-2">Responsable</th>
                  <th className="border p-2">Monto</th>
                </tr>
              </thead>

              <tbody>
                {fondosFiltrados.map((f) => (
                  <tr key={f.id}>
                    <td className="border p-2 text-center font-bold">
                      {numeroFondoTexto(f.numero_fondo, f.id)}
                    </td>
                    <td className="border p-2">{formatoFecha(f.fecha)}</td>
                    <td className="border p-2">{tipoFondoTexto(f.tipo)}</td>
                    <td className="border p-2">{f.descripcion || "-"}</td>
                    <td className="border p-2">{f.responsable || "-"}</td>
                    <td className="border p-2 text-right font-bold">
                      RD$ {dinero(f.monto)}
                    </td>
                  </tr>
                ))}

                {fondosFiltrados.length === 0 && (
                  <tr>
                    <td className="border p-3 text-center" colSpan={6}>
                      No hay fondos registrados en este período.
                    </td>
                  </tr>
                )}
              </tbody>

              {fondosFiltrados.length > 0 && (
                <tfoot className="bg-green-100 font-bold">
                  <tr>
                    <td className="border p-2 text-right" colSpan={5}>
                      TOTAL FONDOS
                    </td>
                    <td className="border p-2 text-right">
                      RD$ {dinero(totalFondos)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 border-b pb-1 font-black uppercase">
            Detalle de gastos del período
          </h3>

          <div className="overflow-auto rounded-lg border">
            <table className="print-table min-w-full text-sm">
              <thead className="bg-red-100">
                <tr>
                  <th className="border p-2">Fecha</th>
                  <th className="border p-2">Concepto</th>
                  <th className="border p-2">Detalle</th>
                  <th className="border p-2">Responsable</th>
                  <th className="border p-2">Comprobante</th>
                  <th className="border p-2">Monto</th>
                </tr>
              </thead>

              <tbody>
                {gastosFiltrados.map((g) => (
                  <tr key={g.id}>
                    <td className="border p-2">{formatoFecha(g.fecha)}</td>
                    <td className="border p-2 font-semibold">
                      {g.concepto || "-"}
                    </td>
                    <td className="border p-2">{g.detalle_gasto || "-"}</td>
                    <td className="border p-2">{g.responsable || "-"}</td>
                    <td className="border p-2">{g.comprobante || "-"}</td>
                    <td className="border p-2 text-right font-bold">
                      RD$ {dinero(g.monto)}
                    </td>
                  </tr>
                ))}

                {gastosFiltrados.length === 0 && (
                  <tr>
                    <td className="border p-3 text-center" colSpan={6}>
                      No hay gastos registrados en este período.
                    </td>
                  </tr>
                )}
              </tbody>

              {gastosFiltrados.length > 0 && (
                <tfoot className="bg-red-100 font-bold">
                  <tr>
                    <td className="border p-2 text-right" colSpan={5}>
                      TOTAL GASTOS
                    </td>
                    <td className="border p-2 text-right">
                      RD$ {dinero(totalGastos)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="bloque-firma-compacto page-break-inside-avoid mt-4 rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between gap-3 border-b pb-1">
            <h3 className="text-[11px] font-black uppercase">
              Aprobación y autorización
            </h3>

            <div className="min-w-[165px] rounded-md border bg-slate-50 px-2 py-1 text-right">
              <p className="text-[8.5px] font-bold uppercase text-slate-500">
                Período
              </p>
              <p className="text-[10px] font-black">
                {fechaDesde ? formatoFecha(fechaDesde) : "Todos"} -{" "}
                {fechaHasta ? formatoFecha(fechaHasta) : "Todos"}
              </p>
            </div>
          </div>

          <div className="bloque-firma-texto grid grid-cols-2 gap-8 text-[10px]">
            <div>
              <p className="text-center font-black uppercase">Tesorero</p>

              <div className="mt-1 min-h-[18px] text-center">
                <p className="font-bold">
                  {tesorero?.nombre || "No configurado"}
                </p>
              </div>

              <div className="linea-firma mt-8 border-t border-slate-900 pt-1 text-center">
                Firma del tesorero
              </div>
            </div>

            <div>
              <p className="text-center font-black uppercase">Presidente</p>

              <div className="mt-1 min-h-[18px] text-center">
                <p className="font-bold">
                  {presidente?.nombre || "No configurado"}
                </p>
              </div>

              <div className="linea-firma mt-8 border-t border-slate-900 pt-1 text-center">
                Firma del presidente
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-between border-t pt-2 text-[9px] text-slate-500">
          <span>Reporte general de caja chica para revisión y archivo.</span>
          <span>Generado por VAM Administración de Condominios</span>
        </div>
      </div>

      <div className="no-print mt-5">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
          <InfoBox
            label="Balance anterior"
            value={`RD$ ${dinero(balanceAnterior)}`}
            tone={balanceAnterior >= 0 ? "slate" : "red"}
          />

          <InfoBox
            label="Fondo inicial"
            value={`RD$ ${dinero(totalFondoInicial)}`}
            tone="blue"
          />

          <InfoBox
            label="Reposiciones"
            value={`RD$ ${dinero(totalReposiciones)}`}
            tone="emerald"
          />

          <InfoBox
            label="Gastos"
            value={`RD$ ${dinero(totalGastos)}`}
            tone="red"
          />

          <InfoBox
            label="Disponible"
            value={`RD$ ${dinero(disponible)}`}
            tone={disponible >= 0 ? "purple" : "red"}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="xl:col-span-2">
            <SectionCard
              title="Filtros del reporte"
              subtitle="Seleccione el rango de fecha que desea consultar."
              action={
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Limpiar fechas
                </button>
              }
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Condominio
                  </label>

                  <input
                    type="text"
                    value={condominioNombre}
                    readOnly
                    className="w-full rounded-xl border bg-slate-100 px-4 py-3 text-slate-700"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Fecha desde
                  </label>

                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Fecha hasta
                  </label>

                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>
              </div>
            </SectionCard>
          </section>

          <section>
            <SectionCard
              title="Resumen"
              subtitle="Totales del período consultado."
            >
              <div className="space-y-3">
                <InfoLine
                  label="Condominio"
                  value={condominioNombre || "No seleccionado"}
                />
                <InfoLine
                  label="Desde"
                  value={fechaDesde ? formatoFecha(fechaDesde) : "Todos"}
                />
                <InfoLine
                  label="Hasta"
                  value={fechaHasta ? formatoFecha(fechaHasta) : "Todos"}
                />
                <InfoLine
                  label="Balance anterior"
                  value={`RD$ ${dinero(balanceAnterior)}`}
                  danger={balanceAnterior < 0}
                />
                <InfoLine
                  label="Fondos"
                  value={`${fondosFiltrados.length}`}
                />
                <InfoLine
                  label="Gastos"
                  value={`${gastosFiltrados.length}`}
                />
                <InfoLine
                  label="Disponible"
                  value={`RD$ ${dinero(disponible)}`}
                  highlight
                  danger={disponible < 0}
                />
              </div>
            </SectionCard>
          </section>
        </div>

        <section className="mt-5">
          <SectionCard
            title="Vista rápida del reporte"
            subtitle="Resumen en pantalla antes de imprimir o exportar."
            action={
              loading ? (
                <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Cargando
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                  Disponible: RD$ {dinero(disponible)}
                </div>
              )
            }
          >
            {loading ? (
              <p className="text-sm text-slate-500">
                Cargando reporte de caja chica...
              </p>
            ) : !condominioId ? (
              <EmptyState
                title="Condominio no identificado"
                description="No se encontró un condominio activo. Debe iniciar sesión nuevamente."
              />
            ) : (
              <DataTable>
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Concepto</th>
                    <th className="px-4 py-3 text-right">Cantidad</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  <tr className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">
                      Balance anterior
                    </td>
                    <td className="px-4 py-3 text-right">-</td>
                    <td
                      className={`px-4 py-3 text-right font-black ${
                        balanceAnterior >= 0 ? "text-slate-700" : "text-red-700"
                      }`}
                    >
                      RD$ {dinero(balanceAnterior)}
                    </td>
                  </tr>

                  <tr className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">
                      Fondos / Entradas del período
                    </td>
                    <td className="px-4 py-3 text-right">
                      {fondosFiltrados.length}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-700">
                      RD$ {dinero(totalFondos)}
                    </td>
                  </tr>

                  <tr className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">
                      Gastos / Salidas
                    </td>
                    <td className="px-4 py-3 text-right">
                      {gastosFiltrados.length}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-red-700">
                      RD$ {dinero(totalGastos)}
                    </td>
                  </tr>

                  <tr className="bg-slate-50">
                    <td className="px-4 py-3 font-black text-slate-900">
                      Disponible caja chica
                      <span className="block text-xs font-semibold text-slate-500">
                        Balance anterior + entradas - salidas
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">-</td>
                    <td
                      className={`px-4 py-3 text-right font-black ${
                        disponible >= 0 ? "text-purple-700" : "text-red-700"
                      }`}
                    >
                      RD$ {dinero(disponible)}
                    </td>
                  </tr>
                </tbody>
              </DataTable>
            )}
          </SectionCard>
        </section>
      </div>
    </PageContainer>
  );
}

function InfoBox({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "blue" | "emerald" | "red" | "purple" | "slate";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : tone === "emerald"
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : tone === "red"
          ? "bg-red-50 text-red-700 border-red-100"
          : tone === "purple"
            ? "bg-purple-50 text-purple-700 border-purple-100"
            : "bg-slate-50 text-slate-700 border-slate-100";

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2 className="mt-2 text-2xl font-black">{value}</h2>
    </div>
  );
}

function InfoLine({
  label,
  value,
  highlight = false,
  danger = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-600">{label}</span>

      <span
        className={`text-right text-sm font-black ${
          danger
            ? "text-red-700"
            : highlight
              ? "text-emerald-700"
              : "text-slate-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}