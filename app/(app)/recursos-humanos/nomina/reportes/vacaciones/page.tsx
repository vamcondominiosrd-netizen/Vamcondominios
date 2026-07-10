"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type BalanceVacaciones = {
  id: number;
  empleado_id: number;
  numero_empleado: string | null;
  nombre_empleado: string | null;
  cargo: string | null;
  departamento: string | null;
  anio: number;
  dias_arrastre_anterior: number | null;
  dias_generados: number | null;
  dias_tomados: number | null;
  dias_pagados: number | null;
  dias_ajuste: number | null;
  dias_disponibles: number | null;
  observacion: string | null;
  estado: string | null;
};

type SolicitudVacaciones = {
  id: number;
  empleado_id: number;
  numero_empleado: string | null;
  nombre_empleado: string | null;
  cargo: string | null;
  departamento: string | null;
  tipo: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  cantidad_dias: number | null;
  forma_pago: string | null;
  saldo_disponible: number | null;
  dias_correspondientes: number | null;
  procesado_nomina: boolean | null;
  nomina_id: number | null;
  solicitud_pago_id: number | null;
  estado: string | null;
  motivo: string | null;
  observacion: string | null;
  aprobado_por: string | null;
  fecha_aprobacion: string | null;
};

const estados = ["Todos", "Activo", "Inactivo"];
const estadosSolicitud = ["Todos", "Pendiente", "Aprobado", "Rechazado"];
const anioActual = new Date().getFullYear();

export default function ReporteVacacionesPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [balances, setBalances] = useState<BalanceVacaciones[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudVacaciones[]>([]);
  const [loading, setLoading] = useState(false);

  const [anio, setAnio] = useState(String(anioActual));
  const [busqueda, setBusqueda] = useState("");
  const [filtroDepartamento, setFiltroDepartamento] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroEstadoSolicitud, setFiltroEstadoSolicitud] = useState("Todos");
  const [filtroFormaPago, setFiltroFormaPago] = useState("Todos");
  const [verSolicitudes, setVerSolicitudes] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    setCondominioId(id);
    setCondominioNombre(nombre);
    if (id) cargarDatos(id, Number(anio));
  }, []);

  async function cargarDatos(id: string, anioBuscar: number) {
    setLoading(true);

    const [balanceResp, solicitudesResp] = await Promise.all([
      supabase
        .from("rh_balance_vacaciones")
        .select("*")
        .eq("condominio_id", Number(id))
        .eq("anio", anioBuscar)
        .order("nombre_empleado", { ascending: true }),

      supabase
        .from("rh_vacaciones_permisos")
        .select("*")
        .eq("condominio_id", Number(id))
        .eq("tipo", "Vacaciones")
        .gte("fecha_inicio", `${anioBuscar}-01-01`)
        .lte("fecha_inicio", `${anioBuscar}-12-31`)
        .order("fecha_inicio", { ascending: false }),
    ]);

    setLoading(false);

    if (balanceResp.error) {
      alert("Error cargando balance de vacaciones: " + balanceResp.error.message);
      return;
    }

    if (solicitudesResp.error) {
      alert("Error cargando solicitudes de vacaciones: " + solicitudesResp.error.message);
      return;
    }

    setBalances((balanceResp.data as BalanceVacaciones[]) || []);
    setSolicitudes((solicitudesResp.data as SolicitudVacaciones[]) || []);
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

  const departamentos = useMemo(() => {
    const lista = balances.map((b) => b.departamento || "").filter((x) => x.trim() !== "");
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [balances]);

  const formasPago = useMemo(() => {
    const lista = solicitudes.map((s) => s.forma_pago || "").filter((x) => x.trim() !== "");
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [solicitudes]);

  const balancesFiltrados = balances.filter((b) => {
    const texto = `${b.numero_empleado || ""} ${b.nombre_empleado || ""} ${b.cargo || ""} ${b.departamento || ""}`.toLowerCase();
    return (
      texto.includes(busqueda.toLowerCase().trim()) &&
      (filtroDepartamento === "Todos" || b.departamento === filtroDepartamento) &&
      (filtroEstado === "Todos" || b.estado === filtroEstado)
    );
  });

  const empleadosBalance = new Set(balancesFiltrados.map((b) => b.empleado_id));

  const solicitudesFiltradas = solicitudes.filter((s) => {
    const texto = `${s.numero_empleado || ""} ${s.nombre_empleado || ""} ${s.cargo || ""} ${s.departamento || ""} ${s.forma_pago || ""} ${s.estado || ""}`.toLowerCase();

    return (
      texto.includes(busqueda.toLowerCase().trim()) &&
      (empleadosBalance.size === 0 || empleadosBalance.has(s.empleado_id)) &&
      (filtroDepartamento === "Todos" || s.departamento === filtroDepartamento) &&
      (filtroEstadoSolicitud === "Todos" || s.estado === filtroEstadoSolicitud) &&
      (filtroFormaPago === "Todos" || s.forma_pago === filtroFormaPago)
    );
  });

  const totalArrastre = balancesFiltrados.reduce((s, b) => s + numero(b.dias_arrastre_anterior), 0);
  const totalGenerados = balancesFiltrados.reduce((s, b) => s + numero(b.dias_generados), 0);
  const totalTomados = balancesFiltrados.reduce((s, b) => s + numero(b.dias_tomados), 0);
  const totalPagados = balancesFiltrados.reduce((s, b) => s + numero(b.dias_pagados), 0);
  const totalAjustes = balancesFiltrados.reduce((s, b) => s + numero(b.dias_ajuste), 0);
  const totalDisponibles = balancesFiltrados.reduce((s, b) => s + numero(b.dias_disponibles), 0);

  const solicitudesPendientes = solicitudesFiltradas.filter((s) => s.estado === "Pendiente").length;
  const solicitudesAprobadas = solicitudesFiltradas.filter((s) => s.estado === "Aprobado").length;
  const vacacionesJuntoNomina = solicitudesFiltradas.filter((s) => s.forma_pago === "Junto Nómina").length;
  const vacacionesIndependientes = solicitudesFiltradas.filter((s) => s.forma_pago === "Pago Independiente").length;

  function limpiarFiltros() {
    setAnio(String(anioActual));
    setBusqueda("");
    setFiltroDepartamento("Todos");
    setFiltroEstado("Todos");
    setFiltroEstadoSolicitud("Todos");
    setFiltroFormaPago("Todos");
    setVerSolicitudes(true);
  }

  function imprimir() {
    window.print();
  }

  function descargarCSV(nombreArchivo: string, encabezados: string[], filas: any[][]) {
    const contenido = [encabezados, ...filas]
      .map((fila) => fila.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportarBalanceCSV() {
    descargarCSV(
      "reporte_balance_vacaciones.csv",
      ["Año", "No. Empleado", "Empleado", "Cargo", "Departamento", "Arrastre", "Generados", "Tomados", "Pagados", "Ajustes", "Disponibles", "Estado", "Observación"],
      balancesFiltrados.map((b) => [
        b.anio || "",
        b.numero_empleado || "",
        b.nombre_empleado || "",
        b.cargo || "",
        b.departamento || "",
        numero(b.dias_arrastre_anterior).toFixed(2),
        numero(b.dias_generados).toFixed(2),
        numero(b.dias_tomados).toFixed(2),
        numero(b.dias_pagados).toFixed(2),
        numero(b.dias_ajuste).toFixed(2),
        numero(b.dias_disponibles).toFixed(2),
        b.estado || "",
        b.observacion || "",
      ])
    );
  }

  function exportarSolicitudesCSV() {
    descargarCSV(
      "reporte_solicitudes_vacaciones.csv",
      ["Empleado", "No. Empleado", "Cargo", "Departamento", "Fecha Inicio", "Fecha Fin", "Días", "Días Correspondientes", "Saldo Disponible", "Forma Pago", "Estado", "Procesado Nómina", "Nómina ID", "Solicitud Pago ID", "Aprobado Por", "Fecha Aprobación", "Motivo", "Observación"],
      solicitudesFiltradas.map((s) => [
        s.nombre_empleado || "",
        s.numero_empleado || "",
        s.cargo || "",
        s.departamento || "",
        s.fecha_inicio || "",
        s.fecha_fin || "",
        numero(s.cantidad_dias).toFixed(2),
        numero(s.dias_correspondientes).toFixed(2),
        numero(s.saldo_disponible).toFixed(2),
        s.forma_pago || "",
        s.estado || "",
        s.procesado_nomina ? "Sí" : "No",
        s.nomina_id || "",
        s.solicitud_pago_id || "",
        s.aprobado_por || "",
        s.fecha_aprobacion || "",
        s.motivo || "",
        s.observacion || "",
      ])
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900">Reporte de Vacaciones</h1>
            <p className="text-slate-500 mt-2">
              Balance anual, solicitudes, forma de pago y trazabilidad con nómina.
            </p>
          </div>

          <Link href="/recursos-humanos" className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-center">
            Volver a RH
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border no-print">
        <p className="text-sm text-slate-500">Condominio activo</p>
        <h2 className="text-lg font-bold text-slate-900">{condominioNombre || "No identificado"}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-7 gap-4 no-print">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Empleados balance</p>
          <h2 className="text-3xl font-black">{balancesFiltrados.length}</h2>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Generados</p>
          <h2 className="text-3xl font-black text-green-700">{totalGenerados.toFixed(2)}</h2>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Tomados</p>
          <h2 className="text-3xl font-black text-red-700">{totalTomados.toFixed(2)}</h2>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Pagados</p>
          <h2 className="text-3xl font-black text-purple-700">{totalPagados.toFixed(2)}</h2>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Disponibles</p>
          <h2 className="text-3xl font-black text-blue-700">{totalDisponibles.toFixed(2)}</h2>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Pendientes</p>
          <h2 className="text-3xl font-black text-yellow-700">{solicitudesPendientes}</h2>
        </div>
        <div className="bg-slate-900 rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-300">Aprobadas</p>
          <h2 className="text-3xl font-black text-white">{solicitudesAprobadas}</h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <h2 className="text-xl font-black mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Año</label>
            <input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} className="border rounded-xl px-4 py-3 w-full" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Buscar</label>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="border rounded-xl px-4 py-3 w-full" placeholder="Empleado, cargo..." />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Departamento</label>
            <select value={filtroDepartamento} onChange={(e) => setFiltroDepartamento(e.target.value)} className="border rounded-xl px-4 py-3 w-full bg-white">
              {departamentos.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Estado balance</label>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="border rounded-xl px-4 py-3 w-full bg-white">
              {estados.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Estado solicitud</label>
            <select value={filtroEstadoSolicitud} onChange={(e) => setFiltroEstadoSolicitud(e.target.value)} className="border rounded-xl px-4 py-3 w-full bg-white">
              {estadosSolicitud.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Forma pago</label>
            <select value={filtroFormaPago} onChange={(e) => setFiltroFormaPago(e.target.value)} className="border rounded-xl px-4 py-3 w-full bg-white">
              {formasPago.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-5">
          <button onClick={() => condominioId && cargarDatos(condominioId, Number(anio))} className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold">
            Buscar / Actualizar
          </button>
          <button onClick={limpiarFiltros} className="bg-slate-600 hover:bg-slate-700 text-white px-5 py-3 rounded-xl font-bold">
            Limpiar
          </button>
          <button onClick={exportarBalanceCSV} className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-xl font-bold">
            Exportar Balance
          </button>
          <button onClick={exportarSolicitudesCSV} className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-3 rounded-xl font-bold">
            Exportar Solicitudes
          </button>
          <button onClick={imprimir} className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-3 rounded-xl font-bold">
            Imprimir / PDF
          </button>
          <button onClick={() => setVerSolicitudes(!verSolicitudes)} className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-3 rounded-xl font-bold">
            {verSolicitudes ? "Ocultar Solicitudes" : "Ver Solicitudes"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6 print-area">
        <div className="hidden print:block mb-5 border-b pb-3">
          <h1 className="text-2xl font-black text-center">REPORTE DE VACACIONES</h1>
          <p className="text-center font-bold">{condominioNombre}</p>
          <p className="text-center text-sm">Año: {anio} · Fecha impresión: {new Date().toLocaleDateString("es-DO")}</p>
        </div>

        <div className="mb-5">
          <h2 className="text-xl font-black">Balance anual de vacaciones</h2>
          <p className="text-sm text-slate-500">{balancesFiltrados.length} empleado(s) con balance encontrado(s).</p>
        </div>

        {loading ? (
          <div>Cargando reporte...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 border text-left">Empleado</th>
                  <th className="p-2 border text-left">Cargo / Departamento</th>
                  <th className="p-2 border text-right">Arrastre</th>
                  <th className="p-2 border text-right">Generados</th>
                  <th className="p-2 border text-right">Tomados</th>
                  <th className="p-2 border text-right">Pagados</th>
                  <th className="p-2 border text-right">Ajustes</th>
                  <th className="p-2 border text-right">Disponibles</th>
                  <th className="p-2 border text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {balancesFiltrados.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="p-2 border">
                      <p className="font-black">{b.nombre_empleado}</p>
                      <p className="text-xs text-slate-500">{b.numero_empleado || "-"} · Año {b.anio}</p>
                    </td>
                    <td className="p-2 border">
                      <p className="font-bold">{b.cargo || "-"}</p>
                      <p className="text-xs text-slate-500">{b.departamento || "-"}</p>
                    </td>
                    <td className="p-2 border text-right">{numero(b.dias_arrastre_anterior).toFixed(2)}</td>
                    <td className="p-2 border text-right font-bold text-green-700">{numero(b.dias_generados).toFixed(2)}</td>
                    <td className="p-2 border text-right font-bold text-red-700">{numero(b.dias_tomados).toFixed(2)}</td>
                    <td className="p-2 border text-right font-bold text-purple-700">{numero(b.dias_pagados).toFixed(2)}</td>
                    <td className="p-2 border text-right">{numero(b.dias_ajuste).toFixed(2)}</td>
                    <td className="p-2 border text-right font-black text-blue-700">{numero(b.dias_disponibles).toFixed(2)}</td>
                    <td className="p-2 border text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${b.estado === "Activo" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {b.estado || "-"}
                      </span>
                    </td>
                  </tr>
                ))}
                {balancesFiltrados.length === 0 && (
                  <tr><td className="p-6 border text-center text-slate-500" colSpan={9}>No hay balance de vacaciones para esta consulta.</td></tr>
                )}
              </tbody>
              {balancesFiltrados.length > 0 && (
                <tfoot className="bg-slate-100 font-black">
                  <tr>
                    <td className="p-2 border" colSpan={2}>Totales</td>
                    <td className="p-2 border text-right">{totalArrastre.toFixed(2)}</td>
                    <td className="p-2 border text-right text-green-700">{totalGenerados.toFixed(2)}</td>
                    <td className="p-2 border text-right text-red-700">{totalTomados.toFixed(2)}</td>
                    <td className="p-2 border text-right text-purple-700">{totalPagados.toFixed(2)}</td>
                    <td className="p-2 border text-right">{totalAjustes.toFixed(2)}</td>
                    <td className="p-2 border text-right text-blue-700">{totalDisponibles.toFixed(2)}</td>
                    <td className="p-2 border"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {verSolicitudes && (
        <div className="bg-white rounded-3xl border shadow-sm p-6 print-area">
          <div className="mb-5">
            <h2 className="text-xl font-black">Solicitudes de vacaciones</h2>
            <p className="text-sm text-slate-500">
              {solicitudesFiltradas.length} solicitud(es). Junto Nómina: {vacacionesJuntoNomina} · Pago Independiente: {vacacionesIndependientes}
            </p>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 border text-left">Empleado</th>
                  <th className="p-2 border text-left">Fechas</th>
                  <th className="p-2 border text-right">Días</th>
                  <th className="p-2 border text-left">Forma Pago</th>
                  <th className="p-2 border text-center">Estado</th>
                  <th className="p-2 border text-center">Nómina</th>
                  <th className="p-2 border text-left">Aprobación</th>
                  <th className="p-2 border text-left">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {solicitudesFiltradas.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-2 border">
                      <p className="font-black">{s.nombre_empleado}</p>
                      <p className="text-xs text-slate-500">{s.numero_empleado || "-"} · {s.cargo || "-"}</p>
                    </td>
                    <td className="p-2 border">
                      <p>Inicio: {fecha(s.fecha_inicio)}</p>
                      <p className="text-xs text-slate-500">Fin: {fecha(s.fecha_fin)}</p>
                    </td>
                    <td className="p-2 border text-right">
                      <p className="font-black">{numero(s.cantidad_dias).toFixed(2)}</p>
                      <p className="text-xs text-slate-500">Corr.: {numero(s.dias_correspondientes).toFixed(2)}</p>
                    </td>
                    <td className="p-2 border">
                      <p className="font-bold">{s.forma_pago || "-"}</p>
                      <p className="text-xs text-slate-500">Saldo: {numero(s.saldo_disponible).toFixed(2)}</p>
                    </td>
                    <td className="p-2 border text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.estado === "Aprobado" ? "bg-green-100 text-green-700" : s.estado === "Rechazado" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {s.estado || "-"}
                      </span>
                    </td>
                    <td className="p-2 border text-center">
                      <p>Nómina: {s.nomina_id || "-"}</p>
                      <p className="text-xs text-slate-500">Solicitud: {s.solicitud_pago_id || "-"}</p>
                      <p className="text-xs text-slate-500">{s.procesado_nomina ? "Procesado" : "Pendiente"}</p>
                    </td>
                    <td className="p-2 border">
                      <p>{s.aprobado_por || "-"}</p>
                      <p className="text-xs text-slate-500">{fecha(s.fecha_aprobacion)}</p>
                    </td>
                    <td className="p-2 border">
                      <p>{s.motivo || "-"}</p>
                      {s.observacion && <p className="text-xs text-slate-500">Obs.: {s.observacion}</p>}
                    </td>
                  </tr>
                ))}
                {solicitudesFiltradas.length === 0 && (
                  <tr><td className="p-6 border text-center text-slate-500" colSpan={8}>No hay solicitudes de vacaciones para esta consulta.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
            margin: 0 0 12px 0 !important;
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
