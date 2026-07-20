"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Cargo = {
  id: number;
  condominio: string;
  no_apartamento: string;
  anio: number;
  mes: string;
  cuota_mensual: number;
  mora: number;
  total_cargo: number;
  monto_pagado: number;
  fecha_pago: string | null;
  estado: string;
};

type Propietario = {
  id: number;
  condominio: string;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string;
};

type Condominio = {
  id: number;
  nombre: string;
};

export default function EstadoCuentaPage() {
  const [loading, setLoading] = useState(false);
  const [loadingCondominios, setLoadingCondominios] = useState(false);

  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [condominio, setCondominio] = useState("");
  const [apartamento, setApartamento] = useState("");
  const [cedula, setCedula] = useState("");

  const [propietario, setPropietario] = useState<Propietario | null>(null);
  const [cargos, setCargos] = useState<Cargo[]>([]);

  useEffect(() => {
    cargarCondominios();
  }, []);

  async function cargarCondominios() {
    setLoadingCondominios(true);

    const { data, error } = await supabase
      .from("condominios")
      .select("id, nombre")
      .eq("estado", "activo")
      .order("nombre", { ascending: true });

    setLoadingCondominios(false);

    if (error) {
      alert("Error cargando condominios: " + error.message);
      return;
    }

    setCondominios(data || []);
  }

  async function consultarEstadoCuenta(e: React.FormEvent) {
    e.preventDefault();

    if (!condominio || !apartamento || !cedula) {
      alert("Debe completar condominio, apartamento y cédula.");
      return;
    }

    setLoading(true);
    setPropietario(null);
    setCargos([]);

    const apartamentoNormalizado = apartamento.trim();
    const cedulaNormalizada = cedula.trim();

    const { data: propietarioData, error } = await supabase
      .from("propietarios_apartamentos")
      .select("id, condominio, no_apartamento, nombre_propietario, cedula")
      .eq("condominio", condominio)
      .ilike("no_apartamento", apartamentoNormalizado)
      .eq("cedula", cedulaNormalizada)
      .maybeSingle();

    if (error) {
      setLoading(false);
      alert("Error validando propietario: " + error.message);
      return;
    }

    if (!propietarioData) {
      setLoading(false);
      alert("Propietario no encontrado con esos datos.");
      return;
    }

    setPropietario(propietarioData);

    const { data: cargosData, error: errorCargos } = await supabase
      .from("cargos_mantenimiento")
      .select(
        "id, condominio, no_apartamento, anio, mes, cuota_mensual, mora, total_cargo, monto_pagado, fecha_pago, estado"
      )
      .eq("condominio", propietarioData.condominio)
      .eq("no_apartamento", propietarioData.no_apartamento)
      .order("anio", { ascending: false })
      .order("id", { ascending: false });

    setLoading(false);

    if (errorCargos) {
      alert("Error cargando estado de cuenta: " + errorCargos.message);
      return;
    }

    setCargos(cargosData || []);
  }

  function limpiarConsulta() {
    setPropietario(null);
    setCargos([]);
    setApartamento("");
    setCedula("");
  }

  const balancePendiente = cargos
    .filter((c) => c.estado !== "Pagado")
    .reduce((sum, c) => sum + Number(c.total_cargo || 0), 0);

  const totalPagado = cargos
    .filter((c) => c.estado === "Pagado")
    .reduce((sum, c) => sum + Number(c.monto_pagado || 0), 0);

  const moraTotal = cargos.reduce(
    (sum, c) => sum + Number(c.mora || 0),
    0
  );

  const pendientes = cargos.filter((c) => c.estado !== "Pagado").length;

  function estadoColor(estado: string) {
    if (estado === "Pagado") return "bg-green-100 text-green-800";
    if (estado === "En mora") return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-slate-950 text-white rounded-2xl p-6 shadow">
          <h1 className="text-3xl font-bold">Estado de Cuenta</h1>
          <p className="text-slate-300 mt-1">
            Portal Financiero del Propietario
          </p>
        </div>

        {!propietario && (
          <div className="bg-white rounded-2xl p-6 shadow">
            <h2 className="text-xl font-bold mb-4">Validar propietario</h2>

            <form
              onSubmit={consultarEstadoCuenta}
              className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
              <select
                value={condominio}
                onChange={(e) => setCondominio(e.target.value)}
                className="border rounded-lg px-3 py-3 w-full"
                disabled={loadingCondominios}
              >
                <option value="">
                  {loadingCondominios
                    ? "Cargando condominios..."
                    : "Seleccione condominio"}
                </option>

                {condominios.map((c) => (
                  <option key={c.id} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={apartamento}
                onChange={(e) => setApartamento(e.target.value)}
                className="border rounded-lg px-3 py-3 w-full"
                placeholder="Apartamento"
              />

              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="border rounded-lg px-3 py-3 w-full"
                placeholder="Cédula"
              />

              <button
                type="submit"
                disabled={loading}
                className="bg-blue-700 text-white py-3 rounded-lg disabled:opacity-50"
              >
                {loading ? "Consultando..." : "Consultar"}
              </button>
            </form>

            {condominios.length === 0 && !loadingCondominios && (
              <p className="text-sm text-red-600 mt-4">
                No hay condominios activos registrados. Verifique el módulo de condominios.
              </p>
            )}
          </div>
        )}

        {propietario && (
          <>
            <div className="bg-white rounded-2xl p-5 shadow flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">
                  {propietario.nombre_propietario}
                </h2>
                <p className="text-slate-500">
                  {propietario.condominio} | Apto. {propietario.no_apartamento}
                </p>
              </div>

              <button
                onClick={limpiarConsulta}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg"
              >
                Nueva consulta
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow">
                <p className="text-sm text-slate-500">Balance pendiente</p>
                <h2 className="text-2xl font-bold text-red-700">
                  RD$
                  {balancePendiente.toLocaleString("es-DO", {
                    minimumFractionDigits: 2,
                  })}
                </h2>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow">
                <p className="text-sm text-slate-500">Total pagado</p>
                <h2 className="text-2xl font-bold text-green-700">
                  RD$
                  {totalPagado.toLocaleString("es-DO", {
                    minimumFractionDigits: 2,
                  })}
                </h2>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow">
                <p className="text-sm text-slate-500">Mora acumulada</p>
                <h2 className="text-2xl font-bold text-orange-700">
                  RD$
                  {moraTotal.toLocaleString("es-DO", {
                    minimumFractionDigits: 2,
                  })}
                </h2>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow">
                <p className="text-sm text-slate-500">Cuotas pendientes</p>
                <h2 className="text-2xl font-bold text-blue-700">
                  {pendientes}
                </h2>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow">
              <h2 className="text-xl font-bold mb-4">Historial financiero</h2>

              <div className="overflow-auto border rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border">Año</th>
                      <th className="p-2 border">Mes</th>
                      <th className="p-2 border">Cuota</th>
                      <th className="p-2 border">Mora</th>
                      <th className="p-2 border">Total</th>
                      <th className="p-2 border">Pagado</th>
                      <th className="p-2 border">Fecha pago</th>
                      <th className="p-2 border">Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {cargos.map((c) => (
                      <tr key={c.id}>
                        <td className="p-2 border">{c.anio}</td>
                        <td className="p-2 border font-semibold">{c.mes}</td>
                        <td className="p-2 border text-right">
                          RD$
                          {Number(c.cuota_mensual || 0).toLocaleString(
                            "es-DO",
                            { minimumFractionDigits: 2 }
                          )}
                        </td>
                        <td className="p-2 border text-right text-orange-700">
                          RD$
                          {Number(c.mora || 0).toLocaleString("es-DO", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-2 border text-right font-bold">
                          RD$
                          {Number(c.total_cargo || 0).toLocaleString(
                            "es-DO",
                            { minimumFractionDigits: 2 }
                          )}
                        </td>
                        <td className="p-2 border text-right text-green-700">
                          RD$
                          {Number(c.monto_pagado || 0).toLocaleString(
                            "es-DO",
                            { minimumFractionDigits: 2 }
                          )}
                        </td>
                        <td className="p-2 border">{c.fecha_pago || "-"}</td>
                        <td className="p-2 border">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoColor(
                              c.estado
                            )}`}
                          >
                            {c.estado}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {cargos.length === 0 && (
                      <tr>
                        <td className="p-4 border text-center" colSpan={8}>
                          No hay cargos registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
