"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  HandCoins,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  Users,
  WalletCards,
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

type CatalogoItem = {
  id: number;
  condominio_id: number;
  condominio: string;
  nombre: string;
  descripcion: string;
  estado: string;
  created_at: string;
};

type TipoCatalogo = "cargo" | "departamento" | "contrato";

type ModuloRH = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
  color: string;
  bg: string;
};

function estadoClass(estado: string | null | undefined) {
  if (estado === "Activo") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (estado === "Inactivo") {
    return "border-red-100 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function CatalogosRHPage() {
  const [mounted, setMounted] = useState(false);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [cargos, setCargos] = useState<CatalogoItem[]>([]);
  const [departamentos, setDepartamentos] = useState<CatalogoItem[]>([]);
  const [contratos, setContratos] = useState<CatalogoItem[]>([]);

  const [tipoActivo, setTipoActivo] = useState<TipoCatalogo>("cargo");
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState("Activo");

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const modulos: ModuloRH[] = [
    {
      titulo: "Dashboard RH",
      descripcion:
        "Vista general del personal, nómina, vacaciones y prestaciones.",
      href: "/recursos-humanos",
      icono: BriefcaseBusiness,
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      titulo: "Empleados",
      descripcion: "Registro y mantenimiento de empleados del condominio.",
      href: "/recursos-humanos/personal",
      icono: Users,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      titulo: "Nómina",
      descripcion: "Procesar y aprobar nóminas mensuales.",
      href: "/recursos-humanos/nomina",
      icono: WalletCards,
      color: "text-purple-700",
      bg: "bg-purple-50",
    },
    {
      titulo: "Vacaciones",
      descripcion: "Solicitudes, permisos y balance anual.",
      href: "/recursos-humanos/vacaciones",
      icono: ClipboardList,
      color: "text-indigo-700",
      bg: "bg-indigo-50",
    },
    {
      titulo: "Prestaciones",
      descripcion: "Cálculo de liquidación y prestaciones laborales.",
      href: "/recursos-humanos/prestaciones",
      icono: HandCoins,
      color: "text-orange-700",
      bg: "bg-orange-50",
    },
    {
      titulo: "Reportes",
      descripcion: "Reportes de nómina, vacaciones y empleados.",
      href: "/recursos-humanos/nomina/reportes/nomina",
      icono: BarChart3,
      color: "text-sky-700",
      bg: "bg-sky-50",
    },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id || !Number(id)) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    cargarCatalogos(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function obtenerTabla(tipo: TipoCatalogo) {
    if (tipo === "cargo") return "rh_cargos";
    if (tipo === "departamento") return "rh_departamentos";
    return "rh_tipos_contrato";
  }

  function obtenerTitulo(tipo: TipoCatalogo) {
    if (tipo === "cargo") return "Cargo / Puesto";
    if (tipo === "departamento") return "Departamento";
    return "Tipo de contrato";
  }

  function obtenerTituloPlural(tipo: TipoCatalogo) {
    if (tipo === "cargo") return "Cargos / Puestos";
    if (tipo === "departamento") return "Departamentos";
    return "Tipos de contrato";
  }

  function obtenerListaActual() {
    if (tipoActivo === "cargo") return cargos;
    if (tipoActivo === "departamento") return departamentos;
    return contratos;
  }

  async function cargarCatalogos(id: string) {
    const condominioIdNumero = Number(id);

    if (!condominioIdNumero) return;

    setLoading(true);
    setMensaje("");

    const [cargosResp, departamentosResp, contratosResp] = await Promise.all([
      supabase
        .from("rh_cargos")
        .select("*")
        .eq("condominio_id", condominioIdNumero)
        .order("nombre", { ascending: true }),

      supabase
        .from("rh_departamentos")
        .select("*")
        .eq("condominio_id", condominioIdNumero)
        .order("nombre", { ascending: true }),

      supabase
        .from("rh_tipos_contrato")
        .select("*")
        .eq("condominio_id", condominioIdNumero)
        .order("nombre", { ascending: true }),
    ]);

    setLoading(false);

    if (cargosResp.error) {
      setMensaje("Error cargando cargos: " + cargosResp.error.message);
      return;
    }

    if (departamentosResp.error) {
      setMensaje(
        "Error cargando departamentos: " + departamentosResp.error.message,
      );
      return;
    }

    if (contratosResp.error) {
      setMensaje(
        "Error cargando tipos de contrato: " + contratosResp.error.message,
      );
      return;
    }

    setCargos((cargosResp.data || []) as CatalogoItem[]);
    setDepartamentos((departamentosResp.data || []) as CatalogoItem[]);
    setContratos((contratosResp.data || []) as CatalogoItem[]);
  }

  async function refrescar() {
    if (!condominioId || !Number(condominioId)) return;
    await cargarCatalogos(condominioId);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setNombre("");
    setDescripcion("");
    setEstado("Activo");
  }

  function cambiarTipo(tipo: TipoCatalogo) {
    setTipoActivo(tipo);
    limpiarFormulario();
  }

  function editarItem(item: CatalogoItem) {
    setEditandoId(item.id);
    setNombre(item.nombre || "");
    setDescripcion(item.descripcion || "");
    setEstado(item.estado || "Activo");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarItem(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !Number(condominioId) || !condominioNombre) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    if (!nombre.trim()) {
      setMensaje("Debe indicar el nombre.");
      return;
    }

    const tabla = obtenerTabla(tipoActivo);

    const registro = {
      condominio_id: Number(condominioId),
      condominio: condominioNombre,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      estado,
    };

    setGuardando(true);
    setMensaje("");

    if (editandoId) {
      const { error } = await supabase
        .from(tabla)
        .update(registro)
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      setGuardando(false);

      if (error) {
        setMensaje("Error modificando registro: " + error.message);
        return;
      }

      setMensaje("Registro modificado correctamente.");
      limpiarFormulario();
      cargarCatalogos(condominioId);
      return;
    }

    const { error } = await supabase.from(tabla).insert([registro]);

    setGuardando(false);

    if (error) {
      setMensaje("Error guardando registro: " + error.message);
      return;
    }

    setMensaje("Registro guardado correctamente.");
    limpiarFormulario();
    cargarCatalogos(condominioId);
  }

  async function eliminarItem(item: CatalogoItem) {
    const confirmar = confirm(
      `¿Seguro que desea eliminar "${item.nombre}"?`,
    );

    if (!confirmar) return;

    const tabla = obtenerTabla(tipoActivo);

    const { error } = await supabase
      .from(tabla)
      .delete()
      .eq("id", item.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      setMensaje("Error eliminando registro: " + error.message);
      return;
    }

    setMensaje("Registro eliminado correctamente.");
    cargarCatalogos(condominioId);
  }

  const listaActual = obtenerListaActual();

  const activos = useMemo(
    () => listaActual.filter((item) => item.estado === "Activo").length,
    [listaActual],
  );

  const inactivos = useMemo(
    () => listaActual.filter((item) => item.estado === "Inactivo").length,
    [listaActual],
  );

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="rounded-2xl border bg-white p-6 text-sm font-bold text-slate-600">
          Cargando módulo de cargos y puestos...
        </div>
      </div>
    );
  }

  return (
    <PageContainer>
      <ModuleMenu
        title="Recursos Humanos"
        subtitle="Gestión de empleados, nómina, vacaciones, permisos, prestaciones y reportes."
        tone="blue"
        items={[
          {
            href: "/recursos-humanos",
            label: "Inicio RH",
            icon: BriefcaseBusiness,
          },
          {
            href: "/recursos-humanos/personal",
            label: "Empleados",
            icon: Users,
          },
          {
            href: "/recursos-humanos/nomina",
            label: "Nómina",
            icon: WalletCards,
          },
          {
            href: "/recursos-humanos/vacaciones",
            label: "Vacaciones",
            icon: ClipboardList,
          },
          {
            href: "/recursos-humanos/prestaciones",
            label: "Prestaciones",
            icon: HandCoins,
          },
          {
            href: "/recursos-humanos/nomina/reportes/nomina",
            label: "Reportes",
            icon: BarChart3,
          },
        ]}
      />

      <ModuleToolbar
        title="Cargos y Puestos"
        subtitle={`Catálogos base para cargos, departamentos y tipos de contrato. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={BriefcaseBusiness}
        actions={<ModuleActions onRefresh={refrescar} />}
      />

      {mensaje && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          {mensaje}
        </div>
      )}

      <SectionCard
        title="Resumen de catálogos"
        subtitle="Indicadores generales del catálogo seleccionado."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Actualizando
            </div>
          ) : (
            <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">
              {listaActual.length} registro(s)
            </span>
          )
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoCompacta
            label="Total registros"
            value={`${listaActual.length}`}
            detalle={obtenerTituloPlural(tipoActivo)}
            icon={ClipboardList}
            color="text-blue-700"
            bg="bg-blue-50"
          />

          <InfoCompacta
            label="Activos"
            value={`${activos}`}
            detalle="Disponibles para uso"
            icon={CheckCircle2}
            color="text-emerald-700"
            bg="bg-emerald-50"
          />

          <InfoCompacta
            label="Inactivos"
            value={`${inactivos}`}
            detalle="No disponibles"
            icon={XCircle}
            color="text-red-700"
            bg="bg-red-50"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Opciones de Recursos Humanos"
        subtitle="Accesos rápidos del módulo."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {modulos.map((modulo) => {
            const Icono = modulo.icono;

            return (
              <Link
                key={`${modulo.titulo}-${modulo.href}`}
                href={modulo.href}
                className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${modulo.bg}`}
                  >
                    <Icono className={`h-6 w-6 ${modulo.color}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black text-slate-900 group-hover:text-blue-700">
                      {modulo.titulo}
                    </h3>

                    <p className="mt-1 min-h-[52px] text-sm leading-relaxed text-slate-500">
                      {modulo.descripcion}
                    </p>

                    <div className="mt-3 flex items-center gap-2 text-sm font-black text-blue-700">
                      <span>Abrir módulo</span>
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Catálogos de Recursos Humanos"
        subtitle="Seleccione el catálogo que desea administrar."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={() => cambiarTipo("cargo")}
            className={`rounded-2xl border p-4 text-left shadow-sm transition ${
              tipoActivo === "cargo"
                ? "border-blue-700 bg-blue-700 text-white"
                : "bg-white text-slate-900 hover:border-blue-300"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wide opacity-70">
              Catálogo
            </p>
            <h3 className="mt-2 text-lg font-black">Cargos / Puestos</h3>
            <p className="mt-1 text-sm opacity-80">
              {cargos.length} registro(s)
            </p>
          </button>

          <button
            type="button"
            onClick={() => cambiarTipo("departamento")}
            className={`rounded-2xl border p-4 text-left shadow-sm transition ${
              tipoActivo === "departamento"
                ? "border-blue-700 bg-blue-700 text-white"
                : "bg-white text-slate-900 hover:border-blue-300"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wide opacity-70">
              Catálogo
            </p>
            <h3 className="mt-2 text-lg font-black">Departamentos</h3>
            <p className="mt-1 text-sm opacity-80">
              {departamentos.length} registro(s)
            </p>
          </button>

          <button
            type="button"
            onClick={() => cambiarTipo("contrato")}
            className={`rounded-2xl border p-4 text-left shadow-sm transition ${
              tipoActivo === "contrato"
                ? "border-blue-700 bg-blue-700 text-white"
                : "bg-white text-slate-900 hover:border-blue-300"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wide opacity-70">
              Catálogo
            </p>
            <h3 className="mt-2 text-lg font-black">Tipos de contrato</h3>
            <p className="mt-1 text-sm opacity-80">
              {contratos.length} registro(s)
            </p>
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title={
          editandoId
            ? `Modificar ${obtenerTitulo(tipoActivo)}`
            : `Registrar ${obtenerTitulo(tipoActivo)}`
        }
        subtitle="Complete la información del catálogo seleccionado."
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
            <span className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
              Nuevo registro
            </span>
          )
        }
      >
        <form
          onSubmit={guardarItem}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div className="rounded-2xl border bg-slate-50 p-4 md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Condominio
            </p>
            <p className="mt-1 font-black text-slate-900">
              {condominioNombre || "No identificado"}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Nombre *
            </label>

            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              placeholder={
                tipoActivo === "cargo"
                  ? "Ejemplo: Conserje"
                  : tipoActivo === "departamento"
                    ? "Ejemplo: Seguridad"
                    : "Ejemplo: Contrato fijo"
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Estado
            </label>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Descripción
            </label>

            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              rows={3}
              placeholder="Descripción, funciones o detalles adicionales"
            />
          </div>

          <div className="flex flex-col gap-3 md:col-span-2 md:flex-row">
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
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
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title={`Listado de ${obtenerTituloPlural(tipoActivo)}`}
        subtitle="Registros configurados para el condominio activo."
        action={
          <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">
            {listaActual.length} registro(s)
          </span>
        }
      >
        {loading ? (
          <div className="rounded-2xl border bg-slate-50 p-6 text-sm font-bold text-slate-600">
            Cargando catálogos...
          </div>
        ) : listaActual.length === 0 ? (
          <EmptyState
            title="Sin registros"
            description="No hay registros para este catálogo."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Descripción</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {listaActual.map((item) => (
                <tr key={item.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-900">
                      {item.nombre || "-"}
                    </p>
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {item.descripcion || "-"}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${estadoClass(
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
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminarItem(item)}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
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

function InfoCompacta({
  label,
  value,
  detalle,
  icon: Icono,
  color = "text-slate-700",
  bg = "bg-slate-100",
}: {
  label: string;
  value: string;
  detalle?: string;
  icon?: any;
  color?: string;
  bg?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {Icono && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${bg}`}
          >
            <Icono className={`h-5 w-5 ${color}`} />
          </div>
        )}

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {label}
          </p>

          <h3 className="mt-1 text-lg font-black text-slate-900">{value}</h3>

          {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
        </div>
      </div>
    </div>
  );
}
