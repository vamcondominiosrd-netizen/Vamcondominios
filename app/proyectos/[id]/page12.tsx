"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileText,
  Flag,
  Info,
  Loader2,
  Save,
  Target,
  UserRound,
  UsersRound,
  Wrench,
  Pencil,
  X,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";

type CatalogoBase = {
  id: number;
  codigo: string;
  nombre: string;
  orden?: number | null;
};

type EstadoProyecto = CatalogoBase & {
  es_inicial?: boolean | null;
};

type UsuarioEmpresa = {
  id: number;
  empresa_id: number;
  nombre_usuario: string | null;
  correo: string | null;
};

type CondominioContexto = {
  id: number;
  client_id: number | null;
  empresa_id: number | null;
  nombre: string;
};

type Aviso = {
  tipo: "success" | "error" | "info";
  titulo: string;
  mensaje: string;
};

function dinero(valor: number | string | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatoFecha(fecha?: string | null) {
  if (!fecha) return "Pendiente";
  const limpia = String(fecha).split("T")[0];
  const partes = limpia.split("-");
  if (partes.length !== 3) return fecha;
  const [anio, mes, dia] = partes;
  return `${dia}/${mes}/${anio}`;
}

export default function ProyectoDetalleEditablePage() {
  const params = useParams();
  const proyectoId = Number(params?.id);
  const [codigoProyecto, setCodigoProyecto] = useState("");
  const [estadoCodigo, setEstadoCodigo] = useState("");
  const [solicitantePrincipalId, setSolicitantePrincipalId] = useState<number | null>(null);
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [contextoCondominio, setContextoCondominio] =
    useState<CondominioContexto | null>(null);
  const [usuarioEmpresa, setUsuarioEmpresa] = useState<UsuarioEmpresa | null>(
    null,
  );

  const [tipos, setTipos] = useState<CatalogoBase[]>([]);
  const [prioridades, setPrioridades] = useState<CatalogoBase[]>([]);
  const [estados, setEstados] = useState<EstadoProyecto[]>([]);
  const [fuentes, setFuentes] = useState<CatalogoBase[]>([]);
  const [usuariosEmpresa, setUsuariosEmpresa] = useState<UsuarioEmpresa[]>([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [proyectoActualizado, setProyectoActualizado] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipoProyectoId, setTipoProyectoId] = useState("");
  const [prioridadId, setPrioridadId] = useState("");
  const [fuenteFinanciamientoId, setFuenteFinanciamientoId] = useState("");
  const [areaAfectada, setAreaAfectada] = useState("");

  const [solicitadoPor, setSolicitadoPor] = useState("");
  const [cargoRepresentacion, setCargoRepresentacion] = useState("");

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [responsableId, setResponsableId] = useState("");
  const [supervisorId, setSupervisorId] = useState("");

  const [presupuestoEstimado, setPresupuestoEstimado] = useState("");
  const [requiereCuotaExtraordinaria, setRequiereCuotaExtraordinaria] =
    useState(false);
  const [observacionFinanciera, setObservacionFinanciera] = useState("");

  const [problemaNecesidad, setProblemaNecesidad] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [beneficiosEsperados, setBeneficiosEsperados] = useState("");
  const [consecuenciasNoEjecutar, setConsecuenciasNoEjecutar] = useState("");
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    const idGuardado = localStorage.getItem("condominio_id") || "";
    const nombreGuardado = localStorage.getItem("condominio_nombre") || "";

    if (!idGuardado) {
      setCargando(false);
      setAviso({
        tipo: "error",
        titulo: "Condominio no identificado",
        mensaje: "No hay condominio activo. Debe iniciar sesión nuevamente.",
      });
      return;
    }

    setCondominioId(idGuardado);
    setCondominioNombre(
      nombreGuardado || `Condominio ID ${idGuardado}`,
    );
    if (!proyectoId || Number.isNaN(proyectoId)) {
      setCargando(false);
      setAviso({
        tipo: "error",
        titulo: "Proyecto no válido",
        mensaje: "No se recibió un identificador de proyecto válido.",
      });
      return;
    }

    cargarPantalla(idGuardado, proyectoId);
  }, [proyectoId]);

  const tipoSeleccionado = useMemo(
    () => tipos.find((item) => String(item.id) === tipoProyectoId) || null,
    [tipos, tipoProyectoId],
  );

  const prioridadSeleccionada = useMemo(
    () =>
      prioridades.find((item) => String(item.id) === prioridadId) || null,
    [prioridades, prioridadId],
  );

  const fuenteSeleccionada = useMemo(
    () =>
      fuentes.find((item) => String(item.id) === fuenteFinanciamientoId) ||
      null,
    [fuentes, fuenteFinanciamientoId],
  );

  const responsableSeleccionado = useMemo(
    () =>
      usuariosEmpresa.find((item) => String(item.id) === responsableId) || null,
    [usuariosEmpresa, responsableId],
  );

  const presupuestoNumero = Number(presupuestoEstimado || 0);

  const duracionEstimada = useMemo(() => {
    if (!fechaInicio || !fechaFin) return null;
    const inicio = new Date(`${fechaInicio}T00:00:00`);
    const fin = new Date(`${fechaFin}T00:00:00`);
    const diferencia = Math.round(
      (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diferencia >= 0 ? diferencia + 1 : null;
  }, [fechaInicio, fechaFin]);

  const puedeGuardar =
    !!condominioId &&
    !!contextoCondominio &&
    !!usuarioEmpresa &&
    !!nombre.trim() &&
    !!tipoProyectoId &&
    !!prioridadId &&
    !!fuenteFinanciamientoId &&
    !!solicitadoPor.trim() &&
    !!cargoRepresentacion.trim() &&
    !guardando;

  async function cargarPantalla(id: string, idProyecto: number) {
    try {
      setCargando(true);
      setAviso(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) {
        throw new Error("No se pudo identificar el usuario autenticado.");
      }

      const { data: condominioData, error: condominioError } = await supabase
        .from("condominios")
        .select("id, client_id, empresa_id, nombre")
        .eq("id", Number(id))
        .single();

      if (condominioError) throw condominioError;
      if (!condominioData) {
        throw new Error("No se encontró el condominio activo.");
      }

      const condominioActual = condominioData as CondominioContexto;
      setContextoCondominio(condominioActual);
      setCondominioNombre(condominioActual.nombre || `Condominio ID ${id}`);

      let consultaUsuario = supabase
        .from("usuarios_empresas")
        .select("id, empresa_id, nombre_usuario, correo")
        .eq("user_id", user.id)
        .eq("activo", true);

      if (condominioActual.empresa_id) {
        consultaUsuario = consultaUsuario.eq(
          "empresa_id",
          condominioActual.empresa_id,
        );
      }

      const { data: usuarioData, error: usuarioError } = await consultaUsuario
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (usuarioError) throw usuarioError;
      if (!usuarioData) {
        throw new Error(
          "El usuario autenticado no tiene una empresa activa asignada para este condominio.",
        );
      }

      const usuarioActual = usuarioData as UsuarioEmpresa;
      setUsuarioEmpresa(usuarioActual);

      const empresaConsulta =
        condominioActual.empresa_id || usuarioActual.empresa_id;

      const [
        tiposResponse,
        prioridadesResponse,
        estadosResponse,
        fuentesResponse,
        usuariosResponse,
      ] = await Promise.all([
        supabase
          .from("proyectos_tipos")
          .select("id, codigo, nombre, orden")
          .eq("activo", true)
          .order("orden", { ascending: true }),
        supabase
          .from("proyectos_prioridades")
          .select("id, codigo, nombre, orden")
          .eq("activo", true)
          .order("orden", { ascending: true }),
        supabase
          .from("proyectos_estados")
          .select("id, codigo, nombre, orden, es_inicial")
          .eq("activo", true)
          .order("orden", { ascending: true }),
        supabase
          .from("proyectos_fuentes_financiamiento")
          .select("id, codigo, nombre, orden")
          .eq("activo", true)
          .order("orden", { ascending: true }),
        supabase
          .from("usuarios_empresas")
          .select("id, empresa_id, nombre_usuario, correo")
          .eq("empresa_id", empresaConsulta)
          .eq("activo", true)
          .order("nombre_usuario", { ascending: true }),
      ]);

      if (tiposResponse.error) throw tiposResponse.error;
      if (prioridadesResponse.error) throw prioridadesResponse.error;
      if (estadosResponse.error) throw estadosResponse.error;
      if (fuentesResponse.error) throw fuentesResponse.error;
      if (usuariosResponse.error) throw usuariosResponse.error;

      const tiposData = (tiposResponse.data || []) as CatalogoBase[];
      const prioridadesData = (prioridadesResponse.data || []) as CatalogoBase[];
      const estadosData = (estadosResponse.data || []) as EstadoProyecto[];
      const fuentesData = (fuentesResponse.data || []) as CatalogoBase[];
      const usuariosData = (usuariosResponse.data || []) as UsuarioEmpresa[];

      setTipos(tiposData);
      setPrioridades(prioridadesData);
      setEstados(estadosData);
      setFuentes(fuentesData);
      setUsuariosEmpresa(usuariosData);

      const { data: proyectoData, error: proyectoError } = await supabase
        .from("proyectos")
        .select(`
          id, condominio_id, codigo, nombre, descripcion, tipo_proyecto_id,
          prioridad_id, estado_id, fuente_financiamiento_id, area_afectada,
          fecha_inicio_estimada, fecha_fin_estimada, presupuesto_estimado,
          requiere_cuota_extraordinaria, problema_necesidad, objetivo,
          beneficios_esperados, consecuencias_no_ejecutar,
          observacion_financiera, observaciones,
          responsable_usuario_empresa_id, supervisor_usuario_empresa_id,
          proyectos_estados(codigo)
        `)
        .eq("id", idProyecto)
        .eq("condominio_id", Number(id))
        .maybeSingle();

      if (proyectoError) throw proyectoError;
      if (!proyectoData) {
        throw new Error(
          "El proyecto no existe o no pertenece al condominio activo.",
        );
      }

      const estadoProyecto = Array.isArray(proyectoData.proyectos_estados)
        ? proyectoData.proyectos_estados[0]
        : proyectoData.proyectos_estados;
      const codigoEstadoActual = estadoProyecto?.codigo || "";

      setEstadoCodigo(codigoEstadoActual);
      setCodigoProyecto(String(proyectoData.codigo || ""));

      if (codigoEstadoActual !== "BORRADOR") {
        throw new Error(
          `El proyecto ${proyectoData.codigo} no puede editarse porque su estado actual es ${codigoEstadoActual || "desconocido"}.`,
        );
      }

      const { data: solicitanteData, error: solicitanteError } = await supabase
        .from("proyectos_solicitantes")
        .select("id, nombre_solicitante, cargo_o_representacion")
        .eq("proyecto_id", idProyecto)
        .eq("activo", true)
        .eq("es_principal", true)
        .maybeSingle();

      if (solicitanteError) throw solicitanteError;

      setSolicitantePrincipalId(
        solicitanteData?.id ? Number(solicitanteData.id) : null,
      );
      setNombre(String(proyectoData.nombre || ""));
      setDescripcion(String(proyectoData.descripcion || ""));
      setTipoProyectoId(String(proyectoData.tipo_proyecto_id || ""));
      setPrioridadId(String(proyectoData.prioridad_id || ""));
      setFuenteFinanciamientoId(
        String(proyectoData.fuente_financiamiento_id || ""),
      );
      setAreaAfectada(String(proyectoData.area_afectada || ""));
      setSolicitadoPor(String(solicitanteData?.nombre_solicitante || ""));
      setCargoRepresentacion(
        String(solicitanteData?.cargo_o_representacion || ""),
      );
      setFechaInicio(String(proyectoData.fecha_inicio_estimada || ""));
      setFechaFin(String(proyectoData.fecha_fin_estimada || ""));
      setResponsableId(
        proyectoData.responsable_usuario_empresa_id
          ? String(proyectoData.responsable_usuario_empresa_id)
          : "",
      );
      setSupervisorId(
        proyectoData.supervisor_usuario_empresa_id
          ? String(proyectoData.supervisor_usuario_empresa_id)
          : "",
      );
      setPresupuestoEstimado(
        String(Number(proyectoData.presupuesto_estimado || 0)),
      );
      setRequiereCuotaExtraordinaria(
        Boolean(proyectoData.requiere_cuota_extraordinaria),
      );
      setObservacionFinanciera(
        String(proyectoData.observacion_financiera || ""),
      );
      setProblemaNecesidad(String(proyectoData.problema_necesidad || ""));
      setObjetivo(String(proyectoData.objetivo || ""));
      setBeneficiosEsperados(
        String(proyectoData.beneficios_esperados || ""),
      );
      setConsecuenciasNoEjecutar(
        String(proyectoData.consecuencias_no_ejecutar || ""),
      );
      setObservaciones(String(proyectoData.observaciones || ""));
    } catch (error: unknown) {
      setAviso({
        tipo: "error",
        titulo: "No se pudo preparar el formulario",
        mensaje:
          error instanceof Error
            ? error.message
            : "Ocurrió un error cargando la información del proyecto.",
      });
    } finally {
      setCargando(false);
    }
  }

  async function guardarProyecto(e: React.FormEvent) {
    e.preventDefault();

    if (!modoEdicion) return;
    setAviso(null);
    setProyectoActualizado(false);

    if (!puedeGuardar) {
      setAviso({
        tipo: "error",
        titulo: "Faltan datos obligatorios",
        mensaje:
          "Complete nombre, tipo, prioridad, fuente de financiamiento, solicitado por y cargo o representación.",
      });
      return;
    }

    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      setAviso({
        tipo: "error",
        titulo: "Fechas no válidas",
        mensaje:
          "La fecha estimada de finalización no puede ser anterior a la fecha de inicio.",
      });
      return;
    }

    if (presupuestoNumero < 0) {
      setAviso({
        tipo: "error",
        titulo: "Presupuesto no válido",
        mensaje: "El presupuesto estimado no puede ser negativo.",
      });
      return;
    }

    if (estadoCodigo !== "BORRADOR") {
      setAviso({
        tipo: "error",
        titulo: "Edición no permitida",
        mensaje: "Solo se pueden modificar proyectos en estado Borrador.",
      });
      return;
    }

    try {
      setGuardando(true);

      const { data: proyectoActualizadoData, error: proyectoError } = await supabase
        .from("proyectos")
        .update({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          tipo_proyecto_id: Number(tipoProyectoId),
          prioridad_id: Number(prioridadId),
          fuente_financiamiento_id: Number(fuenteFinanciamientoId),
          area_afectada: areaAfectada.trim() || null,
          fecha_inicio_estimada: fechaInicio || null,
          fecha_fin_estimada: fechaFin || null,
          presupuesto_estimado: presupuestoNumero,
          requiere_cuota_extraordinaria: requiereCuotaExtraordinaria,
          problema_necesidad: problemaNecesidad.trim() || null,
          objetivo: objetivo.trim() || null,
          beneficios_esperados: beneficiosEsperados.trim() || null,
          consecuencias_no_ejecutar:
            consecuenciasNoEjecutar.trim() || null,
          observacion_financiera: observacionFinanciera.trim() || null,
          observaciones: observaciones.trim() || null,
          responsable_usuario_empresa_id: responsableId
            ? Number(responsableId)
            : null,
          supervisor_usuario_empresa_id: supervisorId
            ? Number(supervisorId)
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", proyectoId)
        .eq("condominio_id", Number(condominioId))
        .eq("estado_id",
          estados.find((estado) => estado.codigo === "BORRADOR")?.id || -1,
        )
        .select("id")
        .maybeSingle();

      if (proyectoError) throw proyectoError;
      if (!proyectoActualizadoData) {
        throw new Error(
          "El proyecto no fue actualizado. Verifique que continúe en estado Borrador.",
        );
      }

      if (solicitantePrincipalId) {
        const { error: solicitanteError } = await supabase
          .from("proyectos_solicitantes")
          .update({
            nombre_solicitante: solicitadoPor.trim(),
            cargo_o_representacion: cargoRepresentacion.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", solicitantePrincipalId)
          .eq("proyecto_id", proyectoId)
          .eq("activo", true);

        if (solicitanteError) throw solicitanteError;
      } else {
        const { data: nuevoSolicitante, error: solicitanteError } =
          await supabase
            .from("proyectos_solicitantes")
            .insert({
              proyecto_id: proyectoId,
              tipo_solicitante: null,
              usuario_empresa_id: null,
              nombre_solicitante: solicitadoPor.trim(),
              cargo_o_representacion: cargoRepresentacion.trim(),
              es_principal: true,
              activo: true,
            })
            .select("id")
            .single();

        if (solicitanteError) throw solicitanteError;
        setSolicitantePrincipalId(Number(nuevoSolicitante.id));
      }

      setProyectoActualizado(true);
      setModoEdicion(false);
      setAviso({
        tipo: "success",
        titulo: "Proyecto actualizado",
        mensaje: `Los cambios del proyecto ${codigoProyecto} fueron guardados correctamente.`,
      });
    } catch (error: unknown) {
      setAviso({
        tipo: "error",
        titulo: "No se pudo actualizar el proyecto",
        mensaje:
          error instanceof Error
            ? error.message
            : "Ocurrió un error al actualizar el proyecto.",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <PageContainer>
      <ModuleMenu
        title="Proyectos"
        subtitle="Planificación, aprobación, ejecución y seguimiento de proyectos del condominio."
        tone="blue"
        items={[
          { href: "/proyectos", label: "Proyectos", icon: ClipboardList },
          { href: "/proyectos/nuevo", label: "Nuevo proyecto", icon: Wrench },
        ]}
      />

      <ModuleToolbar
        title={codigoProyecto || "Proyecto"}
        subtitle={
          modoEdicion
            ? "Modifique la información del proyecto y guarde los cambios."
            : "Consulta general del proyecto registrado."
        }
        icon={Wrench}
        actions={
          <ModuleActions
            extra={
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/proyectos"
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver al listado
                </Link>

                {estadoCodigo === "BORRADOR" && !modoEdicion && (
                  <button
                    type="button"
                    onClick={() => {
                      setAviso(null);
                      setProyectoActualizado(false);
                      setModoEdicion(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar borrador
                  </button>
                )}

                {modoEdicion && (
                  <button
                    type="button"
                    onClick={() => {
                      setModoEdicion(false);
                      setAviso(null);
                      cargarPantalla(condominioId, proyectoId);
                    }}
                    disabled={guardando}
                    className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Cancelar edición
                  </button>
                )}
              </div>
            }
          />
        }
      />

      {aviso && (
        <div
          className={`mb-4 rounded-2xl border p-4 ${
            aviso.tipo === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : aviso.tipo === "error"
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-blue-200 bg-blue-50 text-blue-900"
          }`}
        >
          <div className="flex gap-3">
            {aviso.tipo === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            ) : aviso.tipo === "error" ? (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <Info className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <div>
              <p className="font-black">{aviso.titulo}</p>
              <p className="mt-1 text-sm font-medium">{aviso.mensaje}</p>

              {aviso.tipo === "success" && proyectoActualizado && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/proyectos/${proyectoId}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800"
                  >
                    <FileText className="h-4 w-4" />
                    Ver proyecto
                  </Link>
                  <Link
                    href="/proyectos"
                    className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
                  >
                    Ver listado
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm lg:col-span-2">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-slate-500">
                Condominio activo
              </p>
              <p className="text-lg font-black text-slate-900">
                {condominioNombre || "No seleccionado"}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                El proyecto pertenece exclusivamente a este condominio.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase text-slate-500">
            Estado actual
          </p>
          <p className="mt-1 text-sm font-black text-slate-900">{estadoCodigo === "BORRADOR" ? "Borrador" : estadoCodigo || "Sin estado"}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Solo el estado Borrador permite modificaciones.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase text-slate-500">
            Código del proyecto
          </p>
          <p className="mt-1 text-sm font-black text-blue-700">
            {codigoProyecto || "Cargando..."}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            El código no puede modificarse.
          </p>
        </div>
      </div>

      <form onSubmit={guardarProyecto} className="space-y-4">
        <fieldset disabled={!modoEdicion || cargando} className="contents">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <SectionCard
              title="Información general"
              subtitle="Identificación, clasificación y descripción inicial del proyecto."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-8">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Nombre del proyecto *
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    placeholder="Ej. Reparación de la cisterna principal"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <Wrench className="h-4 w-4" />
                    Tipo de proyecto *
                  </label>
                  <select
                    value={tipoProyectoId}
                    onChange={(e) => setTipoProyectoId(e.target.value)}
                    className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"
                    disabled={cargando}
                  >
                    <option value="">
                      {cargando ? "Cargando..." : "Seleccione tipo"}
                    </option>
                    {tipos.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-8">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Área afectada
                  </label>
                  <input
                    type="text"
                    value={areaAfectada}
                    onChange={(e) => setAreaAfectada(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    placeholder="Ej. Cisterna, cuarto de bombas y área común"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <Flag className="h-4 w-4" />
                    Prioridad *
                  </label>
                  <select
                    value={prioridadId}
                    onChange={(e) => setPrioridadId(e.target.value)}
                    className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"
                    disabled={cargando}
                  >
                    <option value="">Seleccione prioridad</option>
                    {prioridades.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-12">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Descripción
                  </label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="min-h-[110px] w-full rounded-xl border px-3 py-2.5 text-sm"
                    placeholder="Describa en qué consiste el proyecto y el alcance inicial considerado."
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Solicitado por"
              subtitle="Identifique de forma abierta a la persona, grupo o representación que originó la solicitud."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <UsersRound className="h-4 w-4" />
                    Solicitado por *
                  </label>
                  <input
                    type="text"
                    value={solicitadoPor}
                    onChange={(e) => setSolicitadoPor(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    placeholder="Ej. Juan Pérez, Junta Directiva o VAM Administración"
                  />
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <UserRound className="h-4 w-4" />
                    Cargo o representación *
                  </label>
                  <input
                    type="text"
                    value={cargoRepresentacion}
                    onChange={(e) => setCargoRepresentacion(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    placeholder="Ej. Propietario, Presidente o Administración"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Planificación"
              subtitle="Fechas estimadas y responsables internos del seguimiento."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-3">
                  <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <CalendarDays className="h-4 w-4" />
                    Inicio estimado
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <CalendarDays className="h-4 w-4" />
                    Fin estimado
                  </label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    min={fechaInicio || undefined}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Responsable interno
                  </label>
                  <select
                    value={responsableId}
                    onChange={(e) => setResponsableId(e.target.value)}
                    className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"
                    disabled={cargando}
                  >
                    <option value="">Sin asignar</option>
                    {usuariosEmpresa.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre_usuario || item.correo || `Usuario ${item.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Supervisor
                  </label>
                  <select
                    value={supervisorId}
                    onChange={(e) => setSupervisorId(e.target.value)}
                    className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"
                    disabled={cargando}
                  >
                    <option value="">Sin asignar</option>
                    {usuariosEmpresa.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre_usuario || item.correo || `Usuario ${item.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {duracionEstimada !== null && (
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
                  Duración estimada: {duracionEstimada} día(s), incluyendo la
                  fecha inicial y final.
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Presupuesto y financiamiento"
              subtitle="Estimación inicial y fuente prevista de los recursos."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-4">
                  <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <DollarSign className="h-4 w-4" />
                    Presupuesto estimado RD$
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={presupuestoEstimado}
                    onChange={(e) => setPresupuestoEstimado(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    placeholder="0.00"
                  />
                </div>

                <div className="md:col-span-5">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Fuente de financiamiento *
                  </label>
                  <select
                    value={fuenteFinanciamientoId}
                    onChange={(e) =>
                      setFuenteFinanciamientoId(e.target.value)
                    }
                    className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"
                    disabled={cargando}
                  >
                    <option value="">Seleccione fuente</option>
                    {fuentes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Cuota extraordinaria
                  </label>
                  <label className="flex min-h-[42px] items-center gap-3 rounded-xl border bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={requiereCuotaExtraordinaria}
                      onChange={(e) =>
                        setRequiereCuotaExtraordinaria(e.target.checked)
                      }
                      className="h-4 w-4"
                    />
                    Requiere cuota
                  </label>
                </div>

                <div className="md:col-span-12">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Observación financiera
                  </label>
                  <textarea
                    value={observacionFinanciera}
                    onChange={(e) => setObservacionFinanciera(e.target.value)}
                    className="min-h-[90px] w-full rounded-xl border px-3 py-2.5 text-sm"
                    placeholder="Indique condiciones, disponibilidad o comentarios sobre el financiamiento."
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Justificación del proyecto"
              subtitle="Información que servirá para evaluar y presentar formalmente la propuesta."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <CampoTexto
                  label="Problema o necesidad identificada"
                  value={problemaNecesidad}
                  onChange={setProblemaNecesidad}
                  placeholder="Explique la situación que origina el proyecto."
                />
                <CampoTexto
                  label="Objetivo del proyecto"
                  value={objetivo}
                  onChange={setObjetivo}
                  placeholder="Indique el resultado principal que se busca alcanzar."
                />
                <CampoTexto
                  label="Beneficios esperados"
                  value={beneficiosEsperados}
                  onChange={setBeneficiosEsperados}
                  placeholder="Describa los beneficios para el condominio."
                />
                <CampoTexto
                  label="Consecuencias de no ejecutarlo"
                  value={consecuenciasNoEjecutar}
                  onChange={setConsecuenciasNoEjecutar}
                  placeholder="Explique los riesgos o efectos de no realizar el proyecto."
                />
                <div className="md:col-span-2">
                  <CampoTexto
                    label="Observaciones generales"
                    value={observaciones}
                    onChange={setObservaciones}
                    placeholder="Agregue cualquier información adicional relevante."
                  />
                </div>
              </div>
            </SectionCard>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-black text-slate-900">Resumen</p>
                  <p className="text-xs font-semibold text-slate-500">
                    Validación antes de guardar
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <ResumenLinea label="Proyecto" value={nombre || "Pendiente"} />
                <ResumenLinea
                  label="Tipo"
                  value={tipoSeleccionado?.nombre || "Pendiente"}
                />
                <ResumenLinea
                  label="Prioridad"
                  value={prioridadSeleccionada?.nombre || "Pendiente"}
                />
                <ResumenLinea
                  label="Solicitado por"
                  value={solicitadoPor || "Pendiente"}
                />
                <ResumenLinea
                  label="Representación"
                  value={cargoRepresentacion || "Pendiente"}
                />
                <ResumenLinea
                  label="Responsable"
                  value={
                    responsableSeleccionado?.nombre_usuario ||
                    responsableSeleccionado?.correo ||
                    "Sin asignar"
                  }
                />
                <ResumenLinea
                  label="Inicio"
                  value={formatoFecha(fechaInicio)}
                />
                <ResumenLinea label="Fin" value={formatoFecha(fechaFin)} />
                <ResumenLinea
                  label="Financiamiento"
                  value={fuenteSeleccionada?.nombre || "Pendiente"}
                />
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-slate-500">
                  Presupuesto estimado
                </p>
                <p className="mt-1 text-2xl font-black text-blue-700">
                  RD$ {dinero(presupuestoNumero)}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Valor preliminar, sujeto a evaluación y aprobación.
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                <div className="flex gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    El código se genera automáticamente y el proyecto se guarda
                    inicialmente como borrador.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-700" />
                <p className="font-black text-slate-900">Primera etapa</p>
              </div>
              <div className="space-y-3">
                <PasoFlujo
                  numero="1"
                  titulo="Registro inicial"
                  descripcion="Datos generales y solicitante."
                  activo
                />
                <PasoFlujo
                  numero="2"
                  titulo="Completar borrador"
                  descripcion="Revisión de datos y documentación."
                />
                <PasoFlujo
                  numero="3"
                  titulo="Enviar a evaluación"
                  descripcion="Se habilitará en la siguiente etapa."
                />
              </div>
            </div>

            {modoEdicion ? (
              <>
                <button
                  type="submit"
                  disabled={!puedeGuardar || cargando}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3.5 font-black text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="h-5 w-5" />
                  )}
                  {guardando ? "Guardando cambios..." : "Guardar cambios"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModoEdicion(false);
                    setAviso(null);
                    cargarPantalla(condominioId, proyectoId);
                  }}
                  disabled={guardando}
                  className="inline-flex w-full items-center justify-center rounded-2xl border bg-white px-5 py-3 font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar edición
                </button>
              </>
            ) : (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
                El proyecto está en modo consulta. Presione <strong>Editar borrador</strong> para modificarlo.
              </div>
            )}
          </aside>
        </div>
        </fieldset>
      </form>
    </PageContainer>
  );
}

function CampoTexto({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-slate-700">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[110px] w-full rounded-xl border px-3 py-2.5 text-sm"
        placeholder={placeholder}
      />
    </div>
  );
}

function ResumenLinea({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <span className="font-bold text-slate-500">{label}</span>
      <span className="max-w-[190px] text-right font-black text-slate-800">
        {value}
      </span>
    </div>
  );
}

function PasoFlujo({
  numero,
  titulo,
  descripcion,
  activo,
}: {
  numero: string;
  titulo: string;
  descripcion: string;
  activo?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
          activo ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        {numero}
      </div>
      <div>
        <p className="text-sm font-black text-slate-800">{titulo}</p>
        <p className="text-xs font-semibold text-slate-500">{descripcion}</p>
      </div>
    </div>
  );
}
