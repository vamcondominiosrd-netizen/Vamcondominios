"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type SolicitudPago = {
  id: number;
  condominio: string;
  fecha_solicitud: string;
  concepto: string;
  detalle: string;
  monto: number;
  itbis: number;
  total: number;
  no_factura: string;
  ncf: string;
  metodo_pago: string;
  cuenta_banco: string;
  soporte_url: string;
  prioridad: string;
  estado: string;
  comentario_tesorero: string;
  comentario_presidente: string;
  catalogo_proveedores?: { nombre_proveedor: string };
  catalogo_categoria_gastos?: { nombre_categoria: string };
};

export default function AprobacionPresidentePage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [loading, setLoading] = useState(false);
  const [comentarios, setComentarios] = useState<Record<number, string>>({});

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  async function cargarSolicitudes() {
    setLoading(true);

    const { data, error } = await supabase
      .from("solicitudes_pago")
      .select(`
        id,
        condominio,
        fecha_solicitud,
        concepto,
        detalle,
        monto,
        itbis,
        total,
        no_factura,
        ncf,
        metodo_pago,
        cuenta_banco,
        soporte_url,
        prioridad,
        estado,
        comentario_tesorero,
        comentario_presidente,
        catalogo_proveedores(nombre_proveedor),
        catalogo_categoria_gastos(nombre_categoria)
      `)
      .eq("estado", "Aprobado por tesorero")
      .order("fecha_revision_tesorero", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando solicitudes: " + error.message);
      return;
    }

    setSolicitudes((data as SolicitudPago[]) || []);
  }

  async function actualizarEstado(id: number, nuevoEstado: string) {
    const comentario = comentarios[id] || "";

    if (
      (nuevoEstado === "Rechazado por presidente" ||
        nuevoEstado === "Pendiente aclaración") &&
      !comentario
    ) {
      alert("Debe escribir un comentario para rechazar o solicitar aclaración.");
      return;
    }

    const confirmar = confirm(
      `¿Está seguro de cambiar esta solicitud a: ${nuevoEstado}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("solicitudes_pago")
      .update({
        estado: nuevoEstado,
        comentario_presidente: comentario,
        fecha_revision_presidente: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert("Error actualizando solicitud: " + error.message);
      return;
    }

    alert("Solicitud actualizada correctamente.");
    cargarSolicitudes();
  }

  const totalPendiente = solicitudes.reduce(
    (sum, s) => sum + Number(s.total || 0),
    0
  );

  function prioridadColor(prioridad: string) {
    if (prioridad === "Urgente") return "bg-red-100 text-red-700";
    if (prioridad === "Alta") return "bg-orange-100 text-orange-700";
    return "bg-slate-100 text-slate-700";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Aprobación del Presidente</h1>
        <p className="text-slate-500">
          Solicitudes aprobadas por tesorería pendientes de decisión final.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pendientes presidente</p>
          <h2 className="text-2xl font-bold">{solicitudes.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Monto pendiente decisión</p>
          <h2 className="text-2xl font-bold text-blue-700">
            RD$
            {totalPendiente.toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Estado del módulo</p>
          <h2 className="text-2xl font-bold text-green-700">Activo</h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">
          Solicitudes para aprobación final
        </h2>

        {loading ? (
          <p>Cargando solicitudes...</p>
        ) : (
          <div className="space-y-4">
            {solicitudes.map((s) => (
              <div key={s.id} className="border rounded-2xl p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold">
                        Solicitud #{s.id} - {s.concepto}
                      </h3>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${prioridadColor(
                          s.prioridad
                        )}`}
                      >
                        {s.prioridad}
                      </span>
                    </div>

                    <p className="text-sm text-slate-500">
                      {s.condominio} | Fecha: {s.fecha_solicitud}
                    </p>

                    <p className="text-sm text-slate-500">
                      Proveedor:{" "}
                      <strong>{s.catalogo_proveedores?.nombre_proveedor}</strong>
                    </p>

                    <p className="text-sm text-slate-500">
                      Categoría:{" "}
                      <strong>
                        {s.catalogo_categoria_gastos?.nombre_categoria}
                      </strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-slate-500">Total solicitado</p>
                    <p className="text-2xl font-bold text-green-700">
                      RD$
                      {Number(s.total).toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-slate-500">Monto</p>
                    <p className="font-semibold">
                      RD$
                      {Number(s.monto).toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-500">ITBIS</p>
                    <p className="font-semibold">
                      RD$
                      {Number(s.itbis || 0).toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-500">Método pago</p>
                    <p className="font-semibold">{s.metodo_pago || "-"}</p>
                  </div>

                  <div>
                    <p className="text-slate-500">No. Factura</p>
                    <p className="font-semibold">{s.no_factura || "-"}</p>
                  </div>

                  <div>
                    <p className="text-slate-500">NCF</p>
                    <p className="font-semibold">{s.ncf || "-"}</p>
                  </div>

                  <div>
                    <p className="text-slate-500">Cuenta banco</p>
                    <p className="font-semibold">{s.cuenta_banco || "-"}</p>
                  </div>
                </div>

                {s.detalle && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-500">Detalle</p>
                    <p className="text-sm">{s.detalle}</p>
                  </div>
                )}

                {s.comentario_tesorero && (
                  <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-sm font-semibold text-blue-800">
                      Comentario del tesorero:
                    </p>
                    <p className="text-sm text-blue-900">
                      {s.comentario_tesorero}
                    </p>
                  </div>
                )}

                <div className="mt-4">
                  {s.soporte_url ? (
                    <a
                      href={s.soporte_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-900 text-white px-4 py-2 rounded-lg inline-block"
                    >
                      Ver soporte
                    </a>
                  ) : (
                    <span className="text-slate-400">Sin soporte adjunto</span>
                  )}
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold mb-1">
                    Comentario del presidente
                  </label>
                  <textarea
                    value={comentarios[s.id] || ""}
                    onChange={(e) =>
                      setComentarios({
                        ...comentarios,
                        [s.id]: e.target.value,
                      })
                    }
                    className="border rounded-lg px-3 py-2 w-full"
                    rows={2}
                    placeholder="Comentario de aprobación final"
                  />
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={() =>
                      actualizarEstado(s.id, "Aprobado por presidente")
                    }
                    className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800"
                  >
                    Aprobar
                  </button>

                  <button
                    onClick={() =>
                      actualizarEstado(s.id, "Pendiente aclaración")
                    }
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                  >
                    Solicitar aclaración
                  </button>

                  <button
                    onClick={() =>
                      actualizarEstado(s.id, "Rechazado por presidente")
                    }
                    className="bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}

            {solicitudes.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                No hay solicitudes pendientes de aprobación por el presidente.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}