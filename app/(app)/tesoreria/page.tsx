"use client";

import { useEffect, useState } from "react";
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
  fecha: string;
  concepto: string;
  detalle_gasto: string;
  total: number;
  estado: string;
  cheque_url?: string | null;
  numero_cheque?: string | null;
  fecha_pago?: string | null;
  catalogo_proveedores?: {
    nombre_proveedor: string;
  } | null;
};

export default function TesoreriaPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cuentasBanco, setCuentasBanco] = useState<CuentaBanco[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarPagos(id, nombre);
      cargarCuentas(id);
    }
  }, []);

  async function cargarPagos(id: string, nombre: string) {
    setLoading(true);

    let query = supabase
      .from("gastos")
      .select(`
        id,
        fecha,
        concepto,
        detalle_gasto,
        total,
        estado,
        cheque_url,
        numero_cheque,
        fecha_pago,
        catalogo_proveedores(nombre_proveedor)
      `)
      .eq("estado", "Aprobado por presidente")
      .order("fecha", { ascending: false });

    if (id) {
      query = query.eq("condominio_id", Number(id));
    } else if (nombre) {
      query = query.eq("condominio", nombre);
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      alert("Error cargando pagos: " + error.message);
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
      alert("Error cargando cuentas: " + error.message);
      return;
    }

    setCuentasBanco((data as CuentaBanco[]) || []);
  }

  async function subirCheque(g: Gasto, archivo: File) {
    const extension = archivo.name.split(".").pop();

    const nombreArchivo = `${condominioId}/${g.id}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("cheques-gastos")
      .upload(nombreArchivo, archivo);

    if (uploadError) {
      alert(uploadError.message);
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
      .eq("id", g.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Cheque subido correctamente.");

    cargarPagos(condominioId, condominioNombre);
  }

  async function marcarPagado(g: Gasto) {
    const numeroCheque = prompt("Número de cheque");

    if (!numeroCheque) return;

    const fechaPago = prompt("Fecha pago YYYY-MM-DD");

    if (!fechaPago) return;

    const cuentaId = prompt("Digite el ID de la cuenta bancaria");

    if (!cuentaId) return;

    const { error } = await supabase
      .from("gastos")
      .update({
        pagado: true,
        numero_cheque: numeroCheque,
        fecha_pago: fechaPago,
        cuenta_bancaria_id: Number(cuentaId),
        estado: "Pagado",
      })
      .eq("id", g.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Pago registrado correctamente.");

    cargarPagos(condominioId, condominioNombre);
  }

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  const totalPendiente = gastos.reduce(
    (sum, g) => sum + Number(g.total || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <h1 className="text-3xl font-bold">
          Tesorería / Emisión de Cheques
        </h1>

        <p className="text-slate-500 mt-1">
          Condominio activo: <strong>{condominioNombre}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Pagos pendientes</p>

          <h2 className="text-2xl font-bold">{gastos.length}</h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="text-sm text-slate-500">Monto pendiente</p>

          <h2 className="text-2xl font-bold text-red-700">
            RD$ {dinero(totalPendiente)}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <h2 className="font-bold mb-4">Cuentas bancarias disponibles</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cuentasBanco.map((c) => (
            <div key={c.id} className="border rounded-xl p-3 bg-slate-50">
              <p className="font-semibold">{c.nombre_banco}</p>

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
                ID: {c.id}
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
        <div className="p-4 border-b">
          <h2 className="font-bold">Pagos aprobados por presidencia</h2>
        </div>

        {loading ? (
          <div className="p-6">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Proveedor</th>
                  <th className="px-4 py-3 text-left">Concepto</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Cheque</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {gastos.map((g) => (
                  <tr key={g.id} className="border-t">
                    <td className="px-4 py-3">{g.fecha}</td>

                    <td className="px-4 py-3">
                      {g.catalogo_proveedores?.nombre_proveedor || "-"}
                    </td>

                    <td className="px-4 py-3">{g.concepto}</td>

                    <td className="px-4 py-3 text-right font-bold">
                      RD$ {dinero(g.total)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {g.cheque_url ? (
                        <a
                          href={g.cheque_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-green-700 text-white px-3 py-1 rounded-lg"
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
                          className="text-xs w-40"
                        />
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => marcarPagado(g)}
                        className="bg-blue-700 text-white px-3 py-1 rounded-lg"
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

                {gastos.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay pagos pendientes en tesorería.
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