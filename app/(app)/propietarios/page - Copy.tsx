"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Propietario = {
  id: number;
  condominio: string;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string;
  telefono: string;
  correo: string;
  direccion: string;
  cuenta_banco: string;
  estado: string;
  created_at: string;
};

export default function PropietariosPage() {
  const [propietarios, setPropietarios] = useState<Propietario[]>([]);
  const [loading, setLoading] = useState(false);

  const [condominio, setCondominio] = useState("");
  const [noApartamento, setNoApartamento] = useState("");
  const [nombrePropietario, setNombrePropietario] = useState("");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [cuentaBanco, setCuentaBanco] = useState("");

  const [filtroCondominio, setFiltroCondominio] = useState("");
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    cargarPropietarios();
  }, []);

  async function cargarPropietarios() {
    setLoading(true);

    const { data, error } = await supabase
      .from("propietarios_apartamentos")
      .select(
        "id, condominio, no_apartamento, nombre_propietario, cedula, telefono, correo, direccion, cuenta_banco, estado, created_at"
      )
      .order("condominio", { ascending: true })
      .order("no_apartamento", { ascending: true });

    setLoading(false);

    if (error) {
      alert("Error cargando propietarios: " + error.message);
      return;
    }

    setPropietarios(data || []);
  }

  async function guardarPropietario(e: React.FormEvent) {
    e.preventDefault();

    if (!condominio || !noApartamento || !nombrePropietario) {
      alert("Debe completar condominio, apartamento y nombre del propietario.");
      return;
    }

    const { error } = await supabase.from("propietarios_apartamentos").insert([
      {
        condominio,
        no_apartamento: noApartamento,
        nombre_propietario: nombrePropietario,
        cedula,
        telefono,
        correo,
        direccion,
        cuenta_banco: cuentaBanco,
        estado: "activo",
      },
    ]);

    if (error) {
      alert("Error guardando propietario: " + error.message);
      return;
    }

    alert("Propietario registrado correctamente.");

    setCondominio("");
    setNoApartamento("");
    setNombrePropietario("");
    setCedula("");
    setTelefono("");
    setCorreo("");
    setDireccion("");
    setCuentaBanco("");

    cargarPropietarios();
  }

  const propietariosFiltrados = propietarios.filter((p) => {
    const cumpleCondominio =
      filtroCondominio === "" || p.condominio === filtroCondominio;

    const texto = `${p.no_apartamento} ${p.nombre_propietario} ${p.cedula} ${p.telefono} ${p.correo} ${p.cuenta_banco}`.toLowerCase();

    const cumpleBusqueda = texto.includes(buscar.toLowerCase());

    return cumpleCondominio && cumpleBusqueda;
  });

  const totalActivos = propietariosFiltrados.filter(
    (p) => p.estado === "activo"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Propietarios de Apartamentos</h1>
        <p className="text-slate-500">
          Registro y consulta de propietarios por condominio y apartamento.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total registros</p>
          <h2 className="text-2xl font-bold">{propietariosFiltrados.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Propietarios activos</p>
          <h2 className="text-2xl font-bold text-green-700">{totalActivos}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Condominios</p>
          <h2 className="text-2xl font-bold text-blue-700">
            {new Set(propietariosFiltrados.map((p) => p.condominio)).size}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Registrar propietario</h2>

        <form
          onSubmit={guardarPropietario}
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
            <label className="block text-sm font-semibold mb-1">
              No. Apartamento *
            </label>
            <input
              type="text"
              value={noApartamento}
              onChange={(e) => setNoApartamento(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Ej. A1, B2, L11 C3"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Nombre del propietario *
            </label>
            <input
              type="text"
              value={nombrePropietario}
              onChange={(e) => setNombrePropietario(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Nombre completo"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Cédula</label>
            <input
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="000-0000000-0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Teléfono</label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="809-000-0000"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Correo</label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Cuenta de Banco
            </label>
            <input
              type="text"
              value={cuentaBanco}
              onChange={(e) => setCuentaBanco(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Número de cuenta bancaria"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Dirección</label>
            <textarea
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              rows={2}
              placeholder="Dirección del propietario"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="bg-blue-700 text-white px-5 py-2 rounded-lg hover:bg-blue-800"
            >
              Guardar propietario
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">Listado de propietarios</h2>
            <p className="text-sm text-slate-500">
              Puede filtrar por condominio, apartamento, nombre, cédula, teléfono o cuenta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Condominio
              </label>
              <select
                value={filtroCondominio}
                onChange={(e) => setFiltroCondominio(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full md:w-48"
              >
                <option value="">Todos</option>
                <option value="Lote 9">Lote 9</option>
                <option value="Lote 11">Lote 11</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Buscar</label>
              <input
                type="text"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full md:w-64"
                placeholder="Apartamento, nombre, cuenta..."
              />
            </div>
          </div>
        </div>

        {loading ? (
          <p>Cargando propietarios...</p>
        ) : (
          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Condominio</th>
                  <th className="p-2 border">Apartamento</th>
                  <th className="p-2 border">Propietario</th>
                  <th className="p-2 border">Cédula</th>
                  <th className="p-2 border">Teléfono</th>
                  <th className="p-2 border">Correo</th>
                  <th className="p-2 border">Cuenta Banco</th>
                  <th className="p-2 border">Dirección</th>
                  <th className="p-2 border">Estado</th>
                </tr>
              </thead>

              <tbody>
                {propietariosFiltrados.map((p) => (
                  <tr key={p.id}>
                    <td className="p-2 border font-semibold">{p.condominio}</td>
                    <td className="p-2 border font-semibold">
                      {p.no_apartamento}
                    </td>
                    <td className="p-2 border">{p.nombre_propietario}</td>
                    <td className="p-2 border">{p.cedula}</td>
                    <td className="p-2 border">{p.telefono}</td>
                    <td className="p-2 border">{p.correo}</td>
                    <td className="p-2 border">{p.cuenta_banco}</td>
                    <td className="p-2 border">{p.direccion}</td>
                    <td className="p-2 border text-green-700 font-semibold">
                      {p.estado}
                    </td>
                  </tr>
                ))}

                {propietariosFiltrados.length === 0 && (
                  <tr>
                    <td className="p-4 border text-center" colSpan={9}>
                      No hay propietarios registrados.
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