"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Categoria = {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: string | null;
};

type ItemInventario = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  codigo: string | null;
  nombre: string;
  categoria_id: number | null;
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
  foto_url: string | null;
  observacion: string | null;
  created_at: string | null;
};

type MovimientoInventario = {
  id: number;
  item_id: number;
  tipo_movimiento: string;
  fecha_movimiento: string | null;
  cantidad: number | null;
  responsable: string | null;
  ubicacion_origen: string | null;
  ubicacion_destino: string | null;
  observacion: string | null;
  inventario_items?: {
    nombre: string | null;
    codigo: string | null;
  } | null;
};

const estadosItem = [
  "Disponible",
  "En uso",
  "En reparación",
  "Dañado",
  "Perdido",
  "Dado de baja",
];

const unidadesMedida = [
  "Unidad",
  "Caja",
  "Galón",
  "Litro",
  "Metro",
  "Rollo",
  "Par",
  "Paquete",
];

const tiposMovimiento = [
  "Entrada",
  "Salida",
  "Asignación",
  "Devolución",
  "Reparación",
  "Baja",
  "Ajuste",
  "Traslado",
];

export default function InventarioPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [unidadMedida, setUnidadMedida] = useState("Unidad");
  const [estado, setEstado] = useState("Disponible");
  const [ubicacion, setUbicacion] = useState("");
  const [responsable, setResponsable] = useState("");
  const [fechaAdquisicion, setFechaAdquisicion] = useState("");
  const [costo, setCosto] = useState("0");
  const [fotoUrl, setFotoUrl] = useState("");
  const [observacion, setObservacion] = useState("");

  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [descripcionCategoria, setDescripcionCategoria] = useState("");

  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [buscar, setBuscar] = useState("");

  const [itemMovimientoId, setItemMovimientoId] = useState("");
  const [tipoMovimiento, setTipoMovimiento] = useState("Asignación");
  const [cantidadMovimiento, setCantidadMovimiento] = useState("1");
  const [responsableMovimiento, setResponsableMovimiento] = useState("");
  const [ubicacionOrigen, setUbicacionOrigen] = useState("");
  const [ubicacionDestino, setUbicacionDestino] = useState("");
  const [observacionMovimiento, setObservacionMovimiento] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombreCondominio = localStorage.getItem("condominio_nombre") || "";
    const usuario = localStorage.getItem("usuario_nombre") || "Administración";

    setCondominioId(id);
    setCondominioNombre(nombreCondominio);
    setUsuarioNombre(usuario);

    if (id) cargarTodo(id);
  }, []);

  async function cargarTodo(id: string) {
    await Promise.all([cargarCategorias(id), cargarItems(id), cargarMovimientos(id)]);
  }

  async function cargarCategorias(id: string) {
    const { data, error } = await supabase
      .from("inventario_categorias")
      .select("*")
      .eq("condominio_id", Number(id))
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando categorías: " + error.message);
      return;
    }

    setCategorias((data as Categoria[]) || []);
  }

  async function cargarItems(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("inventario_items")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando inventario: " + error.message);
      return;
    }

    setItems((data as ItemInventario[]) || []);
  }

  async function cargarMovimientos(id: string) {
    const { data, error } = await supabase
      .from("inventario_movimientos")
      .select(`
        *,
        inventario_items(nombre, codigo)
      `)
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false })
      .limit(15);

    if (error) {
      alert("Error cargando movimientos: " + error.message);
      return;
    }

    setMovimientos((data as MovimientoInventario[]) || []);
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

  function limpiarFormulario() {
    setEditandoId(null);
    setNombre("");
    setCodigo("");
    setCategoriaId("");
    setDescripcion("");
    setMarca("");
    setModelo("");
    setNumeroSerie("");
    setCantidad("1");
    setUnidadMedida("Unidad");
    setEstado("Disponible");
    setUbicacion("");
    setResponsable("");
    setFechaAdquisicion("");
    setCosto("0");
    setFotoUrl("");
    setObservacion("");
  }

  async function guardarCategoria(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!nuevaCategoria.trim()) {
      alert("Debe indicar el nombre de la categoría.");
      return;
    }

    const { error } = await supabase.from("inventario_categorias").insert([
      {
        condominio_id: Number(condominioId),
        condominio: condominioNombre,
        nombre: nuevaCategoria.trim(),
        descripcion: descripcionCategoria.trim(),
        estado: "Activo",
      },
    ]);

    if (error) {
      alert("Error guardando categoría: " + error.message);
      return;
    }

    setNuevaCategoria("");
    setDescripcionCategoria("");
    cargarCategorias(condominioId);
  }

  async function guardarItem(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!nombre.trim()) {
      alert("Debe indicar el nombre del artículo.");
      return;
    }

    const categoria = categorias.find((c) => String(c.id) === categoriaId);

    const registro = {
      condominio_id: Number(condominioId),
      condominio: condominioNombre,
      codigo: codigo.trim() || null,
      nombre: nombre.trim(),
      categoria_id: categoriaId ? Number(categoriaId) : null,
      categoria: categoria?.nombre || null,
      descripcion: descripcion.trim(),
      marca: marca.trim(),
      modelo: modelo.trim(),
      numero_serie: numeroSerie.trim(),
      cantidad: numero(cantidad),
      unidad_medida: unidadMedida,
      estado,
      ubicacion: ubicacion.trim(),
      responsable: responsable.trim(),
      fecha_adquisicion: fechaAdquisicion || null,
      costo: numero(costo),
      foto_url: fotoUrl.trim(),
      observacion: observacion.trim(),
    };

    setGuardando(true);

    if (editandoId) {
      const { error } = await supabase
        .from("inventario_items")
        .update(registro)
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      setGuardando(false);

      if (error) {
        alert("Error modificando artículo: " + error.message);
        return;
      }

      alert("Artículo modificado correctamente.");
      limpiarFormulario();
      cargarTodo(condominioId);
      return;
    }

    const { error } = await supabase.from("inventario_items").insert([registro]);
    setGuardando(false);

    if (error) {
      alert("Error guardando artículo: " + error.message);
      return;
    }

    alert("Artículo registrado correctamente.");
    limpiarFormulario();
    cargarTodo(condominioId);
  }

  function editarItem(item: ItemInventario) {
    setEditandoId(item.id);
    setNombre(item.nombre || "");
    setCodigo(item.codigo || "");
    setCategoriaId(item.categoria_id ? String(item.categoria_id) : "");
    setDescripcion(item.descripcion || "");
    setMarca(item.marca || "");
    setModelo(item.modelo || "");
    setNumeroSerie(item.numero_serie || "");
    setCantidad(String(item.cantidad || 1));
    setUnidadMedida(item.unidad_medida || "Unidad");
    setEstado(item.estado || "Disponible");
    setUbicacion(item.ubicacion || "");
    setResponsable(item.responsable || "");
    setFechaAdquisicion(item.fecha_adquisicion || "");
    setCosto(String(item.costo || 0));
    setFotoUrl(item.foto_url || "");
    setObservacion(item.observacion || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminarItem(item: ItemInventario) {
    const confirmar = confirm(`¿Seguro que desea eliminar ${item.nombre}?`);
    if (!confirmar) return;

    const { error } = await supabase
      .from("inventario_items")
      .delete()
      .eq("id", item.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error eliminando artículo: " + error.message);
      return;
    }

    alert("Artículo eliminado correctamente.");
    cargarTodo(condominioId);
  }

  async function guardarMovimiento(e: React.FormEvent) {
    e.preventDefault();

    if (!itemMovimientoId) {
      alert("Debe seleccionar un artículo.");
      return;
    }

    const item = items.find((i) => String(i.id) === itemMovimientoId);
    if (!item) {
      alert("Artículo no encontrado.");
      return;
    }

    const { error } = await supabase.from("inventario_movimientos").insert([
      {
        condominio_id: Number(condominioId),
        condominio: condominioNombre,
        item_id: Number(itemMovimientoId),
        tipo_movimiento: tipoMovimiento,
        cantidad: numero(cantidadMovimiento),
        responsable: responsableMovimiento.trim() || usuarioNombre,
        ubicacion_origen: ubicacionOrigen.trim(),
        ubicacion_destino: ubicacionDestino.trim(),
        observacion: observacionMovimiento.trim(),
      },
    ]);

    if (error) {
      alert("Error guardando movimiento: " + error.message);
      return;
    }

    const actualizacion: Record<string, any> = {};

    if (tipoMovimiento === "Asignación" || tipoMovimiento === "Salida") {
      actualizacion.estado = "En uso";
      actualizacion.responsable = responsableMovimiento.trim() || usuarioNombre;
      if (ubicacionDestino.trim()) actualizacion.ubicacion = ubicacionDestino.trim();
    }

    if (tipoMovimiento === "Devolución" || tipoMovimiento === "Entrada") {
      actualizacion.estado = "Disponible";
      actualizacion.responsable = "";
      if (ubicacionDestino.trim()) actualizacion.ubicacion = ubicacionDestino.trim();
    }

    if (tipoMovimiento === "Reparación") actualizacion.estado = "En reparación";
    if (tipoMovimiento === "Baja") actualizacion.estado = "Dado de baja";

    if (Object.keys(actualizacion).length > 0) {
      await supabase
        .from("inventario_items")
        .update(actualizacion)
        .eq("id", Number(itemMovimientoId))
        .eq("condominio_id", Number(condominioId));
    }

    alert("Movimiento registrado correctamente.");
    setItemMovimientoId("");
    setTipoMovimiento("Asignación");
    setCantidadMovimiento("1");
    setResponsableMovimiento("");
    setUbicacionOrigen("");
    setUbicacionDestino("");
    setObservacionMovimiento("");
    cargarTodo(condominioId);
  }

  const categoriasFiltro = useMemo(() => {
    return ["Todos", ...categorias.map((c) => c.nombre)];
  }, [categorias]);

  const itemsFiltrados = items.filter((item) => {
    const texto = `${item.codigo || ""} ${item.nombre || ""} ${item.categoria || ""} ${item.descripcion || ""} ${item.marca || ""} ${item.modelo || ""} ${item.numero_serie || ""} ${item.ubicacion || ""} ${item.responsable || ""}`
      .toLowerCase()
      .trim();

    return (
      texto.includes(buscar.toLowerCase().trim()) &&
      (filtroEstado === "Todos" || item.estado === filtroEstado) &&
      (filtroCategoria === "Todos" || item.categoria === filtroCategoria)
    );
  });

  const totalItems = itemsFiltrados.length;
  const totalDisponible = itemsFiltrados.filter((i) => i.estado === "Disponible").length;
  const totalEnUso = itemsFiltrados.filter((i) => i.estado === "En uso").length;
  const totalReparacion = itemsFiltrados.filter((i) => i.estado === "En reparación").length;
  const totalBaja = itemsFiltrados.filter(
    (i) => i.estado === "Dañado" || i.estado === "Perdido" || i.estado === "Dado de baja"
  ).length;
  const valorTotal = itemsFiltrados.reduce(
    (sum, i) => sum + numero(i.costo) * numero(i.cantidad),
    0
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">Inventario</h1>
        <p className="text-slate-500 mt-2">
          Control de herramientas, escaleras, equipos, materiales y activos de trabajo del condominio.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>
        <h2 className="text-lg font-bold text-slate-900">{condominioNombre || "No identificado"}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border"><p className="text-sm text-slate-500">Artículos</p><h2 className="text-3xl font-black">{totalItems}</h2></div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border"><p className="text-sm text-slate-500">Disponibles</p><h2 className="text-3xl font-black text-green-700">{totalDisponible}</h2></div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border"><p className="text-sm text-slate-500">En uso</p><h2 className="text-3xl font-black text-blue-700">{totalEnUso}</h2></div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border"><p className="text-sm text-slate-500">Reparación</p><h2 className="text-3xl font-black text-yellow-700">{totalReparacion}</h2></div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border"><p className="text-sm text-slate-500">Baja / Perdidos</p><h2 className="text-3xl font-black text-red-700">{totalBaja}</h2></div>
        <div className="bg-slate-900 rounded-2xl p-5 shadow-sm border"><p className="text-sm text-slate-300">Valor estimado</p><h2 className="text-2xl font-black text-white">RD${moneda(valorTotal)}</h2></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-3xl border shadow-sm p-6">
          <h2 className="text-xl font-black mb-4">{editandoId ? "Modificar artículo" : "Registrar artículo"}</h2>

          <form onSubmit={guardarItem} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold mb-1">Nombre *</label><input value={nombre} onChange={(e) => setNombre(e.target.value)} className="border rounded-xl px-4 py-3 w-full" placeholder="Ej. Escalera 12 pies" /></div>
            <div><label className="block text-sm font-semibold mb-1">Código</label><input value={codigo} onChange={(e) => setCodigo(e.target.value)} className="border rounded-xl px-4 py-3 w-full" placeholder="Ej. INV-0001" /></div>
            <div><label className="block text-sm font-semibold mb-1">Categoría</label><select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="border rounded-xl px-4 py-3 w-full bg-white"><option value="">Seleccione</option>{categorias.map((cat) => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}</select></div>
            <div><label className="block text-sm font-semibold mb-1">Estado</label><select value={estado} onChange={(e) => setEstado(e.target.value)} className="border rounded-xl px-4 py-3 w-full bg-white">{estadosItem.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
            <div><label className="block text-sm font-semibold mb-1">Cantidad</label><input type="number" step="0.01" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="border rounded-xl px-4 py-3 w-full" /></div>
            <div><label className="block text-sm font-semibold mb-1">Unidad medida</label><select value={unidadMedida} onChange={(e) => setUnidadMedida(e.target.value)} className="border rounded-xl px-4 py-3 w-full bg-white">{unidadesMedida.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
            <div><label className="block text-sm font-semibold mb-1">Marca</label><input value={marca} onChange={(e) => setMarca(e.target.value)} className="border rounded-xl px-4 py-3 w-full" /></div>
            <div><label className="block text-sm font-semibold mb-1">Modelo</label><input value={modelo} onChange={(e) => setModelo(e.target.value)} className="border rounded-xl px-4 py-3 w-full" /></div>
            <div><label className="block text-sm font-semibold mb-1">No. Serie</label><input value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} className="border rounded-xl px-4 py-3 w-full" /></div>
            <div><label className="block text-sm font-semibold mb-1">Ubicación</label><input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className="border rounded-xl px-4 py-3 w-full" placeholder="Ej. Cuarto de herramientas" /></div>
            <div><label className="block text-sm font-semibold mb-1">Responsable</label><input value={responsable} onChange={(e) => setResponsable(e.target.value)} className="border rounded-xl px-4 py-3 w-full" /></div>
            <div><label className="block text-sm font-semibold mb-1">Fecha adquisición</label><input type="date" value={fechaAdquisicion} onChange={(e) => setFechaAdquisicion(e.target.value)} className="border rounded-xl px-4 py-3 w-full" /></div>
            <div><label className="block text-sm font-semibold mb-1">Costo</label><input type="number" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} className="border rounded-xl px-4 py-3 w-full" /></div>
            <div><label className="block text-sm font-semibold mb-1">Foto URL</label><input value={fotoUrl} onChange={(e) => setFotoUrl(e.target.value)} className="border rounded-xl px-4 py-3 w-full" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-semibold mb-1">Descripción</label><textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="border rounded-xl px-4 py-3 w-full" rows={2} /></div>
            <div className="md:col-span-2"><label className="block text-sm font-semibold mb-1">Observación</label><textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} className="border rounded-xl px-4 py-3 w-full" rows={2} /></div>
            <div className="md:col-span-2 flex flex-col md:flex-row gap-3">
              <button type="submit" disabled={guardando} className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-5 py-3 rounded-xl font-bold">{guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Guardar artículo"}</button>
              {editandoId && <button type="button" onClick={limpiarFormulario} className="bg-slate-600 hover:bg-slate-700 text-white px-5 py-3 rounded-xl font-bold">Cancelar edición</button>}
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border shadow-sm p-6">
            <h2 className="text-xl font-black mb-4">Nueva categoría</h2>
            <form onSubmit={guardarCategoria} className="space-y-3">
              <input value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} className="border rounded-xl px-4 py-3 w-full" placeholder="Herramientas, Equipos eléctricos..." />
              <textarea value={descripcionCategoria} onChange={(e) => setDescripcionCategoria(e.target.value)} className="border rounded-xl px-4 py-3 w-full" rows={2} placeholder="Descripción" />
              <button type="submit" className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-xl font-bold w-full">Guardar categoría</button>
            </form>
          </div>

          <div className="bg-white rounded-3xl border shadow-sm p-6">
            <h2 className="text-xl font-black mb-4">Registrar movimiento</h2>
            <form onSubmit={guardarMovimiento} className="space-y-3">
              <select value={itemMovimientoId} onChange={(e) => { const id = e.target.value; setItemMovimientoId(id); const item = items.find((i) => String(i.id) === id); setUbicacionOrigen(item?.ubicacion || ""); }} className="border rounded-xl px-4 py-3 w-full bg-white">
                <option value="">Seleccione artículo</option>{items.map((item) => <option key={item.id} value={item.id}>{item.codigo || item.id} - {item.nombre}</option>)}
              </select>
              <select value={tipoMovimiento} onChange={(e) => setTipoMovimiento(e.target.value)} className="border rounded-xl px-4 py-3 w-full bg-white">{tiposMovimiento.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <input type="number" step="0.01" value={cantidadMovimiento} onChange={(e) => setCantidadMovimiento(e.target.value)} className="border rounded-xl px-4 py-3 w-full" placeholder="Cantidad" />
              <input value={responsableMovimiento} onChange={(e) => setResponsableMovimiento(e.target.value)} className="border rounded-xl px-4 py-3 w-full" placeholder="Responsable" />
              <input value={ubicacionOrigen} onChange={(e) => setUbicacionOrigen(e.target.value)} className="border rounded-xl px-4 py-3 w-full" placeholder="Ubicación origen" />
              <input value={ubicacionDestino} onChange={(e) => setUbicacionDestino(e.target.value)} className="border rounded-xl px-4 py-3 w-full" placeholder="Ubicación destino" />
              <textarea value={observacionMovimiento} onChange={(e) => setObservacionMovimiento(e.target.value)} className="border rounded-xl px-4 py-3 w-full" rows={2} placeholder="Observación" />
              <button type="submit" className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-3 rounded-xl font-bold w-full">Guardar movimiento</button>
            </form>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input value={buscar} onChange={(e) => setBuscar(e.target.value)} className="border rounded-xl px-4 py-3 w-full" placeholder="Buscar por código, artículo, marca, ubicación..." />
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="border rounded-xl px-4 py-3 w-full bg-white"><option value="Todos">Todos los estados</option>{estadosItem.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="border rounded-xl px-4 py-3 w-full bg-white">{categoriasFiltro.map((item) => <option key={item} value={item}>{item === "Todos" ? "Todas las categorías" : item}</option>)}</select>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">Inventario registrado</h2>
        {loading ? <div>Cargando inventario...</div> : (
          <div className="overflow-auto"><table className="min-w-full text-sm"><thead className="bg-slate-100"><tr><th className="p-3 border text-left">Artículo</th><th className="p-3 border text-left">Categoría</th><th className="p-3 border text-center">Cantidad</th><th className="p-3 border text-left">Ubicación</th><th className="p-3 border text-left">Responsable</th><th className="p-3 border text-right">Costo</th><th className="p-3 border text-center">Estado</th><th className="p-3 border text-center">Acciones</th></tr></thead><tbody>
            {itemsFiltrados.map((item) => <tr key={item.id} className="hover:bg-slate-50"><td className="p-3 border"><p className="font-black">{item.nombre}</p><p className="text-xs text-slate-500">Código: {item.codigo || item.id}</p><p className="text-xs text-slate-500">{item.marca || "-"} {item.modelo || ""}</p>{item.numero_serie && <p className="text-xs text-slate-500">Serie: {item.numero_serie}</p>}</td><td className="p-3 border">{item.categoria || "-"}</td><td className="p-3 border text-center font-black">{numero(item.cantidad).toFixed(2)} {item.unidad_medida}</td><td className="p-3 border">{item.ubicacion || "-"}</td><td className="p-3 border">{item.responsable || "-"}</td><td className="p-3 border text-right font-bold">RD${moneda(item.costo)}</td><td className="p-3 border text-center"><span className={`px-3 py-1 rounded-full text-xs font-bold ${item.estado === "Disponible" ? "bg-green-100 text-green-700" : item.estado === "En uso" ? "bg-blue-100 text-blue-700" : item.estado === "En reparación" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{item.estado || "-"}</span></td><td className="p-3 border"><div className="flex flex-wrap justify-center gap-2"><button type="button" onClick={() => editarItem(item)} className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold">Editar</button><button type="button" onClick={() => eliminarItem(item)} className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-lg text-xs font-bold">Eliminar</button></div></td></tr>)}
            {itemsFiltrados.length === 0 && <tr><td className="p-6 border text-center text-slate-500" colSpan={8}>No hay artículos registrados con este filtro.</td></tr>}
          </tbody></table></div>
        )}
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">Últimos movimientos</h2>
        <div className="overflow-auto"><table className="min-w-full text-sm"><thead className="bg-slate-100"><tr><th className="p-3 border text-left">Artículo</th><th className="p-3 border text-left">Movimiento</th><th className="p-3 border text-center">Cantidad</th><th className="p-3 border text-left">Responsable</th><th className="p-3 border text-left">Ubicaciones</th><th className="p-3 border text-left">Fecha</th></tr></thead><tbody>
          {movimientos.map((mov) => <tr key={mov.id} className="hover:bg-slate-50"><td className="p-3 border"><p className="font-bold">{mov.inventario_items?.nombre || "-"}</p><p className="text-xs text-slate-500">{mov.inventario_items?.codigo || mov.item_id}</p></td><td className="p-3 border font-bold">{mov.tipo_movimiento}</td><td className="p-3 border text-center">{numero(mov.cantidad).toFixed(2)}</td><td className="p-3 border">{mov.responsable || "-"}</td><td className="p-3 border"><p>Origen: {mov.ubicacion_origen || "-"}</p><p className="text-xs text-slate-500">Destino: {mov.ubicacion_destino || "-"}</p></td><td className="p-3 border">{fecha(mov.fecha_movimiento)}</td></tr>)}
          {movimientos.length === 0 && <tr><td className="p-6 border text-center text-slate-500" colSpan={6}>No hay movimientos registrados.</td></tr>}
        </tbody></table></div>
      </div>
    </div>
  );
}
