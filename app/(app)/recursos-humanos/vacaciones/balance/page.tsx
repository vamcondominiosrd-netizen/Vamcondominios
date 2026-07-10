"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Empleado = {
  id: number;
  numero_empleado: string;
  nombre: string;
  cargo: string;
  departamento: string;
  fecha_ingreso: string | null;
  salario: number;
  estado: string;
};

type BalanceVacaciones = {
  id: number;
  condominio_id: number;
  condominio: string;
  empleado_id: number;
  numero_empleado: string;
  nombre_empleado: string;
  cargo: string;
  departamento: string;
  anio: number;
  dias_arrastre_anterior: number;
  dias_generados: number;
  dias_tomados: number;
  dias_pagados: number;
  dias_ajuste: number;
  dias_disponibles: number;
  observacion: string;
  estado: string;
};

type MovimientoVacaciones = {
  id: number;
  condominio_id: number;
  empleado_id: number;
  numero_empleado: string;
  nombre_empleado: string;
  anio: number;
  tipo_movimiento: string;
  fecha_movimiento: string;
  dias: number;
  observacion: string;
  solicitud_id: number | null;
  nomina_id: number | null;
  usuario: string | null;
  tipo_origen: string | null;
  referencia_id: number | null;
  estado: string;
};

type SolicitudVacaciones = {
  id: number;
  empleado_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  cantidad_dias: number;
  estado: string;
  tipo: string;
  motivo: string;
};

type NominaVacaciones = {
  id: number;
  empleado_id: number;
  periodo: string;
  fecha_pago: string | null;
  dias_vacaciones: number;
  pago_vacaciones: number;
  vacaciones_id: number | null;
  estado: string;
};

const anioActual = new Date().getFullYear();

export default function BalanceVacacionesPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("Administración");

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [balances, setBalances] = useState<BalanceVacaciones[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoVacaciones[]>([]);

  const [loading, setLoading] = useState(false);
  const [recalculando, setRecalculando] = useState(false);

  const [filtroAnio, setFiltroAnio] = useState(String(anioActual));
  const [filtroEmpleadoId, setFiltroEmpleadoId] = useState("Todos");
  const [filtroDepartamento, setFiltroDepartamento] = useState("Todos");

  const [empleadoHistoricoId, setEmpleadoHistoricoId] = useState("");

  const [ajusteEmpleadoId, setAjusteEmpleadoId] = useState("");
  const [ajusteDias, setAjusteDias] = useState("");
  const [ajusteObservacion, setAjusteObservacion] = useState("");
  const [guardandoAjuste, setGuardandoAjuste] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const usuario = localStorage.getItem("usuario_nombre") || "Administración";

    setCondominioId(id);
    setCondominioNombre(nombre);
    setUsuarioNombre(usuario);

    if (id) {
      cargarEmpleados(id);
      cargarBalances(id, Number(filtroAnio));
    }
  }, []);

  async function cargarEmpleados(id: string) {
    const { data, error } = await supabase
      .from("empleados")
      .select(
        "id, numero_empleado, nombre, cargo, departamento, fecha_ingreso, salario, estado"
      )
      .eq("condominio_id", Number(id))
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando empleados: " + error.message);
      return;
    }

    setEmpleados((data as Empleado[]) || []);
  }

  async function cargarBalances(id: string, anio: number) {
    setLoading(true);

    const { data, error } = await supabase
      .from("rh_balance_vacaciones")
      .select("*")
      .eq("condominio_id", Number(id))
      .eq("anio", anio)
      .order("nombre_empleado", { ascending: true });

    setLoading(false);

    if (error) {
      alert("Error cargando balance de vacaciones: " + error.message);
      return;
    }

    setBalances((data as BalanceVacaciones[]) || []);
  }

  async function cargarMovimientos(empleadoId: number, anio: number) {
    const { data, error } = await supabase
      .from("rh_movimientos_vacaciones")
      .select("*")
      .eq("condominio_id", Number(condominioId))
      .eq("empleado_id", empleadoId)
      .eq("anio", anio)
      .eq("estado", "Activo")
      .order("fecha_movimiento", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      alert("Error cargando histórico: " + error.message);
      return;
    }

    setMovimientos((data as MovimientoVacaciones[]) || []);
    setEmpleadoHistoricoId(String(empleadoId));
  }

  function numero(valor: any) {
    return Number(valor || 0);
  }

  function formatoNumero(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatoFecha(fecha?: string | null) {
    if (!fecha) return "-";
    return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-DO");
  }

  function calcularMesesTrabajados(fechaIngreso: string | null, fechaCorte: Date) {
    if (!fechaIngreso) return 0;

    const ingreso = new Date(`${fechaIngreso}T00:00:00`);
    let meses =
      (fechaCorte.getFullYear() - ingreso.getFullYear()) * 12 +
      (fechaCorte.getMonth() - ingreso.getMonth());

    if (fechaCorte.getDate() >= ingreso.getDate()) {
      meses += 1;
    }

    return meses < 0 ? 0 : meses;
  }

  function calcularAniosServicio(fechaIngreso: string | null, fechaCorte: Date) {
    if (!fechaIngreso) return 0;

    const ingreso = new Date(`${fechaIngreso}T00:00:00`);
    let anios = fechaCorte.getFullYear() - ingreso.getFullYear();

    const noCumplioEsteAnio =
      fechaCorte.getMonth() < ingreso.getMonth() ||
      (fechaCorte.getMonth() === ingreso.getMonth() &&
        fechaCorte.getDate() < ingreso.getDate());

    if (noCumplioEsteAnio) anios -= 1;

    return anios < 0 ? 0 : anios;
  }

  function calcularDiasGenerados(fechaIngreso: string | null, anio: number) {
    if (!fechaIngreso) return 0;

    const fechaCorte = new Date(`${anio}-12-31T00:00:00`);
    const meses = calcularMesesTrabajados(fechaIngreso, fechaCorte);
    const anios = calcularAniosServicio(fechaIngreso, fechaCorte);

    if (meses <= 5) return 0;
    if (meses === 6) return 6;
    if (meses === 7) return 7;
    if (meses === 8) return 8;
    if (meses === 9) return 9;
    if (meses === 10) return 10;
    if (meses === 11) return 11;
    if (meses === 12 && anios < 1) return 12;

    if (anios >= 5) return 18;
    return 14;
  }

  function textoAntiguedad(fechaIngreso: string | null, anio: number) {
    if (!fechaIngreso) return "Sin fecha";

    const fechaCorte = new Date(`${anio}-12-31T00:00:00`);
    const meses = calcularMesesTrabajados(fechaIngreso, fechaCorte);
    const anios = calcularAniosServicio(fechaIngreso, fechaCorte);

    if (anios <= 0) return `${meses} meses`;
    return `${anios} año${anios === 1 ? "" : "s"}`;
  }

  async function obtenerArrastreAnterior(empleadoId: number, anio: number) {
    const { data, error } = await supabase
      .from("rh_balance_vacaciones")
      .select("dias_disponibles")
      .eq("condominio_id", Number(condominioId))
      .eq("empleado_id", empleadoId)
      .eq("anio", anio - 1)
      .maybeSingle();

    if (error) return 0;
    return Number(data?.dias_disponibles || 0);
  }

  async function obtenerVacacionesTomadas(empleadoId: number, anio: number) {
    const desde = `${anio}-01-01`;
    const hasta = `${anio}-12-31`;

    const { data, error } = await supabase
      .from("rh_vacaciones_permisos")
      .select("id, empleado_id, fecha_inicio, fecha_fin, cantidad_dias, estado, tipo, motivo")
      .eq("condominio_id", Number(condominioId))
      .eq("empleado_id", empleadoId)
      .eq("tipo", "Vacaciones")
      .eq("estado", "Aprobado")
      .gte("fecha_inicio", desde)
      .lte("fecha_inicio", hasta);

    if (error) return [];
    return (data as SolicitudVacaciones[]) || [];
  }

  async function obtenerVacacionesPagadasSinSolicitud(
    empleadoId: number,
    anio: number
  ) {
    const desde = `${anio}-01`;
    const hasta = `${anio}-12`;

    const { data, error } = await supabase
      .from("rh_nomina")
      .select(
        "id, empleado_id, periodo, fecha_pago, dias_vacaciones, pago_vacaciones, vacaciones_id, estado"
      )
      .eq("condominio_id", Number(condominioId))
      .eq("empleado_id", empleadoId)
      .neq("estado", "Anulada")
      .gt("dias_vacaciones", 0)
      .gte("periodo", desde)
      .lte("periodo", hasta);

    if (error) return [];

    return ((data as NominaVacaciones[]) || []).filter(
      (n) => !n.vacaciones_id
    );
  }

  async function obtenerAjustes(empleadoId: number, anio: number) {
    const { data, error } = await supabase
      .from("rh_movimientos_vacaciones")
      .select("dias")
      .eq("condominio_id", Number(condominioId))
      .eq("empleado_id", empleadoId)
      .eq("anio", anio)
      .eq("tipo_origen", "AJUSTE")
      .eq("estado", "Activo");

    if (error) return 0;

    return ((data || []) as { dias: number }[]).reduce(
      (sum, item) => sum + Number(item.dias || 0),
      0
    );
  }

  async function limpiarMovimientosAutomaticos(empleadoId: number, anio: number) {
    await supabase
      .from("rh_movimientos_vacaciones")
      .delete()
      .eq("condominio_id", Number(condominioId))
      .eq("empleado_id", empleadoId)
      .eq("anio", anio)
      .in("tipo_origen", ["ARRASTRE", "GENERACION", "VACACIONES", "NOMINA"]);
  }

  async function crearMovimientoAutomatico(params: {
    empleado: Empleado;
    anio: number;
    fecha: string;
    tipo_movimiento: string;
    dias: number;
    observacion: string;
    tipo_origen: string;
    referencia_id?: number | null;
    solicitud_id?: number | null;
    nomina_id?: number | null;
  }) {
    if (params.dias === 0) return;

    await supabase.from("rh_movimientos_vacaciones").insert([
      {
        condominio_id: Number(condominioId),
        condominio: condominioNombre,
        empleado_id: params.empleado.id,
        numero_empleado: params.empleado.numero_empleado || "",
        nombre_empleado: params.empleado.nombre || "",
        anio: params.anio,
        tipo_movimiento: params.tipo_movimiento,
        fecha_movimiento: params.fecha,
        dias: params.dias,
        observacion: params.observacion,
        tipo_origen: params.tipo_origen,
        referencia_id: params.referencia_id || null,
        solicitud_id: params.solicitud_id || null,
        nomina_id: params.nomina_id || null,
        usuario: usuarioNombre,
        estado: "Activo",
      },
    ]);
  }

  async function recalcularEmpleado(empleado: Empleado, anio: number) {
    const arrastre = await obtenerArrastreAnterior(empleado.id, anio);
    const generados = calcularDiasGenerados(empleado.fecha_ingreso, anio);
    const solicitudes = await obtenerVacacionesTomadas(empleado.id, anio);
    const nominasPagadas = await obtenerVacacionesPagadasSinSolicitud(
      empleado.id,
      anio
    );
    const ajuste = await obtenerAjustes(empleado.id, anio);

    const tomados = solicitudes.reduce(
      (sum, s) => sum + Number(s.cantidad_dias || 0),
      0
    );

    const pagados = nominasPagadas.reduce(
      (sum, n) => sum + Number(n.dias_vacaciones || 0),
      0
    );

    const disponible = arrastre + generados - tomados - pagados + ajuste;

    const registro = {
      condominio_id: Number(condominioId),
      condominio: condominioNombre,
      empleado_id: empleado.id,
      numero_empleado: empleado.numero_empleado || "",
      nombre_empleado: empleado.nombre || "",
      cargo: empleado.cargo || "",
      departamento: empleado.departamento || "",
      anio,
      dias_arrastre_anterior: arrastre,
      dias_generados: generados,
      dias_tomados: tomados,
      dias_pagados: pagados,
      dias_ajuste: ajuste,
      dias_disponibles: disponible,
      observacion: "Balance recalculado automáticamente.",
      estado: "Activo",
    };

    const { error } = await supabase
      .from("rh_balance_vacaciones")
      .upsert([registro], {
        onConflict: "condominio_id,empleado_id,anio",
      });

    if (error) throw new Error(error.message);

    await limpiarMovimientosAutomaticos(empleado.id, anio);

    await crearMovimientoAutomatico({
      empleado,
      anio,
      fecha: `${anio}-01-01`,
      tipo_movimiento: "Arrastre año anterior",
      dias: arrastre,
      observacion: `Balance disponible del año ${anio - 1}`,
      tipo_origen: "ARRASTRE",
    });

    await crearMovimientoAutomatico({
      empleado,
      anio,
      fecha: `${anio}-01-01`,
      tipo_movimiento: "Generación vacaciones",
      dias: generados,
      observacion: "Días generados según antigüedad del empleado.",
      tipo_origen: "GENERACION",
    });

    for (const solicitud of solicitudes) {
      await crearMovimientoAutomatico({
        empleado,
        anio,
        fecha: solicitud.fecha_inicio,
        tipo_movimiento: "Vacaciones tomadas",
        dias: -Number(solicitud.cantidad_dias || 0),
        observacion: solicitud.motivo || "Solicitud de vacaciones aprobada.",
        tipo_origen: "VACACIONES",
        referencia_id: solicitud.id,
        solicitud_id: solicitud.id,
      });
    }

    for (const nomina of nominasPagadas) {
      await crearMovimientoAutomatico({
        empleado,
        anio,
        fecha: nomina.fecha_pago || `${nomina.periodo}-01`,
        tipo_movimiento: "Pago vacaciones sin solicitud",
        dias: -Number(nomina.dias_vacaciones || 0),
        observacion: "Pago registrado desde nómina sin solicitud vinculada.",
        tipo_origen: "NOMINA",
        referencia_id: nomina.id,
        nomina_id: nomina.id,
      });
    }
  }

  async function recalcularTodos() {
    if (!condominioId) return;

    const confirmar = confirm(
      `¿Desea recalcular el balance de vacaciones del año ${filtroAnio}?`
    );

    if (!confirmar) return;

    setRecalculando(true);

    try {
      const empleadosFiltrados = empleados.filter((emp) => {
        if (filtroEmpleadoId !== "Todos" && String(emp.id) !== filtroEmpleadoId) {
          return false;
        }

        if (
          filtroDepartamento !== "Todos" &&
          (emp.departamento || "Sin departamento") !== filtroDepartamento
        ) {
          return false;
        }

        return true;
      });

      for (const emp of empleadosFiltrados) {
        await recalcularEmpleado(emp, Number(filtroAnio));
      }

      alert("Balance recalculado correctamente.");
      await cargarBalances(condominioId, Number(filtroAnio));
    } catch (error: any) {
      alert("Error recalculando balance: " + error.message);
    }

    setRecalculando(false);
  }

  async function guardarAjuste(e: React.FormEvent) {
    e.preventDefault();

    if (!ajusteEmpleadoId) {
      alert("Debe seleccionar un empleado.");
      return;
    }

    if (!ajusteDias || Number(ajusteDias) === 0) {
      alert("Debe indicar una cantidad de días diferente de cero.");
      return;
    }

    if (!ajusteObservacion.trim()) {
      alert("Debe indicar el motivo del ajuste.");
      return;
    }

    const empleado = empleados.find((emp) => String(emp.id) === ajusteEmpleadoId);

    if (!empleado) {
      alert("Empleado no encontrado.");
      return;
    }

    setGuardandoAjuste(true);

    try {
      const { error } = await supabase.from("rh_movimientos_vacaciones").insert([
        {
          condominio_id: Number(condominioId),
          condominio: condominioNombre,
          empleado_id: empleado.id,
          numero_empleado: empleado.numero_empleado || "",
          nombre_empleado: empleado.nombre || "",
          anio: Number(filtroAnio),
          tipo_movimiento: "Ajuste manual",
          fecha_movimiento: new Date().toISOString().slice(0, 10),
          dias: Number(ajusteDias),
          observacion: ajusteObservacion.trim(),
          usuario: usuarioNombre,
          tipo_origen: "AJUSTE",
          referencia_id: null,
          estado: "Activo",
        },
      ]);

      if (error) throw new Error(error.message);

      await recalcularEmpleado(empleado, Number(filtroAnio));
      await cargarBalances(condominioId, Number(filtroAnio));

      if (empleadoHistoricoId === ajusteEmpleadoId) {
        await cargarMovimientos(empleado.id, Number(filtroAnio));
      }

      setAjusteEmpleadoId("");
      setAjusteDias("");
      setAjusteObservacion("");

      alert("Ajuste registrado correctamente.");
    } catch (error: any) {
      alert("Error registrando ajuste: " + error.message);
    }

    setGuardandoAjuste(false);
  }

  function buscar() {
    cargarBalances(condominioId, Number(filtroAnio));
    setMovimientos([]);
    setEmpleadoHistoricoId("");
  }

  const departamentos = Array.from(
    new Set(empleados.map((emp) => emp.departamento || "Sin departamento"))
  ).sort();

  const balancesFiltrados = balances.filter((b) => {
    if (filtroEmpleadoId !== "Todos" && String(b.empleado_id) !== filtroEmpleadoId) {
      return false;
    }

    if (
      filtroDepartamento !== "Todos" &&
      (b.departamento || "Sin departamento") !== filtroDepartamento
    ) {
      return false;
    }

    return true;
  });

  const totalDisponibles = balancesFiltrados.reduce(
    (sum, b) => sum + Number(b.dias_disponibles || 0),
    0
  );

  const totalTomados = balancesFiltrados.reduce(
    (sum, b) => sum + Number(b.dias_tomados || 0),
    0
  );

  const conDisponible = balancesFiltrados.filter(
    (b) => Number(b.dias_disponibles || 0) > 0
  ).length;

  const empleadoHistorico = empleados.find(
    (emp) => String(emp.id) === empleadoHistoricoId
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">
          Balance de Vacaciones
        </h1>

        <p className="text-slate-500 mt-2">
          Control anual, arrastre, histórico y disponibilidad de vacaciones por
          empleado.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>
        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Empleados en balance</p>
          <h2 className="text-3xl font-black">{balancesFiltrados.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Con días disponibles</p>
          <h2 className="text-3xl font-black text-green-700">
            {conDisponible}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Días disponibles</p>
          <h2 className="text-3xl font-black text-blue-700">
            {formatoNumero(totalDisponibles)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Días tomados</p>
          <h2 className="text-3xl font-black text-purple-700">
            {formatoNumero(totalTomados)}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">Filtros y recalculo</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold mb-1">Año</label>
            <input
              type="number"
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Empleado</label>
            <select
              value={filtroEmpleadoId}
              onChange={(e) => setFiltroEmpleadoId(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="Todos">Todos</option>
              {empleados.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.numero_empleado} - {emp.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Departamento
            </label>
            <select
              value={filtroDepartamento}
              onChange={(e) => setFiltroDepartamento(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="Todos">Todos</option>
              {departamentos.map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={buscar}
              className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold"
            >
              Buscar
            </button>

            <button
              onClick={recalcularTodos}
              disabled={recalculando}
              className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-5 py-3 rounded-xl font-bold"
            >
              {recalculando ? "Recalculando..." : "Recalcular"}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-4">
          El recálculo toma el arrastre del año anterior, genera días según
          antigüedad, descuenta vacaciones aprobadas y pagos sin solicitud, y
          suma ajustes manuales auditados.
        </p>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">Ajuste manual auditado</h2>

        <form
          onSubmit={guardarAjuste}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">Empleado</label>
            <select
              value={ajusteEmpleadoId}
              onChange={(e) => setAjusteEmpleadoId(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="">Seleccione empleado</option>
              {empleados.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.numero_empleado} - {emp.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Días ajuste
            </label>
            <input
              type="number"
              step="0.01"
              value={ajusteDias}
              onChange={(e) => setAjusteDias(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Ej: 2 o -1"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Motivo</label>
            <input
              value={ajusteObservacion}
              onChange={(e) => setAjusteObservacion(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Motivo del ajuste"
            />
          </div>

          <button
            type="submit"
            disabled={guardandoAjuste}
            className="bg-purple-700 hover:bg-purple-800 disabled:bg-slate-400 text-white px-5 py-3 rounded-xl font-bold"
          >
            {guardandoAjuste ? "Guardando..." : "Guardar ajuste"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">Balance general</h2>

        {loading ? (
          <div>Cargando balance...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Empleado</th>
                  <th className="p-3 border text-left">Ingreso</th>
                  <th className="p-3 border text-left">Antigüedad</th>
                  <th className="p-3 border text-right">Arrastre</th>
                  <th className="p-3 border text-right">Generados</th>
                  <th className="p-3 border text-right">Tomados</th>
                  <th className="p-3 border text-right">Pagados</th>
                  <th className="p-3 border text-right">Ajuste</th>
                  <th className="p-3 border text-right">Disponible</th>
                  <th className="p-3 border text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {balancesFiltrados.map((b) => {
                  const emp = empleados.find((e) => e.id === b.empleado_id);

                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-3 border">
                        <p className="font-bold">{b.nombre_empleado}</p>
                        <p className="text-xs text-slate-500">
                          {b.numero_empleado} · {b.cargo || "-"} ·{" "}
                          {b.departamento || "-"}
                        </p>
                      </td>

                      <td className="p-3 border">
                        {formatoFecha(emp?.fecha_ingreso || null)}
                      </td>

                      <td className="p-3 border">
                        {textoAntiguedad(emp?.fecha_ingreso || null, b.anio)}
                      </td>

                      <td className="p-3 border text-right font-bold">
                        {formatoNumero(b.dias_arrastre_anterior)}
                      </td>

                      <td className="p-3 border text-right font-bold text-green-700">
                        {formatoNumero(b.dias_generados)}
                      </td>

                      <td className="p-3 border text-right font-bold text-red-700">
                        {formatoNumero(b.dias_tomados)}
                      </td>

                      <td className="p-3 border text-right font-bold text-red-700">
                        {formatoNumero(b.dias_pagados)}
                      </td>

                      <td className="p-3 border text-right font-bold">
                        {formatoNumero(b.dias_ajuste)}
                      </td>

                      <td className="p-3 border text-right font-black text-blue-700">
                        {formatoNumero(b.dias_disponibles)}
                      </td>

                      <td className="p-3 border text-center">
                        <button
                          onClick={() => cargarMovimientos(b.empleado_id, b.anio)}
                          className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Ver histórico
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {balancesFiltrados.length === 0 && (
                  <tr>
                    <td
                      className="p-6 border text-center text-slate-500"
                      colSpan={10}
                    >
                      No hay balance generado. Presione Recalcular para crear el
                      balance del año seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">Histórico de movimientos</h2>

        {empleadoHistorico ? (
          <p className="text-sm text-slate-500 mb-4">
            Empleado: <span className="font-bold">{empleadoHistorico.nombre}</span>
          </p>
        ) : (
          <p className="text-sm text-slate-500 mb-4">
            Seleccione Ver histórico en un empleado para consultar sus
            movimientos del año.
          </p>
        )}

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 border text-left">Fecha</th>
                <th className="p-3 border text-left">Movimiento</th>
                <th className="p-3 border text-right">Días</th>
                <th className="p-3 border text-left">Origen</th>
                <th className="p-3 border text-left">Usuario</th>
                <th className="p-3 border text-left">Observación</th>
              </tr>
            </thead>

            <tbody>
              {movimientos.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="p-3 border">{formatoFecha(m.fecha_movimiento)}</td>
                  <td className="p-3 border font-bold">{m.tipo_movimiento}</td>
                  <td
                    className={`p-3 border text-right font-black ${
                      Number(m.dias || 0) < 0 ? "text-red-700" : "text-green-700"
                    }`}
                  >
                    {formatoNumero(m.dias)}
                  </td>
                  <td className="p-3 border">{m.tipo_origen || "-"}</td>
                  <td className="p-3 border">{m.usuario || "-"}</td>
                  <td className="p-3 border">{m.observacion || "-"}</td>
                </tr>
              ))}

              {movimientos.length === 0 && (
                <tr>
                  <td className="p-6 border text-center text-slate-500" colSpan={6}>
                    No hay movimientos para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
