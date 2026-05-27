"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Cargo = {
  id: number;
  periodo: string;
  monto_base: number;
  recargo_aplicado: number;
  balance: number;
  estado: string;
  unidades: {
    codigo: string;
  };
};

type Unidad = {
  id: number;
  codigo: string;
  cuota_mensual_actual: number;
};

type Condominio = {
  id: number;
  nombre: string;
  mora_porcentaje: number;
};

export default function CargosPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [condominio, setCondominio] = useState<Condominio | null>(null);

  const [periodo, setPeriodo] = useState("");

  const condominioId =
    typeof window !== "undefined"
      ? localStorage.getItem("condominio_id")
      : null;

  useEffect(() => {
    if (!condominioId) {
      router.push("/login");
      return;
    }

    cargarCondominio();
    cargarUnidades();
    cargarCargos();
  }, []);

  async function cargarCondominio() {
    const { data } = await supabase
      .from("condominios")
      .select("*")
      .eq("id", Number(condominioId))
      .single();

    if (data) {
      setCondominio(data);
    }
  }

  async function cargarUnidades() {
    const { data } = await supabase
      .from("unidades")
      .select(`
        id,
        codigo,
        cuota_mensual_actual
      `)
      .eq("condominio_id", Number(condominioId))
      .eq("activa", true)
      .order("codigo");

    setUnidades(data || []);
  }

  async function cargarCargos() {
    setLoading(true);

    const { data } = await supabase
      .from("cargos")
      .select(`
        id,
        periodo,
        monto_base,
        recargo_aplicado,
        balance,
        estado,
        unidades (
          codigo
        )
      `)
      .eq("condominio_id", Number(condominioId))
      .order("fecha_emision", {
        ascending: false,
      });

    setCargos(data || []);

    setLoading(false);
  }

  async function generarCargos() {
    if (!periodo) {
      alert("Debe indicar el período.");
      return;
    }

    if (!unidades.length) {
      alert("No existen unidades.");
      return;
    }

    setLoading(true);

    const cargosInsertar = unidades.map((u) => ({
      condominio_id: Number(condominioId),
      unidad_id: u.id,
      periodo,
      monto_base: Number(u.cuota_mensual_actual || 0),
      recargo_aplicado: 0,
      balance: Number(u.cuota_mensual_actual || 0),
      estado: "Pendiente",
      fecha_vencimiento: new Date(),
    }));

    const { error } = await supabase
      .from("cargos")
      .insert(cargosInsertar);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Cargos generados correctamente.");

    cargarCargos();
  }

  async function aplicarMora() {
    if (!condominio) return;

    const confirmar = confirm(
      `¿Aplicar ${condominio.mora_porcentaje}% de mora?`
    );

    if (!confirmar) return;

    const pendientes = cargos.filter(
      (c) => c.estado === "Pendiente"
    );

    for (const cargo of pendientes) {
      const mora =
        Number(cargo.monto_base) *
        (Number(condominio.mora_porcentaje || 0) / 100);

      const nuevoBalance =
        Number(cargo.balance) + mora;

      await supabase
        .from("cargos")
        .update({
          recargo_aplicado: mora,
          balance: nuevoBalance,
          estado: "En mora",
        })
        .eq("id", cargo.id);
    }

    alert("Mora aplicada correctamente.");

    cargarCargos();
  }

  const totalBalance = cargos.reduce(
    (sum, c) => sum + Number(c.balance || 0),
    0
  );

  const totalMora = cargos.reduce(
    (sum, c) =>
      sum + Number(c.recargo_aplicado || 0),
    0
  );

  const pendientes = cargos.filter(
    (c) => c.estado === "Pendiente"
  ).length;

  const enMora = cargos.filter(
    (c) => c.estado === "En mora"
  ).length;

  const pagados = cargos.filter(
    (c) => c.estado === "Pagado"
  ).length;

  return (
    <div className="space-y-6">

      <div className="bg-white rounded-2xl border shadow-sm p-5">

        <h1 className="text-2xl font-bold text-slate-800">
          Cargos
        </h1>

        <p className="text-slate-500 mt-1">
          Generación y control de cargos mensuales
        </p>

      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-6">

        <h2 className="text-lg font-bold mb-5">
          Generar cargos
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <input
            type="text"
            placeholder="Ejemplo: 2026-05"
            value={periodo}
            onChange={(e) =>
              setPeriodo(e.target.value)
            }
            className="border rounded-xl px-4 py-3"
          />

          <button
            onClick={generarCargos}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white rounded-xl px-5 py-3"
          >
            {loading
              ? "Generando..."
              : "Generar cargos"}
          </button>

          <button
            onClick={aplicarMora}
            className="bg-red-700 hover:bg-red-800 text-white rounded-xl px-5 py-3"
          >
            Aplicar mora
          </button>

        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">
            Pendientes
          </p>

          <h2 className="text-3xl font-bold text-yellow-600 mt-2">
            {pendientes}
          </h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">
            En mora
          </p>

          <h2 className="text-3xl font-bold text-red-600 mt-2">
            {enMora}
          </h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">
            Pagados
          </p>

          <h2 className="text-3xl font-bold text-green-600 mt-2">
            {pagados}
          </h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">
            Total balance
          </p>

          <h2 className="text-3xl font-bold text-slate-800 mt-2">
            RD$ {totalBalance.toLocaleString()}
          </h2>
        </div>

      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

        <div className="p-4 border-b">
          <h2 className="font-bold">
            Listado de cargos
          </h2>
        </div>

        {loading ? (
          <div className="p-6">
            Cargando cargos...
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3">
                    Unidad
                  </th>

                  <th className="text-left px-4 py-3">
                    Período
                  </th>

                  <th className="text-right px-4 py-3">
                    Cuota
                  </th>

                  <th className="text-right px-4 py-3">
                    Mora
                  </th>

                  <th className="text-right px-4 py-3">
                    Balance
                  </th>

                  <th className="text-center px-4 py-3">
                    Estado
                  </th>
                </tr>
              </thead>

              <tbody>

                {cargos.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t hover:bg-slate-50"
                  >

                    <td className="px-4 py-3 font-medium">
                      {c.unidades?.codigo}
                    </td>

                    <td className="px-4 py-3">
                      {c.periodo}
                    </td>

                    <td className="px-4 py-3 text-right">
                      RD$ {Number(c.monto_base).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-right text-red-600">
                      RD$ {Number(c.recargo_aplicado).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-right font-bold">
                      RD$ {Number(c.balance).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-center">

                      {c.estado === "Pagado" ? (
                        <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full">
                          Pagado
                        </span>
                      ) : c.estado === "En mora" ? (
                        <span className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full">
                          En mora
                        </span>
                      ) : (
                        <span className="bg-yellow-100 text-yellow-700 text-xs px-3 py-1 rounded-full">
                          Pendiente
                        </span>
                      )}

                    </td>

                  </tr>
                ))}

                {!loading && cargos.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay cargos registrados.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  );
}