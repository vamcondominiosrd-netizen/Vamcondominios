"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/app/components/RequireAuth";
import {
  BarChart3,
  ClipboardCheck,
  Files,
  Plus,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import SectionCard from "@/components/vam/enterprise/SectionCard";

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

type SoporteSubido = {
  ruta: string;
  url: string;
};

const BUCKET_SOPORTES = "solicitudes-pago-agrupadas";
const ESTADO_INICIAL = "Pendiente aprobación tesorero";
const MAX_ARCHIVO_BYTES = 10 * 1024 * 1024;
const EXTENSIONES_PERMITIDAS = ["pdf", "jpg", "jpeg", "png", "webp"];

function hoyLocal() {
  const ahora = new Date();
  const year = ahora.getFullYear();
  const month = String(ahora.getMonth() + 1).padStart(2, "0");
  const day = String(ahora.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function SolicitudPagoAgrupadaPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);

  const [proveedorId, setProveedorId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [fechaSolicitud, setFechaSolicitud] = useState(hoyLocal());
  const [concepto, setConcepto] = useState("");
  const [soporte, setSoporte] = useState<File | null>(null);

  const [facturas, setFacturas] = useState<FacturaDetalle[]>([
    {
      no_factura: "",
      fecha_factura: hoyLocal(),
      ncf: "",
      monto: "",
    },
  ]);

  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarCatalogos(id);
  }, []);

  async function cargarCatalogos(idCondominio: string) {
    const [proveedoresResultado, categoriasResultado] = await Promise.all([
      supabase
        .from("catalogo_proveedores")
        .select("id, nombre_proveedor")
        .eq("condominio_id", Number(idCondominio))
        .order("nombre_proveedor", { ascending: true }),
      supabase
        .from("catalogo_categoria_gastos")
        .select("id, nombre_categoria")
        .eq("condominio_id", Number(idCondominio))
        .order("nombre_categoria", { ascending: true }),
    ]);

    if (proveedoresResultado.error) {
      console.error(proveedoresResultado.error);
      alert(
        "Error cargando proveedores del condominio: " +
          proveedoresResultado.error.message
      );
      setProveedores([]);
    } else {
      setProveedores(
        (proveedoresResultado.data as Proveedor[] | null) || []
      );
    }

    if (categoriasResultado.error) {
      console.error(categoriasResultado.error);
      alert(
        "Error cargando categorías del condominio: " +
          categoriasResultado.error.message
      );
      setCategorias([]);
    } else {
      setCategorias(
        (categoriasResultado.data as Categoria[] | null) || []
      );
    }
  }

  function dinero(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function agregarFactura() {
    setFacturas((prev) => [
      ...prev,
      {
        no_factura: "",
        fecha_factura: hoyLocal(),
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
      prev.map((factura, i) =>
        i === index ? { ...factura, [campo]: valor } : factura
      )
    );
  }

  function eliminarFactura(index: number) {
    setFacturas((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  function seleccionarSoporte(archivo: File | null) {
    if (!archivo) {
      setSoporte(null);
      return;
    }

    const extension = archivo.name.split(".").pop()?.toLowerCase() || "";

    if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
      alert("Formato no permitido. Use PDF, JPG, JPEG, PNG o WEBP.");
      setSoporte(null);
      return;
    }

    if (archivo.size > MAX_ARCHIVO_BYTES) {
      alert("El archivo no puede superar los 10 MB.");
      setSoporte(null);
      return;
    }

    setSoporte(archivo);
  }

  const proveedorNombre =
    proveedores.find((p) => String(p.id) === proveedorId)?.nombre_proveedor ||
    "-";

  const categoriaNombre =
    categorias.find((c) => String(c.id) === categoriaId)?.nombre_categoria ||
    "-";

  const totalGeneral = useMemo(() => {
    return facturas.reduce(
      (sum, factura) => sum + Number(factura.monto || 0),
      0
    );
  }, [facturas]);

  const facturasValidas = useMemo(
    () =>
      facturas.filter(
        (factura) =>
          factura.no_factura.trim() &&
          factura.fecha_factura &&
          Number(factura.monto || 0) > 0
      ),
    [facturas]
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

    if (!fechaSolicitud) {
      alert("Debe indicar la fecha de solicitud.");
      return false;
    }

    if (!concepto.trim()) {
      alert("Debe indicar el concepto general.");
      return false;
    }

    if (!soporte) {
      alert(
        "Debe adjuntar el soporte general con las facturas antes de enviar la solicitud."
      );
      return false;
    }

    if (facturas.length === 0) {
      alert("Debe registrar al menos una factura.");
      return false;
    }

    for (let index = 0; index < facturas.length; index += 1) {
      const factura = facturas[index];

      if (!factura.no_factura.trim()) {
        alert(`Debe indicar el número de la factura ${index + 1}.`);
        return false;
      }

      if (!factura.fecha_factura) {
        alert(`Debe indicar la fecha de la factura ${index + 1}.`);
        return false;
      }

      if (Number(factura.monto || 0) <= 0) {
        alert(`El monto de la factura ${index + 1} debe ser mayor que cero.`);
        return false;
      }
    }

    const numerosFactura = facturas.map((factura) =>
      factura.no_factura.trim().toLowerCase()
    );

    if (new Set(numerosFactura).size !== numerosFactura.length) {
      alert("Hay números de factura duplicados dentro de la solicitud.");
      return false;
    }

    if (totalGeneral <= 0) {
      alert("El total general debe ser mayor que cero.");
      return false;
    }

    return true;
  }

  function generarVistaPrevia() {
    if (!validarFormulario()) return;

    setMostrarVistaPrevia(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function obtenerProximoNumeroSolicitud() {
    const { data, error } = await supabase.rpc(
      "obtener_proximo_numero_solicitud",
      {
        p_condominio_id: Number(condominioId),
      }
    );

    if (error) {
      throw new Error(
        "No se pudo obtener el próximo número de solicitud: " + error.message
      );
    }

    return Number(data || 1);
  }

  async function subirSoporteGeneral(): Promise<SoporteSubido> {
    if (!soporte) {
      throw new Error("Debe seleccionar el soporte general.");
    }

    const extension = soporte.name.split(".").pop()?.toLowerCase() || "pdf";
    const nombreBase = soporte.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 60);

    const ruta = `${condominioId}/agrupadas/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}-${nombreBase}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_SOPORTES)
      .upload(ruta, soporte, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error("Error subiendo el soporte: " + uploadError.message);
    }

    const { data } = supabase.storage
      .from(BUCKET_SOPORTES)
      .getPublicUrl(ruta);

    return {
      ruta,
      url: data.publicUrl,
    };
  }

  async function eliminarSoporteSubido(ruta: string) {
    const { error } = await supabase.storage
      .from(BUCKET_SOPORTES)
      .remove([ruta]);

    if (error) {
      console.error("No se pudo eliminar el soporte huérfano:", error.message);
    }
  }

  async function guardarSolicitud() {
    if (loading || !validarFormulario()) return;

    const confirmar = confirm(
      `¿Desea crear esta solicitud agrupada por RD$ ${dinero(
        totalGeneral
      )} y enviarla al tesorero para aprobación?`
    );

    if (!confirmar) return;

    setLoading(true);

    let soporteSubido: SoporteSubido | null = null;
    let solicitudCreadaId: number | null = null;
    let numeroSolicitudCreada: number | null = null;

    try {
      soporteSubido = await subirSoporteGeneral();

      const usuario =
        localStorage.getItem("usuario_nombre") ||
        localStorage.getItem("user_name") ||
        "Sistema";

      const detalleTexto = facturas.map(
        (factura) =>
          `Factura ${factura.no_factura.trim()} | Fecha ${
            factura.fecha_factura
          } | NCF ${factura.ncf.trim() || "-"} | RD$ ${dinero(
            Number(factura.monto || 0)
          )}`
      ).join("\n");

      let ultimoError = "";

      for (let intento = 1; intento <= 3; intento += 1) {
        const numeroSolicitud = await obtenerProximoNumeroSolicitud();

        const { data: solicitud, error } = await supabase
          .from("solicitudes_pago")
          .insert({
            condominio_id: Number(condominioId),
            condominio: condominioNombre,
            fecha_solicitud: fechaSolicitud,
            proveedor_id: Number(proveedorId),
            categoria_id: Number(categoriaId),
            concepto: concepto.trim(),
            detalle: `Solicitud agrupada de facturas\n\n${detalleTexto}\n\nTotal facturas: ${
              facturas.length
            }\nTotal general: RD$ ${dinero(totalGeneral)}`,
            monto: totalGeneral,
            itbis: 0,
            total: totalGeneral,
            no_factura: "VARIAS",
            ncf: "VARIOS",
            metodo_pago: "Cheque",
            cuenta_banco: null,
            soporte_url: soporteSubido.url,
            prioridad: "Normal",
            estado: ESTADO_INICIAL,
            created_by: usuario,
            numero_solicitud: numeroSolicitud,
            origen_modulo: "PAGO_AGRUPADO",
          })
          .select("id, numero_solicitud")
          .single();

        if (!error && solicitud) {
          solicitudCreadaId = Number(solicitud.id);
          numeroSolicitudCreada = Number(
            solicitud.numero_solicitud || numeroSolicitud
          );
          break;
        }

        ultimoError = error?.message || "Error creando la solicitud.";

        const consecutivoDuplicado =
          error?.code === "23505" &&
          ultimoError.includes("solicitudes_pago_condominio_numero_unique");

        if (!consecutivoDuplicado) {
          throw new Error(ultimoError);
        }
      }

      if (!solicitudCreadaId) {
        throw new Error(
          ultimoError ||
            "No fue posible generar un número único para la solicitud."
        );
      }

      const detalleInsert = facturas.map((factura) => ({
        solicitud_pago_id: solicitudCreadaId,
        condominio_id: Number(condominioId),
        proveedor_id: Number(proveedorId),
        no_factura: factura.no_factura.trim(),
        fecha_factura: factura.fecha_factura,
        ncf: factura.ncf.trim() || null,
        concepto: concepto.trim(),
        monto: Number(factura.monto || 0),
        soporte_url: soporteSubido?.url || null,
      }));

      const { error: detalleError } = await supabase
        .from("solicitudes_pago_detalle")
        .insert(detalleInsert);

      if (detalleError) {
        const { error: rollbackError } = await supabase
          .from("solicitudes_pago")
          .delete()
          .eq("id", solicitudCreadaId)
          .eq("condominio_id", Number(condominioId));

        if (!rollbackError && soporteSubido) {
          await eliminarSoporteSubido(soporteSubido.ruta);
          soporteSubido = null;
          solicitudCreadaId = null;
        }

        if (rollbackError) {
          throw new Error(
            `Falló el detalle (${detalleError.message}) y no fue posible revertir la solicitud ${solicitudCreadaId}. Revísela antes de continuar.`
          );
        }

        throw new Error(
          "No se pudo guardar el detalle de las facturas. La solicitud fue revertida para evitar registros incompletos."
        );
      }

      alert(
        `Solicitud agrupada No. ${String(
          numeroSolicitudCreada || solicitudCreadaId
        ).padStart(
          5,
          "0"
        )} creada correctamente y enviada al tesorero para aprobación.`
      );

      window.location.href = "/solicitudes-pago";
    } catch (error: unknown) {
      if (!solicitudCreadaId && soporteSubido) {
        await eliminarSoporteSubido(soporteSubido.ruta);
      }

      const mensaje =
        error instanceof Error
          ? error.message
          : "Ocurrió un error guardando la solicitud agrupada.";

      alert("Error guardando solicitud agrupada: " + mensaje);
    } finally {
      setLoading(false);
    }
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
      <PageContainer>
        <ModuleMenu
          title="Solicitudes de Pago"
          subtitle="Nueva solicitud, solicitudes agrupadas, aprobaciones, pagos y control bancario."
          tone="green"
          items={[
            { href: "/solicitudes-pago", label: "Listado", icon: ClipboardCheck },
            {
              href: "/solicitudes-pago/nueva",
              label: "Nueva Solicitud",
              icon: Plus,
            },
            {
              href: "/solicitudes-pago/agrupada",
              label: "Solicitud Agrupada",
              icon: Files,
            },
            {
              href: "/solicitudes-pago/tesorero",
              label: "Tesorero",
              icon: ShieldCheck,
            },
            {
              href: "/solicitudes-pago/presidente",
              label: "Presidente",
              icon: ShieldCheck,
            },
            {
              href: "/solicitudes-pago/resumen",
              label: "Resumen",
              icon: BarChart3,
            },
            { href: "/gastos", label: "Gastos", icon: WalletCards },
          ]}
        />

        <ModuleToolbar
          title="Nueva Solicitud Agrupada"
          subtitle={`Condominio activo: ${condominioNombre || "No seleccionado"}`}
          icon={Files}
          actions={
            <Link
              href="/solicitudes-pago"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              Volver al listado
            </Link>
          }
        />

        <section className="hidden">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-purple-700 uppercase tracking-wide">
                  Solicitudes de Pago
                </p>

                <h1 className="text-3xl font-black text-slate-900 mt-1">
                  Nueva Solicitud Agrupada
                </h1>

                <p className="text-slate-500 mt-2">
                  Registre varias facturas de un mismo proveedor en una sola solicitud de pago.
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
                <p>
                  <strong>Estado inicial:</strong>{" "}
                  Pendiente aprobación tesorero
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
                  TOTAL DE LA SOLICITUD: RD$ {dinero(totalGeneral)}
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
                  onChange={(e) => seleccionarSoporte(e.target.files?.[0] || null)}
                  className="border rounded-xl px-4 py-3 w-full bg-white"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Requerido. PDF o imagen, máximo 10 MB.
                </p>
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
                  {loading ? "Guardando..." : "Guardar y enviar al tesorero"}
                </button>
              </div>
            </div>
          </section>
      </PageContainer>
    </RequireAuth>
  );
}