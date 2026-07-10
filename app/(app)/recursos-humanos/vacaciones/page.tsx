"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  HandCoins,
  RefreshCw,
  Save,
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

type Empleado = {
  id: number;
  condominio_id?: number | null;
  numero_empleado: string;
  nombre: string;
  cargo: string;
  departamento: string;
  estado: string;
  fecha_ingreso: string | null;
  salario: number | null;
};

type ConfigNomina = {
  id: number;
  condominio_id: number;
  condominio: string;
  porcentaje_afp: number;
  porcentaje_sfs: number;
  isr_exento_hasta: number;
  isr_tramo1_hasta: number;
  isr_tramo1_porcentaje: number;
  isr_tramo2_hasta: number;
  isr_tramo2_monto_fijo: number;
  isr_tramo2_porcentaje: number;
  isr_tramo3_monto_fijo: number;
  isr_tramo3_porcentaje: number;
  divisor_pago_vacaciones: number;
  estado: string;
};

type TipoNomina = {
  id: number;
  codigo: string;
  nombre: string;
  requiere_afp: boolean;
  requiere_sfs: boolean;
  requiere_isr: boolean;
  requiere_tss: boolean;
  estado: string;
};

type VacacionPermiso = {
  id: number;
  condominio_id: number;
  condominio: string;

  empleado_id: number;
  numero_empleado: string;
  nombre_empleado: string;
  cargo: string;
  departamento: string;

  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  cantidad_dias: number;
  forma_pago: string | null;
  saldo_disponible: number | null;
  dias_correspondientes: number | null;
  procesado_nomina: boolean | null;
  nomina_id: number | null;
  solicitud_pago_id: number | null;

  estado: string;
  motivo: string;
  observacion: string;

  aprobado_por: string | null;
  fecha_aprobacion: string | null;

  created_at: string;
};

type ModuloRH = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
  color: string;
  bg: string;
};

const tiposSolicitud = [
  "Vacaciones",
  "Permiso",
  "Licencia",
  "Ausencia justificada",
  "Permiso médico",
  "Permiso personal",
];

const estadosSolicitud = ["Pendiente", "Aprobado", "Rechazado"];

function numero(valor: string | number | null | undefined) {
  return Number(valor || 0);
}

function moneda(valor: string | number | null | undefined) {
  return numero(valor).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fecha(valor: string | null | undefined) {
  if (!valor) return "-";

  const limpio = String(valor).split("T")[0];
  const partes = limpio.split("-");

  if (partes.length !== 3) return limpio;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function estadoClass(estado: string | null | undefined) {
  if (estado === "Aprobado" || estado === "Activo" || estado === "Pagada") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (estado === "Pendiente") {
    return "border-yellow-100 bg-yellow-50 text-yellow-700";
  }

  if (estado === "Rechazado" || estado === "Anulada" || estado === "Inactivo") {
    return "border-red-100 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function valorDiaLaborable(fechaValor: Date) {
  const dia = fechaValor.getDay();

  if (dia === 0) return 0;
  if (dia === 6) return 0.5;

  return 1;
}

function formatearFechaISO(fechaValor: Date) {
  const y = fechaValor.getFullYear();
  const m = String(fechaValor.getMonth() + 1).padStart(2, "0");
  const d = String(fechaValor.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

export default function VacacionesPermisosPage() {
  const [mounted, setMounted] = useState(false);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [solicitudes, setSolicitudes] = useState<VacacionPermiso[]>([]);
  const [configNomina, setConfigNomina] = useState<ConfigNomina | null>(null);
  const [tipoNominaVacaciones, setTipoNominaVacaciones] =
    useState<TipoNomina | null>(null);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [empleadoId, setEmpleadoId] = useState("");
  const [tipo, setTipo] = useState("Vacaciones");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [cantidadDias, setCantidadDias] = useState(1);
  const [diasCorrespondientes, setDiasCorrespondientes] = useState(0);
  const [antiguedadTexto, setAntiguedadTexto] = useState("");
  const [saldoDisponible, setSaldoDisponible] = useState(0);
  const [formaPago, setFormaPago] = useState("Junto Nómina");
  const [estado, setEstado] = useState("Pendiente");
  const [motivo, setMotivo] = useState("");
  const [observacion, setObservacion] = useState("");

  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroTipo, setFiltroTipo] = useState("Todos");

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
      icono: CalendarDays,
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
    const usuario =
      localStorage.getItem("usuario_nombre") ||
      localStorage.getItem("nombre_usuario") ||
      "Administración";

    setCondominioId(id);
    setCondominioNombre(nombre);
    setUsuarioNombre(usuario);

    if (!id || !Number(id)) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    cargarTodo(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarTodo(id: string) {
    await Promise.all([
      cargarConfiguracionNomina(id),
      cargarTipoNominaVacaciones(id),
      cargarEmpleados(id),
      cargarSolicitudes(id),
    ]);
  }

  async function cargarConfiguracionNomina(id: string) {
    const condominioIdNumero = Number(id);

    if (!condominioIdNumero) return;

    const { data, error } = await supabase
      .from("rh_configuracion_nomina")
      .select("*")
      .eq("condominio_id", condominioIdNumero)
      .eq("estado", "Activo")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setMensaje("Error cargando configuración de nómina: " + error.message);
      return;
    }

    if (data && Number(data.condominio_id) === condominioIdNumero) {
      setConfigNomina(data as ConfigNomina);
    } else {
      setConfigNomina(null);
    }
  }

  async function cargarTipoNominaVacaciones(id: string) {
    const condominioIdNumero = Number(id);

    if (!condominioIdNumero) return;

    const { data, error } = await supabase
      .from("rh_tipos_nomina")
      .select(
        "id, codigo, nombre, requiere_afp, requiere_sfs, requiere_isr, requiere_tss, estado",
      )
      .eq("condominio_id", condominioIdNumero)
      .eq("codigo", "VAC")
      .eq("estado", "Activo")
      .maybeSingle();

    if (error) {
      setMensaje(
        "Error cargando tipo de nómina de vacaciones: " + error.message,
      );
      return;
    }

    setTipoNominaVacaciones((data as TipoNomina) || null);
  }

  async function cargarEmpleados(id: string) {
    const condominioIdNumero = Number(id);

    if (!condominioIdNumero) return;

    const { data, error } = await supabase
      .from("empleados")
      .select(
        "id, condominio_id, numero_empleado, nombre, cargo, departamento, estado, fecha_ingreso, salario",
      )
      .eq("condominio_id", condominioIdNumero)
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });

    if (error) {
      setMensaje("Error cargando empleados: " + error.message);
      return;
    }

    setEmpleados(
      ((data as Empleado[]) || []).filter(
        (e) => Number(e.condominio_id) === condominioIdNumero,
      ),
    );
  }

  async function cargarSolicitudes(id: string) {
    const condominioIdNumero = Number(id);

    if (!condominioIdNumero) return;

    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("rh_vacaciones_permisos")
      .select("*")
      .eq("condominio_id", condominioIdNumero)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando vacaciones/permisos: " + error.message);
      return;
    }

    setSolicitudes(
      ((data as VacacionPermiso[]) || []).filter(
        (s) => Number(s.condominio_id) === condominioIdNumero,
      ),
    );
  }

  async function refrescar() {
    if (!condominioId || !Number(condominioId)) return;
    await cargarTodo(condominioId);
  }

  const empleadosSeguros = useMemo(() => {
    const condominioIdNumero = Number(condominioId);
    if (!condominioIdNumero) return [];

    return empleados.filter(
      (emp) => Number(emp.condominio_id) === condominioIdNumero,
    );
  }, [empleados, condominioId]);

  const solicitudesSeguras = useMemo(() => {
    const condominioIdNumero = Number(condominioId);
    if (!condominioIdNumero) return [];

    return solicitudes.filter(
      (s) => Number(s.condominio_id) === condominioIdNumero,
    );
  }, [solicitudes, condominioId]);

  function obtenerEmpleadoSeleccionado(idEmpleado = empleadoId) {
    return empleadosSeguros.find((emp) => String(emp.id) === idEmpleado) || null;
  }

  function calcularAntiguedad(fechaIngreso: string | null | undefined) {
    if (!fechaIngreso) {
      return {
        anios: 0,
        meses: 0,
        texto: "Sin fecha de ingreso",
      };
    }

    const ingreso = new Date(`${fechaIngreso}T00:00:00`);
    const hoy = new Date();

    let anios = hoy.getFullYear() - ingreso.getFullYear();
    let meses = hoy.getMonth() - ingreso.getMonth();

    if (hoy.getDate() < ingreso.getDate()) {
      meses -= 1;
    }

    if (meses < 0) {
      anios -= 1;
      meses += 12;
    }

    return {
      anios: Math.max(anios, 0),
      meses: Math.max(meses, 0),
      texto: `${Math.max(anios, 0)} año(s) y ${Math.max(meses, 0)} mes(es)`,
    };
  }

  function calcularDiasCorrespondientes(
    fechaIngreso: string | null | undefined,
  ) {
    const antiguedad = calcularAntiguedad(fechaIngreso);

    if (antiguedad.anios <= 0) return 0;

    return antiguedad.anios > 5 ? 18 : 14;
  }

  function calcularFechaFinLaborable(inicio: string, diasObjetivo: number) {
    if (!inicio || diasObjetivo <= 0) return "";

    const fechaValor = new Date(`${inicio}T00:00:00`);
    let acumulado = 0;
    let seguridad = 0;

    while (acumulado < diasObjetivo && seguridad < 120) {
      acumulado += valorDiaLaborable(fechaValor);

      if (acumulado >= diasObjetivo) {
        return formatearFechaISO(fechaValor);
      }

      fechaValor.setDate(fechaValor.getDate() + 1);
      seguridad += 1;
    }

    return formatearFechaISO(fechaValor);
  }

  function calcularDiasLaborables(inicio: string, fin: string) {
    if (!inicio || !fin) return 0;

    const fechaValor = new Date(`${inicio}T00:00:00`);
    const fechaFinDate = new Date(`${fin}T00:00:00`);

    if (fechaFinDate < fechaValor) return 0;

    let total = 0;
    let seguridad = 0;

    while (fechaValor <= fechaFinDate && seguridad < 120) {
      total += valorDiaLaborable(fechaValor);
      fechaValor.setDate(fechaValor.getDate() + 1);
      seguridad += 1;
    }

    return total;
  }

  async function cargarSaldoVacaciones(idEmpleado: string) {
    if (!condominioId || !idEmpleado) {
      setSaldoDisponible(0);
      return;
    }

    const condominioIdNumero = Number(condominioId);
    const anioActual = new Date().getFullYear();

    const { data, error } = await supabase
      .from("rh_balance_vacaciones")
      .select("dias_disponibles, condominio_id")
      .eq("condominio_id", condominioIdNumero)
      .eq("empleado_id", Number(idEmpleado))
      .eq("anio", anioActual)
      .maybeSingle();

    if (error || Number(data?.condominio_id) !== condominioIdNumero) {
      setSaldoDisponible(0);
      return;
    }

    setSaldoDisponible(Number(data?.dias_disponibles || 0));
  }

  async function manejarEmpleado(valor: string) {
    setEmpleadoId(valor);
    setFechaInicio("");
    setFechaFin("");
    setCantidadDias(1);

    const empleado = obtenerEmpleadoSeleccionado(valor);

    if (!empleado) {
      setDiasCorrespondientes(0);
      setAntiguedadTexto("");
      setSaldoDisponible(0);
      return;
    }

    const antiguedad = calcularAntiguedad(empleado.fecha_ingreso);
    const dias = calcularDiasCorrespondientes(empleado.fecha_ingreso);

    setAntiguedadTexto(antiguedad.texto);
    setDiasCorrespondientes(dias);
    setCantidadDias(dias > 0 ? dias : 1);

    await cargarSaldoVacaciones(valor);
  }

  function manejarFechaInicio(valor: string) {
    setFechaInicio(valor);

    if (tipo === "Vacaciones") {
      const empleado = obtenerEmpleadoSeleccionado();
      const dias =
        diasCorrespondientes ||
        calcularDiasCorrespondientes(empleado?.fecha_ingreso);

      if (dias > 0) {
        const fin = calcularFechaFinLaborable(valor, dias);
        setFechaFin(fin);
        setCantidadDias(dias);
        return;
      }
    }

    if (fechaFin) {
      setCantidadDias(calcularDiasLaborables(valor, fechaFin));
    }
  }

  function manejarFechaFin(valor: string) {
    setFechaFin(valor);
    setCantidadDias(calcularDiasLaborables(fechaInicio, valor));
  }

  function manejarTipo(valor: string) {
    setTipo(valor);

    if (valor === "Vacaciones" && fechaInicio) {
      const empleado = obtenerEmpleadoSeleccionado();
      const dias =
        diasCorrespondientes ||
        calcularDiasCorrespondientes(empleado?.fecha_ingreso);

      if (dias > 0) {
        const fin = calcularFechaFinLaborable(fechaInicio, dias);
        setFechaFin(fin);
        setCantidadDias(dias);
      }
    }
  }

  function limpiarFormulario() {
    setEditandoId(null);

    setEmpleadoId("");
    setTipo("Vacaciones");
    setFechaInicio("");
    setFechaFin("");
    setCantidadDias(1);
    setDiasCorrespondientes(0);
    setAntiguedadTexto("");
    setSaldoDisponible(0);
    setFormaPago("Junto Nómina");
    setEstado("Pendiente");
    setMotivo("");
    setObservacion("");
  }

  function editarSolicitud(solicitud: VacacionPermiso) {
    setEditandoId(solicitud.id);

    setEmpleadoId(String(solicitud.empleado_id));
    setTipo(solicitud.tipo || "Vacaciones");
    setFechaInicio(solicitud.fecha_inicio || "");
    setFechaFin(solicitud.fecha_fin || "");
    setCantidadDias(Number(solicitud.cantidad_dias || 1));
    setDiasCorrespondientes(Number(solicitud.dias_correspondientes || 0));
    setSaldoDisponible(Number(solicitud.saldo_disponible || 0));
    setFormaPago(solicitud.forma_pago || "Junto Nómina");
    setEstado(solicitud.estado || "Pendiente");
    setMotivo(solicitud.motivo || "");
    setObservacion(solicitud.observacion || "");

    const empleado = empleadosSeguros.find(
      (emp) => Number(emp.id) === Number(solicitud.empleado_id),
    );

    if (empleado) {
      setAntiguedadTexto(calcularAntiguedad(empleado.fecha_ingreso).texto);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarSolicitud(e: React.FormEvent) {
    e.preventDefault();

    const condominioIdNumero = Number(condominioId);

    if (!condominioIdNumero || !condominioNombre) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    if (!empleadoId) {
      setMensaje("Debe seleccionar un empleado.");
      return;
    }

    if (!tipo) {
      setMensaje("Debe seleccionar el tipo de solicitud.");
      return;
    }

    if (!fechaInicio) {
      setMensaje("Debe indicar la fecha de inicio.");
      return;
    }

    if (!fechaFin) {
      setMensaje("Debe indicar la fecha fin.");
      return;
    }

    const diasCalculados =
      tipo === "Vacaciones"
        ? Number(cantidadDias || 0)
        : calcularDiasLaborables(fechaInicio, fechaFin);

    if (diasCalculados <= 0) {
      setMensaje("La fecha fin no puede ser menor que la fecha de inicio.");
      return;
    }

    const empleado = empleadosSeguros.find(
      (emp) => String(emp.id) === empleadoId,
    );

    if (!empleado) {
      setMensaje("Empleado no encontrado.");
      return;
    }

    if (tipo === "Vacaciones") {
      if (!empleado.fecha_ingreso) {
        setMensaje("El empleado no tiene fecha de ingreso registrada.");
        return;
      }

      if (
        diasCalculados > Number(saldoDisponible || 0) &&
        Number(saldoDisponible || 0) > 0
      ) {
        const continuar = confirm(
          "Los días solicitados superan el saldo disponible. ¿Desea continuar de todos modos?",
        );

        if (!continuar) return;
      }
    }

    const registro = {
      condominio_id: condominioIdNumero,
      condominio: condominioNombre,

      empleado_id: Number(empleadoId),
      numero_empleado: empleado.numero_empleado || "",
      nombre_empleado: empleado.nombre || "",
      cargo: empleado.cargo || "",
      departamento: empleado.departamento || "",

      tipo,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      cantidad_dias: diasCalculados,

      forma_pago: tipo === "Vacaciones" ? formaPago : "No aplica",
      saldo_disponible: tipo === "Vacaciones" ? Number(saldoDisponible || 0) : 0,
      dias_correspondientes:
        tipo === "Vacaciones"
          ? Number(diasCorrespondientes || diasCalculados || 0)
          : 0,

      estado,
      motivo: motivo.trim(),
      observacion: observacion.trim(),

      aprobado_por:
        estado === "Aprobado" || estado === "Rechazado" ? usuarioNombre : null,
      fecha_aprobacion:
        estado === "Aprobado" || estado === "Rechazado"
          ? new Date().toISOString().slice(0, 10)
          : null,
    };

    setGuardando(true);
    setMensaje("");

    if (editandoId) {
      const { error } = await supabase
        .from("rh_vacaciones_permisos")
        .update(registro)
        .eq("id", editandoId)
        .eq("condominio_id", condominioIdNumero);

      setGuardando(false);

      if (error) {
        setMensaje("Error modificando solicitud: " + error.message);
        return;
      }

      setMensaje("Solicitud modificada correctamente.");
      limpiarFormulario();
      cargarSolicitudes(condominioId);
      return;
    }

    const { error } = await supabase
      .from("rh_vacaciones_permisos")
      .insert([registro]);

    setGuardando(false);

    if (error) {
      setMensaje("Error guardando solicitud: " + error.message);
      return;
    }

    setMensaje("Solicitud registrada correctamente.");
    limpiarFormulario();
    cargarSolicitudes(condominioId);
  }

  function calcularPagoVacacionesMonto(empleado: Empleado, dias: number) {
    const divisor = Number(configNomina?.divisor_pago_vacaciones || 23.83);

    if (divisor <= 0) return 0;

    return (Number(empleado.salario || 0) / divisor) * Number(dias || 0);
  }

  function calcularISRDesdeMonto(monto: number) {
    if (!configNomina || !tipoNominaVacaciones?.requiere_isr) return 0;

    const salarioAnual = Number(monto || 0) * 12;

    const exentoHasta = Number(configNomina.isr_exento_hasta || 0);
    const tramo1Hasta = Number(configNomina.isr_tramo1_hasta || 0);
    const tramo1Porcentaje =
      Number(configNomina.isr_tramo1_porcentaje || 0) / 100;

    const tramo2Hasta = Number(configNomina.isr_tramo2_hasta || 0);
    const tramo2MontoFijo = Number(configNomina.isr_tramo2_monto_fijo || 0);
    const tramo2Porcentaje =
      Number(configNomina.isr_tramo2_porcentaje || 0) / 100;

    const tramo3MontoFijo = Number(configNomina.isr_tramo3_monto_fijo || 0);
    const tramo3Porcentaje =
      Number(configNomina.isr_tramo3_porcentaje || 0) / 100;

    let isrAnual = 0;

    if (salarioAnual <= exentoHasta) {
      isrAnual = 0;
    } else if (salarioAnual <= tramo1Hasta) {
      isrAnual = (salarioAnual - exentoHasta) * tramo1Porcentaje;
    } else if (salarioAnual <= tramo2Hasta) {
      isrAnual =
        tramo2MontoFijo + (salarioAnual - tramo1Hasta) * tramo2Porcentaje;
    } else {
      isrAnual =
        tramo3MontoFijo + (salarioAnual - tramo2Hasta) * tramo3Porcentaje;
    }

    return isrAnual / 12;
  }

  async function obtenerProximoNumeroSolicitud() {
    const { data, error } = await supabase
      .from("solicitudes_pago")
      .select("numero_solicitud")
      .eq("condominio_id", Number(condominioId))
      .order("numero_solicitud", { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    const ultimo =
      data && data.length > 0 ? Number(data[0].numero_solicitud || 0) : 0;

    return ultimo + 1;
  }

  async function generarSolicitudPagoVacaciones(
    nominaId: number,
    empleado: Empleado,
    solicitud: VacacionPermiso,
    netoPagar: number,
    totalIngresos: number,
    totalDescuentos: number,
  ) {
    const numeroSolicitud = await obtenerProximoNumeroSolicitud();
    const fechaSolicitud = new Date().toISOString().slice(0, 10);

    const concepto = `Pago de Vacaciones - ${empleado.nombre} - ${
      solicitud.fecha_inicio || ""
    }`;

    const detalle = [
      "Solicitud generada automáticamente desde Vacaciones / Permisos.",
      `Empleado: ${empleado.nombre || "-"}`,
      `No. empleado: ${empleado.numero_empleado || "-"}`,
      `Cargo: ${empleado.cargo || "-"}`,
      `Departamento: ${empleado.departamento || "-"}`,
      `Fecha inicio: ${solicitud.fecha_inicio || "-"}`,
      `Fecha fin: ${solicitud.fecha_fin || "-"}`,
      `Días vacaciones: ${Number(solicitud.cantidad_dias || 0)}`,
      "Forma de pago: Pago Independiente",
      `Total ingresos: RD$${moneda(totalIngresos)}`,
      `Total descuentos: RD$${moneda(totalDescuentos)}`,
      `Neto a pagar: RD$${moneda(netoPagar)}`,
    ].join("\n");

    const { data, error } = await supabase
      .from("solicitudes_pago")
      .insert([
        {
          condominio_id: Number(condominioId),
          condominio: condominioNombre,
          fecha_solicitud: fechaSolicitud,
          concepto,
          detalle,
          monto: Number(netoPagar || 0),
          itbis: 0,
          total: Number(netoPagar || 0),
          no_factura: `VAC-${solicitud.id}-${String(nominaId).padStart(
            6,
            "0",
          )}`,
          metodo_pago: "Pendiente",
          prioridad: "Normal",
          estado: "Pendiente aprobación tesorero",
          created_by: usuarioNombre,
          numero_solicitud: numeroSolicitud,
        },
      ])
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return Number(data.id);
  }

  async function generarNominaVacacionesIndependiente(
    solicitud: VacacionPermiso,
  ) {
    if (!configNomina) {
      throw new Error("No hay configuración de nómina activa.");
    }

    if (!tipoNominaVacaciones) {
      throw new Error(
        "No existe tipo de nómina VAC activo para este condominio.",
      );
    }

    if (solicitud.nomina_id || solicitud.procesado_nomina) {
      return;
    }

    const empleado = empleadosSeguros.find(
      (emp) => Number(emp.id) === Number(solicitud.empleado_id),
    );

    if (!empleado) {
      throw new Error(
        "Empleado no encontrado para generar nómina de vacaciones.",
      );
    }

    const periodo = (solicitud.fecha_inicio || new Date().toISOString()).slice(
      0,
      7,
    );

    const pagoVacaciones = calcularPagoVacacionesMonto(
      empleado,
      Number(solicitud.cantidad_dias || 0),
    );

    const afp = tipoNominaVacaciones.requiere_afp
      ? pagoVacaciones * (Number(configNomina.porcentaje_afp || 0) / 100)
      : 0;

    const sfs = tipoNominaVacaciones.requiere_sfs
      ? pagoVacaciones * (Number(configNomina.porcentaje_sfs || 0) / 100)
      : 0;

    const isr = calcularISRDesdeMonto(pagoVacaciones);

    const totalIngresos = pagoVacaciones;
    const totalDescuentos = afp + sfs + isr;
    const netoPagar = totalIngresos - totalDescuentos;

    const { data: nominaCreada, error: nominaError } = await supabase
      .from("rh_nomina")
      .insert([
        {
          condominio_id: Number(condominioId),
          condominio: condominioNombre,

          empleado_id: Number(empleado.id),
          numero_empleado: empleado.numero_empleado || "",
          nombre_empleado: empleado.nombre || "",
          cargo: empleado.cargo || "",
          departamento: empleado.departamento || "",

          tipo_nomina_id: Number(tipoNominaVacaciones.id),
          tipo_nomina: tipoNominaVacaciones.nombre || "Pago de Vacaciones",

          periodo,
          fecha_pago: null,

          salario_base: 0,
          dias_trabajados: 0,
          horas_extras: 0,
          monto_horas_extras: 0,
          bonificacion: 0,

          vacaciones_id: Number(solicitud.id),
          dias_vacaciones: Number(solicitud.cantidad_dias || 0),
          pago_vacaciones: pagoVacaciones,

          afp,
          sfs,
          isr,
          otros_descuentos: 0,

          total_ingresos: totalIngresos,
          total_descuentos: totalDescuentos,
          neto_pagar: netoPagar,

          estado: "Aprobada",
          observacion: `Nómina generada automáticamente por vacaciones independientes. Solicitud vacaciones #${solicitud.id}`,
          pagado_por: null,
          fecha_registro_pago: null,
        },
      ])
      .select("id")
      .single();

    if (nominaError) {
      throw new Error(nominaError.message);
    }

    const nominaId = Number(nominaCreada.id);

    const solicitudPagoId = await generarSolicitudPagoVacaciones(
      nominaId,
      empleado,
      solicitud,
      netoPagar,
      totalIngresos,
      totalDescuentos,
    );

    const { error: updateNominaError } = await supabase
      .from("rh_nomina")
      .update({
        solicitud_pago_id: solicitudPagoId,
        solicitud_pago_generada: true,
      })
      .eq("id", nominaId)
      .eq("condominio_id", Number(condominioId));

    if (updateNominaError) {
      throw new Error(updateNominaError.message);
    }

    const { error: updateSolicitudError } = await supabase
      .from("rh_vacaciones_permisos")
      .update({
        nomina_id: nominaId,
        solicitud_pago_id: solicitudPagoId,
        procesado_nomina: true,
        monto_pagado: pagoVacaciones,
      })
      .eq("id", solicitud.id)
      .eq("condominio_id", Number(condominioId));

    if (updateSolicitudError) {
      throw new Error(updateSolicitudError.message);
    }
  }

  async function actualizarEstado(
    solicitud: VacacionPermiso,
    nuevoEstado: string,
  ) {
    const esPagoIndependiente =
      solicitud.tipo === "Vacaciones" &&
      solicitud.forma_pago === "Pago Independiente" &&
      nuevoEstado === "Aprobado";

    const confirmar = confirm(
      esPagoIndependiente
        ? "¿Desea aprobar estas vacaciones y generar la nómina VAC con su solicitud de pago?"
        : `¿Desea cambiar esta solicitud a "${nuevoEstado}"?`,
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("rh_vacaciones_permisos")
      .update({
        estado: nuevoEstado,
        aprobado_por:
          nuevoEstado === "Aprobado" || nuevoEstado === "Rechazado"
            ? usuarioNombre
            : null,
        fecha_aprobacion:
          nuevoEstado === "Aprobado" || nuevoEstado === "Rechazado"
            ? new Date().toISOString().slice(0, 10)
            : null,
      })
      .eq("id", solicitud.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      setMensaje("Error actualizando estado: " + error.message);
      return;
    }

    if (esPagoIndependiente) {
      try {
        await generarNominaVacacionesIndependiente({
          ...solicitud,
          estado: "Aprobado",
        });
      } catch (error: any) {
        setMensaje(
          "Las vacaciones fueron aprobadas, pero ocurrió un error generando la nómina/solicitud de pago: " +
            error.message,
        );
        cargarSolicitudes(condominioId);
        return;
      }
    }

    setMensaje(
      esPagoIndependiente
        ? "Vacaciones aprobadas, nómina VAC y solicitud de pago generadas correctamente."
        : "Estado actualizado correctamente.",
    );

    cargarSolicitudes(condominioId);
  }

  async function eliminarSolicitud(solicitud: VacacionPermiso) {
    const confirmar = confirm(
      `¿Seguro que desea eliminar la solicitud de ${solicitud.nombre_empleado}?`,
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("rh_vacaciones_permisos")
      .delete()
      .eq("id", solicitud.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      setMensaje("Error eliminando solicitud: " + error.message);
      return;
    }

    setMensaje("Solicitud eliminada correctamente.");
    cargarSolicitudes(condominioId);
  }

  const solicitudesFiltradas = useMemo(() => {
    return solicitudesSeguras.filter((s) => {
      const cumpleEstado = filtroEstado === "Todos" || s.estado === filtroEstado;
      const cumpleTipo = filtroTipo === "Todos" || s.tipo === filtroTipo;

      return cumpleEstado && cumpleTipo;
    });
  }, [solicitudesSeguras, filtroEstado, filtroTipo]);

  const pendientes = solicitudesSeguras.filter(
    (s) => s.estado === "Pendiente",
  ).length;

  const aprobadas = solicitudesSeguras.filter(
    (s) => s.estado === "Aprobado",
  ).length;

  const rechazadas = solicitudesSeguras.filter(
    (s) => s.estado === "Rechazado",
  ).length;

  const diasAprobados = solicitudesSeguras
    .filter((s) => s.estado === "Aprobado")
    .reduce((sum, s) => sum + Number(s.cantidad_dias || 0), 0);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="rounded-2xl border bg-white p-6 text-sm font-bold text-slate-600">
          Cargando módulo de vacaciones...
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
            icon: CalendarDays,
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
        title="Vacaciones / Permisos"
        subtitle={`Control de vacaciones, permisos, licencias y ausencias justificadas. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={CalendarDays}
        actions={<ModuleActions onRefresh={refrescar} />}
      />

      {mensaje && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          {mensaje}
        </div>
      )}

      <SectionCard
        title="Resumen de vacaciones y permisos"
        subtitle="Indicadores generales del condominio activo."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Actualizando
            </div>
          ) : (
            <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">
              {solicitudesSeguras.length} solicitud(es)
            </span>
          )
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <InfoCompacta
            label="Solicitudes"
            value={`${solicitudesSeguras.length}`}
            detalle="Total registradas"
          />

          <InfoCompacta
            label="Pendientes"
            value={`${pendientes}`}
            detalle="Por revisar"
            icon={Clock}
            color="text-yellow-700"
            bg="bg-yellow-50"
          />

          <InfoCompacta
            label="Aprobadas"
            value={`${aprobadas}`}
            detalle="Autorizadas"
            icon={CheckCircle2}
            color="text-emerald-700"
            bg="bg-emerald-50"
          />

          <InfoCompacta
            label="Rechazadas"
            value={`${rechazadas}`}
            detalle="No aprobadas"
            icon={XCircle}
            color="text-red-700"
            bg="bg-red-50"
          />

          <InfoCompacta
            label="Días aprobados"
            value={`${diasAprobados}`}
            detalle="Vacaciones/permisos"
            icon={CalendarCheck}
            color="text-blue-700"
            bg="bg-blue-50"
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
        title={editandoId ? "Modificar solicitud" : "Registrar solicitud"}
        subtitle="Registre vacaciones, permisos, licencias o ausencias justificadas."
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
          onSubmit={guardarSolicitud}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Empleado *
            </label>

            <select
              value={empleadoId}
              onChange={(e) => manejarEmpleado(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Seleccione empleado</option>

              {empleadosSeguros.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.numero_empleado} - {emp.nombre} - {emp.cargo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Tipo de solicitud *
            </label>

            <select
              value={tipo}
              onChange={(e) => manejarTipo(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              {tiposSolicitud.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Fecha inicio *
            </label>

            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => manejarFechaInicio(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Fecha fin *
            </label>

            <input
              type="date"
              value={fechaFin}
              onChange={(e) => manejarFechaFin(e.target.value)}
              readOnly={tipo === "Vacaciones"}
              className={`w-full rounded-xl border px-4 py-3 text-sm ${
                tipo === "Vacaciones" ? "bg-slate-100 font-bold" : "bg-white"
              }`}
            />
          </div>

          {tipo === "Vacaciones" && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 md:col-span-2">
              <h3 className="mb-3 font-black text-blue-900">
                Cálculo automático de vacaciones
              </h3>

              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
                <DetalleCalculo
                  label="Antigüedad"
                  value={antiguedadTexto || "-"}
                />

                <DetalleCalculo
                  label="Días correspondientes"
                  value={`${diasCorrespondientes || 0}`}
                />

                <DetalleCalculo
                  label="Saldo disponible"
                  value={`${saldoDisponible.toFixed(2)}`}
                />

                <DetalleCalculo
                  label="Regla aplicada"
                  value="L-V = 1 / Sábado = 0.5"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Cantidad de días
            </label>

            <input
              value={cantidadDias}
              readOnly
              className="w-full rounded-xl border bg-slate-100 px-4 py-3 text-sm font-bold"
            />
          </div>

          {tipo === "Vacaciones" && (
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Forma de pago
              </label>

              <select
                value={formaPago}
                onChange={(e) => setFormaPago(e.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              >
                <option value="Junto Nómina">Junto Nómina</option>
                <option value="Pago Independiente">Pago Independiente</option>
              </select>

              <p className="mt-1 text-xs text-slate-500">
                Pago Independiente genera nómina VAC y solicitud de pago al
                aprobar.
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Estado
            </label>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              {estadosSolicitud.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Motivo
            </label>

            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              rows={3}
              placeholder="Motivo de la solicitud"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Observación administrativa
            </label>

            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              rows={3}
              placeholder="Observaciones internas"
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
                  : "Guardar solicitud"}
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
        title="Listado de solicitudes"
        subtitle="Solicitudes registradas para el personal del condominio activo."
        action={
          <div className="flex flex-col gap-3 md:flex-row">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">
                Tipo
              </label>

              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="rounded-xl border bg-white px-4 py-2 text-sm"
              >
                <option value="Todos">Todos</option>

                {tiposSolicitud.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">
                Estado
              </label>

              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="rounded-xl border bg-white px-4 py-2 text-sm"
              >
                <option value="Todos">Todos</option>

                {estadosSolicitud.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        }
      >
        {loading ? (
          <div className="rounded-2xl border bg-slate-50 p-6 text-sm font-bold text-slate-600">
            Cargando solicitudes...
          </div>
        ) : solicitudesFiltradas.length === 0 ? (
          <EmptyState
            title="Sin solicitudes"
            description="No hay solicitudes registradas con este filtro."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Empleado</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Fechas</th>
                <th className="px-4 py-3 text-center">Días</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-left">Motivo</th>
                <th className="px-4 py-3 text-left">Aprobación</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {solicitudesFiltradas.map((solicitud) => (
                <tr key={solicitud.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-900">
                      {solicitud.nombre_empleado || "-"}
                    </p>

                    <p className="text-xs text-slate-500">
                      {solicitud.numero_empleado || "-"} ·{" "}
                      {solicitud.cargo || "-"}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-black">{solicitud.tipo || "-"}</p>

                    {solicitud.tipo === "Vacaciones" && (
                      <p className="text-xs text-slate-500">
                        {solicitud.forma_pago || "Junto Nómina"}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <p>Desde: {fecha(solicitud.fecha_inicio)}</p>
                    <p className="text-xs text-slate-500">
                      Hasta: {fecha(solicitud.fecha_fin)}
                    </p>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <p className="font-black">{solicitud.cantidad_dias}</p>

                    {solicitud.tipo === "Vacaciones" && (
                      <p className="text-xs text-slate-500">
                        Corr.: {solicitud.dias_correspondientes || "-"} · Saldo:{" "}
                        {Number(solicitud.saldo_disponible || 0).toFixed(2)}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${estadoClass(
                        solicitud.estado,
                      )}`}
                    >
                      {solicitud.estado || "-"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <p>{solicitud.motivo || "-"}</p>

                    {solicitud.observacion && (
                      <p className="mt-1 text-xs text-slate-500">
                        Obs.: {solicitud.observacion}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {solicitud.nomina_id && (
                      <p className="mb-1 text-xs font-black text-blue-700">
                        Nómina #{solicitud.nomina_id}
                      </p>
                    )}

                    {solicitud.solicitud_pago_id && (
                      <p className="mb-1 text-xs font-black text-emerald-700">
                        Solicitud pago #{solicitud.solicitud_pago_id}
                      </p>
                    )}

                    {solicitud.aprobado_por ? (
                      <>
                        <p className="font-black">
                          {solicitud.aprobado_por}
                        </p>

                        <p className="text-xs text-slate-500">
                          {fecha(solicitud.fecha_aprobacion)}
                        </p>
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-slate-400">
                        Pendiente
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => editarSolicitud(solicitud)}
                        className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        Editar
                      </button>

                      {solicitud.estado !== "Aprobado" && (
                        <button
                          type="button"
                          onClick={() =>
                            actualizarEstado(solicitud, "Aprobado")
                          }
                          className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                        >
                          Aprobar
                        </button>
                      )}

                      {solicitud.estado !== "Rechazado" && (
                        <button
                          type="button"
                          onClick={() =>
                            actualizarEstado(solicitud, "Rechazado")
                          }
                          className="rounded-xl bg-yellow-700 px-3 py-2 text-xs font-bold text-white hover:bg-yellow-800"
                        >
                          Rechazar
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => eliminarSolicitud(solicitud)}
                        className="rounded-xl bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800"
                      >
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

function DetalleCalculo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
        {label}
      </p>

      <p className="mt-1 font-black text-slate-900">{value}</p>
    </div>
  );
}