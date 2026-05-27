"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import * as XLSX from "xlsx";

type Proveedor = {
  id: number;
  nombre_proveedor: string;
  rnc_cedula: string;
  telefono: string;
  correo: string;
  direccion: string;
  cuenta_banco: string;
  estado: string;
  created_at: string;
};

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);

  const [nombreProveedor, setNombreProveedor] = useState("");
  const [rncCedula, setRncCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [cuentaBanco, setCuentaBanco] = useState("");
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    cargarProveedores();
  }, []);

  async function cargarProveedores() {
    setLoading(true);

    const { data, error } = await supabase
      .from("catalogo_proveedores")
      .select(
        "id, nombre_proveedor, rnc_cedula, telefono, correo, direccion, cuenta_banco, estado, created_at"
      )
      .order("nombre_proveedor", { ascending: true });

    setLoading(false);

    if (error) {
      alert("Error cargando proveedores: " + error.message);
      return;
    }

    setProveedores(data || []);
  }

  async function guardarProveedor(e: React.FormEvent) {
    e.preventDefault();

    if (!nombreProveedor) {
      alert("Debe completar el nombre del proveedor.");
      return;
    }

    const { error } = await supabase.from("catalogo_proveedores").insert([
      {
        nombre_proveedor: nombreProveedor,
        rnc_cedula: rncCedula,
        telefono,
        correo,
        direccion,
        cuenta_banco: cuentaBanco,
        estado: "activo",
      },
    ]);

    if (error) {
      alert("Error guardando proveedor: " + error.message);
      return;
    }

    alert("Proveedor registrado correctamente.");

    setNombreProveedor("");
    setRncCedula("");
    setTelefono("");
    setCorreo("");
    setDireccion("");
    setCuentaBanco("");

    cargarProveedores();
  }

  const proveedoresFiltrados = proveedores.filter((p) => {
    const texto = `${p.nombre_proveedor} ${p.rnc_cedula} ${p.telefono} ${p.correo} ${p.cuenta_banco}`.toLowerCase();
    return texto.includes(buscar.toLowerCase());
  });

  function exportarExcel() {
    if (proveedoresFiltrados.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const dataExcel = proveedoresFiltrados.map((p) => ({
      Proveedor: p.nombre_proveedor,
      "RNC / Cédula": p.rnc_cedula,
      Teléfono: p.telefono,
      Correo: p.correo,
      Dirección: p.direccion,
      "Cuenta Banco": p.cuenta_banco,
      Estado: p.estado,
    }));

    const hoja = XLSX.utils.json_to_sheet(dataExcel);

    hoja["!cols"] = [
      { wch: 35 },
      { wch: 18 },
      { wch: 18 },
      { wch: 30 },
      { wch: 45 },
      { wch: 25 },
      { wch: 15 },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Proveedores");

    XLSX.writeFile(libro, "Catalogo_Proveedores.xlsx");
  }

  const activos = proveedoresFiltrados.filter((p) => p.estado === "activo").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Catálogo de Proveedores</h1>
          <p className="text-slate-500">
            Registro y consulta de proveedores para gastos del condominio.
          </p>
        </div>

        <button
          onClick={exportarExcel}
          className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800"
        >
          Exportar a Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total proveedores</p>
          <h2 className="text-2xl font-bold">{proveedoresFiltrados.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Proveedores activos</p>
          <h2 className="text-2xl font-bold text-green-700">{activos}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Estado del catálogo</p>
          <h2 className="text-2xl font-bold text-blue-700">Activo</h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Registrar proveedor</h2>

        <form
          onSubmit={guardarProveedor}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">
              Nombre del proveedor *
            </label>
            <input
              type="text"
              value={nombreProveedor}
              onChange={(e) => setNombreProveedor(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Nombre comercial o razón social"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              RNC / Cédula
            </label>
            <input
              type="text"
              value={rncCedula}
              onChange={(e) => setRncCedula(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="RNC o cédula"
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
              placeholder="correo@proveedor.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Cuenta de banco
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
              placeholder="Dirección del proveedor"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="bg-blue-700 text-white px-5 py-2 rounded-lg hover:bg-blue-800"
            >
              Guardar proveedor
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">Listado de proveedores</h2>
            <p className="text-sm text-slate-500">
              Puede buscar por nombre, RNC, teléfono, correo o cuenta bancaria.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Buscar</label>
            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full md:w-80"
              placeholder="Buscar proveedor..."
            />
          </div>
        </div>

        {loading ? (
          <p>Cargando proveedores...</p>
        ) : (
          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Proveedor</th>
                  <th className="p-2 border">RNC / Cédula</th>
                  <th className="p-2 border">Teléfono</th>
                  <th className="p-2 border">Correo</th>
                  <th className="p-2 border">Cuenta Banco</th>
                  <th className="p-2 border">Dirección</th>
                  <th className="p-2 border">Estado</th>
                </tr>
              </thead>

              <tbody>
                {proveedoresFiltrados.map((p) => (
                  <tr key={p.id}>
                    <td className="p-2 border font-semibold">
                      {p.nombre_proveedor}
                    </td>
                    <td className="p-2 border">{p.rnc_cedula}</td>
                    <td className="p-2 border">{p.telefono}</td>
                    <td className="p-2 border">{p.correo}</td>
                    <td className="p-2 border">{p.cuenta_banco}</td>
                    <td className="p-2 border">{p.direccion}</td>
                    <td className="p-2 border text-green-700 font-semibold">
                      {p.estado}
                    </td>
                  </tr>
                ))}

                {proveedoresFiltrados.length === 0 && (
                  <tr>
                    <td className="p-4 border text-center" colSpan={7}>
                      No hay proveedores registrados.
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