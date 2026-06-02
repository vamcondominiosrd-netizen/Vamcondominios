"use client";

import { useEffect, useState } from "react";
import RoleGuard from "../RoleGuard";
import { supabase } from "@/app/lib/supabaseClient";

type PagoMovil = {
  id: number;
  condominio_id: number;
  condominio: string;
  unidad_id: number;
  no_apartamento: string;
  propietario_id: number;
  nombre_propietario: string;
  cedula: string;
  telefono: string;
  concepto: string;
  monto: number;
  fecha_pago: string;
  metodo_pago: string;
  banco: string;
  referencia: string;
  comprobante_url: string;
  estado: string;
  comentario_admin: string;
  created_at: string;
};

export default function PagosMovilPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [pagos, setPagos] = useState<PagoMovil[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [filtro, setFiltro] = useState("Pendiente de validación");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarPagos(id, filtro);
    }
  }, []);

  async function cargarPagos(id: string, estadoFiltro: string) {
    setLoading(true);
    setMensaje("");

    let query = supabase
      .from("pagos_movil")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false });

    if (estadoFiltro !== "Todos") {
      query = query.eq("estado", estadoFiltro);
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      setMensaje(error.message);
      return;
    }

    setPagos(data || []);
  }

  function cambiarFiltro(valor: string) {
    setFiltro(valor);

    if (condominioId) {
      cargarPagos(condominioId, valor);
    }
  }

  async function validarPago(pago: PagoMovil) {
    const confirmar = confirm(
      `¿Desea validar este pago de RD$ ${Number(pago.monto || 0).toLocaleString(
        "es-DO"
      )}?`
    );

    if (!confirmar) return;

    setLoading(true);
    setMensaje("");

    const { error } = await supabase
      .from("pagos_movil")
      .update({
        estado: "Validado",
        comentario_admin: "Pago validado por administración",
        fecha_validacion: new Date().toISOString(),
      })
      .eq("id", pago.id);

    setLoading(false);

    if (error) {
      setMensaje(error.message);
      return;
    }

    setMensaje("Pago validado correctamente.");
    cargarPagos(condominioId, filtro);
  }

  async function rechazarPago(pago: PagoMovil) {
    const comentario = prompt("Indique el motivo del rechazo:");

    if (comentario === null) return;

    setLoading(true);
    setMensaje("");

    const { error } = await supabase
      .from("pagos_movil")
      .update({
        estado: "Rechazado",
        comentario_admin: comentario || "Pago rechazado por administración",
      })
      .eq("id", pago.id);

    setLoading(false);

    if (error) {
      setMensaje(error.message);
      return;
    }

    setMensaje("Pago rechazado correctamente.");
    cargarPagos(condominioId, filtro);
  }

  function dinero(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  const totalPendiente = pagos
    .filter((p) => p.estado === "Pendiente de validación")
    .reduce((sum, p) => sum + Number(p.monto || 0), 0);

  const totalValidado = pagos
    .filter((p) => p.estado === "Validado")
    .reduce((sum, p) => sum + Number(p.monto || 0), 0);

  return (
    <RoleGuard roles={["Super Admin", "Administrador", "Tesorero"]}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900">
              Pagos Móviles
            </h1>

            <p className="text-slate-500 mt-2">
              Validación de pagos enviados por los propietarios desde la versión
              móvil.
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <label className="text-sm font-semibold block mb-2">
              Filtrar por estado
            </label>

            <select
              value={filtro}
              onChange={(e) => cambiarFiltro(e.target.value)}
              className="border rounded-xl px-4 py-2 bg-white"
            >
              <option>Pendiente de validación</option>
              <option>Validado</option>
              <option>Rechazado</option>
              <option>Todos</option>
            </select>
          </div>
        </div>

        <div className="bg-white border rounded-3xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Condominio activo</p>
          <h2 className="font-bold text-lg">{condominioNombre}</h2>
        </div>

        {mensaje && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-4">
            {mensaje}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded-3xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">Cantidad de pagos</p>
            <h2 className="text-3xl font-black mt-2">{pagos.length}</h2>
          </div>

          <div className="bg-white border rounded-3xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">Monto pendiente</p>
            <h2 className="text-3xl font-black mt-2 text-amber-700">
              RD$ {dinero(totalPendiente)}
            </h2>
          </div>

          <div className="bg-white border rounded-3xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">Monto validado</p>
            <h2 className="text-3xl font-black mt-2 text-green-700">
              RD$ {dinero(totalValidado)}
            </h2>
          </div>
        </div>

        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
          <div className="bg-slate-900 text-white px-6 py-4">
            <h2 className="text-xl font-black">Pagos recibidos desde móvil</h2>
          </div>

          {loading ? (
            <div className="p-8">Cargando pagos...</div>
          ) : pagos.length === 0 ? (
            <div className="p-8 text-slate-500">
              No hay pagos registrados con este filtro.
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-4 text-left">Fecha</th>
                    <th className="p-4 text-left">Apartamento</th>
                    <th className="p-4 text-left">Propietario</th>
                    <th className="p-4 text-left">Concepto</th>
                    <th className="p-4 text-right">Monto</th>
                    <th className="p-4 text-left">Referencia</th>
                    <th className="p-4 text-left">Estado</th>
                    <th className="p-4 text-center">Comprobante</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {pagos.map((pago) => (
                    <tr key={pago.id} className="border-b hover:bg-slate-50">
                      <td className="p-4">
                        {pago.fecha_pago
                          ? new Date(pago.fecha_pago).toLocaleDateString(
                              "es-DO"
                            )
                          : "-"}
                      </td>

                      <td className="p-4 font-bold">{pago.no_apartamento}</td>

                      <td className="p-4">
                        <p className="font-semibold">
                          {pago.nombre_propietario}
                        </p>
                        <p className="text-xs text-slate-500">
                          {pago.telefono || "-"}
                        </p>
                      </td>

                      <td className="p-4">{pago.concepto}</td>

                      <td className="p-4 text-right font-black text-green-700">
                        RD$ {dinero(pago.monto)}
                      </td>

                      <td className="p-4">
                        <p>{pago.referencia || "-"}</p>
                        <p className="text-xs text-slate-500">
                          {pago.banco || ""}
                        </p>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            pago.estado === "Validado"
                              ? "bg-green-100 text-green-700"
                              : pago.estado === "Rechazado"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {pago.estado}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        {pago.comprobante_url ? (
                          <a
                            href={pago.comprobante_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Ver
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className="p-4">
                        {pago.estado === "Pendiente de validación" ? (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => validarPago(pago)}
                              className="bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                            >
                              Validar
                            </button>

                            <button
                              onClick={() => rechazarPago(pago)}
                              className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                            >
                              Rechazar
                            </button>
                          </div>
                        ) : (
                          <p className="text-center text-xs text-slate-400">
                            Sin acciones
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}