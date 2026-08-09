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

type Pago = {
  id: number;
  fecha_pago: string;
  periodo: string | null;
  monto: number;
  referencia: string | null;
  descripcion: string | null;
  metodo: string | null;
  metodo_pago: string | null;
  origen: string | null;
  comprobante_url: string | null;
  periodos_aplicados: string[];
};

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(valor || 0);
}

function formatoFecha(fecha: string) {
  if (!fecha) return "-";

  const [anio, mes, dia] = fecha.split("-").map(Number);
  if (!anio || !mes || !dia) return fecha;

  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(anio, mes - 1, dia));
}

function etiquetaMetodo(pago: Pago) {
  return (
    pago.metodo_pago ||
    pago.metodo ||
    pago.origen ||
    "Pago registrado en VAM"
  );
}

export default function EstadoCuentaPropietarioPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(
    null
  );
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
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

    try {
      const { data: cargosData, error: cargosError } = await supabase
        .from("cargos_periodicos")
        .select(
          "id, periodo, concepto, tipo_cargo, monto, monto_pagado, balance, estado"
        )
        .eq("condominio_id", prop.condominio_id)
        .eq("unidad_id", prop.unidad_id)
        .order("anio", { ascending: true })
        .order("mes", { ascending: true });

      if (cargosError) {
        throw new Error(
          "Error cargando estado de cuenta: " + cargosError.message
        );
      }

      const { data: pagosData, error: pagosError } = await supabase
        .from("pagos")
        .select(
          "id, fecha_pago, periodo, monto, referencia, descripcion, metodo, metodo_pago, origen, comprobante_url"
        )
        .eq("condominio_id", prop.condominio_id)
        .eq("unidad_id", prop.unidad_id)
        .order("fecha_pago", { ascending: false })
        .order("id", { ascending: false });

      if (pagosError) {
        throw new Error("Error cargando pagos: " + pagosError.message);
      }

      const pagosBase = (pagosData || []) as Omit<Pago, "periodos_aplicados">[];
      const pagoIds = pagosBase.map((p) => p.id);

      let periodosPorPago = new Map<number, string[]>();

      if (pagoIds.length > 0) {
        const { data: aplicacionesData, error: aplicacionesError } =
          await supabase
            .from("pagos_aplicaciones")
            .select("pago_id, cargo_periodico_id")
            .in("pago_id", pagoIds);

        if (aplicacionesError) {
          throw new Error(
            "Error cargando aplicaciones de pagos: " +
              aplicacionesError.message
          );
        }

        const aplicaciones = aplicacionesData || [];
        const cargoIds = Array.from(
          new Set(
            aplicaciones
              .map((a: any) => Number(a.cargo_periodico_id))
              .filter((id: number) => Number.isFinite(id))
          )
        );

        const periodoPorCargo = new Map<number, string>();

        if (cargoIds.length > 0) {
          const { data: cargosAplicadosData, error: cargosAplicadosError } =
            await supabase
              .from("cargos_periodicos")
              .select("id, periodo")
              .in("id", cargoIds);

          if (cargosAplicadosError) {
            throw new Error(
              "Error cargando períodos aplicados: " +
                cargosAplicadosError.message
            );
          }

          for (const cargo of cargosAplicadosData || []) {
            periodoPorCargo.set(Number(cargo.id), String(cargo.periodo || ""));
          }
        }

        for (const aplicacion of aplicaciones) {
          const pagoId = Number((aplicacion as any).pago_id);
          const cargoId = Number((aplicacion as any).cargo_periodico_id);
          const periodo = periodoPorCargo.get(cargoId);

          if (!periodo) continue;

          const actuales = periodosPorPago.get(pagoId) || [];
          if (!actuales.includes(periodo)) {
            actuales.push(periodo);
            actuales.sort();
            periodosPorPago.set(pagoId, actuales);
          }
        }
      }

      const pagosConPeriodos: Pago[] = pagosBase.map((p) => ({
        ...p,
        periodos_aplicados:
          periodosPorPago.get(p.id) || (p.periodo ? [p.periodo] : []),
      }));

      setCargos((cargosData || []) as Cargo[]);
      setPagos(pagosConPeriodos);
    } catch (error: any) {
      setMensaje(error?.message || "No se pudo cargar el estado de cuenta.");
      setCargos([]);
      setPagos([]);
    } finally {
      setLoading(false);
    }
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
        <div>
          <h2 className="text-lg font-bold text-slate-900">Mis pagos</h2>
          <p className="text-sm text-slate-500">
            Pagos oficiales registrados en VAM.
          </p>
        </div>

        {pagos.map((pago) => (
          <div
            key={pago.id}
            className="bg-white rounded-2xl border shadow-sm p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">
                  {formatoFecha(pago.fecha_pago)}
                </p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {formatoMoneda(Number(pago.monto))}
                </p>
              </div>

              <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-bold">
                REGISTRADO
              </span>
            </div>

            <div className="mt-3 space-y-1 text-sm">
              {pago.periodos_aplicados.length > 0 && (
                <p>
                  <span className="text-slate-500">Período:</span>{" "}
                  <span className="font-semibold text-slate-800">
                    {pago.periodos_aplicados.join(" • ")}
                  </span>
                </p>
              )}

              <p>
                <span className="text-slate-500">Método:</span>{" "}
                <span className="font-medium text-slate-800">
                  {etiquetaMetodo(pago)}
                </span>
              </p>

              {pago.referencia && (
                <p>
                  <span className="text-slate-500">Referencia:</span>{" "}
                  <span className="font-medium text-slate-800">
                    {pago.referencia}
                  </span>
                </p>
              )}

              {pago.descripcion && (
                <p className="text-slate-600">{pago.descripcion}</p>
              )}
            </div>

            <div className="mt-4">
              {pago.comprobante_url ? (
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      pago.comprobante_url as string,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                  className="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 text-sm active:scale-[0.99]"
                >
                  Ver volante bancario
                </button>
              ) : (
                <div className="w-full rounded-xl bg-slate-100 text-slate-500 py-3 px-3 text-center text-sm">
                  Comprobante no disponible
                </div>
              )}
            </div>
          </div>
        ))}

        {pagos.length === 0 && !loading && (
          <div className="bg-white rounded-2xl border shadow-sm p-6 text-center text-slate-500">
            No hay pagos registrados para este apartamento.
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Estado mensual de cargos
          </h2>
        </div>

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
