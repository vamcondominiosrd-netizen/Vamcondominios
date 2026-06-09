"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

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

export default function PresupuestoPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [tab, setTab] = useState<"proyectado" | "real" | "comparativo">(
    "proyectado"
  );

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mesReal, setMesReal] = useState(String(new Date().getMonth() + 1));

  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [presupuestoActivo, setPresupuestoActivo] =
    useState<Presupuesto | null>(null);

  const [detalles, setDetalles] = useState<DetallePresupuesto[]>([]);
  const [gastosReales, setGastosReales] = useState<GastoReal[]>([]);

  const [nombrePresupuesto, setNombrePresupuesto] = useState(
    "Presupuesto anual"
  );
  const [cuotaActual, setCuotaActual] = useState("");
  const [porcentajeReserva, setPorcentajeReserva] = useState("0");

  const [categoria, setCategoria] = useState("");
  const [concepto, setConcepto] = useState("");
  const [tipoGasto, setTipoGasto] = useState("FIJO");
  const [montoMensual, setMontoMensual] = useState("");
  const [observacion, setObservacion] = useState("");

  const [cantidadUnidades, setCantidadUnidades] = useState(0);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    cargarInicial(id, anio);
  }, []);

  async function cargarInicial(id: string, anioSeleccionado: number) {
    await cargarCantidadUnidades(id);
    await cargarPresupuestos(id, anioSeleccionado);
    await cargarGastosReales(id, anioSeleccionado);
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
      .order("categoria", { ascending: true });

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
          cuota_actual: Number(cuotaActual || 0),
          cantidad_unidades: cantidadUnidades,
          porcentaje_reserva: Number(porcentajeReserva || 0),
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
        cuota_actual: Number(cuotaActual || 0),
        cantidad_unidades: cantidadUnidades,
        porcentaje_reserva: Number(porcentajeReserva || 0),
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

    if (Number(montoMensual || 0) <= 0) {
      setMensaje("El monto mensual debe ser mayor que cero.");
      return;
    }

    const monto = Number(montoMensual || 0);

    const { error } = await supabase
      .from("presupuesto_condominio_detalle")
      .insert([
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

    const confirmar = confirm("¿Desea borrar este gasto estimado?");

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
    setMensaje("Gasto estimado borrado correctamente.");
  }

  async function aprobarPresupuesto() {
    if (!presupuestoActivo) return;

    const confirmar = confirm(
      "¿Desea aprobar este presupuesto? Luego podrá usar la cuota sugerida como referencia para la cuota de mantenimiento."
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
      (sum, d) => sum + Number(d.monto_mensual_estimado || 0),
      0
    );

    const totalAnual = totalMensual * 12;

    const reservaMensual =
      totalMensual * (Number(porcentajeReserva || 0) / 100);

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

  const gastosRealesFiltrados = useMemo(() => {
    return gastosReales.filter((g) => {
      const fecha = new Date(g.fecha);
      const mes = fecha.getMonth() + 1;

      if (mesReal === "0") return true;

      return mes === Number(mesReal);
    });
  }, [gastosReales, mesReal]);

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

  const calculos = calcularTotales(detalles);

  const reservaAnual = calculos.reservaMensual * 12;
  const totalAnualConReserva = calculos.totalConReserva * 12;

  const cuotaRecomendada =
    calculos.cuotaSugerida > 0
      ? Math.ceil(calculos.cuotaSugerida / 100) * 100
      : 0;

  const totalRealMes = gastosRealesFiltrados.reduce(
    (sum, g) => sum + Number(g.total || 0),
    0
  );

  const totalRealAnual = gastosReales.reduce(
    (sum, g) => sum + Number(g.total || 0),
    0
  );

  const promedioRealMensual = totalRealAnual / 12;

  const cuotaRealSugerida =
    cantidadUnidades > 0 ? promedioRealMensual / cantidadUnidades : 0;

  const diferenciaMensual = totalRealMes - calculos.totalConReserva;

  const diferenciaCuota = calculos.cuotaSugerida - Number(cuotaActual || 0);

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
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

  function tipoPresupuesto(estado: string) {
    if (estado === "APROBADO") return "Actual";
    if (estado === "BORRADOR") return "Borrador";
    return "Otro";
  }

  function claseEstado(estado: string) {
    if (estado === "APROBADO") {
      return "bg-green-100 text-green-700";
    }

    if (estado === "BORRADOR") {
      return "bg-amber-100 text-amber-700";
    }

    return "bg-slate-100 text-slate-700";
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <h1 className="text-3xl font-bold text-slate-800">
          Presupuesto y Cuota de Mantenimiento
        </h1>

        <p className="text-slate-500 mt-1">
          Presupuesto proyectado, gastos reales y cálculo de cuota sugerida.
        </p>

        <p className="text-sm text-blue-700 font-bold mt-2">
          Condominio activo: {condominioNombre || "No seleccionado"}
        </p>
      </div>

      {mensaje && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm">
          {mensaje}
        </div>
      )}

      <div className="bg-white rounded-2xl border shadow-sm p-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Año</label>

            <input
              type="number"
              value={anio}
              onChange={(e) => cambiarAnio(Number(e.target.value))}
              className="border rounded-xl px-4 py-2 w-40"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTab("proyectado")}
              className={`px-4 py-2 rounded-xl font-bold ${
                tab === "proyectado"
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Presupuesto proyectado
            </button>

            <button
              onClick={() => setTab("real")}
              className={`px-4 py-2 rounded-xl font-bold ${
                tab === "real"
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Presupuesto real
            </button>

            <button
              onClick={() => setTab("comparativo")}
              className={`px-4 py-2 rounded-xl font-bold ${
                tab === "comparativo"
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Comparativo
            </button>
          </div>
        </div>
      </div>

      {tab === "proyectado" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-bold">
                  Presupuestos del año {anio}
                </h2>

                <p className="text-sm text-slate-500">
                  Seleccione el presupuesto que desea revisar. El aprobado será
                  el presupuesto actual del condominio.
                </p>
              </div>

              <div className="text-sm bg-slate-100 rounded-xl px-4 py-2">
                Activo:{" "}
                <strong>
                  {presupuestoActivo
                    ? `${presupuestoActivo.nombre} - ${presupuestoActivo.estado}`
                    : "Ninguno"}
                </strong>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-right">Cuota actual</th>
                    <th className="px-4 py-3 text-right">Cuota sugerida</th>
                    <th className="px-4 py-3 text-center">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {presupuestosOrdenados.map((p) => (
                    <tr
                      key={p.id}
                      className={
                        presupuestoActivo?.id === p.id
                          ? "border-t bg-blue-50"
                          : "border-t"
                      }
                    >
                      <td className="px-4 py-3 font-bold">
                        {tipoPresupuesto(p.estado)}
                      </td>

                      <td className="px-4 py-3 font-semibold">{p.nombre}</td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`${claseEstado(
                            p.estado
                          )} px-3 py-1 rounded-full text-xs font-bold`}
                        >
                          {p.estado}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        RD$ {dinero(p.cuota_actual)}
                      </td>

                      <td className="px-4 py-3 text-right font-bold">
                        RD$ {dinero(p.cuota_sugerida)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => seleccionarPresupuesto(p.id)}
                          className={
                            presupuestoActivo?.id === p.id
                              ? "bg-slate-700 text-white px-3 py-1 rounded-lg text-xs font-bold"
                              : "bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-bold"
                          }
                        >
                          {presupuestoActivo?.id === p.id
                            ? "Activo"
                            : "Ver detalle"}
                        </button>
                      </td>
                    </tr>
                  ))}

                  {presupuestosOrdenados.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        No hay presupuestos creados para este año.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">
              Crear / configurar presupuesto proyectado
            </h2>

            <form
              onSubmit={crearPresupuesto}
              className="grid grid-cols-1 md:grid-cols-5 gap-4"
            >
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Nombre
                </label>

                <input
                  value={nombrePresupuesto}
                  onChange={(e) => setNombrePresupuesto(e.target.value)}
                  className="border rounded-xl px-3 py-2 w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Cuota actual
                </label>

                <input
                  type="number"
                  value={cuotaActual}
                  onChange={(e) => setCuotaActual(e.target.value)}
                  className="border rounded-xl px-3 py-2 w-full"
                  placeholder="Ej. 4000"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Reserva %
                </label>

                <input
                  type="number"
                  value={porcentajeReserva}
                  onChange={(e) => setPorcentajeReserva(e.target.value)}
                  className="border rounded-xl px-3 py-2 w-full"
                  placeholder="Ej. 10"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Apartamentos activos
                </label>

                <input
                  value={cantidadUnidades}
                  readOnly
                  className="border rounded-xl px-3 py-2 w-full bg-slate-100"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="bg-blue-700 text-white px-4 py-2 rounded-xl font-bold w-full"
                >
                  Crear
                </button>
              </div>
            </form>

            {presupuestoActivo && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={guardarConfiguracionPresupuesto}
                  className="bg-slate-700 text-white px-4 py-2 rounded-xl font-bold"
                >
                  Guardar configuración
                </button>

                <button
                  onClick={aprobarPresupuesto}
                  className="bg-green-700 text-white px-4 py-2 rounded-xl font-bold"
                >
                  Aprobar presupuesto
                </button>

                <span className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold">
                  Estado: {presupuestoActivo.estado}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">Total mensual</p>
              <h2 className="text-xl font-black">
                RD$ {dinero(calculos.totalMensual)}
              </h2>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">Reserva mensual</p>
              <h2 className="text-xl font-black text-purple-700">
                RD$ {dinero(calculos.reservaMensual)}
              </h2>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">Total con reserva</p>
              <h2 className="text-xl font-black text-blue-700">
                RD$ {dinero(calculos.totalConReserva)}
              </h2>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">Cuota sugerida</p>
              <h2 className="text-xl font-black text-green-700">
                RD$ {dinero(calculos.cuotaSugerida)}
              </h2>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">Diferencia vs actual</p>
              <h2
                className={`text-xl font-black ${
                  diferenciaCuota > 0 ? "text-red-700" : "text-green-700"
                }`}
              >
                RD$ {dinero(diferenciaCuota)}
              </h2>
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Agregar gasto estimado</h2>

            <form
              onSubmit={agregarDetalle}
              className="grid grid-cols-1 md:grid-cols-5 gap-4"
            >
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Categoría
                </label>

                <input
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="border rounded-xl px-3 py-2 w-full"
                  placeholder="Ej. Seguridad"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Concepto
                </label>

                <input
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  className="border rounded-xl px-3 py-2 w-full"
                  placeholder="Ej. Vigilancia mensual"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Tipo
                </label>

                <select
                  value={tipoGasto}
                  onChange={(e) => setTipoGasto(e.target.value)}
                  className="border rounded-xl px-3 py-2 w-full"
                >
                  <option value="FIJO">Fijo</option>
                  <option value="VARIABLE">Variable</option>
                  <option value="EXTRAORDINARIO">Extraordinario</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Monto mensual
                </label>

                <input
                  type="number"
                  value={montoMensual}
                  onChange={(e) => setMontoMensual(e.target.value)}
                  className="border rounded-xl px-3 py-2 w-full"
                  placeholder="0.00"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={!presupuestoActivo}
                  className="bg-blue-700 disabled:bg-slate-400 text-white px-4 py-2 rounded-xl font-bold w-full"
                >
                  Agregar
                </button>
              </div>

              <div className="md:col-span-5">
                <input
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  className="border rounded-xl px-3 py-2 w-full"
                  placeholder="Observación opcional"
                />
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50">
              <h2 className="font-bold text-lg">
                Reporte Detallado del Presupuesto Proyectado
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Detalle mensual y anual de los gastos estimados, reserva y total
                general.
              </p>
            </div>

            <div className="p-5 border-b">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-slate-50 border rounded-xl p-4">
                  <p className="text-slate-500">Condominio</p>
                  <p className="font-bold text-slate-800">
                    {condominioNombre || "No seleccionado"}
                  </p>
                </div>

                <div className="bg-slate-50 border rounded-xl p-4">
                  <p className="text-slate-500">Año</p>
                  <p className="font-bold text-slate-800">{anio}</p>
                </div>

                <div className="bg-slate-50 border rounded-xl p-4">
                  <p className="text-slate-500">Apartamentos activos</p>
                  <p className="font-bold text-blue-700">{cantidadUnidades}</p>
                </div>

                <div className="bg-slate-50 border rounded-xl p-4">
                  <p className="text-slate-500">Reserva aplicada</p>
                  <p className="font-bold text-purple-700">
                    {porcentajeReserva || 0}%
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 border-b">
              <h3 className="font-bold mb-3">Resumen del Presupuesto</h3>

              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left">Concepto</th>
                      <th className="px-4 py-3 text-right">Monto mensual</th>
                      <th className="px-4 py-3 text-right">Monto anual</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr className="border-t">
                      <td className="px-4 py-3 font-semibold">
                        Total gastos estimados
                      </td>
                      <td className="px-4 py-3 text-right">
                        RD$ {dinero(calculos.totalMensual)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        RD$ {dinero(calculos.totalAnual)}
                      </td>
                    </tr>

                    <tr className="border-t bg-purple-50">
                      <td className="px-4 py-3 font-semibold text-purple-800">
                        Reserva / imprevistos {porcentajeReserva || 0}%
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-purple-800">
                        RD$ {dinero(calculos.reservaMensual)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-purple-800">
                        RD$ {dinero(reservaAnual)}
                      </td>
                    </tr>

                    <tr className="border-t bg-blue-50">
                      <td className="px-4 py-3 font-black text-blue-900">
                        TOTAL PRESUPUESTO CON RESERVA
                      </td>
                      <td className="px-4 py-3 text-right font-black text-blue-900">
                        RD$ {dinero(calculos.totalConReserva)}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-blue-900">
                        RD$ {dinero(totalAnualConReserva)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-5">
              <h3 className="font-bold mb-3">Detalle de Gastos Estimados</h3>

              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Categoría</th>
                      <th className="px-4 py-3 text-left">Concepto</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-right">Mensual</th>
                      <th className="px-4 py-3 text-right">Anual</th>
                      <th className="px-4 py-3 text-center">Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {detalles.map((d) => (
                      <tr key={d.id} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold">
                          {d.categoria}
                        </td>

                        <td className="px-4 py-3">{d.concepto}</td>

                        <td className="px-4 py-3">{d.tipo_gasto}</td>

                        <td className="px-4 py-3 text-right">
                          RD$ {dinero(d.monto_mensual_estimado)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          RD$ {dinero(d.monto_anual_estimado)}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => borrarDetalle(d.id)}
                            className="bg-red-700 text-white px-3 py-1 rounded-lg text-xs"
                          >
                            Borrar
                          </button>
                        </td>
                      </tr>
                    ))}

                    {detalles.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          No hay gastos estimados registrados.
                        </td>
                      </tr>
                    )}

                    {detalles.length > 0 && (
                      <>
                        <tr className="border-t bg-slate-100">
                          <td
                            colSpan={3}
                            className="px-4 py-3 text-right font-black"
                          >
                            SUBTOTAL GASTOS
                          </td>

                          <td className="px-4 py-3 text-right font-black">
                            RD$ {dinero(calculos.totalMensual)}
                          </td>

                          <td className="px-4 py-3 text-right font-black">
                            RD$ {dinero(calculos.totalAnual)}
                          </td>

                          <td className="px-4 py-3"></td>
                        </tr>

                        <tr className="border-t bg-purple-50">
                          <td className="px-4 py-3 font-bold text-purple-800">
                            Reserva
                          </td>

                          <td className="px-4 py-3 text-purple-800">
                            Fondo de reserva / imprevistos{" "}
                            {porcentajeReserva || 0}%
                          </td>

                          <td className="px-4 py-3 text-purple-800">
                            RESERVA
                          </td>

                          <td className="px-4 py-3 text-right font-black text-purple-800">
                            RD$ {dinero(calculos.reservaMensual)}
                          </td>

                          <td className="px-4 py-3 text-right font-black text-purple-800">
                            RD$ {dinero(reservaAnual)}
                          </td>

                          <td className="px-4 py-3"></td>
                        </tr>

                        <tr className="border-t bg-blue-50">
                          <td
                            colSpan={3}
                            className="px-4 py-4 text-right font-black text-blue-900"
                          >
                            TOTAL GENERAL
                          </td>

                          <td className="px-4 py-4 text-right font-black text-blue-900">
                            RD$ {dinero(calculos.totalConReserva)}
                          </td>

                          <td className="px-4 py-4 text-right font-black text-blue-900">
                            RD$ {dinero(totalAnualConReserva)}
                          </td>

                          <td className="px-4 py-4"></td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-5 border-t bg-slate-50">
              <h3 className="font-bold mb-3">Cálculo de la Cuota Sugerida</h3>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-sm text-slate-500">
                    Total mensual con reserva
                  </p>
                  <p className="text-xl font-black text-blue-700">
                    RD$ {dinero(calculos.totalConReserva)}
                  </p>
                </div>

                <div className="bg-white border rounded-xl p-4">
                  <p className="text-sm text-slate-500">
                    Apartamentos activos
                  </p>
                  <p className="text-xl font-black">{cantidadUnidades}</p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm text-green-700">Cuota sugerida</p>
                  <p className="text-xl font-black text-green-700">
                    RD$ {dinero(calculos.cuotaSugerida)}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-700">Cuota recomendada</p>
                  <p className="text-xl font-black text-blue-700">
                    RD$ {dinero(cuotaRecomendada)}
                  </p>
                </div>

                <div className="bg-white border rounded-xl p-4">
                  <p className="text-sm text-slate-500">Cuota actual</p>
                  <p className="text-xl font-black">
                    RD$ {dinero(Number(cuotaActual || 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "real" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  Presupuesto real / ejecutado
                </h2>
                <p className="text-sm text-slate-500">
                  Calculado en base a los gastos registrados del condominio.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Mes</label>
                <select
                  value={mesReal}
                  onChange={(e) => setMesReal(e.target.value)}
                  className="border rounded-xl px-4 py-2"
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
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">Gastos reales</p>
              <h2 className="text-2xl font-black">
                {gastosRealesFiltrados.length}
              </h2>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">
                Total real {nombreMes(mesReal)}
              </p>
              <h2 className="text-2xl font-black text-red-700">
                RD$ {dinero(totalRealMes)}
              </h2>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">Total real anual</p>
              <h2 className="text-2xl font-black text-blue-700">
                RD$ {dinero(totalRealAnual)}
              </h2>
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-bold">Gastos reales registrados</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Concepto</th>
                    <th className="px-4 py-3 text-left">Detalle</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {gastosRealesFiltrados.map((g) => (
                    <tr key={g.id} className="border-t">
                      <td className="px-4 py-3">{g.fecha}</td>
                      <td className="px-4 py-3 font-semibold">
                        {g.concepto}
                      </td>
                      <td className="px-4 py-3">{g.detalle_gasto || "-"}</td>
                      <td className="px-4 py-3">{g.estado}</td>
                      <td className="px-4 py-3 text-right font-bold">
                        RD$ {dinero(g.total)}
                      </td>
                    </tr>
                  ))}

                  {gastosRealesFiltrados.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        No hay gastos reales registrados para este período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "comparativo" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">Proyectado mensual</p>
              <h2 className="text-2xl font-black">
                RD$ {dinero(calculos.totalConReserva)}
              </h2>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">Real mensual</p>
              <h2 className="text-2xl font-black text-red-700">
                RD$ {dinero(totalRealMes)}
              </h2>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">Diferencia mensual</p>
              <h2
                className={`text-2xl font-black ${
                  diferenciaMensual > 0 ? "text-red-700" : "text-green-700"
                }`}
              >
                RD$ {dinero(diferenciaMensual)}
              </h2>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">Apartamentos activos</p>
              <h2 className="text-2xl font-black text-blue-700">
                {cantidadUnidades}
              </h2>
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">
              Evaluación de cuota de mantenimiento
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 border rounded-xl p-5">
                <p className="text-sm text-slate-500">Cuota actual</p>
                <h3 className="text-3xl font-black">
                  RD$ {dinero(Number(cuotaActual || 0))}
                </h3>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <p className="text-sm text-green-700">
                  Cuota sugerida proyectada
                </p>
                <h3 className="text-3xl font-black text-green-700">
                  RD$ {dinero(calculos.cuotaSugerida)}
                </h3>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <p className="text-sm text-blue-700">
                  Cuota sugerida según gasto real
                </p>
                <h3 className="text-3xl font-black text-blue-700">
                  RD$ {dinero(cuotaRealSugerida)}
                </h3>
              </div>
            </div>

            <div className="mt-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
              La cuota proyectada se calcula con los gastos estimados al inicio
              de la administración. La cuota real sugerida se calcula usando el
              promedio mensual de los gastos reales registrados durante el año.
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-sm text-slate-500">Cargando información...</div>
      )}
    </div>
  );
}