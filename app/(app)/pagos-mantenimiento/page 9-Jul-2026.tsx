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
  const [cuotaOrdinaria, setCuotaOrdinaria] = useState<number>(0);

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
  const [bitacoraProceso, setBitacoraProceso] = useState<string[]>([]);

  function agregarBitacora(texto: string) {
    const linea = `${new Date().toLocaleTimeString()} - ${texto}`;
    console.log("[Pagos Mantenimiento]", linea);
    setBitacoraProceso((prev) => [...prev, linea]);
  }

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

    cargarConfiguracionCargos(id);
    cargarUnidades(id);
    cargarCuentas(id);
    cargarPagos(id);
  }, [router]);

  async function cargarConfiguracionCargos(id: string) {
    const { data, error } = await supabase
      .from("configuracion_cargos")
      .select("cuota_ordinaria")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error cargando configuración de cargos:", error.message);
      setCuotaOrdinaria(0);
      return;
    }

    setCuotaOrdinaria(Number(data?.cuota_ordinaria || 0));
  }

  async function cargarUnidades(id: string) {
    const { data, error } = await supabase
      .from("unidades")
      .select(
        "id, client_id, codigo, propietario_id, propietario_nombre, propietario_cedula, propietario_telefono, cuota_mensual_actual",
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
      `,
      )
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
      .select(
        `
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
      `,
      )
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
      cargarConfiguracionCargos(condominioId),
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

    const cuotaConfigurada = Number(cuotaOrdinaria || 0);
    const cuotaUnidad = Number(unidad.cuota_mensual_actual || 0);
    const cuota = cuotaConfigurada > 0 ? cuotaConfigurada : cuotaUnidad;

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

  async function validarDuplicadoReferencia(
    referenciaLimpia: string,
    idCondominio: string,
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
    montoPago: number,
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
          error.message,
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
    setBitacoraProceso([]);
    agregarBitacora("Paso 1: Iniciando validación del pago...");

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
      agregarBitacora("Paso 2: Validando referencia duplicada...");
      const referenciaExiste = await validarDuplicadoReferencia(
        referenciaLimpia,
        condominioId,
      );

      if (referenciaExiste) {
        const continuar = confirm(
          "Ya existe un pago registrado con esta referencia. ¿Desea continuar de todas formas?",
        );

        if (!continuar) {
          setGuardando(false);
          return;
        }
      }

      agregarBitacora("Paso 3: Subiendo comprobante, si fue seleccionado...");
      const comprobanteUrl = await subirComprobante(unidad.id);

      agregarBitacora(
        comprobanteUrl
          ? "Paso 3 OK: Comprobante subido correctamente."
          : "Paso 3 OK: No se seleccionó comprobante.",
      );

      agregarBitacora(
        "Paso 4: Buscando cargos pendientes para identificar período pagado...",
      );

      const periodosPago = await obtenerPeriodosPago(
        condominioId,
        unidad.id,
        montoNumerico,
      );

      const periodoPago =
        periodosPago.periodos.length > 0
          ? periodosPago.periodos.join(",")
          : fechaPago.slice(0, 7);

      const descripcionPago = periodosPago.mesesTexto
        ? `Pago mantenimiento ${periodosPago.mesesTexto} - Unidad ${unidad.codigo}`
        : `Pago mantenimiento ${nombreMesPeriodo(fechaPago.slice(0, 7))} - Unidad ${unidad.codigo}`;

      agregarBitacora(
        `Paso 4 OK: Período detectado: ${periodoPago}. Descripción: ${descripcionPago}`,
      );

      agregarBitacora(
        "Paso 5: Ejecutando función central registrar_pago_mantenimiento_completo()...",
      );

      const { data: resultado, error: errorRegistroCompleto } =
        await supabase.rpc("registrar_pago_mantenimiento_completo", {
          p_condominio_id: Number(condominioId),
          p_unidad_id: unidad.id,
          p_fecha_pago: fechaPago,
          p_monto: montoNumerico,
          p_metodo_pago: metodoPago,
          p_referencia: referenciaLimpia,
          p_cuenta_bancaria_id: cuentaAsignada.id,
          p_comprobante_url: comprobanteUrl,
          p_tipo_fondo: tipoFondo,
        });

      if (errorRegistroCompleto) {
        agregarBitacora(
          "ERROR Paso 5: La función central no pudo completar el pago. " +
            errorRegistroCompleto.message,
        );
        alert(
          "No se pudo completar el pago. No debe quedar el proceso a medias: " +
            errorRegistroCompleto.message,
        );
        setGuardando(false);
        await cargarPagos(condominioId);
        return;
      }

      const resultadoRpc = resultado as any;
      const pagoId = Number(resultadoRpc?.pago_id || 0);

      if (!pagoId) {
        agregarBitacora(
          "ERROR Paso 5: La función central respondió sin pago_id.",
        );
        alert(
          "El pago pudo haberse registrado, pero la función no devolvió el ID del pago. Revise la base de datos antes de continuar.",
        );
        setGuardando(false);
        await cargarPagos(condominioId);
        return;
      }

      agregarBitacora(
        `Paso 5 OK: Pago completo registrado. ID pago: ${pagoId}. Banco y cargos actualizados.`,
      );

      if (Number(resultadoRpc?.monto_no_aplicado || 0) > 0) {
        agregarBitacora(
          `AVISO: Quedó monto no aplicado: RD$ ${Number(
            resultadoRpc.monto_no_aplicado,
          ).toLocaleString("es-DO", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
        );
      }

      agregarBitacora("Paso 6: Generando asiento contable...");

      const asientoResultado = await generarAsientoPagoMantenimiento({
        condominio_id: Number(condominioId),
        pago_id: pagoId,
        fecha: fechaPago,
        monto: montoNumerico,
        referencia: referenciaLimpia,
        descripcion: descripcionPago,
        usuario: null,
      });

      if (!asientoResultado.ok) {
        agregarBitacora(
          "ERROR Paso 6: No se pudo generar asiento contable. " +
            asientoResultado.error,
        );
        alert(
          "Pago registrado, cargos y Control Bancario actualizados, pero no se pudo generar el asiento contable: " +
            asientoResultado.error,
        );
      } else {
        agregarBitacora(
          asientoResultado.duplicado
            ? "Paso 6 OK: El asiento contable ya existía."
            : "Paso 6 OK: Asiento contable generado correctamente.",
        );
      }

      agregarBitacora("Paso 7: Proceso completado correctamente.");

      setMensaje(
        "Pago registrado correctamente. Cargos actualizados, Control Bancario recalculado y recibo disponible.",
      );

      setUnidadId("");
      setTipoFondo("ORDINARIO");
      setFechaPago(new Date().toISOString().slice(0, 10));
      setMonto("");
      setMetodoPago("");
      setReferencia("");
      setComprobante(null);

      const inputFile = document.getElementById(
        "comprobante",
      ) as HTMLInputElement | null;

      if (inputFile) inputFile.value = "";

      await cargarCuentas(condominioId);
      await cargarPagos(condominioId);

      router.push(`/recibos/pago/mantenimiento/${pagoId}`);
    } catch (error: any) {
      agregarBitacora(
        "ERROR GENERAL: " + (error.message || "Error registrando el pago."),
      );
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

      {bitacoraProceso.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Bitácora del proceso de pago
            </h3>
            <span className="text-xs text-slate-500">Depuración</span>
          </div>
          <div className="max-h-56 space-y-1 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
            {bitacoraProceso.map((linea, index) => (
              <div
                key={`${linea}-${index}`}
                className={
                  linea.includes("ERROR") ? "font-semibold text-red-700" : ""
                }
              >
                {linea}
              </div>
            ))}
          </div>
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
