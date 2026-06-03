"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type SolicitudPago = {
  id: number;
  condominio_id: number | null;
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
  catalogo_proveedores?: {
    nombre_proveedor: string;
  };
  catalogo_categoria_gastos?: {
    nombre_categoria: string;
  };
};

export default function AprobacionTesoreroPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [loading, setLoading] = useState(false);
  const [comentarios, setComentarios] = useState<Record<number, string>>({});

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      alert("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    const nombreFinal = nombre || `Condominio ID ${id}`;

    setCondominioId(id);
    setCondominioNombre(nombreFinal);

    cargarSolicitudes(id);
  }, []);

  async function cargarSolicitudes(id: string) {
    if (!id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("solicitudes_pago")
      .select(`
        id,
        condominio_id,
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
        catalogo_proveedores(nombre_proveedor),
        catalogo_categoria_gastos(nombre_categoria)
      `)
      .eq("condominio_id", Number(id))
      .eq("estado", "Pendiente aprobación tesorero")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando solicitudes: " + error.message);
      return;
    }

    setSolicitudes((data as SolicitudPago[]) || []);
  }

  async function actualizarEstado(id: number, nuevoEstado: string) {
    if (!condominioId) {
      alert("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    const comentario = comentarios[id] || "";

    if (
      (nuevoEstado === "Rechazado por tesorero" ||
        nuevoEstado === "Devuelto para corrección") &&
      !comentario
    ) {
      alert("Debe escribir un comentario para rechazar o devolver.");
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
        comentario_tesorero: comentario,
        fecha_revision_tesorero: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error actualizando solicitud: " + error.message);
      return;
    }

    alert("Solicitud actualizada correctamente.");
    cargarSolicitudes(condominioId);
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
        <h1 className="text-3xl font-bold">Aprobación del Tesorero</h1>
        <p className="text-slate-500">
          Solicitudes pendientes de revisión y aprobación por tesorería.
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Condominio activo:{" "}
          <span className="font-semibold text-slate-700">
            {condominioNombre || "No seleccionado"}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Solicitudes pendientes</p>
          <h2 className="text-2xl font-bold">{solicitudes.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Monto pendiente revisión</p>
          <h2 className="text-2xl font-bold text-yellow-700">
            RD$
            {totalPendiente.toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Estado del módulo</p>
          <h2 className="text-2xl font-bold text-blue-700">Activo</h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">
          Solicitudes pendientes del tesorero
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
                      <strong>
                        {s.catalogo_proveedores?.nombre_proveedor || "-"}
                      </strong>
                    </p>

                    <p className="text-sm text-slate-500">
                      Categoría:{" "}
                      <strong>
                        {s.catalogo_categoria_gastos?.nombre_categoria || "-"}
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
                    Comentario del tesorero
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
                    placeholder="Comentario de revisión"
                  />
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={() =>
                      actualizarEstado(s.id, "Aprobado por tesorero")
                    }
                    className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800"
                  >
                    Aprobar
                  </button>

                  <button
                    onClick={() =>
                      actualizarEstado(s.id, "Devuelto para corrección")
                    }
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                  >
                    Devolver
                  </button>

                  <button
                    onClick={() =>
                      actualizarEstado(s.id, "Rechazado por tesorero")
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
                No hay solicitudes pendientes de aprobación por tesorería para
                este condominio.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}