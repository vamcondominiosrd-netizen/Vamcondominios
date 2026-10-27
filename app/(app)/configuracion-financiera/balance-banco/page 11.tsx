"use client";

import { useEffect, useState } from "react";
import RoleGuard from "../../RoleGuard";
import { supabase } from "@/app/lib/supabaseClient";

type CuentaBancaria = {
  id: number;
  condominio_id: number;
  nombre_banco: string | null;
  numero_cuenta: string | null;
  tipo_cuenta: string | null;
  moneda: string | null;
  fondo_inicial: number | null;
  balance_actual: number | null;
  fondo_ordinario: number | null;
  fondo_extraordinario: number | null;
  fondo_reserva: number | null;
  fondo_tipo: string | null;
  activa: boolean | null;
  created_at: string | null;
};

export default function BalanceBancoPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [cuentaEditandoId, setCuentaEditandoId] = useState<number | null>(null);

  const [nombreBanco, setNombreBanco] = useState("");
  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [tipoCuenta, setTipoCuenta] = useState("");
  const [moneda, setMoneda] = useState("DOP");
  const [fondoInicial, setFondoInicial] = useState("");
  const [balanceActual, setBalanceActual] = useState("");
  const [fondoOrdinario, setFondoOrdinario] = useState("");
  const [fondoExtraordinario, setFondoExtraordinario] = useState("");
  const [fondoReserva, setFondoReserva] = useState("");
  const [fondoTipo, setFondoTipo] = useState("ORDINARIO");
  const [activa, setActiva] = useState(true);

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarCuentas(id);
    }
  }, []);

  async function cargarCuentas(id: string) {
    const { data, error } = await supabase
      .from("cuentas_bancarias")
      .select(`
        id,
        condominio_id,
        nombre_banco,
        numero_cuenta,
        tipo_cuenta,
        moneda,
        fondo_inicial,
        balance_actual,
        fondo_ordinario,
        fondo_extraordinario,
        fondo_reserva,
        fondo_tipo,
        activa,
        created_at
      `)
      .eq("condominio_id", Number(id))
      .order("id", { ascending: true });

    if (error) {
      setMensaje("Error cargando cuentas bancarias: " + error.message);
      return;
    }

    setCuentas((data as CuentaBancaria[]) || []);
  }

  function limpiarFormulario() {
    setCuentaEditandoId(null);
    setNombreBanco("");
    setNumeroCuenta("");
    setTipoCuenta("");
    setMoneda("DOP");
    setFondoInicial("");
    setBalanceActual("");
    setFondoOrdinario("");
    setFondoExtraordinario("");
    setFondoReserva("");
    setFondoTipo("ORDINARIO");
    setActiva(true);
  }

  async function guardarCuenta(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId) {
      setMensaje("No hay condominio activo.");
      return;
    }

    if (!nombreBanco.trim()) {
      setMensaje("Debe indicar el nombre del banco.");
      return;
    }

    if (!numeroCuenta.trim()) {
      setMensaje("Debe indicar el número de cuenta.");
      return;
    }

    setGuardando(true);
    setMensaje("");

    const registro = {
      condominio_id: Number(condominioId),
      nombre_banco: nombreBanco.trim(),
      numero_cuenta: numeroCuenta.trim(),
      tipo_cuenta: tipoCuenta.trim() || null,
      moneda: moneda.trim() || "DOP",
      fondo_inicial: Number(fondoInicial || 0),
      balance_actual: Number(balanceActual || 0),
      fondo_ordinario: Number(fondoOrdinario || 0),
      fondo_extraordinario: Number(fondoExtraordinario || 0),
      fondo_reserva: Number(fondoReserva || 0),
      fondo_tipo: fondoTipo,
      activa,
    };

    let error;

    if (cuentaEditandoId) {
      const respuesta = await supabase
        .from("cuentas_bancarias")
        .update(registro)
        .eq("id", cuentaEditandoId)
        .eq("condominio_id", Number(condominioId));

      error = respuesta.error;
    } else {
      const respuesta = await supabase.from("cuentas_bancarias").insert([
        registro,
      ]);

      error = respuesta.error;
    }

    setGuardando(false);

    if (error) {
      setMensaje("Error guardando cuenta bancaria: " + error.message);
      return;
    }

    setMensaje(
      cuentaEditandoId
        ? "Cuenta bancaria actualizada correctamente."
        : "Cuenta bancaria registrada correctamente."
    );

    limpiarFormulario();
    cargarCuentas(condominioId);
  }

  function cargarParaEditar(item: CuentaBancaria) {
    setCuentaEditandoId(item.id);
    setNombreBanco(item.nombre_banco || "");
    setNumeroCuenta(item.numero_cuenta || "");
    setTipoCuenta(item.tipo_cuenta || "");
    setMoneda(item.moneda || "DOP");
    setFondoInicial(String(item.fondo_inicial || 0));
    setBalanceActual(String(item.balance_actual || 0));
    setFondoOrdinario(String(item.fondo_ordinario || 0));
    setFondoExtraordinario(String(item.fondo_extraordinario || 0));
    setFondoReserva(String(item.fondo_reserva || 0));
    setFondoTipo(item.fondo_tipo || "ORDINARIO");
    setActiva(Boolean(item.activa));

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function cambiarEstadoCuenta(item: CuentaBancaria) {
    const nuevoEstado = !item.activa;

    const confirmar = confirm(
      `¿Desea ${nuevoEstado ? "activar" : "inactivar"} esta cuenta bancaria?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("cuentas_bancarias")
      .update({
        activa: nuevoEstado,
      })
      .eq("id", item.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      setMensaje("Error cambiando estado de cuenta: " + error.message);
      return;
    }

    setMensaje("Estado de cuenta actualizado correctamente.");
    cargarCuentas(condominioId);
  }

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  const totalFondoInicial = cuentas.reduce(
    (sum, c) => sum + Number(c.fondo_inicial || 0),
    0
  );

  const totalBalanceActual = cuentas.reduce(
    (sum, c) => sum + Number(c.balance_actual || 0),
    0
  );

  const totalFondoOrdinario = cuentas.reduce(
    (sum, c) => sum + Number(c.fondo_ordinario || 0),
    0
  );

  const totalFondoExtraordinario = cuentas.reduce(
    (sum, c) => sum + Number(c.fondo_extraordinario || 0),
    0
  );

  const totalFondoReserva = cuentas.reduce(
    (sum, c) => sum + Number(c.fondo_reserva || 0),
    0
  );

  return (
    <RoleGuard roles={["Super Admin", "Administrador", "Tesorero"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            Cuentas Bancarias / Fondos
          </h1>

          <p className="text-slate-500">
            Configuración oficial de cuentas bancarias, balance actual y fondos
            del condominio.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <p className="text-sm text-blue-800 font-semibold">
            Fuente oficial del banco
          </p>

          <p className="text-sm text-blue-700 mt-1">
            Este módulo usa la tabla <strong>cuentas_bancarias</strong>. La tabla
            vieja <strong>balances_banco</strong> ya no debe usarse para reportes
            financieros.
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

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <ResumenCard
            titulo="Fondo inicial"
            valor={totalFondoInicial}
            color="text-blue-700"
          />

          <ResumenCard
            titulo="Balance actual banco"
            valor={totalBalanceActual}
            color="text-green-700"
          />

          <ResumenCard
            titulo="Fondo ordinario"
            valor={totalFondoOrdinario}
            color="text-emerald-700"
          />

          <ResumenCard
            titulo="Fondo extraordinario"
            valor={totalFondoExtraordinario}
            color="text-purple-700"
          />

          <ResumenCard
            titulo="Fondo reserva"
            valor={totalFondoReserva}
            color="text-amber-700"
          />
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h2 className="text-xl font-bold mb-4">
            {cuentaEditandoId ? "Editar cuenta bancaria" : "Registrar cuenta bancaria"}
          </h2>

          <form
            onSubmit={guardarCuenta}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div>
              <label className="block text-sm font-semibold mb-1">
                Banco *
              </label>

              <input
                type="text"
                value={nombreBanco}
                onChange={(e) => setNombreBanco(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="Ej. Banco Popular Dominicano"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Número de cuenta *
              </label>

              <input
                type="text"
                value={numeroCuenta}
                onChange={(e) => setNumeroCuenta(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="Número de cuenta"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Tipo de cuenta
              </label>

              <input
                type="text"
                value={tipoCuenta}
                onChange={(e) => setTipoCuenta(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="Corriente / Ahorro"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Moneda
              </label>

              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full bg-white"
              >
                <option value="DOP">DOP - Peso Dominicano</option>
                <option value="USD">USD - Dólar</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Fondo inicial
              </label>

              <input
                type="number"
                step="0.01"
                value={fondoInicial}
                onChange={(e) => setFondoInicial(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Balance actual banco
              </label>

              <input
                type="number"
                step="0.01"
                value={balanceActual}
                onChange={(e) => setBalanceActual(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Fondo ordinario
              </label>

              <input
                type="number"
                step="0.01"
                value={fondoOrdinario}
                onChange={(e) => setFondoOrdinario(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Fondo extraordinario
              </label>

              <input
                type="number"
                step="0.01"
                value={fondoExtraordinario}
                onChange={(e) => setFondoExtraordinario(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Fondo reserva
              </label>

              <input
                type="number"
                step="0.01"
                value={fondoReserva}
                onChange={(e) => setFondoReserva(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Fondo principal
              </label>

              <select
                value={fondoTipo}
                onChange={(e) => setFondoTipo(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full bg-white"
              >
                <option value="ORDINARIO">ORDINARIO</option>
                <option value="EXTRAORDINARIO">EXTRAORDINARIO</option>
                <option value="RESERVA">RESERVA</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Estado
              </label>

              <select
                value={activa ? "true" : "false"}
                onChange={(e) => setActiva(e.target.value === "true")}
                className="border rounded-lg px-3 py-2 w-full bg-white"
              >
                <option value="true">Activa</option>
                <option value="false">Inactiva</option>
              </select>
            </div>

            <div className="md:col-span-3 flex gap-2">
              <button
                type="submit"
                disabled={guardando}
                className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-lg font-semibold disabled:opacity-60"
              >
                {guardando
                  ? "Guardando..."
                  : cuentaEditandoId
                  ? "Actualizar cuenta"
                  : "Guardar cuenta"}
              </button>

              {cuentaEditandoId && (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-2 rounded-lg font-semibold"
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>

          {mensaje && (
            <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-3 text-sm">
              {mensaje}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h2 className="text-xl font-bold mb-4">
            Cuentas bancarias registradas
          </h2>

          <div className="overflow-auto border rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Banco</th>
                  <th className="p-3 border text-left">Cuenta</th>
                  <th className="p-3 border text-left">Tipo</th>
                  <th className="p-3 border text-left">Moneda</th>
                  <th className="p-3 border text-right">Fondo inicial</th>
                  <th className="p-3 border text-right">Balance actual</th>
                  <th className="p-3 border text-right">Ordinario</th>
                  <th className="p-3 border text-right">Extraordinario</th>
                  <th className="p-3 border text-right">Reserva</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {cuentas.map((c) => (
                  <tr key={c.id}>
                    <td className="p-3 border font-semibold">
                      {c.nombre_banco || "-"}
                    </td>

                    <td className="p-3 border">{c.numero_cuenta || "-"}</td>

                    <td className="p-3 border">{c.tipo_cuenta || "-"}</td>

                    <td className="p-3 border">{c.moneda || "DOP"}</td>

                    <td className="p-3 border text-right">
                      RD$ {dinero(c.fondo_inicial)}
                    </td>

                    <td className="p-3 border text-right font-bold text-green-700">
                      RD$ {dinero(c.balance_actual)}
                    </td>

                    <td className="p-3 border text-right">
                      RD$ {dinero(c.fondo_ordinario)}
                    </td>

                    <td className="p-3 border text-right">
                      RD$ {dinero(c.fondo_extraordinario)}
                    </td>

                    <td className="p-3 border text-right">
                      RD$ {dinero(c.fondo_reserva)}
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={
                          c.activa
                            ? "bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold"
                            : "bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold"
                        }
                      >
                        {c.activa ? "Activa" : "Inactiva"}
                      </span>
                    </td>

                    <td className="p-3 border text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => cargarParaEditar(c)}
                          className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => cambiarEstadoCuenta(c)}
                          className={
                            c.activa
                              ? "bg-red-700 text-white px-4 py-2 rounded-lg text-xs"
                              : "bg-green-700 text-white px-4 py-2 rounded-lg text-xs"
                          }
                        >
                          {c.activa ? "Inactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {cuentas.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="p-6 text-center text-slate-500 border"
                    >
                      No hay cuentas bancarias registradas para este condominio.
                    </td>
                  </tr>
                )}

                {cuentas.length > 0 && (
                  <tr className="bg-slate-100 font-bold">
                    <td className="p-3 border" colSpan={4}>
                      TOTAL
                    </td>

                    <td className="p-3 border text-right">
                      RD$ {dinero(totalFondoInicial)}
                    </td>

                    <td className="p-3 border text-right text-green-700">
                      RD$ {dinero(totalBalanceActual)}
                    </td>

                    <td className="p-3 border text-right">
                      RD$ {dinero(totalFondoOrdinario)}
                    </td>

                    <td className="p-3 border text-right">
                      RD$ {dinero(totalFondoExtraordinario)}
                    </td>

                    <td className="p-3 border text-right">
                      RD$ {dinero(totalFondoReserva)}
                    </td>

                    <td className="p-3 border text-center" colSpan={2}>
                      -
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

function ResumenCard({
  titulo,
  valor,
  color,
}: {
  titulo: string;
  valor: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border">
      <p className="text-sm text-slate-500">{titulo}</p>
      <h2 className={`text-xl font-black mt-2 ${color}`}>
        RD$ {Number(valor || 0).toLocaleString("es-DO", {
          minimumFractionDigits: 2,
        })}
      </h2>
    </div>
  );
}