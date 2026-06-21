"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type Proveedor = {
  id: number;
  nombre_proveedor: string | null;
};

type UnidadMedidaGas = {
  id: number;
  nombre: string;
  abreviatura: string | null;
  estado: string | null;
};

type GasPrecio = {
  id: number;
  condominio_id: number;
  proveedor_id: number | null;
  unidad_medida_id: number;
  precio_unitario: number;
  fecha_inicio: string;
  estado: string;
  observacion: string | null;
  created_at: string | null;

  catalogo_proveedores?: {
    nombre_proveedor: string | null;
  } | null;

  gas_unidades_medida?: {
    nombre: string | null;
    abreviatura: string | null;
  } | null;
};

export default function GasPreciosPage() {
  const [precios, setPrecios] = useState<GasPrecio[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedidaGas[]>([]);

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [proveedorId, setProveedorId] = useState("");
  const [unidadMedidaId, setUnidadMedidaId] = useState("");
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [fechaInicio, setFechaInicio] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [estado, setEstado] = useState("Activo");
  const [observacion, setObservacion] = useState("");
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombreCondominio = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombreCondominio);

    if (!id) {
      setMensaje("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarTodo(id);
  }, []);

  async function cargarTodo(id: string) {
    setLoading(true);
    setMensaje("");

    await Promise.all([
      cargarPrecios(id),
      cargarProveedores(),
      cargarUnidades(),
    ]);

    setLoading(false);
  }

  async function cargarPrecios(id: string) {
    const { data, error } = await supabase
      .from("gas_precios")
      .select(`
        id,
        condominio_id,
        proveedor_id,
        unidad_medida_id,
        precio_unitario,
        fecha_inicio,
        estado,
        observacion,
        created_at,
        catalogo_proveedores(nombre_proveedor),
        gas_unidades_medida(nombre, abreviatura)
      `)
      .eq("condominio_id", Number(id))
      .order("estado", { ascending: true })
      .order("fecha_inicio", { ascending: false });

    if (error) {
      setMensaje("Error cargando precios de gas: " + error.message);
      return;
    }

    setPrecios((data as GasPrecio[]) || []);
  }

  async function cargarProveedores() {
    const { data, error } = await supabase
      .from("catalogo_proveedores")
      .select("id, nombre_proveedor")
      .order("nombre_proveedor", { ascending: true });

    if (error) {
      setMensaje("Error cargando proveedores: " + error.message);
      return;
    }

    const lista = ((data as Proveedor[]) || []).filter(
      (p) => p.nombre_proveedor && p.nombre_proveedor.trim() !== ""
    );

    const mapa = new Map<string, Proveedor>();

    lista.forEach((p) => {
      const clave = String(p.nombre_proveedor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      if (!mapa.has(clave)) {
        mapa.set(clave, p);
      }
    });

    const proveedoresUnicos = Array.from(mapa.values()).sort((a, b) =>
      String(a.nombre_proveedor || "").localeCompare(
        String(b.nombre_proveedor || ""),
        "es"
      )
    );

    setProveedores(proveedoresUnicos);
  }

  async function cargarUnidades() {
    const { data, error } = await supabase
      .from("gas_unidades_medida")
      .select("id, nombre, abreviatura, estado")
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });

    if (error) {
      setMensaje("Error cargando unidades de medida: " + error.message);
      return;
    }

    const unidadesData = (data as UnidadMedidaGas[]) || [];
    setUnidades(unidadesData);

    if (!unidadMedidaId) {
      const galones = unidadesData.find(
        (u) => u.nombre?.toLowerCase() === "galones"
      );

      if (galones) {
        setUnidadMedidaId(String(galones.id));
      } else if (unidadesData.length > 0) {
        setUnidadMedidaId(String(unidadesData[0].id));
      }
    }
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setProveedorId("");
    setPrecioUnitario("");
    setFechaInicio(new Date().toISOString().slice(0, 10));
    setEstado("Activo");
    setObservacion("");

    const galones = unidades.find(
      (u) => u.nombre?.toLowerCase() === "galones"
    );

    if (galones) {
      setUnidadMedidaId(String(galones.id));
    } else if (unidades.length > 0) {
      setUnidadMedidaId(String(unidades[0].id));
    } else {
      setUnidadMedidaId("");
    }
  }

  function editarPrecio(precio: GasPrecio) {
    setEditandoId(precio.id);
    setProveedorId(precio.proveedor_id ? String(precio.proveedor_id) : "");
    setUnidadMedidaId(String(precio.unidad_medida_id));
    setPrecioUnitario(String(precio.precio_unitario || ""));
    setFechaInicio(precio.fecha_inicio || new Date().toISOString().slice(0, 10));
    setEstado(precio.estado || "Activo");
    setObservacion(precio.observacion || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function desactivarPreciosActivos(
    proveedor: string,
    unidad: string,
    excluirId?: number | null
  ) {
    if (!condominioId || !proveedor || !unidad) return;

    let query = supabase
      .from("gas_precios")
      .update({ estado: "Inactivo" })
      .eq("condominio_id", Number(condominioId))
      .eq("proveedor_id", Number(proveedor))
      .eq("unidad_medida_id", Number(unidad))
      .eq("estado", "Activo");

    if (excluirId) {
      query = query.neq("id", excluirId);
    }

    await query;
  }

  async function guardarPrecio(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!condominioId) {
      alert("No hay condominio activo.");
      return;
    }

    if (!proveedorId) {
      alert("Debe seleccionar el proveedor.");
      return;
    }

    if (!unidadMedidaId) {
      alert("Debe seleccionar la unidad de medida.");
      return;
    }

    const precioFinal = Number(precioUnitario || 0);

    if (precioFinal <= 0) {
      alert("El precio unitario debe ser mayor que cero.");
      return;
    }

    if (!fechaInicio) {
      alert("Debe indicar la fecha de inicio.");
      return;
    }

    setLoading(true);
    setMensaje("");

    if (estado === "Activo") {
      await desactivarPreciosActivos(proveedorId, unidadMedidaId, editandoId);
    }

    if (editandoId) {
      const { error } = await supabase
        .from("gas_precios")
        .update({
          proveedor_id: Number(proveedorId),
          unidad_medida_id: Number(unidadMedidaId),
          precio_unitario: precioFinal,
          fecha_inicio: fechaInicio,
          estado,
          observacion: observacion.trim() || null,
        })
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      if (error) {
        alert("Error actualizando precio: " + error.message);
        setLoading(false);
        return;
      }

      alert("Precio actualizado correctamente.");
    } else {
      const { error } = await supabase.from("gas_precios").insert([
        {
          condominio_id: Number(condominioId),
          proveedor_id: Number(proveedorId),
          unidad_medida_id: Number(unidadMedidaId),
          precio_unitario: precioFinal,
          fecha_inicio: fechaInicio,
          estado,
          observacion: observacion.trim() || null,
        },
      ]);

      if (error) {
        alert("Error creando precio: " + error.message);
        setLoading(false);
        return;
      }

      alert("Precio creado correctamente.");
    }

    limpiarFormulario();
    await cargarPrecios(condominioId);
    setLoading(false);
  }

  async function cambiarEstado(precio: GasPrecio) {
    if (!condominioId) {
      alert("No hay condominio activo.");
      return;
    }

    const nuevoEstado = precio.estado === "Activo" ? "Inactivo" : "Activo";

    const confirmar = confirm(
      `¿Desea cambiar este precio a estado ${nuevoEstado}?`
    );

    if (!confirmar) return;

    if (nuevoEstado === "Activo") {
      await desactivarPreciosActivos(
        String(precio.proveedor_id || ""),
        String(precio.unidad_medida_id || ""),
        precio.id
      );
    }

    const { error } = await supabase
      .from("gas_precios")
      .update({ estado: nuevoEstado })
      .eq("id", precio.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error cambiando estado: " + error.message);
      return;
    }

    cargarPrecios(condominioId);
  }

  const preciosFiltrados = useMemo(() => {
    const texto = buscar.toLowerCase().trim();

    if (!texto) return precios;

    return precios.filter((p) => {
      const cadena = `
        ${p.catalogo_proveedores?.nombre_proveedor || ""}
        ${p.gas_unidades_medida?.nombre || ""}
        ${p.gas_unidades_medida?.abreviatura || ""}
        ${p.precio_unitario || ""}
        ${p.fecha_inicio || ""}
        ${p.estado || ""}
        ${p.observacion || ""}
      `.toLowerCase();

      return cadena.includes(texto);
    });
  }, [precios, buscar]);

  const totalActivos = precios.filter((p) => p.estado === "Activo").length;
  const totalInactivos = precios.filter((p) => p.estado !== "Activo").length;

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function fechaDominicana(fecha: string | null | undefined) {
    if (!fecha) return "-";

    const d = new Date(fecha);

    if (Number.isNaN(d.getTime())) return fecha;

    return d.toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-emerald-700 uppercase tracking-wide">
                Módulo de Gas
              </p>

              <h1 className="text-3xl font-black text-slate-900 mt-1">
                Precios de Gas
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Catálogo de precios por proveedor y unidad de medida. Cuando un
                precio nuevo queda activo, el anterior se inactiva para conservar
                el histórico.
              </p>

              <p className="text-sm text-blue-700 font-bold mt-3">
                Condominio activo: {condominioNombre || "No seleccionado"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/gas"
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold"
              >
                Volver a Gas
              </Link>

              <button
                type="button"
                onClick={() => cargarTodo(condominioId)}
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl font-bold"
              >
                Actualizar
              </button>
            </div>
          </div>
        </section>

        {mensaje && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-bold">
            {mensaje}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Total precios</p>
            <h2 className="text-3xl font-black text-slate-900">
              {precios.length}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Activos</p>
            <h2 className="text-3xl font-black text-green-700">
              {totalActivos}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Inactivos</p>
            <h2 className="text-3xl font-black text-red-700">
              {totalInactivos}
            </h2>
          </div>
        </section>

        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <h2 className="text-xl font-black text-slate-900 mb-4">
            {editandoId ? "Editar precio" : "Nuevo precio"}
          </h2>

          <form
            onSubmit={guardarPrecio}
            className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end"
          >
            <div>
              <label className="block text-sm font-semibold mb-1">
                Proveedor
              </label>
              <select
                value={proveedorId}
                onChange={(e) => setProveedorId(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="">Seleccione</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre_proveedor || `Proveedor ${p.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Unidad de medida
              </label>
              <select
                value={unidadMedidaId}
                onChange={(e) => setUnidadMedidaId(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="">Seleccione</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.abreviatura ? `(${u.abreviatura})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Precio unitario
              </label>
              <input
                type="number"
                value={precioUnitario}
                onChange={(e) => setPrecioUnitario(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Ej. 145.00"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Fecha inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Estado
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block text-sm font-semibold mb-1">
                Observación
              </label>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                rows={2}
                placeholder="Ej. Precio vigente según proveedor."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-3 rounded-xl font-bold disabled:opacity-60"
              >
                {editandoId ? "Actualizar" : "Guardar"}
              </button>

              {editandoId && (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 border px-5 py-3 rounded-xl font-bold"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Listado de precios
              </h2>
              <p className="text-sm text-slate-500">
                Solo debe existir un precio activo por proveedor y unidad.
              </p>
            </div>

            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full md:w-80"
              placeholder="Buscar precio..."
            />
          </div>

          <div className="overflow-auto border rounded-2xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">ID</th>
                  <th className="p-3 border text-left">Proveedor</th>
                  <th className="p-3 border text-left">Unidad</th>
                  <th className="p-3 border text-right">Precio</th>
                  <th className="p-3 border text-left">Fecha inicio</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-left">Observación</th>
                  <th className="p-3 border text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {preciosFiltrados.map((precio) => (
                  <tr key={precio.id} className="hover:bg-slate-50">
                    <td className="p-3 border font-bold">{precio.id}</td>

                    <td className="p-3 border">
                      {precio.catalogo_proveedores?.nombre_proveedor || "-"}
                    </td>

                    <td className="p-3 border">
                      {precio.gas_unidades_medida?.nombre || "-"}{" "}
                      {precio.gas_unidades_medida?.abreviatura
                        ? `(${precio.gas_unidades_medida.abreviatura})`
                        : ""}
                    </td>

                    <td className="p-3 border text-right font-bold">
                      RD$ {dinero(precio.precio_unitario)}
                    </td>

                    <td className="p-3 border">
                      {fechaDominicana(precio.fecha_inicio)}
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          precio.estado === "Activo"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {precio.estado || "Sin estado"}
                      </span>
                    </td>

                    <td className="p-3 border">
                      {precio.observacion || "-"}
                    </td>

                    <td className="p-3 border text-center">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => editarPrecio(precio)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-lg text-xs font-bold"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => cambiarEstado(precio)}
                          className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1 rounded-lg text-xs font-bold"
                        >
                          {precio.estado === "Activo"
                            ? "Inactivar"
                            : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {preciosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-6 border text-center text-slate-500"
                    >
                      No hay precios registrados para este condominio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}