"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Building2,
  CalendarClock,
  CircleDollarSign,
  FileText,
  History,
  ListChecks,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
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



type AgenteWhatsApp = {
  id: number;
  nombre: string;
  plantilla_id: number | null;
  activo: boolean;
  canal: string;
};

type PlantillaWhatsApp = {
  id: number;
  nombre: string;
  contenido: string;
  activa: boolean;
  canal: string;
};

type PropietarioContacto = {
  id: number;
  no_apartamento: string | null;
  nombre_propietario: string | null;
  telefono: string | null;
  correo: string | null;
  estado: string | null;
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


function normalizarUnidad(valor?: string | null) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function normalizarTelefonoWhatsApp(valor?: string | null) {
  let digitos = String(valor || "").replace(/\D/g, "");

  if (digitos.startsWith("001") && digitos.length === 13) {
    digitos = digitos.slice(2);
  }

  if (digitos.length === 10) return `1${digitos}`;
  if (digitos.length === 11 && digitos.startsWith("1")) return digitos;

  return "";
}

function extraerTelefonosWhatsApp(valor?: string | null) {
  const texto = String(valor || "").trim();
  if (!texto) return [] as string[];

  const coincidencias =
    texto.match(
      /(?:\+?1[\s().-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}/g
    ) || [];

  const candidatos =
    coincidencias.length > 0
      ? coincidencias
      : texto.split(/[\/,;|\n]+/g);

  const telefonos = candidatos
    .map((item) => normalizarTelefonoWhatsApp(item))
    .filter(Boolean);

  return Array.from(new Set(telefonos));
}

function mostrarTelefonoWhatsApp(valor: string) {
  const digitos = String(valor || "").replace(/\D/g, "");
  const local =
    digitos.length === 11 && digitos.startsWith("1")
      ? digitos.slice(1)
      : digitos;

  if (local.length !== 10) return valor;

  return `+1 (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

function reemplazarVariables(
  contenido: string,
  resumen: ResumenUnidad,
  condominioNombre: string,
  deudaAlDia: number,
  periodoInicialAlDia?: string | null,
  periodoFinalAlDia?: string | null
) {
  const valores: Record<string, string> = {
    "{{propietario}}": resumen.nombre_propietario || "Propietario(a)",
    "{{unidad}}": resumen.unidad_codigo || "-",
    "{{condominio}}": resumen.condominio_nombre || condominioNombre || "Condominio",
    // {{balance}} representa la deuda total pendiente al día, no solo la vencida.
    "{{balance}}": dinero(deudaAlDia),
    "{{periodo_inicial}}": periodoInicialAlDia || resumen.periodo_inicial || "-",
    "{{periodo_final}}": periodoFinalAlDia || resumen.periodo_final || "-",
    "{{dias_vencido}}": String(resumen.dias_vencido || 0),
    "{{fecha_vencimiento}}": fechaCorta(resumen.fecha_vencimiento_mas_antigua),
  };

  return Object.entries(valores).reduce(
    (texto, [variable, valor]) => texto.split(variable).join(valor),
    contenido
  );
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
  const searchParams = useSearchParams();
  const unidadId = String(params?.unidad_id || "");
  const abrirWhatsApp = searchParams.get("whatsapp") === "1";

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [resumen, setResumen] = useState<ResumenUnidad | null>(null);
  const [cargos, setCargos] = useState<CargoVencido[]>([]);
  const [exclusiones, setExclusiones] = useState<Exclusion[]>([]);
  const [cola, setCola] = useState<ColaMensaje[]>([]);
  const [agentesWhatsApp, setAgentesWhatsApp] = useState<AgenteWhatsApp[]>([]);
  const [plantillasWhatsApp, setPlantillasWhatsApp] = useState<PlantillaWhatsApp[]>([]);
  const [agenteSeleccionado, setAgenteSeleccionado] = useState("");
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState("");
  const [programadoPara, setProgramadoPara] = useState("");
  const [telefonoSeleccionado, setTelefonoSeleccionado] = useState("");
  const [encolando, setEncolando] = useState(false);
  const [mensajeWhatsApp, setMensajeWhatsApp] = useState("");

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
      agentesResp,
      plantillasResp,
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

      supabase
        .from("cobros_agentes")
        .select("id,nombre,plantilla_id,activo,canal")
        .eq("condominio_id", Number(idCondominio))
        .eq("canal", "WHATSAPP")
        .eq("activo", true)
        .order("prioridad", { ascending: true }),

      supabase
        .from("cobros_plantillas")
        .select("id,nombre,contenido,activa,canal")
        .eq("condominio_id", Number(idCondominio))
        .eq("canal", "WHATSAPP")
        .eq("activa", true)
        .order("es_predeterminada", { ascending: false })
        .order("nombre", { ascending: true }),
    ]);

    if (resumenResp.error) {
      setError("No se pudo cargar el resumen: " + resumenResp.error.message);
      setResumen(null);
    } else {
      let resumenFinal = (resumenResp.data || null) as ResumenUnidad | null;

      /*
       * La vista de deuda puede devolver propietario_id nulo en registros
       * históricos o cuando la asociación no quedó materializada en la vista.
       * La cola de cobros exige propietario_id NOT NULL, por eso resolvemos
       * el propietario real usando condominio + código de unidad.
       */
      if (resumenFinal && !resumenFinal.propietario_id) {
        const { data: propietariosData, error: propietariosError } =
          await supabase
            .from("propietarios_apartamentos")
            .select(
              "id,no_apartamento,nombre_propietario,telefono,correo,estado"
            )
            .eq("condominio_id", Number(idCondominio));

        if (!propietariosError) {
          const codigoUnidad = normalizarUnidad(resumenFinal.unidad_codigo);
          const candidatos = ((propietariosData || []) as PropietarioContacto[])
            .filter(
              (item) =>
                normalizarUnidad(item.no_apartamento) === codigoUnidad
            );

          const nombreResumen = String(
            resumenFinal.nombre_propietario || ""
          )
            .trim()
            .toLowerCase();

          const porNombre = nombreResumen
            ? candidatos.find(
                (item) =>
                  String(item.nombre_propietario || "")
                    .trim()
                    .toLowerCase() === nombreResumen
              )
            : null;

          const activo = candidatos.find(
            (item) =>
              String(item.estado || "activo")
                .trim()
                .toLowerCase() === "activo"
          );

          const propietarioResuelto = porNombre || activo || candidatos[0];

          if (propietarioResuelto) {
            resumenFinal = {
              ...resumenFinal,
              propietario_id: Number(propietarioResuelto.id),
              nombre_propietario:
                resumenFinal.nombre_propietario ||
                propietarioResuelto.nombre_propietario,
              telefono:
                resumenFinal.telefono || propietarioResuelto.telefono,
              correo: resumenFinal.correo || propietarioResuelto.correo,
            };
          }
        }
      }

      setResumen(resumenFinal);

      const telefonosDetectados = extraerTelefonosWhatsApp(
        resumenFinal?.telefono
      );
      setTelefonoSeleccionado((actual) =>
        actual && telefonosDetectados.includes(actual)
          ? actual
          : telefonosDetectados[0] || ""
      );
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

    const agentes = agentesResp.error
      ? []
      : ((agentesResp.data || []) as AgenteWhatsApp[]);
    const plantillas = plantillasResp.error
      ? []
      : ((plantillasResp.data || []) as PlantillaWhatsApp[]);

    setAgentesWhatsApp(agentes);
    setPlantillasWhatsApp(plantillas);

    setAgenteSeleccionado((actual) => {
      if (actual && agentes.some((item) => String(item.id) === actual)) return actual;
      return agentes[0] ? String(agentes[0].id) : "";
    });

    setPlantillaSeleccionada((actual) => {
      if (actual && plantillas.some((item) => String(item.id) === actual)) return actual;

      const plantillaAgente = agentes[0]?.plantilla_id
        ? plantillas.find((item) => item.id === agentes[0].plantilla_id)
        : null;

      return plantillaAgente
        ? String(plantillaAgente.id)
        : plantillas[0]
          ? String(plantillas[0].id)
          : "";
    });

    if (!programadoPara) {
      const ahora = new Date();
      const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setProgramadoPara(local);
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

  // Deuda al día = todos los cargos abiertos de la unidad, incluyendo el período actual.
  // La vista vw_cobros_deuda_unidades mantiene el balance vencido, que puede excluir
  // la cuota corriente mientras todavía está dentro de su fecha regular de pago.
  const periodoInicialAlDia = cargos[0]?.periodo || resumen?.periodo_inicial || null;
  const periodoFinalAlDia =
    cargos[cargos.length - 1]?.periodo || resumen?.periodo_final || null;

  const exclusionesActivas = exclusiones.filter((item) => item.activa).length;

  const agenteActual = useMemo(
    () => agentesWhatsApp.find((item) => String(item.id) === agenteSeleccionado) || null,
    [agentesWhatsApp, agenteSeleccionado]
  );

  const plantillaActual = useMemo(
    () =>
      plantillasWhatsApp.find((item) => String(item.id) === plantillaSeleccionada) ||
      null,
    [plantillasWhatsApp, plantillaSeleccionada]
  );

  const telefonosDisponibles = useMemo(
    () => extraerTelefonosWhatsApp(resumen?.telefono),
    [resumen?.telefono]
  );

  const telefonoDestino =
    telefonoSeleccionado || telefonosDisponibles[0] || "";

  const vistaPreviaWhatsApp = useMemo(() => {
    if (!resumen || !plantillaActual) return "";
    return reemplazarVariables(
      plantillaActual.contenido,
      resumen,
      condominioNombre,
      totalBalance,
      periodoInicialAlDia,
      periodoFinalAlDia
    );
  }, [
    resumen,
    plantillaActual,
    condominioNombre,
    totalBalance,
    periodoInicialAlDia,
    periodoFinalAlDia,
  ]);

  const exclusionBloquea = useMemo(() => {
    if (!agenteActual) return exclusiones.some((item) => item.activa && !item.agente_id);

    return exclusiones.some(
      (item) =>
        item.activa &&
        (item.agente_id === null || Number(item.agente_id) === Number(agenteActual.id))
    );
  }, [exclusiones, agenteActual]);

  function cambiarAgenteWhatsApp(valor: string) {
    setAgenteSeleccionado(valor);

    const agente = agentesWhatsApp.find((item) => String(item.id) === valor);
    if (!agente?.plantilla_id) return;

    const existe = plantillasWhatsApp.some(
      (item) => Number(item.id) === Number(agente.plantilla_id)
    );

    if (existe) setPlantillaSeleccionada(String(agente.plantilla_id));
  }

  async function agregarWhatsAppACola() {
    setMensajeWhatsApp("");

    if (!resumen) return;

    if (!telefonoDestino) {
      setMensajeWhatsApp("El propietario no tiene un teléfono válido para WhatsApp.");
      return;
    }

    if (!agenteActual) {
      setMensajeWhatsApp("Debe seleccionar un agente WhatsApp activo.");
      return;
    }

    if (!plantillaActual) {
      setMensajeWhatsApp("Debe seleccionar una plantilla WhatsApp activa.");
      return;
    }

    if (!vistaPreviaWhatsApp.trim()) {
      setMensajeWhatsApp("La plantilla seleccionada no tiene contenido.");
      return;
    }

    if (exclusionBloquea) {
      setMensajeWhatsApp(
        "Esta unidad tiene una exclusión activa que bloquea el envío con el agente seleccionado."
      );
      return;
    }

    const pendienteExistente = cola.some((item) => {
      const estado = String(item.estado || "").toUpperCase();
      return (
        String(item.canal || "").toUpperCase() === "WHATSAPP" &&
        !["ENVIADO", "ENTREGADO", "LEIDO", "FALLIDO", "CANCELADO"].includes(estado)
      );
    });

    if (pendienteExistente) {
      const continuar = window.confirm(
        "Esta unidad ya tiene un mensaje WhatsApp pendiente o en proceso. ¿Desea agregar otro?"
      );
      if (!continuar) return;
    }

    if (!resumen.propietario_id) {
      setMensajeWhatsApp(
        "No se pudo identificar el propietario de esta unidad. Revise la asociación del propietario antes de enviar."
      );
      return;
    }

    setEncolando(true);

    const fechaProgramada = programadoPara
      ? new Date(programadoPara).toISOString()
      : new Date().toISOString();

    const { error: colaError } = await supabase
      .from("cobros_cola_mensajes")
      .insert({
        condominio_id: resumen.condominio_id,
        propietario_id: resumen.propietario_id,
        unidad_id: resumen.unidad_id,
        agente_id: agenteActual.id,
        canal: "WHATSAPP",
        destino: telefonoDestino,
        estado: "PENDIENTE",
        programado_para: fechaProgramada,
        contenido: vistaPreviaWhatsApp.trim(),
      });

    setEncolando(false);

    if (colaError) {
      setMensajeWhatsApp(
        "No se pudo agregar el mensaje a la cola: " + colaError.message
      );
      return;
    }

    setMensajeWhatsApp(
      `Mensaje WhatsApp agregado a la cola correctamente para ${mostrarTelefonoWhatsApp(
        telefonoDestino
      )}.`
    );
    await cargarDetalle(condominioId, unidadId);
  }

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
              title="Deuda al día"
              value={`RD$ ${dinero(totalBalance)}`}
              subtitle={`Vencido: RD$ ${dinero(resumen.balance_vencido)}`}
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
                title="Cargos pendientes"
                subtitle="Detalle de obligaciones abiertas, incluyendo el período actual."
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
                title="WhatsApp individual"
                subtitle="Prepare un recordatorio para esta unidad sin ejecutar un envío masivo."
              >
                <div
                  id="whatsapp-individual"
                  className={`space-y-4 ${abrirWhatsApp ? "ring-2 ring-emerald-300 ring-offset-4 rounded-xl" : ""}`}
                >
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    <div className="flex items-start gap-2">
                      <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-black">Envío manual individual</p>
                        <p className="mt-1 text-xs">
                          Este mensaje se agrega a la cola del robot. El envío real lo
                          realizará el procesador de WhatsApp cuando esté conectado.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-black uppercase text-slate-500">
                      Agente WhatsApp
                    </label>
                    <select
                      value={agenteSeleccionado}
                      onChange={(e) => cambiarAgenteWhatsApp(e.target.value)}
                      className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                    >
                      <option value="">Seleccione agente</option>
                      {agentesWhatsApp.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-black uppercase text-slate-500">
                      Plantilla
                    </label>
                    <select
                      value={plantillaSeleccionada}
                      onChange={(e) => setPlantillaSeleccionada(e.target.value)}
                      className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                    >
                      <option value="">Seleccione plantilla</option>
                      {plantillasWhatsApp.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-black uppercase text-slate-500">
                      Programar para
                    </label>
                    <input
                      type="datetime-local"
                      value={programadoPara}
                      onChange={(e) => setProgramadoPara(e.target.value)}
                      className="w-full rounded-xl border px-4 py-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-black uppercase text-slate-500">
                      Número de WhatsApp
                    </label>

                    {telefonosDisponibles.length > 1 ? (
                      <>
                        <select
                          value={telefonoDestino}
                          onChange={(e) =>
                            setTelefonoSeleccionado(e.target.value)
                          }
                          className="w-full rounded-xl border bg-white px-4 py-3 text-sm font-bold text-slate-800"
                        >
                          {telefonosDisponibles.map((telefono) => (
                            <option key={telefono} value={telefono}>
                              {mostrarTelefonoWhatsApp(telefono)}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs font-semibold text-blue-700">
                          Se detectaron {telefonosDisponibles.length} números en el
                          campo de teléfono. Seleccione a cuál desea enviar.
                        </p>
                      </>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Dato
                          label="Destino WhatsApp"
                          value={
                            telefonoDestino
                              ? mostrarTelefonoWhatsApp(telefonoDestino)
                              : "Sin teléfono válido"
                          }
                          icon={Phone}
                        />
                        <Dato
                          label="Deuda al día"
                          value={`RD$ ${dinero(totalBalance)}`}
                        />
                      </div>
                    )}

                    {telefonosDisponibles.length > 1 && (
                      <div className="mt-2">
                        <Dato
                          label="Deuda al día"
                          value={`RD$ ${dinero(totalBalance)}`}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-black uppercase text-slate-500">
                      Vista previa
                    </p>
                    <div className="min-h-32 whitespace-pre-wrap rounded-xl border bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                      {vistaPreviaWhatsApp ||
                        "Seleccione un agente y una plantilla para generar la vista previa."}
                    </div>
                  </div>

                  {exclusionBloquea && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                      Existe una exclusión activa para esta unidad o para el agente seleccionado.
                    </div>
                  )}

                  {mensajeWhatsApp && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-800">
                      {mensajeWhatsApp}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={agregarWhatsAppACola}
                    disabled={
                      encolando ||
                      !telefonoDestino ||
                      !agenteActual ||
                      !plantillaActual ||
                      exclusionBloquea
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Send className="h-4 w-4" />
                    {encolando ? "Agregando..." : "Agregar a cola WhatsApp"}
                  </button>
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
