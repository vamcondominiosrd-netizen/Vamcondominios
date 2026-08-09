"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeDollarSign,
  CheckCircle2,
  CircleDollarSign,
  FileSpreadsheet,
  Pencil,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Users,
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

type TipoCargo = {
  id: number;
  condominio_id: number;
  codigo: string | null;
  nombre: string | null;
  descripcion: string | null;
  afecta_mantenimiento: boolean | null;
  genera_mora: boolean | null;
  estado: string | null;
  created_at: string | null;
};

function normalizarTexto(valor: string | null | undefined) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function estadoActivo(valor: string | null | undefined) {
  return normalizarTexto(valor) === "activo";
}

export default function TiposCargosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [tipos, setTipos] = useState<TipoCargo[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [afectaMantenimiento, setAfectaMantenimiento] = useState(false);
  const [generaMora, setGeneraMora] = useState(false);
  const [estado, setEstado] = useState("ACTIVO");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombreCondominio =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombreCondominio);

    if (!id) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    cargarTipos(id);
  }, []);

  async function cargarTipos(id = condominioId) {
    if (!id) return;

    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("tipos_cargos")
      .select(
        "id, condominio_id, codigo, nombre, descripcion, afecta_mantenimiento, genera_mora, estado, created_at",
      )
      .eq("condominio_id", Number(id))
      .order("codigo", { ascending: true });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando tipos de cargos: " + error.message);
      return;
    }

    setTipos((data as TipoCargo[]) || []);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setCodigo("");
    setNombre("");
    setDescripcion("");
    setAfectaMantenimiento(false);
    setGeneraMora(false);
    setEstado("ACTIVO");
  }

  async function guardarTipo(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    if (!codigo.trim()) {
      setMensaje("Debe indicar el código del tipo de cargo.");
      return;
    }

    if (!nombre.trim()) {
      setMensaje("Debe indicar el nombre del tipo de cargo.");
      return;
    }

    const codigoFinal = codigo.trim().toUpperCase().replace(/\s+/g, "_");

    setGuardando(true);
    setMensaje("");

    const registro = {
      condominio_id: Number(condominioId),
      codigo: codigoFinal,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      afecta_mantenimiento: afectaMantenimiento,
      genera_mora: generaMora,
      estado,
    };

    let error;

    if (editandoId) {
      const respuesta = await supabase
        .from("tipos_cargos")
        .update(registro)
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      error = respuesta.error;
    } else {
      const respuesta = await supabase.from("tipos_cargos").insert([registro]);
      error = respuesta.error;
    }

    setGuardando(false);

    if (error) {
      setMensaje("Error guardando tipo de cargo: " + error.message);
      return;
    }

    setMensaje(
      editandoId
        ? "Tipo de cargo actualizado correctamente."
        : "Tipo de cargo registrado correctamente.",
    );

    limpiarFormulario();
    cargarTipos(condominioId);
  }

  function cargarParaEditar(item: TipoCargo) {
    setEditandoId(item.id);
    setCodigo(item.codigo || "");
    setNombre(item.nombre || "");
    setDescripcion(item.descripcion || "");
    setAfectaMantenimiento(Boolean(item.afecta_mantenimiento));
    setGeneraMora(Boolean(item.genera_mora));
    setEstado(item.estado || "ACTIVO");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function cambiarEstado(item: TipoCargo) {
    if (!condominioId) return;

    const nuevoEstado = estadoActivo(item.estado) ? "INACTIVO" : "ACTIVO";

    const confirmar = confirm(
      `¿Desea cambiar el tipo de cargo "${item.nombre}" a ${nuevoEstado}?`,
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("tipos_cargos")
      .update({
        estado: nuevoEstado,
      })
      .eq("id", item.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      setMensaje("Error cambiando estado: " + error.message);
      return;
    }

    setMensaje("Estado actualizado correctamente.");
    cargarTipos(condominioId);
  }

  async function cargarTiposBasicos() {
    if (!condominioId) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    const confirmar = confirm(
      `Se cargarán los tipos básicos de cargos para el condominio:\n\n${condominioNombre}\n\n¿Desea continuar?`,
    );

    if (!confirmar) return;

    const registros = [
      {
        condominio_id: Number(condominioId),
        codigo: "MANTENIMIENTO",
        nombre: "Mantenimiento mensual",
        descripcion: "Cargo mensual ordinario de mantenimiento del condominio.",
        afecta_mantenimiento: true,
        genera_mora: true,
        estado: "ACTIVO",
      },
      {
        condominio_id: Number(condominioId),
        codigo: "MORA",
        nombre: "Mora por atraso",
        descripcion: "Cargo por pago fuera de la fecha límite.",
        afecta_mantenimiento: false,
        genera_mora: false,
        estado: "ACTIVO",
      },
      {
        condominio_id: Number(condominioId),
        codigo: "EXTRAORDINARIO",
        nombre: "Cargo extraordinario",
        descripcion: "Cargo especial aprobado por la administración o asamblea.",
        afecta_mantenimiento: false,
        genera_mora: false,
        estado: "ACTIVO",
      },
      {
        condominio_id: Number(condominioId),
        codigo: "RESERVA",
        nombre: "Fondo de reserva",
        descripcion: "Cargo destinado al fondo de reserva del condominio.",
        afecta_mantenimiento: false,
        genera_mora: false,
        estado: "ACTIVO",
      },
    ];

    setLoading(true);
    setMensaje("");

    const { error } = await supabase.from("tipos_cargos").upsert(registros, {
      onConflict: "condominio_id,codigo",
    });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando tipos básicos: " + error.message);
      return;
    }

    setMensaje("Tipos básicos cargados correctamente.");
    cargarTipos(condominioId);
  }

  const activos = useMemo(
    () => tipos.filter((t) => estadoActivo(t.estado)).length,
    [tipos],
  );

  const inactivos = useMemo(() => tipos.length - activos, [tipos, activos]);

  const mantenimiento = useMemo(
    () => tipos.filter((t) => Boolean(t.afecta_mantenimiento)).length,
    [tipos],
  );

  const generanMora = useMemo(
    () => tipos.filter((t) => Boolean(t.genera_mora)).length,
    [tipos],
  );

  return (
    <PageContainer>
      <ModuleMenu
        title="Configuración"
        subtitle="Configuración del Sistema VAM: cargos, usuarios, roles, permisos, empresa y parámetros generales."
        tone="blue"
        items={[
          {
            href: "/configuracion",
            label: "Inicio configuración",
            icon: Settings,
          },
          {
            href: "/consulta-estado/configuracion-cargos",
            label: "Cargos y Generación",
            icon: CircleDollarSign,
          },
          {
            href: "/configuracion/tipos-cargos",
            label: "Tipos de Cargos",
            icon: BadgeDollarSign,
          },
          {
            href: "/configuracion/configuracion-usuarios-sistema/usuarios",
            label: "Usuarios",
            icon: Users,
          },
          {
            href: "/configuracion/configuracion-usuarios-sistema/roles",
            label: "Roles y Permisos",
            icon: ShieldCheck,
          },
        ]}
      />

      <ModuleToolbar
        title="Tipos de Cargos"
        subtitle={`Catálogo para definir cargos como mantenimiento, mora, extraordinarios y reservas. Condominio: ${
          condominioNombre || "No seleccionado"
        }.`}
        icon={BadgeDollarSign}
        actions={
          <ModuleActions
            onRefresh={() => cargarTipos(condominioId)}
            extra={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/configuracion"
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </Link>

                <button
                  type="button"
                  onClick={cargarTiposBasicos}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Cargar básicos
                </button>
              </div>
            }
          />
        }
      />

      {mensaje && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <InfoBox label="Tipos activos" value={activos} tone="emerald" />
        <InfoBox label="Tipos inactivos" value={inactivos} tone="red" />
        <InfoBox
          label="Afectan mantenimiento"
          value={mantenimiento}
          tone="blue"
        />
        <InfoBox label="Generan mora" value={generanMora} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="xl:col-span-1">
          <SectionCard
            title={editandoId ? "Editar tipo de cargo" : "Registrar tipo de cargo"}
            subtitle="Defina el código, nombre y reglas de comportamiento del cargo."
          >
            <form onSubmit={guardarTipo} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Código *
                </label>

                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="Ej. MANTENIMIENTO"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Se guardará en mayúscula y sin espacios.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Nombre *
                </label>

                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="Ej. Mantenimiento mensual"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Descripción
                </label>

                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  rows={4}
                  placeholder="Descripción del tipo de cargo"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  ¿Afecta mantenimiento mensual?
                </label>

                <select
                  value={afectaMantenimiento ? "SI" : "NO"}
                  onChange={(e) =>
                    setAfectaMantenimiento(e.target.value === "SI")
                  }
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                >
                  <option value="SI">Sí</option>
                  <option value="NO">No</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  ¿Genera mora?
                </label>

                <select
                  value={generaMora ? "SI" : "NO"}
                  onChange={(e) => setGeneraMora(e.target.value === "SI")}
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                >
                  <option value="SI">Sí</option>
                  <option value="NO">No</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Estado
                </label>

                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO</option>
                </select>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {guardando
                    ? "Guardando..."
                    : editandoId
                      ? "Actualizar tipo"
                      : "Guardar tipo"}
                </button>

                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-700 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                >
                  {editandoId ? "Cancelar" : "Limpiar"}
                </button>
              </div>
            </form>
          </SectionCard>
        </section>

        <section className="xl:col-span-2">
          <SectionCard
            title="Tipos registrados"
            subtitle="Listado de tipos de cargos configurados para el condominio activo."
            action={
              loading ? (
                <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Cargando
                </div>
              ) : (
                <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                  Registros: {tipos.length}
                </div>
              )
            }
          >
            {loading ? (
              <p className="text-sm text-slate-500">
                Cargando tipos de cargos...
              </p>
            ) : !condominioId ? (
              <EmptyState
                title="Condominio no identificado"
                description="No se encontró un condominio activo. Debe iniciar sesión nuevamente."
              />
            ) : tipos.length === 0 ? (
              <EmptyState
                title="Sin tipos de cargos"
                description="No hay tipos de cargos registrados para este condominio."
              />
            ) : (
              <DataTable>
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Código</th>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-center">Mant.</th>
                    <th className="px-4 py-3 text-center">Mora</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {tipos.map((t) => (
                    <tr key={t.id} className="bg-white hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-black text-slate-900">
                          {t.codigo || "-"}
                        </p>

                        <p className="mt-1 max-w-[280px] truncate text-xs text-slate-500">
                          {t.descripcion || "Sin descripción"}
                        </p>
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {t.nombre || "-"}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <BooleanBadge activo={Boolean(t.afecta_mantenimiento)} />
                      </td>

                      <td className="px-4 py-3 text-center">
                        <BooleanBadge activo={Boolean(t.genera_mora)} />
                      </td>

                      <td className="px-4 py-3 text-center">
                        <EstadoBadge activo={estadoActivo(t.estado)} />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => cargarParaEditar(t)}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => cambiarEstado(t)}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-white ${
                              estadoActivo(t.estado)
                                ? "bg-red-700 hover:bg-red-800"
                                : "bg-emerald-700 hover:bg-emerald-800"
                            }`}
                          >
                            {estadoActivo(t.estado) ? (
                              <ToggleLeft className="h-3.5 w-3.5" />
                            ) : (
                              <ToggleRight className="h-3.5 w-3.5" />
                            )}
                            {estadoActivo(t.estado) ? "Inactivar" : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </SectionCard>
        </section>
      </div>

      <SectionCard
        title="Regla del sistema"
        subtitle="Este catálogo define el comportamiento de cargos dentro de VAM."
      >
        <div className="rounded-2xl border bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
          El cargo mensual ordinario del condominio debe usar el código{" "}
          <strong>MANTENIMIENTO</strong>. Los demás cargos se usan para mora,
          fondos de reserva, cargos extraordinarios u otros conceptos
          administrativos.
        </div>
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
  value: number;
  tone?: "slate" | "emerald" | "red" | "blue" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "red"
        ? "bg-red-50 text-red-700 border-red-100"
        : tone === "blue"
          ? "bg-blue-50 text-blue-700 border-blue-100"
          : tone === "amber"
            ? "bg-amber-50 text-amber-700 border-amber-100"
            : "bg-white text-slate-800 border-slate-200";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>

      <h2 className="mt-2 text-3xl font-black">
        {Number(value || 0).toLocaleString("es-DO")}
      </h2>
    </div>
  );
}

function BooleanBadge({ activo }: { activo: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${
        activo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      {activo ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <XCircle className="h-3.5 w-3.5" />
      )}
      {activo ? "Sí" : "No"}
    </span>
  );
}

function EstadoBadge({ activo }: { activo: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
        activo ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      {activo ? "ACTIVO" : "INACTIVO"}
    </span>
  );
}
