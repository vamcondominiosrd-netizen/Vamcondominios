"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";
import { generarAsientoPagoMantenimiento } from "@/app/lib/contabilidad/generarAsientoPagoMantenimiento";

type PagoMovil = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  unidad_id: number;
  no_apartamento: string | null;
  propietario_id: number | null;
  nombre_propietario: string | null;
  cedula: string | null;
  telefono: string | null;
  concepto: string | null;
  monto: number;
  fecha_pago: string;
  metodo_pago: string | null;
  banco: string | null;
  referencia: string | null;
  comprobante_url: string | null;
  comprobante_path?: string | null;
  estado: string | null;
  created_at?: string | null;
  recibido_at?: string | null;
  aplicado_at?: string | null;
  observacion_revision?: string | null;
  revisado_por?: string | null;
  revisado_nombre?: string | null;
  revisado_at?: string | null;
  pago_id?: number | null;
};

function normalizar(v: string | null | undefined) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function dinero(v: number | null | undefined) {
  return Number(v || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fechaDO(v: string | null | undefined) {
  if (!v) return "-";
  const base = String(v).split("T")[0];
  const [y, m, d] = base.split("-");
  return y && m && d ? `${d}/${m}/${y}` : base;
}

function esPendiente(estado: string | null | undefined) {
  const e = normalizar(estado);
  return !e || e.includes("pendiente");
}

function esValidado(estado: string | null | undefined) {
  return normalizar(estado).includes("validado");
}

function esAplicado(pago: PagoMovil) {
  return Boolean(pago.pago_id) || normalizar(pago.estado).includes("aplicado");
}

function esRechazado(estado: string | null | undefined) {
  return normalizar(estado).includes("rechaz");
}

function tipoFondoDesdeConcepto(concepto: string | null | undefined) {
  const texto = normalizar(concepto);

  if (texto.includes("extraordinario")) return "EXTRAORDINARIO";
  if (texto.includes("reserva")) return "RESERVA";

  return "ORDINARIO";
}

function estadoClase(estado: string | null | undefined) {
  if (normalizar(estado).includes("aplicado")) {
    return "border-emerald-200 bg-emerald-100 text-emerald-800";
  }

  if (esValidado(estado)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (esRechazado(estado)) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function ComprobantesPropietariosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [pagos, setPagos] = useState<PagoMovil[]>([]);
  const [loading, setLoading] = useState(false);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState("PENDIENTES");
  const [buscar, setBuscar] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) void cargarComprobantes(id);
    else setMensaje("No se encontró el condominio activo.");
  }, []);

  async function cargarComprobantes(idActual = condominioId) {
    if (!idActual) return;

    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("pagos_movil")
      .select("*")
      .eq("condominio_id", Number(idActual))
      .order("id", { ascending: false });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando comprobantes: " + error.message);
      return;
    }

    setPagos((data as PagoMovil[]) || []);
  }

  const filtrados = useMemo(() => {
    return pagos.filter((p) => {
      const estadoOk =
        estadoFiltro === "TODOS" ||
        (estadoFiltro === "PENDIENTES" && esPendiente(p.estado)) ||
        (estadoFiltro === "VALIDADOS" && esValidado(p.estado) && !esAplicado(p)) ||
        (estadoFiltro === "APLICADOS" && esAplicado(p)) ||
        (estadoFiltro === "RECHAZADOS" && esRechazado(p.estado));

      const texto = normalizar(
        `${p.no_apartamento || ""} ${p.nombre_propietario || ""} ${
          p.cedula || ""
        } ${p.banco || ""} ${p.referencia || ""} ${p.concepto || ""}`,
      );

      const buscarOk = !buscar.trim() || texto.includes(normalizar(buscar));

      return estadoOk && buscarOk;
    });
  }, [pagos, estadoFiltro, buscar]);

  const pendientes = pagos.filter((p) => esPendiente(p.estado)).length;
  const validados = pagos.filter(
    (p) => esValidado(p.estado) && !esAplicado(p)
  ).length;
  const aplicados = pagos.filter((p) => esAplicado(p)).length;
  const rechazados = pagos.filter((p) => esRechazado(p.estado)).length;
  const montoPendiente = pagos
    .filter((p) => esPendiente(p.estado))
    .reduce((s, p) => s + Number(p.monto || 0), 0);

  async function abrirComprobante(pago: PagoMovil) {
    let url = String(pago.comprobante_url || "").trim();

    if (!url && pago.comprobante_path) {
      const { data, error } = await supabase.storage
        .from("comprobantes-pagos-propietarios")
        .createSignedUrl(pago.comprobante_path, 60 * 10);

      if (error) {
        alert("No fue posible abrir el comprobante: " + error.message);
        return;
      }

      url = data?.signedUrl || "";
    }

    if (!url) {
      alert("Este envío no tiene un comprobante disponible.");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function validarPago(pago: PagoMovil) {
    const confirmar = confirm(
      `¿Validar el comprobante del apartamento ${
        pago.no_apartamento || "-"
      } por RD$ ${dinero(
        pago.monto,
      )}?\n\nEsta acción valida el volante, pero todavía NO registra el pago de mantenimiento.`,
    );

    if (!confirmar) return;

    setProcesandoId(pago.id);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const usuarioNombre =
        localStorage.getItem("usuario_nombre") || user?.email || "Usuario VAM";

      const ahora = new Date().toISOString();

      const { error } = await supabase
        .from("pagos_movil")
        .update({
          estado: "Validado",
          recibido_at: ahora,
          observacion_revision: null,
          revisado_por: user?.id || null,
          revisado_nombre: usuarioNombre,
          revisado_at: ahora,
        })
        .eq("id", pago.id)
        .eq("condominio_id", Number(condominioId));

      if (error) throw error;

      setEstadoFiltro("VALIDADOS");
      await cargarComprobantes();
    } catch (error: any) {
      alert(error?.message || "No fue posible validar el comprobante.");
    } finally {
      setProcesandoId(null);
    }
  }

  async function aplicarPago(pago: PagoMovil) {
    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!esValidado(pago.estado) || esAplicado(pago)) {
      alert("El comprobante debe estar validado y pendiente de aplicación.");
      return;
    }

    const montoPago = Number(pago.monto || 0);

    if (!pago.unidad_id || montoPago <= 0 || !pago.fecha_pago) {
      alert("El comprobante no tiene todos los datos necesarios para aplicar el pago.");
      return;
    }

    const referenciaLimpia =
      String(pago.referencia || "").trim() || `PAGO_MOVIL_${pago.id}`;

    const tipoFondo = tipoFondoDesdeConcepto(pago.concepto);

    const confirmar = confirm(
      `APLICAR PAGO A LA CUENTA\n\n` +
        `Apartamento: ${pago.no_apartamento || "-"}\n` +
        `Propietario: ${pago.nombre_propietario || "-"}\n` +
        `Monto: RD$ ${dinero(montoPago)}\n` +
        `Fecha bancaria: ${fechaDO(pago.fecha_pago)}\n` +
        `Referencia: ${referenciaLimpia}\n\n` +
        `Esta acción registrará el pago definitivo, aplicará cargos/saldo a favor, ` +
        `actualizará banco y generará el asiento contable.\n\n¿Desea continuar?`,
    );

    if (!confirmar) return;

    setProcesandoId(pago.id);

    try {
      // Releer el registro para reducir el riesgo de doble aplicación.
      const { data: actual, error: errorActual } = await supabase
        .from("pagos_movil")
        .select("id,estado,pago_id")
        .eq("id", pago.id)
        .eq("condominio_id", Number(condominioId))
        .maybeSingle();

      if (errorActual) throw errorActual;

      if (!actual) {
        throw new Error("No se encontró el comprobante.");
      }

      if (actual.pago_id || normalizar(actual.estado).includes("aplicado")) {
        throw new Error(
          `Este comprobante ya fue aplicado al pago #${actual.pago_id || "-"}.`,
        );
      }

      if (!esValidado(actual.estado)) {
        throw new Error("El comprobante ya no está en estado Validado.");
      }

      // Control anti-duplicado antes de afectar cargos y banco.
      let duplicadoQuery = supabase
        .from("pagos")
        .select("id,monto,fecha_pago,referencia")
        .eq("condominio_id", Number(condominioId))
        .eq("unidad_id", Number(pago.unidad_id))
        .eq("fecha_pago", pago.fecha_pago)
        .eq("monto", montoPago);

      if (String(pago.referencia || "").trim()) {
        duplicadoQuery = duplicadoQuery.eq(
          "referencia",
          String(pago.referencia || "").trim(),
        );
      }

      const { data: duplicados, error: errorDuplicado } =
        await duplicadoQuery.limit(5);

      if (errorDuplicado) throw errorDuplicado;

      if ((duplicados || []).length > 0) {
        const ids = (duplicados || []).map((item: any) => item.id).join(", ");

        throw new Error(
          `Se encontró un pago ya registrado con estos mismos datos (Pago ID: ${ids}). ` +
            `No se aplicó nuevamente para evitar duplicidad.`,
        );
      }

      // Usa la misma cuenta/fondo que emplea Pagos de Mantenimiento.
      const { data: cuentas, error: errorCuenta } = await supabase
        .from("cuentas_bancarias")
        .select("id,nombre_banco,numero_cuenta,fondo_tipo")
        .eq("condominio_id", Number(condominioId))
        .eq("activa", true)
        .eq("fondo_tipo", tipoFondo)
        .order("nombre_banco", { ascending: true })
        .limit(1);

      if (errorCuenta) throw errorCuenta;

      const cuenta = cuentas?.[0];

      if (!cuenta?.id) {
        throw new Error(
          `No existe una cuenta bancaria activa configurada para el fondo ${tipoFondo}.`,
        );
      }

      /*
       * Se reutiliza el motor central de Pagos de Mantenimiento.
       * El comprobante original permanece en pagos_movil aunque sea un archivo
       * privado del portal. Si existe una URL histórica, también se enlaza al pago.
       */
      const { data: resultado, error: errorAplicacion } = await supabase.rpc(
        "registrar_pago_mantenimiento_completo",
        {
          p_condominio_id: Number(condominioId),
          p_unidad_id: Number(pago.unidad_id),
          p_fecha_pago: pago.fecha_pago,
          p_monto: montoPago,
          p_metodo_pago: pago.metodo_pago || "Transferencia",
          p_referencia: referenciaLimpia,
          p_cuenta_bancaria_id: Number(cuenta.id),
          p_comprobante_url: pago.comprobante_url || null,
          p_tipo_fondo: tipoFondo,
        },
      );

      if (errorAplicacion) {
        throw new Error(
          "El motor de Pagos de Mantenimiento no pudo aplicar el pago: " +
            errorAplicacion.message,
        );
      }

      const resultadoRpc = resultado as any;
      const pagoId = Number(resultadoRpc?.pago_id || 0);

      if (!pagoId) {
        throw new Error(
          "El motor registró una respuesta sin pago_id. Revise la base de datos antes de reintentar.",
        );
      }

      const controlCuadrado =
        resultadoRpc?.control_cuadrado === undefined ||
        resultadoRpc?.control_cuadrado === true;

      if (!controlCuadrado) {
        throw new Error(
          `El pago #${pagoId} fue creado, pero el control matemático del motor no quedó cuadrado. ` +
            `No vuelva a aplicar este comprobante hasta revisar el pago.`,
        );
      }

      const ahora = new Date().toISOString();

      const { error: errorVinculo } = await supabase
        .from("pagos_movil")
        .update({
          estado: "APLICADO",
          pago_id: pagoId,
          aplicado_at: ahora,
          recibido_at: pago.recibido_at || pago.revisado_at || ahora,
        })
        .eq("id", pago.id)
        .eq("condominio_id", Number(condominioId));

      if (errorVinculo) {
        throw new Error(
          `El pago #${pagoId} fue aplicado, pero no se pudo vincular al comprobante móvil: ` +
            errorVinculo.message,
        );
      }

      const asientoResultado = await generarAsientoPagoMantenimiento({
        condominio_id: Number(condominioId),
        pago_id: pagoId,
        fecha: pago.fecha_pago,
        monto: montoPago,
        referencia: referenciaLimpia,
        descripcion: `Pago mantenimiento - Unidad ${pago.no_apartamento || pago.unidad_id}`,
        usuario: null,
      });

      setEstadoFiltro("APLICADOS");
      await cargarComprobantes();

      if (!asientoResultado.ok) {
        alert(
          `Pago #${pagoId} aplicado correctamente a la cuenta del propietario, ` +
            `pero el asiento contable presentó este inconveniente: ${asientoResultado.error}`,
        );
        return;
      }

      alert(
        `Pago aplicado correctamente.\n\nPago #${pagoId}\n` +
          `Apartamento: ${pago.no_apartamento || "-"}\n` +
          `Monto: RD$ ${dinero(montoPago)}\n\n` +
          `El propietario ya podrá ver "Pago aplicado a su cuenta" en VAM Móvil.`,
      );
    } catch (error: any) {
      alert(error?.message || "No fue posible aplicar el pago.");
    } finally {
      setProcesandoId(null);
    }
  }

  async function rechazarPago(pago: PagoMovil) {
    const motivo = prompt(
      `Indique el motivo del rechazo del comprobante del apartamento ${
        pago.no_apartamento || "-"
      }:`
    );

    if (motivo === null) return;
    if (!motivo.trim()) {
      alert("Debe indicar el motivo del rechazo.");
      return;
    }

    setProcesandoId(pago.id);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const usuarioNombre =
        localStorage.getItem("usuario_nombre") || user?.email || "Usuario VAM";

      const { error } = await supabase
        .from("pagos_movil")
        .update({
          estado: "Rechazado",
          observacion_revision: motivo.trim(),
          revisado_por: user?.id || null,
          revisado_nombre: usuarioNombre,
          revisado_at: new Date().toISOString(),
        })
        .eq("id", pago.id)
        .eq("condominio_id", Number(condominioId));

      if (error) throw error;
      await cargarComprobantes();
    } catch (error: any) {
      alert(error?.message || "No fue posible rechazar el comprobante.");
    } finally {
      setProcesandoId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
                <FileCheck2 className="h-6 w-6" />
                Comprobantes de pagos
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Volantes enviados por los propietarios desde VAM Móvil.
              </p>
              <p className="mt-2 text-sm font-bold text-emerald-700">
                {condominioNombre || "Condominio activo"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => cargarComprobantes()}
              disabled={loading}
              className="inline-flex items-center gap-2 self-start rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
        </header>

        {mensaje && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {mensaje}
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <ResumenCard
            titulo="Pendientes"
            valor={String(pendientes)}
            detalle={`RD$ ${dinero(montoPendiente)}`}
            icono={<Clock3 className="h-5 w-5 text-amber-600" />}
          />
          <ResumenCard
            titulo="Validados"
            valor={String(validados)}
            detalle="Comprobante revisado"
            icono={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          />
          <ResumenCard
            titulo="Aplicados"
            valor={String(aplicados)}
            detalle="Asignados a la cuenta"
            icono={<FileCheck2 className="h-5 w-5 text-emerald-600" />}
          />
          <ResumenCard
            titulo="Rechazados"
            valor={String(rechazados)}
            detalle="Con observación"
            icono={<XCircle className="h-5 w-5 text-red-600" />}
          />
          <ResumenCard
            titulo="Total recibidos"
            valor={String(pagos.length)}
            detalle="Histórico del condominio"
            icono={<FileCheck2 className="h-5 w-5 text-blue-600" />}
          />
        </section>

        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="rounded-xl border bg-white px-3 py-2"
            >
              <option value="PENDIENTES">Pendientes</option>
              <option value="VALIDADOS">Validados - pendientes de aplicar</option>
              <option value="APLICADOS">Aplicados a cuenta</option>
              <option value="RECHAZADOS">Rechazados</option>
              <option value="TODOS">Todos</option>
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Apartamento, propietario, banco, referencia..."
                className="w-full rounded-xl border py-2 pl-9 pr-3"
              />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Enviado</th>
                  <th className="px-4 py-3 text-left">Apartamento</th>
                  <th className="px-4 py-3 text-left">Propietario</th>
                  <th className="px-4 py-3 text-left">Pago reportado</th>
                  <th className="px-4 py-3 text-left">Banco / método</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-center">Volante</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filtrados.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="font-semibold">{fechaDO(p.created_at || p.fecha_pago)}</div>
                      <div className="mt-1 text-xs text-slate-400">ID {p.id}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-black">
                      {p.no_apartamento || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{p.nombre_propietario || "-"}</div>
                      {p.telefono && <div className="mt-1 text-xs text-slate-400">{p.telefono}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{fechaDO(p.fecha_pago)}</div>
                      <div className="mt-1 text-xs text-slate-500">{p.concepto || "Pago"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{p.banco || "-"}</div>
                      <div className="mt-1 text-xs text-slate-500">{p.metodo_pago || "-"}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-black text-emerald-700">
                      RD$ {dinero(p.monto)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.comprobante_url || p.comprobante_path ? (
                        <button
                          type="button"
                          onClick={() => abrirComprobante(p)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-100"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver volante
                        </button>
                      ) : (
                        <span className="text-xs text-red-500">Sin archivo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${estadoClase(p.estado)}`}>
                        {esAplicado(p) ? "APLICADO" : p.estado || "Pendiente"}
                      </span>
                      {p.observacion_revision && (
                        <div className="mx-auto mt-1 max-w-[180px] truncate text-[11px] text-slate-400" title={p.observacion_revision}>
                          {p.observacion_revision}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {esPendiente(p.estado) ? (
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            disabled={procesandoId === p.id}
                            onClick={() => validarPago(p)}
                            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                          >
                            Validar
                          </button>
                          <button
                            type="button"
                            disabled={procesandoId === p.id}
                            onClick={() => rechazarPago(p)}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Rechazar
                          </button>
                        </div>
                      ) : esValidado(p.estado) && !esAplicado(p) ? (
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            disabled={procesandoId === p.id}
                            onClick={() => aplicarPago(p)}
                            className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800 disabled:opacity-50"
                          >
                            {procesandoId === p.id
                              ? "Aplicando..."
                              : "Aplicar pago"}
                          </button>
                          <span className="text-[10px] text-slate-400">
                            Ya validado
                          </span>
                        </div>
                      ) : esAplicado(p) ? (
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              window.open(
                                `/recibos/pago/mantenimiento/${p.pago_id}`,
                                "_blank",
                                "noopener,noreferrer",
                              )
                            }
                            className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-100"
                          >
                            Ver pago #{p.pago_id}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-xs text-slate-400">
                          {p.revisado_nombre || "Revisado"}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

                {!loading && filtrados.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                      No hay comprobantes para mostrar con estos filtros.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center font-semibold text-slate-500">
                      Cargando comprobantes...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          <strong>Flujo VAM:</strong> primero se valida el volante. Después aparece <strong>Aplicar pago</strong>. Esa segunda acción utiliza el motor central de Pagos de Mantenimiento para registrar el pago definitivo, aplicar cargos o saldo a favor, actualizar banco y vincular el comprobante con el pago.
        </div>
      </div>
    </main>
  );
}

function ResumenCard({
  titulo,
  valor,
  detalle,
  icono,
}: {
  titulo: string;
  valor: string;
  detalle: string;
  icono: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-black uppercase tracking-wide text-slate-400">{titulo}</div>
        {icono}
      </div>
      <div className="mt-2 text-2xl font-black text-slate-900">{valor}</div>
      <div className="mt-1 text-xs text-slate-500">{detalle}</div>
    </div>
  );
}
