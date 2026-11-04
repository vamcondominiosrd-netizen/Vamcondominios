"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type OpcionBanco = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: string;
  color: string;
  activo: boolean;
};

const opcionesBanco: OpcionBanco[] = [
  {
    titulo: "Importar Banco",
    descripcion:
      "Subir el archivo bancario del período para procesar las transacciones.",
    href: "/mobile/admin/banco/importar",
    icono: "⬆️",
    color: "from-blue-700 to-blue-500",
    activo: true,
  },
  {
    titulo: "Identificar Pagos",
    descripcion:
      "Relacionar las transacciones del banco con apartamentos y propietarios.",
    href: "/mobile/admin/banco/identificar-pagos",
    icono: "🔎",
    color: "from-emerald-700 to-green-500",
    activo: true,
  },
  {
    titulo: "Pagos Identificados",
    descripcion:
      "Consultar los pagos ya reconocidos desde el archivo del banco.",
    href: "/mobile/admin/banco/pagos-identificados",
    icono: "✅",
    color: "from-purple-700 to-fuchsia-500",
    activo: true,
  },
  {
    titulo: "Alias Apartamentos",
    descripcion:
      "Administrar nombres o referencias usadas por el banco para identificar apartamentos.",
    href: "/mobile/admin/banco/alias-apartamentos",
    icono: "🏷️",
    color: "from-orange-600 to-red-500",
    activo: true,
  },
];

export default function MobileBancoMenuPage() {
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");

  useEffect(() => {
    setCondominioNombre(
      localStorage.getItem("condominio_nombre") ||
        localStorage.getItem("condominio") ||
        "Condominio no identificado"
    );

    setUsuarioNombre(localStorage.getItem("usuario_nombre") || "Usuario");
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-slate-900 text-white rounded-b-3xl p-5 shadow-md">
        <Link href="/mobile/admin" className="text-sm text-slate-200">
          ← Volver al panel
        </Link>

        <h1 className="text-2xl font-black mt-3">Banco</h1>

        <p className="text-sm text-slate-300 mt-1">
          {condominioNombre}
        </p>

        <p className="text-xs text-slate-400 mt-1">
          Usuario: {usuarioNombre}
        </p>

        <p className="text-sm text-slate-300 mt-3">
          Gestión bancaria móvil para importación, identificación y revisión de pagos.
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <h2 className="text-lg font-black text-slate-900">
            Flujo recomendado
          </h2>

          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600">
            <div className="bg-slate-50 rounded-xl p-3">
              <span className="font-black text-blue-700">1.</span>{" "}
              Importar el archivo del banco.
            </div>

            <div className="bg-slate-50 rounded-xl p-3">
              <span className="font-black text-emerald-700">2.</span>{" "}
              Identificar los pagos por apartamento o propietario.
            </div>

            <div className="bg-slate-50 rounded-xl p-3">
              <span className="font-black text-purple-700">3.</span>{" "}
              Revisar los pagos identificados y aplicados.
            </div>
          </div>
        </div>

        {opcionesBanco.map((item) => {
          const tarjeta = (
            <div
              className={`block bg-white rounded-2xl border shadow-sm overflow-hidden active:scale-[0.99] transition ${
                !item.activo ? "opacity-60" : ""
              }`}
            >
              <div className={`bg-gradient-to-r ${item.color} p-4`}>
                <div className="w-14 h-14 bg-white/95 rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                  {item.icono}
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">
                    {item.titulo}
                  </h2>

                  {!item.activo && (
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-bold">
                      Próximo
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  {item.descripcion}
                </p>

                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm font-bold text-blue-700">
                    Abrir módulo
                  </span>

                  <span className="text-xl text-blue-700">→</span>
                </div>
              </div>
            </div>
          );

          if (!item.activo) {
            return <div key={item.href}>{tarjeta}</div>;
          }

          return (
            <Link key={item.href} href={item.href}>
              {tarjeta}
            </Link>
          );
        })}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
        <div className="grid grid-cols-5 text-xs text-center">
          <Link href="/mobile/admin" className="py-3 text-slate-600">
            <div>🏠</div>
            <span className="block mt-1">Inicio</span>
          </Link>

          <Link
            href="/mobile/admin/banco"
            className="py-3 font-bold text-blue-700"
          >
            <div>🏦</div>
            <span className="block mt-1">Banco</span>
          </Link>

          <Link href="/mobile/admin/pagos" className="py-3 text-slate-600">
            <div>💳</div>
            <span className="block mt-1">Pagos</span>
          </Link>

          <Link
            href="/mobile/admin/solicitudes-pagos"
            className="py-3 text-slate-600"
          >
            <div>💼</div>
            <span className="block mt-1">Solicitudes</span>
          </Link>

          <Link href="/mobile/admin/mas" className="py-3 text-slate-600">
            <div>☰</div>
            <span className="block mt-1">Más</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}