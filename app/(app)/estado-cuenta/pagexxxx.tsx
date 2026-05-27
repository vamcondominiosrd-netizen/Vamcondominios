"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import * as XLSX from "xlsx";

type PagoMantenimiento = {
  id: number;
  condominio: string;
  no_apartamento: string;
  fecha_pago: string;
  mes_pagado: string;
  monto_pagado: number;
  metodo_pago: string;
  no_referencia: string;
  descripcion: string;
  comprobante_url: string;
  estado: string;
};

export default function EstadoCuentaPage() {
  const [pagos, setPagos] = useState<PagoMantenimiento[]>([]);
  const [loading, setLoading] = useState(false);

  const [condominio, setCondominio] = useState("");
  const [noApartamento, setNoApartamento] = useState("");
  const [anio, setAnio] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    cargarPagos();
  }, []);

  async function cargarPagos() {
    setLoading(true);

    const { data, error } = await supabase
      .from("pagos_mantenimiento")
      .select(
        "id, condominio, no_apartamento, fecha_pago, mes_pagado, monto_pagado, metodo_pago, no_referencia, descripcion, comprobante_url, estado"
      )
      .order("fecha_pago", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando pagos: " + error.message);
      return;
    }

    setPagos(data || []);
  }

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

  function cuotaMensual(condominio: string) {
    if (condominio === "Lote 9") return 4500;
    if (condominio === "Lote 11") return 4000;
    return 0;
  }

  const pagosFiltrados = pagos.filter((p) => {
    const cumpleCondominio = condominio === "" || p.condominio === condominio;
    const cumpleApartamento =
      noApartamento === "" ||
      p.no_apartamento.toLowerCase().includes(noApartamento.toLowerCase());

    return cumpleCondominio && cumpleApartamento;
  });

  const totalPagado = pagosFiltrados.reduce(
    (sum, p) => sum + Number(p.monto_pagado || 0),
    0
  );

  const cuota = cuotaMensual(condominio);

  const mesesPagados = new Set(pagosFiltrados.map((p) => p.mes_pagado));

  const mesesPendientes =
    condominio && noApartamento
      ? meses.filter((m) => !mesesPagados.has(m))
      : [];

  const totalEsperado =
    condominio && noApartamento ? meses.length * cuota : 0;

  const balancePendiente =
    condominio && noApartamento ? totalEsperado - totalPagado : 0;

  function exportarExcel() {
    if (!condominio || !noApartamento) {
      alert("Debe seleccionar condominio y digitar apartamento.");
      return;
    }

    const dataExcel = [
      {
        Condominio: condominio,
        Apartamento: noApartamento,
        Año: anio,
        "Cuota Mensual RD$": cuota,
        "Total Esperado RD$": totalEsperado,
        "Total Pagado RD$": totalPagado,
        "Balance Pendiente RD$": balancePendiente,
      },
      {},
      ...pagosFiltrados.map((p) => ({
        Condominio: p.condominio,
        Apartamento: p.no_apartamento,
        "Fecha Pago": p.fecha_pago,
        "Mes Pagado": p.mes_pagado,
        "Monto Pagado RD$": Number(p.monto_pagado || 0),
        "Método Pago": p.metodo_pago,
        Referencia: p.no_referencia,
        Descripción: p.descripcion,
        Estado: p.estado,
        "URL Comprobante": p.comprobante_url || "",
      })),
    ];

    const hoja = XLSX.utils.json_to_sheet(dataExcel);

    hoja["!cols"] = [
      { wch: 18 },
      { wch: 16 },
      { wch: 12 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 22 },
      { wch: 45 },
      { wch: 15 },
      { wch: 60 },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Estado de Cuenta");

    XLSX.writeFile(
      libro,
      `Estado_Cuenta_${condominio}_${noApartamento}_${anio}.xlsx`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Estado de Cuenta</h1>
          <p className="text-slate-500">
            Consulta de pagos, meses pagados y balance pendiente por apartamento.
          </p>
        </div>

        <button
          onClick={exportarExcel}
          className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800"
        >
          Exportar a Excel
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Buscar apartamento</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Condominio
            </label>
            <select
              value={condominio}
              onChange={(e) => setCondominio(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">Seleccione condominio</option>
              <option value="Lote 9">Lote 9</option>
              <option value="Lote 11">Lote 11</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Apartamento
            </label>
            <input
              type="text"
              value={noApartamento}
              onChange={(e) => setNoApartamento(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Ej. A1, B2, L11 C3"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Año</label>
            <input
              type="number"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="2026"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={cargarPagos}
              className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 w-full"
            >
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {condominio && noApartamento && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-sm text-slate-500">Cuota mensual</p>
              <h2 className="text-2xl font-bold">
                RD$
                {cuota.toLocaleString("es-DO", {
                  minimumFractionDigits: 2,
                })}
              </h2>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total pagado</p>
              <h2 className="text-2xl font-bold text-green-700">
                RD$
                {totalPagado.toLocaleString("es-DO", {
                  minimumFractionDigits: 2,
                })}
              </h2>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total esperado</p>
              <h2 className="text-2xl font-bold text-blue-700">
                RD$
                {totalEsperado.toLocaleString("es-DO", {
                  minimumFractionDigits: 2,
                })}
              </h2>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-sm text-slate-500">Balance pendiente</p>
              <h2
                className={`text-2xl font-bold ${
                  balancePendiente <= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                RD$
                {balancePendiente.toLocaleString("es-DO", {
                  minimumFractionDigits: 2,
                })}
              </h2>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Meses pendientes</h2>

            {mesesPendientes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {mesesPendientes.map((m) => (
                  <span
                    key={m}
                    className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold"
                  >
                    {m}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-green-700 font-semibold">
                No hay meses pendientes.
              </p>
            )}
          </div>
        </>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Historial de pagos</h2>

        {loading ? (
          <p>Cargando pagos...</p>
        ) : (
          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Condominio</th>
                  <th className="p-2 border">Apartamento</th>
                  <th className="p-2 border">Fecha Pago</th>
                  <th className="p-2 border">Mes Pagado</th>
                  <th className="p-2 border">Monto</th>
                  <th className="p-2 border">Método</th>
                  <th className="p-2 border">Referencia</th>
                  <th className="p-2 border">Comprobante</th>
                  <th className="p-2 border">Estado</th>
                </tr>
              </thead>

              <tbody>
                {pagosFiltrados.map((p) => (
                  <tr key={p.id}>
                    <td className="p-2 border font-semibold">{p.condominio}</td>
                    <td className="p-2 border font-semibold">
                      {p.no_apartamento}
                    </td>
                    <td className="p-2 border">{p.fecha_pago}</td>
                    <td className="p-2 border">{p.mes_pagado}</td>
                    <td className="p-2 border text-right">
                      RD$
                      {Number(p.monto_pagado).toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-2 border">{p.metodo_pago}</td>
                    <td className="p-2 border">{p.no_referencia}</td>
                    <td className="p-2 border text-center">
                      {p.comprobante_url ? (
                        <a
                          href={p.comprobante_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-slate-900 text-white px-3 py-1 rounded-lg inline-block"
                        >
                          Ver comprobante
                        </a>
                      ) : (
                        <span className="text-slate-400">Sin comprobante</span>
                      )}
                    </td>
                    <td className="p-2 border text-green-700 font-semibold">
                      {p.estado}
                    </td>
                  </tr>
                ))}

                {pagosFiltrados.length === 0 && (
                  <tr>
                    <td className="p-4 border text-center" colSpan={9}>
                      No hay pagos registrados para este apartamento.
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