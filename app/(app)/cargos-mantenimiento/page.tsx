"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";

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

type CargoPeriodico = {
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

export default function CargoMantenimientoPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [cargos, setCargos] = useState<CargoPeriodico[]>([]);
  const [configuracion, setConfiguracion] =
    useState<ConfiguracionCargo | null>(null);

  const [periodo, setPeriodo] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      router.push("/login");
      return;
    }

    const hoy = new Date();
    const periodoActual = `${hoy.getFullYear()}-${String(
      hoy.getMonth() + 1
    ).padStart(2, "0")}`;

    setCondominioId(id);
    setCondominioNombre(nombre || `Condominio ID ${id}`);
    setPeriodo(periodoActual);

    cargarTodo(id);
  }, [router]);

  async function cargarTodo(id: string) {
    await Promise.all([
      cargarConfiguracion(id),
      cargarUnidades(id),
      cargarCargos(id),
    ]);
  }

  async function cargarConfiguracion(id: string) {
    const { data, error } = await supabase
      .from("configuracion_cargos")
      .select(
        "id, condominio_id, cuota_ordinaria, dia_limite_pago, dia_inicio_mora, porcentaje_mora, mora_activa, activa"
      )
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .maybeSingle();

    if (error) {
      setMensaje("Error cargando configuración de cargos: " + error.message);
      return;
    }

    setConfiguracion((data as ConfiguracionCargo) || null);
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
    setLoading(true);

    const { data, error } = await supabase
      .from("cargos_periodicos")
      .select(
        "id, condominio_id, unidad_id, anio, mes, periodo, concepto, tipo_cargo, monto, monto_pagado, balance, estado, created_at"
      )
      .eq("condominio_id", Number(id))
      .order("periodo", { ascending: false })
      .order("id", { ascending: false });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando cargos: " + error.message);
      return;
    }

    setCargos((data as CargoPeriodico[]) || []);
  }

  function obtenerCodigoUnidad(unidadId: number) {
    const unidad = unidades.find((u) => Number(u.id) === Number(unidadId));
    return unidad?.codigo || `Unidad ${unidadId}`;
  }

  function separarPeriodo(valor: string) {
    const [anioTexto, mesTexto] = valor.split("-");
    return {
      anio: Number(anioTexto),
      mes: Number(mesTexto),
    };
  }

  async function generarCargos() {
    setMensaje("");

    if (!condominioId) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    if (!periodo) {
      setMensaje("Debe indicar el período.");
      return;
    }

    if (!configuracion) {
      setMensaje(
        "Debe configurar primero la cuota ordinaria en Configuración de Cargos."
      );
      return;
    }

    if (!unidades.length) {
      setMensaje("No existen apartamentos activos para este condominio.");
      return;
    }

    const cuota = Number(configuracion.cuota_ordinaria || 0);

    if (cuota <= 0) {
      setMensaje("La cuota ordinaria configurada no es válida.");
      return;
    }

    const { anio, mes } = separarPeriodo(periodo);

    if (!anio || !mes) {
      setMensaje("El período seleccionado no es válido.");
      return;
    }

    const { data: existentes, error: errorExiste } = await supabase
      .from("cargos_periodicos")
      .select("id")
      .eq("condominio_id", Number(condominioId))
      .eq("periodo", periodo)
      .eq("tipo_cargo", "MANTENIMIENTO")
      .limit(1);

    if (errorExiste) {
      setMensaje("Error validando cargos existentes: " + errorExiste.message);
      return;
    }

    if (existentes && existentes.length > 0) {
      setMensaje(
        `Ya existen cargos de mantenimiento generados para el período ${periodo}.`
      );
      return;
    }

    const confirmar = confirm(
      `¿Desea generar el mantenimiento ${periodo} para ${unidades.length} apartamentos del condominio ${condominioNombre}?`
    );

    if (!confirmar) return;

    setLoading(true);

    const registros = unidades.map((u) => ({
      condominio_id: Number(condominioId),
      unidad_id: u.id,
      anio,
      mes,
      periodo,
      concepto: `Mantenimiento ${periodo}`,
      tipo_cargo: "MANTENIMIENTO",
      monto: cuota,
      monto_pagado: 0,
      balance: cuota,
      estado: "PENDIENTE",
    }));

    const { error } = await supabase
      .from("cargos_periodicos")
      .insert(registros);

    if (error) {
      setLoading(false);
      setMensaje("Error generando cargos: " + error.message);
      return;
    }

    await supabase.rpc("aplicar_creditos_a_cargos", {
      p_condominio_id: Number(condominioId),
    });

    setLoading(false);

    setMensaje(
      `Cargos de mantenimiento generados correctamente para ${condominioNombre}.`
    );

    cargarCargos(condominioId);
  }

  async function aplicarMora() {
    setMensaje("");

    if (!condominioId) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    if (!periodo) {
      setMensaje("Debe indicar el período.");
      return;
    }

    if (!configuracion) {
      setMensaje("No existe configuración de cargos para este condominio.");
      return;
    }

    if (!configuracion.mora_activa) {
      setMensaje("La mora no está activa en Configuración de Cargos.");
      return;
    }

    const porcentaje = Number(configuracion.porcentaje_mora || 0);

    if (porcentaje <= 0) {
      setMensaje("El porcentaje de mora configurado no es válido.");
      return;
    }

    const cargosPendientes = cargos.filter((c) => {
      const estado = String(c.estado || "").toUpperCase();

      return (
        c.periodo === periodo &&
        c.tipo_cargo === "MANTENIMIENTO" &&
        estado !== "PAGADO" &&
        Number(c.balance || 0) > 0
      );
    });

    if (cargosPendientes.length === 0) {
      setMensaje("No hay cargos pendientes para aplicar mora en este período.");
      return;
    }

    const { data: morasExistentes, error: errorMoras } = await supabase
      .from("cargos_periodicos")
      .select("id")
      .eq("condominio_id", Number(condominioId))
      .eq("periodo", periodo)
      .eq("tipo_cargo", "MORA")
      .limit(1);

    if (errorMoras) {
      setMensaje("Error validando moras existentes: " + errorMoras.message);
      return;
    }

    if (morasExistentes && morasExistentes.length > 0) {
      setMensaje(`Ya existen cargos de mora registrados para ${periodo}.`);
      return;
    }

    const confirmar = confirm(
      `¿Aplicar ${porcentaje}% de mora a ${cargosPendientes.length} cargos pendientes del período ${periodo}?`
    );

    if (!confirmar) return;

    setLoading(true);

    const { anio, mes } = separarPeriodo(periodo);

    const registrosMora = cargosPendientes.map((c) => {
      const mora = Number(c.monto || 0) * (porcentaje / 100);

      return {
        condominio_id: Number(condominioId),
        unidad_id: c.unidad_id,
        anio,
        mes,
        periodo,
        concepto: `Mora ${periodo}`,
        tipo_cargo: "MORA",
        monto: mora,
        monto_pagado: 0,
        balance: mora,
        estado: "PENDIENTE",
      };
    });

    const { error } = await supabase
      .from("cargos_periodicos")
      .insert(registrosMora);

    if (error) {
      setLoading(false);
      setMensaje("Error aplicando mora: " + error.message);
      return;
    }

    setLoading(false);

    setMensaje("Mora aplicada correctamente.");
    cargarCargos(condominioId);
  }

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  function estadoVisual(estado: string) {
    const valor = String(estado || "").toUpperCase();

    if (valor === "PAGADO") {
      return "bg-green-100 text-green-700";
    }

    if (valor === "PARCIAL") {
      return "bg-blue-100 text-blue-700";
    }

    if (valor === "EN_MORA") {
      return "bg-red-100 text-red-700";
    }

    return "bg-yellow-100 text-yellow-700";
  }

  const cargosDelPeriodo = periodo
    ? cargos.filter((c) => c.periodo === periodo)
    : cargos;

  const totalBalance = cargosDelPeriodo.reduce(
    (sum, c) => sum + Number(c.balance || 0),
    0
  );

  const totalFacturado = cargosDelPeriodo.reduce(
    (sum, c) => sum + Number(c.monto || 0),
    0
  );

  const totalPagado = cargosDelPeriodo.reduce(
    (sum, c) => sum + Number(c.monto_pagado || 0),
    0
  );

  const pendientes = cargosDelPeriodo.filter((c) => {
    const estado = String(c.estado || "").toUpperCase();
    return estado === "PENDIENTE";
  }).length;

  const parciales = cargosDelPeriodo.filter((c) => {
    const estado = String(c.estado || "").toUpperCase();
    return estado === "PARCIAL";
  }).length;

  const pagados = cargosDelPeriodo.filter((c) => {
    const estado = String(c.estado || "").toUpperCase();
    return estado === "PAGADO";
  }).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <h1 className="text-3xl font-bold text-slate-800">
          Cargo Mantenimiento
        </h1>

        <p className="text-slate-500 mt-1">
          Generación de cargos mensuales por condominio.
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
            No existe configuración de cargos para este condominio.
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <h2 className="text-lg font-bold mb-5">Generar cargos del mes</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Período</label>

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
              {loading ? "Procesando..." : "Generar cargos"}
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
          El sistema genera cargos solamente para el condominio activo y evita
          duplicados por período.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Total cargos</p>
          <h2 className="text-3xl font-bold text-slate-800 mt-2">
            {cargosDelPeriodo.length}
          </h2>
        </div>

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
          <p className="text-sm text-slate-500">Balance</p>
          <h2 className="text-3xl font-bold text-red-700 mt-2">
            RD$ {dinero(totalBalance)}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Total facturado</p>
            <p className="text-xl font-black">
              RD$ {dinero(totalFacturado)}
            </p>
          </div>

          <div>
            <p className="text-slate-500">Total pagado</p>
            <p className="text-xl font-black text-green-700">
              RD$ {dinero(totalPagado)}
            </p>
          </div>

          <div>
            <p className="text-slate-500">Balance pendiente</p>
            <p className="text-xl font-black text-red-700">
              RD$ {dinero(totalBalance)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="font-bold">Listado de cargos</h2>
            <p className="text-sm text-slate-500">
              Mostrando cargos del condominio activo.
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
                  <th className="text-left px-4 py-3">Apartamento</th>
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

                    <td className="px-4 py-3 text-right font-bold text-red-700">
                      RD$ {dinero(c.balance)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`${estadoVisual(
                          c.estado
                        )} text-xs px-3 py-1 rounded-full font-bold`}
                      >
                        {c.estado}
                      </span>
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