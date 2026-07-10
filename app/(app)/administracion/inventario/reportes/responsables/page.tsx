"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type ItemInventario = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  codigo: string | null;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  cantidad: number | null;
  unidad_medida: string | null;
  estado: string | null;
  ubicacion: string | null;
  responsable: string | null;
  fecha_adquisicion: string | null;
  costo: number | null;
  observacion: string | null;
  tipo_activo: string | null;
  valor_actual: number | null;
  depreciable: boolean | null;
};

type GrupoResponsable = {
  responsable: string;
  items: ItemInventario[];
  cantidad: number;
  valorAdquisicion: number;
  valorActual: number;
  disponibles: number;
  enUso: number;
  reparacion: number;
  bajas: number;
};

export default function ReporteInventarioResponsablesPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [loading, setLoading] = useState(false);

  const [buscar, setBuscar] = useState("");
  const [filtroResponsable, setFiltroResponsable] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [mostrarDetalle, setMostrarDetalle] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) cargarItems(id);
  }, []);

  async function cargarItems(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("inventario_items")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("responsable", { ascending: true })
      .order("nombre", { ascending: true });

    setLoading(false);

    if (error) {
      alert("Error cargando inventario por responsable: " + error.message);
      return;
    }

    setItems((data as ItemInventario[]) || []);
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

  function estadoEsEnUso(estado: string | null | undefined) {
    return estado === "En Uso" || estado === "En uso";
  }

  function estadoEsReparacion(estado: string | null | undefined) {
    return estado === "En Reparación" || estado === "En reparación";
  }

  function estadoEsBaja(estado: string | null | undefined) {
    return ["Dañado", "Perdido", "Dado de Baja", "Dado de baja"].includes(
      estado || ""
    );
  }

  const responsables = useMemo(() => {
    const lista = items.map((i) => i.responsable || "Sin responsable");
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [items]);

  const estados = useMemo(() => {
    const lista = items.map((i) => i.estado || "").filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [items]);

  const categorias = useMemo(() => {
    const lista = items.map((i) => i.categoria || "").filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [items]);

  const itemsFiltrados = items.filter((item) => {
    const responsable = item.responsable || "Sin responsable";

    const texto = `${item.codigo || ""} ${item.nombre || ""} ${
      item.responsable || ""
    } ${item.categoria || ""} ${item.tipo_activo || ""} ${item.estado || ""} ${
      item.marca || ""
    } ${item.modelo || ""} ${item.ubicacion || ""}`
      .toLowerCase()
      .trim();

    return (
      texto.includes(buscar.toLowerCase().trim()) &&
      (filtroResponsable === "Todos" || responsable === filtroResponsable) &&
      (filtroEstado === "Todos" || item.estado === filtroEstado) &&
      (filtroCategoria === "Todos" || item.categoria === filtroCategoria)
    );
  });

  const grupos: GrupoResponsable[] = useMemo(() => {
    const mapa = new Map<string, ItemInventario[]>();

    itemsFiltrados.forEach((item) => {
      const responsable = item.responsable || "Sin responsable";
      const actual = mapa.get(responsable) || [];
      actual.push(item);
      mapa.set(responsable, actual);
    });

    return Array.from(mapa.entries())
      .map(([responsable, lista]) => ({
        responsable,
        items: lista,
        cantidad: lista.reduce((sum, i) => sum + numero(i.cantidad), 0),
        valorAdquisicion: lista.reduce(
          (sum, i) => sum + numero(i.costo) * numero(i.cantidad),
          0
        ),
        valorActual: lista.reduce(
          (sum, i) => sum + numero(i.valor_actual) * numero(i.cantidad),
          0
        ),
        disponibles: lista.filter((i) => i.estado === "Disponible").length,
        enUso: lista.filter((i) => estadoEsEnUso(i.estado)).length,
        reparacion: lista.filter((i) => estadoEsReparacion(i.estado)).length,
        bajas: lista.filter((i) => estadoEsBaja(i.estado)).length,
      }))
      .sort((a, b) => a.responsable.localeCompare(b.responsable));
  }, [itemsFiltrados]);

  const totalResponsables = grupos.length;
  const totalArticulos = itemsFiltrados.length;
  const totalCantidad = grupos.reduce((sum, g) => sum + g.cantidad, 0);
  const totalValorAdquisicion = grupos.reduce((sum, g) => sum + g.valorAdquisicion, 0);
  const totalValorActual = grupos.reduce((sum, g) => sum + g.valorActual, 0);
  const totalEnUso = grupos.reduce((sum, g) => sum + g.enUso, 0);
  const totalDisponibles = grupos.reduce((sum, g) => sum + g.disponibles, 0);

  function limpiarFiltros() {
    setBuscar("");
    setFiltroResponsable("Todos");
    setFiltroEstado("Todos");
    setFiltroCategoria("Todos");
  }

  function imprimir() {
    window.print();
  }

  function descargarCSV(nombreArchivo: string, encabezados: string[], filas: any[][]) {
    const contenido = [encabezados, ...filas]
      .map((fila) =>
        fila.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportarResumenCSV() {
    descargarCSV(
      "reporte_inventario_por_responsable_resumen.csv",
      [
        "Responsable",
        "Artículos",
        "Cantidad",
        "Disponibles",
        "En Uso",
        "Reparación",
        "Baja / Perdidos",
        "Valor Adquisición",
        "Valor Actual",
      ],
      grupos.map((g) => [
        g.responsable,
        g.items.length,
        g.cantidad.toFixed(2),
        g.disponibles,
        g.enUso,
        g.reparacion,
        g.bajas,
        g.valorAdquisicion.toFixed(2),
        g.valorActual.toFixed(2),
      ])
    );
  }

  function exportarDetalleCSV() {
    descargarCSV(
      "reporte_inventario_por_responsable_detalle.csv",
      [
        "Responsable",
        "Código",
        "Artículo",
        "Categoría",
        "Tipo Activo",
        "Marca",
        "Modelo",
        "Cantidad",
        "Unidad",
        "Estado",
        "Ubicación",
        "Costo",
        "Valor Actual",
        "Total Actual",
      ],
      itemsFiltrados.map((i) => [
        i.responsable || "Sin responsable",
        i.codigo || "",
        i.nombre || "",
        i.categoria || "",
        i.tipo_activo || "",
        i.marca || "",
        i.modelo || "",
        numero(i.cantidad).toFixed(2),
        i.unidad_medida || "",
        i.estado || "",
        i.ubicacion || "",
        numero(i.costo).toFixed(2),
        numero(i.valor_actual).toFixed(2),
        (numero(i.valor_actual) * numero(i.cantidad)).toFixed(2),
      ])
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900">
              Inventario por Responsable
            </h1>
            <p className="text-slate-500 mt-2">
              Control de activos asignados por responsable o empleado.
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

      <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-4 no-print">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Responsables</p>
          <h2 className="text-3xl font-black">{totalResponsables}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Artículos</p>
          <h2 className="text-3xl font-black">{totalArticulos}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Cantidad</p>
          <h2 className="text-3xl font-black">{totalCantidad.toFixed(2)}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">En uso</p>
          <h2 className="text-3xl font-black text-blue-700">{totalEnUso}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Disponibles</p>
          <h2 className="text-3xl font-black text-green-700">
            {totalDisponibles}
          </h2>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-300">Valor asignado</p>
          <h2 className="text-xl font-black text-white">
            RD${moneda(totalValorActual)}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <h2 className="text-xl font-black mb-4">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full"
            placeholder="Buscar responsable, artículo, marca..."
          />

          <select
            value={filtroResponsable}
            onChange={(e) => setFiltroResponsable(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full bg-white"
          >
            {responsables.map((item) => (
              <option key={item} value={item}>
                {item === "Todos" ? "Todos los responsables" : item}
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
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-5">
          <button
            type="button"
            onClick={() => condominioId && cargarItems(condominioId)}
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
            onClick={exportarResumenCSV}
            className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Exportar Resumen
          </button>

          <button
            type="button"
            onClick={exportarDetalleCSV}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Exportar Detalle
          </button>

          <button
            type="button"
            onClick={() => setMostrarDetalle(!mostrarDetalle)}
            className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-3 rounded-xl font-bold"
          >
            {mostrarDetalle ? "Ocultar Detalle" : "Ver Detalle"}
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
            INVENTARIO POR RESPONSABLE
          </h1>

          <p className="text-center font-bold">{condominioNombre}</p>

          <p className="text-center text-sm">
            Fecha impresión: {new Date().toLocaleDateString("es-DO")}
          </p>
        </div>

        <h2 className="text-xl font-black mb-4">Resumen por responsable</h2>

        {loading ? (
          <div>Cargando reporte...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 border text-left">Responsable</th>
                  <th className="p-2 border text-right">Artículos</th>
                  <th className="p-2 border text-right">Cantidad</th>
                  <th className="p-2 border text-right">Disponibles</th>
                  <th className="p-2 border text-right">En Uso</th>
                  <th className="p-2 border text-right">Reparación</th>
                  <th className="p-2 border text-right">Baja / Perdidos</th>
                  <th className="p-2 border text-right">Valor Adquisición</th>
                  <th className="p-2 border text-right">Valor Actual</th>
                </tr>
              </thead>

              <tbody>
                {grupos.map((grupo) => (
                  <tr key={grupo.responsable} className="hover:bg-slate-50">
                    <td className="p-2 border font-black">
                      {grupo.responsable}
                    </td>
                    <td className="p-2 border text-right">{grupo.items.length}</td>
                    <td className="p-2 border text-right">
                      {grupo.cantidad.toFixed(2)}
                    </td>
                    <td className="p-2 border text-right text-green-700 font-bold">
                      {grupo.disponibles}
                    </td>
                    <td className="p-2 border text-right text-blue-700 font-bold">
                      {grupo.enUso}
                    </td>
                    <td className="p-2 border text-right text-yellow-700 font-bold">
                      {grupo.reparacion}
                    </td>
                    <td className="p-2 border text-right text-red-700 font-bold">
                      {grupo.bajas}
                    </td>
                    <td className="p-2 border text-right">
                      RD${moneda(grupo.valorAdquisicion)}
                    </td>
                    <td className="p-2 border text-right font-black text-blue-700">
                      RD${moneda(grupo.valorActual)}
                    </td>
                  </tr>
                ))}

                {grupos.length === 0 && (
                  <tr>
                    <td className="p-6 border text-center text-slate-500" colSpan={9}>
                      No hay información para esta consulta.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {mostrarDetalle && (
        <div className="bg-white rounded-3xl border shadow-sm p-6 print-area">
          <h2 className="text-xl font-black mb-4">Detalle por responsable</h2>

          {grupos.map((grupo) => (
            <div key={grupo.responsable} className="mb-8">
              <div className="bg-slate-900 text-white rounded-2xl px-4 py-3 mb-3">
                <h3 className="font-black">
                  {grupo.responsable} · {grupo.items.length} artículo(s) · RD$
                  {moneda(grupo.valorActual)}
                </h3>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-2 border text-left">Código</th>
                      <th className="p-2 border text-left">Artículo</th>
                      <th className="p-2 border text-left">Categoría</th>
                      <th className="p-2 border text-left">Marca / Modelo</th>
                      <th className="p-2 border text-right">Cantidad</th>
                      <th className="p-2 border text-left">Ubicación</th>
                      <th className="p-2 border text-center">Estado</th>
                      <th className="p-2 border text-right">Valor Actual</th>
                    </tr>
                  </thead>

                  <tbody>
                    {grupo.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-2 border font-bold">
                          {item.codigo || item.id}
                        </td>

                        <td className="p-2 border">
                          <p className="font-black">{item.nombre}</p>
                          <p className="text-xs text-slate-500">
                            {item.tipo_activo || "-"}
                          </p>
                        </td>

                        <td className="p-2 border">{item.categoria || "-"}</td>

                        <td className="p-2 border">
                          <p>
                            {item.marca || "-"} {item.modelo || ""}
                          </p>
                          <p className="text-xs text-slate-500">
                            Serie: {item.numero_serie || "-"}
                          </p>
                        </td>

                        <td className="p-2 border text-right font-bold">
                          {numero(item.cantidad).toFixed(2)}{" "}
                          {item.unidad_medida || ""}
                        </td>

                        <td className="p-2 border">{item.ubicacion || "-"}</td>

                        <td className="p-2 border text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${
                              item.estado === "Disponible"
                                ? "bg-green-100 text-green-700"
                                : estadoEsEnUso(item.estado)
                                ? "bg-blue-100 text-blue-700"
                                : estadoEsReparacion(item.estado)
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {item.estado || "-"}
                          </span>
                        </td>

                        <td className="p-2 border text-right font-black text-blue-700">
                          RD${moneda(numero(item.valor_actual) * numero(item.cantidad))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
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
            margin: 0 0 14px 0 !important;
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
