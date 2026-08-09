"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  ClipboardList,
  DollarSign,
  FileText,
  FolderKanban,
  Loader2,
  Pencil,
  UserRound,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";

type Proyecto = {
  id: number;
  client_id: number | null;
  empresa_id: number | null;
  condominio_id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  area_afectada: string | null;
  fecha_inicio_estimada: string | null;
  fecha_fin_estimada: string | null;
  presupuesto_estimado: number | null;
  requiere_cuota_extraordinaria: boolean;
  problema_necesidad: string | null;
  objetivo: string | null;
  beneficios_esperados: string | null;
  consecuencias_no_ejecutar: string | null;
  observacion_financiera: string | null;
  observaciones: string | null;
  responsable_usuario_empresa_id: number | null;
  supervisor_usuario_empresa_id: number | null;
  registrado_por_usuario_empresa_id: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
  proyectos_tipos: { nombre: string | null } | null;
  proyectos_prioridades: {
    nombre: string | null;
    codigo: string | null;
  } | null;
  proyectos_estados: {
    nombre: string | null;
    codigo: string | null;
  } | null;
  proyectos_fuentes_financiamiento: {
    nombre: string | null;
  } | null;
  condominios: {
    nombre: string | null;
  } | null;
};

type Solicitante = {
  id: number;
  nombre_solicitante: string | null;
  cargo_o_representacion: string | null;
  es_principal: boolean;
  activo: boolean;
};

type UsuarioEmpresa = {
  id: number;
  nombre_usuario: string | null;
  correo: string | null;
};

type Aviso = {
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
  if (!fecha) return "-";

  const limpia = String(fecha).split("T")[0];
  const partes = limpia.split("-");

  if (partes.length !== 3) return fecha;

  const [anio, mes, dia] = partes;
  return `${dia}/${mes}/${anio}`;
}

function colorEstado(codigo?: string | null) {
  if (codigo === "APROBADO") return "bg-emerald-100 text-emerald-800";
  if (codigo === "EN_EVALUACION") return "bg-blue-100 text-blue-800";
  if (codigo === "PENDIENTE_APROBACION")
    return "bg-amber-100 text-amber-800";
  if (codigo === "RECHAZADO") return "bg-red-100 text-red-800";
  if (codigo === "CANCELADO") return "bg-slate-200 text-slate-700";

  return "bg-slate-100 text-slate-700";
}

function colorPrioridad(codigo?: string | null) {
  if (codigo === "URGENTE") return "bg-red-100 text-red-800";
  if (codigo === "ALTA") return "bg-orange-100 text-orange-800";
  if (codigo === "NORMAL") return "bg-blue-100 text-blue-800";

  return "bg-slate-100 text-slate-700";
}

export default function ProyectoDetallePage() {
  const params = useParams();
  const proyectoId = Number(params?.id);

  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [solicitantes, setSolicitantes] = useState<Solicitante[]>([]);
  const [usuarios, setUsuarios] = useState<Map<number, UsuarioEmpresa>>(
    new Map(),
  );

  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  useEffect(() => {
    if (!proyectoId || Number.isNaN(proyectoId)) {
      setAviso({
        titulo: "Proyecto no válido",
        mensaje: "No se recibió un identificador de proyecto válido.",
      });
      setCargando(false);
      return;
    }

    cargarProyecto(proyectoId);
  }, [proyectoId]);

  async function cargarProyecto(id: number) {
    try {
      setCargando(true);
      setAviso(null);

      const condominioActivo = localStorage.getItem("condominio_id") || "";

      if (!condominioActivo) {
        throw new Error(
          "No hay condominio activo. Debe iniciar sesión nuevamente.",
        );
      }

      const { data: proyectoData, error: proyectoError } = await supabase
        .from("proyectos")
        .select(`
          id,
          client_id,
          empresa_id,
          condominio_id,
          codigo,
          nombre,
          descripcion,
          area_afectada,
          fecha_inicio_estimada,
          fecha_fin_estimada,
          presupuesto_estimado,
          requiere_cuota_extraordinaria,
          problema_necesidad,
          objetivo,
          beneficios_esperados,
          consecuencias_no_ejecutar,
          observacion_financiera,
          observaciones,
          responsable_usuario_empresa_id,
          supervisor_usuario_empresa_id,
          registrado_por_usuario_empresa_id,
          activo,
          created_at,
          updated_at,
          proyectos_tipos(nombre),
          proyectos_prioridades(nombre, codigo),
          proyectos_estados(nombre, codigo),
          proyectos_fuentes_financiamiento(nombre),
          condominios(nombre)
        `)
        .eq("id", id)
        .eq("condominio_id", Number(condominioActivo))
        .maybeSingle();

      if (proyectoError) throw proyectoError;

      if (!proyectoData) {
        throw new Error(
          "El proyecto no existe o no pertenece al condominio activo.",
        );
      }

      const proyectoCompleto = proyectoData as unknown as Proyecto;
      setProyecto(proyectoCompleto);

      const { data: solicitantesData, error: solicitantesError } =
        await supabase
          .from("proyectos_solicitantes")
          .select(
            "id, nombre_solicitante, cargo_o_representacion, es_principal, activo",
          )
          .eq("proyecto_id", id)
          .eq("activo", true)
          .order("es_principal", { ascending: false })
          .order("id", { ascending: true });

      if (solicitantesError) throw solicitantesError;

      setSolicitantes((solicitantesData || []) as Solicitante[]);

      const idsUsuarios = [
        proyectoCompleto.responsable_usuario_empresa_id,
        proyectoCompleto.supervisor_usuario_empresa_id,
        proyectoCompleto.registrado_por_usuario_empresa_id,
      ].filter((valor): valor is number => Boolean(valor));

      if (idsUsuarios.length > 0) {
        const { data: usuariosData, error: usuariosError } = await supabase
          .from("usuarios_empresas")
          .select("id, nombre_usuario, correo")
          .in("id", idsUsuarios);

        if (usuariosError) throw usuariosError;

        const mapa = new Map<number, UsuarioEmpresa>();

        for (const usuario of (usuariosData || []) as UsuarioEmpresa[]) {
          mapa.set(usuario.id, usuario);
        }

        setUsuarios(mapa);
      } else {
        setUsuarios(new Map());
      }
    } catch (error: unknown) {
      setProyecto(null);
      setSolicitantes([]);
      setUsuarios(new Map());

      setAviso({
        titulo: "No se pudo cargar el proyecto",
        mensaje:
          error instanceof Error
            ? error.message
            : "Ocurrió un error consultando el proyecto.",
      });
    } finally {
      setCargando(false);
    }
  }

  function nombreUsuario(id?: number | null) {
    if (!id) return "No asignado";

    const usuario = usuarios.get(id);

    return (
      usuario?.nombre_usuario ||
      usuario?.correo ||
      `Usuario empresa ID ${id}`
    );
  }

  return (
    <PageContainer>
      <ModuleMenu
        title="Proyectos"
        subtitle="Planificación, evaluación, ejecución y seguimiento de proyectos."
        tone="blue"
        items={[
          { href: "/proyectos", label: "Proyectos", icon: FolderKanban },
          {
            href: "/proyectos/nuevo",
            label: "Nuevo proyecto",
            icon: ClipboardList,
          },
        ]}
      />

      <ModuleToolbar
        title={proyecto?.codigo || "Detalle del proyecto"}
        subtitle={
          proyecto?.nombre ||
          "Consulta de la información general del proyecto registrado."
        }
        icon={FolderKanban}
        actions={
          <ModuleActions
            onRefresh={() => proyectoId && cargarProyecto(proyectoId)}
            extra={
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/proyectos"
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver al listado
                </Link>

                {proyecto && (
                  <Link
                    href={`/proyectos/${proyecto.id}/editar`}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar borrador
                  </Link>
                )}
              </div>
            }
          />
        }
      />

      {cargando ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border bg-white py-16 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando proyecto...
        </div>
      ) : aviso ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-black">{aviso.titulo}</p>
              <p className="mt-1 text-sm font-medium">{aviso.mensaje}</p>
            </div>
          </div>
        </div>
      ) : proyecto ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ResumenCard
              titulo="Condominio"
              valor={proyecto.condominios?.nombre || `ID ${proyecto.condominio_id}`}
              icono={<Building2 className="h-5 w-5" />}
            />

            <ResumenCard
              titulo="Estado"
              valor={
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-black ${colorEstado(
                    proyecto.proyectos_estados?.codigo,
                  )}`}
                >
                  {proyecto.proyectos_estados?.nombre || "Sin estado"}
                </span>
              }
              icono={<FileText className="h-5 w-5" />}
            />

            <ResumenCard
              titulo="Prioridad"
              valor={
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-black ${colorPrioridad(
                    proyecto.proyectos_prioridades?.codigo,
                  )}`}
                >
                  {proyecto.proyectos_prioridades?.nombre || "-"}
                </span>
              }
              icono={<AlertCircle className="h-5 w-5" />}
            />

            <ResumenCard
              titulo="Presupuesto estimado"
              valor={`RD$ ${dinero(proyecto.presupuesto_estimado)}`}
              icono={<WalletCards className="h-5 w-5" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <SectionCard
                title="Información general"
                subtitle="Datos principales registrados para el proyecto."
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Campo label="Código" value={proyecto.codigo} />
                  <Campo label="Nombre" value={proyecto.nombre} />
                  <Campo
                    label="Tipo de proyecto"
                    value={proyecto.proyectos_tipos?.nombre || "-"}
                  />
                  <Campo
                    label="Área afectada"
                    value={proyecto.area_afectada || "-"}
                  />
                  <Campo
                    label="Fuente de financiamiento"
                    value={
                      proyecto.proyectos_fuentes_financiamiento?.nombre || "-"
                    }
                  />
                  <Campo
                    label="Requiere cuota extraordinaria"
                    value={
                      proyecto.requiere_cuota_extraordinaria ? "Sí" : "No"
                    }
                  />
                </div>

                <div className="mt-5">
                  <Campo
                    label="Descripción"
                    value={proyecto.descripcion || "-"}
                    multilinea
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Solicitado por"
                subtitle="Personas o representación que originaron la solicitud."
              >
                {solicitantes.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No hay solicitantes activos registrados.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {solicitantes.map((solicitante) => (
                      <div
                        key={solicitante.id}
                        className="flex items-start gap-3 rounded-2xl border bg-slate-50 p-4"
                      >
                        <div className="rounded-xl bg-white p-2 text-blue-700">
                          <UserRound className="h-5 w-5" />
                        </div>

                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-slate-900">
                              {solicitante.nombre_solicitante || "Sin nombre"}
                            </p>

                            {solicitante.es_principal && (
                              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-800">
                                Principal
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-sm font-semibold text-slate-600">
                            {solicitante.cargo_o_representacion ||
                              "Sin cargo o representación"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Planificación"
                subtitle="Fechas estimadas y responsables internos."
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Campo
                    label="Fecha estimada de inicio"
                    value={formatoFecha(proyecto.fecha_inicio_estimada)}
                    icono={<CalendarDays className="h-4 w-4" />}
                  />

                  <Campo
                    label="Fecha estimada de finalización"
                    value={formatoFecha(proyecto.fecha_fin_estimada)}
                    icono={<CalendarDays className="h-4 w-4" />}
                  />

                  <Campo
                    label="Responsable interno"
                    value={nombreUsuario(
                      proyecto.responsable_usuario_empresa_id,
                    )}
                  />

                  <Campo
                    label="Supervisor"
                    value={nombreUsuario(
                      proyecto.supervisor_usuario_empresa_id,
                    )}
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Justificación del proyecto"
                subtitle="Necesidad, objetivo y beneficios esperados."
              >
                <div className="space-y-5">
                  <Campo
                    label="Problema o necesidad"
                    value={proyecto.problema_necesidad || "-"}
                    multilinea
                  />

                  <Campo
                    label="Objetivo"
                    value={proyecto.objetivo || "-"}
                    multilinea
                  />

                  <Campo
                    label="Beneficios esperados"
                    value={proyecto.beneficios_esperados || "-"}
                    multilinea
                  />

                  <Campo
                    label="Consecuencias de no ejecutarlo"
                    value={proyecto.consecuencias_no_ejecutar || "-"}
                    multilinea
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Observaciones"
                subtitle="Información financiera y comentarios adicionales."
              >
                <div className="space-y-5">
                  <Campo
                    label="Observación financiera"
                    value={proyecto.observacion_financiera || "-"}
                    multilinea
                  />

                  <Campo
                    label="Observaciones generales"
                    value={proyecto.observaciones || "-"}
                    multilinea
                  />
                </div>
              </SectionCard>
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                    <DollarSign className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="font-black text-slate-900">
                      Resumen financiero
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      Información inicial del proyecto
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <ResumenLinea
                    label="Presupuesto"
                    value={`RD$ ${dinero(proyecto.presupuesto_estimado)}`}
                  />
                  <ResumenLinea
                    label="Fuente"
                    value={
                      proyecto.proyectos_fuentes_financiamiento?.nombre || "-"
                    }
                  />
                  <ResumenLinea
                    label="Cuota extraordinaria"
                    value={
                      proyecto.requiere_cuota_extraordinaria ? "Sí" : "No"
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                    <ClipboardList className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="font-black text-slate-900">Auditoría</p>
                    <p className="text-xs font-semibold text-slate-500">
                      Registro y actualización
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <ResumenLinea
                    label="Registrado por"
                    value={nombreUsuario(
                      proyecto.registrado_por_usuario_empresa_id,
                    )}
                  />
                  <ResumenLinea
                    label="Fecha de registro"
                    value={formatoFecha(proyecto.created_at)}
                  />
                  <ResumenLinea
                    label="Última actualización"
                    value={formatoFecha(proyecto.updated_at)}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                Esta ficha muestra la información registrada del proyecto. Las
                etapas de evaluación, cotización, aprobación y ejecución se
                agregarán en los próximos pasos.
              </div>
            </aside>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}

function ResumenCard({
  titulo,
  valor,
  icono,
}: {
  titulo: string;
  valor: React.ReactNode;
  icono: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-50 p-2 text-blue-700">{icono}</div>
        <div>
          <p className="text-xs font-black uppercase text-slate-500">
            {titulo}
          </p>
          <div className="mt-1 text-lg font-black text-slate-900">{valor}</div>
        </div>
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  multilinea,
  icono,
}: {
  label: string;
  value: React.ReactNode;
  multilinea?: boolean;
  icono?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase text-slate-500">
        {icono}
        {label}
      </div>
      <div
        className={
          multilinea
            ? "whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-800"
            : "text-sm font-black text-slate-900"
        }
      >
        {value}
      </div>
    </div>
  );
}

function ResumenLinea({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="font-bold text-slate-500">{label}</span>
      <span className="max-w-[190px] text-right font-black text-slate-800">
        {value}
      </span>
    </div>
  );
}
