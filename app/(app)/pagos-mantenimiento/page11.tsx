"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { generarAsientoPagoMantenimiento } from "@/app/lib/contabilidad/generarAsientoPagoMantenimiento";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import PagoMantenimientoToolbar from "./components/PagoMantenimientoToolbar";
import PagoResumen from "./components/PagoResumen";
import PagoForm from "./components/PagoForm";
import PagoHistorial from "./components/PagoHistorial";

import type { CuentaBancaria, Pago, Unidad } from "./types";

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
      .select(
        "id, client_id, codigo, propietario_id, propietario_nombre, propietario_cedula, propietario_telefono, cuota_mensual_actual"
      )
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo", { ascending: true });

    if (error) {
      alert("Error cargando unidades: " + error.message);
      return;
    }

    setUnidades((data as Unidad[]) || []);
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
        periodo,
        comprobante_url,
        unidades (
          codigo,
          propietario_nombre
        )
      `)
      .eq("condominio_id", Number(id))
      .order("fecha_pago", { ascending: false })
      .order("id", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando pagos: " + error.message);
      return;
    }

    setPagos((data || []) as Pago[]);
  }

  async function refrescarDatos() {
    if (!condominioId) return;

    await Promise.all([
      cargarUnidades(condominioId),
      cargarCuentas(condominioId),
      cargarPagos(condominioId),
    ]);
  }

  const cuentaAsignada = useMemo(() => {
    return cuentas.find((c) => c.fondo_tipo === tipoFondo) || null;
  }, [cuentas, tipoFondo]);

  const unidadSeleccionada = useMemo(() => {
    return unidades.find((u) => String(u.id) === unidadId) || null;
  }, [unidades, unidadId]);

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
    }
  }

  async function subirComprobante(unidadIdPago: number) {
    if (!comprobante || !condominioId) return null;

    const extension = comprobante.name.split(".").pop();
    const nombreArchivo = `${condominioId}/${Date.now()}-unidad-${unidadIdPago}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("comprobantes-pagos")
      .upload(nombreArchivo, comprobante, { upsert: true });

    if (uploadError) throw new Error(uploadError.message);

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
      .select("id,balance_actual,fondo_ordinario,fondo_extraordinario,fondo_reserva")
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

    if (fondo === "ORDINARIO") nuevoFondoOrdinario += montoPago;
    if (fondo === "EXTRAORDINARIO") nuevoFondoExtraordinario += montoPago;
    if (fondo === "RESERVA") nuevoFondoReserva += montoPago;

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

  async function validarDuplicadoReferencia(referenciaLimpia: string, idCondominio: string) {
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



  function nombreMesPeriodo(periodo: string) {
    const nombresMeses = [
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

    const [anioTexto, mesTexto] = String(periodo || "").split("-");
    const anio = Number(anioTexto);
    const mes = Number(mesTexto);

    if (!anio || !mes || mes < 1 || mes > 12) return periodo || "";

    return `${nombresMeses[mes - 1]} ${anio}`;
  }

  async function obtenerPeriodosPago(
    idCondominio: string,
    idUnidad: number,
    montoPago: number
  ) {
    const { data, error } = await supabase
      .from("cargos_periodicos")
      .select("id, periodo, balance, estado")
      .eq("condominio_id", Number(idCondominio))
      .eq("unidad_id", idUnidad)
      .gt("balance", 0)
      .neq("estado", "PAGADO")
      .order("anio", { ascending: true })
      .order("mes", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw new Error(
        "Error buscando cargos pendientes para identificar el mes pagado: " +
          error.message
      );
    }

    let restante = Number(montoPago || 0);
    const periodos: string[] = [];

    for (const cargo of data || []) {
      if (restante <= 0) break;

      const balance = Number((cargo as any).balance || 0);
      const periodo = String((cargo as any).periodo || "");

      if (balance <= 0 || !periodo) continue;

      periodos.push(periodo);
      restante -= Math.min(restante, balance);
    }

    const periodosUnicos = Array.from(new Set(periodos.filter(Boolean)));

    return {
      periodos: periodosUnicos,
      mesesTexto: periodosUnicos.map(nombreMesPeriodo).join(", "),
    };
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
      const periodosPago = await obtenerPeriodosPago(
        condominioId,
        unidad.id,
        montoNumerico
      );
      const periodoPago =
        periodosPago.periodos.length > 0
          ? periodosPago.periodos.join(",")
          : fechaPago.slice(0, 7);
      const descripcionPago = periodosPago.mesesTexto
        ? `Pago mantenimiento ${periodosPago.mesesTexto} - Unidad ${unidad.codigo}`
        : `Pago mantenimiento ${nombreMesPeriodo(fechaPago.slice(0, 7))} - Unidad ${unidad.codigo}`;

      const { data: pagoInsertado, error } = await supabase
        .from("pagos")
        .insert([
          {
            client_id: Number((unidad as any).client_id || 0) || null,
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
            descripcion: descripcionPago,
            periodo: periodoPago,
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
          "Pago guardado, pero no se pudo aplicar a los cargos. No se actualizó banco ni contabilidad para evitar descuadre: " +
            errorAplicacion.message
        );
        setGuardando(false);
        await cargarPagos(condominioId);
        return;
      }

      await actualizarBalanceCuenta(
        cuentaAsignada.id,
        tipoFondo,
        montoNumerico
      );

      const asientoResultado = await generarAsientoPagoMantenimiento({
        condominio_id: Number(condominioId),
        pago_id: pagoInsertado.id,
        fecha: fechaPago,
        monto: montoNumerico,
        referencia: referenciaLimpia,
        descripcion: descripcionPago,
        usuario: null,
      });

      if (!asientoResultado.ok) {
        alert(
          "Pago registrado, aplicado y sumado al banco, pero no se pudo generar el asiento contable: " +
            asientoResultado.error
        );
      } else {
        setMensaje(
          asientoResultado.duplicado
            ? "Pago registrado correctamente. El asiento contable ya existía."
            : "Pago registrado, aplicado a cargos y asiento contable generado automáticamente."
        );
      }

      setUnidadId("");
      setTipoFondo("ORDINARIO");
      setFechaPago(new Date().toISOString().slice(0, 10));
      setMonto("");
      setMetodoPago("");
      setReferencia("");
      setComprobante(null);

      const inputFile = document.getElementById("comprobante") as HTMLInputElement | null;

      if (inputFile) inputFile.value = "";

      await cargarCuentas(condominioId);
      await cargarPagos(condominioId);
    } catch (error: any) {
      alert(error.message || "Error registrando el pago.");
    }

    setGuardando(false);
  }

  const totalPagado = pagos.reduce((sum, p) => sum + Number(p.monto || 0), 0);
  const cantidadPagos = pagos.length;
  const promedioPago = cantidadPagos > 0 ? totalPagado / cantidadPagos : 0;
  const ultimoPago = pagos[0]?.fecha_pago || "-";

  return (
    <PageContainer>
      <PagoMantenimientoToolbar onRefresh={refrescarDatos} />

      {mensaje && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          {mensaje}
        </div>
      )}

      <PagoResumen
        totalPagado={totalPagado}
        cantidadPagos={cantidadPagos}
        promedioPago={promedioPago}
        ultimoPago={ultimoPago}
      />

      <PagoForm
        unidades={unidades}
        unidadId={unidadId}
        setUnidadId={setUnidadId}
        seleccionarUnidad={seleccionarUnidad}
        tipoFondo={tipoFondo}
        setTipoFondo={setTipoFondo}
        fechaPago={fechaPago}
        setFechaPago={setFechaPago}
        monto={monto}
        setMonto={setMonto}
        metodoPago={metodoPago}
        setMetodoPago={setMetodoPago}
        referencia={referencia}
        setReferencia={setReferencia}
        setComprobante={setComprobante}
        unidadSeleccionada={unidadSeleccionada}
        cuentaAsignada={cuentaAsignada}
        guardando={guardando}
        guardarPago={guardarPago}
      />

      <PagoHistorial pagos={pagos} loading={loading} />
    </PageContainer>
  );
}
