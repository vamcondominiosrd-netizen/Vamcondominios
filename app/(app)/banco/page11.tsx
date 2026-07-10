"use client";

import Link from "next/link";
import {
  Upload,
  SearchCheck,
  WalletCards,
  FileSpreadsheet,
  Landmark,
  ArrowRight,
} from "lucide-react";

type ModuloBanco = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
  fondo: string;
  iconoColor: string;
};

export default function BancoPage() {
  const modulos: ModuloBanco[] = [
    {
      titulo: "Importar Banco",
      descripcion:
        "Subir el archivo bancario del período para procesar transacciones.",
      href: "/archivo-banco/importar",
      icono: Upload,
      fondo: "from-blue-600 to-blue-800",
      iconoColor: "text-blue-700",
    },
    {
      titulo: "Identificar Pagos",
      descripcion:
        "Relacionar transacciones bancarias con apartamentos y propietarios.",
      href: "/archivo-banco/identificar",
      icono: SearchCheck,
      fondo: "from-emerald-600 to-emerald-800",
      iconoColor: "text-emerald-700",
    },
    {
      titulo: "Pagos Identificados",
      descripcion:
        "Consultar pagos ya reconocidos desde el archivo del banco.",
      href: "/pagos-identificados",
      icono: WalletCards,
      fondo: "from-purple-600 to-purple-800",
      iconoColor: "text-purple-700",
    },
    {
      titulo: "Alias Apartamentos",
      descripcion:
        "Importar o administrar nombres usados por el banco para identificar apartamentos.",
      href: "/apartamento-banco-alias/importar",
      icono: FileSpreadsheet,
      fondo: "from-amber-500 to-orange-700",
      iconoColor: "text-amber-700",
    },
  ];

  return (
    <main className="space-y-5">
      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
              Módulo
            </p>

            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
              Banco
            </h1>

            <p className="text-sm text-slate-500 mt-2 max-w-3xl">
              Administre la importación bancaria, identificación de pagos,
              conciliación básica y alias de apartamentos del condominio activo.
            </p>
          </div>

          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-slate-900 flex items-center justify-center shadow-lg">
            <Landmark className="h-9 w-9 text-white" />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            Opciones de Banco
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Seleccione una opción para continuar trabajando.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {modulos.map((modulo) => {
            const Icono = modulo.icono;

            return (
              <Link
                key={modulo.href}
                href={modulo.href}
                className="group rounded-2xl border bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition overflow-hidden"
              >
                <div
                  className={`h-20 bg-gradient-to-br ${modulo.fondo} flex items-center justify-center relative`}
                >
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_white,_transparent_35%)]" />

                  <div className="h-14 w-14 rounded-2xl bg-white/95 flex items-center justify-center shadow-md relative z-10 group-hover:scale-105 transition">
                    <Icono className={`h-8 w-8 ${modulo.iconoColor}`} />
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-black text-slate-900 text-base group-hover:text-indigo-700">
                    {modulo.titulo}
                  </h3>

                  <p className="text-xs text-slate-500 mt-2 min-h-[54px] leading-relaxed">
                    {modulo.descripcion}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-xs font-bold text-indigo-700">
                    <span>Abrir módulo</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm p-5">
        <h2 className="text-lg font-bold">Flujo recomendado Banco</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-sm">
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-indigo-300 font-bold">1. Importar</p>
            <p className="text-slate-300 mt-1 text-xs">
              Subir el archivo del banco del período.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-indigo-300 font-bold">2. Identificar</p>
            <p className="text-slate-300 mt-1 text-xs">
              Asociar transacciones con apartamentos.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-indigo-300 font-bold">3. Confirmar</p>
            <p className="text-slate-300 mt-1 text-xs">
              Revisar pagos identificados antes de aplicarlos.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-indigo-300 font-bold">4. Alias</p>
            <p className="text-slate-300 mt-1 text-xs">
              Mantener nombres de apartamentos usados por el banco.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}