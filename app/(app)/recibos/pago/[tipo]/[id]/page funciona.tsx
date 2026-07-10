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

    if (tipo === "pagos") {
      await cargarReciboDesdeTablaPagos();
      return;
    }

    if (tipo === "mantenimiento") {
      await cargarReciboMantenimiento();
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

  async function cargarReciboDesdeTablaPagos() {
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

    const apartamento = pagoTabla.unidades?.codigo || "";

    const pagoNormalizado: PagoRecibo = {
      id: pagoTabla.id,
      tipo_recibo: "pagos",
      condominio: nombreCondominio,
      condominio_id: pagoTabla.condominio_id,
      unidad_id: pagoTabla.unidad_id,
      no_apartamento: apartamento,
      nombre_propietario: pagoTabla.unidades?.propietario_nombre || null,
      cedula: pagoTabla.unidades?.propietario_cedula || null,
      telefono: pagoTabla.unidades?.propietario_telefono || null,
      correo: null,
      fecha_pago: pagoTabla.fecha_pago,
      mes_pagado: "Aplicado automáticamente a cargos pendientes",
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
      estado: data.estado,
      comprobante_url: data.comprobante_url,
      created_at: data.created_at,
    };

    setPago(pagoNormalizado);

    await Promise.all([
      cargarPropietario(nombreCondominio, apartamento, condominioId),
      cargarCargosPeriodicos(condominioId, unidadId, apartamento, data.fecha_pago),
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

  const detalleMensual = useMemo(() => {
    return [...cargos]
      .sort((a, b) => Number(a.mes || 0) - Number(b.mes || 0))
      .map((cargo) => {
        const totalCargo = Number(cargo.monto || 0);
        const montoPagado = Number(cargo.monto_pagado || 0);
        const balance = Number(cargo.balance ?? totalCargo - montoPagado);

        let estadoMes = cargo.estado || "PENDIENTE";

        if (balance <= 0 && totalCargo > 0) {
          estadoMes = "PAGADO";
        } else if (montoPagado > 0 && balance > 0) {
          estadoMes = "PARCIAL";
        }

        return {
          ...cargo,
          mesNombre: MESES_NOMBRES[Number(cargo.mes)] || String(cargo.mes),
          totalCargo,
          montoPagado,
          balance,
          estadoMes,
        };
      });
  }, [cargos]);

  const totalCargos = detalleMensual.reduce(
    (sum, item) => sum + item.totalCargo,
    0
  );

  const totalPagado = detalleMensual.reduce(
    (sum, item) => sum + item.montoPagado,
    0
  );

  const balancePendiente = detalleMensual.reduce(
    (sum, item) => sum + item.balance,
    0
  );

  const estadoGeneral =
    balancePendiente <= 0 && totalCargos > 0
      ? "Al día"
      : totalPagado > 0
      ? "Con balance pendiente"
      : "Pendiente";

  const noRecibo = `${
    tipo === "pagos" ? "PG" : tipo === "mantenimiento" ? "RM" : "RP"
  }-${String(pago?.id || "").padStart(5, "0")}`;

  const nombrePropietario =
    propietario?.nombre_propietario || pago?.nombre_propietario || "-";

  const cedulaPropietario = propietario?.cedula || pago?.cedula || "-";

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
Método/Banco: ${pago.metodo_pago || "-"}
Referencia: ${pago.no_referencia || "-"}

Balance pendiente actual: RD$ ${dinero(balancePendiente)}
Estado: ${estadoGeneral}

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
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.35in;
          }

          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .print-card {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }

          .print-table {
            font-size: 8.5px !important;
          }

          .print-table th,
          .print-table td {
            padding: 3px !important;
          }

          .page-break-inside-avoid {
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
              Datos del propietario
            </h3>

            <div className="grid grid-cols-2 gap-y-1">
              <p className="font-bold">Apartamento:</p>
              <p>{pago.no_apartamento}</p>

              <p className="font-bold">Propietario:</p>
              <p>{nombrePropietario}</p>

              <p className="font-bold">Cédula:</p>
              <p>{cedulaPropietario}</p>

              <p className="font-bold">Teléfono:</p>
              <p>{telefonoPropietario || "-"}</p>

              <p className="font-bold">Correo:</p>
              <p className="break-all">{correoPropietario || "-"}</p>
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
              <p className="font-bold text-slate-600">Total pagado año</p>
              <p className="text-[15px] font-black text-blue-700">
                RD$ {dinero(totalPagado)}
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
            Estado mensual del año {anioActual}
          </h3>

          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm print-table">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 border">Mes</th>
                  <th className="p-2 border">Cargo total</th>
                  <th className="p-2 border">Pagado</th>
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
                      RD$ {dinero(item.montoPagado)}
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
                      RD$ {dinero(totalPagado)}
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
        </div>

        <div className="border rounded-lg p-3 mt-5 page-break-inside-avoid">
          <h3 className="font-black uppercase border-b pb-1 mb-2">
            Confirmación
          </h3>

          <p className="text-sm leading-relaxed">
            Recibimos conforme el pago indicado en este recibo. Este documento
            sirve como comprobante de pago y soporte del estado de cuenta del
            propietario. En caso de diferencia, favor contactar la
            administración.
          </p>

          <div className="grid grid-cols-2 gap-10 mt-8 text-sm">
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

        <div className="text-[9px] text-slate-500 flex justify-between border-t mt-5 pt-2">
          <span>Recibo generado para fines de control y archivo.</span>
          <span>VAM Administradora de Condominios - 829-792-9292</span>
        </div>
      </section>
    </main>
  );
}