"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Pago = {
  id: number;
  condominio: string;
  no_apartamento: string;
  fecha_pago: string;
  mes_pagado: string;
  monto_pagado: number;
  metodo_pago: string;
  no_referencia: string;
  descripcion: string;
  comprobante_url: string;
  estado: string;
};

export default function PagosMantenimientoPage() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(false);

  const [condominio, setCondominio] = useState("");
  const [apartamento, setApartamento] = useState("");
  const [fechaPago, setFechaPago] = useState("");
  const [mesPagado, setMesPagado] = useState("");
  const [montoPagado, setMontoPagado] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [noReferencia, setNoReferencia] = useState("");
  const [descripcion, setDescripcion] = useState("");

  useEffect(() => {
    cargarPagos();
  }, []);

  async function cargarPagos() {
    setLoading(true);

    const { data, error } = await supabase
      .from("pagos_mantenimiento")
      .select("*")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando pagos: " + error.message);
      return;
    }

    setPagos(data || []);
  }

  async function guardarPago(e: React.FormEvent) {
    e.preventDefault();

    if (
      !condominio ||
      !apartamento ||
      !fechaPago ||
      !mesPagado ||
      !montoPagado
    ) {
      alert("Debe completar los datos requeridos.");
      return;
    }

    const { data: pagoInsertado, error } = await supabase
      .from("pagos_mantenimiento")
      .insert([
        {
          condominio,
          no_apartamento: apartamento,
          fecha_pago: fechaPago,
          mes_pagado: mesPagado,
          monto_pagado: Number(montoPagado),
          metodo_pago: metodoPago,
          no_referencia: noReferencia,
          descripcion,
          estado: "pagado",
        },
      ])
      .select()
      .single();

    if (error) {
      alert("Error guardando pago: " + error.message);
      return;
    }

    // ACTUALIZAR CARGO
    const { error: errorCargo } = await supabase
      .from("cargos_mantenimiento")
      .update({
        estado: "Pagado",
        monto_pagado: Number(montoPagado),
        fecha_pago: fechaPago,
        pago_id: pagoInsertado.id,
      })
      .eq("condominio", condominio)
      .eq("no_apartamento", apartamento)
      .eq("mes", mesPagado)
      .eq("estado", "Pendiente");

    if (errorCargo) {
      alert(
        "Pago registrado, pero ocurrió error actualizando cargo: " +
          errorCargo.message
      );
    }

    alert("Pago registrado correctamente.");

    setCondominio("");
    setApartamento("");
    setFechaPago("");
    setMesPagado("");
    setMontoPagado("");
    setMetodoPago("");
    setNoReferencia("");
    setDescripcion("");

    cargarPagos();
  }

  const totalPagado = pagos.reduce(
    (sum, p) => sum + Number(p.monto_pagado || 0),
    0
  );

  const meses = [
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Pagos de Mantenimiento
        </h1>

        <p className="text-slate-500">
          Registro y control de pagos de propietarios.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">
          Registrar pago
        </h2>

        <form
          onSubmit={guardarPago}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">
              Condominio *
            </label>

            <select
              value={condominio}
              onChange={(e) => setCondominio(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">Seleccione</option>
              <option value="Lote 9">Lote 9</option>
              <option value="Lote 11">Lote 11</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Apartamento *
            </label>

            <input
              type="text"
              value={apartamento}
              onChange={(e) => setApartamento(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Ej. A1"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Fecha pago *
            </label>

            <input
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Mes pagado *
            </label>

            <select
              value={mesPagado}
              onChange={(e) => setMesPagado(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">Seleccione mes</option>

              {meses.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Monto pagado *
            </label>

            <input
              type="number"
              step="0.01"
              value={montoPagado}
              onChange={(e) => setMontoPagado(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Método pago
            </label>

            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">Seleccione</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Depósito">Depósito</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              No. referencia
            </label>

            <input
              type="text"
              value={noReferencia}
              onChange={(e) => setNoReferencia(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Descripción
            </label>

            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="bg-blue-700 text-white px-5 py-2 rounded-lg hover:bg-blue-800"
            >
              Registrar pago
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total pagos registrados
          </p>

          <h2 className="text-2xl font-bold">
            {pagos.length}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total recaudado
          </p>

          <h2 className="text-2xl font-bold text-green-700">
            RD$
            {totalPagado.toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">
          Historial de pagos
        </h2>

        {loading ? (
          <p>Cargando pagos...</p>
        ) : (
          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Condominio</th>
                  <th className="p-2 border">Apartamento</th>
                  <th className="p-2 border">Fecha</th>
                  <th className="p-2 border">Mes</th>
                  <th className="p-2 border">Monto</th>
                  <th className="p-2 border">Método</th>
                  <th className="p-2 border">Referencia</th>
                </tr>
              </thead>

              <tbody>
                {pagos.map((p) => (
                  <tr key={p.id}>
                    <td className="p-2 border">{p.condominio}</td>
                    <td className="p-2 border font-semibold">
                      {p.no_apartamento}
                    </td>
                    <td className="p-2 border">{p.fecha_pago}</td>
                    <td className="p-2 border">{p.mes_pagado}</td>
                    <td className="p-2 border text-right font-bold text-green-700">
                      RD$
                      {Number(p.monto_pagado).toLocaleString(
                        "es-DO",
                        {
                          minimumFractionDigits: 2,
                        }
                      )}
                    </td>
                    <td className="p-2 border">{p.metodo_pago}</td>
                    <td className="p-2 border">{p.no_referencia}</td>
                  </tr>
                ))}

                {pagos.length === 0 && (
                  <tr>
                    <td
                      className="p-4 border text-center"
                      colSpan={7}
                    >
                      No hay pagos registrados.
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