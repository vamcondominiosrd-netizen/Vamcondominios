"use client";

/*
 * VAM Administración de Condominios
 * Módulo: Gas / Recibos de consumo
 * Versión: v1.0.0
 * Fecha: 13/10/2026
 *
 * Consulta el detalle congelado en gas_facturacion_unidades.
 * Permite revisar e imprimir el recibo de consumo con:
 * - lectura anterior y actual
 * - fotografías comparativas
 * - consumo
 * - tarifa aplicada
 * - importe
 * - estado del cargo
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

const VERSION = "1.0.0";

type ReciboGas = {
  id: number;
  condominio_id: number;
  unidad_id: number;
  medidor_id: number;
  lectura_id: number;
  precio_id: number;
  proveedor_id: number | null;
  unidad_medida_id: number;
  periodo: string;

  fecha_lectura_anterior: string;
  fecha_lectura: string;
  lectura_anterior: number;
  lectura_actual: number;
  consumo: number;

  precio_unitario: number;
  importe: number;

  foto_anterior_url: string | null;
  foto_actual_url: string | null;

  cargo_periodico_id: number | null;
  estado: string;
  created_at: string;

  unidades?: {
    codigo: string | null;
    propietario_nombre: string | null;
  } | null;

  gas_medidores?: {
    numero_serie: string | null;
  } | null;

  catalogo_proveedores?: {
    nombre_proveedor: string | null;
  } | null;

  gas_unidades_medida?: {
    nombre: string | null;
    abreviatura: string | null;
  } | null;

  cargos_periodicos?: {
    id: number | null;
    monto: number | null;
    monto_pagado: number | null;
    balance: number | null;
    estado: string | null;
    concepto: string | null;
    fecha_emision: string | null;
  } | null;
};

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function numero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function fechaDominicana(fecha: string | null | undefined) {
  if (!fecha) return "-";

  const partes = String(fecha).slice(0, 10).split("-");

  if (partes.length !== 3) return String(fecha);

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function periodoTexto(periodo: string | null | undefined) {
  if (!periodo) return "-";

  const valor = String(periodo).slice(0, 7);
  const [anio, mes] = valor.split("-");

  const nombres = [
    "",
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

  return `${nombres[Number(mes)] || mes} ${anio}`;
}

function noRecibo(recibo: ReciboGas) {
  const periodo = String(recibo.periodo || "")
    .slice(0, 7)
    .replace("-", "");

  return `GAS-${periodo}-${String(recibo.id).padStart(5, "0")}`;
}

export default function GasRecibosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [recibos, setRecibos] = useState<ReciboGas[]>([]);
  const [seleccionado, setSeleccionado] = useState<ReciboGas | null>(null);

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [buscar, setBuscar] = useState("");
  const [periodo, setPeriodo] = useState("TODOS");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
      setMensaje("No hay un condominio activo válido.");
      return;
    }

    void cargarRecibos(id);
  }, []);

  async function cargarRecibos(id: string) {
    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("gas_facturacion_unidades")
      .select(`
        id,
        condominio_id,
        unidad_id,
        medidor_id,
        lectura_id,
        precio_id,
        proveedor_id,
        unidad_medida_id,
        periodo,
        fecha_lectura_anterior,
        fecha_lectura,
        lectura_anterior,
        lectura_actual,
        consumo,
        precio_unitario,
        importe,
        foto_anterior_url,
        foto_actual_url,
        cargo_periodico_id,
        estado,
        created_at,
        unidades(codigo, propietario_nombre),
        gas_medidores(numero_serie),
        catalogo_proveedores(nombre_proveedor),
        gas_unidades_medida(nombre, abreviatura),
        cargos_periodicos(
          id,
          monto,
          monto_pagado,
          balance,
          estado,
          concepto,
          fecha_emision
        )
      `)
      .eq("condominio_id", Number(id))
      .order("periodo", { ascending: false })
      .order("id", { ascending: false });

    setLoading(false);

    if (error) {
      setRecibos([]);
      setMensaje("Error cargando recibos de gas: " + error.message);
      return;
    }

    setRecibos((data as ReciboGas[]) || []);
  }

  const periodosDisponibles = useMemo(() => {
    const valores = Array.from(
      new Set(
        recibos
          .map((r) => String(r.periodo || "").slice(0, 7))
          .filter(Boolean)
      )
    );

    return valores.sort((a, b) => b.localeCompare(a));
  }, [recibos]);

  const recibosFiltrados = useMemo(() => {
    let lista = recibos;

    if (periodo !== "TODOS") {
      lista = lista.filter(
        (r) => String(r.periodo || "").slice(0, 7) === periodo
      );
    }

    const texto = buscar.trim().toLowerCase();

    if (texto) {
      lista = lista.filter((r) => {
        const cadena = `
          ${noRecibo(r)}
          ${r.unidades?.codigo || ""}
          ${r.unidades?.propietario_nombre || ""}
          ${r.gas_medidores?.numero_serie || ""}
          ${r.catalogo_proveedores?.nombre_proveedor || ""}
          ${r.cargos_periodicos?.estado || ""}
        `.toLowerCase();

        return cadena.includes(texto);
      });
    }

    return lista;
  }, [recibos, periodo, buscar]);

  const totalFacturado = recibosFiltrados.reduce(
    (suma, r) => suma + Number(r.importe || 0),
    0
  );

  const totalBalance = recibosFiltrados.reduce(
    (suma, r) => suma + Number(r.cargos_periodicos?.balance || 0),
    0
  );

  function verRecibo(recibo: ReciboGas) {
    setSeleccionado(recibo);

    setTimeout(() => {
      document
        .getElementById("recibo-gas-detalle")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function imprimirRecibo() {
    if (!seleccionado) return;
    window.print();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .print-only-receipt {
            display: block !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-only-receipt img {
            max-height: 230px !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="no-print rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
                Módulo de Gas
              </p>

              <h1 className="mt-1 text-3xl font-black text-slate-900">
                Recibos de Consumo
              </h1>

              <p className="mt-1 text-xs text-slate-400">
                Gas · Recibos v{VERSION}
              </p>

              <p className="mt-2 max-w-3xl text-slate-500">
                Consulte el detalle facturado de cada apartamento con sus
                lecturas, fotografías, tarifa aplicada, importe y estado del
                cargo.
              </p>

              <p className="mt-3 text-sm font-bold text-blue-700">
                Condominio activo: {condominioNombre || "No seleccionado"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/gas/consumos"
                className="rounded-xl bg-orange-700 px-4 py-2 font-bold text-white hover:bg-orange-800"
              >
                Consumos
              </Link>

              <Link
                href="/gas"
                className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-white hover:bg-slate-900"
              >
                Volver a Gas
              </Link>

              <button
                type="button"
                disabled={!condominioId || loading}
                onClick={() => void cargarRecibos(condominioId)}
                className="rounded-xl bg-blue-700 px-4 py-2 font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                Actualizar
              </button>
            </div>
          </div>
        </section>

        {mensaje && (
          <div className="no-print rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {mensaje}
          </div>
        )}

        <section className="no-print grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Recibos mostrados</p>
            <p className="text-3xl font-black text-slate-900">
              {recibosFiltrados.length}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total facturado</p>
            <p className="text-3xl font-black text-blue-700">
              RD$ {dinero(totalFacturado)}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Balance pendiente</p>
            <p className="text-3xl font-black text-orange-700">
              RD$ {dinero(totalBalance)}
            </p>
          </div>
        </section>

        <section className="no-print rounded-3xl border bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold">
                Período
              </label>

              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3"
              >
                <option value="TODOS">Todos</option>

                {periodosDisponibles.map((p) => (
                  <option key={p} value={p}>
                    {periodoTexto(p)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold">
                Buscar
              </label>

              <input
                type="text"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
                placeholder="Apartamento, propietario, medidor o recibo..."
              />
            </div>
          </div>
        </section>

        {seleccionado && (
          <section
            id="recibo-gas-detalle"
            className="print-only-receipt rounded-3xl border bg-white p-6 shadow-sm"
          >
            <div className="mb-6 flex flex-col gap-4 border-b pb-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-blue-700">
                  {condominioNombre || "Condominio"}
                </p>

                <h2 className="mt-1 text-3xl font-black text-slate-900">
                  Recibo de Consumo de Gas
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  No. {noRecibo(seleccionado)}
                </p>
              </div>

              <div className="text-left text-sm md:text-right">
                <p>
                  <strong>Período:</strong>{" "}
                  {periodoTexto(seleccionado.periodo)}
                </p>
                <p className="mt-1">
                  <strong>Fecha emisión:</strong>{" "}
                  {fechaDominicana(
                    seleccionado.cargos_periodicos?.fecha_emision ||
                      seleccionado.created_at
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Apartamento
                </p>
                <p className="mt-1 text-2xl font-black">
                  {seleccionado.unidades?.codigo || "-"}
                </p>
              </div>

              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Propietario
                </p>
                <p className="mt-1 font-black">
                  {seleccionado.unidades?.propietario_nombre ||
                    "Sin propietario"}
                </p>
              </div>

              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Medidor
                </p>
                <p className="mt-1 font-black">
                  {seleccionado.gas_medidores?.numero_serie || "-"}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="rounded-3xl border p-5">
                <h3 className="text-lg font-black text-slate-900">
                  Lectura anterior
                </h3>

                <p className="mt-3 text-3xl font-black text-slate-800">
                  {numero(seleccionado.lectura_anterior)}{" "}
                  {seleccionado.gas_unidades_medida?.abreviatura || ""}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {fechaDominicana(seleccionado.fecha_lectura_anterior)}
                </p>

                <div className="mt-4">
                  {seleccionado.foto_anterior_url ? (
                    <img
                      src={seleccionado.foto_anterior_url}
                      alt="Foto de lectura anterior"
                      className="h-56 w-full rounded-2xl border bg-slate-50 object-contain"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-2xl border bg-slate-50 text-sm text-slate-500">
                      Sin fotografía anterior
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border p-5">
                <h3 className="text-lg font-black text-slate-900">
                  Lectura actual
                </h3>

                <p className="mt-3 text-3xl font-black text-blue-700">
                  {numero(seleccionado.lectura_actual)}{" "}
                  {seleccionado.gas_unidades_medida?.abreviatura || ""}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {fechaDominicana(seleccionado.fecha_lectura)}
                </p>

                <div className="mt-4">
                  {seleccionado.foto_actual_url ? (
                    <img
                      src={seleccionado.foto_actual_url}
                      alt="Foto de lectura actual"
                      className="h-56 w-full rounded-2xl border bg-slate-50 object-contain"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-2xl border bg-slate-50 text-sm text-slate-500">
                      Sin fotografía actual
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border">
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="border-b bg-slate-50 p-3 font-bold">
                      Consumo
                    </td>
                    <td className="border-b p-3 text-right font-black">
                      {numero(seleccionado.consumo)}{" "}
                      {seleccionado.gas_unidades_medida?.abreviatura || ""}
                    </td>
                  </tr>

                  <tr>
                    <td className="border-b bg-slate-50 p-3 font-bold">
                      Precio unitario
                    </td>
                    <td className="border-b p-3 text-right font-black">
                      RD$ {dinero(seleccionado.precio_unitario)}
                    </td>
                  </tr>

                  <tr>
                    <td className="border-b bg-slate-50 p-3 font-bold">
                      Proveedor
                    </td>
                    <td className="border-b p-3 text-right">
                      {seleccionado.catalogo_proveedores?.nombre_proveedor ||
                        "-"}
                    </td>
                  </tr>

                  <tr>
                    <td className="bg-slate-900 p-4 text-lg font-black text-white">
                      TOTAL
                    </td>
                    <td className="bg-slate-900 p-4 text-right text-2xl font-black text-white">
                      RD$ {dinero(seleccionado.importe)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Estado del cargo
                </p>
                <p className="mt-1 font-black">
                  {seleccionado.cargos_periodicos?.estado || "-"}
                </p>
              </div>

              <div className="rounded-2xl border p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Pagado
                </p>
                <p className="mt-1 font-black text-emerald-700">
                  RD$ {dinero(
                    seleccionado.cargos_periodicos?.monto_pagado || 0
                  )}
                </p>
              </div>

              <div className="rounded-2xl border p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Balance
                </p>
                <p className="mt-1 font-black text-orange-700">
                  RD$ {dinero(
                    seleccionado.cargos_periodicos?.balance ??
                      seleccionado.importe
                  )}
                </p>
              </div>
            </div>

            <div className="no-print mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={imprimirRecibo}
                className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white hover:bg-blue-800"
              >
                Imprimir recibo
              </button>

              <button
                type="button"
                onClick={() => setSeleccionado(null)}
                className="rounded-xl border bg-slate-100 px-5 py-3 font-bold text-slate-800 hover:bg-slate-200"
              >
                Cerrar
              </button>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              Generado por VAM Condominios · Gas Recibos v{VERSION}
            </p>
          </section>
        )}

        <section className="no-print rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">
            Historial de recibos
          </h2>

          <div className="mt-4 overflow-auto rounded-2xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border p-3 text-left">Recibo</th>
                  <th className="border p-3 text-left">Período</th>
                  <th className="border p-3 text-left">Apartamento</th>
                  <th className="border p-3 text-left">Propietario</th>
                  <th className="border p-3 text-right">Consumo</th>
                  <th className="border p-3 text-right">Importe</th>
                  <th className="border p-3 text-center">Estado</th>
                  <th className="border p-3 text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {recibosFiltrados.map((recibo) => (
                  <tr key={recibo.id} className="hover:bg-slate-50">
                    <td className="border p-3 font-bold">
                      {noRecibo(recibo)}
                    </td>

                    <td className="border p-3">
                      {periodoTexto(recibo.periodo)}
                    </td>

                    <td className="border p-3 font-black">
                      {recibo.unidades?.codigo || "-"}
                    </td>

                    <td className="border p-3">
                      {recibo.unidades?.propietario_nombre ||
                        "Sin propietario"}
                    </td>

                    <td className="border p-3 text-right font-bold">
                      {numero(recibo.consumo)}{" "}
                      {recibo.gas_unidades_medida?.abreviatura || ""}
                    </td>

                    <td className="border p-3 text-right font-black text-blue-700">
                      RD$ {dinero(recibo.importe)}
                    </td>

                    <td className="border p-3 text-center">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          recibo.cargos_periodicos?.estado === "PAGADO"
                            ? "bg-emerald-100 text-emerald-700"
                            : recibo.cargos_periodicos?.estado === "PARCIAL"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {recibo.cargos_periodicos?.estado || "PENDIENTE"}
                      </span>
                    </td>

                    <td className="border p-3 text-center">
                      <button
                        type="button"
                        onClick={() => verRecibo(recibo)}
                        className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800"
                      >
                        Ver recibo
                      </button>
                    </td>
                  </tr>
                ))}

                {recibosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="border p-8 text-center text-slate-500"
                    >
                      No hay recibos de gas para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="no-print text-right text-xs text-slate-400">
          Gas · Recibos v{VERSION}
        </p>
      </div>
    </main>
  );
}
