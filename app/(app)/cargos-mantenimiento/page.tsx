"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";

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

type Unidad = {
  id: number;
  codigo: string;
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

export default function CargoMantenimientoPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [configuracion, setConfiguracion] =
    useState<ConfiguracionCargo | null>(null);

  const [periodo, setPeriodo] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      router.push("/login");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre || `Condominio ID ${id}`);

    const hoy = new Date();
    const periodoActual = `${hoy.getFullYear()}-${String(
      hoy.getMonth() + 1
    ).padStart(2, "0")}`;

    setPeriodo(periodoActual);

    cargarConfiguracion(id);
    cargarUnidades(id);
    cargarCargos(id);
  }, [router]);

  async function cargarConfiguracion(id: string) {
    const { data, error } = await supabase
      .from("configuracion_cargos")
      .select("*")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .maybeSingle();

    if (error) {
      alert("Error cargando configuración de cargos: " + error.message);
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
      alert("Error cargando unidades: " + error.message);
      return;
    }

    setUnidades(data || []);
  }

  async function cargarCargos(id: string) {
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
      .order("id", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando cargos: " + error.message);
      return;
    }

    setCargos((data as Cargo[]) || []);
  }

  function obtenerAnioMes(periodoCargo: string) {
    const [anioTexto, mesTexto] = periodoCargo.split("-");

    return {
      anio: Number(anioTexto),
      mes: Number(mesTexto),
    };
  }

  async function generarCargos() {
    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!configuracion) {
      alert(
        "Debe configurar primero la cuota ordinaria en Configuración de Cargos."
      );
      return;
    }

    if (!periodo) {
      alert("Debe indicar el período.");
      return;
    }

    if (!unidades.length) {
      alert("No existen unidades activas para este condominio.");
      return;
    }

    const cuota = Number(configuracion.cuota_ordinaria || 0);

    if (cuota <= 0) {
      alert("La cuota ordinaria configurada no es válida.");
      return;
    }

    const { anio, mes } = obtenerAnioMes(periodo);

    if (!anio || !mes) {
      alert("El período seleccionado no es válido.");
      return;
    }

    const { data: cargosExistentes, error: errorExiste } = await supabase
      .from("cargos_periodicos")
      .select("id")
      .eq("condominio_id", Number(condominioId))
      .eq("periodo", periodo)
      .eq("concepto", "Mantenimiento")
      .eq("tipo_cargo", "Mantenimiento")
      .limit(1);

    if (errorExiste) {
      alert("Error validando cargos existentes: " + errorExiste.message);
      return;
    }

    if (cargosExistentes && cargosExistentes.length > 0) {
      alert(
        `Ya existen cargos de mantenimiento generados para el período ${periodo}. No se duplicarán cargos.`
      );
      return;
    }

    const confirmar = confirm(
      `¿Desea generar el mantenimiento del período ${periodo} para ${
        unidades.length
      } apartamentos por RD$ ${cuota.toLocaleString("es-DO", {
        minimumFractionDigits: 2,
      })} cada uno?`
    );

    if (!confirmar) return;

    setLoading(true);

    const cargosInsertar = unidades.map((u) => ({
      condominio_id: Number(condominioId),
      unidad_id: u.id,
      anio,
      mes,
      periodo,
      concepto: "Mantenimiento",
      tipo_cargo: "Mantenimiento",
      monto: cuota,
      monto_pagado: 0,
      balance: cuota,
      estado: "PENDIENTE",
    }));

    const { error } = await supabase
      .from("cargos_periodicos")
      .insert(cargosInsertar);

    if (error) {
      setLoading(false);
      alert("Error generando cargos: " + error.message);
      return;
    }

    const { error: errorCreditos } = await supabase.rpc(
      "aplicar_creditos_a_cargos",
      {
        p_condominio_id: Number(condominioId),
      }
    );

    setLoading(false);

    if (errorCreditos) {
      alert(
        "Cargos generados, pero no se pudieron aplicar los créditos a favor: " +
          errorCreditos.message
      );

      cargarCargos(condominioId);
      return;
    }

    alert("Cargos generados correctamente y créditos aplicados.");
    cargarCargos(condominioId);
  }

  async function aplicarMora() {
    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!configuracion) {
      alert("No existe configuración de cargos para este condominio.");
      return;
    }

    if (!configuracion.mora_activa) {
      alert("La mora no está activa en Configuración de Cargos.");
      return;
    }

    if (!periodo) {
      alert("Debe indicar el período para aplicar mora.");
      return;
    }

    const porcentaje = Number(configuracion.porcentaje_mora || 0);

    if (porcentaje <= 0) {
      alert("El porcentaje de mora configurado no es válido.");
      return;
    }

    const cargosPendientes = cargos.filter(
      (c) =>
        c.periodo === periodo &&
        (c.estado === "PENDIENTE" ||
          c.estado === "PARCIAL" ||
          c.estado === "EN MORA") &&
        Number(c.balance || 0) > 0 &&
        c.tipo_cargo === "Mantenimiento"
    );

    if (cargosPendientes.length === 0) {
      alert("No hay cargos pendientes para aplicar mora en este período.");
      return;
    }

    const confirmar = confirm(
      `¿Aplicar ${porcentaje}% de mora a ${cargosPendientes.length} cargos pendientes del período ${periodo}?`
    );

    if (!confirmar) return;

    setLoading(true);

    for (const cargo of cargosPendientes) {
      const conceptoMora = `Mora ${periodo}`;
      const montoMora = Number(cargo.monto || 0) * (porcentaje / 100);

      const { data: moraExistente } = await supabase
        .from("cargos_periodicos")
        .select("id")
        .eq("condominio_id", Number(condominioId))
        .eq("unidad_id", cargo.unidad_id)
        .eq("periodo", periodo)
        .eq("concepto", conceptoMora)
        .eq("tipo_cargo", "Mora")
        .limit(1);

      if (moraExistente && moraExistente.length > 0) {
        continue;
      }

      await supabase.from("cargos_periodicos").insert([
        {
          condominio_id: Number(condominioId),
          unidad_id: cargo.unidad_id,
          anio: cargo.anio,
          mes: cargo.mes,
          periodo,
          concepto: conceptoMora,
          tipo_cargo: "Mora",
          monto: montoMora,
          monto_pagado: 0,
          balance: montoMora,
          estado: "PENDIENTE",
        },
      ]);
    }

    const { error: errorCreditos } = await supabase.rpc(
      "aplicar_creditos_a_cargos",
      {
        p_condominio_id: Number(condominioId),
      }
    );

    setLoading(false);

    if (errorCreditos) {
      alert(
        "Mora aplicada, pero no se pudieron aplicar los créditos a favor: " +
          errorCreditos.message
      );
      cargarCargos(condominioId);
      return;
    }

    alert("Mora aplicada correctamente.");
    cargarCargos(condominioId);
  }

  function dinero(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  function obtenerCodigoUnidad(unidadId: number) {
    const unidad = unidades.find((u) => Number(u.id) === Number(unidadId));
    return unidad?.codigo || `Unidad ${unidadId}`;
  }

  const cargosDelPeriodo = periodo
    ? cargos.filter((c) => c.periodo === periodo)
    : cargos;

  const totalBalance = cargosDelPeriodo.reduce(
    (sum, c) => sum + Number(c.balance || 0),
    0
  );

  const totalPagado = cargosDelPeriodo.reduce(
    (sum, c) => sum + Number(c.monto_pagado || 0),
    0
  );

  const totalCargado = cargosDelPeriodo.reduce(
    (sum, c) => sum + Number(c.monto || 0),
    0
  );

  const pendientes = cargosDelPeriodo.filter(
    (c) => c.estado === "PENDIENTE"
  ).length;

  const parciales = cargosDelPeriodo.filter(
    (c) => c.estado === "PARCIAL"
  ).length;

  const pagados = cargosDelPeriodo.filter((c) => c.estado === "PAGADO").length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <h1 className="text-3xl font-bold text-slate-800">
          Cargo Mantenimiento
        </h1>

        <p className="text-slate-500 mt-1">
          Generación mensual de mantenimiento usando cargos_periodicos y
          aplicación automática de créditos a favor.
        </p>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Condominio activo
        </p>

        <p className="font-bold text-slate-800 mt-1">
          {condominioNombre || "No seleccionado"}
        </p>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">Configuración vigente</h2>

        {configuracion ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-slate-50 border rounded-xl p-4">
              <p className="text-slate-500">Cuota ordinaria</p>
              <p className="font-black text-xl text-blue-700">
                RD$ {dinero(configuracion.cuota_ordinaria)}
              </p>
            </div>

            <div className="bg-slate-50 border rounded-xl p-4">
              <p className="text-slate-500">Día límite pago</p>
              <p className="font-black text-xl">
                {configuracion.dia_limite_pago}
              </p>
            </div>

            <div className="bg-slate-50 border rounded-xl p-4">
              <p className="text-slate-500">Inicio mora</p>
              <p className="font-black text-xl">
                Día {configuracion.dia_inicio_mora}
              </p>
            </div>

            <div className="bg-slate-50 border rounded-xl p-4">
              <p className="text-slate-500">Mora</p>
              <p className="font-black text-xl text-red-700">
                {configuracion.mora_activa
                  ? `${configuracion.porcentaje_mora}%`
                  : "Inactiva"}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4">
            No existe configuración de cargos para este condominio. Primero debe
            crearla en Configuración de Cargos.
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <h2 className="text-lg font-bold mb-5">Generar cargos del mes</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Período
            </label>

            <input
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={generarCargos}
              disabled={loading || !configuracion}
              className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white rounded-xl px-5 py-3 w-full font-bold"
            >
              {loading ? "Procesando..." : "Generar mantenimiento"}
            </button>
          </div>

          <div className="flex items-end">
            <button
              onClick={aplicarMora}
              disabled={loading || !configuracion}
              className="bg-red-700 hover:bg-red-800 disabled:bg-slate-400 text-white rounded-xl px-5 py-3 w-full font-bold"
            >
              Aplicar mora
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-3">
          El sistema valida si ya existen cargos de mantenimiento del mismo
          período para evitar duplicados.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Pendientes</p>
          <h2 className="text-3xl font-bold text-yellow-600 mt-2">
            {pendientes}
          </h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Parciales</p>
          <h2 className="text-3xl font-bold text-blue-600 mt-2">
            {parciales}
          </h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Pagados</p>
          <h2 className="text-3xl font-bold text-green-600 mt-2">
            {pagados}
          </h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Total cargado</p>
          <h2 className="text-3xl font-bold text-slate-800 mt-2">
            RD$ {dinero(totalCargado)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Total balance</p>
          <h2 className="text-3xl font-bold text-red-700 mt-2">
            RD$ {dinero(totalBalance)}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <p className="text-sm text-slate-500">Total pagado / aplicado</p>
        <h2 className="text-3xl font-bold text-green-700 mt-2">
          RD$ {dinero(totalPagado)}
        </h2>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="font-bold">Listado de cargos</h2>
            <p className="text-sm text-slate-500">
              Mostrando cargos del período seleccionado desde cargos_periodicos.
            </p>
          </div>

          <div className="text-sm bg-slate-100 rounded-xl px-4 py-2">
            Período: <strong>{periodo || "Todos"}</strong>
          </div>
        </div>

        {loading ? (
          <div className="p-6">Cargando cargos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3">Unidad</th>
                  <th className="text-left px-4 py-3">Período</th>
                  <th className="text-left px-4 py-3">Concepto</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-right px-4 py-3">Monto</th>
                  <th className="text-right px-4 py-3">Pagado</th>
                  <th className="text-right px-4 py-3">Balance</th>
                  <th className="text-center px-4 py-3">Estado</th>
                </tr>
              </thead>

              <tbody>
                {cargosDelPeriodo.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">
                      {obtenerCodigoUnidad(c.unidad_id)}
                    </td>

                    <td className="px-4 py-3">{c.periodo}</td>

                    <td className="px-4 py-3">{c.concepto}</td>

                    <td className="px-4 py-3">{c.tipo_cargo}</td>

                    <td className="px-4 py-3 text-right">
                      RD$ {dinero(c.monto)}
                    </td>

                    <td className="px-4 py-3 text-right text-green-700">
                      RD$ {dinero(c.monto_pagado)}
                    </td>

                    <td className="px-4 py-3 text-right font-bold">
                      RD$ {dinero(c.balance)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {c.estado === "PAGADO" ? (
                        <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full">
                          Pagado
                        </span>
                      ) : c.estado === "PARCIAL" ? (
                        <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full">
                          Parcial
                        </span>
                      ) : (
                        <span className="bg-yellow-100 text-yellow-700 text-xs px-3 py-1 rounded-full">
                          Pendiente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {!loading && cargosDelPeriodo.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay cargos registrados para este período.
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