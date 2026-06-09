"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type PagoPropietario = {
  id: number;
  propietario_id: number;
  condominio: string;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string;
  fecha_pago: string;
  mes_pagado: string;
  monto_pagado: number;
  banco_origen: string;
  no_referencia: string;
  comentario: string;
  comprobante_url: string;
  estado: string;
  comentario_admin: string;
  created_at: string;
};

export default function PagosPropietariosPage() {
  const [pagos, setPagos] = useState<PagoPropietario[]>([]);
  const [loading, setLoading] = useState(false);

  const [comentarios, setComentarios] = useState<Record<number, string>>({});

  useEffect(() => {
    cargarPagos();
  }, []);

  async function cargarPagos() {
    setLoading(true);

    const { data, error } = await supabase
      .from("pagos_propietarios")
      .select("*")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando pagos: " + error.message);
      return;
    }

    setPagos(data || []);
  }

  async function aprobarPago(p: PagoPropietario) {
    const confirmar = confirm(
      "¿Desea aprobar este pago y registrarlo en pagos de mantenimiento?"
    );

    if (!confirmar) return;

    const { data: pagoMantenimiento, error: errorPago } = await supabase
      .from("pagos_mantenimiento")
      .insert([
        {
          condominio: p.condominio,
          no_apartamento: p.no_apartamento,
          fecha_pago: p.fecha_pago,
          mes_pagado: p.mes_pagado,
          monto_pagado: Number(p.monto_pagado || 0),
          metodo_pago: "Transferencia",
          no_referencia: p.no_referencia,
          descripcion: `Pago reportado por propietario - ${p.nombre_propietario}`,
          comprobante_url: p.comprobante_url,
          estado: "pagado",
        },
      ])
      .select()
      .single();

    if (errorPago) {
      alert("Error registrando pago mantenimiento: " + errorPago.message);
      return;
    }

    const { error: errorUpdate } = await supabase
      .from("pagos_propietarios")
      .update({
        estado: "Aprobado",
        comentario_admin: comentarios[p.id] || "",
        fecha_revision: new Date().toISOString(),
      })
      .eq("id", p.id);

    if (errorUpdate) {
      alert("Pago registrado, pero ocurrió error actualizando estado.");
      return;
    }

    alert("Pago aprobado correctamente.");
    cargarPagos();
  }

  async function rechazarPago(id: number) {
    const comentario = comentarios[id] || "";

    if (!comentario) {
      alert("Debe escribir un comentario para rechazar.");
      return;
    }

    const confirmar = confirm(
      "¿Está seguro de rechazar este pago?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("pagos_propietarios")
      .update({
        estado: "Rechazado",
        comentario_admin: comentario,
        fecha_revision: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert("Error rechazando pago: " + error.message);
      return;
    }

    alert("Pago rechazado correctamente.");
    cargarPagos();
  }

  async function devolverPago(id: number) {
    const comentario = comentarios[id] || "";

    if (!comentario) {
      alert("Debe escribir un comentario para devolver.");
      return;
    }

    const confirmar = confirm(
      "¿Desea devolver este pago para corrección?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("pagos_propietarios")
      .update({
        estado: "Devuelto para corrección",
        comentario_admin: comentario,
        fecha_revision: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert("Error devolviendo pago: " + error.message);
      return;
    }

    alert("Pago devuelto correctamente.");
    cargarPagos();
  }

  const totalPendiente = pagos
    .filter((p) => p.estado === "Pendiente validación")
    .reduce((sum, p) => sum + Number(p.monto_pagado || 0), 0);

  function estadoColor(estado: string) {
    if (estado === "Pendiente validación") {
      return "bg-yellow-100 text-yellow-800";
    }

    if (estado === "Aprobado") {
      return "bg-green-100 text-green-800";
    }

    if (estado === "Rechazado") {
      return "bg-red-100 text-red-800";
    }

    if (estado === "Devuelto para corrección") {
      return "bg-orange-100 text-orange-800";
    }

    return "bg-slate-100 text-slate-700";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Validación de Pagos de Propietarios
        </h1>

        <p className="text-slate-500">
          Revisión y validación de pagos enviados desde el portal propietario.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Pagos pendientes
          </p>

          <h2 className="text-2xl font-bold">
            {
              pagos.filter(
                (p) => p.estado === "Pendiente validación"
              ).length
            }
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total pendiente validar
          </p>

          <h2 className="text-2xl font-bold text-yellow-700">
            RD$
            {totalPendiente.toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Estado módulo
          </p>

          <h2 className="text-2xl font-bold text-green-700">
            Activo
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">
          Pagos reportados
        </h2>

        {loading ? (
          <p>Cargando pagos...</p>
        ) : (
          <div className="space-y-4">
            {pagos.map((p) => (
              <div
                key={p.id}
                className="border rounded-2xl p-5"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold">
                      {p.nombre_propietario}
                    </h3>

                    <p className="text-sm text-slate-500">
                      {p.condominio} | Apto:{" "}
                      {p.no_apartamento}
                    </p>

                    <p className="text-sm text-slate-500">
                      Mes pagado:{" "}
                      <strong>{p.mes_pagado}</strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-slate-500">
                      Monto pagado
                    </p>

                    <p className="text-2xl font-bold text-green-700">
                      RD$
                      {Number(
                        p.monto_pagado
                      ).toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                      })}
                    </p>

                    <span
                      className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${estadoColor(
                        p.estado
                      )}`}
                    >
                      {p.estado}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-slate-500">
                      Fecha pago
                    </p>

                    <p className="font-semibold">
                      {p.fecha_pago}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-500">
                      Banco origen
                    </p>

                    <p className="font-semibold">
                      {p.banco_origen}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-500">
                      Referencia
                    </p>

                    <p className="font-semibold">
                      {p.no_referencia}
                    </p>
                  </div>
                </div>

                {p.comentario && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-500">
                      Comentario propietario
                    </p>

                    <p className="text-sm">
                      {p.comentario}
                    </p>
                  </div>
                )}

                <div className="mt-4">
                  {p.comprobante_url ? (
                    <a
                      href={p.comprobante_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-900 text-white px-4 py-2 rounded-lg inline-block"
                    >
                      Ver comprobante
                    </a>
                  ) : (
                    <span className="text-slate-400">
                      Sin comprobante
                    </span>
                  )}
                </div>

                {p.estado === "Pendiente validación" && (
                  <>
                    <div className="mt-4">
                      <label className="block text-sm font-semibold mb-1">
                        Comentario administración
                      </label>

                      <textarea
                        value={comentarios[p.id] || ""}
                        onChange={(e) =>
                          setComentarios({
                            ...comentarios,
                            [p.id]: e.target.value,
                          })
                        }
                        className="border rounded-lg px-3 py-2 w-full"
                        rows={2}
                        placeholder="Comentario administrativo"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        onClick={() => aprobarPago(p)}
                        className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800"
                      >
                        Aprobar
                      </button>

                      <button
                        onClick={() =>
                          devolverPago(p.id)
                        }
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                      >
                        Devolver
                      </button>

                      <button
                        onClick={() =>
                          rechazarPago(p.id)
                        }
                        className="bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800"
                      >
                        Rechazar
                      </button>
                    </div>
                  </>
                )}

                {p.estado !== "Pendiente validación" &&
                  p.comentario_admin && (
                    <div className="mt-4 bg-slate-50 rounded-xl p-3">
                      <p className="text-sm font-semibold">
                        Comentario administración
                      </p>

                      <p className="text-sm">
                        {p.comentario_admin}
                      </p>
                    </div>
                  )}
              </div>
            ))}

            {pagos.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                No hay pagos reportados.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}