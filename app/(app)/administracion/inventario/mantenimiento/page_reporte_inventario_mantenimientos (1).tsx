"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type Mantenimiento = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  item_id: number;
  codigo_activo: string | null;
  nombre_activo: string | null;
  categoria: string | null;
  fecha_ultimo_mantenimiento: string | null;
  fecha_proximo_mantenimiento: string | null;
  frecuencia_dias: number | null;
  proveedor: string | null;
  responsable: string | null;
  costo_ultimo: number | null;
  costo_acumulado: number | null;
  estado: string | null;
  observacion: string | null;
  created_by: string | null;
  created_at: string | null;
  prioridad: string | null;
  dias_alerta: number | null;
  requiere_apagado: boolean | null;
  ubicacion: string | null;
};

export default function ReporteMantenimientosInventarioPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [loading, setLoading] = useState(false);

  const hoy = new Date().toISOString().slice(0, 10);
  const inicioAnio = new Date().getFullYear() + "-01-01";
  const finAnio = new Date().getFullYear() + "-12-31";

  const [fechaDesde, setFechaDesde] = useState(inicioAnio);
  const [fechaHasta, setFechaHasta] = useState(finAnio);
  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState("Todos");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [filtroProveedor, setFiltroProveedor] = useState("Todos");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) cargarMantenimientos(id);
  }, []);

  async function cargarMantenimientos(id: string) {
    setLoading(true);

    let query = supabase
      .from("inventario_mantenimiento")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("fecha_proximo_mantenimiento", { ascending: true });

    if (fechaDesde) query = query.gte("fecha_proximo_mantenimiento", fechaDesde);
    if (fechaHasta) query = query.lte("fecha_proximo_mantenimiento", fechaHasta);

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      alert("Error cargando reporte de mantenimientos: " + error.message);
      return;
    }

    setMantenimientos((data as Mantenimiento[]) || []);
  }

  function numero(valor: string | number | null | undefined) {
    return Number(valor || 0);
  }

  function moneda(valor: string | number | null | undefined) {
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

  function diasHasta(fechaObjetivo: string | null | undefined) {
    if (!fechaObjetivo) return 999999;
    const hoyFecha = new Date(new Date().toISOString().slice(0, 10));
    const futuro = new Date(`${fechaObjetivo}T00:00:00`);
    return Math.ceil((futuro.getTime() - hoyFecha.getTime()) / (1000 * 60 * 60 * 24));
  }

  function estadoCalculado(m: Mantenimiento) {
    if (m.estado === "Realizado" || m.estado === "Cancelado") return m.estado || "-";
    if (m.fecha_proximo_mantenimiento && m.fecha_proximo_mantenimiento < hoy) {
      return "Vencido";
    }
    return m.estado || "Pendiente";
  }

  const estados = useMemo(() => {
    const lista = mantenimientos.map((m) => estadoCalculado(m)).filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [mantenimientos]);

  const prioridades = useMemo(() => {
    const lista = mantenimientos.map((m) => m.prioridad || "").filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [mantenimientos]);

  const categorias = useMemo(() => {
    const lista = mantenimientos.map((m) => m.categoria || "").filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [mantenimientos]);

  const proveedores = useMemo(() => {
    const lista = mantenimientos.map((m) => m.proveedor || "").filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [mantenimientos]);

  const mantenimientosFiltrados = mantenimientos.filter((m) => {
    const estadoReal = estadoCalculado(m);

    const texto = `${m.codigo_activo || ""} ${m.nombre_activo || ""} ${
      m.categoria || ""
    } ${m.ubicacion || ""} ${m.proveedor || ""} ${m.responsable || ""} ${
      m.prioridad || ""
    } ${estadoReal} ${m.observacion || ""}`
      .toLowerCase()
      .trim();

    return (
      texto.includes(buscar.toLowerCase().trim()) &&
      (filtroEstado === "Todos" || estadoReal === filtroEstado) &&
      (filtroPrioridad === "Todos" || m.prioridad === filtroPrioridad) &&
      (filtroCategoria === "Todos" || m.categoria === filtroCategoria) &&
      (filtroProveedor === "Todos" || m.proveedor === filtroProveedor)
    );
  });

  const totalRegistros = mantenimientosFiltrados.length;
  const totalPendientes = mantenimientosFiltrados.filter(
    (m) => estadoCalculado(m) === "Pendiente"
  ).length;
  const totalProgramados = mantenimientosFiltrados.filter(
    (m) => estadoCalculado(m) === "Programado"
  ).length;
  const totalVencidos = mantenimientosFiltrados.filter(
    (m) => estadoCalculado(m) === "Vencido"
  ).length;
  const totalRealizados = mantenimientosFiltrados.filter(
    (m) => estadoCalculado(m) === "Realizado"
  ).length;
  const totalCriticos = mantenimientosFiltrados.filter(
    (m) => m.prioridad === "Crítica"
  ).length;
  const totalRequiereApagado = mantenimientosFiltrados.filter(
    (m) => m.requiere_apagado
  ).length;
  const costoUltimoTotal = mantenimientosFiltrados.reduce(
    (sum, m) => sum + numero(m.costo_ultimo),
    0
  );
  const costoAcumuladoTotal = mantenimientosFiltrados.reduce(
    (sum, m) => sum + numero(m.costo_acumulado),
    0
  );
  const proximasAlertas = mantenimientosFiltrados.filter((m) => {
    const dias = diasHasta(m.fecha_proximo_mantenimiento);
    return dias >= 0 && dias <= numero(m.dias_alerta || 7);
  }).length;

  function limpiarFiltros() {
    setFechaDesde(inicioAnio);
    setFechaHasta(finAnio);
    setBuscar("");
    setFiltroEstado("Todos");
    setFiltroPrioridad("Todos");
    setFiltroCategoria("Todos");
    setFiltroProveedor("Todos");
  }

  function imprimir() {
    window.print();
  }

  function exportarCSV() {
    const encabezados = [
      "Código Activo",
      "Activo",
      "Categoría",
      "Ubicación",
      "Último Mantenimiento",
      "Próximo Mantenimiento",
      "Días Restantes",
      "Frecuencia Días",
      "Proveedor",
      "Responsable",
      "Costo Último",
      "Costo Acumulado",
      "Prioridad",
      "Días Alerta",
      "Requiere Apagado",
      "Estado",
      "Observación",
    ];

    const filas = mantenimientosFiltrados.map((m) => [
      m.codigo_activo || "",
      m.nombre_activo || "",
      m.categoria || "",
      m.ubicacion || "",
      m.fecha_ultimo_mantenimiento || "",
      m.fecha_proximo_mantenimiento || "",
      diasHasta(m.fecha_proximo_mantenimiento),
      numero(m.frecuencia_dias),
      m.proveedor || "",
      m.responsable || "",
      numero(m.costo_ultimo).toFixed(2),
      numero(m.costo_acumulado).toFixed(2),
      m.prioridad || "",
      numero(m.dias_alerta),
      m.requiere_apagado ? "Sí" : "No",
      estadoCalculado(m),
      m.observacion || "",
    ]);

    const contenido = [encabezados, ...filas]
      .map((fila) =>
        fila.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(",")
      )
      .join("\\n");

    const blob = new Blob(["\\ufeff" + contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_mantenimientos_inventario_${condominioNombre || "condominio"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900">
              Reporte de Mantenimientos
            </h1>
            <p className="text-slate-500 mt-2">
              Plan, vencimientos, prioridades y costos de mantenimiento preventivo.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/administracion/inventario/reportes"
              className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold"
            >
              Volver Reportes
            </Link>

            <Link
              href="/administracion/inventario/dashboard"
              className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold"
            >
              Dashboard Inventario
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border no-print">
        <p className="text-sm text-slate-500">Condominio activo</p>
        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-8 gap-4 no-print">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Registros</p>
          <h2 className="text-3xl font-black">{totalRegistros}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Pendientes</p>
          <h2 className="text-3xl font-black text-yellow-700">{totalPendientes}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Programados</p>
          <h2 className="text-3xl font-black text-blue-700">{totalProgramados}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Vencidos</p>
          <h2 className="text-3xl font-black text-red-700">{totalVencidos}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Realizados</p>
          <h2 className="text-3xl font-black text-green-700">{totalRealizados}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Críticos</p>
          <h2 className="text-3xl font-black text-purple-700">{totalCriticos}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Alertas</p>
          <h2 className="text-3xl font-black text-orange-700">{proximasAlertas}</h2>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-300">Costo acumulado</p>
          <h2 className="text-xl font-black text-white">
            RD${moneda(costoAcumuladoTotal)}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <h2 className="text-xl font-black mb-4">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full"
          />

          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full"
          />

          <input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full"
            placeholder="Buscar activo, proveedor..."
          />

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full bg-white"
          >
            {estados.map((item) => (
              <option key={item} value={item}>
                {item === "Todos" ? "Todos los estados" : item}
              </option>
            ))}
          </select>

          <select
            value={filtroPrioridad}
            onChange={(e) => setFiltroPrioridad(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full bg-white"
          >
            {prioridades.map((item) => (
              <option key={item} value={item}>
                {item === "Todos" ? "Todas las prioridades" : item}
              </option>
            ))}
          </select>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full bg-white"
          >
            {categorias.map((item) => (
              <option key={item} value={item}>
                {item === "Todos" ? "Todas las categorías" : item}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-5">
          <button
            type="button"
            onClick={() => condominioId && cargarMantenimientos(condominioId)}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Buscar / Actualizar
          </button>

          <button
            type="button"
            onClick={limpiarFiltros}
            className="bg-slate-600 hover:bg-slate-700 text-white px-5 py-3 rounded-xl font-bold"
          >
            Limpiar
          </button>

          <button
            type="button"
            onClick={exportarCSV}
            className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Exportar Excel
          </button>

          <button
            type="button"
            onClick={imprimir}
            className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Imprimir / PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6 print-area">
        <div className="hidden print:block mb-5 border-b pb-3">
          <h1 className="text-2xl font-black text-center">
            REPORTE DE MANTENIMIENTOS
          </h1>

          <p className="text-center font-bold">{condominioNombre}</p>

          <p className="text-center text-sm">
            Período: {fecha(fechaDesde)} al {fecha(fechaHasta)} · Fecha impresión:{" "}
            {new Date().toLocaleDateString("es-DO")}
          </p>
        </div>

        <h2 className="text-xl font-black mb-4">Detalle de mantenimientos</h2>

        {loading ? (
          <div>Cargando mantenimientos...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 border text-left">Activo</th>
                  <th className="p-2 border text-left">Categoría / Ubicación</th>
                  <th className="p-2 border text-left">Fechas</th>
                  <th className="p-2 border text-left">Proveedor</th>
                  <th className="p-2 border text-left">Responsable</th>
                  <th className="p-2 border text-right">Costo último</th>
                  <th className="p-2 border text-right">Costo acumulado</th>
                  <th className="p-2 border text-center">Prioridad</th>
                  <th className="p-2 border text-center">Estado</th>
                  <th className="p-2 border text-left">Observación</th>
                </tr>
              </thead>

              <tbody>
                {mantenimientosFiltrados.map((m) => {
                  const dias = diasHasta(m.fecha_proximo_mantenimiento);
                  const estadoReal = estadoCalculado(m);

                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-2 border">
                        <p className="font-black">{m.nombre_activo || "-"}</p>
                        <p className="text-xs text-slate-500">
                          Código: {m.codigo_activo || m.item_id}
                        </p>
                        {m.requiere_apagado && (
                          <p className="text-xs text-red-700 font-bold">
                            Requiere apagado
                          </p>
                        )}
                      </td>

                      <td className="p-2 border">
                        <p>{m.categoria || "-"}</p>
                        <p className="text-xs text-slate-500">
                          {m.ubicacion || "-"}
                        </p>
                      </td>

                      <td className="p-2 border">
                        <p>Último: {fecha(m.fecha_ultimo_mantenimiento)}</p>
                        <p className="font-bold">
                          Próximo: {fecha(m.fecha_proximo_mantenimiento)}
                        </p>
                        <p
                          className={`text-xs font-bold ${
                            dias < 0
                              ? "text-red-700"
                              : dias <= numero(m.dias_alerta || 7)
                              ? "text-orange-700"
                              : "text-slate-500"
                          }`}
                        >
                          {dias < 0 ? `Vencido hace ${Math.abs(dias)} día(s)` : `Faltan ${dias} día(s)`}
                        </p>
                      </td>

                      <td className="p-2 border">{m.proveedor || "-"}</td>

                      <td className="p-2 border">{m.responsable || "-"}</td>

                      <td className="p-2 border text-right">
                        RD${moneda(m.costo_ultimo)}
                      </td>

                      <td className="p-2 border text-right font-black text-blue-700">
                        RD${moneda(m.costo_acumulado)}
                      </td>

                      <td className="p-2 border text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            m.prioridad === "Crítica"
                              ? "bg-red-100 text-red-700"
                              : m.prioridad === "Alta"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {m.prioridad || "-"}
                        </span>
                      </td>

                      <td className="p-2 border text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            estadoReal === "Vencido"
                              ? "bg-red-100 text-red-700"
                              : estadoReal === "Programado"
                              ? "bg-blue-100 text-blue-700"
                              : estadoReal === "Realizado"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {estadoReal}
                        </span>
                      </td>

                      <td className="p-2 border">{m.observacion || "-"}</td>
                    </tr>
                  );
                })}

                {mantenimientosFiltrados.length === 0 && (
                  <tr>
                    <td className="p-6 border text-center text-slate-500" colSpan={10}>
                      No hay mantenimientos para esta consulta.
                    </td>
                  </tr>
                )}
              </tbody>

              {mantenimientosFiltrados.length > 0 && (
                <tfoot className="bg-slate-100 font-black">
                  <tr>
                    <td className="p-2 border" colSpan={5}>
                      Totales
                    </td>
                    <td className="p-2 border text-right">
                      RD${moneda(costoUltimoTotal)}
                    </td>
                    <td className="p-2 border text-right text-blue-700">
                      RD${moneda(costoAcumuladoTotal)}
                    </td>
                    <td className="p-2 border" colSpan={3}>
                      Requieren apagado: {totalRequiereApagado}
                    </td>
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
