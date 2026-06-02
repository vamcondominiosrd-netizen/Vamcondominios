"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type Empleado = {
  id: number;
  numero_empleado: string;
  nombre: string;
  cargo: string;
  departamento: string;
  salario: number;
  estado: string;
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

  fecha_vigencia_desde: string;
  fecha_vigencia_hasta: string;

  estado: string;
};

type Nomina = {
  id: number;
  condominio_id: number;
  condominio: string;

  empleado_id: number;
  numero_empleado: string;
  nombre_empleado: string;
  cargo: string;
  departamento: string;

  periodo: string;
  fecha_pago: string;

  salario_base: number;
  dias_trabajados: number;

  horas_extras: number;
  monto_horas_extras: number;
  bonificacion: number;

  afp: number;
  sfs: number;
  isr: number;
  otros_descuentos: number;

  total_ingresos: number;
  total_descuentos: number;
  neto_pagar: number;

  estado: string;
  observacion: string;

  pagado_por: string;
  fecha_registro_pago: string;

  created_at: string;
};

const estadosNomina = ["Pendiente", "Aprobada", "Pagada", "Anulada"];

export default function NominaPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");

  const [configNomina, setConfigNomina] = useState<ConfigNomina | null>(null);

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [nominas, setNominas] = useState<Nomina[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [empleadoId, setEmpleadoId] = useState("");
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7));
  const [fechaPago, setFechaPago] = useState("");

  const [salarioBase, setSalarioBase] = useState("");
  const [diasTrabajados, setDiasTrabajados] = useState("30");

  const [horasExtras, setHorasExtras] = useState("0");
  const [montoHorasExtras, setMontoHorasExtras] = useState("0");
  const [bonificacion, setBonificacion] = useState("0");

  const [otrosDescuentos, setOtrosDescuentos] = useState("0");

  const [estado, setEstado] = useState("Pendiente");
  const [observacion, setObservacion] = useState("");

  const [filtroPeriodo, setFiltroPeriodo] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const usuario = localStorage.getItem("usuario_nombre") || "Administración";

    setCondominioId(id);
    setCondominioNombre(nombre);
    setUsuarioNombre(usuario);

    if (id) {
      cargarConfiguracionNomina(id);
      cargarEmpleados(id);
      cargarNominas(id, filtroPeriodo);
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

  async function cargarEmpleados(id: string) {
    const { data, error } = await supabase
      .from("empleados")
      .select("id, numero_empleado, nombre, cargo, departamento, salario, estado")
      .eq("condominio_id", Number(id))
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando empleados: " + error.message);
      return;
    }

    setEmpleados((data as Empleado[]) || []);
  }

  async function cargarNominas(id: string, periodoBuscar: string) {
    setLoading(true);

    let query = supabase
      .from("rh_nomina")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false });

    if (periodoBuscar) {
      query = query.eq("periodo", periodoBuscar);
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      alert("Error cargando nómina: " + error.message);
      return;
    }

    setNominas((data as Nomina[]) || []);
  }

  function moneda(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  function mostrarPorcentaje(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function numero(valor: string) {
    return Number(valor || 0);
  }

  function calcularSalarioBruto() {
    return (
      numero(salarioBase) + numero(montoHorasExtras) + numero(bonificacion)
    );
  }

  function calcularAFP() {
    if (!configNomina) return 0;

    return (
      calcularSalarioBruto() *
      (Number(configNomina.porcentaje_afp || 0) / 100)
    );
  }

  function calcularSFS() {
    if (!configNomina) return 0;

    return (
      calcularSalarioBruto() *
      (Number(configNomina.porcentaje_sfs || 0) / 100)
    );
  }

  function calcularISRMensual() {
    if (!configNomina) return 0;

    const salarioBrutoMensual = calcularSalarioBruto();
    const salarioAnual = salarioBrutoMensual * 12;

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

  function calcularTotales() {
    const salarioBruto = calcularSalarioBruto();

    const afpCalculada = calcularAFP();
    const sfsCalculado = calcularSFS();
    const isrCalculado = calcularISRMensual();

    const totalDescuentos =
      afpCalculada + sfsCalculado + isrCalculado + numero(otrosDescuentos);

    const netoPagar = salarioBruto - totalDescuentos;

    return {
      salarioBruto,
      afpCalculada,
      sfsCalculado,
      isrCalculado,
      totalIngresos: salarioBruto,
      totalDescuentos,
      netoPagar,
    };
  }

  function seleccionarEmpleado(id: string) {
    setEmpleadoId(id);

    const empleado = empleados.find((emp) => String(emp.id) === id);

    if (empleado) {
      setSalarioBase(String(empleado.salario || 0));
    }
  }

  function limpiarFormulario() {
    setEditandoId(null);

    setEmpleadoId("");
    setPeriodo(new Date().toISOString().slice(0, 7));
    setFechaPago("");

    setSalarioBase("");
    setDiasTrabajados("30");

    setHorasExtras("0");
    setMontoHorasExtras("0");
    setBonificacion("0");

    setOtrosDescuentos("0");

    setEstado("Pendiente");
    setObservacion("");
  }

  function editarNomina(n: Nomina) {
    setEditandoId(n.id);

    setEmpleadoId(String(n.empleado_id));
    setPeriodo(n.periodo || "");
    setFechaPago(n.fecha_pago || "");

    setSalarioBase(String(n.salario_base || 0));
    setDiasTrabajados(String(n.dias_trabajados || 30));

    setHorasExtras(String(n.horas_extras || 0));
    setMontoHorasExtras(String(n.monto_horas_extras || 0));
    setBonificacion(String(n.bonificacion || 0));

    setOtrosDescuentos(String(n.otros_descuentos || 0));

    setEstado(n.estado || "Pendiente");
    setObservacion(n.observacion || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarNomina(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!configNomina) {
      alert(
        "No hay configuración de nómina activa. Debe crear o activar una configuración antes de generar nómina."
      );
      return;
    }

    if (!empleadoId) {
      alert("Debe seleccionar un empleado.");
      return;
    }

    if (!periodo) {
      alert("Debe indicar el período de nómina.");
      return;
    }

    if (!salarioBase || Number(salarioBase) <= 0) {
      alert("Debe indicar un salario base válido.");
      return;
    }

    const empleado = empleados.find((emp) => String(emp.id) === empleadoId);

    if (!empleado) {
      alert("Empleado no encontrado.");
      return;
    }

    const totales = calcularTotales();

    const registro = {
      condominio_id: Number(condominioId),
      condominio: condominioNombre,

      empleado_id: Number(empleadoId),
      numero_empleado: empleado.numero_empleado || "",
      nombre_empleado: empleado.nombre || "",
      cargo: empleado.cargo || "",
      departamento: empleado.departamento || "",

      periodo,
      fecha_pago: fechaPago || null,

      salario_base: numero(salarioBase),
      dias_trabajados: Number(diasTrabajados || 0),

      horas_extras: numero(horasExtras),
      monto_horas_extras: numero(montoHorasExtras),
      bonificacion: numero(bonificacion),

      afp: totales.afpCalculada,
      sfs: totales.sfsCalculado,
      isr: totales.isrCalculado,
      otros_descuentos: numero(otrosDescuentos),

      total_ingresos: totales.totalIngresos,
      total_descuentos: totales.totalDescuentos,
      neto_pagar: totales.netoPagar,

      estado,
      observacion: observacion.trim(),

      pagado_por: estado === "Pagada" ? usuarioNombre : null,
      fecha_registro_pago:
        estado === "Pagada" ? new Date().toISOString().slice(0, 10) : null,
    };

    setGuardando(true);

    if (editandoId) {
      const { error } = await supabase
        .from("rh_nomina")
        .update(registro)
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      setGuardando(false);

      if (error) {
        alert("Error modificando nómina: " + error.message);
        return;
      }

      alert("Nómina modificada correctamente.");
      limpiarFormulario();
      cargarNominas(condominioId, filtroPeriodo);
      return;
    }

    const existe = nominas.find(
      (n) =>
        String(n.empleado_id) === String(empleadoId) &&
        n.periodo === periodo &&
        n.estado !== "Anulada"
    );

    if (existe) {
      setGuardando(false);
      alert("Ya existe una nómina para este empleado en ese período.");
      return;
    }

    const { error } = await supabase.from("rh_nomina").insert([registro]);

    setGuardando(false);

    if (error) {
      alert("Error guardando nómina: " + error.message);
      return;
    }

    alert("Nómina registrada correctamente.");
    limpiarFormulario();
    cargarNominas(condominioId, filtroPeriodo);
  }

  async function cambiarEstado(nomina: Nomina, nuevoEstado: string) {
    const confirmar = confirm(
      `¿Desea cambiar esta nómina a "${nuevoEstado}"?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("rh_nomina")
      .update({
        estado: nuevoEstado,
        pagado_por: nuevoEstado === "Pagada" ? usuarioNombre : null,
        fecha_registro_pago:
          nuevoEstado === "Pagada"
            ? new Date().toISOString().slice(0, 10)
            : null,
      })
      .eq("id", nomina.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error actualizando estado: " + error.message);
      return;
    }

    alert("Estado actualizado correctamente.");
    cargarNominas(condominioId, filtroPeriodo);
  }

  async function eliminarNomina(nomina: Nomina) {
    const confirmar = confirm(
      `¿Seguro que desea eliminar la nómina de ${nomina.nombre_empleado}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("rh_nomina")
      .delete()
      .eq("id", nomina.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error eliminando nómina: " + error.message);
      return;
    }

    alert("Nómina eliminada correctamente.");
    cargarNominas(condominioId, filtroPeriodo);
  }

  function buscarNomina() {
    if (!condominioId) return;
    cargarNominas(condominioId, filtroPeriodo);
  }

  const totalesFormulario = calcularTotales();

  const nominasFiltradas = nominas.filter((n) => {
    if (filtroEstado === "Todos") return true;
    return n.estado === filtroEstado;
  });

  const totalBruto = nominasFiltradas.reduce(
    (sum, n) => sum + Number(n.total_ingresos || 0),
    0
  );

  const totalAFP = nominasFiltradas.reduce(
    (sum, n) => sum + Number(n.afp || 0),
    0
  );

  const totalSFS = nominasFiltradas.reduce(
    (sum, n) => sum + Number(n.sfs || 0),
    0
  );

  const totalISR = nominasFiltradas.reduce(
    (sum, n) => sum + Number(n.isr || 0),
    0
  );

  const totalDescuentos = nominasFiltradas.reduce(
    (sum, n) => sum + Number(n.total_descuentos || 0),
    0
  );

  const totalNeto = nominasFiltradas.reduce(
    (sum, n) => sum + Number(n.neto_pagar || 0),
    0
  );

  const pendientes = nominasFiltradas.filter(
    (n) => n.estado === "Pendiente"
  ).length;

  const pagadas = nominasFiltradas.filter((n) => n.estado === "Pagada").length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900">Nómina</h1>

          <p className="text-slate-500 mt-2">
            Registro, cálculo y control de pagos de nómina del personal.
          </p>
        </div>

        <Link
          href="/recursos-humanos/nomina/configuracion"
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-center"
        >
          Configuración Nómina
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>

        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      {!configNomina && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-3xl p-5">
          <h2 className="font-black text-lg">Configuración requerida</h2>

          <p className="text-sm mt-1">
            No existe una configuración activa de nómina para este condominio.
            Debe crear o activar una configuración para calcular AFP, SFS e ISR
            correctamente.
          </p>

          <Link
            href="/recursos-humanos/nomina/configuracion"
            className="inline-block mt-3 bg-red-700 hover:bg-red-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Ir a configuración
          </Link>
        </div>
      )}

      {configNomina && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl px-4 py-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-black text-sm">
                Configuración activa aplicada
              </h2>

              <p className="text-xs text-blue-700">
                Estos valores se usan para calcular automáticamente AFP, SFS e
                ISR.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/70 border border-blue-100 rounded-xl px-3 py-2">
                <p className="text-blue-600">AFP</p>
                <p className="font-black text-sm">
                  {mostrarPorcentaje(configNomina.porcentaje_afp)}%
                </p>
              </div>

              <div className="bg-white/70 border border-blue-100 rounded-xl px-3 py-2">
                <p className="text-blue-600">SFS</p>
                <p className="font-black text-sm">
                  {mostrarPorcentaje(configNomina.porcentaje_sfs)}%
                </p>
              </div>

              <div className="bg-white/70 border border-blue-100 rounded-xl px-3 py-2">
                <p className="text-blue-600">ISR exento anual</p>
                <p className="font-black text-sm">
                  RD${moneda(configNomina.isr_exento_hasta)}
                </p>
              </div>

              <div className="bg-white/70 border border-blue-100 rounded-xl px-3 py-2">
                <p className="text-blue-600">Vigente desde</p>
                <p className="font-black text-sm">
                  {configNomina.fecha_vigencia_desde || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Registros</p>
          <h2 className="text-3xl font-black">{nominasFiltradas.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Pendientes</p>
          <h2 className="text-3xl font-black text-yellow-700">{pendientes}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Pagadas</p>
          <h2 className="text-3xl font-black text-green-700">{pagadas}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Total descuentos</p>
          <h2 className="text-2xl font-black text-red-700">
            RD${moneda(totalDescuentos)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Total neto</p>
          <h2 className="text-2xl font-black text-blue-700">
            RD${moneda(totalNeto)}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">
          {editandoId ? "Modificar nómina" : "Registrar nómina"}
        </h2>

        <form
          onSubmit={guardarNomina}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">
              Empleado *
            </label>

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
            <label className="block text-sm font-semibold mb-1">Período *</label>

            <input
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Fecha de pago
            </label>

            <input
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Días trabajados
            </label>

            <input
              type="number"
              value={diasTrabajados}
              onChange={(e) => setDiasTrabajados(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div className="md:col-span-2 mt-3">
            <h3 className="font-black border-b pb-2">Ingresos</h3>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Salario base RD$ *
            </label>

            <input
              type="number"
              step="0.01"
              value={salarioBase}
              onChange={(e) => setSalarioBase(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Horas extras
            </label>

            <input
              type="number"
              step="0.01"
              value={horasExtras}
              onChange={(e) => setHorasExtras(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Monto horas extras RD$
            </label>

            <input
              type="number"
              step="0.01"
              value={montoHorasExtras}
              onChange={(e) => setMontoHorasExtras(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Bonificación RD$
            </label>

            <input
              type="number"
              step="0.01"
              value={bonificacion}
              onChange={(e) => setBonificacion(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="0.00"
            />
          </div>

          <div className="md:col-span-2 mt-3">
            <h3 className="font-black border-b pb-2">
              Descuentos automáticos
            </h3>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              AFP{" "}
              {configNomina
                ? mostrarPorcentaje(configNomina.porcentaje_afp)
                : "0.00"}
              % RD$
            </label>

            <input
              value={moneda(totalesFormulario.afpCalculada)}
              readOnly
              className="border rounded-xl px-4 py-3 w-full bg-slate-100 font-bold text-red-700"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              SFS{" "}
              {configNomina
                ? mostrarPorcentaje(configNomina.porcentaje_sfs)
                : "0.00"}
              % RD$
            </label>

            <input
              value={moneda(totalesFormulario.sfsCalculado)}
              readOnly
              className="border rounded-xl px-4 py-3 w-full bg-slate-100 font-bold text-red-700"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              ISR calculado RD$
            </label>

            <input
              value={moneda(totalesFormulario.isrCalculado)}
              readOnly
              className="border rounded-xl px-4 py-3 w-full bg-slate-100 font-bold text-red-700"
            />

            <p className="text-xs text-slate-500 mt-1">
              ISR mensual calculado con la escala configurada en Configuración
              de Nómina.
            </p>
          </div>

          <div className="md:col-span-2 mt-3">
            <h3 className="font-black border-b pb-2">Otros descuentos</h3>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Otros descuentos RD$
            </label>

            <input
              type="number"
              step="0.01"
              value={otrosDescuentos}
              onChange={(e) => setOtrosDescuentos(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="0.00"
            />
          </div>

          <div className="md:col-span-2 bg-slate-50 border rounded-2xl p-5 mt-3">
            <h3 className="font-black mb-3">Resumen calculado</h3>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div>
                <p className="text-sm text-slate-500">Salario bruto</p>
                <p className="text-2xl font-black text-green-400">
                  RD${moneda(totalesFormulario.salarioBruto)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">AFP</p>
                <p className="text-2xl font-black text-red-400">
                  RD${moneda(totalesFormulario.afpCalculada)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">SFS</p>
                <p className="text-2xl font-black text-red-400">
                  RD${moneda(totalesFormulario.sfsCalculado)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">ISR</p>
                <p className="text-2xl font-black text-red-400">
                  RD${moneda(totalesFormulario.isrCalculado)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Total descuentos</p>
                <p className="text-2xl font-black text-red-400">
                  RD${moneda(totalesFormulario.totalDescuentos)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Neto a pagar</p>
                <p className="text-2xl font-black text-blue-400">
                  RD${moneda(totalesFormulario.netoPagar)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-4">
              AFP, SFS e ISR se calculan únicamente con la configuración activa
              registrada para este condominio.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {estadosNomina.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Observación
            </label>

            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              rows={3}
              placeholder="Observación de nómina"
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
                : "Guardar nómina"}
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
            <h2 className="text-xl font-black">Listado de nómina</h2>

            <p className="text-sm text-slate-500">
              Nóminas registradas para el personal del condominio activo.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Período
              </label>

              <input
                type="month"
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
                className="border rounded-xl px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Estado</label>

              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="border rounded-xl px-4 py-2 bg-white"
              >
                <option value="Todos">Todos</option>

                {estadosNomina.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={buscarNomina}
              className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-2 rounded-xl font-bold"
            >
              Buscar
            </button>
          </div>
        </div>

        {loading ? (
          <div>Cargando nómina...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Empleado</th>
                  <th className="p-3 border text-left">Período</th>
                  <th className="p-3 border text-right">Ingresos</th>
                  <th className="p-3 border text-right">AFP</th>
                  <th className="p-3 border text-right">SFS</th>
                  <th className="p-3 border text-right">ISR</th>
                  <th className="p-3 border text-right">Descuentos</th>
                  <th className="p-3 border text-right">Neto</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-left">Pago</th>
                  <th className="p-3 border text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {nominasFiltradas.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="p-3 border">
                      <p className="font-bold">{n.nombre_empleado}</p>
                      <p className="text-xs text-slate-500">
                        {n.numero_empleado} · {n.cargo || "-"}
                      </p>
                    </td>

                    <td className="p-3 border">
                      <p className="font-bold">{n.periodo}</p>
                      <p className="text-xs text-slate-500">
                        Días: {n.dias_trabajados || 0}
                      </p>
                    </td>

                    <td className="p-3 border text-right font-bold text-green-700">
                      RD${moneda(n.total_ingresos)}
                    </td>

                    <td className="p-3 border text-right font-bold text-red-700">
                      RD${moneda(n.afp)}
                    </td>

                    <td className="p-3 border text-right font-bold text-red-700">
                      RD${moneda(n.sfs)}
                    </td>

                    <td className="p-3 border text-right font-bold text-red-700">
                      RD${moneda(n.isr)}
                    </td>

                    <td className="p-3 border text-right font-bold text-red-700">
                      RD${moneda(n.total_descuentos)}
                    </td>

                    <td className="p-3 border text-right font-black text-blue-700">
                      RD${moneda(n.neto_pagar)}
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          n.estado === "Pagada"
                            ? "bg-green-100 text-green-700"
                            : n.estado === "Aprobada"
                            ? "bg-blue-100 text-blue-700"
                            : n.estado === "Anulada"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {n.estado}
                      </span>
                    </td>

                    <td className="p-3 border">
                      <p>Fecha pago: {n.fecha_pago || "-"}</p>
                      <p className="text-xs text-slate-500">
                        Pagado por: {n.pagado_por || "-"}
                      </p>
                    </td>

                    <td className="p-3 border">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          onClick={() => editarNomina(n)}
                          className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Editar
                        </button>

                        {n.estado !== "Aprobada" && n.estado !== "Pagada" && (
                          <button
                            onClick={() => cambiarEstado(n, "Aprobada")}
                            className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Aprobar
                          </button>
                        )}

                        {n.estado !== "Pagada" && n.estado !== "Anulada" && (
                          <button
                            onClick={() => cambiarEstado(n, "Pagada")}
                            className="bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Pagar
                          </button>
                        )}

                        {n.estado !== "Anulada" && (
                          <button
                            onClick={() => cambiarEstado(n, "Anulada")}
                            className="bg-yellow-700 hover:bg-yellow-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Anular
                          </button>
                        )}

                        <button
                          onClick={() => eliminarNomina(n)}
                          className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {nominasFiltradas.length === 0 && (
                  <tr>
                    <td
                      className="p-6 border text-center text-slate-500"
                      colSpan={11}
                    >
                      No hay registros de nómina para esta consulta.
                    </td>
                  </tr>
                )}
              </tbody>

              {nominasFiltradas.length > 0 && (
                <tfoot className="bg-slate-100 font-black">
                  <tr>
                    <td className="p-3 border" colSpan={2}>
                      Totales
                    </td>

                    <td className="p-3 border text-right text-green-700">
                      RD${moneda(totalBruto)}
                    </td>

                    <td className="p-3 border text-right text-red-700">
                      RD${moneda(totalAFP)}
                    </td>

                    <td className="p-3 border text-right text-red-700">
                      RD${moneda(totalSFS)}
                    </td>

                    <td className="p-3 border text-right text-red-700">
                      RD${moneda(totalISR)}
                    </td>

                    <td className="p-3 border text-right text-red-700">
                      RD${moneda(totalDescuentos)}
                    </td>

                    <td className="p-3 border text-right text-blue-700">
                      RD${moneda(totalNeto)}
                    </td>

                    <td className="p-3 border" colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}