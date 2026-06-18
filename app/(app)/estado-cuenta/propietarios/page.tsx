"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Propietario = {
  id: number;
  unidad_id: number | null;
  condominio: string;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string | null;
  telefono: string | null;
  correo: string | null;
  estado: string | null;
  condominio_id: number | null;
  tipo_unidad: string | null;
  cuota_mensual_actual: number | null;
};

type Unidad = {
  id: number;
  condominio_id: number | null;
  codigo: string;
  tipo: string | null;
  propietario_nombre: string | null;
  propietario_cedula: string | null;
  propietario_telefono: string | null;
  cuota_mensual_actual: number | null;
  activa: boolean | null;
};

type PropietarioApartamento = {
  id: number;
  condominio: string;
  no_apartamento: string;
  nombre_propietario: string | null;
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

type Pago = {
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

export default function EstadoCuentaPropietariosPage() {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [propietarios, setPropietarios] = useState<Propietario[]>([]);
  const [propietarioId, setPropietarioId] = useState("");
  const [anio, setAnio] = useState(String(new Date().getFullYear()));

  const [cargos, setCargos] = useState<CargoPeriodico[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);

  useEffect(() => {
    const idGuardado = localStorage.getItem("condominio_id") || "";
    const nombreGuardado = localStorage.getItem("condominio_nombre") || "";

    if (!idGuardado) {
      setMensaje("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    setCondominioId(idGuardado);
    setCondominioNombre(nombreGuardado || `Condominio ID ${idGuardado}`);
    cargarPropietarios(idGuardado, nombreGuardado);
  }, []);

  const propietarioSeleccionado = useMemo(() => {
    return propietarios.find((p) => String(p.id) === propietarioId) || null;
  }, [propietarios, propietarioId]);

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

        const pagoRelacionado = buscarPagoRelacionado(cargo);

        return {
          ...cargo,
          mesNombre: MESES_NOMBRES[Number(cargo.mes)] || String(cargo.mes),
          totalCargo,
          montoPagado,
          balance,
          estadoMes,
          fechaPagoMostrar: pagoRelacionado?.fecha_pago || null,
          referenciaMostrar: pagoRelacionado?.referencia || "-",
          metodoPagoMostrar:
            pagoRelacionado?.metodo_pago || pagoRelacionado?.metodo || "-",
        };
      });
  }, [cargos, pagos]);

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

  const mesesPendientes = detalleMensual.filter((item) => item.balance > 0);

  const estadoGeneral =
    balancePendiente <= 0 && totalCargos > 0
      ? "Al día"
      : totalPagado > 0
      ? "Con balance pendiente"
      : "Pendiente";

  const pagosRecientes = useMemo(() => {
    return [...pagos]
      .map((p) => ({
        id: `pg-${p.id}`,
        fecha_pago: p.fecha_pago,
        mes_pagado: obtenerPeriodoPago(p.fecha_pago),
        monto_pagado: Number(p.monto || 0),
        metodo: p.metodo_pago || p.metodo || "-",
        referencia: p.referencia || "-",
        estado: "Registrado",
        origen: p.origen || "Pagos",
      }))
      .sort((a, b) =>
        String(b.fecha_pago || "").localeCompare(String(a.fecha_pago || ""))
      );
  }, [pagos]);

  function normalizarTexto(valor: string | null | undefined) {
    return String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function dinero(valor: number) {
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

    if (numeros.length === 10) {
      return `1${numeros}`;
    }

    if (numeros.length === 11 && numeros.startsWith("1")) {
      return numeros;
    }

    return numeros;
  }

  function obtenerPeriodoPago(fecha?: string | null) {
    if (!fecha) return "-";

    const fechaLimpia = String(fecha).split("T")[0];
    const partes = fechaLimpia.split("-");

    if (partes.length === 3) {
      const mesNumero = Number(partes[1]);
      const year = partes[0];
      return `${MESES_NOMBRES[mesNumero] || partes[1]} ${year}`;
    }

    return fecha;
  }

  function buscarPagoRelacionado(cargo: CargoPeriodico) {
    const pagosDelPeriodo = pagos.filter((p) => {
      const fechaPago = String(p.fecha_pago || "").split("T")[0];
      const partes = fechaPago.split("-");

      if (partes.length !== 3) return false;

      const anioPago = Number(partes[0]);
      const mesPago = Number(partes[1]);

      return anioPago === Number(cargo.anio) && mesPago === Number(cargo.mes);
    });

    if (pagosDelPeriodo.length > 0) return pagosDelPeriodo[0];

    return null;
  }

  async function cargarPropietarios(
    idCondominio: string,
    nombreCondominio: string
  ) {
    setLoading(true);
    setMensaje("");
    setPropietarios([]);
    setPropietarioId("");

    const { data: unidadesData, error: unidadesError } = await supabase
      .from("unidades")
      .select(
        "id, condominio_id, codigo, tipo, propietario_nombre, propietario_cedula, propietario_telefono, cuota_mensual_actual, activa"
      )
      .eq("condominio_id", Number(idCondominio))
      .order("codigo", { ascending: true });

    if (unidadesError) {
      setMensaje("Error cargando unidades: " + unidadesError.message);
      setPropietarios([]);
      setLoading(false);
      return;
    }

    const unidades = (unidadesData || []) as Unidad[];

    const { data: propietariosData } = await supabase
      .from("propietarios_apartamentos")
      .select(
        "id, condominio, no_apartamento, nombre_propietario, cedula, telefono, correo, estado, condominio_id"
      )
      .eq("condominio_id", Number(idCondominio));

    const propietariosApartamentos =
      (propietariosData || []) as PropietarioApartamento[];

    const propietariosMap = new Map<string, PropietarioApartamento>();

    propietariosApartamentos.forEach((p) => {
      propietariosMap.set(normalizarTexto(p.no_apartamento), p);
    });

    const listaDesdeUnidades: Propietario[] = unidades.map((unidad) => {
      const propietarioRegistro = propietariosMap.get(
        normalizarTexto(unidad.codigo)
      );

      return {
        id: unidad.id,
        unidad_id: unidad.id,
        condominio: nombreCondominio || `Condominio ID ${idCondominio}`,
        no_apartamento: unidad.codigo || "",
        nombre_propietario:
          propietarioRegistro?.nombre_propietario ||
          unidad.propietario_nombre ||
          "Sin propietario registrado",
        cedula:
          propietarioRegistro?.cedula || unidad.propietario_cedula || null,
        telefono:
          propietarioRegistro?.telefono || unidad.propietario_telefono || null,
        correo: propietarioRegistro?.correo || null,
        estado: propietarioRegistro?.estado || "Activo",
        condominio_id: unidad.condominio_id || Number(idCondominio),
        tipo_unidad: unidad.tipo || null,
        cuota_mensual_actual: unidad.cuota_mensual_actual || null,
      };
    });

    if (listaDesdeUnidades.length > 0) {
      setPropietarios(listaDesdeUnidades);
      setLoading(false);
      return;
    }

    const listaFallback: Propietario[] = propietariosApartamentos.map((p) => ({
      id: p.id,
      unidad_id: null,
      condominio: p.condominio || nombreCondominio,
      no_apartamento: p.no_apartamento,
      nombre_propietario: p.nombre_propietario || "Sin propietario registrado",
      cedula: p.cedula || null,
      telefono: p.telefono || null,
      correo: p.correo || null,
      estado: p.estado || "Activo",
      condominio_id: p.condominio_id || Number(idCondominio),
      tipo_unidad: null,
      cuota_mensual_actual: null,
    }));

    setPropietarios(listaFallback);
    setLoading(false);
  }

  async function buscarUnidadIdPorApartamento(apartamento: string) {
    if (!condominioId || !apartamento) return null;

    const { data, error } = await supabase
      .from("unidades")
      .select("id")
      .eq("condominio_id", Number(condominioId))
      .eq("codigo", apartamento)
      .maybeSingle();

    if (error || !data?.id) return null;

    return Number(data.id);
  }

  async function cargarEstadoCuenta() {
    if (!propietarioSeleccionado) {
      alert("Seleccione un apartamento / propietario.");
      return;
    }

    setLoading(true);
    setMensaje("");
    setCargos([]);
    setPagos([]);

    const unidadId =
      propietarioSeleccionado.unidad_id ||
      (await buscarUnidadIdPorApartamento(
        propietarioSeleccionado.no_apartamento
      ));

    if (!unidadId) {
      setLoading(false);
      setMensaje(
        "No se pudo identificar la unidad seleccionada. Verifique que el apartamento exista en la tabla unidades."
      );
      return;
    }

    const inicioAnio = `${anio}-01-01`;
    const finAnio = `${anio}-12-31`;

    const [cargosResp, pagosResp] = await Promise.all([
      supabase
        .from("cargos_periodicos")
        .select(
          "id, client_id, condominio_id, unidad_id, propietario_id, periodo, anio, mes, concepto, tipo_cargo, monto, monto_pagado, balance, estado, fecha_emision, fecha_vencimiento, created_at"
        )
        .eq("condominio_id", Number(condominioId))
        .eq("unidad_id", Number(unidadId))
        .eq("anio", Number(anio))
        .order("mes", { ascending: true })
        .order("id", { ascending: true }),

      supabase
        .from("pagos")
        .select(
          "id, condominio_id, unidad_id, monto, fecha_pago, referencia, metodo_pago, metodo, origen, tipo_fondo, descripcion, comprobante_url, created_at"
        )
        .eq("condominio_id", Number(condominioId))
        .eq("unidad_id", Number(unidadId))
        .gte("fecha_pago", inicioAnio)
        .lte("fecha_pago", finAnio)
        .order("fecha_pago", { ascending: false }),
    ]);

    setLoading(false);

    if (cargosResp.error) {
      setMensaje("Error cargando cargos periódicos: " + cargosResp.error.message);
      return;
    }

    if (pagosResp.error) {
      setMensaje("Error cargando pagos: " + pagosResp.error.message);
      return;
    }

    setCargos((cargosResp.data || []) as CargoPeriodico[]);
    setPagos((pagosResp.data || []) as Pago[]);
  }

  function imprimir() {
    window.print();
  }

  function generarMensajeWhatsApp() {
    if (!propietarioSeleccionado) return "";

    const mesesPendientesTexto =
      mesesPendientes.length > 0
        ? mesesPendientes
            .map(
              (m) =>
                `- ${m.mesNombre} ${m.anio}: RD$ ${dinero(m.balance)} pendiente`
            )
            .join("\n")
        : "No presenta meses pendientes.";

    return `Estimado/a ${propietarioSeleccionado.nombre_propietario},

Le compartimos su estado de cuenta actualizado:

Condominio: ${condominioNombre}
Apartamento: ${propietarioSeleccionado.no_apartamento}
Año: ${anio}

Total cargos: RD$ ${dinero(totalCargos)}
Total pagado: RD$ ${dinero(totalPagado)}
Balance pendiente: RD$ ${dinero(balancePendiente)}
Estado: ${estadoGeneral}

Detalle pendiente:
${mesesPendientesTexto}

Puede solicitar el reporte detallado impreso o en PDF a la administración.

VAM Administradora de Condominios
Tel. 829-792-9292`;
  }

  function enviarWhatsApp() {
    if (!propietarioSeleccionado) {
      alert("Seleccione un propietario.");
      return;
    }

    const telefono = limpiarTelefonoWhatsApp(propietarioSeleccionado.telefono);

    if (!telefono) {
      alert("Este propietario no tiene teléfono registrado.");
      return;
    }

    const mensajeWhatsapp = encodeURIComponent(generarMensajeWhatsApp());
    window.open(`https://wa.me/${telefono}?text=${mensajeWhatsapp}`, "_blank");
  }

  function enviarEmail() {
    if (!propietarioSeleccionado) {
      alert("Seleccione un propietario.");
      return;
    }

    if (!propietarioSeleccionado.correo) {
      alert("Este propietario no tiene correo registrado.");
      return;
    }

    const asunto = encodeURIComponent(
      `Estado de cuenta ${condominioNombre} - Apartamento ${propietarioSeleccionado.no_apartamento}`
    );

    const cuerpo = encodeURIComponent(generarMensajeWhatsApp());

    window.location.href = `mailto:${propietarioSeleccionado.correo}?subject=${asunto}&body=${cuerpo}`;
  }

  async function copiarMensaje() {
    const mensajeCopiar = generarMensajeWhatsApp();

    if (!mensajeCopiar) {
      alert("No hay mensaje para copiar.");
      return;
    }

    await navigator.clipboard.writeText(mensajeCopiar);
    alert("Mensaje copiado correctamente.");
  }

  return (
    <div className="space-y-6">
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

      <div className="no-print">
        <h1 className="text-3xl font-bold">
          Estado de Cuenta de Propietarios
        </h1>
        <p className="text-slate-500">
          Reporte profesional con detalle mensual, pagos realizados, balance
          pendiente y envío por WhatsApp o email.
        </p>
      </div>

      {mensaje && (
        <div className="no-print bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          {mensaje}
        </div>
      )}

      <div className="no-print bg-white rounded-2xl p-6 shadow-sm border">
        <h2 className="text-xl font-bold mb-4">Filtros del reporte</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Condominio
            </label>
            <input
              type="text"
              value={condominioNombre}
              readOnly
              className="border rounded-lg px-3 py-2 w-full bg-slate-100 text-slate-700"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Año</label>
            <input
              type="number"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Apartamento / propietario
            </label>
            <select
              value={propietarioId}
              onChange={(e) => setPropietarioId(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">
                {loading
                  ? "Cargando apartamentos..."
                  : propietarios.length > 0
                  ? "Seleccione apartamento"
                  : "No hay apartamentos disponibles"}
              </option>

              {propietarios.map((p) => (
                <option key={`${p.id}-${p.no_apartamento}`} value={p.id}>
                  {p.no_apartamento} - {p.nombre_propietario}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 flex flex-col md:flex-row gap-2 justify-end">
            <button
              type="button"
              onClick={cargarEstadoCuenta}
              disabled={loading}
              className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {loading ? "Cargando..." : "Generar estado de cuenta"}
            </button>

            <button
              type="button"
              onClick={imprimir}
              disabled={!propietarioSeleccionado || cargos.length === 0}
              className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              Imprimir / PDF
            </button>

            <button
              type="button"
              onClick={enviarWhatsApp}
              disabled={!propietarioSeleccionado || cargos.length === 0}
              className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              Enviar WhatsApp
            </button>

            <button
              type="button"
              onClick={enviarEmail}
              disabled={!propietarioSeleccionado || cargos.length === 0}
              className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              Enviar Email
            </button>

            <button
              type="button"
              onClick={copiarMensaje}
              disabled={!propietarioSeleccionado || cargos.length === 0}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              Copiar mensaje
            </button>
          </div>
        </div>
      </div>

      {propietarioSeleccionado && cargos.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border print-card">
          <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between gap-4">
            <div className="text-center flex-1">
              <h1 className="text-lg font-black uppercase leading-tight">
                {condominioNombre}
              </h1>

              <h2 className="text-base font-black uppercase mt-1">
                Estado de Cuenta del Propietario
              </h2>

              <p className="text-xs mt-1">
                Reporte actualizado de cargos, pagos y balance pendiente
              </p>
            </div>

            <div className="text-xs border rounded-lg p-2 min-w-[170px]">
              <p>
                <strong>Fecha:</strong> {fechaHoy()}
              </p>
              <p>
                <strong>Año:</strong> {anio}
              </p>
              <p>
                <strong>Estado:</strong> {estadoGeneral}
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
                <p>{propietarioSeleccionado.no_apartamento}</p>

                <p className="font-bold">Tipo unidad:</p>
                <p>{propietarioSeleccionado.tipo_unidad || "-"}</p>

                <p className="font-bold">Propietario:</p>
                <p>{propietarioSeleccionado.nombre_propietario}</p>

                <p className="font-bold">Cédula:</p>
                <p>{propietarioSeleccionado.cedula || "-"}</p>

                <p className="font-bold">Teléfono:</p>
                <p>{propietarioSeleccionado.telefono || "-"}</p>

                <p className="font-bold">Correo:</p>
                <p className="break-all">
                  {propietarioSeleccionado.correo || "-"}
                </p>
              </div>
            </div>

            <div className="border rounded-lg p-3">
              <h3 className="font-black uppercase border-b pb-1 mb-2">
                Resumen financiero
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between border-b pb-1">
                  <span>Total cargos:</span>
                  <strong>RD$ {dinero(totalCargos)}</strong>
                </div>

                <div className="flex justify-between border-b pb-1">
                  <span>Total pagado:</span>
                  <strong className="text-green-700">
                    RD$ {dinero(totalPagado)}
                  </strong>
                </div>

                <div className="flex justify-between text-base font-black bg-slate-100 rounded-md p-2">
                  <span>Balance pendiente:</span>
                  <span
                    className={
                      balancePendiente <= 0 ? "text-green-700" : "text-red-700"
                    }
                  >
                    RD$ {dinero(balancePendiente)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="font-black uppercase border-b pb-1 mb-2">
              Detalle mensual del estado de cuenta
            </h3>

            <div className="overflow-auto border rounded-lg">
              <table className="min-w-full text-sm print-table">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 border">Mes</th>
                    <th className="p-2 border">Concepto</th>
                    <th className="p-2 border">Cargo</th>
                    <th className="p-2 border">Pagado</th>
                    <th className="p-2 border">Fecha pago</th>
                    <th className="p-2 border">Referencia</th>
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
                      <td className="p-2 border">
                        {item.concepto || item.tipo_cargo || "Mantenimiento"}
                      </td>
                      <td className="p-2 border text-right font-bold">
                        RD$ {dinero(item.totalCargo)}
                      </td>
                      <td className="p-2 border text-right text-green-700 font-bold">
                        RD$ {dinero(item.montoPagado)}
                      </td>
                      <td className="p-2 border">
                        {formatoFecha(item.fechaPagoMostrar)}
                      </td>
                      <td className="p-2 border">{item.referenciaMostrar}</td>
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
                </tbody>

                <tfoot className="bg-slate-100 font-black">
                  <tr>
                    <td className="p-2 border text-right" colSpan={2}>
                      TOTALES
                    </td>
                    <td className="p-2 border text-right">
                      RD$ {dinero(totalCargos)}
                    </td>
                    <td className="p-2 border text-right">
                      RD$ {dinero(totalPagado)}
                    </td>
                    <td className="p-2 border" colSpan={2}></td>
                    <td className="p-2 border text-right">
                      RD$ {dinero(balancePendiente)}
                    </td>
                    <td className="p-2 border text-center">
                      {estadoGeneral}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {pagosRecientes.length > 0 && (
            <div className="mt-5">
              <h3 className="font-black uppercase border-b pb-1 mb-2">
                Pagos registrados en el año
              </h3>

              <div className="overflow-auto border rounded-lg">
                <table className="min-w-full text-sm print-table">
                  <thead className="bg-green-100">
                    <tr>
                      <th className="p-2 border">Fecha</th>
                      <th className="p-2 border">Período</th>
                      <th className="p-2 border">Monto</th>
                      <th className="p-2 border">Método / Banco</th>
                      <th className="p-2 border">Referencia</th>
                      <th className="p-2 border">Estado</th>
                      <th className="p-2 border">Origen</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pagosRecientes.map((p) => (
                      <tr key={p.id}>
                        <td className="p-2 border">
                          {formatoFecha(p.fecha_pago)}
                        </td>
                        <td className="p-2 border">{p.mes_pagado || "-"}</td>
                        <td className="p-2 border text-right font-bold">
                          RD$ {dinero(p.monto_pagado)}
                        </td>
                        <td className="p-2 border">{p.metodo}</td>
                        <td className="p-2 border">{p.referencia}</td>
                        <td className="p-2 border">{p.estado}</td>
                        <td className="p-2 border">{p.origen}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="border rounded-lg p-3 mt-5 page-break-inside-avoid">
            <h3 className="font-black uppercase border-b pb-1 mb-2">
              Observación
            </h3>

            <p className="text-sm leading-relaxed">
              Este estado de cuenta refleja los cargos y pagos registrados en el
              sistema a la fecha de emisión. En caso de haber realizado un pago
              recientemente, favor remitir el comprobante a la administración
              para su validación.
            </p>
          </div>

          <div className="text-[9px] text-slate-500 flex justify-between border-t mt-5 pt-2">
            <span>
              Estado de cuenta generado para fines de revisión y control.
            </span>
            <span>VAM Administradora de Condominios - 829-792-9292</span>
          </div>
        </div>
      )}

      {propietarioSeleccionado && cargos.length === 0 && !loading && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border text-center text-slate-500">
          No hay cargos periódicos generados para este apartamento en el año
          seleccionado.
        </div>
      )}
    </div>
  );
}