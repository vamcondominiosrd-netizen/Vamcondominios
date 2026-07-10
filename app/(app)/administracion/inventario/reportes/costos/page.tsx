"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type ItemInventario = {
  id: number;
  codigo: string | null;
  nombre: string;
  categoria: string | null;
  tipo_activo: string | null;
  cantidad: number | null;
  estado: string | null;
  ubicacion: string | null;
  responsable: string | null;
  costo: number | null;
  valor_actual: number | null;
  depreciable: boolean | null;
};

type Mantenimiento = {
  id: number;
  item_id: number;
  costo_ultimo: number | null;
  costo_acumulado: number | null;
};

type VistaReporte =
  | "categoria"
  | "tipo_activo"
  | "ubicacion"
  | "responsable"
  | "activo";

type GrupoCosto = {
  nombre: string;
  items: number;
  cantidad: number;
  valorCompra: number;
  valorActual: number;
  mantenimiento: number;
  costoTotal: number;
};

export default function ReporteCostosInventarioPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [loading, setLoading] = useState(false);

  const [vista, setVista] = useState<VistaReporte>("categoria");
  const [buscar, setBuscar] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [soloDepreciables, setSoloDepreciables] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) cargarDatos(id);
  }, []);

  async function cargarDatos(id: string) {
    setLoading(true);

    const [itemsResp, mantResp] = await Promise.all([
      supabase
        .from("inventario_items")
        .select("id, codigo, nombre, categoria, tipo_activo, cantidad, estado, ubicacion, responsable, costo, valor_actual, depreciable")
        .eq("condominio_id", Number(id))
        .order("nombre", { ascending: true }),

      supabase
        .from("inventario_mantenimiento")
        .select("id, item_id, costo_ultimo, costo_acumulado")
        .eq("condominio_id", Number(id)),
    ]);

    setLoading(false);

    if (itemsResp.error) {
      alert("Error cargando artículos: " + itemsResp.error.message);
      return;
    }

    if (mantResp.error) {
      alert("Error cargando mantenimientos: " + mantResp.error.message);
      return;
    }

    setItems((itemsResp.data as ItemInventario[]) || []);
    setMantenimientos((mantResp.data as Mantenimiento[]) || []);
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

  const categorias = useMemo(() => {
    const lista = items.map((i) => i.categoria || "").filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [items]);

  const tipos = useMemo(() => {
    const lista = items.map((i) => i.tipo_activo || "").filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [items]);

  const estados = useMemo(() => {
    const lista = items.map((i) => i.estado || "").filter(Boolean);
    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [items]);

  const itemsFiltrados = items.filter((item) => {
    const texto = `${item.codigo || ""} ${item.nombre || ""} ${
      item.categoria || ""
    } ${item.tipo_activo || ""} ${item.estado || ""} ${item.ubicacion || ""} ${
      item.responsable || ""
    }`.toLowerCase();

    return (
      texto.includes(buscar.toLowerCase().trim()) &&
      (filtroCategoria === "Todos" || item.categoria === filtroCategoria) &&
      (filtroTipo === "Todos" || item.tipo_activo === filtroTipo) &&
      (filtroEstado === "Todos" || item.estado === filtroEstado) &&
      (!soloDepreciables || item.depreciable === true)
    );
  });

  const idsFiltrados = new Set(itemsFiltrados.map((i) => i.id));
  const mantenimientosFiltrados = mantenimientos.filter((m) =>
    idsFiltrados.has(m.item_id)
  );

  function clave(item: ItemInventario) {
    if (vista === "categoria") return item.categoria || "Sin categoría";
    if (vista === "tipo_activo") return item.tipo_activo || "Sin tipo";
    if (vista === "ubicacion") return item.ubicacion || "Sin ubicación";
    if (vista === "responsable") return item.responsable || "Sin responsable";
    return `${item.codigo || item.id} - ${item.nombre}`;
  }

  const grupos: GrupoCosto[] = useMemo(() => {
    const mapa = new Map<string, ItemInventario[]>();

    itemsFiltrados.forEach((item) => {
      const k = clave(item);
      const actual = mapa.get(k) || [];
      actual.push(item);
      mapa.set(k, actual);
    });

    return Array.from(mapa.entries())
      .map(([nombre, lista]) => {
        const ids = new Set(lista.map((i) => i.id));

        const mantenimiento = mantenimientos
          .filter((m) => ids.has(m.item_id))
          .reduce((sum, m) => sum + numero(m.costo_acumulado), 0);

        const valorCompra = lista.reduce(
          (sum, i) => sum + numero(i.costo) * numero(i.cantidad),
          0
        );

        const valorActual = lista.reduce(
          (sum, i) => sum + numero(i.valor_actual) * numero(i.cantidad),
          0
        );

        return {
          nombre,
          items: lista.length,
          cantidad: lista.reduce((sum, i) => sum + numero(i.cantidad), 0),
          valorCompra,
          valorActual,
          mantenimiento,
          costoTotal: valorActual + mantenimiento,
        };
      })
      .sort((a, b) => b.costoTotal - a.costoTotal);
  }, [itemsFiltrados, mantenimientos, vista]);

  const totalItems = itemsFiltrados.length;
  const totalCantidad = itemsFiltrados.reduce((s, i) => s + numero(i.cantidad), 0);
  const totalCompra = itemsFiltrados.reduce(
    (s, i) => s + numero(i.costo) * numero(i.cantidad),
    0
  );
  const totalActual = itemsFiltrados.reduce(
    (s, i) => s + numero(i.valor_actual) * numero(i.cantidad),
    0
  );
  const totalMantenimiento = mantenimientosFiltrados.reduce(
    (s, m) => s + numero(m.costo_acumulado),
    0
  );
  const totalUltimoMant = mantenimientosFiltrados.reduce(
    (s, m) => s + numero(m.costo_ultimo),
    0
  );
  const diferenciaValor = totalCompra - totalActual;
  const costoTotal = totalActual + totalMantenimiento;

  function nombreVista() {
    if (vista === "categoria") return "Categoría";
    if (vista === "tipo_activo") return "Tipo Activo";
    if (vista === "ubicacion") return "Ubicación";
    if (vista === "responsable") return "Responsable";
    return "Activo";
  }

  function limpiarFiltros() {
    setVista("categoria");
    setBuscar("");
    setFiltroCategoria("Todos");
    setFiltroTipo("Todos");
    setFiltroEstado("Todos");
    setSoloDepreciables(false);
  }

  function imprimir() {
    window.print();
  }

  function exportarCSV() {
    const encabezados = [
      "Grupo",
      "Items",
      "Cantidad",
      "Valor Compra",
      "Valor Actual",
      "Mantenimiento",
      "Costo Total",
    ];

    const filas = grupos.map((g) => [
      g.nombre,
      g.items,
      g.cantidad.toFixed(2),
      g.valorCompra.toFixed(2),
      g.valorActual.toFixed(2),
      g.mantenimiento.toFixed(2),
      g.costoTotal.toFixed(2),
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
    a.download = `reporte_costos_inventario_${condominioNombre || "condominio"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900">
              Costos y Valorización
            </h1>
            <p className="text-slate-500 mt-2">
              Valor de adquisición, valor actual y costos acumulados de mantenimiento.
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

      <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-7 gap-4 no-print">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Activos</p>
          <h2 className="text-3xl font-black">{totalItems}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Cantidad</p>
          <h2 className="text-3xl font-black">{totalCantidad.toFixed(2)}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Valor compra</p>
          <h2 className="text-xl font-black text-purple-700">
            RD${moneda(totalCompra)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Valor actual</p>
          <h2 className="text-xl font-black text-blue-700">
            RD${moneda(totalActual)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Diferencia valor</p>
          <h2 className="text-xl font-black text-red-700">
            RD${moneda(diferenciaValor)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Mantenimiento</p>
          <h2 className="text-xl font-black text-orange-700">
            RD${moneda(totalMantenimiento)}
          </h2>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-300">Costo total</p>
          <h2 className="text-xl font-black text-white">
            RD${moneda(costoTotal)}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <h2 className="text-xl font-black mb-4">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <select
            value={vista}
            onChange={(e) => setVista(e.target.value as VistaReporte)}
            className="border rounded-xl px-4 py-3 w-full bg-white"
          >
            <option value="categoria">Agrupar por categoría</option>
            <option value="tipo_activo">Agrupar por tipo activo</option>
            <option value="ubicacion">Agrupar por ubicación</option>
            <option value="responsable">Agrupar por responsable</option>
            <option value="activo">Agrupar por activo</option>
          </select>

          <input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full"
            placeholder="Buscar activo, categoría..."
          />

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
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full bg-white"
          >
            {tipos.map((item) => (
              <option key={item} value={item}>
                {item === "Todos" ? "Todos los tipos" : item}
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

          <label className="flex items-center gap-3 border rounded-xl px-4 py-3">
            <input
              type="checkbox"
              checked={soloDepreciables}
              onChange={(e) => setSoloDepreciables(e.target.checked)}
              className="w-5 h-5"
            />
            <span className="font-semibold">Solo depreciables</span>
          </label>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-5">
          <button
            type="button"
            onClick={() => condominioId && cargarDatos(condominioId)}
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
            COSTOS Y VALORIZACIÓN DE INVENTARIO
          </h1>
          <p className="text-center font-bold">{condominioNombre}</p>
          <p className="text-center text-sm">
            Agrupado por: {nombreVista()} · Fecha impresión:{" "}
            {new Date().toLocaleDateString("es-DO")}
          </p>
        </div>

        <h2 className="text-xl font-black mb-4">
          Resumen por {nombreVista()}
        </h2>

        {loading ? (
          <div>Cargando reporte...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 border text-left">{nombreVista()}</th>
                  <th className="p-2 border text-right">Items</th>
                  <th className="p-2 border text-right">Cantidad</th>
                  <th className="p-2 border text-right">Valor Compra</th>
                  <th className="p-2 border text-right">Valor Actual</th>
                  <th className="p-2 border text-right">Mantenimiento</th>
                  <th className="p-2 border text-right">Costo Total</th>
                </tr>
              </thead>

              <tbody>
                {grupos.map((grupo) => (
                  <tr key={grupo.nombre} className="hover:bg-slate-50">
                    <td className="p-2 border font-black">{grupo.nombre}</td>
                    <td className="p-2 border text-right">{grupo.items}</td>
                    <td className="p-2 border text-right">
                      {grupo.cantidad.toFixed(2)}
                    </td>
                    <td className="p-2 border text-right">
                      RD${moneda(grupo.valorCompra)}
                    </td>
                    <td className="p-2 border text-right text-blue-700 font-bold">
                      RD${moneda(grupo.valorActual)}
                    </td>
                    <td className="p-2 border text-right text-orange-700 font-bold">
                      RD${moneda(grupo.mantenimiento)}
                    </td>
                    <td className="p-2 border text-right text-slate-900 font-black">
                      RD${moneda(grupo.costoTotal)}
                    </td>
                  </tr>
                ))}

                {grupos.length === 0 && (
                  <tr>
                    <td className="p-6 border text-center text-slate-500" colSpan={7}>
                      No hay información para esta consulta.
                    </td>
                  </tr>
                )}
              </tbody>

              {grupos.length > 0 && (
                <tfoot className="bg-slate-100 font-black">
                  <tr>
                    <td className="p-2 border">Totales</td>
                    <td className="p-2 border text-right">{totalItems}</td>
                    <td className="p-2 border text-right">{totalCantidad.toFixed(2)}</td>
                    <td className="p-2 border text-right">RD${moneda(totalCompra)}</td>
                    <td className="p-2 border text-right text-blue-700">
                      RD${moneda(totalActual)}
                    </td>
                    <td className="p-2 border text-right text-orange-700">
                      RD${moneda(totalMantenimiento)}
                    </td>
                    <td className="p-2 border text-right">
                      RD${moneda(costoTotal)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        <div className="mt-5 bg-slate-50 border rounded-2xl p-4 text-sm">
          <p>
            <b>Costo último mantenimiento:</b> RD${moneda(totalUltimoMant)}
          </p>
          <p>
            <b>Diferencia entre valor de adquisición y valor actual:</b> RD$
            {moneda(diferenciaValor)}
          </p>
        </div>
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
