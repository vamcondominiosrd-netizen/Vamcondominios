"use client";

import type { CuentaBancaria, Unidad } from "../types";

type Props = {
  unidades: Unidad[];
  unidadId: string;
  setUnidadId: (value: string) => void;
  seleccionarUnidad: (idUnidad: string) => void;

  tipoFondo: string;
  setTipoFondo: (value: string) => void;

  fechaPago: string;
  setFechaPago: (value: string) => void;

  monto: string;
  setMonto: (value: string) => void;

  metodoPago: string;
  setMetodoPago: (value: string) => void;

  referencia: string;
  setReferencia: (value: string) => void;

  setComprobante: (file: File | null) => void;

  unidadSeleccionada: Unidad | null;
  cuentaAsignada: CuentaBancaria | null;

  guardando: boolean;
  guardarPago: (e: React.FormEvent) => void;
};

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
  });
}

export default function PagoForm({
  unidades,
  unidadId,
  setUnidadId,
  seleccionarUnidad,
  tipoFondo,
  setTipoFondo,
  fechaPago,
  setFechaPago,
  monto,
  setMonto,
  metodoPago,
  setMetodoPago,
  referencia,
  setReferencia,
  setComprobante,
  unidadSeleccionada,
  cuentaAsignada,
  guardando,
  guardarPago,
}: Props) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="mb-5 text-lg font-black text-slate-900">
        Registrar pago
      </h2>

      <form onSubmit={guardarPago} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            Unidad / Propietario
          </label>

          <select
            value={unidadId}
            onChange={(e) => {
              setUnidadId(e.target.value);
              seleccionarUnidad(e.target.value);
            }}
            className="w-full rounded-xl border bg-white px-4 py-3"
          >
            <option value="">Seleccione unidad</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.codigo} - {u.propietario_nombre || "Sin propietario"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            Fondo
          </label>

          <select
            value={tipoFondo}
            onChange={(e) => setTipoFondo(e.target.value)}
            className="w-full rounded-xl border bg-white px-4 py-3"
          >
            <option value="ORDINARIO">Fondo Ordinario</option>
            <option value="EXTRAORDINARIO">Fondo Extraordinario</option>
            <option value="RESERVA">Fondo Reserva</option>
          </select>
        </div>

        {unidadSeleccionada && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 md:col-span-2">
            <p className="mb-2 text-xs font-bold uppercase text-blue-700">
              Información de la unidad seleccionada
            </p>

            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
              <div>
                <span className="text-slate-500">Unidad</span>
                <p className="font-black text-slate-800">
                  {unidadSeleccionada.codigo}
                </p>
              </div>

              <div>
                <span className="text-slate-500">Propietario</span>
                <p className="font-black text-slate-800">
                  {unidadSeleccionada.propietario_nombre || "Sin propietario"}
                </p>
              </div>

              <div>
                <span className="text-slate-500">Teléfono</span>
                <p className="font-black text-slate-800">
                  {unidadSeleccionada.propietario_telefono || "-"}
                </p>
              </div>

              <div>
                <span className="text-slate-500">Cuota mensual</span>
                <p className="font-black text-green-700">
                  RD$ {dinero(unidadSeleccionada.cuota_mensual_actual)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border bg-slate-50 px-4 py-3 md:col-span-2">
          <p className="mb-1 text-xs font-bold uppercase text-slate-500">
            Cuenta bancaria asignada
          </p>

          {cuentaAsignada ? (
            <div>
              <p className="font-semibold text-slate-800">
                {cuentaAsignada.nombre_banco} - {cuentaAsignada.numero_cuenta}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Balance actual: RD$ {dinero(cuentaAsignada.balance_actual)}
              </p>
            </div>
          ) : (
            <p className="font-medium text-red-600">
              No hay cuenta configurada para este fondo.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            Fecha pago
          </label>

          <input
            type="date"
            value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            Monto
          </label>

          <input
            type="number"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Monto"
            className="w-full rounded-xl border px-4 py-3"
          />

          {unidadSeleccionada?.cuota_mensual_actual && (
            <p className="mt-1 text-xs text-slate-500">
              Monto sugerido: RD$ {dinero(unidadSeleccionada.cuota_mensual_actual)}.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            Método pago
          </label>

          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
            className="w-full rounded-xl border bg-white px-4 py-3"
          >
            <option value="">Método pago</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Depósito">Depósito</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            Referencia
          </label>

          <input
            type="text"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
            placeholder="Referencia"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-bold text-slate-700">
            Comprobante
          </label>

          <input
            id="comprobante"
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setComprobante(e.target.files?.[0] || null)}
            className="w-full rounded-xl border px-4 py-3"
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={guardando}
            className="rounded-xl bg-amber-500 px-5 py-3 font-bold text-white transition hover:bg-amber-600 disabled:opacity-60"
          >
            {guardando ? "Guardando..." : "Registrar pago"}
          </button>
        </div>
      </form>
    </section>
  );
}