"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type GastoPagado = {
  id: number;
  condominio_id: number | null;
  condominio: string | null;
  fecha: string | null;
  concepto: string | null;
  detalle_gasto: string | null;
  monto: number | null;
  itbis: number | null;
  total: number | null;
  no_factura: string | null;
  ncf: string | null;
  metodo_pago: string | null;
  cuenta_banco: string | null;
  factura_url: string | null;
  estado: string | null;
  aprobado_tesorero: boolean | null;
  aprobado_presidente: boolean | null;
  pagado: boolean | null;
  cheque_url: string | null;
  numero_cheque: string | null;
  fecha_pago: string | null;
  catalogo_proveedores?: {
    nombre_proveedor: string | null;
  } | null;
  catalogo_categoria_gastos?: {
    nombre_categoria: string | null;
  } | null;
};

function formatearMoneda(valor: number | null | undefined) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(valor || 0));
}

export default function MobileSolicitudesPagadasPage() {
  const router = useRouter();

  const [gastos, setGastos] = useState<GastoPagado[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscar, setBuscar] = useState("");
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      router.push("/mobile");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre || `Condominio ID ${id}`);
    cargarGastosPagados(id);
  }, [router]);

  async function cargarGastosPagados(id: string) {
    if (!id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("gastos")
      .select(`
        id,
        condominio_id,
        condominio,
        fecha,
        concepto,
        detalle_gasto,
        monto,
        itbis,
        total,
        no_factura,
        ncf,
        metodo_pago,
        cuenta_banco,
        factura_url,
        estado,
        aprobado_tesorero,
        aprobado_presidente,
        pagado,
        cheque_url,
        numero_cheque,
        fecha_pago,
        catalogo_proveedores(nombre_proveedor),
        catalogo_categoria_gastos(nombre_categoria)
      `)
      .eq("condominio_id", Number(id))
      .eq("aprobado_tesorero", true)
      .eq("aprobado_presidente", true)
      .eq("pagado", true)
      .order("fecha_pago", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando historial de pagos: " + error.message);
      return;
    }

    setGastos((data as GastoPagado[]) || []);
  }

  function cerrarSesion() {
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_admin_id");

    router.push("/mobile");
  }

  const gastosFiltrados = useMemo(() => {
    const q = buscar.toLowerCase().trim();

    if (!q) return gastos;

    return gastos.filter((g) => {
      const texto = `${g.id || ""} ${g.fecha || ""} ${
        g.fecha_pago || ""
      } ${g.concepto || ""} ${g.detalle_gasto || ""} ${
        g.no_factura || ""
      } ${g.ncf || ""} ${g.numero_cheque || ""} ${
        g.catalogo_proveedores?.nombre_proveedor || ""
      } ${g.catalogo_categoria_gastos?.nombre_categoria || ""}`.toLowerCase();

      return texto.includes(q);
    });
  }, [gastos, buscar]);

  const totalPagado = gastosFiltrados.reduce(
    (sum, g) => sum + Number(g.total || 0),
    0
  );

  const conCheque = gastosFiltrados.filter((g) => g.cheque_url).length;

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <section className="bg-slate-800 text-white rounded-b-3xl p-5 shadow">
        <Link
          href="/mobile/admin/solicitudes-pagos"
          className="text-sm opacity-90"
        >
          ← Volver a solicitudes-pagos
        </Link>

        <h1 className="text-2xl font-black mt-3">Pagadas / Historial</h1>

        <p className="text-sm opacity-90 mt-1">
          {condominioNombre || "Condominio no seleccionado"}
        </p>

        <p className="text-sm opacity-90 mt-2">
          Historial de gastos aprobados y marcados como pagados.
        </p>
      </section>

      <section className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Pagados</p>
            <h2 className="text-2xl font-black text-slate-800">
              {gastosFiltrados.length}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Con cheque</p>
            <h2 className="text-2xl font-black text-blue-700">{conCheque}</h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Módulo</p>
            <h2 className="text-xl font-black text-green-700">Activo</h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <p className="text-xs text-slate-500">Total pagado filtrado</p>
          <h2 className="text-2xl font-black text-green-700">
            {formatearMoneda(totalPagado)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Buscar</label>

            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Proveedor, concepto, factura, NCF o cheque..."
            />
          </div>

          <button
            onClick={() => cargarGastosPagados(condominioId)}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold"
          >
            Actualizar historial
          </button>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <h2 className="text-lg font-black text-slate-900">
            Historial de pagos realizados
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Se muestran los gastos aprobados por tesorero y presidente que ya
            fueron marcados como pagados.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            Cargando historial...
          </div>
        ) : (
          <div className="space-y-3">
            {gastosFiltrados.map((g) => (
              <div
                key={g.id}
                className="bg-white rounded-2xl border shadow-sm p-4"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <h2 className="text-xl font-black text-slate-900">
                      Gasto #{g.id}
                    </h2>

                    <p className="font-bold text-slate-700 mt-2">
                      {g.concepto || "-"}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Fecha gasto: {g.fecha || "-"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="text-lg font-black text-green-700">
                      {formatearMoneda(g.total)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Proveedor</p>
                    <p className="font-bold">
                      {g.catalogo_proveedores?.nombre_proveedor || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Categoría</p>
                    <p className="font-bold">
                      {g.catalogo_categoria_gastos?.nombre_categoria || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Fecha pago</p>
                    <p className="font-bold">{g.fecha_pago || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">No. cheque</p>
                    <p className="font-bold">{g.numero_cheque || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Método pago</p>
                    <p className="font-bold">{g.metodo_pago || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">No. factura</p>
                    <p className="font-bold">{g.no_factura || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">NCF</p>
                    <p className="font-bold">{g.ncf || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Cuenta banco</p>
                    <p className="font-bold break-words">
                      {g.cuenta_banco || "-"}
                    </p>
                  </div>
                </div>

                {g.detalle_gasto && (
                  <div className="mt-4 bg-slate-50 border rounded-xl p-3">
                    <p className="text-xs text-slate-500">Detalle</p>
                    <p className="text-sm mt-1">{g.detalle_gasto}</p>
                  </div>
                )}

                <div className="mt-4">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                    Pagado
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  {g.factura_url ? (
                    <a
                      href={g.factura_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-900 text-white py-3 rounded-xl text-center text-sm font-bold"
                    >
                      Ver factura
                    </a>
                  ) : (
                    <div className="bg-slate-100 text-slate-400 py-3 rounded-xl text-center text-sm font-bold">
                      Sin factura
                    </div>
                  )}

                  {g.cheque_url ? (
                    <a
                      href={g.cheque_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-700 text-white py-3 rounded-xl text-center text-sm font-bold"
                    >
                      Ver cheque
                    </a>
                  ) : (
                    <div className="bg-slate-100 text-slate-400 py-3 rounded-xl text-center text-sm font-bold">
                      Sin cheque
                    </div>
                  )}
                </div>
              </div>
            ))}

            {gastosFiltrados.length === 0 && (
              <div className="bg-white rounded-2xl border shadow-sm p-6 text-center text-slate-500">
                No hay pagos realizados en el historial para este condominio.
              </div>
            )}
          </div>
        )}
      </section>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-4 text-center">
          <Link
            href="/mobile/admin"
            className="py-3 text-xs font-bold text-slate-700"
          >
            <div className="text-xl">🏠</div>
            Inicio
          </Link>

          <Link
            href="/mobile/admin/solicitudes-pagos/aprobadas"
            className="py-3 text-xs font-bold text-slate-700"
          >
            <div className="text-xl">✅</div>
            Aprobadas
          </Link>

          <Link
            href="/mobile/admin/solicitudes-pagos"
            className="py-3 text-xs font-bold text-slate-800"
          >
            <div className="text-xl">💼</div>
            Solicitudes
          </Link>

          <button
            type="button"
            onClick={cerrarSesion}
            className="py-3 text-xs font-bold text-red-600"
          >
            <div className="text-xl">🚪</div>
            Salir
          </button>
        </div>
      </nav>
    </main>
  );
}