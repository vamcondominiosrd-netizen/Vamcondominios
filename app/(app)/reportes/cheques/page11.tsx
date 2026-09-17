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

function estadoClase(estado: string) {
  if (estado === "IMPRESO") return "bg-cyan-100 text-cyan-800 border-cyan-200";
  if (estado === "PAGADO") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (estado === "ANULADO") return "bg-red-100 text-red-800 border-red-200";
  if (estado === "EMITIDO") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function ReporteChequesPage() {
  const hoy = new Date();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [estado, setEstado] = useState("TODOS");
  const [buscar, setBuscar] = useState("");
  const [cheques, setCheques] = useState<ChequeOperativo[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudMini[]>([]);
  const [cuentas, setCuentas] = useState<CuentaMini[]>([]);
  const [gastos, setGastos] = useState<GastoMini[]>([]);
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

      const [solResp, cuentaResp, gastoResp] = await Promise.all([
        solicitudIds.length
          ? supabase.from("solicitudes_pago").select("id, numero_solicitud").in("id", solicitudIds)
          : Promise.resolve({ data: [], error: null }),
        cuentaIds.length
          ? supabase.from("cuentas_bancarias").select("id, nombre_banco, numero_cuenta").in("id", cuentaIds)
          : Promise.resolve({ data: [], error: null }),
        gastoIds.length
          ? supabase.from("gastos").select("id, fecha_pago, pagado, cheque_url").in("id", gastoIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (solResp.error) throw new Error("Error solicitudes: " + solResp.error.message);
      if (cuentaResp.error) throw new Error("Error cuentas: " + cuentaResp.error.message);
      if (gastoResp.error) throw new Error("Error gastos: " + gastoResp.error.message);

      setSolicitudes((solResp.data as SolicitudMini[]) || []);
      setCuentas((cuentaResp.data as CuentaMini[]) || []);
      setGastos((gastoResp.data as GastoMini[]) || []);
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

  const filasFiltradas = useMemo(() => {
    return filas.filter((f) => {
      const d = new Date(`${f.fecha_emision}T00:00:00`);
      const periodoOk = d.getFullYear() === anio && d.getMonth() + 1 === mes;
      const estadoOk = estado === "TODOS" || f.estado === estado;
      const texto = normalizar(
        `${f.numero_cheque} ${f.numero_solicitud} ${f.beneficiario} ${f.concepto || ""} ${f.comentario || ""} ${f.banco} ${f.numero_cuenta} ${f.estado}`
      );
      const buscarOk = !buscar.trim() || texto.includes(normalizar(buscar));
      return periodoOk && estadoOk && buscarOk;
    });
  }, [filas, anio, mes, estado, buscar]);

  const totalMonto = filasFiltradas.reduce((s, x) => s + Number(x.monto || 0), 0);
  const cantidadImpresiones = filasFiltradas.reduce((s, x) => s + Number(x.cantidad_impresiones || 0), 0);
  const cantidadPagados = filasFiltradas.filter((x) => x.estado === "PAGADO" || x.pagado).length;
  const cantidadAnulados = filasFiltradas.filter((x) => x.estado === "ANULADO").length;

  function exportarExcel() {
    const data = filasFiltradas.map((f) => ({
      "No. cheque": f.numero_cheque,
      "Fecha emisión": f.fecha_emision,
      "No. solicitud": f.numero_solicitud,
      Beneficiario: f.beneficiario,
      Concepto: f.concepto || "",
      Comentario: f.comentario || "",
      Banco: f.banco,
      Cuenta: f.numero_cuenta,
      Monto: Number(f.monto || 0),
      Estado: f.estado,
      Impresiones: Number(f.cantidad_impresiones || 0),
      "Primera impresión": f.primera_impresion_at || "",
      "Última impresión": f.ultima_impresion_at || "",
      "Gasto ID": f.gasto_id || "",
      "Fecha pago": f.fecha_pago || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cheques");

    const nombreMes = MESES.find((m) => m.value === mes)?.label || String(mes);

    XLSX.writeFile(
      wb,
      `Reporte_Cheques_${condominioNombre || condominioId}_${nombreMes}_${anio}.xlsx`
    );
  }

  const nombreMes = MESES.find((m) => m.value === mes)?.label || String(mes);

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <style jsx global>{`
        @media print {
          @page { size: letter landscape; margin: 0.35in; }
          html, body {
            background: white !important;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print { display: none !important; }
          .print-card {
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .print-table { font-size: 9px !important; }
          .print-table th, .print-table td { padding: 4px !important; }
        }
      `}</style>

      <div className="mx-auto max-w-7xl space-y-5">
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="rounded-xl border bg-white px-3 py-2">
              {[2025, 2026, 2027, 2028].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>

            <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="rounded-xl border bg-white px-3 py-2">
              {MESES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>

            <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-xl border bg-white px-3 py-2">
              <option value="TODOS">Todos</option>
              <option value="EMITIDO">Emitido</option>
              <option value="IMPRESO">Impreso</option>
              <option value="PAGADO">Pagado</option>
              <option value="ANULADO">Anulado</option>
            </select>

            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Cheque, beneficiario, solicitud, banco..."
                className="w-full rounded-xl border py-2 pl-9 pr-3"
              />
            </div>
          </div>
        </div>

        <section className="print-card rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-3">
            <div>
              <h1 className="text-xl font-black uppercase">{condominioNombre || "Condominio"}</h1>
              <h2 className="mt-1 text-lg font-black uppercase">Reporte de Cheques</h2>
              <p className="mt-1 text-sm text-slate-600">Período: {nombreMes} {anio}</p>
            </div>

            <div className="text-right text-xs text-slate-600">
              <div><strong>Estado:</strong> {estado === "TODOS" ? "Todos" : estado}</div>
              <div><strong>Cantidad:</strong> {filasFiltradas.length}</div>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Card titulo="Cheques" valor={String(filasFiltradas.length)} />
            <Card titulo="Monto total" valor={`RD$ ${dinero(totalMonto)}`} />
            <Card titulo="Impresiones" valor={String(cantidadImpresiones)} />
            <Card titulo="Pagados" valor={String(cantidadPagados)} />
            <Card titulo="Anulados" valor={String(cantidadAnulados)} />
          </div>

          {loading ? (
            <div className="p-6 text-slate-600">Cargando cheques...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="print-table min-w-full border text-xs">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border p-2 text-left">No. cheque</th>
                    <th className="border p-2 text-left">Fecha</th>
                    <th className="border p-2 text-left">Solicitud</th>
                    <th className="border p-2 text-left">Beneficiario</th>
                    <th className="border p-2 text-left">Concepto</th>
                    <th className="border p-2 text-left">Banco / Cuenta</th>
                    <th className="border p-2 text-right">Monto</th>
                    <th className="border p-2 text-center">Impresiones</th>
                    <th className="border p-2 text-center">Estado</th>
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
                        {f.comentario && <div className="mt-1 text-[9px] text-slate-500">{f.comentario}</div>}
                      </td>
                      <td className="border p-2">
                        <div className="font-semibold">{f.banco}</div>
                        <div className="text-[9px] text-slate-500">{f.numero_cuenta}</div>
                      </td>
                      <td className="border p-2 text-right font-black">RD$ {dinero(f.monto)}</td>
                      <td className="border p-2 text-center">{Number(f.cantidad_impresiones || 0)}</td>
                      <td className="border p-2 text-center">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${estadoClase(f.estado)}`}>
                          {f.estado}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={9} className="border p-6 text-center text-slate-500">
                        No hay cheques para mostrar en este período.
                      </td>
                    </tr>
                  )}
                </tbody>

                {filasFiltradas.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-black">
                      <td colSpan={6} className="border p-2 text-right">Total:</td>
                      <td className="border p-2 text-right">RD$ {dinero(totalMonto)}</td>
                      <td colSpan={2} className="border p-2" />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          <div className="mt-8 flex justify-between border-t pt-2 text-[10px] text-slate-500">
            <span>Fuente: cheques_emitidos / cheques_impresiones</span>
            <span>VAM Administración de Condominios</span>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <div className="text-[11px] font-semibold text-slate-500">{titulo}</div>
      <div className="mt-1 text-lg font-black text-slate-900">{valor}</div>
    </div>
  );
}
