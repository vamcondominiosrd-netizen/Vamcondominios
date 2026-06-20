"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type Unidad = {
  id: number;
  codigo: string;
  propietario_nombre: string | null;
  propietario_cedula: string | null;
  propietario_telefono: string | null;
  cuota_mensual_actual: number | null;
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

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

export default function MobileNuevoPagoPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);

  const [unidadId, setUnidadId] = useState("");
  const [tipoFondo, setTipoFondo] = useState("ORDINARIO");
  const [fechaPago, setFechaPago] = useState(fechaHoy());
  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [referencia, setReferencia] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    if (!id) {
      router.push("/mobile");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre || `Condominio ID ${id}`);
    setFechaPago(fechaHoy());

    cargarInicial(id);
  }, [router]);

  async function cargarInicial(id: string) {
    setLoading(true);
    await Promise.all([cargarUnidades(id), cargarCuentas(id)]);
    setLoading(false);
  }

  async function cargarUnidades(id: string) {
    const { data, error } = await supabase
      .from("unidades")
      .select(
        "id, codigo, propietario_nombre, propietario_cedula, propietario_telefono, cuota_mensual_actual"
      )
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo", { ascending: true });

    if (error) {
      alert("Error cargando unidades: " + error.message);
      setUnidades([]);
      return;
    }

    setUnidades((data as Unidad[]) || []);
  }

  async function cargarCuentas(id: string) {
    const { data, error } = await supabase
      .from("cuentas_bancarias")
      .select(
        `
        id,
        nombre_banco,
        numero_cuenta,
        fondo_tipo,
        balance_actual,
        fondo_ordinario,
        fondo_extraordinario,
        fondo_reserva
      `
      )
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("nombre_banco", { ascending: true });

    if (error) {
      alert("Error cargando cuentas bancarias: " + error.message);
      setCuentas([]);
      return;
    }

    setCuentas((data as CuentaBancaria[]) || []);
  }

  const unidadSeleccionada = useMemo(() => {
    return unidades.find((u) => String(u.id) === unidadId) || null;
  }, [unidades, unidadId]);

  const cuentaAsignada = useMemo(() => {
    return cuentas.find((c) => c.fondo_tipo === tipoFondo) || null;
  }, [cuentas, tipoFondo]);

  function seleccionarUnidad(idUnidad: string) {
    setUnidadId(idUnidad);

    const unidad = unidades.find((u) => String(u.id) === idUnidad);

    if (!unidad) {
      setMonto("");
      return;
    }

    const cuota = Number(unidad.cuota_mensual_actual || 0);

    if (cuota > 0) {
      setMonto(String(cuota));
    } else {
      setMonto("");
    }
  }

  async function subirComprobante(unidadIdPago: number) {
    if (!comprobante || !condominioId) return null;

    const extension = comprobante.name.split(".").pop();
    const nombreArchivo = `${condominioId}/${Date.now()}-unidad-${unidadIdPago}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("comprobantes-pagos")
      .upload(nombreArchivo, comprobante, {
        upsert: true,
      });

    if (uploadError) {
      throw new Error("Error subiendo comprobante: " + uploadError.message);
    }

    const { data } = supabase.storage
      .from("comprobantes-pagos")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
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

  async function actualizarBalanceCuenta(
    cuentaId: number,
    fondo: string,
    montoPago: number
  ) {
    const { data: cuentaActual, error: errorCuenta } = await supabase
      .from("cuentas_bancarias")
      .select(
        `
        id,
        balance_actual,
        fondo_ordinario,
        fondo_extraordinario,
        fondo_reserva
      `
      )
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

  async function guardarPago(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!unidadId || !fechaPago || !monto) {
      alert("Debe completar unidad, fecha y monto.");
      return;
    }

    if (!metodoPago) {
      alert("Debe seleccionar el método de pago.");
      return;
    }

    if (!cuentaAsignada) {
      alert("No existe cuenta bancaria configurada para el fondo seleccionado.");
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
      referencia.trim() || `PAGO_MOBILE_${unidad.id}_${Date.now()}`;

    const confirmar = confirm(
      `Registrar pago para ${unidad.codigo}\n\n` +
        `Propietario: ${unidad.propietario_nombre || "Sin propietario"}\n` +
        `Monto: RD$ ${dinero(montoNumerico)}\n` +
        `Fecha: ${fechaPago}\n\n` +
        `¿Desea continuar?`
    );

    if (!confirmar) return;

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
            metodo: "MOBILE",
            metodo_pago: metodoPago,
            referencia: referenciaLimpia,
            origen: "MOBILE",
            descripcion: `Pago mobile de mantenimiento - Unidad ${unidad.codigo}`,
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

      alert("Pago registrado correctamente.");

      router.push("/mobile/admin/pagos");
    } catch (error: any) {
      alert(error.message || "Error registrando el pago.");
      setGuardando(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-4">
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          Cargando información para registrar pago...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <section className="bg-green-700 text-white rounded-b-3xl p-5 shadow">
        <Link href="/mobile/admin/pagos" className="text-sm opacity-90">
          ← Volver a Pagos
        </Link>

        <h1 className="text-2xl font-black mt-3">Registrar pago</h1>

        <p className="text-sm opacity-90 mt-1">
          {condominioNombre || "Condominio no identificado"}
        </p>

        <p className="text-sm opacity-90 mt-2">
          Registro rápido de pago de mantenimiento desde el celular.
        </p>
      </section>

      <section className="p-4 space-y-4">
        <form onSubmit={guardarPago} className="space-y-4">
          <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
            <h2 className="font-black text-slate-900">
              Datos de la unidad
            </h2>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Unidad / Propietario *
              </label>

              <select
                value={unidadId}
                onChange={(e) => seleccionarUnidad(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 bg-white"
              >
                <option value="">Seleccione unidad</option>

                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.codigo} - {u.propietario_nombre || "Sin propietario"}
                  </option>
                ))}
              </select>
            </div>

            {unidadSeleccionada && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="text-xs text-blue-700 font-black mb-2">
                  Información de la unidad
                </p>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-500">Unidad:</span>{" "}
                    <span className="font-black">
                      {unidadSeleccionada.codigo}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500">Propietario:</span>{" "}
                    <span className="font-black">
                      {unidadSeleccionada.propietario_nombre ||
                        "Sin propietario"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500">Teléfono:</span>{" "}
                    <span className="font-black">
                      {unidadSeleccionada.propietario_telefono || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500">Cuota mensual:</span>{" "}
                    <span className="font-black text-green-700">
                      RD$ {dinero(unidadSeleccionada.cuota_mensual_actual)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
            <h2 className="font-black text-slate-900">
              Fondo y cuenta bancaria
            </h2>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Fondo *
              </label>

              <select
                value={tipoFondo}
                onChange={(e) => setTipoFondo(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 bg-white"
              >
                <option value="ORDINARIO">Fondo Ordinario</option>
                <option value="EXTRAORDINARIO">Fondo Extraordinario</option>
                <option value="RESERVA">Fondo Reserva</option>
              </select>
            </div>

            <div className="bg-slate-50 border rounded-2xl p-4">
              <p className="text-xs text-slate-500 mb-1">
                Cuenta bancaria asignada
              </p>

              {cuentaAsignada ? (
                <>
                  <p className="font-black text-slate-800">
                    {cuentaAsignada.nombre_banco}
                  </p>

                  <p className="text-sm text-slate-600">
                    Cuenta: {cuentaAsignada.numero_cuenta}
                  </p>

                  <p className="text-sm text-slate-600 mt-1">
                    Balance actual: RD$ {dinero(cuentaAsignada.balance_actual)}
                  </p>
                </>
              ) : (
                <p className="text-red-600 font-bold">
                  No hay cuenta configurada para este fondo.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
            <h2 className="font-black text-slate-900">
              Datos del pago
            </h2>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Fecha pago *
              </label>

              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Monto *
              </label>

              <input
                type="number"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="Monto pagado"
                className="w-full border rounded-xl px-4 py-3"
              />

              {unidadSeleccionada &&
                Number(unidadSeleccionada.cuota_mensual_actual || 0) > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Monto sugerido: RD${" "}
                    {dinero(unidadSeleccionada.cuota_mensual_actual)}. Puede
                    modificarlo si es pago parcial, adicional o adelantado.
                  </p>
                )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Método pago *
              </label>

              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 bg-white"
              >
                <option value="">Seleccione método</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Depósito">Depósito</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Referencia
              </label>

              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Referencia bancaria o comprobante"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Comprobante
              </label>

              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setComprobante(e.target.files?.[0] || null)}
                className="w-full border rounded-xl px-4 py-3 bg-white text-sm"
              />

              {comprobante && (
                <p className="text-xs text-slate-500 mt-1">
                  Archivo seleccionado: {comprobante.name}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-green-700 text-white py-4 rounded-2xl font-black disabled:opacity-50 shadow-sm"
          >
            {guardando ? "Guardando pago..." : "Registrar pago"}
          </button>
        </form>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
        <div className="grid grid-cols-5 text-xs text-center">
          <Link href="/mobile/admin" className="py-3 text-slate-600">
            <div>🏠</div>
            <span className="block mt-1">Inicio</span>
          </Link>

          <Link href="/mobile/admin/banco" className="py-3 text-slate-600">
            <div>🏦</div>
            <span className="block mt-1">Banco</span>
          </Link>

          <Link
            href="/mobile/admin/pagos"
            className="py-3 font-bold text-blue-700"
          >
            <div>💳</div>
            <span className="block mt-1">Pagos</span>
          </Link>

          <Link
            href="/mobile/admin/solicitudes-pagos"
            className="py-3 text-slate-600"
          >
            <div>💼</div>
            <span className="block mt-1">Solicitudes</span>
          </Link>

          <Link href="/mobile/admin/mas" className="py-3 text-slate-600">
            <div>☰</div>
            <span className="block mt-1">Más</span>
          </Link>
        </div>
      </nav>
    </main>
  );
}