"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/app/components/RequireAuth";
import { supabase } from "@/app/lib/supabaseClient";

type Proveedor = {
  id: number;
  nombre_proveedor: string | null;
};

type Categoria = {
  id: number;
  nombre_categoria: string | null;
};

type FacturaDetalle = {
  no_factura: string;
  fecha_factura: string;
  ncf: string;
  monto: string;
};

export default function SolicitudPagoAgrupadaPruebaPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);

  const [proveedorId, setProveedorId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [fechaSolicitud, setFechaSolicitud] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [concepto, setConcepto] = useState("");
  const [soporte, setSoporte] = useState<File | null>(null);

  const [facturas, setFacturas] = useState<FacturaDetalle[]>([
    {
      no_factura: "",
      fecha_factura: new Date().toISOString().slice(0, 10),
      ncf: "",
      monto: "",
    },
  ]);

  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);

  useEffect(() => {
    setCondominioId(localStorage.getItem("condominio_id") || "");
    setCondominioNombre(localStorage.getItem("condominio_nombre") || "");
    cargarCatalogos();
  }, []);

  async function cargarCatalogos() {
    const { data: proveedoresData } = await supabase
      .from("catalogo_proveedores")
      .select("id, nombre_proveedor")
      .order("nombre_proveedor", { ascending: true });

    const { data: categoriasData } = await supabase
      .from("catalogo_categoria_gastos")
      .select("id, nombre_categoria")
      .order("nombre_categoria", { ascending: true });

    setProveedores((proveedoresData as Proveedor[]) || []);
    setCategorias((categoriasData as Categoria[]) || []);
  }

  function dinero(valor: number) {
    return valor.toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function agregarFactura() {
    setFacturas((prev) => [
      ...prev,
      {
        no_factura: "",
        fecha_factura: new Date().toISOString().slice(0, 10),
        ncf: "",
        monto: "",
      },
    ]);
  }

  function actualizarFactura(
    index: number,
    campo: keyof FacturaDetalle,
    valor: string
  ) {
    setFacturas((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [campo]: valor } : f))
    );
  }

  function eliminarFactura(index: number) {
    setFacturas((prev) => prev.filter((_, i) => i !== index));
  }

  const proveedorNombre =
    proveedores.find((p) => String(p.id) === proveedorId)?.nombre_proveedor ||
    "-";

  const categoriaNombre =
    categorias.find((c) => String(c.id) === categoriaId)?.nombre_categoria ||
    "-";

  const totalGeneral = useMemo(() => {
    return facturas.reduce((sum, f) => sum + Number(f.monto || 0), 0);
  }, [facturas]);

  const facturasValidas = facturas.filter(
    (f) => f.no_factura.trim() && Number(f.monto || 0) > 0
  );

  function validarFormulario() {
    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo.");
      return false;
    }

    if (!proveedorId) {
      alert("Debe seleccionar el proveedor.");
      return false;
    }

    if (!categoriaId) {
      alert("Debe seleccionar la categoría.");
      return false;
    }

    if (!concepto.trim()) {
      alert("Debe indicar el concepto general.");
      return false;
    }

    if (facturasValidas.length === 0) {
      alert("Debe registrar al menos una factura con monto.");
      return false;
    }

    return true;
  }

  function generarVistaPrevia() {
    if (!validarFormulario()) return;

    setMostrarVistaPrevia(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function subirSoporteGeneral() {
    if (!soporte) return null;

    const extension = soporte.name.split(".").pop();
    const nombreArchivo = `${condominioId}/agrupadas/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("solicitudes-pago-agrupadas")
      .upload(nombreArchivo, soporte);

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from("solicitudes-pago-agrupadas")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  async function guardarSolicitud() {
    if (!validarFormulario()) return;

    const confirmar = confirm(
      `¿Desea crear esta solicitud agrupada por RD$ ${dinero(totalGeneral)}?`
    );

    if (!confirmar) return;

    setLoading(true);

    try {
      const soporteUrl = await subirSoporteGeneral();

      const usuario =
        localStorage.getItem("usuario_nombre") ||
        localStorage.getItem("user_name") ||
        "Sistema";

      const detalleTexto = facturasValidas
        .map(
          (f) =>
            `Factura ${f.no_factura} | Fecha ${f.fecha_factura} | NCF ${
              f.ncf || "-"
            } | RD$ ${dinero(Number(f.monto || 0))}`
        )
        .join("\n");

      const { data: solicitud, error } = await supabase
        .from("solicitudes_pago")
        .insert({
          condominio_id: Number(condominioId),
          condominio: condominioNombre,
          fecha_solicitud: fechaSolicitud,
          proveedor_id: Number(proveedorId),
          categoria_id: Number(categoriaId),
          concepto: concepto.trim(),
          detalle: `Solicitud agrupada de facturas\n\n${detalleTexto}\n\nTotal facturas: ${facturasValidas.length}\nTotal general: RD$ ${dinero(
            totalGeneral
          )}`,
          monto: totalGeneral,
          itbis: 0,
          total: totalGeneral,
          no_factura: "VARIAS",
          ncf: "VARIOS",
          metodo_pago: "Cheque",
          soporte_url: soporteUrl,
          prioridad: "Normal",
          estado: "Pendiente",
          created_by: usuario,
        })
        .select("id")
        .single();

      if (error) {
        alert("Error creando solicitud: " + error.message);
        setLoading(false);
        return;
      }

      const detalleInsert = facturasValidas.map((f) => ({
        solicitud_pago_id: solicitud.id,
        condominio_id: Number(condominioId),
        proveedor_id: Number(proveedorId),
        no_factura: f.no_factura.trim(),
        fecha_factura: f.fecha_factura || null,
        ncf: f.ncf.trim() || null,
        concepto: concepto.trim(),
        monto: Number(f.monto || 0),
        soporte_url: soporteUrl,
      }));

      const { error: detalleError } = await supabase
        .from("solicitudes_pago_detalle")
        .insert(detalleInsert);

      if (detalleError) {
        alert(
          "La solicitud se creó, pero falló el detalle: " +
            detalleError.message
        );
        setLoading(false);
        return;
      }

      alert("Solicitud agrupada creada correctamente.");
      window.location.href = "/solicitudes-pago";
    } catch (error: any) {
      alert("Error guardando solicitud agrupada: " + error.message);
    }

    setLoading(false);
  }

  return (
    <RequireAuth
      allowedRoles={[
        "admin",
        "administrador",
        "presidente",
        "tesorero",
        "secretario",
        "supervisor",
        "super_admin",
      ]}
    >
      <main className="min-h-screen bg-slate-100 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <section className="bg-white rounded-3xl border shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-purple-700 uppercase tracking-wide">
                  Solicitudes de Pago
                </p>

                <h1 className="text-3xl font-black text-slate-900 mt-1">
                  Pago Agrupado
                </h1>

                <p className="text-slate-500 mt-2">
                  Registre varias facturas de un mismo proveedor y genere una
                  sola solicitud para cheque.
                </p>

                <p className="text-sm text-blue-700 font-bold mt-3">
                  Condominio activo: {condominioNombre || "No seleccionado"}
                </p>
              </div>

              <Link
                href="/finanzas"
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold"
              >
                Volver a Finanzas
              </Link>
            </div>
          </section>

          {mostrarVistaPrevia && (
            <section className="bg-white rounded-3xl border-2 border-purple-300 shadow-sm p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Vista previa de solicitud agrupada
                  </h2>
                  <p className="text-sm text-slate-500">
                    Revise antes de guardar la solicitud.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarVistaPrevia(false)}
                  className="bg-slate-100 border px-4 py-2 rounded-xl font-bold"
                >
                  Cerrar vista previa
                </button>
              </div>

              <div className="border rounded-2xl p-5 bg-slate-50 space-y-3">
                <p>
                  <strong>Proveedor:</strong> {proveedorNombre}
                </p>
                <p>
                  <strong>Categoría:</strong> {categoriaNombre}
                </p>
                <p>
                  <strong>Fecha solicitud:</strong> {fechaSolicitud}
                </p>
                <p>
                  <strong>Concepto:</strong> {concepto}
                </p>
                <p>
                  <strong>Soporte general:</strong>{" "}
                  {soporte ? soporte.name : "Sin soporte seleccionado"}
                </p>
              </div>

              <div className="mt-5 overflow-auto border rounded-2xl">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3 border text-left">No. Factura</th>
                      <th className="p-3 border text-left">Fecha</th>
                      <th className="p-3 border text-left">NCF</th>
                      <th className="p-3 border text-right">Monto</th>
                    </tr>
                  </thead>

                  <tbody>
                    {facturasValidas.map((f, i) => (
                      <tr key={i}>
                        <td className="p-3 border font-bold">
                          {f.no_factura}
                        </td>
                        <td className="p-3 border">{f.fecha_factura}</td>
                        <td className="p-3 border">{f.ncf || "-"}</td>
                        <td className="p-3 border text-right font-bold">
                          RD$ {dinero(Number(f.monto || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 bg-purple-50 border border-purple-200 rounded-2xl p-5 text-right">
                <p className="text-sm text-purple-700 font-bold">
                  Cantidad facturas: {facturasValidas.length}
                </p>
                <p className="text-3xl font-black text-purple-900">
                  TOTAL CHEQUE: RD$ {dinero(totalGeneral)}
                </p>
              </div>
            </section>
          )}

          <section className="bg-white rounded-3xl border shadow-sm p-6">
            <h2 className="text-xl font-black text-slate-900 mb-4">
              Encabezado
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">
                  Proveedor
                </label>
                <select
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full bg-white"
                >
                  <option value="">Seleccione</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre_proveedor}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">
                  Categoría
                </label>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full bg-white"
                >
                  <option value="">Seleccione</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre_categoria}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">
                  Fecha solicitud
                </label>
                <input
                  type="date"
                  value={fechaSolicitud}
                  onChange={(e) => setFechaSolicitud(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">
                  Soporte general
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={(e) => setSoporte(e.target.files?.[0] || null)}
                  className="border rounded-xl px-4 py-3 w-full bg-white"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-sm font-bold mb-1">
                  Concepto general
                </label>
                <input
                  type="text"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                  placeholder="Ej. Pago facturas VialGas julio 2026"
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl border shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Detalle de facturas
                </h2>
                <p className="text-sm text-slate-500">
                  Agregue todas las facturas que serán pagadas con un solo
                  cheque.
                </p>
              </div>

              <button
                type="button"
                onClick={agregarFactura}
                className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-3 rounded-xl font-bold"
              >
                + Agregar factura
              </button>
            </div>

            <div className="space-y-4">
              {facturas.map((f, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-5 gap-4 border rounded-2xl p-4 bg-slate-50"
                >
                  <div>
                    <label className="block text-sm font-bold mb-1">
                      No. Factura
                    </label>
                    <input
                      value={f.no_factura}
                      onChange={(e) =>
                        actualizarFactura(
                          index,
                          "no_factura",
                          e.target.value
                        )
                      }
                      className="border rounded-xl px-4 py-3 w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-1">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={f.fecha_factura}
                      onChange={(e) =>
                        actualizarFactura(
                          index,
                          "fecha_factura",
                          e.target.value
                        )
                      }
                      className="border rounded-xl px-4 py-3 w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-1">
                      NCF
                    </label>
                    <input
                      value={f.ncf}
                      onChange={(e) =>
                        actualizarFactura(index, "ncf", e.target.value)
                      }
                      className="border rounded-xl px-4 py-3 w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-1">
                      Monto
                    </label>
                    <input
                      type="number"
                      value={f.monto}
                      onChange={(e) =>
                        actualizarFactura(index, "monto", e.target.value)
                      }
                      className="border rounded-xl px-4 py-3 w-full"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => eliminarFactura(index)}
                      className="bg-red-700 hover:bg-red-800 text-white px-4 py-3 rounded-xl font-bold w-full"
                      disabled={facturas.length === 1}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-slate-900 text-white rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-slate-300">Cantidad facturas</p>
                <p className="text-2xl font-black">
                  {facturasValidas.length}
                </p>
              </div>

              <div className="text-left md:text-right">
                <p className="text-sm text-slate-300">Total general</p>
                <p className="text-3xl font-black">
                  RD$ {dinero(totalGeneral)}
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-2">
                <button
                  type="button"
                  onClick={generarVistaPrevia}
                  className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-3 rounded-xl font-bold"
                >
                  Vista previa
                </button>

                <button
                  type="button"
                  onClick={guardarSolicitud}
                  disabled={loading}
                  className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white px-5 py-3 rounded-xl font-bold"
                >
                  {loading ? "Guardando..." : "Guardar solicitud"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </RequireAuth>
  );
}