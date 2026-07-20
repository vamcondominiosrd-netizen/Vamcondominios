"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Home,
  Loader2,
  Search,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";

type SesionDirectiva = {
  usuario_id?: string;
  usuario_nombre?: string;
  rol?: string;
  condominio_id: number;
  condominio_nombre: string;
  condominio_logo_url?: string | null;
};

type Unidad = {
  id: number;
  codigo: string;
  tipo?: string | null;
  cuota_mensual_actual?: number | string | null;
  activa?: boolean | null;
};

type PropietarioApartamento = {
  id: number;
  condominio_id: number;
  no_apartamento: string | null;
  nombre_propietario: string | null;
  cedula?: string | null;
  telefono?: string | null;
  correo?: string | null;
  estado?: string | null;
};

type CargoPeriodico = {
  id: number;
  condominio_id: number;
  unidad_id: number;
  anio?: number | null;
  mes?: number | null;
  periodo?: string | null;
  concepto?: string | null;
  tipo_cargo?: string | null;
  monto?: number | string | null;
  monto_pagado?: number | string | null;
  balance?: number | string | null;
  estado?: string | null;
};

type Pago = {
  id: number;
  condominio_id: number;
  unidad_id: number;
  fecha_pago: string | null;
  monto: number | string | null;
  metodo_pago?: string | null;
  referencia?: string | null;
  origen?: string | null;
};

type DetalleMes = {
  periodo: string;
  monto: number;
  pagado: number;
  balance: number;
  estado: string;
};

type Moroso = {
  unidadId: number;
  unidad: string;
  propietario: string;
  telefono: string;
  correo: string;
  cuotaMensual: number;
  deudaTotal: number;
  mesesPendientes: number;
  desdePeriodo: string;
  ultimoPagoFecha: string;
  ultimoPagoMonto: number;
  antiguedadMeses: number;
  detalle: DetalleMes[];
};

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
});

function numero(valor: unknown) {
  const n = Number(String(valor ?? 0).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function dinero(valor: unknown) {
  return moneda.format(numero(valor));
}

function normalizar(valor: unknown) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function esCargoMantenimiento(cargo: CargoPeriodico) {
  const tipo = normalizar(cargo.tipo_cargo);
  const concepto = normalizar(cargo.concepto);

  return (
    tipo === "MANTENIMIENTO" ||
    tipo === "ORDINARIO" ||
    concepto === "MANTENIMIENTO"
  );
}

function periodoCargo(cargo: CargoPeriodico) {
  if (cargo.periodo && /^\d{4}-\d{2}$/.test(cargo.periodo)) {
    return cargo.periodo;
  }

  if (cargo.anio && cargo.mes) {
    return `${cargo.anio}-${String(cargo.mes).padStart(2, "0")}`;
  }

  return "";
}

function nombrePeriodo(periodo: string) {
  if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) return "Sin fecha";

  const [anio, mes] = periodo.split("-").map(Number);

  return new Date(anio, mes - 1, 1).toLocaleDateString("es-DO", {
    month: "long",
    year: "numeric",
  });
}

function fechaCorta(fecha: string) {
  if (!fecha) return "Sin pagos";

  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function mesesDesde(periodo: string) {
  if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) return 0;

  const [anio, mes] = periodo.split("-").map(Number);
  const hoy = new Date();

  return Math.max(
    0,
    (hoy.getFullYear() - anio) * 12 + (hoy.getMonth() + 1 - mes)
  );
}

function leerSesionDirectiva(): SesionDirectiva | null {
  const raw = localStorage.getItem("directiva_actual");

  if (raw) {
    try {
      const sesion = JSON.parse(raw);
      const condominioId = Number(sesion?.condominio_id || 0);

      if (condominioId > 0) {
        return {
          ...sesion,
          condominio_id: condominioId,
          condominio_nombre:
            sesion?.condominio_nombre ||
            localStorage.getItem("condominio_nombre") ||
            "Condominio",
        };
      }
    } catch {
      // Continúa con las claves de compatibilidad.
    }
  }

  const condominioId = Number(localStorage.getItem("condominio_id") || 0);

  if (condominioId <= 0) return null;

  return {
    usuario_nombre:
      localStorage.getItem("usuario_nombre") || "Miembro de la directiva",
    rol: localStorage.getItem("usuario_rol") || "USER_VIEW",
    condominio_id: condominioId,
    condominio_nombre:
      localStorage.getItem("condominio_nombre") || "Condominio",
    condominio_logo_url: localStorage.getItem("condominio_logo_url"),
  };
}

export default function MorosidadDirectivaPage() {
  const router = useRouter();

  const [sesion, setSesion] = useState<SesionDirectiva | null>(null);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [propietarios, setPropietarios] = useState<PropietarioApartamento[]>([]);
  const [cargos, setCargos] = useState<CargoPeriodico[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);

  const [buscar, setBuscar] = useState("");
  const [orden, setOrden] = useState<"MAYOR_DEUDA" | "MAS_ANTIGUA" | "UNIDAD">("MAYOR_DEUDA");
  const [filtro, setFiltro] = useState<"TODOS" | "1_MES" | "2_3_MESES" | "4_6_MESES" | "MAS_6_MESES">("TODOS");

  const [seleccionado, setSeleccionado] = useState<Moroso | null>(null);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const sesionActual = leerSesionDirectiva();

    if (!sesionActual) {
      router.replace("/movil");
      return;
    }

    setSesion(sesionActual);
    void cargarDatos(sesionActual.condominio_id);
  }, [router]);

  async function cargarDatos(condominioId: number) {
    setLoading(true);
    setMensaje("");

    try {
      const [unidadesResp, propietariosResp, cargosResp, pagosResp] = await Promise.all([
        supabase
          .from("unidades")
          .select("id, codigo, tipo, cuota_mensual_actual, activa")
          .eq("condominio_id", condominioId)
          .eq("activa", true)
          .order("codigo", { ascending: true }),

        supabase
          .from("propietarios_apartamentos")
          .select("id, condominio_id, no_apartamento, nombre_propietario, cedula, telefono, correo, estado")
          .eq("condominio_id", condominioId)
          .order("no_apartamento", { ascending: true }),

        supabase
          .from("cargos_periodicos")
          .select("id, condominio_id, unidad_id, anio, mes, periodo, concepto, tipo_cargo, monto, monto_pagado, balance, estado")
          .eq("condominio_id", condominioId)
          .order("periodo", { ascending: true })
          .order("unidad_id", { ascending: true }),

        supabase
          .from("pagos")
          .select("id, condominio_id, unidad_id, fecha_pago, monto, metodo_pago, referencia, origen")
          .eq("condominio_id", condominioId)
          .order("fecha_pago", { ascending: false }),
      ]);

      if (unidadesResp.error) throw unidadesResp.error;
      if (propietariosResp.error) throw propietariosResp.error;
      if (cargosResp.error) throw cargosResp.error;
      if (pagosResp.error) throw pagosResp.error;

      setUnidades((unidadesResp.data || []) as Unidad[]);
      setPropietarios((propietariosResp.data || []) as PropietarioApartamento[]);
      setCargos(((cargosResp.data || []) as CargoPeriodico[]).filter(esCargoMantenimiento));
      setPagos((pagosResp.data || []) as Pago[]);
    } catch (error: any) {
      console.error("Error cargando morosidad:", error);
      setMensaje(error?.message || "No se pudo cargar la información de morosidad.");
    } finally {
      setLoading(false);
    }
  }

  const morosos = useMemo<Moroso[]>(() => {
    const propietariosPorUnidad = new Map<string, PropietarioApartamento>();

    propietarios.forEach((propietario) => {
      const clave = String(propietario.no_apartamento || "").trim().toUpperCase();

      if (clave && !propietariosPorUnidad.has(clave)) {
        propietariosPorUnidad.set(clave, propietario);
      }
    });

    const cargosPorUnidad = new Map<number, CargoPeriodico[]>();
    cargos.forEach((cargo) => {
      const lista = cargosPorUnidad.get(cargo.unidad_id) || [];
      lista.push(cargo);
      cargosPorUnidad.set(cargo.unidad_id, lista);
    });

    const pagosPorUnidad = new Map<number, Pago[]>();
    pagos.forEach((pago) => {
      const lista = pagosPorUnidad.get(pago.unidad_id) || [];
      lista.push(pago);
      pagosPorUnidad.set(pago.unidad_id, lista);
    });

    return unidades
      .map((unidad) => {
        const cargosUnidad = (cargosPorUnidad.get(unidad.id) || [])
          .filter((cargo) => numero(cargo.balance) > 0)
          .sort((a, b) => periodoCargo(a).localeCompare(periodoCargo(b)));

        if (cargosUnidad.length === 0) return null;

        const propietario = propietariosPorUnidad.get(unidad.codigo.trim().toUpperCase()) || null;
        const pagosUnidad = (pagosPorUnidad.get(unidad.id) || []).sort((a, b) =>
          String(b.fecha_pago || "").localeCompare(String(a.fecha_pago || ""))
        );

        const ultimoPago = pagosUnidad[0] || null;
        const deudaTotal = cargosUnidad.reduce((total, cargo) => total + numero(cargo.balance), 0);
        const desdePeriodo = periodoCargo(cargosUnidad[0]);

        return {
          unidadId: unidad.id,
          unidad: unidad.codigo,
          propietario: propietario?.nombre_propietario || "Propietario no identificado",
          telefono: propietario?.telefono || "",
          correo: propietario?.correo || "",
          cuotaMensual: numero(unidad.cuota_mensual_actual),
          deudaTotal,
          mesesPendientes: cargosUnidad.length,
          desdePeriodo,
          ultimoPagoFecha: ultimoPago?.fecha_pago || "",
          ultimoPagoMonto: numero(ultimoPago?.monto),
          antiguedadMeses: mesesDesde(desdePeriodo),
          detalle: cargosUnidad.map((cargo) => ({
            periodo: periodoCargo(cargo),
            monto: numero(cargo.monto),
            pagado: numero(cargo.monto_pagado),
            balance: numero(cargo.balance),
            estado: String(cargo.estado || "PENDIENTE"),
          })),
        } satisfies Moroso;
      })
      .filter((item): item is Moroso => item !== null);
  }, [unidades, propietarios, cargos, pagos]);

  const listaVisible = useMemo(() => {
    const termino = buscar.trim().toLowerCase();

    const filtrada = morosos.filter((moroso) => {
      const coincideBusqueda =
        !termino ||
        moroso.unidad.toLowerCase().includes(termino) ||
        moroso.propietario.toLowerCase().includes(termino) ||
        moroso.telefono.toLowerCase().includes(termino);

      if (!coincideBusqueda) return false;
      if (filtro === "1_MES") return moroso.mesesPendientes === 1;
      if (filtro === "2_3_MESES") return moroso.mesesPendientes >= 2 && moroso.mesesPendientes <= 3;
      if (filtro === "4_6_MESES") return moroso.mesesPendientes >= 4 && moroso.mesesPendientes <= 6;
      if (filtro === "MAS_6_MESES") return moroso.mesesPendientes > 6;
      return true;
    });

    return [...filtrada].sort((a, b) => {
      if (orden === "MAS_ANTIGUA") return a.desdePeriodo.localeCompare(b.desdePeriodo);
      if (orden === "UNIDAD") return a.unidad.localeCompare(b.unidad, "es", { numeric: true, sensitivity: "base" });
      return b.deudaTotal - a.deudaTotal;
    });
  }, [morosos, buscar, filtro, orden]);

  const resumen = useMemo(() => {
    const totalDeuda = morosos.reduce((total, moroso) => total + moroso.deudaTotal, 0);
    const deudaAntigua = morosos.map((moroso) => moroso.desdePeriodo).filter(Boolean).sort()[0];
    const criticos = morosos.filter((moroso) => moroso.mesesPendientes > 6).length;

    return {
      totalDeuda,
      unidadesMorosas: morosos.length,
      deudaAntigua: deudaAntigua || "",
      criticos,
    };
  }, [morosos]);

  if (loading) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[75vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-sm">
            <Loader2 className="animate-spin text-blue-800" size={21} />
            Cargando morosidad...
          </div>
        </div>
      </main>
    );
  }

  if (!sesion) return null;

  return (
    <main className="min-h-dvh bg-slate-100 pb-24">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-16 pt-4 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.push("/movil/directiva")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10" aria-label="Volver al dashboard">
              <ArrowLeft size={20} />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-blue-100">{sesion.condominio_nombre}</p>
              <h1 className="text-xl font-black">Morosidad</h1>
              <p className="mt-0.5 text-[11px] text-blue-100">Quién debe, cuánto debe y desde cuándo</p>
            </div>

            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <Users size={22} />
            </span>
          </div>
        </div>
      </header>

      <div className="-mt-10 mx-auto max-w-lg space-y-4 px-4">
        {mensaje && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{mensaje}</div>}

        <section className="rounded-[1.6rem] border border-white/60 bg-white p-5 shadow-xl shadow-slate-900/10">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Total pendiente por cobrar</p>
          <h2 className="mt-1 text-3xl font-black text-red-600">{dinero(resumen.totalDeuda)}</h2>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Dato titulo="Morosos" valor={`${resumen.unidadesMorosas}`} />
            <Dato titulo="Críticos" valor={`${resumen.criticos}`} />
            <Dato titulo="Desde" valor={resumen.deudaAntigua ? nombrePeriodo(resumen.deudaAntigua) : "-"} />
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={buscar} onChange={(event) => setBuscar(event.target.value)} placeholder="Buscar unidad, propietario o teléfono" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            {buscar && (
              <button type="button" onClick={() => setBuscar("")} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400" aria-label="Limpiar búsqueda">
                <X size={17} />
              </button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="relative">
              <select value={orden} onChange={(event) => setOrden(event.target.value as "MAYOR_DEUDA" | "MAS_ANTIGUA" | "UNIDAD")} className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-8 text-xs font-bold text-slate-700 outline-none">
                <option value="MAYOR_DEUDA">Mayor deuda</option>
                <option value="MAS_ANTIGUA">Deuda más antigua</option>
                <option value="UNIDAD">Orden por unidad</option>
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <select value={filtro} onChange={(event) => setFiltro(event.target.value as "TODOS" | "1_MES" | "2_3_MESES" | "4_6_MESES" | "MAS_6_MESES")} className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-8 text-xs font-bold text-slate-700 outline-none">
                <option value="TODOS">Todos</option>
                <option value="1_MES">1 mes</option>
                <option value="2_3_MESES">2 a 3 meses</option>
                <option value="4_6_MESES">4 a 6 meses</option>
                <option value="MAS_6_MESES">Más de 6 meses</option>
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black text-slate-800">Propietarios con deuda</h2>
            <span className="text-xs font-bold text-slate-400">{listaVisible.length} resultado{listaVisible.length === 1 ? "" : "s"}</span>
          </div>

          {listaVisible.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <CircleAlert size={30} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-bold text-slate-600">No hay resultados con los filtros seleccionados.</p>
            </div>
          ) : (
            listaVisible.map((moroso) => (
              <button type="button" key={moroso.unidadId} onClick={() => setSeleccionado(moroso)} className="w-full rounded-[1.4rem] border border-slate-200 bg-white p-4 text-left shadow-sm active:scale-[0.99]">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 font-black text-red-700">{moroso.unidad}</span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-900">{moroso.propietario}</p>
                    <p className="mt-0.5 text-xs text-slate-500">No paga desde {nombrePeriodo(moroso.desdePeriodo)}</p>
                    <p className="mt-1 text-[11px] text-slate-400">Último pago: {moroso.ultimoPagoFecha ? `${fechaCorta(moroso.ultimoPagoFecha)} · ${dinero(moroso.ultimoPagoMonto)}` : "Sin pagos registrados"}</p>
                  </div>

                  <ChevronRight size={19} className="mt-1 shrink-0 text-slate-300" />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Dato titulo="Deuda" valor={dinero(moroso.deudaTotal)} />
                  <Dato titulo="Meses" valor={`${moroso.mesesPendientes}`} />
                  <Dato titulo="Antigüedad" valor={`${moroso.antiguedadMeses} mes${moroso.antiguedadMeses === 1 ? "" : "es"}`} />
                </div>
              </button>
            ))
          )}
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          <Nav icono={<Home size={19} />} texto="Inicio" onClick={() => router.push("/movil/directiva")} />
          <Nav activo icono={<Users size={19} />} texto="Morosidad" onClick={() => undefined} />
          <Nav icono={<Banknote size={19} />} texto="Finanzas" onClick={() => router.push("/movil/directiva/finanzas")} />
          <Nav icono={<WalletCards size={19} />} texto="Caja chica" onClick={() => router.push("/movil/directiva/caja-chica")} />
        </div>
      </nav>

      {seleccionado && (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/55 p-0 sm:items-center sm:justify-center sm:p-4">
          <section className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-[2rem]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Detalle de morosidad</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">{seleccionado.unidad} · {seleccionado.propietario}</h2>
              </div>

              <button type="button" onClick={() => setSeleccionado(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600" aria-label="Cerrar detalle">
                <X size={19} />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-red-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-red-500">Total adeudado</p>
              <p className="mt-1 text-2xl font-black text-red-700">{dinero(seleccionado.deudaTotal)}</p>
              <p className="mt-1 text-xs text-red-600">{seleccionado.mesesPendientes} mes{seleccionado.mesesPendientes === 1 ? "" : "es"} pendiente{seleccionado.mesesPendientes === 1 ? "" : "s"} desde {nombrePeriodo(seleccionado.desdePeriodo)}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Info icono={<UserRound size={18} />} titulo="Propietario" valor={seleccionado.propietario} />
              <Info icono={<Building2 size={18} />} titulo="Unidad" valor={seleccionado.unidad} />
              <Info icono={<CalendarClock size={18} />} titulo="Último pago" valor={seleccionado.ultimoPagoFecha ? fechaCorta(seleccionado.ultimoPagoFecha) : "Sin pagos"} />
              <Info icono={<Banknote size={18} />} titulo="Monto último pago" valor={seleccionado.ultimoPagoFecha ? dinero(seleccionado.ultimoPagoMonto) : "-"} />
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-black text-slate-900">Meses pendientes</h3>

              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                {seleccionado.detalle.map((detalle, indice) => (
                  <div key={`${detalle.periodo}-${indice}`} className={`grid grid-cols-[1fr_auto] gap-3 px-4 py-3 ${indice > 0 ? "border-t border-slate-100" : ""}`}>
                    <div>
                      <p className="text-sm font-black text-slate-800">{nombrePeriodo(detalle.periodo)}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">Cargo {dinero(detalle.monto)} · Pagado {dinero(detalle.pagado)}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Pendiente</p>
                      <p className="mt-0.5 text-sm font-black text-red-600">{dinero(detalle.balance)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(seleccionado.telefono || seleccionado.correo) && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
                {seleccionado.telefono && <p><span className="font-bold">Teléfono:</span> {seleccionado.telefono}</p>}
                {seleccionado.correo && <p className={seleccionado.telefono ? "mt-1" : ""}><span className="font-bold">Correo:</span> {seleccionado.correo}</p>}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2.5 text-center">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className="mt-1 break-words text-[11px] font-black leading-tight text-slate-800">{valor}</p>
    </div>
  );
}

function Info({ icono, titulo, valor }: { icono: React.ReactNode; titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-blue-800 shadow-sm">{icono}</span>
      <p className="mt-2 text-[9px] font-bold uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className="mt-1 text-xs font-black text-slate-800">{valor}</p>
    </div>
  );
}

function Nav({ activo = false, icono, texto, onClick }: { activo?: boolean; icono: React.ReactNode; texto: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-bold ${activo ? "text-blue-800" : "text-slate-500"}`}>
      {icono}
      {texto}
    </button>
  );
}
