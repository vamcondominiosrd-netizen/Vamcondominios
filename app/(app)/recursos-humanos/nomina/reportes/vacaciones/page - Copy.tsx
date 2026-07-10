"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type BalanceVacaciones = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  empleado_id: number;
  numero_empleado: string | null;
  nombre_empleado: string | null;
  cargo: string | null;
  departamento: string | null;
  anio: number;
  dias_generados: number | null;
  dias_tomados: number | null;
  dias_pagados: number | null;
  dias_disponibles: number | null;
  observacion: string | null;
  estado: string | null;
  created_at: string | null;
  dias_arrastre_anterior: number | null;
  dias_ajuste: number | null;
};

type MovimientoVacaciones = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  empleado_id: number;
  numero_empleado: string | null;
  nombre_empleado: string | null;
  anio: number;
  tipo_movimiento: string;
  fecha_movimiento: string;
  dias: number | null;
  observacion: string | null;
  solicitud_id: number | null;
  nomina_id: number | null;
  estado: string | null;
  created_at: string | null;
  usuario: string | null;
  tipo_origen: string | null;
  referencia_id: number | null;
};

const estados = ["Todos", "Activo", "Inactivo"];
const anioActual = new Date().getFullYear();

export default function ReporteVacacionesPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [balances, setBalances] = useState<BalanceVacaciones[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoVacaciones[]>([]);
  const [loading, setLoading] = useState(false);

  const [anio, setAnio] = useState(String(anioActual));
  const [busqueda, setBusqueda] = useState("");
  const [filtroDepartamento, setFiltroDepartamento] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [empleadoSeleccionadoId, setEmpleadoSeleccionadoId] = useState<string>("");
  const [verHistorico, setVerHistorico] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarDatos(id, Number(anio));
    }
  }, []);

  async function cargarDatos(id: string, anioBuscar: number) {
    setLoading(true);

    const { data: dataBalance, error: errorBalance } = await supabase
      .from("rh_balance_vacaciones")
      .select("*")
      .eq("condominio_id", Number(id))
      .eq("anio", anioBuscar)
      .order("nombre_empleado", { ascending: true });

    if (errorBalance) {
      setLoading(false);
      alert("Error cargando balance de vacaciones: " + errorBalance.message);
      return;
    }

    const { data: dataMovimientos, error: errorMovimientos } = await supabase
      .from("rh_movimientos_vacaciones")
      .select("*")
      .eq("condominio_id", Number(id))
      .eq("anio", anioBuscar)
      .order("fecha_movimiento", { ascending: false })
      .order("created_at", { ascending: false });

    setLoading(false);

    if (errorMovimientos) {
      alert("Error cargando histórico de vacaciones: " + errorMovimientos.message);
      return;
    }

    setBalances((dataBalance as BalanceVacaciones[]) || []);
    setMovimientos((dataMovimientos as MovimientoVacaciones[]) || []);
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
    const lista = balances
      .map((b) => b.departamento || "")
      .filter((x) => x.trim() !== "");

    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [balances]);

  const balancesFiltrados = balances.filter((b) => {
    const texto = `${b.numero_empleado || ""} ${b.nombre_empleado || ""} ${
      b.cargo || ""
    } ${b.departamento || ""}`
      .toLowerCase()
      .trim();

    const coincideBusqueda = texto.includes(busqueda.toLowerCase().trim());

    const coincideDepartamento =
      filtroDepartamento === "Todos" || b.departamento === filtroDepartamento;

    const coincideEstado = filtroEstado === "Todos" || b.estado === filtroEstado;

    const coincideEmpleado =
      !empleadoSeleccionadoId || String(b.empleado_id) === empleadoSeleccionadoId;

    return (
      coincideBusqueda &&
      coincideDepartamento &&
      coincideEstado &&
      coincideEmpleado
    );
  });

  const movimientosFiltrados = movimientos.filter((m) => {
    const idsBalances = new Set(balancesFiltrados.map((b) => b.empleado_id));
    return idsBalances.has(m.empleado_id);
  });

  const totalArrastre = balancesFiltrados.reduce(
    (sum, b) => sum + numero(b.dias_arrastre_anterior),
    0
  );

  const totalGenerados = balancesFiltrados.reduce(
    (sum, b) => sum + numero(b.dias_generados),
    0
  );

  const totalTomados = balancesFiltrados.reduce(
    (sum, b) => sum + numero(b.dias_tomados),
    0
  );

  const totalPagados = balancesFiltrados.reduce(
    (sum, b) => sum + numero(b.dias_pagados),
    0
  );

  const totalAjuste = balancesFiltrados.reduce(
    (sum, b) => sum + numero(b.dias_ajuste),
    0
  );

  const totalDisponibles = balancesFiltrados.reduce(
    (sum, b) => sum + numero(b.dias_disponibles),
    0
  );

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroDepartamento("Todos");
    setFiltroEstado("Todos");
    setEmpleadoSeleccionadoId("");
    setVerHistorico(true);
  }

  function imprimir() {
    window.print();
  }

  function exportarCSV() {
    const encabezados = [
      "Año",
      "No. Empleado",
      "Empleado",
      "Cargo",
      "Departamento",
      "Arrastre",
      "Generados",
      "Tomados",
      "Pagados",
      "Ajuste",
      "Disponibles",
      "Estado",
      "Observacion",
    ];

    const filas = balancesFiltrados.map((b) => [
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
    a.download = `reporte_vacaciones_${anio}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportarHistoricoCSV() {
    const encabezados = [
      "Año",
      "Fecha",
      "No. Empleado",
      "Empleado",
      "Movimiento",
      "Días",
      "Origen",
      "Solicitud ID",
      "Nómina ID",
      "Referencia ID",
      "Usuario",
      "Estado",
      "Observación",
    ];

    const filas = movimientosFiltrados.map((m) => [
      m.anio || "",
      m.fecha_movimiento || "",
      m.numero_empleado || "",
      m.nombre_empleado || "",
      m.tipo_movimiento || "",
      numero(m.dias).toFixed(2),
      m.tipo_origen || "",
      m.solicitud_id || "",
      m.nomina_id || "",
      m.referencia_id || "",
      m.usuario || "",
      m.estado || "",
      m.observacion || "",
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
    a.download = `historico_vacaciones_${anio}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <h1 className="text-4xl font-black text-slate-900">
          Reporte de Vacaciones
        </h1>

        <p className="text-slate-500 mt-2">
          Balance anual e histórico de movimientos de vacaciones por empleado.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border no-print">
        <p className="text-sm text-slate-500">Condominio activo</p>

        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 no-print">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Empleados</p>
          <h2 className="text-3xl font-black">{balancesFiltrados.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Arrastre</p>
          <h2 className="text-3xl font-black text-slate-700">
            {totalArrastre.toFixed(2)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Generados</p>
          <h2 className="text-3xl font-black text-green-700">
            {totalGenerados.toFixed(2)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Tomados</p>
          <h2 className="text-3xl font-black text-red-700">
            {totalTomados.toFixed(2)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Pagados</p>
          <h2 className="text-3xl font-black text-purple-700">
            {totalPagados.toFixed(2)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Disponibles</p>
          <h2 className="text-3xl font-black text-blue-700">
            {totalDisponibles.toFixed(2)}
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

          <div>
            <label className="block text-sm font-semibold mb-1">
              Empleado específico
            </label>
            <select
              value={empleadoSeleccionadoId}
              onChange={(e) => setEmpleadoSeleccionadoId(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="">Todos</option>
              {balances.map((item) => (
                <option key={item.id} value={item.empleado_id}>
                  {item.numero_empleado} - {item.nombre_empleado}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-5">
          <button
            onClick={() => condominioId && cargarDatos(condominioId, Number(anio))}
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
            Exportar Balance
          </button>

          <button
            onClick={exportarHistoricoCSV}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Exportar Histórico
          </button>

          <button
            onClick={imprimir}
            className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Imprimir
          </button>

          <button
            onClick={() => setVerHistorico(!verHistorico)}
            className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-3 rounded-xl font-bold"
          >
            {verHistorico ? "Ocultar Histórico" : "Ver Histórico"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6 print-area">
        <div className="mb-5 hidden print:block">
          <h1 className="text-2xl font-black">Reporte de Vacaciones</h1>
          <p>{condominioNombre}</p>
          <p className="text-sm">Año: {anio}</p>
          <p className="text-sm">Fecha: {new Date().toLocaleDateString("es-DO")}</p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-black">Balance anual de vacaciones</h2>
            <p className="text-sm text-slate-500">
              {balancesFiltrados.length} registro(s) encontrado(s).
            </p>
          </div>

          <div className="text-sm text-slate-500">
            Total disponible:{" "}
            <span className="font-black text-blue-700">
              {totalDisponibles.toFixed(2)} días
            </span>
          </div>
        </div>

        {loading ? (
          <div>Cargando reporte de vacaciones...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Empleado</th>
                  <th className="p-3 border text-left">Cargo / Depto.</th>
                  <th className="p-3 border text-right">Arrastre</th>
                  <th className="p-3 border text-right">Generados</th>
                  <th className="p-3 border text-right">Tomados</th>
                  <th className="p-3 border text-right">Pagados</th>
                  <th className="p-3 border text-right">Ajuste</th>
                  <th className="p-3 border text-right">Disponibles</th>
                  <th className="p-3 border text-center">Estado</th>
                </tr>
              </thead>

              <tbody>
                {balancesFiltrados.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="p-3 border">
                      <p className="font-bold">{b.nombre_empleado}</p>
                      <p className="text-xs text-slate-500">
                        {b.numero_empleado || "-"} · Año {b.anio}
                      </p>
                    </td>

                    <td className="p-3 border">
                      <p>{b.cargo || "-"}</p>
                      <p className="text-xs text-slate-500">
                        {b.departamento || "-"}
                      </p>
                    </td>

                    <td className="p-3 border text-right font-bold">
                      {numero(b.dias_arrastre_anterior).toFixed(2)}
                    </td>

                    <td className="p-3 border text-right font-bold text-green-700">
                      {numero(b.dias_generados).toFixed(2)}
                    </td>

                    <td className="p-3 border text-right font-bold text-red-700">
                      {numero(b.dias_tomados).toFixed(2)}
                    </td>

                    <td className="p-3 border text-right font-bold text-purple-700">
                      {numero(b.dias_pagados).toFixed(2)}
                    </td>

                    <td className="p-3 border text-right font-bold text-slate-700">
                      {numero(b.dias_ajuste).toFixed(2)}
                    </td>

                    <td className="p-3 border text-right font-black text-blue-700">
                      {numero(b.dias_disponibles).toFixed(2)}
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          b.estado === "Activo"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {b.estado || "-"}
                      </span>
                    </td>
                  </tr>
                ))}

                {balancesFiltrados.length === 0 && (
                  <tr>
                    <td className="p-6 border text-center text-slate-500" colSpan={9}>
                      No hay balance de vacaciones para esta consulta.
                    </td>
                  </tr>
                )}
              </tbody>

              {balancesFiltrados.length > 0 && (
                <tfoot className="bg-slate-100 font-black">
                  <tr>
                    <td className="p-3 border" colSpan={2}>
                      Totales
                    </td>
                    <td className="p-3 border text-right">
                      {totalArrastre.toFixed(2)}
                    </td>
                    <td className="p-3 border text-right text-green-700">
                      {totalGenerados.toFixed(2)}
                    </td>
                    <td className="p-3 border text-right text-red-700">
                      {totalTomados.toFixed(2)}
                    </td>
                    <td className="p-3 border text-right text-purple-700">
                      {totalPagados.toFixed(2)}
                    </td>
                    <td className="p-3 border text-right">
                      {totalAjuste.toFixed(2)}
                    </td>
                    <td className="p-3 border text-right text-blue-700">
                      {totalDisponibles.toFixed(2)}
                    </td>
                    <td className="p-3 border"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {verHistorico && (
        <div className="bg-white rounded-3xl border shadow-sm p-6 print-area mt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-black">Histórico de movimientos</h2>
              <p className="text-sm text-slate-500">
                Movimientos del año {anio} relacionados al balance filtrado.
              </p>
            </div>

            <div className="text-sm text-slate-500">
              Total movimientos:{" "}
              <span className="font-black">{movimientosFiltrados.length}</span>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Fecha</th>
                  <th className="p-3 border text-left">Empleado</th>
                  <th className="p-3 border text-left">Movimiento</th>
                  <th className="p-3 border text-right">Días</th>
                  <th className="p-3 border text-left">Origen</th>
                  <th className="p-3 border text-left">Usuario</th>
                  <th className="p-3 border text-left">Observación</th>
                </tr>
              </thead>

              <tbody>
                {movimientosFiltrados.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="p-3 border">{fecha(m.fecha_movimiento)}</td>

                    <td className="p-3 border">
                      <p className="font-bold">{m.nombre_empleado}</p>
                      <p className="text-xs text-slate-500">
                        {m.numero_empleado || "-"}
                      </p>
                    </td>

                    <td className="p-3 border font-bold">
                      {m.tipo_movimiento}
                    </td>

                    <td
                      className={`p-3 border text-right font-black ${
                        numero(m.dias) < 0 ? "text-red-700" : "text-green-700"
                      }`}
                    >
                      {numero(m.dias).toFixed(2)}
                    </td>

                    <td className="p-3 border">
                      <p>{m.tipo_origen || "-"}</p>
                      {(m.solicitud_id || m.nomina_id || m.referencia_id) && (
                        <p className="text-xs text-slate-500">
                          Sol.: {m.solicitud_id || "-"} · Nómina:{" "}
                          {m.nomina_id || "-"} · Ref.: {m.referencia_id || "-"}
                        </p>
                      )}
                    </td>

                    <td className="p-3 border">{m.usuario || "-"}</td>

                    <td className="p-3 border">{m.observacion || "-"}</td>
                  </tr>
                ))}

                {movimientosFiltrados.length === 0 && (
                  <tr>
                    <td className="p-6 border text-center text-slate-500" colSpan={7}>
                      No hay movimientos históricos para esta consulta.
                    </td>
                  </tr>
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
