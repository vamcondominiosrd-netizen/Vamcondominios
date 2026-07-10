"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  BarChart3,
  Boxes,
  Download,
  Filter,
  Package,
  Printer,
  RefreshCw,
  Save,
  Search,
  Tags,
  Trash2,
  Wrench,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

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

function numero(valor: string | number | null | undefined) {
  return Number(valor || 0);
}

function fecha(valor: string | null | undefined) {
  if (!valor) return "-";

  const limpio = String(valor).split("T")[0];
  const partes = limpio.split("-");

  if (partes.length !== 3) return limpio;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function movimientoClass(tipo?: string | null) {
  const valor = String(tipo || "").toLowerCase();

  if (valor.includes("entrada") || valor.includes("devolución")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  if (valor.includes("asignación") || valor.includes("salida")) {
    return "bg-blue-50 text-blue-700 border-blue-100";
  }

  if (valor.includes("reparación")) {
    return "bg-yellow-50 text-yellow-700 border-yellow-100";
  }

  if (valor.includes("baja")) {
    return "bg-red-50 text-red-700 border-red-100";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

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
    new Date().toISOString().slice(0, 10),
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
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";
    const usuario = localStorage.getItem("usuario_nombre") || "Administración";

    setCondominioId(id);
    setCondominioNombre(nombre);
    setUsuarioNombre(usuario);
    setResponsable(usuario);

    if (!id) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarTodo(id);
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
        "id, codigo, nombre, categoria, tipo_activo, cantidad, unidad_medida, estado, ubicacion, responsable",
      )
      .eq("condominio_id", Number(id))
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando artículos: " + error.message);
      setItems([]);
      return;
    }

    setItems((data as ItemInventario[]) || []);
  }

  async function cargarTiposMovimiento(id: string) {
    let { data, error } = await supabase
      .from("inventario_tipos_movimientos")
      .select("id, nombre, descripcion, afecta_estado, estado")
      .eq("condominio_id", Number(id))
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });

    if (error) {
      const respuestaAlterna = await supabase
        .from("inventario_tipos_movimiento")
        .select("id, nombre, descripcion, afecta_estado, estado")
        .eq("condominio_id", Number(id))
        .eq("estado", "Activo")
        .order("nombre", { ascending: true });

      data = respuestaAlterna.data;
      error = respuestaAlterna.error;
    }

    if (error) {
      alert("Error cargando tipos de movimiento: " + error.message);
      setTiposMovimiento([]);
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
      setUbicaciones([]);
      return;
    }

    setUbicaciones((data as Ubicacion[]) || []);
  }

  async function cargarMovimientos(id: string) {
    setLoading(true);

    let query = supabase
      .from("inventario_movimientos")
      .select(
        `
        *,
        inventario_items(codigo, nombre, categoria, estado)
      `,
      )
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
      setMovimientos([]);
      return;
    }

    setMovimientos((data as Movimiento[]) || []);
  }

  async function refrescar() {
    if (!condominioId) return;
    await cargarTodo(condominioId);
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

    setGuardando(true);

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
      setGuardando(false);
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
      updateItem.responsable =
        responsable.trim() || usuarioNombre || "Administración";
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
        setGuardando(false);
        alert(
          "Movimiento guardado, pero ocurrió un error actualizando el artículo: " +
            updateError.message,
        );
        cargarTodo(condominioId);
        return;
      }
    }

    setGuardando(false);

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
      ...Array.from(
        new Set(
          movimientos.map((m) => m.tipo_movimiento || "").filter(Boolean),
        ),
      ).sort(),
    ];
  }, [movimientos]);

  const articulosFiltro = useMemo(() => {
    return [
      "Todos",
      ...Array.from(
        new Set(
          movimientos
            .map((m) => m.inventario_items?.nombre || "")
            .filter((x) => x.trim() !== ""),
        ),
      ).sort(),
    ];
  }, [movimientos]);

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((mov) => {
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
  }, [movimientos, buscar, filtroTipo, filtroArticulo]);

  const totalMovimientos = movimientosFiltrados.length;

  const totalAsignaciones = movimientosFiltrados.filter(
    (m) => m.tipo_movimiento === "Asignación",
  ).length;

  const totalDevoluciones = movimientosFiltrados.filter(
    (m) => m.tipo_movimiento === "Devolución",
  ).length;

  const totalReparaciones = movimientosFiltrados.filter(
    (m) => m.tipo_movimiento === "Reparación",
  ).length;

  const totalBajas = movimientosFiltrados.filter(
    (m) => m.tipo_movimiento === "Baja",
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
        fila.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `inventario_movimientos_${
      condominioNombre || "condominio"
    }.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <PageContainer>
      <div className="no-print">
        <ModuleMenu
          title="Inventario"
          subtitle="Control de activos, artículos, movimientos, mantenimiento y reportes del condominio."
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
              href: "/administracion/inventario/mantenimiento",
              label: "Mantenimiento",
              icon: Wrench,
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
          title="Movimientos de Inventario"
          subtitle={`Entradas, salidas, asignaciones, devoluciones, reparaciones, ajustes y bajas. Condominio: ${
            condominioNombre || "No identificado"
          }.`}
          icon={ArrowRightLeft}
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

      <div className="no-print grid grid-cols-1 gap-5 md:grid-cols-5">
        <InfoBox label="Movimientos" value={`${totalMovimientos}`} />
        <InfoBox label="Asignaciones" value={`${totalAsignaciones}`} tone="blue" />
        <InfoBox
          label="Devoluciones"
          value={`${totalDevoluciones}`}
          tone="emerald"
        />
        <InfoBox
          label="Reparaciones"
          value={`${totalReparaciones}`}
          tone="yellow"
        />
        <InfoBox label="Bajas" value={`${totalBajas}`} tone="red" />
      </div>

      <div className="no-print">
        <SectionCard
          title="Registrar movimiento"
          subtitle="Registre el movimiento del artículo y actualice ubicación, responsable o estado según aplique."
          action={
            <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
              Nuevo movimiento
            </div>
          }
        >
          <form
            onSubmit={guardarMovimiento}
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <div>
              <label className="mb-1 block text-sm font-semibold">
                Artículo *
              </label>

              <select
                value={itemId}
                onChange={(e) => seleccionarItem(e.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
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
              <label className="mb-1 block text-sm font-semibold">
                Tipo de movimiento *
              </label>

              <select
                value={tipoMovimientoId}
                onChange={(e) => setTipoMovimientoId(e.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
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

            <Input
              label="Fecha"
              type="date"
              value={fechaMovimiento}
              onChange={setFechaMovimiento}
            />

            <Input
              label="Cantidad"
              type="number"
              step="0.01"
              value={cantidad}
              onChange={setCantidad}
            />

            <Input
              label="Responsable"
              value={responsable}
              onChange={setResponsable}
              placeholder="Empleado o encargado"
            />

            <Input
              label="Ubicación origen"
              value={ubicacionOrigen}
              onChange={setUbicacionOrigen}
              placeholder="Ubicación actual"
            />

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Ubicación destino
              </label>

              <select
                value={ubicacionDestino}
                onChange={(e) => seleccionarDestino(e.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
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
              <Input
                label="Observación"
                value={observacion}
                onChange={setObservacion}
                placeholder="Detalle del movimiento"
              />
            </div>

            <div className="flex flex-col gap-3 md:col-span-3 md:flex-row">
              <button
                type="submit"
                disabled={guardando}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {guardando ? "Guardando..." : "Guardar movimiento"}
              </button>

              <button
                type="button"
                onClick={limpiarFormulario}
                className="rounded-xl bg-slate-700 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                Limpiar
              </button>
            </div>
          </form>
        </SectionCard>
      </div>

      <div className="no-print">
        <SectionCard
          title="Filtros"
          subtitle="Busque y filtre movimientos por artículo, tipo, responsable, ubicación o fecha."
          action={
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <Filter className="h-4 w-4" />
              Registros: {movimientosFiltrados.length}
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
                placeholder="Buscar artículo, responsable, ubicación..."
              />
            </div>

            <FilterSelect
              value={filtroTipo}
              onChange={setFiltroTipo}
              options={tiposFiltro}
              todosLabel="Todos los movimientos"
            />

            <FilterSelect
              value={filtroArticulo}
              onChange={setFiltroArticulo}
              options={articulosFiltro}
              todosLabel="Todos los artículos"
            />

            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
            />

            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row">
            <button
              type="button"
              onClick={() => condominioId && cargarMovimientos(condominioId)}
              className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800"
            >
              Buscar / Actualizar
            </button>

            <button
              type="button"
              onClick={() => {
                setBuscar("");
                setFiltroTipo("Todos");
                setFiltroArticulo("Todos");
                setFechaDesde("");
                setFechaHasta("");
              }}
              className="rounded-xl bg-slate-700 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              Limpiar filtros
            </button>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Historial de movimientos"
        subtitle="Consulta general de movimientos registrados en el inventario."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : (
            <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
              Movimientos: {movimientosFiltrados.length}
            </div>
          )
        }
      >
        <div className="mb-5 hidden border-b pb-3 print:block">
          <h1 className="text-center text-2xl font-black">
            MOVIMIENTOS DE INVENTARIO
          </h1>
          <p className="text-center font-bold">{condominioNombre}</p>
          <p className="text-center text-sm">
            Fecha impresión: {new Date().toLocaleDateString("es-DO")}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Cargando movimientos...</p>
        ) : movimientosFiltrados.length === 0 ? (
          <EmptyState
            title="Sin movimientos"
            description="No hay movimientos registrados con esta consulta."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Artículo</th>
                <th className="px-4 py-3 text-center">Movimiento</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3 text-left">Responsable</th>
                <th className="px-4 py-3 text-left">Origen</th>
                <th className="px-4 py-3 text-left">Destino</th>
                <th className="px-4 py-3 text-left">Observación</th>
                <th className="no-print px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {movimientosFiltrados.map((mov) => (
                <tr key={mov.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold">
                    {fecha(mov.fecha_movimiento)}
                  </td>

                  <td className="min-w-64 px-4 py-3">
                    <p className="font-black text-slate-900">
                      {mov.inventario_items?.nombre || "-"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Código: {mov.inventario_items?.codigo || mov.item_id}
                    </p>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${movimientoClass(
                        mov.tipo_movimiento,
                      )}`}
                    >
                      {mov.tipo_movimiento}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right font-black">
                    {numero(mov.cantidad).toFixed(2)}
                  </td>

                  <td className="px-4 py-3">{mov.responsable || "-"}</td>

                  <td className="px-4 py-3">
                    {mov.ubicacion_origen || "-"}
                  </td>

                  <td className="px-4 py-3">
                    {mov.ubicacion_destino || "-"}
                  </td>

                  <td className="min-w-64 px-4 py-3">
                    {mov.observacion || "-"}
                  </td>

                  <td className="no-print px-4 py-3">
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => eliminarMovimiento(mov)}
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