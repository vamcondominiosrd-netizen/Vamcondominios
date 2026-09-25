"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  ClipboardCheck,
  Files,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";

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
  itbis: string;
  total: string;
  soporte_url: string | null;
  origen_modulo: string | null;
  origen_id: number | null;
  fuente: "MANUAL" | "GAS";
  no_conduce?: string | null;
  tanque_nombre?: string | null;
};

type GasFacturaPendiente = {
  id: number;
  proveedor_id: number | null;
  no_factura: string | null;
  fecha_factura: string | null;
  ncf: string | null;
  monto_factura: number | null;
  itbis_factura: number | null;
  total_factura: number | null;
  factura_url: string | null;
  no_conduce: string | null;
  tanque_id: number | null;
  gas_tanques?: {
    nombre: string | null;
  } | null;
};

type SoporteSubido = {
  ruta: string;
  url: string;
};

const VERSION = "1.1.0";
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

function nuevaFacturaManual(): FacturaDetalle {
  return {
    no_factura: "",
    fecha_factura: hoyLocal(),
    ncf: "",
    monto: "",
    itbis: "0",
    total: "",
    soporte_url: null,
    origen_modulo: null,
    origen_id: null,
    fuente: "MANUAL",
  };
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
    nuevaFacturaManual(),
  ]);

  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);

  const [facturasGas, setFacturasGas] = useState<GasFacturaPendiente[]>([]);
  const [seleccionGas, setSeleccionGas] = useState<number[]>([]);
  const [cargandoGas, setCargandoGas] = useState(false);

  useEffect(() => {
    async function iniciar() {
      const id = localStorage.getItem("condominio_id") || "";
      const nombre = localStorage.getItem("condominio_nombre") || "";

      setCondominioId(id);
      setCondominioNombre(nombre);

      if (!id) {
        alert(
          "No se encontró el condominio activo. Debe iniciar sesión nuevamente."
        );
        return;
      }

      const catalogos = await cargarCatalogos(id);

      const params = new URLSearchParams(window.location.search);
      const proveedorPreseleccionado = params.get("proveedor_id");

      if (
        proveedorPreseleccionado &&
        catalogos.proveedores.some(
          (p) => String(p.id) === proveedorPreseleccionado
        )
      ) {
        setProveedorId(proveedorPreseleccionado);
      }
    }

    void iniciar();
  }, []);

  useEffect(() => {
    if (!condominioId || !proveedorId) {
      setFacturasGas([]);
      setSeleccionGas([]);
      return;
    }

    void cargarFacturasGasPendientes(condominioId, proveedorId);
  }, [condominioId, proveedorId]);

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

    let proveedoresData: Proveedor[] = [];
    let categoriasData: Categoria[] = [];

    if (proveedoresResultado.error) {
      console.error(proveedoresResultado.error);
      alert(
        "Error cargando proveedores del condominio: " +
          proveedoresResultado.error.message
      );
    } else {
      proveedoresData =
        (proveedoresResultado.data as Proveedor[] | null) || [];
      setProveedores(proveedoresData);
    }

    if (categoriasResultado.error) {
      console.error(categoriasResultado.error);
      alert(
        "Error cargando categorías del condominio: " +
          categoriasResultado.error.message
      );
    } else {
      categoriasData =
        (categoriasResultado.data as Categoria[] | null) || [];
      setCategorias(categoriasData);
    }

    return {
      proveedores: proveedoresData,
      categorias: categoriasData,
    };
  }

  async function cargarFacturasGasPendientes(
    idCondominio: string,
    idProveedor: string
  ) {
    setCargandoGas(true);
    setSeleccionGas([]);

    const { data, error } = await supabase
      .from("gas_recepciones")
      .select(`
        id,
        proveedor_id,
        no_factura,
        fecha_factura,
        ncf,
        monto_factura,
        itbis_factura,
        total_factura,
        factura_url,
        no_conduce,
        tanque_id,
        gas_tanques(nombre)
      `)
      .eq("condominio_id", Number(idCondominio))
      .eq("proveedor_id", Number(idProveedor))
      .eq("estado", "Factura recibida")
      .is("solicitud_pago_id", null)
      .order("fecha_factura", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      setFacturasGas([]);
      setCargandoGas(false);
      return;
    }

    const yaAgregadas = new Set(
      facturas
        .filter(
          (f) => f.origen_modulo === "GAS_RECEPCION" && f.origen_id !== null
        )
        .map((f) => Number(f.origen_id))
    );

    setFacturasGas(
      ((data as GasFacturaPendiente[]) || []).filter(
        (f) => !yaAgregadas.has(Number(f.id))
      )
    );

    setCargandoGas(false);
  }

  function dinero(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function cambiarProveedor(nuevoProveedorId: string) {
    if (nuevoProveedorId === proveedorId) return;

    const tieneDetalle =
      facturas.some(
        (f) =>
          f.fuente === "GAS" ||
          f.no_factura.trim() !== "" ||
          Number(f.monto || 0) > 0
      );

    if (proveedorId && tieneDetalle) {
      const confirmar = confirm(
        "Al cambiar de proveedor se limpiará el detalle actual, porque una solicitud agrupada solo puede contener facturas de un mismo proveedor. ¿Desea continuar?"
      );

      if (!confirmar) return;

      setFacturas([nuevaFacturaManual()]);
      setConcepto("");
      setMostrarVistaPrevia(false);
    }

    setProveedorId(nuevoProveedorId);
    setFacturasGas([]);
    setSeleccionGas([]);
  }

  function agregarFactura() {
    setFacturas((prev) => [...prev, nuevaFacturaManual()]);
  }

  function actualizarFactura(
    index: number,
    campo: "no_factura" | "fecha_factura" | "ncf" | "monto",
    valor: string
  ) {
    setFacturas((prev) =>
      prev.map((factura, i) => {
        if (i !== index || factura.fuente !== "MANUAL") return factura;

        if (campo === "monto") {
          return {
            ...factura,
            monto: valor,
            itbis: "0",
            total: valor,
          };
        }

        return {
          ...factura,
          [campo]: valor,
        };
      })
    );
  }

  function eliminarFactura(index: number) {
    const eliminada = facturas[index];

    setFacturas((prev) => {
      const nueva = prev.filter((_, i) => i !== index);
      return nueva.length > 0 ? nueva : [nuevaFacturaManual()];
    });

    if (
      eliminada?.fuente === "GAS" &&
      eliminada.origen_id !== null
    ) {
      const restaurada: GasFacturaPendiente = {
        id: eliminada.origen_id,
        proveedor_id: proveedorId ? Number(proveedorId) : null,
        no_factura: eliminada.no_factura || null,
        fecha_factura: eliminada.fecha_factura || null,
        ncf: eliminada.ncf || null,
        monto_factura: Number(eliminada.monto || 0),
        itbis_factura: Number(eliminada.itbis || 0),
        total_factura: Number(
          eliminada.total || eliminada.monto || 0
        ),
        factura_url: eliminada.soporte_url,
        no_conduce: eliminada.no_conduce || null,
        tanque_id: null,
        gas_tanques: {
          nombre: eliminada.tanque_nombre || null,
        },
      };

      setFacturasGas((prev) =>
        [...prev, restaurada].sort((a, b) => a.id - b.id)
      );
    }
  }

  function alternarSeleccionGas(id: number) {
    setSeleccionGas((prev) =>
      prev.includes(id)
        ? prev.filter((actual) => actual !== id)
        : [...prev, id]
    );
  }

  function seleccionarTodasGas() {
    if (facturasGas.length === 0) return;

    if (seleccionGas.length === facturasGas.length) {
      setSeleccionGas([]);
      return;
    }

    setSeleccionGas(facturasGas.map((f) => f.id));
  }

  function importarFacturasGas() {
    if (seleccionGas.length === 0) {
      alert("Seleccione al menos una factura de Gas.");
      return;
    }

    const seleccionadas = facturasGas.filter((f) =>
      seleccionGas.includes(f.id)
    );

    const nuevas: FacturaDetalle[] = seleccionadas.map((f) => {
      const monto = Number(f.monto_factura || 0);
      const itbis = Number(f.itbis_factura || 0);
      const totalRegistrado = Number(f.total_factura || 0);
      const total = totalRegistrado > 0 ? totalRegistrado : monto + itbis;

      return {
        no_factura: f.no_factura || "",
        fecha_factura: f.fecha_factura || hoyLocal(),
        ncf: f.ncf || "",
        monto: String(monto),
        itbis: String(itbis),
        total: String(total),
        soporte_url: f.factura_url || null,
        origen_modulo: "GAS_RECEPCION",
        origen_id: f.id,
        fuente: "GAS",
        no_conduce: f.no_conduce || null,
        tanque_nombre: f.gas_tanques?.nombre || null,
      };
    });

    setFacturas((prev) => {
      const sinFilaVacia =
        prev.length === 1 &&
        prev[0].fuente === "MANUAL" &&
        !prev[0].no_factura.trim() &&
        !prev[0].monto.trim()
          ? []
          : prev;

      return [...sinFilaVacia, ...nuevas];
    });

    if (!categoriaId) {
      const categoriaGas = categorias.find((c) =>
        String(c.nombre_categoria || "")
          .toLowerCase()
          .includes("gas")
      );

      if (categoriaGas) {
        setCategoriaId(String(categoriaGas.id));
      }
    }

    if (!concepto.trim()) {
      const proveedor =
        proveedores.find((p) => String(p.id) === proveedorId)
          ?.nombre_proveedor || "Proveedor";

      setConcepto(
        `Pago agrupado de facturas de gas - ${proveedor}`
      );
    }

    const idsImportados = new Set(seleccionadas.map((f) => f.id));

    setFacturasGas((prev) =>
      prev.filter((f) => !idsImportados.has(f.id))
    );
    setSeleccionGas([]);
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

  const montoGeneral = useMemo(
    () =>
      facturas.reduce(
        (sum, factura) => sum + Number(factura.monto || 0),
        0
      ),
    [facturas]
  );

  const itbisGeneral = useMemo(
    () =>
      facturas.reduce(
        (sum, factura) => sum + Number(factura.itbis || 0),
        0
      ),
    [facturas]
  );

  const totalGeneral = useMemo(
    () =>
      facturas.reduce(
        (sum, factura) =>
          sum + Number(factura.total || factura.monto || 0),
        0
      ),
    [facturas]
  );

  const facturasValidas = useMemo(
    () =>
      facturas.filter(
        (factura) =>
          factura.no_factura.trim() &&
          factura.fecha_factura &&
          Number(factura.total || factura.monto || 0) > 0
      ),
    [facturas]
  );

  const cantidadGasImportada = useMemo(
    () => facturas.filter((f) => f.fuente === "GAS").length,
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

      if (Number(factura.total || factura.monto || 0) <= 0) {
        alert(`El monto de la factura ${index + 1} debe ser mayor que cero.`);
        return false;
      }

      const origenIncompleto =
        (factura.origen_modulo && factura.origen_id === null) ||
        (!factura.origen_modulo && factura.origen_id !== null);

      if (origenIncompleto) {
        alert(`La factura ${index + 1} tiene un origen incompleto.`);
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

      const detalleTexto = facturas
        .map((factura) => {
          const totalFactura = Number(
            factura.total || factura.monto || 0
          );

          const origen =
            factura.fuente === "GAS"
              ? ` | Gas recepción #${factura.origen_id}${
                  factura.tanque_nombre
                    ? ` | Tanque ${factura.tanque_nombre}`
                    : ""
                }${
                  factura.no_conduce
                    ? ` | Conduce ${factura.no_conduce}`
                    : ""
                }`
              : "";

          return `Factura ${factura.no_factura.trim()} | Fecha ${
            factura.fecha_factura
          } | NCF ${factura.ncf.trim() || "-"} | RD$ ${dinero(
            totalFactura
          )}${origen}`;
        })
        .join("\n");

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
            }\nMonto base registrado: RD$ ${dinero(
              montoGeneral
            )}\nITBIS registrado: RD$ ${dinero(
              itbisGeneral
            )}\nTotal general: RD$ ${dinero(totalGeneral)}`,
            monto: montoGeneral,
            itbis: itbisGeneral,
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
          ultimoError.includes(
            "solicitudes_pago_condominio_numero_unique"
          );

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
        itbis: Number(factura.itbis || 0),
        total: Number(factura.total || factura.monto || 0),
        soporte_url: factura.soporte_url || soporteSubido?.url || null,
        origen_modulo: factura.origen_modulo,
        origen_id: factura.origen_id,
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
    <PageContainer>
      <ModuleMenu
        title="Solicitudes de Pago"
        subtitle="Nueva solicitud, solicitudes agrupadas, aprobaciones, pagos y control bancario."
        tone="green"
        items={[
          {
            href: "/solicitudes-pago",
            label: "Listado",
            icon: ClipboardCheck,
          },
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
        ]}
      />

      <ModuleToolbar
        title="Nueva Solicitud Agrupada"
        subtitle={`Condominio activo: ${
          condominioNombre || "No seleccionado"
        } · v${VERSION}`}
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

      {mostrarVistaPrevia && (
        <section className="bg-white rounded-3xl border-2 border-purple-300 shadow-sm p-6 mb-6">
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
              <strong>Facturas importadas desde Gas:</strong>{" "}
              {cantidadGasImportada}
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
                  <th className="p-3 border text-left">Origen</th>
                  <th className="p-3 border text-left">No. Factura</th>
                  <th className="p-3 border text-left">Fecha</th>
                  <th className="p-3 border text-left">NCF</th>
                  <th className="p-3 border text-right">Monto</th>
                  <th className="p-3 border text-right">ITBIS</th>
                  <th className="p-3 border text-right">Total</th>
                </tr>
              </thead>

              <tbody>
                {facturasValidas.map((f, i) => (
                  <tr key={`${f.origen_modulo || "M"}-${f.origen_id || i}`}>
                    <td className="p-3 border">
                      {f.fuente === "GAS" ? "Gas" : "Manual"}
                    </td>
                    <td className="p-3 border font-bold">
                      {f.no_factura}
                    </td>
                    <td className="p-3 border">{f.fecha_factura}</td>
                    <td className="p-3 border">{f.ncf || "-"}</td>
                    <td className="p-3 border text-right">
                      RD$ {dinero(Number(f.monto || 0))}
                    </td>
                    <td className="p-3 border text-right">
                      RD$ {dinero(Number(f.itbis || 0))}
                    </td>
                    <td className="p-3 border text-right font-bold">
                      RD$ {dinero(Number(f.total || f.monto || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 bg-purple-50 border border-purple-200 rounded-2xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
              <div>
                <p className="text-xs text-purple-700 font-bold">
                  MONTO REGISTRADO
                </p>
                <p className="text-xl font-black text-purple-900">
                  RD$ {dinero(montoGeneral)}
                </p>
              </div>

              <div>
                <p className="text-xs text-purple-700 font-bold">
                  ITBIS
                </p>
                <p className="text-xl font-black text-purple-900">
                  RD$ {dinero(itbisGeneral)}
                </p>
              </div>

              <div>
                <p className="text-xs text-purple-700 font-bold">
                  TOTAL SOLICITUD
                </p>
                <p className="text-3xl font-black text-purple-900">
                  RD$ {dinero(totalGeneral)}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="bg-white rounded-3xl border shadow-sm p-6 mb-6">
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
              onChange={(e) => cambiarProveedor(e.target.value)}
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
              onChange={(e) =>
                seleccionarSoporte(e.target.files?.[0] || null)
              }
              className="border rounded-xl px-4 py-3 w-full bg-white"
            />
            <p className="text-xs text-slate-500 mt-1">
              Obligatorio en todos los casos. PDF o imagen, máximo 10 MB.
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
              placeholder="Ej. Pago facturas VialGas septiembre 2026"
            />
          </div>
        </div>
      </section>

      {proveedorId && (cargandoGas || facturasGas.length > 0) && (
        <section className="bg-amber-50 rounded-3xl border border-amber-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Facturas pendientes disponibles desde Gas
              </h2>
              <p className="text-sm text-slate-600">
                Esta opción es adicional. Las facturas manuales de otros
                proveedores continúan funcionando igual.
              </p>
            </div>

            {facturasGas.length > 0 && (
              <button
                type="button"
                onClick={seleccionarTodasGas}
                className="bg-white border border-amber-300 px-4 py-2 rounded-xl font-bold"
              >
                {seleccionGas.length === facturasGas.length
                  ? "Quitar selección"
                  : "Seleccionar todas"}
              </button>
            )}
          </div>

          {cargandoGas ? (
            <p className="text-sm text-slate-600">
              Buscando facturas pendientes de Gas...
            </p>
          ) : (
            <>
              <div className="overflow-auto border rounded-2xl bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3 border text-center">Sel.</th>
                      <th className="p-3 border text-left">Factura</th>
                      <th className="p-3 border text-left">Fecha</th>
                      <th className="p-3 border text-left">NCF</th>
                      <th className="p-3 border text-left">Conduce</th>
                      <th className="p-3 border text-left">Tanque</th>
                      <th className="p-3 border text-right">Monto</th>
                      <th className="p-3 border text-right">ITBIS</th>
                      <th className="p-3 border text-right">Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {facturasGas.map((f) => (
                      <tr key={f.id} className="hover:bg-amber-50">
                        <td className="p-3 border text-center">
                          <input
                            type="checkbox"
                            checked={seleccionGas.includes(f.id)}
                            onChange={() => alternarSeleccionGas(f.id)}
                            className="h-5 w-5"
                          />
                        </td>
                        <td className="p-3 border font-bold">
                          {f.no_factura || "-"}
                        </td>
                        <td className="p-3 border">
                          {f.fecha_factura || "-"}
                        </td>
                        <td className="p-3 border">
                          {f.ncf || "-"}
                        </td>
                        <td className="p-3 border">
                          {f.no_conduce || "-"}
                        </td>
                        <td className="p-3 border">
                          {f.gas_tanques?.nombre || "-"}
                        </td>
                        <td className="p-3 border text-right">
                          RD$ {dinero(Number(f.monto_factura || 0))}
                        </td>
                        <td className="p-3 border text-right">
                          RD$ {dinero(Number(f.itbis_factura || 0))}
                        </td>
                        <td className="p-3 border text-right font-black">
                          RD$ {dinero(
                            Number(
                              f.total_factura ||
                                Number(f.monto_factura || 0) +
                                  Number(f.itbis_factura || 0)
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <p className="text-sm text-slate-600">
                  Seleccionadas: <strong>{seleccionGas.length}</strong>
                </p>

                <button
                  type="button"
                  onClick={importarFacturasGas}
                  disabled={seleccionGas.length === 0}
                  className="bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-bold"
                >
                  Importar facturas seleccionadas
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <section className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Detalle de facturas
            </h2>
            <p className="text-sm text-slate-500">
              Puede combinar el flujo manual existente con facturas importadas
              desde módulos integrados, siempre para el mismo proveedor.
            </p>
          </div>

          <button
            type="button"
            onClick={agregarFactura}
            className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            + Agregar factura manual
          </button>
        </div>

        <div className="space-y-4">
          {facturas.map((f, index) => (
            <div
              key={`${f.origen_modulo || "MANUAL"}-${f.origen_id || index}`}
              className={`border rounded-2xl p-4 ${
                f.fuente === "GAS" ? "bg-amber-50" : "bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <span
                  className={`text-xs font-black px-3 py-1 rounded-full ${
                    f.fuente === "GAS"
                      ? "bg-amber-200 text-amber-900"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {f.fuente === "GAS"
                    ? `Importada de Gas · Recepción #${f.origen_id}`
                    : "Factura manual"}
                </span>

                <button
                  type="button"
                  onClick={() => eliminarFactura(index)}
                  className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                >
                  Eliminar
                </button>
              </div>

              {f.fuente === "MANUAL" ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      Monto total
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
                    <p className="text-xs text-slate-500 mt-1">
                      Mantiene el comportamiento manual existente.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">
                        No. Factura
                      </p>
                      <p className="font-black">{f.no_factura}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Fecha</p>
                      <p className="font-black">{f.fecha_factura}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">NCF</p>
                      <p className="font-black">{f.ncf || "-"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Conduce / Tanque
                      </p>
                      <p className="font-black">
                        {f.no_conduce || "-"} · {f.tanque_nombre || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                    <div className="border bg-white rounded-xl p-3">
                      <p className="text-xs text-slate-500">Monto</p>
                      <p className="font-black">
                        RD$ {dinero(Number(f.monto || 0))}
                      </p>
                    </div>

                    <div className="border bg-white rounded-xl p-3">
                      <p className="text-xs text-slate-500">ITBIS</p>
                      <p className="font-black">
                        RD$ {dinero(Number(f.itbis || 0))}
                      </p>
                    </div>

                    <div className="border bg-white rounded-xl p-3">
                      <p className="text-xs text-slate-500">Total</p>
                      <p className="font-black text-green-700">
                        RD$ {dinero(Number(f.total || 0))}
                      </p>
                    </div>

                    <div className="border bg-white rounded-xl p-3">
                      <p className="text-xs text-slate-500">
                        Factura individual
                      </p>
                      {f.soporte_url ? (
                        <a
                          href={f.soporte_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-black text-blue-700"
                        >
                          Ver soporte
                        </a>
                      ) : (
                        <p className="font-bold text-slate-500">
                          Sin archivo individual
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 bg-slate-900 text-white rounded-2xl p-5">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            <div>
              <p className="text-sm text-slate-300">Cantidad facturas</p>
              <p className="text-2xl font-black">
                {facturasValidas.length}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-300">
                Importadas de Gas
              </p>
              <p className="text-2xl font-black">
                {cantidadGasImportada}
              </p>
            </div>

            <div className="md:text-right">
              <p className="text-sm text-slate-300">Monto registrado</p>
              <p className="text-xl font-black">
                RD$ {dinero(montoGeneral)}
              </p>
            </div>

            <div className="md:text-right">
              <p className="text-sm text-slate-300">ITBIS</p>
              <p className="text-xl font-black">
                RD$ {dinero(itbisGeneral)}
              </p>
            </div>

            <div className="md:text-right">
              <p className="text-sm text-slate-300">Total general</p>
              <p className="text-3xl font-black">
                RD$ {dinero(totalGeneral)}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-end gap-2 mt-5">
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
              {loading
                ? "Guardando..."
                : "Guardar y enviar al tesorero"}
            </button>
          </div>
        </div>
      </section>

      <p className="text-right text-xs text-slate-400 mt-4">
        Solicitud Agrupada · v{VERSION}
      </p>
    </PageContainer>
  );
}
