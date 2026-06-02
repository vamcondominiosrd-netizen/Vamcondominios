"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Cargo = {
  id: number;
  periodo: string;
  monto_base: number;
  recargo_aplicado: number;
  balance: number;
  estado: string;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  unidades: {
    codigo: string;
  } | null;
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
    setCondominioNombre(nombre);

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
      .from("cargos")
      .select(`
        id,
        periodo,
        monto_base,
        recargo_aplicado,
        balance,
        estado,
        fecha_emision,
        fecha_vencimiento,
        unidades (
          codigo
        )
      `)
      .eq("condominio_id", Number(id))
      .order("fecha_emision", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando cargos: " + error.message);
      return;
    }

    setCargos((data as Cargo[]) || []);
  }

  function calcularFechaVencimiento(periodoCargo: string) {
    const [anio, mes] = periodoCargo.split("-").map(Number);
    const diaLimite = Number(configuracion?.dia_limite_pago || 5);

    return new Date(anio, mes - 1, diaLimite).toISOString().slice(0, 10);
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

    const { data: cargosExistentes, error: errorExiste } = await supabase
      .from("cargos")
      .select("id")
      .eq("condominio_id", Number(condominioId))
      .eq("periodo", periodo)
      .limit(1);

    if (errorExiste) {
      alert("Error validando cargos existentes: " + errorExiste.message);
      return;
    }

    if (cargosExistentes && cargosExistentes.length > 0) {
      alert(
        `Ya existen cargos generados para el período ${periodo}. No se duplicarán cargos.`
      );
      return;
    }

    const confirmar = confirm(
      `¿Desea generar los cargos del período ${periodo} para ${unidades.length} unidades por RD$ ${cuota.toLocaleString(
        "es-DO"
      )} cada una?`
    );

    if (!confirmar) return;

    setLoading(true);

    const fechaVencimiento = calcularFechaVencimiento(periodo);

    const cargosInsertar = unidades.map((u) => ({
    client_id: Number(condominioId),
    condominio_id: Number(condominioId),
    unidad_id: u.id,
    periodo,
    monto_base: cuota,
    recargo_aplicado: 0,
    balance: cuota,
    estado: "Pendiente",
    fecha_emision: new Date().toISOString().slice(0, 10),
    fecha_vencimiento: fechaVencimiento,
    }));

    const { error } = await supabase.from("cargos").insert(cargosInsertar);

    setLoading(false);

    if (error) {
      alert("Error generando cargos: " + error.message);
      return;
    }

    alert("Cargos generados correctamente.");
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
        (c.estado === "Pendiente" || c.estado === "En mora") &&
        Number(c.balance || 0) > 0
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
      const moraAnterior = Number(cargo.recargo_aplicado || 0);

      if (moraAnterior > 0) {
        continue;
      }

      const mora = Number(cargo.monto_base || 0) * (porcentaje / 100);
      const nuevoBalance = Number(cargo.balance || 0) + mora;

      await supabase
        .from("cargos")
        .update({
          recargo_aplicado: mora,
          balance: nuevoBalance,
          estado: "En mora",
        })
        .eq("id", cargo.id)
        .eq("condominio_id", Number(condominioId));
    }

    setLoading(false);

    alert("Mora aplicada correctamente.");
    cargarCargos(condominioId);
  }

  function dinero(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  const totalBalance = cargos.reduce(
    (sum, c) => sum + Number(c.balance || 0),
    0
  );

  const totalMora = cargos.reduce(
    (sum, c) => sum + Number(c.recargo_aplicado || 0),
    0
  );

  const pendientes = cargos.filter((c) => c.estado === "Pendiente").length;
  const enMora = cargos.filter((c) => c.estado === "En mora").length;
  const pagados = cargos.filter((c) => c.estado === "Pagado").length;

  const cargosDelPeriodo = periodo
    ? cargos.filter((c) => c.periodo === periodo)
    : cargos;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <h1 className="text-3xl font-bold text-slate-800">
          Cargo Mantenimiento
        </h1>

        <p className="text-slate-500 mt-1">
          Generación y control de cargos mensuales del condominio activo.
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
          El sistema valida si ya existen cargos del mismo período para evitar
          duplicados.
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
          <p className="text-sm text-slate-500">En mora</p>
          <h2 className="text-3xl font-bold text-red-600 mt-2">{enMora}</h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Pagados</p>
          <h2 className="text-3xl font-bold text-green-600 mt-2">
            {pagados}
          </h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Total mora</p>
          <h2 className="text-3xl font-bold text-red-700 mt-2">
            RD$ {dinero(totalMora)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Total balance</p>
          <h2 className="text-3xl font-bold text-slate-800 mt-2">
            RD$ {dinero(totalBalance)}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="font-bold">Listado de cargos</h2>
            <p className="text-sm text-slate-500">
              Mostrando cargos del período seleccionado.
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
                  <th className="text-right px-4 py-3">Cuota</th>
                  <th className="text-right px-4 py-3">Mora</th>
                  <th className="text-right px-4 py-3">Balance</th>
                  <th className="text-center px-4 py-3">Estado</th>
                </tr>
              </thead>

              <tbody>
                {cargosDelPeriodo.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">
                      {c.unidades?.codigo || "-"}
                    </td>

                    <td className="px-4 py-3">{c.periodo}</td>

                    <td className="px-4 py-3 text-right">
                      RD$ {dinero(c.monto_base)}
                    </td>

                    <td className="px-4 py-3 text-right text-red-600">
                      RD$ {dinero(c.recargo_aplicado)}
                    </td>

                    <td className="px-4 py-3 text-right font-bold">
                      RD$ {dinero(c.balance)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {c.estado === "Pagado" ? (
                        <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full">
                          Pagado
                        </span>
                      ) : c.estado === "En mora" ? (
                        <span className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full">
                          En mora
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
                      colSpan={6}
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