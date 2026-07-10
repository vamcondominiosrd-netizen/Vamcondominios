"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calculator,
  CheckCircle2,
  Download,
  FileBarChart,
  Landmark,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
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

type PartidaSugerida = {
  categoria: string;
  concepto: string;
  tipo_gasto: string;
  monto_mensual_estimado: number;
  monto_anual_estimado: number;
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

function claseEstado(estado: string) {
  if (estado === "APROBADO") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (estado === "BORRADOR") {
    return "border-yellow-100 bg-yellow-50 text-yellow-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function PresupuestoAsistentePage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [cantidadUnidades, setCantidadUnidades] = useState(0);

  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [presupuestoActivo, setPresupuestoActivo] =
    useState<Presupuesto | null>(null);

  const [nombrePresupuesto, setNombrePresupuesto] =
    useState("Presupuesto asistido");

  const [cuotaMensual, setCuotaMensual] = useState("");
  const [morosidadPorcentaje, setMorosidadPorcentaje] = useState("0");
  const [administracionPorcentaje, setAdministracionPorcentaje] =
    useState("10");

  const [tieneGasComun, setTieneGasComun] = useState(true);
  const [gasGalonesMensual, setGasGalonesMensual] = useState("");
  const [gasPrecioGalon, setGasPrecioGalon] = useState("");

  const [seguridadMensual, setSeguridadMensual] = useState("");
  const [limpiezaMensual, setLimpiezaMensual] = useState("");
  const [energiaMensual, setEnergiaMensual] = useState("");
  const [aguaMensual, setAguaMensual] = useState("");
  const [basuraMensual, setBasuraMensual] = useState("");
  const [internetCamarasMensual, setInternetCamarasMensual] = useState("");
  const [jardineriaMensual, setJardineriaMensual] = useState("");
  const [mantenimientoMensual, setMantenimientoMensual] = useState("");

  const [totalSalarios, setTotalSalarios] = useState("");
  const [tssPatronalPorcentaje, setTssPatronalPorcentaje] = useState("16");
  const [infotepPorcentaje, setInfotepPorcentaje] = useState("1");
  const [vacacionesDias, setVacacionesDias] = useState("14");
  const [reservaLiquidacionPorcentaje, setReservaLiquidacionPorcentaje] =
    useState("8");

  const [igualaContableMensual, setIgualaContableMensual] = useState("");
  const [fondoReservaPorcentaje, setFondoReservaPorcentaje] = useState("5");
  const [fondoImprevistosPorcentaje, setFondoImprevistosPorcentaje] =
    useState("3");

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

    cargarDatosIniciales(id, anio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarDatosIniciales(id: string, anioSeleccionado: number) {
    await cargarCantidadUnidades(id);
    await cargarPresupuestos(id, anioSeleccionado);
  }

  async function refrescar() {
    if (!condominioId) return;

    await cargarDatosIniciales(condominioId, anio);
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
      setNombrePresupuesto(seleccionado.nombre || "Presupuesto asistido");
      setCuotaMensual(String(seleccionado.cuota_actual || ""));
      setFondoReservaPorcentaje(
        String(seleccionado.porcentaje_reserva || "5"),
      );
    } else {
      setPresupuestoActivo(null);
    }
  }

  async function cambiarAnio(valor: number) {
    setAnio(valor);

    if (!condominioId) return;

    setPresupuestoActivo(null);
    await cargarPresupuestos(condominioId, valor);
  }

  async function seleccionarPresupuesto(idPresupuesto: number) {
    const presupuesto = presupuestos.find((p) => p.id === idPresupuesto);

    if (!presupuesto) return;

    setPresupuestoActivo(presupuesto);
    setNombrePresupuesto(presupuesto.nombre || "Presupuesto asistido");
    setCuotaMensual(String(presupuesto.cuota_actual || ""));
    setFondoReservaPorcentaje(String(presupuesto.porcentaje_reserva || "5"));
  }

  async function crearPresupuesto() {
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
          cuota_actual: numero(cuotaMensual),
          cantidad_unidades: cantidadUnidades,
          porcentaje_reserva: numero(fondoReservaPorcentaje),
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

    setPresupuestoActivo(nuevo);
    setMensaje("Presupuesto creado correctamente.");
    await cargarPresupuestos(condominioId, anio);
  }

  const partidasSugeridas = useMemo(() => {
    const cuota = numero(cuotaMensual);
    const unidades = numero(cantidadUnidades);
    const ingresoMensualBruto = cuota * unidades;

    const ingresoMensualAjustado =
      ingresoMensualBruto -
      ingresoMensualBruto * (numero(morosidadPorcentaje) / 100);

    const administracion =
      ingresoMensualBruto * (numero(administracionPorcentaje) / 100);

    const gasComun = tieneGasComun
      ? numero(gasGalonesMensual) * numero(gasPrecioGalon)
      : 0;

    const salarios = numero(totalSalarios);
    const tssPatronal = salarios * (numero(tssPatronalPorcentaje) / 100);
    const infotep = salarios * (numero(infotepPorcentaje) / 100);

    const salarioDiario = salarios > 0 ? salarios / 23.83 : 0;

    const reservaVacaciones =
      salarios > 0 ? (salarioDiario * numero(vacacionesDias)) / 12 : 0;

    const reservaLiquidacion =
      salarios * (numero(reservaLiquidacionPorcentaje) / 100);

    const fondoReserva =
      ingresoMensualAjustado * (numero(fondoReservaPorcentaje) / 100);

    const fondoImprevistos =
      ingresoMensualAjustado * (numero(fondoImprevistosPorcentaje) / 100);

    const partidas: PartidaSugerida[] = [
      {
        categoria: "Administración",
        concepto: "Administración VAM",
        tipo_gasto: "FIJO",
        monto_mensual_estimado: administracion,
        monto_anual_estimado: administracion * 12,
        observacion: `Calculado al ${administracionPorcentaje}% de la cuota de mantenimiento.`,
      },
      {
        categoria: "Servicios profesionales",
        concepto: "Iguala contable / declaraciones DGII",
        tipo_gasto: "FIJO",
        monto_mensual_estimado: numero(igualaContableMensual),
        monto_anual_estimado: numero(igualaContableMensual) * 12,
        observacion:
          "Servicio contable para registros, reportes financieros y declaraciones fiscales ante DGII.",
      },
      {
        categoria: "Nómina y obligaciones laborales",
        concepto: "Salarios empleados",
        tipo_gasto: "FIJO",
        monto_mensual_estimado: salarios,
        monto_anual_estimado: salarios * 12,
        observacion: "Total mensual de salarios presupuestados.",
      },
      {
        categoria: "Nómina y obligaciones laborales",
        concepto: "TSS patronal",
        tipo_gasto: "FIJO",
        monto_mensual_estimado: tssPatronal,
        monto_anual_estimado: tssPatronal * 12,
        observacion: `Estimado al ${tssPatronalPorcentaje}% del total de salarios.`,
      },
      {
        categoria: "Nómina y obligaciones laborales",
        concepto: "INFOTEP",
        tipo_gasto: "FIJO",
        monto_mensual_estimado: infotep,
        monto_anual_estimado: infotep * 12,
        observacion: `Estimado al ${infotepPorcentaje}% del total de salarios.`,
      },
      {
        categoria: "Nómina y obligaciones laborales",
        concepto: "Reserva vacaciones empleados",
        tipo_gasto: "RESERVA",
        monto_mensual_estimado: reservaVacaciones,
        monto_anual_estimado: reservaVacaciones * 12,
        observacion: `Vacaciones según ley: ${vacacionesDias} días. Menos de 5 años: 14 días; más de 5 años: 18 días.`,
      },
      {
        categoria: "Nómina y obligaciones laborales",
        concepto: "Reserva liquidación / prestaciones",
        tipo_gasto: "RESERVA",
        monto_mensual_estimado: reservaLiquidacion,
        monto_anual_estimado: reservaLiquidacion * 12,
        observacion: `Reserva estimada al ${reservaLiquidacionPorcentaje}% del total de salarios.`,
      },
      {
        categoria: "Servicios fijos",
        concepto: "Seguridad",
        tipo_gasto: "FIJO",
        monto_mensual_estimado: numero(seguridadMensual),
        monto_anual_estimado: numero(seguridadMensual) * 12,
        observacion: "Servicio de seguridad o vigilancia.",
      },
      {
        categoria: "Servicios fijos",
        concepto: "Limpieza",
        tipo_gasto: "FIJO",
        monto_mensual_estimado: numero(limpiezaMensual),
        monto_anual_estimado: numero(limpiezaMensual) * 12,
        observacion: "Limpieza, conserjería o mantenimiento de áreas comunes.",
      },
      {
        categoria: "Servicios fijos",
        concepto: "Energía eléctrica áreas comunes",
        tipo_gasto: "VARIABLE",
        monto_mensual_estimado: numero(energiaMensual),
        monto_anual_estimado: numero(energiaMensual) * 12,
        observacion: "Consumo eléctrico de áreas comunes.",
      },
      {
        categoria: "Servicios fijos",
        concepto: "Agua",
        tipo_gasto: "VARIABLE",
        monto_mensual_estimado: numero(aguaMensual),
        monto_anual_estimado: numero(aguaMensual) * 12,
        observacion: "Servicio de agua.",
      },
      {
        categoria: "Servicios fijos",
        concepto: "Recogida de basura",
        tipo_gasto: "FIJO",
        monto_mensual_estimado: numero(basuraMensual),
        monto_anual_estimado: numero(basuraMensual) * 12,
        observacion: "Recogida privada o manejo de desechos sólidos.",
      },
      {
        categoria: "Servicios fijos",
        concepto: "Internet / cámaras",
        tipo_gasto: "FIJO",
        monto_mensual_estimado: numero(internetCamarasMensual),
        monto_anual_estimado: numero(internetCamarasMensual) * 12,
        observacion: "Internet, cámaras, monitoreo o sistemas de seguridad.",
      },
      {
        categoria: "Servicios fijos",
        concepto: "Jardinería",
        tipo_gasto: "FIJO",
        monto_mensual_estimado: numero(jardineriaMensual),
        monto_anual_estimado: numero(jardineriaMensual) * 12,
        observacion: "Jardinería y mantenimiento de áreas verdes.",
      },
      {
        categoria: "Gas común",
        concepto: "Consumo gas común",
        tipo_gasto: "VARIABLE",
        monto_mensual_estimado: gasComun,
        monto_anual_estimado: gasComun * 12,
        observacion: `Estimado: ${gasGalonesMensual || 0} galones x RD$ ${
          gasPrecioGalon || 0
        }.`,
      },
      {
        categoria: "Mantenimiento",
        concepto: "Mantenimiento preventivo y reparaciones",
        tipo_gasto: "VARIABLE",
        monto_mensual_estimado: numero(mantenimientoMensual),
        monto_anual_estimado: numero(mantenimientoMensual) * 12,
        observacion:
          "Mantenimiento de bombas, planta, portones, cámaras, pintura y reparaciones.",
      },
      {
        categoria: "Fondos y reservas",
        concepto: "Fondo de reserva",
        tipo_gasto: "RESERVA",
        monto_mensual_estimado: fondoReserva,
        monto_anual_estimado: fondoReserva * 12,
        observacion: `Calculado al ${fondoReservaPorcentaje}% del ingreso mensual ajustado.`,
      },
      {
        categoria: "Fondos y reservas",
        concepto: "Fondo de imprevistos",
        tipo_gasto: "RESERVA",
        monto_mensual_estimado: fondoImprevistos,
        monto_anual_estimado: fondoImprevistos * 12,
        observacion: `Calculado al ${fondoImprevistosPorcentaje}% del ingreso mensual ajustado.`,
      },
    ];

    return partidas.filter((p) => numero(p.monto_mensual_estimado) > 0);
  }, [
    cuotaMensual,
    cantidadUnidades,
    morosidadPorcentaje,
    administracionPorcentaje,
    tieneGasComun,
    gasGalonesMensual,
    gasPrecioGalon,
    totalSalarios,
    tssPatronalPorcentaje,
    infotepPorcentaje,
    vacacionesDias,
    reservaLiquidacionPorcentaje,
    igualaContableMensual,
    fondoReservaPorcentaje,
    fondoImprevistosPorcentaje,
    seguridadMensual,
    limpiezaMensual,
    energiaMensual,
    aguaMensual,
    basuraMensual,
    internetCamarasMensual,
    jardineriaMensual,
    mantenimientoMensual,
  ]);

  const totalMensualSugerido = partidasSugeridas.reduce(
    (sum, p) => sum + numero(p.monto_mensual_estimado),
    0,
  );

  const totalAnualSugerido = totalMensualSugerido * 12;

  const cuotaSugerida =
    cantidadUnidades > 0 ? totalMensualSugerido / cantidadUnidades : 0;

  const cuotaSugeridaRedondeada =
    cuotaSugerida > 0 ? Math.ceil(cuotaSugerida / 100) * 100 : 0;

  async function guardarPartidasSugeridas() {
    setMensaje("");

    if (!presupuestoActivo) {
      setMensaje("Debe crear o seleccionar un presupuesto antes de guardar.");
      return;
    }

    if (partidasSugeridas.length === 0) {
      setMensaje("No hay partidas sugeridas para guardar.");
      return;
    }

    const confirmar = confirm(
      "¿Desea guardar estas partidas sugeridas en el presupuesto activo?",
    );

    if (!confirmar) return;

    const registros = partidasSugeridas.map((p) => ({
      presupuesto_id: presupuestoActivo.id,
      condominio_id: Number(condominioId),
      categoria: p.categoria,
      concepto: p.concepto,
      tipo_gasto: p.tipo_gasto,
      monto_mensual_estimado: p.monto_mensual_estimado,
      monto_anual_estimado: p.monto_anual_estimado,
      observacion: p.observacion,
      estado: "ACTIVO",
    }));

    const { error } = await supabase
      .from("presupuesto_condominio_detalle")
      .insert(registros);

    if (error) {
      setMensaje("Error guardando partidas sugeridas: " + error.message);
      return;
    }

    const { error: errorPresupuesto } = await supabase
      .from("presupuesto_condominio")
      .update({
        cuota_actual: numero(cuotaMensual),
        cantidad_unidades: cantidadUnidades,
        porcentaje_reserva: numero(fondoReservaPorcentaje),
        total_mensual_estimado: totalMensualSugerido,
        total_anual_estimado: totalAnualSugerido,
        total_reserva_mensual: 0,
        total_mensual_con_reserva: totalMensualSugerido,
        cuota_sugerida: cuotaSugerida,
      })
      .eq("id", presupuestoActivo.id)
      .eq("condominio_id", Number(condominioId));

    if (errorPresupuesto) {
      setMensaje(
        "Las partidas fueron guardadas, pero no se pudo actualizar el resumen: " +
          errorPresupuesto.message,
      );
      return;
    }

    setMensaje("Partidas sugeridas guardadas correctamente.");
    await cargarPresupuestos(condominioId, anio);
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

    const filas = partidasSugeridas.map((p) => [
      p.categoria,
      p.concepto,
      p.tipo_gasto,
      numero(p.monto_mensual_estimado).toFixed(2),
      numero(p.monto_anual_estimado).toFixed(2),
      p.observacion,
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
    a.download = `asistente_presupuesto_${anio}_${
      condominioNombre || "condominio"
    }.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

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
        title="Generador Asistido de Presupuesto"
        subtitle={`Herramienta para generar partidas sugeridas y cuota estimada. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={Wand2}
        actions={
          <ModuleActions
            onRefresh={refrescar}
            extra={
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/presupuesto"
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Volver
                </Link>

                <button
                  type="button"
                  onClick={exportarCSV}
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Exportar
                </button>

                <button
                  type="button"
                  onClick={guardarPartidasSugeridas}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                >
                  <Save className="h-4 w-4" />
                  Guardar partidas
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
        title="Presupuesto activo"
        subtitle="Seleccione o cree el presupuesto donde se guardarán las partidas sugeridas."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : presupuestoActivo ? (
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${claseEstado(
                presupuestoActivo.estado,
              )}`}
            >
              {presupuestoActivo.estado}
            </span>
          ) : (
            <span className="inline-flex rounded-full border bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
              Sin presupuesto
            </span>
          )
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
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

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Presupuesto
            </label>
            <select
              value={presupuestoActivo?.id || ""}
              onChange={(e) => seleccionarPresupuesto(Number(e.target.value))}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Seleccione</option>
              {presupuestos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} - {p.estado}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Nombre nuevo presupuesto
            </label>
            <input
              value={nombrePresupuesto}
              onChange={(e) => setNombrePresupuesto(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={crearPresupuesto}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800"
            >
              <Plus className="h-4 w-4" />
              Crear
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Parámetros principales"
        subtitle="Base del cálculo: unidades, cuota, morosidad, administración, reservas e imprevistos."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <CampoSoloLectura label="Unidades activas" value={cantidadUnidades} />

          <Campo
            label="Cuota mensual"
            value={cuotaMensual}
            onChange={setCuotaMensual}
            placeholder="4500"
          />

          <Campo
            label="Morosidad %"
            value={morosidadPorcentaje}
            onChange={setMorosidadPorcentaje}
            placeholder="0"
          />

          <Campo
            label="Administración %"
            value={administracionPorcentaje}
            onChange={setAdministracionPorcentaje}
            placeholder="10"
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
        </div>
      </SectionCard>

      <SectionCard
        title="Gas común y servicios fijos"
        subtitle="Complete los gastos fijos principales del condominio."
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
            value={gasGalonesMensual}
            onChange={setGasGalonesMensual}
            placeholder="0"
          />

          <Campo
            label="Precio galón"
            value={gasPrecioGalon}
            onChange={setGasPrecioGalon}
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
            label="Internet / cámaras"
            value={internetCamarasMensual}
            onChange={setInternetCamarasMensual}
            placeholder="0"
          />

          <Campo
            label="Jardinería"
            value={jardineriaMensual}
            onChange={setJardineriaMensual}
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
        title="Gasto laboral, vacaciones, liquidación y DGII"
        subtitle="Incluye salario, TSS patronal, INFOTEP, reserva de vacaciones, liquidación e iguala contable."
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
              value={vacacionesDias}
              onChange={(e) => setVacacionesDias(e.target.value)}
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
            value={igualaContableMensual}
            onChange={setIgualaContableMensual}
            placeholder="0"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Resumen sugerido"
        subtitle="Resultado automático generado por el asistente."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <InfoCompacta
            label="Total mensual"
            value={`RD$ ${dinero(totalMensualSugerido)}`}
          />
          <InfoCompacta
            label="Total anual"
            value={`RD$ ${dinero(totalAnualSugerido)}`}
          />
          <InfoCompacta
            label="Cuota sugerida"
            value={`RD$ ${dinero(cuotaSugerida)}`}
          />
          <InfoCompacta
            label="Cuota redondeada"
            value={`RD$ ${dinero(cuotaSugeridaRedondeada)}`}
          />
          <InfoCompacta
            label="Partidas"
            value={`${partidasSugeridas.length}`}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Partidas sugeridas"
        subtitle="Estas partidas pueden guardarse en el presupuesto activo y luego modificarse manualmente."
        action={
          <button
            type="button"
            onClick={guardarPartidasSugeridas}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4" />
            Guardar en presupuesto
          </button>
        }
      >
        {partidasSugeridas.length === 0 ? (
          <EmptyState
            title="Sin partidas sugeridas"
            description="Complete los parámetros para generar partidas."
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
                    RD$ {dinero(p.monto_anual_estimado)}
                  </td>

                  <td className="min-w-72 px-4 py-3 text-sm text-slate-500">
                    {p.observacion}
                  </td>
                </tr>
              ))}

              <tr className="bg-slate-100 font-black">
                <td className="px-4 py-3" colSpan={3}>
                  Totales
                </td>

                <td className="px-4 py-3 text-right">
                  RD$ {dinero(totalMensualSugerido)}
                </td>

                <td className="px-4 py-3 text-right">
                  RD$ {dinero(totalAnualSugerido)}
                </td>

                <td className="px-4 py-3"></td>
              </tr>
            </tbody>
          </DataTable>
        )}
      </SectionCard>
    </PageContainer>
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

function CampoSoloLectura({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-slate-700">
        {label}
      </label>

      <input
        value={value}
        readOnly
        className="w-full rounded-xl border bg-slate-100 px-4 py-3 text-sm"
      />
    </div>
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