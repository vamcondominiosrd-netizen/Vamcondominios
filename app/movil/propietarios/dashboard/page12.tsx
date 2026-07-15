"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  Bell,
  Building2,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  CreditCard,
  FileBarChart2,
  FileText,
  FolderOpen,
  ListChecks,
  LogOut,
  Phone,
  Plus,
  ReceiptText,
  ShieldCheck,
  User,
  WalletCards,
  Wrench,
  XCircle,
} from "lucide-react";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  condominio_logo_url?: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string;
  telefono?: string;
  correo?: string;
};

type Acceso = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: ComponentType<{ size?: number; className?: string }>;
  destacado?: boolean;
};

type ResumenAutorizaciones = {
  total: number;
  pendientes: number;
  aprobadas: number;
  rechazadas: number;
};

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(valor || 0);
}

function normalizarEstado(valor: unknown) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

export default function DashboardPropietariosPage() {
  const router = useRouter();

  const [propietario, setPropietario] =
    useState<PropietarioActual | null>(null);
  const [balanceActual, setBalanceActual] = useState(0);
  const [cargandoBalance, setCargandoBalance] = useState(true);
  const [mensajeBalance, setMensajeBalance] = useState("");

  const [resumenAutorizaciones, setResumenAutorizaciones] =
    useState<ResumenAutorizaciones>({
      total: 0,
      pendientes: 0,
      aprobadas: 0,
      rechazadas: 0,
    });
  const [cargandoAutorizaciones, setCargandoAutorizaciones] =
    useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("propietario_actual");

      if (!raw) {
        router.replace("/movil/propietarios/login");
        return;
      }

      const sesion = JSON.parse(raw) as PropietarioActual;

      if (
        !sesion?.propietario_id ||
        !sesion?.condominio_id ||
        !sesion?.unidad_id
      ) {
        cerrarSesion();
        return;
      }

      setPropietario(sesion);

      void Promise.all([
        cargarBalance(sesion),
        cargarResumenAutorizaciones(sesion),
      ]);
    } catch {
      cerrarSesion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function cargarBalance(prop: PropietarioActual) {
    setCargandoBalance(true);
    setMensajeBalance("");

    const { data, error } = await supabase
      .from("cargos_periodicos")
      .select("balance")
      .eq("condominio_id", prop.condominio_id)
      .eq("unidad_id", prop.unidad_id);

    if (error) {
      setMensajeBalance("No se pudo cargar el balance en este momento.");
      setCargandoBalance(false);
      return;
    }

    const total = (data || []).reduce(
      (acumulado, registro: { balance?: number | string | null }) =>
        acumulado + Number(registro.balance || 0),
      0
    );

    setBalanceActual(total);
    setCargandoBalance(false);
  }

  async function cargarResumenAutorizaciones(prop: PropietarioActual) {
    setCargandoAutorizaciones(true);

    const { data, error } = await supabase
      .from("autorizaciones")
      .select("id, estado")
      .eq("condominio_id", prop.condominio_id)
      .eq("propietario_id", prop.propietario_id)
      .eq("unidad_id", prop.unidad_id);

    if (error) {
      console.error("Error cargando autorizaciones:", error);
      setCargandoAutorizaciones(false);
      return;
    }

    const resumen = (data || []).reduce<ResumenAutorizaciones>(
      (acumulado, solicitud) => {
        const estado = normalizarEstado(solicitud.estado);

        acumulado.total += 1;

        if (["APROBADA", "APROBADO"].includes(estado)) {
          acumulado.aprobadas += 1;
        } else if (["RECHAZADA", "RECHAZADO"].includes(estado)) {
          acumulado.rechazadas += 1;
        } else if (
          ![
            "FINALIZADA",
            "FINALIZADO",
            "COMPLETADA",
            "COMPLETADO",
            "CANCELADA",
            "CANCELADO",
          ].includes(estado)
        ) {
          acumulado.pendientes += 1;
        }

        return acumulado;
      },
      {
        total: 0,
        pendientes: 0,
        aprobadas: 0,
        rechazadas: 0,
      }
    );

    setResumenAutorizaciones(resumen);
    setCargandoAutorizaciones(false);
  }

  function cerrarSesion() {
    localStorage.removeItem("propietario_actual");
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
    router.replace("/movil/propietarios/login");
  }

  const accesos: Acceso[] = useMemo(
    () => [
      {
        titulo: "Estado de cuenta",
        descripcion: "Movimientos y balances",
        icono: FileText,
        href: "/movil/propietarios/estado-cuenta",
      },
      {
        titulo: "Pagos",
        descripcion: "Registrar y consultar",
        icono: CreditCard,
        href: "/movil/propietarios/pagos",
      },
      {
        titulo: "Resumen financiero",
        descripcion: "Reporte mensual",
        icono: FileBarChart2,
        href: "/movil/propietarios/resumen-financiero",
        destacado: true,
      },
      {
        titulo: "Incidencias",
        descripcion: "Reportar solicitudes",
        icono: Wrench,
        href: "/movil/propietarios/incidencias",
      },
      {
        titulo: "Anuncios",
        descripcion: "Avisos importantes",
        icono: Bell,
        href: "/movil/propietarios/anuncios",
      },
      {
        titulo: "Reservas",
        descripcion: "Áreas sociales",
        icono: CalendarDays,
        href: "/movil/propietarios/reservas",
      },
      {
        titulo: "Documentos",
        descripcion: "Archivos del condominio",
        icono: FolderOpen,
        href: "/movil/propietarios/documentos",
      },
      {
        titulo: "Vehículos",
        descripcion: "Datos y registros",
        icono: Car,
        href: "/movil/propietarios/vehiculos",
      },
      {
        titulo: "Directorio",
        descripcion: "Contactos útiles",
        icono: Phone,
        href: "/movil/propietarios/directorio",
      },
      {
        titulo: "Mi perfil",
        descripcion: "Datos personales",
        icono: User,
        href: "/movil/propietarios/perfil",
      },
    ],
    []
  );

  if (!propietario) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
            Cargando información...
          </div>
        </div>
      </main>
    );
  }

  const estaAlDia = balanceActual <= 0;

  return (
    <main className="min-h-dvh bg-slate-100 pb-8">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-20 pt-4 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {propietario.condominio_logo_url ? (
                <img
                  src={propietario.condominio_logo_url}
                  alt={`Logo de ${propietario.condominio_nombre}`}
                  className="h-12 w-12 shrink-0 rounded-2xl bg-white object-contain p-1.5 shadow-lg"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-blue-900 shadow-lg">
                  VAM
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-blue-100">
                  {propietario.condominio_nombre}
                </p>
                <h1 className="truncate text-lg font-black tracking-tight">
                  Hola, {propietario.nombre_propietario}
                </h1>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-blue-100">
                  <Building2 size={13} />
                  Unidad {propietario.no_apartamento}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={cerrarSesion}
              className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="-mt-14 mx-auto max-w-lg space-y-4 px-4">
        <section className="overflow-hidden rounded-[1.6rem] border border-white/60 bg-white shadow-xl shadow-slate-900/10">
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Balance actual
                </p>

                {cargandoBalance ? (
                  <div className="mt-2 h-9 w-40 animate-pulse rounded-lg bg-slate-200" />
                ) : (
                  <h2
                    className={`mt-1 text-3xl font-black tracking-tight ${
                      estaAlDia ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {formatoMoneda(balanceActual)}
                  </h2>
                )}
              </div>

              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  estaAlDia
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {estaAlDia ? (
                  <ShieldCheck size={25} />
                ) : (
                  <WalletCards size={25} />
                )}
              </div>
            </div>

            {!cargandoBalance && (
              <div
                className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                  estaAlDia
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {estaAlDia ? "Cuenta al día" : "Balance pendiente"}
              </div>
            )}

            {mensajeBalance && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                {mensajeBalance}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => router.push("/movil/propietarios/pagos")}
              className="flex items-center justify-center gap-2 border-r border-slate-100 px-3 py-3.5 text-sm font-extrabold text-blue-800 transition hover:bg-blue-50"
            >
              <CircleDollarSign size={18} />
              Pagar ahora
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/movil/propietarios/resumen-financiero/resumen-financiero"
                )
              }
              className="flex items-center justify-center gap-2 px-3 py-3.5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
            >
              <ReceiptText size={18} />
              Ver resumen
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.6rem] border border-blue-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-800 to-blue-950 p-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                  <ClipboardCheck size={23} />
                </span>

                <div>
                  <h2 className="text-sm font-black">
                    Autorizaciones de trabajo
                  </h2>
                  <p className="mt-0.5 text-[11px] text-blue-100">
                    Solicita permisos y consulta su estado
                  </p>
                </div>
              </div>

              {!cargandoAutorizaciones &&
                resumenAutorizaciones.pendientes > 0 && (
                  <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black text-amber-950">
                    {resumenAutorizaciones.pendientes} pendiente
                    {resumenAutorizaciones.pendientes === 1 ? "" : "s"}
                  </span>
                )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <EstadoAutorizacion
                icono={<Clock3 size={15} />}
                titulo="Pendientes"
                cantidad={
                  cargandoAutorizaciones
                    ? null
                    : resumenAutorizaciones.pendientes
                }
              />
              <EstadoAutorizacion
                icono={<CheckCircle2 size={15} />}
                titulo="Aprobadas"
                cantidad={
                  cargandoAutorizaciones
                    ? null
                    : resumenAutorizaciones.aprobadas
                }
              />
              <EstadoAutorizacion
                icono={<XCircle size={15} />}
                titulo="Rechazadas"
                cantidad={
                  cargandoAutorizaciones
                    ? null
                    : resumenAutorizaciones.rechazadas
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2">
            <button
              type="button"
              onClick={() =>
                router.push("/movil/propietarios/autorizaciones")
              }
              className="flex items-center justify-center gap-2 border-r border-slate-100 px-3 py-4 text-sm font-extrabold text-blue-800 transition hover:bg-blue-50"
            >
              <Plus size={18} />
              Nueva solicitud
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/movil/propietarios/autorizaciones/mis-solicitudes"
                )
              }
              className="flex items-center justify-center gap-2 px-3 py-4 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
            >
              <ListChecks size={18} />
              Mis solicitudes
            </button>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Servicios del propietario
              </h2>
              <p className="text-xs text-slate-500">
                Accesos rápidos a tus gestiones
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {accesos.map((item) => {
              const Icono = item.icono;

              return (
                <button
                  key={item.titulo}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={`group flex min-h-[112px] flex-col justify-between rounded-2xl border p-4 text-left shadow-sm transition active:scale-[0.98] ${
                    item.destacado
                      ? "border-blue-700 bg-gradient-to-br from-blue-800 to-blue-950 text-white shadow-blue-900/20"
                      : "border-slate-200 bg-white text-slate-900 hover:border-blue-200 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        item.destacado
                          ? "bg-white/15 text-white"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      <Icono size={21} />
                    </span>

                    <ChevronRight
                      size={17}
                      className={
                        item.destacado
                          ? "text-blue-100"
                          : "text-slate-300 transition group-hover:text-blue-600"
                      }
                    />
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-extrabold leading-tight">
                      {item.titulo}
                    </p>
                    <p
                      className={`mt-1 text-[11px] leading-4 ${
                        item.destacado
                          ? "text-blue-100"
                          : "text-slate-500"
                      }`}
                    >
                      {item.descripcion}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Bell size={18} />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Avisos importantes
              </h3>
              <p className="text-[11px] text-slate-500">
                Información general del condominio
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => router.push("/movil/propietarios/anuncios")}
              className="flex w-full items-center justify-between rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-slate-100"
            >
              <div>
                <p className="text-xs font-extrabold text-slate-800">
                  Recordatorio de pago
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Los pagos deben realizarse del 1 al 5 de cada mes.
                </p>
              </div>
              <ChevronRight size={17} className="shrink-0 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => router.push("/movil/propietarios/anuncios")}
              className="flex w-full items-center justify-between rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-slate-100"
            >
              <div>
                <p className="text-xs font-extrabold text-slate-800">
                  Áreas comunes
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Mantener limpias y organizadas las áreas compartidas.
                </p>
              </div>
              <ChevronRight size={17} className="shrink-0 text-slate-400" />
            </button>
          </div>
        </section>

        <footer className="pb-2 pt-1 text-center">
          <p className="text-[10px] text-slate-400">
            VAM Administración de Condominios
          </p>
        </footer>
      </div>
    </main>
  );
}

function EstadoAutorizacion({
  icono,
  titulo,
  cantidad,
}: {
  icono: React.ReactNode;
  titulo: string;
  cantidad: number | null;
}) {
  return (
    <div className="rounded-xl bg-white/10 px-2 py-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-blue-100">
        {icono}
        <span className="text-[9px] font-bold">{titulo}</span>
      </div>

      {cantidad === null ? (
        <div className="mx-auto mt-1.5 h-5 w-6 animate-pulse rounded bg-white/20" />
      ) : (
        <p className="mt-1 text-lg font-black text-white">{cantidad}</p>
      )}
    </div>
  );
}
