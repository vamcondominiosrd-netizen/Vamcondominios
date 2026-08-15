"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Clock3,
  KeyRound,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

type PropiedadVinculada = {
  vinculo_id: number;
  condominio_id: number;
  condominio: string;
  unidad_id: number;
  unidad: string;
  propietario_id: number;
  propietario: string | null;
  telefono: string | null;
  correo: string | null;
  vinculo_activo: boolean;
};

type AccesoPropietario = {
  cuenta_id: number;
  cedula: string;
  activo: boolean;
  intentos_fallidos: number;
  bloqueado_hasta: string | null;
  ultimo_acceso: string | null;
  fecha_creacion: string | null;
  fecha_actualizacion: string | null;
  sesiones_activas: number;
  propiedades: PropiedadVinculada[] | null;
};

function formatearCedula(cedula: string) {
  const limpia = String(cedula || "").replace(/\D/g, "");
  if (limpia.length !== 11) return cedula || "-";
  return `${limpia.slice(0, 3)}-${limpia.slice(3, 10)}-${limpia.slice(10)}`;
}

function formatearFecha(fecha?: string | null) {
  if (!fecha) return "Sin registro";
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return "Sin registro";

  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(valor);
}

function estadoCuenta(cuenta: AccesoPropietario) {
  const ahora = new Date();
  const bloqueadoHasta = cuenta.bloqueado_hasta
    ? new Date(cuenta.bloqueado_hasta)
    : null;

  if (!cuenta.activo) {
    return {
      texto: "Inactiva",
      clase: "bg-slate-100 text-slate-700 border-slate-200",
    };
  }

  if (
    bloqueadoHasta &&
    !Number.isNaN(bloqueadoHasta.getTime()) &&
    bloqueadoHasta > ahora
  ) {
    return {
      texto: "Bloqueada",
      clase: "bg-red-50 text-red-700 border-red-200",
    };
  }

  return {
    texto: "Activa",
    clase: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
}

export default function AccesosPropietariosPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [superNombre, setSuperNombre] = useState("");
  const [cuentas, setCuentas] = useState<AccesoPropietario[]>([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    void validarAccesoYCargar();
  }, []);

  async function validarAccesoYCargar() {
    setLoading(true);
    setMensaje("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.replace("/super-login");
      return;
    }

    const { data: superData, error: superError } = await supabase
      .from("super_admins")
      .select("id, nombre, activo")
      .eq("user_id", userData.user.id)
      .eq("activo", true)
      .maybeSingle();

    if (superError || !superData) {
      await supabase.auth.signOut();
      router.replace("/super-login");
      return;
    }

    setSuperNombre(superData.nombre || "Full Administrador");
    await cargarCuentas();
    setLoading(false);
  }

  async function cargarCuentas() {
    setActualizando(true);
    setMensaje("");

    const { data, error } = await supabase.rpc(
      "admin_listar_accesos_propietarios"
    );

    setActualizando(false);

    if (error) {
      setMensaje(
        "No fue posible cargar los accesos de propietarios: " + error.message
      );
      return;
    }

    setCuentas((data || []) as AccesoPropietario[]);
  }

  const cuentasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return cuentas;

    return cuentas.filter((cuenta) => {
      const propiedades = Array.isArray(cuenta.propiedades)
        ? cuenta.propiedades
        : [];

      const textoPropiedades = propiedades
        .map((propiedad) =>
          [
            propiedad.propietario,
            propiedad.condominio,
            propiedad.unidad,
            propiedad.telefono,
            propiedad.correo,
          ]
            .filter(Boolean)
            .join(" ")
        )
        .join(" ");

      return [
        cuenta.cedula,
        formatearCedula(cuenta.cedula),
        textoPropiedades,
      ]
        .join(" ")
        .toLowerCase()
        .includes(termino);
    });
  }, [busqueda, cuentas]);

  const resumen = useMemo(() => {
    return {
      total: cuentas.length,
      activas: cuentas.filter((c) => estadoCuenta(c).texto === "Activa").length,
      bloqueadas: cuentas.filter((c) => estadoCuenta(c).texto === "Bloqueada").length,
      inactivas: cuentas.filter((c) => estadoCuenta(c).texto === "Inactiva").length,
    };
  }, [cuentas]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
          <span className="text-sm font-bold text-slate-700">
            Validando acceso Full Administrador...
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <Smartphone className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                  Centro de Administración VAM
                </p>
                <h1 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">
                  Accesos de propietarios
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Consulta global de las cuentas creadas desde VAM Móvil.
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Administrador: {superNombre}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push("/super-admin")}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-200 px-4 text-sm font-black text-slate-800 hover:bg-slate-300"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>

              <button
                type="button"
                onClick={() => void cargarCuentas()}
                disabled={actualizando}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {actualizando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Actualizar
              </button>
            </div>
          </div>
        </section>

        {mensaje && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {mensaje}
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ResumenCard titulo="Cuentas" valor={resumen.total} icono={<UserRound className="h-5 w-5" />} />
          <ResumenCard titulo="Activas" valor={resumen.activas} icono={<ShieldCheck className="h-5 w-5" />} />
          <ResumenCard titulo="Bloqueadas" valor={resumen.bloqueadas} icono={<KeyRound className="h-5 w-5" />} />
          <ResumenCard titulo="Inactivas" valor={resumen.inactivas} icono={<Clock3 className="h-5 w-5" />} />
        </section>

        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por propietario, cédula, condominio, unidad, teléfono o correo..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </section>

        <section className="space-y-4">
          {cuentasFiltradas.map((cuenta) => {
            const estado = estadoCuenta(cuenta);
            const propiedades = Array.isArray(cuenta.propiedades)
              ? cuenta.propiedades
              : [];

            return (
              <article
                key={cuenta.cuenta_id}
                className="overflow-hidden rounded-2xl border bg-white shadow-sm"
              >
                <div className="border-b bg-slate-50 p-4 md:p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <UserRound className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Cuenta #{cuenta.cuenta_id}
                        </p>
                        <p className="text-lg font-black text-slate-900">
                          {propiedades[0]?.propietario || "Propietario"}
                        </p>
                        <p className="text-sm font-bold text-slate-600">
                          Cédula {formatearCedula(cuenta.cedula)}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-black ${estado.clase}`}
                    >
                      {estado.texto}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 p-4 md:grid-cols-4 md:p-5">
                  <Dato titulo="Último acceso" valor={formatearFecha(cuenta.ultimo_acceso)} />
                  <Dato titulo="Sesiones activas" valor={String(cuenta.sesiones_activas || 0)} />
                  <Dato titulo="Intentos fallidos" valor={String(cuenta.intentos_fallidos || 0)} />
                  <Dato titulo="Cuenta creada" valor={formatearFecha(cuenta.fecha_creacion)} />
                </div>

                {cuenta.bloqueado_hasta && (
                  <div className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 md:mx-5">
                    Bloqueada hasta: {formatearFecha(cuenta.bloqueado_hasta)}
                  </div>
                )}

                <div className="border-t p-4 md:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-500" />
                    <h2 className="text-sm font-black text-slate-800">
                      Propiedades vinculadas ({propiedades.length})
                    </h2>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    {propiedades.map((propiedad) => (
                      <div
                        key={propiedad.vinculo_id}
                        className="rounded-xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-900">
                              {propiedad.condominio}
                            </p>
                            <p className="mt-1 text-sm font-bold text-blue-700">
                              {propiedad.unidad}
                            </p>
                          </div>

                          <span
                            className={
                              propiedad.vinculo_activo
                                ? "rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700"
                                : "rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600"
                            }
                          >
                            {propiedad.vinculo_activo ? "Vinculada" : "Inactiva"}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1 text-xs text-slate-600">
                          <p><span className="font-bold">Propietario:</span> {propiedad.propietario || "-"}</p>
                          <p><span className="font-bold">Teléfono:</span> {propiedad.telefono || "-"}</p>
                          <p><span className="font-bold">Correo:</span> {propiedad.correo || "-"}</p>
                        </div>
                      </div>
                    ))}

                    {propiedades.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                        Esta cuenta no tiene propiedades vinculadas.
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {cuentasFiltradas.length === 0 && (
            <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
              <UserRound className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-black text-slate-700">
                No se encontraron cuentas de propietarios.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Revise el filtro o actualice la consulta.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Esta primera versión es únicamente de consulta. No permite ver
          contraseñas ni modificar, bloquear o restablecer cuentas.
        </section>
      </div>
    </main>
  );
}

function ResumenCard({
  titulo,
  valor,
  icono,
}: {
  titulo: string;
  valor: number;
  icono: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {titulo}
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">{valor}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icono}
        </div>
      </div>
    </div>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        {titulo}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-slate-800">{valor}</p>
    </div>
  );
}
