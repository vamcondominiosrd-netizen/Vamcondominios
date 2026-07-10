"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, Building2 } from "lucide-react";

type VAMPageProps = {
  title: string;
  description?: string;
  children: ReactNode;
  backHref?: string;
  showRefresh?: boolean;
  onRefresh?: () => void;
};

export default function VAMPage({
  title,
  description,
  children,
  backHref,
  showRefresh = true,
  onRefresh,
}: VAMPageProps) {
  const [condominioNombre, setCondominioNombre] = useState("");

  useEffect(() => {
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominioNombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioNombre(nombre);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Encabezado */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>

            {backHref && (
              <Link
                href={backHref}
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Regresar
              </Link>
            )}

            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              {title}
            </h1>

            {description && (
              <p className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            )}

          </div>

          <div className="flex flex-col items-end gap-3">

            {condominioNombre && (
              <div className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 shadow-sm">

                <Building2 className="h-5 w-5 text-blue-700" />

                <div>

                  <div className="text-xs text-slate-500">
                    Condominio activo
                  </div>

                  <div className="font-semibold text-slate-800">
                    {condominioNombre}
                  </div>

                </div>

              </div>
            )}

            {showRefresh && (
              <button
                onClick={onRefresh}
                className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
              >
                <RefreshCw className="h-4 w-4" />
                Refrescar
              </button>
            )}

          </div>

        </div>

        {/* Contenido */}
        {children}

      </div>
    </main>
  );
}