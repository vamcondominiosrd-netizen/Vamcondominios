"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  UserRound,
  Shield,
  Wrench,
  Flame,
  Trash2,
  Building2,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
};

type ContactoDirectorio = {
  id: number;
  nombre: string;
  cargo?: string | null;
  empresa?: string | null;
  telefono?: string | null;
  correo?: string | null;
  tipo_contacto?: string | null;
};

function limpiarTelefono(telefono?: string | null) {
  return String(telefono || "").replace(/\D/g, "");
}

function iconoTipo(tipo?: string | null) {
  const t = String(tipo || "").toLowerCase();

  if (t.includes("seguridad")) return Shield;
  if (t.includes("mantenimiento")) return Wrench;
  if (t.includes("gas")) return Flame;
  if (t.includes("basura") || t.includes("limpieza")) return Trash2;
  if (t.includes("administración") || t.includes("administracion"))
    return Building2;

  return UserRound;
}

export default function DirectorioMovilPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(
    null
  );
  const [contactos, setContactos] = useState<ContactoDirectorio[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("propietario_actual");

    if (!raw) {
      router.push("/movil/propietarios/login");
      return;
    }

    const prop = JSON.parse(raw);
    setPropietario(prop);
    cargarContactos(prop);
  }, [router]);

  async function cargarContactos(prop: PropietarioActual) {
    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("directorio_condominio")
      .select(`
        id,
        nombre,
        cargo,
        empresa,
        telefono,
        correo,
        tipo_contacto
      `)
      .eq("condominio_id", prop.condominio_id)
      .eq("activo", true)
      .order("tipo_contacto", { ascending: true })
      .order("nombre", { ascending: true });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando directorio: " + error.message);
      return;
    }

    setContactos(data || []);
  }

  const tipos = [
    "Todos",
    ...Array.from(
      new Set(contactos.map((c) => c.tipo_contacto || "General"))
    ),
  ];

  const contactosFiltrados =
    tipoFiltro === "Todos"
      ? contactos
      : contactos.filter((c) => (c.tipo_contacto || "General") === tipoFiltro);

  if (!propietario) {
    return <div className="p-6 text-center text-slate-500">Cargando...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <header className="bg-slate-950 text-white rounded-3xl p-5 shadow">
        <button
          onClick={() => router.push("/movil/propietarios/dashboard")}
          className="flex items-center gap-2 text-sm text-slate-300 mb-4"
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <p className="text-sm text-slate-300">Contactos importantes</p>
        <h1 className="text-xl font-bold">Directorio</h1>

        <p className="text-xs text-slate-300">
          {propietario.condominio_nombre} · {propietario.no_apartamento}
        </p>
      </header>

      {mensaje && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 text-sm">
          {mensaje}
        </div>
      )}

      <section className="bg-white rounded-3xl border shadow-sm p-4">
        <label className="block text-sm font-bold text-slate-700 mb-1">
          Filtrar por tipo
        </label>

        <select
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value)}
          className="w-full border rounded-2xl px-4 py-3 bg-white"
        >
          {tipos.map((tipo) => (
            <option key={tipo}>{tipo}</option>
          ))}
        </select>
      </section>

      {loading ? (
        <div className="bg-white rounded-3xl p-5 text-center text-slate-500">
          Cargando directorio...
        </div>
      ) : contactosFiltrados.length === 0 ? (
        <div className="bg-white rounded-3xl border shadow-sm p-6 text-center">
          <UserRound className="mx-auto text-slate-400 mb-2" size={36} />

          <p className="font-bold text-slate-700">No hay contactos</p>

          <p className="text-sm text-slate-500 mt-1">
            Cuando la administración registre contactos, aparecerán aquí.
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          {contactosFiltrados.map((contacto) => {
            const Icono = iconoTipo(contacto.tipo_contacto);
            const telefonoLimpio = limpiarTelefono(contacto.telefono);
            const whatsappUrl = telefonoLimpio
              ? `https://wa.me/1${telefonoLimpio}`
              : "";

            return (
              <div
                key={contacto.id}
                className="bg-white rounded-3xl border shadow-sm p-5"
              >
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                    <Icono className="text-blue-700" size={24} />
                  </div>

                  <div className="flex-1">
                    <p className="text-xs font-bold text-blue-700">
                      {contacto.tipo_contacto || "General"}
                    </p>

                    <h2 className="font-bold text-slate-900 leading-tight mt-1">
                      {contacto.nombre}
                    </h2>

                    {contacto.cargo && (
                      <p className="text-sm text-slate-500 mt-1">
                        {contacto.cargo}
                      </p>
                    )}

                    {contacto.empresa && (
                      <p className="text-xs text-slate-400">
                        {contacto.empresa}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 mt-4">
                  {contacto.telefono && (
                    <a
                      href={`tel:${telefonoLimpio}`}
                      className="inline-flex items-center justify-center gap-2 bg-green-600 text-white rounded-2xl py-3 font-bold"
                    >
                      <Phone size={18} />
                      Llamar {contacto.telefono}
                    </a>
                  )}

                  {telefonoLimpio && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      className="inline-flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 rounded-2xl py-3 font-bold"
                    >
                      <MessageCircle size={18} />
                      WhatsApp
                    </a>
                  )}

                  {contacto.correo && (
                    <a
                      href={`mailto:${contacto.correo}`}
                      className="inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-700 rounded-2xl py-3 font-bold"
                    >
                      <Mail size={18} />
                      Enviar correo
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}