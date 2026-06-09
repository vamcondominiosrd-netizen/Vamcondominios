"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type CuentaBanco = {
  id: number;
  nombre_banco: string;
  numero_cuenta: string;
  tipo_cuenta: string | null;
  moneda: string | null;
  fondo_tipo: string | null;
  balance_actual: number | null;
};

type Gasto = {
  id: number;
  condominio_id: number | null;
  fecha: string | null;
  concepto: string | null;
  detalle_gasto: string | null;
  total: number | null;
  estado: string | null;
  aprobado_tesorero: boolean | null;
  aprobado_presidente: boolean | null;
  pagado: boolean | null;
  cheque_url?: string | null;
  numero_cheque?: string | null;
  fecha_pago?: string | null;
  cuenta_bancaria_id?: number | null;
  catalogo_proveedores?: {
    nombre_proveedor: string | null;
  } | null;
};

export default function TesoreriaPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cuentasBanco, setCuentasBanco] = useState<CuentaBanco[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      setMensaje("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarPagos(id);
    cargarCuentas(id);
  }, []);

  async function cargarPagos(idActivo?: string) {
    const id = idActivo || condominioId || localStorage.getItem("condominio_id") || "";

    if (!id) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("gastos")
      .select(`
        id,
        condominio_id,
        fecha,
        concepto,
        detalle_gasto,
        total,
        estado,
        aprobado_tesorero,
        aprobado_presidente,
        pagado,
        cheque_url,
        numero_cheque,
        fecha_pago,
        cuenta_bancaria_id,
        catalogo_proveedores(nombre_proveedor)
      `)
      .eq("condominio_id", Number(id))
      .eq("aprobado_tesorero", true)
      .eq("aprobado_presidente", true)
      .eq("pagado", false)
      .order("fecha", { ascending: false });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando pagos pendientes: " + error.message);
      return;
    }

    setGastos((data as Gasto[]) || []);
  }

  async function cargarCuentas(id: string) {
    const { data, error } = await supabase
      .from("cuentas_bancarias")
      .select(`
        id,
        nombre_banco,
        numero_cuenta,
        tipo_cuenta,
        moneda,
        fondo_tipo,
        balance_actual
      `)
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("nombre_banco", { ascending: true });

    if (error) {
      setMensaje("Error cargando cuentas: " + error.message);
      return;
    }

    setCuentasBanco((data as CuentaBanco[]) || []);
  }

  async function subirCheque(g: Gasto, archivo: File) {
    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

    const extension = archivo.name.split(".").pop();
    const nombreArchivo = `${condominioId}/${g.id}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("cheques-gastos")
      .upload(nombreArchivo, archivo, {
        upsert: true,
      });

    if (uploadError) {
      alert("Error subiendo cheque: " + uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from("cheques-gastos")
      .getPublicUrl(nombreArchivo);

    const { error } = await supabase
      .from("gastos")
      .update({
        cheque_url: data.publicUrl,
      })
      .eq("id", g.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error actualizando gasto: " + error.message);
      return;
    }

    alert("Cheque subido correctamente.");
    cargarPagos(condominioId);
  }

  async function marcarPagado(g: Gasto) {
    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (cuentasBanco.length === 0) {
      alert("No hay cuentas bancarias activas para este condominio.");
      return;
    }

    const numeroCheque = prompt("Número de cheque");

    if (!numeroCheque) return;

    const fechaPago = prompt("Fecha pago YYYY-MM-DD");

    if (!fechaPago) return;

    const cuentasTexto = cuentasBanco
      .map(
        (c) =>
          `ID ${c.id} - ${c.nombre_banco} - ${c.numero_cuenta} - ${c.fondo_tipo || "-"}`
      )
      .join("\n");

    const cuentaId = prompt(
      `Digite el ID de la cuenta bancaria:\n\n${cuentasTexto}`
    );

    if (!cuentaId) return;

    const cuentaSeleccionada = cuentasBanco.find(
      (c) => Number(c.id) === Number(cuentaId)
    );

    if (!cuentaSeleccionada) {
      alert("La cuenta bancaria seleccionada no existe.");
      return;
    }

    const confirmar = confirm(
      `¿Confirmar pago de RD$ ${dinero(g.total)} con la cuenta ${cuentaSeleccionada.nombre_banco}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("gastos")
      .update({
        pagado: true,
        numero_cheque: numeroCheque.trim(),
        fecha_pago: fechaPago,
        cuenta_bancaria_id: Number(cuentaId),
        estado: "Pagado",
      })
      .eq("id", g.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error registrando pago: " + error.message);
      return;
    }

    alert("Pago registrado correctamente.");
    cargarPagos(condominioId);
  }

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  const gastosFiltrados = useMemo(() => {
    const texto = buscar.toLowerCase().trim();

    if (!texto) return gastos;

    return gastos.filter((g) => {
      const combinado = `
        ${g.id || ""}
        ${g.fecha || ""}
        ${g.concepto || ""}
        ${g.detalle_gasto || ""}
        ${g.estado || ""}
        ${g.catalogo_proveedores?.nombre_proveedor || ""}
      `.toLowerCase();

      return combinado.includes(texto);
    });
  }, [gastos, buscar]);

  const totalPendiente = gastosFiltrados.reduce(
    (sum, g) => sum + Number(g.total || 0),
    0
  );

  const conCheque = gastosFiltrados.filter((g) => g.cheque_url).length;
  const sinCheque = gastosFiltrados.filter((g) => !g.cheque_url).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              Tesorería / Emisión de Cheques
            </h1>

            <p className="text-slate-500 mt-2">
              Pagos aprobados por tesorero y presidente, pendientes de emisión o registro de pago.
            </p>

            <p className="text-sm text-blue-700 font-bold mt-3">
              Condominio activo: {condominioNombre || "No seleccionado"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => cargarPagos(condominioId)}
            className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Actualizar
          </button>
        </div>
      </div>

      {mensaje && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Pagos pendientes</p>

          <h2 className="text-3xl font-black">{gastosFiltrados.length}</h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Monto pendiente</p>

          <h2 className="text-3xl font-black text-red-700">
            RD$ {dinero(totalPendiente)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Con cheque subido</p>

          <h2 className="text-3xl font-black text-green-700">{conCheque}</h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Sin cheque</p>

          <h2 className="text-3xl font-black text-amber-700">{sinCheque}</h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="font-black text-lg mb-1">
              Cuentas bancarias disponibles
            </h2>

            <p className="text-sm text-slate-500">
              Estas cuentas pertenecen al condominio activo y se usan para registrar pagos.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Buscar pago</label>

            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full md:w-96"
              placeholder="Proveedor, concepto, detalle..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
          {cuentasBanco.map((c) => (
            <div key={c.id} className="border rounded-xl p-4 bg-slate-50">
              <p className="font-black">{c.nombre_banco}</p>

              <p className="text-sm text-slate-600">
                Cuenta: {c.numero_cuenta}
              </p>

              <p className="text-sm text-slate-600">
                Tipo de cuenta: {c.tipo_cuenta || "-"}
              </p>

              <p className="text-sm text-slate-600">
                Fondo: {c.fondo_tipo || "-"}
              </p>

              <p className="text-sm text-slate-600">
                Moneda: {c.moneda || "-"}
              </p>

              <p className="text-sm text-slate-600">
                Balance: RD$ {dinero(c.balance_actual)}
              </p>

              <p className="text-xs text-blue-700 font-bold mt-1">
                ID cuenta: {c.id}
              </p>
            </div>
          ))}

          {cuentasBanco.length === 0 && (
            <div className="md:col-span-2 border rounded-xl p-5 bg-slate-50 text-center text-slate-500">
              No hay cuentas bancarias activas para este condominio.
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-black text-lg">
            Gastos aprobados pendientes de pago
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Se muestran gastos con aprobado_tesorero = true, aprobado_presidente = true y pagado = false.
          </p>
        </div>

        {loading ? (
          <div className="p-6">Cargando pagos pendientes...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Proveedor</th>
                  <th className="px-4 py-3 text-left">Concepto</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Aprobación</th>
                  <th className="px-4 py-3 text-center">Cheque</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {gastosFiltrados.map((g) => (
                  <tr key={g.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3">{g.fecha || "-"}</td>

                    <td className="px-4 py-3">
                      {g.catalogo_proveedores?.nombre_proveedor || "-"}
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-semibold">{g.concepto || "-"}</p>

                      {g.detalle_gasto && (
                        <p className="text-xs text-slate-500 mt-1">
                          {g.detalle_gasto}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-bold">
                      RD$ {dinero(g.total)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col gap-1 items-center">
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                          Tesorero
                        </span>

                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                          Presidente
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      {g.cheque_url ? (
                        <a
                          href={g.cheque_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-green-700 text-white px-3 py-1 rounded-lg inline-block"
                        >
                          Ver cheque
                        </a>
                      ) : (
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const archivo = e.target.files?.[0];

                            if (archivo) {
                              subirCheque(g, archivo);
                            }
                          }}
                          className="text-xs w-44"
                        />
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => marcarPagado(g)}
                        className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded-lg font-bold"
                      >
                        Marcar pagado
                      </button>

                      {g.numero_cheque && (
                        <div className="text-xs text-slate-600 mt-2">
                          Cheque: {g.numero_cheque}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

                {gastosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay gastos aprobados pendientes de pago para este condominio.
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