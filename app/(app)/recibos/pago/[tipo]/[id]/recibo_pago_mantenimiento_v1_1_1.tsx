"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type PagoRecibo = {
  id: number;
  tipo_recibo: "mantenimiento" | "propietario" | "pagos";
  condominio: string;
  condominio_id: number | null;
  unidad_id: number | null;
  no_apartamento: string;
  nombre_propietario: string | null;
  cedula: string | null;
  telefono: string | null;
  correo: string | null;
  fecha_pago: string | null;
  mes_pagado: string | null;
  periodo?: string | null;
  monto_pagado: number | null;
  metodo_pago: string | null;
  no_referencia: string | null;
  descripcion: string | null;
  estado: string | null;
  comprobante_url: string | null;
  created_at: string | null;
};

type Propietario = {
  id: number;
  condominio: string;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string | null;
  telefono: string | null;
  correo: string | null;
  estado: string | null;
  condominio_id: number | null;
};

type CargoPeriodico = {
  id: number;
  client_id: number | null;
  condominio_id: number | null;
  unidad_id: number | null;
  propietario_id: number | null;
  periodo: string | null;
  anio: number;
  mes: number;
  concepto: string | null;
  tipo_cargo: string | null;
  monto: number | null;
  monto_pagado: number | null;
  balance: number | null;
  estado: string | null;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  created_at: string | null;
};

type PagoTablaPagos = {
  id: number;
  condominio_id: number | null;
  unidad_id: number | null;
  monto: number | null;
  fecha_pago: string | null;
  referencia: string | null;
  metodo_pago: string | null;
  metodo: string | null;
  origen: string | null;
  tipo_fondo: string | null;
  descripcion: string | null;
  periodo?: string | null;
  comprobante_url: string | null;
  created_at: string | null;
  unidades: {
    codigo: string;
    propietario_nombre?: string | null;
    propietario_cedula?: string | null;
    propietario_telefono?: string | null;
    propietario_id?: number | null;
  } | null;
};


type PagoAplicacionDetalle = {
  id: number;
  pago_id: number | null;
  cargo_periodico_id: number | null;
  monto_aplicado: number | null;
  fecha_aplicacion: string | null;
  observacion: string | null;
  cargos_periodicos: {
    id: number;
    periodo: string | null;
    anio: number | null;
    mes: number | null;
    concepto: string | null;
    tipo_cargo: string | null;
    monto: number | null;
    monto_pagado: number | null;
    balance: number | null;
    estado: string | null;
  } | null;
};

type CreditoPropietario = {
  id: number;
  condominio_id: number | null;
  unidad_id: number | null;
  pago_id: number | null;
  monto_original: number | null;
  monto_disponible: number | null;
  concepto: string | null;
  estado: string | null;
  created_at: string | null;
};

type PagoAnualReal = {
  pago_id: number;
  periodo: string;
  monto_recibido: number;
  fecha_pago: string | null;
  referencia: string | null;
  origen: string | null;
};

const MODULO_NOMBRE = "Recibo de Pago de Mantenimiento";
const MODULO_VERSION = "v1.1.1";
const MODULO_FECHA_VERSION = "10/09/2026";

const MESES_NOMBRES: Record<number, string> = {
  1: "Enero",
  2: "Febrero",
  3: "Marzo",
  4: "Abril",
  5: "Mayo",
  6: "Junio",
  7: "Julio",
  8: "Agosto",
  9: "Septiembre",
  10: "Octubre",
  11: "Noviembre",
  12: "Diciembre",
};

export default function ReciboPagoPage() {
  const params = useParams<{ tipo: string; id: string }>();
  const router = useRouter();

  const tipo = String(params?.tipo || "");
  const pagoId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const [pago, setPago] = useState<PagoRecibo | null>(null);
  const [propietario, setPropietario] = useState<Propietario | null>(null);
  const [cargos, setCargos] = useState<CargoPeriodico[]>([]);
  const [aplicacionesPago, setAplicacionesPago] = useState<PagoAplicacionDetalle[]>([]);
  const [creditosDisponibles, setCreditosDisponibles] = useState<CreditoPropietario[]>([]);
  const [pagosAnualesReales, setPagosAnualesReales] = useState<PagoAnualReal[]>([]);
  const [cuotaOrdinaria, setCuotaOrdinaria] = useState<number>(0);

  const anioActual = useMemo(() => {
    const fechaPago = pago?.fecha_pago || "";
    const anioFecha = String(fechaPago).split("-")[0];

    if (anioFecha && anioFecha.length === 4) return anioFecha;

    return String(new Date().getFullYear());
  }, [pago]);
  useEffect(() => {
    cargarRecibo();
  }, [tipo, pagoId]);

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatoFecha(fecha?: string | null) {
    if (!fecha) return "-";

    const fechaLimpia = String(fecha).split("T")[0];
    const partes = fechaLimpia.split("-");

    if (partes.length === 3) {
      const [year, month, day] = partes;
      return `${day}/${month}/${year}`;
    }

    return fecha;
  }



  function formatearPeriodo(periodo?: string | null) {
    if (!periodo) return "";

    const [anioTexto, mesTexto] = String(periodo).trim().split("-");
    const anio = Number(anioTexto);
    const mes = Number(mesTexto);

    if (!anio || !mes || mes < 1 || mes > 12) return String(periodo);

    return `${MESES_NOMBRES[mes]} ${anio}`;
  }

  function formatearPeriodos(periodos?: string | null) {
    if (!periodos) return "";

    return String(periodos)
      .split(",")
      .map((p) => formatearPeriodo(p.trim()))
      .filter(Boolean)
      .join(", ");
  }

  function extraerMesDesdeDescripcion(descripcion?: string | null) {
    const texto = String(descripcion || "");
    const match = texto.match(/Pago mantenimiento\s+(.+?)(?:\s+-\s+Unidad|$)/i);
    return match?.[1]?.trim() || "";
  }

  function fechaHoy() {
    const hoy = new Date();
    const day = String(hoy.getDate()).padStart(2, "0");
    const month = String(hoy.getMonth() + 1).padStart(2, "0");
    const year = hoy.getFullYear();

    return `${day}/${month}/${year}`;
  }

  function limpiarTelefonoWhatsApp(telefono?: string | null) {
    const numeros = String(telefono || "").replace(/\D/g, "");

    if (!numeros) return "";

    if (numeros.length === 10) return `1${numeros}`;

    if (numeros.length === 11 && numeros.startsWith("1")) return numeros;

    return numeros;
  }

  async function cargarRecibo() {
    if (!tipo || !pagoId) {
      setMensaje("No se encontró el tipo o ID del pago.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMensaje("");
    setPago(null);
    setPropietario(null);
    setCargos([]);
    setAplicacionesPago([]);
    setCreditosDisponibles([]);
    setPagosAnualesReales([]);
    setCuotaOrdinaria(0);

    if (tipo === "pagos") {
      await cargarReciboDesdeTablaPagos();
      return;
    }

    if (tipo === "mantenimiento") {
      // Primero busca en la tabla principal `pagos`.
      // Si el recibo pertenece al módulo histórico de mantenimiento,
      // utiliza `pagos_mantenimiento` como respaldo.
      await cargarReciboDesdeTablaPagos(true);
      return;
    }

    if (tipo === "propietario") {
      await cargarReciboPropietario();
      return;
    }

    setMensaje("Tipo de recibo no válido.");
    setLoading(false);
  }

  async function buscarNombreCondominio(idCondominio: number | null) {
    const nombreLocal = localStorage.getItem("condominio_nombre") || "";

    if (!idCondominio) return nombreLocal || "Condominio";

    const { data, error } = await supabase
      .from("condominios")
      .select("nombre")
      .eq("id", Number(idCondominio))
      .maybeSingle();

    if (error || !data?.nombre) return nombreLocal || "Condominio";

    return data.nombre;
  }

  async function buscarUnidadPorApartamento(
    condominioId: number | null,
    apartamento: string
  ) {
    if (!condominioId || !apartamento) return null;

    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(condominioId))
      .eq("codigo", apartamento)
      .maybeSingle();

    if (error || !data?.id) return null;

    return Number(data.id);
  }

  async function cargarAplicacionesPago(idPago: number) {
    const { data, error } = await supabase
      .from("pagos_aplicaciones")
      .select(
        `
        id,
        pago_id,
        cargo_periodico_id,
        monto_aplicado,
        fecha_aplicacion,
        observacion,
        cargos_periodicos (
          id,
          periodo,
          anio,
          mes,
          concepto,
          tipo_cargo,
          monto,
          monto_pagado,
          balance,
          estado
        )
      `
      )
      .eq("pago_id", Number(idPago))
      .order("id", { ascending: true });

    if (error) {
      console.error("Error cargando aplicaciones del pago:", error.message);
      setAplicacionesPago([]);
      return [];
    }

    const aplicaciones = ((data || []) as any[]).map((item) => ({
      ...item,
      cargos_periodicos: Array.isArray(item.cargos_periodicos)
        ? item.cargos_periodicos[0] || null
        : item.cargos_periodicos || null,
    })) as PagoAplicacionDetalle[];

    aplicaciones.sort((a, b) => {
      const periodoA = a.cargos_periodicos?.periodo || "";
      const periodoB = b.cargos_periodicos?.periodo || "";
      return periodoA.localeCompare(periodoB);
    });

    setAplicacionesPago(aplicaciones);
    return aplicaciones;
  }

  async function cargarReciboDesdeTablaPagos(
    usarRespaldoMantenimiento = false
  ) {
    const { data, error } = await supabase
      .from("pagos")
      .select(
        `
        id,
        condominio_id,
        unidad_id,
        monto,
        fecha_pago,
        referencia,
        metodo_pago,
        metodo,
        origen,
        tipo_fondo,
        descripcion,
        periodo,
        comprobante_url,
        created_at,
        unidades (
          codigo,
          propietario_nombre,
          propietario_cedula,
          propietario_telefono,
          propietario_id
        )
      `
      )
      .eq("id", Number(pagoId))
      .maybeSingle();

    if (error || !data) {
      if (usarRespaldoMantenimiento) {
        await cargarReciboMantenimiento();
        return;
      }

      setMensaje(
        "No se pudo cargar el pago: " +
          (error?.message || "Pago no encontrado.")
      );
      setLoading(false);
      return;
    }

    const pagoTabla = data as PagoTablaPagos;
    const nombreCondominio = await buscarNombreCondominio(
      pagoTabla.condominio_id
    );

    const aplicaciones = await cargarAplicacionesPago(pagoTabla.id);
    const periodosAplicados = aplicaciones
      .map((item) => item.cargos_periodicos?.periodo || "")
      .filter(Boolean);
    const mesesAplicadosTexto = periodosAplicados.length
      ? Array.from(new Set(periodosAplicados)).map(formatearPeriodo).join(", ")
      : "";

    const apartamento = pagoTabla.unidades?.codigo || "";

    const pagoNormalizado: PagoRecibo = {
      id: pagoTabla.id,
      tipo_recibo: tipo === "mantenimiento" ? "mantenimiento" : "pagos",
      condominio: nombreCondominio,
      condominio_id: pagoTabla.condominio_id,
      unidad_id: pagoTabla.unidad_id,
      no_apartamento: apartamento,
      nombre_propietario: pagoTabla.unidades?.propietario_nombre || null,
      cedula: pagoTabla.unidades?.propietario_cedula || null,
      telefono: pagoTabla.unidades?.propietario_telefono || null,
      correo: null,
      fecha_pago: pagoTabla.fecha_pago,
      mes_pagado:
        mesesAplicadosTexto ||
        formatearPeriodos((pagoTabla as any).periodo) ||
        extraerMesDesdeDescripcion(pagoTabla.descripcion) ||
        "-",
      periodo: (pagoTabla as any).periodo || null,
      monto_pagado: pagoTabla.monto,
      metodo_pago: pagoTabla.metodo_pago || pagoTabla.metodo || "-",
      no_referencia: pagoTabla.referencia,
      descripcion: pagoTabla.descripcion,
      estado: "Registrado",
      comprobante_url: pagoTabla.comprobante_url,
      created_at: pagoTabla.created_at,
    };

    setPago(pagoNormalizado);

    await Promise.all([
      cargarPropietario(
        nombreCondominio,
        apartamento,
        pagoTabla.condominio_id
      ),
      cargarCargosPeriodicos(
        pagoTabla.condominio_id,
        pagoTabla.unidad_id,
        apartamento,
        pagoTabla.fecha_pago
      ),
      cargarCoberturaSaldoFavor(
        pagoTabla.condominio_id,
        pagoTabla.unidad_id
      ),
      cargarPagosAnualesReales(
        pagoTabla.condominio_id,
        pagoTabla.unidad_id,
        String(pagoTabla.fecha_pago || new Date().getFullYear()).slice(0, 4)
      ),
    ]);

    setLoading(false);
  }

  async function cargarReciboMantenimiento() {
    const { data, error } = await supabase
      .from("pagos_mantenimiento")
      .select(
        "id, condominio, no_apartamento, fecha_pago, mes_pagado, monto_pagado, metodo_pago, no_referencia, descripcion, estado, comprobante_url, created_at"
      )
      .eq("id", Number(pagoId))
      .maybeSingle();

    if (error || !data) {
      setMensaje(
        "No se pudo cargar el pago de mantenimiento: " +
          (error?.message || "Pago no encontrado.")
      );
      setLoading(false);
      return;
    }

    const nombreCondominio = data.condominio;
    const apartamento = data.no_apartamento;

    const { data: condominioData } = await supabase
      .from("condominios")
      .select("id")
      .ilike("nombre", `%${nombreCondominio}%`)
      .limit(1)
      .maybeSingle();

    const condominioId = condominioData?.id ? Number(condominioData.id) : null;
    const unidadId = await buscarUnidadPorApartamento(condominioId, apartamento);

    const pagoNormalizado: PagoRecibo = {
      id: data.id,
      tipo_recibo: "mantenimiento",
      condominio: nombreCondominio,
      condominio_id: condominioId,
      unidad_id: unidadId,
      no_apartamento: apartamento,
      nombre_propietario: null,
      cedula: null,
      telefono: null,
      correo: null,
      fecha_pago: data.fecha_pago,
      mes_pagado: data.mes_pagado,
      monto_pagado: data.monto_pagado,
      metodo_pago: data.metodo_pago,
      no_referencia: data.no_referencia,
      descripcion: data.descripcion,
      estado: data.estado || "Registrado",
      comprobante_url: data.comprobante_url,
      created_at: data.created_at,
    };

    setPago(pagoNormalizado);

    await Promise.all([
      cargarPropietario(nombreCondominio, apartamento, condominioId),
      cargarCargosPeriodicos(condominioId, unidadId, apartamento, data.fecha_pago),
      cargarCoberturaSaldoFavor(condominioId, unidadId),
      cargarPagosAnualesReales(
        condominioId,
        unidadId,
        String(data.fecha_pago || new Date().getFullYear()).slice(0, 4)
      ),
    ]);

    setLoading(false);
  }

  async function cargarReciboPropietario() {
    const { data, error } = await supabase
      .from("pagos_propietarios")
      .select(
        "id, propietario_id, condominio, no_apartamento, nombre_propietario, cedula, fecha_pago, mes_pagado, monto_pagado, banco_origen, no_referencia, comentario, comprobante_url, estado, created_at"
      )
      .eq("id", Number(pagoId))
      .maybeSingle();

    if (error || !data) {
      setMensaje(
        "No se pudo cargar el pago del propietario: " +
          (error?.message || "Pago no encontrado.")
      );
      setLoading(false);
      return;
    }

    const nombreCondominio = data.condominio;
    const apartamento = data.no_apartamento;

    const { data: condominioData } = await supabase
      .from("condominios")
      .select("id")
      .ilike("nombre", `%${nombreCondominio}%`)
      .maybeSingle();

    const condominioId = condominioData?.id ? Number(condominioData.id) : null;
    const unidadId = await buscarUnidadPorApartamento(condominioId, apartamento);

    const pagoNormalizado: PagoRecibo = {
      id: data.id,
      tipo_recibo: "propietario",
      condominio: nombreCondominio,
      condominio_id: condominioId,
      unidad_id: unidadId,
      no_apartamento: apartamento,
      nombre_propietario: data.nombre_propietario,
      cedula: data.cedula,
      telefono: null,
      correo: null,
      fecha_pago: data.fecha_pago,
      mes_pagado: data.mes_pagado,
      monto_pagado: data.monto_pagado,
      metodo_pago: data.banco_origen,
      no_referencia: data.no_referencia,
      descripcion: data.comentario,
      estado: data.estado,
      comprobante_url: data.comprobante_url,
      created_at: data.created_at,
    };

    setPago(pagoNormalizado);

    await Promise.all([
      cargarPropietario(nombreCondominio, apartamento, condominioId),
      cargarCargosPeriodicos(condominioId, unidadId, apartamento, data.fecha_pago),
      cargarCoberturaSaldoFavor(condominioId, unidadId),
      cargarPagosAnualesReales(
        condominioId,
        unidadId,
        String(data.fecha_pago || new Date().getFullYear()).slice(0, 4)
      ),
    ]);

    setLoading(false);
  }

  async function cargarPropietario(
    nombreCondominio: string,
    apartamento: string,
    idCondominio: number | null
  ) {
    if (!apartamento) {
      setPropietario(null);
      return;
    }

    let query = supabase
      .from("propietarios_apartamentos")
      .select(
        "id, condominio, no_apartamento, nombre_propietario, cedula, telefono, correo, estado, condominio_id"
      )
      .eq("no_apartamento", apartamento)
      .limit(1);

    if (idCondominio) {
      query = query.eq("condominio_id", Number(idCondominio));
    } else {
      query = query.ilike("condominio", `%${nombreCondominio}%`);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      setPropietario(null);
      return;
    }

    setPropietario((data || null) as Propietario | null);
  }

  function periodoValido(valor?: string | null) {
    const texto = String(valor || "").trim();
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(texto) ? texto : "";
  }

  function periodoDesdeDescripcion(descripcion?: string | null) {
    const texto = String(descripcion || "");
    const match = texto.match(/(20\d{2}-(?:0[1-9]|1[0-2]))/);
    return periodoValido(match?.[1] || "");
  }

  async function cargarPagosAnualesReales(
    condominioId: number | null,
    unidadId: number | null,
    anio: string
  ) {
    if (!condominioId || !unidadId || !anio) {
      setPagosAnualesReales([]);
      return;
    }

    const [pagosResultado, cargosResultado] = await Promise.all([
      supabase
        .from("pagos")
        .select(
          "id, fecha_pago, monto, referencia, origen, descripcion, periodo, pago_identificado_id"
        )
        .eq("condominio_id", Number(condominioId))
        .eq("unidad_id", Number(unidadId))
        .order("fecha_pago", { ascending: true })
        .order("id", { ascending: true }),

      supabase
        .from("cargos_periodicos")
        .select("id, periodo, anio, mes, monto, tipo_cargo")
        .eq("condominio_id", Number(condominioId))
        .eq("unidad_id", Number(unidadId))
        .eq("anio", Number(anio))
        .order("mes", { ascending: true })
        .order("id", { ascending: true }),
    ]);

    if (pagosResultado.error) {
      console.error(
        "Error cargando pagos reales del año:",
        pagosResultado.error.message
      );
      setPagosAnualesReales([]);
      return;
    }

    if (cargosResultado.error) {
      console.warn(
        "No se pudieron cargar cargos para distribuir pagos históricos:",
        cargosResultado.error.message
      );
    }

    const pagosBase = (pagosResultado.data || []) as any[];
    const cargosBase = (cargosResultado.data || []) as any[];

    const idsIdentificados = Array.from(
      new Set(
        pagosBase
          .map((item) => Number(item.pago_identificado_id || 0))
          .filter((id) => id > 0)
      )
    );

    const periodosIdentificados = new Map<number, string>();

    if (idsIdentificados.length > 0) {
      const { data: identificadosData, error: identificadosError } =
        await supabase
          .from("pagos_identificados")
          .select("id, periodo")
          .in("id", idsIdentificados);

      if (identificadosError) {
        console.warn(
          "No se pudieron cargar los períodos de pagos identificados:",
          identificadosError.message
        );
      } else {
        for (const item of identificadosData || []) {
          const periodo = periodoValido((item as any).periodo);
          if (periodo) {
            periodosIdentificados.set(Number((item as any).id), periodo);
          }
        }
      }
    }

    const pagosIds = pagosBase.map((item) => Number(item.id)).filter(Boolean);
    const aplicacionesPorPago = new Map<
      number,
      Array<{ periodo: string; monto: number }>
    >();

    if (pagosIds.length > 0) {
      const { data: appsData, error: appsError } = await supabase
        .from("pagos_aplicaciones")
        .select(
          `
          pago_id,
          monto_aplicado,
          cargos_periodicos (
            periodo
          )
        `
        )
        .in("pago_id", pagosIds);

      if (appsError) {
        console.warn(
          "No se pudieron cargar aplicaciones para distribuir pagos anuales:",
          appsError.message
        );
      } else {
        for (const app of (appsData || []) as any[]) {
          const cargo = Array.isArray(app.cargos_periodicos)
            ? app.cargos_periodicos[0]
            : app.cargos_periodicos;
          const periodo = periodoValido(cargo?.periodo);
          if (!periodo) continue;

          const pagoIdAplicacion = Number(app.pago_id || 0);
          const lista = aplicacionesPorPago.get(pagoIdAplicacion) || [];
          lista.push({
            periodo,
            monto: Number(app.monto_aplicado || 0),
          });
          aplicacionesPorPago.set(pagoIdAplicacion, lista);
        }
      }
    }

    /*
     * Mapa de cargos mensuales del año. Se usa para distribuir pagos históricos
     * importados que cubren varios meses y no tienen pagos_aplicaciones.
     */
    const cargosPorPeriodo = new Map<string, number>();

    for (const cargo of cargosBase) {
      const tipoCargo = String(cargo.tipo_cargo || "").trim().toUpperCase();
      if (tipoCargo && !["ORDINARIO", "MANTENIMIENTO"].includes(tipoCargo)) {
        continue;
      }

      const periodo =
        periodoValido(cargo.periodo) ||
        `${cargo.anio}-${String(cargo.mes || 0).padStart(2, "0")}`;

      if (!periodoValido(periodo)) continue;

      cargosPorPeriodo.set(
        periodo,
        Number(cargosPorPeriodo.get(periodo) || 0) + Number(cargo.monto || 0)
      );
    }

    // Si los datos antiguos no tienen tipo_cargo normalizado, usa todos los cargos.
    if (cargosPorPeriodo.size === 0) {
      for (const cargo of cargosBase) {
        const periodo =
          periodoValido(cargo.periodo) ||
          `${cargo.anio}-${String(cargo.mes || 0).padStart(2, "0")}`;

        if (!periodoValido(periodo)) continue;

        cargosPorPeriodo.set(
          periodo,
          Number(cargosPorPeriodo.get(periodo) || 0) + Number(cargo.monto || 0)
        );
      }
    }

    const periodosCargoOrdenados = Array.from(cargosPorPeriodo.keys()).sort();
    const recibidoAsignadoPorPeriodo = new Map<string, number>();
    const filas: PagoAnualReal[] = [];

    function agregarFila(
      item: any,
      periodo: string,
      montoRecibido: number
    ) {
      if (!periodoValido(periodo) || montoRecibido <= 0) return;

      filas.push({
        pago_id: Number(item.id),
        periodo,
        monto_recibido: montoRecibido,
        fecha_pago: item.fecha_pago || null,
        referencia: item.referencia || null,
        origen: item.origen || null,
      });

      recibidoAsignadoPorPeriodo.set(
        periodo,
        Number(recibidoAsignadoPorPeriodo.get(periodo) || 0) + montoRecibido
      );
    }

    function distribuirHistoricoHastaPeriodo(
      item: any,
      periodoTope: string,
      montoPago: number
    ) {
      let restante = Number(montoPago || 0);
      if (restante <= 0 || !periodoValido(periodoTope)) return;

      const candidatos = periodosCargoOrdenados.filter(
        (periodo) => periodo <= periodoTope
      );

      for (const periodo of candidatos) {
        if (restante <= 0) break;

        const cargoPeriodo = Number(cargosPorPeriodo.get(periodo) || 0);
        const yaAsignado = Number(recibidoAsignadoPorPeriodo.get(periodo) || 0);
        const capacidadPendiente = Math.max(cargoPeriodo - yaAsignado, 0);

        if (capacidadPendiente <= 0) continue;

        const aplicar = Math.min(restante, capacidadPendiente);
        agregarFila(item, periodo, aplicar);
        restante -= aplicar;
      }

      /*
       * Cualquier excedente real se conserva en el período tope. Ejemplo:
       * cuota RD$4,500 y pago RD$4,600 => mayo muestra RD$4,600 y RD$100
       * permanecen como saldo a favor, sin inventar otro mes.
       */
      if (restante > 0) {
        agregarFila(item, periodoTope, restante);
      }
    }

    for (const item of pagosBase) {
      const pagoId = Number(item.id || 0);
      const montoPago = Number(item.monto || 0);
      if (!pagoId || montoPago <= 0) continue;

      const aplicaciones = aplicacionesPorPago.get(pagoId) || [];

      /*
       * 1) Fuente principal: aplicaciones reales. Si un solo depósito cubre
       * varios meses, se reparte por monto_aplicado y NO se repite el total
       * del depósito en cada mes.
       */
      if (aplicaciones.length > 0) {
        const agrupadas = new Map<string, number>();

        for (const app of aplicaciones) {
          agrupadas.set(
            app.periodo,
            Number(agrupadas.get(app.periodo) || 0) + Number(app.monto || 0)
          );
        }

        const periodosApps = Array.from(agrupadas.keys()).sort();
        const totalAplicado = Array.from(agrupadas.values()).reduce(
          (sum, valor) => sum + Number(valor || 0),
          0
        );
        const excedente = Math.max(montoPago - totalAplicado, 0);

        periodosApps.forEach((periodo, index) => {
          const esUltimo = index === periodosApps.length - 1;
          agregarFila(
            item,
            periodo,
            Number(agrupadas.get(periodo) || 0) + (esUltimo ? excedente : 0)
          );
        });
        continue;
      }

      const periodosDirectos = String(item.periodo || "")
        .split(",")
        .map((valor) => periodoValido(valor))
        .filter(Boolean);

      const periodoIdentificado = periodosIdentificados.get(
        Number(item.pago_identificado_id || 0)
      );

      /*
       * 2) Pagos bancarios históricos importados: el período identificado
       * representa el último período cubierto. Se distribuye hacia atrás entre
       * cargos todavía no asociados a otro pago real. Esto corrige casos como:
       * RD$9,000 en febrero = enero + febrero; RD$13,500 en mayo = marzo-mayo.
       */
      if (periodoIdentificado) {
        distribuirHistoricoHastaPeriodo(item, periodoIdentificado, montoPago);
        continue;
      }

      /*
       * 3) Pago con varios períodos explícitos pero sin aplicaciones.
       */
      if (periodosDirectos.length > 1) {
        let restante = montoPago;

        for (const periodo of periodosDirectos) {
          if (restante <= 0) break;
          const cargoPeriodo = Number(cargosPorPeriodo.get(periodo) || 0);
          const aplicar = Math.min(restante, cargoPeriodo || restante);
          agregarFila(item, periodo, aplicar);
          restante -= aplicar;
        }

        if (restante > 0) {
          agregarFila(item, periodosDirectos[periodosDirectos.length - 1], restante);
        }
        continue;
      }

      /*
       * 4) Pago moderno con un período explícito: conserva el monto realmente
       * recibido en ese período. Si hubo excedente, se verá en ese mismo mes.
       */
      if (periodosDirectos.length === 1) {
        agregarFila(item, periodosDirectos[0], montoPago);
        continue;
      }

      /*
       * 5) Respaldo para datos antiguos sin período: descripción y luego fecha.
       * No se duplica ni se reutiliza el mismo pago en otro mes.
       */
      const periodoDescripcion = periodoDesdeDescripcion(item.descripcion);
      const periodoFecha = periodoValido(
        String(item.fecha_pago || "").slice(0, 7)
      );
      const periodoRespaldo = periodoDescripcion || periodoFecha;

      if (periodoRespaldo) {
        agregarFila(item, periodoRespaldo, montoPago);
      }
    }

    setPagosAnualesReales(
      filas.filter((item) => String(item.periodo).startsWith(`${anio}-`))
    );
  }

  async function cargarCoberturaSaldoFavor(
    condominioId: number | null,
    unidadId: number | null
  ) {
    if (!condominioId || !unidadId) {
      setCreditosDisponibles([]);
      setCuotaOrdinaria(0);
      return;
    }

    const [creditosResultado, configuracionResultado] = await Promise.all([
      supabase
        .from("creditos_propietarios")
        .select(
          "id, condominio_id, unidad_id, pago_id, monto_original, monto_disponible, concepto, estado, created_at"
        )
        .eq("condominio_id", Number(condominioId))
        .eq("unidad_id", Number(unidadId))
        .eq("estado", "DISPONIBLE")
        .gt("monto_disponible", 0)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true }),

      supabase
        .from("configuracion_cargos")
        .select("cuota_ordinaria")
        .eq("condominio_id", Number(condominioId))
        .eq("activa", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (creditosResultado.error) {
      console.error(
        "Error cargando saldo a favor del propietario:",
        creditosResultado.error.message
      );
      setCreditosDisponibles([]);
    } else {
      setCreditosDisponibles(
        (creditosResultado.data || []) as CreditoPropietario[]
      );
    }

    if (configuracionResultado.error) {
      console.warn(
        "No se pudo cargar la cuota ordinaria para proyectar cobertura:",
        configuracionResultado.error.message
      );
      setCuotaOrdinaria(0);
    } else {
      setCuotaOrdinaria(
        Number((configuracionResultado.data as any)?.cuota_ordinaria || 0)
      );
    }
  }

  async function cargarCargosPeriodicos(
    condominioId: number | null,
    unidadId: number | null,
    apartamento: string,
    fechaPago: string | null
  ) {
    if (!condominioId && !unidadId) {
      setCargos([]);
      return;
    }

    const anio =
      String(fechaPago || "").split("-")[0] || String(new Date().getFullYear());

    let query = supabase
      .from("cargos_periodicos")
      .select(
        "id, client_id, condominio_id, unidad_id, propietario_id, periodo, anio, mes, concepto, tipo_cargo, monto, monto_pagado, balance, estado, fecha_emision, fecha_vencimiento, created_at"
      )
      .eq("anio", Number(anio))
      .order("mes", { ascending: true })
      .order("id", { ascending: true });

    if (condominioId) {
      query = query.eq("condominio_id", Number(condominioId));
    }

    if (unidadId) {
      query = query.eq("unidad_id", Number(unidadId));
    }

    const { data, error } = await query;

    if (error) {
      setCargos([]);
      return;
    }

    if (data && data.length > 0) {
      setCargos((data || []) as CargoPeriodico[]);
      return;
    }

    // Respaldo: si no encuentra por unidad_id, intenta localizar la unidad por código.
    if (condominioId && apartamento) {
      const unidadEncontrada = await buscarUnidadPorApartamento(
        condominioId,
        apartamento
      );

      if (unidadEncontrada) {
        const { data: dataRespaldo, error: errorRespaldo } = await supabase
          .from("cargos_periodicos")
          .select(
            "id, client_id, condominio_id, unidad_id, propietario_id, periodo, anio, mes, concepto, tipo_cargo, monto, monto_pagado, balance, estado, fecha_emision, fecha_vencimiento, created_at"
          )
          .eq("condominio_id", Number(condominioId))
          .eq("unidad_id", Number(unidadEncontrada))
          .eq("anio", Number(anio))
          .order("mes", { ascending: true })
          .order("id", { ascending: true });

        if (!errorRespaldo && dataRespaldo && dataRespaldo.length > 0) {
          setCargos((dataRespaldo || []) as CargoPeriodico[]);
          return;
        }
      }
    }

    setCargos([]);
  }

  const pagosRecibidosPorPeriodo = useMemo(() => {
    const mapa = new Map<string, number>();

    for (const item of pagosAnualesReales) {
      mapa.set(
        item.periodo,
        Number(mapa.get(item.periodo) || 0) + Number(item.monto_recibido || 0)
      );
    }

    return mapa;
  }, [pagosAnualesReales]);

  const detalleMensual = useMemo(() => {
    return [...cargos]
      .sort((a, b) => Number(a.mes || 0) - Number(b.mes || 0))
      .map((cargo) => {
        const totalCargo = Number(cargo.monto || 0);
        const montoAplicadoCargo = Number(cargo.monto_pagado || 0);
        const balance = Number(cargo.balance ?? totalCargo - montoAplicadoCargo);
        const periodoCargo =
          periodoValido(cargo.periodo) ||
          `${cargo.anio}-${String(cargo.mes || 0).padStart(2, "0")}`;

        const pagoRealPeriodo = Number(
          pagosRecibidosPorPeriodo.get(periodoCargo) || 0
        );

        // Para datos migrados sin un pago individual trazable, conserva como respaldo
        // el monto aplicado al cargo. Cuando existe un pago real, siempre prevalece.
        const pagoRecibido =
          pagoRealPeriodo > 0 ? pagoRealPeriodo : montoAplicadoCargo;
        const pagoEsRespaldo = pagoRealPeriodo <= 0 && montoAplicadoCargo > 0;

        let estadoMes = cargo.estado || "PENDIENTE";

        if (balance <= 0 && totalCargo > 0) {
          estadoMes = "PAGADO";
        } else if (montoAplicadoCargo > 0 && balance > 0) {
          estadoMes = "PARCIAL";
        }

        return {
          ...cargo,
          periodoCargo,
          mesNombre: MESES_NOMBRES[Number(cargo.mes)] || String(cargo.mes),
          totalCargo,
          montoAplicadoCargo,
          pagoRecibido,
          pagoEsRespaldo,
          balance,
          estadoMes,
        };
      });
  }, [cargos, pagosRecibidosPorPeriodo]);

  const totalCargos = detalleMensual.reduce(
    (sum, item) => sum + item.totalCargo,
    0
  );

  // Este total representa lo aplicado/registrado en los cargos periódicos.
  // No debe confundirse con el dinero realmente registrado como pagos del año.
  const totalAplicadoCargos = detalleMensual.reduce(
    (sum, item) => sum + item.montoAplicadoCargo,
    0
  );

  const totalPagosRecibidosAnio = detalleMensual.reduce(
    (sum, item) => sum + item.pagoRecibido,
    0
  );

  const balancePendiente = detalleMensual.reduce(
    (sum, item) => sum + item.balance,
    0
  );

  const estadoGeneral =
    balancePendiente <= 0 && totalCargos > 0
      ? "Al día"
      : totalAplicadoCargos > 0
      ? "Con balance pendiente"
      : "Pendiente";

  const totalAplicadoPago = aplicacionesPago.reduce(
    (sum, item) => sum + Number(item.monto_aplicado || 0),
    0
  );

  const balanceNoAplicadoRecibo = Math.max(
    Number(pago?.monto_pagado || 0) - totalAplicadoPago,
    0
  );

  const saldoFavorDisponible = creditosDisponibles.reduce(
    (sum, item) => sum + Number(item.monto_disponible || 0),
    0
  );

  const saldoFavorDelPago = creditosDisponibles
    .filter((item) => Number(item.pago_id || 0) === Number(pago?.id || 0))
    .reduce((sum, item) => sum + Number(item.monto_disponible || 0), 0);

  const cuotaMensualCobertura = useMemo(() => {
    if (Number(cuotaOrdinaria || 0) > 0) {
      return Number(cuotaOrdinaria);
    }

    const ultimoCargoConMonto = [...detalleMensual]
      .reverse()
      .find((item) => Number(item.totalCargo || 0) > 0);

    return Number(ultimoCargoConMonto?.totalCargo || 0);
  }, [cuotaOrdinaria, detalleMensual]);

  const coberturaFutura = useMemo(() => {
    if (
      saldoFavorDisponible < cuotaMensualCobertura ||
      cuotaMensualCobertura <= 0 ||
      !anioActual
    ) {
      return [];
    }

    const ultimoMesGenerado = detalleMensual.reduce(
      (maximo, item) => Math.max(maximo, Number(item.mes || 0)),
      0
    );

    let disponible = Number(saldoFavorDisponible);
    const filas: Array<{
      mes: number;
      mesNombre: string;
      anio: number;
      cuota: number;
      montoCubierto: number;
      estado: "CUBIERTO CON SALDO A FAVOR";
    }> = [];

    for (let mes = ultimoMesGenerado + 1; mes <= 12; mes += 1) {
      if (disponible + 0.0001 < cuotaMensualCobertura) break;

      filas.push({
        mes,
        mesNombre: MESES_NOMBRES[mes] || String(mes),
        anio: Number(anioActual),
        cuota: cuotaMensualCobertura,
        montoCubierto: cuotaMensualCobertura,
        estado: "CUBIERTO CON SALDO A FAVOR",
      });

      disponible = Math.max(disponible - cuotaMensualCobertura, 0);
    }

    return filas;
  }, [
    saldoFavorDisponible,
    cuotaMensualCobertura,
    detalleMensual,
    anioActual,
  ]);

  const totalCoberturaFutura = coberturaFutura.reduce(
    (sum, item) => sum + Number(item.montoCubierto || 0),
    0
  );

  const saldoFavorLuegoCoberturaAnual = Math.max(
    saldoFavorDisponible - totalCoberturaFutura,
    0
  );

  const mesesCoberturaFuturaTexto = coberturaFutura
    .filter((item) => item.estado === "CUBIERTO CON SALDO A FAVOR")
    .map((item) => `${item.mesNombre} ${item.anio}`)
    .join(", ");

  const noRecibo = `${
    tipo === "pagos" ? "PG" : tipo === "mantenimiento" ? "RM" : "RP"
  }-${String(pago?.id || "").padStart(5, "0")}`;

  const nombrePropietario =
    propietario?.nombre_propietario || pago?.nombre_propietario || "-";

  const telefonoPropietario = propietario?.telefono || pago?.telefono || "";

  const correoPropietario = propietario?.correo || pago?.correo || "";

  function imprimir() {
    window.print();
  }

  function generarMensaje() {
    if (!pago) return "";

    return `Estimado/a ${nombrePropietario},

Hemos recibido su pago de mantenimiento.

Condominio: ${pago.condominio}
Apartamento: ${pago.no_apartamento}
Recibo No.: ${noRecibo}
Fecha de pago: ${formatoFecha(pago.fecha_pago)}
Mes pagado: ${pago.mes_pagado || "-"}
Monto recibido: RD$ ${dinero(pago.monto_pagado)}
Monto aplicado: RD$ ${dinero(totalAplicadoPago)}
Método/Banco: ${pago.metodo_pago || "-"}
Referencia: ${pago.no_referencia || "-"}

Balance pendiente actual: RD$ ${dinero(balancePendiente)}
Estado: ${estadoGeneral}${
  saldoFavorDisponible > 0
    ? `

Saldo a favor disponible: RD$ ${dinero(saldoFavorDisponible)}${
        mesesCoberturaFuturaTexto
          ? `
Cobertura futura estimada: ${mesesCoberturaFuturaTexto}`
          : ""
      }`
    : ""
}

Gracias por su pago.

VAM Administradora de Condominios
Tel. 829-792-9292`;
  }

  function enviarWhatsApp() {
    const telefono = limpiarTelefonoWhatsApp(telefonoPropietario);

    if (!telefono) {
      alert("Este propietario no tiene teléfono registrado.");
      return;
    }

    window.open(
      `https://wa.me/${telefono}?text=${encodeURIComponent(generarMensaje())}`,
      "_blank"
    );
  }

  function enviarEmail() {
    if (!correoPropietario) {
      alert("Este propietario no tiene correo registrado.");
      return;
    }

    const asunto = encodeURIComponent(
      `Recibo de pago ${noRecibo} - ${pago?.condominio || ""}`
    );

    const cuerpo = encodeURIComponent(generarMensaje());

    window.location.href = `mailto:${correoPropietario}?subject=${asunto}&body=${cuerpo}`;
  }

  async function copiarMensaje() {
    const mensajeCopiar = generarMensaje();

    if (!mensajeCopiar) {
      alert("No hay mensaje para copiar.");
      return;
    }

    await navigator.clipboard.writeText(mensajeCopiar);
    alert("Mensaje copiado correctamente.");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded-2xl shadow p-6">
          Cargando recibo de pago...
        </div>
      </main>
    );
  }

  if (mensaje || !pago) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded-2xl shadow p-6 max-w-lg">
          <p className="text-red-700 font-bold">{mensaje}</p>

          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 bg-slate-800 text-white px-4 py-2 rounded-xl"
          >
            Volver
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-200 p-4 print:bg-white print:p-0">
      <style>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 0.20in;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .print-card {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            font-size: 9px !important;
            line-height: 1.12 !important;
          }

          /* Compactación exclusiva para impresión. La pantalla no cambia. */
          .print-card .text-lg {
            font-size: 13px !important;
            line-height: 1.05 !important;
          }

          .print-card .text-base {
            font-size: 11px !important;
            line-height: 1.05 !important;
          }

          .print-card .text-sm {
            font-size: 9px !important;
            line-height: 1.12 !important;
          }

          .print-card .text-xs {
            font-size: 8px !important;
            line-height: 1.1 !important;
          }

          .print-card .text-\[15px\] {
            font-size: 12px !important;
          }

          .print-card .text-\[11px\] {
            font-size: 8px !important;
          }

          .print-card .text-\[10px\],
          .print-card .text-\[9px\] {
            font-size: 7px !important;
            line-height: 1.05 !important;
          }

          .print-card .mt-6 {
            margin-top: 8px !important;
          }

          .print-card .mt-5 {
            margin-top: 7px !important;
          }

          .print-card .mt-4 {
            margin-top: 6px !important;
          }

          .print-card .mt-3 {
            margin-top: 5px !important;
          }

          .print-card .mt-2 {
            margin-top: 3px !important;
          }

          .print-card .mt-1 {
            margin-top: 2px !important;
          }

          .print-card .mb-4 {
            margin-bottom: 6px !important;
          }

          .print-card .mb-3 {
            margin-bottom: 5px !important;
          }

          .print-card .mb-2 {
            margin-bottom: 3px !important;
          }

          .print-card .mb-1 {
            margin-bottom: 2px !important;
          }

          .print-card .p-3 {
            padding: 6px !important;
          }

          .print-card .p-2 {
            padding: 4px !important;
          }

          .print-card .px-3 {
            padding-left: 6px !important;
            padding-right: 6px !important;
          }

          .print-card .py-1\.5 {
            padding-top: 3px !important;
            padding-bottom: 3px !important;
          }

          .print-card .pb-3 {
            padding-bottom: 5px !important;
          }

          .print-card .pb-1 {
            padding-bottom: 2px !important;
          }

          .print-card .pt-2 {
            padding-top: 3px !important;
          }

          .print-card .gap-10 {
            gap: 16px !important;
          }

          .print-card .gap-4,
          .print-card .gap-3 {
            gap: 6px !important;
          }

          .print-table {
            font-size: 7.5px !important;
            line-height: 1.05 !important;
          }

          .print-table th,
          .print-table td {
            padding: 2px 3px !important;
            line-height: 1.05 !important;
          }

          .page-break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Evita que el bloque final salte innecesariamente a una segunda página. */
          .print-card > div:last-child,
          .print-card > div:nth-last-child(2) {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="no-print max-w-5xl mx-auto mb-4 flex flex-col md:flex-row justify-between gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold"
        >
          Volver
        </button>

        <div className="flex flex-col md:flex-row gap-2">
          <button
            type="button"
            onClick={imprimir}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl font-bold"
          >
            Imprimir / PDF
          </button>

          <button
            type="button"
            onClick={enviarWhatsApp}
            className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl font-bold"
          >
            Enviar WhatsApp
          </button>

          <button
            type="button"
            onClick={enviarEmail}
            className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-xl font-bold"
          >
            Enviar Email
          </button>

          <button
            type="button"
            onClick={copiarMensaje}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl font-bold"
          >
            Copiar mensaje
          </button>
        </div>
      </div>

      <section className="max-w-5xl mx-auto bg-white rounded-2xl shadow border p-6 print-card text-slate-900">
        <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between gap-4">
          <div className="text-center flex-1">
            <h1 className="text-lg font-black uppercase leading-tight">
              {pago.condominio}
            </h1>

            <h2 className="text-base font-black uppercase mt-1">
              Recibo de Pago de Mantenimiento
            </h2>

            <p className="text-xs mt-1">
              Comprobante de pago recibido y aplicado al estado de cuenta
            </p>
          </div>

          <div className="text-xs border rounded-lg p-2 min-w-[180px]">
            <p>
              <strong>Recibo No.:</strong> {noRecibo}
            </p>
            <p>
              <strong>Fecha recibo:</strong> {fechaHoy()}
            </p>
            <p>
              <strong>Tipo:</strong>{" "}
              {tipo === "pagos"
                ? "Pago aplicado"
                : tipo === "mantenimiento"
                ? "Administración"
                : "Propietario"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm page-break-inside-avoid">
          <div className="border rounded-lg p-3">
            <h3 className="font-black uppercase border-b pb-1 mb-2">
              Propietario
            </h3>

            <div className="grid grid-cols-2 gap-y-1">
              <p className="font-bold">Apartamento:</p>
              <p>{pago.no_apartamento}</p>

              <p className="font-bold">Nombre:</p>
              <p>{nombrePropietario}</p>
            </div>
          </div>

          <div className="border rounded-lg p-3">
            <h3 className="font-black uppercase border-b pb-1 mb-2">
              Datos del pago
            </h3>

            <div className="grid grid-cols-2 gap-y-1">
              <p className="font-bold">Fecha de pago:</p>
              <p>{formatoFecha(pago.fecha_pago)}</p>

              <p className="font-bold">Mes pagado:</p>
              <p>{pago.mes_pagado || "-"}</p>

              <p className="font-bold">Método / Banco:</p>
              <p>{pago.metodo_pago || "-"}</p>

              <p className="font-bold">Referencia:</p>
              <p>{pago.no_referencia || "-"}</p>

              <p className="font-bold">Estado:</p>
              <p>{pago.estado || "-"}</p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg mt-4 page-break-inside-avoid overflow-hidden">
          <div className="bg-slate-900 text-white px-3 py-1.5 font-black uppercase text-[11px]">
            Resumen del pago
          </div>

          <div className="grid grid-cols-3 text-center text-[11px]">
            <div className="border-r p-2 bg-green-50">
              <p className="font-bold text-slate-600">Monto recibido</p>
              <p className="text-[15px] font-black text-green-700">
                RD$ {dinero(pago.monto_pagado)}
              </p>
            </div>

            <div className="border-r p-2 bg-blue-50">
              <p className="font-bold text-slate-600">Monto aplicado</p>
              <p className="text-[15px] font-black text-blue-700">
                RD$ {dinero(totalAplicadoPago)}
              </p>
            </div>

            <div className="p-2 bg-red-50">
              <p className="font-bold text-slate-600">Balance pendiente</p>
              <p
                className={`text-[15px] font-black ${
                  balancePendiente <= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                RD$ {dinero(balancePendiente)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 page-break-inside-avoid">
          <h3 className="font-black uppercase border-b pb-1 mb-2">
            Detalle aplicado del pago
          </h3>

          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm print-table">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 border">Período</th>
                  <th className="p-2 border text-right">Monto aplicado</th>
                  <th className="p-2 border text-center">Estado</th>
                </tr>
              </thead>

              <tbody>
                {aplicacionesPago.map((item) => {
                  const cargo = item.cargos_periodicos;
                  const periodo = cargo?.periodo || "-";

                  return (
                    <tr key={item.id}>
                      <td className="p-2 border font-bold">
                        {formatearPeriodo(periodo)}
                      </td>
                      <td className="p-2 border text-right text-green-700 font-black">
                        RD$ {dinero(item.monto_aplicado)}
                      </td>
                      <td className="p-2 border text-center font-bold">
                        {cargo?.estado || "-"}
                      </td>
                    </tr>
                  );
                })}

                {aplicacionesPago.length === 0 && (
                  <tr>
                    <td className="p-3 border text-center" colSpan={3}>
                      Este pago no tiene aplicaciones registradas en pagos_aplicaciones.
                    </td>
                  </tr>
                )}
              </tbody>

              {aplicacionesPago.length > 0 && (
                <tfoot className="bg-slate-100 font-black">
                  <tr>
                    <td className="p-2 border text-right">
                      TOTAL APLICADO
                    </td>
                    <td className="p-2 border text-right">
                      RD$ {dinero(totalAplicadoPago)}
                    </td>
                    <td className="p-2 border text-center">
                      No aplicado: RD$ {dinero(balanceNoAplicadoRecibo)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {pago.descripcion && (
          <div className="border rounded-lg p-3 mt-4">
            <h3 className="font-black uppercase border-b pb-1 mb-2">
              Observación del pago
            </h3>

            <p className="text-sm whitespace-pre-wrap">{pago.descripcion}</p>
          </div>
        )}

        {pago.comprobante_url && (
          <div className="border rounded-lg p-3 mt-4 no-print">
            <h3 className="font-black uppercase border-b pb-1 mb-2">
              Comprobante digital
            </h3>

            <a
              href={pago.comprobante_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:underline font-bold"
            >
              Ver comprobante cargado
            </a>
          </div>
        )}

        <div className="mt-5">
          <h3 className="font-black uppercase border-b pb-1 mb-2">
            Estado mensual de cargos del año {anioActual}
          </h3>

          {saldoFavorDisponible > 0 && (
            <div className="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950 page-break-inside-avoid">
              <p className="font-black">
                Saldo a favor disponible: RD$ {dinero(saldoFavorDisponible)}
              </p>

              {saldoFavorDelPago > 0 && (
                <p className="mt-1">
                  De este recibo permanecen RD$ {dinero(saldoFavorDelPago)} disponibles
                  como saldo a favor.
                </p>
              )}

              <p className="mt-1 text-xs">
                Este saldo no representa un cargo futuro pagado. Permanecerá disponible
                y VAM lo aplicará automáticamente cuando se genere el próximo cargo de
                mantenimiento.
              </p>
            </div>
          )}

          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm print-table">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 border">Mes</th>
                  <th className="p-2 border">Cargo total</th>
                  <th className="p-2 border">Pago recibido</th>
                  <th className="p-2 border">Balance</th>
                  <th className="p-2 border">Estado</th>
                </tr>
              </thead>

              <tbody>
                {detalleMensual.map((item) => (
                  <tr key={item.id}>
                    <td className="p-2 border font-bold">
                      {item.mesNombre} {item.anio}
                    </td>
                    <td className="p-2 border text-right">
                      RD$ {dinero(item.totalCargo)}
                    </td>
                    <td className="p-2 border text-right text-green-700 font-bold">
                      <div>RD$ {dinero(item.pagoRecibido)}</div>
                      {!item.pagoEsRespaldo &&
                        Math.abs(item.pagoRecibido - item.montoAplicadoCargo) > 0.009 && (
                          <div className="text-[9px] font-normal text-slate-500">
                            Aplicado al cargo: RD$ {dinero(item.montoAplicadoCargo)}
                          </div>
                        )}
                    </td>
                    <td
                      className={`p-2 border text-right font-black ${
                        item.balance <= 0 ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      RD$ {dinero(item.balance)}
                    </td>
                    <td className="p-2 border text-center font-bold">
                      {item.estadoMes}
                    </td>
                  </tr>
                ))}

                {detalleMensual.length === 0 && (
                  <tr>
                    <td className="p-3 border text-center" colSpan={5}>
                      No hay cargos generados para este apartamento en el año
                      del pago.
                    </td>
                  </tr>
                )}
              </tbody>

              {detalleMensual.length > 0 && (
                <tfoot className="bg-slate-100 font-black">
                  <tr>
                    <td className="p-2 border text-right">TOTALES</td>
                    <td className="p-2 border text-right">
                      RD$ {dinero(totalCargos)}
                    </td>
                    <td className="p-2 border text-right">
                      RD$ {dinero(totalPagosRecibidosAnio)}
                    </td>
                    <td className="p-2 border text-right">
                      RD$ {dinero(balancePendiente)}
                    </td>
                    <td className="p-2 border text-center">
                      {estadoGeneral}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {coberturaFutura.length > 0 && (
            <div className="mt-3 rounded-lg border border-emerald-200 overflow-hidden page-break-inside-avoid">
              <div className="bg-emerald-50 px-3 py-2 text-xs font-black uppercase text-emerald-900">
                Cobertura futura estimada con saldo a favor
              </div>
              <table className="min-w-full text-xs print-table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-2 border">Mes futuro</th>
                    <th className="p-2 border text-right">Cuota actual</th>
                    <th className="p-2 border text-right">Cobertura estimada</th>
                    <th className="p-2 border text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {coberturaFutura.map((item) => (
                    <tr key={`cobertura-${item.anio}-${item.mes}`}>
                      <td className="p-2 border font-bold">
                        {item.mesNombre} {item.anio}
                      </td>
                      <td className="p-2 border text-right">
                        RD$ {dinero(item.cuota)}
                      </td>
                      <td className="p-2 border text-right font-black text-emerald-800">
                        RD$ {dinero(item.montoCubierto)}
                      </td>
                      <td className="p-2 border text-center font-black text-emerald-800">
                        {item.estado}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-2 text-[10px] text-slate-500">
                Proyección basada en la cuota ordinaria actual de RD$ {dinero(cuotaMensualCobertura)}.
                Estos meses todavía no constituyen cargos formales. Saldo a favor restante
                después de la proyección: RD$ {dinero(saldoFavorLuegoCoberturaAnual)}.
              </div>
            </div>
          )}
        </div>

        <div className="border rounded-lg p-3 mt-5 page-break-inside-avoid">
          <h3 className="font-black uppercase border-b pb-1 mb-2">
            Confirmación
          </h3>

          <p className="text-sm leading-relaxed">
            Recibimos conforme el pago indicado. Este recibo sirve como comprobante
            de la transacción registrada. En caso de diferencia, favor contactar la administración.
          </p>

          <div className="grid grid-cols-2 gap-10 mt-6 text-sm">
            <div>
              <div className="border-t border-slate-900 pt-1 text-center">
                Recibido por administración
              </div>
            </div>

            <div>
              <div className="border-t border-slate-900 pt-1 text-center">
                Firma / conformidad propietario
              </div>
            </div>
          </div>
        </div>

        <div className="text-[9px] text-slate-500 flex justify-between items-end gap-4 border-t mt-5 pt-2">
          <span>Recibo generado para fines de control y archivo.</span>
          <div className="text-right">
            <div>VAM Administradora de Condominios - 829-792-9292</div>
            <div className="font-bold text-slate-600">
              {MODULO_NOMBRE} · {MODULO_VERSION} · {MODULO_FECHA_VERSION}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}