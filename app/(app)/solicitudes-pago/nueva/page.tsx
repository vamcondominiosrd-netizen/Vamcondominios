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
  Search,
  ShieldCheck,
  Tags,
  Trash2,
  UserRound,
  WalletCards,
  X,
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

type Edificio = {
  id: number;
  codigo: string;
  nombre: string;
};

type DistribucionEdificio = {
  edificio_id: number;
  monto_asignado: string;
};

type CajaChicaPendiente = {
  id: number;
  fecha: string;
  concepto: string;
  detalle_gasto: string | null;
  monto: number;
  repuesto: boolean | null;
};

type CajaChicaFondoCalculo = {
  id: number;
  tipo: string | null;
  monto: number | null;
  estado: string | null;
  movimiento_banco_id: number | null;
  solicitud_pago_id: number | null;
};

type CajaChicaFondoEstado = {
  id: number;
  tipo: string | null;
  estado: string | null;
  movimiento_banco_id: number | null;
  solicitud_pago_id: number | null;
};

type SolicitudCajaChicaEstado = {
  id: number;
  categoria_id: number | null;
  estado: string | null;
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
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [calculandoCajaChica, setCalculandoCajaChica] = useState(false);
  const [cargandoEstadoCajaChica, setCargandoEstadoCajaChica] = useState(false);
  const [tieneFondoInicialCajaChica, setTieneFondoInicialCajaChica] =
    useState(false);
  const [fondoInicialCajaChicaEnProceso, setFondoInicialCajaChicaEnProceso] =
    useState(false);
  const [reposicionCajaChicaEnProceso, setReposicionCajaChicaEnProceso] =
    useState(false);

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
  const [alcanceGasto, setAlcanceGasto] = useState<
    "" | "COMUN" | "EDIFICIOS"
  >("");
  const [distribucionEdificios, setDistribucionEdificios] = useState<
    DistribucionEdificio[]
  >([]);
  const [busquedaEdificio, setBusquedaEdificio] = useState("");

  const [montoPendienteCajaChica, setMontoPendienteCajaChica] = useState(0);
  const [cantidadGastosPendientes, setCantidadGastosPendientes] = useState(0);
  const [fondoFijoCajaChica, setFondoFijoCajaChica] = useState(0);
  const [totalGastosCajaChica, setTotalGastosCajaChica] = useState(0);
  const [totalReposicionesCajaChica, setTotalReposicionesCajaChica] = useState(0);
  const [disponibleRealCajaChica, setDisponibleRealCajaChica] = useState(0);
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
    setFechaSolicitud(fechaLocalHoy());

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

  const esProveedorCajaChica = useMemo(
    () =>
      normalizarTexto(proveedorSeleccionado?.nombre_proveedor).includes(
        "caja chica",
      ),
    [proveedorSeleccionado],
  );

  const categoriaFondoInicialCajaChica = useMemo(
    () =>
      categorias.find((c) => {
        const nombre = normalizarTexto(c.nombre_categoria);
        return (
          nombre.includes("fondo inicial") && nombre.includes("caja chica")
        );
      }) || null,
    [categorias],
  );

  const categoriaReposicionCajaChica = useMemo(
    () =>
      categorias.find((c) => {
        const nombre = normalizarTexto(c.nombre_categoria);
        return (
          nombre.includes("reposicion") && nombre.includes("caja chica")
        );
      }) || null,
    [categorias],
  );

  const categoriaCajaChicaEsperada = tieneFondoInicialCajaChica
    ? categoriaReposicionCajaChica
    : categoriaFondoInicialCajaChica;

  const categoriasVisibles = useMemo(() => {
    if (!esProveedorCajaChica) return categorias;
    return categoriaCajaChicaEsperada ? [categoriaCajaChicaEsperada] : [];
  }, [
    categorias,
    esProveedorCajaChica,
    categoriaCajaChicaEsperada,
  ]);

  useEffect(() => {
    if (!esProveedorCajaChica || cargandoEstadoCajaChica) return;

    const categoriaObjetivo = categoriaCajaChicaEsperada;

    if (!categoriaObjetivo) {
      setCategoriaId("");
      return;
    }

    if (categoriaId !== String(categoriaObjetivo.id)) {
      setCategoriaId(String(categoriaObjetivo.id));
      setItbis("0");
      setAlcanceGasto("COMUN");
      setDistribucionEdificios([]);

      if (!metodoPago) setMetodoPago("Cheque");

      if (tieneFondoInicialCajaChica) {
        setMonto("");
        setConcepto("Reposición de caja chica");
        setDetalle("");
      } else {
        setMonto("");
        setConcepto("Fondo inicial de caja chica");
        setDetalle(
          "Constitución del fondo inicial de caja chica para el condominio.",
        );
      }
    } else if (alcanceGasto !== "COMUN") {
      setAlcanceGasto("COMUN");
      setDistribucionEdificios([]);
    }
  }, [
    esProveedorCajaChica,
    cargandoEstadoCajaChica,
    categoriaCajaChicaEsperada?.id,
    tieneFondoInicialCajaChica,
  ]);

  const edificiosFiltrados = useMemo(() => {
    const termino = normalizarTexto(busquedaEdificio);
    if (!termino) return edificios;

    return edificios.filter((edificio) =>
      normalizarTexto(`${edificio.nombre} ${edificio.codigo}`).includes(termino),
    );
  }, [edificios, busquedaEdificio]);

  const edificiosSeleccionados = useMemo(
    () =>
      distribucionEdificios
        .map((item) => ({
          ...item,
          edificio: edificios.find((e) => e.id === item.edificio_id) || null,
        }))
        .filter((item) => item.edificio !== null),
    [distribucionEdificios, edificios],
  );

  const montoNumero = Number(monto || 0);
  const itbisNumero = Number(itbis || 0);
  const totalCalculado = redondear2(montoNumero + itbisNumero);
  const totalDistribuido = redondear2(
    distribucionEdificios.reduce(
      (sum, item) => sum + Number(item.monto_asignado || 0),
      0,
    ),
  );
  const pendienteDistribuir = redondear2(totalCalculado - totalDistribuido);
  const distribucionValida =
    alcanceGasto === "COMUN" ||
    (alcanceGasto === "EDIFICIOS" &&
      distribucionEdificios.length > 0 &&
      Math.abs(pendienteDistribuir) < 0.01);
  const esReposicionCajaChica = esReposicionCajaChicaActual();
  const esFondoInicialCajaChica = esFondoInicialCajaChicaActual();
  const esOperacionCajaChica =
    esReposicionCajaChica || esFondoInicialCajaChica;

  const operacionCajaChicaEnProceso =
    esFondoInicialCajaChica
      ? fondoInicialCajaChicaEnProceso
      : esReposicionCajaChica
        ? reposicionCajaChicaEnProceso
        : false;

  const cajaChicaListaParaGuardar =
    !esProveedorCajaChica ||
    (!cargandoEstadoCajaChica &&
      !!categoriaCajaChicaEsperada &&
      !operacionCajaChicaEnProceso &&
      (!esReposicionCajaChica || montoPendienteCajaChica > 0));

  const puedeGuardar =
    !!condominioId &&
    !!condominio &&
    !!fechaSolicitud &&
    !!proveedorId &&
    !!categoriaId &&
    !!concepto.trim() &&
    montoNumero > 0 &&
    !!alcanceGasto &&
    distribucionValida &&
    cajaChicaListaParaGuardar &&
    !guardando;

  useEffect(() => {
    if (alcanceGasto !== "EDIFICIOS" || distribucionEdificios.length === 0) {
      return;
    }

    const ids = distribucionEdificios.map((item) => item.edificio_id);
    setDistribucionEdificios(distribuirIgual(ids, totalCalculado));
    // Recalcula solo cuando cambia el total de la solicitud.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCalculado]);

  function redondear2(valor: number) {
    return Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;
  }

  function fechaLocalHoy() {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, "0");
    const day = String(hoy.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

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

  function esFondoInicialCajaChicaActual() {
    const proveedor = proveedores.find((p) => String(p.id) === proveedorId);
    const categoria = categorias.find((c) => String(c.id) === categoriaId);

    const nombreProveedor = normalizarTexto(proveedor?.nombre_proveedor);
    const nombreCategoria = normalizarTexto(categoria?.nombre_categoria);

    return (
      nombreProveedor.includes("caja chica") &&
      nombreCategoria.includes("fondo inicial") &&
      nombreCategoria.includes("caja chica")
    );
  }

  function solicitudSigueActiva(estado?: string | null) {
    const valor = normalizarTexto(estado);

    return ![
      "rechaz",
      "anulad",
      "cancel",
      "pagad",
      "ejecutad",
      "complet",
    ].some((termino) => valor.includes(termino));
  }

  async function verificarEstadoCajaChica(
    idCondominio: string,
    categoriasActuales: Categoria[],
  ) {
    if (!idCondominio) return;

    try {
      setCargandoEstadoCajaChica(true);

      const categoriaInicial = categoriasActuales.find((c) => {
        const nombre = normalizarTexto(c.nombre_categoria);
        return (
          nombre.includes("fondo inicial") && nombre.includes("caja chica")
        );
      });

      const categoriaReposicion = categoriasActuales.find((c) => {
        const nombre = normalizarTexto(c.nombre_categoria);
        return (
          nombre.includes("reposicion") && nombre.includes("caja chica")
        );
      });

      const { data: fondosData, error: fondosError } = await supabase
        .from("caja_chica_fondos")
        .select(
          "id, tipo, estado, movimiento_banco_id, solicitud_pago_id",
        )
        .eq("condominio_id", Number(idCondominio))
        .eq("tipo", "fondo_inicial")
        .order("id", { ascending: false })
        .limit(20);

      if (fondosError) throw fondosError;

      const fondos = (fondosData || []) as CajaChicaFondoEstado[];
      const existeFondoInicial = fondos.some(
        (f) => !normalizarTexto(f.estado).includes("anulad"),
      );

      setTieneFondoInicialCajaChica(existeFondoInicial);

      const idsCategorias = [
        categoriaInicial?.id,
        categoriaReposicion?.id,
      ].filter((id): id is number => typeof id === "number");

      if (idsCategorias.length === 0) {
        setFondoInicialCajaChicaEnProceso(false);
        setReposicionCajaChicaEnProceso(false);
        return;
      }

      const { data: solicitudesData, error: solicitudesError } = await supabase
        .from("solicitudes_pago")
        .select("id, categoria_id, estado")
        .eq("condominio_id", Number(idCondominio))
        .in("categoria_id", idsCategorias)
        .order("id", { ascending: false })
        .limit(50);

      if (solicitudesError) throw solicitudesError;

      const solicitudes = (solicitudesData || []) as SolicitudCajaChicaEstado[];

      setFondoInicialCajaChicaEnProceso(
        Boolean(
          categoriaInicial &&
            solicitudes.some(
              (s) =>
                Number(s.categoria_id) === categoriaInicial.id &&
                solicitudSigueActiva(s.estado),
            ),
        ),
      );

      setReposicionCajaChicaEnProceso(
        Boolean(
          categoriaReposicion &&
            solicitudes.some(
              (s) =>
                Number(s.categoria_id) === categoriaReposicion.id &&
                solicitudSigueActiva(s.estado),
            ),
        ),
      );
    } catch (error: any) {
      setAviso({
        tipo: "error",
        titulo: "No se pudo validar Caja Chica",
        mensaje:
          error.message ||
          "No fue posible determinar si corresponde Fondo Inicial o Reposición.",
      });
    } finally {
      setCargandoEstadoCajaChica(false);
    }
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

      const { data: edificiosData, error: edificiosError } = await supabase
        .from("edificios")
        .select("id, codigo, nombre")
        .eq("estado", "activo")
        .eq("condominio_id", Number(id))
        .order("codigo", { ascending: true });

      if (edificiosError) throw edificiosError;

      const proveedoresActivos = (proveedoresData || []) as Proveedor[];
      const categoriasActivas = (categoriasData || []) as Categoria[];
      const edificiosActivos = (edificiosData || []) as Edificio[];

      setProveedores(proveedoresActivos);
      setCategorias(categoriasActivas);
      setEdificios(edificiosActivos);

      await verificarEstadoCajaChica(id, categoriasActivas);
    } catch (error: any) {
      setAviso({
        tipo: "error",
        titulo: "Error cargando catálogos",
        mensaje:
          error.message ||
          "No se pudieron cargar proveedores, categorías y edificios.",
      });
    } finally {
      setCargandoCatalogos(false);
    }
  }

  function distribuirIgual(
    edificioIds: number[],
    total: number = totalCalculado,
  ): DistribucionEdificio[] {
    if (edificioIds.length === 0) return [];

    const totalCentavos = Math.max(0, Math.round(Number(total || 0) * 100));
    const base = Math.floor(totalCentavos / edificioIds.length);
    const residuo = totalCentavos - base * edificioIds.length;

    return edificioIds.map((edificioId, index) => {
      const centavos = base + (index < residuo ? 1 : 0);
      return {
        edificio_id: edificioId,
        monto_asignado: (centavos / 100).toFixed(2),
      };
    });
  }

  function seleccionarAlcance(valor: "COMUN" | "EDIFICIOS") {
    setAlcanceGasto(valor);

    if (valor === "COMUN") {
      setDistribucionEdificios([]);
    }
  }

  function alternarEdificio(edificioId: number) {
    const seleccionado = distribucionEdificios.some(
      (item) => item.edificio_id === edificioId,
    );

    const ids = seleccionado
      ? distribucionEdificios
          .filter((item) => item.edificio_id !== edificioId)
          .map((item) => item.edificio_id)
      : [...distribucionEdificios.map((item) => item.edificio_id), edificioId];

    setDistribucionEdificios(distribuirIgual(ids, totalCalculado));
  }

  function seleccionarEdificiosVisibles() {
    const idsActuales = distribucionEdificios.map((item) => item.edificio_id);
    const idsVisibles = edificiosFiltrados.map((edificio) => edificio.id);
    const ids = Array.from(new Set([...idsActuales, ...idsVisibles]));
    setDistribucionEdificios(distribuirIgual(ids, totalCalculado));
  }

  function limpiarEdificiosSeleccionados() {
    setDistribucionEdificios([]);
  }

  function cambiarMontoEdificio(edificioId: number, valor: string) {
    setDistribucionEdificios((actual) =>
      actual.map((item) =>
        item.edificio_id === edificioId
          ? { ...item, monto_asignado: valor }
          : item,
      ),
    );
  }

  function nombreAlcance() {
    if (alcanceGasto === "COMUN") return "Común del condominio";
    if (alcanceGasto === "EDIFICIOS") return "Uno o varios edificios";
    return "Pendiente";
  }

  function edificiosSeleccionadosTexto() {
    if (alcanceGasto !== "EDIFICIOS" || distribucionEdificios.length === 0) {
      return "No aplica";
    }

    return distribucionEdificios
      .map((item) =>
        edificios.find((edificio) => edificio.id === item.edificio_id),
      )
      .filter(Boolean)
      .map((edificio) => edificio?.codigo)
      .join(", ");
  }

  function seleccionarProveedor(id: string) {
    setProveedorId(id);
    setCategoriaId("");
    const proveedor = proveedores.find((p) => String(p.id) === id);
    setCuentaBanco(proveedor?.cuenta_banco || "");
  }

  async function verificarReposicionCajaChica() {
    setMensajeCajaChica("");
    setMontoPendienteCajaChica(0);
    setCantidadGastosPendientes(0);
    setFondoFijoCajaChica(0);
    setTotalGastosCajaChica(0);
    setTotalReposicionesCajaChica(0);
    setDisponibleRealCajaChica(0);

    if (!proveedorId || !categoriaId || !condominio) return;
    if (!esReposicionCajaChicaActual()) return;

    await calcularMontoPendienteCajaChica();
  }

  async function calcularMontoPendienteCajaChica() {
    try {
      setCalculandoCajaChica(true);
      setMensajeCajaChica("");

      const [gastosResultado, fondosResultado] = await Promise.all([
        supabase
          .from("caja_chica")
          .select("id, fecha, concepto, detalle_gasto, monto, repuesto")
          .ilike("condominio", `%${condominio}%`)
          .order("fecha", { ascending: true }),
        supabase
          .from("caja_chica_fondos")
          .select("id, tipo, monto, estado, movimiento_banco_id, solicitud_pago_id")
          .eq("condominio_id", Number(condominioId))
          .order("fecha", { ascending: true })
          .order("id", { ascending: true }),
      ]);

      if (gastosResultado.error) throw gastosResultado.error;
      if (fondosResultado.error) throw fondosResultado.error;

      const gastos = (gastosResultado.data || []) as CajaChicaPendiente[];
      const fondos = (fondosResultado.data || []) as CajaChicaFondoCalculo[];

      // Compatibilidad histórica:
      // - Flujo nuevo: el fondo debe tener movimiento bancario.
      // - Registros anteriores a la centralización: solicitud_pago_id = null
      //   puede representar un fondo realmente entregado aunque no tenga
      //   movimiento_banco_id porque Banco no se registraba en ese momento.
      const fondosValidos = fondos.filter((f) => {
        const noAnulado = !normalizarTexto(f.estado).includes("anulad");
        const tieneMovimiento = Boolean(f.movimiento_banco_id);
        const esHistorico = f.solicitud_pago_id == null;

        return noAnulado && (tieneMovimiento || esHistorico);
      });

      const fondoInicial = fondosValidos.find(
        (f) => normalizarTexto(f.tipo) === "fondo_inicial",
      );

      const fondoFijo = Number(fondoInicial?.monto || 0);

      const totalGastos = redondear2(
        gastos.reduce((sum, g) => sum + Number(g.monto || 0), 0),
      );

      const totalReposiciones = redondear2(
        fondosValidos
          .filter((f) => normalizarTexto(f.tipo) === "reposicion")
          .reduce((sum, f) => sum + Number(f.monto || 0), 0),
      );

      const totalFondosEntregados = redondear2(
        fondoFijo + totalReposiciones,
      );

      const disponibleReal = redondear2(
        totalFondosEntregados - totalGastos,
      );

      // Regla financiera:
      // Pendiente de reposición = gastos acumulados - reposiciones desembolsadas.
      // El fondo inicial NO se resta como reposición porque es el capital base.
      const totalPendiente = redondear2(
        Math.max(totalGastos - totalReposiciones, 0),
      );

      setFondoFijoCajaChica(fondoFijo);
      setTotalGastosCajaChica(totalGastos);
      setTotalReposicionesCajaChica(totalReposiciones);
      setDisponibleRealCajaChica(disponibleReal);
      setMontoPendienteCajaChica(totalPendiente);
      setCantidadGastosPendientes(gastos.length);

      if (fondoFijo <= 0) {
        setMensajeCajaChica(
          "No se encontró un Fondo Inicial de Caja Chica válido para este condominio. Revise la configuración antes de solicitar una reposición.",
        );
        setMonto("");
        return;
      }

      if (totalPendiente <= 0) {
        setMensajeCajaChica(
          "Caja Chica no tiene monto pendiente de reposición.",
        );
        setMonto("");
        return;
      }

      setMonto(String(totalPendiente.toFixed(2)));
      setItbis("0");
      if (!metodoPago) setMetodoPago("Cheque");
      if (!concepto.trim()) setConcepto("Reposición de caja chica");

      const primerGasto = gastos[0];
      const ultimoGasto = gastos[gastos.length - 1];

      if (!detalle.trim()) {
        setDetalle(
          `Reposición de Caja Chica calculada por balance real. Fondo fijo: RD$ ${dinero(
            fondoFijo,
          )}. Gastos acumulados: RD$ ${dinero(
            totalGastos,
          )}. Reposiciones desembolsadas: RD$ ${dinero(
            totalReposiciones,
          )}. Disponible actual: RD$ ${dinero(
            disponibleReal,
          )}. Monto a reponer: RD$ ${dinero(
            totalPendiente,
          )}. Período de gastos registrado: ${formatoFecha(
            primerGasto?.fecha,
          )} al ${formatoFecha(ultimoGasto?.fecha)}.`,
        );
      }

      setMensajeCajaChica(
        `Monto calculado por balance real: RD$ ${dinero(
          totalPendiente,
        )}. Se toma el total de gastos históricos menos las reposiciones realmente desembolsadas; el campo histórico "repuesto" no se usa para determinar el monto.`,
      );
    } catch (error: any) {
      setMensajeCajaChica(
        error.message || "Error calculando reposición de Caja Chica.",
      );
    } finally {
      setCalculandoCajaChica(false);
    }
  }

  async function subirSoporte() {
    if (!soporteArchivo) {
      return { publicUrl: "", rutaArchivo: "" };
    }

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

    return { publicUrl: data.publicUrl, rutaArchivo };
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
    const hoy = fechaLocalHoy();

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
    setAlcanceGasto("");
    setDistribucionEdificios([]);
    setBusquedaEdificio("");
    setMontoPendienteCajaChica(0);
    setCantidadGastosPendientes(0);
    setFondoFijoCajaChica(0);
    setTotalGastosCajaChica(0);
    setTotalReposicionesCajaChica(0);
    setDisponibleRealCajaChica(0);
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
          alcanceGasto === "EDIFICIOS" && !distribucionValida
            ? "La distribución por edificios debe sumar exactamente el total de la solicitud."
            : "Complete fecha, proveedor, categoría, concepto, clasificación del gasto y un monto mayor que cero.",
      });
      return;
    }

    let nuevaSolicitudIdParaRollback = 0;
    let rutaSoporteSubido = "";

    try {
      setGuardando(true);

      const numeroSolicitud = await obtenerNumeroSolicitud();
      const soporte = soporteArchivo
        ? await subirSoporte()
        : { publicUrl: "", rutaArchivo: "" };
      const soporteUrl = soporte.publicUrl;
      rutaSoporteSubido = soporte.rutaArchivo;

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
      nuevaSolicitudIdParaRollback = nuevaSolicitudId;

      const distribucionRpc =
        alcanceGasto === "EDIFICIOS"
          ? distribucionEdificios.map((item) => ({
              edificio_id: item.edificio_id,
              monto_asignado: Number(item.monto_asignado || 0),
            }))
          : [];

      const { error: clasificacionError } = await supabase.rpc(
        "guardar_clasificacion_solicitud_edificios",
        {
          p_solicitud_id: nuevaSolicitudId,
          p_alcance: alcanceGasto,
          p_distribucion: distribucionRpc,
        },
      );

      if (clasificacionError) {
        throw new Error(
          `La solicitud no pudo guardar la clasificación del gasto: ${clasificacionError.message}`,
        );
      }

      nuevaSolicitudIdParaRollback = 0;
      rutaSoporteSubido = "";

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

      if (esFondoInicialCajaChica) {
        setFondoInicialCajaChicaEnProceso(true);
      }

      if (esReposicionCajaChica) {
        setReposicionCajaChicaEnProceso(true);
      }

      limpiarFormulario();
    } catch (err: any) {
      if (nuevaSolicitudIdParaRollback > 0) {
        await supabase
          .from("solicitudes_pago")
          .delete()
          .eq("id", nuevaSolicitudIdParaRollback);
      }

      if (rutaSoporteSubido) {
        await supabase.storage
          .from("soportes-solicitudes-pago")
          .remove([rutaSoporteSubido]);
      }

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
                    disabled={cargandoCatalogos || esProveedorCajaChica}
                  >
                    <option value="">
                      {cargandoCatalogos
                        ? "Cargando..."
                        : esProveedorCajaChica
                          ? "Categoría automática"
                          : "Seleccione categoría"}
                    </option>
                    {categoriasVisibles.map((c) => (
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

                  {esProveedorCajaChica &&
                    !cargandoEstadoCajaChica &&
                    !categoriaCajaChicaEsperada && (
                      <p className="mt-1 text-xs font-bold text-red-700">
                        Falta configurar la categoría{" "}
                        {tieneFondoInicialCajaChica
                          ? "Reposición de Caja Chica"
                          : "Fondo Inicial de Caja Chica"}{" "}
                        para este condominio.
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

            {esOperacionCajaChica && (
              <div
                className={`rounded-2xl border p-4 ${
                  esFondoInicialCajaChica
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-blue-200 bg-blue-50"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3
                      className={`font-black ${
                        esFondoInicialCajaChica
                          ? "text-emerald-900"
                          : "text-blue-900"
                      }`}
                    >
                      {esFondoInicialCajaChica
                        ? "Fondo Inicial de Caja Chica"
                        : "Reposición de Caja Chica"}
                    </h3>
                    <p
                      className={`mt-1 text-sm font-medium ${
                        esFondoInicialCajaChica
                          ? "text-emerald-800"
                          : "text-blue-800"
                      }`}
                    >
                      {esFondoInicialCajaChica
                        ? "Este condominio todavía no tiene un fondo inicial registrado. Indique el monto a constituir; después de creado, el sistema solo permitirá reposiciones."
                        : "El sistema usa los gastos pendientes de Caja Chica y protege el monto para evitar duplicidades o diferencias."}
                    </p>

                    {calculandoCajaChica && esReposicionCajaChica && (
                      <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-blue-700">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Calculando monto pendiente...
                      </p>
                    )}

                    {mensajeCajaChica && esReposicionCajaChica && (
                      <p className="mt-2 text-sm font-bold text-blue-700">
                        {mensajeCajaChica}
                      </p>
                    )}

                    {operacionCajaChicaEnProceso && (
                      <p className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-black text-amber-900">
                        Ya existe una solicitud de esta operación en proceso. Debe
                        concluir, rechazarse o anularse antes de crear otra.
                      </p>
                    )}
                  </div>

                  <div className="min-w-[220px] rounded-xl border bg-white p-3 text-center">
                    <p className="text-xs font-black uppercase text-slate-500">
                      {esFondoInicialCajaChica
                        ? "Estado de Caja Chica"
                        : "Pendiente de reposición"}
                    </p>
                    {esFondoInicialCajaChica ? (
                      <>
                        <p className="text-lg font-black text-emerald-800">
                          Por constituir
                        </p>
                        <p className="text-xs text-slate-500">
                          El monto lo define el administrador.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-black text-blue-800">
                          RD$ {dinero(montoPendienteCajaChica)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Cálculo por balance real
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {esReposicionCajaChica && !calculandoCajaChica && (
                  <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                    <div className="rounded-xl border bg-white p-3">
                      <p className="text-[11px] font-black uppercase text-slate-500">
                        Fondo fijo
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-900">
                        RD$ {dinero(fondoFijoCajaChica)}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-white p-3">
                      <p className="text-[11px] font-black uppercase text-slate-500">
                        Gastos históricos
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-900">
                        RD$ {dinero(totalGastosCajaChica)}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-white p-3">
                      <p className="text-[11px] font-black uppercase text-slate-500">
                        Reposiciones
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-900">
                        RD$ {dinero(totalReposicionesCajaChica)}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-white p-3">
                      <p className="text-[11px] font-black uppercase text-slate-500">
                        Disponible real
                      </p>
                      <p className="mt-1 text-sm font-black text-emerald-700">
                        RD$ {dinero(disponibleRealCajaChica)}
                      </p>
                    </div>
                  </div>
                )}
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
                    readOnly={esReposicionCajaChica}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm read-only:bg-slate-100 read-only:font-black"
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
                    readOnly={esOperacionCajaChica}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm read-only:bg-slate-100"
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
              title="Aplicación del gasto"
              subtitle="Indique si el gasto corresponde a todo el condominio o a uno o varios edificios."
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => seleccionarAlcance("COMUN")}
                    className={`rounded-2xl border p-4 text-left transition ${
                      alcanceGasto === "COMUN"
                        ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                          alcanceGasto === "COMUN"
                            ? "border-emerald-600 bg-emerald-600"
                            : "border-slate-300"
                        }`}
                      >
                        {alcanceGasto === "COMUN" && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">
                          Gasto común del condominio
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Energía común, agua general, seguridad u otros gastos
                          que afectan al condominio completo.
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => seleccionarAlcance("EDIFICIOS")}
                    disabled={esOperacionCajaChica}
                    className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      alcanceGasto === "EDIFICIOS"
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                          alcanceGasto === "EDIFICIOS"
                            ? "border-blue-700 bg-blue-700"
                            : "border-slate-300"
                        }`}
                      >
                        {alcanceGasto === "EDIFICIOS" && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">
                          Uno o varios edificios
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Limpieza de trampa de grasa, intercom, pintura, bombas
                          u otros trabajos atribuibles a edificios específicos.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                {alcanceGasto === "COMUN" && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
                    {esOperacionCajaChica
                      ? "Caja Chica se clasifica automáticamente como operación común del condominio; no requiere distribución por edificios."
                      : "Este gasto quedará identificado como común del condominio y no se distribuirá entre edificios."}
                  </div>
                )}

                {alcanceGasto === "EDIFICIOS" && (
                  <div className="space-y-4">
                    {edificios.length === 0 ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                        No hay edificios activos configurados para este
                        condominio.
                      </div>
                    ) : (
                      <>
                        <div className="rounded-2xl border bg-slate-50 p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-black text-slate-900">
                                  Edificios afectados
                                </p>
                                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-700">
                                  {distribucionEdificios.length} de {edificios.length} seleccionados
                                </span>
                              </div>
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                Busque y seleccione solo los edificios relacionados con este gasto.
                                La lista mantiene un tamaño fijo aunque el condominio tenga decenas de edificios.
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={seleccionarEdificiosVisibles}
                                disabled={edificiosFiltrados.length === 0}
                                className="rounded-xl border bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Seleccionar visibles
                              </button>
                              <button
                                type="button"
                                onClick={limpiarEdificiosSeleccionados}
                                disabled={distribucionEdificios.length === 0}
                                className="rounded-xl border bg-white px-3 py-2 text-xs font-black text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Limpiar selección
                              </button>
                            </div>
                          </div>

                          <div className="relative mt-4">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              type="search"
                              value={busquedaEdificio}
                              onChange={(e) => setBusquedaEdificio(e.target.value)}
                              placeholder="Buscar por nombre o código de edificio..."
                              className="w-full rounded-xl border bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                          </div>

                          <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border bg-white">
                            {edificiosFiltrados.length === 0 ? (
                              <div className="p-4 text-center text-sm font-semibold text-slate-500">
                                No se encontraron edificios con ese criterio.
                              </div>
                            ) : (
                              edificiosFiltrados.map((edificio) => {
                                const seleccionado = distribucionEdificios.some(
                                  (item) => item.edificio_id === edificio.id,
                                );

                                return (
                                  <label
                                    key={edificio.id}
                                    className={`flex cursor-pointer items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-slate-50 ${
                                      seleccionado ? "bg-blue-50/70" : "bg-white"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={seleccionado}
                                      onChange={() => alternarEdificio(edificio.id)}
                                      className="h-4 w-4 rounded border-slate-300"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-black text-slate-900">
                                        {edificio.nombre}
                                      </p>
                                      <p className="text-xs font-semibold text-slate-500">
                                        Código {edificio.codigo}
                                      </p>
                                    </div>
                                    {seleccionado && (
                                      <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-black text-blue-700">
                                        Seleccionado
                                      </span>
                                    )}
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {edificiosSeleccionados.length > 0 && (
                          <div className="rounded-2xl border bg-white p-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="font-black text-slate-900">
                                  Distribución del gasto
                                </p>
                                <p className="text-xs font-semibold text-slate-500">
                                  Solo se muestran los edificios seleccionados. Puede ajustar los montos manualmente.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setDistribucionEdificios(
                                    distribuirIgual(
                                      distribucionEdificios.map(
                                        (item) => item.edificio_id,
                                      ),
                                      totalCalculado,
                                    ),
                                  )
                                }
                                className="rounded-xl border bg-white px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50"
                              >
                                Distribuir en partes iguales
                              </button>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {edificiosSeleccionados.map((item) => (
                                <button
                                  key={`chip-${item.edificio_id}`}
                                  type="button"
                                  onClick={() => alternarEdificio(item.edificio_id)}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-800 hover:bg-blue-100"
                                  title="Quitar edificio"
                                >
                                  {item.edificio?.codigo}
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              ))}
                            </div>

                            <div className="mt-4 overflow-hidden rounded-xl border">
                              <div className="hidden grid-cols-[1fr_220px_44px] gap-3 bg-slate-50 px-4 py-2 text-xs font-black uppercase text-slate-500 md:grid">
                                <span>Edificio</span>
                                <span>Monto asignado RD$</span>
                                <span />
                              </div>

                              <div className="divide-y">
                                {edificiosSeleccionados.map((item) => (
                                  <div
                                    key={`dist-${item.edificio_id}`}
                                    className="grid grid-cols-1 gap-3 p-3 md:grid-cols-[1fr_220px_44px] md:items-center"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-black text-slate-900">
                                        {item.edificio?.nombre}
                                      </p>
                                      <p className="text-xs font-semibold text-slate-500">
                                        Código {item.edificio?.codigo}
                                      </p>
                                    </div>

                                    <div>
                                      <label className="mb-1 block text-xs font-black uppercase text-slate-500 md:hidden">
                                        Monto asignado RD$
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.monto_asignado}
                                        onChange={(e) =>
                                          cambiarMontoEdificio(
                                            item.edificio_id,
                                            e.target.value,
                                          )
                                        }
                                        className="w-full rounded-xl border bg-white px-3 py-2 text-sm font-bold"
                                      />
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => alternarEdificio(item.edificio_id)}
                                      className="inline-flex h-10 w-full items-center justify-center rounded-xl border text-red-700 hover:bg-red-50 md:w-10"
                                      title="Quitar edificio"
                                    >
                                      <X className="h-4 w-4" />
                                      <span className="ml-2 text-xs font-black md:hidden">
                                        Quitar
                                      </span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          <div className="rounded-2xl border bg-white p-4">
                            <p className="text-xs font-black uppercase text-slate-500">
                              Total solicitud
                            </p>
                            <p className="mt-1 text-lg font-black text-slate-900">
                              RD$ {dinero(totalCalculado)}
                            </p>
                          </div>
                          <div className="rounded-2xl border bg-white p-4">
                            <p className="text-xs font-black uppercase text-slate-500">
                              Total distribuido
                            </p>
                            <p className="mt-1 text-lg font-black text-blue-700">
                              RD$ {dinero(totalDistribuido)}
                            </p>
                          </div>
                          <div
                            className={`rounded-2xl border p-4 ${
                              Math.abs(pendienteDistribuir) < 0.01
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-amber-200 bg-amber-50"
                            }`}
                          >
                            <p className="text-xs font-black uppercase text-slate-500">
                              Pendiente distribuir
                            </p>
                            <p
                              className={`mt-1 text-lg font-black ${
                                Math.abs(pendienteDistribuir) < 0.01
                                  ? "text-emerald-700"
                                  : "text-amber-700"
                              }`}
                            >
                              RD$ {dinero(pendienteDistribuir)}
                            </p>
                          </div>
                        </div>

                        {distribucionEdificios.length > 0 &&
                          Math.abs(pendienteDistribuir) >= 0.01 && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
                              La suma asignada a los edificios debe coincidir
                              exactamente con RD$ {dinero(totalCalculado)} antes
                              de guardar.
                            </div>
                          )}
                      </>
                    )}
                  </div>
                )}
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
                <ResumenLinea label="Aplicación" value={nombreAlcance()} />
                {alcanceGasto === "EDIFICIOS" && (
                  <ResumenLinea
                    label="Edificios"
                    value={edificiosSeleccionadosTexto() || "Pendiente"}
                  />
                )}
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
