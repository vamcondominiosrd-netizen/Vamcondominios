"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type Cuenta = {
  id: number;
  nombre_banco: string;
  numero_cuenta: string;
  tipo_cuenta: string;
  moneda: string;
  fondo_tipo: string;
  fondo_ordinario: number;
  fondo_extraordinario: number;
  fondo_reserva: number;
  balance_actual: number;
  activa: boolean;
};

export default function ConfiguracionFinancieraPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);

  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [nombreBanco, setNombreBanco] = useState("");
  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [tipoCuenta, setTipoCuenta] = useState("Corriente");
  const [moneda, setMoneda] = useState("DOP");
  const [fondoTipo, setFondoTipo] = useState("ORDINARIO");

  const [fondoOrdinario, setFondoOrdinario] = useState("");
  const [fondoExtraordinario, setFondoExtraordinario] = useState("");
  const [fondoReserva, setFondoReserva] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id");
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      router.push("/login");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre);

    cargarCondominio(id);
    cargarCuentas(id);
  }, [router]);

  async function cargarCondominio(id: string) {
    const { data } = await supabase
      .from("condominios")
      .select("client_id")
      .eq("id", Number(id))
      .single();

    setClientId(data?.client_id ?? null);
  }

  async function cargarCuentas(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("cuentas_bancarias")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("id", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando cuentas: " + error.message);
      return;
    }

    setCuentas(data || []);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setNombreBanco("");
    setNumeroCuenta("");
    setTipoCuenta("Corriente");
    setMoneda("DOP");
    setFondoTipo("ORDINARIO");
    setFondoOrdinario("");
    setFondoExtraordinario("");
    setFondoReserva("");
  }

  async function guardarCuenta(e: React.FormEvent) {
    e.preventDefault();

    if (!nombreBanco || !numeroCuenta) {
      alert("Debe completar banco y número de cuenta.");
      return;
    }

    const ordinario = Number(fondoOrdinario || 0);
    const extraordinario = Number(fondoExtraordinario || 0);
    const reserva = Number(fondoReserva || 0);

    const balance = ordinario + extraordinario + reserva;

    const registro: any = {
      condominio_id: Number(condominioId),
      nombre_banco: nombreBanco,
      numero_cuenta: numeroCuenta,
      tipo_cuenta: tipoCuenta,
      moneda,
      fondo_tipo: fondoTipo,
      fondo_ordinario: ordinario,
      fondo_extraordinario: extraordinario,
      fondo_reserva: reserva,
      balance_actual: balance,
      activa: true,
    };

    if (clientId) {
      registro.client_id = clientId;
    }

    if (editandoId) {
      const { error } = await supabase
        .from("cuentas_bancarias")
        .update(registro)
        .eq("id", editandoId);

      if (error) {
        alert("Error modificando cuenta: " + error.message);
        return;
      }

      alert("Cuenta modificada correctamente.");
    } else {
      const { error } = await supabase
        .from("cuentas_bancarias")
        .insert([registro]);

      if (error) {
        alert("Error registrando cuenta: " + error.message);
        return;
      }

      alert("Cuenta registrada correctamente.");
    }

    limpiarFormulario();
    cargarCuentas(condominioId);
  }

  function editarCuenta(c: Cuenta) {
    setEditandoId(c.id);

    setNombreBanco(c.nombre_banco || "");
    setNumeroCuenta(c.numero_cuenta || "");
    setTipoCuenta(c.tipo_cuenta || "Corriente");
    setMoneda(c.moneda || "DOP");
    setFondoTipo(c.fondo_tipo || "ORDINARIO");

    setFondoOrdinario(String(c.fondo_ordinario || 0));
    setFondoExtraordinario(String(c.fondo_extraordinario || 0));
    setFondoReserva(String(c.fondo_reserva || 0));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function borrarCuenta(id: number) {
    const confirmar = confirm(
      "¿Seguro que desea borrar esta cuenta bancaria?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("cuentas_bancarias")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Error borrando cuenta: " + error.message);
      return;
    }

    cargarCuentas(condominioId);
  }

  const totalBalance = cuentas.reduce(
    (sum, c) => sum + Number(c.balance_actual || 0),
    0
  );

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Configuración Financiera
          </h1>

          <p className="text-slate-500">
            Condominio activo: {condominioNombre}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total cuentas
          </p>

          <h2 className="text-2xl font-bold mt-2">
            {cuentas.length}
          </h2>
        </div>

        <div className="bg-white rounded-2xl border p-5 shadow-sm md:col-span-3">
          <p className="text-sm text-slate-500">
            Balance total
          </p>

          <h2 className="text-3xl font-bold text-green-700 mt-2">
            RD$ {totalBalance.toLocaleString()}
          </h2>
        </div>

      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-6">

        <h2 className="text-xl font-bold mb-5">
          {editandoId
            ? "Modificar cuenta bancaria"
            : "Registrar cuenta bancaria"}
        </h2>

        <form
          onSubmit={guardarCuenta}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >

          <input
            type="text"
            value={nombreBanco}
            onChange={(e) => setNombreBanco(e.target.value)}
            placeholder="Nombre del banco *"
            className="border rounded-xl px-4 py-3"
          />

          <input
            type="text"
            value={numeroCuenta}
            onChange={(e) => setNumeroCuenta(e.target.value)}
            placeholder="Número de cuenta *"
            className="border rounded-xl px-4 py-3"
          />

          <select
            value={tipoCuenta}
            onChange={(e) => setTipoCuenta(e.target.value)}
            className="border rounded-xl px-4 py-3"
          >
            <option value="Corriente">Corriente</option>
            <option value="Ahorro">Ahorro</option>
          </select>

          <select
            value={moneda}
            onChange={(e) => setMoneda(e.target.value)}
            className="border rounded-xl px-4 py-3"
          >
            <option value="DOP">DOP</option>
            <option value="USD">USD</option>
          </select>

          <select
            value={fondoTipo}
            onChange={(e) => setFondoTipo(e.target.value)}
            className="border rounded-xl px-4 py-3 md:col-span-2"
          >
            <option value="ORDINARIO">Cuenta Fondo Ordinario</option>
            <option value="EXTRAORDINARIO">Cuenta Fondo Extraordinario</option>
            <option value="RESERVA">Cuenta Fondo Reserva</option>
          </select>

          <input
            type="number"
            step="0.01"
            value={fondoOrdinario}
            onChange={(e) => setFondoOrdinario(e.target.value)}
            placeholder="Fondo ordinario"
            className="border rounded-xl px-4 py-3"
          />

          <input
            type="number"
            step="0.01"
            value={fondoExtraordinario}
            onChange={(e) => setFondoExtraordinario(e.target.value)}
            placeholder="Fondo extraordinario"
            className="border rounded-xl px-4 py-3"
          />

          <input
            type="number"
            step="0.01"
            value={fondoReserva}
            onChange={(e) => setFondoReserva(e.target.value)}
            placeholder="Fondo de reserva"
            className="border rounded-xl px-4 py-3 md:col-span-2"
          />

          <div className="md:col-span-2 flex gap-2">

            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-3 rounded-xl"
            >
              {editandoId
                ? "Guardar cambios"
                : "Registrar cuenta"}
            </button>

            {editandoId && (
              <button
                type="button"
                onClick={limpiarFormulario}
                className="bg-slate-500 hover:bg-slate-600 text-white px-5 py-3 rounded-xl"
              >
                Cancelar
              </button>
            )}

          </div>

        </form>

      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

        <div className="p-4 border-b">
          <h2 className="font-bold">
            Cuentas bancarias registradas
          </h2>
        </div>

        {loading ? (
          <div className="p-6">
            Cargando cuentas...
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">Banco</th>
                  <th className="px-4 py-3 text-left">Cuenta</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Fondo</th>
                  <th className="px-4 py-3 text-right">Ordinario</th>
                  <th className="px-4 py-3 text-right">Extraordinario</th>
                  <th className="px-4 py-3 text-right">Reserva</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>

                {cuentas.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t hover:bg-slate-50"
                  >

                    <td className="px-4 py-3 font-semibold">
                      {c.nombre_banco}
                    </td>

                    <td className="px-4 py-3">
                      {c.numero_cuenta}
                    </td>

                    <td className="px-4 py-3">
                      {c.tipo_cuenta}
                    </td>

                    <td className="px-4 py-3 font-semibold text-blue-700">
                      {c.fondo_tipo || "ORDINARIO"}
                    </td>

                    <td className="px-4 py-3 text-right">
                      RD$ {Number(c.fondo_ordinario || 0).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-right">
                      RD$ {Number(c.fondo_extraordinario || 0).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-right">
                      RD$ {Number(c.fondo_reserva || 0).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-green-700">
                      RD$ {Number(c.balance_actual || 0).toLocaleString()}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">

                        <button
                          onClick={() => editarCuenta(c)}
                          className="bg-blue-600 text-white px-3 py-1 rounded"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => borrarCuenta(c.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded"
                        >
                          Borrar
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}

                {!loading && cuentas.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center px-4 py-8 text-slate-500"
                    >
                      No hay cuentas registradas.
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