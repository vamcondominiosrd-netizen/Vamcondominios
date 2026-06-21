"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type UsuarioAdmin = {
  id: number;
  user_id: string;
  condominio_id: number;
  nombre: string;
  rol: string;
  estado: string;
};

type Condominio = {
  id: number;
  nombre: string;
  logo_url: string | null;
};

export default function LoginTecnicoPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function iniciarSesion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email.trim()) {
      alert("Debe indicar el correo electrónico.");
      return;
    }

    if (!clave.trim()) {
      alert("Debe indicar la clave.");
      return;
    }

    setLoading(true);
    setMensaje("");

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: clave.trim(),
      });

    if (authError || !authData.user) {
      setMensaje("Correo o clave incorrecta.");
      setLoading(false);
      return;
    }

    const { data: usuarioData, error: usuarioError } = await supabase
      .from("usuarios_admin")
      .select("id, user_id, condominio_id, nombre, rol, estado")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (usuarioError || !usuarioData) {
      await supabase.auth.signOut();
      setMensaje("Este usuario no está asociado a ningún condominio.");
      setLoading(false);
      return;
    }

    const usuario = usuarioData as UsuarioAdmin;

    if (usuario.estado !== "Activo") {
      await supabase.auth.signOut();
      setMensaje("Este usuario está inactivo.");
      setLoading(false);
      return;
    }

    if (usuario.rol !== "tecnico") {
      await supabase.auth.signOut();
      setMensaje("Este acceso es solo para técnicos VAM.");
      setLoading(false);
      return;
    }

    const { data: condominioData } = await supabase
      .from("condominios")
      .select("id, nombre, logo_url")
      .eq("id", usuario.condominio_id)
      .maybeSingle();

    const condominio = condominioData as Condominio | null;

    localStorage.setItem("usuario_admin_id", String(usuario.id));
    localStorage.setItem("usuario_nombre", usuario.nombre || "Técnico VAM");
    localStorage.setItem("usuario_rol", usuario.rol);

    localStorage.setItem("condominio_id", String(usuario.condominio_id));
    localStorage.setItem(
      "condominio_nombre",
      condominio?.nombre || "Condominio asignado"
    );
    localStorage.setItem("condominio_logo_url", condominio?.logo_url || "");

    router.push("/mobile/tecnico");

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <section className="bg-white rounded-3xl shadow-xl p-6">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-700 to-slate-900 flex items-center justify-center text-white text-4xl shadow">
              👷
            </div>

            <p className="mt-4 text-xs font-bold text-blue-700 uppercase tracking-wide">
              VAM Administradora
            </p>

            <h1 className="text-3xl font-black text-slate-900 mt-1">
              Login Técnico
            </h1>

            <p className="text-sm text-slate-500 mt-2">
              Acceso móvil para recibir gas y realizar tareas operativas.
            </p>
          </div>

          {mensaje && (
            <div className="mt-5 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm font-bold">
              {mensaje}
            </div>
          )}

          <form onSubmit={iniciarSesion} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
                placeholder="correo@dominio.com"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">
                Clave
              </label>
              <input
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Clave de acceso"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white py-3 rounded-xl font-black"
            >
              {loading ? "Validando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              href="/login"
              className="text-sm font-bold text-slate-500 hover:text-blue-700"
            >
              Ir al login administrativo
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}