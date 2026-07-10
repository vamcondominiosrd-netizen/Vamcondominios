"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  FileText,
  FileUp,
  Info,
  Landmark,
  Loader2,
  Printer,
  ReceiptText,
  Save,
  ShieldCheck,
  Tags,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";

type Proveedor = {
  id: number;
  nombre_proveedor: string;
  cuenta_banco: string | null;
};

type Categoria = {
  id: number;
  nombre_categoria: string;
};

type CajaChicaPendiente = {
  id: number;
  fecha: string;
  concepto: string;
  detalle_gasto: string | null;
  monto: number;
  repuesto: boolean | null;
};

type Aviso = {
  tipo: "success" | "error" | "info";
  titulo: string;
  mensaje: string;
};

const PRIORIDADES = ["Normal", "Alta", "Urgente"];
const METODOS_PAGO = [
  "Transferencia",
  "Cheque",
  "Depósito",
  "Efectivo",
  "Otro",
];

export default function NuevaSolicitudPagoPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [calculandoCajaChica, setCalculandoCajaChica] = useState(false);

  const [condominioId, setCondominioId] = useState("");
  const [condominio, setCondominio] = useState("");

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
  const [soporteArchivo, setSoporteArchivo] = useState<File | null>(null);

  const [montoPendienteCajaChica, setMontoPendienteCajaChica] = useState(0);
  const [cantidadGastosPendientes, setCantidadGastosPendientes] = useState(0);
  const [mensajeCajaChica, setMensajeCajaChica] = useState("");
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [solicitudCreadaId, setSolicitudCreadaId] = useState<number | null>(null);
  const [solicitudCreadaNumero, setSolicitudCreadaNumero] = useState<number | null>(null);

  useEffect(() => {
    const idGuardado = localStorage.getItem("condominio_id") || "";
    const nombreGuardado = localStorage.getItem("condominio_nombre") || "";

    if (!idGuardado) {
      setAviso({
        tipo: "error",
        titulo: "Condominio no identificado",
        mensaje: "No hay condominio activo. Debe iniciar sesión nuevamente.",
      });
      return;
    }

    setCondominioId(idGuardado);
    setCondominio(nombreGuardado || `Condominio ID ${idGuardado}`);
    setFechaSolicitud(new Date().toISOString().split("T")[0]);

    cargarCatalogos(idGuardado);
  }, []);

  useEffect(() => {
    verificarReposicionCajaChica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proveedorId, categoriaId, proveedores, categorias, condominio]);

  const proveedorSeleccionado = useMemo(
    () => proveedores.find((p) => String(p.id) === proveedorId) || null,
    [proveedores, proveedorId],
  );

  const categoriaSeleccionada = useMemo(
    () => categorias.find((c) => String(c.id) === categoriaId) || null,
    [categorias, categoriaId],
  );

  const montoNumero = Number(monto || 0);
  const itbisNumero = Number(itbis || 0);
  const totalCalculado = montoNumero + itbisNumero;
  const esReposicionCajaChica = esReposicionCajaChicaActual();

  const puedeGuardar =
    !!condominioId &&
    !!condominio &&
    !!fechaSolicitud &&
    !!proveedorId &&
    !!categoriaId &&
    !!concepto.trim() &&
    montoNumero > 0 &&
    !guardando;

  function normalizarTexto(valor: string | null | undefined) {
    return String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function dinero(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatoFecha(fecha?: string | null) {
    if (!fecha) return "-";
    const fechaLimpia = String(fecha).split("T")[0];
    const partes = fechaLimpia.split("-");
    if (partes.length === 3) {
      const [year, month, day] = partes;
      return `${day}/${month}/${year}`;
    }
    return fecha;
  }

  function esReposicionCajaChicaActual() {
    const proveedor = proveedores.find((p) => String(p.id) === proveedorId);
    const categoria = categorias.find((c) => String(c.id) === categoriaId);

    const nombreProveedor = normalizarTexto(proveedor?.nombre_proveedor);
    const nombreCategoria = normalizarTexto(categoria?.nombre_categoria);

    return (
      nombreProveedor.includes("caja chica") &&
      nombreCategoria.includes("reposicion") &&
      nombreCategoria.includes("caja chica")
    );
  }

  async function cargarCatalogos(id: string) {
    if (!id) return;

    try {
      setCargandoCatalogos(true);

      const { data: proveedoresData, error: proveedoresError } = await supabase
        .from("catalogo_proveedores")
        .select("id, nombre_proveedor, cuenta_banco")
        .eq("estado", "activo")
        .eq("condominio_id", Number(id))
        .order("nombre_proveedor", { ascending: true });

      if (proveedoresError) throw proveedoresError;

      const { data: categoriasData, error: categoriasError } = await supabase
        .from("catalogo_categoria_gastos")
        .select("id, nombre_categoria")
        .eq("estado", "activo")
        .eq("condominio_id", Number(id))
        .order("nombre_categoria", { ascending: true });

      if (categoriasError) throw categoriasError;

      setProveedores((proveedoresData || []) as Proveedor[]);
      setCategorias((categoriasData || []) as Categoria[]);
    } catch (error: any) {
      setAviso({
        tipo: "error",
        titulo: "Error cargando catálogos",
        mensaje:
          error.message || "No se pudieron cargar proveedores y categorías.",
      });
    } finally {
      setCargandoCatalogos(false);
    }
  }

  function seleccionarProveedor(id: string) {
    setProveedorId(id);
    const proveedor = proveedores.find((p) => String(p.id) === id);
    setCuentaBanco(proveedor?.cuenta_banco || "");
  }

  async function verificarReposicionCajaChica() {
    setMensajeCajaChica("");
    setMontoPendienteCajaChica(0);
    setCantidadGastosPendientes(0);

    if (!proveedorId || !categoriaId || !condominio) return;
    if (!esReposicionCajaChicaActual()) return;

    await calcularMontoPendienteCajaChica();
  }

  async function calcularMontoPendienteCajaChica() {
    try {
      setCalculandoCajaChica(true);
      setMensajeCajaChica("");

      const { data, error } = await supabase
        .from("caja_chica")
        .select("id, fecha, concepto, detalle_gasto, monto, repuesto")
        .ilike("condominio", `%${condominio}%`)
        .or("repuesto.eq.false,repuesto.is.null")
        .order("fecha", { ascending: true });

      if (error) throw error;

      const gastosPendientes = (data || []) as CajaChicaPendiente[];
      const totalPendiente = gastosPendientes.reduce(
        (sum, g) => sum + Number(g.monto || 0),
        0,
      );

      setMontoPendienteCajaChica(totalPendiente);
      setCantidadGastosPendientes(gastosPendientes.length);

      if (totalPendiente <= 0) {
        setMensajeCajaChica(
          "No hay gastos de caja chica pendientes de reposición para este condominio.",
        );
        return;
      }

      setMonto(String(totalPendiente.toFixed(2)));
      setItbis("0");
      if (!metodoPago) setMetodoPago("Cheque");
      if (!concepto.trim()) setConcepto("Reposición de caja chica");

      const primerGasto = gastosPendientes[0];
      const ultimoGasto = gastosPendientes[gastosPendientes.length - 1];

      if (!detalle.trim()) {
        setDetalle(
          `Reposición de caja chica correspondiente a ${gastosPendientes.length} gasto(s) pendiente(s). Período aproximado: ${formatoFecha(
            primerGasto?.fecha,
          )} al ${formatoFecha(ultimoGasto?.fecha)}. Monto sugerido: RD$ ${dinero(
            totalPendiente,
          )}.`,
        );
      }

      setMensajeCajaChica(
        `Monto sugerido cargado desde caja chica: RD$ ${dinero(
          totalPendiente,
        )}. Puede modificarlo si es necesario.`,
      );
    } catch (error: any) {
      setMensajeCajaChica(
        error.message || "Error calculando reposición de caja chica.",
      );
    } finally {
      setCalculandoCajaChica(false);
    }
  }

  async function subirSoporte() {
    if (!soporteArchivo) return "";

    const extension = soporteArchivo.name.split(".").pop() || "file";
    const nombreArchivo = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

    const rutaArchivo = `${condominioId || "general"}/${nombreArchivo}`;

    const { error } = await supabase.storage
      .from("soportes-solicitudes-pago")
      .upload(rutaArchivo, soporteArchivo, { upsert: false });

    if (error) throw new Error(error.message);

    const { data } = supabase.storage
      .from("soportes-solicitudes-pago")
      .getPublicUrl(rutaArchivo);

    return data.publicUrl;
  }

  async function obtenerNumeroSolicitud() {
    const { data, error } = await supabase.rpc(
      "obtener_proximo_numero_solicitud",
      { p_condominio_id: Number(condominioId) },
    );

    if (error) {
      throw new Error("Error generando número de solicitud: " + error.message);
    }

    return Number(data || 1);
  }

  function limpiarFormulario() {
    const hoy = new Date().toISOString().split("T")[0];

    setFechaSolicitud(hoy);
    setProveedorId("");
    setCategoriaId("");
    setConcepto("");
    setDetalle("");
    setMonto("");
    setItbis("");
    setNoFactura("");
    setNcf("");
    setMetodoPago("");
    setCuentaBanco("");
    setPrioridad("Normal");
    setSoporteArchivo(null);
    setMontoPendienteCajaChica(0);
    setCantidadGastosPendientes(0);
    setMensajeCajaChica("");

    const inputFile = document.getElementById(
      "soporteSolicitudPago",
    ) as HTMLInputElement | null;
    if (inputFile) inputFile.value = "";
  }

  async function guardarSolicitud(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    setSolicitudCreadaId(null);
    setSolicitudCreadaNumero(null);

    if (!puedeGuardar) {
      setAviso({
        tipo: "error",
        titulo: "Faltan datos obligatorios",
        mensaje:
          "Complete fecha, proveedor, categoría, concepto y un monto mayor que cero.",
      });
      return;
    }

    try {
      setGuardando(true);

      const numeroSolicitud = await obtenerNumeroSolicitud();
      const soporteUrl = soporteArchivo ? await subirSoporte() : "";

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: solicitudCreada, error } = await supabase
        .from("solicitudes_pago")
        .insert([
          {
            condominio_id: Number(condominioId),
            condominio,
            numero_solicitud: numeroSolicitud,
            fecha_solicitud: fechaSolicitud,
            proveedor_id: Number(proveedorId),
            categoria_id: Number(categoriaId),
            concepto: concepto.trim(),
            detalle: detalle.trim(),
            monto: montoNumero,
            itbis: itbisNumero,
            total: totalCalculado,
            no_factura: noFactura.trim(),
            ncf: ncf.trim(),
            metodo_pago: metodoPago,
            cuenta_banco: cuentaBanco.trim(),
            soporte_url: soporteUrl,
            prioridad,
            estado: "Pendiente aprobación tesorero",
            created_by:
              user?.email ||
              localStorage.getItem("usuario_nombre") ||
              "Usuario del sistema",
          },
        ])
        .select("id, numero_solicitud")
        .single();

      if (error) throw error;

      const nuevaSolicitudId = Number(solicitudCreada?.id || 0);
      setSolicitudCreadaId(nuevaSolicitudId || null);
      setSolicitudCreadaNumero(
        Number(solicitudCreada?.numero_solicitud || numeroSolicitud),
      );

      setAviso({
        tipo: "success",
        titulo: "Solicitud registrada",
        mensaje: `Solicitud No. ${String(numeroSolicitud).padStart(
          5,
          "0",
        )} enviada para aprobación del tesorero.`,
      });

      limpiarFormulario();
    } catch (err: any) {
      setAviso({
        tipo: "error",
        titulo: "No se pudo guardar la solicitud",
        mensaje: err.message || "Error guardando solicitud.",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <PageContainer>
      <ModuleMenu
        title="Finanzas"
        subtitle="Pagos, gastos, solicitudes, caja chica, banco y reportes."
        tone="green"
        items={[
          { href: "/finanzas", label: "Dashboard", icon: BarChart3 },
          { href: "/finanzas/pagos", label: "Pagos", icon: CreditCard },
          {
            href: "/pagos-mantenimiento",
            label: "Mantenimiento",
            icon: WalletCards,
          },
          { href: "/gastos", label: "Gastos", icon: ReceiptText },
          {
            href: "/finanzas/caja-chica",
            label: "Caja Chica",
            icon: WalletCards,
          },
          { href: "/banco", label: "Banco", icon: Landmark },
          { href: "/solicitudes-pago", label: "Solicitudes", icon: FileText },
          { href: "/presupuesto", label: "Presupuesto", icon: FileSpreadsheet },
        ]}
      />

      <ModuleToolbar
        title="Nueva Solicitud de Pago"
        subtitle="Registra la factura o soporte del proveedor para aprobación del tesorero y presidente."
        icon={ShieldCheck}
        actions={
          <ModuleActions
            extra={
              <Link
                href="/solicitudes-pago"
                className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al listado
              </Link>
            }
          />
        }
      />

      {aviso && (
        <div
          className={`mb-4 rounded-2xl border p-4 ${
            aviso.tipo === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : aviso.tipo === "error"
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-blue-200 bg-blue-50 text-blue-900"
          }`}
        >
          <div className="flex gap-3">
            {aviso.tipo === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            ) : aviso.tipo === "error" ? (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <Info className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <div>
              <p className="font-black">{aviso.titulo}</p>
              <p className="mt-1 text-sm font-medium">{aviso.mensaje}</p>

              {aviso.tipo === "success" && solicitudCreadaId && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/solicitudes-pago/reporte/${solicitudCreadaId}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir reporte
                  </Link>

                  <Link
                    href="/solicitudes-pago"
                    className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
                  >
                    Ver listado
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm lg:col-span-2">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-slate-500">
                Condominio activo
              </p>
              <p className="text-lg font-black text-slate-900">
                {condominio || "No seleccionado"}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                La solicitud se registrará solo para este condominio.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase text-slate-500">
            Flujo inicial
          </p>
          <p className="mt-1 text-sm font-black text-slate-900">
            Pendiente aprobación tesorero
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Luego pasa al presidente y finalmente a pago.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase text-slate-500">
            Total solicitud
          </p>
          <p className="mt-1 text-2xl font-black text-blue-700">
            RD$ {dinero(totalCalculado)}
          </p>
          <p className="text-xs font-semibold text-slate-500">Monto + ITBIS</p>
        </div>
      </div>

      <form onSubmit={guardarSolicitud} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <SectionCard
              title="Información principal"
              subtitle="Proveedor, categoría, fecha y concepto de la solicitud."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-4">
                  <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <CalendarDays className="h-4 w-4" />
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={fechaSolicitud}
                    onChange={(e) => setFechaSolicitud(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <UserRound className="h-4 w-4" />
                    Proveedor *
                  </label>
                  <select
                    value={proveedorId}
                    onChange={(e) => seleccionarProveedor(e.target.value)}
                    className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"
                    disabled={cargandoCatalogos}
                  >
                    <option value="">
                      {cargandoCatalogos
                        ? "Cargando..."
                        : "Seleccione proveedor"}
                    </option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre_proveedor}
                      </option>
                    ))}
                  </select>
                  {!cargandoCatalogos && proveedores.length === 0 && (
                    <p className="mt-1 text-xs font-semibold text-orange-600">
                      No hay proveedores activos para este condominio.
                    </p>
                  )}
                </div>

                <div className="md:col-span-4">
                  <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <Tags className="h-4 w-4" />
                    Categoría *
                  </label>
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"
                    disabled={cargandoCatalogos}
                  >
                    <option value="">
                      {cargandoCatalogos
                        ? "Cargando..."
                        : "Seleccione categoría"}
                    </option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre_categoria}
                      </option>
                    ))}
                  </select>
                  {!cargandoCatalogos && categorias.length === 0 && (
                    <p className="mt-1 text-xs font-semibold text-orange-600">
                      No hay categorías activas para este condominio.
                    </p>
                  )}
                </div>

                <div className="md:col-span-8">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Concepto *
                  </label>
                  <input
                    type="text"
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    placeholder="Ej. Pago energía eléctrica junio 2026"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Prioridad
                  </label>
                  <select
                    value={prioridad}
                    onChange={(e) => setPrioridad(e.target.value)}
                    className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"
                  >
                    {PRIORIDADES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </SectionCard>

            {esReposicionCajaChica && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-black text-blue-900">
                      Reposición de Caja Chica detectada
                    </h3>
                    <p className="mt-1 text-sm font-medium text-blue-800">
                      El sistema calculó los gastos pendientes de reposición y
                      colocó el monto sugerido.
                    </p>
                    {calculandoCajaChica && (
                      <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-blue-700">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Calculando monto pendiente...
                      </p>
                    )}
                    {mensajeCajaChica && (
                      <p className="mt-2 text-sm font-bold text-blue-700">
                        {mensajeCajaChica}
                      </p>
                    )}
                  </div>

                  <div className="min-w-[220px] rounded-xl border bg-white p-3 text-center">
                    <p className="text-xs font-black uppercase text-slate-500">
                      Pendiente sugerido
                    </p>
                    <p className="text-xl font-black text-blue-800">
                      RD$ {dinero(montoPendienteCajaChica)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {cantidadGastosPendientes} gasto(s) pendiente(s)
                    </p>
                  </div>
                </div>
              </div>
            )}

            <SectionCard
              title="Monto y datos fiscales"
              subtitle="Factura del proveedor, NCF, método sugerido y cuenta del proveedor."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-3">
                  <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <DollarSign className="h-4 w-4" />
                    Monto RD$ *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    placeholder="0.00"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    ITBIS RD$
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={itbis}
                    onChange={(e) => setItbis(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    placeholder="0.00"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    No. factura
                  </label>
                  <input
                    type="text"
                    value={noFactura}
                    onChange={(e) => setNoFactura(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    placeholder="Factura proveedor"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    NCF
                  </label>
                  <input
                    type="text"
                    value={ncf}
                    onChange={(e) => setNcf(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm uppercase"
                    placeholder="B01..."
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Método de pago sugerido
                  </label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"
                  >
                    <option value="">Seleccione método</option>
                    {METODOS_PAGO.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-8">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Cuenta bancaria del proveedor
                  </label>
                  <input
                    type="text"
                    value={cuentaBanco}
                    onChange={(e) => setCuentaBanco(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    placeholder="Cuenta bancaria del proveedor"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Soporte y observación"
              subtitle="Adjunte factura, cotización o soporte del proveedor. El cheque se carga luego al procesar el pago."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-5">
                  <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <FileUp className="h-4 w-4" />
                    Factura / soporte proveedor
                  </label>
                  <input
                    id="soporteSolicitudPago"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) =>
                      setSoporteArchivo(e.target.files?.[0] || null)
                    }
                    className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"
                  />
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    PDF o imagen. Este soporte queda asociado a la solicitud.
                  </p>

                  {soporteArchivo && (
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                      <span className="truncate">{soporteArchivo.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSoporteArchivo(null);
                          const inputFile = document.getElementById(
                            "soporteSolicitudPago",
                          ) as HTMLInputElement | null;
                          if (inputFile) inputFile.value = "";
                        }}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Quitar
                      </button>
                    </div>
                  )}
                </div>

                <div className="md:col-span-7">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Detalle / observación
                  </label>
                  <textarea
                    value={detalle}
                    onChange={(e) => setDetalle(e.target.value)}
                    className="min-h-[118px] w-full rounded-xl border px-3 py-2.5 text-sm"
                    placeholder="Detalle de la solicitud, período facturado o comentario para tesorero/presidente."
                  />
                </div>
              </div>
            </SectionCard>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-black text-slate-900">Resumen</p>
                  <p className="text-xs font-semibold text-slate-500">
                    Validación antes de guardar
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <ResumenLinea
                  label="Proveedor"
                  value={proveedorSeleccionado?.nombre_proveedor || "Pendiente"}
                />
                <ResumenLinea
                  label="Categoría"
                  value={categoriaSeleccionada?.nombre_categoria || "Pendiente"}
                />
                <ResumenLinea
                  label="Fecha"
                  value={formatoFecha(fechaSolicitud)}
                />
                <ResumenLinea label="Prioridad" value={prioridad} />
                <ResumenLinea
                  label="Factura"
                  value={noFactura || "No indicada"}
                />
                <ResumenLinea label="NCF" value={ncf || "No indicado"} />
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-500">Subtotal</span>
                  <span className="font-black text-slate-900">
                    RD$ {dinero(montoNumero)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-500">ITBIS</span>
                  <span className="font-black text-slate-900">
                    RD$ {dinero(itbisNumero)}
                  </span>
                </div>
                <div className="mt-3 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-700">Total</span>
                    <span className="text-xl font-black text-blue-700">
                      RD$ {dinero(totalCalculado)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                <div className="flex gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    El cheque o comprobante de pago se sube en el botón Procesar
                    Pago, luego de las aprobaciones.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="mb-3 font-black text-slate-900">
                Ruta de aprobación
              </p>
              <div className="space-y-3">
                <PasoFlujo
                  numero="1"
                  titulo="Solicitud registrada"
                  descripcion="Se crea con estado pendiente."
                  activo
                />
                <PasoFlujo
                  numero="2"
                  titulo="Firma tesorero"
                  descripcion="Revisión y aprobación inicial."
                />
                <PasoFlujo
                  numero="3"
                  titulo="Firma presidente"
                  descripcion="Autorización final."
                />
                <PasoFlujo
                  numero="4"
                  titulo="Procesar pago"
                  descripcion="Se genera el egreso en banco."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!puedeGuardar}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3.5 font-black text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              {guardando ? "Guardando solicitud..." : "Guardar solicitud"}
            </button>

            <Link
              href="/solicitudes-pago"
              className="inline-flex w-full items-center justify-center rounded-2xl border bg-white px-5 py-3 font-black text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Link>
          </aside>
        </div>
      </form>
    </PageContainer>
  );
}

function ResumenLinea({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <span className="font-bold text-slate-500">{label}</span>
      <span className="max-w-[190px] text-right font-black text-slate-800">
        {value}
      </span>
    </div>
  );
}

function PasoFlujo({
  numero,
  titulo,
  descripcion,
  activo,
}: {
  numero: string;
  titulo: string;
  descripcion: string;
  activo?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
          activo ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        {numero}
      </div>
      <div>
        <p className="text-sm font-black text-slate-800">{titulo}</p>
        <p className="text-xs font-semibold text-slate-500">{descripcion}</p>
      </div>
    </div>
  );
}
