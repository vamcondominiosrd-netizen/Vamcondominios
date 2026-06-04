"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Unidad = {
  id: number;
  codigo: string;
};

type Cargo = {
  id: number;
  condominio_id: number;
  unidad_id: number;
  anio: number;
  mes: number;
  periodo: string;
  concepto: string;
  tipo_cargo: string;
  monto: number;
  monto_pagado: number;
  balance: number;
  estado: string;
  created_at?: string;
};

type ConfiguracionCargo = {
  id: number;
  condominio_id: number;
  cuota_ordinaria: number;
  dia_limite_pago: number;
  dia_inicio_mora: number;
  porcentaje_mora: number;
  mora_activa: boolean;
  activa: boolean;
};

type ModoCargo = "individual" | "masivo" | "mantenimiento";

export default function CargosIndividualesPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [configuracion, setConfiguracion] =
    useState<ConfiguracionCargo | null>(null);

  const [modoCargo, setModoCargo] = useState<ModoCargo>("individual");

  const [unidadId, setUnidadId] = useState("");
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [mes, setMes] = useState(String(new Date().getMonth() + 1));
  const [concepto, setConcepto] = useState("");
  const [tipoCargo, setTipoCargo] = useState("Extraordinario");
  const [monto, setMonto] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      setMensaje("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre || `Condominio ID ${id}`);

    cargarConfiguracion(id);
    cargarUnidades(id);
    cargarCargos(id);
  }, []);

  useEffect(() => {
    if (modoCargo === "mantenimiento") {
      setUnidadId("");
      setConcepto("Mantenimiento");
      setTipoCargo("Mantenimiento");
      setMonto(
        configuracion?.cuota_ordinaria
          ? String(configuracion.cuota_ordinaria)
          : ""
      );
      setMensaje("");
      return;
    }

    if (modoCargo === "masivo") {
      setUnidadId("");
      setConcepto("");
      setTipoCargo("Extraordinario");
      setMonto("");
      setMensaje("");
      return;
    }

    setConcepto("");
    setTipoCargo("Extraordinario");
    setMonto("");
    setMensaje("");
  }, [modoCargo, configuracion]);

  async function cargarConfiguracion(id: string) {
    const { data, error } = await supabase
      .from("configuracion_cargos")
      .select("*")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .maybeSingle();

    if (error) {
      setMensaje("Error cargando configuración de cargos: " + error.message);
      return;
    }

    setConfiguracion(data || null);
  }

  async function cargarUnidades(id: string) {
    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo", { ascending: true });

    if (error) {
      setMensaje("Error cargando apartamentos: " + error.message);
      return;
    }

    setUnidades(data || []);
  }

  async function cargarCargos(id: string) {
    if (!id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("cargos_periodicos")
      .select(`
        id,
        condominio_id,
        unidad_id,
        anio,
        mes,
        periodo,
        concepto,
        tipo_cargo,
        monto,
        monto_pagado,
        balance,
        estado,
        created_at
      `)
      .eq("condominio_id", Number(id))
      .order("id", { ascending: false })
      .limit(100);

    setLoading(false);

    if (error) {
      setMensaje("Error cargando cargos: " + error.message);
      return;
    }

    setCargos((data as Cargo[]) || []);
  }

  function generarPeriodo(anioValor: string, mesValor: string) {
    const anioNumero = Number(anioValor);
    const mesNumero = Number(mesValor);

    if (!anioNumero || !mesNumero) return "";

    return `${anioNumero}-${String(mesNumero).padStart(2, "0")}`;
  }

  function dinero(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  function obtenerCodigoUnidad(idUnidad: number) {
    const unidad = unidades.find((u) => Number(u.id) === Number(idUnidad));
    return unidad?.codigo || `Unidad ${idUnidad}`;
  }

  function limpiarFormulario() {
    setUnidadId("");

    if (modoCargo === "mantenimiento") {
      setConcepto("Mantenimiento");
      setTipoCargo("Mantenimiento");
      setMonto(
        configuracion?.cuota_ordinaria
          ? String(configuracion.cuota_ordinaria)
          : ""
      );
    } else {
      setConcepto("");
      setTipoCargo("Extraordinario");
      setMonto("");
    }

    setMensaje("");
  }

  function cambiarModo(modo: ModoCargo) {
    setModoCargo(modo);
    setMensaje("");
  }

  async function aplicarCreditos() {
    if (!condominioId) return;

    const { error } = await supabase.rpc("aplicar_creditos_a_cargos", {
      p_condominio_id: Number(condominioId),
    });

    if (error) {
      alert(
        "Cargo guardado, pero no se pudieron aplicar los créditos a favor: " +
          error.message
      );
    }
  }

  async function validarDuplicadoMasivo(
    periodoActual: string,
    conceptoFinal: string,
    tipoFinal: string
  ) {
    const { data, error } = await supabase
      .from("cargos_periodicos")
      .select("id")
      .eq("condominio_id", Number(condominioId))
      .eq("periodo", periodoActual)
      .eq("concepto", conceptoFinal)
      .eq("tipo_cargo", tipoFinal)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data && data.length > 0);
  }

  async function guardarCargo(e: FormEvent) {
    e.preventDefault();

    const camposFaltantes: string[] = [];

    if (!condominioId) camposFaltantes.push("condominio activo");
    if (!anio.trim()) camposFaltantes.push("año");
    if (!mes.trim()) camposFaltantes.push("mes");

    if (modoCargo === "individual" && !unidadId) {
      camposFaltantes.push("apartamento");
    }

    if (modoCargo !== "mantenimiento") {
      if (!concepto.trim()) camposFaltantes.push("concepto");
      if (!tipoCargo.trim()) camposFaltantes.push("tipo de cargo");
      if (!monto.trim()) camposFaltantes.push("monto");
    }

    if (modoCargo === "mantenimiento" && !configuracion) {
      camposFaltantes.push("configuración de cuota ordinaria");
    }

    if (camposFaltantes.length > 0) {
      setMensaje("Debe completar: " + camposFaltantes.join(", ") + ".");
      return;
    }

    const anioNumero = Number(anio);
    const mesNumero = Number(mes);

    if (!anioNumero || !mesNumero || mesNumero < 1 || mesNumero > 12) {
      setMensaje("El año o mes no es válido.");
      return;
    }

    const periodoActual = generarPeriodo(anio, mes);

    if (!periodoActual) {
      setMensaje("No se pudo generar el período.");
      return;
    }

    const conceptoFinal =
      modoCargo === "mantenimiento" ? "Mantenimiento" : concepto.trim();

    const tipoFinal =
      modoCargo === "mantenimiento" ? "Mantenimiento" : tipoCargo.trim();

    const montoFinal =
      modoCargo === "mantenimiento"
        ? Number(configuracion?.cuota_ordinaria || 0)
        : Number(monto);

    if (Number.isNaN(montoFinal) || montoFinal <= 0) {
      setMensaje("El monto debe ser mayor que cero.");
      return;
    }

    if (!unidades.length) {
      setMensaje("No hay apartamentos activos para este condominio.");
      return;
    }

    let unidadesAfectadas: Unidad[] = [];

    if (modoCargo === "individual") {
      const unidadSeleccionada = unidades.find(
        (u) => String(u.id) === String(unidadId)
      );

      if (!unidadSeleccionada) {
        setMensaje("Debe seleccionar una unidad válida.");
        return;
      }

      unidadesAfectadas = [unidadSeleccionada];
    } else {
      unidadesAfectadas = unidades;
    }

    try {
      if (modoCargo === "mantenimiento") {
        const existe = await validarDuplicadoMasivo(
          periodoActual,
          "Mantenimiento",
          "Mantenimiento"
        );

        if (existe) {
          setMensaje(
            `Ya existen cargos de mantenimiento generados para el período ${periodoActual}.`
          );
          return;
        }
      }

      if (modoCargo === "masivo") {
        const existe = await validarDuplicadoMasivo(
          periodoActual,
          conceptoFinal,
          tipoFinal
        );

        if (existe) {
          const continuar = confirm(
            `Ya existe al menos un cargo con ese concepto, tipo y período.\n\n¿Desea continuar de todos modos?`
          );

          if (!continuar) return;
        }
      }

      const descripcionModo =
        modoCargo === "individual"
          ? `al apartamento ${unidadesAfectadas[0]?.codigo}`
          : modoCargo === "masivo"
          ? `a ${unidadesAfectadas.length} apartamentos`
          : `el mantenimiento mensual a ${unidadesAfectadas.length} apartamentos`;

      const confirmar = confirm(
        `¿Desea aplicar este cargo ${descripcionModo}?\n\nPeriodo: ${periodoActual}\nConcepto: ${conceptoFinal}\nTipo: ${tipoFinal}\nMonto: RD$${montoFinal.toLocaleString(
          "es-DO",
          { minimumFractionDigits: 2 }
        )}`
      );

      if (!confirmar) return;

      setGuardando(true);
      setMensaje("");

      const cargosInsertar = unidadesAfectadas.map((u) => ({
        condominio_id: Number(condominioId),
        unidad_id: u.id,
        anio: anioNumero,
        mes: mesNumero,
        periodo: periodoActual,
        concepto: conceptoFinal,
        tipo_cargo: tipoFinal,
        monto: montoFinal,
        monto_pagado: 0,
        balance: montoFinal,
        estado: "PENDIENTE",
      }));

      const { error } = await supabase
        .from("cargos_periodicos")
        .insert(cargosInsertar);

      if (error) {
        setGuardando(false);
        setMensaje("Error guardando cargo: " + error.message);
        return;
      }

      await aplicarCreditos();

      setGuardando(false);

      alert(
        modoCargo === "individual"
          ? "Cargo individual registrado correctamente."
          : modoCargo === "masivo"
          ? "Cargo masivo registrado correctamente."
          : "Mantenimiento mensual generado correctamente."
      );

      limpiarFormulario();
      cargarCargos(condominioId);
    } catch (error: any) {
      setGuardando(false);
      setMensaje("Error procesando cargo: " + error.message);
    }
  }

  async function borrarCargo(cargo: Cargo) {
    const confirmar = confirm(
      `¿Seguro que desea borrar este cargo?\n\nApartamento: ${obtenerCodigoUnidad(
        cargo.unidad_id
      )}\nConcepto: ${cargo.concepto}\nMonto: RD$${dinero(cargo.monto)}`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("cargos_periodicos")
      .delete()
      .eq("id", cargo.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error borrando cargo: " + error.message);
      return;
    }

    alert("Cargo borrado correctamente.");
    cargarCargos(condominioId);
  }

  const unidadSeleccionada = unidades.find(
    (u) => String(u.id) === String(unidadId)
  );

  const periodoActual = generarPeriodo(anio, mes);

  const montoVista =
    modoCargo === "mantenimiento"
      ? Number(configuracion?.cuota_ordinaria || 0)
      : Number(monto || 0);

  const totalCargos = cargos.reduce(
    (sum, c) => sum + Number(c.monto || 0),
    0
  );

  const totalPendiente = cargos.reduce(
    (sum, c) => sum + Number(c.balance || 0),
    0
  );

  const totalPagado = cargos.reduce(
    (sum, c) => sum + Number(c.monto_pagado || 0),
    0
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h1 className="text-3xl font-bold">Gestión de Cargos</h1>

          <p className="text-slate-500 mt-2">
            Administre cargos individuales, cargos masivos y mantenimiento
            mensual del condominio activo.
          </p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Condominio activo
          </p>

          <h2 className="text-xl font-bold text-slate-800 mt-1">
            {condominioNombre || "No seleccionado"}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Últimos cargos</p>
            <h2 className="text-2xl font-bold">{cargos.length}</h2>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Total cargado</p>
            <h2 className="text-2xl font-bold text-blue-700">
              RD$ {dinero(totalCargos)}
            </h2>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Total aplicado</p>
            <h2 className="text-2xl font-bold text-green-700">
              RD$ {dinero(totalPagado)}
            </h2>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-slate-500">Balance pendiente</p>
            <h2 className="text-2xl font-bold text-red-700">
              RD$ {dinero(totalPendiente)}
            </h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4">Tipo de cargo</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => cambiarModo("individual")}
              className={`rounded-xl px-4 py-3 font-bold border ${
                modoCargo === "individual"
                  ? "bg-blue-700 text-white border-blue-700"
                  : "bg-white text-slate-700"
              }`}
            >
              Cargo individual
            </button>

            <button
              type="button"
              onClick={() => cambiarModo("masivo")}
              className={`rounded-xl px-4 py-3 font-bold border ${
                modoCargo === "masivo"
                  ? "bg-purple-700 text-white border-purple-700"
                  : "bg-white text-slate-700"
              }`}
            >
              Cargo masivo
            </button>

            <button
              type="button"
              onClick={() => cambiarModo("mantenimiento")}
              className={`rounded-xl px-4 py-3 font-bold border ${
                modoCargo === "mantenimiento"
                  ? "bg-green-700 text-white border-green-700"
                  : "bg-white text-slate-700"
              }`}
            >
              Mantenimiento mensual
            </button>
          </div>
        </div>

        {modoCargo === "mantenimiento" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-sm text-green-900">
            <p className="font-bold mb-1">Configuración de mantenimiento</p>

            {configuracion ? (
              <>
                <p>
                  Cuota ordinaria:{" "}
                  <strong>RD$ {dinero(configuracion.cuota_ordinaria)}</strong>
                </p>
                <p>Día límite de pago: {configuracion.dia_limite_pago}</p>
                <p>
                  Mora:{" "}
                  {configuracion.mora_activa
                    ? `${configuracion.porcentaje_mora}% desde el día ${configuracion.dia_inicio_mora}`
                    : "Inactiva"}
                </p>
              </>
            ) : (
              <p>
                No existe configuración de cargos activa para este condominio.
              </p>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4">
            {modoCargo === "individual"
              ? "Registrar cargo individual"
              : modoCargo === "masivo"
              ? "Registrar cargo masivo"
              : "Generar mantenimiento mensual"}
          </h2>

          <form
            onSubmit={guardarCargo}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {modoCargo === "individual" && (
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Apartamento / Unidad
                </label>

                <select
                  value={unidadId}
                  onChange={(e) => {
                    setUnidadId(e.target.value);
                    setMensaje("");
                  }}
                  className="w-full border rounded-xl px-4 py-3 bg-white"
                >
                  <option value="">Seleccione apartamento</option>

                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.codigo}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {modoCargo !== "individual" && (
              <div className="bg-slate-50 border rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500">Apartamentos activos</p>
                <p className="font-bold text-slate-800">
                  {unidades.length} apartamentos
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2">Año</label>

              <input
                type="number"
                value={anio}
                onChange={(e) => {
                  setAnio(e.target.value);
                  setMensaje("");
                }}
                className="w-full border rounded-xl px-4 py-3"
                placeholder="2026"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Mes</label>

              <select
                value={mes}
                onChange={(e) => {
                  setMes(e.target.value);
                  setMensaje("");
                }}
                className="w-full border rounded-xl px-4 py-3 bg-white"
              >
                <option value="">Seleccione mes</option>
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

            <div>
              <label className="block text-sm font-semibold mb-2">
                Periodo
              </label>

              <input
                type="text"
                value={periodoActual}
                disabled
                className="w-full border rounded-xl px-4 py-3 bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Tipo de cargo
              </label>

              <select
                value={tipoCargo}
                onChange={(e) => {
                  setTipoCargo(e.target.value);
                  setMensaje("");
                }}
                disabled={modoCargo === "mantenimiento"}
                className="w-full border rounded-xl px-4 py-3 bg-white disabled:bg-slate-100"
              >
                <option value="">Seleccione tipo</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Extraordinario">Extraordinario</option>
                <option value="Mora">Mora</option>
                <option value="Multa">Multa</option>
                <option value="Reparación">Reparación</option>
                <option value="Otros">Otros</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Monto RD$
              </label>

              <input
                type="number"
                step="0.01"
                value={
                  modoCargo === "mantenimiento"
                    ? configuracion?.cuota_ordinaria || ""
                    : monto
                }
                onChange={(e) => {
                  setMonto(e.target.value);
                  setMensaje("");
                }}
                disabled={modoCargo === "mantenimiento"}
                className="w-full border rounded-xl px-4 py-3 disabled:bg-slate-100"
                placeholder="0.00"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-semibold mb-2">
                Concepto
              </label>

              <input
                type="text"
                value={modoCargo === "mantenimiento" ? "Mantenimiento" : concepto}
                onChange={(e) => {
                  setConcepto(e.target.value);
                  setMensaje("");
                }}
                disabled={modoCargo === "mantenimiento"}
                className="w-full border rounded-xl px-4 py-3 disabled:bg-slate-100"
                placeholder="Ej. Reparación puerta principal, multa, cargo extraordinario..."
              />
            </div>

           
            {mensaje && (
              <div className="md:col-span-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm">
                {mensaje}
              </div>
            )}

            <div className="md:col-span-3 flex flex-col md:flex-row gap-3">
              <button
                type="submit"
                disabled={guardando}
                className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-bold"
              >
                {guardando
                  ? "Guardando..."
                  : modoCargo === "individual"
                  ? "Guardar cargo individual"
                  : modoCargo === "masivo"
                  ? "Guardar cargo masivo"
                  : "Generar mantenimiento mensual"}
              </button>

              <button
                type="button"
                onClick={limpiarFormulario}
                className="bg-slate-600 hover:bg-slate-700 text-white px-5 py-3 rounded-xl font-bold"
              >
                Limpiar
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-bold">Últimos cargos registrados</h2>
            <p className="text-sm text-slate-500">
              Muestra los últimos 100 cargos del condominio activo.
            </p>
          </div>

          {loading ? (
            <div className="p-5 text-slate-500">Cargando cargos...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">Apartamento</th>
                    <th className="px-4 py-3 text-left">Periodo</th>
                    <th className="px-4 py-3 text-left">Concepto</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3 text-right">Pagado</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-center">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {cargos.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-4 py-3">{c.id}</td>

                      <td className="px-4 py-3 font-semibold">
                        {obtenerCodigoUnidad(c.unidad_id)}
                      </td>

                      <td className="px-4 py-3">{c.periodo}</td>

                      <td className="px-4 py-3">{c.concepto}</td>

                      <td className="px-4 py-3">{c.tipo_cargo}</td>

                      <td className="px-4 py-3 text-right">
                        RD$ {dinero(c.monto)}
                      </td>

                      <td className="px-4 py-3 text-right text-green-700 font-semibold">
                        RD$ {dinero(c.monto_pagado)}
                      </td>

                      <td className="px-4 py-3 text-right text-red-600 font-bold">
                        RD$ {dinero(c.balance)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={
                            c.estado === "PAGADO"
                              ? "bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-bold"
                              : c.estado === "PARCIAL"
                              ? "bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg text-xs font-bold"
                              : "bg-red-100 text-red-700 px-2 py-1 rounded-lg text-xs font-bold"
                          }
                        >
                          {c.estado}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {Number(c.monto_pagado || 0) === 0 ? (
                          <button
                            type="button"
                            onClick={() => borrarCargo(c)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs"
                          >
                            Borrar
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Con pago
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {cargos.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        No hay cargos registrados para este condominio.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}