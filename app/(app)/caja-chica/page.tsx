"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type CajaChica = {
  id: number;
  condominio: string;
  fecha: string;
  concepto: string;
  detalle_gasto: string;
  monto: number;
  responsable: string;
  comprobante: string;
  factura_url: string;
  estado: string;
  created_at: string;
};

export default function CajaChicaPage() {
  const [gastos, setGastos] = useState<CajaChica[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [condominio, setCondominio] = useState("");
  const [fecha, setFecha] = useState("");
  const [concepto, setConcepto] = useState("");
  const [detalleGasto, setDetalleGasto] = useState("");
  const [monto, setMonto] = useState("");
  const [responsable, setResponsable] = useState("");
  const [comprobante, setComprobante] = useState("");
  const [facturaArchivo, setFacturaArchivo] = useState<File | null>(null);
  const [filtroCondominio, setFiltroCondominio] = useState("");

  useEffect(() => {
    cargarGastos();
  }, []);

  async function cargarGastos() {
    setLoading(true);

    const { data, error } = await supabase
      .from("caja_chica")
      .select(
        "id, condominio, fecha, concepto, detalle_gasto, monto, responsable, comprobante, factura_url, estado, created_at"
      )
      .order("fecha", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando caja chica: " + error.message);
      return;
    }

    setGastos(data || []);
  }

  async function subirFactura() {
    if (!facturaArchivo) return "";

    const extension = facturaArchivo.name.split(".").pop();
    const nombreArchivo = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

    const rutaArchivo = `${condominio || "general"}/${nombreArchivo}`;

    const { error: uploadError } = await supabase.storage
      .from("facturas-caja-chica")
      .upload(rutaArchivo, facturaArchivo);

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from("facturas-caja-chica")
      .getPublicUrl(rutaArchivo);

    return data.publicUrl;
  }

  async function guardarGasto(e: React.FormEvent) {
    e.preventDefault();

    if (!condominio || !fecha || !concepto || !monto) {
      alert("Debe completar condominio, fecha, concepto y monto.");
      return;
    }

    try {
      setGuardando(true);

      let facturaUrl = "";

      if (facturaArchivo) {
        facturaUrl = await subirFactura();
      }

      const { error } = await supabase.from("caja_chica").insert([
        {
          condominio,
          fecha,
          concepto,
          detalle_gasto: detalleGasto,
          monto: Number(monto),
          responsable,
          comprobante,
          factura_url: facturaUrl,
          estado: "registrado",
        },
      ]);

      setGuardando(false);

      if (error) {
        alert("Error guardando gasto: " + error.message);
        return;
      }

      alert("Gasto de caja chica registrado correctamente.");

      setCondominio("");
      setFecha("");
      setConcepto("");
      setDetalleGasto("");
      setMonto("");
      setResponsable("");
      setComprobante("");
      setFacturaArchivo(null);

      const inputFile = document.getElementById(
        "facturaArchivo"
      ) as HTMLInputElement | null;

      if (inputFile) inputFile.value = "";

      cargarGastos();
    } catch (err: any) {
      setGuardando(false);
      alert("Error subiendo factura: " + err.message);
    }
  }

  const gastosFiltrados = gastos.filter((g) =>
    (g.condominio || "").toLowerCase().includes(filtroCondominio.toLowerCase())
  );

  const totalGastos = gastosFiltrados.reduce(
    (sum, g) => sum + Number(g.monto || 0),
    0
  );

  const condominiosUnicos = new Set(
    gastos.map((g) => g.condominio).filter(Boolean)
  ).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Caja Chica</h1>
        <p className="text-slate-500">
          Registro y control de gastos menores por condominio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total gastos registrados</p>
          <h2 className="text-2xl font-bold">{gastosFiltrados.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Monto total gastado</p>
          <h2 className="text-2xl font-bold text-red-700">
            RD$
            {totalGastos.toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Condominios con gastos</p>
          <h2 className="text-2xl font-bold text-blue-700">
            {condominiosUnicos}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Registrar gasto de caja chica</h2>

        <form
          onSubmit={guardarGasto}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">
              Condominio *
            </label>
            <select
              value={condominio}
              onChange={(e) => setCondominio(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">Seleccione condominio</option>
              <option value="Lote 9">Lote 9</option>
              <option value="Lote 11">Lote 11</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Fecha *</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Monto RD$ *
            </label>
            <input
              type="number"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Concepto *
            </label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Ej. Compra de bombillos"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Responsable
            </label>
            <input
              type="text"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Persona que realizó el gasto"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Comprobante / Factura
            </label>
            <input
              type="text"
              value={comprobante}
              onChange={(e) => setComprobante(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="No. factura o comprobante"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Subir factura del gasto
            </label>
            <input
              id="facturaArchivo"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setFacturaArchivo(e.target.files?.[0] || null)}
              className="border rounded-lg px-3 py-2 w-full bg-white"
            />
            <p className="text-xs text-slate-500 mt-1">
              Puede subir PDF o imagen de la factura.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Detalle del gasto
            </label>
            <textarea
              value={detalleGasto}
              onChange={(e) => setDetalleGasto(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              rows={3}
              placeholder="Describa el detalle del gasto realizado"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={guardando}
              className="bg-blue-700 text-white px-5 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar gasto"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">Detalle de gastos registrados</h2>
            <p className="text-sm text-slate-500">
              Puede filtrar los gastos por condominio.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Filtrar por condominio
            </label>
            <select
              value={filtroCondominio}
              onChange={(e) => setFiltroCondominio(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full md:w-56"
            >
              <option value="">Todos</option>
              <option value="Lote 9">Lote 9</option>
              <option value="Lote 11">Lote 11</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p>Cargando registros...</p>
        ) : (
          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Condominio</th>
                  <th className="p-2 border">Fecha</th>
                  <th className="p-2 border">Concepto</th>
                  <th className="p-2 border">Detalle</th>
                  <th className="p-2 border">Monto</th>
                  <th className="p-2 border">Responsable</th>
                  <th className="p-2 border">Comprobante</th>
                  <th className="p-2 border">Factura</th>
                  <th className="p-2 border">Estado</th>
                </tr>
              </thead>

              <tbody>
                {gastosFiltrados.map((g) => (
                  <tr key={g.id}>
                    <td className="p-2 border font-semibold">
                      {g.condominio}
                    </td>
                    <td className="p-2 border">{g.fecha}</td>
                    <td className="p-2 border">{g.concepto}</td>
                    <td className="p-2 border">{g.detalle_gasto}</td>
                    <td className="p-2 border text-right">
                      RD$
                      {Number(g.monto).toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-2 border">{g.responsable}</td>
                    <td className="p-2 border">{g.comprobante}</td>
                    <td className="p-2 border text-center">
                      {g.factura_url ? (
                        <a
                          href={g.factura_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-slate-900 text-white px-3 py-1 rounded-lg hover:bg-slate-800 inline-block"
                        >
                          Ver factura
                        </a>
                      ) : (
                        <span className="text-slate-400">Sin factura</span>
                      )}
                    </td>
                    <td className="p-2 border text-green-700 font-semibold">
                      {g.estado}
                    </td>
                  </tr>
                ))}

                {gastosFiltrados.length === 0 && (
                  <tr>
                    <td className="p-4 border text-center" colSpan={9}>
                      No hay gastos registrados.
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