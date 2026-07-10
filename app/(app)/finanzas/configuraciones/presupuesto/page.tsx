"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  BarChart3,
  Calculator,
  CheckCircle2,
  Download,
  FileBarChart,
  FileText,
  Filter,
  Landmark,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Wand2,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type TabPresupuesto = "proyectado" | "asistente" | "real" | "comparativo";

type Presupuesto = {
  id: number;
  condominio_id: number;
  anio: number;
  nombre: string;
  cuota_actual: number;
  cantidad_unidades: number;
  porcentaje_reserva: number;
  total_mensual_estimado: number;
  total_anual_estimado: number;
  total_reserva_mensual: number;
  total_mensual_con_reserva: number;
  cuota_sugerida: number;
  estado: string;
  created_at: string;
};

type DetallePresupuesto = {
  id: number;
  presupuesto_id: number;
  condominio_id: number;
  categoria: string;
  concepto: string;
  tipo_gasto: string;
  monto_mensual_estimado: number;
  monto_anual_estimado: number;
  observacion: string | null;
  estado: string;
};

type GastoReal = {
  id: number;
  fecha: string;
  concepto: string;
  detalle_gasto: string | null;
  total: number;
  estado: string;
};

type PartidaSugerida = {
  categoria: string;
  concepto: string;
  tipo_gasto: string;
  monto_mensual_estimado: number;
  observacion: string;
};

function numero(valor: string | number | null | undefined) {
  return Number(valor || 0);
}

function dinero(valor: string | number | null | undefined) {
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

function claseEstado(estado: string) {
  if (estado === "APROBADO") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (estado === "BORRADOR") {
    return "border-yellow-100 bg-yellow-50 text-yellow-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function nombreMes(valor: string) {
  const meses = [
    "Todos",
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  return meses[Number(valor)] || "Todos";
}

export default function PresupuestoPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [tab, setTab] = useState<TabPresupuesto>("proyectado");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mesReal, setMesReal] = useState(String(new Date().getMonth() + 1));

  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [presupuestoActivo, setPresupuestoActivo] =
    useState<Presupuesto | null>(null);

  const [detalles, setDetalles] = useState<DetallePresupuesto[]>([]);
  const [gastosReales, setGastosReales] = useState<GastoReal[]>([]);
  const [cantidadUnidades, setCantidadUnidades] = useState(0);

  const [nombrePresupuesto, setNombrePresupuesto] =
    useState("Presupuesto anual");
  const [cuotaActual, setCuotaActual] = useState("");
  const [porcentajeReserva, setPorcentajeReserva] = useState("5");

  const [categoria, setCategoria] = useState("");
  const [concepto, setConcepto] = useState("");
  const [tipoGasto, setTipoGasto] = useState("FIJO");
  const [montoMensual, setMontoMensual] = useState("");
  const [observacion, setObservacion] = useState("");

  const [buscarDetalle, setBuscarDetalle] = useState("");

  const [asistenteCuota, setAsistenteCuota] = useState("");
  const [asistenteAdminPorcentaje, setAsistenteAdminPorcentaje] =
    useState("10");
  const [asistenteMorosidad, setAsistenteMorosidad] = useState("0");

  const [tieneGasComun, setTieneGasComun] = useState(true);
  const [gasGalones, setGasGalones] = useState("");
  const [gasPrecio, setGasPrecio] = useState("");

  const [totalSalarios, setTotalSalarios] = useState("");
  const [tssPatronalPorcentaje, setTssPatronalPorcentaje] = useState("16");
  const [infotepPorcentaje, setInfotepPorcentaje] = useState("1");
  const [reservaLiquidacionPorcentaje, setReservaLiquidacionPorcentaje] =
    useState("8");
  const [reservaVacacionesDias, setReservaVacacionesDias] = useState("14");

  const [igualaContable, setIgualaContable] = useState("");
  const [fondoReservaPorcentaje, setFondoReservaPorcentaje] = useState("5");
  const [fondoImprevistosPorcentaje, setFondoImprevistosPorcentaje] =
    useState("3");

  const [seguridadMensual, setSeguridadMensual] = useState("");
  const [limpiezaMensual, setLimpiezaMensual] = useState("");
  const [energiaMensual, setEnergiaMensual] = useState("");
  const [aguaMensual, setAguaMensual] = useState("");
  const [basuraMensual, setBasuraMensual] = useState("");
  const [mantenimientoMensual, setMantenimientoMensual] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    cargarInicial(id, anio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarInicial(id: string, anioSeleccionado: number) {
    await cargarCantidadUnidades(id);
    await cargarPresupuestos(id, anioSeleccionado);
    await cargarGastosReales(id, anioSeleccionado);
  }

  async function refrescar() {
    if (!condominioId) return;

    await cargarInicial(condominioId, anio);
  }

  async function cargarCantidadUnidades(id: string) {
    const { count, error } = await supabase
      .from("unidades")
      .select("id", { count: "exact", head: true })
      .eq("condominio_id", Number(id))
      .eq("activa", true);

    if (error) {
      setMensaje("Error cargando unidades: " + error.message);
      return;
    }

    setCantidadUnidades(count || 0);
  }

  async function cargarPresupuestos(id: string, anioSeleccionado: number) {
    setLoading(true);

    const { data, error } = await supabase
      .from("presupuesto_condominio")
      .select("*")
      .eq("condominio_id", Number(id))
      .eq("anio", anioSeleccionado)
      .order("id", { ascending: false });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando presupuestos: " + error.message);
      return;
    }

    const lista = (data as Presupuesto[]) || [];
    setPresupuestos(lista);

    if (lista.length > 0) {
      const aprobado = lista.find((p) => p.estado === "APROBADO");
      const borrador = lista.find((p) => p.estado === "BORRADOR");
      const seleccionado = aprobado || borrador || lista[0];

      setPresupuestoActivo(seleccionado);
      setNombrePresupuesto(seleccionado.nombre);
      setCuotaActual(String(seleccionado.cuota_actual || ""));
      setPorcentajeReserva(String(seleccionado.porcentaje_reserva || "0"));
      setAsistenteCuota(String(seleccionado.cuota_actual || ""));

      await cargarDetalles(id, seleccionado.id);
    } else {
      setPresupuestoActivo(null);
      setDetalles([]);
    }
  }

  async function cargarDetalles(id: string, presupuestoId: number) {
    const { data, error } = await supabase
      .from("presupuesto_condominio_detalle")
      .select("*")
      .eq("presupuesto_id", presupuestoId)
      .eq("condominio_id", Number(id))
      .order("categoria", { ascending: true })
      .order("concepto", { ascending: true });

    if (error) {
      setMensaje("Error cargando detalle del presupuesto: " + error.message);
      return;
    }

    setDetalles((data as DetallePresupuesto[]) || []);
  }

  async function cargarGastosReales(id: string, anioSeleccionado: number) {
    const fechaInicio = `${anioSeleccionado}-01-01`;
    const fechaFin = `${anioSeleccionado + 1}-01-01`;

    const { data, error } = await supabase
      .from("gastos")
      .select("id, fecha, concepto, detalle_gasto, total, estado")
      .eq("condominio_id", Number(id))
      .gte("fecha", fechaInicio)
      .lt("fecha", fechaFin)
      .order("fecha", { ascending: false });

    if (error) {
      setMensaje("Error cargando gastos reales: " + error.message);
      return;
    }

    setGastosReales((data as GastoReal[]) || []);
  }

  async function cambiarAnio(valor: number) {
    setAnio(valor);

    if (!condominioId) return;

    setPresupuestoActivo(null);
    setDetalles([]);

    await cargarPresupuestos(condominioId, valor);
    await cargarGastosReales(condominioId, valor);
  }

  async function seleccionarPresupuesto(idPresupuesto: number) {
    if (!condominioId) return;

    const presupuesto = presupuestos.find((p) => p.id === idPresupuesto);

    if (!presupuesto) return;

    setPresupuestoActivo(presupuesto);
    setNombrePresupuesto(presupuesto.nombre);
    setCuotaActual(String(presupuesto.cuota_actual || ""));
    setPorcentajeReserva(String(presupuesto.porcentaje_reserva || "0"));
    setAsistenteCuota(String(presupuesto.cuota_actual || ""));

    await cargarDetalles(condominioId, presupuesto.id);
  }

  async function crearPresupuesto(e: React.FormEvent) {
    e.preventDefault();
    setMensaje("");

    if (!condominioId) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    if (!nombrePresupuesto.trim()) {
      setMensaje("Debe indicar el nombre del presupuesto.");
      return;
    }

    const { data, error } = await supabase
      .from("presupuesto_condominio")
      .insert([
        {
          condominio_id: Number(condominioId),
          anio,
          nombre: nombrePresupuesto.trim(),
          cuota_actual: numero(cuotaActual),
          cantidad_unidades: cantidadUnidades,
          porcentaje_reserva: numero(porcentajeReserva),
          total_mensual_estimado: 0,
          total_anual_estimado: 0,
          total_reserva_mensual: 0,
          total_mensual_con_reserva: 0,
          cuota_sugerida: 0,
          estado: "BORRADOR",
        },
      ])
      .select("*")
      .single();

    if (error) {
      setMensaje("Error creando presupuesto: " + error.message);
      return;
    }

    const nuevo = data as Presupuesto;

    setMensaje("Presupuesto creado correctamente.");
    setPresupuestoActivo(nuevo);
    setDetalles([]);
    setNombrePresupuesto(nuevo.nombre);
    setCuotaActual(String(nuevo.cuota_actual || ""));
    setPorcentajeReserva(String(nuevo.porcentaje_reserva || "0"));
    setAsistenteCuota(String(nuevo.cuota_actual || ""));

    await cargarPresupuestos(condominioId, anio);
  }

  async function guardarConfiguracionPresupuesto() {
    if (!presupuestoActivo) {
      setMensaje("Debe crear o seleccionar un presupuesto.");
      return;
    }

    const calculos = calcularTotales(detalles);

    const { error } = await supabase
      .from("presupuesto_condominio")
      .update({
        nombre: nombrePresupuesto.trim(),
        cuota_actual: numero(cuotaActual),
        cantidad_unidades: cantidadUnidades,
        porcentaje_reserva: numero(porcentajeReserva),
        total_mensual_estimado: calculos.totalMensual,
        total_anual_estimado: calculos.totalAnual,
        total_reserva_mensual: calculos.reservaMensual,
        total_mensual_con_reserva: calculos.totalConReserva,
        cuota_sugerida: calculos.cuotaSugerida,
      })
      .eq("id", presupuestoActivo.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      setMensaje("Error actualizando presupuesto: " + error.message);
      return;
    }

    setMensaje("Configuración del presupuesto actualizada.");
    await cargarPresupuestos(condominioId, anio);
  }

  async function agregarDetalle(e: React.FormEvent) {
    e.preventDefault();
    setMensaje("");

    if (!presupuestoActivo) {
      setMensaje("Debe crear primero el presupuesto.");
      return;
    }

    if (!categoria.trim() || !concepto.trim()) {
      setMensaje("Debe completar categoría y concepto.");
      return;
    }

    if (numero(montoMensual) <= 0) {
      setMensaje("El monto mensual debe ser mayor que cero.");
      return;
    }

    const monto = numero(montoMensual);

    const { error } = await supabase.from("presupuesto_condominio_detalle").insert([
      {
        presupuesto_id: presupuestoActivo.id,
        condominio_id: Number(condominioId),
        categoria: categoria.trim(),
        concepto: concepto.trim(),
        tipo_gasto: tipoGasto,
        monto_mensual_estimado: monto,
        monto_anual_estimado: monto * 12,
        observacion: observacion.trim() || null,
        estado: "ACTIVO",
      },
    ]);

    if (error) {
      setMensaje("Error agregando gasto estimado: " + error.message);
      return;
    }

    setCategoria("");
    setConcepto("");
    setTipoGasto("FIJO");
    setMontoMensual("");
    setObservacion("");

    await cargarDetalles(condominioId, presupuestoActivo.id);
    setMensaje("Gasto estimado agregado correctamente.");
  }

  async function borrarDetalle(id: number) {
    if (!presupuestoActivo) return;

    const confirmar = confirm("¿Desea borrar esta partida del presupuesto?");

    if (!confirmar) return;

    const { error } = await supabase
      .from("presupuesto_condominio_detalle")
      .delete()
      .eq("id", id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      setMensaje("Error borrando detalle: " + error.message);
      return;
    }

    await cargarDetalles(condominioId, presupuestoActivo.id);
    setMensaje("Partida borrada correctamente.");
  }

  async function aprobarPresupuesto() {
    if (!presupuestoActivo) return;

    const confirmar = confirm(
      "¿Desea aprobar este presupuesto? La cuota sugerida quedará como referencia del año.",
    );

    if (!confirmar) return;

    const calculos = calcularTotales(detalles);

    const { error } = await supabase
      .from("presupuesto_condominio")
      .update({
        estado: "APROBADO",
        total_mensual_estimado: calculos.totalMensual,
        total_anual_estimado: calculos.totalAnual,
        total_reserva_mensual: calculos.reservaMensual,
        total_mensual_con_reserva: calculos.totalConReserva,
        cuota_sugerida: calculos.cuotaSugerida,
      })
      .eq("id", presupuestoActivo.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      setMensaje("Error aprobando presupuesto: " + error.message);
      return;
    }

    setMensaje("Presupuesto aprobado correctamente.");
    await cargarPresupuestos(condominioId, anio);
  }

  function calcularTotales(lista: DetallePresupuesto[]) {
    const totalMensual = lista.reduce(
      (sum, d) => sum + numero(d.monto_mensual_estimado),
      0,
    );

    const totalAnual = totalMensual * 12;
    const reservaMensual = totalMensual * (numero(porcentajeReserva) / 100);
    const totalConReserva = totalMensual + reservaMensual;
    const cuotaSugerida =
      cantidadUnidades > 0 ? totalConReserva / cantidadUnidades : 0;

    return {
      totalMensual,
      totalAnual,
      reservaMensual,
      totalConReserva,
      cuotaSugerida,
    };
  }

  function generarPartidasSugeridas(): PartidaSugerida[] {
    const cuota = numero(asistenteCuota || cuotaActual);
    const unidades = numero(cantidadUnidades);
    const ingresoMensualBruto = cuota * unidades;
    const ingresoAjustado =
      ingresoMensualBruto -
      ingresoMensualBruto * (numero(asistenteMorosidad) / 100);

    const administracion =
      ingresoMensualBruto * (numero(asistenteAdminPorcentaje) / 100);

    const gasComun = tieneGasComun ? numero(gasGalones) * numero(gasPrecio) : 0;

    const salarios = numero(totalSalarios);
    const tssPatronal = salarios * (numero(tssPatronalPorcentaje) / 100);
    const infotep = salarios * (numero(infotepPorcentaje) / 100);

    const sueldoDiarioReferencia = salarios > 0 ? salarios / 23.83 : 0;
    const reservaVacaciones =
      salarios > 0
        ? (sueldoDiarioReferencia * numero(reservaVacacionesDias)) / 12
        : 0;

    const reservaLiquidacion =
      salarios * (numero(reservaLiquidacionPorcentaje) / 100);

    const fondoReserva =
      ingresoAjustado * (numero(fondoReservaPorcentaje) / 100);

    const fondoImprevistos =
      ingresoAjustado * (numero(fondoImprevistosPorcentaje) / 100);

    const partidas: PartidaSugerida[] = [
      {
        categoria: "Administración",
        concepto: "Administración VAM",
        tipo_gasto: "FIJO",
        monto_mensual_estimado: administracion,
        observacion: `Calculado al ${asistenteAdminPorcentaje || 10}% de la cuota de mantenimiento.`,
      },
      {
        categoria: "Servicios profesionales",
        concepto: "Iguala contable / declaraciones DGII",
        tipo_gasto: "FIJO",
        monto_mensual_estimado: numero(igualaContable),
        observacion:
          "Servicio contable para registros, reportes financieros y declaraciones ante DGII.",
      },
      {
        categoria: "Nómina y obligaciones laborales",
        concepto: "Salarios empleados",
        tipo_gasto: "FIJO",
        monto_mensual_estimado: salarios,
        observacion: "Total mensual de salarios presupuestados.",
      },
      {
        categoria: "Nómina y obligaciones laborales",
        concepto: "TSS patronal",
        tipo_gasto: "FIJO",
        monto_mensual_estimado: tssPatronal,
        observacion: `Estimado al ${tssPatronalPorcentaje}% del total de salarios.`,
      },
      {
        categoria: "Nómina y obligaciones laborales",
        concepto: "INFOTEP",
        tipo_gasto: "FIJO",
        monto_mensual_estimado: infotep,
        observacion: `Estimado al ${infotepPorcentaje}% del total de salarios.`,
      },
      {
        categoria: "Nómina y obligaciones laborales",
        concepto: "Reserva vacaciones empleados",
        tipo_gasto: "RESERVA",
        monto_mensual_estimado: reservaVacaciones,
        observacion: `Vacaciones según ley: ${reservaVacacionesDias} días. Menos de 5 años: 14 días; más de 5 años: 18 días.`,
      },
      {
        categoria: "Nómina y obligaciones laborales",
        concepto: "Reserva liquidación / prestaciones",
        tipo_gasto: "RESERVA",
        monto_mensual_estimado: reservaLiquidacion,
        observacion: `Reserva mensual estimada al ${reservaLiquidacionPorcentaje}% de salarios.`,
      },
      {
        categoria: "Servicios fijos",
        concepto: "Seguridad",
        tipo_gasto: "FIJO",
        monto_mensual_estimado: numero(seguridadMensual),
        observacion: "Servicio de seguridad / vigilancia.",
      },
      {
        categoria: "Servicios fijos",
        concepto: "Limpieza",
        tipo_gasto: "FIJO",
        monto_mensual_estimado: numero(limpiezaMensual),
        observacion: "Servicio de limpieza y conserjería.",
      },
      {
        categoria: "Servicios fijos",
        concepto: "Energía eléctrica áreas comunes",
        tipo_gasto: "VARIABLE",
        monto_mensual_estimado: numero(energiaMensual),
        observacion: "Energía eléctrica de áreas comunes.",
      },
      {
        categoria: "Servicios fijos",
        concepto: "Agua",
        tipo_gasto: "VARIABLE",
        monto_mensual_estimado: numero(aguaMensual),
        observacion: "Servicio de agua.",
      },
      {
        categoria: "Servicios fijos",
        concepto: "Recogida de basura",
        tipo_gasto: "FIJO",
        monto_mensual_estimado: numero(basuraMensual),
        observacion: "Recogida privada o servicio relacionado a desechos sólidos.",
      },
      {
        categoria: "Gas común",
        concepto: "Consumo gas común",
        tipo_gasto: "VARIABLE",
        monto_mensual_estimado: gasComun,
        observacion: `Estimado: ${gasGalones || 0} galones x RD$ ${gasPrecio || 0}.`,
      },
      {
        categoria: "Mantenimiento",
        concepto: "Mantenimiento preventivo y reparaciones",
        tipo_gasto: "VARIABLE",
        monto_mensual_estimado: numero(mantenimientoMensual),
        observacion:
          "Mantenimiento de bombas, planta, portones, cámaras, pintura y reparaciones.",
      },
      {
        categoria: "Fondos y reservas",
        concepto: "Fondo de reserva",
        tipo_gasto: "RESERVA",
        monto_mensual_estimado: fondoReserva,
        observacion: `Reserva calculada al ${fondoReservaPorcentaje}% del ingreso mensual ajustado.`,
      },
      {
        categoria: "Fondos y reservas",
        concepto: "Fondo de imprevistos",
        tipo_gasto: "RESERVA",
        monto_mensual_estimado: fondoImprevistos,
        observacion: `Imprevistos calculados al ${fondoImprevistosPorcentaje}% del ingreso mensual ajustado.`,
      },
    ];

    return partidas.filter((p) => numero(p.monto_mensual_estimado) > 0);
  }

  async function guardarPartidasSugeridas() {
    if (!presupuestoActivo) {
      setMensaje("Debe crear o seleccionar un presupuesto antes de generar partidas.");
      return;
    }

    const partidas = generarPartidasSugeridas();

    if (partidas.length === 0) {
      setMensaje("No hay partidas sugeridas con monto mayor que cero.");
      return;
    }

    if (detalles.length > 0) {
      const confirmar = confirm(
        "Este presupuesto ya tiene partidas. ¿Desea agregar las partidas sugeridas sin borrar las existentes?",
      );

      if (!confirmar) return;
    }

    const registros = partidas.map((p) => ({
      presupuesto_id: presupuestoActivo.id,
      condominio_id: Number(condominioId),
      categoria: p.categoria,
      concepto: p.concepto,
      tipo_gasto: p.tipo_gasto,
      monto_mensual_estimado: p.monto_mensual_estimado,
      monto_anual_estimado: p.monto_mensual_estimado * 12,
      observacion: p.observacion,
      estado: "ACTIVO",
    }));

    const { error } = await supabase
      .from("presupuesto_condominio_detalle")
      .insert(registros);

    if (error) {
      setMensaje("Error generando partidas sugeridas: " + error.message);
      return;
    }

    await cargarDetalles(condominioId, presupuestoActivo.id);
    setMensaje("Partidas sugeridas agregadas correctamente.");
    setTab("proyectado");
  }

  function exportarCSV() {
    const encabezados = [
      "Categoría",
      "Concepto",
      "Tipo",
      "Monto mensual",
      "Monto anual",
      "Observación",
    ];

    const filas = detallesFiltrados.map((d) => [
      d.categoria,
      d.concepto,
      d.tipo_gasto,
      numero(d.monto_mensual_estimado).toFixed(2),
      numero(d.monto_anual_estimado).toFixed(2),
      d.observacion || "",
    ]);

    const contenido = [encabezados, ...filas]
      .map((fila) =>
        fila.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `presupuesto_${anio}_${condominioNombre || "condominio"}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  const presupuestosOrdenados = useMemo(() => {
    return [...presupuestos].sort((a, b) => {
      const prioridad = (estado: string) => {
        if (estado === "APROBADO") return 1;
        if (estado === "BORRADOR") return 2;
        return 3;
      };

      return prioridad(a.estado) - prioridad(b.estado);
    });
  }, [presupuestos]);

  const detallesFiltrados = useMemo(() => {
    const q = buscarDetalle.toLowerCase().trim();

    return detalles.filter((d) => {
      const texto = `${d.categoria} ${d.concepto} ${d.tipo_gasto} ${
        d.observacion || ""
      }`.toLowerCase();

      return texto.includes(q);
    });
  }, [detalles, buscarDetalle]);

  const gastosRealesFiltrados = useMemo(() => {
    return gastosReales.filter((g) => {
      const f = new Date(g.fecha);
      const mes = f.getMonth() + 1;

      if (mesReal === "0") return true;

      return mes === Number(mesReal);
    });
  }, [gastosReales, mesReal]);

  const calculos = calcularTotales(detalles);
  const calculosFiltrados = calcularTotales(detallesFiltrados);

  const reservaAnual = calculos.reservaMensual * 12;
  const totalAnualConReserva = calculos.totalConReserva * 12;

  const cuotaRecomendada =
    calculos.cuotaSugerida > 0
      ? Math.ceil(calculos.cuotaSugerida / 100) * 100
      : 0;

  const totalRealMes = gastosRealesFiltrados.reduce(
    (sum, g) => sum + numero(g.total),
    0,
  );

  const totalRealAnual = gastosReales.reduce(
    (sum, g) => sum + numero(g.total),
    0,
  );

  const promedioRealMensual = totalRealAnual / 12;
  const cuotaRealSugerida =
    cantidadUnidades > 0 ? promedioRealMensual / cantidadUnidades : 0;

  const diferenciaMensual = totalRealMes - calculos.totalConReserva;
  const diferenciaCuota = calculos.cuotaSugerida - numero(cuotaActual);

  const partidasSugeridas = generarPartidasSugeridas();
  const totalAsistente = partidasSugeridas.reduce(
    (sum, p) => sum + numero(p.monto_mensual_estimado),
    0,
  );

  return (
    <PageContainer>
      <ModuleMenu
  title="Presupuesto"
  subtitle="Presupuesto anual, generador asistido, ejecución real y comparativo financiero."
  tone="blue"
  items={[
    {
      href: "/finanzas/configuraciones/presupuesto",
      label: "Presupuesto anual",
      icon: Calculator,
    },
    {
      href: "/finanzas/configuraciones/presupuesto/asistente",
      label: "Generador asistido",
      icon: Wand2,
    },
    {
      href: "/finanzas/configuraciones/presupuesto/real",
      label: "Presupuesto real",
      icon: ReceiptText,
    },
    {
      href: "/finanzas/configuraciones/presupuesto/comparativo",
      label: "Comparativo",
      icon: BarChart3,
    },
    {
      href: "/finanzas/configuraciones/presupuesto/asamblea",
      label: "Reporte asamblea",
      icon: FileBarChart,
    },
  ]}
/>

      <ModuleToolbar
        title="Presupuesto y Cuota de Mantenimiento"
        subtitle={`Presupuesto proyectado, generador asistido y comparativo con gastos reales. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={Landmark}
        actions={
          <ModuleActions
            onRefresh={refrescar}
            extra={
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={exportarCSV}
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Exportar
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

      <SectionCard
        title="Control del presupuesto"
        subtitle="Seleccione el año, el presupuesto activo y la vista de trabajo."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : (
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
                presupuestoActivo
                  ? claseEstado(presupuestoActivo.estado)
                  : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {presupuestoActivo
                ? `${presupuestoActivo.nombre} · ${presupuestoActivo.estado}`
                : "Sin presupuesto activo"}
            </span>
          )
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Año
            </label>
            <input
              type="number"
              value={anio}
              onChange={(e) => cambiarAnio(Number(e.target.value))}
              className="w-full rounded-xl border px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Presupuesto
            </label>
            <select
              value={presupuestoActivo?.id || ""}
              onChange={(e) => seleccionarPresupuesto(Number(e.target.value))}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Seleccione</option>
              {presupuestosOrdenados.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} - {p.estado}
                </option>
              ))}
            </select>
          </div>

          <InfoCompacta label="Unidades activas" value={`${cantidadUnidades}`} />

          <InfoCompacta
            label="Cuota actual"
            value={`RD$ ${dinero(cuotaActual)}`}
          />

          <InfoCompacta
            label="Cuota sugerida"
            value={`RD$ ${dinero(calculos.cuotaSugerida)}`}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <TabButton
            active={tab === "proyectado"}
            onClick={() => setTab("proyectado")}
            icon={Calculator}
            label="Proyectado"
          />
          <TabButton
            active={tab === "asistente"}
            onClick={() => setTab("asistente")}
            icon={Wand2}
            label="Asistente"
          />
          <TabButton
            active={tab === "real"}
            onClick={() => setTab("real")}
            icon={ReceiptText}
            label="Real"
          />
          <TabButton
            active={tab === "comparativo"}
            onClick={() => setTab("comparativo")}
            icon={BarChart3}
            label="Comparativo"
          />
        </div>
      </SectionCard>

      {tab === "proyectado" && (
        <div className="space-y-5">
          <SectionCard
            title="Crear / configurar presupuesto"
            subtitle="Configure la cuota actual, reserva general y datos principales del presupuesto."
            action={
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={guardarConfiguracionPresupuesto}
                  disabled={!presupuestoActivo}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-400"
                >
                  <Save className="h-4 w-4" />
                  Guardar
                </button>

                <button
                  type="button"
                  onClick={aprobarPresupuesto}
                  disabled={!presupuestoActivo}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-400"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Aprobar
                </button>
              </div>
            }
          >
            <form
              onSubmit={crearPresupuesto}
              className="grid grid-cols-1 gap-4 md:grid-cols-5"
            >
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">
                  Nombre
                </label>
                <input
                  value={nombrePresupuesto}
                  onChange={(e) => setNombrePresupuesto(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">
                  Cuota actual
                </label>
                <input
                  type="number"
                  value={cuotaActual}
                  onChange={(e) => {
                    setCuotaActual(e.target.value);
                    setAsistenteCuota(e.target.value);
                  }}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="Ej. 4500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">
                  Reserva general %
                </label>
                <input
                  type="number"
                  value={porcentajeReserva}
                  onChange={(e) => setPorcentajeReserva(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="Ej. 5"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">
                  Unidades activas
                </label>
                <input
                  value={cantidadUnidades}
                  readOnly
                  className="w-full rounded-xl border bg-slate-100 px-4 py-3 text-sm"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800"
                >
                  <Plus className="h-4 w-4" />
                  Crear nuevo
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            title="Resumen del presupuesto"
            subtitle="Totales calculados en base a las partidas registradas."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <InfoCompacta
                label="Total mensual"
                value={`RD$ ${dinero(calculos.totalMensual)}`}
              />
              <InfoCompacta
                label="Reserva mensual"
                value={`RD$ ${dinero(calculos.reservaMensual)}`}
              />
              <InfoCompacta
                label="Total con reserva"
                value={`RD$ ${dinero(calculos.totalConReserva)}`}
              />
              <InfoCompacta
                label="Cuota sugerida"
                value={`RD$ ${dinero(calculos.cuotaSugerida)}`}
              />
              <InfoCompacta
                label="Diferencia cuota"
                value={`RD$ ${dinero(diferenciaCuota)}`}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Agregar partida manual"
            subtitle="El administrador puede agregar o ajustar partidas manualmente."
          >
            <form
              onSubmit={agregarDetalle}
              className="grid grid-cols-1 gap-4 md:grid-cols-5"
            >
              <input
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="rounded-xl border px-4 py-3 text-sm"
                placeholder="Categoría"
              />

              <input
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="rounded-xl border px-4 py-3 text-sm"
                placeholder="Concepto"
              />

              <select
                value={tipoGasto}
                onChange={(e) => setTipoGasto(e.target.value)}
                className="rounded-xl border bg-white px-4 py-3 text-sm"
              >
                <option value="FIJO">Fijo</option>
                <option value="VARIABLE">Variable</option>
                <option value="RESERVA">Reserva</option>
                <option value="EXTRAORDINARIO">Extraordinario</option>
              </select>

              <input
                type="number"
                value={montoMensual}
                onChange={(e) => setMontoMensual(e.target.value)}
                className="rounded-xl border px-4 py-3 text-sm"
                placeholder="Monto mensual"
              />

              <button
                type="submit"
                disabled={!presupuestoActivo}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white disabled:bg-slate-400"
              >
                <Plus className="h-4 w-4" />
                Agregar
              </button>

              <div className="md:col-span-5">
                <input
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="Observación opcional"
                />
              </div>
            </form>
          </SectionCard>

          <SectionCard
            title="Detalle de partidas presupuestarias"
            subtitle={`${detallesFiltrados.length} partida(s) encontrada(s).`}
            action={
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-3 h-4 w-4 text-slate-400" />
                <input
                  value={buscarDetalle}
                  onChange={(e) => setBuscarDetalle(e.target.value)}
                  className="w-72 rounded-xl border px-10 py-2 text-sm"
                  placeholder="Buscar partida..."
                />
              </div>
            }
          >
            {detallesFiltrados.length === 0 ? (
              <EmptyState
                title="Sin partidas"
                description="No hay partidas presupuestarias registradas."
              />
            ) : (
              <DataTable>
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Categoría</th>
                    <th className="px-4 py-3 text-left">Concepto</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-right">Mensual</th>
                    <th className="px-4 py-3 text-right">Anual</th>
                    <th className="px-4 py-3 text-left">Observación</th>
                    <th className="px-4 py-3 text-center">Acción</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {detallesFiltrados.map((d) => (
                    <tr key={d.id} className="bg-white hover:bg-slate-50">
                      <td className="px-4 py-3 font-black">{d.categoria}</td>
                      <td className="px-4 py-3">{d.concepto}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                          {d.tipo_gasto}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        RD$ {dinero(d.monto_mensual_estimado)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        RD$ {dinero(d.monto_anual_estimado)}
                      </td>
                      <td className="min-w-72 px-4 py-3 text-sm text-slate-500">
                        {d.observacion || "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => borrarDetalle(d.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-700 px-3 py-1 text-xs font-bold text-white"
                        >
                          <Trash2 className="h-3 w-3" />
                          Borrar
                        </button>
                      </td>
                    </tr>
                  ))}

                  <tr className="bg-slate-100 font-black">
                    <td className="px-4 py-3" colSpan={3}>
                      Totales
                    </td>
                    <td className="px-4 py-3 text-right">
                      RD$ {dinero(calculosFiltrados.totalMensual)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      RD$ {dinero(calculosFiltrados.totalAnual)}
                    </td>
                    <td className="px-4 py-3" colSpan={2}></td>
                  </tr>
                </tbody>
              </DataTable>
            )}
          </SectionCard>

          <SectionCard
            title="Cálculo de cuota sugerida"
            subtitle="Resultado final para revisar con la administración o presentar en asamblea."
          >
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Concepto</th>
                  <th className="px-4 py-3 text-right">Mensual</th>
                  <th className="px-4 py-3 text-right">Anual</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3 font-bold">Total gastos estimados</td>
                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(calculos.totalMensual)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(calculos.totalAnual)}
                  </td>
                </tr>

                <tr>
                  <td className="px-4 py-3 font-bold">
                    Reserva general {porcentajeReserva || 0}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(calculos.reservaMensual)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(reservaAnual)}
                  </td>
                </tr>

                <tr className="bg-blue-50 font-black text-blue-900">
                  <td className="px-4 py-3">Total presupuesto con reserva</td>
                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(calculos.totalConReserva)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(totalAnualConReserva)}
                  </td>
                </tr>

                <tr className="bg-emerald-50 font-black text-emerald-900">
                  <td className="px-4 py-3">
                    Cuota sugerida por {cantidadUnidades} unidad(es)
                  </td>
                  <td className="px-4 py-3 text-right">
                    RD$ {dinero(calculos.cuotaSugerida)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    Recomendada: RD$ {dinero(cuotaRecomendada)}
                  </td>
                </tr>
              </tbody>
            </DataTable>
          </SectionCard>
        </div>
      )}

      {tab === "asistente" && (
        <div className="space-y-5">
          <SectionCard
            title="Generador asistido de presupuesto"
            subtitle="Complete los parámetros principales y VAM generará partidas sugeridas editables."
            action={
              <button
                type="button"
                onClick={guardarPartidasSugeridas}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
              >
                <Wand2 className="h-4 w-4" />
                Generar partidas
              </button>
            }
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
              <Campo
                label="Cuota mensual"
                value={asistenteCuota}
                onChange={setAsistenteCuota}
                placeholder="4500"
              />
              <Campo
                label="Admin. %"
                value={asistenteAdminPorcentaje}
                onChange={setAsistenteAdminPorcentaje}
                placeholder="10"
              />
              <Campo
                label="Morosidad estimada %"
                value={asistenteMorosidad}
                onChange={setAsistenteMorosidad}
                placeholder="0"
              />
              <Campo
                label="Fondo reserva %"
                value={fondoReservaPorcentaje}
                onChange={setFondoReservaPorcentaje}
                placeholder="5"
              />
              <Campo
                label="Imprevistos %"
                value={fondoImprevistosPorcentaje}
                onChange={setFondoImprevistosPorcentaje}
                placeholder="3"
              />
              <InfoCompacta
                label="Unidades"
                value={`${cantidadUnidades}`}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Gas común y servicios fijos"
            subtitle="Parámetros para gas común, servicios básicos y mantenimiento."
          >
            <div className="mb-4 flex items-center gap-3">
              <input
                id="gasComun"
                type="checkbox"
                checked={tieneGasComun}
                onChange={(e) => setTieneGasComun(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="gasComun" className="text-sm font-bold">
                El condominio utiliza gas común
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
              <Campo
                label="Galones gas"
                value={gasGalones}
                onChange={setGasGalones}
                placeholder="0"
              />
              <Campo
                label="Precio galón"
                value={gasPrecio}
                onChange={setGasPrecio}
                placeholder="0"
              />
              <Campo
                label="Seguridad"
                value={seguridadMensual}
                onChange={setSeguridadMensual}
                placeholder="0"
              />
              <Campo
                label="Limpieza"
                value={limpiezaMensual}
                onChange={setLimpiezaMensual}
                placeholder="0"
              />
              <Campo
                label="Energía"
                value={energiaMensual}
                onChange={setEnergiaMensual}
                placeholder="0"
              />
              <Campo
                label="Agua"
                value={aguaMensual}
                onChange={setAguaMensual}
                placeholder="0"
              />
              <Campo
                label="Basura"
                value={basuraMensual}
                onChange={setBasuraMensual}
                placeholder="0"
              />
              <Campo
                label="Mantenimiento"
                value={mantenimientoMensual}
                onChange={setMantenimientoMensual}
                placeholder="0"
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Gasto laboral, reservas y DGII"
            subtitle="Incluye salario, TSS patronal, INFOTEP, vacaciones según ley, liquidación e iguala contable."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
              <Campo
                label="Total salarios"
                value={totalSalarios}
                onChange={setTotalSalarios}
                placeholder="0"
              />
              <Campo
                label="TSS patronal %"
                value={tssPatronalPorcentaje}
                onChange={setTssPatronalPorcentaje}
                placeholder="16"
              />
              <Campo
                label="INFOTEP %"
                value={infotepPorcentaje}
                onChange={setInfotepPorcentaje}
                placeholder="1"
              />
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">
                  Vacaciones
                </label>
                <select
                  value={reservaVacacionesDias}
                  onChange={(e) => setReservaVacacionesDias(e.target.value)}
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                >
                  <option value="14">14 días - Menos de 5 años</option>
                  <option value="18">18 días - Más de 5 años</option>
                </select>
              </div>
              <Campo
                label="Liquidación %"
                value={reservaLiquidacionPorcentaje}
                onChange={setReservaLiquidacionPorcentaje}
                placeholder="8"
              />
              <Campo
                label="Iguala contable"
                value={igualaContable}
                onChange={setIgualaContable}
                placeholder="0"
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Partidas sugeridas"
            subtitle={`${partidasSugeridas.length} partida(s) generada(s). Total mensual sugerido: RD$ ${dinero(
              totalAsistente,
            )}.`}
          >
            {partidasSugeridas.length === 0 ? (
              <EmptyState
                title="Sin partidas sugeridas"
                description="Complete los parámetros del asistente para generar partidas."
              />
            ) : (
              <DataTable>
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Categoría</th>
                    <th className="px-4 py-3 text-left">Concepto</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-right">Mensual</th>
                    <th className="px-4 py-3 text-right">Anual</th>
                    <th className="px-4 py-3 text-left">Observación</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {partidasSugeridas.map((p, index) => (
                    <tr key={`${p.categoria}-${p.concepto}-${index}`}>
                      <td className="px-4 py-3 font-black">{p.categoria}</td>
                      <td className="px-4 py-3">{p.concepto}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                          {p.tipo_gasto}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        RD$ {dinero(p.monto_mensual_estimado)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        RD$ {dinero(p.monto_mensual_estimado * 12)}
                      </td>
                      <td className="min-w-72 px-4 py-3 text-sm text-slate-500">
                        {p.observacion}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </SectionCard>
        </div>
      )}

      {tab === "real" && (
        <div className="space-y-5">
          <SectionCard
            title="Presupuesto real / ejecutado"
            subtitle="Calculado en base a los gastos registrados del condominio."
            action={
              <select
                value={mesReal}
                onChange={(e) => setMesReal(e.target.value)}
                className="rounded-xl border bg-white px-4 py-2 text-sm"
              >
                <option value="0">Todos</option>
                <option value="1">Enero</option>
                <option value="2">Febrero</option>
                <option value="3">Marzo</option>
                <option value="4">Abril</option>
                <option value="5">Mayo</option>
                <option value="6">Junio</option>
                <option value="7">Julio</option>
                <option value="8">Agosto</option>
                <option value="9">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
            }
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <InfoCompacta
                label="Registros"
                value={`${gastosRealesFiltrados.length}`}
              />
              <InfoCompacta
                label={`Total real ${nombreMes(mesReal)}`}
                value={`RD$ ${dinero(totalRealMes)}`}
              />
              <InfoCompacta
                label="Total real anual"
                value={`RD$ ${dinero(totalRealAnual)}`}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Gastos reales registrados"
            subtitle={`${gastosRealesFiltrados.length} gasto(s) encontrado(s).`}
          >
            {gastosRealesFiltrados.length === 0 ? (
              <EmptyState
                title="Sin gastos reales"
                description="No hay gastos registrados para este período."
              />
            ) : (
              <DataTable>
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Concepto</th>
                    <th className="px-4 py-3 text-left">Detalle</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {gastosRealesFiltrados.map((g) => (
                    <tr key={g.id} className="bg-white hover:bg-slate-50">
                      <td className="px-4 py-3">{fecha(g.fecha)}</td>
                      <td className="px-4 py-3 font-bold">{g.concepto}</td>
                      <td className="px-4 py-3">{g.detalle_gasto || "-"}</td>
                      <td className="px-4 py-3">{g.estado}</td>
                      <td className="px-4 py-3 text-right font-black">
                        RD$ {dinero(g.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </SectionCard>
        </div>
      )}

      {tab === "comparativo" && (
        <div className="space-y-5">
          <SectionCard
            title="Comparativo presupuesto vs real"
            subtitle="Evalúa la diferencia entre lo proyectado y lo ejecutado."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <InfoCompacta
                label="Proyectado mensual"
                value={`RD$ ${dinero(calculos.totalConReserva)}`}
              />
              <InfoCompacta
                label="Real mensual"
                value={`RD$ ${dinero(totalRealMes)}`}
              />
              <InfoCompacta
                label="Diferencia mensual"
                value={`RD$ ${dinero(diferenciaMensual)}`}
              />
              <InfoCompacta
                label="Unidades activas"
                value={`${cantidadUnidades}`}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Evaluación de cuota de mantenimiento"
            subtitle="Compara cuota actual, cuota proyectada y cuota sugerida según gasto real."
          >
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Concepto</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-left">Observación</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3 font-bold">Cuota actual</td>
                  <td className="px-4 py-3 text-right font-black">
                    RD$ {dinero(cuotaActual)}
                  </td>
                  <td className="px-4 py-3">
                    Cuota registrada en el presupuesto activo.
                  </td>
                </tr>

                <tr>
                  <td className="px-4 py-3 font-bold">
                    Cuota sugerida proyectada
                  </td>
                  <td className="px-4 py-3 text-right font-black text-emerald-700">
                    RD$ {dinero(calculos.cuotaSugerida)}
                  </td>
                  <td className="px-4 py-3">
                    Calculada con las partidas presupuestadas.
                  </td>
                </tr>

                <tr>
                  <td className="px-4 py-3 font-bold">
                    Cuota recomendada redondeada
                  </td>
                  <td className="px-4 py-3 text-right font-black text-blue-700">
                    RD$ {dinero(cuotaRecomendada)}
                  </td>
                  <td className="px-4 py-3">
                    Sugerencia redondeada para mejor manejo administrativo.
                  </td>
                </tr>

                <tr>
                  <td className="px-4 py-3 font-bold">
                    Cuota sugerida según gasto real
                  </td>
                  <td className="px-4 py-3 text-right font-black text-orange-700">
                    RD$ {dinero(cuotaRealSugerida)}
                  </td>
                  <td className="px-4 py-3">
                    Calculada usando el promedio mensual de gastos reales del año.
                  </td>
                </tr>
              </tbody>
            </DataTable>
          </SectionCard>

          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-semibold text-yellow-900">
            La cuota proyectada se calcula con el presupuesto aprobado o en
            borrador. La cuota real sugerida se calcula usando los gastos reales
            registrados durante el año. Esta información puede usarse para
            justificar aumentos o ajustes en asamblea.
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function InfoCompacta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <h3 className="mt-1 text-lg font-black text-slate-900">{value}</h3>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${
        active
          ? "bg-blue-700 text-white shadow-sm"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-slate-700">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border px-4 py-3 text-sm"
        placeholder={placeholder || "0"}
      />
    </div>
  );
}