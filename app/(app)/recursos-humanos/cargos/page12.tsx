"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  BadgePlus,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Edit3,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
  UserRoundCog,
  Users,
  WalletCards,
  X,
} from "lucide-react";

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

type MenuRHItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const MENU_RH: MenuRHItem[] = [
  { label: "Inicio RH", href: "/recursos-humanos", icon: BriefcaseBusiness },
  { label: "Empleados", href: "/recursos-humanos/empleados", icon: Users },
  { label: "Nómina", href: "/recursos-humanos/nomina", icon: WalletCards },
  { label: "Vacaciones", href: "/recursos-humanos/vacaciones", icon: CalendarDays },
  { label: "Prestaciones", href: "/recursos-humanos/prestaciones", icon: UserRoundCog },
  { label: "Reportes", href: "/recursos-humanos/reportes", icon: BarChart3 },
];

export default function CatalogosRHPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [cargos, setCargos] = useState<CatalogoItem[]>([]);
  const [departamentos, setDepartamentos] = useState<CatalogoItem[]>([]);
  const [contratos, setContratos] = useState<CatalogoItem[]>([]);
  const [tipoActivo, setTipoActivo] = useState<TipoCatalogo>("cargo");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState("Activo");
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "">("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombreCondominio = localStorage.getItem("condominio_nombre") || "";
    setCondominioId(id);
    setCondominioNombre(nombreCondominio);

    if (!id) {
      setMensaje("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      setTipoMensaje("error");
      setLoading(false);
      return;
    }

    void cargarCatalogos(id);
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

  async function cargarCatalogos(id: string, modoActualizacion = false) {
    if (modoActualizacion) setActualizando(true);
    else setLoading(true);

    setMensaje("");
    setTipoMensaje("");

    const [cargosResp, departamentosResp, contratosResp] = await Promise.all([
      supabase.from("rh_cargos").select("*").eq("condominio_id", Number(id)).order("nombre", { ascending: true }),
      supabase.from("rh_departamentos").select("*").eq("condominio_id", Number(id)).order("nombre", { ascending: true }),
      supabase.from("rh_tipos_contrato").select("*").eq("condominio_id", Number(id)).order("nombre", { ascending: true }),
    ]);

    setLoading(false);
    setActualizando(false);

    if (cargosResp.error || departamentosResp.error || contratosResp.error) {
      const error = cargosResp.error || departamentosResp.error || contratosResp.error;
      setMensaje(`Error cargando catálogos: ${error?.message || "Error desconocido"}`);
      setTipoMensaje("error");
      return;
    }

    setCargos((cargosResp.data || []) as CatalogoItem[]);
    setDepartamentos((departamentosResp.data || []) as CatalogoItem[]);
    setContratos((contratosResp.data || []) as CatalogoItem[]);
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
    setMensaje("");
    setTipoMensaje("");
  }

  function editarItem(item: CatalogoItem) {
    setEditandoId(item.id);
    setNombre(item.nombre || "");
    setDescripcion(item.descripcion || "");
    setEstado(item.estado || "Activo");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarItem(event: React.FormEvent) {
    event.preventDefault();
    setMensaje("");
    setTipoMensaje("");

    if (!condominioId || !condominioNombre) {
      setMensaje("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      setTipoMensaje("error");
      return;
    }

    if (!nombre.trim()) {
      setMensaje("Debe indicar el nombre.");
      setTipoMensaje("error");
      return;
    }

    setGuardando(true);
    const tabla = obtenerTabla(tipoActivo);
    const registro = {
      condominio_id: Number(condominioId),
      condominio: condominioNombre,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      estado,
    };

    const respuesta = editandoId
      ? await supabase.from(tabla).update(registro).eq("id", editandoId).eq("condominio_id", Number(condominioId))
      : await supabase.from(tabla).insert([registro]);

    setGuardando(false);

    if (respuesta.error) {
      setMensaje(`${editandoId ? "Error modificando" : "Error guardando"} registro: ${respuesta.error.message}`);
      setTipoMensaje("error");
      return;
    }

    setMensaje(editandoId ? "Registro modificado correctamente." : "Registro guardado correctamente.");
    setTipoMensaje("success");
    limpiarFormulario();
    await cargarCatalogos(condominioId);
  }

  async function eliminarItem(item: CatalogoItem) {
    if (!condominioId || eliminandoId) return;
    if (!window.confirm(`¿Seguro que desea eliminar "${item.nombre}"?`)) return;

    setEliminandoId(item.id);
    const { error } = await supabase
      .from(obtenerTabla(tipoActivo))
      .delete()
      .eq("id", item.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      setMensaje(`Error eliminando registro: ${error.message}`);
      setTipoMensaje("error");
      setEliminandoId(null);
      return;
    }

    setMensaje("Registro eliminado correctamente.");
    setTipoMensaje("success");
    await cargarCatalogos(condominioId);
    setEliminandoId(null);
  }

  const listaActual = obtenerListaActual();
  const activos = useMemo(() => listaActual.filter((item) => String(item.estado || "").trim().toLowerCase() === "activo").length, [listaActual]);
  const inactivos = listaActual.length - activos;

  return (
    <main className="space-y-5">
      <section className="rounded-[22px] border border-slate-300 bg-white px-4 py-4 shadow-sm md:px-5">
        <div className="mb-3">
          <h1 className="text-base font-black text-slate-950">Recursos Humanos</h1>
          <p className="mt-0.5 text-xs text-slate-500">Gestión de empleados, nómina, vacaciones, permisos, prestaciones y reportes.</p>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1">
          {MENU_RH.map((item) => {
            const Icono = item.icon;
            const activo = pathname === item.href || (item.href !== "/recursos-humanos" && pathname?.startsWith(`${item.href}/`));
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                className={`flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-extrabold transition ${activo ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50"}`}
              >
                <Icono size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </section>

      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Configuración de Recursos Humanos</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">Cargos y puestos</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">Administra los cargos, departamentos y tipos de contrato utilizados para registrar al personal del condominio.</p>
          </div>

          <button
            type="button"
            onClick={() => cargarCatalogos(condominioId, true)}
            disabled={!condominioId || actualizando}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={17} className={actualizando ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>
      </section>

      {mensaje && (
        <section className={`rounded-2xl border px-4 py-3 text-sm ${tipoMensaje === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {mensaje}
        </section>
      )}

      <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Building2 size={20} /></span>
          <div>
            <p className="text-xs text-slate-500">Condominio activo</p>
            <h3 className="text-base font-black text-slate-900">{condominioNombre || "No identificado"}</h3>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <CatalogoCard activo={tipoActivo === "cargo"} titulo="Cargos / Puestos" cantidad={cargos.length} icono={<BriefcaseBusiness size={20} />} onClick={() => cambiarTipo("cargo")} />
        <CatalogoCard activo={tipoActivo === "departamento"} titulo="Departamentos" cantidad={departamentos.length} icono={<Building2 size={20} />} onClick={() => cambiarTipo("departamento")} />
        <CatalogoCard activo={tipoActivo === "contrato"} titulo="Tipos de contrato" cantidad={contratos.length} icono={<FileText size={20} />} onClick={() => cambiarTipo("contrato")} />
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Total registros" value={listaActual.length} icono={<ClipboardList size={18} />} />
        <KpiCard label="Activos" value={activos} icono={<BadgePlus size={18} />} tipo="success" />
        <KpiCard label="Inactivos" value={inactivos} icono={<X size={18} />} tipo="danger" />
      </section>

      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">{editandoId ? <Edit3 size={20} /> : <BadgePlus size={20} />}</span>
          <div>
            <h3 className="text-lg font-black text-slate-900">{editandoId ? "Modificar" : "Registrar"} {obtenerTitulo(tipoActivo)}</h3>
            <p className="text-xs text-slate-500">Complete la información del catálogo seleccionado.</p>
          </div>
        </div>

        <form onSubmit={guardarItem} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
            <label className="block text-xs font-bold text-slate-500">Condominio</label>
            <p className="mt-1 font-extrabold text-slate-800">{condominioNombre || "No identificado"}</p>
          </div>

          <Campo etiqueta="Nombre *">
            <input value={nombre} onChange={(event) => setNombre(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder={tipoActivo === "cargo" ? "Ejemplo: Conserje" : tipoActivo === "departamento" ? "Ejemplo: Seguridad" : "Ejemplo: Contrato fijo"} />
          </Campo>

          <Campo etiqueta="Estado">
            <select value={estado} onChange={(event) => setEstado(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </Campo>

          <div className="md:col-span-2">
            <Campo etiqueta="Descripción">
              <textarea value={descripcion} onChange={(event) => setDescripcion(event.target.value)} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" rows={3} placeholder="Descripción, funciones o detalles adicionales" />
            </Campo>
          </div>

          <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row">
            <button type="submit" disabled={guardando} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-extrabold text-white hover:bg-blue-800 disabled:bg-slate-400">
              {guardando ? <><Loader2 size={17} className="animate-spin" />Guardando...</> : <><Save size={17} />{editandoId ? "Guardar cambios" : "Guardar registro"}</>}
            </button>

            {editandoId && (
              <button type="button" onClick={limpiarFormulario} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 hover:bg-slate-50"><X size={17} />Cancelar edición</button>
            )}
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">Listado de {obtenerTituloPlural(tipoActivo)}</h3>
            <p className="text-xs text-slate-500">Registros configurados para el condominio activo.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700">{listaActual.length}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500"><Loader2 size={18} className="animate-spin text-blue-700" />Cargando catálogos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listaActual.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-extrabold text-slate-900">{item.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">{item.descripcion || "-"}</td>
                    <td className="px-4 py-3 text-center"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold ${item.estado === "Activo" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{item.estado}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button type="button" onClick={() => editarItem(item)} className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700 hover:bg-slate-50"><Edit3 size={14} />Editar</button>
                        <button type="button" onClick={() => eliminarItem(item)} disabled={eliminandoId === item.id} className="flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-extrabold text-red-700 hover:bg-red-100 disabled:opacity-60">{eliminandoId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {listaActual.length === 0 && (
                  <tr><td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={4}>No hay registros para este catálogo.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function CatalogoCard({ activo, titulo, cantidad, icono, onClick }: { activo: boolean; titulo: string; cantidad: number; icono: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-[18px] border p-4 text-left shadow-sm transition ${activo ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-900 hover:border-blue-300"}`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${activo ? "bg-white/15 text-white" : "bg-blue-50 text-blue-700"}`}>{icono}</span>
        <ChevronRight size={18} className={activo ? "text-white/80" : "text-slate-300"} />
      </div>
      <p className="mt-3 text-xs font-bold opacity-75">Catálogo</p>
      <h3 className="mt-0.5 text-base font-black">{titulo}</h3>
      <p className="mt-1 text-xs opacity-75">{cantidad} registros</p>
    </button>
  );
}

function KpiCard({ label, value, icono, tipo = "default" }: { label: string; value: number; icono: React.ReactNode; tipo?: "default" | "success" | "danger" }) {
  const clases = tipo === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : tipo === "danger" ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-white text-blue-700";
  return (
    <div className={`rounded-[18px] border p-4 shadow-sm ${clases}`}>
      <div className="flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70">{icono}</span><p className="text-2xl font-black">{value}</p></div>
      <p className="mt-3 text-xs font-extrabold">{label}</p>
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-extrabold text-slate-700">{etiqueta}</label>
      {children}
    </div>
  );
}
