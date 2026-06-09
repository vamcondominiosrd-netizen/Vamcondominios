"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import * as XLSX from "xlsx";

type Presupuesto = {
  id: number;
  condominio_id: number;
  anio: number;
  nombre: string;
  cuota_actual: number;
  cantidad_unidades: number;
  porcentaje_reserva: number;
  total_reserva_mensual: number;
  total_mensual_con_reserva: number;
  cuota_sugerida: number;
  estado: string;
  created_at: string;
};

type DetallePresupuesto = {
  id: number;
  presupuesto_id: number;
  condominio_id: number;
  categoria: string;
  concepto: string;
  tipo_gasto: string;
  monto_mensual_estimado: number;
  monto_anual_estimado: number;
  observacion: string | null;
  estado: string;
};

export default function ReportePresupuestoPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [anio, setAnio] = useState(new Date().getFullYear());

  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [presupuestoActivo, setPresupuestoActivo] =
    useState<Presupuesto | null>(null);

  const [detalles, setDetalles] = useState<DetallePresupuesto[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    cargarPresupuestos(id, anio);
  }, []);

  async function cargarPresupuestos(id: string, anioSeleccionado: number) {
    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("presupuesto_condominio")
      .select(
        "id, condominio_id, anio, nombre, cuota_actual, cantidad_unidades, porcentaje_reserva, total_reserva_mensual, total_mensual_con_reserva, cuota_sugerida, estado, created_at"
      )
      .eq("condominio_id", Number(id))
      .eq("anio", anioSeleccionado)
      .order("id", { ascending: false });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando presupuestos: " + error.message);
      return;
    }

    const lista = (data as Presupuesto[]) || [];
    setPresupuestos(lista);

    if (lista.length > 0) {
      setPresupuestoActivo(lista[0]);
      await cargarDetalles(lista[0].id, id);
    } else {
      setPresupuestoActivo(null);
      setDetalles([]);
    }
  }

  async function cargarDetalles(presupuestoId: number, idCondominio?: string) {
    const id = idCondominio || condominioId;

    if (!id) return;

    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("presupuesto_condominio_detalle")
      .select(
        "id, presupuesto_id, condominio_id, categoria, concepto, tipo_gasto, monto_mensual_estimado, monto_anual_estimado, observacion, estado"
      )
      .eq("presupuesto_id", presupuestoId)
      .eq("condominio_id", Number(id))
      .order("categoria", { ascending: true })
      .order("concepto", { ascending: true });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando detalle del presupuesto: " + error.message);
      return;
    }

    setDetalles((data as DetallePresupuesto[]) || []);
  }

  async function cambiarAnio(valor: number) {
    setAnio(valor);

    if (!condominioId) return;

    await cargarPresupuestos(condominioId, valor);
  }

  async function seleccionarPresupuesto(idPresupuesto: string) {
    const seleccionado = presupuestos.find(
      (p) => p.id === Number(idPresupuesto)
    );

    if (!seleccionado) return;

    setPresupuestoActivo(seleccionado);
    await cargarDetalles(seleccionado.id, condominioId);
  }

  const totalMensual = detalles.reduce(
    (sum, d) => sum + Number(d.monto_mensual_estimado || 0),
    0
  );

  const totalAnual = detalles.reduce(
    (sum, d) => sum + Number(d.monto_anual_estimado || 0),
    0
  );

  const porcentajeReserva = Number(presupuestoActivo?.porcentaje_reserva || 0);

  const reservaMensualCalculada = totalMensual * (porcentajeReserva / 100);

  const reservaMensual =
    Number(presupuestoActivo?.total_reserva_mensual || 0) > 0
      ? Number(presupuestoActivo?.total_reserva_mensual || 0)
      : reservaMensualCalculada;

  const totalMensualConReserva =
    Number(presupuestoActivo?.total_mensual_con_reserva || 0) > 0
      ? Number(presupuestoActivo?.total_mensual_con_reserva || 0)
      : totalMensual + reservaMensual;

  const cuotaSugerida =
    Number(presupuestoActivo?.cuota_sugerida || 0) > 0
      ? Number(presupuestoActivo?.cuota_sugerida || 0)
      : Number(presupuestoActivo?.cantidad_unidades || 0) > 0
      ? totalMensualConReserva /
        Number(presupuestoActivo?.cantidad_unidades || 0)
      : 0;

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  function exportarExcel() {
    if (!presupuestoActivo) {
      alert("No hay presupuesto seleccionado.");
      return;
    }

    if (detalles.length === 0) {
      alert("No hay detalle de presupuesto para exportar.");
      return;
    }

    const resumen = [
      {
        Condominio: condominioNombre,
        Año: anio,
        Presupuesto: presupuestoActivo.nombre,
        Estado: presupuestoActivo.estado,
        "Apartamentos activos": presupuestoActivo.cantidad_unidades,
        "Cuota actual": presupuestoActivo.cuota_actual,
        "Porcentaje reserva": porcentajeReserva,
        "Total mensual estimado": totalMensual,
        "Reserva mensual": reservaMensual,
        "Total mensual con reserva": totalMensualConReserva,
        "Cuota sugerida": cuotaSugerida,
        "Total anual estimado": totalAnual,
      },
    ];

    const detalle = detalles.map((d) => ({
      Categoría: d.categoria,
      Concepto: d.concepto,
      Tipo: d.tipo_gasto,
      "Mensual estimado": d.monto_mensual_estimado,
      "Anual estimado": d.monto_anual_estimado,
      Observación: d.observacion || "",
      Estado: d.estado,
    }));

    detalle.push({
      Categoría: "TOTALES",
      Concepto: "",
      Tipo: "",
      "Mensual estimado": totalMensual,
      "Anual estimado": totalAnual,
      Observación: "",
      Estado: "",
    });

    const libro = XLSX.utils.book_new();

    const hojaResumen = XLSX.utils.json_to_sheet(resumen);
    const hojaDetalle = XLSX.utils.json_to_sheet(detalle);

    hojaResumen["!cols"] = [
      { wch: 35 },
      { wch: 10 },
      { wch: 30 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 20 },
      { wch: 24 },
      { wch: 20 },
      { wch: 26 },
      { wch: 20 },
      { wch: 22 },
    ];

    hojaDetalle["!cols"] = [
      { wch: 25 },
      { wch: 40 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 40 },
      { wch: 15 },
    ];

    XLSX.utils.book_append_sheet(libro, hojaResumen, "Resumen");
    XLSX.utils.book_append_sheet(libro, hojaDetalle, "Detalle Presupuesto");

    XLSX.writeFile(
      libro,
      `Reporte_Presupuesto_${condominioNombre || condominioId}_${anio}.xlsx`
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Reporte de Presupuesto
            </h1>

            <p className="text-slate-500 mt-1">
              Detalle del presupuesto proyectado del condominio.
            </p>

            <p className="text-sm text-blue-700 font-bold mt-2">
              Condominio activo: {condominioNombre || "No seleccionado"}
            </p>
          </div>

          <button
            type="button"
            onClick={exportarExcel}
            className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Exportar Excel
          </button>
        </div>
      </div>

      {mensaje && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm">
          {mensaje}
        </div>
      )}

      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Año</label>

            <input
              type="number"
              value={anio}
              onChange={(e) => cambiarAnio(Number(e.target.value))}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Presupuesto
            </label>

            <select
              value={presupuestoActivo?.id || ""}
              onChange={(e) => seleccionarPresupuesto(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            >
              {presupuestos.length === 0 && (
                <option value="">No hay presupuestos para este año</option>
              )}

              {presupuestos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} - {p.anio} - {p.estado}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!presupuestoActivo && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-5">
          No existe presupuesto creado para este condominio y año.
        </div>
      )}

      {presupuestoActivo && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">Presupuesto</p>
              <h2 className="text-xl font-black text-slate-800">
                {presupuestoActivo.nombre}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Estado: {presupuestoActivo.estado}
              </p>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">Total mensual estimado</p>
              <h2 className="text-2xl font-black text-blue-700">
                RD$ {dinero(totalMensual)}
              </h2>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">
                Reserva mensual ({porcentajeReserva}%)
              </p>
              <h2 className="text-2xl font-black text-purple-700">
                RD$ {dinero(reservaMensual)}
              </h2>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">
                Total mensual con reserva
              </p>
              <h2 className="text-2xl font-black text-emerald-700">
                RD$ {dinero(totalMensualConReserva)}
              </h2>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">Cuota sugerida</p>
              <h2 className="text-2xl font-black text-green-700">
                RD$ {dinero(cuotaSugerida)}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">Cuota actual</p>
              <h2 className="text-2xl font-black text-slate-800">
                RD$ {dinero(presupuestoActivo.cuota_actual)}
              </h2>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">Apartamentos activos</p>
              <h2 className="text-2xl font-black text-indigo-700">
                {presupuestoActivo.cantidad_unidades}
              </h2>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <p className="text-sm text-slate-500">Total anual estimado</p>
              <h2 className="text-2xl font-black text-emerald-700">
                RD$ {dinero(totalAnual)}
              </h2>
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-bold">
                Detalle del presupuesto proyectado
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Partidas registradas para el presupuesto seleccionado.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Categoría</th>
                    <th className="px-4 py-3 text-left">Concepto</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-right">
                      Mensual estimado
                    </th>
                    <th className="px-4 py-3 text-right">Anual estimado</th>
                    <th className="px-4 py-3 text-left">Observación</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {detalles.map((d) => (
                    <tr key={d.id} className="border-t hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold">
                        {d.categoria}
                      </td>

                      <td className="px-4 py-3">{d.concepto}</td>

                      <td className="px-4 py-3">{d.tipo_gasto}</td>

                      <td className="px-4 py-3 text-right font-semibold">
                        RD$ {dinero(d.monto_mensual_estimado)}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold">
                        RD$ {dinero(d.monto_anual_estimado)}
                      </td>

                      <td className="px-4 py-3">{d.observacion || "-"}</td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            d.estado === "ACTIVO"
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {d.estado}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {detalles.length > 0 && (
                    <tr className="border-t bg-slate-100 font-black">
                      <td className="px-4 py-3" colSpan={3}>
                        TOTALES
                      </td>

                      <td className="px-4 py-3 text-right">
                        RD$ {dinero(totalMensual)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        RD$ {dinero(totalAnual)}
                      </td>

                      <td className="px-4 py-3" colSpan={2}></td>
                    </tr>
                  )}

                  {detalles.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        No hay partidas registradas en este presupuesto.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {loading && (
        <div className="text-sm text-slate-500">Cargando reporte...</div>
      )}
    </div>
  );
}