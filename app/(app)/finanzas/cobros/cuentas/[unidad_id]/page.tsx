"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Building2,
  CalendarClock,
  CircleDollarSign,
  FileText,
  History,
  ListChecks,
  Phone,
  RefreshCw,
  ShieldOff,
  Users,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import StatCard from "@/components/vam/enterprise/StatCard";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type ResumenUnidad = {
  condominio_id: number;
  condominio_nombre: string | null;
  unidad_id: number;
  unidad_codigo: string | null;
  propietario_id: number | null;
  nombre_propietario: string | null;
  telefono: string | null;
  correo: string | null;
  cantidad_cargos_vencidos: number | null;
  balance_vencido: number | null;
  periodo_inicial: string | null;
  periodo_final: string | null;
  fecha_vencimiento_mas_antigua: string | null;
  dias_vencido: number | null;
  tiene_pago_parcial: boolean | null;
};

type CargoVencido = {
  id: number;
  periodo: string | null;
  concepto: string | null;
  tipo_cargo: string | null;
  monto: number | null;
  monto_pagado: number | null;
  balance: number | null;
  estado: string | null;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  anio: number | null;
  mes: number | null;
};

type Exclusion = {
  id: number;
  agente_id: number | null;
  motivo: string;
  observacion: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  activa: boolean;
  agente_nombre: string | null;
};

type ColaMensaje = {
  id: number;
  canal: string;
  destino: string;
  estado: string;
  programado_para: string;
  contenido: string;
  agente_nombre: string | null;
};

function dinero(valor: number | string | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fechaCorta(valor?: string | null) {
  if (!valor) return "-";
  return new Date(`${valor}T00:00:00`).toLocaleDateString("es-DO");
}

function fechaHora(valor?: string | null) {
  if (!valor) return "-";
  return new Date(valor).toLocaleString("es-DO");
}

function claseEstado(estado?: string | null) {
  const valor = String(estado || "").toUpperCase();

  if (valor === "PAGADO" || valor === "ENVIADO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (valor === "PARCIAL" || valor === "PROCESANDO") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (valor === "FALLIDO") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function CuentaCobroDetallePage() {
  const params = useParams();
  const unidadId = String(params?.unidad_id || "");

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [resumen, setResumen] = useState<ResumenUnidad | null>(null);
  const [cargos, setCargos] = useState<CargoVencido[]>([]);
  const [exclusiones, setExclusiones] = useState<Exclusion[]>([]);
  const [cola, setCola] = useState<ColaMensaje[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id || !unidadId) {
      setError("No se pudo identificar el condominio o la unidad.");
      setLoading(false);
      return;
    }

    cargarDetalle(id, unidadId);
  }, [unidadId]);

  async function cargarDetalle(
    idCondominio = condominioId,
    idUnidad = unidadId
  ) {
    if (!idCondominio || !idUnidad) return;

    setLoading(true);
    setError("");

    const [
      resumenResp,
      cargosResp,
      exclusionesResp,
      colaResp,
    ] = await Promise.all([
      supabase
        .from("vw_cobros_deuda_unidades")
        .select("*")
        .eq("condominio_id", Number(idCondominio))
        .eq("unidad_id", Number(idUnidad))
        .maybeSingle(),

      supabase
        .from("cargos_periodicos")
        .select(
          "id, periodo, concepto, tipo_cargo, monto, monto_pagado, balance, estado, fecha_emision, fecha_vencimiento, anio, mes"
        )
        .eq("condominio_id", Number(idCondominio))
        .eq("unidad_id", Number(idUnidad))
        .gt("balance", 0)
        .in("estado", ["PENDIENTE", "PARCIAL"])
        .order("anio", { ascending: true })
        .order("mes", { ascending: true }),

      supabase
        .from("cobros_exclusiones")
        .select(
          `
          id,
          agente_id,
          motivo,
          observacion,
          fecha_inicio,
          fecha_fin,
          activa,
          cobros_agentes (
            nombre
          )
        `
        )
        .eq("condominio_id", Number(idCondominio))
        .eq("unidad_id", Number(idUnidad))
        .order("created_at", { ascending: false }),

      supabase
        .from("cobros_cola_mensajes")
        .select(
          `
          id,
          canal,
          destino,
          estado,
          programado_para,
          contenido,
          cobros_agentes (
            nombre
          )
        `
        )
        .eq("condominio_id", Number(idCondominio))
        .eq("unidad_id", Number(idUnidad))
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (resumenResp.error) {
      setError("No se pudo cargar el resumen: " + resumenResp.error.message);
    } else {
      setResumen((resumenResp.data || null) as ResumenUnidad | null);
    }

    if (cargosResp.error) {
      setError("No se pudieron cargar los cargos: " + cargosResp.error.message);
      setCargos([]);
    } else {
      setCargos((cargosResp.data || []) as CargoVencido[]);
    }

    if (exclusionesResp.error) {
      setExclusiones([]);
    } else {
      const listaExclusiones = (exclusionesResp.data || []).map((item: any) => {
        const agenteRelacion = Array.isArray(item.cobros_agentes)
          ? item.cobros_agentes[0]
          : item.cobros_agentes;

        return {
          id: Number(item.id),
          agente_id: item.agente_id ? Number(item.agente_id) : null,
          motivo: String(item.motivo || ""),
          observacion: item.observacion || null,
          fecha_inicio: String(item.fecha_inicio || ""),
          fecha_fin: item.fecha_fin || null,
          activa: Boolean(item.activa),
          agente_nombre: agenteRelacion?.nombre || null,
        } satisfies Exclusion;
      });

      setExclusiones(listaExclusiones);
    }

    if (colaResp.error) {
      setCola([]);
    } else {
      const listaCola = (colaResp.data || []).map((item: any) => {
        const agenteRelacion = Array.isArray(item.cobros_agentes)
          ? item.cobros_agentes[0]
          : item.cobros_agentes;

        return {
          id: Number(item.id),
          canal: String(item.canal || ""),
          destino: String(item.destino || ""),
          estado: String(item.estado || ""),
          programado_para: String(item.programado_para || ""),
          contenido: String(item.contenido || ""),
          agente_nombre: agenteRelacion?.nombre || null,
        } satisfies ColaMensaje;
      });

      setCola(listaCola);
    }

    setLoading(false);
  }

  const totalOriginal = useMemo(
    () => cargos.reduce((sum, item) => sum + Number(item.monto || 0), 0),
    [cargos]
  );

  const totalPagado = useMemo(
    () => cargos.reduce((sum, item) => sum + Number(item.monto_pagado || 0), 0),
    [cargos]
  );

  const totalBalance = useMemo(
    () => cargos.reduce((sum, item) => sum + Number(item.balance || 0), 0),
    [cargos]
  );

  const exclusionesActivas = exclusiones.filter((item) => item.activa).length;

  return (
    <PageContainer>
      <ModuleMenu
        title="Cobros Inteligentes"
        subtitle="Gestión de deuda, automatizaciones y seguimiento de comunicaciones."
        tone="blue"
        items={[
          {
            href: "/finanzas/cobros",
            label: "Resumen",
            icon: CircleDollarSign,
          },
          {
            href: "/finanzas/cobros/cuentas",
            label: "Cuentas por cobrar",
            icon: Users,
          },
          {
            href: "/finanzas/cobros/agentes",
            label: "Agentes",
            icon: Bot,
          },
          {
            href: "/finanzas/cobros/plantillas",
            label: "Plantillas",
            icon: FileText,
          },
          {
            href: "/finanzas/cobros/exclusiones",
            label: "Exclusiones",
            icon: ShieldOff,
          },
          {
            href: "/finanzas/cobros/cola",
            label: "Cola",
            icon: ListChecks,
          },
          {
            href: "/finanzas/cobros/historial",
            label: "Historial",
            icon: History,
          },
        ]}
      />

      <ModuleToolbar
        title={`Cuenta de Cobro ${resumen?.unidad_codigo || ""}`}
        subtitle={`Detalle financiero y de comunicaciones. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={WalletCards}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/finanzas/cobros/cuentas"
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>

            <button
              type="button"
              onClick={() => cargarDetalle()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:bg-slate-100"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
        }
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">
          Cargando detalle de la cuenta...
        </div>
      ) : !resumen ? (
        <EmptyState
          title="Cuenta no encontrada"
          description="La unidad no tiene deuda vencida o no pertenece al condominio activo."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard
              title="Balance vencido"
              value={`RD$ ${dinero(resumen.balance_vencido)}`}
              subtitle={`${resumen.cantidad_cargos_vencidos || 0} cargo(s)`}
              icon={CircleDollarSign}
              tone="red"
            />

            <StatCard
              title="Monto original"
              value={`RD$ ${dinero(totalOriginal)}`}
              subtitle="Cargos incluidos"
              icon={Building2}
              tone="blue"
            />

            <StatCard
              title="Pagado"
              value={`RD$ ${dinero(totalPagado)}`}
              subtitle="Abonos aplicados"
              icon={WalletCards}
              tone="green"
            />

            <StatCard
              title="Antigüedad"
              value={`${resumen.dias_vencido || 0} días`}
              subtitle={`Desde ${fechaCorta(
                resumen.fecha_vencimiento_mas_antigua
              )}`}
              icon={CalendarClock}
              tone="amber"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <section className="xl:col-span-2">
              <SectionCard
                title="Cargos vencidos"
                subtitle="Detalle de obligaciones pendientes y parciales."
              >
                {cargos.length === 0 ? (
                  <EmptyState
                    title="Sin cargos"
                    description="No se encontraron cargos vencidos para esta unidad."
                  />
                ) : (
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="min-w-[900px] w-full text-sm">
                      <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                        <tr>
                          <th className="px-4 py-3">Periodo</th>
                          <th className="px-4 py-3">Concepto</th>
                          <th className="px-4 py-3">Vencimiento</th>
                          <th className="px-4 py-3">Estado</th>
                          <th className="px-4 py-3 text-right">Monto</th>
                          <th className="px-4 py-3 text-right">Pagado</th>
                          <th className="px-4 py-3 text-right">Balance</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y bg-white">
                        {cargos.map((cargo) => (
                          <tr key={cargo.id} className="hover:bg-slate-50">
                            <td className="px-4 py-4 font-black text-slate-900">
                              {cargo.periodo || "-"}
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-semibold text-slate-800">
                                {cargo.concepto || "Cargo periódico"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {cargo.tipo_cargo || "-"}
                              </p>
                            </td>
                            <td className="px-4 py-4">
                              {fechaCorta(cargo.fecha_vencimiento)}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${claseEstado(
                                  cargo.estado
                                )}`}
                              >
                                {cargo.estado || "PENDIENTE"}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right font-semibold">
                              RD$ {dinero(cargo.monto)}
                            </td>
                            <td className="px-4 py-4 text-right font-semibold text-emerald-700">
                              RD$ {dinero(cargo.monto_pagado)}
                            </td>
                            <td className="px-4 py-4 text-right font-black text-red-700">
                              RD$ {dinero(cargo.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>

                      <tfoot className="border-t-2 bg-slate-100">
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-right font-black">
                            Totales
                          </td>
                          <td className="px-4 py-4 text-right font-black">
                            RD$ {dinero(totalOriginal)}
                          </td>
                          <td className="px-4 py-4 text-right font-black text-emerald-700">
                            RD$ {dinero(totalPagado)}
                          </td>
                          <td className="px-4 py-4 text-right font-black text-red-700">
                            RD$ {dinero(totalBalance)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </SectionCard>
            </section>

            <section className="space-y-5">
              <SectionCard
                title="Propietario"
                subtitle="Información de contacto asociada a la unidad."
              >
                <div className="space-y-3">
                  <Dato
                    label="Nombre"
                    value={resumen.nombre_propietario || "Sin propietario"}
                  />
                  <Dato
                    label="Unidad"
                    value={resumen.unidad_codigo || "-"}
                  />
                  <Dato
                    label="Teléfono"
                    value={resumen.telefono || "Sin teléfono"}
                    icon={Phone}
                  />
                  <Dato
                    label="Correo"
                    value={resumen.correo || "Sin correo"}
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Estado de cobranza"
                subtitle="Condiciones que afectan las comunicaciones."
              >
                <div className="space-y-3">
                  <Dato
                    label="Exclusiones activas"
                    value={String(exclusionesActivas)}
                  />
                  <Dato
                    label="Mensajes en cola"
                    value={String(cola.length)}
                  />
                  <Dato
                    label="Pago parcial"
                    value={resumen.tiene_pago_parcial ? "Sí" : "No"}
                  />
                </div>
              </SectionCard>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <SectionCard
              title="Exclusiones"
              subtitle="Pausas aplicadas a esta unidad."
            >
              {exclusiones.length === 0 ? (
                <EmptyState
                  title="Sin exclusiones"
                  description="Esta unidad no tiene exclusiones registradas."
                />
              ) : (
                <div className="space-y-3">
                  {exclusiones.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl border bg-white p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-black text-slate-900">
                          {item.motivo}
                        </p>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            item.activa
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.activa ? "ACTIVA" : "INACTIVA"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {item.agente_nombre || "Todos los agentes"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {fechaCorta(item.fecha_inicio)} hasta{" "}
                        {fechaCorta(item.fecha_fin)}
                      </p>
                      {item.observacion && (
                        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                          {item.observacion}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Últimos mensajes"
              subtitle="Comunicaciones preparadas para esta unidad."
            >
              {cola.length === 0 ? (
                <EmptyState
                  title="Sin mensajes"
                  description="Todavía no existen mensajes en cola para esta unidad."
                />
              ) : (
                <div className="space-y-3">
                  {cola.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl border bg-white p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-black text-slate-900">
                            {item.agente_nombre || "Agente"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.canal} · {item.destino}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${claseEstado(
                            item.estado
                          )}`}
                        >
                          {item.estado}
                        </span>
                      </div>

                      <p className="mt-3 line-clamp-3 text-sm text-slate-700">
                        {item.contenido}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        Programado: {fechaHora(item.programado_para)}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </PageContainer>
  );
}

function Dato({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-blue-600" />}
        <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      </div>
      <p className="mt-1 break-words text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}
