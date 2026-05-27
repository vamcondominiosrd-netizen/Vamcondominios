"use client";

import { useEffect, useState } from "react";
import RoleGuard from "../../RoleGuard";
import { supabase } from "@/app/lib/supabaseClient";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Scale,
  ShieldCheck,
  BarChart3,
} from "lucide-react";

const meses = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

type ResumenMes = {
  ingresosMantenimiento: number;
  ingresosExtraordinarios: number;
  totalIngresos: number;
  chequeCuenta: number;
  cajaChica: number;
  debitoDirecto: number;
  totalGastos: number;
  resultado: number;
};

export default function PresupuestoAnualPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [resumen, setResumen] = useState<Record<number, ResumenMes>>({});

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id && nombre) cargarReporte(id, nombre, anio);
  }, []);

  async function cargarReporte(id: string, nombreCondominio: string, anioSeleccionado: number) {
    setLoading(true);

    const fechaInicio = `${anioSeleccionado}-01-01`;
    const fechaFin = `${anioSeleccionado}-12-31`;

    const { data: pagos } = await supabase
      .from("pagos")
      .select("id, monto, fecha_pago, created_at")
      .eq("condominio_id", Number(id))
      .gte("fecha_pago", fechaInicio)
      .lte("fecha_pago", fechaFin);

    const { data: gastos } = await supabase
      .from("gastos")
      .select("id, total, fecha_pago, fecha, metodo_pago, created_at")
      .eq("condominio_id", Number(id))
      .gte("fecha_pago", fechaInicio)
      .lte("fecha_pago", fechaFin);

    const { data: cajaChicaData } = await supabase
      .from("caja_chica")
      .select("id, fecha, monto, condominio")
      .ilike("condominio", `%${nombreCondominio}%`)
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin);

    const dataResumen: Record<number, ResumenMes> = {};

    for (let mes = 1; mes <= 12; mes++) {
      const pagosMes =
        pagos?.filter((p: any) => {
          const fechaBase = p.fecha_pago || p.created_at;
          const fecha = new Date(`${String(fechaBase).slice(0, 10)}T00:00:00`);
          return fecha.getMonth() + 1 === mes;
        }) || [];

      const gastosMes =
        gastos?.filter((g: any) => {
          const fechaBase = g.fecha_pago || g.fecha || g.created_at;
          const fecha = new Date(`${String(fechaBase).slice(0, 10)}T00:00:00`);
          return fecha.getMonth() + 1 === mes;
        }) || [];

      const cajaMes =
        cajaChicaData?.filter((c: any) => {
          const fecha = new Date(`${String(c.fecha).slice(0, 10)}T00:00:00`);
          return fecha.getMonth() + 1 === mes;
        }) || [];

      const ingresosMantenimiento = pagosMes.reduce(
        (sum: number, p: any) => sum + Number(p.monto || 0),
        0
      );

      const ingresosExtraordinarios = 0;

      const chequeCuenta = gastosMes
        .filter((g: any) => g.metodo_pago === "Cheque")
        .reduce((sum: number, g: any) => sum + Number(g.total || 0), 0);

      const debitoDirecto = gastosMes
        .filter(
          (g: any) =>
            g.metodo_pago === "Débito" ||
            g.metodo_pago === "Debito" ||
            g.metodo_pago === "Débito Directo"
        )
        .reduce((sum: number, g: any) => sum + Number(g.total || 0), 0);

      const cajaChica = cajaMes.reduce(
        (sum: number, c: any) => sum + Number(c.monto || 0),
        0
      );

      const totalIngresos = ingresosMantenimiento + ingresosExtraordinarios;
      const totalGastos = chequeCuenta + debitoDirecto + cajaChica;

      dataResumen[mes] = {
        ingresosMantenimiento,
        ingresosExtraordinarios,
        totalIngresos,
        chequeCuenta,
        cajaChica,
        debitoDirecto,
        totalGastos,
        resultado: totalIngresos - totalGastos,
      };
    }

    setResumen(dataResumen);
    setLoading(false);
  }

  function cambiarAnio(valor: string) {
    const nuevoAnio = Number(valor);
    setAnio(nuevoAnio);

    if (condominioId && condominioNombre) {
      cargarReporte(condominioId, condominioNombre, nuevoAnio);
    }
  }

  function dinero(valor: number) {
    return valor.toLocaleString("es-DO", { minimumFractionDigits: 2 });
  }

  function totalCampo(campo: keyof ResumenMes) {
    return Object.values(resumen).reduce((sum, r) => sum + Number(r[campo] || 0), 0);
  }

  function exportarExcel() {
    let csv = "Concepto," + meses.join(",") + ",TOTAL\n";

    const filas: [string, keyof ResumenMes][] = [
      ["Pago Mes Apto", "ingresosMantenimiento"],
      ["Pago Extraordinario", "ingresosExtraordinarios"],
      ["Total Ingreso Mes", "totalIngresos"],
      ["Vía Cheque Desde Cuenta", "chequeCuenta"],
      ["Débito Directo Desde Cuenta", "debitoDirecto"],
      ["Caja Chica", "cajaChica"],
      ["Total Gasto Mes", "totalGastos"],
      ["Diferencia Mes", "resultado"],
    ];

    filas.forEach(([label, campo]) => {
      const valores = Array.from({ length: 12 }).map(
        (_, i) => Number(resumen[i + 1]?.[campo] || 0)
      );
      const total = valores.reduce((sum, v) => sum + v, 0);
      csv += label + "," + valores.join(",") + "," + total + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `presupuesto-anual-${anio}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  const totalIngresos = totalCampo("totalIngresos");
  const totalGastos = totalCampo("totalGastos");
  const resultadoAnual = totalIngresos - totalGastos;

  return (
    <RoleGuard roles={["Super Admin", "Administrador", "Tesorero", "Presidente"]}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900">
              Presupuesto Anual
            </h1>
            <p className="text-slate-500 mt-2">
              Resumen ejecutivo anual de ingresos, gastos, caja chica y resultado mensual.
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardResumen
            title="Ingresos del año"
            value={`RD$ ${dinero(totalIngresos)}`}
            color="green"
            icon={<TrendingUp className="w-7 h-7" />}
          />

          <CardResumen
            title="Gastos del año"
            value={`RD$ ${dinero(totalGastos)}`}
            color="red"
            icon={<TrendingDown className="w-7 h-7" />}
          />

          <CardResumen
            title="Resultado anual"
            value={`RD$ ${dinero(resultadoAnual)}`}
            color={resultadoAnual >= 0 ? "blue" : "red"}
            icon={<Scale className="w-7 h-7" />}
          />
        </div>

        <div className="bg-white border rounded-3xl shadow-sm overflow-auto">
          {loading ? (
            <div className="p-10">Cargando reporte...</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="p-4 text-left min-w-[260px]">CONCEPTO</th>

                  {meses.map((mes) => (
                    <th key={mes} className="p-4 text-center min-w-[145px]">
                      {mes}
                    </th>
                  ))}

                  <th className="p-4 text-center min-w-[155px]">TOTAL</th>
                </tr>
              </thead>

              <tbody>
                <tr className="bg-green-50">
                  <td className="p-4 font-black text-green-700 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    INGRESOS
                  </td>
                  {Array.from({ length: 13 }).map((_, i) => (
                    <td key={i} className="p-4" />
                  ))}
                </tr>

                <Fila titulo="Pago Mes Apto" campo="ingresosMantenimiento" resumen={resumen} tipo="normal" />
                <Fila titulo="Pago Extraordinario" campo="ingresosExtraordinarios" resumen={resumen} tipo="normal" />
                <Fila titulo="TOTAL INGRESO MES" campo="totalIngresos" resumen={resumen} tipo="ingreso" />

                <tr>
                  <td colSpan={14} className="h-5 bg-white" />
                </tr>

                <tr className="bg-red-50">
                  <td className="p-4 font-black text-red-700 flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    GASTOS
                  </td>
                  {Array.from({ length: 13 }).map((_, i) => (
                    <td key={i} className="p-4" />
                  ))}
                </tr>

                <Fila titulo="Vía Cheque Desde Cuenta" campo="chequeCuenta" resumen={resumen} tipo="normal" />
                <Fila titulo="Débito Directo Desde Cuenta" campo="debitoDirecto" resumen={resumen} tipo="normal" />
                <Fila titulo="Caja Chica" campo="cajaChica" resumen={resumen} tipo="normal" />
                <Fila titulo="TOTAL GASTO MES" campo="totalGastos" resumen={resumen} tipo="gasto" />

                <tr>
                  <td colSpan={14} className="h-5 bg-white" />
                </tr>

                <Fila titulo="DIFERENCIA MES" campo="resultado" resumen={resumen} tipo="resultado" />
                <FilaEstadoFinal resumen={resumen} />
              </tbody>
            </table>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}

function CardResumen({
  title,
  value,
  color,
  icon,
}: {
  title: string;
  value: string;
  color: "green" | "red" | "blue";
  icon: React.ReactNode;
}) {
  const colores = {
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="bg-white border rounded-3xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm">{title}</p>
          <h2 className="text-3xl font-black mt-2">{value}</h2>
        </div>

        <div className={`p-4 rounded-2xl ${colores[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function Fila({
  titulo,
  campo,
  resumen,
  tipo,
}: {
  titulo: string;
  campo: keyof ResumenMes;
  resumen: Record<number, ResumenMes>;
  tipo: "normal" | "ingreso" | "gasto" | "resultado";
}) {
  function dinero(valor: number) {
    return valor.toLocaleString("es-DO", { minimumFractionDigits: 2 });
  }

  const valores = Array.from({ length: 12 }).map(
    (_, i) => Number(resumen[i + 1]?.[campo] || 0)
  );

  const total = valores.reduce((sum, v) => sum + v, 0);

  return (
    <tr
      className={
        tipo === "ingreso"
          ? "bg-green-50 font-black"
          : tipo === "gasto"
          ? "bg-red-50 font-black"
          : tipo === "resultado"
          ? "bg-blue-50 font-black"
          : ""
      }
    >
      <td className="p-4 font-semibold">{titulo}</td>

      {valores.map((valor, i) => (
        <td
          key={i}
          className={`p-4 text-right ${
            tipo === "ingreso"
              ? "text-green-700"
              : tipo === "gasto"
              ? "text-red-700"
              : tipo === "resultado"
              ? valor >= 0
                ? "text-blue-700"
                : "text-red-700"
              : ""
          }`}
        >
          RD$ {dinero(valor)}
        </td>
      ))}

      <td
        className={`p-4 text-right font-black ${
          tipo === "resultado"
            ? total >= 0
              ? "text-blue-700"
              : "text-red-700"
            : ""
        }`}
      >
        RD$ {dinero(total)}
      </td>
    </tr>
  );
}

function FilaEstadoFinal({
  resumen,
}: {
  resumen: Record<number, ResumenMes>;
}) {
  const totalResultado = Object.values(resumen).reduce(
    (sum, item) => sum + Number(item.resultado || 0),
    0
  );

  return (
    <tr className="bg-slate-50">
      <td className="p-4 font-black text-blue-700 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5" />
        ESTADO FINAL
      </td>

      {Array.from({ length: 12 }).map((_, i) => {
        const resultado = resumen[i + 1]?.resultado || 0;
        const positivo = resultado >= 0;

        return (
          <td key={i} className="p-4 text-center">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black ${
                positivo
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {positivo ? "OK" : "ALERTA"}
            </span>
          </td>
        );
      })}

      <td className="p-4 text-center">
        <span
          className={`px-3 py-1 rounded-full text-xs font-black ${
            totalResultado >= 0
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {totalResultado >= 0 ? "SUPERÁVIT" : "DÉFICIT"}
        </span>
      </td>
    </tr>
  );
}