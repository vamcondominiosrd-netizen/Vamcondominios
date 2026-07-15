"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Building2, Phone, Mail, LogOut, IdCard } from "lucide-react";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  condominio_logo_url?: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string;
  telefono?: string;
  correo?: string;
};

export default function PerfilPropietarioPage() {
  const router = useRouter();
  const [propietario, setPropietario] = useState<PropietarioActual | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("propietario_actual");

    if (!raw) {
      router.push("/movil/propietarios/login");
      return;
    }

    setPropietario(JSON.parse(raw));
  }, [router]);

  function cerrarSesion() {
    localStorage.removeItem("propietario_actual");
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");

    router.push("/movil/propietarios/login");
  }

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

        <div className="flex items-center gap-3">
          {propietario.condominio_logo_url ? (
            <img
              src={propietario.condominio_logo_url}
              alt="Logo"
              className="w-16 h-16 object-contain rounded-full bg-white p-2"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-700 flex items-center justify-center font-bold">
              VAM
            </div>
          )}

          <div>
            <p className="text-sm text-slate-300">Mi perfil</p>
            <h1 className="text-xl font-bold leading-tight">
              {propietario.nombre_propietario}
            </h1>
            <p className="text-xs text-slate-300">
              {propietario.condominio_nombre}
            </p>
          </div>
        </div>
      </header>

      <section className="bg-white rounded-3xl border shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-slate-900">Datos personales</h2>

        <InfoItem
          icon={<User size={20} />}
          titulo="Propietario"
          valor={propietario.nombre_propietario || "No registrado"}
        />

        <InfoItem
          icon={<IdCard size={20} />}
          titulo="Cédula"
          valor={propietario.cedula || "No registrada"}
        />

        <InfoItem
          icon={<Phone size={20} />}
          titulo="Teléfono"
          valor={propietario.telefono || "No registrado"}
        />

        <InfoItem
          icon={<Mail size={20} />}
          titulo="Correo"
          valor={propietario.correo || "No registrado"}
        />
      </section>

      <section className="bg-white rounded-3xl border shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-slate-900">Datos del condominio</h2>

        <InfoItem
          icon={<Building2 size={20} />}
          titulo="Condominio"
          valor={propietario.condominio_nombre || "No registrado"}
        />

        <InfoItem
          icon={<Building2 size={20} />}
          titulo="Apartamento / Unidad"
          valor={propietario.no_apartamento || "No registrado"}
        />
      </section>

      <button
        type="button"
        onClick={cerrarSesion}
        className="w-full bg-red-600 hover:bg-red-700 text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2"
      >
        <LogOut size={20} />
        Cerrar sesión
      </button>
    </div>
  );
}

function InfoItem({
  icon,
  titulo,
  valor,
}: {
  icon: React.ReactNode;
  titulo: string;
  valor: string;
}) {
  return (
    <div className="flex items-center gap-3 border rounded-2xl p-3 bg-slate-50">
      <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-blue-700 border">
        {icon}
      </div>

      <div>
        <p className="text-xs text-slate-500">{titulo}</p>
        <p className="font-bold text-slate-900">{valor}</p>
      </div>
    </div>
  );
}