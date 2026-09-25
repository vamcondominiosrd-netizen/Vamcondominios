"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ModuloGas = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: string;
  color: string;
};

const modulos: ModuloGas[] = [
  {
    titulo: "Recepción de Gas",
    descripcion:
      "Registrar conduces, cantidades recibidas, tanque abastecido y evidencias.",
    href: "/gas/recepcion",
    icono: "🚚",
    color: "from-blue-800 to-cyan-600",
  },
  {
    titulo: "Ubicación de Tanques",
    descripcion:
      "Configurar los tanques o áreas donde se recibe el gas del condominio.",
    href: "/gas/tanques",
    icono: "🛢️",
    color: "from-slate-800 to-slate-500",
  },
  {
    titulo: "Precios de Gas",
    descripcion:
      "Registrar el precio activo por proveedor y unidad de medida.",
    href: "/gas/precios",
    icono: "💰",
    color: "from-emerald-700 to-green-500",
  },
  {
    titulo: "Unidades de Medida",
    descripcion:
      "Mantener unidades como Galones, Libras o Metros cúbicos.",
    href: "/gas/unidades-medida",
    icono: "📏",
    color: "from-purple-800 to-fuchsia-600",
  },
];

export default function GasPage() {
  const [condominioNombre, setCondominioNombre] = useState("");

  useEffect(() => {
    const nombre = localStorage.getItem("condominio_nombre") || "";
    setCondominioNombre(nombre);
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-blue-700 uppercase tracking-wide">
                Operaciones del condominio
              </p>

              <h1 className="text-3xl font-black text-slate-900 mt-1">
                Módulo de Gas
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Control de recepción de gas por conduce, ubicación de tanques,
                precios activos, unidades de medida y conexión futura con
                solicitudes de pago.
              </p>

              <p className="text-sm text-slate-600 mt-3">
                <strong>Condominio activo:</strong>{" "}
                {condominioNombre || "No seleccionado"}
              </p>
            </div>

            <Link
              href="finanzas/pagos"
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-center"
            >
              Volver al inicio
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {modulos.map((modulo) => (
            <Link
              key={modulo.href}
              href={modulo.href}
              className="group bg-white rounded-3xl border shadow-sm hover:shadow-lg transition overflow-hidden"
            >
              <div className={`h-2 bg-gradient-to-r ${modulo.color}`} />

              <div className="p-5">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${modulo.color} flex items-center justify-center text-3xl shadow-sm group-hover:scale-105 transition`}
                >
                  {modulo.icono}
                </div>

                <h2 className="text-xl font-black text-slate-900 mt-4">
                  {modulo.titulo}
                </h2>

                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  {modulo.descripcion}
                </p>

                <div className="mt-4 text-sm font-black text-blue-700">
                  Abrir módulo →
                </div>
              </div>
            </Link>
          ))}
        </section>

        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <h2 className="text-xl font-black text-slate-900">
            Flujo recomendado
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4 text-sm">
            <div className="border rounded-2xl p-4 bg-slate-50">
              <p className="font-black">1. Configurar unidades</p>
              <p className="text-slate-500 mt-1">Galones por defecto.</p>
            </div>

            <div className="border rounded-2xl p-4 bg-slate-50">
              <p className="font-black">2. Crear tanques</p>
              <p className="text-slate-500 mt-1">
                Ubicación o área abastecida.
              </p>
            </div>

            <div className="border rounded-2xl p-4 bg-slate-50">
              <p className="font-black">3. Registrar precios</p>
              <p className="text-slate-500 mt-1">Precio activo por proveedor.</p>
            </div>

            <div className="border rounded-2xl p-4 bg-slate-50">
              <p className="font-black">4. Recibir gas</p>
              <p className="text-slate-500 mt-1">Conduce, cantidad y fotos.</p>
            </div>

            <div className="border rounded-2xl p-4 bg-slate-50">
              <p className="font-black">5. Solicitud de pago</p>
              <p className="text-slate-500 mt-1">
                Luego se conecta con aprobación.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}