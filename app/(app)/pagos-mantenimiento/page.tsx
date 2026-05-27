"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Unidad = {
  id: number;
  codigo: string;
};

type CuentaBancaria = {
  id: number;
  nombre_banco: string;
  numero_cuenta: string;
  fondo_tipo: string;
};

type Pago = {
  id: number;
  monto: number;
  fecha_pago: string;
  referencia: string;
  metodo_pago: string;
  tipo_fondo: string;
  comprobante_url: string | null;
  unidades: {
    codigo: string;
  } | null;
};

export default function PagosMantenimientoPage() {

  const router = useRouter();

  const [condominioId, setCondominioId] =
    useState<string>("");

  const [unidades, setUnidades] =
    useState<Unidad[]>([]);

  const [cuentas, setCuentas] =
    useState<CuentaBancaria[]>([]);

  const [pagos, setPagos] =
    useState<Pago[]>([]);

  const [unidadId, setUnidadId] =
    useState("");

  const [tipoFondo, setTipoFondo] =
    useState("ORDINARIO");

  const [fechaPago, setFechaPago] =
    useState("");

  const [monto, setMonto] =
    useState("");

  const [metodoPago, setMetodoPago] =
    useState("");

  const [referencia, setReferencia] =
    useState("");

  const [comprobante, setComprobante] =
    useState<File | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [guardando, setGuardando] =
    useState(false);

  useEffect(() => {

    const id =
      localStorage.getItem("condominio_id");

    if (!id) {
      router.push("/login");
      return;
    }

    setCondominioId(id);

    cargarUnidades(id);
    cargarCuentas(id);
    cargarPagos(id);

  }, [router]);

  async function cargarUnidades(id: string) {

    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(id))
      .order("codigo", {
        ascending: true,
      });

    if (error) {
      alert(
        "Error cargando unidades: " +
        error.message
      );
      return;
    }

    setUnidades(data || []);
  }

  async function cargarCuentas(id: string) {

    const { data, error } = await supabase
      .from("cuentas_bancarias")
      .select(`
        id,
        nombre_banco,
        numero_cuenta,
        fondo_tipo
      `)
      .eq("condominio_id", Number(id))
      .eq("activa", true);

    if (error) {
      alert(
        "Error cargando cuentas: " +
        error.message
      );
      return;
    }

    setCuentas(data || []);
  }

  async function cargarPagos(id: string) {

    setLoading(true);

    const { data, error } = await supabase
      .from("pagos")
      .select(`
        id,
        monto,
        fecha_pago,
        referencia,
        metodo_pago,
        tipo_fondo,
        comprobante_url,
        unidades (
          codigo
        )
      `)
      .eq("condominio_id", Number(id))
      .order("fecha_pago", {
        ascending: false,
      });

    setLoading(false);

    if (error) {
      alert(
        "Error cargando pagos: " +
        error.message
      );
      return;
    }

    setPagos((data || []) as Pago[]);
  }

  const cuentaAsignada = useMemo(() => {

    return cuentas.find(
      (c) =>
        c.fondo_tipo === tipoFondo
    );

  }, [cuentas, tipoFondo]);

  async function subirComprobante(
    unidadId: number
  ) {

    if (
      !comprobante ||
      !condominioId
    ) {
      return "";
    }

    const extension =
      comprobante.name
        .split(".")
        .pop();

    const nombreArchivo =
      `${condominioId}/${Date.now()}-unidad-${unidadId}.${extension}`;

    const { error: uploadError } =
      await supabase.storage
        .from("comprobantes-pagos")
        .upload(
          nombreArchivo,
          comprobante
        );

    if (uploadError) {
      throw new Error(
        uploadError.message
      );
    }

    const { data } =
      supabase.storage
        .from(
          "comprobantes-pagos"
        )
        .getPublicUrl(
          nombreArchivo
        );

    return data.publicUrl;
  }

  async function guardarPago(
    e: React.FormEvent
  ) {

    e.preventDefault();

    if (
      !unidadId ||
      !fechaPago ||
      !monto
    ) {

      alert(
        "Debe completar unidad, fecha y monto."
      );

      return;
    }

    if (!cuentaAsignada) {

      alert(
        "No existe cuenta bancaria configurada para el fondo seleccionado."
      );

      return;
    }

    const unidad =
      unidades.find(
        (u) =>
          String(u.id) ===
          unidadId
      );

    if (!unidad) {

      alert(
        "Debe seleccionar una unidad válida."
      );

      return;
    }

    setGuardando(true);

    try {

      const comprobanteUrl =
        await subirComprobante(
          unidad.id
        );

      const {
        data: pagoInsertado,
        error
      } =
        await supabase
          .from("pagos")
          .insert([
            {
              condominio_id:
                Number(
                  condominioId
                ),

              unidad_id:
                unidad.id,

              cuenta_bancaria_id:
                cuentaAsignada.id,

              tipo_fondo:
                tipoFondo,

              monto:
                Number(monto),

              fecha_pago:
                fechaPago,

              metodo_pago:
                metodoPago,

              referencia,

              comprobante_url:
                comprobanteUrl,
            },
          ])
          .select("id")
          .single();

      if (error) {

        alert(
          "Error guardando pago: " +
          error.message
        );

        setGuardando(false);
        return;
      }

      const {
        error: errorAplicacion
      } =
        await supabase.rpc(
          "aplicar_pago_a_cargos",
          {
            p_pago_id:
              pagoInsertado.id,

            p_condominio_id:
              Number(
                condominioId
              ),

            p_unidad_id:
              unidad.id,

            p_monto:
              Number(monto),
          }
        );

      if (errorAplicacion) {

        alert(
          "Pago guardado, pero no se pudo aplicar a los cargos: " +
          errorAplicacion.message
        );
      }

      alert(
        "Pago registrado y aplicado correctamente."
      );

      setUnidadId("");
      setTipoFondo(
        "ORDINARIO"
      );
      setFechaPago("");
      setMonto("");
      setMetodoPago("");
      setReferencia("");
      setComprobante(null);

      const inputFile =
        document.getElementById(
          "comprobante"
        ) as HTMLInputElement | null;

      if (inputFile) {
        inputFile.value = "";
      }

      await cargarPagos(
        condominioId
      );

    } catch (error: any) {

      alert(
        "Error subiendo comprobante: " +
        error.message
      );

    }

    setGuardando(false);
  }

  const totalPagado =
    pagos.reduce(
      (sum, p) =>
        sum +
        Number(
          p.monto || 0
        ),
      0
    );

  return (
    <div className="space-y-6">

      <div className="bg-white rounded-2xl shadow-sm border p-5">

        <h1 className="text-2xl font-bold text-slate-800">
          Pagos de Mantenimiento
        </h1>

      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-6">

        <h2 className="text-lg font-bold mb-5">
          Registrar pago
        </h2>

        <form
          onSubmit={guardarPago}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >

          <select
            value={unidadId}
            onChange={(e) =>
              setUnidadId(
                e.target.value
              )
            }
            className="w-full border rounded-xl px-4 py-3"
          >

            <option value="">
              Seleccione unidad
            </option>

            {unidades.map(
              (u) => (
                <option
                  key={u.id}
                  value={u.id}
                >
                  {u.codigo}
                </option>
              )
            )}

          </select>

          <select
            value={tipoFondo}
            onChange={(e) =>
              setTipoFondo(
                e.target.value
              )
            }
            className="w-full border rounded-xl px-4 py-3"
          >

            <option value="ORDINARIO">
              Fondo Ordinario
            </option>

            <option value="EXTRAORDINARIO">
              Fondo Extraordinario
            </option>

            <option value="RESERVA">
              Fondo Reserva
            </option>

          </select>

          <div className="md:col-span-2 bg-slate-50 border rounded-xl px-4 py-3">

            <p className="text-xs text-slate-500 mb-1">
              Cuenta bancaria asignada
            </p>

            {cuentaAsignada ? (

              <p className="font-semibold text-slate-800">
                {
                  cuentaAsignada.nombre_banco
                }{" "}
                -{" "}
                {
                  cuentaAsignada.numero_cuenta
                }
              </p>

            ) : (

              <p className="text-red-600 font-medium">
                No hay cuenta configurada para este fondo.
              </p>

            )}

          </div>

          <input
            type="date"
            value={fechaPago}
            onChange={(e) =>
              setFechaPago(
                e.target.value
              )
            }
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            type="number"
            step="0.01"
            value={monto}
            onChange={(e) =>
              setMonto(
                e.target.value
              )
            }
            placeholder="Monto"
            className="w-full border rounded-xl px-4 py-3"
          />

          <select
            value={metodoPago}
            onChange={(e) =>
              setMetodoPago(
                e.target.value
              )
            }
            className="w-full border rounded-xl px-4 py-3"
          >

            <option value="">
              Método pago
            </option>

            <option value="Transferencia">
              Transferencia
            </option>

            <option value="Depósito">
              Depósito
            </option>

            <option value="Efectivo">
              Efectivo
            </option>

            <option value="Cheque">
              Cheque
            </option>

          </select>

          <div className="md:col-span-2">

            <input
              type="text"
              value={referencia}
              onChange={(e) =>
                setReferencia(
                  e.target.value
                )
              }
              className="w-full border rounded-xl px-4 py-3"
              placeholder="Referencia"
            />

          </div>

          <div className="md:col-span-2">

            <input
              id="comprobante"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) =>
                setComprobante(
                  e.target
                    .files?.[0] ||
                    null
                )
              }
              className="w-full border rounded-xl px-4 py-3"
            />

          </div>

          <div className="md:col-span-2">

            <button
              type="submit"
              disabled={
                guardando
              }
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white px-5 py-3 rounded-xl font-medium transition"
            >

              {guardando
                ? "Guardando..."
                : "Registrar pago"}

            </button>

          </div>

        </form>

      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5">

        <p className="text-sm text-slate-500">
          Total recaudado
        </p>

        <h2 className="text-3xl font-bold text-green-600 mt-2">
          RD$ {totalPagado.toLocaleString()}
        </h2>

      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

        <div className="p-4 border-b">
          <h2 className="font-bold">
            Historial de pagos aplicados
          </h2>
        </div>

        {loading ? (

          <div className="p-6">
            Cargando pagos...
          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3">
                    Unidad
                  </th>

                  <th className="text-left px-4 py-3">
                    Fecha
                  </th>

                  <th className="text-right px-4 py-3">
                    Monto
                  </th>

                  <th className="text-left px-4 py-3">
                    Fondo
                  </th>

                  <th className="text-left px-4 py-3">
                    Método
                  </th>

                  <th className="text-left px-4 py-3">
                    Referencia
                  </th>

                  <th className="text-left px-4 py-3">
                    Comprobante
                  </th>
                </tr>
              </thead>

              <tbody>

                {pagos.map((p) => (

                  <tr
                    key={p.id}
                    className="border-t hover:bg-slate-50"
                  >

                    <td className="px-4 py-3 font-medium">
                      {p.unidades?.codigo || "N/A"}
                    </td>

                    <td className="px-4 py-3">
                      {p.fecha_pago}
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-green-600">
                      RD$ {Number(p.monto).toLocaleString()}
                    </td>

                    <td className="px-4 py-3">
                      {p.tipo_fondo}
                    </td>

                    <td className="px-4 py-3">
                      {p.metodo_pago}
                    </td>

                    <td className="px-4 py-3">
                      {p.referencia}
                    </td>

                    <td className="px-4 py-3">

                      {p.comprobante_url ? (

                        <a
                          href={p.comprobante_url}
                          target="_blank"
                          className="text-blue-600 hover:underline"
                        >
                          Ver recibo
                        </a>

                      ) : (
                        "Sin recibo"
                      )}

                    </td>

                  </tr>

                ))}

                {!loading &&
                  pagos.length === 0 && (

                  <tr>

                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-500"
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