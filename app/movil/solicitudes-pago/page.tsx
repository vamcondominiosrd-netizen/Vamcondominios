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
  comentario_presidente: string | null;
  gasto_generado_id: number | null;
  catalogo_proveedores?: {
    nombre_proveedor: string;
  } | null;
  catalogo_categoria_gastos?: {
    nombre_categoria: string;
  } | null;
};

export default function MovilSolicitudesPagoPage() {
  const router = useRouter();

  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [buscar, setBuscar] = useState("");

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
        comentario_presidente,
        gasto_generado_id,
        catalogo_proveedores(nombre_proveedor),
        catalogo_categoria_gastos(nombre_categoria)
      `)
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando solicitudes: " + error.message);
      return;
    }

    setSolicitudes((data as SolicitudPago[]) || []);
  }

  const solicitudesFiltradas = solicitudes.filter((s) => {
    const cumpleEstado = filtroEstado === "" || s.estado === filtroEstado;

    const texto = `${s.concepto || ""} ${s.detalle || ""} ${
      s.catalogo_proveedores?.nombre_proveedor || ""
    } ${s.catalogo_categoria_gastos?.nombre_categoria || ""}`.toLowerCase();

    const cumpleBusqueda = texto.includes(buscar.toLowerCase());

    return cumpleEstado && cumpleBusqueda;
  });

  const totalSolicitado = solicitudesFiltradas.reduce(
    (sum, s) => sum + Number(s.total || 0),
    0
  );

  function estadoColor(estado: string) {
    if (estado === "Pendiente aprobación tesorero") {
      return "bg-yellow-100 text-yellow-800";
    }

    if (estado === "Aprobado por tesorero") {
      return "bg-blue-100 text-blue-800";
    }

    if (estado === "Aprobado por presidente") {
      return "bg-green-100 text-green-800";
    }

    if (estado?.includes("Rechazado")) {
      return "bg-red-100 text-red-800";
    }

    if (estado === "Devuelto para corrección" || estado === "Pendiente aclaración") {
      return "bg-orange-100 text-orange-800";
    }

    return "bg-slate-100 text-slate-700";
  }

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
            Solicitudes de Pago
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
            <p className="text-xs text-slate-500">Registros</p>
            <p className="text-2xl font-bold">{solicitudesFiltradas.length}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-lg font-bold text-green-700">
              RD$
              {totalSolicitado.toLocaleString("es-DO", {
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

        <div className="bg-white rounded-3xl p-4 shadow-sm border space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Estado
            </label>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border rounded-2xl px-3 py-3 w-full bg-white"
            >
              <option value="">Todos</option>
              <option value="Pendiente aprobación tesorero">
                Pendiente tesorero
              </option>
              <option value="Aprobado por tesorero">
                Pendiente presidente
              </option>
              <option value="Aprobado por presidente">
                Aprobado presidente
              </option>
              <option value="Devuelto para corrección">
                Devuelto para corrección
              </option>
              <option value="Pendiente aclaración">
                Pendiente aclaración
              </option>
              <option value="Rechazado por tesorero">
                Rechazado por tesorero
              </option>
              <option value="Rechazado por presidente">
                Rechazado por presidente
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Buscar
            </label>

            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="border rounded-2xl px-3 py-3 w-full"
              placeholder="Buscar por concepto, proveedor o categoría"
            />
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-5 text-center text-slate-500">
            Cargando solicitudes...
          </div>
        ) : (
          <div className="space-y-4">
            {solicitudesFiltradas.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-3xl p-5 shadow-sm border"
              >
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

                <div className="mt-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoColor(
                      s.estado
                    )}`}
                  >
                    {s.estado}
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

                {s.comentario_tesorero && (
                  <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-blue-700">
                      Comentario del tesorero
                    </p>
                    <p className="text-sm text-blue-900 mt-1">
                      {s.comentario_tesorero}
                    </p>
                  </div>
                )}

                {s.comentario_presidente && (
                  <div className="mt-4 bg-purple-50 border border-purple-100 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-purple-700">
                      Comentario del presidente
                    </p>
                    <p className="text-sm text-purple-900 mt-1">
                      {s.comentario_presidente}
                    </p>
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

                {s.gasto_generado_id && (
                  <div className="mt-4 bg-green-100 text-green-800 rounded-2xl p-3 text-center text-sm font-semibold">
                    Gasto generado #{s.gasto_generado_id}
                  </div>
                )}
              </div>
            ))}

            {solicitudesFiltradas.length === 0 && (
              <div className="bg-white rounded-3xl p-6 text-center text-slate-500 border">
                No hay solicitudes de pago registradas para este condominio.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}