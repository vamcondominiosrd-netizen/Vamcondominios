"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type PagoIdentificadoRow = {
  id: number;
  archivo_banco_id: number;
  condominio_id: number;
  unidad_id: number | null;
  apartamento: string | null;
  no_apartamento: string | null;
  propietario: string | null;
  fecha_posteo: string | null;
  monto: number | null;
  monto_transaccion: number | null;
  no_serial: string | null;
  descripcion_banco: string | null;
  tipo_pago: string | null;
  periodo: string | null;
  estado: string | null;
  observacion: string | null;
};

function formatearMoneda(valor: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(valor || 0));
}

function obtenerMesActual() {
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

export default function MobilePagosIdentificadosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [pagos, setPagos] = useState<PagoIdentificadoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [mesFiltro, setMesFiltro] = useState(obtenerMesActual());
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarPagos(id, obtenerMesActual());
    } else {
      setLoading(false);
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
    }
  }, []);

  useEffect(() => {
    if (condominioId) {
      cargarPagos(condominioId, mesFiltro);
    }
  }, [mesFiltro]);

  async function cargarPagos(id: string, mes: string) {
    setLoading(true);

    let query = supabase
      .from("pagos_identificados")
      .select(
        "id, archivo_banco_id, condominio_id, unidad_id, apartamento, no_apartamento, propietario, fecha_posteo, monto, monto_transaccion, no_serial, descripcion_banco, tipo_pago, periodo, estado, observacion"
      )
      .eq("condominio_id", Number(id))
      .order("fecha_posteo", { ascending: false })
      .order("id", { ascending: false });

    if (mes) {
      query = query.eq("periodo", mes);
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      alert("Error cargando pagos identificados: " + error.message);
      return;
    }

    setPagos((data as PagoIdentificadoRow[]) || []);
  }

  const pagosFiltrados = pagos.filter((item) => {
    const texto = `${item.fecha_posteo || ""} ${item.monto || ""} ${
      item.monto_transaccion || ""
    } ${item.no_serial || ""} ${item.descripcion_banco || ""} ${
      item.apartamento || ""
    } ${item.no_apartamento || ""} ${item.propietario || ""} ${
      item.periodo || ""
    } ${item.estado || ""}`
      .toLowerCase()
      .trim();

    return texto.includes(busqueda.toLowerCase().trim());
  });

  const totalPagos = pagosFiltrados.length;

  const montoTotal = pagosFiltrados.reduce(
    (total, item) => total + Number(item.monto_transaccion || item.monto || 0),
    0
  );

  const totalIdentificados = pagosFiltrados.filter(
    (item) => (item.estado || "Identificado") === "Identificado"
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-purple-700 text-white rounded-b-3xl p-5 shadow-md">
        <Link href="/mobile/admin/banco" className="text-sm opacity-90">
          ← Volver a Banco
        </Link>

        <h1 className="text-2xl font-black mt-3">Pagos Identificados</h1>

        <p className="text-sm opacity-90 mt-1">
          {condominioNombre || "Condominio no identificado"}
        </p>

        <p className="text-sm opacity-90 mt-2">
          Consulta móvil de los pagos ya identificados desde el archivo del banco.
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-slate-500">Pagos</p>
            <h2 className="text-2xl font-black">{totalPagos}</h2>
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-slate-500">Identificados</p>
            <h2 className="text-2xl font-black text-green-700">
              {totalIdentificados}
            </h2>
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-slate-500">Monto</p>
            <h2 className="text-sm font-black text-purple-700">
              {formatearMoneda(montoTotal)}
            </h2>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Mes</label>

            <input
              type="month"
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="w-full border rounded-xl px-3 py-3 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Buscar</label>

            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full border rounded-xl px-3 py-3"
              placeholder="Apartamento, propietario, descripción..."
            />
          </div>

          <button
            onClick={() => cargarPagos(condominioId, mesFiltro)}
            className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold"
          >
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            Cargando pagos identificados...
          </div>
        ) : (
          <div className="space-y-3">
            {pagosFiltrados.map((item) => {
              const apartamento = item.no_apartamento || item.apartamento || "-";
              const monto = Number(item.monto_transaccion || item.monto || 0);

              return (
                <div
                  key={item.id}
                  className="bg-white border rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Apartamento</p>
                      <h2 className="text-xl font-black text-slate-900">
                        {apartamento}
                      </h2>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-500">Monto</p>
                      <p className="font-black text-purple-700">
                        {formatearMoneda(monto)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-xs text-slate-500">Propietario</p>
                    <p className="font-semibold">{item.propietario || "-"}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Fecha</p>
                      <p className="font-bold">{item.fecha_posteo || "-"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Periodo</p>
                      <p className="font-bold">{item.periodo || "-"}</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-xs text-slate-500">Descripción banco</p>
                    <p className="text-sm line-clamp-3">
                      {item.descripcion_banco || "-"}
                    </p>
                  </div>

                  {item.observacion && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-500">Observación</p>
                      <p className="text-sm line-clamp-3">
                        {item.observacion}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                      {item.estado || "Identificado"}
                    </span>

                    <span className="text-xs text-slate-500">
                      Serial: {item.no_serial || "-"}
                    </span>
                  </div>
                </div>
              );
            })}

            {pagosFiltrados.length === 0 && (
              <div className="bg-white border rounded-2xl p-6 text-center text-slate-500 shadow-sm">
                No hay pagos identificados para esta consulta.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}