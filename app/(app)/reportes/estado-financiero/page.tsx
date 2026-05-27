"use client";

import { useEffect, useState } from "react";
import RoleGuard from "../../RoleGuard";
import { supabase } from "@/app/lib/supabaseClient";

import {
  Building2,
  Wallet,
  TrendingUp,
  TrendingDown,
  Landmark,
  PiggyBank,
  Scale,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

export default function EstadoFinancieroPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const [balanceInicial, setBalanceInicial] = useState(0);
  const [ingresos, setIngresos] = useState(0);
  const [gastos, setGastos] = useState(0);
  const [cajaChica, setCajaChica] = useState(0);
  const [morosidad, setMorosidad] = useState(0);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id && nombre) {
      cargarEstadoFinanciero(id, nombre, anio);
    }
  }, []);

  async function cargarEstadoFinanciero(
    id: string,
    nombreCondominio: string,
    anioSeleccionado: number
  ) {
    setLoading(true);

    const fechaInicio = `${anioSeleccionado}-01-01`;
    const fechaFin = `${anioSeleccionado}-12-31`;

    const { data: balanceData } = await supabase
      .from("balances_banco")
      .select("balance_inicial")
      .eq("condominio_id", Number(id))
      .eq("anio", anioSeleccionado)
      .maybeSingle();

    const balanceInicialBanco = Number(balanceData?.balance_inicial || 0);

    const { data: pagos } = await supabase
      .from("pagos")
      .select("monto")
      .eq("condominio_id", Number(id))
      .gte("fecha_pago", fechaInicio)
      .lte("fecha_pago", fechaFin);

    const { data: gastosData } = await supabase
      .from("gastos")
      .select("total")
      .eq("condominio_id", Number(id))
      .gte("fecha_pago", fechaInicio)
      .lte("fecha_pago", fechaFin);

    const { data: cajaData } = await supabase
      .from("caja_chica")
      .select("monto")
      .ilike("condominio", `%${nombreCondominio}%`)
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin);

    const totalIngresos =
      pagos?.reduce((sum: number, item: any) => sum + Number(item.monto || 0), 0) ||
      0;

    const totalGastos =
      gastosData?.reduce(
        (sum: number, item: any) => sum + Number(item.total || 0),
        0
      ) || 0;

    const totalCaja =
      cajaData?.reduce((sum: number, item: any) => sum + Number(item.monto || 0), 0) ||
      0;

    setBalanceInicial(balanceInicialBanco);
    setIngresos(totalIngresos);
    setGastos(totalGastos);
    setCajaChica(totalCaja);

    setMorosidad(totalIngresos * 0.15);
    setLoading(false);
  }

  function cambiarAnio(valor: string) {
    const nuevoAnio = Number(valor);
    setAnio(nuevoAnio);

    if (condominioId && condominioNombre) {
      cargarEstadoFinanciero(condominioId, condominioNombre, nuevoAnio);
    }
  }

  function dinero(valor: number) {
    return valor.toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  function exportarExcel() {
    const balanceActual = balanceInicial + ingresos - gastos - cajaChica;
    const resultadoNeto = ingresos - gastos - cajaChica;

    let csv = "Concepto,Valor\n";
    csv += `Balance Inicial Banco,${balanceInicial}\n`;
    csv += `Ingresos,${ingresos}\n`;
    csv += `Gastos,${gastos}\n`;
    csv += `Caja Chica,${cajaChica}\n`;
    csv += `Balance Actual Banco,${balanceActual}\n`;
    csv += `Morosidad Estimada,${morosidad}\n`;
    csv += `Resultado Neto,${resultadoNeto}\n`;

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `estado-financiero-${anio}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  const balanceActual = balanceInicial + ingresos - gastos - cajaChica;
  const resultadoNeto = ingresos - gastos - cajaChica;
  const positivo = resultadoNeto >= 0;
  const bancoPositivo = balanceActual >= 0;

  return (
    <RoleGuard
      roles={["Super Admin", "Administrador", "Tesorero", "Presidente"]}
    >
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900">
              Estado Financiero
            </h1>

            <p className="text-slate-500 mt-2">
              Balance inicial + ingresos - gastos - caja chica = balance actual.
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <div className="flex items-end gap-3">
              <div>
                <label className="text-sm font-semibold block mb-2">Año</label>

                <select
                  value={anio}
                  onChange={(e) => cambiarAnio(e.target.value)}
                  className="border rounded-xl px-4 py-2"
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={exportarExcel}
                className="bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2"
              >
                <BarChart3 className="w-5 h-5" />
                Exportar Excel
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-2xl">
            <Building2 className="w-8 h-8 text-blue-700" />
          </div>

          <div>
            <p className="text-sm text-slate-500">Condominio activo</p>
            <h2 className="font-bold text-lg">{condominioNombre}</h2>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-10 shadow-sm border">
            Cargando estado financiero...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <Card
                title="Balance inicial banco"
                value={dinero(balanceInicial)}
                icon={<Landmark className="w-7 h-7" />}
                color="blue"
              />

              <Card
                title="Ingresos"
                value={dinero(ingresos)}
                icon={<TrendingUp className="w-7 h-7" />}
                color="green"
              />

              <Card
                title="Gastos"
                value={dinero(gastos)}
                icon={<TrendingDown className="w-7 h-7" />}
                color="red"
              />

              <Card
                title="Caja Chica"
                value={dinero(cajaChica)}
                icon={<PiggyBank className="w-7 h-7" />}
                color="amber"
              />

              <Card
                title="Balance actual banco"
                value={dinero(balanceActual)}
                icon={<Wallet className="w-7 h-7" />}
                color={bancoPositivo ? "blue" : "red"}
              />

              <Card
                title="Resultado neto"
                value={dinero(resultadoNeto)}
                icon={<Scale className="w-7 h-7" />}
                color={positivo ? "green" : "red"}
              />
            </div>

            <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
              <div className="bg-slate-900 text-white px-6 py-4">
                <h2 className="text-xl font-black">
                  Estado Financiero General
                </h2>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <tbody>
                    <Fila label="Balance inicial banco" valor={balanceInicial} color="blue" />
                    <Fila label="Total ingresos" valor={ingresos} color="green" />
                    <Fila label="Total gastos" valor={gastos} color="red" />
                    <Fila label="Caja chica" valor={cajaChica} color="amber" />
                    <Fila label="Balance actual banco" valor={balanceActual} color={bancoPositivo ? "blue" : "red"} />
                    <Fila label="Morosidad estimada" valor={morosidad} color="red" />

                    <tr className="bg-slate-50">
                      <td className="p-5 font-black text-lg">Resultado neto</td>
                      <td
                        className={`p-5 text-right font-black text-xl ${
                          positivo ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        RD$ {dinero(resultadoNeto)}
                      </td>
                    </tr>

                    <tr>
                      <td className="p-5 font-black">Estado financiero</td>
                      <td className="p-5 text-right">
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-black ${
                            positivo
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {positivo ? "SUPERÁVIT" : "DÉFICIT"}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}

function Fila({
  label,
  valor,
  color,
}: {
  label: string;
  valor: number;
  color: "green" | "red" | "blue" | "amber";
}) {
  const colores = {
    green: "text-green-700",
    red: "text-red-700",
    blue: "text-blue-700",
    amber: "text-amber-700",
  };

  return (
    <tr className="border-b">
      <td className="p-5 font-semibold">{label}</td>
      <td className={`p-5 text-right font-black ${colores[color]}`}>
        RD$ {Number(valor || 0).toLocaleString("es-DO", {
          minimumFractionDigits: 2,
        })}
      </td>
    </tr>
  );
}

function Card({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: "green" | "red" | "blue" | "amber";
}) {
  const colores = {
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="bg-white border rounded-3xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm">{title}</p>
          <h2 className="text-3xl font-black mt-2">RD$ {value}</h2>
        </div>

        <div className={`p-4 rounded-2xl ${colores[color]}`}>{icon}</div>
      </div>
    </div>
  );
}