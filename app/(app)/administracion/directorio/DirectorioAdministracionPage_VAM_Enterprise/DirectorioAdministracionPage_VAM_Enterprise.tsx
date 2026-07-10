"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import {
  CheckCircle,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import PageHeader from "@/components/vam/enterprise/PageHeader";
import StatCard from "@/components/vam/enterprise/StatCard";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import ActionBar from "@/components/vam/enterprise/ActionBar";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";
import StatusBadge from "@/components/vam/enterprise/StatusBadge";
import PageDrawer from "@/components/vam/enterprise/PageDrawer";

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [buscar, setBuscar] = useState("");

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

    setContactos((data as ContactoDirectorio[]) || []);
  }

  function limpiarFormulario() {
    setNombre("");
    setCargo("");
    setEmpresa("");
    setTelefono("");
    setCorreo("");
    setTipoContacto("General");
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
    limpiarFormulario();
    setDrawerOpen(false);
    await cargarContactos(condominio.id);
  }

  async function cambiarActivo(contacto: ContactoDirectorio) {
    const { error } = await supabase
      .from("directorio_condominio")
      .update({ activo: !contacto.activo })
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

  function normalizarTelefono(numero?: string | null) {
    const limpio = String(numero || "").replace(/\D/g, "");

    if (!limpio) return "";

    if (limpio.length === 10) return `1${limpio}`;

    return limpio;
  }

  const contactosFiltrados = useMemo(() => {
    const texto = buscar.toLowerCase().trim();

    if (!texto) return contactos;

    return contactos.filter((contacto) => {
      const combinado = `
        ${contacto.nombre || ""}
        ${contacto.cargo || ""}
        ${contacto.empresa || ""}
        ${contacto.telefono || ""}
        ${contacto.correo || ""}
        ${contacto.tipo_contacto || ""}
        ${contacto.activo ? "activo" : "inactivo"}
      `.toLowerCase();

      return combinado.includes(texto);
    });
  }, [contactos, buscar]);

  const activos = contactos.filter((c) => c.activo).length;
  const inactivos = contactos.filter((c) => !c.activo).length;
  const conTelefono = contactos.filter((c) => c.telefono).length;

  return (
    <PageContainer>
      <PageHeader
        title="Directorio del Condominio"
        subtitle="Contactos importantes del condominio: administración, directiva, seguridad, emergencias y proveedores."
        badge="Centro Residencial"
        icon={UserRound}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                limpiarFormulario();
                setDrawerOpen(true);
              }}
              className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
            >
              + Nuevo contacto
            </button>

            <button
              type="button"
              onClick={() => condominio && cargarContactos(condominio.id)}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        }
      />

      {mensaje && (
        <div
          className={`rounded-xl p-3 text-sm ${
            exito
              ? "border border-green-200 bg-green-50 text-green-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Total contactos"
          value={contactos.length}
          subtitle="Registrados"
          icon={Users}
          tone="blue"
        />

        <StatCard
          title="Activos"
          value={activos}
          subtitle="Disponibles"
          icon={CheckCircle}
          tone="green"
        />

        <StatCard
          title="Inactivos"
          value={inactivos}
          subtitle="Fuera de uso"
          icon={XCircle}
          tone="red"
        />

        <StatCard
          title="Con teléfono"
          value={conTelefono}
          subtitle="Pueden recibir llamadas"
          icon={Phone}
          tone="amber"
        />
      </div>

      <SectionCard
        title="Contactos registrados"
        subtitle={`Condominio activo: ${condominio?.nombre || "No seleccionado"}`}
      >
        <ActionBar
          search={buscar}
          onSearch={setBuscar}
          placeholder="Buscar contacto, tipo, empresa, teléfono o correo..."
        >
          <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
            <Search className="h-4 w-4" />
            {contactosFiltrados.length} registros
          </div>
        </ActionBar>

        <div className="mt-4">
          {loadingLista ? (
            <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500">
              Cargando contactos...
            </div>
          ) : contactosFiltrados.length === 0 ? (
            <EmptyState
              title="Sin contactos"
              description="No hay contactos registrados para este condominio."
            />
          ) : (
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Contacto</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-left">Comunicación</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {contactosFiltrados.map((contacto) => {
                  const telefonoWhatsApp = normalizarTelefono(contacto.telefono);

                  return (
                    <tr key={contacto.id} className="bg-white hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-black text-slate-900">
                          {contacto.nombre}
                        </p>

                        {contacto.cargo && (
                          <p className="text-xs text-slate-500">
                            {contacto.cargo}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          {contacto.tipo_contacto || "General"}
                        </span>
                      </td>

                      <td className="px-4 py-3">{contacto.empresa || "-"}</td>

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {contacto.telefono ? (
                            <a
                              href={`tel:${contacto.telefono}`}
                              className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-700"
                            >
                              <Phone size={14} />
                              {contacto.telefono}
                            </a>
                          ) : (
                            <p className="text-slate-400">Sin teléfono</p>
                          )}

                          {contacto.correo ? (
                            <a
                              href={`mailto:${contacto.correo}`}
                              className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-700"
                            >
                              <Mail size={13} />
                              {contacto.correo}
                            </a>
                          ) : (
                            <p className="text-xs text-slate-400">Sin correo</p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={contacto.activo ? "Activo" : "Inactivo"} />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-center gap-2">
                          {contacto.telefono && (
                            <a
                              href={`tel:${contacto.telefono}`}
                              className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                            >
                              Llamar
                            </a>
                          )}

                          {telefonoWhatsApp && (
                            <a
                              href={`https://wa.me/${telefonoWhatsApp}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800"
                            >
                              WhatsApp
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => cambiarActivo(contacto)}
                            className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100"
                          >
                            {contacto.activo ? "Desactivar" : "Activar"}
                          </button>

                          <button
                            type="button"
                            onClick={() => eliminarContacto(contacto.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                          >
                            <Trash2 size={14} />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          )}
        </div>
      </SectionCard>

      <PageDrawer
        open={drawerOpen}
        title="Nuevo contacto"
        onClose={() => setDrawerOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Nombre *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Víctor Ángeles"
              className="w-full rounded-xl border px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Tipo de contacto
            </label>
            <select
              value={tipoContacto}
              onChange={(e) => setTipoContacto(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              {tiposContacto.map((tipo) => (
                <option key={tipo}>{tipo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Cargo
            </label>
            <input
              type="text"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Ej. Administrador"
              className="w-full rounded-xl border px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Empresa
            </label>
            <input
              type="text"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Ej. VAM Administradora"
              className="w-full rounded-xl border px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Teléfono
            </label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej. 829-792-9292"
              className="w-full rounded-xl border px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Correo
            </label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="correo@dominio.com"
              className="w-full rounded-xl border px-4 py-3 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={guardarContacto}
              disabled={loading || !condominio}
              className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
            >
              {loading ? "Guardando..." : "Guardar contacto"}
            </button>

            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-xl border px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </PageDrawer>
    </PageContainer>
  );
}
