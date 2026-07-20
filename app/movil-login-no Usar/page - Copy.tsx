"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type Condominio = {
  id: number;
  nombre: string;
};

type Unidad = {
  id: number;
  codigo: string;
};

export default function MovilLoginPage() {
  const router = useRouter();

  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
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
      .select("id, nombre")
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

    const nombre =
      condominios.find((c) => String(c.id) === id)?.nombre || "";

    setCondominioNombre(nombre);

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

    const { data: propietarios, error } = await supabase
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

    const propietario = (propietarios || []).find((p: any) => {
      const cedulaDB = String(p.cedula || "").replace(/\D/g, "");
      return cedulaDB === cedulaLimpia;
    });

    if (!propietario) {
      setMensaje("La cédula no coincide con el apartamento seleccionado.");
      return;
    }

    localStorage.setItem(
      "propietario_actual",
      JSON.stringify({
        propietario_id: propietario.id,
        condominio_id: Number(condominioId),
        condominio_nombre: condominioNombre,
        unidad_id: Number(unidadId),
        no_apartamento: unidadCodigo,
        nombre_propietario: propietario.nombre_propietario,
        cedula: propietario.cedula,
        telefono: propietario.telefono,
        correo: propietario.correo,
      })
    );

    router.push("/movil");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 flex items-center">
      <div className="max-w-md mx-auto w-full space-y-4">
        <div className="bg-slate-950 text-white rounded-3xl p-6 shadow">
          <h1 className="text-3xl font-bold">VAM Móvil</h1>
          <p className="text-slate-300 text-sm mt-2">
            Acceso para propietarios y residentes.
          </p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
          <select
            value={condominioId}
            onChange={(e) => seleccionarCondominio(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          >
            <option value="">Seleccione condominio</option>
            {condominios.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>

          <select
            value={unidadId}
            onChange={(e) => setUnidadId(e.target.value)}
            className="w-full border rounded-xl px-4 py-3"
          >
            <option value="">Seleccione apartamento</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.codigo}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="Cédula del propietario"
            className="w-full border rounded-xl px-4 py-3"
          />

          <button
            onClick={entrar}
            className="w-full bg-blue-700 text-white rounded-xl py-3 font-bold"
          >
            {loading ? "Validando..." : "Entrar"}
          </button>

          {mensaje && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-3 text-sm">
              {mensaje}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400">
          VAM Administración de Condominios
        </p>
      </div>
    </main>
  );
}