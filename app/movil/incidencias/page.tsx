"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string;
  telefono: string;
  correo: string;
};

export default function MovilIncidenciasPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(
    null
  );

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [prioridad, setPrioridad] = useState("Media");
  const [foto, setFoto] = useState<File | null>(null);

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem("propietario_actual");

    if (!data) {
      router.push("/movil-login");
      return;
    }

    setPropietario(JSON.parse(data));
  }, [router]);

  async function subirFoto(prop: PropietarioActual) {
    if (!foto) return "";

    const extension = foto.name.split(".").pop();

    const nombreArchivo = `incidencias/${prop.condominio_id}/${prop.unidad_id}-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from("incidencias")
      .upload(nombreArchivo, foto);

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from("incidencias")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  async function enviarIncidencia() {
    if (!propietario) return;

    if (!titulo || !descripcion) {
      setMensaje("Debe completar título y descripción.");
      return;
    }

    setLoading(true);
    setMensaje("");

    try {
      const fotoUrl = await subirFoto(propietario);

      const { error } = await supabase.from("incidencias").insert([
        {
          condominio: propietario.condominio_nombre,
          condominio_id: propietario.condominio_id,
          unidad_id: propietario.unidad_id,
          no_apartamento: propietario.no_apartamento,
          propietario_id: propietario.propietario_id,
          nombre_propietario: propietario.nombre_propietario,
          telefono: propietario.telefono,
          titulo,
          descripcion,
          categoria,
          prioridad,
          foto_url: fotoUrl,
          estado: "Pendiente",
          origen: "VAM Móvil",
        },
      ]);

      setLoading(false);

      if (error) {
        setMensaje("Error registrando incidencia: " + error.message);
        return;
      }

      alert("Incidencia enviada correctamente.");

      setTitulo("");
      setDescripcion("");
      setCategoria("");
      setPrioridad("Media");
      setFoto(null);

      const inputFile = document.getElementById(
        "fotoIncidencia"
      ) as HTMLInputElement | null;

      if (inputFile) inputFile.value = "";
    } catch (err: any) {
      setLoading(false);
      setMensaje("Error subiendo foto: " + err.message);
    }
  }

  if (!propietario) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-slate-950 text-white rounded-3xl p-6 shadow">
          <Link href="/movil" className="text-sm text-amber-300">
            ← Volver
          </Link>

          <h1 className="text-2xl font-bold mt-3">Reportar Incidencia</h1>

          <p className="text-slate-300 text-sm mt-1">
            {propietario.condominio_nombre}
          </p>

          <p className="text-slate-300 text-sm">
            Apto. {propietario.no_apartamento}
          </p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título de la incidencia"
            className="w-full border rounded-xl px-4 py-3"
          />

          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          >
            <option value="">Seleccione categoría</option>
            <option value="Agua">Agua</option>
            <option value="Electricidad">Electricidad</option>
            <option value="Basura">Basura</option>
            <option value="Seguridad">Seguridad</option>
            <option value="Áreas comunes">Áreas comunes</option>
            <option value="Parqueo">Parqueo</option>
            <option value="Otro">Otro</option>
          </select>

          <select
            value={prioridad}
            onChange={(e) => setPrioridad(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          >
            <option value="Baja">Prioridad baja</option>
            <option value="Media">Prioridad media</option>
            <option value="Alta">Prioridad alta</option>
            <option value="Urgente">Urgente</option>
          </select>

          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describa la situación"
            rows={4}
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            id="fotoIncidencia"
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={(e) => setFoto(e.target.files?.[0] || null)}
            className="w-full border rounded-xl px-4 py-3"
          />

          <button
            onClick={enviarIncidencia}
            className="w-full bg-blue-700 text-white rounded-xl py-3 font-bold"
          >
            {loading ? "Enviando..." : "Enviar incidencia"}
          </button>

          {mensaje && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-3 text-sm">
              {mensaje}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 pt-4">
          VAM Administración de Condominios
        </p>
      </div>
    </main>
  );
}