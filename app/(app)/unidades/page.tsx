"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type Unidad = {
  id: number;
  condominio_id: number;
  codigo: string;
  propietario_nombre: string | null;
  cuota_mensual_actual: number | null;
  activa: boolean | null;
};

export default function UnidadesPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      router.push("/login");
      return;
    }

    cargarUnidades(id);
  }, [router]);

  async function cargarUnidades(id: string) {
    setMensaje("Cargando unidades de apartamentos...");

    const { data, error } = await supabase
      .from("unidades")
      .select(
        "id, condominio_id, codigo, propietario_nombre, cuota_mensual_actual, activa"
      )
      .eq("condominio_id", Number(id))
      .order("codigo", { ascending: true });

    if (error) {
      setMensaje("Error Supabase: " + error.message);
      setUnidades([]);
      return;
    }

    setUnidades(data || []);
    setMensaje(`Unidades cargadas: ${data?.length || 0}`);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-2xl shadow-sm p-5">
        <h1 className="text-2xl font-bold text-slate-800">
          Unidades de Apartamentos
        </h1>

        <p className="text-slate-500 mt-1">
          Condominio activo: {condominioNombre || "Sin nombre"}
        </p>

        <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
          {mensaje}
        </div>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b text-sm text-slate-600">
          {unidades.length} apartamentos registrados
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3">Apartamento</th>
                <th className="text-left px-4 py-3">Propietario</th>
                <th className="text-right px-4 py-3">Cuota</th>
                <th className="text-center px-4 py-3">Activa</th>
              </tr>
            </thead>

            <tbody>
              {unidades.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3 font-semibold">{u.codigo}</td>

                  <td className="px-4 py-3">
                    {u.propietario_nombre || "-"}
                  </td>

                  <td className="px-4 py-3 text-right">
                    RD${" "}
                    {Number(u.cuota_mensual_actual || 0).toLocaleString(
                      "es-DO",
                      {
                        minimumFractionDigits: 2,
                      }
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {u.activa ? (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                        Sí
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                        No
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {unidades.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No hay apartamentos para este condominio activo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}