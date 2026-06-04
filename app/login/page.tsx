"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type Condominio = {
  id: number;
  nombre: string;
  logo_url: string | null;
};

export default function LoginPage() {
  const router = useRouter();

  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [condominioId, setCondominioId] = useState("");
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarCondominios();
  }, []);

  async function cargarCondominios() {
    const { data, error } = await supabase
      .from("condominios")
      .select("id, nombre, logo_url")
      .order("id");

    if (error) {
      setMensaje(error.message);
      return;
    }

    setCondominios(data || []);
  }

  const condominioSeleccionado = condominios.find(
    (c) => String(c.id) === condominioId
  );

  async function iniciarSesion(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId) {
      setMensaje("Debe seleccionar un condominio.");
      return;
    }

    if (!usuario || !clave) {
      setMensaje("Debe indicar usuario y clave.");
      return;
    }

    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: usuario,
      password: clave,
    });

    if (error || !data.user) {
      setLoading(false);
      setMensaje("Usuario o clave incorrecta.");
      return;
    }

    const { data: adminData, error: adminError } = await supabase
      .from("usuarios_admin")
      .select("id, user_id, condominio_id, nombre, rol, estado")
      .eq("user_id", data.user.id)
      .eq("condominio_id", Number(condominioId))
      .eq("estado", "Activo")
      .maybeSingle();

    if (adminError || !adminData) {
      await supabase.auth.signOut();

      setLoading(false);
      setMensaje("Este usuario no pertenece al condominio seleccionado.");
      return;
    }

    localStorage.setItem("condominio_id", condominioId);

    localStorage.setItem(
      "condominio_nombre",
      condominioSeleccionado?.nombre || ""
    );

    localStorage.setItem(
      "condominio_logo_url",
      condominioSeleccionado?.logo_url || ""
    );

    localStorage.setItem("usuario_rol", adminData.rol || "");
    localStorage.setItem("usuario_nombre", adminData.nombre || "");
    localStorage.setItem("usuario_admin_id", String(adminData.id));

    setLoading(false);

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          {condominioSeleccionado?.logo_url ? (
            <div className="flex justify-center mb-4">
              <img
                src={condominioSeleccionado.logo_url}
                alt={condominioSeleccionado.nombre}
                className="h-24 w-24 object-contain rounded-xl border bg-white p-2"
              />
            </div>
          ) : (
            <div className="flex justify-center mb-4">
              <img
                src="/logo.jpg"
                alt="Logo"
                className="h-24 w-24 object-contain rounded-xl border bg-white p-2"
              />
            </div>
          )}

          <h1 className="text-3xl font-bold text-slate-800">
            Sistema de Administración
          </h1>

          <p className="text-slate-500 mt-2">Acceso multi-condominio</p>
        </div>

        <form onSubmit={iniciarSesion} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Condominio
            </label>

            <select
              value={condominioId}
              onChange={(e) => {
                setCondominioId(e.target.value);
                setMensaje("");
              }}
              className="w-full border border-slate-300 rounded-lg px-4 py-3"
            >
              <option value="">Seleccione un condominio</option>

              {condominios.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} - {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Usuario
            </label>

            <input
              type="email"
              value={usuario}
              onChange={(e) => {
                setUsuario(e.target.value);
                setMensaje("");
              }}
              placeholder="usuario@correo.com"
              className="w-full border border-slate-300 rounded-lg px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Clave
            </label>

            <input
              type="password"
              value={clave}
              onChange={(e) => {
                setClave(e.target.value);
                setMensaje("");
              }}
              placeholder="Digite su clave"
              className="w-full border border-slate-300 rounded-lg px-4 py-3"
            />
          </div>

          {mensaje && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
              {mensaje}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-lg disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar al sistema"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t text-center">
          <p className="text-xs text-slate-500 mb-3">
            Acceso exclusivo del dueño del sistema
          </p>

          <Link
            href="/super-login"
            className="block w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg"
          >
            Entrar como Full Administrador
          </Link>
        </div>
      </div>
    </main>
  );
}