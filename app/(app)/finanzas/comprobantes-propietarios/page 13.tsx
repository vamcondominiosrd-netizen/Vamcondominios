"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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

  async function prepararPago(pago: PagoMovil) {
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
      alert(
        "El comprobante no tiene todos los datos necesarios para preparar el pago."
      );
      return;
    }

    setProcesandoId(pago.id);

    try {
      // Releer antes de preparar para evitar trabajar con un registro ya aplicado.
      const { data: actual, error: errorActual } = await supabase
        .from("pagos_movil")
        .select(
          "id,condominio_id,unidad_id,estado,pago_id,monto,fecha_pago,metodo_pago,banco,referencia,concepto,comprobante_url,no_apartamento,nombre_propietario,propietario_id,recibido_at,revisado_at"
        )
        .eq("id", pago.id)
        .eq("condominio_id", Number(condominioId))
        .maybeSingle();

      if (errorActual) throw errorActual;

      if (!actual) {
        throw new Error("No se encontró el comprobante.");
      }

      if (
        actual.pago_id ||
        normalizar(actual.estado).includes("aplicado")
      ) {
        throw new Error(
          `Este comprobante ya fue aplicado al pago #${
            actual.pago_id || "-"
          }.`
        );
      }

      if (!esValidado(actual.estado)) {
        throw new Error(
          "El comprobante ya no está en estado Validado."
        );
      }

      const referenciaPreparada =
        String(actual.referencia || "").trim() ||
        `PAGO_MOVIL_${actual.id}`;

      const preparacion = {
        version: 1,
        origen: "COMPROBANTE_PROPIETARIO",
        preparado_at: new Date().toISOString(),

        pago_movil_id: Number(actual.id),
        condominio_id: Number(actual.condominio_id),
        unidad_id: Number(actual.unidad_id),
        propietario_id: actual.propietario_id
          ? Number(actual.propietario_id)
          : null,

        no_apartamento: actual.no_apartamento || pago.no_apartamento || "",
        nombre_propietario:
          actual.nombre_propietario ||
          pago.nombre_propietario ||
          "",

        concepto: actual.concepto || "Pago de mantenimiento",
        tipo_fondo: tipoFondoDesdeConcepto(actual.concepto),

        fecha_pago: String(actual.fecha_pago || ""),
        monto: Number(actual.monto || 0),
        metodo_pago: actual.metodo_pago || "Transferencia",
        banco_reportado: actual.banco || "",
        referencia: referenciaPreparada,

        comprobante_url: actual.comprobante_url || null,
        comprobante_path: null,

        recibido_at: actual.recibido_at || actual.revisado_at || null,
      };

      localStorage.setItem(
        "vam_pago_movil_preparar",
        JSON.stringify(preparacion)
      );

      localStorage.setItem(
        "vam_pago_movil_preparar_id",
        String(actual.id)
      );

      router.push(
        `/pagos-mantenimiento?origen=propietario&pago_movil_id=${actual.id}`
      );
    } catch (error: any) {
      alert(
        error?.message ||
          "No fue posible preparar el pago para revisión."
      );
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
                            onClick={() => prepararPago(p)}
                            className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800 disabled:opacity-50"
                          >
                            {procesandoId === p.id
                              ? "Preparando..."
                              : "Preparar pago"}
                          </button>
                          <span className="text-[10px] text-slate-400">
                            Revisar antes de registrar
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
          <strong>Flujo VAM:</strong> primero se valida el volante. Después aparece <strong>Preparar pago</strong>. Ese botón lleva el comprobante al módulo de Pagos de Mantenimiento con los datos prellenados para que el administrador pueda revisar y corregir unidad, fondo, cuenta bancaria, fecha, monto, método y referencia antes de registrar el pago definitivo.
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
