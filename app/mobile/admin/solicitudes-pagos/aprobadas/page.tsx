"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type SolicitudPago = {
  id: number;
  condominio_id: number | null;
  condominio: string | null;
  fecha_solicitud: string | null;
  concepto: string | null;
  detalle: string | null;
  monto: number | null;
  itbis: number | null;
  total: number | null;
  no_factura: string | null;
  ncf: string | null;
  metodo_pago: string | null;
  cuenta_banco: string | null;
  soporte_url: string | null;
  prioridad: string | null;
  estado: string | null;
  comentario_tesorero: string | null;
  comentario_presidente: string | null;
  proveedor_id: number | null;
  categoria_id: number | null;
  gasto_generado_id: number | null;
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

function prioridadColor(prioridad: string | null | undefined) {
  if (prioridad === "Urgente") return "bg-red-100 text-red-700";
  if (prioridad === "Alta") return "bg-orange-100 text-orange-700";
  return "bg-slate-100 text-slate-700";
}

export default function MobileSolicitudesAprobadasPage() {
  const router = useRouter();

  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [loading, setLoading] = useState(false);
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

    cargarSolicitudes(id);
  }, [router]);

  async function cargarSolicitudes(id: string) {
    if (!id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("solicitudes_pago")
      .select(`
        id,
        condominio_id,
        condominio,
        fecha_solicitud,
        concepto,
        detalle,
        monto,
        itbis,
        total,
        no_factura,
        ncf,
        metodo_pago,
        cuenta_banco,
        soporte_url,
        prioridad,
        estado,
        comentario_tesorero,
        comentario_presidente,
        proveedor_id,
        categoria_id,
        gasto_generado_id,
        catalogo_proveedores(nombre_proveedor),
        catalogo_categoria_gastos(nombre_categoria)
      `)
      .eq("condominio_id", Number(id))
      .eq("estado", "Aprobado por presidente")
      .is("gasto_generado_id", null)
      .order("fecha_revision_presidente", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando solicitudes aprobadas: " + error.message);
      return;
    }

    setSolicitudes((data as SolicitudPago[]) || []);
  }

  async function generarGasto(s: SolicitudPago) {
    if (!condominioId) {
      alert("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    if (s.gasto_generado_id) {
      alert("Esta solicitud ya fue convertida en gasto.");
      return;
    }

    const confirmar = confirm(
      `¿Desea generar el gasto de la solicitud #${s.id}?`
    );

    if (!confirmar) return;

    const { data: gastoData, error: gastoError } = await supabase
      .from("gastos")
      .insert([
        {
          condominio_id: Number(condominioId),
          condominio: condominioNombre || s.condominio,
          fecha: s.fecha_solicitud,
          categoria_id: s.categoria_id,
          proveedor_id: s.proveedor_id,
          concepto: s.concepto,
          detalle_gasto: s.detalle,
          monto: Number(s.monto || 0),
          itbis: Number(s.itbis || 0),
          total: Number(s.total || 0),
          no_factura: s.no_factura,
          ncf: s.ncf,
          metodo_pago: s.metodo_pago,
          cuenta_banco: s.cuenta_banco,
          factura_url: s.soporte_url,
          estado: "Aprobado por presidente",
          aprobado_tesorero: true,
          aprobado_presidente: true,
          pagado: false,
        },
      ])
      .select()
      .single();

    if (gastoError) {
      alert("Error generando gasto: " + gastoError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("solicitudes_pago")
      .update({
        gasto_generado_id: gastoData.id,
        gasto_generado_at: new Date().toISOString(),
        estado: "Gasto generado",
      })
      .eq("id", s.id)
      .eq("condominio_id", Number(condominioId));

    if (updateError) {
      alert(
        "El gasto fue generado, pero ocurrió un error actualizando la solicitud: " +
          updateError.message
      );
      return;
    }

    alert("Gasto generado correctamente.");
    cargarSolicitudes(condominioId);
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

  const totalPendiente = solicitudes.reduce(
    (sum, s) => sum + Number(s.total || 0),
    0
  );

  const urgentes = solicitudes.filter((s) => s.prioridad === "Urgente").length;

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <section className="bg-green-700 text-white rounded-b-3xl p-5 shadow">
        <Link
          href="/mobile/admin/solicitudes-pagos"
          className="text-sm opacity-90"
        >
          ← Volver a solicitudes-pagos
        </Link>

        <h1 className="text-2xl font-black mt-3">Solicitudes Aprobadas</h1>

        <p className="text-sm opacity-90 mt-1">
          {condominioNombre || "Condominio no seleccionado"}
        </p>

        <p className="text-sm opacity-90 mt-2">
          Solicitudes aprobadas por presidente pendientes de generar gasto.
        </p>
      </section>

      <section className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Aprobadas</p>
            <h2 className="text-2xl font-black text-green-700">
              {solicitudes.length}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Urgentes</p>
            <h2 className="text-2xl font-black text-red-700">{urgentes}</h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Módulo</p>
            <h2 className="text-xl font-black text-blue-700">Activo</h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <p className="text-xs text-slate-500">
            Monto pendiente de generar gasto
          </p>

          <h2 className="text-2xl font-black text-green-700">
            {formatearMoneda(totalPendiente)}
          </h2>
        </div>

        <button
          onClick={() => cargarSolicitudes(condominioId)}
          className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold"
        >
          Actualizar aprobadas
        </button>

        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <h2 className="text-lg font-black text-slate-900">
            Listas para generar gasto
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Al generar el gasto, la solicitud se moverá al estado Gasto generado.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            Cargando solicitudes aprobadas...
          </div>
        ) : (
          <div className="space-y-3">
            {solicitudes.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl border shadow-sm p-4"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-black text-slate-900">
                        Solicitud #{s.id}
                      </h2>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${prioridadColor(
                          s.prioridad
                        )}`}
                      >
                        {s.prioridad || "Normal"}
                      </span>
                    </div>

                    <p className="font-bold text-slate-700 mt-2">
                      {s.concepto || "-"}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Fecha: {s.fecha_solicitud || "-"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="text-lg font-black text-green-700">
                      {formatearMoneda(s.total)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Proveedor</p>
                    <p className="font-bold">
                      {s.catalogo_proveedores?.nombre_proveedor || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Categoría</p>
                    <p className="font-bold">
                      {s.catalogo_categoria_gastos?.nombre_categoria || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Monto</p>
                    <p className="font-bold">{formatearMoneda(s.monto)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">ITBIS</p>
                    <p className="font-bold">{formatearMoneda(s.itbis)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Método pago</p>
                    <p className="font-bold">{s.metodo_pago || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">No. Factura</p>
                    <p className="font-bold">{s.no_factura || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">NCF</p>
                    <p className="font-bold">{s.ncf || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Cuenta banco</p>
                    <p className="font-bold break-words">
                      {s.cuenta_banco || "-"}
                    </p>
                  </div>
                </div>

                {s.detalle && (
                  <div className="mt-4 bg-slate-50 border rounded-xl p-3">
                    <p className="text-xs text-slate-500">Detalle</p>
                    <p className="text-sm mt-1">{s.detalle}</p>
                  </div>
                )}

                {s.comentario_tesorero && (
                  <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-sm font-semibold text-blue-800">
                      Comentario del tesorero
                    </p>
                    <p className="text-sm text-blue-900 mt-1">
                      {s.comentario_tesorero}
                    </p>
                  </div>
                )}

                {s.comentario_presidente && (
                  <div className="mt-4 bg-green-50 border border-green-100 rounded-xl p-3">
                    <p className="text-sm font-semibold text-green-800">
                      Comentario del presidente
                    </p>
                    <p className="text-sm text-green-900 mt-1">
                      {s.comentario_presidente}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 mt-4">
                  {s.soporte_url ? (
                    <a
                      href={s.soporte_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-slate-900 text-white py-3 rounded-xl text-center font-bold"
                    >
                      Ver soporte
                    </a>
                  ) : (
                    <div className="bg-slate-100 text-slate-400 py-3 rounded-xl text-center font-bold">
                      Sin soporte adjunto
                    </div>
                  )}

                  <button
                    onClick={() => generarGasto(s)}
                    className="bg-green-700 text-white py-3 rounded-xl font-bold"
                  >
                    Generar gasto
                  </button>
                </div>
              </div>
            ))}

            {solicitudes.length === 0 && (
              <div className="bg-white rounded-2xl border shadow-sm p-6 text-center text-slate-500">
                No hay solicitudes aprobadas pendientes de generar gasto.
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
            href="/mobile/admin/solicitudes-pagos/presidente"
            className="py-3 text-xs font-bold text-slate-700"
          >
            <div className="text-xl">🖊️</div>
            Presidente
          </Link>

          <Link
            href="/mobile/admin/solicitudes-pagos"
            className="py-3 text-xs font-bold text-green-700"
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