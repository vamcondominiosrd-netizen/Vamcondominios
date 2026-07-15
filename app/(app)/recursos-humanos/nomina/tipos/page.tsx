"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  HandCoins,
  Loader2,
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

type TipoNomina = {
  id: number;
  condominio_id: number;
  condominio: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  frecuencia_pago: string;
  dias_periodo: number;
  requiere_afp: boolean;
  requiere_sfs: boolean;
  requiere_isr: boolean;
  requiere_tss: boolean;
  es_predeterminada: boolean;
  orden: number;
  estado: string;
};

const frecuencias = ["Mensual", "Quincenal", "Semanal", "Especial", "Anual"];
const estados = ["Activo", "Inactivo"];

function estadoClass(estado?: string | null) {
  if (estado === "Activo") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (estado === "Inactivo") {
    return "border-red-100 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function booleanoClass(valor: boolean) {
  return valor
    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-50 text-slate-500";
}

export default function TiposNominaPage() {
  const [mounted, setMounted] = useState(false);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [tipos, setTipos] = useState<TipoNomina[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [frecuenciaPago, setFrecuenciaPago] = useState("Mensual");
  const [diasPeriodo, setDiasPeriodo] = useState("30");
  const [requiereAFP, setRequiereAFP] = useState(true);
  const [requiereSFS, setRequiereSFS] = useState(true);
  const [requiereISR, setRequiereISR] = useState(true);
  const [requiereTSS, setRequiereTSS] = useState(true);
  const [esPredeterminada, setEsPredeterminada] = useState(false);
  const [orden, setOrden] = useState("1");
  const [estado, setEstado] = useState("Activo");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombreLocal =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombreLocal);

    if (!id || !Number(id)) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    cargarTipos(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarTipos(id: string) {
    const condominioIdNumero = Number(id);

    if (!condominioIdNumero) return;

    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("rh_tipos_nomina")
      .select("*")
      .eq("condominio_id", condominioIdNumero)
      .order("orden", { ascending: true })
      .order("nombre", { ascending: true });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando tipos de nómina: " + error.message);
      return;
    }

    setTipos(
      ((data as TipoNomina[]) || []).filter(
        (item) => Number(item.condominio_id) === condominioIdNumero,
      ),
    );
  }

  async function refrescar() {
    if (!condominioId || !Number(condominioId)) return;
    await cargarTipos(condominioId);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setCodigo("");
    setNombre("");
    setDescripcion("");
    setFrecuenciaPago("Mensual");
    setDiasPeriodo("30");
    setRequiereAFP(true);
    setRequiereSFS(true);
    setRequiereISR(true);
    setRequiereTSS(true);
    setEsPredeterminada(false);
    setOrden("1");
    setEstado("Activo");
  }

  function editarTipo(tipo: TipoNomina) {
    setEditandoId(tipo.id);
    setCodigo(tipo.codigo || "");
    setNombre(tipo.nombre || "");
    setDescripcion(tipo.descripcion || "");
    setFrecuenciaPago(tipo.frecuencia_pago || "Mensual");
    setDiasPeriodo(String(tipo.dias_periodo || 30));
    setRequiereAFP(Boolean(tipo.requiere_afp));
    setRequiereSFS(Boolean(tipo.requiere_sfs));
    setRequiereISR(Boolean(tipo.requiere_isr));
    setRequiereTSS(Boolean(tipo.requiere_tss));
    setEsPredeterminada(Boolean(tipo.es_predeterminada));
    setOrden(String(tipo.orden || 1));
    setEstado(tipo.estado || "Activo");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarTipo(e: React.FormEvent) {
    e.preventDefault();

    const condominioIdNumero = Number(condominioId);

    if (!condominioIdNumero || !condominioNombre) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    if (!codigo.trim()) {
      setMensaje("Debe indicar el código del tipo de nómina.");
      return;
    }

    if (!nombre.trim()) {
      setMensaje("Debe indicar el nombre del tipo de nómina.");
      return;
    }

    if (!diasPeriodo || Number(diasPeriodo) <= 0) {
      setMensaje("Debe indicar los días del período.");
      return;
    }

    const registro = {
      condominio_id: condominioIdNumero,
      condominio: condominioNombre,
      codigo: codigo.trim().toUpperCase(),
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      frecuencia_pago: frecuenciaPago,
      dias_periodo: Number(diasPeriodo || 0),
      requiere_afp: requiereAFP,
      requiere_sfs: requiereSFS,
      requiere_isr: requiereISR,
      requiere_tss: requiereTSS,
      es_predeterminada: esPredeterminada,
      orden: Number(orden || 1),
      estado,
    };

    setGuardando(true);
    setMensaje("");

    try {
      if (esPredeterminada) {
        const { error: errorPredeterminada } = await supabase
          .from("rh_tipos_nomina")
          .update({ es_predeterminada: false })
          .eq("condominio_id", condominioIdNumero);

        if (errorPredeterminada) {
          throw new Error(errorPredeterminada.message);
        }
      }

      if (editandoId) {
        const { error } = await supabase
          .from("rh_tipos_nomina")
          .update(registro)
          .eq("id", editandoId)
          .eq("condominio_id", condominioIdNumero);

        if (error) throw new Error(error.message);

        setMensaje("Tipo de nómina modificado correctamente.");
        limpiarFormulario();
        await cargarTipos(condominioId);
        return;
      }

      const { data: existente, error: errorExiste } = await supabase
        .from("rh_tipos_nomina")
        .select("id")
        .eq("condominio_id", condominioIdNumero)
        .eq("codigo", codigo.trim().toUpperCase())
        .maybeSingle();

      if (errorExiste) throw new Error(errorExiste.message);

      if (existente) {
        setMensaje("Ya existe un tipo de nómina con ese código.");
        return;
      }

      const { error } = await supabase
        .from("rh_tipos_nomina")
        .insert([registro]);

      if (error) throw new Error(error.message);

      setMensaje("Tipo de nómina registrado correctamente.");
      limpiarFormulario();
      await cargarTipos(condominioId);
    } catch (error: any) {
      setMensaje("Error guardando tipo de nómina: " + error.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(tipo: TipoNomina, nuevoEstado: string) {
    const confirmar = confirm(
      `¿Desea cambiar "${tipo.nombre}" a ${nuevoEstado}?`,
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("rh_tipos_nomina")
      .update({ estado: nuevoEstado })
      .eq("id", tipo.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      setMensaje("Error actualizando estado: " + error.message);
      return;
    }

    setMensaje("Estado actualizado correctamente.");
    await cargarTipos(condominioId);
  }

  async function eliminarTipo(tipo: TipoNomina) {
    const confirmar = confirm(
      `¿Seguro que desea eliminar el tipo de nómina "${tipo.nombre}"?`,
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("rh_tipos_nomina")
      .delete()
      .eq("id", tipo.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      setMensaje("Error eliminando tipo de nómina: " + error.message);
      return;
    }

    setMensaje("Tipo de nómina eliminado correctamente.");
    await cargarTipos(condominioId);
  }

  const tiposSeguros = useMemo(() => {
    const condominioIdNumero = Number(condominioId);
    if (!condominioIdNumero) return [];

    return tipos.filter(
      (item) => Number(item.condominio_id) === condominioIdNumero,
    );
  }, [tipos, condominioId]);

  const activos = tiposSeguros.filter((item) => item.estado === "Activo").length;
  const inactivos = tiposSeguros.filter(
    (item) => item.estado === "Inactivo",
  ).length;
  const predeterminados = tiposSeguros.filter(
    (item) => item.es_predeterminada,
  ).length;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="rounded-2xl border bg-white p-6 text-sm font-bold text-slate-600">
          Cargando módulo de tipos de nómina...
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
            icon: Clock3,
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
        title="Tipos de Nómina"
        subtitle={`Catálogo para nómina mensual, quincenal, vacaciones, regalía, liquidación y pagos especiales. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={WalletCards}
        actions={<ModuleActions onRefresh={refrescar} />}
      />

      {mensaje && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          {mensaje}
        </div>
      )}

      <SectionCard
        title="Resumen de tipos de nómina"
        subtitle="Indicadores generales del condominio activo."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Actualizando
            </div>
          ) : (
            <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">
              {tiposSeguros.length} tipo(s)
            </span>
          )
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <InfoCompacta
            label="Tipos registrados"
            value={`${tiposSeguros.length}`}
            detalle="Total del condominio"
            icon={FileText}
            color="text-blue-700"
            bg="bg-blue-50"
          />

          <InfoCompacta
            label="Activos"
            value={`${activos}`}
            detalle="Disponibles"
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

          <InfoCompacta
            label="Predeterminada"
            value={`${predeterminados}`}
            detalle="Tipo principal"
            icon={WalletCards}
            color="text-purple-700"
            bg="bg-purple-50"
          />
        </div>
      </SectionCard>

      <SectionCard
        title={editandoId ? "Modificar tipo de nómina" : "Registrar tipo de nómina"}
        subtitle="Defina la frecuencia, días del período y descuentos aplicables."
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
          onSubmit={guardarTipo}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Código *
            </label>

            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              placeholder="MEN, QUI, VAC, REG, LIQ"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Nombre *
            </label>

            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              placeholder="Nómina Mensual"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Frecuencia de pago
            </label>

            <select
              value={frecuenciaPago}
              onChange={(e) => setFrecuenciaPago(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              {frecuencias.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Días del período
            </label>

            <input
              type="number"
              min="1"
              value={diasPeriodo}
              onChange={(e) => setDiasPeriodo(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              placeholder="30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Orden
            </label>

            <input
              type="number"
              min="1"
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              placeholder="1"
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
              {estados.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
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
              placeholder="Descripción del tipo de nómina"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:col-span-2">
            <h3 className="mb-4 font-black text-slate-900">
              Aplicación de descuentos
            </h3>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <OpcionCheck
                label="Requiere AFP"
                checked={requiereAFP}
                onChange={setRequiereAFP}
              />

              <OpcionCheck
                label="Requiere SFS"
                checked={requiereSFS}
                onChange={setRequiereSFS}
              />

              <OpcionCheck
                label="Requiere ISR"
                checked={requiereISR}
                onChange={setRequiereISR}
              />

              <OpcionCheck
                label="Requiere TSS"
                checked={requiereTSS}
                onChange={setRequiereTSS}
              />

              <OpcionCheck
                label="Predeterminada"
                checked={esPredeterminada}
                onChange={setEsPredeterminada}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 md:col-span-2 md:flex-row">
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
            >
              {guardando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {editandoId ? "Guardar cambios" : "Guardar tipo"}
                </>
              )}
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
        title="Listado de tipos de nómina"
        subtitle="Tipos configurados para el condominio activo."
        action={
          <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">
            {tiposSeguros.length} tipo(s)
          </span>
        }
      >
        {loading ? (
          <div className="rounded-2xl border bg-slate-50 p-6 text-sm font-bold text-slate-600">
            Cargando tipos de nómina...
          </div>
        ) : tiposSeguros.length === 0 ? (
          <EmptyState
            title="Sin tipos de nómina"
            description="No hay tipos de nómina registrados para este condominio."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Frecuencia</th>
                <th className="px-4 py-3 text-center">Días</th>
                <th className="px-4 py-3 text-center">AFP</th>
                <th className="px-4 py-3 text-center">SFS</th>
                <th className="px-4 py-3 text-center">ISR</th>
                <th className="px-4 py-3 text-center">TSS</th>
                <th className="px-4 py-3 text-center">Pred.</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {tiposSeguros.map((tipo) => (
                <tr key={tipo.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-black text-slate-900">
                    {tipo.codigo}
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-black text-slate-900">{tipo.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {tipo.descripcion || "-"}
                    </p>
                  </td>

                  <td className="px-4 py-3 text-slate-700">
                    {tipo.frecuencia_pago}
                  </td>

                  <td className="px-4 py-3 text-center font-black">
                    {tipo.dias_periodo}
                  </td>

                  {[
                    tipo.requiere_afp,
                    tipo.requiere_sfs,
                    tipo.requiere_isr,
                    tipo.requiere_tss,
                  ].map((valor, index) => (
                    <td key={index} className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${booleanoClass(
                          valor,
                        )}`}
                      >
                        {valor ? "Sí" : "No"}
                      </span>
                    </td>
                  ))}

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${
                        tipo.es_predeterminada
                          ? "border-blue-100 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      {tipo.es_predeterminada ? "Sí" : "No"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${estadoClass(
                        tipo.estado,
                      )}`}
                    >
                      {tipo.estado}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => editarTipo(tipo)}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          cambiarEstado(
                            tipo,
                            tipo.estado === "Activo" ? "Inactivo" : "Activo",
                          )
                        }
                        className={`rounded-xl px-3 py-2 text-xs font-bold text-white ${
                          tipo.estado === "Activo"
                            ? "bg-yellow-700 hover:bg-yellow-800"
                            : "bg-emerald-700 hover:bg-emerald-800"
                        }`}
                      >
                        {tipo.estado === "Activo" ? "Inactivar" : "Activar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminarTipo(tipo)}
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

function OpcionCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (valor: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-bold transition ${
        checked
          ? "border-blue-200 bg-blue-50 text-blue-800"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
      {label}
    </label>
  );
}
