"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const opcionesBanco = [
  {
    titulo: "Importar Banco",
    descripcion:
      "Subir archivo bancario del período para procesar transacciones.",
    href: "/mobile/admin/banco/importar",
    icono: "⬆️",
    color: "from-blue-700 to-blue-500",
  },
  {
    titulo: "Identificar Pagos",
    descripcion:
      "Relacionar transacciones bancarias con apartamentos y propietarios.",
    href: "/mobile/admin/banco/identificar-pagos",
    icono: "🔎",
    color: "from-emerald-700 to-green-500",
  },
  {
    titulo: "Pagos Identificados",
    descripcion:
      "Consultar pagos ya reconocidos desde el archivo del banco.",
    href: "/mobile/admin/banco/pagos-identificados",
    icono: "✅",
    color: "from-purple-700 to-fuchsia-500",
  },
  {
    titulo: "Alias Apartamentos",
    descripcion:
      "Administrar nombres usados por el banco para identificar apartamentos.",
    href: "/mobile/admin/banco/alias-apartamentos",
    icono: "🏷️",
    color: "from-orange-600 to-red-500",
  },
];

export default function MobileBancoMenuPage() {
  const [condominioNombre, setCondominioNombre] = useState("");

  useEffect(() => {
    setCondominioNombre(
      localStorage.getItem("condominio_nombre") ||
        localStorage.getItem("condominio") ||
        ""
    );
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-slate-900 text-white rounded-b-3xl p-5 shadow-md">
        <Link href="/mobile/admin" className="text-sm text-slate-200">
          ← Volver al panel
        </Link>

        <h1 className="text-2xl font-black mt-3">
          Opciones de Banco
        </h1>

        <p className="text-sm text-slate-300 mt-1">
          {condominioNombre || "Condominio no identificado"}
        </p>

        <p className="text-sm text-slate-300 mt-2">
          Seleccione una opción para continuar trabajando.
        </p>
      </div>

      <div className="p-4 space-y-4">
        {opcionesBanco.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block bg-white rounded-2xl border shadow-sm overflow-hidden active:scale-[0.99] transition"
          >
            <div className={`bg-gradient-to-r ${item.color} p-4`}>
              <div className="w-14 h-14 bg-white/95 rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                {item.icono}
              </div>
            </div>

            <div className="p-4">
              <h2 className="text-lg font-black text-slate-900">
                {item.titulo}
              </h2>

              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                {item.descripcion}
              </p>

              <div className="flex justify-between items-center mt-4">
                <span className="text-sm font-bold text-blue-700">
                  Abrir módulo
                </span>

                <span className="text-xl text-blue-700">
                  →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
        <div className="grid grid-cols-5 text-xs text-center">
          <Link href="/mobile/admin" className="py-3 text-slate-600">
            🏠
            <span className="block mt-1">Inicio</span>
          </Link>

          <Link href="/mobile/admin/banco" className="py-3 font-bold text-blue-700">
            🏦
            <span className="block mt-1">Banco</span>
          </Link>

          <Link href="/mobile/admin/pagos" className="py-3 text-slate-600">
            💳
            <span className="block mt-1">Pagos</span>
          </Link>

          <Link href="/mobile/admin/incidencias" className="py-3 text-slate-600">
            🛠️
            <span className="block mt-1">Casos</span>
          </Link>

          <Link href="/mobile/admin/mas" className="py-3 text-slate-600">
            ☰
            <span className="block mt-1">Más</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}