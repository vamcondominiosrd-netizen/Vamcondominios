"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type Empresa = {
  id: number;
  condominio_id: number | null;
  condominio: string | null;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  tipo_servicio: string | null;
  observacion: string | null;
  activo: boolean;
};

export default function EmpresasFrecuentesPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  const [condominioId, setCondominioId] = useState<number>(0);
  const [condominioNombre, setCondominioNombre] = useState<string>("");

  const [nombre, setNombre] = useState("");
  const [contacto, setContacto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [tipoServicio, setTipoServicio] = useState("");
  const [observacion, setObservacion] = useState("");

  function cargarCondominioActivo() {
    const id = Number(
      localStorage.getItem("condominio_id") ||
        localStorage.getItem("condominioId") ||
        0
    );

    const nombreActivo =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominioNombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombreActivo);

    return { id, nombreActivo };
  }

  async function cargarEmpresas() {
    setLoading(true);

    const { id } = cargarCondominioActivo();

    if (!id) {
      setEmpresas([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("autorizaciones_empresas_frecuentes")
      .select(
        "id, condominio_id, condominio, nombre, contacto, telefono, correo, tipo_servicio, observacion, activo"
      )
      .eq("condominio_id", id)
      .order("id", { ascending: false });

    if (error) {
      console.error("Error cargando empresas:", error);
      alert("Error cargando empresas frecuentes");
    } else {
      setEmpresas(data || []);
    }

    setLoading(false);
  }

  async function guardarEmpresa(e: React.FormEvent) {
    e.preventDefault();

    if (!nombre.trim()) {
      alert("Debe completar el nombre de la empresa.");
      return;
    }

    const { id, nombreActivo } = cargarCondominioActivo();

    if (!id) {
      alert("No se encontró el condominio activo. Cierre sesión e ingrese nuevamente.");
      return;
    }

    const { error } = await supabase
      .from("autorizaciones_empresas_frecuentes")
      .insert({
        condominio_id: id,
        condominio: nombreActivo || null,
        nombre: nombre.trim(),
        contacto: contacto.trim() || null,
        telefono: telefono.trim() || null,
        correo: correo.trim() || null,
        tipo_servicio: tipoServicio.trim() || null,
        observacion: observacion.trim() || null,
        activo: true,
      });

    if (error) {
      console.error("Error guardando empresa:", error);
      alert("Error guardando empresa frecuente");
      return;
    }

    setNombre("");
    setContacto("");
    setTelefono("");
    setCorreo("");
    setTipoServicio("");
    setObservacion("");

    await cargarEmpresas();
  }

  async function cambiarEstado(id: number, activo: boolean) {
    const { error } = await supabase
      .from("autorizaciones_empresas_frecuentes")
      .update({ activo: !activo })
      .eq("id", id);

    if (error) {
      console.error("Error actualizando estado:", error);
      alert("Error actualizando estado");
      return;
    }

    await cargarEmpresas();
  }

  useEffect(() => {
    cargarEmpresas();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/autorizaciones/catalogos"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a catálogos
            </Link>

            <h1 className="mt-3 text-2xl font-bold text-slate-900">
              Empresas Frecuentes
            </h1>
            <p className="text-sm text-slate-500">
              Proveedores, técnicos, compañías de servicio, delivery, mudanza y entregas.
            </p>
          </div>

          <button
            onClick={cargarEmpresas}
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
            Refrescar
          </button>
        </div>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">
                Nueva empresa frecuente
              </h2>
              <p className="text-sm text-slate-500">
                Condominio activo:{" "}
                <span className="font-semibold text-slate-800">
                  {condominioNombre || "No detectado"}
                </span>
              </p>
            </div>
          </div>

          <form onSubmit={guardarEmpresa} className="grid gap-4 md:grid-cols-3">
            <Input
              label="Nombre Empresa"
              value={nombre}
              onChange={setNombre}
              placeholder="Ej: Claro, Edesur, Corripio"
            />

            <Input
              label="Contacto"
              value={contacto}
              onChange={setContacto}
              placeholder="Nombre de contacto"
            />

            <Input
              label="Teléfono"
              value={telefono}
              onChange={setTelefono}
              placeholder="809-000-0000"
            />

            <Input
              label="Correo"
              value={correo}
              onChange={setCorreo}
              placeholder="correo@empresa.com"
            />

            <Input
              label="Tipo de Servicio"
              value={tipoServicio}
              onChange={setTipoServicio}
              placeholder="Ej: Internet, entrega, electricidad"
            />

            <div className="md:col-span-3">
              <TextArea
                label="Observación"
                value={observacion}
                onChange={setObservacion}
              />
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-blue-700 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-blue-800"
              >
                Guardar Empresa
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">
                  Listado de empresas frecuentes
                </h2>
                <p className="text-sm text-slate-500">
                  Total registradas: {empresas.length}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-5 py-3">Empresa</th>
                  <th className="px-5 py-3">Contacto</th>
                  <th className="px-5 py-3">Teléfono</th>
                  <th className="px-5 py-3">Correo</th>
                  <th className="px-5 py-3">Tipo Servicio</th>
                  <th className="px-5 py-3">Condominio</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acción</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                      Cargando empresas...
                    </td>
                  </tr>
                ) : empresas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                      No hay empresas registradas para este condominio.
                    </td>
                  </tr>
                ) : (
                  empresas.map((empresa) => (
                    <tr key={empresa.id} className="border-t">
                      <td className="px-5 py-3 font-semibold text-slate-900">
                        {empresa.nombre}
                        {empresa.observacion && (
                          <div className="text-xs font-normal text-slate-500">
                            {empresa.observacion}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {empresa.contacto || "-"}
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {empresa.telefono || "-"}
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {empresa.correo || "-"}
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {empresa.tipo_servicio || "-"}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {empresa.condominio || "-"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            empresa.activo
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {empresa.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => cambiarEstado(empresa.id, empresa.activo)}
                          className="rounded-xl border px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {empresa.activo ? "Desactivar" : "Activar"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
    </div>
  );
}