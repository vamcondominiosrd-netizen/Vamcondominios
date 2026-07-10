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
  unidad_medida: string | null;
  estado: string | null;
  ubicacion: string | null;
  responsable: string | null;
};

type TipoMovimiento = {
  id: number;
  nombre: string;
  descripcion: string | null;
  afecta_estado: string | null;
  estado: string | null;
};

type Ubicacion = {
  id: number;
  nombre: string;
  responsable?: string | null;
};

type Movimiento = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  item_id: number;
  tipo_movimiento: string;
  fecha_movimiento: string | null;
  cantidad: number | null;
  responsable: string | null;
  ubicacion_origen: string | null;
  ubicacion_destino: string | null;
  observacion: string | null;
  created_at: string | null;
  inventario_items?: {
    codigo: string | null;
    nombre: string | null;
    categoria: string | null;
    estado: string | null;
  } | null;
};

export default function InventarioMovimientosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");

  const [items, setItems] = useState<ItemInventario[]>([]);
  const [tiposMovimiento, setTiposMovimiento] = useState<TipoMovimiento[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [itemId, setItemId] = useState("");
  const [tipoMovimientoId, setTipoMovimientoId] = useState("");
  const [fechaMovimiento, setFechaMovimiento] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [cantidad, setCantidad] = useState("1");
  const [responsable, setResponsable] = useState("");
  const [ubicacionOrigen, setUbicacionOrigen] = useState("");
  const [ubicacionDestino, setUbicacionDestino] = useState("");
  const [observacion, setObservacion] = useState("");

  const [buscar, setBuscar] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroArticulo, setFiltroArticulo] = useState("Todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const usuario = localStorage.getItem("usuario_nombre") || "Administración";

    setCondominioId(id);
    setCondominioNombre(nombre);
    setUsuarioNombre(usuario);
    setResponsable(usuario);

    if (id) {
      cargarTodo(id);
    }
  }, []);

  async function cargarTodo(id: string) {
    await Promise.all([
      cargarItems(id),
      cargarTiposMovimiento(id),
      cargarUbicaciones(id),
      cargarMovimientos(id),
    ]);
  }

  async function cargarItems(id: string) {
    const { data, error } = await supabase
      .from("inventario_items")
      .select(
        "id, codigo, nombre, categoria, tipo_activo, cantidad, unidad_medida, estado, ubicacion, responsable"
      )
      .eq("condominio_id", Number(id))
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando artículos: " + error.message);
      return;
    }

    setItems((data as ItemInventario[]) || []);
  }

  async function cargarTiposMovimiento(id: string) {
    const { data, error } = await supabase
      .from("inventario_tipos_movimiento")
      .select("id, nombre, descripcion, afecta_estado, estado")
      .eq("condominio_id", Number(id))
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando tipos de movimiento: " + error.message);
      return;
    }

    setTiposMovimiento((data as TipoMovimiento[]) || []);
  }

  async function cargarUbicaciones(id: string) {
    const { data, error } = await supabase
      .from("inventario_ubicaciones")
      .select("id, nombre, responsable")
      .eq("condominio_id", Number(id))
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando ubicaciones: " + error.message);
      return;
    }

    setUbicaciones((data as Ubicacion[]) || []);
  }

  async function cargarMovimientos(id: string) {
    setLoading(true);

    let query = supabase
      .from("inventario_movimientos")
      .select(`
        *,
        inventario_items(codigo, nombre, categoria, estado)
      `)
      .eq("condominio_id", Number(id))
      .order("fecha_movimiento", { ascending: false })
      .order("created_at", { ascending: false });

    if (fechaDesde) {
      query = query.gte("fecha_movimiento", fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte("fecha_movimiento", fechaHasta);
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      alert("Error cargando movimientos: " + error.message);
      return;
    }

    setMovimientos((data as Movimiento[]) || []);
  }

  function numero(valor: string | number | null | undefined) {
    return Number(valor || 0);
  }

  function fecha(valor: string | null | undefined) {
    if (!valor) return "-";
    const partes = valor.split("-");
    if (partes.length !== 3) return valor;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  function limpiarFormulario() {
    setItemId("");
    setTipoMovimientoId("");
    setFechaMovimiento(new Date().toISOString().slice(0, 10));
    setCantidad("1");
    setResponsable(usuarioNombre || "Administración");
    setUbicacionOrigen("");
    setUbicacionDestino("");
    setObservacion("");
  }

  function seleccionarItem(valor: string) {
    setItemId(valor);

    const item = items.find((i) => String(i.id) === valor);

    setUbicacionOrigen(item?.ubicacion || "");
    setResponsable(item?.responsable || usuarioNombre || "Administración");
  }

  function seleccionarDestino(valor: string) {
    setUbicacionDestino(valor);

    const ubicacion = ubicaciones.find((u) => u.nombre === valor);
    if (ubicacion?.responsable && !responsable) {
      setResponsable(ubicacion.responsable);
    }
  }

  async function guardarMovimiento(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!itemId) {
      alert("Debe seleccionar un artículo.");
      return;
    }

    if (!tipoMovimientoId) {
      alert("Debe seleccionar el tipo de movimiento.");
      return;
    }

    if (numero(cantidad) <= 0) {
      alert("La cantidad debe ser mayor que cero.");
      return;
    }

    const item = items.find((i) => String(i.id) === itemId);
    const tipo = tiposMovimiento.find((t) => String(t.id) === tipoMovimientoId);

    if (!item) {
      alert("Artículo no encontrado.");
      return;
    }

    if (!tipo) {
      alert("Tipo de movimiento no encontrado.");
      return;
    }

    const cantidadMovimiento = numero(cantidad);

    const { error } = await supabase.from("inventario_movimientos").insert([
      {
        condominio_id: Number(condominioId),
        condominio: condominioNombre,
        item_id: Number(itemId),
        tipo_movimiento: tipo.nombre,
        fecha_movimiento: fechaMovimiento,
        cantidad: cantidadMovimiento,
        responsable: responsable.trim() || usuarioNombre || "Administración",
        ubicacion_origen: ubicacionOrigen.trim(),
        ubicacion_destino: ubicacionDestino.trim(),
        observacion: observacion.trim(),
      },
    ]);

    if (error) {
      alert("Error guardando movimiento: " + error.message);
      return;
    }

    const updateItem: Record<string, any> = {};

    if (tipo.afecta_estado && tipo.afecta_estado !== "No aplica") {
      updateItem.estado = tipo.afecta_estado;
    }

    if (ubicacionDestino.trim()) {
      updateItem.ubicacion = ubicacionDestino.trim();
    }

    if (
      tipo.nombre === "Asignación" ||
      tipo.nombre === "Salida" ||
      tipo.afecta_estado === "En Uso" ||
      tipo.afecta_estado === "Prestado"
    ) {
      updateItem.responsable = responsable.trim() || usuarioNombre || "Administración";
    }

    if (
      tipo.nombre === "Devolución" ||
      tipo.nombre === "Entrada" ||
      tipo.afecta_estado === "Disponible"
    ) {
      updateItem.responsable = "";
    }

    if (tipo.nombre === "Ajuste") {
      updateItem.cantidad = cantidadMovimiento;
    }

    if (Object.keys(updateItem).length > 0) {
      const { error: updateError } = await supabase
        .from("inventario_items")
        .update(updateItem)
        .eq("id", Number(itemId))
        .eq("condominio_id", Number(condominioId));

      if (updateError) {
        alert(
          "Movimiento guardado, pero ocurrió un error actualizando el artículo: " +
            updateError.message
        );
        cargarTodo(condominioId);
        return;
      }
    }

    alert("Movimiento registrado correctamente.");
    limpiarFormulario();
    cargarTodo(condominioId);
  }

  async function eliminarMovimiento(mov: Movimiento) {
    const confirmar = confirm("¿Seguro que desea eliminar este movimiento?");

    if (!confirmar) return;

    const { error } = await supabase
      .from("inventario_movimientos")
      .delete()
      .eq("id", mov.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error eliminando movimiento: " + error.message);
      return;
    }

    alert("Movimiento eliminado correctamente.");
    cargarMovimientos(condominioId);
  }

  const tiposFiltro = useMemo(() => {
    return [
      "Todos",
      ...Array.from(new Set(movimientos.map((m) => m.tipo_movimiento).filter(Boolean))).sort(),
    ];
  }, [movimientos]);

  const articulosFiltro = useMemo(() => {
    return [
      "Todos",
      ...Array.from(
        new Set(
          movimientos
            .map((m) => m.inventario_items?.nombre || "")
            .filter((x) => x.trim() !== "")
        )
      ).sort(),
    ];
  }, [movimientos]);

  const movimientosFiltrados = movimientos.filter((mov) => {
    const texto = `${mov.tipo_movimiento || ""} ${
      mov.inventario_items?.nombre || ""
    } ${mov.inventario_items?.codigo || ""} ${mov.responsable || ""} ${
      mov.ubicacion_origen || ""
    } ${mov.ubicacion_destino || ""} ${mov.observacion || ""}`
      .toLowerCase()
      .trim();

    return (
      texto.includes(buscar.toLowerCase().trim()) &&
      (filtroTipo === "Todos" || mov.tipo_movimiento === filtroTipo) &&
      (filtroArticulo === "Todos" ||
        mov.inventario_items?.nombre === filtroArticulo)
    );
  });

  const totalMovimientos = movimientosFiltrados.length;
  const totalAsignaciones = movimientosFiltrados.filter(
    (m) => m.tipo_movimiento === "Asignación"
  ).length;
  const totalDevoluciones = movimientosFiltrados.filter(
    (m) => m.tipo_movimiento === "Devolución"
  ).length;
  const totalReparaciones = movimientosFiltrados.filter(
    (m) => m.tipo_movimiento === "Reparación"
  ).length;
  const totalBajas = movimientosFiltrados.filter(
    (m) => m.tipo_movimiento === "Baja"
  ).length;

  function imprimir() {
    window.print();
  }

  function exportarCSV() {
    const encabezados = [
      "Fecha",
      "Artículo",
      "Código",
      "Tipo Movimiento",
      "Cantidad",
      "Responsable",
      "Ubicación Origen",
      "Ubicación Destino",
      "Observación",
    ];

    const filas = movimientosFiltrados.map((m) => [
      m.fecha_movimiento || "",
      m.inventario_items?.nombre || "",
      m.inventario_items?.codigo || "",
      m.tipo_movimiento || "",
      numero(m.cantidad).toFixed(2),
      m.responsable || "",
      m.ubicacion_origen || "",
      m.ubicacion_destino || "",
      m.observacion || "",
    ]);

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
    a.download = `inventario_movimientos_${condominioNombre || "condominio"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900">
              Movimientos de Inventario
            </h1>
            <p className="text-slate-500 mt-2">
              Entradas, salidas, asignaciones, devoluciones, reparaciones,
              ajustes y bajas de artículos.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/administracion/inventario/articulos"
              className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold"
            >
              Artículos
            </Link>

            <Link
              href="/administracion/inventario"
              className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold"
            >
              Volver Inventario
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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 no-print">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Movimientos</p>
          <h2 className="text-3xl font-black">{totalMovimientos}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Asignaciones</p>
          <h2 className="text-3xl font-black text-blue-700">
            {totalAsignaciones}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Devoluciones</p>
          <h2 className="text-3xl font-black text-green-700">
            {totalDevoluciones}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Reparaciones</p>
          <h2 className="text-3xl font-black text-yellow-700">
            {totalReparaciones}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Bajas</p>
          <h2 className="text-3xl font-black text-red-700">{totalBajas}</h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <h2 className="text-xl font-black mb-4">Registrar movimiento</h2>

        <form
          onSubmit={guardarMovimiento}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">
              Artículo *
            </label>
            <select
              value={itemId}
              onChange={(e) => seleccionarItem(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="">Seleccione artículo</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.codigo || item.id} - {item.nombre} - {item.estado}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Tipo de movimiento *
            </label>
            <select
              value={tipoMovimientoId}
              onChange={(e) => setTipoMovimientoId(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="">Seleccione movimiento</option>
              {tiposMovimiento.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                  {tipo.afecta_estado && tipo.afecta_estado !== "No aplica"
                    ? ` → ${tipo.afecta_estado}`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={fechaMovimiento}
              onChange={(e) => setFechaMovimiento(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Cantidad
            </label>
            <input
              type="number"
              step="0.01"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Responsable
            </label>
            <input
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Empleado o encargado"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Ubicación origen
            </label>
            <input
              value={ubicacionOrigen}
              onChange={(e) => setUbicacionOrigen(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Ubicación actual"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Ubicación destino
            </label>
            <select
              value={ubicacionDestino}
              onChange={(e) => seleccionarDestino(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="">Seleccione destino</option>
              {ubicaciones.map((ubicacion) => (
                <option key={ubicacion.id} value={ubicacion.nombre}>
                  {ubicacion.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Observación
            </label>
            <input
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Detalle del movimiento"
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={guardando}
              className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-5 py-3 rounded-xl font-bold"
            >
              {guardando ? "Guardando..." : "Guardar movimiento"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <h2 className="text-xl font-black mb-4">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full"
            placeholder="Buscar artículo, responsable, ubicación..."
          />

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full bg-white"
          >
            {tiposFiltro.map((item) => (
              <option key={item} value={item}>
                {item === "Todos" ? "Todos los movimientos" : item}
              </option>
            ))}
          </select>

          <select
            value={filtroArticulo}
            onChange={(e) => setFiltroArticulo(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full bg-white"
          >
            {articulosFiltro.map((item) => (
              <option key={item} value={item}>
                {item === "Todos" ? "Todos los artículos" : item}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full"
            placeholder="Desde"
          />

          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full"
            placeholder="Hasta"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-5">
          <button
            type="button"
            onClick={() => condominioId && cargarMovimientos(condominioId)}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Buscar / Actualizar
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
            MOVIMIENTOS DE INVENTARIO
          </h1>
          <p className="text-center font-bold">{condominioNombre}</p>
          <p className="text-center text-sm">
            Fecha impresión: {new Date().toLocaleDateString("es-DO")}
          </p>
        </div>

        <h2 className="text-xl font-black mb-4">Historial de movimientos</h2>

        {loading ? (
          <div>Cargando movimientos...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 border text-left">Fecha</th>
                  <th className="p-2 border text-left">Artículo</th>
                  <th className="p-2 border text-left">Movimiento</th>
                  <th className="p-2 border text-right">Cantidad</th>
                  <th className="p-2 border text-left">Responsable</th>
                  <th className="p-2 border text-left">Origen</th>
                  <th className="p-2 border text-left">Destino</th>
                  <th className="p-2 border text-left">Observación</th>
                  <th className="p-2 border text-center no-print">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {movimientosFiltrados.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50">
                    <td className="p-2 border">{fecha(mov.fecha_movimiento)}</td>

                    <td className="p-2 border">
                      <p className="font-black">
                        {mov.inventario_items?.nombre || "-"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {mov.inventario_items?.codigo || mov.item_id}
                      </p>
                    </td>

                    <td className="p-2 border font-bold">
                      {mov.tipo_movimiento}
                    </td>

                    <td className="p-2 border text-right">
                      {numero(mov.cantidad).toFixed(2)}
                    </td>

                    <td className="p-2 border">{mov.responsable || "-"}</td>

                    <td className="p-2 border">
                      {mov.ubicacion_origen || "-"}
                    </td>

                    <td className="p-2 border">
                      {mov.ubicacion_destino || "-"}
                    </td>

                    <td className="p-2 border">{mov.observacion || "-"}</td>

                    <td className="p-2 border no-print">
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => eliminarMovimiento(mov)}
                          className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {movimientosFiltrados.length === 0 && (
                  <tr>
                    <td
                      className="p-6 border text-center text-slate-500"
                      colSpan={9}
                    >
                      No hay movimientos con esta consulta.
                    </td>
                  </tr>
                )}
              </tbody>
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
