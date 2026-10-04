"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  AlertCircle,
  ChevronRight,
  ClipboardCheck,
  Landmark,
  Loader2,
  LogOut,
  RefreshCw,
  Users,
  WalletCards,
  BarChart3,
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
  rol_general?: string;
  empresa_id?: number;
  condominio_id?: number;
};

type SolicitudResumen = {
  id: number;
  estado: string | null;
  total: number | string | null;
};

const moneda = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
});

function n(valor: unknown) {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero : 0;
}

function normalizar(valor: unknown) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function esPresidente(rol: unknown) {
  return normalizar(rol).includes("president");
}

function esTesorero(rol: unknown) {
  return normalizar(rol).includes("tesor");
}

function esPendienteFirma(estado: unknown, rol: unknown) {
  const e = normalizar(estado);

  if (esTesorero(rol)) {
    return (
      e === "pendiente aprobacion tesorero" ||
      e === "pendiente tesorero" ||
      e === "pendiente_tesorero"
    );
  }

  if (esPresidente(rol)) {
    return (
      e === "aprobado por tesorero" ||
      e === "aprobada por tesorero" ||
      e === "pendiente aprobacion presidente" ||
      e === "pendiente presidente" ||
      e === "pendiente_presidente"
    );
  }

  return false;
}

function leerSesion(): SesionDirectiva | null {
  for (const clave of ["directiva_actual", "usuario_actual", "sesion_usuario", "usuario"]) {
    const raw = localStorage.getItem(clave);
    if (!raw) continue;

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
    } catch {}
  }

  const condominioId = Number(localStorage.getItem("condominio_id") || 0);
  if (!condominioId) return null;

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

export default function InicioDirectivaPage() {
  const router = useRouter();
  const [sesion, setSesion] = useState<SesionDirectiva | null>(null);
  const [rolValidado, setRolValidado] = useState("");
  const [pendientes, setPendientes] = useState(0);
  const [montoPendiente, setMontoPendiente] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async (s: SesionDirectiva, refresco = false) => {
    refresco ? setActualizando(true) : setCargando(true);
    setError("");

    try {
      const { data: accesoData, error: accesoError } = await supabase.rpc(
        "validar_acceso_directiva",
        { p_condominio_id: Number(s.condominio_id) },
      );

      if (accesoError) throw accesoError;

      const acceso = (accesoData || {}) as RespuestaAcceso;
      if (!acceso.ok) {
        throw new Error(acceso.mensaje || "No fue posible validar el acceso de Directiva.");
      }

      const rol = acceso.rol || s.rol || "Directiva";
      setRolValidado(rol);

      if (!esPresidente(rol) && !esTesorero(rol)) {
        setPendientes(0);
        setMontoPendiente(0);
        return;
      }

      const { data, error: solicitudesError } = await supabase
        .from("solicitudes_pago")
        .select("id, estado, total")
        .eq("condominio_id", Number(s.condominio_id));

      if (solicitudesError) throw solicitudesError;

      const lista = ((data || []) as SolicitudResumen[]).filter((item) =>
        esPendienteFirma(item.estado, rol),
      );

      setPendientes(lista.length);
      setMontoPendiente(lista.reduce((total, item) => total + n(item.total), 0));
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "No fue posible cargar el menú de Directiva.");
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    const s = leerSesion();
    if (!s) {
      router.replace("/");
      return;
    }

    setSesion(s);
    void cargar(s);
  }, [cargar, router]);

  const puedeFirmar = useMemo(
    () => esPresidente(rolValidado) || esTesorero(rolValidado),
    [rolValidado],
  );

  const cargoFirma = esTesorero(rolValidado)
    ? "Tesorero"
    : esPresidente(rolValidado)
      ? "Presidente"
      : "Directiva";

  async function cerrarSesion() {
    await supabase.auth.signOut();
    localStorage.removeItem("directiva_actual");
    localStorage.removeItem("usuario_actual");
    localStorage.removeItem("sesion_usuario");
    localStorage.removeItem("usuario");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_admin_id");
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
    router.replace("/");
  }

  if (cargando) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[75vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-sm">
            <Loader2 className="animate-spin text-blue-700" size={21} />
            Cargando menú de Directiva...
          </div>
        </div>
      </main>
    );
  }

  if (!sesion) return null;

  return (
    <main className="min-h-dvh bg-slate-100 pb-8">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-16 pt-4 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {sesion.condominio_logo_url ? (
                <img
                  src={sesion.condominio_logo_url}
                  alt={sesion.condominio_nombre}
                  className="h-12 w-12 shrink-0 rounded-2xl bg-white object-contain p-1.5 shadow-lg"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white font-black text-blue-950 shadow-lg">
                  VAM
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-blue-100">
                  {sesion.condominio_nombre}
                </p>
                <h1 className="truncate text-lg font-black">Portal de Directiva</h1>
                <p className="mt-0.5 truncate text-[11px] text-blue-100">
                  {sesion.usuario_nombre} · {rolValidado || sesion.rol}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void cargar(sesion, true)}
                disabled={actualizando}
                aria-label="Actualizar"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 disabled:opacity-50"
              >
                <RefreshCw size={18} className={actualizando ? "animate-spin" : ""} />
              </button>
              <button
                type="button"
                onClick={() => void cerrarSesion()}
                aria-label="Cerrar sesión"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-blue-50">
            Seleccione la información que desea consultar.
          </div>
        </div>
      </header>

      <div className="-mt-10 mx-auto max-w-lg space-y-4 px-4">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {puedeFirmar && (
          <button
            type="button"
            onClick={() => router.push("/movil/directiva/solicitudes-pagos")}
            className={`w-full overflow-hidden rounded-[1.7rem] border p-5 text-left shadow-lg ${
              pendientes > 0
                ? "border-amber-300 bg-gradient-to-br from-amber-50 to-white"
                : "border-emerald-200 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                      pendientes > 0
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    <ClipboardCheck size={21} />
                  </span>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.13em] text-slate-400">
                      Firmas de {cargoFirma}
                    </p>
                    <h2 className="text-lg font-black text-slate-900">
                      Solicitudes pendientes de firma
                    </h2>
                  </div>
                </div>

                <div className="mt-4 flex items-end gap-4">
                  <div>
                    <p className="text-3xl font-black text-slate-950">{pendientes}</p>
                    <p className="text-xs font-semibold text-slate-500">pendientes</p>
                  </div>
                  <div className="border-l border-slate-200 pl-4">
                    <p className="text-sm font-black text-slate-800">
                      {moneda.format(montoPendiente)}
                    </p>
                    <p className="text-xs text-slate-500">monto por revisar</p>
                  </div>
                </div>

                {pendientes > 0 ? (
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <AlertCircle size={14} /> Requiere su atención
                  </p>
                ) : (
                  <p className="mt-3 text-xs font-bold text-emerald-700">
                    No tiene solicitudes pendientes de firma.
                  </p>
                )}
              </div>
              <ChevronRight className="mt-2 shrink-0 text-slate-400" size={21} />
            </div>
          </button>
        )}

        <section className="grid grid-cols-2 gap-3">
          <MenuCard
            titulo="Morosidad"
            descripcion="Deudas, unidades morosas y antigüedad."
            icono={<Users size={22} />}
            onClick={() => router.push("/movil/directiva/morosidad")}
          />
          <MenuCard
            titulo="Finanzas"
            descripcion="Ingresos, gastos, banco y cierres."
            icono={<Landmark size={22} />}
            onClick={() => router.push("/movil/directiva/finanzas")}
          />
          <MenuCard
            titulo="Caja chica"
            descripcion="Fondos, gastos y soportes."
            icono={<WalletCards size={22} />}
            onClick={() => router.push("/movil/directiva/caja-chica")}
          />
          <MenuCard
            titulo="Estado financiero"
            descripcion="Informe mensual validado: banco, gastos, cierres y cuotas pendientes."
            icono={<BarChart3 size={22} />}
            onClick={() => router.push("/movil/directiva/estados-financieros")}
          />
        </section>

        {!puedeFirmar && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-900">
            Su cargo de Directiva no tiene firmas de solicitudes de pago asignadas. Puede consultar las demás opciones del menú.
          </div>
        )}

        <p className="pt-2 text-right text-[10px] font-semibold text-slate-400">
          Directiva Inicio · v2.2
        </p>
      </div>
    </main>
  );
}

function MenuCard({
  titulo,
  descripcion,
  icono,
  onClick,
}: {
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[150px] rounded-[1.5rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
        {icono}
      </span>
      <h2 className="mt-4 text-base font-black text-slate-900">{titulo}</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">{descripcion}</p>
      <div className="mt-3 flex items-center gap-1 text-xs font-black text-blue-800">
        Ver <ChevronRight size={15} />
      </div>
    </button>
  );
}
