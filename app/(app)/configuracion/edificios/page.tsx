"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  CircleDollarSign,
  CircleOff,
  Edit3,
  LayoutDashboard,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type Edificio = {
  id: number;
  client_id: number;
  condominio_id: number;
  codigo: string;
  nombre: string;
  estado: string;
  created_at: string | null;
};

type CondominioBase = {
  id: number;
  client_id: number | null;
  nombre: string;
};

type FormularioEdificio = {
  id: number | null;
  codigo: string;
  nombre: string;
  estado: "activo" | "inactivo";
};

const FORMULARIO_VACIO: FormularioEdificio = {
  id: null,
  codigo: "",
  nombre: "",
  estado: "activo",
};

function normalizarEstado(valor?: string | null) {
  return String(valor || "").trim().toLowerCase();
}

export default function ConfiguracionEdificiosPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [condominioNombre, setCondominioNombre] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);

  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [busqueda, setBusqueda] = useState("");

  const [form, setForm] = useState<FormularioEdificio>(FORMULARIO_VACIO);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [actualizandoEstado, setActualizandoEstado] = useState<number | null>(
    null,
  );

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const id = Number(localStorage.getItem("condominio_id") || 0);
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    if (!id) {
      router.push("/login");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre);

    void cargarTodo(id);
  }, [router]);

  async function cargarTodo(id?: number) {
    const idActivo = id || condominioId;

    if (!idActivo) return;

    setCargando(true);
    setError("");

    try {
      const { data: condominioData, error: condominioError } = await supabase
        .from("condominios")
        .select("id, client_id, nombre")
        .eq("id", Number(idActivo))
        .single();

      if (condominioError) throw condominioError;

      const condominio = condominioData as CondominioBase;

      if (!condominio?.client_id) {
        throw new Error(
          "El condominio activo no tiene client_id. No se puede administrar el catálogo de edificios.",
        );
      }

      setClientId(Number(condominio.client_id));
      setCondominioNombre(
        condominio.nombre || condominioNombre || `Condominio ID ${idActivo}`,
      );

      const { data: edificiosData, error: edificiosError } = await supabase
        .from("edificios")
        .select(
          "id, client_id, condominio_id, codigo, nombre, estado, created_at",
        )
        .eq("condominio_id", Number(idActivo))
        .order("codigo", { ascending: true });

      if (edificiosError) throw edificiosError;

      setEdificios((edificiosData || []) as Edificio[]);
    } catch (err: any) {
      setEdificios([]);
      setError(
        err?.message || "No fue posible cargar el catálogo de edificios.",
      );
    } finally {
      setCargando(false);
    }
  }

  function limpiarFormulario() {
    setForm(FORMULARIO_VACIO);
    setError("");
  }

  function nuevoEdificio() {
    setForm(FORMULARIO_VACIO);
    setMensaje("");
    setError("");
  }

  function editarEdificio(edificio: Edificio) {
    setForm({
      id: edificio.id,
      codigo: edificio.codigo || "",
      nombre: edificio.nombre || "",
      estado:
        normalizarEstado(edificio.estado) === "inactivo"
          ? "inactivo"
          : "activo",
    });

    setMensaje("");
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cambiarCodigo(valor: string) {
    const codigo = valor.toUpperCase().replace(/\s+/g, "");

    setForm((actual) => {
      const nombreAnteriorAutomatico =
        !actual.codigo ||
        actual.nombre.trim().toUpperCase() ===
          `EDIFICIO ${actual.codigo}`.toUpperCase();

      return {
        ...actual,
        codigo,
        nombre: nombreAnteriorAutomatico
          ? codigo
            ? `Edificio ${codigo}`
            : ""
          : actual.nombre,
      };
    });
  }

  async function guardarEdificio() {
    if (!condominioId || !clientId) {
      setError("No se pudo identificar el condominio o cliente activo.");
      return;
    }

    const codigo = form.codigo.trim().toUpperCase();
    const nombre = form.nombre.trim();

    if (!codigo) {
      setError("El código del edificio es obligatorio.");
      return;
    }

    if (!nombre) {
      setError("El nombre del edificio es obligatorio.");
      return;
    }

    setGuardando(true);
    setMensaje("");
    setError("");

    try {
      if (form.id) {
        const { error: updateError } = await supabase
          .from("edificios")
          .update({
            codigo,
            nombre,
            estado: form.estado,
          })
          .eq("id", form.id)
          .eq("condominio_id", condominioId);

        if (updateError) throw updateError;

        setMensaje("Edificio actualizado correctamente.");
      } else {
        const { error: insertError } = await supabase.from("edificios").insert([
          {
            client_id: clientId,
            condominio_id: condominioId,
            codigo,
            nombre,
            estado: "activo",
          },
        ]);

        if (insertError) throw insertError;

        setMensaje("Edificio creado correctamente.");
      }

      setForm(FORMULARIO_VACIO);
      await cargarTodo(condominioId);
    } catch (err: any) {
      const mensajeError = String(err?.message || "");

      if (
        mensajeError.toLowerCase().includes("duplicate") ||
        mensajeError.includes("edificios_condominio_codigo_unique")
      ) {
        setError(
          `Ya existe un edificio con el código "${codigo}" dentro de este condominio.`,
        );
      } else {
        setError(mensajeError || "No fue posible guardar el edificio.");
      }
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(edificio: Edificio) {
    if (!condominioId) return;

    const estaActivo = normalizarEstado(edificio.estado) === "activo";
    const nuevoEstado = estaActivo ? "inactivo" : "activo";
    const accion = estaActivo ? "desactivar" : "activar";

    const confirmado = window.confirm(
      `¿Desea ${accion} "${edificio.nombre}"?\n\n` +
        "El registro no se eliminará. Esta acción conserva el histórico.",
    );

    if (!confirmado) return;

    setActualizandoEstado(edificio.id);
    setMensaje("");
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("edificios")
        .update({ estado: nuevoEstado })
        .eq("id", edificio.id)
        .eq("condominio_id", condominioId);

      if (updateError) throw updateError;

      if (form.id === edificio.id) {
        setForm((actual) => ({ ...actual, estado: nuevoEstado }));
      }

      setMensaje(
        `Edificio ${nuevoEstado === "activo" ? "activado" : "desactivado"} correctamente.`,
      );

      await cargarTodo(condominioId);
    } catch (err: any) {
      setError(err?.message || "No fue posible cambiar el estado del edificio.");
    } finally {
      setActualizandoEstado(null);
    }
  }

  const edificiosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return edificios;

    return edificios.filter((edificio) => {
      return (
        String(edificio.codigo || "")
          .toLowerCase()
          .includes(texto) ||
        String(edificio.nombre || "")
          .toLowerCase()
          .includes(texto) ||
        normalizarEstado(edificio.estado).includes(texto)
      );
    });
  }, [edificios, busqueda]);

  const activos = edificios.filter(
    (edificio) => normalizarEstado(edificio.estado) === "activo",
  ).length;

  const inactivos = edificios.length - activos;

  return (
    <PageContainer>
      <ModuleMenu
        title="Configuración"
        subtitle="Parámetros, módulos, usuarios, roles y accesos del condominio."
        tone="slate"
        items={[
          {
            href: "/configuracion",
            label: "Inicio configuración",
            icon: LayoutDashboard,
          },
          {
            href: "/consulta-estado/configuracion-cargos",
            label: "Cargos y generación",
            icon: CircleDollarSign,
          },
          {
            href: "/configuracion/tipos-cargos",
            label: "Tipos de cargos",
            icon: Settings,
          },
          {
            href: "/configuracion/edificios",
            label: "Edificios",
            icon: Building2,
          },
          {
            href: "/configuracion/modulos",
            label: "Módulos habilitados",
            icon: Package,
          },
          {
            href: "/configuracion/usuarios",
            label: "Usuarios y accesos",
            icon: Users,
          },
          {
            href: "/configuracion/roles",
            label: "Roles y permisos",
            icon: ShieldCheck,
          },
        ]}
      />

      <ModuleToolbar
        title="Catálogo de Edificios"
        subtitle={`Registro y mantenimiento de los edificios del condominio. Condominio: ${
          condominioNombre || "No seleccionado"
        }.`}
        icon={Building2}
        actions={
          <ModuleActions
            onRefresh={() =>
              condominioId ? cargarTodo(condominioId) : undefined
            }
            extra={
              <button
                type="button"
                onClick={nuevoEdificio}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
              >
                <Plus className="h-4 w-4" />
                Nuevo edificio
              </button>
            }
          />
        }
      />

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          <X className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {mensaje && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          <Check className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{mensaje}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <InfoBox
          label="Edificios registrados"
          value={String(edificios.length)}
          tone="slate"
        />
        <InfoBox label="Activos" value={String(activos)} tone="emerald" />
        <InfoBox label="Inactivos" value={String(inactivos)} tone="amber" />
        <InfoBox
          label="Condominio activo"
          value={condominioNombre || "No seleccionado"}
          tone="blue"
          compact
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_1fr]">
        <SectionCard
          title={form.id ? "Editar edificio" : "Registrar edificio"}
          subtitle={
            form.id
              ? "Actualice el código, nombre o estado del edificio."
              : "Digite el código y nombre que identifican el edificio dentro del condominio."
          }
        >
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-black text-slate-700">
                Código *
              </label>
              <input
                type="text"
                value={form.codigo}
                onChange={(event) => cambiarCodigo(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Ej. AB, CD, TORRE1"
                maxLength={30}
              />
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Debe ser único dentro del condominio.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-black text-slate-700">
                Nombre *
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(event) =>
                  setForm((actual) => ({
                    ...actual,
                    nombre: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Ej. Edificio AB"
                maxLength={120}
              />
            </div>

            {form.id && (
              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Estado
                </label>
                <select
                  value={form.estado}
                  onChange={(event) =>
                    setForm((actual) => ({
                      ...actual,
                      estado: event.target.value as "activo" | "inactivo",
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            )}

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
              Los edificios se administran por condominio. Un mismo código puede
              existir en condominios diferentes, pero no puede repetirse dentro
              del mismo condominio.
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              Para proteger solicitudes y estadísticas históricas, los edificios
              no se eliminan físicamente. Cuando ya no se utilicen, deben
              desactivarse.
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <button
                type="button"
                onClick={guardarEdificio}
                disabled={guardando || cargando}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {form.id ? "Guardar cambios" : "Crear edificio"}
              </button>

              {form.id && (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Edificios del condominio"
          subtitle="Catálogo disponible para clasificar las solicitudes de pago."
          action={
            cargando ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Cargando
              </div>
            ) : (
              <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                Registros: {edificiosFiltrados.length}
              </div>
            )
          }
        >
          <div className="mb-4">
            <label className="mb-1 block text-sm font-semibold">
              Buscar edificio
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                className="w-full rounded-xl border px-10 py-3 text-sm"
                placeholder="Buscar por código, nombre o estado..."
              />
            </div>
          </div>

          {cargando ? (
            <p className="text-sm text-slate-500">Cargando edificios...</p>
          ) : !condominioId ? (
            <EmptyState
              title="Condominio no identificado"
              description="No se encontró un condominio activo. Debe iniciar sesión nuevamente."
            />
          ) : edificiosFiltrados.length === 0 ? (
            <EmptyState
              title="Sin edificios registrados"
              description="Utilice el formulario para registrar el primer edificio de este condominio."
            />
          ) : (
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Código</th>
                  <th className="px-4 py-3 text-left">Edificio</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {edificiosFiltrados.map((edificio) => {
                  const activo =
                    normalizarEstado(edificio.estado) === "activo";

                  return (
                    <tr
                      key={edificio.id}
                      className="bg-white hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-xl bg-blue-50 px-3 py-1.5 font-black text-blue-700">
                          {edificio.codigo}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <Building2 className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="font-black text-slate-900">
                              {edificio.nombre}
                            </p>
                            <p className="text-xs font-semibold text-slate-500">
                              ID {edificio.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
                            activo
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {activo ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <CircleOff className="h-3.5 w-3.5" />
                          )}
                          {activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => editarEdificio(edificio)}
                            className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => cambiarEstado(edificio)}
                            disabled={actualizandoEstado === edificio.id}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-50 ${
                              activo
                                ? "bg-slate-600 hover:bg-slate-700"
                                : "bg-emerald-700 hover:bg-emerald-800"
                            }`}
                          >
                            {actualizandoEstado === edificio.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : activo ? (
                              <CircleOff className="h-3.5 w-3.5" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            {activo ? "Desactivar" : "Activar"}
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
      </div>
    </PageContainer>
  );
}

function InfoBox({
  label,
  value,
  tone = "slate",
  compact = false,
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "amber" | "blue";
  compact?: boolean;
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : tone === "blue"
          ? "bg-blue-50 text-blue-700 border-blue-100"
          : "bg-white text-slate-800 border-slate-200";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2
        className={`mt-2 font-black ${
          compact ? "truncate text-lg" : "text-2xl"
        }`}
        title={value}
      >
        {value}
      </h2>
    </div>
  );
}
