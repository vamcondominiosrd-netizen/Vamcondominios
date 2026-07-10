"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  HandCoins,
  RefreshCw,
  Save,
  Users,
  WalletCards,
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
  salario: number;
  fecha_ingreso: string;
  estado: string;
};

type BalanceVacaciones = {
  id: number;
  condominio_id?: number | null;
  empleado_id: number;
  anio: number;
  dias_arrastre_anterior: number;
  dias_generados: number;
  dias_tomados: number;
  dias_pagados: number;
  dias_ajuste: number;
  dias_disponibles: number;
  estado?: string | null;
};

type Prestacion = {
  id: number;
  condominio_id?: number | null;
  empleado_id: number;
  numero_empleado: string;
  nombre_empleado: string;
  cargo: string;
  departamento: string;
  fecha_ingreso: string;
  fecha_salida: string;
  salario_mensual: number;
  salario_diario: number;
  tipo_salida: string;
  tiempo_laborado: string;
  meses_laborados: number;
  anios_laborados: number;
  dias_preaviso: number;
  dias_cesantia: number;
  dias_vacaciones: number;
  preaviso: number;
  cesantia: number;
  vacaciones_pendientes: number;
  regalia_proporcional: number;
  otros_pagos: number;
  descuentos: number;
  total_prestaciones: number;
  estado: string;
  observacion: string;
  calculado_por: string;
  fecha_calculo: string;
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

const tiposSalida = [
  "Renuncia",
  "Desahucio",
  "Despido",
  "Fin de contrato",
  "Fallecimiento",
];

const estados = ["Pendiente", "Calculada", "Aprobada", "Pagada", "Anulada"];

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
  if (estado === "Pagada") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (estado === "Aprobada") {
    return "border-blue-100 bg-blue-50 text-blue-700";
  }

  if (estado === "Anulada") {
    return "border-red-100 bg-red-50 text-red-700";
  }

  if (estado === "Pendiente" || estado === "Calculada") {
    return "border-yellow-100 bg-yellow-50 text-yellow-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function PrestacionesLaboralesPage() {
  const [mounted, setMounted] = useState(false);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [balances, setBalances] = useState<BalanceVacaciones[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [empleadoId, setEmpleadoId] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState("");
  const [fechaSalida, setFechaSalida] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [salarioMensual, setSalarioMensual] = useState("");
  const [tipoSalida, setTipoSalida] = useState("Desahucio");
  const [otrosPagos, setOtrosPagos] = useState("0");
  const [descuentos, setDescuentos] = useState("0");
  const [estado, setEstado] = useState("Calculada");
  const [observacion, setObservacion] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

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
      cargarEmpleados(id),
      cargarPrestaciones(id),
      cargarBalances(id),
    ]);
  }

  async function cargarEmpleados(id: string) {
    const condominioIdNumero = Number(id);

    if (!condominioIdNumero) return;

    const { data, error } = await supabase
      .from("empleados")
      .select(
        "id, condominio_id, numero_empleado, nombre, cargo, departamento, salario, fecha_ingreso, estado",
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

  async function cargarBalances(id: string) {
    const condominioIdNumero = Number(id);
    const anio = new Date().getFullYear();

    if (!condominioIdNumero) return;

    const { data, error } = await supabase
      .from("rh_balance_vacaciones")
      .select("*")
      .eq("condominio_id", condominioIdNumero)
      .eq("anio", anio)
      .eq("estado", "Activo");

    if (error) {
      setMensaje("Error cargando balance de vacaciones: " + error.message);
      return;
    }

    setBalances(
      ((data as BalanceVacaciones[]) || []).filter(
        (b) => Number(b.condominio_id) === condominioIdNumero,
      ),
    );
  }

  async function cargarPrestaciones(id: string) {
    const condominioIdNumero = Number(id);

    if (!condominioIdNumero) return;

    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("rh_prestaciones_laborales")
      .select("*")
      .eq("condominio_id", condominioIdNumero)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando prestaciones: " + error.message);
      return;
    }

    setPrestaciones(
      ((data as Prestacion[]) || []).filter(
        (p) => Number(p.condominio_id) === condominioIdNumero,
      ),
    );
  }

  async function refrescar() {
    if (!condominioId || !Number(condominioId)) return;
    await cargarTodo(condominioId);
  }

  function mesesEntre(inicio: string, fin: string) {
    if (!inicio || !fin) return 0;

    const f1 = new Date(`${inicio}T00:00:00`);
    const f2 = new Date(`${fin}T00:00:00`);

    if (f2 < f1) return 0;

    let meses = (f2.getFullYear() - f1.getFullYear()) * 12;
    meses += f2.getMonth() - f1.getMonth();

    if (f2.getDate() < f1.getDate()) {
      meses -= 1;
    }

    return Math.max(meses, 0);
  }

  function obtenerTiempoLaborado() {
    const meses = mesesEntre(fechaIngreso, fechaSalida);
    const anios = Math.floor(meses / 12);
    const mesesRestantes = meses % 12;

    let texto = "";

    if (anios > 0) {
      texto += `${anios} año${anios === 1 ? "" : "s"}`;
    }

    if (mesesRestantes > 0) {
      texto += texto
        ? ` y ${mesesRestantes} mes${mesesRestantes === 1 ? "" : "es"}`
        : `${mesesRestantes} mes${mesesRestantes === 1 ? "" : "es"}`;
    }

    return {
      meses,
      anios,
      texto: texto || "0 meses",
    };
  }

  function calcularDiasPreaviso(meses: number) {
    if (tipoSalida === "Renuncia" || tipoSalida === "Fin de contrato") return 0;
    if (meses < 3) return 0;
    if (meses >= 3 && meses < 6) return 7;
    if (meses >= 6 && meses < 12) return 14;

    return 28;
  }

  function calcularDiasCesantia(meses: number) {
    if (tipoSalida === "Renuncia" || tipoSalida === "Fin de contrato") return 0;

    if (meses < 3) return 0;
    if (meses >= 3 && meses < 6) return 6;
    if (meses >= 6 && meses < 12) return 13;

    const aniosCompletos = Math.floor(meses / 12);
    const mesesFraccion = meses % 12;

    let dias = 0;

    if (aniosCompletos < 5) {
      dias = aniosCompletos * 21;
    } else {
      dias = aniosCompletos * 23;
    }

    if (mesesFraccion >= 3 && mesesFraccion < 6) {
      dias += 6;
    } else if (mesesFraccion >= 6) {
      dias += 13;
    }

    return dias;
  }

  function calcularRegaliaProporcional() {
    if (!fechaSalida) return 0;

    const salida = new Date(`${fechaSalida}T00:00:00`);
    const salario = numero(salarioMensual);

    const mesesCompletos = salida.getMonth();
    const diasDelMes = new Date(
      salida.getFullYear(),
      salida.getMonth() + 1,
      0,
    ).getDate();

    const proporcionMesActual = salida.getDate() / diasDelMes;
    const mesesProporcionales = mesesCompletos + proporcionMesActual;

    return (salario * mesesProporcionales) / 12;
  }

  const empleadosSeguros = useMemo(() => {
    const condominioIdNumero = Number(condominioId);

    if (!condominioIdNumero) return [];

    return empleados.filter(
      (e) => Number(e.condominio_id) === condominioIdNumero,
    );
  }, [empleados, condominioId]);

  const balancesSeguros = useMemo(() => {
    const condominioIdNumero = Number(condominioId);

    if (!condominioIdNumero) return [];

    return balances.filter(
      (b) => Number(b.condominio_id) === condominioIdNumero,
    );
  }, [balances, condominioId]);

  const prestacionesSeguras = useMemo(() => {
    const condominioIdNumero = Number(condominioId);

    if (!condominioIdNumero) return [];

    return prestaciones.filter(
      (p) => Number(p.condominio_id) === condominioIdNumero,
    );
  }, [prestaciones, condominioId]);

  function obtenerDiasVacacionesDisponibles() {
    const balance = balancesSeguros.find(
      (b) => String(b.empleado_id) === empleadoId,
    );

    if (!balance) return 0;

    return Number(balance.dias_disponibles || 0);
  }

  function calcularResultado() {
    const salario = numero(salarioMensual);
    const salarioDiario = salario / 23.83;

    const tiempo = obtenerTiempoLaborado();
    const diasPreaviso = calcularDiasPreaviso(tiempo.meses);
    const diasCesantia = calcularDiasCesantia(tiempo.meses);
    const diasVacaciones = obtenerDiasVacacionesDisponibles();

    const montoPreaviso = diasPreaviso * salarioDiario;
    const montoCesantia = diasCesantia * salarioDiario;
    const montoVacaciones = diasVacaciones * salarioDiario;
    const montoRegalia = calcularRegaliaProporcional();

    const total =
      montoPreaviso +
      montoCesantia +
      montoVacaciones +
      montoRegalia +
      numero(otrosPagos) -
      numero(descuentos);

    return {
      salarioDiario,
      tiempo,
      diasPreaviso,
      diasCesantia,
      diasVacaciones,
      montoPreaviso,
      montoCesantia,
      montoVacaciones,
      montoRegalia,
      total,
    };
  }

  function seleccionarEmpleado(id: string) {
    setEmpleadoId(id);

    const empleado = empleadosSeguros.find((item) => String(item.id) === id);

    if (!empleado) {
      setFechaIngreso("");
      setSalarioMensual("");
      return;
    }

    setFechaIngreso(empleado.fecha_ingreso || "");
    setSalarioMensual(String(empleado.salario || 0));
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setEmpleadoId("");
    setFechaIngreso("");
    setFechaSalida(new Date().toISOString().slice(0, 10));
    setSalarioMensual("");
    setTipoSalida("Desahucio");
    setOtrosPagos("0");
    setDescuentos("0");
    setEstado("Calculada");
    setObservacion("");
  }

  function editarPrestacion(p: Prestacion) {
    setEditandoId(p.id);
    setEmpleadoId(String(p.empleado_id));
    setFechaIngreso(p.fecha_ingreso || "");
    setFechaSalida(p.fecha_salida || "");
    setSalarioMensual(String(p.salario_mensual || 0));
    setTipoSalida(p.tipo_salida || "Desahucio");
    setOtrosPagos(String(p.otros_pagos || 0));
    setDescuentos(String(p.descuentos || 0));
    setEstado(p.estado || "Calculada");
    setObservacion(p.observacion || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarPrestacion(e: React.FormEvent) {
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

    if (!fechaIngreso) {
      setMensaje("El empleado no tiene fecha de ingreso registrada.");
      return;
    }

    if (!fechaSalida) {
      setMensaje("Debe indicar fecha de salida.");
      return;
    }

    if (!salarioMensual || Number(salarioMensual) <= 0) {
      setMensaje("Debe indicar un salario válido.");
      return;
    }

    const empleado = empleadosSeguros.find(
      (item) => String(item.id) === empleadoId,
    );

    if (!empleado) {
      setMensaje("Empleado no encontrado.");
      return;
    }

    const r = calcularResultado();

    const registro = {
      condominio_id: condominioIdNumero,
      condominio: condominioNombre,

      empleado_id: Number(empleadoId),
      numero_empleado: empleado.numero_empleado || "",
      nombre_empleado: empleado.nombre || "",
      cargo: empleado.cargo || "",
      departamento: empleado.departamento || "",

      fecha_ingreso: fechaIngreso,
      fecha_salida: fechaSalida,
      salario_mensual: numero(salarioMensual),
      salario_diario: r.salarioDiario,

      tipo_salida: tipoSalida,
      tiempo_laborado: r.tiempo.texto,
      meses_laborados: r.tiempo.meses,
      anios_laborados: r.tiempo.anios,

      dias_preaviso: r.diasPreaviso,
      dias_cesantia: r.diasCesantia,
      dias_vacaciones: r.diasVacaciones,

      preaviso: r.montoPreaviso,
      cesantia: r.montoCesantia,
      vacaciones_pendientes: r.montoVacaciones,
      regalia_proporcional: r.montoRegalia,
      otros_pagos: numero(otrosPagos),
      descuentos: numero(descuentos),
      total_prestaciones: r.total,

      estado,
      observacion: observacion.trim(),

      calculado_por: usuarioNombre,
      fecha_calculo: new Date().toISOString().slice(0, 10),
    };

    setGuardando(true);
    setMensaje("");

    try {
      let prestacionId = editandoId;

      if (editandoId) {
        const { error } = await supabase
          .from("rh_prestaciones_laborales")
          .update(registro)
          .eq("id", editandoId)
          .eq("condominio_id", condominioIdNumero);

        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await supabase
          .from("rh_prestaciones_laborales")
          .insert([registro])
          .select("id")
          .single();

        if (error) throw new Error(error.message);

        prestacionId = Number(data.id);
      }

      await guardarDetalle(Number(prestacionId), r);

      setGuardando(false);
      setMensaje(
        editandoId
          ? "Prestación modificada correctamente."
          : "Prestación registrada correctamente.",
      );

      limpiarFormulario();
      cargarPrestaciones(condominioId);
    } catch (error: any) {
      setGuardando(false);
      setMensaje("Error guardando prestaciones: " + error.message);
    }
  }

  async function guardarDetalle(
    prestacionId: number,
    r: ReturnType<typeof calcularResultado>,
  ) {
    const condominioIdNumero = Number(condominioId);

    await supabase
      .from("rh_prestaciones_detalle")
      .delete()
      .eq("prestacion_id", prestacionId)
      .eq("condominio_id", condominioIdNumero);

    const detalles = [
      {
        condominio_id: condominioIdNumero,
        prestacion_id: prestacionId,
        concepto: "Preaviso",
        dias: r.diasPreaviso,
        monto: r.montoPreaviso,
        observacion: "Cálculo automático de preaviso.",
      },
      {
        condominio_id: condominioIdNumero,
        prestacion_id: prestacionId,
        concepto: "Cesantía",
        dias: r.diasCesantia,
        monto: r.montoCesantia,
        observacion: "Cálculo automático de cesantía.",
      },
      {
        condominio_id: condominioIdNumero,
        prestacion_id: prestacionId,
        concepto: "Vacaciones pendientes",
        dias: r.diasVacaciones,
        monto: r.montoVacaciones,
        observacion: "Según balance de vacaciones disponible.",
      },
      {
        condominio_id: condominioIdNumero,
        prestacion_id: prestacionId,
        concepto: "Regalía proporcional",
        dias: 0,
        monto: r.montoRegalia,
        observacion:
          "Cálculo proporcional según meses del año hasta la salida.",
      },
      {
        condominio_id: condominioIdNumero,
        prestacion_id: prestacionId,
        concepto: "Otros pagos",
        dias: 0,
        monto: numero(otrosPagos),
        observacion: "Valor manual registrado.",
      },
      {
        condominio_id: condominioIdNumero,
        prestacion_id: prestacionId,
        concepto: "Descuentos",
        dias: 0,
        monto: numero(descuentos),
        observacion: "Valor manual registrado.",
      },
    ];

    const { error } = await supabase
      .from("rh_prestaciones_detalle")
      .insert(detalles);

    if (error) {
      throw new Error(error.message);
    }
  }

  async function cambiarEstado(p: Prestacion, nuevoEstado: string) {
    const confirmar = confirm(
      `¿Desea cambiar esta prestación a "${nuevoEstado}"?`,
    );

    if (!confirmar) return;

    const condominioIdNumero = Number(condominioId);

    const { error } = await supabase
      .from("rh_prestaciones_laborales")
      .update({ estado: nuevoEstado })
      .eq("id", p.id)
      .eq("condominio_id", condominioIdNumero);

    if (error) {
      setMensaje("Error cambiando estado: " + error.message);
      return;
    }

    setMensaje("Estado actualizado correctamente.");
    cargarPrestaciones(condominioId);
  }

  async function eliminarPrestacion(p: Prestacion) {
    const confirmar = confirm(
      `¿Seguro que desea eliminar la prestación de ${p.nombre_empleado}?`,
    );

    if (!confirmar) return;

    const condominioIdNumero = Number(condominioId);

    await supabase
      .from("rh_prestaciones_detalle")
      .delete()
      .eq("prestacion_id", p.id)
      .eq("condominio_id", condominioIdNumero);

    const { error } = await supabase
      .from("rh_prestaciones_laborales")
      .delete()
      .eq("id", p.id)
      .eq("condominio_id", condominioIdNumero);

    if (error) {
      setMensaje("Error eliminando prestación: " + error.message);
      return;
    }

    setMensaje("Prestación eliminada correctamente.");
    cargarPrestaciones(condominioId);
  }

  const prestacionesFiltradas = useMemo(() => {
    return prestacionesSeguras.filter((p) => {
      if (filtroEstado === "Todos") return true;
      return p.estado === filtroEstado;
    });
  }, [prestacionesSeguras, filtroEstado]);

  const resultado = calcularResultado();

  const totalPendiente = prestacionesFiltradas
    .filter((p) => p.estado !== "Pagada" && p.estado !== "Anulada")
    .reduce((sum, p) => sum + Number(p.total_prestaciones || 0), 0);

  const totalPagada = prestacionesFiltradas
    .filter((p) => p.estado === "Pagada")
    .reduce((sum, p) => sum + Number(p.total_prestaciones || 0), 0);

  const totalGeneral = prestacionesFiltradas.reduce(
    (sum, p) => sum + Number(p.total_prestaciones || 0),
    0,
  );

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="rounded-2xl border bg-white p-6 text-sm font-bold text-slate-600">
          Cargando módulo de prestaciones...
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
        title="Prestaciones Laborales"
        subtitle={`Cálculo de preaviso, cesantía, vacaciones pendientes y regalía proporcional. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={HandCoins}
        actions={<ModuleActions onRefresh={refrescar} />}
      />

      {mensaje && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          {mensaje}
        </div>
      )}

      <SectionCard
        title="Resumen de prestaciones"
        subtitle="Indicadores generales del condominio activo."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Actualizando
            </div>
          ) : (
            <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">
              {prestacionesFiltradas.length} registro(s)
            </span>
          )
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <InfoCompacta
            label="Registros"
            value={`${prestacionesFiltradas.length}`}
            detalle="Según filtro"
          />

          <InfoCompacta
            label="Pendiente / aprobado"
            value={`RD$ ${moneda(totalPendiente)}`}
            detalle="Por pagar o revisar"
          />

          <InfoCompacta
            label="Pagado"
            value={`RD$ ${moneda(totalPagada)}`}
            detalle="Prestaciones pagadas"
          />

          <InfoCompacta
            label="Total general"
            value={`RD$ ${moneda(totalGeneral)}`}
            detalle={`Balance vacaciones: ${balancesSeguros.length}`}
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
        title={editandoId ? "Modificar cálculo" : "Nuevo cálculo de prestaciones"}
        subtitle="Complete los datos del empleado y la salida laboral."
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
            <span className="rounded-xl bg-orange-50 px-4 py-2 text-sm font-black text-orange-700">
              Nuevo cálculo
            </span>
          )
        }
      >
        <form
          onSubmit={guardarPrestacion}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Empleado *
            </label>
            <select
              value={empleadoId}
              onChange={(e) => seleccionarEmpleado(e.target.value)}
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

          <CampoSelect
            label="Tipo de salida *"
            value={tipoSalida}
            onChange={setTipoSalida}
            opciones={tiposSalida}
          />

          <CampoFecha
            label="Fecha ingreso"
            value={fechaIngreso}
            onChange={setFechaIngreso}
            bg="bg-slate-50"
          />

          <CampoFecha
            label="Fecha salida *"
            value={fechaSalida}
            onChange={setFechaSalida}
          />

          <CampoNumero
            label="Salario mensual RD$ *"
            value={salarioMensual}
            onChange={setSalarioMensual}
          />

          <CampoSelect
            label="Estado"
            value={estado}
            onChange={setEstado}
            opciones={estados}
          />

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 md:col-span-2">
            <h3 className="mb-3 font-black text-blue-900">
              Resumen automático
            </h3>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <DetalleCalculo
                label="Tiempo laborado"
                value={resultado.tiempo.texto}
              />

              <DetalleCalculo
                label="Meses laborados"
                value={`${resultado.tiempo.meses}`}
              />

              <DetalleCalculo
                label="Salario diario"
                value={`RD$ ${moneda(resultado.salarioDiario)}`}
              />

              <DetalleCalculo
                label="Vacaciones disponibles"
                value={`${resultado.diasVacaciones}`}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Concepto</th>
                  <th className="px-4 py-3 text-right">Días</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                <FilaCalculo
                  concepto="Preaviso"
                  dias={resultado.diasPreaviso}
                  monto={resultado.montoPreaviso}
                />

                <FilaCalculo
                  concepto="Cesantía"
                  dias={resultado.diasCesantia}
                  monto={resultado.montoCesantia}
                />

                <FilaCalculo
                  concepto="Vacaciones pendientes"
                  dias={resultado.diasVacaciones}
                  monto={resultado.montoVacaciones}
                />

                <FilaCalculo
                  concepto="Regalía proporcional"
                  dias="-"
                  monto={resultado.montoRegalia}
                />
              </tbody>
            </DataTable>
          </div>

          <CampoNumero
            label="Otros pagos RD$"
            value={otrosPagos}
            onChange={setOtrosPagos}
          />

          <CampoNumero
            label="Descuentos RD$"
            value={descuentos}
            onChange={setDescuentos}
          />

          <div className="rounded-2xl bg-slate-900 p-5 text-white md:col-span-2">
            <p className="text-sm font-bold text-slate-300">
              Total prestaciones
            </p>
            <h2 className="text-3xl font-black">
              RD$ {moneda(resultado.total)}
            </h2>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Observación
            </label>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              rows={3}
              placeholder="Observaciones del cálculo"
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
                  : "Guardar cálculo"}
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
        title="Histórico de prestaciones"
        subtitle="Cálculos registrados para empleados del condominio activo."
        action={
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
              {estados.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {loading ? (
          <div className="rounded-2xl border bg-slate-50 p-6 text-sm font-bold text-slate-600">
            Cargando prestaciones...
          </div>
        ) : prestacionesFiltradas.length === 0 ? (
          <EmptyState
            title="Sin prestaciones"
            description="No hay prestaciones registradas con este filtro."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Empleado</th>
                <th className="px-4 py-3 text-left">Salida</th>
                <th className="px-4 py-3 text-right">Preaviso</th>
                <th className="px-4 py-3 text-right">Cesantía</th>
                <th className="px-4 py-3 text-right">Vacaciones</th>
                <th className="px-4 py-3 text-right">Regalía</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {prestacionesFiltradas.map((p) => (
                <tr key={p.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-900">
                      {p.nombre_empleado}
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.numero_empleado} · {p.cargo || "-"}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-black">{p.tipo_salida}</p>
                    <p className="text-xs text-slate-500">
                      {fecha(p.fecha_salida)} · {p.tiempo_laborado}
                    </p>
                  </td>

                  <td className="px-4 py-3 text-right">
                    RD$ {moneda(p.preaviso)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    RD$ {moneda(p.cesantia)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    RD$ {moneda(p.vacaciones_pendientes)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    RD$ {moneda(p.regalia_proporcional)}
                  </td>

                  <td className="px-4 py-3 text-right font-black text-blue-700">
                    RD$ {moneda(p.total_prestaciones)}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${estadoClass(
                        p.estado,
                      )}`}
                    >
                      {p.estado}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-center gap-2">
                      <Link
                        href={`/recursos-humanos/prestaciones/recibo/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-purple-700 px-3 py-2 text-xs font-bold text-white hover:bg-purple-800"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Recibo
                      </Link>

                      <button
                        type="button"
                        onClick={() => editarPrestacion(p)}
                        className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        Editar
                      </button>

                      {p.estado !== "Aprobada" && p.estado !== "Pagada" && (
                        <button
                          type="button"
                          onClick={() => cambiarEstado(p, "Aprobada")}
                          className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800"
                        >
                          Aprobar
                        </button>
                      )}

                      {p.estado !== "Pagada" && p.estado !== "Anulada" && (
                        <button
                          type="button"
                          onClick={() => cambiarEstado(p, "Pagada")}
                          className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                        >
                          Pagar
                        </button>
                      )}

                      {p.estado !== "Anulada" && (
                        <button
                          type="button"
                          onClick={() => cambiarEstado(p, "Anulada")}
                          className="rounded-xl bg-yellow-700 px-3 py-2 text-xs font-bold text-white hover:bg-yellow-800"
                        >
                          Anular
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => eliminarPrestacion(p)}
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
}: {
  label: string;
  value: string;
  detalle?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <h3 className="mt-1 text-lg font-black text-slate-900">{value}</h3>

      {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
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

function FilaCalculo({
  concepto,
  dias,
  monto,
}: {
  concepto: string;
  dias: string | number;
  monto: number;
}) {
  return (
    <tr className="bg-white">
      <td className="px-4 py-3 font-black">{concepto}</td>
      <td className="px-4 py-3 text-right">{dias}</td>
      <td className="px-4 py-3 text-right font-black text-blue-700">
        RD$ {moneda(monto)}
      </td>
    </tr>
  );
}

function CampoFecha({
  label,
  value,
  onChange,
  bg = "bg-white",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  bg?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-slate-700">
        {label}
      </label>

      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border px-4 py-3 text-sm ${bg}`}
      />
    </div>
  );
}

function CampoNumero({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-slate-700">
        {label}
      </label>

      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
        placeholder="0.00"
      />
    </div>
  );
}

function CampoSelect({
  label,
  value,
  onChange,
  opciones,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  opciones: string[];
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-slate-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
      >
        {opciones.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}