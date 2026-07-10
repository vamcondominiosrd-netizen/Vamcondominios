"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Empleado = {
  id: number;
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

  aprobado_por: string;
  fecha_aprobacion: string;

  created_at: string;
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

export default function VacacionesPermisosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");

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

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const usuario = localStorage.getItem("usuario_nombre") || "Administración";

    setCondominioId(id);
    setCondominioNombre(nombre);
    setUsuarioNombre(usuario);

    if (id) {
      cargarConfiguracionNomina(id);
      cargarTipoNominaVacaciones(id);
      cargarEmpleados(id);
      cargarSolicitudes(id);
    }
  }, []);

  async function cargarConfiguracionNomina(id: string) {
    const { data, error } = await supabase
      .from("rh_configuracion_nomina")
      .select("*")
      .eq("condominio_id", Number(id))
      .eq("estado", "Activo")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      alert("Error cargando configuración de nómina: " + error.message);
      return;
    }

    setConfigNomina((data as ConfigNomina) || null);
  }

  async function cargarTipoNominaVacaciones(id: string) {
    const { data, error } = await supabase
      .from("rh_tipos_nomina")
      .select(
        "id, codigo, nombre, requiere_afp, requiere_sfs, requiere_isr, requiere_tss, estado"
      )
      .eq("condominio_id", Number(id))
      .eq("codigo", "VAC")
      .eq("estado", "Activo")
      .maybeSingle();

    if (error) {
      alert("Error cargando tipo de nómina de vacaciones: " + error.message);
      return;
    }

    setTipoNominaVacaciones((data as TipoNomina) || null);
  }

  async function cargarEmpleados(id: string) {
    const { data, error } = await supabase
      .from("empleados")
      .select("id, numero_empleado, nombre, cargo, departamento, estado, fecha_ingreso, salario")
      .eq("condominio_id", Number(id))
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando empleados: " + error.message);
      return;
    }

    setEmpleados((data as Empleado[]) || []);
  }

  async function cargarSolicitudes(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("rh_vacaciones_permisos")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando vacaciones/permisos: " + error.message);
      return;
    }

    setSolicitudes((data as VacacionPermiso[]) || []);
  }

  function obtenerEmpleadoSeleccionado(idEmpleado = empleadoId) {
    return empleados.find((emp) => String(emp.id) === idEmpleado) || null;
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

  function calcularDiasCorrespondientes(fechaIngreso: string | null | undefined) {
    const antiguedad = calcularAntiguedad(fechaIngreso);

    if (antiguedad.anios <= 0) return 0;

    return antiguedad.anios > 5 ? 18 : 14;
  }

  function valorDiaLaborable(fecha: Date) {
    const dia = fecha.getDay();

    if (dia === 0) return 0;
    if (dia === 6) return 0.5;

    return 1;
  }

  function formatearFechaISO(fecha: Date) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, "0");
    const d = String(fecha.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
  }

  function calcularFechaFinLaborable(inicio: string, diasObjetivo: number) {
    if (!inicio || diasObjetivo <= 0) return "";

    const fecha = new Date(`${inicio}T00:00:00`);
    let acumulado = 0;
    let seguridad = 0;

    while (acumulado < diasObjetivo && seguridad < 120) {
      acumulado += valorDiaLaborable(fecha);

      if (acumulado >= diasObjetivo) {
        return formatearFechaISO(fecha);
      }

      fecha.setDate(fecha.getDate() + 1);
      seguridad += 1;
    }

    return formatearFechaISO(fecha);
  }

  function calcularDiasLaborables(inicio: string, fin: string) {
    if (!inicio || !fin) return 0;

    const fecha = new Date(`${inicio}T00:00:00`);
    const fechaFinDate = new Date(`${fin}T00:00:00`);

    if (fechaFinDate < fecha) return 0;

    let total = 0;
    let seguridad = 0;

    while (fecha <= fechaFinDate && seguridad < 120) {
      total += valorDiaLaborable(fecha);
      fecha.setDate(fecha.getDate() + 1);
      seguridad += 1;
    }

    return total;
  }

  async function cargarSaldoVacaciones(idEmpleado: string) {
    if (!condominioId || !idEmpleado) {
      setSaldoDisponible(0);
      return;
    }

    const anioActual = new Date().getFullYear();

    const { data, error } = await supabase
      .from("rh_balance_vacaciones")
      .select("dias_disponibles")
      .eq("condominio_id", Number(condominioId))
      .eq("empleado_id", Number(idEmpleado))
      .eq("anio", anioActual)
      .maybeSingle();

    if (error) {
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

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarSolicitud(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!empleadoId) {
      alert("Debe seleccionar un empleado.");
      return;
    }

    if (!tipo) {
      alert("Debe seleccionar el tipo de solicitud.");
      return;
    }

    if (!fechaInicio) {
      alert("Debe indicar la fecha de inicio.");
      return;
    }

    if (!fechaFin) {
      alert("Debe indicar la fecha fin.");
      return;
    }

    const diasCalculados =
      tipo === "Vacaciones"
        ? Number(cantidadDias || 0)
        : calcularDiasLaborables(fechaInicio, fechaFin);

    if (diasCalculados <= 0) {
      alert("La fecha fin no puede ser menor que la fecha de inicio.");
      return;
    }

    const empleado = empleados.find((emp) => String(emp.id) === empleadoId);

    if (!empleado) {
      alert("Empleado no encontrado.");
      return;
    }

    if (tipo === "Vacaciones") {
      if (!empleado.fecha_ingreso) {
        alert("El empleado no tiene fecha de ingreso registrada.");
        return;
      }

      if (
        diasCalculados > Number(saldoDisponible || 0) &&
        Number(saldoDisponible || 0) > 0
      ) {
        const continuar = confirm(
          "Los días solicitados superan el saldo disponible. ¿Desea continuar de todos modos?"
        );

        if (!continuar) return;
      }
    }

    const registro = {
      condominio_id: Number(condominioId),
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

    if (editandoId) {
      const { error } = await supabase
        .from("rh_vacaciones_permisos")
        .update(registro)
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      setGuardando(false);

      if (error) {
        alert("Error modificando solicitud: " + error.message);
        return;
      }

      alert("Solicitud modificada correctamente.");
      limpiarFormulario();
      cargarSolicitudes(condominioId);
      return;
    }

    const { error } = await supabase
      .from("rh_vacaciones_permisos")
      .insert([registro]);

    setGuardando(false);

    if (error) {
      alert("Error guardando solicitud: " + error.message);
      return;
    }

    alert("Solicitud registrada correctamente.");
    limpiarFormulario();
    cargarSolicitudes(condominioId);
  }

  function moneda(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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
    totalDescuentos: number
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
          no_factura: `VAC-${solicitud.id}-${String(nominaId).padStart(6, "0")}`,
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
    solicitud: VacacionPermiso
  ) {
    if (!configNomina) {
      throw new Error("No hay configuración de nómina activa.");
    }

    if (!tipoNominaVacaciones) {
      throw new Error("No existe tipo de nómina VAC activo para este condominio.");
    }

    if (solicitud.nomina_id || solicitud.procesado_nomina) {
      return;
    }

    const empleado = empleados.find(
      (emp) => Number(emp.id) === Number(solicitud.empleado_id)
    );

    if (!empleado) {
      throw new Error("Empleado no encontrado para generar nómina de vacaciones.");
    }

    const periodo = (solicitud.fecha_inicio || new Date().toISOString()).slice(0, 7);
    const pagoVacaciones = calcularPagoVacacionesMonto(
      empleado,
      Number(solicitud.cantidad_dias || 0)
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
      totalDescuentos
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
    nuevoEstado: string
  ) {
    const esPagoIndependiente =
      solicitud.tipo === "Vacaciones" &&
      solicitud.forma_pago === "Pago Independiente" &&
      nuevoEstado === "Aprobado";

    const confirmar = confirm(
      esPagoIndependiente
        ? "¿Desea aprobar estas vacaciones y generar la nómina VAC con su solicitud de pago?"
        : `¿Desea cambiar esta solicitud a "${nuevoEstado}"?`
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
      alert("Error actualizando estado: " + error.message);
      return;
    }

    if (esPagoIndependiente) {
      try {
        await generarNominaVacacionesIndependiente({
          ...solicitud,
          estado: "Aprobado",
        });
      } catch (error: any) {
        alert(
          "Las vacaciones fueron aprobadas, pero ocurrió un error generando la nómina/solicitud de pago: " +
            error.message
        );
        cargarSolicitudes(condominioId);
        return;
      }
    }

    alert(
      esPagoIndependiente
        ? "Vacaciones aprobadas, nómina VAC y solicitud de pago generadas correctamente."
        : "Estado actualizado correctamente."
    );
    cargarSolicitudes(condominioId);
  }

  async function eliminarSolicitud(solicitud: VacacionPermiso) {
    const confirmar = confirm(
      `¿Seguro que desea eliminar la solicitud de ${solicitud.nombre_empleado}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("rh_vacaciones_permisos")
      .delete()
      .eq("id", solicitud.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error eliminando solicitud: " + error.message);
      return;
    }

    alert("Solicitud eliminada correctamente.");
    cargarSolicitudes(condominioId);
  }

  const solicitudesFiltradas = solicitudes.filter((s) => {
    const cumpleEstado = filtroEstado === "Todos" || s.estado === filtroEstado;
    const cumpleTipo = filtroTipo === "Todos" || s.tipo === filtroTipo;

    return cumpleEstado && cumpleTipo;
  });

  const pendientes = solicitudes.filter((s) => s.estado === "Pendiente").length;
  const aprobadas = solicitudes.filter((s) => s.estado === "Aprobado").length;
  const rechazadas = solicitudes.filter((s) => s.estado === "Rechazado").length;

  const diasAprobados = solicitudes
    .filter((s) => s.estado === "Aprobado")
    .reduce((sum, s) => sum + Number(s.cantidad_dias || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">
          Vacaciones / Permisos
        </h1>

        <p className="text-slate-500 mt-2">
          Control de vacaciones, permisos, licencias y ausencias justificadas del
          personal.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>

        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Solicitudes</p>
          <h2 className="text-3xl font-black">{solicitudes.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Pendientes</p>
          <h2 className="text-3xl font-black text-yellow-700">
            {pendientes}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Aprobadas</p>
          <h2 className="text-3xl font-black text-green-700">{aprobadas}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Rechazadas</p>
          <h2 className="text-3xl font-black text-red-700">{rechazadas}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Días aprobados</p>
          <h2 className="text-3xl font-black text-blue-700">
            {diasAprobados}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">
          {editandoId ? "Modificar solicitud" : "Registrar solicitud"}
        </h2>

        <form
          onSubmit={guardarSolicitud}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">
              Empleado *
            </label>

            <select
              value={empleadoId}
              onChange={(e) => manejarEmpleado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="">Seleccione empleado</option>

              {empleados.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.numero_empleado} - {emp.nombre} - {emp.cargo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Tipo de solicitud *
            </label>

            <select
              value={tipo}
              onChange={(e) => manejarTipo(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {tiposSolicitud.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Fecha inicio *
            </label>

            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => manejarFechaInicio(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Fecha fin *
            </label>

            <input
              type="date"
              value={fechaFin}
              onChange={(e) => manejarFechaFin(e.target.value)}
              readOnly={tipo === "Vacaciones"}
              className={`border rounded-xl px-4 py-3 w-full ${
                tipo === "Vacaciones" ? "bg-slate-100 font-bold" : ""
              }`}
            />
          </div>

          {tipo === "Vacaciones" && (
            <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <h3 className="font-black text-blue-900 mb-2">
                Cálculo automático de vacaciones
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-blue-700">Antigüedad</p>
                  <p className="font-black">{antiguedadTexto || "-"}</p>
                </div>

                <div>
                  <p className="text-blue-700">Días correspondientes</p>
                  <p className="font-black">{diasCorrespondientes || 0}</p>
                </div>

                <div>
                  <p className="text-blue-700">Saldo disponible</p>
                  <p className="font-black">{saldoDisponible.toFixed(2)}</p>
                </div>

                <div>
                  <p className="text-blue-700">Regla aplicada</p>
                  <p className="font-black">L-V = 1 / Sábado = 0.5</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-1">
              Cantidad de días
            </label>

            <input
              value={cantidadDias}
              readOnly
              className="border rounded-xl px-4 py-3 w-full bg-slate-100 font-bold"
            />
          </div>

          {tipo === "Vacaciones" && (
            <div>
              <label className="block text-sm font-semibold mb-1">
                Forma de pago
              </label>

              <select
                value={formaPago}
                onChange={(e) => setFormaPago(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="Junto Nómina">Junto Nómina</option>
                <option value="Pago Independiente">Pago Independiente</option>
              </select>

              <p className="text-xs text-slate-500 mt-1">
                Junto Nómina se procesa en la nómina mensual. Pago Independiente se usará para generar nómina tipo vacaciones.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {estadosSolicitud.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">Motivo</label>

            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              rows={3}
              placeholder="Motivo de la solicitud"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Observación administrativa
            </label>

            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              rows={3}
              placeholder="Observaciones internas"
            />
          </div>

          <div className="md:col-span-2 flex flex-col md:flex-row gap-3">
            <button
              type="submit"
              disabled={guardando}
              className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-5 py-3 rounded-xl font-bold"
            >
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
                className="bg-slate-600 hover:bg-slate-700 text-white px-5 py-3 rounded-xl font-bold"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-black">Listado de solicitudes</h2>

            <p className="text-sm text-slate-500">
              Solicitudes registradas para el personal del condominio activo.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Tipo
              </label>

              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="border rounded-xl px-4 py-2 bg-white"
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
              <label className="block text-sm font-semibold mb-1">
                Estado
              </label>

              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="border rounded-xl px-4 py-2 bg-white"
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
        </div>

        {loading ? (
          <div>Cargando solicitudes...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Empleado</th>
                  <th className="p-3 border text-left">Tipo</th>
                  <th className="p-3 border text-left">Fechas</th>
                  <th className="p-3 border text-center">Días</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-left">Motivo</th>
                  <th className="p-3 border text-left">Aprobación</th>
                  <th className="p-3 border text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {solicitudesFiltradas.map((solicitud) => (
                  <tr key={solicitud.id} className="hover:bg-slate-50">
                    <td className="p-3 border">
                      <p className="font-bold">{solicitud.nombre_empleado}</p>
                      <p className="text-xs text-slate-500">
                        {solicitud.numero_empleado} · {solicitud.cargo || "-"}
                      </p>
                    </td>

                    <td className="p-3 border">
                      <p className="font-bold">{solicitud.tipo}</p>
                      {solicitud.tipo === "Vacaciones" && (
                        <p className="text-xs text-slate-500">
                          {solicitud.forma_pago || "Junto Nómina"}
                        </p>
                      )}
                    </td>

                    <td className="p-3 border">
                      <p>Desde: {solicitud.fecha_inicio}</p>
                      <p className="text-xs text-slate-500">
                        Hasta: {solicitud.fecha_fin}
                      </p>
                    </td>

                    <td className="p-3 border text-center">
                      <p className="font-black">{solicitud.cantidad_dias}</p>
                      {solicitud.tipo === "Vacaciones" && (
                        <p className="text-xs text-slate-500">
                          Corr.: {solicitud.dias_correspondientes || "-"} · Saldo:{" "}
                          {Number(solicitud.saldo_disponible || 0).toFixed(2)}
                        </p>
                      )}
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          solicitud.estado === "Aprobado"
                            ? "bg-green-100 text-green-700"
                            : solicitud.estado === "Rechazado"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {solicitud.estado}
                      </span>
                    </td>

                    <td className="p-3 border">
                      <p>{solicitud.motivo || "-"}</p>

                      {solicitud.observacion && (
                        <p className="text-xs text-slate-500 mt-1">
                          Obs.: {solicitud.observacion}
                        </p>
                      )}
                    </td>

                    <td className="p-3 border">
                      {solicitud.nomina_id && (
                        <p className="text-xs text-blue-700 font-bold mb-1">
                          Nómina #{solicitud.nomina_id}
                        </p>
                      )}

                      {solicitud.solicitud_pago_id && (
                        <p className="text-xs text-green-700 font-bold mb-1">
                          Solicitud pago #{solicitud.solicitud_pago_id}
                        </p>
                      )}

                      {solicitud.aprobado_por ? (
                        <>
                          <p className="font-bold">{solicitud.aprobado_por}</p>
                          <p className="text-xs text-slate-500">
                            {solicitud.fecha_aprobacion || "-"}
                          </p>
                        </>
                      ) : (
                        <span className="text-slate-400">Pendiente</span>
                      )}
                    </td>

                    <td className="p-3 border">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          onClick={() => editarSolicitud(solicitud)}
                          className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Editar
                        </button>

                        {solicitud.estado !== "Aprobado" && (
                          <button
                            onClick={() =>
                              actualizarEstado(solicitud, "Aprobado")
                            }
                            className="bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Aprobar
                          </button>
                        )}

                        {solicitud.estado !== "Rechazado" && (
                          <button
                            onClick={() =>
                              actualizarEstado(solicitud, "Rechazado")
                            }
                            className="bg-yellow-700 hover:bg-yellow-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Rechazar
                          </button>
                        )}

                        <button
                          onClick={() => eliminarSolicitud(solicitud)}
                          className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {solicitudesFiltradas.length === 0 && (
                  <tr>
                    <td
                      className="p-6 border text-center text-slate-500"
                      colSpan={8}
                    >
                      No hay solicitudes registradas con este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}