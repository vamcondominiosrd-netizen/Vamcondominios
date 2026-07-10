"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  fondo_tipo: string | null;
  balance_actual: number | null;
  fondo_ordinario: number | null;
  fondo_extraordinario: number | null;
  fondo_reserva: number | null;
};

type Pago = {
  id: number;
  monto: number;
  fecha_pago: string;
  referencia: string | null;
  metodo_pago: string | null;
  metodo?: string | null;
  origen?: string | null;
  tipo_fondo: string | null;
  descripcion?: string | null;
  comprobante_url: string | null;
  unidades: {
    codigo: string;
  } | null;
};

export default function PagosMantenimientoPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState<string>("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);

  const [unidadId, setUnidadId] = useState("");
  const [tipoFondo, setTipoFondo] = useState("ORDINARIO");
  const [fechaPago, setFechaPago] = useState("");
  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [referencia, setReferencia] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      router.push("/login");
      return;
    }

    const hoy = new Date().toISOString().slice(0, 10);

    setCondominioId(id);
    setCondominioNombre(nombre);
    setFechaPago(hoy);

    cargarUnidades(id);
    cargarCuentas(id);
    cargarPagos(id);
  }, [router]);

  async function cargarUnidades(id: string) {
    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo", {
        ascending: true,
      });

    if (error) {
      alert("Error cargando unidades: " + error.message);
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
        fondo_tipo,
        balance_actual,
        fondo_ordinario,
        fondo_extraordinario,
        fondo_reserva
      `)
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("nombre_banco", { ascending: true });

    if (error) {
      alert("Error cargando cuentas: " + error.message);
      return;
    }

    setCuentas((data as CuentaBancaria[]) || []);
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
        metodo,
        metodo_pago,
        origen,
        tipo_fondo,
        descripcion,
        comprobante_url,
        unidades (
          codigo
        )
      `)
      .eq("condominio_id", Number(id))
      .order("fecha_pago", {
        ascending: false,
      })
      .order("id", {
        ascending: false,
      });

    setLoading(false);

    if (error) {
      alert("Error cargando pagos: " + error.message);
      return;
    }

    setPagos((data || []) as Pago[]);
  }

  const cuentaAsignada = useMemo(() => {
    return cuentas.find((c) => c.fondo_tipo === tipoFondo) || null;
  }, [cuentas, tipoFondo]);

  async function subirComprobante(unidadIdPago: number) {
    if (!comprobante || !condominioId) {
      return null;
    }

    const extension = comprobante.name.split(".").pop();

    const nombreArchivo = `${condominioId}/${Date.now()}-unidad-${unidadIdPago}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("comprobantes-pagos")
      .upload(nombreArchivo, comprobante, {
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from("comprobantes-pagos")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  async function actualizarBalanceCuenta(
    cuentaId: number,
    fondo: string,
    montoPago: number
  ) {
    const { data: cuentaActual, error: errorCuenta } = await supabase
      .from("cuentas_bancarias")
      .select(`
        id,
        balance_actual,
        fondo_ordinario,
        fondo_extraordinario,
        fondo_reserva
      `)
      .eq("id", cuentaId)
      .eq("condominio_id", Number(condominioId))
      .single();

    if (errorCuenta) {
      throw new Error(
        "El pago fue guardado, pero no se pudo leer la cuenta bancaria: " +
          errorCuenta.message
      );
    }

    const fondoOrdinarioActual = Number(cuentaActual.fondo_ordinario || 0);
    const fondoExtraActual = Number(cuentaActual.fondo_extraordinario || 0);
    const fondoReservaActual = Number(cuentaActual.fondo_reserva || 0);
    const balanceActual = Number(cuentaActual.balance_actual || 0);

    let nuevoFondoOrdinario = fondoOrdinarioActual;
    let nuevoFondoExtraordinario = fondoExtraActual;
    let nuevoFondoReserva = fondoReservaActual;

    if (fondo === "ORDINARIO") {
      nuevoFondoOrdinario += montoPago;
    }

    if (fondo === "EXTRAORDINARIO") {
      nuevoFondoExtraordinario += montoPago;
    }

    if (fondo === "RESERVA") {
      nuevoFondoReserva += montoPago;
    }

    const nuevoBalance = balanceActual + montoPago;

    const { error: errorUpdate } = await supabase
      .from("cuentas_bancarias")
      .update({
        fondo_ordinario: nuevoFondoOrdinario,
        fondo_extraordinario: nuevoFondoExtraordinario,
        fondo_reserva: nuevoFondoReserva,
        balance_actual: nuevoBalance,
      })
      .eq("id", cuentaId)
      .eq("condominio_id", Number(condominioId));

    if (errorUpdate) {
      throw new Error(
        "El pago fue guardado, pero no se pudo actualizar el balance bancario: " +
          errorUpdate.message
      );
    }
  }

  async function validarDuplicadoReferencia(
    referenciaLimpia: string,
    idCondominio: string
  ) {
    if (!referenciaLimpia) return false;

    const { data, error } = await supabase
      .from("pagos")
      .select("id")
      .eq("condominio_id", Number(idCondominio))
      .eq("referencia", referenciaLimpia)
      .maybeSingle();

    if (error) {
      throw new Error("Error validando referencia duplicada: " + error.message);
    }

    return Boolean(data?.id);
  }

  async function guardarPago(e: React.FormEvent) {
    e.preventDefault();
    setMensaje("");

    if (!unidadId || !fechaPago || !monto) {
      alert("Debe completar unidad, fecha y monto.");
      return;
    }

    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!cuentaAsignada) {
      alert("No existe cuenta bancaria configurada para el fondo seleccionado.");
      return;
    }

    if (!metodoPago) {
      alert("Debe seleccionar el método de pago.");
      return;
    }

    const montoNumerico = Number(monto || 0);

    if (montoNumerico <= 0) {
      alert("El monto debe ser mayor que cero.");
      return;
    }

    const unidad = unidades.find((u) => String(u.id) === unidadId);

    if (!unidad) {
      alert("Debe seleccionar una unidad válida.");
      return;
    }

    const referenciaLimpia =
      referencia.trim() || `PAGO_MANUAL_${unidad.id}_${Date.now()}`;

    setGuardando(true);

    try {
      const referenciaExiste = await validarDuplicadoReferencia(
        referenciaLimpia,
        condominioId
      );

      if (referenciaExiste) {
        const continuar = confirm(
          "Ya existe un pago registrado con esta referencia. ¿Desea continuar de todas formas?"
        );

        if (!continuar) {
          setGuardando(false);
          return;
        }
      }

      const comprobanteUrl = await subirComprobante(unidad.id);

      const { data: pagoInsertado, error } = await supabase
        .from("pagos")
        .insert([
          {
            condominio_id: Number(condominioId),
            unidad_id: unidad.id,
            cuenta_bancaria_id: cuentaAsignada.id,
            tipo_fondo: tipoFondo,
            monto: montoNumerico,
            fecha_pago: fechaPago,
            metodo: "MANUAL",
            metodo_pago: metodoPago,
            referencia: referenciaLimpia,
            origen: "MANUAL",
            descripcion: `Pago manual de mantenimiento - Unidad ${unidad.codigo}`,
            comprobante_url: comprobanteUrl,
          },
        ])
        .select("id")
        .single();

      if (error) {
        alert("Error guardando pago: " + error.message);
        setGuardando(false);
        return;
      }

      const { error: errorAplicacion } = await supabase.rpc(
        "aplicar_pago_a_cargos",
        {
          p_pago_id: pagoInsertado.id,
          p_condominio_id: Number(condominioId),
          p_unidad_id: unidad.id,
          p_monto: montoNumerico,
        }
      );

      if (errorAplicacion) {
        alert(
          "Pago guardado, pero no se pudo aplicar a los cargos: " +
            errorAplicacion.message
        );
      }

      await actualizarBalanceCuenta(
        cuentaAsignada.id,
        tipoFondo,
        montoNumerico
      );

      alert(
        "Pago registrado, aplicado y sumado al balance bancario correctamente."
      );

      setUnidadId("");
      setTipoFondo("ORDINARIO");
      setFechaPago(new Date().toISOString().slice(0, 10));
      setMonto("");
      setMetodoPago("");
      setReferencia("");
      setComprobante(null);

      const inputFile = document.getElementById(
        "comprobante"
      ) as HTMLInputElement | null;

      if (inputFile) {
        inputFile.value = "";
      }

      await cargarCuentas(condominioId);
      await cargarPagos(condominioId);
    } catch (error: any) {
      alert(error.message || "Error registrando el pago.");
    }

    setGuardando(false);
  }

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  const totalPagado = pagos.reduce(
    (sum, p) => sum + Number(p.monto || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border p-6">
        <h1 className="text-3xl font-black text-slate-800">
          Pagos de Mantenimiento
        </h1>

        <p className="text-slate-500 mt-2">
          Registro de pagos de mantenimiento, aplicación a cargos y actualización automática del banco.
        </p>

        <p className="text-sm text-blue-700 font-bold mt-3">
          Condominio activo: {condominioNombre || "No seleccionado"}
        </p>
      </div>

      {mensaje && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm">
          {mensaje}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h2 className="text-lg font-black mb-5">Registrar pago</h2>

        <form
          onSubmit={guardarPago}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <select
            value={unidadId}
            onChange={(e) => setUnidadId(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          >
            <option value="">Seleccione unidad</option>

            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.codigo}
              </option>
            ))}
          </select>

          <select
            value={tipoFondo}
            onChange={(e) => setTipoFondo(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          >
            <option value="ORDINARIO">Fondo Ordinario</option>
            <option value="EXTRAORDINARIO">Fondo Extraordinario</option>
            <option value="RESERVA">Fondo Reserva</option>
          </select>

          <div className="md:col-span-2 bg-slate-50 border rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500 mb-1">
              Cuenta bancaria asignada
            </p>

            {cuentaAsignada ? (
              <div>
                <p className="font-semibold text-slate-800">
                  {cuentaAsignada.nombre_banco} - {cuentaAsignada.numero_cuenta}
                </p>

                <p className="text-sm text-slate-600 mt-1">
                  Balance actual: RD$ {dinero(cuentaAsignada.balance_actual)}
                </p>
              </div>
            ) : (
              <p className="text-red-600 font-medium">
                No hay cuenta configurada para este fondo.
              </p>
            )}
          </div>

          <input
            type="date"
            value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            type="number"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Monto"
            className="w-full border rounded-xl px-4 py-3"
          />

          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          >
            <option value="">Método pago</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Depósito">Depósito</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Cheque">Cheque</option>
          </select>

          <div>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className="w-full border rounded-xl px-4 py-3"
              placeholder="Referencia"
            />
          </div>

          <div className="md:col-span-2">
            <input
              id="comprobante"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setComprobante(e.target.files?.[0] || null)}
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={guardando}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white px-5 py-3 rounded-xl font-bold transition"
            >
              {guardando ? "Guardando..." : "Registrar pago"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <p className="text-sm text-slate-500">Total recaudado</p>

        <h2 className="text-3xl font-black text-green-600 mt-2">
          RD$ {dinero(totalPagado)}
        </h2>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-black">Historial de pagos aplicados</h2>
        </div>

        {loading ? (
          <div className="p-6">Cargando pagos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3">Unidad</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-right px-4 py-3">Monto</th>
                  <th className="text-left px-4 py-3">Fondo</th>
                  <th className="text-left px-4 py-3">Método</th>
                  <th className="text-left px-4 py-3">Origen</th>
                  <th className="text-left px-4 py-3">Referencia</th>
                  <th className="text-left px-4 py-3">Comprobante</th>
                  <th className="text-left px-4 py-3">Recibo</th>
                </tr>
              </thead>

              <tbody>
                {pagos.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">
                      {p.unidades?.codigo || "N/A"}
                    </td>

                    <td className="px-4 py-3">{p.fecha_pago}</td>

                    <td className="px-4 py-3 text-right font-bold text-green-600">
                      RD$ {dinero(p.monto)}
                    </td>

                    <td className="px-4 py-3">{p.tipo_fondo || "-"}</td>

                    <td className="px-4 py-3">{p.metodo_pago || "-"}</td>

                    <td className="px-4 py-3">{p.origen || "-"}</td>

                    <td className="px-4 py-3">{p.referencia || "-"}</td>

                    <td className="px-4 py-3">
                      {p.comprobante_url ? (
                        <a
                          href={p.comprobante_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Ver comprobante
                        </a>
                      ) : (
                        "Sin comprobante"
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <Link
                        href={`/recibos/pago/pagos/${p.id}`}
                        className="bg-purple-700 hover:bg-purple-800 text-white px-3 py-1 rounded-lg text-xs font-bold inline-block"
                      >
                        Recibo
                      </Link>
                    </td>
                  </tr>
                ))}

                {!loading && pagos.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
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