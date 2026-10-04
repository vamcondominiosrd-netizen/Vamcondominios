"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ExternalLink, Info } from "lucide-react";
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

type PagoMovilPreparado = {
  version?: number;
  origen?: string;
  preparado_at?: string;

  pago_movil_id: number;
  condominio_id: number;
  unidad_id: number;
  propietario_id?: number | null;

  no_apartamento?: string;
  nombre_propietario?: string;

  concepto?: string;
  tipo_fondo?: string;

  fecha_pago?: string;
  monto?: number | string;
  metodo_pago?: string;
  banco_reportado?: string;
  referencia?: string;

  comprobante_url?: string | null;
  comprobante_path?: string | null;

  recibido_at?: string | null;
};

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
  });
}

function normalizarMetodo(valor: string | null | undefined) {
  const texto = String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (texto.includes("transfer")) return "Transferencia";
  if (texto.includes("deposit")) return "Depósito";
  if (texto.includes("efect")) return "Efectivo";
  if (texto.includes("cheque")) return "Cheque";
  if (texto.includes("link")) return "Link de Pago";

  return String(valor || "");
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
  const searchParams = useSearchParams();
  const aplicadoRef = useRef(false);

  const [pagoPreparado, setPagoPreparado] =
    useState<PagoMovilPreparado | null>(null);
  const [mensajePreparacion, setMensajePreparacion] = useState("");

  useEffect(() => {
    if (aplicadoRef.current) return;

    const origen = String(searchParams.get("origen") || "").toLowerCase();
    const idQuery = Number(searchParams.get("pago_movil_id") || 0);

    // Solo cargar el traspaso cuando se entra desde
    // Financiero > Comprobantes > Preparar pago.
    if (origen !== "propietario") return;

    // Esperar a que el padre termine de cargar las unidades.
    if (unidades.length === 0) return;

    const raw = localStorage.getItem("vam_pago_movil_preparar");

    if (!raw) {
      setMensajePreparacion(
        "No se encontró la información preparada del comprobante."
      );
      aplicadoRef.current = true;
      return;
    }

    try {
      const datos = JSON.parse(raw) as PagoMovilPreparado;

      if (!datos?.pago_movil_id || !datos?.unidad_id) {
        throw new Error("Los datos preparados están incompletos.");
      }

      if (idQuery > 0 && Number(datos.pago_movil_id) !== idQuery) {
        throw new Error(
          "El comprobante preparado no coincide con el comprobante solicitado."
        );
      }

      const existeUnidad = unidades.some(
        (unidad) => Number(unidad.id) === Number(datos.unidad_id)
      );

      if (!existeUnidad) {
        throw new Error(
          "La unidad del comprobante no pertenece al condominio activo."
        );
      }

      aplicadoRef.current = true;
      setPagoPreparado(datos);
      setMensajePreparacion("");

      /*
       * Primero seleccionamos la unidad para que el módulo cargue su
       * situación financiera. Después colocamos los valores reportados
       * por el propietario para que no sean reemplazados por valores
       * sugeridos del formulario.
       */
      seleccionarUnidad(String(datos.unidad_id));
      setUnidadId(String(datos.unidad_id));

      setTipoFondo(
        String(datos.tipo_fondo || "ORDINARIO").toUpperCase()
      );

      if (datos.fecha_pago) {
        setFechaPago(String(datos.fecha_pago));
      }

      if (
        datos.monto !== null &&
        datos.monto !== undefined &&
        String(datos.monto) !== ""
      ) {
        setMonto(String(datos.monto));
      }

      setMetodoPago(normalizarMetodo(datos.metodo_pago));
      setReferencia(String(datos.referencia || ""));

      // El navegador no permite precargar un <input type="file">.
      // El comprobante original se muestra como documento recibido.
      setComprobante(null);
    } catch (error: any) {
      aplicadoRef.current = true;
      setMensajePreparacion(
        error?.message ||
          "No fue posible cargar la información preparada del pago."
      );
    }

    // Se ejecuta nuevamente solo mientras las unidades están cargando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidades, searchParams]);

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">
            Registrar pago
          </h2>

          {pagoPreparado && (
            <p className="mt-1 text-xs font-semibold text-emerald-700">
              Pago preparado desde comprobante #{pagoPreparado.pago_movil_id}
            </p>
          )}
        </div>

        {pagoPreparado && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            <CheckCircle2 size={14} />
            Comprobante validado
          </span>
        )}
      </div>

      {mensajePreparacion && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{mensajePreparacion}</span>
          </div>
        </div>
      )}

      {pagoPreparado && (
        <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                Datos reportados por el propietario
              </p>

              <div className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-slate-500">Apartamento:</span>{" "}
                  <strong>{pagoPreparado.no_apartamento || "-"}</strong>
                </p>

                <p>
                  <span className="text-slate-500">Propietario:</span>{" "}
                  <strong>{pagoPreparado.nombre_propietario || "-"}</strong>
                </p>

                <p>
                  <span className="text-slate-500">Banco reportado:</span>{" "}
                  <strong>{pagoPreparado.banco_reportado || "-"}</strong>
                </p>

                <p>
                  <span className="text-slate-500">Concepto:</span>{" "}
                  <strong>{pagoPreparado.concepto || "-"}</strong>
                </p>
              </div>
            </div>

            {pagoPreparado.comprobante_url && (
              <button
                type="button"
                onClick={() =>
                  window.open(
                    pagoPreparado.comprobante_url || "",
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800"
              >
                <ExternalLink size={16} />
                Ver comprobante
              </button>
            )}
          </div>

          <p className="mt-3 text-xs leading-5 text-blue-900">
            Revise y corrija los campos antes de registrar. El archivo original
            permanece asociado al envío del propietario; el navegador no permite
            llenar automáticamente el selector de archivo.
          </p>
        </div>
      )}

      <form
        onSubmit={guardarPago}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
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

              {pagoPreparado?.banco_reportado && (
                <p className="mt-2 text-xs font-semibold text-blue-700">
                  Banco informado por el propietario:{" "}
                  {pagoPreparado.banco_reportado}
                </p>
              )}
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
              Monto sugerido: RD${" "}
              {dinero(unidadSeleccionada.cuota_mensual_actual)}.
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
            <option value="Link de Pago">Link de Pago</option>
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

          {pagoPreparado?.comprobante_url && (
            <div className="mb-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <strong>Comprobante recibido del propietario.</strong>{" "}
              Puede consultarlo con el botón “Ver comprobante” de la parte
              superior. Solo seleccione otro archivo si desea adjuntar uno
              adicional al registro definitivo.
            </div>
          )}

          <input
            id="comprobante"
            type="file"
            accept="image/*,.pdf"
            onChange={(e) =>
              setComprobante(e.target.files?.[0] || null)
            }
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
