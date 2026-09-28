"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { supabase } from "@/app/lib/supabaseClient";
import { FileSpreadsheet, Printer, RefreshCw, Search } from "lucide-react";

type ChequeOperativo = {
  cheque_id: number;
  solicitud_pago_id: number;
  condominio_id: number;
  cuenta_bancaria_id: number;
  numero_cheque: string;
  fecha_emision: string;
  beneficiario: string;
  monto: number;
  concepto: string | null;
  comentario: string | null;
  estado: "EMITIDO" | "IMPRESO" | "ANULADO" | "PAGADO";
  gasto_id: number | null;
  emitido_por: string | null;
  emitido_at: string | null;
  cantidad_impresiones: number;
  primera_impresion_at: string | null;
  ultima_impresion_at: string | null;
};

type SolicitudMini = {
  id: number;
  numero_solicitud: number | null;
};

type CuentaMini = {
  id: number;
  nombre_banco: string;
  numero_cuenta: string;
};

type GastoMini = {
  id: number;
  fecha_pago: string | null;
  pagado: boolean | null;
  cheque_url: string | null;
};

type DirectivaMini = {
  id: number;
  nombre: string;
  cargo: string;
  estado: string | null;
};

type FilaCheque = ChequeOperativo & {
  numero_solicitud: string;
  banco: string;
  numero_cuenta: string;
  fecha_pago: string | null;
  pagado: boolean;
  cheque_url: string | null;
};

const MESES = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

function normalizar(v: string | null | undefined) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function dinero(v: number | null | undefined) {
  return Number(v || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fechaDO(v: string | null | undefined) {
  if (!v) return "-";
  const [y, m, d] = String(v).split("T")[0].split("-");
  return y && m && d ? `${d}/${m}/${y}` : String(v);
}


export default function ReporteChequesPage() {
  const hoy = new Date();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mesesSeleccionados, setMesesSeleccionados] = useState<number[]>([
    hoy.getMonth() + 1,
  ]);
  const [estado, setEstado] = useState("TODOS");
  const [buscar, setBuscar] = useState("");
  const [cheques, setCheques] = useState<ChequeOperativo[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudMini[]>([]);
  const [cuentas, setCuentas] = useState<CuentaMini[]>([]);
  const [gastos, setGastos] = useState<GastoMini[]>([]);
  const [tesorero, setTesorero] = useState<DirectivaMini | null>(null);
  const [presidente, setPresidente] = useState<DirectivaMini | null>(null);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) cargarTodo(id);
    else setMensaje("No se encontró el condominio activo.");
  }, []);

  async function cargarTodo(idActual = condominioId) {
    if (!idActual) return;

    setLoading(true);
    setMensaje("");

    try {
      const { data: chequesData, error: chequesError } = await supabase
        .from("v_cheques_emitidos_operativos")
        .select("*")
        .eq("condominio_id", Number(idActual))
        .order("fecha_emision", { ascending: false })
        .order("cheque_id", { ascending: false });

      if (chequesError) {
        throw new Error("Error cargando cheques: " + chequesError.message);
      }

      const base = (chequesData as ChequeOperativo[]) || [];
      setCheques(base);

      const solicitudIds = [...new Set(base.map((x) => Number(x.solicitud_pago_id)).filter(Boolean))];
      const cuentaIds = [...new Set(base.map((x) => Number(x.cuenta_bancaria_id)).filter(Boolean))];
      const gastoIds = [...new Set(base.map((x) => Number(x.gasto_id || 0)).filter((x) => x > 0))];

      const [solResp, cuentaResp, gastoResp, directivaResp] = await Promise.all([
        solicitudIds.length
          ? supabase.from("solicitudes_pago").select("id, numero_solicitud").in("id", solicitudIds)
          : Promise.resolve({ data: [], error: null }),
        cuentaIds.length
          ? supabase.from("cuentas_bancarias").select("id, nombre_banco, numero_cuenta").in("id", cuentaIds)
          : Promise.resolve({ data: [], error: null }),
        gastoIds.length
          ? supabase.from("gastos").select("id, fecha_pago, pagado, cheque_url").in("id", gastoIds)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("directiva_condominio")
          .select("id, nombre, cargo, estado")
          .eq("condominio_id", Number(idActual)),
      ]);

      if (solResp.error) throw new Error("Error solicitudes: " + solResp.error.message);
      if (cuentaResp.error) throw new Error("Error cuentas: " + cuentaResp.error.message);
      if (gastoResp.error) throw new Error("Error gastos: " + gastoResp.error.message);
      if (directivaResp.error) throw new Error("Error directiva: " + directivaResp.error.message);

      setSolicitudes((solResp.data as SolicitudMini[]) || []);
      setCuentas((cuentaResp.data as CuentaMini[]) || []);
      setGastos((gastoResp.data as GastoMini[]) || []);

      const directivaActiva = ((directivaResp.data as DirectivaMini[]) || []).filter(
        (miembro) => {
          const estadoMiembro = normalizar(miembro.estado);
          return !estadoMiembro || estadoMiembro === "activo";
        },
      );

      setTesorero(
        directivaActiva.find((m) => normalizar(m.cargo) === "tesorero") ||
          directivaActiva.find((m) => normalizar(m.cargo).includes("tesorer")) ||
          null,
      );

      setPresidente(
        directivaActiva.find((m) => normalizar(m.cargo) === "presidente") ||
          directivaActiva.find((m) => normalizar(m.cargo).includes("president")) ||
          null,
      );
    } catch (e: any) {
      setMensaje(e?.message || "No fue posible cargar el reporte.");
    } finally {
      setLoading(false);
    }
  }

  const filas = useMemo<FilaCheque[]>(() => {
    const solMap = new Map(solicitudes.map((x) => [Number(x.id), x]));
    const cuentaMap = new Map(cuentas.map((x) => [Number(x.id), x]));
    const gastoMap = new Map(gastos.map((x) => [Number(x.id), x]));

    return cheques.map((c) => {
      const s = solMap.get(Number(c.solicitud_pago_id));
      const cb = cuentaMap.get(Number(c.cuenta_bancaria_id));
      const g = c.gasto_id ? gastoMap.get(Number(c.gasto_id)) : undefined;

      return {
        ...c,
        numero_solicitud: s?.numero_solicitud
          ? String(s.numero_solicitud).padStart(5, "0")
          : String(c.solicitud_pago_id),
        banco: cb?.nombre_banco || "-",
        numero_cuenta: cb?.numero_cuenta || "-",
        fecha_pago: g?.fecha_pago || null,
        pagado: Boolean(g?.pagado || c.estado === "PAGADO"),
        cheque_url: g?.cheque_url || null,
      };
    });
  }, [cheques, solicitudes, cuentas, gastos]);

  function alternarMes(mes: number) {
    setMesesSeleccionados((actuales) => {
      if (actuales.includes(mes)) {
        const nuevos = actuales.filter((m) => m !== mes);
        return nuevos.length > 0 ? nuevos : actuales;
      }

      return [...actuales, mes].sort((a, b) => a - b);
    });
  }

  function seleccionarTodosLosMeses() {
    setMesesSeleccionados(MESES.map((m) => m.value));
  }

  function seleccionarMesActual() {
    setMesesSeleccionados([hoy.getMonth() + 1]);
  }

  const periodoTexto = useMemo(() => {
    if (mesesSeleccionados.length === 12) return `Todo el año ${anio}`;

    const nombres = mesesSeleccionados
      .slice()
      .sort((a, b) => a - b)
      .map((numeroMes) => MESES.find((m) => m.value === numeroMes)?.label)
      .filter(Boolean);

    if (nombres.length <= 3) {
      return `${nombres.join(", ")} ${anio}`;
    }

    return `${nombres[0]} - ${nombres[nombres.length - 1]} ${anio}`;
  }, [mesesSeleccionados, anio]);

  const filasFiltradas = useMemo(() => {
    return filas
      .filter((f) => {
        const d = new Date(`${f.fecha_emision}T00:00:00`);
        const periodoOk =
          d.getFullYear() === anio &&
          mesesSeleccionados.includes(d.getMonth() + 1);
        const estadoOk = estado === "TODOS" || f.estado === estado;
        const texto = normalizar(
          `${f.numero_cheque} ${f.numero_solicitud} ${f.beneficiario} ${f.concepto || ""} ${f.comentario || ""} ${f.banco} ${f.numero_cuenta} ${f.estado}`
        );
        const buscarOk = !buscar.trim() || texto.includes(normalizar(buscar));
        return periodoOk && estadoOk && buscarOk;
      })
      .sort((a, b) =>
        String(a.numero_cheque || "").localeCompare(
          String(b.numero_cheque || ""),
          "es",
          { numeric: true, sensitivity: "base" }
        )
      );
  }, [filas, anio, mesesSeleccionados, estado, buscar]);

  const totalMonto = filasFiltradas.reduce((s, x) => s + Number(x.monto || 0), 0);
  const cantidadPagados = filasFiltradas.filter((x) => x.estado === "PAGADO" || x.pagado).length;

  function exportarExcel() {
    const data = filasFiltradas.map((f) => ({
      "No. cheque": f.numero_cheque,
      "Fecha emisión": f.fecha_emision,
      "No. solicitud": f.numero_solicitud,
      Beneficiario: f.beneficiario,
      Concepto: f.concepto || "",
      Comentario: f.comentario || "",
      Monto: Number(f.monto || 0),
      "Fecha pago": f.fecha_pago || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cheques");

    const etiquetaMeses =
      mesesSeleccionados.length === 12
        ? "Todo_El_Anio"
        : mesesSeleccionados
            .slice()
            .sort((a, b) => a - b)
            .map((numeroMes) =>
              (MESES.find((m) => m.value === numeroMes)?.label || String(numeroMes))
                .replace(/\s+/g, "_"),
            )
            .join("-");

    XLSX.writeFile(
      wb,
      `Reporte_Cheques_${condominioNombre || condominioId}_${etiquetaMeses}_${anio}.xlsx`
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:min-h-0 print:bg-white print:p-0">
      <style jsx global>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 0.22in;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body,
          main {
            min-height: 0 !important;
            height: auto !important;
            max-height: none !important;
          }

          * {
            box-sizing: border-box !important;
          }

          .no-print {
            display: none !important;
          }

          .print-root {
            width: 100% !important;
            max-width: 8.06in !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 auto !important;
            overflow: visible !important;
          }

          .print-card {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }

          .print-header {
            margin-bottom: 0.10in !important;
            padding-bottom: 0.07in !important;
          }

          .print-title {
            font-size: 15px !important;
            line-height: 1.08 !important;
          }

          .print-subtitle {
            margin-top: 2px !important;
            font-size: 12px !important;
            line-height: 1.05 !important;
          }

          .print-period {
            margin-top: 3px !important;
            font-size: 9px !important;
            line-height: 1.1 !important;
          }

          .print-status {
            font-size: 8px !important;
            line-height: 1.25 !important;
          }

          .print-summary {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 0.07in !important;
            margin-bottom: 0.11in !important;
          }

          .summary-card {
            min-height: 0 !important;
            padding: 0.07in 0.09in !important;
            border-radius: 5px !important;
          }

          .summary-card-title {
            font-size: 7.5px !important;
            line-height: 1.05 !important;
          }

          .summary-card-value {
            margin-top: 2px !important;
            font-size: 11.5px !important;
            line-height: 1.05 !important;
          }

          .print-table-wrap {
            overflow: visible !important;
          }

          .print-table {
            width: 100% !important;
            table-layout: fixed !important;
            font-size: 8.2px !important;
            line-height: 1.14 !important;
          }

          .print-table th,
          .print-table td {
            padding: 3px 3.5px !important;
            vertical-align: top !important;
            line-height: 1.14 !important;
            word-break: normal !important;
            overflow-wrap: anywhere !important;
          }

          .print-table th {
            font-size: 8px !important;
          }

          .print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .print-table .detalle-secundario {
            margin-top: 2px !important;
            font-size: 7.2px !important;
            line-height: 1.08 !important;
          }

          .print-footer {
            margin-top: 0.08in !important;
            padding-top: 0.04in !important;
            font-size: 7px !important;
            line-height: 1 !important;
          }

          .firmas-reporte {
            margin-top: 0.28in !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .firma-linea {
            width: 2.35in !important;
            margin: 0 auto !important;
            border-top: 1px solid #111827 !important;
            padding-top: 0.05in !important;
          }

          .firma-nombre {
            font-size: 8.5px !important;
            font-weight: 700 !important;
            line-height: 1.05 !important;
          }

          .firma-cargo {
            margin-top: 1px !important;
            font-size: 7.5px !important;
            line-height: 1 !important;
          }

          .preparado-vam {
            margin-top: 0.14in !important;
            font-size: 8px !important;
            font-weight: 700 !important;
            line-height: 1 !important;
          }
        }
      `}</style>

      <div className="print-root mx-auto max-w-7xl space-y-5 print:space-y-0">
        <div className="no-print rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Reporte de Cheques</h1>
              <p className="mt-1 text-sm text-slate-500">
                Control de cheques emitidos, impresiones, reimpresiones, anulaciones y pagos.
              </p>
              <p className="mt-2 text-sm font-bold text-blue-700">
                Condominio activo: {condominioNombre || "No seleccionado"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/solicitudes-pago" className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold text-white">
                Volver
              </Link>

              <button onClick={() => cargarTodo()} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white">
                <RefreshCw className="h-4 w-4" /> Actualizar
              </button>

              <button onClick={exportarExcel} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white">
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </button>

              <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
                <Printer className="h-4 w-4" /> Imprimir
              </button>
            </div>
          </div>
        </div>

        {mensaje && (
          <div className="no-print rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {mensaje}
          </div>
        )}

        <div className="no-print rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[150px_minmax(0,1fr)_180px_320px]">
            <div>
              <label className="mb-1 block text-xs font-black uppercase text-slate-500">Año</label>
              <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="w-full rounded-xl border bg-white px-3 py-2">
                {[2025, 2026, 2027, 2028].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-black uppercase text-slate-500">Meses</label>
                <div className="flex gap-2 text-[11px] font-bold">
                  <button type="button" onClick={seleccionarMesActual} className="text-blue-700 hover:underline">Mes actual</button>
                  <button type="button" onClick={seleccionarTodosLosMeses} className="text-blue-700 hover:underline">Todo el año</button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {MESES.map((m) => {
                  const activo = mesesSeleccionados.includes(m.value);
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => alternarMes(m.value)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                        activo
                          ? "border-blue-700 bg-blue-700 text-white"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {m.label.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-black uppercase text-slate-500">Estado</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2">
                <option value="TODOS">Todos</option>
                <option value="EMITIDO">Emitido</option>
                <option value="IMPRESO">Impreso</option>
                <option value="PAGADO">Pagado</option>
                <option value="ANULADO">Anulado</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-black uppercase text-slate-500">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Cheque, beneficiario, solicitud, banco..." className="w-full rounded-xl border py-2 pl-9 pr-3" />
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs font-semibold text-slate-500">
            Período seleccionado: <span className="font-black text-slate-800">{periodoTexto}</span>
          </div>
        </div>

        <section className="print-card rounded-2xl border bg-white p-5 shadow-sm">
          <div className="print-header mb-3 flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-2">
            <div>
              <h1 className="print-title text-xl font-black uppercase">{condominioNombre || "Condominio"}</h1>
              <h2 className="print-subtitle mt-1 text-lg font-black uppercase">Reporte de Cheques</h2>
              <p className="print-period mt-1 text-sm text-slate-600">Período: {periodoTexto}</p>
            </div>

            <div className="print-status text-right text-xs text-slate-600">
              <div><strong>Estado:</strong> {estado === "TODOS" ? "Todos" : estado}</div>
              <div><strong>Cantidad:</strong> {filasFiltradas.length}</div>
            </div>
          </div>

          <div className="print-summary mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Card titulo="Cheques" valor={String(filasFiltradas.length)} />
            <Card titulo="Monto total" valor={`RD$ ${dinero(totalMonto)}`} />
            <Card titulo="Pagados" valor={String(cantidadPagados)} />
          </div>

          {loading ? (
            <div className="p-6 text-slate-600">Cargando cheques...</div>
          ) : (
            <div className="print-table-wrap overflow-x-auto">
              <table className="print-table min-w-full border text-xs">
                <colgroup>
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "23%" }} />
                  <col style={{ width: "34%" }} />
                  <col style={{ width: "14%" }} />
                </colgroup>
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border p-2 text-left">No. cheque</th>
                    <th className="border p-2 text-left">Fecha</th>
                    <th className="border p-2 text-left">Solicitud</th>
                    <th className="border p-2 text-left">Beneficiario</th>
                    <th className="border p-2 text-left">Concepto</th>
                    <th className="border p-2 text-right">Monto</th>
                  </tr>
                </thead>

                <tbody>
                  {filasFiltradas.map((f) => (
                    <tr key={f.cheque_id}>
                      <td className="border p-2 font-black">{f.numero_cheque}</td>
                      <td className="border p-2">{fechaDO(f.fecha_emision)}</td>
                      <td className="border p-2 font-bold">{f.numero_solicitud}</td>
                      <td className="border p-2">{f.beneficiario}</td>
                      <td className="border p-2">
                        <div className="font-semibold">{f.concepto || "-"}</div>
                        {f.comentario && <div className="detalle-secundario mt-1 text-[9px] text-slate-500">{f.comentario}</div>}
                      </td>
                      <td className="border p-2 text-right font-black whitespace-nowrap">
                        RD$ {dinero(f.monto)}
                      </td>
                    </tr>
                  ))}

                  {filasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={6} className="border p-6 text-center text-slate-500">
                        No hay cheques para mostrar en este período.
                      </td>
                    </tr>
                  )}
                </tbody>

                {filasFiltradas.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-black">
                      <td colSpan={5} className="border p-2 text-right">Total:</td>
                      <td className="border p-2 text-right">RD$ {dinero(totalMonto)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          <div className="firmas-reporte mt-8">
            <div className="grid grid-cols-2 gap-12 px-8">
              <div className="text-center">
                <div className="firma-linea">
                  <div className="firma-nombre">
                    {tesorero?.nombre || "Tesorero"}
                  </div>
                  <div className="firma-cargo">Tesorero</div>
                </div>
              </div>

              <div className="text-center">
                <div className="firma-linea">
                  <div className="firma-nombre">
                    {presidente?.nombre || "Presidente"}
                  </div>
                  <div className="firma-cargo">Presidente</div>
                </div>
              </div>
            </div>

            <div className="preparado-vam mt-4 text-center text-[9px] font-bold text-slate-600">
              Preparado por VAM Condominios
            </div>
          </div>

          <div className="print-footer mt-4 flex justify-between border-t pt-2 text-[9px] text-slate-500">
            <span>Fuente: cheques_emitidos</span>
            <span>VAM Administración de Condominios</span>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="summary-card rounded-lg border bg-slate-50 px-3 py-2">
      <div className="summary-card-title text-[11px] font-semibold text-slate-500">
        {titulo}
      </div>
      <div className="summary-card-value mt-0.5 text-lg font-black leading-tight text-slate-900">
        {valor}
      </div>
    </div>
  );
}
