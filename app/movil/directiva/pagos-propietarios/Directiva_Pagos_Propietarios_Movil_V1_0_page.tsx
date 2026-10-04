"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Loader2,
  RefreshCw,
  Search,
  TriangleAlert,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";

type SesionDirectiva = {
  usuario_nombre?: string;
  rol?: string;
  condominio_id: number;
  condominio_nombre: string;
  condominio_logo_url?: string | null;
};

type RespuestaAcceso = {
  ok?: boolean;
  mensaje?: string;
  rol?: string;
  condominio_id?: number;
};

type Unidad = {
  id: number;
  codigo: string;
  tipo: string | null;
  cuota_mensual_actual: number | string | null;
  activa: boolean | null;
};

type PropietarioApartamento = {
  id: number;
  condominio_id: number;
  no_apartamento: string | null;
  nombre_propietario: string | null;
  telefono: string | null;
  estado: string | null;
};

type CargoPeriodico = {
  id: number;
  condominio_id: number;
  unidad_id: number;
  anio: number | null;
  mes: number | null;
  periodo: string | null;
  concepto: string | null;
  tipo_cargo: string | null;
  monto: number | string | null;
  monto_pagado: number | string | null;
  balance: number | string | null;
  estado: string | null;
};

type MesEstado = {
  mes: number;
  nombre: string;
  estado: "PAGADO" | "PARCIAL" | "PENDIENTE" | "SIN_CARGO";
  monto: number;
  pagado: number;
  balance: number;
};

type FilaEstado = {
  unidad_id: number;
  apartamento: string;
  propietario: string;
  telefono: string;
  cuota: number;
  meses: MesEstado[];
  totalFacturado: number;
  totalPagado: number;
  totalPendiente: number;
  mesesPagados: number;
  mesesParciales: number;
  mesesPendientes: number;
};

type ResumenMes = {
  mes: number;
  nombre: string;
  cantidad: number;
  facturado: number;
  pagado: number;
  pendiente: number;
};

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const VERSION = "1.0";

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

function obtenerAnioCargo(cargo: CargoPeriodico) {
  if (cargo.anio) return Number(cargo.anio);

  if (cargo.periodo && /^\d{4}-\d{2}$/.test(cargo.periodo)) {
    return Number(cargo.periodo.split("-")[0]);
  }

  return 0;
}

function obtenerMesCargo(cargo: CargoPeriodico) {
  if (cargo.mes) return Number(cargo.mes);

  if (cargo.periodo && /^\d{4}-\d{2}$/.test(cargo.periodo)) {
    return Number(cargo.periodo.split("-")[1]);
  }

  return 0;
}

function esCargoMantenimiento(cargo: CargoPeriodico) {
  const tipo = normalizar(cargo.tipo_cargo);
  return tipo === "MANTENIMIENTO" || tipo === "ORDINARIO";
}

function leerSesionDirectiva(): SesionDirectiva | null {
  const raw = localStorage.getItem("directiva_actual");

  if (raw) {
    try {
      const dato = JSON.parse(raw);
      const condominioId = Number(
        dato?.condominio_id || localStorage.getItem("condominio_id") || 0,
      );

      if (condominioId > 0) {
        return {
          usuario_nombre:
            dato?.usuario_nombre ||
            dato?.nombre_completo ||
            dato?.nombre ||
            localStorage.getItem("usuario_nombre") ||
            "Miembro de la directiva",
          rol:
            dato?.rol_nombre ||
            dato?.rol ||
            localStorage.getItem("usuario_rol") ||
            "Directiva",
          condominio_id: condominioId,
          condominio_nombre:
            dato?.condominio_nombre ||
            localStorage.getItem("condominio_nombre") ||
            `Condominio ${condominioId}`,
          condominio_logo_url:
            dato?.condominio_logo_url ||
            localStorage.getItem("condominio_logo_url"),
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
    rol: localStorage.getItem("usuario_rol") || "Directiva",
    condominio_id: condominioId,
    condominio_nombre:
      localStorage.getItem("condominio_nombre") || `Condominio ${condominioId}`,
    condominio_logo_url: localStorage.getItem("condominio_logo_url"),
  };
}

function claseEstado(estado: MesEstado["estado"]) {
  if (estado === "PAGADO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (estado === "PARCIAL") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (estado === "PENDIENTE") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-400";
}

function textoEstado(estado: MesEstado["estado"]) {
  if (estado === "PAGADO") return "Pagado";
  if (estado === "PARCIAL") return "Parcial";
  if (estado === "PENDIENTE") return "Pendiente";
  return "Sin cargo";
}

export default function PagosPropietariosDirectivaPage() {
  const router = useRouter();

  const [sesion, setSesion] = useState<SesionDirectiva | null>(null);
  const [anio, setAnio] = useState(new Date().getFullYear());

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [propietarios, setPropietarios] = useState<PropietarioApartamento[]>([]);
  const [cargos, setCargos] = useState<CargoPeriodico[]>([]);

  const [buscar, setBuscar] = useState("");
  const [apartamentoSeleccionado, setApartamentoSeleccionado] = useState("");
  const [filtro, setFiltro] = useState<"TODOS" | "CON_DEUDA" | "AL_DIA" | "PARCIAL">(
    "TODOS",
  );
  const [unidadExpandida, setUnidadExpandida] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const actual = leerSesionDirectiva();

    if (!actual) {
      router.replace("/");
      return;
    }

    setSesion(actual);
    void cargarDatos(actual, anio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function validarAccesoDirectiva(s: SesionDirectiva) {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      throw new Error("La sesión de Directiva no está disponible.");
    }

    const { data, error } = await supabase.rpc("validar_acceso_directiva", {
      p_condominio_id: Number(s.condominio_id),
    });

    if (error) throw error;

    const respuesta = (data || {}) as RespuestaAcceso;

    if (!respuesta.ok) {
      throw new Error(
        respuesta.mensaje || "No fue posible validar el acceso de Directiva.",
      );
    }
  }

  async function cargarDatos(
    s: SesionDirectiva,
    anioConsulta: number,
    refresco = false,
  ) {
    refresco ? setActualizando(true) : setLoading(true);
    setMensaje("");

    try {
      await validarAccesoDirectiva(s);

      const [unidadesResp, propietariosResp, cargosResp] = await Promise.all([
        supabase
          .from("unidades")
          .select("id, codigo, tipo, cuota_mensual_actual, activa")
          .eq("condominio_id", Number(s.condominio_id))
          .eq("activa", true)
          .order("codigo", { ascending: true }),

        supabase
          .from("propietarios_apartamentos")
          .select(
            "id, condominio_id, no_apartamento, nombre_propietario, telefono, estado",
          )
          .eq("condominio_id", Number(s.condominio_id))
          .order("no_apartamento", { ascending: true }),

        supabase
          .from("cargos_periodicos")
          .select(
            "id, condominio_id, unidad_id, anio, mes, periodo, concepto, tipo_cargo, monto, monto_pagado, balance, estado",
          )
          .eq("condominio_id", Number(s.condominio_id))
          .order("periodo", { ascending: true })
          .order("unidad_id", { ascending: true }),
      ]);

      if (unidadesResp.error) throw unidadesResp.error;
      if (propietariosResp.error) throw propietariosResp.error;
      if (cargosResp.error) throw cargosResp.error;

      setUnidades((unidadesResp.data || []) as Unidad[]);
      setPropietarios(
        (propietariosResp.data || []) as PropietarioApartamento[],
      );

      const cargosAnio = ((cargosResp.data || []) as CargoPeriodico[]).filter(
        (cargo) =>
          esCargoMantenimiento(cargo) &&
          obtenerAnioCargo(cargo) === Number(anioConsulta),
      );

      setCargos(cargosAnio);
    } catch (error: any) {
      console.error("Error cargando relación de pagos:", error);
      setMensaje(
        error?.message || "No fue posible cargar la relación de pagos.",
      );
      setUnidades([]);
      setPropietarios([]);
      setCargos([]);
    } finally {
      setLoading(false);
      setActualizando(false);
    }
  }

  function cambiarAnio(valor: string) {
    const nuevo = Number(valor);

    setAnio(nuevo);
    setApartamentoSeleccionado("");
    setUnidadExpandida(null);

    if (sesion) {
      void cargarDatos(sesion, nuevo);
    }
  }

  function buscarPropietario(unidad: Unidad) {
    const codigo = normalizar(unidad.codigo);

    return (
      propietarios.find(
        (propietario) =>
          normalizar(propietario.no_apartamento) === codigo,
      ) || null
    );
  }

  function crearFila(unidad: Unidad): FilaEstado {
    const propietario = buscarPropietario(unidad);

    const mesesEstado: MesEstado[] = MESES.map((nombre, index) => {
      const numeroMes = index + 1;

      const cargosMes = cargos.filter(
        (cargo) =>
          Number(cargo.unidad_id) === Number(unidad.id) &&
          obtenerMesCargo(cargo) === numeroMes,
      );

      if (cargosMes.length === 0) {
        return {
          mes: numeroMes,
          nombre,
          estado: "SIN_CARGO",
          monto: 0,
          pagado: 0,
          balance: 0,
        };
      }

      const monto = cargosMes.reduce(
        (total, cargo) => total + numero(cargo.monto),
        0,
      );
      const pagado = cargosMes.reduce(
        (total, cargo) => total + numero(cargo.monto_pagado),
        0,
      );
      const balance = cargosMes.reduce(
        (total, cargo) => total + numero(cargo.balance),
        0,
      );

      let estado: MesEstado["estado"] = "PENDIENTE";

      if (balance <= 0 && monto > 0) {
        estado = "PAGADO";
      } else if (pagado > 0 && balance > 0) {
        estado = "PARCIAL";
      }

      return {
        mes: numeroMes,
        nombre,
        estado,
        monto,
        pagado,
        balance,
      };
    });

    return {
      unidad_id: unidad.id,
      apartamento: unidad.codigo,
      propietario: propietario?.nombre_propietario || "Sin propietario",
      telefono: propietario?.telefono || "-",
      cuota: numero(unidad.cuota_mensual_actual),
      meses: mesesEstado,
      totalFacturado: mesesEstado.reduce(
        (total, mes) => total + mes.monto,
        0,
      ),
      totalPagado: mesesEstado.reduce(
        (total, mes) => total + mes.pagado,
        0,
      ),
      totalPendiente: mesesEstado.reduce(
        (total, mes) => total + mes.balance,
        0,
      ),
      mesesPagados: mesesEstado.filter(
        (mes) => mes.estado === "PAGADO",
      ).length,
      mesesParciales: mesesEstado.filter(
        (mes) => mes.estado === "PARCIAL",
      ).length,
      mesesPendientes: mesesEstado.filter(
        (mes) => mes.estado === "PENDIENTE",
      ).length,
    };
  }

  const filas = useMemo(
    () => unidades.map((unidad) => crearFila(unidad)),
    [unidades, propietarios, cargos],
  );

  const filasVisibles = useMemo(() => {
    const texto = normalizar(buscar);

    return filas.filter((fila) => {
      if (
        apartamentoSeleccionado &&
        normalizar(fila.apartamento) !==
          normalizar(apartamentoSeleccionado)
      ) {
        return false;
      }

      if (filtro === "CON_DEUDA" && fila.totalPendiente <= 0) return false;
      if (filtro === "AL_DIA" && fila.totalPendiente > 0) return false;
      if (filtro === "PARCIAL" && fila.mesesParciales <= 0) return false;

      if (!texto) return true;

      return normalizar(
        `${fila.apartamento} ${fila.propietario} ${fila.telefono}`,
      ).includes(texto);
    });
  }, [filas, apartamentoSeleccionado, filtro, buscar]);

  const resumenMeses = useMemo<ResumenMes[]>(
    () =>
      MESES.map((nombre, index) => {
        const numeroMes = index + 1;
        const cargosMes = cargos.filter(
          (cargo) => obtenerMesCargo(cargo) === numeroMes,
        );

        return {
          mes: numeroMes,
          nombre,
          cantidad: cargosMes.length,
          facturado: cargosMes.reduce(
            (total, cargo) => total + numero(cargo.monto),
            0,
          ),
          pagado: cargosMes.reduce(
            (total, cargo) => total + numero(cargo.monto_pagado),
            0,
          ),
          pendiente: cargosMes.reduce(
            (total, cargo) => total + numero(cargo.balance),
            0,
          ),
        };
      }),
    [cargos],
  );

  const totalFacturado = filasVisibles.reduce(
    (total, fila) => total + fila.totalFacturado,
    0,
  );
  const totalPagado = filasVisibles.reduce(
    (total, fila) => total + fila.totalPagado,
    0,
  );
  const totalPendiente = filasVisibles.reduce(
    (total, fila) => total + fila.totalPendiente,
    0,
  );
  const unidadesConDeuda = filasVisibles.filter(
    (fila) => fila.totalPendiente > 0,
  ).length;

  if (loading) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[75vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-sm">
            <Loader2 className="animate-spin text-blue-700" size={21} />
            Cargando relación de pagos...
          </div>
        </div>
      </main>
    );
  }

  if (!sesion) return null;

  return (
    <main className="min-h-dvh bg-slate-100 pb-10">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-8 pt-4 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/movil/directiva")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"
              aria-label="Volver"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-200">
                Portal de Directiva
              </p>
              <h1 className="truncate text-base font-black">
                Pagos por propietario
              </h1>
            </div>

            <button
              type="button"
              onClick={() => void cargarDatos(sesion, anio, true)}
              disabled={actualizando}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 disabled:opacity-50"
              aria-label="Actualizar"
            >
              <RefreshCw
                size={18}
                className={actualizando ? "animate-spin" : ""}
              />
            </button>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3">
            {sesion.condominio_logo_url ? (
              <img
                src={sesion.condominio_logo_url}
                alt={sesion.condominio_nombre}
                className="h-11 w-11 rounded-xl bg-white object-contain p-1.5"
              />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xs font-black text-blue-900">
                VAM
              </span>
            )}

            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">
                {sesion.condominio_nombre}
              </p>
              <p className="truncate text-[11px] text-blue-100">
                Relación anual de cuotas de mantenimiento
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        {mensaje && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
            {mensaje}
          </div>
        )}

        <section className="rounded-[1.4rem] border border-blue-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <CalendarDays size={19} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-700">
                Filtros
              </p>
              <h2 className="text-sm font-black text-slate-900">
                Año y apartamento
              </h2>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <select
              value={anio}
              onChange={(e) => cambiarAnio(e.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800"
            >
              {[2024, 2025, 2026, 2027, 2028].map((valor) => (
                <option key={valor} value={valor}>
                  {valor}
                </option>
              ))}
            </select>

            <select
              value={apartamentoSeleccionado}
              onChange={(e) => {
                setApartamentoSeleccionado(e.target.value);
                setUnidadExpandida(null);
              }}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800"
            >
              <option value="">Todos</option>
              {filas.map((fila) => (
                <option key={fila.unidad_id} value={fila.apartamento}>
                  {fila.apartamento}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
            <Search size={16} className="text-slate-400" />
            <input
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Buscar apartamento, propietario o teléfono"
              className="h-11 min-w-0 flex-1 bg-transparent text-xs outline-none"
            />
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {[
              ["TODOS", "Todos"],
              ["CON_DEUDA", "Deuda"],
              ["AL_DIA", "Al día"],
              ["PARCIAL", "Parcial"],
            ].map(([valor, etiqueta]) => (
              <button
                key={valor}
                type="button"
                onClick={() =>
                  setFiltro(
                    valor as
                      | "TODOS"
                      | "CON_DEUDA"
                      | "AL_DIA"
                      | "PARCIAL",
                  )
                }
                className={`rounded-xl px-2 py-2 text-[10px] font-black ${
                  filtro === valor
                    ? "bg-blue-800 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <ResumenCard
            titulo="Facturado"
            valor={dinero(totalFacturado)}
            icono={<CircleDollarSign size={18} />}
            clase="border-blue-200 bg-blue-50 text-blue-800"
          />
          <ResumenCard
            titulo="Pagado"
            valor={dinero(totalPagado)}
            icono={<CheckCircle2 size={18} />}
            clase="border-emerald-200 bg-emerald-50 text-emerald-700"
          />
          <ResumenCard
            titulo="Pendiente"
            valor={dinero(totalPendiente)}
            icono={<WalletCards size={18} />}
            clase="border-red-200 bg-red-50 text-red-700"
          />
          <ResumenCard
            titulo="Unidades con deuda"
            valor={String(unidadesConDeuda)}
            icono={<TriangleAlert size={18} />}
            clase="border-amber-200 bg-amber-50 text-amber-800"
          />
        </section>

        <section className="rounded-[1.4rem] border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                Resumen mensual
              </p>
              <h2 className="mt-1 text-sm font-black text-slate-900">
                Cargos del {anio}
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">
              {cargos.length} cargos
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {resumenMeses.map((mes) => (
              <div
                key={mes.mes}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black text-slate-800">
                    {mes.nombre}
                  </p>
                  <span className="text-[9px] font-bold text-slate-400">
                    {mes.cantidad}
                  </span>
                </div>

                <div className="mt-2 space-y-1 text-[10px]">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Facturado</span>
                    <span className="font-bold text-slate-700">
                      {dinero(mes.facturado)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Pagado</span>
                    <span className="font-bold text-emerald-700">
                      {dinero(mes.pagado)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Pendiente</span>
                    <span className="font-bold text-red-700">
                      {dinero(mes.pendiente)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between px-1">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                Propietarios
              </p>
              <h2 className="mt-1 text-sm font-black text-slate-900">
                Estado por apartamento
              </h2>
            </div>

            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-black text-slate-700">
              {filasVisibles.length}
            </span>
          </div>

          {filasVisibles.length === 0 ? (
            <div className="rounded-[1.4rem] border bg-white px-5 py-8 text-center">
              <Users className="mx-auto text-slate-300" size={31} />
              <p className="mt-3 text-sm font-black text-slate-800">
                No hay información para mostrar
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Revise el año o los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filasVisibles.map((fila) => {
                const expandida = unidadExpandida === fila.unidad_id;
                const alDia = fila.totalPendiente <= 0;

                return (
                  <article
                    key={fila.unidad_id}
                    className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
                          <Building2 size={18} />
                        </span>

                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-700">
                            Apartamento {fila.apartamento}
                          </p>
                          <h3 className="mt-1 truncate text-sm font-black text-slate-900">
                            {fila.propietario}
                          </h3>
                          <p className="mt-0.5 truncate text-[10px] text-slate-500">
                            {fila.telefono}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black ${
                          alDia
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {alDia ? "AL DÍA" : "CON DEUDA"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <MiniDato
                        etiqueta="Facturado"
                        valor={dinero(fila.totalFacturado)}
                      />
                      <MiniDato
                        etiqueta="Pagado"
                        valor={dinero(fila.totalPagado)}
                        clase="text-emerald-700"
                      />
                      <MiniDato
                        etiqueta="Pendiente"
                        valor={dinero(fila.totalPendiente)}
                        clase={
                          fila.totalPendiente > 0
                            ? "text-red-700"
                            : "text-emerald-700"
                        }
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">
                        {fila.mesesPagados} pagados
                      </span>
                      {fila.mesesParciales > 0 && (
                        <span className="rounded-lg bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700">
                          {fila.mesesParciales} parciales
                        </span>
                      )}
                      {fila.mesesPendientes > 0 && (
                        <span className="rounded-lg bg-red-50 px-2 py-1 text-[9px] font-bold text-red-700">
                          {fila.mesesPendientes} pendientes
                        </span>
                      )}
                      {fila.cuota > 0 && (
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">
                          Cuota {dinero(fila.cuota)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setUnidadExpandida(
                          expandida ? null : fila.unidad_id,
                        )
                      }
                      className="mt-3 flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700"
                    >
                      <span className="flex items-center gap-2">
                        <CalendarDays size={15} />
                        Ver meses
                      </span>
                      {expandida ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>

                    {expandida && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {fila.meses.map((mes) => (
                          <div
                            key={mes.mes}
                            className={`rounded-xl border p-2 ${claseEstado(
                              mes.estado,
                            )}`}
                          >
                            <p className="text-[9px] font-black uppercase">
                              {mes.nombre.slice(0, 3)}
                            </p>
                            <p className="mt-1 text-[9px] font-bold">
                              {textoEstado(mes.estado)}
                            </p>

                            {mes.estado !== "SIN_CARGO" && (
                              <>
                                <p className="mt-1 text-[8px] opacity-70">
                                  Pagado
                                </p>
                                <p className="truncate text-[9px] font-black">
                                  {dinero(mes.pagado)}
                                </p>

                                {mes.balance > 0 && (
                                  <>
                                    <p className="mt-1 text-[8px] opacity-70">
                                      Balance
                                    </p>
                                    <p className="truncate text-[9px] font-black">
                                      {dinero(mes.balance)}
                                    </p>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-[10px] leading-5 text-blue-900">
          <p className="flex items-start gap-2">
            <UserRound className="mt-0.5 shrink-0" size={14} />
            Este reporte conserva la lógica del reporte administrativo: utiliza
            los cargos de mantenimiento/ordinarios registrados en
            <strong> cargos_periodicos</strong>. Un mes figura pagado cuando el
            balance del cargo llega a cero.
          </p>
        </div>

        <p className="pb-2 text-right text-[9px] font-semibold text-slate-400">
          Directiva · Pagos por Propietario · v{VERSION}
        </p>
      </div>
    </main>
  );
}

function ResumenCard({
  titulo,
  valor,
  icono,
  clase,
}: {
  titulo: string;
  valor: string;
  icono: React.ReactNode;
  clase: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${clase}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80">
        {icono}
      </span>
      <p className="mt-3 text-[9px] font-black uppercase opacity-70">
        {titulo}
      </p>
      <p className="mt-1 break-words text-sm font-black">{valor}</p>
    </div>
  );
}

function MiniDato({
  etiqueta,
  valor,
  clase = "text-slate-800",
}: {
  etiqueta: string;
  valor: string;
  clase?: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-2">
      <p className="text-[8px] font-bold uppercase text-slate-400">
        {etiqueta}
      </p>
      <p className={`mt-1 truncate text-[10px] font-black ${clase}`}>
        {valor}
      </p>
    </div>
  );
}
