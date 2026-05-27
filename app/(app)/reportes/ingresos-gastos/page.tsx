"use client";

import { useEffect, useState } from "react";
import RoleGuard from "../../RoleGuard";
import { supabase } from "@/app/lib/supabaseClient";

type Pago = {
  id: number;
  fecha_pago: string | null;
  created_at?: string;
  monto: number;
  metodo_pago?: string;
  referencia?: string;
  no_apartamento?: string;
  nombre_propietario?: string;
};

type Gasto = {
  id: number;
  fecha_pago?: string | null;
  fecha?: string | null;
  created_at?: string;
  proveedor?: string;
  concepto?: string;
  categoria?: string;
  numero_cheque?: string;
  total: number;
};

type MesResumen = {
  numero: number;
  nombre: string;
  ingresos: number;
  gastos: number;
  resultado: number;
  acumulado: number;
};

const meses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function fechaInicioMes(anio: number, mes: number) {
  return new Date(anio, mes - 1, 1).toISOString().split("T")[0];
}

function fechaFinMes(anio: number, mes: number) {
  return new Date(anio, mes, 0).toISOString().split("T")[0];
}

function obtenerMes(fechaTexto?: string | null) {
  if (!fechaTexto) return 0;

  const fecha = new Date(`${fechaTexto}T00:00:00`);
  return fecha.getMonth() + 1;
}

export default function ReporteIngresosGastosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const [resumen, setResumen] = useState<MesResumen[]>([]);
  const [mesSeleccionado, setMesSeleccionado] = useState<number | null>(null);
  const [pagosMes, setPagosMes] = useState<Pago[]>([]);
  const [gastosMes, setGastosMes] = useState<Gasto[]>([]);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarResumen(id, anio);
    }
  }, []);

  async function cargarResumen(id: string, anioSeleccionado: number) {
    setLoading(true);

    const fechaInicio = `${anioSeleccionado}-01-01`;
    const fechaFin = `${anioSeleccionado}-12-31`;

    const { data: pagos, error: pagosError } = await supabase
      .from("pagos")
      .select(`
        id,
        fecha_pago,
        created_at,
        monto
      `)
      .eq("condominio_id", Number(id))
      .gte("fecha_pago", fechaInicio)
      .lte("fecha_pago", fechaFin);

    if (pagosError) {
      setLoading(false);
      alert("Error cargando ingresos: " + pagosError.message);
      return;
    }

    const { data: gastos, error: gastosError } = await supabase
      .from("gastos")
      .select(`
        id,
        fecha_pago,
        fecha,
        created_at,
        total
      `)
      .eq("condominio_id", Number(id))
      .gte("fecha_pago", fechaInicio)
      .lte("fecha_pago", fechaFin);

    if (gastosError) {
      setLoading(false);
      alert("Error cargando gastos: " + gastosError.message);
      return;
    }

    let acumulado = 0;

    const resumenMeses = meses.map((nombreMes, index) => {
      const mesActual = index + 1;

      const ingresos =
        pagos
          ?.filter((p: any) => {
            const fechaBase = p.fecha_pago || p.created_at;
            return obtenerMes(fechaBase) === mesActual;
          })
          .reduce(
            (sum: number, p: any) => sum + Number(p.monto || 0),
            0
          ) || 0;

      const gastosMes =
        gastos
          ?.filter((g: any) => {
            const fechaBase = g.fecha_pago || g.fecha || g.created_at;
            return obtenerMes(fechaBase) === mesActual;
          })
          .reduce(
            (sum: number, g: any) => sum + Number(g.total || 0),
            0
          ) || 0;

      const resultado = ingresos - gastosMes;
      acumulado += resultado;

      return {
        numero: mesActual,
        nombre: nombreMes,
        ingresos,
        gastos: gastosMes,
        resultado,
        acumulado,
      };
    });

    setResumen(resumenMeses);
    setLoading(false);
  }

  async function verDetalleMes(mes: number) {
    setMesSeleccionado(mes);

    const fechaInicio = fechaInicioMes(anio, mes);
    const fechaFin = fechaFinMes(anio, mes);

    const { data: pagos, error: pagosError } = await supabase
      .from("pagos")
      .select(`
        id,
        fecha_pago,
        created_at,
        monto,
        metodo_pago,
        referencia,
        unidad_id
      `)
      .eq("condominio_id", Number(condominioId))
      .gte("fecha_pago", fechaInicio)
      .lte("fecha_pago", fechaFin)
      .order("fecha_pago", { ascending: false });

    if (pagosError) {
      alert("Error cargando detalle de ingresos: " + pagosError.message);
      return;
    }

    const { data: gastos, error: gastosError } = await supabase
      .from("gastos")
      .select(`
        id,
        fecha_pago,
        fecha,
        created_at,
        proveedor,
        concepto,
        categoria,
        numero_cheque,
        total
      `)
      .eq("condominio_id", Number(condominioId))
      .gte("fecha_pago", fechaInicio)
      .lte("fecha_pago", fechaFin)
      .order("fecha_pago", { ascending: false });

    if (gastosError) {
      alert("Error cargando detalle de gastos: " + gastosError.message);
      return;
    }

    setPagosMes(pagos || []);
    setGastosMes(gastos || []);
  }

  function cambiarAnio(valor: string) {
    const nuevoAnio = Number(valor);
    setAnio(nuevoAnio);
    setMesSeleccionado(null);
    setPagosMes([]);
    setGastosMes([]);

    if (condominioId) {
      cargarResumen(condominioId, nuevoAnio);
    }
  }

  const totalIngresos = resumen.reduce((sum, r) => sum + r.ingresos, 0);
  const totalGastos = resumen.reduce((sum, r) => sum + r.gastos, 0);
  const resultadoAnual = totalIngresos - totalGastos;

  const totalIngresosMes = pagosMes.reduce(
    (sum, p) => sum + Number(p.monto || 0),
    0
  );

  const totalGastosMes = gastosMes.reduce(
    (sum, g) => sum + Number(g.total || 0),
    0
  );

  return (
    <RoleGuard
      roles={[
        "Super Admin",
        "Administrador",
        "Tesorero",
        "Presidente",
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reporte Ingresos y Gastos</h1>
          <p className="text-slate-500">
            Análisis financiero anual y detalle mensual del condominio.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Condominio activo
          </p>
          <p className="font-bold text-slate-800 mt-1">
            {condominioNombre || "No seleccionado"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <label className="block text-sm font-semibold mb-2">Año</label>
          <select
            value={anio}
            onChange={(e) => cambiarAnio(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full md:w-52"
          >
            {[2024, 2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            title="Ingresos del año"
            value={`RD$ ${totalIngresos.toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}`}
            color="text-green-700"
          />

          <Card
            title="Gastos del año"
            value={`RD$ ${totalGastos.toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}`}
            color="text-red-700"
          />

          <Card
            title="Resultado anual"
            value={`RD$ ${resultadoAnual.toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}`}
            color={resultadoAnual >= 0 ? "text-blue-700" : "text-red-800"}
          />
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h2 className="text-xl font-bold mb-4">Resumen mensual</h2>

          {loading ? (
            <p>Cargando reporte...</p>
          ) : (
            <div className="overflow-auto border rounded-xl">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3 border text-left">Mes</th>
                    <th className="p-3 border text-right">Ingresos</th>
                    <th className="p-3 border text-right">Gastos</th>
                    <th className="p-3 border text-right">Resultado</th>
                    <th className="p-3 border text-right">Acumulado</th>
                    <th className="p-3 border text-center">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {resumen.map((r) => (
                    <tr key={r.numero}>
                      <td className="p-3 border font-semibold">{r.nombre}</td>

                      <td className="p-3 border text-right text-green-700 font-semibold">
                        RD$ {r.ingresos.toLocaleString("es-DO", {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      <td className="p-3 border text-right text-red-700 font-semibold">
                        RD$ {r.gastos.toLocaleString("es-DO", {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      <td
                        className={`p-3 border text-right font-bold ${
                          r.resultado >= 0 ? "text-blue-700" : "text-red-800"
                        }`}
                      >
                        RD$ {r.resultado.toLocaleString("es-DO", {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      <td
                        className={`p-3 border text-right font-bold ${
                          r.acumulado >= 0 ? "text-slate-800" : "text-red-800"
                        }`}
                      >
                        RD$ {r.acumulado.toLocaleString("es-DO", {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      <td className="p-3 border text-center">
                        <button
                          onClick={() => verDetalleMes(r.numero)}
                          className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}

                  <tr className="bg-slate-100 font-bold">
                    <td className="p-3 border">TOTAL</td>
                    <td className="p-3 border text-right text-green-700">
                      RD$ {totalIngresos.toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-3 border text-right text-red-700">
                      RD$ {totalGastos.toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td
                      className={`p-3 border text-right ${
                        resultadoAnual >= 0 ? "text-blue-700" : "text-red-800"
                      }`}
                    >
                      RD$ {resultadoAnual.toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-3 border text-right">-</td>
                    <td className="p-3 border text-center">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {mesSeleccionado && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card
                title={`Ingresos ${meses[mesSeleccionado - 1]}`}
                value={`RD$ ${totalIngresosMes.toLocaleString("es-DO", {
                  minimumFractionDigits: 2,
                })}`}
                color="text-green-700"
              />

              <Card
                title={`Gastos ${meses[mesSeleccionado - 1]}`}
                value={`RD$ ${totalGastosMes.toLocaleString("es-DO", {
                  minimumFractionDigits: 2,
                })}`}
                color="text-red-700"
              />

              <Card
                title="Resultado del mes"
                value={`RD$ ${(totalIngresosMes - totalGastosMes).toLocaleString(
                  "es-DO",
                  {
                    minimumFractionDigits: 2,
                  }
                )}`}
                color={
                  totalIngresosMes - totalGastosMes >= 0
                    ? "text-blue-700"
                    : "text-red-800"
                }
              />
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="text-2xl font-bold mb-4">
                Detalle de ingresos - {meses[mesSeleccionado - 1]}
              </h2>

              <div className="overflow-auto border rounded-xl">
                <table className="min-w-full text-sm">
                  <thead className="bg-green-100">
                    <tr>
                      <th className="p-3 border text-left">Fecha</th>
                      <th className="p-3 border text-left">Apartamento</th>
                      <th className="p-3 border text-left">Propietario</th>
                      <th className="p-3 border text-left">Método</th>
                      <th className="p-3 border text-left">Referencia</th>
                      <th className="p-3 border text-right">Monto</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pagosMes.map((p) => (
                      <tr key={p.id}>
                        <td className="p-3 border">
                          {p.fecha_pago || p.created_at || "-"}
                        </td>
                        <td className="p-3 border">{p.unidad_id || "-"}</td>
                        <td className="p-3 border">
                          {p.nombre_propietario || "-"}
                        </td>
                        <td className="p-3 border">{p.metodo_pago || "-"}</td>
                        <td className="p-3 border">{p.referencia || "-"}</td>
                        <td className="p-3 border text-right font-bold text-green-700">
                          RD$ {Number(p.monto || 0).toLocaleString("es-DO", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}

                    {pagosMes.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-5 border text-center text-slate-500"
                        >
                          No hay ingresos registrados en este mes.
                        </td>
                      </tr>
                    )}

                    <tr className="bg-green-50 font-bold">
                      <td colSpan={5} className="p-3 border text-right">
                        Total ingresos
                      </td>
                      <td className="p-3 border text-right text-green-700">
                        RD$ {totalIngresosMes.toLocaleString("es-DO", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="text-2xl font-bold mb-4">
                Detalle de gastos - {meses[mesSeleccionado - 1]}
              </h2>

              <div className="overflow-auto border rounded-xl">
                <table className="min-w-full text-sm">
                  <thead className="bg-red-100">
                    <tr>
                      <th className="p-3 border text-left">Fecha</th>
                      <th className="p-3 border text-left">Proveedor</th>
                      <th className="p-3 border text-left">Concepto</th>
                      <th className="p-3 border text-left">Categoría</th>
                      <th className="p-3 border text-left">Cheque</th>
                      <th className="p-3 border text-right">Monto</th>
                    </tr>
                  </thead>

                  <tbody>
                    {gastosMes.map((g) => (
                      <tr key={g.id}>
                        <td className="p-3 border">
                          {g.fecha_pago || g.fecha || g.created_at || "-"}
                        </td>
                        <td className="p-3 border">{g.proveedor || "-"}</td>
                        <td className="p-3 border">{g.concepto || "-"}</td>
                        <td className="p-3 border">{g.categoria || "-"}</td>
                        <td className="p-3 border">{g.numero_cheque || "-"}</td>
                        <td className="p-3 border text-right font-bold text-red-700">
                          RD$ {Number(g.total || 0).toLocaleString("es-DO", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}

                    {gastosMes.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-5 border text-center text-slate-500"
                        >
                          No hay gastos registrados en este mes.
                        </td>
                      </tr>
                    )}

                    <tr className="bg-red-50 font-bold">
                      <td colSpan={5} className="p-3 border text-right">
                        Total gastos
                      </td>
                      <td className="p-3 border text-right text-red-700">
                        RD$ {totalGastosMes.toLocaleString("es-DO", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

function Card({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className={`text-2xl font-bold mt-2 ${color}`}>{value}</h2>
    </div>
  );
}