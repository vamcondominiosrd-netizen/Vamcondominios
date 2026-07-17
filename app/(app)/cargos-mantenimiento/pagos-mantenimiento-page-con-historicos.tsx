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

type TipoRegistro = "ACTIVO" | "HISTORICO";

type PeriodoHistoricoForm = {
  periodo: string;
  monto: string;
};

type PagoHistorico = {
  id: number;
  unidad_id: number;
  fecha_pago: string;
  monto_total: number;
  referencia_banco: string | null;
  numero_documento: string | null;
  descripcion: string;
  estado: string;
  movimiento_banco_id: number | null;
  archivo_banco_id: number | null;
  pago_identificado_id: number | null;
  pagos_historicos_detalle?: Array<{
    periodo: string;
    monto_aplicado: number;
  }>;
};

type TransaccionHistorica = {
  id: number;
  archivo_banco_id: number | null;
  fecha_posteo: string;
  monto_transaccion: number;
  no_serial: string | null;
  descripcion_banco: string;
  estado: string | null;
};

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function obtenerPermisosLocales(): string[] {
  try {
    const raw = localStorage.getItem("permisos_usuario") || "";
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.map((item) =>
        normalizarTexto(
          typeof item === "string"
            ? item
            : String(item?.codigo || item?.nombre || item?.permiso || ""),
        ),
      );
    }

    return [];
  } catch {
    return (localStorage.getItem("permisos_usuario") || "")
      .split(",")
      .map(normalizarTexto)
      .filter(Boolean);
  }
}

export default function PagosMantenimientoPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState<string>("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [cuotaOrdinaria, setCuotaOrdinaria] = useState<number>(0);

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [pagosHistoricos, setPagosHistoricos] = useState<PagoHistorico[]>([]);
  const [transaccionesHistoricas, setTransaccionesHistoricas] = useState<
    TransaccionHistorica[]
  >([]);

  const [unidadId, setUnidadId] = useState("");
  const [tipoFondo, setTipoFondo] = useState("ORDINARIO");
  const [fechaPago, setFechaPago] = useState("");
  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [referencia, setReferencia] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);

  const [tipoRegistro, setTipoRegistro] = useState<TipoRegistro>("ACTIVO");
  const [puedeGestionarHistoricos, setPuedeGestionarHistoricos] =
    useState(false);
  const [usarTransaccionImportada, setUsarTransaccionImportada] =
    useState(true);
  const [transaccionHistoricaId, setTransaccionHistoricaId] = useState("");
  const [cuentaHistoricaId, setCuentaHistoricaId] = useState("");
  const [descripcionHistorica, setDescripcionHistorica] = useState("");
  const [observacionHistorica, setObservacionHistorica] = useState("");
  const [beneficiarioHistorico, setBeneficiarioHistorico] = useState("");
  const [periodosHistoricos, setPeriodosHistoricos] = useState<
    PeriodoHistoricoForm[]
  >([{ periodo: "", monto: "" }]);

  const [loading, setLoading] = useState(false);
  const [cargandoHistoricos, setCargandoHistoricos] = useState(false);
  const [cargandoTransacciones, setCargandoTransacciones] = useState(false);
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

    const rol = normalizarTexto(
      localStorage.getItem("usuario_rol") || localStorage.getItem("rol") || "",
    );
    const permisos = obtenerPermisosLocales();

    const esAdministrador =
      rol.includes("ADMINISTRADOR GENERAL") ||
      rol.includes("ADMINISTRADOR CONDOMINIO") ||
      rol === "ADMINISTRADOR" ||
      rol === "ADMIN";

    const tienePermisoExplicito = permisos.some((permiso) =>
      [
        "PAGOS HISTORICOS",
        "PAGOS_HISTORICOS",
        "GESTIONAR PAGOS HISTORICOS",
        "GESTIONAR_PAGOS_HISTORICOS",
      ].includes(permiso),
    );

    setPuedeGestionarHistoricos(esAdministrador || tienePermisoExplicito);

    const hoy = new Date().toISOString().slice(0, 10);

    setCondominioId(id);
    setCondominioNombre(nombre);
    setFechaPago(hoy);

    cargarConfiguracionCargos(id);
    cargarUnidades(id);
    cargarCuentas(id);
    cargarPagos(id);
    cargarPagosHistoricos(id);
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

    const cuentasCargadas = (data as CuentaBancaria[]) || [];
    setCuentas(cuentasCargadas);

    if (!cuentaHistoricaId && cuentasCargadas.length > 0) {
      const ordinaria =
        cuentasCargadas.find((cuenta) => cuenta.fondo_tipo === "ORDINARIO") ||
        cuentasCargadas[0];

      setCuentaHistoricaId(String(ordinaria.id));
    }
  }

  async function cargarPagos(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("pagos")
      .select(
        `
        id,
        unidad_id,
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
        bank_transaction_id,
        pago_identificado_id,
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

  async function cargarPagosHistoricos(id: string, idUnidad?: string) {
    setCargandoHistoricos(true);

    let consulta = supabase
      .from("pagos_historicos_propietarios")
      .select(
        `
        id,
        unidad_id,
        fecha_pago,
        monto_total,
        referencia_banco,
        numero_documento,
        descripcion,
        estado,
        movimiento_banco_id,
        archivo_banco_id,
        pago_identificado_id,
        pagos_historicos_detalle (
          periodo,
          monto_aplicado
        )
      `,
      )
      .eq("condominio_id", Number(id))
      .order("fecha_pago", { ascending: false })
      .order("id", { ascending: false });

    if (idUnidad) {
      consulta = consulta.eq("unidad_id", Number(idUnidad));
    }

    const { data, error } = await consulta;

    setCargandoHistoricos(false);

    if (error) {
      console.error("Error cargando pagos históricos:", error.message);
      setPagosHistoricos([]);
      return;
    }

    setPagosHistoricos((data || []) as PagoHistorico[]);
  }

  async function cargarTransaccionesHistoricas(
    idCondominio: string,
    idUnidad: string,
  ) {
    if (!idCondominio || !idUnidad) {
      setTransaccionesHistoricas([]);
      return;
    }

    setCargandoTransacciones(true);

    try {
      const [identificadosRespuesta, pagosRespuesta, historicosRespuesta] =
        await Promise.all([
          supabase
            .from("pagos_identificados")
            .select(
              "id, archivo_banco_id, fecha_posteo, monto_transaccion, no_serial, descripcion_banco, estado",
            )
            .eq("condominio_id", Number(idCondominio))
            .eq("unidad_id", Number(idUnidad))
            .order("fecha_posteo", { ascending: true })
            .order("id", { ascending: true }),

          supabase
            .from("pagos")
            .select("bank_transaction_id, pago_identificado_id")
            .eq("condominio_id", Number(idCondominio))
            .eq("unidad_id", Number(idUnidad)),

          supabase
            .from("pagos_historicos_propietarios")
            .select("archivo_banco_id, pago_identificado_id")
            .eq("condominio_id", Number(idCondominio))
            .eq("unidad_id", Number(idUnidad)),
        ]);

      if (identificadosRespuesta.error) {
        throw identificadosRespuesta.error;
      }

      if (pagosRespuesta.error) {
        throw pagosRespuesta.error;
      }

      if (historicosRespuesta.error) {
        throw historicosRespuesta.error;
      }

      const archivosUsados = new Set<number>();
      const identificadosUsados = new Set<number>();

      for (const pago of pagosRespuesta.data || []) {
        if ((pago as any).bank_transaction_id) {
          archivosUsados.add(Number((pago as any).bank_transaction_id));
        }
        if ((pago as any).pago_identificado_id) {
          identificadosUsados.add(Number((pago as any).pago_identificado_id));
        }
      }

      for (const historico of historicosRespuesta.data || []) {
        if ((historico as any).archivo_banco_id) {
          archivosUsados.add(Number((historico as any).archivo_banco_id));
        }
        if ((historico as any).pago_identificado_id) {
          identificadosUsados.add(
            Number((historico as any).pago_identificado_id),
          );
        }
      }

      const disponibles = (identificadosRespuesta.data || [])
        .filter((item: any) => {
          const archivoId = Number(item.archivo_banco_id || 0);
          const identificadoId = Number(item.id || 0);

          return (
            !archivosUsados.has(archivoId) &&
            !identificadosUsados.has(identificadoId)
          );
        })
        .map((item: any): TransaccionHistorica => ({
          id: Number(item.id),
          archivo_banco_id: item.archivo_banco_id
            ? Number(item.archivo_banco_id)
            : null,
          fecha_posteo: String(item.fecha_posteo || ""),
          monto_transaccion: Number(item.monto_transaccion || 0),
          no_serial: item.no_serial ? String(item.no_serial) : null,
          descripcion_banco: String(item.descripcion_banco || ""),
          estado: item.estado ? String(item.estado) : null,
        }));

      setTransaccionesHistoricas(disponibles);
    } catch (error: any) {
      console.error(
        "Error cargando transacciones históricas:",
        error?.message || error,
      );
      setTransaccionesHistoricas([]);
    }

    setCargandoTransacciones(false);
  }

  async function refrescarDatos() {
    if (!condominioId) return;

    await Promise.all([
      cargarConfiguracionCargos(condominioId),
      cargarUnidades(condominioId),
      cargarCuentas(condominioId),
      cargarPagos(condominioId),
      cargarPagosHistoricos(condominioId, unidadId || undefined),
    ]);

    if (unidadId) {
      await cargarTransaccionesHistoricas(condominioId, unidadId);
    }
  }

  const cuentaAsignada = useMemo(() => {
    return cuentas.find((c) => c.fondo_tipo === tipoFondo) || null;
  }, [cuentas, tipoFondo]);

  const cuentaHistorica = useMemo(() => {
    return (
      cuentas.find((cuenta) => String(cuenta.id) === cuentaHistoricaId) || null
    );
  }, [cuentas, cuentaHistoricaId]);

  const unidadSeleccionada = useMemo(() => {
    return unidades.find((u) => String(u.id) === unidadId) || null;
  }, [unidades, unidadId]);

  const pagosUnidadSeleccionada = useMemo(() => {
    if (!unidadId) return [];

    return pagos.filter(
      (p: any) => String(p.unidad_id || "") === String(unidadId),
    );
  }, [pagos, unidadId]);

  const pagosHistoricosUnidad = useMemo(() => {
    if (!unidadId) return [];

    return pagosHistoricos.filter(
      (pago) => String(pago.unidad_id) === String(unidadId),
    );
  }, [pagosHistoricos, unidadId]);

  const totalDistribuidoHistorico = useMemo(() => {
    return periodosHistoricos.reduce(
      (total, detalle) => total + Number(detalle.monto || 0),
      0,
    );
  }, [periodosHistoricos]);

  function seleccionarUnidad(idUnidad: string) {
    setUnidadId(idUnidad);
    setTransaccionHistoricaId("");
    setTransaccionesHistoricas([]);
    setPeriodosHistoricos([{ periodo: "", monto: "" }]);

    const unidad = unidades.find((u) => String(u.id) === idUnidad);

    if (!unidad) {
      setMonto("");
      setBeneficiarioHistorico("");
      return;
    }

    setBeneficiarioHistorico(unidad.propietario_nombre || unidad.codigo);

    const cuotaConfigurada = Number(cuotaOrdinaria || 0);
    const cuotaUnidad = Number(unidad.cuota_mensual_actual || 0);
    const cuota = cuotaConfigurada > 0 ? cuotaConfigurada : cuotaUnidad;

    if (cuota > 0) {
      setMonto(String(cuota));
    }

    if (condominioId) {
      cargarPagosHistoricos(condominioId, idUnidad);
      cargarTransaccionesHistoricas(condominioId, idUnidad);
    }
  }

  function seleccionarTransaccionHistorica(idSeleccionado: string) {
    setTransaccionHistoricaId(idSeleccionado);

    const transaccion = transaccionesHistoricas.find(
      (item) => String(item.id) === idSeleccionado,
    );

    if (!transaccion) return;

    setFechaPago(transaccion.fecha_posteo);
    setMonto(String(transaccion.monto_transaccion));
    setReferencia(transaccion.no_serial || "");
    setDescripcionHistorica(
      `Pago histórico - ${transaccion.descripcion_banco}`,
    );

    setPeriodosHistoricos((actuales) => {
      if (actuales.length === 1 && !actuales[0].periodo && !actuales[0].monto) {
        return [
          {
            periodo: "",
            monto: String(transaccion.monto_transaccion),
          },
        ];
      }

      return actuales;
    });
  }

  function actualizarPeriodoHistorico(
    index: number,
    campo: keyof PeriodoHistoricoForm,
    valor: string,
  ) {
    setPeriodosHistoricos((actuales) =>
      actuales.map((detalle, posicion) =>
        posicion === index ? { ...detalle, [campo]: valor } : detalle,
      ),
    );
  }

  function agregarPeriodoHistorico() {
    setPeriodosHistoricos((actuales) => [
      ...actuales,
      { periodo: "", monto: "" },
    ]);
  }

  function eliminarPeriodoHistorico(index: number) {
    setPeriodosHistoricos((actuales) => {
      if (actuales.length === 1) {
        return [{ periodo: "", monto: "" }];
      }

      return actuales.filter((_, posicion) => posicion !== index);
    });
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
      alert(
        "No existe cuenta bancaria configurada para el fondo seleccionado.",
      );
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

  async function guardarPagoHistorico(e: React.FormEvent) {
    e.preventDefault();
    setMensaje("");
    setBitacoraProceso([]);

    if (!puedeGestionarHistoricos) {
      alert("No tiene permiso para registrar pagos históricos.");
      return;
    }

    if (!condominioId || !unidadSeleccionada) {
      alert("Debe seleccionar una unidad.");
      return;
    }

    if (!cuentaHistorica) {
      alert("Debe seleccionar una cuenta bancaria.");
      return;
    }

    if (!fechaPago || Number(monto || 0) <= 0) {
      alert("Debe indicar fecha y monto válidos.");
      return;
    }

    if (!metodoPago) {
      alert("Debe seleccionar el método de pago.");
      return;
    }

    if (usarTransaccionImportada && !transaccionHistoricaId) {
      alert("Debe seleccionar una transacción bancaria pendiente.");
      return;
    }

    const detallesValidos = periodosHistoricos
      .map((detalle) => ({
        periodo: detalle.periodo.trim(),
        monto: Number(detalle.monto || 0),
        concepto: "Mantenimiento histórico",
        observacion:
          "Registro histórico; no modifica cargos ni créditos actuales.",
      }))
      .filter((detalle) => detalle.periodo || detalle.monto > 0);

    if (detallesValidos.length === 0) {
      alert("Debe indicar al menos un periodo histórico.");
      return;
    }

    const tieneDetalleInvalido = detallesValidos.some(
      (detalle) =>
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(detalle.periodo) || detalle.monto <= 0,
    );

    if (tieneDetalleInvalido) {
      alert("Revise los periodos y montos históricos.");
      return;
    }

    const montoNumerico = Number(monto || 0);

    if (
      Math.round(totalDistribuidoHistorico * 100) !==
      Math.round(montoNumerico * 100)
    ) {
      alert(
        `El total distribuido (${totalDistribuidoHistorico.toFixed(
          2,
        )}) debe coincidir con el monto depositado (${montoNumerico.toFixed(
          2,
        )}).`,
      );
      return;
    }

    const transaccion = transaccionesHistoricas.find(
      (item) => String(item.id) === transaccionHistoricaId,
    );

    setGuardando(true);
    agregarBitacora("Pago histórico: iniciando validación...");

    try {
      const descripcionFinal =
        descripcionHistorica.trim() ||
        `Pago histórico de mantenimiento - Unidad ${unidadSeleccionada.codigo}`;

      const numeroDocumento = `HIST-${unidadSeleccionada.codigo}-${Date.now()}`;

      agregarBitacora(
        "Pago histórico: ejecutando registrar_pago_historico_completo()...",
      );

      const { data, error } = await supabase.rpc(
        "registrar_pago_historico_completo",
        {
          p_condominio_id: Number(condominioId),
          p_unidad_id: unidadSeleccionada.id,
          p_cuenta_bancaria_id: cuentaHistorica.id,
          p_fecha_pago: fechaPago,
          p_monto_total: montoNumerico,
          p_metodo_pago: metodoPago,
          p_referencia_banco: referencia.trim() || null,
          p_numero_documento: numeroDocumento,
          p_descripcion: descripcionFinal,
          p_observacion: observacionHistorica.trim() || null,
          p_archivo_banco_id:
            usarTransaccionImportada && transaccion?.archivo_banco_id
              ? transaccion.archivo_banco_id
              : null,
          p_pago_identificado_id:
            usarTransaccionImportada && transaccion ? transaccion.id : null,
          p_beneficiario:
            beneficiarioHistorico.trim() ||
            unidadSeleccionada.propietario_nombre ||
            unidadSeleccionada.codigo,
          p_periodos: detallesValidos,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      const resultado = data as any;

      agregarBitacora(
        `Pago histórico registrado. ID: ${resultado?.pago_historico_id || "-"}. Movimiento bancario: ${
          resultado?.movimiento_banco_id || "-"
        }.`,
      );

      setMensaje(
        "Pago histórico registrado correctamente. Se agregó al Control Bancario sin afectar cargos ni créditos actuales.",
      );

      setTransaccionHistoricaId("");
      setDescripcionHistorica("");
      setObservacionHistorica("");
      setReferencia("");
      setMonto("");
      setMetodoPago("");
      setPeriodosHistoricos([{ periodo: "", monto: "" }]);

      await Promise.all([
        cargarPagosHistoricos(condominioId, unidadId),
        cargarTransaccionesHistoricas(condominioId, unidadId),
        cargarCuentas(condominioId),
      ]);
    } catch (error: any) {
      agregarBitacora(
        "ERROR PAGO HISTÓRICO: " + (error?.message || "No se pudo registrar."),
      );
      alert(error?.message || "No se pudo registrar el pago histórico.");
    }

    setGuardando(false);
  }

  const pagosResumen = unidadId ? pagosUnidadSeleccionada : pagos;

  const totalPagado = pagosResumen.reduce(
    (sum, p) => sum + Number(p.monto || 0),
    0,
  );
  const cantidadPagos = pagosResumen.length;
  const promedioPago = cantidadPagos > 0 ? totalPagado / cantidadPagos : 0;
  const ultimoPago = pagosResumen[0]?.fecha_pago || "-";

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

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-black text-slate-900">
          Tipo de registro
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setTipoRegistro("ACTIVO")}
            className={`rounded-xl border p-4 text-left transition ${
              tipoRegistro === "ACTIVO"
                ? "border-blue-600 bg-blue-50 text-blue-900"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <p className="font-black">Pago de periodo activo</p>
            <p className="mt-1 text-xs">
              Aplica a cargos actuales, actualiza el Control Bancario y genera
              recibo.
            </p>
          </button>

          <button
            type="button"
            disabled={!puedeGestionarHistoricos}
            onClick={() => setTipoRegistro("HISTORICO")}
            className={`rounded-xl border p-4 text-left transition ${
              tipoRegistro === "HISTORICO"
                ? "border-amber-600 bg-amber-50 text-amber-950"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <p className="font-black">Pago histórico</p>
            <p className="mt-1 text-xs">
              Registra periodos anteriores sin afectar cargos ni créditos
              actuales.
            </p>
          </button>
        </div>

        {!puedeGestionarHistoricos && (
          <p className="mt-3 text-xs font-semibold text-amber-700">
            El registro histórico está disponible solo para administradores o
            usuarios con permiso específico.
          </p>
        )}
      </div>

      {tipoRegistro === "ACTIVO" && (
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
      )}

      {tipoRegistro === "HISTORICO" && puedeGestionarHistoricos && (
        <form
          onSubmit={guardarPagoHistorico}
          className="space-y-5 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Registrar pago histórico
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              El ingreso se enviará al Control Bancario, pero no pagará cargos
              actuales ni generará saldo a favor.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Unidad
              <select
                value={unidadId}
                onChange={(event) => seleccionarUnidad(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                required
              >
                <option value="">Seleccione una unidad</option>
                {unidades.map((unidad) => (
                  <option key={unidad.id} value={unidad.id}>
                    {unidad.codigo}
                    {unidad.propietario_nombre
                      ? ` - ${unidad.propietario_nombre}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Cuenta bancaria
              <select
                value={cuentaHistoricaId}
                onChange={(event) => setCuentaHistoricaId(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                required
              >
                <option value="">Seleccione la cuenta</option>
                {cuentas.map((cuenta) => (
                  <option key={cuenta.id} value={cuenta.id}>
                    {cuenta.nombre_banco} - {cuenta.numero_cuenta}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Método de pago
              <select
                value={metodoPago}
                onChange={(event) => setMetodoPago(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                required
              >
                <option value="">Seleccione</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="DEPÓSITO">Depósito</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-black text-slate-900">
                  Fuente del pago histórico
                </p>
                <p className="text-xs text-slate-600">
                  Use la transacción importada cuando el depósito esté en el
                  archivo del banco.
                </p>
              </div>

              <div className="flex rounded-lg border border-slate-300 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setUsarTransaccionImportada(true)}
                  className={`rounded-md px-3 py-2 text-xs font-bold ${
                    usarTransaccionImportada
                      ? "bg-slate-900 text-white"
                      : "text-slate-600"
                  }`}
                >
                  Archivo bancario
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsarTransaccionImportada(false);
                    setTransaccionHistoricaId("");
                  }}
                  className={`rounded-md px-3 py-2 text-xs font-bold ${
                    !usarTransaccionImportada
                      ? "bg-slate-900 text-white"
                      : "text-slate-600"
                  }`}
                >
                  Registro manual
                </button>
              </div>
            </div>

            {usarTransaccionImportada && (
              <label className="mt-4 block space-y-1 text-sm font-semibold text-slate-700">
                Transacción bancaria pendiente
                <select
                  value={transaccionHistoricaId}
                  onChange={(event) =>
                    seleccionarTransaccionHistorica(event.target.value)
                  }
                  disabled={!unidadId || cargandoTransacciones}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"
                  required
                >
                  <option value="">
                    {cargandoTransacciones
                      ? "Cargando transacciones..."
                      : "Seleccione una transacción"}
                  </option>
                  {transaccionesHistoricas.map((transaccion) => (
                    <option key={transaccion.id} value={transaccion.id}>
                      {transaccion.fecha_posteo} | RD${" "}
                      {transaccion.monto_transaccion.toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      | {transaccion.descripcion_banco}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Fecha real del depósito
              <input
                type="date"
                value={fechaPago}
                onChange={(event) => setFechaPago(event.target.value)}
                readOnly={usarTransaccionImportada && !!transaccionHistoricaId}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 read-only:bg-slate-100"
                required
              />
            </label>

            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Monto total
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={monto}
                onChange={(event) => setMonto(event.target.value)}
                readOnly={usarTransaccionImportada && !!transaccionHistoricaId}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 read-only:bg-slate-100"
                required
              />
            </label>

            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Referencia bancaria
              <input
                type="text"
                value={referencia}
                onChange={(event) => setReferencia(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Beneficiario / propietario
              <input
                type="text"
                value={beneficiarioHistorico}
                onChange={(event) =>
                  setBeneficiarioHistorico(event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

          <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-black text-blue-950">
                  Periodos históricos cubiertos
                </p>
                <p className="text-xs text-blue-800">
                  El total distribuido debe coincidir con el monto depositado.
                </p>
              </div>

              <button
                type="button"
                onClick={agregarPeriodoHistorico}
                className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white"
              >
                + Agregar periodo
              </button>
            </div>

            <div className="space-y-2">
              {periodosHistoricos.map((detalle, index) => (
                <div
                  key={`periodo-historico-${index}`}
                  className="grid gap-2 rounded-xl bg-white p-3 md:grid-cols-[1fr_1fr_auto]"
                >
                  <label className="space-y-1 text-xs font-bold text-slate-700">
                    Periodo
                    <input
                      type="month"
                      value={detalle.periodo}
                      onChange={(event) =>
                        actualizarPeriodoHistorico(
                          index,
                          "periodo",
                          event.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      required
                    />
                  </label>

                  <label className="space-y-1 text-xs font-bold text-slate-700">
                    Monto aplicado
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={detalle.monto}
                      onChange={(event) =>
                        actualizarPeriodoHistorico(
                          index,
                          "monto",
                          event.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      required
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => eliminarPeriodoHistorico(index)}
                    className="self-end rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-700"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-4 text-sm font-black">
              <span>
                Monto: RD${" "}
                {Number(monto || 0).toLocaleString("es-DO", {
                  minimumFractionDigits: 2,
                })}
              </span>
              <span
                className={
                  Math.round(totalDistribuidoHistorico * 100) ===
                  Math.round(Number(monto || 0) * 100)
                    ? "text-emerald-700"
                    : "text-red-700"
                }
              >
                Distribuido: RD${" "}
                {totalDistribuidoHistorico.toLocaleString("es-DO", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Descripción
              <textarea
                value={descripcionHistorica}
                onChange={(event) =>
                  setDescripcionHistorica(event.target.value)
                }
                rows={3}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="Ej.: Pago histórico correspondiente a agosto-diciembre de 2025."
              />
            </label>

            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Observación
              <textarea
                value={observacionHistorica}
                onChange={(event) =>
                  setObservacionHistorica(event.target.value)
                }
                rows={3}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="Motivo y aclaraciones para auditoría."
              />
            </label>
          </div>

          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-black">Efecto del registro</p>
            <p className="mt-1">
              Se registrará como ingreso bancario en la fecha indicada y como
              historial del propietario. No modificará cargos, balances de
              cargos ni créditos actuales.
            </p>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="w-full rounded-xl bg-amber-600 px-4 py-3 font-black text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {guardando ? "Registrando..." : "Registrar pago histórico"}
          </button>
        </form>
      )}

      {unidadId && unidadSeleccionada && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-black">
            Historial filtrado por unidad: {unidadSeleccionada.codigo}
          </p>
          <p className="mt-1">
            Se muestran los pagos activos y los pagos históricos registrados
            para esta unidad.
          </p>
        </div>
      )}

      {!unidadId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-black">
            Seleccione una unidad para ver su historial.
          </p>
          <p className="mt-1">
            El historial de pagos se mostrará debajo solamente para la unidad
            seleccionada.
          </p>
        </div>
      )}

      <PagoHistorial
        pagos={unidadId ? pagosUnidadSeleccionada : []}
        loading={loading}
      />

      {unidadId && (
        <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50 px-5 py-4">
            <div>
              <h3 className="font-black text-amber-950">Pagos históricos</h3>
              <p className="text-xs text-amber-800">
                No afectan cargos ni créditos actuales.
              </p>
            </div>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-900">
              {pagosHistoricosUnidad.length} registro(s)
            </span>
          </div>

          {cargandoHistoricos ? (
            <div className="p-6 text-sm text-slate-500">
              Cargando pagos históricos...
            </div>
          ) : pagosHistoricosUnidad.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              Esta unidad no tiene pagos históricos registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Fecha depósito</th>
                    <th className="px-4 py-3">Periodos cubiertos</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3">Referencia</th>
                    <th className="px-4 py-3">Movimiento banco</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pagosHistoricosUnidad.map((historico) => {
                    const periodos = (historico.pagos_historicos_detalle || [])
                      .map((detalle) => nombreMesPeriodo(detalle.periodo))
                      .join(", ");

                    return (
                      <tr
                        key={historico.id}
                        className="border-t border-slate-100"
                      >
                        <td className="px-4 py-3">{historico.fecha_pago}</td>
                        <td className="px-4 py-3">
                          {periodos || "Sin distribución"}
                        </td>
                        <td className="px-4 py-3 text-right font-black">
                          RD${" "}
                          {Number(historico.monto_total || 0).toLocaleString(
                            "es-DO",
                            {
                              minimumFractionDigits: 2,
                            },
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {historico.referencia_banco || "-"}
                        </td>
                        <td className="px-4 py-3">
                          {historico.movimiento_banco_id || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-black ${
                              historico.estado === "REGISTRADO"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {historico.estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
