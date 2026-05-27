"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type FondoCaja = {
  id: number;
  condominio: string;
  fecha: string;
  tipo: string;
  monto: number;
  descripcion: string;
  responsable: string;
  created_at: string;
};

export default function FondosCajaChicaPage() {
  const [fondos, setFondos] = useState<FondoCaja[]>([]);
  const [loading, setLoading] = useState(false);

  const [condominio, setCondominio] = useState("");
  const [fecha, setFecha] = useState("");
  const [tipo, setTipo] = useState("fondo_inicial");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [responsable, setResponsable] = useState("");
  const [filtroCondominio, setFiltroCondominio] = useState("");

  useEffect(() => {
    cargarFondos();
  }, []);

  async function cargarFondos() {
    setLoading(true);

    const { data, error } = await supabase
      .from("caja_chica_fondos")
      .select("id, condominio, fecha, tipo, monto, descripcion, responsable, created_at")
      .order("fecha", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando fondos: " + error.message);
      return;
    }

    setFondos(data || []);
  }

  async function guardarFondo(e: React.FormEvent) {
    e.preventDefault();

    if (!condominio || !fecha || !tipo || !monto) {
      alert("Debe completar condominio, fecha, tipo y monto.");
      return;
    }

    const { error } = await supabase.from("caja_chica_fondos").insert([
      {
        condominio,
        fecha,
        tipo,
        monto: Number(monto),
        descripcion,
        responsable,
      },
    ]);

    if (error) {
      alert("Error guardando fondo: " + error.message);
      return;
    }

    alert("Movimiento de caja chica registrado correctamente.");

    setCondominio("");
    setFecha("");
    setTipo("fondo_inicial");
    setMonto("");
    setDescripcion("");
    setResponsable("");

    cargarFondos();
  }

  const fondosFiltrados = fondos.filter((f) =>
    (f.condominio || "").toLowerCase().includes(filtroCondominio.toLowerCase())
  );

  const totalFondos = fondosFiltrados.reduce(
    (sum, f) => sum + Number(f.monto || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fondos de Caja Chica</h1>
        <p className="text-slate-500">
          Registro de fondo inicial y reposiciones de caja chica por condominio.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-sm text-slate-500">Total fondos / reposiciones</p>
        <h2 className="text-2xl font-bold text-green-700">
          RD$
          {totalFondos.toLocaleString("es-DO", {
            minimumFractionDigits: 2,
          })}
        </h2>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Registrar fondo o reposición</h2>

        <form
          onSubmit={guardarFondo}
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
            <label className="block text-sm font-semibold mb-1">Tipo *</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="fondo_inicial">Fondo inicial</option>
              <option value="reposicion">Reposición</option>
              <option value="ajuste">Ajuste</option>
            </select>
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
              Responsable
            </label>
            <input
              type="text"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Persona que entrega o registra el fondo"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Descripción
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Detalle del fondo o reposición"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="bg-blue-700 text-white px-5 py-2 rounded-lg hover:bg-blue-800"
            >
              Guardar movimiento
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">Detalle de fondos registrados</h2>
            <p className="text-sm text-slate-500">
              Puede filtrar los movimientos por condominio.
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
          <p>Cargando fondos...</p>
        ) : (
          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Condominio</th>
                  <th className="p-2 border">Fecha</th>
                  <th className="p-2 border">Tipo</th>
                  <th className="p-2 border">Monto</th>
                  <th className="p-2 border">Responsable</th>
                  <th className="p-2 border">Descripción</th>
                </tr>
              </thead>

              <tbody>
                {fondosFiltrados.map((f) => (
                  <tr key={f.id}>
                    <td className="p-2 border font-semibold">{f.condominio}</td>
                    <td className="p-2 border">{f.fecha}</td>
                    <td className="p-2 border">{f.tipo}</td>
                    <td className="p-2 border text-right">
                      RD$
                      {Number(f.monto).toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-2 border">{f.responsable}</td>
                    <td className="p-2 border">{f.descripcion}</td>
                  </tr>
                ))}

                {fondosFiltrados.length === 0 && (
                  <tr>
                    <td className="p-4 border text-center" colSpan={6}>
                      No hay fondos registrados.
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