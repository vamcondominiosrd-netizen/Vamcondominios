"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function VamMovilPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(
    null
  );

  useEffect(() => {
    const data = localStorage.getItem("propietario_actual");

    if (!data) {
      router.push("/movil-login");
      return;
    }

    setPropietario(JSON.parse(data));
  }, [router]);

  function cerrarSesion() {
    localStorage.removeItem("propietario_actual");
    router.push("/movil-login");
  }

  const opciones = [
    {
      titulo: "Estado de Cuenta",
      descripcion: "Consulta balance, pagos y meses pendientes.",
      href: "/movil/estado-cuenta",
    },
    {
      titulo: "Reservar Área Social",
      descripcion: "Solicita reservas de gazebo, salón o terraza.",
      href: "/movil/reservar-area",
    },
    {
      titulo: "Reportar Incidencia",
      descripcion: "Reporta averías, problemas o situaciones.",
      href: "/movil/incidencias",
    },
    {
      titulo: "Anuncios",
      descripcion: "Consulta comunicaciones del condominio.",
      href: "/movil/anuncios",
    },
    {
      titulo: "Recibos",
      descripcion: "Consulta comprobantes y pagos registrados.",
      href: "/movil/recibos",
    },
  ];

  if (!propietario) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-md mx-auto space-y-5">
        <div className="bg-slate-950 text-white rounded-3xl p-6 shadow">
          <h1 className="text-3xl font-bold">VAM Móvil</h1>

          <p className="text-slate-300 mt-2">
            Bienvenido, {propietario.nombre_propietario}
          </p>

          <div className="mt-4 bg-slate-900 rounded-2xl p-4 text-sm">
            <p>
              <strong>Condominio:</strong> {propietario.condominio_nombre}
            </p>
            <p>
              <strong>Apartamento:</strong> {propietario.no_apartamento}
            </p>
          </div>

          <button
            onClick={cerrarSesion}
            className="mt-4 text-sm text-amber-300"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="space-y-4">
          {opciones.map((opcion) => (
            <Link
              key={opcion.href}
              href={opcion.href}
              className="block bg-white rounded-2xl p-5 shadow-sm border active:scale-[0.98] transition"
            >
              <h2 className="text-xl font-bold text-slate-800">
                {opcion.titulo}
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                {opcion.descripcion}
              </p>
            </Link>
          ))}
        </div>

        <p className="text-center text-xs text-slate-400 pt-4">
          VAM Administración de Condominios
        </p>
      </div>
    </main>
  );
}