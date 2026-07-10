"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  BarChart3,
  Boxes,
  Database,
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

type CatalogoTipo =
  | "categorias"
  | "unidades"
  | "estados"
  | "movimientos"
  | "ubicaciones"
  | "marcas"
  | "tipos_activos";

type RegistroCatalogo = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  nombre: string;
  descripcion: string | null;
  estado: string | null;
  created_at: string | null;
  abreviatura?: string | null;
  color?: string | null;
  afecta_estado?: string | null;
  responsable?: string | null;
  depreciable?: boolean | null;
};

type TabCatalogo = {
  id: CatalogoTipo;
  titulo: string;
  descripcion: string;
  tabla: string;
};

const tabs: TabCatalogo[] = [
  {
    id: "categorias",
    titulo: "Categorías",
    descripcion: "Clasificación general de artículos y activos.",
    tabla: "inventario_categorias",
  },
  {
    id: "unidades",
    titulo: "Unidades",
    descripcion: "Unidades de medida usadas en inventario.",
    tabla: "inventario_unidades_medida",
  },
  {
    id: "estados",
    titulo: "Estados",
    descripcion: "Estados disponibles para artículos.",
    tabla: "inventario_estados",
  },
  {
    id: "movimientos",
    titulo: "Tipos de movimientos",
    descripcion: "Entradas, salidas, asignaciones, bajas y ajustes.",
    tabla: "inventario_tipos_movimientos",
  },
  {
    id: "ubicaciones",
    titulo: "Ubicaciones",
    descripcion: "Áreas donde se encuentran los artículos.",
    tabla: "inventario_ubicaciones",
  },
  {
    id: "marcas",
    titulo: "Marcas",
    descripcion: "Marcas comunes de equipos y herramientas.",
    tabla: "inventario_marcas",
  },
  {
    id: "tipos_activos",
    titulo: "Tipos de activos",
    descripcion: "Tipos de activos para control y depreciación.",
    tabla: "inventario_tipos_activos",
  },
];

const estadosRegistro = ["Activo", "Inactivo"];

const coloresSugeridos = [
  "Verde",
  "Azul",
  "Morado",
  "Amarillo",
  "Rojo",
  "Gris",
  "Negro",
  "Naranja",
];

const afectaEstadoSugeridos = [
  "No aplica",
  "Disponible",
  "En Uso",
  "En Reparación",
  "Dañado",
  "Perdido",
  "Dado de Baja",
];

function fechaCorta(valor?: string | null) {
  if (!valor) return "-";

  const limpio = String(valor).split("T")[0];
  const partes = limpio.split("-");

  if (partes.length !== 3) return limpio;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function estadoClass(estado?: string | null) {
  return estado === "Activo"
    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
    : "bg-red-50 text-red-700 border-red-100";
}

export default function InventarioCatalogosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [tabActivo, setTabActivo] = useState<CatalogoTipo>("categorias");
  const [registros, setRegistros] = useState<RegistroCatalogo[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState("Activo");
  const [abreviatura, setAbreviatura] = useState("");
  const [color, setColor] = useState("");
  const [afectaEstado, setAfectaEstado] = useState("No aplica");
  const [responsable, setResponsable] = useState("");
  const [depreciable, setDepreciable] = useState(false);

  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombreCondominio =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombreCondominio);

    if (!id) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarCatalogo(id, "categorias");
  }, []);

  useEffect(() => {
    if (condominioId) {
      limpiarFormulario();
      cargarCatalogo(condominioId, tabActivo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabActivo]);

  function tabInfo() {
    return tabs.find((tab) => tab.id === tabActivo) || tabs[0];
  }

  function tablaActual() {
    return tabInfo().tabla;
  }

  async function cargarCatalogo(id: string, tipo: CatalogoTipo) {
    const tab = tabs.find((item) => item.id === tipo);

    if (!tab) return;

    setLoading(true);

    const { data, error } = await supabase
      .from(tab.tabla)
      .select("*")
      .eq("condominio_id", Number(id))
      .order("nombre", { ascending: true });

    setLoading(false);

    if (error) {
      alert("Error cargando catálogo: " + error.message);
      setRegistros([]);
      return;
    }

    setRegistros((data as RegistroCatalogo[]) || []);
  }

  async function refrescar() {
    if (!condominioId) return;
    await cargarCatalogo(condominioId, tabActivo);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setNombre("");
    setDescripcion("");
    setEstado("Activo");
    setAbreviatura("");
    setColor("");
    setAfectaEstado("No aplica");
    setResponsable("");
    setDepreciable(false);
  }

  function cambiarTab(tab: CatalogoTipo) {
    setTabActivo(tab);
    setBuscar("");
    setFiltroEstado("Todos");
  }

  function editarRegistro(registro: RegistroCatalogo) {
    setEditandoId(registro.id);
    setNombre(registro.nombre || "");
    setDescripcion(registro.descripcion || "");
    setEstado(registro.estado || "Activo");
    setAbreviatura(registro.abreviatura || "");
    setColor(registro.color || "");
    setAfectaEstado(registro.afecta_estado || "No aplica");
    setResponsable(registro.responsable || "");
    setDepreciable(Boolean(registro.depreciable));

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarRegistro(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!nombre.trim()) {
      alert("Debe indicar el nombre.");
      return;
    }

    const registroBase: Record<string, any> = {
      condominio_id: Number(condominioId),
      condominio: condominioNombre,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      estado,
    };

    if (tabActivo === "unidades") {
      registroBase.abreviatura = abreviatura.trim();
    }

    if (tabActivo === "estados") {
      registroBase.color = color.trim();
    }

    if (tabActivo === "movimientos") {
      registroBase.afecta_estado = afectaEstado;
    }

    if (tabActivo === "ubicaciones") {
      registroBase.responsable = responsable.trim();
    }

    if (tabActivo === "tipos_activos") {
      registroBase.depreciable = depreciable;
    }

    setGuardando(true);

    if (editandoId) {
      const { error } = await supabase
        .from(tablaActual())
        .update(registroBase)
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      setGuardando(false);

      if (error) {
        alert("Error modificando registro: " + error.message);
        return;
      }

      alert("Registro modificado correctamente.");
      limpiarFormulario();
      cargarCatalogo(condominioId, tabActivo);
      return;
    }

    const { error } = await supabase.from(tablaActual()).insert([registroBase]);

    setGuardando(false);

    if (error) {
      alert("Error guardando registro: " + error.message);
      return;
    }

    alert("Registro guardado correctamente.");
    limpiarFormulario();
    cargarCatalogo(condominioId, tabActivo);
  }

  async function eliminarRegistro(registro: RegistroCatalogo) {
    const confirmar = confirm(`¿Seguro que desea eliminar "${registro.nombre}"?`);

    if (!confirmar) return;

    const { error } = await supabase
      .from(tablaActual())
      .delete()
      .eq("id", registro.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error eliminando registro: " + error.message);
      return;
    }

    alert("Registro eliminado correctamente.");
    cargarCatalogo(condominioId, tabActivo);
  }

  async function cambiarEstado(registro: RegistroCatalogo) {
    const nuevoEstado = registro.estado === "Activo" ? "Inactivo" : "Activo";

    const { error } = await supabase
      .from(tablaActual())
      .update({ estado: nuevoEstado })
      .eq("id", registro.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error actualizando estado: " + error.message);
      return;
    }

    cargarCatalogo(condominioId, tabActivo);
  }

  async function cargarDatosIniciales() {
    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo.");
      return;
    }

    const confirmar = confirm(
      `¿Desea cargar datos iniciales sugeridos para ${tabInfo().titulo}?`,
    );

    if (!confirmar) return;

    let datos: Record<string, any>[] = [];

    if (tabActivo === "categorias") {
      datos = [
        "Herramientas",
        "Escaleras",
        "Equipos Eléctricos",
        "Equipos de Limpieza",
        "Equipos de Jardinería",
        "Equipos de Seguridad",
        "Materiales",
        "Mobiliarios",
        "Equipos de Oficina",
        "Otros Activos",
      ].map((item) => ({
        condominio_id: Number(condominioId),
        condominio: condominioNombre,
        nombre: item,
        descripcion: item,
        estado: "Activo",
      }));
    }

    if (tabActivo === "unidades") {
      datos = [
        ["Unidad", "UND"],
        ["Caja", "CAJ"],
        ["Par", "PAR"],
        ["Paquete", "PAQ"],
        ["Metro", "M"],
        ["Rollo", "ROL"],
        ["Galón", "GAL"],
        ["Litro", "LTR"],
        ["Libra", "LB"],
        ["Kilogramo", "KG"],
      ].map(([item, abrv]) => ({
        condominio_id: Number(condominioId),
        condominio: condominioNombre,
        nombre: item,
        abreviatura: abrv,
        estado: "Activo",
      }));
    }

    if (tabActivo === "estados") {
      datos = [
        ["Disponible", "Verde"],
        ["En Uso", "Azul"],
        ["Prestado", "Morado"],
        ["En Reparación", "Amarillo"],
        ["Dañado", "Rojo"],
        ["Perdido", "Gris"],
        ["Dado de Baja", "Negro"],
      ].map(([item, colorItem]) => ({
        condominio_id: Number(condominioId),
        condominio: condominioNombre,
        nombre: item,
        descripcion: item,
        color: colorItem,
        estado: "Activo",
      }));
    }

    if (tabActivo === "movimientos") {
      datos = [
        ["Entrada", "Disponible"],
        ["Salida", "En Uso"],
        ["Asignación", "En Uso"],
        ["Devolución", "Disponible"],
        ["Traslado", "No aplica"],
        ["Reparación", "En Reparación"],
        ["Ajuste", "No aplica"],
        ["Baja", "Dado de Baja"],
      ].map(([item, afecta]) => ({
        condominio_id: Number(condominioId),
        condominio: condominioNombre,
        nombre: item,
        descripcion: item,
        afecta_estado: afecta,
        estado: "Activo",
      }));
    }

    if (tabActivo === "ubicaciones") {
      datos = [
        "Cuarto de Herramientas",
        "Oficina Administrativa",
        "Área de Limpieza",
        "Caseta de Seguridad",
        "Cuarto de Bombas",
        "Área Común",
        "Almacén General",
      ].map((item) => ({
        condominio_id: Number(condominioId),
        condominio: condominioNombre,
        nombre: item,
        descripcion: item,
        responsable: "",
        estado: "Activo",
      }));
    }

    if (tabActivo === "marcas") {
      datos = [
        "Truper",
        "Stanley",
        "Makita",
        "Black & Decker",
        "Kärcher",
        "Honda",
        "Genérico",
        "Otro",
      ].map((item) => ({
        condominio_id: Number(condominioId),
        condominio: condominioNombre,
        nombre: item,
        descripcion: item,
        estado: "Activo",
      }));
    }

    if (tabActivo === "tipos_activos") {
      datos = [
        ["Herramienta", false],
        ["Equipo", true],
        ["Material", false],
        ["Mobiliario", true],
        ["Equipo eléctrico", true],
        ["Equipo de seguridad", true],
        ["Activo menor", false],
      ].map(([item, dep]) => ({
        condominio_id: Number(condominioId),
        condominio: condominioNombre,
        nombre: item,
        descripcion: item,
        depreciable: dep,
        estado: "Activo",
      }));
    }

    if (datos.length === 0) return;

    const { error } = await supabase.from(tablaActual()).insert(datos);

    if (error) {
      alert("Error cargando datos iniciales: " + error.message);
      return;
    }

    alert("Datos iniciales cargados correctamente.");
    cargarCatalogo(condominioId, tabActivo);
  }

  const registrosFiltrados = useMemo(() => {
    return registros.filter((registro) => {
      const texto = `${registro.nombre || ""} ${registro.descripcion || ""} ${
        registro.estado || ""
      } ${registro.abreviatura || ""} ${registro.color || ""} ${
        registro.afecta_estado || ""
      } ${registro.responsable || ""} ${
        registro.depreciable ? "depreciable" : ""
      }`
        .toLowerCase()
        .trim();

      const coincideTexto = texto.includes(buscar.toLowerCase().trim());

      const coincideEstado =
        filtroEstado === "Todos" || registro.estado === filtroEstado;

      return coincideTexto && coincideEstado;
    });
  }, [registros, buscar, filtroEstado]);

  const totalActivos = registrosFiltrados.filter(
    (r) => r.estado === "Activo",
  ).length;

  const totalInactivos = registrosFiltrados.filter(
    (r) => r.estado === "Inactivo",
  ).length;

  function tituloCampoEspecial() {
    if (tabActivo === "unidades") return "Abreviatura";
    if (tabActivo === "estados") return "Color";
    if (tabActivo === "movimientos") return "Afecta estado";
    if (tabActivo === "ubicaciones") return "Responsable";
    if (tabActivo === "tipos_activos") return "Depreciable";
    return "Detalle";
  }

  function valorCampoEspecial(registro: RegistroCatalogo) {
    if (tabActivo === "unidades") return registro.abreviatura || "-";
    if (tabActivo === "estados") return registro.color || "-";
    if (tabActivo === "movimientos") return registro.afecta_estado || "-";
    if (tabActivo === "ubicaciones") return registro.responsable || "-";
    if (tabActivo === "tipos_activos") return registro.depreciable ? "Sí" : "No";
    return "-";
  }

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
        title="Catálogos de Inventario"
        subtitle={`Configuración base para inventario. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={Tags}
        actions={<ModuleActions onRefresh={refrescar} />}
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <InfoBox
          label={`Total ${tabInfo().titulo}`}
          value={`${registrosFiltrados.length}`}
          tone="blue"
        />
        <InfoBox label="Activos" value={`${totalActivos}`} tone="emerald" />
        <InfoBox label="Inactivos" value={`${totalInactivos}`} tone="red" />
      </div>

      <SectionCard
        title="Tipo de catálogo"
        subtitle="Seleccione el catálogo que desea consultar o modificar."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 xl:grid-cols-7">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => cambiarTab(tab.id)}
              className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                tabActivo === tab.id
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "bg-white hover:bg-blue-50"
              }`}
            >
              <p className="text-sm font-black">{tab.titulo}</p>
              <p
                className={`mt-1 text-xs ${
                  tabActivo === tab.id ? "text-blue-50" : "text-slate-500"
                }`}
              >
                {tab.descripcion}
              </p>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={`${editandoId ? "Modificar" : "Nuevo"} registro - ${
          tabInfo().titulo
        }`}
        subtitle="Complete la información del registro seleccionado."
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
            <button
              type="button"
              onClick={cargarDatosIniciales}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
            >
              <PlusCircle className="h-4 w-4" />
              Cargar iniciales
            </button>
          )
        }
      >
        <form
          onSubmit={guardarRegistro}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <Input
            label="Nombre *"
            value={nombre}
            onChange={setNombre}
            placeholder={`Nombre de ${tabInfo().titulo.toLowerCase()}`}
          />

          {tabActivo === "unidades" && (
            <Input
              label="Abreviatura"
              value={abreviatura}
              onChange={setAbreviatura}
              placeholder="Ej. UND"
            />
          )}

          {tabActivo === "estados" && (
            <Select
              label="Color"
              value={color}
              onChange={setColor}
              options={coloresSugeridos}
              placeholder="Seleccione"
            />
          )}

          {tabActivo === "movimientos" && (
            <Select
              label="Afecta estado"
              value={afectaEstado}
              onChange={setAfectaEstado}
              options={afectaEstadoSugeridos}
            />
          )}

          {tabActivo === "ubicaciones" && (
            <Input
              label="Responsable"
              value={responsable}
              onChange={setResponsable}
              placeholder="Encargado o responsable"
            />
          )}

          {tabActivo === "tipos_activos" && (
            <div className="flex items-center gap-3 rounded-xl border bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                checked={depreciable}
                onChange={(e) => setDepreciable(e.target.checked)}
                className="h-5 w-5"
              />
              <span className="text-sm font-semibold">Depreciable</span>
            </div>
          )}

          <Select
            label="Estado"
            value={estado}
            onChange={setEstado}
            options={estadosRegistro}
          />

          <div
            className={
              tabActivo === "categorias" || tabActivo === "marcas"
                ? "md:col-span-2"
                : ""
            }
          >
            <label className="mb-1 block text-sm font-semibold">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              rows={2}
              placeholder="Descripción u observación del registro"
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
                  : "Guardar registro"}
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

            <button
              type="button"
              onClick={cargarDatosIniciales}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"
            >
              <PlusCircle className="h-4 w-4" />
              Cargar datos iniciales
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Filtros"
        subtitle="Busque por nombre, descripción, estado o campo especial."
        action={
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
            <Filter className="h-4 w-4" />
            Registros: {registrosFiltrados.length}
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="w-full rounded-xl border px-10 py-3 text-sm"
              placeholder="Buscar por nombre, descripción o detalle..."
            />
          </div>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
          >
            <option value="Todos">Todos los estados</option>
            {estadosRegistro.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </SectionCard>

      <SectionCard
        title={`Listado - ${tabInfo().titulo}`}
        subtitle="Registros configurados para el condominio activo."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
              <Database className="h-4 w-4" />
              {registrosFiltrados.length}
            </div>
          )
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500">Cargando catálogo...</p>
        ) : registrosFiltrados.length === 0 ? (
          <EmptyState
            title="Sin registros"
            description="No hay registros para este catálogo con esta consulta."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Descripción</th>
                <th className="px-4 py-3 text-left">
                  {tituloCampoEspecial()}
                </th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Fecha</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {registrosFiltrados.map((registro) => (
                <tr key={registro.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-black text-slate-900">
                    {registro.nombre}
                  </td>

                  <td className="min-w-64 px-4 py-3">
                    {registro.descripcion || "-"}
                  </td>

                  <td className="px-4 py-3">
                    {valorCampoEspecial(registro)}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${estadoClass(
                        registro.estado,
                      )}`}
                    >
                      {registro.estado || "-"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    {fechaCorta(registro.created_at)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => editarRegistro(registro)}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => cambiarEstado(registro)}
                        className="rounded-xl bg-yellow-700 px-3 py-2 text-xs font-bold text-white hover:bg-yellow-800"
                      >
                        {registro.estado === "Activo" ? "Inactivar" : "Activar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminarRegistro(registro)}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">{label}</label>
      <input
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
      >
        {placeholder && <option value="">{placeholder}</option>}

        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}