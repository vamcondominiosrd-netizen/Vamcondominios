"use client";

import { CalendarDays } from "lucide-react";

const MESES = [
  ["01", "Enero"],
  ["02", "Febrero"],
  ["03", "Marzo"],
  ["04", "Abril"],
  ["05", "Mayo"],
  ["06", "Junio"],
  ["07", "Julio"],
  ["08", "Agosto"],
  ["09", "Septiembre"],
  ["10", "Octubre"],
  ["11", "Noviembre"],
  ["12", "Diciembre"],
] as const;

export function aniosDisponibles(desde = 2026) {
  const actual = new Date().getFullYear();
  const inicio = Math.min(desde, actual);
  return Array.from({ length: actual - inicio + 1 }, (_, i) => actual - i);
}

export function rangoPeriodo(anio: number, mes: string) {
  if (!mes) {
    return {
      desde: `${anio}-01-01`,
      hasta: `${anio + 1}-01-01`,
      periodoDesde: `${anio}-01`,
      periodoHasta: `${anio}-12`,
    };
  }

  const m = Number(mes);
  const siguiente = m === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: m + 1 };
  return {
    desde: `${anio}-${String(m).padStart(2, "0")}-01`,
    hasta: `${siguiente.anio}-${String(siguiente.mes).padStart(2, "0")}-01`,
    periodoDesde: `${anio}-${String(m).padStart(2, "0")}`,
    periodoHasta: `${anio}-${String(m).padStart(2, "0")}`,
  };
}

export default function FiltroPeriodo({
  anio,
  mes,
  onAnioChange,
  onMesChange,
  permitirTodoElAnio = true,
  etiquetaTodo = "Todo el año",
}: {
  anio: number;
  mes: string;
  onAnioChange: (anio: number) => void;
  onMesChange: (mes: string) => void;
  permitirTodoElAnio?: boolean;
  etiquetaTodo?: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-slate-800">
        <CalendarDays size={18} className="text-blue-800" />
        <h2 className="text-sm font-black">Período de consulta</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Año</span>
          <select
            value={anio}
            onChange={(e) => onAnioChange(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
          >
            {aniosDisponibles().map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Mes</span>
          <select
            value={mes}
            onChange={(e) => onMesChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
          >
            {permitirTodoElAnio && <option value="">{etiquetaTodo}</option>}
            {MESES.map(([valor, nombre]) => (
              <option key={valor} value={valor}>{nombre}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
