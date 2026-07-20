"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FileText,
  Home,
  Loader2,
  ReceiptText,
  ShieldAlert,
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

type FondoCaja = {
  id: number;
  condominio_id: number;
  numero_fondo?: string | null;
  condominio?: string | null;
  fecha: string | null;
  monto: number | string | null;
  tipo?: string | null;
  responsable?: string | null;
  descripcion?: string | null;
  estado?: string | null;
  numero_documento?: string | null;
  cheque_url?: string | null;
  created_at?: string | null;
};

type GastoCaja = {
  id: number;
  condominio_id?: number | null;
  condominio?: string | null;
  fecha: string | null;
  concepto: string | null;
  detalle_gasto?: string | null;
  responsable?: string | null;
  monto: number | string | null;
  factura_url?: string | null;
  comprobante?: string | null;
  estado?: string | null;
  created_at?: string | null;
};

type ResumenMes = {
  periodo: string;
  fondos: number;
  gastos: number;
  resultado: number;
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

function periodoActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function nombrePeriodo(periodo: string) {
  if (!/^\d{4}-\d{2}$/.test(periodo)) return periodo;
  const [anio, mes] = periodo.split("-").map(Number);
  return new Date(anio, mes - 1, 1).toLocaleDateString("es-DO", {
    month: "long",
    year: "numeric",
  });
}

function fechaCorta(fecha?: string | null) {
  if (!fecha) return "-";
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
      // Continúa con compatibilidad.
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

export default function CajaChicaDirectivaPage() {
  const router = useRouter();

  const [sesion, setSesion] = useState<SesionDirectiva | null>(null);
  const [fondos, setFondos] = useState<FondoCaja[]>([]);
  const [gastos, setGastos] = useState<GastoCaja[]>([]);

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(periodoActual());
  const [detalleGasto, setDetalleGasto] = useState<GastoCaja | null>(null);
  const [detalleFondo, setDetalleFondo] = useState<FondoCaja | null>(null);

  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const sesionActual = leerSesionDirectiva();

    if (!sesionActual) {
      router.replace("/movil");
      return;
    }

    setSesion(sesionActual);
    void cargarDatos(sesionActual);
  }, [router, anio]);

  async function cargarDatos(sesionActual: SesionDirectiva) {
    setLoading(true);
    setMensaje("");

    try {
      const desde = `${anio}-01-01`;
      const hasta = `${anio + 1}-01-01`;

      const [fondosResp, gastosResp] = await Promise.all([
        supabase
          .from("caja_chica_fondos")
          .select(
            "id, condominio_id, numero_fondo, condominio, fecha, tipo, monto, descripcion, responsable, estado, numero_documento, cheque_url, created_at"
          )
          .eq("condominio_id", sesionActual.condominio_id)
          .gte("fecha", desde)
          .lt("fecha", hasta)
          .order("fecha", { ascending: false }),

        supabase
          .from("caja_chica")
          .select(
            "id, condominio_id, condominio, fecha, concepto, detalle_gasto, monto, responsable, comprobante, factura_url, estado, created_at"
          )
          .eq("condominio_id", sesionActual.condominio_id)
          .gte("fecha", desde)
          .lt("fecha", hasta)
          .order("fecha", { ascending: false }),
      ]);

      if (fondosResp.error) throw fondosResp.error;
      if (gastosResp.error) throw gastosResp.error;

      setFondos((fondosResp.data || []) as FondoCaja[]);
      setGastos((gastosResp.data || []) as GastoCaja[]);
    } catch (error: any) {
      console.error("Error cargando caja chica:", error);
      setMensaje(
        error?.message || "No se pudo cargar la información de caja chica."
      );
    } finally {
      setLoading(false);
    }
  }

  const resumenGeneral = useMemo(() => {
    const totalFondos = fondos.reduce(
      (total, fondo) => total + numero(fondo.monto),
      0
    );
    const totalGastos = gastos.reduce(
      (total, gasto) => total + numero(gasto.monto),
      0
    );
    const sinSoporte = gastos
      .filter(
        (gasto) =>
          !gasto.factura_url &&
          !gasto.comprobante
      )
      .reduce((total, gasto) => total + numero(gasto.monto), 0);

    return {
      totalFondos,
      totalGastos,
      disponible: totalFondos - totalGastos,
      sinSoporte,
      cantidadSinSoporte: gastos.filter(
        (gasto) =>
          !gasto.factura_url &&
          !gasto.comprobante
      ).length,
    };
  }, [fondos, gastos]);

  const resumenMeses = useMemo<ResumenMes[]>(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const periodo = `${anio}-${String(index + 1).padStart(2, "0")}`;

      const totalFondos = fondos
        .filter((fondo) => String(fondo.fecha || "").slice(0, 7) === periodo)
        .reduce((total, fondo) => total + numero(fondo.monto), 0);

      const totalGastos = gastos
        .filter((gasto) => String(gasto.fecha || "").slice(0, 7) === periodo)
        .reduce((total, gasto) => total + numero(gasto.monto), 0);

      return {
        periodo,
        fondos: totalFondos,
        gastos: totalGastos,
        resultado: totalFondos - totalGastos,
      };
    });
  }, [anio, fondos, gastos]);

  const gastosPeriodo = useMemo(
    () =>
      gastos.filter(
        (gasto) =>
          String(gasto.fecha || "").slice(0, 7) === periodoSeleccionado
      ),
    [gastos, periodoSeleccionado]
  );

  const fondosPeriodo = useMemo(
    () =>
      fondos.filter(
        (fondo) =>
          String(fondo.fecha || "").slice(0, 7) === periodoSeleccionado
      ),
    [fondos, periodoSeleccionado]
  );

  const categoriasPeriodo = useMemo(() => {
    const mapa = new Map<string, number>();

    gastosPeriodo.forEach((gasto) => {
      const categoria =
        gasto.concepto || "Otros gastos";

      mapa.set(
        categoria,
        (mapa.get(categoria) || 0) + numero(gasto.monto)
      );
    });

    return Array.from(mapa.entries())
      .map(([nombre, monto]) => ({ nombre, monto }))
      .sort((a, b) => b.monto - a.monto);
  }, [gastosPeriodo]);

  if (loading) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[75vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-sm">
            <Loader2 className="animate-spin text-blue-800" size={21} />
            Cargando caja chica...
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
            <button
              type="button"
              onClick={() => router.push("/movil/directiva")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10"
              aria-label="Volver al dashboard"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-blue-100">
                {sesion.condominio_nombre}
              </p>
              <h1 className="text-xl font-black">Caja chica</h1>
              <p className="mt-0.5 text-[11px] text-blue-100">
                Fondos, gastos, soportes y reposiciones
              </p>
            </div>

            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <WalletCards size={22} />
            </span>
          </div>
        </div>
      </header>

      <div className="-mt-10 mx-auto max-w-lg space-y-4 px-4">
        {mensaje && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {mensaje}
          </div>
        )}

        <section className="rounded-[1.6rem] bg-white p-5 shadow-xl shadow-slate-900/10">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Disponible actual
          </p>
          <h2
            className={`mt-1 text-3xl font-black ${
              resumenGeneral.disponible >= 0
                ? "text-blue-900"
                : "text-red-600"
            }`}
          >
            {dinero(resumenGeneral.disponible)}
          </h2>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Dato titulo="Fondos" valor={dinero(resumenGeneral.totalFondos)} />
            <Dato titulo="Gastado" valor={dinero(resumenGeneral.totalGastos)} />
            <Dato
              titulo="Sin soporte"
              valor={dinero(resumenGeneral.sinSoporte)}
            />
          </div>
        </section>

        {resumenGeneral.cantidadSinSoporte > 0 && (
          <section className="rounded-[1.4rem] border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-3">
              <ShieldAlert size={22} className="shrink-0 text-amber-700" />
              <div>
                <h2 className="text-sm font-black text-amber-900">
                  Atención requerida
                </h2>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  {resumenGeneral.cantidadSinSoporte} gasto
                  {resumenGeneral.cantidadSinSoporte === 1 ? "" : "s"} sin
                  factura o comprobante por{" "}
                  {dinero(resumenGeneral.sinSoporte)}.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Resumen anual
              </p>
              <h2 className="mt-1 text-lg font-black text-slate-900">
                Caja chica {anio}
              </h2>
            </div>

            <div className="relative">
              <select
                value={anio}
                onChange={(event) => {
                  const nuevoAnio = Number(event.target.value);
                  setAnio(nuevoAnio);
                  setPeriodoSeleccionado(`${nuevoAnio}-01`);
                }}
                className="h-10 appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-sm font-black text-slate-700"
              >
                {[anio - 2, anio - 1, anio, anio + 1].map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
            {resumenMeses.map((mes, index) => (
              <button
                type="button"
                key={mes.periodo}
                onClick={() => setPeriodoSeleccionado(mes.periodo)}
                className={`grid w-full grid-cols-[72px_1fr_auto] items-center gap-3 px-3 py-3 text-left ${
                  index > 0 ? "border-t border-slate-100" : ""
                } ${
                  periodoSeleccionado === mes.periodo
                    ? "bg-blue-50"
                    : "bg-white"
                }`}
              >
                <span className="text-xs font-black text-slate-700">
                  {nombrePeriodo(mes.periodo).split(" ")[0]}
                </span>

                <div>
                  <div className="flex gap-3 text-[10px] text-slate-500">
                    <span>Fondos {dinero(mes.fondos)}</span>
                    <span>Gastos {dinero(mes.gastos)}</span>
                  </div>
                  <p
                    className={`mt-1 text-xs font-black ${
                      mes.resultado >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    Resultado {dinero(mes.resultado)}
                  </p>
                </div>

                <ChevronRight size={17} className="text-slate-300" />
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Período seleccionado
              </p>
              <h2 className="mt-1 text-lg font-black capitalize text-slate-900">
                {nombrePeriodo(periodoSeleccionado)}
              </h2>
            </div>
            <CalendarDays size={21} className="text-blue-800" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Dato
              titulo="Fondos"
              valor={dinero(
                fondosPeriodo.reduce(
                  (total, fondo) => total + numero(fondo.monto),
                  0
                )
              )}
            />
            <Dato
              titulo="Gastos"
              valor={dinero(
                gastosPeriodo.reduce(
                  (total, gasto) => total + numero(gasto.monto),
                  0
                )
              )}
            />
            <Dato
              titulo="Soportes"
              valor={`${gastosPeriodo.filter(
                (gasto) =>
                  gasto.factura_url ||
                  gasto.comprobante
              ).length}/${gastosPeriodo.length}`}
            />
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Distribución
              </p>
              <h2 className="mt-1 font-black text-slate-900">
                ¿En qué se gastó?
              </h2>
            </div>
            <ReceiptText size={21} className="text-blue-800" />
          </div>

          <div className="mt-4 space-y-3">
            {categoriasPeriodo.length > 0 ? (
              categoriasPeriodo.map((categoria) => {
                const maximo = categoriasPeriodo[0]?.monto || 1;
                const porcentaje = Math.max(
                  6,
                  Math.min(100, (categoria.monto / maximo) * 100)
                );

                return (
                  <div key={categoria.nombre}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate font-bold text-slate-700">
                        {categoria.nombre}
                      </span>
                      <span className="shrink-0 font-black text-slate-900">
                        {dinero(categoria.monto)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-800"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">
                No hay gastos registrados en este período.
              </p>
            )}
          </div>
        </section>

        {fondosPeriodo.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-black text-slate-800">
                Fondos y reposiciones
              </h2>
              <span className="text-xs font-bold text-slate-400">
                {fondosPeriodo.length}
              </span>
            </div>

            {fondosPeriodo.map((fondo) => (
              <button
                type="button"
                key={fondo.id}
                onClick={() => setDetalleFondo(fondo)}
                className="w-full rounded-[1.3rem] border border-slate-200 bg-white p-4 text-left shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
                    <Banknote size={19} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-900">
                      {fondo.tipo || "Fondo de caja chica"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {fechaCorta(fondo.fecha)} ·{" "}
                      {fondo.responsable || "Responsable no indicado"}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {fondo.numero_fondo
                        ? `Fondo ${fondo.numero_fondo}`
                        : "Sin número de fondo"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-black text-blue-800">
                      {dinero(fondo.monto)}
                    </p>
                    <ChevronRight
                      size={17}
                      className="ml-auto mt-1 text-slate-300"
                    />
                  </div>
                </div>
              </button>
            ))}
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black text-slate-800">
              Gastos del período
            </h2>
            <span className="text-xs font-bold text-slate-400">
              {gastosPeriodo.length} registro
              {gastosPeriodo.length === 1 ? "" : "s"}
            </span>
          </div>

          {gastosPeriodo.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-xs text-slate-500">
              No hay gastos registrados para este período.
            </div>
          ) : (
            gastosPeriodo.map((gasto) => {
              const tieneSoporte = Boolean(
                gasto.factura_url ||
                  gasto.comprobante
              );

              return (
                <button
                  type="button"
                  key={gasto.id}
                  onClick={() => setDetalleGasto(gasto)}
                  className="w-full rounded-[1.3rem] border border-slate-200 bg-white p-4 text-left shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        tieneSoporte
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      <ReceiptText size={19} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-900">
                        {gasto.concepto || "Gasto de caja chica"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {gasto.concepto || "Gasto"} ·{" "}
                        {fechaCorta(gasto.fecha)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {tieneSoporte ? "Con soporte" : "Sin soporte"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-black text-red-600">
                        {dinero(gasto.monto)}
                      </p>
                      <ChevronRight
                        size={17}
                        className="ml-auto mt-1 text-slate-300"
                      />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          <Nav
            icono={<Home size={19} />}
            texto="Inicio"
            onClick={() => router.push("/movil/directiva")}
          />
          <Nav
            icono={<Users size={19} />}
            texto="Morosidad"
            onClick={() => router.push("/movil/directiva/morosidad")}
          />
          <Nav
            icono={<Banknote size={19} />}
            texto="Finanzas"
            onClick={() => router.push("/movil/directiva/finanzas")}
          />
          <Nav
            activo
            icono={<WalletCards size={19} />}
            texto="Caja chica"
            onClick={() => undefined}
          />
        </div>
      </nav>

      {detalleGasto && (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/55 sm:items-center sm:justify-center sm:p-4">
          <section className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-[2rem]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Gasto de caja chica
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900">
                  {detalleGasto.concepto || "Gasto"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setDetalleGasto(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-red-50 p-4">
              <p className="text-[10px] font-bold uppercase text-red-500">
                Monto
              </p>
              <p className="mt-1 text-2xl font-black text-red-700">
                {dinero(detalleGasto.monto)}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Info titulo="Fecha" valor={fechaCorta(detalleGasto.fecha)} />
              <Info
                titulo="Categoría"
                valor={detalleGasto.concepto || "Gasto"}
              />
              <Info
                titulo="Proveedor"
                valor={detalleGasto.estado || "Registrado"}
              />
              <Info
                titulo="Responsable"
                valor={detalleGasto.responsable || "No indicado"}
              />
            </div>

            {detalleGasto.detalle_gasto && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400">
                  Detalle
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {detalleGasto.detalle_gasto}
                </p>
              </div>
            )}

            <div className="mt-4 space-y-2">
              {detalleGasto.factura_url && (
                <a
                  href={detalleGasto.factura_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-blue-800"
                >
                  Ver factura
                  <FileText size={18} />
                </a>
              )}

              {!detalleGasto.factura_url &&
                detalleGasto.comprobante && (
                  <div className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                    <span className="font-bold">Comprobante:</span>{" "}
                    {detalleGasto.comprobante}
                  </div>
                )}
            </div>
          </section>
        </div>
      )}

      {detalleFondo && (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/55 sm:items-center sm:justify-center sm:p-4">
          <section className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-[2rem]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Fondo o reposición
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900">
                  {detalleFondo.tipo || "Fondo de caja chica"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setDetalleFondo(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-blue-50 p-4">
              <p className="text-[10px] font-bold uppercase text-blue-500">
                Monto entregado
              </p>
              <p className="mt-1 text-2xl font-black text-blue-900">
                {dinero(detalleFondo.monto)}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Info titulo="Fecha" valor={fechaCorta(detalleFondo.fecha)} />
              <Info
                titulo="Responsable"
                valor={detalleFondo.responsable || "No indicado"}
              />
              <Info
                titulo="Número de fondo"
                valor={detalleFondo.numero_fondo || "No indicado"}
              />
              <Info
                titulo="Estado"
                valor={detalleFondo.estado || "Registrado"}
              />
              <Info
                titulo="Cheque"
                valor={detalleFondo.numero_documento || "No indicado"}
              />
            </div>

            {detalleFondo.descripcion && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400">
                  Descripción
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {detalleFondo.descripcion}
                </p>
              </div>
            )}

            {detalleFondo.cheque_url && (
              <a
                href={detalleFondo.cheque_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-blue-800"
              >
                Ver cheque
                <FileText size={18} />
              </a>
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
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {titulo}
      </p>
      <p className="mt-1 break-words text-[11px] font-black leading-tight text-slate-800">
        {valor}
      </p>
    </div>
  );
}

function Info({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {titulo}
      </p>
      <p className="mt-1 text-xs font-black text-slate-800">{valor}</p>
    </div>
  );
}

function Nav({
  activo = false,
  icono,
  texto,
  onClick,
}: {
  activo?: boolean;
  icono: React.ReactNode;
  texto: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-bold ${
        activo ? "text-blue-800" : "text-slate-500"
      }`}
    >
      {icono}
      {texto}
    </button>
  );
}
