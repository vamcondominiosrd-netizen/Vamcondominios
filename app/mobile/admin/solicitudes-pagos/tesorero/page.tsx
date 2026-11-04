"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type SolicitudPago = {
  id: number;
  condominio_id: number | null;
  condominio: string;
  fecha_solicitud: string;
  concepto: string;
  detalle: string;
  monto: number;
  itbis: number;
  total: number;
  no_factura: string;
  ncf: string;
  metodo_pago: string;
  cuenta_banco: string;
  soporte_url: string;
  prioridad: string;
  estado: string;
  comentario_tesorero: string;
  catalogo_proveedores?: {
    nombre_proveedor: string;
  };
  catalogo_categoria_gastos?: {
    nombre_categoria: string;
  };
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

export default function MobileAprobacionTesoreroPage() {
  const router = useRouter();

  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [loading, setLoading] = useState(false);
  const [comentarios, setComentarios] = useState<Record<number, string>>({});
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      router.push("/mobile");
      return;
    }

    const nombreFinal = nombre || `Condominio ID ${id}`;

    setCondominioId(id);
    setCondominioNombre(nombreFinal);

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
        catalogo_proveedores(nombre_proveedor),
        catalogo_categoria_gastos(nombre_categoria)
      `)
      .eq("condominio_id", Number(id))
      .eq("estado", "Pendiente aprobación tesorero")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando solicitudes: " + error.message);
      return;
    }

    setSolicitudes((data as SolicitudPago[]) || []);
  }

  async function actualizarEstado(id: number, nuevoEstado: string) {
    if (!condominioId) {
      alert("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    const comentario = comentarios[id] || "";

    if (
      (nuevoEstado === "Rechazado por tesorero" ||
        nuevoEstado === "Devuelto para corrección") &&
      !comentario
    ) {
      alert("Debe escribir un comentario para rechazar o devolver.");
      return;
    }

    const confirmar = confirm(
      `¿Está seguro de cambiar esta solicitud a: ${nuevoEstado}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("solicitudes_pago")
      .update({
        estado: nuevoEstado,
        comentario_tesorero: comentario,
        fecha_revision_tesorero: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error actualizando solicitud: " + error.message);
      return;
    }

    alert("Solicitud actualizada correctamente.");
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
      <section className="bg-yellow-600 text-white rounded-b-3xl p-5 shadow">
        <Link
          href="/mobile/admin/solicitudes-pagos"
          className="text-sm opacity-90"
        >
          ← Volver a solicitudes-pagos
        </Link>

        <h1 className="text-2xl font-black mt-3">Firma Tesorero</h1>

        <p className="text-sm opacity-90 mt-1">
          {condominioNombre || "Condominio no seleccionado"}
        </p>

        <p className="text-sm opacity-90 mt-2">
          Solicitudes pendientes de revisión y aprobación por tesorería.
        </p>
      </section>

      <section className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Pendientes</p>
            <h2 className="text-2xl font-black text-yellow-700">
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
          <p className="text-xs text-slate-500">Monto pendiente revisión</p>
          <h2 className="text-2xl font-black text-yellow-700">
            {formatearMoneda(totalPendiente)}
          </h2>
        </div>

        <button
          onClick={() => cargarSolicitudes(condominioId)}
          className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold"
        >
          Actualizar solicitudes
        </button>

        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <h2 className="text-lg font-black text-slate-900">
            Solicitudes pendientes del tesorero
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Revise la documentación, agregue comentario si aplica y firme la
            solicitud.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            Cargando solicitudes...
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

                <div className="mt-4">
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
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold mb-1">
                    Comentario del tesorero
                  </label>

                  <textarea
                    value={comentarios[s.id] || ""}
                    onChange={(e) =>
                      setComentarios({
                        ...comentarios,
                        [s.id]: e.target.value,
                      })
                    }
                    className="border rounded-xl px-4 py-3 w-full"
                    rows={3}
                    placeholder="Comentario de revisión"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 mt-4">
                  <button
                    onClick={() =>
                      actualizarEstado(s.id, "Aprobado por tesorero")
                    }
                    className="bg-green-700 text-white py-3 rounded-xl font-bold"
                  >
                    Aprobar y enviar al presidente
                  </button>

                  <button
                    onClick={() =>
                      actualizarEstado(s.id, "Devuelto para corrección")
                    }
                    className="bg-orange-600 text-white py-3 rounded-xl font-bold"
                  >
                    Devolver para corrección
                  </button>

                  <button
                    onClick={() =>
                      actualizarEstado(s.id, "Rechazado por tesorero")
                    }
                    className="bg-red-700 text-white py-3 rounded-xl font-bold"
                  >
                    Rechazar solicitud
                  </button>
                </div>
              </div>
            ))}

            {solicitudes.length === 0 && (
              <div className="bg-white rounded-2xl border shadow-sm p-6 text-center text-slate-500">
                No hay solicitudes pendientes de aprobación por tesorería para
                este condominio.
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
            href="/mobile/admin/solicitudes-pagos/nueva"
            className="py-3 text-xs font-bold text-slate-700"
          >
            <div className="text-xl">➕</div>
            Nueva
          </Link>

          <Link
            href="/mobile/admin/solicitudes-pagos"
            className="py-3 text-xs font-bold text-yellow-700"
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