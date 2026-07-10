"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  BarChart3,
  Boxes,
  Download,
  Edit,
  Filter,
  Package,
  Printer,
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

type Catalogo = {
  id: number;
  nombre: string;
  abreviatura?: string | null;
  color?: string | null;
  depreciable?: boolean | null;
  estado: string | null;
};

type ItemInventario = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  codigo: string | null;
  nombre: string;
  tipo_activo_id: number | null;
  tipo_activo: string | null;
  categoria_id: number | null;
  categoria: string | null;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  descripcion: string | null;
  cantidad: number | null;
  unidad_medida: string | null;
  estado: string | null;
  ubicacion: string | null;
  responsable: string | null;
  fecha_adquisicion: string | null;
  costo: number | null;
  valor_actual: number | null;
  depreciable: boolean | null;
  foto_url: string | null;
  observacion: string | null;
  created_at: string | null;
};

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
  const e = String(estado || "").toLowerCase();

  if (e === "disponible") return "bg-emerald-50 text-emerald-700";
  if (e === "en uso") return "bg-blue-50 text-blue-700";
  if (e === "en reparación" || e === "en reparacion") {
    return "bg-yellow-50 text-yellow-700";
  }

  return "bg-red-50 text-red-700";
}

export default function InventarioArticulosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [items, setItems] = useState<ItemInventario[]>([]);
  const [categorias, setCategorias] = useState<Catalogo[]>([]);
  const [unidades, setUnidades] = useState<Catalogo[]>([]);
  const [estados, setEstados] = useState<Catalogo[]>([]);
  const [marcas, setMarcas] = useState<Catalogo[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Catalogo[]>([]);
  const [tiposActivos, setTiposActivos] = useState<Catalogo[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipoActivoId, setTipoActivoId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [unidadMedida, setUnidadMedida] = useState("");
  const [estado, setEstado] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [responsable, setResponsable] = useState("");
  const [fechaAdquisicion, setFechaAdquisicion] = useState("");
  const [costo, setCosto] = useState("0");
  const [valorActual, setValorActual] = useState("0");
  const [depreciable, setDepreciable] = useState(false);
  const [fotoUrl, setFotoUrl] = useState("");
  const [observacion, setObservacion] = useState("");

  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [filtroTipoActivo, setFiltroTipoActivo] = useState("Todos");
  const [filtroUbicacion, setFiltroUbicacion] = useState("Todos");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombreCondominio =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombreCondominio);

    if (id) {
      cargarTodo(id);
    } else {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
    }
  }, []);

  async function cargarTodo(id: string) {
    await Promise.all([cargarCatalogos(id), cargarItems(id)]);
  }

  async function cargarCatalogos(id: string) {
    const [
      categoriasResp,
      unidadesResp,
      estadosResp,
      marcasResp,
      ubicacionesResp,
      tiposResp,
    ] = await Promise.all([
      supabase
        .from("inventario_categorias")
        .select("id, nombre, estado")
        .eq("condominio_id", Number(id))
        .eq("estado", "Activo")
        .order("nombre", { ascending: true }),

      supabase
        .from("inventario_unidades_medida")
        .select("id, nombre, abreviatura, estado")
        .eq("condominio_id", Number(id))
        .eq("estado", "Activo")
        .order("nombre", { ascending: true }),

      supabase
        .from("inventario_estados")
        .select("id, nombre, color, estado")
        .eq("condominio_id", Number(id))
        .eq("estado", "Activo")
        .order("nombre", { ascending: true }),

      supabase
        .from("inventario_marcas")
        .select("id, nombre, estado")
        .eq("condominio_id", Number(id))
        .eq("estado", "Activo")
        .order("nombre", { ascending: true }),

      supabase
        .from("inventario_ubicaciones")
        .select("id, nombre, estado")
        .eq("condominio_id", Number(id))
        .eq("estado", "Activo")
        .order("nombre", { ascending: true }),

      supabase
        .from("inventario_tipos_activos")
        .select("id, nombre, depreciable, estado")
        .eq("condominio_id", Number(id))
        .eq("estado", "Activo")
        .order("nombre", { ascending: true }),
    ]);

    if (categoriasResp.error) {
      alert("Error cargando categorías: " + categoriasResp.error.message);
    }

    if (unidadesResp.error) {
      alert("Error cargando unidades: " + unidadesResp.error.message);
    }

    if (estadosResp.error) {
      alert("Error cargando estados: " + estadosResp.error.message);
    }

    if (marcasResp.error) {
      alert("Error cargando marcas: " + marcasResp.error.message);
    }

    if (ubicacionesResp.error) {
      alert("Error cargando ubicaciones: " + ubicacionesResp.error.message);
    }

    if (tiposResp.error) {
      alert("Error cargando tipos de activos: " + tiposResp.error.message);
    }

    const categoriasData = (categoriasResp.data as Catalogo[]) || [];
    const unidadesData = (unidadesResp.data as Catalogo[]) || [];
    const estadosData = (estadosResp.data as Catalogo[]) || [];
    const marcasData = (marcasResp.data as Catalogo[]) || [];
    const ubicacionesData = (ubicacionesResp.data as Catalogo[]) || [];
    const tiposData = (tiposResp.data as Catalogo[]) || [];

    setCategorias(categoriasData);
    setUnidades(unidadesData);
    setEstados(estadosData);
    setMarcas(marcasData);
    setUbicaciones(ubicacionesData);
    setTiposActivos(tiposData);

    if (!unidadMedida && unidadesData.length > 0) {
      setUnidadMedida(unidadesData[0].nombre);
    }

    if (!estado && estadosData.length > 0) {
      const disponible =
        estadosData.find((e) => e.nombre === "Disponible") || estadosData[0];

      setEstado(disponible.nombre);
    }
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
      alert("Error cargando artículos: " + error.message);
      setItems([]);
      return;
    }

    setItems((data as ItemInventario[]) || []);
  }

  async function refrescar() {
    if (!condominioId) return;
    await cargarTodo(condominioId);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setCodigo("");
    setNombre("");
    setTipoActivoId("");
    setCategoriaId("");
    setMarca("");
    setModelo("");
    setNumeroSerie("");
    setDescripcion("");
    setCantidad("1");
    setUnidadMedida(unidades[0]?.nombre || "");
    setEstado(
      estados.find((e) => e.nombre === "Disponible")?.nombre ||
        estados[0]?.nombre ||
        "",
    );
    setUbicacion("");
    setResponsable("");
    setFechaAdquisicion("");
    setCosto("0");
    setValorActual("0");
    setDepreciable(false);
    setFotoUrl("");
    setObservacion("");
  }

  function manejarTipoActivo(valor: string) {
    setTipoActivoId(valor);

    const tipo = tiposActivos.find((t) => String(t.id) === valor);
    setDepreciable(Boolean(tipo?.depreciable));
  }

  function manejarCosto(valor: string) {
    setCosto(valor);

    if (!valorActual || Number(valorActual) === 0) {
      setValorActual(valor);
    }
  }

  async function guardarArticulo(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!nombre.trim()) {
      alert("Debe indicar el nombre del artículo.");
      return;
    }

    if (!tipoActivoId) {
      alert("Debe seleccionar el tipo de activo.");
      return;
    }

    if (!categoriaId) {
      alert("Debe seleccionar la categoría.");
      return;
    }

    if (numero(cantidad) <= 0) {
      alert("La cantidad debe ser mayor que cero.");
      return;
    }

    const tipoActivo = tiposActivos.find((t) => String(t.id) === tipoActivoId);
    const categoria = categorias.find((c) => String(c.id) === categoriaId);

    const registro = {
      condominio_id: Number(condominioId),
      condominio: condominioNombre,
      codigo: codigo.trim() || null,
      nombre: nombre.trim(),
      tipo_activo_id: Number(tipoActivoId),
      tipo_activo: tipoActivo?.nombre || null,
      categoria_id: Number(categoriaId),
      categoria: categoria?.nombre || null,
      marca: marca.trim(),
      modelo: modelo.trim(),
      numero_serie: numeroSerie.trim(),
      descripcion: descripcion.trim(),
      cantidad: numero(cantidad),
      unidad_medida: unidadMedida,
      estado,
      ubicacion: ubicacion.trim(),
      responsable: responsable.trim(),
      fecha_adquisicion: fechaAdquisicion || null,
      costo: numero(costo),
      valor_actual: numero(valorActual),
      depreciable,
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
      cargarItems(condominioId);
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
    cargarItems(condominioId);
  }

  function editarArticulo(item: ItemInventario) {
    setEditandoId(item.id);
    setCodigo(item.codigo || "");
    setNombre(item.nombre || "");
    setTipoActivoId(item.tipo_activo_id ? String(item.tipo_activo_id) : "");
    setCategoriaId(item.categoria_id ? String(item.categoria_id) : "");
    setMarca(item.marca || "");
    setModelo(item.modelo || "");
    setNumeroSerie(item.numero_serie || "");
    setDescripcion(item.descripcion || "");
    setCantidad(String(item.cantidad || 1));
    setUnidadMedida(item.unidad_medida || "");
    setEstado(item.estado || "");
    setUbicacion(item.ubicacion || "");
    setResponsable(item.responsable || "");
    setFechaAdquisicion(item.fecha_adquisicion || "");
    setCosto(String(item.costo || 0));
    setValorActual(String(item.valor_actual || 0));
    setDepreciable(Boolean(item.depreciable));
    setFotoUrl(item.foto_url || "");
    setObservacion(item.observacion || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function eliminarArticulo(item: ItemInventario) {
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
    cargarItems(condominioId);
  }

  const categoriasFiltro = useMemo(() => {
    return [
      "Todos",
      ...Array.from(
        new Set(items.map((i) => i.categoria || "").filter(Boolean)),
      ).sort(),
    ];
  }, [items]);

  const tiposFiltro = useMemo(() => {
    return [
      "Todos",
      ...Array.from(
        new Set(items.map((i) => i.tipo_activo || "").filter(Boolean)),
      ).sort(),
    ];
  }, [items]);

  const ubicacionesFiltro = useMemo(() => {
    return [
      "Todos",
      ...Array.from(
        new Set(items.map((i) => i.ubicacion || "").filter(Boolean)),
      ).sort(),
    ];
  }, [items]);

  const estadosFiltro = useMemo(() => {
    return [
      "Todos",
      ...Array.from(
        new Set(items.map((i) => i.estado || "").filter(Boolean)),
      ).sort(),
    ];
  }, [items]);

  const itemsFiltrados = useMemo(() => {
    return items.filter((item) => {
      const texto = `${item.codigo || ""} ${item.nombre || ""} ${
        item.tipo_activo || ""
      } ${item.categoria || ""} ${item.marca || ""} ${item.modelo || ""} ${
        item.numero_serie || ""
      } ${item.descripcion || ""} ${item.ubicacion || ""} ${
        item.responsable || ""
      }`
        .toLowerCase()
        .trim();

      return (
        texto.includes(buscar.toLowerCase().trim()) &&
        (filtroEstado === "Todos" || item.estado === filtroEstado) &&
        (filtroCategoria === "Todos" || item.categoria === filtroCategoria) &&
        (filtroTipoActivo === "Todos" ||
          item.tipo_activo === filtroTipoActivo) &&
        (filtroUbicacion === "Todos" || item.ubicacion === filtroUbicacion)
      );
    });
  }, [
    items,
    buscar,
    filtroEstado,
    filtroCategoria,
    filtroTipoActivo,
    filtroUbicacion,
  ]);

  const totalArticulos = itemsFiltrados.length;

  const totalCantidad = itemsFiltrados.reduce(
    (sum, i) => sum + numero(i.cantidad),
    0,
  );

  const totalDisponible = itemsFiltrados.filter(
    (i) => i.estado === "Disponible",
  ).length;

  const totalEnUso = itemsFiltrados.filter(
    (i) => i.estado === "En Uso" || i.estado === "En uso",
  ).length;

  const totalReparacion = itemsFiltrados.filter(
    (i) => i.estado === "En Reparación" || i.estado === "En reparación",
  ).length;

  const totalBaja = itemsFiltrados.filter((i) =>
    ["Dañado", "Perdido", "Dado de Baja", "Dado de baja"].includes(
      i.estado || "",
    ),
  ).length;

  const valorCompra = itemsFiltrados.reduce(
    (sum, i) => sum + numero(i.costo) * numero(i.cantidad),
    0,
  );

  const valorActualTotal = itemsFiltrados.reduce(
    (sum, i) => sum + numero(i.valor_actual) * numero(i.cantidad),
    0,
  );

  function imprimir() {
    window.print();
  }

  function exportarCSV() {
    const encabezados = [
      "Código",
      "Nombre",
      "Tipo Activo",
      "Categoría",
      "Marca",
      "Modelo",
      "No. Serie",
      "Cantidad",
      "Unidad",
      "Estado",
      "Ubicación",
      "Responsable",
      "Fecha Adquisición",
      "Costo",
      "Valor Actual",
      "Depreciable",
      "Observación",
    ];

    const filas = itemsFiltrados.map((i) => [
      i.codigo || "",
      i.nombre || "",
      i.tipo_activo || "",
      i.categoria || "",
      i.marca || "",
      i.modelo || "",
      i.numero_serie || "",
      numero(i.cantidad).toFixed(2),
      i.unidad_medida || "",
      i.estado || "",
      i.ubicacion || "",
      i.responsable || "",
      i.fecha_adquisicion || "",
      numero(i.costo).toFixed(2),
      numero(i.valor_actual).toFixed(2),
      i.depreciable ? "Sí" : "No",
      i.observacion || "",
    ]);

    const contenido = [encabezados, ...filas]
      .map((fila) =>
        fila.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `inventario_articulos_${condominioNombre || "condominio"}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <PageContainer>
      <div className="no-print">
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
              label: "Catálogos",
              icon: Tags,
            },
          ]}
        />

        <ModuleToolbar
          title="Artículos de Inventario"
          subtitle={`Registro de herramientas, equipos, materiales y activos. Condominio: ${
            condominioNombre || "No identificado"
          }.`}
          icon={Boxes}
          actions={
            <ModuleActions
              onRefresh={refrescar}
              extra={
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportarCSV}
                    className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Exportar
                  </button>

                  <button
                    type="button"
                    onClick={imprimir}
                    className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir / PDF
                  </button>
                </div>
              }
            />
          }
        />
      </div>

      <div className="no-print grid grid-cols-1 gap-5 md:grid-cols-4 xl:grid-cols-7">
        <InfoBox label="Artículos" value={`${totalArticulos}`} />
        <InfoBox label="Cantidad total" value={totalCantidad.toFixed(2)} />
        <InfoBox
          label="Disponibles"
          value={`${totalDisponible}`}
          tone="emerald"
        />
        <InfoBox label="En uso" value={`${totalEnUso}`} tone="blue" />
        <InfoBox
          label="Reparación"
          value={`${totalReparacion}`}
          tone="yellow"
        />
        <InfoBox label="Baja / Perdidos" value={`${totalBaja}`} tone="red" />
        <InfoBox
          label="Valor actual"
          value={`RD$ ${moneda(valorActualTotal)}`}
          tone="slate"
        />
      </div>

      <div className="no-print">
        <SectionCard
          title={editandoId ? "Modificar artículo" : "Nuevo artículo"}
          subtitle="Complete la información del activo o material del condominio."
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
                Nuevo registro
              </div>
            )
          }
        >
          <form
            onSubmit={guardarArticulo}
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <Input
              label="Código"
              value={codigo}
              onChange={setCodigo}
              placeholder="INV-0001"
            />

            <div className="md:col-span-2">
              <Input
                label="Nombre *"
                value={nombre}
                onChange={setNombre}
                placeholder="Ej. Escalera de aluminio 12 pies"
              />
            </div>

            <Select
              label="Tipo activo *"
              value={tipoActivoId}
              onChange={manejarTipoActivo}
              options={tiposActivos.map((item) => ({
                value: String(item.id),
                label: item.nombre,
              }))}
            />

            <Select
              label="Categoría *"
              value={categoriaId}
              onChange={setCategoriaId}
              options={categorias.map((item) => ({
                value: String(item.id),
                label: item.nombre,
              }))}
            />

            <Select
              label="Marca"
              value={marca}
              onChange={setMarca}
              options={marcas.map((item) => ({
                value: item.nombre,
                label: item.nombre,
              }))}
            />

            <Input label="Modelo" value={modelo} onChange={setModelo} />

            <Input
              label="No. Serie"
              value={numeroSerie}
              onChange={setNumeroSerie}
            />

            <Input
              label="Cantidad"
              type="number"
              step="0.01"
              value={cantidad}
              onChange={setCantidad}
            />

            <Select
              label="Unidad"
              value={unidadMedida}
              onChange={setUnidadMedida}
              options={unidades.map((item) => ({
                value: item.nombre,
                label: `${item.nombre}${
                  item.abreviatura ? ` (${item.abreviatura})` : ""
                }`,
              }))}
            />

            <Select
              label="Estado"
              value={estado}
              onChange={setEstado}
              options={estados.map((item) => ({
                value: item.nombre,
                label: item.nombre,
              }))}
            />

            <Select
              label="Ubicación"
              value={ubicacion}
              onChange={setUbicacion}
              options={ubicaciones.map((item) => ({
                value: item.nombre,
                label: item.nombre,
              }))}
            />

            <Input
              label="Responsable"
              value={responsable}
              onChange={setResponsable}
              placeholder="Empleado o encargado"
            />

            <Input
              label="Fecha adquisición"
              type="date"
              value={fechaAdquisicion}
              onChange={setFechaAdquisicion}
            />

            <Input
              label="Costo adquisición"
              type="number"
              step="0.01"
              value={costo}
              onChange={manejarCosto}
            />

            <Input
              label="Valor actual"
              type="number"
              step="0.01"
              value={valorActual}
              onChange={setValorActual}
            />

            <div className="flex items-center gap-3 rounded-xl border bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                checked={depreciable}
                onChange={(e) => setDepreciable(e.target.checked)}
                className="h-5 w-5"
              />
              <span className="text-sm font-semibold">Depreciable</span>
            </div>

            <div className="md:col-span-2">
              <Input
                label="Foto URL"
                value={fotoUrl}
                onChange={setFotoUrl}
                placeholder="URL de imagen o evidencia"
              />
            </div>

            <Textarea
              label="Descripción"
              value={descripcion}
              onChange={setDescripcion}
            />

            <Textarea
              label="Observación"
              value={observacion}
              onChange={setObservacion}
            />

            <div className="flex flex-col gap-3 md:col-span-3 md:flex-row">
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
      </div>

      <div className="no-print">
        <SectionCard
          title="Filtros"
          subtitle="Busque y filtre artículos por tipo, categoría, estado y ubicación."
          action={
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <Filter className="h-4 w-4" />
              Registros: {itemsFiltrados.length}
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />

              <input
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="w-full rounded-xl border px-10 py-3 text-sm"
                placeholder="Buscar por código, nombre, marca, serie..."
              />
            </div>

            <FilterSelect
              value={filtroTipoActivo}
              onChange={setFiltroTipoActivo}
              options={tiposFiltro}
              todosLabel="Todos los tipos"
            />

            <FilterSelect
              value={filtroCategoria}
              onChange={setFiltroCategoria}
              options={categoriasFiltro}
              todosLabel="Todas las categorías"
            />

            <FilterSelect
              value={filtroEstado}
              onChange={setFiltroEstado}
              options={estadosFiltro}
              todosLabel="Todos los estados"
            />

            <FilterSelect
              value={filtroUbicacion}
              onChange={setFiltroUbicacion}
              options={ubicacionesFiltro}
              todosLabel="Todas las ubicaciones"
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Listado de artículos"
        subtitle="Consulta general de artículos registrados en el inventario."
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
        <div className="hidden print:block mb-5 border-b pb-3">
          <h1 className="text-center text-2xl font-black">
            INVENTARIO DE ARTÍCULOS
          </h1>
          <p className="text-center font-bold">{condominioNombre}</p>
          <p className="text-center text-sm">
            Fecha impresión: {new Date().toLocaleDateString("es-DO")}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Cargando artículos...</p>
        ) : itemsFiltrados.length === 0 ? (
          <EmptyState
            title="Sin artículos"
            description="No hay artículos registrados con esta consulta."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Artículo</th>
                <th className="px-4 py-3 text-left">Tipo / Categoría</th>
                <th className="px-4 py-3 text-left">Marca / Serie</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3 text-left">Ubicación</th>
                <th className="px-4 py-3 text-left">Responsable</th>
                <th className="px-4 py-3 text-right">Costo</th>
                <th className="px-4 py-3 text-right">Valor actual</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="no-print px-4 py-3 text-center">Acciones</th>
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
                    {item.descripcion && (
                      <p className="text-xs text-slate-500">
                        {item.descripcion}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-bold">{item.tipo_activo || "-"}</p>
                    <p className="text-xs text-slate-500">
                      {item.categoria || "-"}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    <p>
                      {item.marca || "-"} {item.modelo || ""}
                    </p>
                    <p className="text-xs text-slate-500">
                      Serie: {item.numero_serie || "-"}
                    </p>
                  </td>

                  <td className="px-4 py-3 text-right font-bold">
                    {numero(item.cantidad).toFixed(2)}{" "}
                    {item.unidad_medida || ""}
                  </td>

                  <td className="px-4 py-3">{item.ubicacion || "-"}</td>

                  <td className="px-4 py-3">{item.responsable || "-"}</td>

                  <td className="px-4 py-3 text-right">
                    RD$ {moneda(item.costo)}
                  </td>

                  <td className="px-4 py-3 text-right font-black text-slate-900">
                    RD$ {moneda(item.valor_actual)}
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

                  <td className="no-print px-4 py-3">
                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => editarArticulo(item)}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminarArticulo(item)}
                        className="inline-flex items-center gap-1 rounded-xl bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              <tr className="bg-slate-100 font-black">
                <td className="px-4 py-3" colSpan={3}>
                  Totales
                </td>

                <td className="px-4 py-3 text-right">
                  {totalCantidad.toFixed(2)}
                </td>

                <td className="px-4 py-3" colSpan={2}></td>

                <td className="px-4 py-3 text-right">
                  RD$ {moneda(valorCompra)}
                </td>

                <td className="px-4 py-3 text-right">
                  RD$ {moneda(valorActualTotal)}
                </td>

                <td className="px-4 py-3 text-center">-</td>

                <td className="no-print px-4 py-3 text-center">-</td>
              </tr>
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          body {
            background: white !important;
            font-size: 10px !important;
          }

          @page {
            size: landscape;
            margin: 0.25in;
          }
        }
      `}</style>
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

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="md:col-span-3">
      <label className="mb-1 block text-sm font-semibold">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border px-4 py-3 text-sm"
        rows={2}
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
      >
        <option value="">Seleccione</option>
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  todosLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  todosLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
    >
      {options.map((item) => (
        <option key={item} value={item}>
          {item === "Todos" ? todosLabel : item}
        </option>
      ))}
    </select>
  );
}