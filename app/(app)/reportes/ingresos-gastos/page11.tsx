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

type CuentaBancaria = {
  id: number;
  nombre_banco: string | null;
  numero_cuenta: string | null;
  fondo_inicial: number | null;
  balance_actual: number | null;
  fondo_ordinario: number | null;
  fondo_extraordinario: number | null;
  fondo_reserva: number | null;
};

export default function EstadoFinancieroPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const [balanceInicialBanco, setBalanceInicialBanco] = useState(0);
  const [balanceActualBanco, setBalanceActualBanco] = useState(0);
  const [fondoOrdinario, setFondoOrdinario] = useState(0);
  const [fondoExtraordinario, setFondoExtraordinario] = useState(0);
  const [fondoReserva, setFondoReserva] = useState(0);

  const [ingresos, setIngresos] = useState(0);
  const [gastos, setGastos] = useState(0);
  const [cajaChica, setCajaChica] = useState(0);
  const [morosidad, setMorosidad] = useState(0);

  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
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

    const { data: cuentasData, error: cuentasError } = await supabase
      .from("cuentas_bancarias")
      .select(`
        id,
        nombre_banco,
        numero_cuenta,
        fondo_inicial,
        balance_actual,
        fondo_ordinario,
        fondo_extraordinario,
        fondo_reserva
      `)
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("id", { ascending: true });

    if (cuentasError) {
      setLoading(false);
      alert("Error cargando cuentas bancarias: " + cuentasError.message);
      return;
    }

    const listaCuentas = (cuentasData as CuentaBancaria[]) || [];

    const totalFondoInicial = listaCuentas.reduce(
      (sum, c) => sum + Number(c.fondo_inicial || 0),
      0
    );

    const totalBalanceActualBanco = listaCuentas.reduce(
      (sum, c) => sum + Number(c.balance_actual || 0),
      0
    );

    const totalFondoOrdinario = listaCuentas.reduce(
      (sum, c) => sum + Number(c.fondo_ordinario || 0),
      0
    );

    const totalFondoExtraordinario = listaCuentas.reduce(
      (sum, c) => sum + Number(c.fondo_extraordinario || 0),
      0
    );

    const totalFondoReserva = listaCuentas.reduce(
      (sum, c) => sum + Number(c.fondo_reserva || 0),
      0
    );

    const { data: pagos, error: pagosError } = await supabase
      .from("pagos")
      .select("monto")
      .eq("condominio_id", Number(id))
      .gte("fecha_pago", fechaInicio)
      .lte("fecha_pago", fechaFin);

    if (pagosError) {
      setLoading(false);
      alert("Error cargando ingresos: " + pagosError.message);
      return;
    }

    const { data: gastosData, error: gastosError } = await supabase
      .from("gastos")
      .select("total")
      .eq("condominio_id", Number(id))
      .gte("fecha_pago", fechaInicio)
      .lte("fecha_pago", fechaFin);

    if (gastosError) {
      setLoading(false);
      alert("Error cargando gastos: " + gastosError.message);
      return;
    }

    const { data: cajaData } = await supabase
      .from("caja_chica")
      .select("monto")
      .ilike("condominio", `%${nombreCondominio}%`)
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin);

    const totalIngresos =
      pagos?.reduce(
        (sum: number, item: any) => sum + Number(item.monto || 0),
        0
      ) || 0;

    const totalGastos =
      gastosData?.reduce(
        (sum: number, item: any) => sum + Number(item.total || 0),
        0
      ) || 0;

    const totalCaja =
      cajaData?.reduce(
        (sum: number, item: any) => sum + Number(item.monto || 0),
        0
      ) || 0;

    setCuentas(listaCuentas);

    setBalanceInicialBanco(totalFondoInicial);
    setBalanceActualBanco(totalBalanceActualBanco);
    setFondoOrdinario(totalFondoOrdinario);
    setFondoExtraordinario(totalFondoExtraordinario);
    setFondoReserva(totalFondoReserva);

    setIngresos(totalIngresos);
    setGastos(totalGastos);
    setCajaChica(totalCaja);

    setMorosidad(totalIngresos * 0.15);
    setLoading(false);
  }

  function cambiarAnio(valor: string) {
    const nuevoAnio = Number(valor);
    setAnio(nuevoAnio);

    if (condominioId) {
      cargarEstadoFinanciero(condominioId, condominioNombre, nuevoAnio);
    }
  }

  function dinero(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  function exportarExcel() {
    const balanceCalculadoSistema =
      balanceInicialBanco + ingresos - gastos - cajaChica;

    const resultadoNeto = ingresos - gastos - cajaChica;
    const diferenciaConciliar = balanceActualBanco - balanceCalculadoSistema;

    let csv = "Concepto,Valor\n";
    csv += `Balance Inicial Banco,${balanceInicialBanco}\n`;
    csv += `Ingresos,${ingresos}\n`;
    csv += `Gastos,${gastos}\n`;
    csv += `Caja Chica,${cajaChica}\n`;
    csv += `Balance Calculado Sistema,${balanceCalculadoSistema}\n`;
    csv += `Balance Actual Banco Real,${balanceActualBanco}\n`;
    csv += `Diferencia por Conciliar,${diferenciaConciliar}\n`;
    csv += `Fondo Ordinario,${fondoOrdinario}\n`;
    csv += `Fondo Extraordinario,${fondoExtraordinario}\n`;
    csv += `Fondo Reserva,${fondoReserva}\n`;
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

  const balanceCalculadoSistema =
    balanceInicialBanco + ingresos - gastos - cajaChica;

  const resultadoNeto = ingresos - gastos - cajaChica;
  const diferenciaConciliar = balanceActualBanco - balanceCalculadoSistema;

  const positivo = resultadoNeto >= 0;
  const bancoPositivo = balanceActualBanco >= 0;
  const diferenciaPositiva = diferenciaConciliar >= 0;

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
              Estado financiero del condominio con balance real de cuentas
              bancarias.
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
            <h2 className="font-bold text-lg">
              {condominioNombre || "No seleccionado"}
            </h2>
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
                value={dinero(balanceInicialBanco)}
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
                title="Balance actual banco real"
                value={dinero(balanceActualBanco)}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card
                title="Balance calculado sistema"
                value={dinero(balanceCalculadoSistema)}
                icon={<Scale className="w-7 h-7" />}
                color={balanceCalculadoSistema >= 0 ? "blue" : "red"}
              />

              <Card
                title="Diferencia por conciliar"
                value={dinero(diferenciaConciliar)}
                icon={<AlertTriangle className="w-7 h-7" />}
                color={diferenciaPositiva ? "amber" : "red"}
              />

              <Card
                title="Fondo ordinario"
                value={dinero(fondoOrdinario)}
                icon={<Wallet className="w-7 h-7" />}
                color="green"
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
                    <Fila
                      label="Balance inicial banco"
                      valor={balanceInicialBanco}
                      color="blue"
                    />
                    <Fila label="Total ingresos" valor={ingresos} color="green" />
                    <Fila label="Total gastos" valor={gastos} color="red" />
                    <Fila label="Caja chica" valor={cajaChica} color="amber" />

                    <Fila
                      label="Balance calculado sistema"
                      valor={balanceCalculadoSistema}
                      color={balanceCalculadoSistema >= 0 ? "blue" : "red"}
                    />

                    <Fila
                      label="Balance actual banco real"
                      valor={balanceActualBanco}
                      color={bancoPositivo ? "blue" : "red"}
                    />

                    <Fila
                      label="Diferencia por conciliar"
                      valor={diferenciaConciliar}
                      color={diferenciaPositiva ? "amber" : "red"}
                    />

                    <Fila
                      label="Fondo ordinario"
                      valor={fondoOrdinario}
                      color="green"
                    />

                    <Fila
                      label="Fondo extraordinario"
                      valor={fondoExtraordinario}
                      color="blue"
                    />

                    <Fila
                      label="Fondo reserva"
                      valor={fondoReserva}
                      color="amber"
                    />

                    <Fila
                      label="Morosidad estimada"
                      valor={morosidad}
                      color="red"
                    />

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

            <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
              <div className="bg-blue-900 text-white px-6 py-4">
                <h2 className="text-xl font-black">
                  Cuentas bancarias activas
                </h2>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3 border text-left">Banco</th>
                      <th className="p-3 border text-left">Cuenta</th>
                      <th className="p-3 border text-right">Fondo inicial</th>
                      <th className="p-3 border text-right">Balance actual</th>
                      <th className="p-3 border text-right">Ordinario</th>
                      <th className="p-3 border text-right">Extraordinario</th>
                      <th className="p-3 border text-right">Reserva</th>
                    </tr>
                  </thead>

                  <tbody>
                    {cuentas.map((c) => (
                      <tr key={c.id}>
                        <td className="p-3 border font-semibold">
                          {c.nombre_banco || "-"}
                        </td>
                        <td className="p-3 border">{c.numero_cuenta || "-"}</td>
                        <td className="p-3 border text-right">
                          RD$ {dinero(Number(c.fondo_inicial || 0))}
                        </td>
                        <td className="p-3 border text-right font-bold text-blue-700">
                          RD$ {dinero(Number(c.balance_actual || 0))}
                        </td>
                        <td className="p-3 border text-right text-green-700">
                          RD$ {dinero(Number(c.fondo_ordinario || 0))}
                        </td>
                        <td className="p-3 border text-right">
                          RD$ {dinero(Number(c.fondo_extraordinario || 0))}
                        </td>
                        <td className="p-3 border text-right">
                          RD$ {dinero(Number(c.fondo_reserva || 0))}
                        </td>
                      </tr>
                    ))}

                    {cuentas.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-5 border text-center text-slate-500"
                        >
                          No hay cuentas bancarias activas configuradas para
                          este condominio.
                        </td>
                      </tr>
                    )}

                    <tr className="bg-slate-100 font-bold">
                      <td className="p-3 border" colSpan={3}>
                        TOTAL
                      </td>
                      <td className="p-3 border text-right text-blue-700">
                        RD$ {dinero(balanceActualBanco)}
                      </td>
                      <td className="p-3 border text-right text-green-700">
                        RD$ {dinero(fondoOrdinario)}
                      </td>
                      <td className="p-3 border text-right">
                        RD$ {dinero(fondoExtraordinario)}
                      </td>
                      <td className="p-3 border text-right">
                        RD$ {dinero(fondoReserva)}
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