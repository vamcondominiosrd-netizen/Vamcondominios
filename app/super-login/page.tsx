"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function SuperLoginPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  async function iniciarSesion(e: React.FormEvent) {
    e.preventDefault();

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

    const { data: superData, error: superError } = await supabase
      .from("super_admins")
      .select("id, user_id, nombre, email, activo")
      .eq("user_id", data.user.id)
      .eq("activo", true)
      .maybeSingle();

    if (superError || !superData) {
      await supabase.auth.signOut();

      setLoading(false);
      setMensaje("Este usuario no tiene acceso como Full Administrador.");
      return;
    }

    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");

    localStorage.setItem("usuario_rol", "super_admin");
    localStorage.setItem("usuario_nombre", superData.nombre || "Full Admin");
    localStorage.setItem("super_admin_id", String(superData.id));

    setLoading(false);

    router.push("/super-admin");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img
              src="/logo.jpg"
              alt="Logo"
              className="h-24 w-24 object-contain rounded-xl border bg-white p-2"
            />
          </div>

          <h1 className="text-3xl font-bold text-slate-800">
            Full Administrador
          </h1>

          <p className="text-slate-500 mt-2">
            Acceso global para configuración inicial
          </p>
        </div>

        <form onSubmit={iniciarSesion} className="space-y-5">
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
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg disabled:opacity-60"
          >
            {loading ? "Validando..." : "Entrar como Full Administrador"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-3 rounded-lg"
          >
            Volver al login normal
          </button>
        </form>
      </div>
    </main>
  );
}