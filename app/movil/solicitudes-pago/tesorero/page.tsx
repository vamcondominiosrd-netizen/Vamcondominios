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
  detalle: string | null;
  monto: number;
  itbis: number;
  total: number;
  no_factura: string | null;
  ncf: string | null;
  metodo_pago: string | null;
  cuenta_banco: string | null;
  soporte_url: string | null;
  prioridad: string | null;
  estado: string;
  comentario_tesorero: string | null;
  catalogo_proveedores?: {
    nombre_proveedor: string;
  } | null;
  catalogo_categoria_gastos?: {
    nombre_categoria: string;
  } | null;
};

export default function MovilSolicitudesTesoreroPage() {
  const router = useRouter();

  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [loading, setLoading] = useState(false);
  const [comentarios, setComentarios] = useState<Record<number, string>>({});

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");
  const [usuarioRol, setUsuarioRol] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const nombreUsuario = localStorage.getItem("usuario_nombre") || "";
    const rol = localStorage.getItem("usuario_rol") || "";

    if (!id || !rol) {
      router.push("/movil-login");
      return;
    }

    const rolNormalizado = rol.toLowerCase();

    const autorizado =
      rolNormalizado.includes("tesorero") ||
      rolNormalizado.includes("tesoreria") ||
      rolNormalizado.includes("tesorería") ||
      rolNormalizado.includes("admin") ||
      rolNormalizado.includes("administrador") ||
      rolNormalizado.includes("super");

    if (!autorizado) {
      alert("Su usuario no tiene permiso para aprobar como tesorero.");
      router.push("/movil");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre || `Condominio ID ${id}`);
    setUsuarioNombre(nombreUsuario);
    setUsuarioRol(rol);

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
      alert("No hay condominio activo.");
      return;
    }

    const comentario = comentarios[id] || "";

    if (
      (nuevoEstado === "Rechazado por tesorero" ||
        nuevoEstado === "Devuelto para corrección") &&
      !comentario.trim()
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

  const totalPendiente = solicitudes.reduce(
    (sum, s) => sum + Number(s.total || 0),
    0
  );

  function prioridadColor(prioridad: string | null) {
    if (prioridad === "Urgente") return "bg-red-100 text-red-700";
    if (prioridad === "Alta") return "bg-orange-100 text-orange-700";
    return "bg-slate-100 text-slate-700";
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-slate-950 text-white rounded-3xl p-5 shadow">
          <p className="text-sm text-amber-300 font-semibold">
            VAM Administración de Condominios
          </p>

          <h1 className="text-2xl font-bold mt-2">
            Aprobación Tesorero
          </h1>

          <p className="text-slate-300 text-sm mt-2">
            {condominioNombre}
          </p>

          <div className="mt-4 bg-slate-800 rounded-2xl p-3">
            <p className="text-xs text-slate-400">Usuario</p>
            <p className="font-bold">{usuarioNombre || "Usuario móvil"}</p>
            <p className="text-xs text-amber-300 mt-1">Rol: {usuarioRol}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border">
            <p className="text-xs text-slate-500">Pendientes</p>
            <p className="text-2xl font-bold">{solicitudes.length}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border">
            <p className="text-xs text-slate-500">Monto</p>
            <p className="text-lg font-bold text-yellow-700">
              RD$
              {totalPendiente.toLocaleString("es-DO", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href="/movil"
            className="flex-1 bg-slate-700 text-white text-center rounded-2xl p-3 font-semibold"
          >
            Volver
          </Link>

          <button
            onClick={() => cargarSolicitudes(condominioId)}
            className="flex-1 bg-blue-700 text-white rounded-2xl p-3 font-semibold"
          >
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-5 text-center text-slate-500">
            Cargando solicitudes...
          </div>
        ) : (
          <div className="space-y-4">
            {solicitudes.map((s) => (
              <div key={s.id} className="bg-white rounded-3xl p-5 shadow-sm border">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      Solicitud #{s.id}
                    </p>

                    <h2 className="text-lg font-bold text-slate-900">
                      {s.concepto}
                    </h2>

                    <p className="text-sm text-slate-500 mt-1">
                      Fecha: {s.fecha_solicitud}
                    </p>
                  </div>

                  <span
                    className={`h-fit px-3 py-1 rounded-full text-xs font-semibold ${prioridadColor(
                      s.prioridad
                    )}`}
                  >
                    {s.prioridad || "Normal"}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <p>
                    <span className="text-slate-500">Proveedor:</span>{" "}
                    <strong>
                      {s.catalogo_proveedores?.nombre_proveedor || "-"}
                    </strong>
                  </p>

                  <p>
                    <span className="text-slate-500">Categoría:</span>{" "}
                    <strong>
                      {s.catalogo_categoria_gastos?.nombre_categoria || "-"}
                    </strong>
                  </p>

                  <p>
                    <span className="text-slate-500">Método:</span>{" "}
                    <strong>{s.metodo_pago || "-"}</strong>
                  </p>

                  <p>
                    <span className="text-slate-500">Factura:</span>{" "}
                    <strong>{s.no_factura || "-"}</strong>
                  </p>

                  <p>
                    <span className="text-slate-500">NCF:</span>{" "}
                    <strong>{s.ncf || "-"}</strong>
                  </p>
                </div>

                <div className="mt-4 bg-green-50 border border-green-100 rounded-2xl p-4">
                  <p className="text-xs text-green-700">Total solicitado</p>
                  <p className="text-2xl font-bold text-green-800">
                    RD$
                    {Number(s.total || 0).toLocaleString("es-DO", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>

                {s.detalle && (
                  <div className="mt-4">
                    <p className="text-xs text-slate-500">Detalle</p>
                    <p className="text-sm text-slate-700">{s.detalle}</p>
                  </div>
                )}

                <div className="mt-4">
                  {s.soporte_url ? (
                    <a
                      href={s.soporte_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center bg-slate-900 text-white rounded-2xl p-3 font-semibold"
                    >
                      Ver soporte / documento
                    </a>
                  ) : (
                    <div className="text-center bg-slate-100 text-slate-400 rounded-2xl p-3">
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
                    className="border rounded-2xl px-3 py-2 w-full"
                    rows={3}
                    placeholder="Comentario de revisión"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 mt-4">
                  <button
                    onClick={() =>
                      actualizarEstado(s.id, "Aprobado por tesorero")
                    }
                    className="bg-green-700 text-white rounded-2xl p-3 font-bold"
                  >
                    Aprobar
                  </button>

                  <button
                    onClick={() =>
                      actualizarEstado(s.id, "Devuelto para corrección")
                    }
                    className="bg-orange-600 text-white rounded-2xl p-3 font-bold"
                  >
                    Devolver para corrección
                  </button>

                  <button
                    onClick={() =>
                      actualizarEstado(s.id, "Rechazado por tesorero")
                    }
                    className="bg-red-700 text-white rounded-2xl p-3 font-bold"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}

            {solicitudes.length === 0 && (
              <div className="bg-white rounded-3xl p-6 text-center text-slate-500 border">
                No hay solicitudes pendientes para aprobación del tesorero.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}