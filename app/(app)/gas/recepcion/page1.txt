"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type Proveedor = {
  id: number;
  nombre_proveedor: string | null;
};

type GasTanque = {
  id: number;
  nombre: string;
  descripcion: string | null;
  capacidad_estimada: number | null;
  estado: string | null;
};

type UnidadMedidaGas = {
  id: number;
  nombre: string;
  abreviatura: string | null;
  estado: string | null;
};

type GasRecepcion = {
  id: number;
  condominio_id: number;
  fecha_recepcion: string;
  proveedor_id: number | null;
  tanque_id: number | null;
  unidad_medida_id: number | null;
  no_conduce: string | null;
  fecha_conduce: string | null;
  cantidad: number;
  precio_unitario: number;
  total: number;
  responsable: string | null;
  observacion: string | null;
  conduce_url: string | null;
  foto_medidor_camion_inicio_url: string | null;
  foto_medidor_camion_final_url: string | null;
  foto_tanque_url: string | null;

  no_factura: string | null;
  ncf: string | null;
  fecha_factura: string | null;
  factura_url: string | null;
  monto_factura: number | null;
  itbis_factura: number | null;
  total_factura: number | null;

  estado: string;
  solicitud_pago_id: number | null;
  gasto_id: number | null;
  created_at: string | null;

  catalogo_proveedores?: {
    nombre_proveedor: string | null;
  } | null;

  gas_tanques?: {
    nombre: string | null;
  } | null;

  gas_unidades_medida?: {
    nombre: string | null;
    abreviatura: string | null;
  } | null;
};

export default function GasRecepcionPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [recepciones, setRecepciones] = useState<GasRecepcion[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [tanques, setTanques] = useState<GasTanque[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedidaGas[]>([]);

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [fechaRecepcion, setFechaRecepcion] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [proveedorId, setProveedorId] = useState("");
  const [tanqueId, setTanqueId] = useState("");
  const [unidadMedidaId, setUnidadMedidaId] = useState("");
  const [noConduce, setNoConduce] = useState("");
  const [fechaConduce, setFechaConduce] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [cantidad, setCantidad] = useState("");
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [responsable, setResponsable] = useState("");
  const [observacion, setObservacion] = useState("");

  const [archivoConduce, setArchivoConduce] = useState<File | null>(null);
  const [archivoMedidorCamionInicio, setArchivoMedidorCamionInicio] =
    useState<File | null>(null);
  const [archivoMedidorCamionFinal, setArchivoMedidorCamionFinal] =
    useState<File | null>(null);
  const [archivoFotoTanque, setArchivoFotoTanque] = useState<File | null>(null);

  const [recepcionFactura, setRecepcionFactura] =
    useState<GasRecepcion | null>(null);
  const [noFactura, setNoFactura] = useState("");
  const [ncf, setNcf] = useState("");
  const [fechaFactura, setFechaFactura] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [montoFactura, setMontoFactura] = useState("");
  const [itbisFactura, setItbisFactura] = useState("0");
  const [archivoFactura, setArchivoFactura] = useState<File | null>(null);

  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const usuario = localStorage.getItem("usuario_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);
    setResponsable(usuario);

    if (!id) {
      setMensaje("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarTodo(id);
  }, []);

  useEffect(() => {
    if (proveedorId && unidadMedidaId && condominioId) {
      buscarPrecioActivo();
    }
  }, [proveedorId, unidadMedidaId, condominioId]);

  async function cargarTodo(id: string) {
    setLoading(true);
    setMensaje("");

    await Promise.all([
      cargarRecepciones(id),
      cargarProveedores(),
      cargarTanques(id),
      cargarUnidades(),
    ]);

    setLoading(false);
  }

  async function cargarRecepciones(id: string) {
    const { data, error } = await supabase
      .from("gas_recepciones")
      .select(`
        id,
        condominio_id,
        fecha_recepcion,
        proveedor_id,
        tanque_id,
        unidad_medida_id,
        no_conduce,
        fecha_conduce,
        cantidad,
        precio_unitario,
        total,
        responsable,
        observacion,
        conduce_url,
        foto_medidor_camion_inicio_url,
        foto_medidor_camion_final_url,
        foto_tanque_url,
        no_factura,
        ncf,
        fecha_factura,
        factura_url,
        monto_factura,
        itbis_factura,
        total_factura,
        estado,
        solicitud_pago_id,
        gasto_id,
        created_at,
        catalogo_proveedores(nombre_proveedor),
        gas_tanques(nombre),
        gas_unidades_medida(nombre, abreviatura)
      `)
      .eq("condominio_id", Number(id))
      .order("fecha_recepcion", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      setMensaje("Error cargando recepciones de gas: " + error.message);
      return;
    }

    setRecepciones((data as GasRecepcion[]) || []);
  }

  async function cargarProveedores() {
    const { data, error } = await supabase
      .from("catalogo_proveedores")
      .select("id, nombre_proveedor")
      .order("nombre_proveedor", { ascending: true });

    if (error) {
      setMensaje("Error cargando proveedores: " + error.message);
      return;
    }

    const lista = ((data as Proveedor[]) || []).filter(
      (p) => p.nombre_proveedor && p.nombre_proveedor.trim() !== ""
    );

    const mapa = new Map<string, Proveedor>();

    lista.forEach((p) => {
      const clave = String(p.nombre_proveedor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      if (!mapa.has(clave)) {
        mapa.set(clave, p);
      }
    });

    const proveedoresUnicos = Array.from(mapa.values()).sort((a, b) =>
      String(a.nombre_proveedor || "").localeCompare(
        String(b.nombre_proveedor || ""),
        "es"
      )
    );

    setProveedores(proveedoresUnicos);
  }

  async function cargarTanques(id: string) {
    const { data, error } = await supabase
      .from("gas_tanques")
      .select("id, nombre, descripcion, capacidad_estimada, estado")
      .eq("condominio_id", Number(id))
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });

    if (error) {
      setMensaje("Error cargando tanques: " + error.message);
      return;
    }

    setTanques((data as GasTanque[]) || []);
  }

  async function cargarUnidades() {
    const { data, error } = await supabase
      .from("gas_unidades_medida")
      .select("id, nombre, abreviatura, estado")
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });

    if (error) {
      setMensaje("Error cargando unidades de medida: " + error.message);
      return;
    }

    const unidadesData = (data as UnidadMedidaGas[]) || [];
    setUnidades(unidadesData);

    const galones = unidadesData.find(
      (u) => u.nombre?.toLowerCase() === "galones"
    );

    if (galones) {
      setUnidadMedidaId(String(galones.id));
    } else if (unidadesData.length > 0) {
      setUnidadMedidaId(String(unidadesData[0].id));
    }
  }

  async function buscarPrecioActivo() {
    if (!condominioId || !proveedorId || !unidadMedidaId) return;

    const { data, error } = await supabase
      .from("gas_precios")
      .select("id, precio_unitario, fecha_inicio, estado")
      .eq("condominio_id", Number(condominioId))
      .eq("proveedor_id", Number(proveedorId))
      .eq("unidad_medida_id", Number(unidadMedidaId))
      .eq("estado", "Activo")
      .order("fecha_inicio", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setMensaje("Error buscando precio activo: " + error.message);
      return;
    }

    if (data) {
      setPrecioUnitario(String(data.precio_unitario || ""));
    } else {
      setPrecioUnitario("");
    }
  }

  function limpiarFormulario() {
    setFechaRecepcion(new Date().toISOString().slice(0, 10));
    setProveedorId("");
    setTanqueId("");

    const galones = unidades.find(
      (u) => u.nombre?.toLowerCase() === "galones"
    );

    if (galones) {
      setUnidadMedidaId(String(galones.id));
    } else if (unidades.length > 0) {
      setUnidadMedidaId(String(unidades[0].id));
    } else {
      setUnidadMedidaId("");
    }

    setNoConduce("");
    setFechaConduce(new Date().toISOString().slice(0, 10));
    setCantidad("");
    setPrecioUnitario("");
    setObservacion("");
    setArchivoConduce(null);
    setArchivoMedidorCamionInicio(null);
    setArchivoMedidorCamionFinal(null);
    setArchivoFotoTanque(null);
  }

  function limpiarFactura() {
    setRecepcionFactura(null);
    setNoFactura("");
    setNcf("");
    setFechaFactura(new Date().toISOString().slice(0, 10));
    setMontoFactura("");
    setItbisFactura("0");
    setArchivoFactura(null);
  }

  function abrirFactura(r: GasRecepcion) {
    setRecepcionFactura(r);
    setNoFactura(r.no_factura || "");
    setNcf(r.ncf || "");
    setFechaFactura(r.fecha_factura || new Date().toISOString().slice(0, 10));
    setMontoFactura(String(r.monto_factura || r.total || ""));
    setItbisFactura(String(r.itbis_factura || 0));
    setArchivoFactura(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function fechaDominicana(fecha: string | null | undefined) {
    if (!fecha) return "-";

    const d = new Date(fecha);

    if (Number.isNaN(d.getTime())) return fecha;

    return d.toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  async function subirArchivo(
    bucket: string,
    archivo: File | null,
    carpeta: string
  ) {
    if (!archivo) return null;

    const extension = archivo.name.split(".").pop();
    const nombreArchivo = `${condominioId}/${carpeta}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(nombreArchivo, archivo);

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  async function guardarRecepcion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!condominioId) {
      alert("No hay condominio activo.");
      return;
    }

    if (!fechaRecepcion) {
      alert("Debe indicar la fecha de recepción.");
      return;
    }

    if (!proveedorId) {
      alert("Debe seleccionar el proveedor.");
      return;
    }

    if (!tanqueId) {
      alert("Debe seleccionar la ubicación o tanque del condominio.");
      return;
    }

    if (!unidadMedidaId) {
      alert("Debe seleccionar la unidad de medida.");
      return;
    }

    if (!noConduce.trim()) {
      alert("Debe indicar el número de conduce.");
      return;
    }

    const cantidadFinal = Number(cantidad || 0);
    const precioFinal = Number(precioUnitario || 0);
    const totalFinal = cantidadFinal * precioFinal;

    if (cantidadFinal <= 0) {
      alert("La cantidad recibida debe ser mayor que cero.");
      return;
    }

    if (precioFinal <= 0) {
      alert(
        "No hay precio unitario activo para este proveedor y unidad de medida."
      );
      return;
    }

    const confirmar = confirm(
      `¿Desea registrar esta recepción de gas por RD$ ${dinero(totalFinal)}?`
    );

    if (!confirmar) return;

    setLoading(true);
    setMensaje("");

    try {
      const conduceUrl = await subirArchivo(
        "conduces-gas",
        archivoConduce,
        "conduces"
      );

      const camionInicioUrl = await subirArchivo(
        "fotos-gas",
        archivoMedidorCamionInicio,
        "medidor-camion-inicio"
      );

      const camionFinalUrl = await subirArchivo(
        "fotos-gas",
        archivoMedidorCamionFinal,
        "medidor-camion-final"
      );

      const fotoTanqueUrl = await subirArchivo(
        "fotos-gas",
        archivoFotoTanque,
        "tanque-condominio"
      );

      const { error } = await supabase.from("gas_recepciones").insert([
        {
          condominio_id: Number(condominioId),
          fecha_recepcion: fechaRecepcion,
          proveedor_id: Number(proveedorId),
          tanque_id: Number(tanqueId),
          unidad_medida_id: Number(unidadMedidaId),
          no_conduce: noConduce.trim(),
          fecha_conduce: fechaConduce || fechaRecepcion,
          cantidad: cantidadFinal,
          precio_unitario: precioFinal,
          total: totalFinal,
          responsable: responsable.trim() || null,
          observacion: observacion.trim() || null,
          conduce_url: conduceUrl,
          foto_medidor_camion_inicio_url: camionInicioUrl,
          foto_medidor_camion_final_url: camionFinalUrl,
          foto_tanque_url: fotoTanqueUrl,
          estado: "Registrado",
        },
      ]);

      if (error) {
        alert("Error guardando recepción: " + error.message);
        setLoading(false);
        return;
      }

      alert("Recepción de gas registrada correctamente.");
      limpiarFormulario();
      await cargarRecepciones(condominioId);
    } catch (error: any) {
      alert("Error subiendo archivos: " + error.message);
    }

    setLoading(false);
  }

  async function validarRecepcion(r: GasRecepcion) {
    const confirmar = confirm(
      `¿Desea validar la recepción #${r.id}? Luego quedará pendiente de factura.`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("gas_recepciones")
      .update({ estado: "Pendiente factura" })
      .eq("id", r.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error validando recepción: " + error.message);
      return;
    }

    cargarRecepciones(condominioId);
  }

  async function anularRecepcion(r: GasRecepcion) {
    const confirmar = confirm(`¿Desea anular la recepción #${r.id}?`);

    if (!confirmar) return;

    const { error } = await supabase
      .from("gas_recepciones")
      .update({ estado: "Anulado" })
      .eq("id", r.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error anulando recepción: " + error.message);
      return;
    }

    cargarRecepciones(condominioId);
  }

  async function guardarFactura(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!recepcionFactura) {
      alert("Debe seleccionar una recepción.");
      return;
    }

    if (!noFactura.trim()) {
      alert("Debe indicar el número de factura.");
      return;
    }

    if (!fechaFactura) {
      alert("Debe indicar la fecha de la factura.");
      return;
    }

    const monto = Number(montoFactura || 0);
    const itbis = Number(itbisFactura || 0);
    const total = monto + itbis;

    if (monto <= 0) {
      alert("El monto de la factura debe ser mayor que cero.");
      return;
    }

    const confirmar = confirm(
      `¿Desea registrar la factura por RD$ ${dinero(total)}?`
    );

    if (!confirmar) return;

    setLoading(true);
    setMensaje("");

    try {
      const facturaUrlNueva = await subirArchivo(
        "facturas-gas",
        archivoFactura,
        "facturas"
      );

      const { error } = await supabase
        .from("gas_recepciones")
        .update({
          no_factura: noFactura.trim(),
          ncf: ncf.trim() || null,
          fecha_factura: fechaFactura,
          monto_factura: monto,
          itbis_factura: itbis,
          total_factura: total,
          factura_url: facturaUrlNueva || recepcionFactura.factura_url || null,
          estado: "Factura recibida",
        })
        .eq("id", recepcionFactura.id)
        .eq("condominio_id", Number(condominioId));

      if (error) {
        alert("Error guardando factura: " + error.message);
        setLoading(false);
        return;
      }

      alert("Factura registrada correctamente.");
      limpiarFactura();
      await cargarRecepciones(condominioId);
    } catch (error: any) {
      alert("Error subiendo factura: " + error.message);
    }

    setLoading(false);
  }

  async function generarSolicitudPago(r: GasRecepcion) {
    if (!condominioId) {
      alert("No hay condominio activo.");
      return;
    }

    if (r.estado !== "Factura recibida") {
      alert("Solo se puede generar solicitud cuando la factura esté recibida.");
      return;
    }

    if (r.solicitud_pago_id) {
      alert("Esta recepción ya tiene una solicitud generada.");
      return;
    }

    if (!r.no_factura || !r.fecha_factura || !r.total_factura) {
      alert("Debe registrar la factura antes de generar la solicitud.");
      return;
    }

    const confirmar = confirm(
      `¿Desea generar la solicitud de pago por RD$ ${dinero(
        r.total_factura
      )}?`
    );

    if (!confirmar) return;

    setLoading(true);
    setMensaje("");

    const { data: categoriaGas } = await supabase
      .from("catalogo_categoria_gastos")
      .select("id, nombre_categoria")
      .ilike("nombre_categoria", "%gas%")
      .limit(1)
      .maybeSingle();

    const proveedorNombre =
      r.catalogo_proveedores?.nombre_proveedor || "Proveedor de gas";

    const tanqueNombre = r.gas_tanques?.nombre || "Tanque no especificado";

    const unidadNombre =
      r.gas_unidades_medida?.nombre ||
      r.gas_unidades_medida?.abreviatura ||
      "Galones";

  const concepto = `Gas propano - Factura No. ${r.no_factura}`;

const detalle = `Recepción de gas según conduce No. ${
  r.no_conduce || "-"
}, tanque ${tanqueNombre}, cantidad ${dinero(r.cantidad)} ${unidadNombre}. Factura No. ${
  r.no_factura || "-"
}, NCF ${r.ncf || "-"}.`;

    const { data: solicitudData, error: solicitudError } = await supabase
      .from("solicitudes_pago")
      .insert([
        {
          condominio_id: Number(condominioId),
          condominio: condominioNombre,
          fecha_solicitud: r.fecha_factura,
          proveedor_id: r.proveedor_id,
          categoria_id: categoriaGas?.id || null,
          concepto,
          detalle,
          monto: Number(r.monto_factura || 0),
          itbis: Number(r.itbis_factura || 0),
          total: Number(r.total_factura || 0),
          no_factura: r.no_factura,
          ncf: r.ncf || null,
          metodo_pago: "Factura de gas",
          cuenta_banco: null,
          soporte_url: r.factura_url,
          prioridad: "Normal",
          estado: "Pendiente aprobación tesorero",
        },
      ])
      .select("id")
      .single();

    if (solicitudError) {
      alert("Error generando solicitud de pago: " + solicitudError.message);
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("gas_recepciones")
      .update({
        solicitud_pago_id: solicitudData.id,
        estado: "Solicitud generada",
      })
      .eq("id", r.id)
      .eq("condominio_id", Number(condominioId));

    if (updateError) {
      alert(
        "La solicitud fue generada, pero no se pudo actualizar la recepción: " +
          updateError.message
      );
      setLoading(false);
      return;
    }

    alert("Solicitud de pago generada correctamente.");
    await cargarRecepciones(condominioId);
    setLoading(false);
  }

  const totalFormulario = Number(cantidad || 0) * Number(precioUnitario || 0);
  const totalFacturaFormulario =
    Number(montoFactura || 0) + Number(itbisFactura || 0);

  const recepcionesFiltradas = useMemo(() => {
    let lista = recepciones;

    if (filtroEstado !== "TODOS") {
      lista = lista.filter((r) => r.estado === filtroEstado);
    }

    if (buscar.trim()) {
      const texto = buscar.toLowerCase().trim();

      lista = lista.filter((r) => {
        const cadena = `
          ${r.id || ""}
          ${r.fecha_recepcion || ""}
          ${r.catalogo_proveedores?.nombre_proveedor || ""}
          ${r.gas_tanques?.nombre || ""}
          ${r.gas_unidades_medida?.nombre || ""}
          ${r.no_conduce || ""}
          ${r.no_factura || ""}
          ${r.ncf || ""}
          ${r.responsable || ""}
          ${r.estado || ""}
        `.toLowerCase();

        return cadena.includes(texto);
      });
    }

    return lista;
  }, [recepciones, filtroEstado, buscar]);

  const totalRecepciones = recepcionesFiltradas.reduce(
    (sum, r) => sum + Number(r.total || 0),
    0
  );

  const cantidadRecibida = recepcionesFiltradas.reduce(
    (sum, r) => sum + Number(r.cantidad || 0),
    0
  );

  const totalRegistradas = recepciones.filter(
    (r) => r.estado === "Registrado"
  ).length;

  const totalPendienteFactura = recepciones.filter(
    (r) => r.estado === "Pendiente factura"
  ).length;

  const totalFacturaRecibida = recepciones.filter(
    (r) => r.estado === "Factura recibida"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-blue-700 uppercase tracking-wide">
                Módulo de Gas
              </p>

              <h1 className="text-3xl font-black text-slate-900 mt-1">
                Recepción de Gas
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Reciba el gas mediante conduce, registre la factura cuando
                llegue y luego genere la solicitud de pago con el ciclo normal
                de aprobación.
              </p>

              <p className="text-sm text-blue-700 font-bold mt-3">
                Condominio activo: {condominioNombre || "No seleccionado"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/gas"
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold"
              >
                Volver a Gas
              </Link>

              <button
                type="button"
                onClick={() => cargarTodo(condominioId)}
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl font-bold"
              >
                Actualizar
              </button>
            </div>
          </div>
        </section>

        {mensaje && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-bold">
            {mensaje}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Recepciones filtradas</p>
            <h2 className="text-3xl font-black text-slate-900">
              {recepcionesFiltradas.length}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Registradas</p>
            <h2 className="text-3xl font-black text-yellow-700">
              {totalRegistradas}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Pendiente factura</p>
            <h2 className="text-3xl font-black text-orange-700">
              {totalPendienteFactura}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Factura recibida</p>
            <h2 className="text-3xl font-black text-green-700">
              {totalFacturaRecibida}
            </h2>
          </div>
        </section>

        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <h2 className="text-xl font-black text-slate-900 mb-4">
            Nueva recepción por conduce
          </h2>

          <form
            onSubmit={guardarRecepcion}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
          >
            <div>
              <label className="block text-sm font-semibold mb-1">
                Fecha recepción
              </label>
              <input
                type="date"
                value={fechaRecepcion}
                onChange={(e) => setFechaRecepcion(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
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
                    {p.nombre_proveedor || `Proveedor ${p.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Tanque / ubicación del condominio
              </label>
              <select
                value={tanqueId}
                onChange={(e) => setTanqueId(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="">Seleccione</option>
                {tanques.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Unidad de medida
              </label>
              <select
                value={unidadMedidaId}
                onChange={(e) => setUnidadMedidaId(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="">Seleccione</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.abreviatura ? `(${u.abreviatura})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                No. conduce
              </label>
              <input
                type="text"
                value={noConduce}
                onChange={(e) => setNoConduce(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Ej. C-000123"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Fecha conduce
              </label>
              <input
                type="date"
                value={fechaConduce}
                onChange={(e) => setFechaConduce(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Cantidad recibida
              </label>
              <input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Ej. 250"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Precio unitario
              </label>
              <input
                type="number"
                value={precioUnitario}
                onChange={(e) => setPrecioUnitario(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-slate-50"
                placeholder="Precio activo"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Total estimado
              </label>
              <div className="border rounded-xl px-4 py-3 w-full bg-slate-100 font-black text-blue-700">
                RD$ {dinero(totalFormulario)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Responsable que recibió
              </label>
              <input
                type="text"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Nombre responsable"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Imagen del conduce
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => setArchivoConduce(e.target.files?.[0] || null)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Foto inicial medidor camión
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) =>
                  setArchivoMedidorCamionInicio(e.target.files?.[0] || null)
                }
                className="border rounded-xl px-4 py-3 w-full bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Foto final medidor camión
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) =>
                  setArchivoMedidorCamionFinal(e.target.files?.[0] || null)
                }
                className="border rounded-xl px-4 py-3 w-full bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Foto tanque / medidor condominio
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) =>
                  setArchivoFotoTanque(e.target.files?.[0] || null)
                }
                className="border rounded-xl px-4 py-3 w-full bg-white"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-semibold mb-1">
                Observación
              </label>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                rows={2}
                placeholder="Observación de la recepción..."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold disabled:opacity-60"
              >
                Guardar recepción
              </button>

              <button
                type="button"
                onClick={limpiarFormulario}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 border px-5 py-3 rounded-xl font-bold"
              >
                Limpiar
              </button>
            </div>
          </form>
        </section>

        {recepcionFactura && (
          <section className="bg-white rounded-3xl border-2 border-green-300 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Registrar factura de gas
                </h2>
                <p className="text-sm text-slate-500">
                  Recepción #{recepcionFactura.id} · Conduce{" "}
                  {recepcionFactura.no_conduce || "-"} · Total estimado RD${" "}
                  {dinero(recepcionFactura.total)}
                </p>
              </div>

              <button
                type="button"
                onClick={limpiarFactura}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 border px-4 py-2 rounded-xl font-bold"
              >
                Cancelar
              </button>
            </div>

            <form
              onSubmit={guardarFactura}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
            >
              <div>
                <label className="block text-sm font-semibold mb-1">
                  No. factura
                </label>
                <input
                  type="text"
                  value={noFactura}
                  onChange={(e) => setNoFactura(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                  placeholder="Número de factura"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  NCF
                </label>
                <input
                  type="text"
                  value={ncf}
                  onChange={(e) => setNcf(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                  placeholder="NCF"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Fecha factura
                </label>
                <input
                  type="date"
                  value={fechaFactura}
                  onChange={(e) => setFechaFactura(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Imagen factura
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={(e) =>
                    setArchivoFactura(e.target.files?.[0] || null)
                  }
                  className="border rounded-xl px-4 py-3 w-full bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Monto factura
                </label>
                <input
                  type="number"
                  value={montoFactura}
                  onChange={(e) => setMontoFactura(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  ITBIS
                </label>
                <input
                  type="number"
                  value={itbisFactura}
                  onChange={(e) => setItbisFactura(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Total factura
                </label>
                <div className="border rounded-xl px-4 py-3 w-full bg-green-50 font-black text-green-700">
                  RD$ {dinero(totalFacturaFormulario)}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-xl font-bold disabled:opacity-60"
                >
                  Guardar factura
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Recepciones registradas
              </h2>
              <p className="text-sm text-slate-500">
                Primero se recibe por conduce. Luego se registra factura y se
                genera la solicitud de pago.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full md:w-auto">
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="border rounded-xl px-4 py-3 bg-white"
              >
                <option value="TODOS">Todos</option>
                <option value="Registrado">Registrado</option>
                <option value="Pendiente factura">Pendiente factura</option>
                <option value="Factura recibida">Factura recibida</option>
                <option value="Solicitud generada">Solicitud generada</option>
                <option value="Anulado">Anulado</option>
              </select>

              <input
                type="text"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="border rounded-xl px-4 py-3"
                placeholder="Buscar..."
              />
            </div>
          </div>

          <div className="overflow-auto border rounded-2xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">ID</th>
                  <th className="p-3 border text-left">Fecha</th>
                  <th className="p-3 border text-left">Proveedor</th>
                  <th className="p-3 border text-left">Tanque condominio</th>
                  <th className="p-3 border text-left">Conduce</th>
                  <th className="p-3 border text-left">Factura</th>
                  <th className="p-3 border text-right">Cantidad</th>
                  <th className="p-3 border text-right">Total factura</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">Soportes</th>
                  <th className="p-3 border text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {recepcionesFiltradas.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-3 border font-bold">{r.id}</td>

                    <td className="p-3 border">
                      {fechaDominicana(r.fecha_recepcion)}
                    </td>

                    <td className="p-3 border">
                      {r.catalogo_proveedores?.nombre_proveedor || "-"}
                    </td>

                    <td className="p-3 border">
                      {r.gas_tanques?.nombre || "-"}
                    </td>

                    <td className="p-3 border">
                      <p className="font-semibold">{r.no_conduce || "-"}</p>
                      <p className="text-xs text-slate-500">
                        {fechaDominicana(r.fecha_conduce)}
                      </p>
                    </td>

                    <td className="p-3 border">
                      <p className="font-semibold">{r.no_factura || "-"}</p>
                      <p className="text-xs text-slate-500">
                        NCF: {r.ncf || "-"}
                      </p>
                    </td>

                    <td className="p-3 border text-right">
                      {dinero(r.cantidad)}{" "}
                      {r.gas_unidades_medida?.abreviatura || ""}
                    </td>

                    <td className="p-3 border text-right font-bold">
                      RD$ {dinero(r.total_factura || r.total)}
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          r.estado === "Factura recibida"
                            ? "bg-green-100 text-green-700"
                            : r.estado === "Anulado"
                            ? "bg-red-100 text-red-700"
                            : r.estado === "Solicitud generada"
                            ? "bg-blue-100 text-blue-700"
                            : r.estado === "Pendiente factura"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {r.estado}
                      </span>
                    </td>

                    <td className="p-3 border text-center">
                      <div className="flex flex-wrap justify-center gap-2">
                        {r.conduce_url && (
                          <a
                            href={r.conduce_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-800 text-white px-3 py-1 rounded-lg text-xs font-bold"
                          >
                            Conduce
                          </a>
                        )}

                        {r.factura_url && (
                          <a
                            href={r.factura_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-700 text-white px-3 py-1 rounded-lg text-xs font-bold"
                          >
                            Factura
                          </a>
                        )}

                        {r.foto_medidor_camion_inicio_url && (
                          <a
                            href={r.foto_medidor_camion_inicio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-indigo-700 text-white px-3 py-1 rounded-lg text-xs font-bold"
                          >
                            Camión inicio
                          </a>
                        )}

                        {r.foto_medidor_camion_final_url && (
                          <a
                            href={r.foto_medidor_camion_final_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-purple-700 text-white px-3 py-1 rounded-lg text-xs font-bold"
                          >
                            Camión final
                          </a>
                        )}

                        {r.foto_tanque_url && (
                          <a
                            href={r.foto_tanque_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-bold"
                          >
                            Tanque condominio
                          </a>
                        )}

                        {!r.conduce_url &&
                          !r.factura_url &&
                          !r.foto_medidor_camion_inicio_url &&
                          !r.foto_medidor_camion_final_url &&
                          !r.foto_tanque_url && (
                            <span className="text-xs text-slate-400">
                              Sin soportes
                            </span>
                          )}
                      </div>
                    </td>

                    <td className="p-3 border text-center">
                      <div className="flex flex-wrap justify-center gap-2">
                        {r.estado === "Registrado" && (
                          <button
                            type="button"
                            onClick={() => validarRecepcion(r)}
                            className="bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded-lg text-xs font-bold"
                          >
                            Validar
                          </button>
                        )}

                        {r.estado === "Pendiente factura" && (
                          <button
                            type="button"
                            onClick={() => abrirFactura(r)}
                            className="bg-orange-700 hover:bg-orange-800 text-white px-3 py-1 rounded-lg text-xs font-bold"
                          >
                            Registrar factura
                          </button>
                        )}

                        {r.estado === "Factura recibida" &&
                          !r.solicitud_pago_id && (
                            <button
                              type="button"
                              onClick={() => generarSolicitudPago(r)}
                              className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded-lg text-xs font-bold"
                            >
                              Generar solicitud
                            </button>
                          )}

                        {r.solicitud_pago_id && (
                          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                            Solicitud #{r.solicitud_pago_id}
                          </span>
                        )}

                        {r.estado !== "Anulado" &&
                          r.estado !== "Solicitud generada" && (
                            <button
                              type="button"
                              onClick={() => anularRecepcion(r)}
                              className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded-lg text-xs font-bold"
                            >
                              Anular
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}

                {recepcionesFiltradas.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="p-6 border text-center text-slate-500"
                    >
                      No hay recepciones de gas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-slate-500">
            <p>
              Total estimado de recepciones filtradas:{" "}
              <strong>RD$ {dinero(totalRecepciones)}</strong>
            </p>
            <p>
              Cantidad recibida filtrada:{" "}
              <strong>{dinero(cantidadRecibida)}</strong>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}