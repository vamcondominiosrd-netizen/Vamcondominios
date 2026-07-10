"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Empleado = {
  id: number;
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
  empleado_id: number;
  anio: number;
  dias_arrastre_anterior: number;
  dias_generados: number;
  dias_tomados: number;
  dias_pagados: number;
  dias_ajuste: number;
  dias_disponibles: number;
};

type Prestacion = {
  id: number;
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

const tiposSalida = [
  "Renuncia",
  "Desahucio",
  "Despido",
  "Fin de contrato",
  "Fallecimiento",
];

const estados = ["Pendiente", "Calculada", "Aprobada", "Pagada", "Anulada"];

export default function PrestacionesLaboralesPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [balances, setBalances] = useState<BalanceVacaciones[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [empleadoId, setEmpleadoId] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState("");
  const [fechaSalida, setFechaSalida] = useState(new Date().toISOString().slice(0, 10));
  const [salarioMensual, setSalarioMensual] = useState("");
  const [tipoSalida, setTipoSalida] = useState("Desahucio");

  const [otrosPagos, setOtrosPagos] = useState("0");
  const [descuentos, setDescuentos] = useState("0");
  const [estado, setEstado] = useState("Calculada");
  const [observacion, setObservacion] = useState("");

  const [filtroEstado, setFiltroEstado] = useState("Todos");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const usuario = localStorage.getItem("usuario_nombre") || "Administración";

    setCondominioId(id);
    setCondominioNombre(nombre);
    setUsuarioNombre(usuario);

    if (id) {
      cargarEmpleados(id);
      cargarPrestaciones(id);
      cargarBalances(id);
    }
  }, []);

  async function cargarEmpleados(id: string) {
    const { data, error } = await supabase
      .from("empleados")
      .select("id, numero_empleado, nombre, cargo, departamento, salario, fecha_ingreso, estado")
      .eq("condominio_id", Number(id))
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando empleados: " + error.message);
      return;
    }

    setEmpleados((data as Empleado[]) || []);
  }

  async function cargarBalances(id: string) {
    const anio = new Date().getFullYear();

    const { data, error } = await supabase
      .from("rh_balance_vacaciones")
      .select("*")
      .eq("condominio_id", Number(id))
      .eq("anio", anio)
      .eq("estado", "Activo");

    if (error) {
      alert("Error cargando balance de vacaciones: " + error.message);
      return;
    }

    setBalances((data as BalanceVacaciones[]) || []);
  }

  async function cargarPrestaciones(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("rh_prestaciones_laborales")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando prestaciones: " + error.message);
      return;
    }

    setPrestaciones((data as Prestacion[]) || []);
  }

  function moneda(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function numero(valor: string) {
    return Number(valor || 0);
  }

  function mesesEntre(inicio: string, fin: string) {
    if (!inicio || !fin) return 0;

    const f1 = new Date(`${inicio}T00:00:00`);
    const f2 = new Date(`${fin}T00:00:00`);

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
      texto += texto ? ` y ${mesesRestantes} mes${mesesRestantes === 1 ? "" : "es"}` : `${mesesRestantes} mes${mesesRestantes === 1 ? "" : "es"}`;
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
      0
    ).getDate();

    const proporcionMesActual = salida.getDate() / diasDelMes;
    const mesesProporcionales = mesesCompletos + proporcionMesActual;

    return (salario * mesesProporcionales) / 12;
  }

  function obtenerDiasVacacionesDisponibles() {
    const balance = balances.find((b) => String(b.empleado_id) === empleadoId);

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

    const empleado = empleados.find((item) => String(item.id) === id);

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

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!empleadoId) {
      alert("Debe seleccionar un empleado.");
      return;
    }

    if (!fechaIngreso) {
      alert("El empleado no tiene fecha de ingreso registrada.");
      return;
    }

    if (!fechaSalida) {
      alert("Debe indicar fecha de salida.");
      return;
    }

    if (!salarioMensual || Number(salarioMensual) <= 0) {
      alert("Debe indicar un salario válido.");
      return;
    }

    const empleado = empleados.find((item) => String(item.id) === empleadoId);

    if (!empleado) {
      alert("Empleado no encontrado.");
      return;
    }

    const r = calcularResultado();

    const registro = {
      condominio_id: Number(condominioId),
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

    try {
      let prestacionId = editandoId;

      if (editandoId) {
        const { error } = await supabase
          .from("rh_prestaciones_laborales")
          .update(registro)
          .eq("id", editandoId)
          .eq("condominio_id", Number(condominioId));

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
      alert(editandoId ? "Prestación modificada correctamente." : "Prestación registrada correctamente.");
      limpiarFormulario();
      cargarPrestaciones(condominioId);
    } catch (error: any) {
      setGuardando(false);
      alert("Error guardando prestaciones: " + error.message);
    }
  }

  async function guardarDetalle(prestacionId: number, r: ReturnType<typeof calcularResultado>) {
    await supabase
      .from("rh_prestaciones_detalle")
      .delete()
      .eq("prestacion_id", prestacionId)
      .eq("condominio_id", Number(condominioId));

    const detalles = [
      {
        condominio_id: Number(condominioId),
        prestacion_id: prestacionId,
        concepto: "Preaviso",
        dias: r.diasPreaviso,
        monto: r.montoPreaviso,
        observacion: "Cálculo automático de preaviso.",
      },
      {
        condominio_id: Number(condominioId),
        prestacion_id: prestacionId,
        concepto: "Cesantía",
        dias: r.diasCesantia,
        monto: r.montoCesantia,
        observacion: "Cálculo automático de cesantía.",
      },
      {
        condominio_id: Number(condominioId),
        prestacion_id: prestacionId,
        concepto: "Vacaciones pendientes",
        dias: r.diasVacaciones,
        monto: r.montoVacaciones,
        observacion: "Según balance de vacaciones disponible.",
      },
      {
        condominio_id: Number(condominioId),
        prestacion_id: prestacionId,
        concepto: "Regalía proporcional",
        dias: 0,
        monto: r.montoRegalia,
        observacion: "Cálculo proporcional según meses del año hasta la salida.",
      },
      {
        condominio_id: Number(condominioId),
        prestacion_id: prestacionId,
        concepto: "Otros pagos",
        dias: 0,
        monto: numero(otrosPagos),
        observacion: "Valor manual registrado.",
      },
      {
        condominio_id: Number(condominioId),
        prestacion_id: prestacionId,
        concepto: "Descuentos",
        dias: 0,
        monto: numero(descuentos),
        observacion: "Valor manual registrado.",
      },
    ];

    const { error } = await supabase.from("rh_prestaciones_detalle").insert(detalles);

    if (error) {
      throw new Error(error.message);
    }
  }

  async function cambiarEstado(p: Prestacion, nuevoEstado: string) {
    const confirmar = confirm(`¿Desea cambiar esta prestación a "${nuevoEstado}"?`);

    if (!confirmar) return;

    const { error } = await supabase
      .from("rh_prestaciones_laborales")
      .update({ estado: nuevoEstado })
      .eq("id", p.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error cambiando estado: " + error.message);
      return;
    }

    alert("Estado actualizado correctamente.");
    cargarPrestaciones(condominioId);
  }

  async function eliminarPrestacion(p: Prestacion) {
    const confirmar = confirm(`¿Seguro que desea eliminar la prestación de ${p.nombre_empleado}?`);

    if (!confirmar) return;

    await supabase
      .from("rh_prestaciones_detalle")
      .delete()
      .eq("prestacion_id", p.id)
      .eq("condominio_id", Number(condominioId));

    const { error } = await supabase
      .from("rh_prestaciones_laborales")
      .delete()
      .eq("id", p.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error eliminando prestación: " + error.message);
      return;
    }

    alert("Prestación eliminada correctamente.");
    cargarPrestaciones(condominioId);
  }

  const resultado = calcularResultado();

  const prestacionesFiltradas = prestaciones.filter((p) => {
    if (filtroEstado === "Todos") return true;
    return p.estado === filtroEstado;
  });

  const totalPendiente = prestacionesFiltradas
    .filter((p) => p.estado !== "Pagada" && p.estado !== "Anulada")
    .reduce((sum, p) => sum + Number(p.total_prestaciones || 0), 0);

  const totalPagada = prestacionesFiltradas
    .filter((p) => p.estado === "Pagada")
    .reduce((sum, p) => sum + Number(p.total_prestaciones || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">
          Prestaciones Laborales
        </h1>
        <p className="text-slate-500 mt-2">
          Cálculo automático de preaviso, cesantía, vacaciones pendientes y regalía proporcional.
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
          <p className="text-sm text-slate-500">Registros</p>
          <h2 className="text-3xl font-black">{prestacionesFiltradas.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Pendiente/Aprobado</p>
          <h2 className="text-2xl font-black text-yellow-700">
            RD${moneda(totalPendiente)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Pagado</p>
          <h2 className="text-2xl font-black text-green-700">
            RD${moneda(totalPagada)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Balance vacaciones</p>
          <h2 className="text-3xl font-black text-blue-700">{balances.length}</h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">
          {editandoId ? "Modificar cálculo" : "Nuevo cálculo de prestaciones"}
        </h2>

        <form onSubmit={guardarPrestacion} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Empleado *</label>
            <select
              value={empleadoId}
              onChange={(e) => seleccionarEmpleado(e.target.value)}
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
            <label className="block text-sm font-semibold mb-1">Tipo de salida *</label>
            <select
              value={tipoSalida}
              onChange={(e) => setTipoSalida(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {tiposSalida.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Fecha ingreso</label>
            <input
              type="date"
              value={fechaIngreso || ""}
              onChange={(e) => setFechaIngreso(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Fecha salida *</label>
            <input
              type="date"
              value={fechaSalida}
              onChange={(e) => setFechaSalida(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Salario mensual RD$ *</label>
            <input
              type="number"
              step="0.01"
              value={salarioMensual}
              onChange={(e) => setSalarioMensual(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {estados.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <h3 className="font-black mb-3 text-blue-900">Resumen automático</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-blue-700">Tiempo laborado</p>
                <p className="font-black">{resultado.tiempo.texto}</p>
              </div>

              <div>
                <p className="text-sm text-blue-700">Meses laborados</p>
                <p className="font-black">{resultado.tiempo.meses}</p>
              </div>

              <div>
                <p className="text-sm text-blue-700">Salario diario</p>
                <p className="font-black">RD${moneda(resultado.salarioDiario)}</p>
              </div>

              <div>
                <p className="text-sm text-blue-700">Días vacaciones disponibles</p>
                <p className="font-black">{resultado.diasVacaciones}</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 border rounded-2xl overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Concepto</th>
                  <th className="p-3 border text-right">Días</th>
                  <th className="p-3 border text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border font-bold">Preaviso</td>
                  <td className="p-3 border text-right">{resultado.diasPreaviso}</td>
                  <td className="p-3 border text-right">RD${moneda(resultado.montoPreaviso)}</td>
                </tr>
                <tr>
                  <td className="p-3 border font-bold">Cesantía</td>
                  <td className="p-3 border text-right">{resultado.diasCesantia}</td>
                  <td className="p-3 border text-right">RD${moneda(resultado.montoCesantia)}</td>
                </tr>
                <tr>
                  <td className="p-3 border font-bold">Vacaciones pendientes</td>
                  <td className="p-3 border text-right">{resultado.diasVacaciones}</td>
                  <td className="p-3 border text-right">RD${moneda(resultado.montoVacaciones)}</td>
                </tr>
                <tr>
                  <td className="p-3 border font-bold">Regalía proporcional</td>
                  <td className="p-3 border text-right">-</td>
                  <td className="p-3 border text-right">RD${moneda(resultado.montoRegalia)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Otros pagos RD$</label>
            <input
              type="number"
              step="0.01"
              value={otrosPagos}
              onChange={(e) => setOtrosPagos(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Descuentos RD$</label>
            <input
              type="number"
              step="0.01"
              value={descuentos}
              onChange={(e) => setDescuentos(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="0.00"
            />
          </div>

          <div className="md:col-span-2 bg-slate-900 text-white rounded-2xl p-5">
            <p className="text-sm text-slate-300">Total prestaciones</p>
            <h2 className="text-4xl font-black">RD${moneda(resultado.total)}</h2>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">Observación</label>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              rows={3}
              placeholder="Observaciones del cálculo"
            />
          </div>

          <div className="md:col-span-2 flex flex-col md:flex-row gap-3">
            <button
              type="submit"
              disabled={guardando}
              className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-5 py-3 rounded-xl font-bold"
            >
              {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Guardar cálculo"}
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
            <h2 className="text-xl font-black">Histórico de prestaciones</h2>
            <p className="text-sm text-slate-500">
              Cálculos registrados para empleados del condominio activo.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border rounded-xl px-4 py-2 bg-white"
            >
              <option value="Todos">Todos</option>
              {estados.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div>Cargando prestaciones...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Empleado</th>
                  <th className="p-3 border text-left">Salida</th>
                  <th className="p-3 border text-right">Preaviso</th>
                  <th className="p-3 border text-right">Cesantía</th>
                  <th className="p-3 border text-right">Vacaciones</th>
                  <th className="p-3 border text-right">Regalía</th>
                  <th className="p-3 border text-right">Total</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {prestacionesFiltradas.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3 border">
                      <p className="font-bold">{p.nombre_empleado}</p>
                      <p className="text-xs text-slate-500">
                        {p.numero_empleado} · {p.cargo || "-"}
                      </p>
                    </td>

                    <td className="p-3 border">
                      <p className="font-bold">{p.tipo_salida}</p>
                      <p className="text-xs text-slate-500">
                        {p.fecha_salida} · {p.tiempo_laborado}
                      </p>
                    </td>

                    <td className="p-3 border text-right">RD${moneda(p.preaviso)}</td>
                    <td className="p-3 border text-right">RD${moneda(p.cesantia)}</td>
                    <td className="p-3 border text-right">RD${moneda(p.vacaciones_pendientes)}</td>
                    <td className="p-3 border text-right">RD${moneda(p.regalia_proporcional)}</td>
                    <td className="p-3 border text-right font-black text-blue-700">
                      RD${moneda(p.total_prestaciones)}
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          p.estado === "Pagada"
                            ? "bg-green-100 text-green-700"
                            : p.estado === "Aprobada"
                            ? "bg-blue-100 text-blue-700"
                            : p.estado === "Anulada"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {p.estado}
                      </span>
                    </td>

                    <td className="p-3 border">
                      <div className="flex flex-wrap justify-center gap-2">
                 <Link
                    href={`/recursos-humanos/prestaciones/recibo/${p.id}`}
                      className="bg-purple-700 hover:bg-purple-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                    >
                 Recibo
                 </Link>
                        <button
                          onClick={() => editarPrestacion(p)}
                          className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Editar
                        </button>

                        {p.estado !== "Aprobada" && p.estado !== "Pagada" && (
                          <button
                            onClick={() => cambiarEstado(p, "Aprobada")}
                            className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Aprobar
                          </button>
                        )}

                        {p.estado !== "Pagada" && p.estado !== "Anulada" && (
                          <button
                            onClick={() => cambiarEstado(p, "Pagada")}
                            className="bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Pagar
                          </button>
                        )}

                        {p.estado !== "Anulada" && (
                          <button
                            onClick={() => cambiarEstado(p, "Anulada")}
                            className="bg-yellow-700 hover:bg-yellow-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Anular
                          </button>
                        )}

                        <button
                          onClick={() => eliminarPrestacion(p)}
                          className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {prestacionesFiltradas.length === 0 && (
                  <tr>
                    <td className="p-6 border text-center text-slate-500" colSpan={9}>
                      No hay prestaciones registradas.
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
