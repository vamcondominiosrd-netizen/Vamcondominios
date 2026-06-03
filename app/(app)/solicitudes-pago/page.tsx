"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";
import * as XLSX from "xlsx";

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
  created_by: string;
  created_at: string;
  proveedor_id: number;
  categoria_id: number;
  gasto_generado_id: number | null;

  catalogo_proveedores?: {
    nombre_proveedor: string;
  };

  catalogo_categoria_gastos?: {
    nombre_categoria: string;
  };
};

export default function SolicitudesPagoPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

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
        created_by,
        created_at,
        proveedor_id,
        categoria_id,
        gasto_generado_id,
        catalogo_proveedores(nombre_proveedor),
        catalogo_categoria_gastos(nombre_categoria)
      `)
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando solicitudes: " + error.message);
      return;
    }

    setSolicitudes((data as SolicitudPago[]) || []);
  }

  async function generarGasto(s: SolicitudPago) {
    if (!condominioId) {
      alert("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    if (s.gasto_generado_id) {
      alert("Esta solicitud ya fue convertida en gasto.");
      return;
    }

    const confirmar = confirm(
      "¿Desea generar automáticamente este gasto?"
    );

    if (!confirmar) return;

    const { data: gastoData, error: gastoError } = await supabase
      .from("gastos")
      .insert([
        {
          condominio_id: Number(condominioId),
          condominio: condominioNombre || s.condominio,
          fecha: s.fecha_solicitud,
          categoria_id: s.categoria_id,
          proveedor_id: s.proveedor_id,
          concepto: s.concepto,
          detalle_gasto: s.detalle,
          monto: Number(s.monto || 0),
          itbis: Number(s.itbis || 0),
          total: Number(s.total || 0),
          no_factura: s.no_factura,
          ncf: s.ncf,
          metodo_pago: s.metodo_pago,
          cuenta_banco: s.cuenta_banco,
          factura_url: s.soporte_url,
          estado: "registrado",
          aprobado_tesorero: false,
          aprobado_presidente: false,
          pagado: false,
        },
      ])
      .select()
      .single();

    if (gastoError) {
      alert("Error generando gasto: " + gastoError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("solicitudes_pago")
      .update({
        gasto_generado_id: gastoData.id,
        gasto_generado_at: new Date().toISOString(),
      })
      .eq("id", s.id)
      .eq("condominio_id", Number(condominioId));

    if (updateError) {
      alert(
        "El gasto fue generado, pero ocurrió un error actualizando la solicitud."
      );
      return;
    }

    alert("Gasto generado correctamente.");
    cargarSolicitudes(condominioId);
  }

  const solicitudesFiltradas = solicitudes.filter((s) => {
    const cumpleEstado = filtroEstado === "" || s.estado === filtroEstado;

    const texto = `${s.concepto} ${s.detalle} ${
      s.catalogo_proveedores?.nombre_proveedor || ""
    } ${
      s.catalogo_categoria_gastos?.nombre_categoria || ""
    }`.toLowerCase();

    const cumpleBusqueda = texto.includes(buscar.toLowerCase());

    return cumpleEstado && cumpleBusqueda;
  });

  const totalSolicitado = solicitudesFiltradas.reduce(
    (sum, s) => sum + Number(s.total || 0),
    0
  );

  function exportarExcel() {
    if (solicitudesFiltradas.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const dataExcel = solicitudesFiltradas.map((s) => ({
      ID: s.id,
      Condominio: s.condominio,
      Fecha: s.fecha_solicitud,
      Proveedor: s.catalogo_proveedores?.nombre_proveedor || "",
      Categoría: s.catalogo_categoria_gastos?.nombre_categoria || "",
      Concepto: s.concepto,
      Total: Number(s.total || 0),
      Estado: s.estado,
      "Gasto generado": s.gasto_generado_id ? "Sí" : "No",
    }));

    const hoja = XLSX.utils.json_to_sheet(dataExcel);
    const libro = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(libro, hoja, "Solicitudes");

    XLSX.writeFile(
      libro,
      `Solicitudes_${condominioNombre || "Condominio"}.xlsx`
    );
  }

  function estadoColor(estado: string) {
    if (estado === "Pendiente aprobación tesorero") {
      return "bg-yellow-100 text-yellow-800";
    }

    if (estado === "Aprobado por tesorero") {
      return "bg-blue-100 text-blue-800";
    }

    if (estado === "Aprobado por presidente") {
      return "bg-green-100 text-green-800";
    }

    if (estado?.includes("Rechazado")) {
      return "bg-red-100 text-red-800";
    }

    return "bg-slate-100 text-slate-700";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Solicitudes de Pago</h1>

          <p className="text-slate-500">
            Condominio activo:{" "}
            <span className="font-semibold">
              {condominioNombre || "No seleccionado"}
            </span>
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/solicitudes-pago/nueva"
            className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800"
          >
            Nueva solicitud
          </Link>

          <button
            onClick={exportarExcel}
            className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800"
          >
            Exportar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Estado
            </label>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">Todos</option>
              <option value="Pendiente aprobación tesorero">
                Pendiente tesorero
              </option>
              <option value="Aprobado por tesorero">
                Aprobado tesorero
              </option>
              <option value="Aprobado por presidente">
                Aprobado presidente
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Buscar
            </label>

            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Buscar solicitud..."
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Listado de solicitudes</h2>

          <div className="text-lg font-bold text-green-700">
            RD$
            {totalSolicitado.toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}
          </div>
        </div>

        {loading ? (
          <p>Cargando solicitudes...</p>
        ) : (
          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">ID</th>
                  <th className="p-2 border">Proveedor</th>
                  <th className="p-2 border">Concepto</th>
                  <th className="p-2 border">Total</th>
                  <th className="p-2 border">Estado</th>
                  <th className="p-2 border">Soporte</th>
                  <th className="p-2 border">Acción</th>
                </tr>
              </thead>

              <tbody>
                {solicitudesFiltradas.map((s) => (
                  <tr key={s.id}>
                    <td className="p-2 border">{s.id}</td>

                    <td className="p-2 border">
                      {s.catalogo_proveedores?.nombre_proveedor || "-"}
                    </td>

                    <td className="p-2 border">{s.concepto}</td>

                    <td className="p-2 border text-right font-bold">
                      RD$
                      {Number(s.total).toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                      })}
                    </td>

                    <td className="p-2 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoColor(
                          s.estado
                        )}`}
                      >
                        {s.estado}
                      </span>
                    </td>

                    <td className="p-2 border text-center">
                      {s.soporte_url ? (
                        <a
                          href={s.soporte_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-slate-900 text-white px-3 py-1 rounded-lg inline-block"
                        >
                          Ver
                        </a>
                      ) : (
                        <span className="text-slate-400">Sin soporte</span>
                      )}
                    </td>

                    <td className="p-2 border text-center">
                      {s.estado === "Aprobado por presidente" ? (
                        s.gasto_generado_id ? (
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                            Gasto generado
                          </span>
                        ) : (
                          <button
                            onClick={() => generarGasto(s)}
                            className="bg-blue-700 text-white px-3 py-1 rounded-lg hover:bg-blue-800"
                          >
                            Generar gasto
                          </button>
                        )
                      ) : (
                        <span className="text-slate-400">
                          Pendiente aprobación
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {solicitudesFiltradas.length === 0 && (
                  <tr>
                    <td className="p-4 border text-center" colSpan={7}>
                      No hay solicitudes registradas para este condominio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}