"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { ArrowLeft } from "lucide-react";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string;
  telefono?: string;
  correo?: string;
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

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(valor || 0);
}

export default function EstadoCuentaPropietarioPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(
    null
  );
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("propietario_actual");

    if (!raw) {
      router.push("/movil/propietarios/login");
      return;
    }

    const prop = JSON.parse(raw);
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
      .order("anio", { ascending: true })
      .order("mes", { ascending: true });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando estado de cuenta: " + error.message);
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
    return <div className="p-6 text-center text-slate-500">Cargando...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <header className="bg-slate-950 text-white rounded-3xl p-5 shadow">
        <button
          onClick={() => router.push("/movil/propietarios/dashboard")}
          className="flex items-center gap-2 text-sm text-slate-300 mb-4"
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <p className="text-sm text-slate-300">Estado de cuenta</p>
        <h1 className="text-xl font-bold">{propietario.no_apartamento}</h1>
        <p className="text-xs text-slate-300">
          {propietario.condominio_nombre}
        </p>
      </header>

      {loading && (
        <div className="bg-white rounded-2xl p-5 text-center text-slate-500">
          Consultando estado de cuenta...
        </div>
      )}

      {mensaje && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          {mensaje}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3">
        <ResumenCard
          titulo="Balance pendiente"
          valor={formatoMoneda(balancePendiente)}
          clase={balancePendiente > 0 ? "text-red-700" : "text-green-700"}
        />

        <ResumenCard
          titulo="Total pagado"
          valor={formatoMoneda(totalPagado)}
          clase="text-green-700"
        />

        <ResumenCard
          titulo="Total facturado"
          valor={formatoMoneda(totalFacturado)}
          clase="text-slate-800"
        />

        <ResumenCard
          titulo="Último mes pagado"
          valor={ultimoMesPagado}
          clase="text-blue-700"
        />
      </section>

      <section className="space-y-3">
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
                <p className="font-bold">{formatoMoneda(Number(c.monto))}</p>
              </div>

              <div>
                <p className="text-slate-400">Pagado</p>
                <p className="font-bold text-green-700">
                  {formatoMoneda(Number(c.monto_pagado))}
                </p>
              </div>

              <div>
                <p className="text-slate-400">Balance</p>
                <p className="font-bold text-red-700">
                  {formatoMoneda(Number(c.balance))}
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
      </section>
    </div>
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