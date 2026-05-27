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

type Cargo = {
  id: number;
  periodo: string;
  concepto: string;
  tipo_cargo: string;
  monto: number;
  monto_pagado: number;
  balance: number;
  estado: string;
};

export default function MovilEstadoCuentaPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(
    null
  );

  const [cargos, setCargos] = useState<Cargo[]>([]);
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
    cargarEstado(prop);
  }, [router]);

  async function cargarEstado(prop: PropietarioActual) {
    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("cargos_periodicos")
      .select(
        "id, periodo, concepto, tipo_cargo, monto, monto_pagado, balance, estado"
      )
      .eq("condominio_id", prop.condominio_id)
      .eq("unidad_id", prop.unidad_id)
      .order("anio")
      .order("mes");

    setLoading(false);

    if (error) {
      setMensaje(error.message);
      return;
    }

    setCargos(data || []);
  }

  const totalFacturado = cargos.reduce(
    (sum, c) => sum + Number(c.monto || 0),
    0
  );

  const totalPagado = cargos.reduce(
    (sum, c) => sum + Number(c.monto_pagado || 0),
    0
  );

  const balancePendiente = cargos.reduce(
    (sum, c) => sum + Number(c.balance || 0),
    0
  );

  const ultimoMesPagado =
    cargos.filter((c) => c.estado === "PAGADO").slice(-1)[0]?.periodo ||
    "Sin pagos";

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

          <h1 className="text-2xl font-bold mt-3">Estado de Cuenta</h1>

          <p className="text-slate-300 text-sm mt-1">
            {propietario.condominio_nombre}
          </p>

          <p className="text-slate-300 text-sm">
            Apto. {propietario.no_apartamento}
          </p>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl p-5 text-center">
            Consultando estado de cuenta...
          </div>
        )}

        {mensaje && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-3 text-sm">
            {mensaje}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <ResumenCard
            titulo="Balance pendiente"
            valor={`RD$ ${balancePendiente.toLocaleString("es-DO")}`}
            clase="text-red-700"
          />

          <ResumenCard
            titulo="Total pagado"
            valor={`RD$ ${totalPagado.toLocaleString("es-DO")}`}
            clase="text-green-700"
          />

          <ResumenCard
            titulo="Total facturado"
            valor={`RD$ ${totalFacturado.toLocaleString("es-DO")}`}
            clase="text-slate-800"
          />

          <ResumenCard
            titulo="Último mes pagado"
            valor={ultimoMesPagado}
            clase="text-blue-700"
          />
        </div>

        <div className="space-y-3">
          {cargos.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border shadow-sm p-4">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-bold">{c.periodo}</p>
                  <p className="text-sm text-slate-500">{c.concepto}</p>
                  <p className="text-xs text-slate-400">{c.tipo_cargo}</p>
                </div>

                <span
                  className={
                    c.estado === "PAGADO"
                      ? "bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-bold h-fit"
                      : c.estado === "PARCIAL"
                      ? "bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg text-xs font-bold h-fit"
                      : "bg-red-100 text-red-700 px-2 py-1 rounded-lg text-xs font-bold h-fit"
                  }
                >
                  {c.estado}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                <div>
                  <p className="text-slate-400">Facturado</p>
                  <p className="font-bold">
                    RD$ {Number(c.monto).toLocaleString("es-DO")}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400">Pagado</p>
                  <p className="font-bold text-green-700">
                    RD$ {Number(c.monto_pagado).toLocaleString("es-DO")}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400">Balance</p>
                  <p className="font-bold text-red-700">
                    RD$ {Number(c.balance).toLocaleString("es-DO")}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {cargos.length === 0 && !loading && (
            <div className="bg-white rounded-2xl border shadow-sm p-6 text-center text-slate-500">
              No hay cargos registrados para este apartamento.
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

function ResumenCard({
  titulo,
  valor,
  clase,
}: {
  titulo: string;
  valor: string;
  clase: string;
}) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-4">
      <p className="text-sm text-slate-500">{titulo}</p>
      <h2 className={`text-2xl font-bold mt-1 ${clase}`}>{valor}</h2>
    </div>
  );
}