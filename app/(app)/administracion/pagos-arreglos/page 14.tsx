"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Unidad = {
  id: number;
  codigo: string | null;
  propietario_nombre?: string | null;
};

type Pago = {
  id: number;
  client_id: number | null;
  condominio_id: number;
  unidad_id: number | null;
  fecha_pago: string | null;
  periodo: string | null;
  monto: number | string | null;
  metodo: string | null;
  metodo_pago: string | null;
  referencia: string | null;
  descripcion: string | null;
  origen: string | null;
  cuenta_bancaria_id: number | null;
  tipo_fondo: string | null;
  comprobante_url: string | null;
  bank_transaction_id: number | null;
  pago_identificado_id: number | null;
  created_at: string | null;
};

type BancoMap = Record<
  string,
  {
    id: number;
    periodo: string | null;
    monto: number | string | null;
    saldo_movimiento: number | string | null;
  }
>;

type EditForm = {
  id: number;
  unidad_id: number | null;
  unidad_codigo: string;
  fecha_pago: string;
  periodo: string;
  monto: string;
  referencia: string;
  descripcion: string;
  cuenta_bancaria_id: string;
  metodo_pago: string;
  tipo_fondo: string;
  comprobante_url_actual: string;
  firma_original: string;
};



type PeriodoHistoricoForm = {
  periodo: string;
  monto: string;
};

type HistoricoForm = {
  pago_id: number;
  unidad_id: number;
  unidad_codigo: string;
  fecha_pago: string;
  monto: number;
  referencia: string;
  descripcion: string;
  bank_transaction_id: number | null;
  pago_identificado_id: number | null;
  periodos: PeriodoHistoricoForm[];
  motivo: string;
};


type ReconciliacionCargo = {
  cargo_id: number;
  periodo: string;
  concepto?: string | null;
  monto_cargo: number;
  pagado_actual: number;
  balance_actual: number;
  estado_actual: string;
  pagado_propuesto: number;
  balance_propuesto: number;
  estado_propuesto: string;
};

type ReconciliacionPreview = {
  ok?: boolean;
  condominio_id: number;
  unidad_id: number;
  unidad?: string | null;
  anio: number;
  cantidad_pagos?: number;
  total_pagos_vigentes: number;
  total_cargos: number;
  total_pagado_actual: number;
  total_pagado_propuesto: number;
  saldo_sin_aplicar: number;
  cargos: ReconciliacionCargo[];
  advertencias?: string[];
  mensaje?: string;
};

type ReconciliacionForm = {
  unidad_id: number;
  unidad_codigo: string;
  anio: number;
  motivo: string;
  preview: ReconciliacionPreview | null;
};

type DatosEditablesPago = Pick<
  EditForm,
  | "fecha_pago"
  | "periodo"
  | "monto"
  | "referencia"
  | "descripcion"
  | "cuenta_bancaria_id"
  | "metodo_pago"
  | "tipo_fondo"
>;

function crearFirmaPago(form: DatosEditablesPago) {
  return JSON.stringify({
    fecha_pago: form.fecha_pago,
    periodo: form.periodo || "",
    monto: Number(form.monto || 0).toFixed(2),
    referencia: form.referencia.trim(),
    descripcion: form.descripcion.trim(),
    cuenta_bancaria_id: form.cuenta_bancaria_id || "",
    metodo_pago: form.metodo_pago.trim(),
    tipo_fondo: form.tipo_fondo || "",
  });
}

function money(value: number | string | null | undefined) {
  const n = Number(value || 0);
  return n.toLocaleString("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  });
}

function safeDate(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function AdminPagosPage() {
  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [bancoMap, setBancoMap] = useState<BancoMap>({});

  const [unidadFiltro, setUnidadFiltro] = useState("");
  const [fechaDesdeFiltro, setFechaDesdeFiltro] = useState("");
  const [fechaHastaFiltro, setFechaHastaFiltro] = useState("");
  const [textoFiltro, setTextoFiltro] = useState("");

  const [editando, setEditando] = useState<EditForm | null>(null);
  const [comprobanteArchivo, setComprobanteArchivo] = useState<File | null>(null);
  const [comprobanteInputKey, setComprobanteInputKey] = useState(0);
  const [historicoEditando, setHistoricoEditando] = useState<HistoricoForm | null>(null);
  const [convirtiendoHistorico, setConvirtiendoHistorico] = useState(false);
  const [reconciliando, setReconciliando] = useState<ReconciliacionForm | null>(null);
  const [cargandoReconciliacion, setCargandoReconciliacion] = useState(false);
  const [aplicandoReconciliacion, setAplicandoReconciliacion] = useState(false);

  const unidadMap = useMemo(() => {
    const map: Record<number, Unidad> = {};
    unidades.forEach((u) => {
      map[u.id] = u;
    });
    return map;
  }, [unidades]);

  useEffect(() => {
    const id =
      localStorage.getItem("condominio_id") ||
      localStorage.getItem("condominioId") ||
      localStorage.getItem("id_condominio");

    if (id && !Number.isNaN(Number(id))) {
      setCondominioId(Number(id));
      return;
    }

    cargarCondominioDesdePerfil();
  }, []);

  useEffect(() => {
    if (!condominioId) return;
    cargarUnidades();
    cargarPagos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condominioId]);

  async function cargarCondominioDesdePerfil() {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;

    if (!userId) {
      setError("No se pudo identificar el usuario logueado.");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("condominio_id")
      .eq("id", userId)
      .single();

    if (error || !data?.condominio_id) {
      setError("No se pudo identificar el condominio del usuario logueado.");
      return;
    }

    setCondominioId(Number(data.condominio_id));
  }

  async function cargarUnidades() {
    if (!condominioId) return;

    const { data, error } = await supabase
      .from("unidades")
      .select("id,codigo,propietario_nombre")
      .eq("condominio_id", condominioId)
      .order("codigo", { ascending: true });

    if (error) {
      setError("Error cargando unidades: " + error.message);
      return;
    }

    setUnidades((data || []) as Unidad[]);
  }

  async function cargarPagos() {
    if (!condominioId) return;

    setLoading(true);
    setError("");
    setMensaje("");

    let query = supabase
      .from("pagos")
      .select(
        "id,client_id,condominio_id,unidad_id,fecha_pago,periodo,monto,metodo,metodo_pago,referencia,descripcion,origen,cuenta_bancaria_id,tipo_fondo,comprobante_url,bank_transaction_id,pago_identificado_id,created_at"
      )
      .eq("condominio_id", condominioId)
      .order("fecha_pago", { ascending: false })
      .order("id", { ascending: false })
      .limit(300);

    if (unidadFiltro) {
      query = query.eq("unidad_id", Number(unidadFiltro));
    }

    if (fechaDesdeFiltro) {
      query = query.gte("fecha_pago", fechaDesdeFiltro);
    }

    if (fechaHastaFiltro) {
      query = query.lte("fecha_pago", fechaHastaFiltro);
    }

    if (textoFiltro.trim()) {
      const t = textoFiltro.trim();
      query = query.or(
        `descripcion.ilike.%${t}%,referencia.ilike.%${t}%,periodo.ilike.%${t}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      setError("Error cargando pagos: " + error.message);
      setLoading(false);
      return;
    }

    const lista = (data || []) as Pago[];
    setPagos(lista);
    await cargarBancoDePagos(lista);
    setLoading(false);
  }

  async function cargarBancoDePagos(lista: Pago[]) {
    const ids = lista.map((p) => String(p.id));
    if (ids.length === 0 || !condominioId) {
      setBancoMap({});
      return;
    }

    const { data, error } = await supabase
      .from("banco_movimientos")
      .select("id,numero_documento,periodo,monto,saldo_movimiento")
      .eq("condominio_id", condominioId)
      .eq("origen", "PAGO_PROPIETARIO")
      .in("numero_documento", ids);

    if (error) {
      setBancoMap({});
      return;
    }

    const map: BancoMap = {};
    (data || []).forEach((b: any) => {
      if (b.numero_documento) map[b.numero_documento] = b;
    });
    setBancoMap(map);
  }

  function abrirEdicion(p: Pago) {
    const unidad = p.unidad_id ? unidadMap[p.unidad_id] : null;

    const formBase = {
      id: p.id,
      unidad_id: p.unidad_id,
      unidad_codigo: unidad?.codigo || "",
      fecha_pago: safeDate(p.fecha_pago),
      periodo: p.periodo || "",
      monto: String(p.monto || ""),
      referencia: p.referencia || "",
      descripcion: p.descripcion || "",
      cuenta_bancaria_id: p.cuenta_bancaria_id ? String(p.cuenta_bancaria_id) : "",
      metodo_pago: p.metodo_pago || p.metodo || "",
      tipo_fondo: p.tipo_fondo || "ORDINARIO",
      comprobante_url_actual: p.comprobante_url || "",
    };

    setComprobanteArchivo(null);
    setComprobanteInputKey((key) => key + 1);
    setEditando({
      ...formBase,
      firma_original: crearFirmaPago(formBase),
    });
  }

  function cerrarEdicion() {
    if (saving) return;
    setEditando(null);
    setComprobanteArchivo(null);
    setComprobanteInputKey((key) => key + 1);
  }

  function validarComprobante(archivo: File) {
    const tiposPermitidos = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    const extensionesPermitidas = ["pdf", "jpg", "jpeg", "png", "webp"];
    const extension = archivo.name.split(".").pop()?.toLowerCase() || "";

    if (
      !tiposPermitidos.includes(archivo.type) &&
      !extensionesPermitidas.includes(extension)
    ) {
      throw new Error("El comprobante debe ser PDF, JPG, JPEG, PNG o WEBP.");
    }

    const limiteBytes = 10 * 1024 * 1024;
    if (archivo.size > limiteBytes) {
      throw new Error("El comprobante no puede superar los 10 MB.");
    }
  }

  async function subirComprobanteEditado(form: EditForm) {
    if (!comprobanteArchivo || !condominioId) return null;

    validarComprobante(comprobanteArchivo);

    const extension =
      comprobanteArchivo.name.split(".").pop()?.toLowerCase() || "bin";
    const unidadArchivo = form.unidad_id || "sin-unidad";
    const rutaArchivo = `${condominioId}/${Date.now()}-pago-${form.id}-unidad-${unidadArchivo}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("comprobantes-pagos")
      .upload(rutaArchivo, comprobanteArchivo, {
        upsert: false,
        contentType: comprobanteArchivo.type || undefined,
      });

    if (uploadError) {
      throw new Error("Error subiendo el comprobante: " + uploadError.message);
    }

    const { data: publicData } = supabase.storage
      .from("comprobantes-pagos")
      .getPublicUrl(rutaArchivo);

    return {
      rutaArchivo,
      comprobanteUrl: publicData.publicUrl,
    };
  }

  async function guardarEdicion() {
    if (!editando) return;

    const monto = Number(editando.monto);
    if (!editando.fecha_pago) {
      alert("Debe indicar fecha de pago.");
      return;
    }
    if (!monto || monto <= 0) {
      alert("El monto debe ser mayor que cero.");
      return;
    }

    const datosPagoCambiaron =
      crearFirmaPago(editando) !== editando.firma_original;

    if (!datosPagoCambiaron && !comprobanteArchivo) {
      alert("No hay cambios para guardar.");
      return;
    }

    const mensajeConfirmacion = datosPagoCambiaron
      ? comprobanteArchivo
        ? "Esta acción actualizará el pago, reversará y reaplicará cargos, sincronizará el movimiento bancario y reemplazará el comprobante. ¿Continuar?"
        : "Esta acción actualizará el pago, reversará y reaplicará cargos, y sincronizará el movimiento bancario. ¿Continuar?"
      : "Esta acción reemplazará solamente el comprobante del pago. El archivo anterior se conservará como respaldo. ¿Continuar?";

    const confirmar = confirm(mensajeConfirmacion);
    if (!confirmar) return;

    setSaving(true);
    setError("");
    setMensaje("");

    let comprobanteSubido: {
      rutaArchivo: string;
      comprobanteUrl: string;
    } | null = null;

    try {
      if (comprobanteArchivo) {
        comprobanteSubido = await subirComprobanteEditado(editando);
      }

      let mensajeRpc = "";

      if (datosPagoCambiaron) {
        const { data, error: rpcError } = await supabase.rpc(
          "admin_actualizar_pago_seguro",
          {
            p_pago_id: editando.id,
            p_fecha_pago: editando.fecha_pago,
            p_periodo: editando.periodo || null,
            p_monto: monto,
            p_referencia: editando.referencia || null,
            p_descripcion: editando.descripcion || null,
            p_cuenta_bancaria_id: editando.cuenta_bancaria_id
              ? Number(editando.cuenta_bancaria_id)
              : null,
            p_metodo_pago: editando.metodo_pago || null,
            p_tipo_fondo: editando.tipo_fondo || null,
          }
        );

        if (rpcError) {
          if (comprobanteSubido) {
            await supabase.storage
              .from("comprobantes-pagos")
              .remove([comprobanteSubido.rutaArchivo]);
          }
          throw new Error("Error actualizando pago: " + rpcError.message);
        }

        mensajeRpc = data?.mensaje || "Pago actualizado correctamente.";
      }

      if (comprobanteSubido) {
        const { error: comprobanteError } = await supabase
          .from("pagos")
          .update({ comprobante_url: comprobanteSubido.comprobanteUrl })
          .eq("id", editando.id)
          .eq("condominio_id", condominioId);

        if (comprobanteError) {
          await supabase.storage
            .from("comprobantes-pagos")
            .remove([comprobanteSubido.rutaArchivo]);

          throw new Error(
            datosPagoCambiaron
              ? "Los datos del pago fueron actualizados, pero no se pudo cambiar el comprobante: " +
                  comprobanteError.message
              : "No se pudo cambiar el comprobante: " + comprobanteError.message
          );
        }
      }

      const mensajeFinal = datosPagoCambiaron
        ? comprobanteSubido
          ? `${mensajeRpc} Comprobante reemplazado correctamente.`
          : mensajeRpc
        : "Comprobante reemplazado correctamente.";

      setEditando(null);
      setComprobanteArchivo(null);
      setComprobanteInputKey((key) => key + 1);
      await cargarPagos();
      setMensaje(mensajeFinal);
    } catch (err: any) {
      const mensajeError =
        err?.message || "No se pudo completar la actualización del pago.";
      await cargarPagos();
      setError(mensajeError);
    } finally {
      setSaving(false);
    }
  }

  function abrirConversionHistorica(p: Pago) {
    if (!p.unidad_id) {
      setError("El pago no tiene una unidad asociada y no puede convertirse a histórico.");
      return;
    }

    const unidad = unidadMap[p.unidad_id];

    setHistoricoEditando({
      pago_id: p.id,
      unidad_id: p.unidad_id,
      unidad_codigo: unidad?.codigo || `Unidad ${p.unidad_id}`,
      fecha_pago: safeDate(p.fecha_pago),
      monto: Number(p.monto || 0),
      referencia: p.referencia || "",
      descripcion: p.descripcion || "",
      bank_transaction_id: p.bank_transaction_id,
      pago_identificado_id: p.pago_identificado_id,
      periodos: [{ periodo: "", monto: String(Number(p.monto || 0)) }],
      motivo: "",
    });
    setError("");
    setMensaje("");
  }

  function cerrarConversionHistorica() {
    if (convirtiendoHistorico) return;
    setHistoricoEditando(null);
  }

  function actualizarPeriodoHistorico(
    index: number,
    campo: keyof PeriodoHistoricoForm,
    valor: string,
  ) {
    setHistoricoEditando((actual) => {
      if (!actual) return actual;
      return {
        ...actual,
        periodos: actual.periodos.map((item, posicion) =>
          posicion === index ? { ...item, [campo]: valor } : item,
        ),
      };
    });
  }

  function agregarPeriodoHistorico() {
    setHistoricoEditando((actual) =>
      actual
        ? { ...actual, periodos: [...actual.periodos, { periodo: "", monto: "" }] }
        : actual,
    );
  }

  function quitarPeriodoHistorico(index: number) {
    setHistoricoEditando((actual) => {
      if (!actual || actual.periodos.length <= 1) return actual;
      return {
        ...actual,
        periodos: actual.periodos.filter((_, posicion) => posicion !== index),
      };
    });
  }

  async function convertirPagoAHistorico() {
    if (!historicoEditando || !condominioId) return;

    const detalles = historicoEditando.periodos
      .map((item) => ({
        periodo: item.periodo.trim(),
        monto: Number(item.monto || 0),
        concepto: "Mantenimiento histórico",
        observacion: historicoEditando.motivo.trim(),
      }))
      .filter((item) => item.periodo || item.monto > 0);

    if (detalles.length === 0) {
      alert("Debe indicar al menos un período histórico.");
      return;
    }

    const periodosInvalidos = detalles.filter(
      (item) => !/^\d{4}-(0[1-9]|1[0-2])$/.test(item.periodo) || item.monto <= 0,
    );

    if (periodosInvalidos.length > 0) {
      alert("Revise los períodos históricos y sus montos.");
      return;
    }

    const periodoBanco = historicoEditando.fecha_pago.slice(0, 7);
    const periodoNoHistorico = detalles.find((item) => item.periodo >= periodoBanco);
    if (periodoNoHistorico) {
      alert(
        `El período ${periodoNoHistorico.periodo} no es anterior al período bancario ${periodoBanco}.`,
      );
      return;
    }

    const periodosUnicos = new Set(detalles.map((item) => item.periodo));
    if (periodosUnicos.size !== detalles.length) {
      alert("No puede repetir un mismo período histórico.");
      return;
    }

    const totalDistribuido = detalles.reduce((total, item) => total + item.monto, 0);
    if (Math.round(totalDistribuido * 100) !== Math.round(historicoEditando.monto * 100)) {
      alert(
        `La distribución suma ${money(totalDistribuido)} y debe coincidir con el pago ${money(historicoEditando.monto)}.`,
      );
      return;
    }

    if (historicoEditando.motivo.trim().length < 8) {
      alert("Debe indicar un motivo de corrección de al menos 8 caracteres.");
      return;
    }

    const detalleTexto = detalles
      .map((item) => `${item.periodo}: ${money(item.monto)}`)
      .join("\n");

    const confirmar = window.confirm(
      [
        `Convertir pago #${historicoEditando.pago_id} a PAGO HISTÓRICO`,
        `Unidad: ${historicoEditando.unidad_codigo}`,
        `Fecha real del banco: ${historicoEditando.fecha_pago}`,
        `Monto: ${money(historicoEditando.monto)}`,
        "",
        "Períodos históricos:",
        detalleTexto,
        "",
        "El sistema reversará las aplicaciones o créditos actuales de este pago, conservará el ingreso bancario en su fecha real y lo moverá al historial del propietario.",
        "",
        "¿Desea continuar?",
      ].join("\n"),
    );

    if (!confirmar) return;

    setConvirtiendoHistorico(true);
    setError("");
    setMensaje("");

    try {
      const descripcionFinal =
        historicoEditando.descripcion.trim() ||
        `Pago histórico de mantenimiento - Unidad ${historicoEditando.unidad_codigo}`;

      const { data, error: rpcError } = await supabase.rpc(
        "admin_convertir_pago_a_historico",
        {
          p_pago_id: historicoEditando.pago_id,
          p_periodos: detalles,
          p_motivo: historicoEditando.motivo.trim(),
          p_descripcion: descripcionFinal,
        },
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const resultado = data as any;
      setHistoricoEditando(null);
      await cargarPagos();
      setMensaje(
        resultado?.mensaje ||
          `Pago #${historicoEditando.pago_id} convertido correctamente a pago histórico.`,
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "No se pudo convertir el pago a histórico. No se realizaron cambios parciales desde esta pantalla.",
      );
    } finally {
      setConvirtiendoHistorico(false);
    }
  }

  async function abrirReconciliacion(p: Pago) {
    if (!p.unidad_id) {
      setError("El pago no tiene una unidad asociada y no puede reconciliarse.");
      return;
    }

    const unidad = unidadMap[p.unidad_id];
    const anioPago = Number(String(p.fecha_pago || "").slice(0, 4));
    const anio =
      anioPago >= 2000 && anioPago <= 2100
        ? anioPago
        : new Date().getFullYear();

    const form: ReconciliacionForm = {
      unidad_id: p.unidad_id,
      unidad_codigo: unidad?.codigo || `Unidad ${p.unidad_id}`,
      anio,
      motivo: "",
      preview: null,
    };

    setReconciliando(form);
    setError("");
    setMensaje("");
    await cargarVistaPreviaReconciliacion(form);
  }

  function cerrarReconciliacion() {
    if (cargandoReconciliacion || aplicandoReconciliacion) return;
    setReconciliando(null);
  }

  async function cargarVistaPreviaReconciliacion(
    formOverride?: ReconciliacionForm,
  ) {
    const form = formOverride || reconciliando;
    if (!form || !condominioId) return;

    if (!form.anio || form.anio < 2000 || form.anio > 2100) {
      alert("Debe indicar un año válido para la reconciliación.");
      return;
    }

    setCargandoReconciliacion(true);
    setError("");

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "admin_reconciliar_cargos_unidad",
        {
          p_condominio_id: condominioId,
          p_unidad_id: form.unidad_id,
          p_anio: form.anio,
          p_solo_validar: true,
          p_motivo: null,
        },
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const preview = data as ReconciliacionPreview;
      setReconciliando((actual) =>
        actual
          ? {
              ...actual,
              anio: form.anio,
              preview: {
                ...preview,
                cargos: Array.isArray(preview?.cargos) ? preview.cargos : [],
                advertencias: Array.isArray(preview?.advertencias)
                  ? preview.advertencias
                  : [],
              },
            }
          : actual,
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "No se pudo generar la vista previa de reconciliación.",
      );
    } finally {
      setCargandoReconciliacion(false);
    }
  }

  async function aplicarReconciliacionCargos() {
    if (!reconciliando || !condominioId) return;

    if (!reconciliando.preview) {
      alert("Primero debe generar la vista previa.");
      return;
    }

    if (reconciliando.motivo.trim().length < 8) {
      alert("Debe indicar un motivo de corrección de al menos 8 caracteres.");
      return;
    }

    const preview = reconciliando.preview;
    const confirmar = window.confirm(
      [
        `RECONCILIAR CARGOS - ${reconciliando.unidad_codigo}`,
        `Año: ${reconciliando.anio}`,
        `Pagos vigentes: ${money(preview.total_pagos_vigentes)}`,
        `Pagado actual en cargos: ${money(preview.total_pagado_actual)}`,
        `Pagado propuesto: ${money(preview.total_pagado_propuesto)}`,
        `Saldo sin aplicar: ${money(preview.saldo_sin_aplicar)}`,
        "",
        "Esta acción reconstruirá las aplicaciones del año y recalculará monto_pagado, balance y estado de los cargos. No modificará los depósitos ni movimientos del banco.",
        "",
        "¿Desea continuar?",
      ].join("\n"),
    );

    if (!confirmar) return;

    setAplicandoReconciliacion(true);
    setError("");
    setMensaje("");

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "admin_reconciliar_cargos_unidad",
        {
          p_condominio_id: condominioId,
          p_unidad_id: reconciliando.unidad_id,
          p_anio: reconciliando.anio,
          p_solo_validar: false,
          p_motivo: reconciliando.motivo.trim(),
        },
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const resultado = data as ReconciliacionPreview;
      setReconciliando(null);
      await cargarPagos();
      setMensaje(
        resultado?.mensaje ||
          `Cargos de ${reconciliando.unidad_codigo} reconciliados correctamente.`,
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "No se pudo completar la reconciliación de cargos.",
      );
    } finally {
      setAplicandoReconciliacion(false);
    }
  }

  async function eliminarPago(p: Pago) {
    const unidad = p.unidad_id ? unidadMap[p.unidad_id]?.codigo : "";
    const confirmar = confirm(
      `¿Seguro que desea eliminar este pago?\n\nID: ${p.id}\nUnidad: ${unidad}\nMonto: ${money(
        p.monto
      )}\n\nSe reversarán cargos, créditos y banco_movimientos.`
    );

    if (!confirmar) return;

    const confirmarFinal = prompt(
      "Para confirmar escriba ELIMINAR. Esta acción no se puede deshacer."
    );

    if (confirmarFinal !== "ELIMINAR") return;

    setSaving(true);
    setError("");

    const { data, error } = await supabase.rpc("admin_eliminar_pago_seguro", {
      p_pago_id: p.id,
    });

    setSaving(false);

    if (error) {
      setError("Error eliminando pago: " + error.message);
      return;
    }

    const mensajeEliminado = data?.mensaje || "Pago eliminado correctamente.";
    await cargarPagos();
    setMensaje(mensajeEliminado);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Administración de Pagos
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Corrige pagos registrados, sincroniza cargos y Control Bancario, permite reemplazar comprobantes y convertir pagos mal clasificados en pagos históricos sin afectar períodos actuales.
              </p>
            </div>

            <button
              onClick={cargarPagos}
              disabled={loading || saving}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? "Cargando..." : "Actualizar lista"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Apartamento / Unidad
              </label>
              <select
                value={unidadFiltro}
                onChange={(e) => setUnidadFiltro(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.codigo || `Unidad ${u.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Fecha desde
              </label>
              <input
                type="date"
                value={fechaDesdeFiltro}
                onChange={(e) => setFechaDesdeFiltro(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Fecha hasta
              </label>
              <input
                type="date"
                value={fechaHastaFiltro}
                onChange={(e) => setFechaHastaFiltro(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase text-slate-500">
                Buscar
              </label>
              <input
                value={textoFiltro}
                onChange={(e) => setTextoFiltro(e.target.value)}
                placeholder="Referencia, descripción o período"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={cargarPagos}
                disabled={loading || saving}
                className="w-full rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                Filtrar
              </button>
              <button
                onClick={() => {
                  setUnidadFiltro("");
                  setFechaDesdeFiltro("");
                  setFechaHastaFiltro("");
                  setTextoFiltro("");
                  setTimeout(cargarPagos, 100);
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {mensaje}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Unidad</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Período pago</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Monto</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Referencia</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Banco</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Comprobante</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Descripción</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pagos.map((p) => {
                  const unidad = p.unidad_id ? unidadMap[p.unidad_id] : null;
                  const banco = bancoMap[String(p.id)];

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{p.id}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {unidad?.codigo || p.unidad_id || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{safeDate(p.fecha_pago)}</td>
                      <td className="px-4 py-3 text-slate-700">{p.periodo || "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {money(p.monto)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{p.referencia || "-"}</td>
                      <td className="px-4 py-3">
                        {banco ? (
                          <div className="space-y-1">
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                              En banco {banco.periodo}
                            </span>
                            <div className="text-xs text-slate-500">
                              {money(banco.monto)} · Saldo {money(banco.saldo_movimiento)}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                            Falta en banco
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.comprobante_url ? (
                          <a
                            href={p.comprobante_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                          >
                            Ver comprobante
                          </a>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                            No adjunto
                          </span>
                        )}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-slate-600">
                        <div className="line-clamp-2">{p.descripcion || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => abrirEdicion(p)}
                            className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => abrirReconciliacion(p)}
                            disabled={
                              saving ||
                              convirtiendoHistorico ||
                              cargandoReconciliacion ||
                              aplicandoReconciliacion
                            }
                            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                            title="Reconstruye aplicaciones y recalcula los cargos de la unidad para el año seleccionado"
                          >
                            Reconciliar cargos
                          </button>
                          <button
                            onClick={() => abrirConversionHistorica(p)}
                            disabled={saving || convirtiendoHistorico}
                            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                            title="Usar cuando el depósito fue recibido en una fecha, pero corresponde a meses históricos anteriores"
                          >
                            Pasar a histórico
                          </button>
                          <button
                            onClick={() => eliminarPago(p)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!loading && pagos.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                      No hay pagos para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      {reconciliando && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-emerald-100 pb-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                  Reconciliación administrativa
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">
                  Reconciliar cargos de {reconciliando.unidad_codigo}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Compara los pagos vigentes con los cargos del año y muestra el resultado antes de modificar información.
                </p>
              </div>

              <button
                onClick={cerrarReconciliacion}
                disabled={cargandoReconciliacion || aplicandoReconciliacion}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
              <p className="font-black">Protección del Control Bancario</p>
              <p className="mt-1 leading-relaxed">
                Esta herramienta trabaja con aplicaciones y cargos del propietario. No cambia la fecha, monto, referencia ni movimiento del depósito bancario. Los pagos que ya fueron convertidos a históricos quedan fuera de los pagos vigentes.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-end">
              <label className="w-full md:max-w-[220px] text-xs font-semibold uppercase text-slate-500">
                Año a reconciliar
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={reconciliando.anio}
                  onChange={(e) =>
                    setReconciliando({
                      ...reconciliando,
                      anio: Number(e.target.value || 0),
                      preview: null,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <button
                type="button"
                onClick={() => cargarVistaPreviaReconciliacion()}
                disabled={cargandoReconciliacion || aplicandoReconciliacion}
                className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              >
                {cargandoReconciliacion
                  ? "Analizando..."
                  : "Actualizar vista previa"}
              </button>
            </div>

            {reconciliando.preview && (
              <>
                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-500">Pagos vigentes</p>
                    <p className="mt-1 text-lg font-black text-slate-900">
                      {money(reconciliando.preview.total_pagos_vigentes)}
                    </p>
                    {typeof reconciliando.preview.cantidad_pagos === "number" && (
                      <p className="text-[10px] font-semibold text-slate-500">
                        {reconciliando.preview.cantidad_pagos} pago{reconciliando.preview.cantidad_pagos === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-500">Cargos del año</p>
                    <p className="mt-1 text-lg font-black text-slate-900">
                      {money(reconciliando.preview.total_cargos)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[10px] font-bold uppercase text-amber-700">Pagado actual</p>
                    <p className="mt-1 text-lg font-black text-amber-800">
                      {money(reconciliando.preview.total_pagado_actual)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-[10px] font-bold uppercase text-emerald-700">Pagado propuesto</p>
                    <p className="mt-1 text-lg font-black text-emerald-800">
                      {money(reconciliando.preview.total_pagado_propuesto)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                    <p className="text-[10px] font-bold uppercase text-blue-700">Saldo sin aplicar</p>
                    <p className="mt-1 text-lg font-black text-blue-800">
                      {money(reconciliando.preview.saldo_sin_aplicar)}
                    </p>
                  </div>
                </div>

                {(reconciliando.preview.advertencias || []).length > 0 && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-black">Advertencias</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {(reconciliando.preview.advertencias || []).map((item, index) => (
                        <li key={`${index}-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-5 overflow-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left">Período</th>
                        <th className="px-3 py-2 text-right">Cargo</th>
                        <th className="px-3 py-2 text-right">Pagado actual</th>
                        <th className="px-3 py-2 text-right">Pagado propuesto</th>
                        <th className="px-3 py-2 text-right">Balance propuesto</th>
                        <th className="px-3 py-2 text-center">Estado propuesto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(reconciliando.preview.cargos || []).map((cargo) => {
                        const cambio =
                          Math.abs(Number(cargo.pagado_actual || 0) - Number(cargo.pagado_propuesto || 0)) > 0.005 ||
                          String(cargo.estado_actual || "") !== String(cargo.estado_propuesto || "");

                        return (
                          <tr key={cargo.cargo_id} className={cambio ? "bg-amber-50/60" : ""}>
                            <td className="px-3 py-2 font-bold text-slate-900">
                              {cargo.periodo}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {money(cargo.monto_cargo)}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600">
                              {money(cargo.pagado_actual)}
                            </td>
                            <td className="px-3 py-2 text-right font-black text-emerald-700">
                              {money(cargo.pagado_propuesto)}
                            </td>
                            <td className="px-3 py-2 text-right font-black">
                              {money(cargo.balance_propuesto)}
                            </td>
                            <td className="px-3 py-2 text-center font-bold">
                              {cargo.estado_propuesto}
                            </td>
                          </tr>
                        );
                      })}

                      {(reconciliando.preview.cargos || []).length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                            No hay cargos para reconciliar en el año seleccionado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5">
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Motivo de la reconciliación *
                  </label>
                  <textarea
                    value={reconciliando.motivo}
                    onChange={(e) =>
                      setReconciliando({ ...reconciliando, motivo: e.target.value })
                    }
                    rows={3}
                    placeholder="Ej.: Reconciliación de cargos luego de separar pagos históricos del año anterior."
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}

            <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-end">
              <button
                onClick={cerrarReconciliacion}
                disabled={cargandoReconciliacion || aplicandoReconciliacion}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                onClick={aplicarReconciliacionCargos}
                disabled={
                  cargandoReconciliacion ||
                  aplicandoReconciliacion ||
                  !reconciliando.preview ||
                  (reconciliando.preview.cargos || []).length === 0
                }
                className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {aplicandoReconciliacion
                  ? "Reconciliando..."
                  : "Aplicar reconciliación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {historicoEditando && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-amber-100 pb-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                  Corrección administrativa
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">
                  Convertir pago #{historicoEditando.pago_id} a histórico
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Unidad {historicoEditando.unidad_codigo} · Fecha banco {historicoEditando.fecha_pago} · {money(historicoEditando.monto)}
                </p>
              </div>
              <button
                onClick={cerrarConversionHistorica}
                disabled={convirtiendoHistorico}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-black">¿Cuándo usar esta opción?</p>
              <p className="mt-1 leading-relaxed">
                Cuando el dinero entró realmente al banco en la fecha mostrada, pero el pago corresponde a meses anteriores. El ingreso bancario conserva su fecha real; los períodos históricos quedan en el historial del propietario y no deben pagar cargos actuales ni generar saldo a favor actual.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Pago registrado</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Monto</dt><dd className="font-bold">{money(historicoEditando.monto)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Referencia</dt><dd className="font-semibold">{historicoEditando.referencia || "-"}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Archivo banco ID</dt><dd className="font-semibold">{historicoEditando.bank_transaction_id || "-"}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Pago identificado ID</dt><dd className="font-semibold">{historicoEditando.pago_identificado_id || "-"}</dd></div>
                </dl>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase text-blue-700">Control de distribución</p>
                {(() => {
                  const total = historicoEditando.periodos.reduce((sum, item) => sum + Number(item.monto || 0), 0);
                  const diferencia = historicoEditando.monto - total;
                  return (
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-3"><dt className="text-slate-600">Pago</dt><dd className="font-bold">{money(historicoEditando.monto)}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-slate-600">Distribuido</dt><dd className="font-bold">{money(total)}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-slate-600">Diferencia</dt><dd className={`font-black ${Math.abs(diferencia) < 0.005 ? "text-emerald-700" : "text-red-700"}`}>{money(diferencia)}</dd></div>
                    </dl>
                  );
                })()}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-900">Períodos que realmente paga</h3>
                  <p className="text-xs text-slate-500">Deben ser anteriores al mes de la fecha bancaria.</p>
                </div>
                <button
                  type="button"
                  onClick={agregarPeriodoHistorico}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50"
                >
                  + Agregar período
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {historicoEditando.periodos.map((detalle, index) => (
                  <div key={index} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      Período histórico
                      <input
                        type="month"
                        value={detalle.periodo}
                        max={(() => {
                          const [anio, mes] = historicoEditando.fecha_pago.slice(0, 7).split("-").map(Number);
                          const anterior = new Date(anio, mes - 2, 1);
                          return `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, "0")}`;
                        })()}
                        onChange={(e) => actualizarPeriodoHistorico(index, "periodo", e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      Monto aplicado
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={detalle.monto}
                        onChange={(e) => actualizarPeriodoHistorico(index, "monto", e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => quitarPeriodoHistorico(index)}
                      disabled={historicoEditando.periodos.length <= 1}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-40"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label className="text-xs font-semibold uppercase text-slate-500">
                Motivo de la corrección *
              </label>
              <textarea
                value={historicoEditando.motivo}
                onChange={(e) => setHistoricoEditando({ ...historicoEditando, motivo: e.target.value })}
                rows={3}
                placeholder="Ej.: El depósito recibido en enero de 2026 corresponde a las cuotas de noviembre y diciembre de 2025."
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-end">
              <button
                onClick={cerrarConversionHistorica}
                disabled={convirtiendoHistorico}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={convertirPagoAHistorico}
                disabled={convirtiendoHistorico}
                className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-black text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {convirtiendoHistorico ? "Convirtiendo..." : "Convertir a pago histórico"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Editar pago #{editando.id}
                </h2>
                <p className="text-sm text-slate-500">
                  Unidad {editando.unidad_codigo || "-"}
                </p>
              </div>
              <button
                onClick={cerrarEdicion}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Fecha de pago real banco
                </label>
                <input
                  type="date"
                  value={editando.fecha_pago}
                  onChange={(e) => setEditando({ ...editando, fecha_pago: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Período que paga
                </label>
                <input
                  type="month"
                  value={editando.periodo}
                  onChange={(e) => setEditando({ ...editando, periodo: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Monto
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editando.monto}
                  onChange={(e) => setEditando({ ...editando, monto: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Cuenta bancaria ID
                </label>
                <input
                  type="number"
                  value={editando.cuenta_bancaria_id}
                  onChange={(e) =>
                    setEditando({ ...editando, cuenta_bancaria_id: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Método de pago
                </label>
                <input
                  value={editando.metodo_pago}
                  onChange={(e) => setEditando({ ...editando, metodo_pago: e.target.value })}
                  placeholder="Transferencia / Depósito / Efectivo"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Tipo fondo
                </label>
                <select
                  value={editando.tipo_fondo}
                  onChange={(e) => setEditando({ ...editando, tipo_fondo: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="ORDINARIO">ORDINARIO</option>
                  <option value="EXTRAORDINARIO">EXTRAORDINARIO</option>
                  <option value="RESERVA">RESERVA</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Referencia
                </label>
                <input
                  value={editando.referencia}
                  onChange={(e) => setEditando({ ...editando, referencia: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Descripción
                </label>
                <textarea
                  value={editando.descripcion}
                  onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="md:col-span-2 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-violet-700">
                      Comprobante de pago
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Puede adjuntar un comprobante nuevo. El archivo anterior se conserva como respaldo y no se elimina del almacenamiento.
                    </p>
                  </div>

                  {editando.comprobante_url_actual ? (
                    <a
                      href={editando.comprobante_url_actual}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                    >
                      Ver comprobante actual
                    </a>
                  ) : (
                    <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
                      Sin comprobante actual
                    </span>
                  )}
                </div>

                <input
                  key={comprobanteInputKey}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setComprobanteArchivo(e.target.files?.[0] || null)}
                  className="mt-4 block w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-violet-700"
                />

                <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
                  <span>Formatos permitidos: PDF, JPG, PNG y WEBP. Máximo 10 MB.</span>
                  {comprobanteArchivo && (
                    <span className="font-semibold text-violet-700">
                      Nuevo: {comprobanteArchivo.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-end">
              <button
                onClick={cerrarEdicion}
                disabled={saving}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEdicion}
                disabled={saving}
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {saving
                  ? "Guardando..."
                  : comprobanteArchivo
                    ? "Guardar cambios y comprobante"
                    : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
