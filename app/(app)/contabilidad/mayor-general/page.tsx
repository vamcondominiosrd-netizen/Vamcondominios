"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ListChecks, Search } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type Cuenta = {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
};

type Movimiento = {
  id: number;
  asiento_id: number;
  cuenta_id: number;
  debito: number;
  credito: number;
  comentario: string | null;
  contabilidad_asientos: {
    fecha: string;
    referencia: string | null;
    descripcion: string;
    origen: string | null;
    estado: string;
  } | null;
};

const condominioId = 1;

export default function MayorGeneralPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cuentaId, setCuentaId] = useState("");
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function cargarCuentas() {
    setError("");

    const { data, error } = await supabase
      .from("contabilidad_cuentas")
      .select("id,codigo,nombre,tipo")
      .eq("condominio_id", condominioId)
      .eq("estado", "Activo")
      .order("codigo", { ascending: true });

    if (error) {
      setError(error.message);
      setCuentas([]);
    } else {
      setCuentas(data || []);
    }
  }

  async function cargarMovimientos(idCuenta: string) {
    if (!idCuenta) {
      setMovimientos([]);
      return;
    }

    setCargando(true);
    setError("");

    const { data, error } = await supabase
      .from("contabilidad_asientos_detalle")
      .select(`
        id,
        asiento_id,
        cuenta_id,
        debito,
        credito,
        comentario,
        contabilidad_asientos (
          fecha,
          referencia,
          descripcion,
          origen,
          estado
        )
      `)
      .eq("cuenta_id", Number(idCuenta))
      .order("id", { ascending: true });

    if (error) {
      setError(error.message);
      setMovimientos([]);
    } else {
      setMovimientos((data || []) as Movimiento[]);
    }

    setCargando(false);
  }

  useEffect(() => {
    cargarCuentas();
  }, []);

  useEffect(() => {
    cargarMovimientos(cuentaId);
  }, [cuentaId]);

  const cuentaSeleccionada = cuentas.find((c) => String(c.id) === cuentaId);

  const movimientosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto) return movimientos;

    return movimientos.filter((m) => {
      const a = m.contabilidad_asientos;

      return (
        a?.descripcion?.toLowerCase().includes(texto) ||
        a?.referencia?.toLowerCase().includes(texto) ||
        a?.origen?.toLowerCase().includes(texto) ||
        m.comentario?.toLowerCase().includes(texto)
      );
    });
  }, [busqueda, movimientos]);

  const movimientosConBalance = useMemo(() => {
    let balance = 0;

    return movimientosFiltrados.map((m) => {
      balance += Number(m.debito || 0) - Number(m.credito || 0);

      return {
        ...m,
        balance,
      };
    });
  }, [movimientosFiltrados]);

  const totales = useMemo(() => {
    const debito = movimientosFiltrados.reduce(
      (acc, m) => acc + Number(m.debito || 0),
      0
    );

    const credito = movimientosFiltrados.reduce(
      (acc, m) => acc + Number(m.credito || 0),
      0
    );

    return {
      debito,
      credito,
      saldo: debito - credito,
    };
  }, [movimientosFiltrados]);

  function formatoMonto(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <Link
            href="/contabilidad"
            className="mb-3 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Contabilidad
          </Link>

          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
              <ListChecks className="h-6 w-6" />
            </span>
            Mayor General
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Consulta los movimientos contables por cuenta y su balance acumulado.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Cuenta contable
              </label>

              <select
                value={cuentaId}
                onChange={(e) => setCuentaId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Seleccione una cuenta</option>
                {cuentas.map((cuenta) => (
                  <option key={cuenta.id} value={cuenta.id}>
                    {cuenta.codigo} - {cuenta.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Buscar
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Referencia, descripción, origen..."
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Cuenta</p>
            <h2 className="mt-1 text-base font-bold text-slate-800">
              {cuentaSeleccionada
                ? `${cuentaSeleccionada.codigo} - ${cuentaSeleccionada.nombre}`
                : "Sin seleccionar"}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Total Débito</p>
            <h2 className="mt-1 text-xl font-bold text-slate-800">
              RD$ {formatoMonto(totales.debito)}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Total Crédito</p>
            <h2 className="mt-1 text-xl font-bold text-slate-800">
              RD$ {formatoMonto(totales.credito)}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Saldo</p>
            <h2 className="mt-1 text-xl font-bold text-slate-800">
              RD$ {formatoMonto(totales.saldo)}
            </h2>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Asiento</th>
                  <th className="px-4 py-3 text-left">Referencia</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-left">Comentario</th>
                  <th className="px-4 py-3 text-right">Débito</th>
                  <th className="px-4 py-3 text-right">Crédito</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {!cuentaId ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      Seleccione una cuenta contable para ver sus movimientos.
                    </td>
                  </tr>
                ) : cargando ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      Cargando movimientos...
                    </td>
                  </tr>
                ) : movimientosConBalance.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      Esta cuenta no tiene movimientos registrados.
                    </td>
                  </tr>
                ) : (
                  movimientosConBalance.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {m.contabilidad_asientos?.fecha || "-"}
                      </td>

                      <td className="px-4 py-3">
                        #{m.asiento_id}
                      </td>

                      <td className="px-4 py-3">
                        {m.contabilidad_asientos?.referencia || "-"}
                      </td>

                      <td className="px-4 py-3">
                        {m.contabilidad_asientos?.descripcion || "-"}
                      </td>

                      <td className="px-4 py-3">
                        {m.comentario || "-"}
                      </td>

                      <td className="px-4 py-3 text-right">
                        RD$ {formatoMonto(Number(m.debito || 0))}
                      </td>

                      <td className="px-4 py-3 text-right">
                        RD$ {formatoMonto(Number(m.credito || 0))}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold">
                        RD$ {formatoMonto(m.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}