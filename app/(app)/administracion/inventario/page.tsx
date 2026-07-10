"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowRightLeft,
  BarChart3,
  Boxes,
  Edit,
  Filter,
  Package,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  Tags,
  Trash2,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

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

  const limpio = String(valor).split("T")[0];
  const partes = limpio.split("-");

  if (partes.length !== 3) return limpio;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function estadoBadgeClass(estado: string | null | undefined) {
  if (estado === "Disponible") return "bg-emerald-50 text-emerald-700";
  if (estado === "En uso") return "bg-blue-50 text-blue-700";
  if (estado === "En reparación") return "bg-yellow-50 text-yellow-700";

  return "bg-red-50 text-red-700";
}

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
    const nombreCondominio =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";
    const usuario = localStorage.getItem("usuario_nombre") || "Administración";

    setCondominioId(id);
    setCondominioNombre(nombreCondominio);
    setUsuarioNombre(usuario);

    if (id) {
      cargarTodo(id);
    } else {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
    }
  }, []);

  async function cargarTodo(id: string) {
    await Promise.all([
      cargarCategorias(id),
      cargarItems(id),
      cargarMovimientos(id),
    ]);
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
      .select(
        `
        *,
        inventario_items(nombre, codigo)
      `,
      )
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false })
      .limit(15);

    if (error) {
      alert("Error cargando movimientos: " + error.message);
      return;
    }

    setMovimientos((data as MovimientoInventario[]) || []);
  }

  async function refrescar() {
    if (!condominioId) return;
    await cargarTodo(condominioId);
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
      if (ubicacionDestino.trim()) {
        actualizacion.ubicacion = ubicacionDestino.trim();
      }
    }

    if (tipoMovimiento === "Devolución" || tipoMovimiento === "Entrada") {
      actualizacion.estado = "Disponible";
      actualizacion.responsable = "";
      if (ubicacionDestino.trim()) {
        actualizacion.ubicacion = ubicacionDestino.trim();
      }
    }

    if (tipoMovimiento === "Reparación") {
      actualizacion.estado = "En reparación";
    }

    if (tipoMovimiento === "Baja") {
      actualizacion.estado = "Dado de baja";
    }

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

  const itemsFiltrados = useMemo(() => {
    return items.filter((item) => {
      const texto = `${item.codigo || ""} ${item.nombre || ""} ${
        item.categoria || ""
      } ${item.descripcion || ""} ${item.marca || ""} ${
        item.modelo || ""
      } ${item.numero_serie || ""} ${item.ubicacion || ""} ${
        item.responsable || ""
      }`
        .toLowerCase()
        .trim();

      return (
        texto.includes(buscar.toLowerCase().trim()) &&
        (filtroEstado === "Todos" || item.estado === filtroEstado) &&
        (filtroCategoria === "Todos" || item.categoria === filtroCategoria)
      );
    });
  }, [items, buscar, filtroEstado, filtroCategoria]);

  const totalItems = itemsFiltrados.length;

  const totalDisponible = itemsFiltrados.filter(
    (i) => i.estado === "Disponible",
  ).length;

  const totalEnUso = itemsFiltrados.filter((i) => i.estado === "En uso").length;

  const totalReparacion = itemsFiltrados.filter(
    (i) => i.estado === "En reparación",
  ).length;

  const totalBaja = itemsFiltrados.filter(
    (i) =>
      i.estado === "Dañado" ||
      i.estado === "Perdido" ||
      i.estado === "Dado de baja",
  ).length;

  const valorTotal = itemsFiltrados.reduce(
    (sum, i) => sum + numero(i.costo) * numero(i.cantidad),
    0,
  );

  return (
    <PageContainer>
      <ModuleMenu
        title="Inventario"
        subtitle="Control de activos, artículos, movimientos y reportes del condominio."
        tone="blue"
        items={[
          {
            href: "/administracion/inventario",
            label: "Inicio inventario",
            icon: Package,
          },
          {
            href: "/administracion/inventario/articulos",
            label: "Artículos",
            icon: Boxes,
          },
          {
            href: "/administracion/inventario/mantenimiento",
            label: "Mant Preventivo",
            icon: ArrowRightLeft,
          },
          {
            href: "/administracion/inventario/movimientos",
            label: "Movimientos",
            icon: ArrowRightLeft,
          },
          {
            href: "/administracion/inventario/reportes",
            label: "Reportes",
            icon: BarChart3,
          },
          {
            href: "/administracion/inventario/catalogos",
            label: "Catalogos",
            icon: Tags,
          },
        ]}
      />

      <ModuleToolbar
        title="Inventario"
        subtitle={`Control de herramientas, equipos, materiales y activos. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={Archive}
        actions={<ModuleActions onRefresh={refrescar} />}
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-6">
        <InfoBox label="Artículos" value={`${totalItems}`} />
        <InfoBox label="Disponibles" value={`${totalDisponible}`} tone="emerald" />
        <InfoBox label="En uso" value={`${totalEnUso}`} tone="blue" />
        <InfoBox label="Reparación" value={`${totalReparacion}`} tone="yellow" />
        <InfoBox label="Baja / Perdidos" value={`${totalBaja}`} tone="red" />
        <InfoBox
          label="Valor estimado"
          value={`RD$ ${moneda(valorTotal)}`}
          tone="slate"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="xl:col-span-2">
          <SectionCard
            title={editandoId ? "Modificar artículo" : "Registrar artículo"}
            subtitle="Registre herramientas, equipos, materiales y activos del condominio."
            action={
              editandoId ? (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Cancelar edición
                </button>
              ) : (
                <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                  Nuevo artículo
                </div>
              )
            }
          >
            <form
              onSubmit={guardarItem}
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <Input label="Nombre *" value={nombre} onChange={setNombre} placeholder="Ej. Escalera 12 pies" />
              <Input label="Código" value={codigo} onChange={setCodigo} placeholder="Ej. INV-0001" />

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Categoría
                </label>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                >
                  <option value="">Seleccione</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                >
                  {estadosItem.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <Input label="Cantidad" value={cantidad} onChange={setCantidad} type="number" step="0.01" />

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Unidad medida
                </label>
                <select
                  value={unidadMedida}
                  onChange={(e) => setUnidadMedida(e.target.value)}
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                >
                  {unidadesMedida.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <Input label="Marca" value={marca} onChange={setMarca} />
              <Input label="Modelo" value={modelo} onChange={setModelo} />
              <Input label="No. Serie" value={numeroSerie} onChange={setNumeroSerie} />
              <Input label="Ubicación" value={ubicacion} onChange={setUbicacion} placeholder="Ej. Cuarto de herramientas" />
              <Input label="Responsable" value={responsable} onChange={setResponsable} />
              <Input label="Fecha adquisición" value={fechaAdquisicion} onChange={setFechaAdquisicion} type="date" />
              <Input label="Costo" value={costo} onChange={setCosto} type="number" step="0.01" />
              <Input label="Foto URL" value={fotoUrl} onChange={setFotoUrl} />

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold">
                  Descripción
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  rows={2}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold">
                  Observación
                </label>
                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  rows={2}
                />
              </div>

              <div className="flex flex-col gap-3 md:col-span-2 md:flex-row">
                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {guardando
                    ? "Guardando..."
                    : editandoId
                      ? "Guardar cambios"
                      : "Guardar artículo"}
                </button>

                {editandoId && (
                  <button
                    type="button"
                    onClick={limpiarFormulario}
                    className="rounded-xl bg-slate-700 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                  >
                    Cancelar edición
                  </button>
                )}
              </div>
            </form>
          </SectionCard>
        </section>

        <section className="space-y-5">
          <SectionCard
            title="Nueva categoría"
            subtitle="Cree categorías rápidas para clasificar artículos."
          >
            <form onSubmit={guardarCategoria} className="space-y-3">
              <input
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
                placeholder="Herramientas, Equipos eléctricos..."
              />

              <textarea
                value={descripcionCategoria}
                onChange={(e) => setDescripcionCategoria(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
                rows={2}
                placeholder="Descripción"
              />

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"
              >
                <PlusCircle className="h-4 w-4" />
                Guardar categoría
              </button>
            </form>
          </SectionCard>

          <SectionCard
            title="Registrar movimiento"
            subtitle="Registre asignaciones, devoluciones, traslados, bajas o reparaciones."
          >
            <form onSubmit={guardarMovimiento} className="space-y-3">
              <select
                value={itemMovimientoId}
                onChange={(e) => {
                  const id = e.target.value;
                  setItemMovimientoId(id);
                  const item = items.find((i) => String(i.id) === id);
                  setUbicacionOrigen(item?.ubicacion || "");
                }}
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              >
                <option value="">Seleccione artículo</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.codigo || item.id} - {item.nombre}
                  </option>
                ))}
              </select>

              <select
                value={tipoMovimiento}
                onChange={(e) => setTipoMovimiento(e.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              >
                {tiposMovimiento.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <input
                type="number"
                step="0.01"
                value={cantidadMovimiento}
                onChange={(e) => setCantidadMovimiento(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
                placeholder="Cantidad"
              />

              <input
                value={responsableMovimiento}
                onChange={(e) => setResponsableMovimiento(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
                placeholder="Responsable"
              />

              <input
                value={ubicacionOrigen}
                onChange={(e) => setUbicacionOrigen(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
                placeholder="Ubicación origen"
              />

              <input
                value={ubicacionDestino}
                onChange={(e) => setUbicacionDestino(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
                placeholder="Ubicación destino"
              />

              <textarea
                value={observacionMovimiento}
                onChange={(e) => setObservacionMovimiento(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
                rows={2}
                placeholder="Observación"
              />

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 py-3 text-sm font-bold text-white hover:bg-purple-800"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Guardar movimiento
              </button>
            </form>
          </SectionCard>
        </section>
      </div>

      <SectionCard
        title="Filtros"
        subtitle="Busque y filtre artículos por estado o categoría."
        action={
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
            <Filter className="h-4 w-4" />
            Registros: {itemsFiltrados.length}
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="w-full rounded-xl border px-10 py-3 text-sm"
              placeholder="Buscar por código, artículo, marca, ubicación..."
            />
          </div>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
          >
            <option value="Todos">Todos los estados</option>
            {estadosItem.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
          >
            {categoriasFiltro.map((item) => (
              <option key={item} value={item}>
                {item === "Todos" ? "Todas las categorías" : item}
              </option>
            ))}
          </select>
        </div>
      </SectionCard>

      <SectionCard
        title="Inventario registrado"
        subtitle="Listado de artículos registrados para el condominio activo."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : (
            <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
              Artículos: {itemsFiltrados.length}
            </div>
          )
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500">Cargando inventario...</p>
        ) : itemsFiltrados.length === 0 ? (
          <EmptyState
            title="Sin artículos"
            description="No hay artículos registrados con este filtro."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Artículo</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-center">Cantidad</th>
                <th className="px-4 py-3 text-left">Ubicación</th>
                <th className="px-4 py-3 text-left">Responsable</th>
                <th className="px-4 py-3 text-right">Costo</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {itemsFiltrados.map((item) => (
                <tr key={item.id} className="bg-white hover:bg-slate-50">
                  <td className="min-w-64 px-4 py-3">
                    <p className="font-black text-slate-900">{item.nombre}</p>
                    <p className="text-xs text-slate-500">
                      Código: {item.codigo || item.id}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.marca || "-"} {item.modelo || ""}
                    </p>
                    {item.numero_serie && (
                      <p className="text-xs text-slate-500">
                        Serie: {item.numero_serie}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3">{item.categoria || "-"}</td>

                  <td className="px-4 py-3 text-center font-black">
                    {numero(item.cantidad).toFixed(2)} {item.unidad_medida}
                  </td>

                  <td className="px-4 py-3">{item.ubicacion || "-"}</td>

                  <td className="px-4 py-3">{item.responsable || "-"}</td>

                  <td className="px-4 py-3 text-right font-bold">
                    RD$ {moneda(item.costo)}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${estadoBadgeClass(
                        item.estado,
                      )}`}
                    >
                      {item.estado || "-"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => editarItem(item)}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminarItem(item)}
                        className="inline-flex items-center gap-1 rounded-xl bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      <SectionCard
        title="Últimos movimientos"
        subtitle="Historial reciente de movimientos del inventario."
      >
        {movimientos.length === 0 ? (
          <EmptyState
            title="Sin movimientos"
            description="No hay movimientos registrados."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Artículo</th>
                <th className="px-4 py-3 text-left">Movimiento</th>
                <th className="px-4 py-3 text-center">Cantidad</th>
                <th className="px-4 py-3 text-left">Responsable</th>
                <th className="px-4 py-3 text-left">Ubicaciones</th>
                <th className="px-4 py-3 text-left">Fecha</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {movimientos.map((mov) => (
                <tr key={mov.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-bold">
                      {mov.inventario_items?.nombre || "-"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {mov.inventario_items?.codigo || mov.item_id}
                    </p>
                  </td>

                  <td className="px-4 py-3 font-bold">
                    {mov.tipo_movimiento}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {numero(mov.cantidad).toFixed(2)}
                  </td>

                  <td className="px-4 py-3">{mov.responsable || "-"}</td>

                  <td className="px-4 py-3">
                    <p>Origen: {mov.ubicacion_origen || "-"}</p>
                    <p className="text-xs text-slate-500">
                      Destino: {mov.ubicacion_destino || "-"}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    {fecha(mov.fecha_movimiento)}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function InfoBox({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "blue" | "emerald" | "red" | "yellow";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : tone === "emerald"
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : tone === "red"
          ? "bg-red-50 text-red-700 border-red-100"
          : tone === "yellow"
            ? "bg-yellow-50 text-yellow-700 border-yellow-100"
            : "bg-white text-slate-800 border-slate-200";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2 className="mt-2 text-2xl font-black">{value}</h2>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">{label}</label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border px-4 py-3 text-sm"
        placeholder={placeholder}
      />
    </div>
  );
}