"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type Proveedor = {
  id: number;
  nombre_proveedor: string | null;
};

type Categoria = {
  id: number;
  nombre_categoria: string | null;
};

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
  proveedor_id: number | null;
  categoria_id: number | null;
  gasto_generado_id: number | null;
  created_at: string | null;
};

const BUCKET_SOPORTES = "soportes-solicitudes-pago";

export default function EditarSolicitudPagoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const solicitudId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoSoporte, setSubiendoSoporte] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  const [solicitud, setSolicitud] = useState<SolicitudPago | null>(null);

  const [fechaSolicitud, setFechaSolicitud] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [concepto, setConcepto] = useState("");
  const [detalle, setDetalle] = useState("");
  const [monto, setMonto] = useState("");
  const [itbis, setItbis] = useState("");
  const [noFactura, setNoFactura] = useState("");
  const [ncf, setNcf] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [cuentaBanco, setCuentaBanco] = useState("");
  const [prioridad, setPrioridad] = useState("Normal");
  const [soporteUrl, setSoporteUrl] = useState("");

  const total = useMemo(() => {
    return Number(monto || 0) + Number(itbis || 0);
  }, [monto, itbis]);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      setMensaje("No hay condominio activo. Debe iniciar sesión nuevamente.");
      setLoading(false);
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre || `Condominio ID ${id}`);

    cargarData(id);
  }, [solicitudId]);

  function normalizarEstado(estado: string | null | undefined) {
    const valor = String(estado || "").trim().toLowerCase();

    if (
      valor === "pendiente aprobación tesorero" ||
      valor === "pendiente aprobacion tesorero" ||
      valor === "pendiente_tesorero" ||
      valor === "pendiente tesorero"
    ) {
      return "pendiente_tesorero";
    }

    if (
      valor === "aprobado por tesorero" ||
      valor === "aprobada por tesorero" ||
      valor === "aprobado_tesorero" ||
      valor === "pendiente_presidente" ||
      valor === "pendiente aprobación presidente" ||
      valor === "pendiente aprobacion presidente"
    ) {
      return "pendiente_presidente";
    }

    if (
      valor === "aprobado por presidente" ||
      valor === "aprobada por presidente" ||
      valor === "aprobado_presidente" ||
      valor === "aprobada_presidente" ||
      valor === "aprobado" ||
      valor === "aprobada" ||
      valor === "aprobado final" ||
      valor === "aprobado_final"
    ) {
      return "aprobado_presidente";
    }

    if (
      valor === "gasto generado" ||
      valor === "generado" ||
      valor === "convertido en gasto"
    ) {
      return "gasto_generado";
    }

    if (valor.includes("rechazado") || valor.includes("rechazada")) {
      return "rechazado";
    }

    if (
      valor === "cancelada" ||
      valor === "cancelado" ||
      valor === "anulada" ||
      valor === "anulado"
    ) {
      return "cancelado";
    }

    return valor || "sin_estado";
  }

  function puedeEditar(s: SolicitudPago | null) {
    if (!s) return false;

    const estadoNormalizado = normalizarEstado(s.estado);

    return (
      !s.gasto_generado_id &&
      (estadoNormalizado === "pendiente_tesorero" ||
        estadoNormalizado === "sin_estado" ||
        !s.estado)
    );
  }

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function fechaLimpia(fecha?: string | null) {
    if (!fecha) return "";
    return String(fecha).split("T")[0];
  }

  async function cargarData(idCondominio: string) {
    setLoading(true);
    setMensaje("");

    await Promise.all([
      cargarSolicitud(idCondominio),
      cargarProveedores(idCondominio),
      cargarCategorias(idCondominio),
    ]);

    setLoading(false);
  }

  async function cargarSolicitud(idCondominio: string) {
    if (!solicitudId) {
      setMensaje("No se encontró el ID de la solicitud.");
      return;
    }

    const { data, error } = await supabase
      .from("solicitudes_pago")
      .select(
        "id, condominio_id, condominio, fecha_solicitud, concepto, detalle, monto, itbis, total, no_factura, ncf, metodo_pago, cuenta_banco, soporte_url, prioridad, estado, proveedor_id, categoria_id, gasto_generado_id, created_at"
      )
      .eq("id", Number(solicitudId))
      .eq("condominio_id", Number(idCondominio))
      .maybeSingle();

    if (error || !data) {
      setMensaje(
        "No se pudo cargar la solicitud: " +
          (error?.message || "Solicitud no encontrada.")
      );
      return;
    }

    const solicitudData = data as SolicitudPago;

    setSolicitud(solicitudData);

    setFechaSolicitud(fechaLimpia(solicitudData.fecha_solicitud));
    setProveedorId(
      solicitudData.proveedor_id ? String(solicitudData.proveedor_id) : ""
    );
    setCategoriaId(
      solicitudData.categoria_id ? String(solicitudData.categoria_id) : ""
    );
    setConcepto(solicitudData.concepto || "");
    setDetalle(solicitudData.detalle || "");
    setMonto(String(Number(solicitudData.monto || 0)));
    setItbis(String(Number(solicitudData.itbis || 0)));
    setNoFactura(solicitudData.no_factura || "");
    setNcf(solicitudData.ncf || "");
    setMetodoPago(solicitudData.metodo_pago || "");
    setCuentaBanco(solicitudData.cuenta_banco || "");
    setPrioridad(solicitudData.prioridad || "Normal");
    setSoporteUrl(solicitudData.soporte_url || "");
  }

  async function cargarProveedores(idCondominio: string) {
    const { data, error } = await supabase
      .from("catalogo_proveedores")
      .select("id, nombre_proveedor")
      .eq("condominio_id", Number(idCondominio))
      .order("nombre_proveedor", { ascending: true });

    if (error) {
      console.error(error);
      setProveedores([]);
      return;
    }

    setProveedores((data || []) as Proveedor[]);
  }

  async function cargarCategorias(idCondominio: string) {
    const { data, error } = await supabase
      .from("catalogo_categoria_gastos")
      .select("id, nombre_categoria")
      .eq("condominio_id", Number(idCondominio))
      .order("nombre_categoria", { ascending: true });

    if (error) {
      console.error(error);
      setCategorias([]);
      return;
    }

    setCategorias((data || []) as Categoria[]);
  }

  async function subirSoporteFactura(archivo: File) {
    if (!archivo) return;

    if (!condominioId) {
      alert("No hay condominio activo.");
      return;
    }

    if (!solicitud) {
      alert("No hay solicitud cargada.");
      return;
    }

    if (!puedeEditar(solicitud)) {
      alert("Esta solicitud no puede editarse porque ya fue aprobada o procesada.");
      return;
    }

    const extension = archivo.name.split(".").pop();
    const nombreLimpio = archivo.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 60);

    const nombreArchivo = `${condominioId}/solicitud-${solicitud.id}-${Date.now()}-${nombreLimpio}.${extension}`;

    setSubiendoSoporte(true);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_SOPORTES)
      .upload(nombreArchivo, archivo, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setSubiendoSoporte(false);
      alert("Error subiendo soporte: " + uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from(BUCKET_SOPORTES)
      .getPublicUrl(nombreArchivo);

    const publicUrl = data.publicUrl;

    setSoporteUrl(publicUrl);

    const { error: updateError } = await supabase
      .from("solicitudes_pago")
      .update({
        soporte_url: publicUrl,
      })
      .eq("id", solicitud.id)
      .eq("condominio_id", Number(condominioId));

    setSubiendoSoporte(false);

    if (updateError) {
      alert(
        "El archivo fue subido, pero no se pudo actualizar la solicitud: " +
          updateError.message
      );
      return;
    }

    setSolicitud({
      ...solicitud,
      soporte_url: publicUrl,
    });

    alert("Soporte subido correctamente.");
  }

  async function guardarCambios() {
    if (!solicitud) {
      alert("No hay solicitud cargada.");
      return;
    }

    if (!puedeEditar(solicitud)) {
      alert("Esta solicitud no puede editarse porque ya fue aprobada o procesada.");
      return;
    }

    if (!fechaSolicitud) {
      alert("Debe indicar la fecha de solicitud.");
      return;
    }

    if (!concepto.trim()) {
      alert("Debe indicar el concepto.");
      return;
    }

    if (Number(total || 0) <= 0) {
      alert("El total debe ser mayor que cero.");
      return;
    }

    const confirmar = confirm(
      `¿Desea guardar los cambios de la solicitud #${solicitud.id}?`
    );

    if (!confirmar) return;

    setGuardando(true);

    const { error } = await supabase
      .from("solicitudes_pago")
      .update({
        fecha_solicitud: fechaSolicitud,
        proveedor_id: proveedorId ? Number(proveedorId) : null,
        categoria_id: categoriaId ? Number(categoriaId) : null,
        concepto: concepto.trim(),
        detalle: detalle.trim() || null,
        monto: Number(monto || 0),
        itbis: Number(itbis || 0),
        total: Number(total || 0),
        no_factura: noFactura.trim() || null,
        ncf: ncf.trim() || null,
        metodo_pago: metodoPago || null,
        cuenta_banco: cuentaBanco.trim() || null,
        prioridad: prioridad || "Normal",
        soporte_url: soporteUrl.trim() || null,
      })
      .eq("id", solicitud.id)
      .eq("condominio_id", Number(condominioId));

    setGuardando(false);

    if (error) {
      alert("Error guardando cambios: " + error.message);
      return;
    }

    alert("Solicitud actualizada correctamente.");
    router.push("/solicitudes-pago");
  }

  if (loading) {
    return (
      <main className="p-6">
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          Cargando solicitud...
        </div>
      </main>
    );
  }

  if (mensaje) {
    return (
      <main className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6">
          <p className="font-bold">{mensaje}</p>

          <Link
            href="/solicitudes-pago"
            className="inline-block mt-4 bg-slate-800 text-white px-4 py-2 rounded-xl font-bold"
          >
            Volver
          </Link>
        </div>
      </main>
    );
  }

  if (!solicitud) {
    return (
      <main className="p-6">
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          No se encontró la solicitud.
        </div>
      </main>
    );
  }

  const editable = puedeEditar(solicitud);

  return (
    <main className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              Editar Solicitud de Pago
            </h1>

            <p className="text-slate-500 mt-2">
              Solicitud #{solicitud.id} - {condominioNombre}
            </p>

            <p className="text-sm mt-2">
              <strong>Estado actual:</strong>{" "}
              <span className="font-bold text-blue-700">
                {solicitud.estado || "Sin estado"}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/solicitudes-pago"
              className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold"
            >
              Volver
            </Link>

            <Link
              href={`/solicitudes-pago/reporte/${solicitud.id}`}
              className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-xl font-bold"
            >
              Reporte
            </Link>
          </div>
        </div>
      </div>

      {!editable && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl p-4 text-sm font-semibold">
          Esta solicitud no puede editarse porque ya fue aprobada, procesada o
          convertida en gasto.
        </div>
      )}

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black text-slate-900 mb-5">
          Datos de la solicitud
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Fecha solicitud
            </label>
            <input
              type="date"
              value={fechaSolicitud}
              onChange={(e) => setFechaSolicitud(e.target.value)}
              disabled={!editable}
              className="border rounded-xl px-4 py-3 w-full disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Prioridad</label>
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              disabled={!editable}
              className="border rounded-xl px-4 py-3 w-full bg-white disabled:bg-slate-100"
            >
              <option value="Normal">Normal</option>
              <option value="Alta">Alta</option>
              <option value="Urgente">Urgente</option>
              <option value="Baja">Baja</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Proveedor</label>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              disabled={!editable}
              className="border rounded-xl px-4 py-3 w-full bg-white disabled:bg-slate-100"
            >
              <option value="">Seleccione proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre_proveedor}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Categoría</label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              disabled={!editable}
              className="border rounded-xl px-4 py-3 w-full bg-white disabled:bg-slate-100"
            >
              <option value="">Seleccione categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_categoria}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="block text-sm font-semibold mb-1">Concepto</label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              disabled={!editable}
              className="border rounded-xl px-4 py-3 w-full disabled:bg-slate-100"
              placeholder="Ej. Pago factura, servicio, mantenimiento..."
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-sm font-semibold mb-1">
              Detalle / descripción
            </label>
            <textarea
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              disabled={!editable}
              className="border rounded-xl px-4 py-3 w-full min-h-[110px] disabled:bg-slate-100"
              placeholder="Detalle de la solicitud..."
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black text-slate-900 mb-5">
          Datos financieros
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Monto</label>
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              disabled={!editable}
              className="border rounded-xl px-4 py-3 w-full disabled:bg-slate-100"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">ITBIS</label>
            <input
              type="number"
              value={itbis}
              onChange={(e) => setItbis(e.target.value)}
              disabled={!editable}
              className="border rounded-xl px-4 py-3 w-full disabled:bg-slate-100"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Total</label>
            <input
              type="text"
              value={`RD$ ${dinero(total)}`}
              readOnly
              className="border rounded-xl px-4 py-3 w-full bg-slate-100 font-black text-green-700"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Método de pago
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              disabled={!editable}
              className="border rounded-xl px-4 py-3 w-full bg-white disabled:bg-slate-100"
            >
              <option value="">Seleccione</option>
              <option value="Cheque">Cheque</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Depósito">Depósito</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              No. factura
            </label>
            <input
              type="text"
              value={noFactura}
              onChange={(e) => setNoFactura(e.target.value)}
              disabled={!editable}
              className="border rounded-xl px-4 py-3 w-full disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">NCF</label>
            <input
              type="text"
              value={ncf}
              onChange={(e) => setNcf(e.target.value)}
              disabled={!editable}
              className="border rounded-xl px-4 py-3 w-full disabled:bg-slate-100"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Cuenta banco
            </label>
            <input
              type="text"
              value={cuentaBanco}
              onChange={(e) => setCuentaBanco(e.target.value)}
              disabled={!editable}
              className="border rounded-xl px-4 py-3 w-full disabled:bg-slate-100"
              placeholder="Cuenta o banco relacionado"
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-sm font-semibold mb-1">
              Soporte / factura
            </label>

            <div className="border rounded-2xl p-4 bg-slate-50">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                disabled={!editable || subiendoSoporte}
                onChange={(e) => {
                  const archivo = e.target.files?.[0];
                  if (archivo) subirSoporteFactura(archivo);
                  e.currentTarget.value = "";
                }}
                className="block w-full text-sm text-slate-700
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-xl file:border-0
                  file:text-sm file:font-bold
                  file:bg-blue-700 file:text-white
                  hover:file:bg-blue-800
                  disabled:opacity-50"
              />

              <p className="text-xs text-slate-500 mt-2">
                Formatos permitidos: PDF, JPG, JPEG, PNG o WEBP.
              </p>

              {subiendoSoporte && (
                <p className="text-sm text-blue-700 font-bold mt-2">
                  Subiendo soporte...
                </p>
              )}

              {soporteUrl && (
                <div className="mt-3 flex flex-col md:flex-row gap-2 md:items-center">
                  <a
                    href={soporteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-center"
                  >
                    Ver soporte actual
                  </a>

                  {editable && (
                    <button
                      type="button"
                      onClick={() => setSoporteUrl("")}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-xl font-bold"
                    >
                      Quitar enlace
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6 flex flex-col md:flex-row justify-end gap-3">
        <Link
          href="/solicitudes-pago"
          className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 py-3 rounded-xl font-bold text-center"
        >
          Cancelar
        </Link>

        <button
          type="button"
          onClick={guardarCambios}
          disabled={!editable || guardando || subiendoSoporte}
          className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-black disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </main>
  );
}