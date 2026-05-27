"use client";

import { useEffect, useState } from "react";
import RoleGuard from "../../RoleGuard";
import { supabase } from "@/app/lib/supabaseClient";

type BalanceBanco = {
  id: number;
  condominio_id: number;
  anio: number;
  banco: string;
  numero_cuenta: string;
  balance_inicial: number;
  observacion: string;
  created_at: string;
};

export default function BalanceBancoPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [banco, setBanco] = useState("");
  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [balanceInicial, setBalanceInicial] = useState("");
  const [observacion, setObservacion] = useState("");

  const [balances, setBalances] = useState<BalanceBanco[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarBalances(id);
    }
  }, []);

  async function cargarBalances(id: string) {
    const { data, error } = await supabase
      .from("balances_banco")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("anio", { ascending: false });

    if (error) {
      setMensaje("Error cargando balances: " + error.message);
      return;
    }

    setBalances(data || []);
  }

  async function guardarBalance(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId) {
      setMensaje("No hay condominio activo.");
      return;
    }

    if (!anio || !balanceInicial) {
      setMensaje("Debe indicar año y balance inicial.");
      return;
    }

    setGuardando(true);
    setMensaje("");

    const { error } = await supabase.from("balances_banco").upsert(
      [
        {
          condominio_id: Number(condominioId),
          anio: Number(anio),
          banco,
          numero_cuenta: numeroCuenta,
          balance_inicial: Number(balanceInicial || 0),
          observacion,
        },
      ],
      {
        onConflict: "condominio_id,anio",
      }
    );

    setGuardando(false);

    if (error) {
      setMensaje("Error guardando balance: " + error.message);
      return;
    }

    setMensaje("Balance inicial guardado correctamente.");

    setBanco("");
    setNumeroCuenta("");
    setBalanceInicial("");
    setObservacion("");

    cargarBalances(condominioId);
  }

  function cargarParaEditar(item: BalanceBanco) {
    setAnio(item.anio);
    setBanco(item.banco || "");
    setNumeroCuenta(item.numero_cuenta || "");
    setBalanceInicial(String(item.balance_inicial || 0));
    setObservacion(item.observacion || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function dinero(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  return (
    <RoleGuard roles={["Super Admin", "Administrador", "Tesorero"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Balance Inicial Banco</h1>
          <p className="text-slate-500">
            Registro del balance inicial anual de la cuenta bancaria del condominio.
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

        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h2 className="text-xl font-bold mb-4">Registrar / actualizar balance</h2>

          <form
            onSubmit={guardarBalance}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-semibold mb-1">Año *</label>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                className="border rounded-lg px-3 py-2 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Balance inicial *
              </label>
              <input
                type="number"
                step="0.01"
                value={balanceInicial}
                onChange={(e) => setBalanceInicial(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Banco</label>
              <input
                type="text"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="Ej. Banco Popular"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Número de cuenta
              </label>
              <input
                type="text"
                value={numeroCuenta}
                onChange={(e) => setNumeroCuenta(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="Número de cuenta"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">
                Observación
              </label>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
                rows={3}
                placeholder="Notas internas sobre este balance inicial"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={guardando}
                className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-lg font-semibold disabled:opacity-60"
              >
                {guardando ? "Guardando..." : "Guardar balance"}
              </button>
            </div>
          </form>

          {mensaje && (
            <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-3 text-sm">
              {mensaje}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h2 className="text-xl font-bold mb-4">Balances registrados</h2>

          <div className="overflow-auto border rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Año</th>
                  <th className="p-3 border text-left">Banco</th>
                  <th className="p-3 border text-left">Cuenta</th>
                  <th className="p-3 border text-right">Balance inicial</th>
                  <th className="p-3 border text-left">Observación</th>
                  <th className="p-3 border text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {balances.map((b) => (
                  <tr key={b.id}>
                    <td className="p-3 border font-semibold">{b.anio}</td>
                    <td className="p-3 border">{b.banco || "-"}</td>
                    <td className="p-3 border">{b.numero_cuenta || "-"}</td>
                    <td className="p-3 border text-right font-bold text-blue-700">
                      RD$ {dinero(b.balance_inicial)}
                    </td>
                    <td className="p-3 border">{b.observacion || "-"}</td>
                    <td className="p-3 border text-center">
                      <button
                        onClick={() => cargarParaEditar(b)}
                        className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}

                {balances.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-6 text-center text-slate-500 border"
                    >
                      No hay balances registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}