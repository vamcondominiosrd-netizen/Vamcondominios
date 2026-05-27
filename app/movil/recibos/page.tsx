"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

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

type Pago = {
  id: number;
  fecha_pago: string;
  metodo_pago: string;
  referencia: string;
  monto: number;
  comprobante_url?: string;
  created_at: string;
};

export default function MovilRecibosPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(
    null
  );

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem("propietario_actual");

    if (!data) {
      router.push("/movil-login");
      return;
    }

    const prop = JSON.parse(data);
    setPropietario(prop);
    consultarPagos(prop);
  }, [router]);

  async function consultarPagos(prop: PropietarioActual) {
    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("pagos")
      .select(`
        id,
        fecha_pago,
        metodo_pago,
        referencia,
        monto,
        comprobante_url,
        created_at
      `)
      .eq("condominio_id", prop.condominio_id)
      .eq("unidad_id", prop.unidad_id)
      .order("fecha_pago", { ascending: false });

    setLoading(false);

    if (error) {
      setMensaje(error.message);
      return;
    }

    setPagos(data || []);
  }

  const totalPagado = pagos.reduce(
    (sum, p) => sum + Number(p.monto || 0),
    0
  );

  if (!propietario) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-slate-950 text-white rounded-3xl p-6 shadow">
          <Link href="/movil" className="text-sm text-amber-300">
            ← Volver
          </Link>

          <h1 className="text-2xl font-bold mt-3">Recibos y Pagos</h1>

          <p className="text-slate-300 text-sm mt-1">
            {propietario.condominio_nombre}
          </p>

          <p className="text-slate-300 text-sm">
            Apto. {propietario.no_apartamento}
          </p>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl p-5 text-center">
            Consultando pagos...
          </div>
        )}

        {mensaje && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-3 text-sm">
            {mensaje}
          </div>
        )}

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Total pagado</p>

          <h2 className="text-3xl font-bold text-green-700 mt-1">
            RD${totalPagado.toLocaleString("es-DO")}
          </h2>
        </div>

        <div className="space-y-4">
          {pagos.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border shadow-sm p-5"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-bold">Pago registrado</p>

                  <p className="text-sm text-slate-500">
                    {new Date(p.fecha_pago).toLocaleDateString("es-DO")}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-green-700">
                    RD${Number(p.monto || 0).toLocaleString("es-DO")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                <div>
                  <p className="text-slate-400">Método</p>
                  <p className="font-semibold">{p.metodo_pago || "-"}</p>
                </div>

                <div>
                  <p className="text-slate-400">Referencia</p>
                  <p className="font-semibold">{p.referencia || "-"}</p>
                </div>
              </div>

              {p.comprobante_url && (
                <a
                  href={p.comprobante_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block bg-slate-900 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Ver comprobante
                </a>
              )}
            </div>
          ))}

          {pagos.length === 0 && !loading && (
            <div className="bg-white rounded-2xl border shadow-sm p-6 text-center text-slate-500">
              No hay pagos registrados para este apartamento.
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 pt-4">
          VAM Administración de Condominios
        </p>
      </div>
    </main>
  );
}