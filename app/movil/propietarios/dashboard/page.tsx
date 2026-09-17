"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  Bell,
  BellRing,
  Building2,
  CalendarDays,
  Car,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  FileBarChart2,
  FileText,
  FolderOpen,
  ListChecks,
  LogOut,
  MessageSquareText,
  Phone,
  ReceiptText,
  ShieldCheck,
  User,
  WalletCards,
  Wrench,
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
  badge?: number;
};

type ComunicacionPendiente = {
  id: number;
  titulo: string;
  tipo?: string | null;
  periodo?: string | null;
  prioridad?: string | null;
  estado?: string | null;
  enviada_at?: string | null;
  leida_at?: string | null;
};

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(valor || 0);
}

function normalizarComunicaciones(data: unknown): ComunicacionPendiente[] {
  if (Array.isArray(data)) {
    return data as ComunicacionPendiente[];
  }

  if (data && typeof data === "object") {
    const objeto = data as Record<string, unknown>;

    if (Array.isArray(objeto.comunicaciones)) {
      return objeto.comunicaciones as ComunicacionPendiente[];
    }

    if (Array.isArray(objeto.data)) {
      return objeto.data as ComunicacionPendiente[];
    }
  }

  return [];
}

export default function DashboardPropietariosPage() {
  const router = useRouter();

  const [propietario, setPropietario] =
    useState<PropietarioActual | null>(null);
  const [balanceActual, setBalanceActual] = useState(0);
  const [cargandoBalance, setCargandoBalance] = useState(true);
  const [mensajeBalance, setMensajeBalance] = useState("");

  const [comunicacionesPendientes, setComunicacionesPendientes] = useState(0);
  const [ultimaComunicacion, setUltimaComunicacion] =
    useState<ComunicacionPendiente | null>(null);
  const [cargandoComunicaciones, setCargandoComunicaciones] = useState(true);

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

      void cargarBalance(sesion);
      void cargarComunicaciones(sesion);
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

  async function cargarComunicaciones(prop: PropietarioActual) {
    setCargandoComunicaciones(true);

    try {
      const token = localStorage.getItem("propietario_token");

      if (!token) {
        setComunicacionesPendientes(0);
        setUltimaComunicacion(null);
        return;
      }

      /*
       * IMPORTANTE:
       * El portal de propietarios utiliza propietario_token y no una sesión
       * auth.uid() de Supabase. Por seguridad, las comunicaciones deben
       * consultarse mediante una RPC que valide ese token.
       *
       * Si en tu SQL la función tiene otro nombre, cambia solamente
       * "listar_comunicaciones_propietario" y/o los nombres de parámetros.
       */
      const { data, error } = await supabase.rpc(
        "listar_comunicaciones_propietario",
        {
          p_token: token,
          p_condominio_id: prop.condominio_id,
          p_unidad_id: prop.unidad_id,
        }
      );

      if (error) {
        console.warn("Comunicaciones no disponibles:", error.message);
        setComunicacionesPendientes(0);
        setUltimaComunicacion(null);
        return;
      }

      const comunicaciones = normalizarComunicaciones(data)
        .filter((item) => {
          const estado = String(item.estado || "").toUpperCase();
          return estado !== "ANULADA" && !item.leida_at;
        })
        .sort((a, b) =>
          String(b.enviada_at || "").localeCompare(String(a.enviada_at || ""))
        );

      setComunicacionesPendientes(comunicaciones.length);
      setUltimaComunicacion(comunicaciones[0] || null);
    } finally {
      setCargandoComunicaciones(false);
    }
  }

  function cerrarSesion() {
    localStorage.removeItem("propietario_actual");
    localStorage.removeItem("propietario_token");
    localStorage.removeItem("propietario_token_expira");
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
        titulo: "Comunicaciones",
        descripcion: "Mensajes para usted",
        icono: MessageSquareText,
        href: "/movil/propietarios/comunicaciones",
        badge: comunicacionesPendientes,
      },
      {
        titulo: "Autorizar trabajo",
        descripcion: "Solicitar acceso para técnicos",
        icono: ClipboardCheck,
        href: "/movil/propietarios/autorizaciones",
      },
      {
        titulo: "Mis solicitudes",
        descripcion: "Consultar estados y detalles",
        icono: ListChecks,
        href: "/movil/propietarios/autorizaciones/mis-solicitudes",
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
    [comunicacionesPendientes]
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
                router.push("/movil/propietarios/resumen-financiero")
              }
              className="flex items-center justify-center gap-2 px-3 py-3.5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
            >
              <ReceiptText size={18} />
              Ver resumen
            </button>
          </div>
        </section>

        {!cargandoComunicaciones && ultimaComunicacion && (
          <button
            type="button"
            onClick={() =>
              router.push(
                `/movil/propietarios/comunicaciones/${ultimaComunicacion.id}`
              )
            }
            className="group relative w-full overflow-hidden rounded-[1.6rem] border border-red-200 bg-gradient-to-r from-red-50 to-white p-4 text-left shadow-sm transition hover:border-red-300 hover:shadow-md active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                <span className="absolute h-11 w-11 animate-ping rounded-full bg-red-400 opacity-25" />
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-sm">
                  <BellRing size={20} />
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-black text-red-900">
                    Nueva comunicación
                  </p>

                  {comunicacionesPendientes > 1 && (
                    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
                      {comunicacionesPendientes}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs leading-5 text-red-800">
                  Tiene una comunicación pendiente de leer.
                </p>

                <p className="mt-1.5 text-xs font-black uppercase tracking-wide text-red-700">
                  Abrir comunicación
                </p>
              </div>

              <ChevronRight
                size={21}
                className="shrink-0 text-red-500 transition group-hover:translate-x-0.5"
              />
            </div>
          </button>
        )}

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
                  className={`group relative flex min-h-[112px] flex-col justify-between rounded-2xl border p-4 text-left shadow-sm transition active:scale-[0.98] ${
                    item.destacado
                      ? "border-blue-700 bg-gradient-to-br from-blue-800 to-blue-950 text-white shadow-blue-900/20"
                      : "border-slate-200 bg-white text-slate-900 hover:border-blue-200 hover:shadow-md"
                  }`}
                >
                  {Boolean(item.badge) && item.badge! > 0 && (
                    <span className="absolute right-3 top-3 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black text-white shadow-sm ring-2 ring-white">
                      {item.badge! > 99 ? "99+" : item.badge}
                    </span>
                  )}

                  <div className="flex items-start justify-between">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        item.destacado
                          ? "bg-white/15 text-white"
                          : item.badge && item.badge > 0
                          ? "bg-red-50 text-red-600"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      <Icono size={21} />
                    </span>

                    {!(item.badge && item.badge > 0) && (
                      <ChevronRight
                        size={17}
                        className={
                          item.destacado
                            ? "text-blue-100"
                            : "text-slate-300 transition group-hover:text-blue-600"
                        }
                      />
                    )}
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
