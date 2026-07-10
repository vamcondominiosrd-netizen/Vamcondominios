"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type Condominio = {
  id: number;
  nombre: string;
  logo_url?: string | null;
};

type Unidad = {
  id: number;
  codigo: string;
};

export default function LoginPropietariosPage() {
  const router = useRouter();

  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [condominioLogoUrl, setCondominioLogoUrl] = useState("");

  const [unidadId, setUnidadId] = useState("");
  const [cedula, setCedula] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarCondominios();
  }, []);

  async function cargarCondominios() {
    const { data, error } = await supabase
      .from("condominios")
      .select("id, nombre, logo_url")
      .order("nombre");

    if (error) {
      setMensaje(error.message);
      return;
    }

    setCondominios(data || []);
  }

  async function seleccionarCondominio(id: string) {
    setCondominioId(id);
    setUnidadId("");
    setMensaje("");

    const seleccionado = condominios.find((c) => String(c.id) === id);

    setCondominioNombre(seleccionado?.nombre || "");
    setCondominioLogoUrl(seleccionado?.logo_url || "");

    if (!id) {
      setUnidades([]);
      return;
    }

    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo");

    if (error) {
      setMensaje(error.message);
      return;
    }

    setUnidades(data || []);
  }

  function limpiarSesion() {
    localStorage.removeItem("propietario_actual");
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
  }

  async function entrar() {
    if (!condominioId || !unidadId || !cedula) {
      setMensaje("Debe completar condominio, apartamento y cédula.");
      return;
    }

    setLoading(true);
    setMensaje("");

    const unidadCodigo =
      unidades.find((u) => String(u.id) === unidadId)?.codigo || "";

    const cedulaLimpia = cedula.replace(/\D/g, "");

    const { data, error } = await supabase
      .from("propietarios_apartamentos")
      .select(`
        id,
        nombre_propietario,
        cedula,
        telefono,
        correo,
        no_apartamento
      `)
      .eq("condominio_id", Number(condominioId))
      .eq("no_apartamento", unidadCodigo);

    setLoading(false);

    if (error) {
      setMensaje(error.message);
      return;
    }

    const propietario = (data || []).find((p: any) => {
      const cedulaDB = String(p.cedula || "").replace(/\D/g, "");
      return cedulaDB === cedulaLimpia;
    });

    if (!propietario) {
      setMensaje("La cédula no coincide con el apartamento seleccionado.");
      return;
    }

    limpiarSesion();

    localStorage.setItem(
      "propietario_actual",
      JSON.stringify({
        propietario_id: propietario.id,
        condominio_id: Number(condominioId),
        condominio_nombre: condominioNombre,
        condominio_logo_url: condominioLogoUrl,
        unidad_id: Number(unidadId),
        no_apartamento: unidadCodigo,
        nombre_propietario: propietario.nombre_propietario,
        cedula: propietario.cedula,
        telefono: propietario.telefono,
        correo: propietario.correo,
      })
    );

    router.push("/movil/propietarios/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 flex items-center">
      <div className="w-full max-w-md mx-auto space-y-5">
        <div className="bg-slate-950 text-white rounded-3xl p-6 shadow-xl text-center">
          {condominioLogoUrl ? (
            <img
              src={condominioLogoUrl}
              alt="Logo"
              className="w-20 h-20 object-contain mx-auto mb-3 rounded-full bg-white p-2"
            />
          ) : (
            <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-blue-700 flex items-center justify-center text-2xl font-bold">
              VAM
            </div>
          )}

          <h1 className="text-2xl font-bold">VAM Propietarios</h1>
          <p className="text-slate-300 text-sm mt-1">
            Acceso móvil para consultar cuenta, pagos e incidencias.
          </p>
        </div>

        <div className="bg-white rounded-3xl border shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Condominio
            </label>
            <select
              value={condominioId}
              onChange={(e) => seleccionarCondominio(e.target.value)}
              className="w-full border rounded-2xl px-4 py-3 bg-white"
            >
              <option value="">Seleccione condominio</option>
              {condominios.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Apartamento / Unidad
            </label>
            <select
              value={unidadId}
              onChange={(e) => setUnidadId(e.target.value)}
              className="w-full border rounded-2xl px-4 py-3 bg-white"
            >
              <option value="">Seleccione unidad</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.codigo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Cédula del propietario
            </label>
            <input
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="Digite su cédula"
              className="w-full border rounded-2xl px-4 py-3"
            />
          </div>

          {mensaje && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl p-3 text-sm">
              {mensaje}
            </div>
          )}

          <button
            type="button"
            onClick={entrar}
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-2xl py-4 font-bold text-base"
          >
            {loading ? "Validando..." : "Entrar"}
          </button>
        </div>

        <p className="text-center text-xs text-slate-400">
          VAM Administración de Condominios
        </p>
      </div>
    </main>
  );
}