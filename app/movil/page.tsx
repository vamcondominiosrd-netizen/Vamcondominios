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

export default function MovilPage() {
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

  if (!propietario) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-slate-950 text-white rounded-3xl p-6 shadow">
          <p className="text-sm text-amber-300 font-semibold">
            VAM Administración de Condominios
          </p>

          <h1 className="text-2xl font-bold mt-3">
            Portal del Propietario
          </h1>

          <p className="text-slate-300 text-sm mt-2">
            {propietario.condominio_nombre}
          </p>

          <p className="text-slate-300 text-sm">
            Apto. {propietario.no_apartamento}
          </p>

          <div className="mt-4 bg-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400">Propietario</p>
            <p className="font-bold">{propietario.nombre_propietario}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Link
            href="/movil/pagar"
            className="bg-green-700 text-white rounded-2xl p-5 shadow block"
          >
            <h2 className="text-lg font-bold">Realizar Pago</h2>
            <p className="text-sm text-green-100">
              Reportar pago y subir comprobante
            </p>
          </Link>

          <Link
            href="/movil/estado-cuenta"
            className="bg-white text-slate-900 rounded-2xl p-5 shadow-sm border block"
          >
            <h2 className="text-lg font-bold">Estado de Cuenta</h2>
            <p className="text-sm text-slate-500">
              Consultar balance, pagos y cargos pendientes
            </p>
          </Link>

          <Link
            href="/movil/recibos"
            className="bg-white text-slate-900 rounded-2xl p-5 shadow-sm border block"
          >
            <h2 className="text-lg font-bold">Recibos y Pagos</h2>
            <p className="text-sm text-slate-500">
              Ver historial de pagos registrados
            </p>
          </Link>

          <Link
            href="/movil/reservar-area"
            className="bg-white text-slate-900 rounded-2xl p-5 shadow-sm border block"
          >
            <h2 className="text-lg font-bold">Reservar Área Social</h2>
            <p className="text-sm text-slate-500">
              Solicitar reserva de áreas comunes
            </p>
          </Link>

          <Link
            href="/movil/incidencias"
            className="bg-white text-slate-900 rounded-2xl p-5 shadow-sm border block"
          >
            <h2 className="text-lg font-bold">Reportar Incidencia</h2>
            <p className="text-sm text-slate-500">
              Enviar reportes, averías o situaciones del condominio
            </p>
          </Link>

          <Link
            href="/movil/anuncios"
            className="bg-white text-slate-900 rounded-2xl p-5 shadow-sm border block"
          >
            <h2 className="text-lg font-bold">Anuncios</h2>
            <p className="text-sm text-slate-500">
              Ver comunicaciones oficiales del condominio
            </p>
          </Link>
        </div>

        <button
          onClick={cerrarSesion}
          className="w-full bg-red-600 hover:bg-red-700 text-white rounded-2xl p-4 font-bold shadow"
        >
          Cerrar sesión
        </button>

        <p className="text-center text-xs text-slate-400 pt-4">
          VAM Administración de Condominios
        </p>
      </div>
    </main>
  );
}