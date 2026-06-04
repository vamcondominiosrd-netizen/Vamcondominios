"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Unidad = {
  id: number;
  codigo: string;
};

type Cargo = {
  id: number;
  periodo: string;
  concepto: string;
  tipo_cargo: string;
  monto: number;
  monto_pagado: number;
  balance: number;
  estado: string;
};

export default function ConsultaEstadoPage() {
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [unidadId, setUnidadId] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const idGuardado = localStorage.getItem("condominio_id") || "";
    const nombreGuardado = localStorage.getItem("condominio_nombre") || "";

    if (!idGuardado) {
      setMensaje(
        "No hay condominio seleccionado en la sesión. Debe iniciar sesión nuevamente."
      );
      return;
    }

    setCondominioId(idGuardado);
    setCondominioNombre(nombreGuardado || `Condominio ID ${idGuardado}`);

    cargarUnidades(idGuardado);
  }, []);

  async function cargarUnidades(id: string) {
    setUnidadId("");
    setCargos([]);
    setMensaje("");

    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(id))
      .order("codigo", { ascending: true });

    if (error) {
      setMensaje("Error cargando unidades: " + error.message);
      return;
    }

    setUnidades(data || []);
  }

  async function consultarEstado() {
    if (!condominioId || !unidadId) {
      setMensaje("Debe seleccionar una unidad/apartamento.");
      return;
    }

    setLoading(true);
    setMensaje("");
    setCargos([]);

    const { data, error } = await supabase
      .from("cargos_periodicos")
      .select(`
        id,
        periodo,
        concepto,
        tipo_cargo,
        monto,
        monto_pagado,
        balance,
        estado
      `)
      .eq("condominio_id", Number(condominioId))
      .eq("unidad_id", Number(unidadId))
      .order("periodo", { ascending: true });

    setLoading(false);

    if (error) {
      setMensaje("Error consultando estado: " + error.message);
      return;
    }

    setCargos((data as Cargo[]) || []);

    if (!data || data.length === 0) {
      setMensaje("No hay cargos registrados para esta unidad.");
    }
  }

  function limpiarConsulta() {
    setUnidadId("");
    setCargos([]);
    setMensaje("");
  }

  const unidadSeleccionada = unidades.find(
    (u) => String(u.id) === String(unidadId)
  );

  const totalFacturado = cargos.reduce(
    (sum, c) => sum + Number(c.monto || 0),
    0
  );

  const totalPagado = cargos.reduce(
    (sum, c) => sum + Number(c.monto_pagado || 0),
    0
  );

  const balancePendiente = cargos.reduce(
    (sum, c) => sum + Number(c.balance || 0),
    0
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h1 className="text-3xl font-bold">
            Consulta de Estado de Cuenta
          </h1>

          <p className="text-slate-500 mt-2">
            Consulte meses pagados, cargos y balance pendiente del condominio
            activo.
          </p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Condominio
              </label>

              <input
                type="text"
                value={condominioNombre || `Condominio ID ${condominioId}`}
                disabled
                className="w-full border rounded-xl px-4 py-3 bg-slate-100 text-slate-700"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Apartamento / Unidad
              </label>

              <select
                value={unidadId}
                onChange={(e) => {
                  setUnidadId(e.target.value);
                  setCargos([]);
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

            <div className="flex items-end gap-2">
              <button
                onClick={consultarEstado}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-3 rounded-xl w-full"
              >
                {loading ? "Consultando..." : "Consultar estado"}
              </button>

              <button
                onClick={limpiarConsulta}
                type="button"
                className="bg-slate-600 hover:bg-slate-700 text-white px-5 py-3 rounded-xl"
              >
                Limpiar
              </button>
            </div>
          </div>

          {unidadSeleccionada && (
            <div className="mt-5 bg-slate-50 border rounded-xl p-4 text-sm">
              <span className="text-slate-500">Unidad seleccionada:</span>{" "}
              <strong>{unidadSeleccionada.codigo}</strong>
            </div>
          )}

          <div className="mt-5 bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl p-4 text-sm">
            <p className="font-bold mb-2">Verificación de consulta</p>

            <p>
              <strong>condominio_id activo:</strong>{" "}
              {condominioId || "No definido"}
            </p>

            <p>
              <strong>condominio:</strong>{" "}
              {condominioNombre || "No definido"}
            </p>

            <p>
              <strong>unidad_id seleccionada:</strong>{" "}
              {unidadId || "No seleccionada"}
            </p>

            <p>
              <strong>apartamento:</strong>{" "}
              {unidadSeleccionada?.codigo || "No seleccionado"}
            </p>

            <p>
              <strong>registros encontrados:</strong> {cargos.length}
            </p>
          </div>

          {mensaje && (
            <div className="mt-5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm">
              {mensaje}
            </div>
          )}
        </div>

        {cargos.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border shadow-sm p-5">
                <p className="text-sm text-slate-500">Total facturado</p>

                <h2 className="text-2xl font-bold mt-2">
                  RD${" "}
                  {totalFacturado.toLocaleString("es-DO", {
                    minimumFractionDigits: 2,
                  })}
                </h2>
              </div>

              <div className="bg-white rounded-2xl border shadow-sm p-5">
                <p className="text-sm text-slate-500">Total pagado</p>

                <h2 className="text-2xl font-bold text-green-600 mt-2">
                  RD${" "}
                  {totalPagado.toLocaleString("es-DO", {
                    minimumFractionDigits: 2,
                  })}
                </h2>
              </div>

              <div className="bg-white rounded-2xl border shadow-sm p-5">
                <p className="text-sm text-slate-500">Balance pendiente</p>

                <h2 className="text-2xl font-bold text-red-600 mt-2">
                  RD${" "}
                  {balancePendiente.toLocaleString("es-DO", {
                    minimumFractionDigits: 2,
                  })}
                </h2>
              </div>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="font-bold">
                  Estado de cuenta detallado
                  {unidadSeleccionada ? ` - ${unidadSeleccionada.codigo}` : ""}
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Periodo</th>
                      <th className="px-4 py-3 text-left">Concepto</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-right">Facturado</th>
                      <th className="px-4 py-3 text-right">Pagado</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3 text-center">Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {cargos.map((c) => (
                      <tr key={c.id} className="border-t">
                        <td className="px-4 py-3 font-medium">{c.periodo}</td>

                        <td className="px-4 py-3">{c.concepto}</td>

                        <td className="px-4 py-3">{c.tipo_cargo}</td>

                        <td className="px-4 py-3 text-right">
                          RD${" "}
                          {Number(c.monto || 0).toLocaleString("es-DO", {
                            minimumFractionDigits: 2,
                          })}
                        </td>

                        <td className="px-4 py-3 text-right text-green-600 font-bold">
                          RD${" "}
                          {Number(c.monto_pagado || 0).toLocaleString(
                            "es-DO",
                            {
                              minimumFractionDigits: 2,
                            }
                          )}
                        </td>

                        <td className="px-4 py-3 text-right text-red-600 font-bold">
                          RD${" "}
                          {Number(c.balance || 0).toLocaleString("es-DO", {
                            minimumFractionDigits: 2,
                          })}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}