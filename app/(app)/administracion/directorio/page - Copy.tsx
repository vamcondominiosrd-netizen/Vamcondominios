"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import {
  Phone,
  Mail,
  UserRound,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";

type Condominio = {
  id: number;
  nombre: string;
};

type ContactoDirectorio = {
  id: number;
  condominio_id: number;
  condominio: string;
  nombre: string;
  cargo?: string | null;
  empresa?: string | null;
  telefono?: string | null;
  correo?: string | null;
  tipo_contacto?: string | null;
  activo: boolean;
  created_at?: string | null;
};

const tiposContacto = [
  "Administración",
  "Directiva",
  "Seguridad",
  "Emergencia",
  "Proveedor",
  "Mantenimiento",
  "Gas",
  "Limpieza",
  "Basura",
  "General",
];

export default function DirectorioAdministracionPage() {
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [contactos, setContactos] = useState<ContactoDirectorio[]>([]);

  const [nombre, setNombre] = useState("");
  const [cargo, setCargo] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [tipoContacto, setTipoContacto] = useState("General");

  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingLista, setLoadingLista] = useState(false);

  useEffect(() => {
    cargarCondominioActivo();
  }, []);

  useEffect(() => {
    if (condominio) {
      cargarContactos(condominio.id);
    }
  }, [condominio]);

  async function cargarCondominioActivo() {
    const condominioIdLocal = localStorage.getItem("condominio_id");
    const condominioNombreLocal = localStorage.getItem("condominio_nombre");

    if (!condominioIdLocal) {
      setMensaje("No hay condominio seleccionado en la sesión.");
      return;
    }

    const { data, error } = await supabase
      .from("condominios")
      .select("id, nombre")
      .eq("id", Number(condominioIdLocal))
      .maybeSingle();

    if (error) {
      setMensaje("Error cargando condominio: " + error.message);
      return;
    }

    if (data) {
      setCondominio(data);
      return;
    }

    if (condominioNombreLocal) {
      setCondominio({
        id: Number(condominioIdLocal),
        nombre: condominioNombreLocal,
      });
    }
  }

  async function cargarContactos(condominioId: number) {
    setLoadingLista(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("directorio_condominio")
      .select(`
        id,
        condominio_id,
        condominio,
        nombre,
        cargo,
        empresa,
        telefono,
        correo,
        tipo_contacto,
        activo,
        created_at
      `)
      .eq("condominio_id", condominioId)
      .order("tipo_contacto", { ascending: true })
      .order("nombre", { ascending: true });

    setLoadingLista(false);

    if (error) {
      setMensaje("Error cargando directorio: " + error.message);
      return;
    }

    setContactos(data || []);
  }

  async function guardarContacto() {
    setMensaje("");
    setExito(false);

    if (!condominio) {
      setMensaje("No hay condominio activo.");
      return;
    }

    if (!nombre.trim()) {
      setMensaje("Debe indicar el nombre del contacto.");
      return;
    }

    if (!telefono.trim() && !correo.trim()) {
      setMensaje("Debe indicar al menos teléfono o correo.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("directorio_condominio").insert({
      condominio_id: condominio.id,
      condominio: condominio.nombre,
      nombre: nombre.trim(),
      cargo: cargo.trim() || null,
      empresa: empresa.trim() || null,
      telefono: telefono.trim() || null,
      correo: correo.trim() || null,
      tipo_contacto: tipoContacto,
      activo: true,
    });

    setLoading(false);

    if (error) {
      setMensaje("Error guardando contacto: " + error.message);
      return;
    }

    setExito(true);
    setMensaje("Contacto guardado correctamente.");

    setNombre("");
    setCargo("");
    setEmpresa("");
    setTelefono("");
    setCorreo("");
    setTipoContacto("General");

    await cargarContactos(condominio.id);
  }

  async function cambiarActivo(contacto: ContactoDirectorio) {
    const { error } = await supabase
      .from("directorio_condominio")
      .update({
        activo: !contacto.activo,
      })
      .eq("id", contacto.id);

    if (error) {
      setMensaje("Error actualizando contacto: " + error.message);
      return;
    }

    if (condominio) {
      await cargarContactos(condominio.id);
    }
  }

  async function eliminarContacto(id: number) {
    const confirmar = confirm("¿Seguro que desea eliminar este contacto?");

    if (!confirmar) return;

    const { error } = await supabase
      .from("directorio_condominio")
      .delete()
      .eq("id", id);

    if (error) {
      setMensaje("Error eliminando contacto: " + error.message);
      return;
    }

    if (condominio) {
      await cargarContactos(condominio.id);
    }
  }

  return (
    <main className="p-6 space-y-6">
      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <h1 className="text-2xl font-bold text-slate-900">
          Directorio del Condominio
        </h1>

        <p className="text-slate-500 mt-1">
          Registre los contactos importantes del condominio: administración,
          directiva, seguridad, emergencias y proveedores.
        </p>

        {condominio && (
          <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-3 text-sm font-bold">
            Condominio activo: {condominio.nombre}
          </div>
        )}
      </section>

      {mensaje && (
        <div
          className={`rounded-xl p-3 text-sm ${
            exito
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {mensaje}
        </div>
      )}

      <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <UserRound className="text-blue-700" size={22} />
          <h2 className="font-bold text-slate-900">Nuevo contacto</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Víctor Ángeles"
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Tipo de contacto
            </label>
            <select
              value={tipoContacto}
              onChange={(e) => setTipoContacto(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 bg-white"
            >
              {tiposContacto.map((tipo) => (
                <option key={tipo}>{tipo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Cargo</label>
            <input
              type="text"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Ej. Administrador"
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Empresa</label>
            <input
              type="text"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Ej. VAM Administradora"
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Teléfono</label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej. 829-792-9292"
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Correo</label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="correo@dominio.com"
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={guardarContacto}
          disabled={loading || !condominio}
          className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white rounded-xl px-6 py-3 font-bold"
        >
          {loading ? "Guardando..." : "Guardar contacto"}
        </button>
      </section>

      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <h2 className="font-bold text-slate-900 mb-4">
          Contactos registrados
        </h2>

        {loadingLista ? (
          <p className="text-slate-500">Cargando contactos...</p>
        ) : contactos.length === 0 ? (
          <p className="text-slate-500">
            No hay contactos registrados para este condominio.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-left">Contacto</th>
                  <th className="p-3 text-left">Tipo</th>
                  <th className="p-3 text-left">Empresa</th>
                  <th className="p-3 text-left">Teléfono</th>
                  <th className="p-3 text-left">Correo</th>
                  <th className="p-3 text-left">Activo</th>
                  <th className="p-3 text-left">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {contactos.map((contacto) => (
                  <tr key={contacto.id} className="border-t">
                    <td className="p-3">
                      <p className="font-bold">{contacto.nombre}</p>
                      {contacto.cargo && (
                        <p className="text-xs text-slate-500">
                          {contacto.cargo}
                        </p>
                      )}
                    </td>

                    <td className="p-3">{contacto.tipo_contacto}</td>
                    <td className="p-3">{contacto.empresa || "-"}</td>

                    <td className="p-3">
                      {contacto.telefono ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={14} />
                          {contacto.telefono}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="p-3">
                      {contacto.correo ? (
                        <span className="inline-flex items-center gap-1">
                          <Mail size={14} />
                          {contacto.correo}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="p-3">
                      {contacto.activo ? (
                        <span className="inline-flex items-center gap-1 text-green-700 font-bold">
                          <CheckCircle size={15} />
                          Sí
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 font-bold">
                          <XCircle size={15} />
                          No
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => cambiarActivo(contacto)}
                          className="bg-blue-50 text-blue-700 rounded-lg px-3 py-2 font-bold"
                        >
                          {contacto.activo ? "Desactivar" : "Activar"}
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminarContacto(contacto.id)}
                          className="inline-flex items-center gap-1 bg-red-50 text-red-700 rounded-lg px-3 py-2 font-bold"
                        >
                          <Trash2 size={15} />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}