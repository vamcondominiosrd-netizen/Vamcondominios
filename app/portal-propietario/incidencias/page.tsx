"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Propietario = {
  id: number;
  condominio: string;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string;
  telefono: string;
};

export default function PortalIncidenciasPage() {
  const [condominio, setCondominio] = useState("");
  const [noApartamento, setNoApartamento] = useState("");
  const [cedula, setCedula] = useState("");
  const [propietario, setPropietario] = useState<Propietario | null>(null);

  const [tipoIncidencia, setTipoIncidencia] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState("Normal");
  const [evidenciaArchivo, setEvidenciaArchivo] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function consultarPropietario(e: React.FormEvent) {
    e.preventDefault();

    if (!condominio || !noApartamento || !cedula) {
      alert("Debe completar condominio, apartamento y cédula.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("propietarios_apartamentos")
      .select("id, condominio, no_apartamento, nombre_propietario, cedula, telefono")
      .eq("condominio", condominio)
      .ilike("no_apartamento", noApartamento)
      .eq("cedula", cedula)
      .maybeSingle();

    setLoading(false);

    if (error) {
      alert("Error consultando propietario: " + error.message);
      return;
    }

    if (!data) {
      alert("No se encontró propietario con los datos ingresados.");
      setPropietario(null);
      return;
    }

    setPropietario(data);
  }

  async function subirEvidencia() {
    if (!evidenciaArchivo) return "";

    const extension = evidenciaArchivo.name.split(".").pop();
    const nombreArchivo = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

    const rutaArchivo = `${propietario?.condominio}/${propietario?.no_apartamento}/${nombreArchivo}`;

    const { error } = await supabase.storage
      .from("evidencias-incidencias")
      .upload(rutaArchivo, evidenciaArchivo);

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from("evidencias-incidencias")
      .getPublicUrl(rutaArchivo);

    return data.publicUrl;
  }

  async function reportarIncidencia(e: React.FormEvent) {
    e.preventDefault();

    if (!propietario) {
      alert("Debe validar primero el propietario.");
      return;
    }

    if (!tipoIncidencia || !titulo || !descripcion) {
      alert("Debe completar tipo de incidencia, título y descripción.");
      return;
    }

    try {
      setGuardando(true);

      let evidenciaUrl = "";

      if (evidenciaArchivo) {
        evidenciaUrl = await subirEvidencia();
      }

      const { error } = await supabase.from("incidencias_propietarios").insert([
        {
          propietario_id: propietario.id,
          condominio: propietario.condominio,
          no_apartamento: propietario.no_apartamento,
          nombre_propietario: propietario.nombre_propietario,
          cedula: propietario.cedula,
          telefono: propietario.telefono,
          tipo_incidencia: tipoIncidencia,
          titulo,
          descripcion,
          prioridad,
          evidencia_url: evidenciaUrl,
          estado: "Reportado",
        },
      ]);

      setGuardando(false);

      if (error) {
        alert("Error registrando incidencia: " + error.message);
        return;
      }

      alert("Incidencia reportada correctamente. La administración dará seguimiento.");

      setTipoIncidencia("");
      setTitulo("");
      setDescripcion("");
      setPrioridad("Normal");
      setEvidenciaArchivo(null);

      const inputFile = document.getElementById(
        "evidenciaIncidencia"
      ) as HTMLInputElement | null;

      if (inputFile) inputFile.value = "";
    } catch (err: any) {
      setGuardando(false);
      alert("Error subiendo evidencia: " + err.message);
    }
  }

  const tipos = [
    "Filtración",
    "Electricidad",
    "Agua",
    "Limpieza",
    "Seguridad",
    "Ruido",
    "Parqueo",
    "Áreas comunes",
    "Mantenimiento",
    "Ascensor",
    "Puerta / acceso",
    "Basura",
    "Otro",
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="bg-slate-950 text-white rounded-2xl p-6 text-center shadow">
          <h1 className="text-2xl font-bold">Reportar Incidencia</h1>
          <p className="text-sm text-slate-300 mt-1">
            Portal de Propietarios - VAM / SOTECDOM
          </p>
        </div>

        {!propietario && (
          <div className="bg-white rounded-2xl p-6 shadow">
            <h2 className="text-xl font-bold mb-4">Validar propietario</h2>

            <form onSubmit={consultarPropietario} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Condominio</label>
                <select
                  value={condominio}
                  onChange={(e) => setCondominio(e.target.value)}
                  className="border rounded-lg px-3 py-3 w-full"
                >
                  <option value="">Seleccione condominio</option>
                  <option value="Lote 9">Lote 9</option>
                  <option value="Lote 11">Lote 11</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">No. Apartamento</label>
                <input
                  type="text"
                  value={noApartamento}
                  onChange={(e) => setNoApartamento(e.target.value)}
                  className="border rounded-lg px-3 py-3 w-full"
                  placeholder="Ej. A1, B2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Cédula</label>
                <input
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  className="border rounded-lg px-3 py-3 w-full"
                  placeholder="000-0000000-0"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-700 text-white py-3 rounded-lg hover:bg-blue-800 disabled:opacity-50"
              >
                {loading ? "Validando..." : "Validar propietario"}
              </button>
            </form>
          </div>
        )}

        {propietario && (
          <>
            <div className="bg-white rounded-2xl p-6 shadow">
              <p className="text-sm text-slate-500">Propietario validado</p>
              <h2 className="text-2xl font-bold">{propietario.nombre_propietario}</h2>
              <p className="text-sm text-slate-500 mt-1">
                {propietario.condominio} | Apto. {propietario.no_apartamento}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow">
              <h2 className="text-xl font-bold mb-4">Datos de la incidencia</h2>

              <form onSubmit={reportarIncidencia} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Tipo de incidencia
                  </label>
                  <select
                    value={tipoIncidencia}
                    onChange={(e) => setTipoIncidencia(e.target.value)}
                    className="border rounded-lg px-3 py-3 w-full"
                  >
                    <option value="">Seleccione tipo</option>
                    {tipos.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Prioridad</label>
                  <select
                    value={prioridad}
                    onChange={(e) => setPrioridad(e.target.value)}
                    className="border rounded-lg px-3 py-3 w-full"
                  >
                    <option value="Baja">Baja</option>
                    <option value="Normal">Normal</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Título</label>
                  <input
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="border rounded-lg px-3 py-3 w-full"
                    placeholder="Ej. Filtración en baño"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Descripción</label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="border rounded-lg px-3 py-3 w-full"
                    rows={4}
                    placeholder="Explique el problema o solicitud"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Foto o evidencia
                  </label>
                  <input
                    id="evidenciaIncidencia"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => setEvidenciaArchivo(e.target.files?.[0] || null)}
                    className="border rounded-lg px-3 py-3 w-full bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full bg-green-700 text-white py-3 rounded-lg hover:bg-green-800 disabled:opacity-50"
                >
                  {guardando ? "Enviando..." : "Enviar incidencia"}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}