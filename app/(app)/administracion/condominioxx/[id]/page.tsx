"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";
import VamHeader from "@/components/vam/layout/VamHeader";
import VamLoading from "@/components/vam/shared/VamLoading";

type Condominio = {
  id: number;
  nombre?: string | null;
  rnc?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  estado?: string | null;
  created_at?: string | null;
};

export default function DetalleCondominioPage() {
  const params = useParams();
  const id = params.id as string;

  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  async function cargarCondominio() {
    setCargando(true);
    setError("");

    const { data, error } = await supabase
      .from("condominios")
      .select("*")
      .eq("id", Number(id))
      .single();

    if (error) {
      setError(error.message);
      setCondominio(null);
    } else {
      setCondominio(data as Condominio);
    }

    setCargando(false);
  }

  useEffect(() => {
    if (id) cargarCondominio();
  }, [id]);

  if (cargando) {
    return (
      <main className="p-4 md:p-6">
        <VamLoading text="Cargando información del condominio..." />
      </main>
    );
  }

  return (
    <main className="p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <VamHeader
          title="Detalle del Condominio"
          subtitle="Consulta general del condominio seleccionado."
          badge="Administración"
        />

        <Link
          href="/condominios"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Condominios
        </Link>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!condominio ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            No se encontró el condominio.
          </div>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Building2 className="h-8 w-8" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {condominio.nombre || "Condominio sin nombre"}
                </h2>
                <p className="text-sm text-slate-500">
                  ID: {condominio.id}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Campo label="RNC" value={condominio.rnc} />
              <Campo label="Teléfono" value={condominio.telefono} />
              <Campo label="Email" value={condominio.email} />
              <Campo label="Estado" value={condominio.estado || "Activo"} />
              <Campo label="Dirección" value={condominio.direccion} full />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Campo({
  label,
  value,
  full,
}: {
  label: string;
  value?: string | null;
  full?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 p-4 ${full ? "md:col-span-2" : ""}`}>
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value || "-"}</p>
    </div>
  );
}