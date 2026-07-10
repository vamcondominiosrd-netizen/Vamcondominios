"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Edit,
  Filter,
  History,
  Package,
  RefreshCw,
  Save,
  Search,
  Tags,
  Trash2,
  Wrench,
  XCircle,
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
  ubicacion: string | null;
  estado: string | null;
};

type Mantenimiento = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  item_id: number;
  codigo_activo: string | null;
  nombre_activo: string | null;
  categoria: string | null;
  ubicacion: string | null;
  fecha_ultimo_mantenimiento: string | null;
  fecha_proximo_mantenimiento: string | null;
  frecuencia_dias: number | null;
  proveedor: string | null;
  responsable: string | null;
  costo_ultimo: number | null;
  costo_acumulado: number | null;
  prioridad: string | null;
  dias_alerta: number | null;
  requiere_apagado: boolean | null;
  estado: string | null;
  observacion: string | null;
  created_by: string | null;
  created_at: string | null;
};

type Historial = {
  id: number;
  mantenimiento_id: number;
  fecha_mantenimiento: string;
  proveedor: string | null;
  responsable: string | null;
  costo: number | null;
  descripcion_trabajo: string | null;
  observacion: string | null;
  created_by: string | null;
  created_at: string | null;
};

const estados = ["Pendiente", "Programado", "Realizado", "Vencido", "Cancelado"];
const prioridades = ["Baja", "Normal", "Alta", "Crítica"];

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

function sumarDias(fechaBase: string, dias: number) {
  const fecha = new Date(`${fechaBase}T00:00:00`);
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

function diasHasta(fechaObjetivo: string | null | undefined) {
  if (!fechaObjetivo) return 999999;

  const hoy = new Date(new Date().toISOString().slice(0, 10));
  const futuro = new Date(`${fechaObjetivo}T00:00:00`);

  return Math.ceil(
    (futuro.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function estadoClass(estado?: string | null) {
  if (estado === "Programado") {
    return "bg-blue-50 text-blue-700 border-blue-100";
  }

  if (estado === "Realizado") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  if (estado === "Vencido") {
    return "bg-red-50 text-red-700 border-red-100";
  }

  if (estado === "Cancelado") {
    return "bg-slate-100 text-slate-700 border-slate-200";
  }

  return "bg-yellow-50 text-yellow-700 border-yellow-100";
}

function prioridadClass(prioridad?: string | null) {
  if (prioridad === "Crítica") {
    return "bg-red-50 text-red-700 border-red-100";
  }

  if (prioridad === "Alta") {
    return "bg-orange-50 text-orange-700 border-orange-100";
  }

  if (prioridad === "Baja") {
    return "bg-slate-50 text-slate-700 border-slate-200";
  }

  return "bg-blue-50 text-blue-700 border-blue-100";
}

export default function InventarioMantenimientoPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");

  const [items, setItems] = useState<ItemInventario[]>([]);
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [historial, setHistorial] = useState<Historial[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [historialDeId, setHistorialDeId] = useState<number | null>(null);

  const [itemId, setItemId] = useState("");
  const [codigoActivo, setCodigoActivo] = useState("");
  const [nombreActivo, setNombreActivo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [fechaUltimo, setFechaUltimo] = useState("");
  const [fechaProximo, setFechaProximo] = useState("");
  const [frecuenciaDias, setFrecuenciaDias] = useState("30");
  const [proveedor, setProveedor] = useState("");
  const [responsable, setResponsable] = useState("");
  const [costoUltimo, setCostoUltimo] = useState("0");
  const [costoAcumulado, setCostoAcumulado] = useState("0");
  const [prioridad, setPrioridad] = useState("Normal");
  const [diasAlerta, setDiasAlerta] = useState("7");
  const [requiereApagado, setRequiereApagado] = useState(false);
  const [estado, setEstado] = useState("Pendiente");
  const [observacion, setObservacion] = useState("");

  const [realizarId, setRealizarId] = useState<number | null>(null);
  const [fechaRealizado, setFechaRealizado] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [proveedorRealizado, setProveedorRealizado] = useState("");
  const [responsableRealizado, setResponsableRealizado] = useState("");
  const [costoRealizado, setCostoRealizado] = useState("0");
  const [descripcionTrabajo, setDescripcionTrabajo] = useState("");
  const [observacionRealizado, setObservacionRealizado] = useState("");
  const [generarSolicitudPago, setGenerarSolicitudPago] = useState(false);

  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState("Todos");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");

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
    setResponsableRealizado(usuario);

    if (!id) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarTodo(id);
  }, []);

  async function cargarTodo(id: string) {
    await Promise.all([cargarItems(id), cargarMantenimientos(id)]);
  }

  async function cargarItems(id: string) {
    const { data, error } = await supabase
      .from("inventario_items")
      .select("id, codigo, nombre, categoria, ubicacion, estado")
      .eq("condominio_id", Number(id))
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando artículos: " + error.message);
      setItems([]);
      return;
    }

    setItems((data as ItemInventario[]) || []);
  }

  async function cargarMantenimientos(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("inventario_mantenimiento")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("fecha_proximo_mantenimiento", { ascending: true });

    setLoading(false);

    if (error) {
      alert("Error cargando mantenimientos: " + error.message);
      setMantenimientos([]);
      return;
    }

    const hoy = new Date().toISOString().slice(0, 10);

    const lista = ((data as Mantenimiento[]) || []).map((m) => {
      if (
        m.estado !== "Realizado" &&
        m.estado !== "Cancelado" &&
        m.fecha_proximo_mantenimiento &&
        m.fecha_proximo_mantenimiento < hoy
      ) {
        return { ...m, estado: "Vencido" };
      }

      return m;
    });

    setMantenimientos(lista);
  }

  async function refrescar() {
    if (!condominioId) return;
    await cargarTodo(condominioId);
  }

  async function cargarHistorial(mantenimientoId: number) {
    const { data, error } = await supabase
      .from("inventario_mantenimiento_historial")
      .select("*")
      .eq("mantenimiento_id", mantenimientoId)
      .order("fecha_mantenimiento", { ascending: false });

    if (error) {
      alert("Error cargando historial: " + error.message);
      setHistorial([]);
      return;
    }

    setHistorial((data as Historial[]) || []);
    setHistorialDeId(mantenimientoId);
  }

  function seleccionarActivo(valor: string) {
    setItemId(valor);

    const item = items.find((i) => String(i.id) === valor);

    setCodigoActivo(item?.codigo || "");
    setNombreActivo(item?.nombre || "");
    setCategoria(item?.categoria || "");
    setUbicacion(item?.ubicacion || "");
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setItemId("");
    setCodigoActivo("");
    setNombreActivo("");
    setCategoria("");
    setUbicacion("");
    setFechaUltimo("");
    setFechaProximo("");
    setFrecuenciaDias("30");
    setProveedor("");
    setResponsable(usuarioNombre || "Administración");
    setCostoUltimo("0");
    setCostoAcumulado("0");
    setPrioridad("Normal");
    setDiasAlerta("7");
    setRequiereApagado(false);
    setEstado("Pendiente");
    setObservacion("");
  }

  async function guardarMantenimiento(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!itemId) {
      alert("Debe seleccionar el activo.");
      return;
    }

    if (!fechaProximo) {
      alert("Debe indicar la fecha del próximo mantenimiento.");
      return;
    }

    const item = items.find((i) => String(i.id) === itemId);

    if (!item) {
      alert("Activo no encontrado.");
      return;
    }

    const registro = {
      condominio_id: Number(condominioId),
      condominio: condominioNombre,
      item_id: Number(itemId),
      codigo_activo: codigoActivo || item.codigo || null,
      nombre_activo: nombreActivo || item.nombre,
      categoria: categoria || item.categoria || null,
      ubicacion: ubicacion || item.ubicacion || null,
      fecha_ultimo_mantenimiento: fechaUltimo || null,
      fecha_proximo_mantenimiento: fechaProximo,
      frecuencia_dias: Number(frecuenciaDias || 30),
      proveedor: proveedor.trim(),
      responsable: responsable.trim(),
      costo_ultimo: numero(costoUltimo),
      costo_acumulado: numero(costoAcumulado),
      prioridad,
      dias_alerta: Number(diasAlerta || 7),
      requiere_apagado: requiereApagado,
      estado,
      observacion: observacion.trim(),
      created_by: usuarioNombre,
    };

    setGuardando(true);

    if (editandoId) {
      const { error } = await supabase
        .from("inventario_mantenimiento")
        .update(registro)
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      setGuardando(false);

      if (error) {
        alert("Error modificando mantenimiento: " + error.message);
        return;
      }

      alert("Mantenimiento modificado correctamente.");
      limpiarFormulario();
      cargarMantenimientos(condominioId);
      return;
    }

    const { error } = await supabase
      .from("inventario_mantenimiento")
      .insert([registro]);

    setGuardando(false);

    if (error) {
      alert("Error guardando mantenimiento: " + error.message);
      return;
    }

    alert("Mantenimiento programado correctamente.");
    limpiarFormulario();
    cargarMantenimientos(condominioId);
  }

  function editarMantenimiento(m: Mantenimiento) {
    setEditandoId(m.id);
    setItemId(String(m.item_id));
    setCodigoActivo(m.codigo_activo || "");
    setNombreActivo(m.nombre_activo || "");
    setCategoria(m.categoria || "");
    setUbicacion(m.ubicacion || "");
    setFechaUltimo(m.fecha_ultimo_mantenimiento || "");
    setFechaProximo(m.fecha_proximo_mantenimiento || "");
    setFrecuenciaDias(String(m.frecuencia_dias || 30));
    setProveedor(m.proveedor || "");
    setResponsable(m.responsable || "");
    setCostoUltimo(String(m.costo_ultimo || 0));
    setCostoAcumulado(String(m.costo_acumulado || 0));
    setPrioridad(m.prioridad || "Normal");
    setDiasAlerta(String(m.dias_alerta || 7));
    setRequiereApagado(Boolean(m.requiere_apagado));
    setEstado(m.estado || "Pendiente");
    setObservacion(m.observacion || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function abrirRealizar(m: Mantenimiento) {
    setRealizarId(m.id);
    setFechaRealizado(new Date().toISOString().slice(0, 10));
    setProveedorRealizado(m.proveedor || "");
    setResponsableRealizado(m.responsable || usuarioNombre || "Administración");
    setCostoRealizado(String(m.costo_ultimo || 0));
    setDescripcionTrabajo("");
    setObservacionRealizado("");
    setGenerarSolicitudPago(false);
  }

  async function obtenerProximoNumeroSolicitud() {
    const { data, error } = await supabase
      .from("solicitudes_pago")
      .select("numero_solicitud")
      .eq("condominio_id", Number(condominioId))
      .order("numero_solicitud", { ascending: false })
      .limit(1);

    if (error) throw new Error(error.message);

    const ultimo =
      data && data.length > 0 ? Number(data[0].numero_solicitud || 0) : 0;

    return ultimo + 1;
  }

  async function crearSolicitudPagoMantenimiento(m: Mantenimiento, costo: number) {
    const numeroSolicitud = await obtenerProximoNumeroSolicitud();

    const detalle = [
      "Solicitud generada automáticamente desde Inventario / Mantenimiento Preventivo.",
      `Activo: ${m.nombre_activo || "-"}`,
      `Código: ${m.codigo_activo || "-"}`,
      `Categoría: ${m.categoria || "-"}`,
      `Ubicación: ${m.ubicacion || "-"}`,
      `Proveedor: ${proveedorRealizado || "-"}`,
      `Responsable: ${responsableRealizado || "-"}`,
      `Fecha mantenimiento: ${fechaRealizado || "-"}`,
      `Descripción: ${descripcionTrabajo || "-"}`,
      `Observación: ${observacionRealizado || "-"}`,
    ].join("\n");

    const { error } = await supabase.from("solicitudes_pago").insert([
      {
        condominio_id: Number(condominioId),
        condominio: condominioNombre,
        fecha_solicitud: new Date().toISOString().slice(0, 10),
        concepto: `Mantenimiento Preventivo - ${m.nombre_activo || "Activo"}`,
        detalle,
        monto: costo,
        itbis: 0,
        total: costo,
        metodo_pago: "Pendiente",
        prioridad: m.prioridad || "Normal",
        estado: "Pendiente aprobación tesorero",
        created_by: usuarioNombre,
        numero_solicitud: numeroSolicitud,
      },
    ]);

    if (error) throw new Error(error.message);
  }

  async function registrarRealizado(e: React.FormEvent) {
    e.preventDefault();

    if (!realizarId) return;

    const m = mantenimientos.find((x) => x.id === realizarId);

    if (!m) {
      alert("Mantenimiento no encontrado.");
      return;
    }

    if (!fechaRealizado) {
      alert("Debe indicar la fecha realizada.");
      return;
    }

    const costo = numero(costoRealizado);
    const proximo = sumarDias(fechaRealizado, Number(m.frecuencia_dias || 30));
    const acumulado = numero(m.costo_acumulado) + costo;

    const { error: histError } = await supabase
      .from("inventario_mantenimiento_historial")
      .insert([
        {
          mantenimiento_id: m.id,
          fecha_mantenimiento: fechaRealizado,
          proveedor: proveedorRealizado.trim(),
          responsable: responsableRealizado.trim(),
          costo,
          descripcion_trabajo: descripcionTrabajo.trim(),
          observacion: observacionRealizado.trim(),
          created_by: usuarioNombre,
        },
      ]);

    if (histError) {
      alert("Error guardando historial: " + histError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("inventario_mantenimiento")
      .update({
        fecha_ultimo_mantenimiento: fechaRealizado,
        fecha_proximo_mantenimiento: proximo,
        costo_ultimo: costo,
        costo_acumulado: acumulado,
        proveedor: proveedorRealizado.trim(),
        responsable: responsableRealizado.trim(),
        estado: "Programado",
      })
      .eq("id", m.id)
      .eq("condominio_id", Number(condominioId));

    if (updateError) {
      alert(
        "Historial guardado, pero error actualizando mantenimiento: " +
          updateError.message,
      );
      return;
    }

    if (generarSolicitudPago && costo > 0) {
      try {
        await crearSolicitudPagoMantenimiento(m, costo);
      } catch (err: any) {
        alert(
          "Mantenimiento registrado, pero ocurrió un error creando la solicitud de pago: " +
            err.message,
        );
        setRealizarId(null);
        cargarMantenimientos(condominioId);
        return;
      }
    }

    alert(
      generarSolicitudPago && costo > 0
        ? "Mantenimiento realizado y solicitud de pago generada correctamente."
        : "Mantenimiento realizado correctamente.",
    );

    setRealizarId(null);
    cargarMantenimientos(condominioId);
  }

  async function eliminarMantenimiento(m: Mantenimiento) {
    const confirmar = confirm(
      `¿Seguro que desea eliminar el mantenimiento de ${m.nombre_activo}?`,
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("inventario_mantenimiento")
      .delete()
      .eq("id", m.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error eliminando mantenimiento: " + error.message);
      return;
    }

    alert("Mantenimiento eliminado correctamente.");
    cargarMantenimientos(condominioId);
  }

  const categoriasFiltro = useMemo(() => {
    return [
      "Todos",
      ...Array.from(
        new Set(mantenimientos.map((m) => m.categoria || "").filter(Boolean)),
      ).sort(),
    ];
  }, [mantenimientos]);

  const mantenimientosFiltrados = useMemo(() => {
    return mantenimientos.filter((m) => {
      const texto = `${m.codigo_activo || ""} ${m.nombre_activo || ""} ${
        m.categoria || ""
      } ${m.ubicacion || ""} ${m.proveedor || ""} ${
        m.responsable || ""
      } ${m.estado || ""} ${m.prioridad || ""}`
        .toLowerCase()
        .trim();

      return (
        texto.includes(buscar.toLowerCase().trim()) &&
        (filtroEstado === "Todos" || m.estado === filtroEstado) &&
        (filtroPrioridad === "Todos" || m.prioridad === filtroPrioridad) &&
        (filtroCategoria === "Todos" || m.categoria === filtroCategoria)
      );
    });
  }, [mantenimientos, buscar, filtroEstado, filtroPrioridad, filtroCategoria]);

  const totalPendientes = mantenimientosFiltrados.filter(
    (m) => m.estado === "Pendiente",
  ).length;

  const totalProgramados = mantenimientosFiltrados.filter(
    (m) => m.estado === "Programado",
  ).length;

  const totalVencidos = mantenimientosFiltrados.filter(
    (m) => m.estado === "Vencido",
  ).length;

  const totalCriticos = mantenimientosFiltrados.filter(
    (m) => m.prioridad === "Crítica",
  ).length;

  const costoAcumuladoTotal = mantenimientosFiltrados.reduce(
    (s, m) => s + numero(m.costo_acumulado),
    0,
  );

  const proximosAlertas = mantenimientosFiltrados.filter((m) => {
    const dias = diasHasta(m.fecha_proximo_mantenimiento);
    return dias >= 0 && dias <= Number(m.dias_alerta || 7);
  }).length;

  return (
    <PageContainer>
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
        title="Mantenimiento Preventivo"
        subtitle={`Programa, controla y registra mantenimientos de activos. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={Wrench}
        actions={<ModuleActions onRefresh={refrescar} />}
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3 xl:grid-cols-6">
        <InfoBox label="Pendientes" value={`${totalPendientes}`} tone="yellow" />
        <InfoBox label="Programados" value={`${totalProgramados}`} tone="blue" />
        <InfoBox label="Vencidos" value={`${totalVencidos}`} tone="red" />
        <InfoBox label="Alertas" value={`${proximosAlertas}`} tone="orange" />
        <InfoBox label="Críticos" value={`${totalCriticos}`} tone="purple" />
        <InfoBox
          label="Costo acumulado"
          value={`RD$ ${moneda(costoAcumuladoTotal)}`}
          tone="slate"
        />
      </div>

      <SectionCard
        title={editandoId ? "Modificar mantenimiento" : "Programar mantenimiento"}
        subtitle="Seleccione el activo, defina frecuencia, próximo mantenimiento, responsable y prioridad."
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
              Nueva programación
            </div>
          )
        }
      >
        <form
          onSubmit={guardarMantenimiento}
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          <div>
            <label className="mb-1 block text-sm font-semibold">
              Activo *
            </label>
            <select
              value={itemId}
              onChange={(e) => seleccionarActivo(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Seleccione</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.codigo || item.id} - {item.nombre}
                </option>
              ))}
            </select>
          </div>

          <Input label="Código activo" value={codigoActivo} onChange={setCodigoActivo} />
          <Input label="Nombre activo" value={nombreActivo} onChange={setNombreActivo} />
          <Input label="Categoría" value={categoria} onChange={setCategoria} />
          <Input label="Ubicación" value={ubicacion} onChange={setUbicacion} />
          <Input
            label="Último mantenimiento"
            type="date"
            value={fechaUltimo}
            onChange={setFechaUltimo}
          />
          <Input
            label="Próximo mantenimiento *"
            type="date"
            value={fechaProximo}
            onChange={setFechaProximo}
          />
          <Input
            label="Frecuencia días"
            type="number"
            value={frecuenciaDias}
            onChange={setFrecuenciaDias}
          />
          <Input label="Proveedor" value={proveedor} onChange={setProveedor} />
          <Input label="Responsable" value={responsable} onChange={setResponsable} />
          <Input
            label="Costo último"
            type="number"
            step="0.01"
            value={costoUltimo}
            onChange={setCostoUltimo}
          />
          <Input
            label="Costo acumulado"
            type="number"
            step="0.01"
            value={costoAcumulado}
            onChange={setCostoAcumulado}
          />

          <Select
            label="Prioridad"
            value={prioridad}
            onChange={setPrioridad}
            options={prioridades}
          />

          <Input
            label="Días alerta"
            type="number"
            value={diasAlerta}
            onChange={setDiasAlerta}
          />

          <Select
            label="Estado"
            value={estado}
            onChange={setEstado}
            options={estados}
          />

          <div className="flex items-center gap-3 rounded-xl border bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={requiereApagado}
              onChange={(e) => setRequiereApagado(e.target.checked)}
              className="h-5 w-5"
            />
            <span className="text-sm font-semibold">Requiere apagado</span>
          </div>

          <div className="md:col-span-3">
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
                  : "Guardar programación"}
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

      {realizarId && (
        <SectionCard
          title="Registrar mantenimiento realizado"
          subtitle="Registre el trabajo realizado y, si aplica, genere una solicitud de pago."
          action={
            <button
              type="button"
              onClick={() => setRealizarId(null)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              <XCircle className="h-4 w-4" />
              Cerrar
            </button>
          }
        >
          <form
            onSubmit={registrarRealizado}
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <Input
              label="Fecha realizada"
              type="date"
              value={fechaRealizado}
              onChange={setFechaRealizado}
            />

            <Input
              label="Proveedor"
              value={proveedorRealizado}
              onChange={setProveedorRealizado}
            />

            <Input
              label="Responsable"
              value={responsableRealizado}
              onChange={setResponsableRealizado}
            />

            <Input
              label="Costo"
              type="number"
              step="0.01"
              value={costoRealizado}
              onChange={setCostoRealizado}
            />

            <div className="flex items-center gap-3 rounded-xl border bg-emerald-50 px-4 py-3">
              <input
                type="checkbox"
                checked={generarSolicitudPago}
                onChange={(e) => setGenerarSolicitudPago(e.target.checked)}
                className="h-5 w-5"
              />
              <span className="text-sm font-black text-emerald-800">
                Generar solicitud de pago
              </span>
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-semibold">
                Descripción del trabajo
              </label>
              <textarea
                value={descripcionTrabajo}
                onChange={(e) => setDescripcionTrabajo(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
                rows={2}
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-semibold">
                Observación
              </label>
              <textarea
                value={observacionRealizado}
                onChange={(e) => setObservacionRealizado(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
                rows={2}
              />
            </div>

            <div className="flex flex-col gap-3 md:col-span-3 md:flex-row">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"
              >
                <CheckCircle2 className="h-4 w-4" />
                Registrar realizado
              </button>

              <button
                type="button"
                onClick={() => setRealizarId(null)}
                className="rounded-xl bg-slate-700 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                Cancelar
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard
        title="Filtros"
        subtitle="Busque y filtre mantenimientos por activo, estado, prioridad o categoría."
        action={
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
            <Filter className="h-4 w-4" />
            Registros: {mantenimientosFiltrados.length}
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="w-full rounded-xl border px-10 py-3 text-sm"
              placeholder="Buscar activo, proveedor, ubicación..."
            />
          </div>

          <FilterSelect
            value={filtroEstado}
            onChange={setFiltroEstado}
            options={["Todos", ...estados]}
            todosLabel="Todos los estados"
          />

          <FilterSelect
            value={filtroPrioridad}
            onChange={setFiltroPrioridad}
            options={["Todos", ...prioridades]}
            todosLabel="Todas las prioridades"
          />

          <FilterSelect
            value={filtroCategoria}
            onChange={setFiltroCategoria}
            options={categoriasFiltro}
            todosLabel="Todas las categorías"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Plan de mantenimiento"
        subtitle="Listado de mantenimientos programados, vencidos y próximos a vencer."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
              <ClipboardList className="h-4 w-4" />
              {mantenimientosFiltrados.length}
            </div>
          )
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500">Cargando mantenimientos...</p>
        ) : mantenimientosFiltrados.length === 0 ? (
          <EmptyState
            title="Sin mantenimientos"
            description="No hay mantenimientos registrados con esta consulta."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Activo</th>
                <th className="px-4 py-3 text-left">Fechas</th>
                <th className="px-4 py-3 text-left">Proveedor / Responsable</th>
                <th className="px-4 py-3 text-right">Costo</th>
                <th className="px-4 py-3 text-center">Prioridad</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {mantenimientosFiltrados.map((m) => {
                const dias = diasHasta(m.fecha_proximo_mantenimiento);

                return (
                  <tr key={m.id} className="bg-white hover:bg-slate-50">
                    <td className="min-w-72 px-4 py-3">
                      <p className="font-black text-slate-900">
                        {m.nombre_activo || "-"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {m.codigo_activo || "-"} · {m.categoria || "-"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Ubicación: {m.ubicacion || "-"}
                      </p>
                      {m.requiere_apagado && (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-black text-red-700">
                          <AlertTriangle className="h-3 w-3" />
                          Requiere apagado
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <p>Último: {fecha(m.fecha_ultimo_mantenimiento)}</p>
                      <p className="font-black">
                        Próximo: {fecha(m.fecha_proximo_mantenimiento)}
                      </p>
                      <p
                        className={`text-xs font-black ${
                          dias < 0
                            ? "text-red-700"
                            : dias <= Number(m.dias_alerta || 7)
                              ? "text-orange-700"
                              : "text-slate-500"
                        }`}
                      >
                        {dias < 0
                          ? `Vencido hace ${Math.abs(dias)} día(s)`
                          : `Faltan ${dias} día(s)`}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-bold">{m.proveedor || "-"}</p>
                      <p className="text-xs text-slate-500">
                        {m.responsable || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <p>Último: RD$ {moneda(m.costo_ultimo)}</p>
                      <p className="font-black">
                        Acum.: RD$ {moneda(m.costo_acumulado)}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${prioridadClass(
                          m.prioridad,
                        )}`}
                      >
                        {m.prioridad || "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${estadoClass(
                          m.estado,
                        )}`}
                      >
                        {m.estado || "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirRealizar(m)}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Realizado
                        </button>

                        <button
                          type="button"
                          onClick={() => editarMantenimiento(m)}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => cargarHistorial(m.id)}
                          className="inline-flex items-center gap-1 rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800"
                        >
                          <History className="h-3.5 w-3.5" />
                          Historial
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminarMantenimiento(m)}
                          className="inline-flex items-center gap-1 rounded-xl bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      {historialDeId && (
        <SectionCard
          title="Historial de mantenimiento"
          subtitle="Detalle de trabajos realizados al mantenimiento seleccionado."
          action={
            <button
              type="button"
              onClick={() => {
                setHistorialDeId(null);
                setHistorial([]);
              }}
              className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              Cerrar
            </button>
          }
        >
          {historial.length === 0 ? (
            <EmptyState
              title="Sin historial"
              description="Este mantenimiento no tiene historial registrado."
            />
          ) : (
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Proveedor</th>
                  <th className="px-4 py-3 text-left">Responsable</th>
                  <th className="px-4 py-3 text-right">Costo</th>
                  <th className="px-4 py-3 text-left">Trabajo</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {historial.map((h) => (
                  <tr key={h.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold">
                      {fecha(h.fecha_mantenimiento)}
                    </td>

                    <td className="px-4 py-3">{h.proveedor || "-"}</td>

                    <td className="px-4 py-3">{h.responsable || "-"}</td>

                    <td className="px-4 py-3 text-right font-black">
                      RD$ {moneda(h.costo)}
                    </td>

                    <td className="min-w-80 px-4 py-3">
                      <p>{h.descripcion_trabajo || "-"}</p>
                      {h.observacion && (
                        <p className="text-xs text-slate-500">
                          Obs.: {h.observacion}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </SectionCard>
      )}
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
  tone?: "slate" | "blue" | "emerald" | "red" | "yellow" | "orange" | "purple";
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
            : tone === "orange"
              ? "bg-orange-50 text-orange-700 border-orange-100"
              : tone === "purple"
                ? "bg-purple-50 text-purple-700 border-purple-100"
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

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
      >
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
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