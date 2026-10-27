"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle,
  Home,
  RefreshCw,
  Search,
  XCircle,
  CircleDollarSign,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import PageHeader from "@/components/vam/enterprise/PageHeader";
import StatCard from "@/components/vam/enterprise/StatCard";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import ActionBar from "@/components/vam/enterprise/ActionBar";

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
  const [loading, setLoading] = useState(false);
  const [buscar, setBuscar] = useState("");

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

  async function cargarUnidades(idActivo?: string) {
    const id = idActivo || condominioId || localStorage.getItem("condominio_id");

    if (!id) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setMensaje("Cargando unidades...");

    const { data, error } = await supabase
      .from("unidades")
      .select(
        "id, condominio_id, codigo, propietario_nombre, cuota_mensual_actual, activa"
      )
      .eq("condominio_id", Number(id))
      .order("codigo", { ascending: true });

    setLoading(false);

    if (error) {
      setMensaje("Error Supabase: " + error.message);
      setUnidades([]);
      return;
    }

    setUnidades((data as Unidad[]) || []);
    setMensaje(`Unidades cargadas: ${data?.length || 0}`);
  }

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const unidadesFiltradas = useMemo(() => {
    const texto = buscar.toLowerCase().trim();

    if (!texto) return unidades;

    return unidades.filter((u) => {
      const combinado = `
        ${u.codigo || ""}
        ${u.propietario_nombre || ""}
      `.toLowerCase();

      return combinado.includes(texto);
    });
  }, [unidades, buscar]);

  const activas = unidades.filter((u) => u.activa).length;
  const inactivas = unidades.filter((u) => !u.activa).length;

  const totalCuotas = unidades.reduce(
    (sum, u) => sum + Number(u.cuota_mensual_actual || 0),
    0
  );

  return (
    <PageContainer>
      <PageHeader
        title="Unidades"
        subtitle="Consulta y control de apartamentos o unidades del condominio activo."
        badge="Centro Residencial"
        icon={Home}
        action={
          <button
            type="button"
            onClick={() => cargarUnidades(condominioId)}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Total unidades"
          value={unidades.length}
          subtitle="Registradas"
          icon={Building2}
          tone="blue"
        />

        <StatCard
          title="Activas"
          value={activas}
          subtitle="Disponibles"
          icon={CheckCircle}
          tone="green"
        />

        <StatCard
          title="Inactivas"
          value={inactivas}
          subtitle="No disponibles"
          icon={XCircle}
          tone="red"
        />

        <StatCard
          title="Cuotas"
          value={`RD$ ${dinero(totalCuotas)}`}
          subtitle="Total mensual"
          icon={CircleDollarSign}
          tone="amber"
        />
      </div>

      <SectionCard
        title="Listado de unidades"
        subtitle={`Condominio activo: ${
          condominioNombre || "No seleccionado"
        }`}
      >
        <ActionBar
          search={buscar}
          onSearch={setBuscar}
          placeholder="Buscar apartamento o propietario..."
        >
          <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
            <Search className="h-4 w-4" />
            {mensaje || "Listo"}
          </div>
        </ActionBar>

        <div className="mt-4 overflow-x-auto rounded-2xl border">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">
              Cargando unidades...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Unidad</th>
                  <th className="px-4 py-3 text-left">Propietario</th>
                  <th className="px-4 py-3 text-right">Cuota mensual</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {unidadesFiltradas.map((u) => (
                  <tr key={u.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                          <Home className="h-5 w-5" />
                        </div>

                        <div>
                          <p className="font-black text-slate-900">
                            {u.codigo}
                          </p>
                          <p className="text-xs text-slate-500">
                            ID unidad: {u.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {u.propietario_nombre || "-"}
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-green-700">
                      RD$ {dinero(u.cuota_mensual_actual)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {u.activa ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                          Activa
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                          Inactiva
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {unidadesFiltradas.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay unidades para mostrar en este condominio activo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </SectionCard>
    </PageContainer>
  );
}