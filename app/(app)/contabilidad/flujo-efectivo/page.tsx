"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";
import VamHeader from "@/components/vam/layout/VamHeader";
import VamToolbar from "@/components/vam/layout/VamToolbar";
import VamStatCard from "@/components/vam/cards/VamStatCard";
import VamLoading from "@/components/vam/shared/VamLoading";
import VamEmpty from "@/components/vam/shared/VamEmpty";

type Cuenta = {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
};

type Movimiento = {
  id: number;
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

export default function FlujoEfectivoPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  async function cargarDatos() {
    setCargando(true);
    setError("");

    const { data: cuentasData, error: errorCuentas } = await supabase
      .from("contabilidad_cuentas")
      .select("id,codigo,nombre,tipo")
      .eq("condominio_id", condominioId)
      .eq("estado", "Activo")
      .eq("tipo", "Activo")
      .or("nombre.ilike.%Banco%,nombre.ilike.%Caja%")
      .order("codigo", { ascending: true });

    if (errorCuentas) {
      setError(errorCuentas.message);
      setCargando(false);
      return;
    }

    const cuentaIds = (cuentasData || []).map((c) => c.id);

    if (cuentaIds.length === 0) {
      setCuentas([]);
      setMovimientos([]);
      setCargando(false);
      return;
    }

    const { data: movimientosData, error: errorMovimientos } = await supabase
      .from("contabilidad_asientos_detalle")
      .select(`
        id,
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
      .in("cuenta_id", cuentaIds)
      .order("id", { ascending: false });

    if (errorMovimientos) {
      setError(errorMovimientos.message);
      setCargando(false);
      return;
    }

    setCuentas(cuentasData || []);
    setMovimientos((movimientosData || []) as Movimiento[]);
    setCargando(false);
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  function formatoMonto(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const resumen = useMemo(() => {
    const entradas = movimientos.reduce(
      (acc, m) => acc + Number(m.debito || 0),
      0
    );

    const salidas = movimientos.reduce(
      (acc, m) => acc + Number(m.credito || 0),
      0
    );

    return {
      entradas,
      salidas,
      balance: entradas - salidas,
    };
  }, [movimientos]);

  function nombreCuenta(cuentaId: number) {
    const cuenta = cuentas.find((c) => c.id === cuentaId);
    return cuenta ? `${cuenta.codigo} - ${cuenta.nombre}` : "Cuenta no encontrada";
  }

  function exportarExcel() {
    const filas = [
      ["Fecha", "Cuenta", "Referencia", "Descripción", "Entrada", "Salida"],
      ...movimientos.map((m) => [
        m.contabilidad_asientos?.fecha || "",
        nombreCuenta(m.cuenta_id),
        m.contabilidad_asientos?.referencia || "",
        m.contabilidad_asientos?.descripcion || "",
        Number(m.debito || 0),
        Number(m.credito || 0),
      ]),
    ];

    const csv = filas
      .map((fila) => fila.map((valor) => `"${valor}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "flujo-efectivo-vam.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <VamHeader
          title="Flujo de Efectivo"
          subtitle="Entradas y salidas de dinero según cuentas de banco y caja."
          badge="Contabilidad"
        />

        <VamToolbar
          showRefresh
          showExcel
          showPdf
          showPrint
          onRefresh={cargarDatos}
          onExcel={exportarExcel}
          onPdf={() => window.print()}
          onPrint={() => window.print()}
        />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {cargando ? (
          <VamLoading text="Cargando flujo de efectivo..." />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <VamStatCard
                title="Entradas"
                value={`RD$ ${formatoMonto(resumen.entradas)}`}
                subtitle="Débitos a banco/caja"
                tone="green"
                icon={ArrowDownCircle}
              />

              <VamStatCard
                title="Salidas"
                value={`RD$ ${formatoMonto(resumen.salidas)}`}
                subtitle="Créditos a banco/caja"
                tone="red"
                icon={ArrowUpCircle}
              />

              <VamStatCard
                title="Balance Neto"
                value={`RD$ ${formatoMonto(resumen.balance)}`}
                subtitle="Entradas menos salidas"
                tone={resumen.balance >= 0 ? "blue" : "red"}
                icon={Wallet}
              />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-800">
                Movimientos de efectivo
              </h2>

              {movimientos.length === 0 ? (
                <VamEmpty
                  title="Sin movimientos de efectivo"
                  description="No existen movimientos en cuentas de banco o caja."
                />
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 text-left">Fecha</th>
                        <th className="px-4 py-3 text-left">Cuenta</th>
                        <th className="px-4 py-3 text-left">Referencia</th>
                        <th className="px-4 py-3 text-left">Descripción</th>
                        <th className="px-4 py-3 text-right">Entrada</th>
                        <th className="px-4 py-3 text-right">Salida</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                      {movimientos.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            {m.contabilidad_asientos?.fecha || "-"}
                          </td>
                          <td className="px-4 py-3">{nombreCuenta(m.cuenta_id)}</td>
                          <td className="px-4 py-3">
                            {m.contabilidad_asientos?.referencia || "-"}
                          </td>
                          <td className="px-4 py-3">
                            {m.contabilidad_asientos?.descripcion || "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-green-700">
                            RD$ {formatoMonto(Number(m.debito || 0))}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-red-700">
                            RD$ {formatoMonto(Number(m.credito || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}