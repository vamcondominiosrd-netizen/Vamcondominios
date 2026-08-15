"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  PlusCircle,
  RefreshCcw,
  Search,
  ShieldCheck,
  Smartphone,
  UnlockKeyhole,
  UserCheck,
  UserRound,
  UserX,
  X,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import SectionCard from "@/components/vam/enterprise/SectionCard";

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

type PropietarioSinAcceso = {
  propietario_id: number;
  condominio_id: number;
  condominio: string;
  unidad_id: number;
  unidad: string;
  nombre_propietario: string;
  cedula: string;
  telefono: string | null;
  correo: string | null;
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
  const [desbloqueandoId, setDesbloqueandoId] = useState<number | null>(null);
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState<number | null>(null);

  const [mostrarCrearAcceso, setMostrarCrearAcceso] = useState(false);
  const [cargandoDisponibles, setCargandoDisponibles] = useState(false);
  const [creandoAcceso, setCreandoAcceso] = useState(false);
  const [propietariosSinAcceso, setPropietariosSinAcceso] = useState<
    PropietarioSinAcceso[]
  >([]);
  const [propietarioSeleccionadoId, setPropietarioSeleccionadoId] = useState("");
  const [claveTemporal, setClaveTemporal] = useState("");
  const [confirmarClaveTemporal, setConfirmarClaveTemporal] = useState("");
  const [mostrarClaveTemporal, setMostrarClaveTemporal] = useState(false);
  const [mostrarConfirmarClaveTemporal, setMostrarConfirmarClaveTemporal] =
    useState(false);

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

  async function cargarPropietariosSinAcceso() {
    setCargandoDisponibles(true);
    setMensaje("");

    const { data, error } = await supabase.rpc(
      "admin_listar_propietarios_sin_acceso"
    );

    setCargandoDisponibles(false);

    if (error) {
      setMensaje(
        "No fue posible cargar los propietarios disponibles: " + error.message
      );
      return;
    }

    setPropietariosSinAcceso((data || []) as PropietarioSinAcceso[]);
  }

  async function abrirCrearAcceso() {
    setPropietarioSeleccionadoId("");
    setClaveTemporal("");
    setConfirmarClaveTemporal("");
    setMostrarClaveTemporal(false);
    setMostrarConfirmarClaveTemporal(false);
    setMostrarCrearAcceso(true);
    await cargarPropietariosSinAcceso();
  }

  function cerrarCrearAcceso() {
    if (creandoAcceso) return;

    setMostrarCrearAcceso(false);
    setPropietarioSeleccionadoId("");
    setClaveTemporal("");
    setConfirmarClaveTemporal("");
    setMostrarClaveTemporal(false);
    setMostrarConfirmarClaveTemporal(false);
  }

  async function crearAccesoTemporal() {
    const propietario = propietariosSinAcceso.find(
      (item) => String(item.propietario_id) === propietarioSeleccionadoId
    );

    if (!propietario) {
      setMensaje("Seleccione el propietario al que desea crearle el acceso.");
      return;
    }

    if (claveTemporal.length < 8) {
      setMensaje("La clave temporal debe tener al menos 8 caracteres.");
      return;
    }

    if (claveTemporal !== confirmarClaveTemporal) {
      setMensaje("Las claves temporales no coinciden.");
      return;
    }

    const confirmar = window.confirm(
      `¿Desea crear el acceso temporal para ${propietario.nombre_propietario}?\n\n` +
        `Condominio: ${propietario.condominio}\n` +
        `Unidad: ${propietario.unidad}\n` +
        `Cédula: ${formatearCedula(propietario.cedula)}\n\n` +
        "La clave será temporal por 48 horas y el propietario deberá cambiarla al iniciar sesión."
    );

    if (!confirmar) return;

    setCreandoAcceso(true);
    setMensaje("");

    try {
      const { data, error } = await supabase.rpc(
        "admin_crear_acceso_propietario_temporal",
        {
          p_propietario_id: propietario.propietario_id,
          p_unidad_id: propietario.unidad_id,
          p_condominio_id: propietario.condominio_id,
          p_clave_temporal: claveTemporal,
        }
      );

      if (error) {
        setMensaje("No fue posible crear el acceso temporal: " + error.message);
        return;
      }

      const respuesta = (data || {}) as {
        ok?: boolean;
        mensaje?: string;
        cuenta_id?: number;
        cedula?: string;
        clave_temporal_hasta?: string;
      };

      if (!respuesta.ok) {
        setMensaje(
          respuesta.mensaje || "No fue posible crear el acceso temporal."
        );
        return;
      }

      window.alert(
        `Acceso temporal creado correctamente.\n\n` +
          `Propietario: ${propietario.nombre_propietario}\n` +
          `Usuario: ${formatearCedula(propietario.cedula)}\n` +
          `Clave temporal: ${claveTemporal}\n\n` +
          "Entregue estos datos al propietario. La clave temporal vence en 48 horas y deberá cambiarla al iniciar sesión."
      );

      await Promise.all([
        cargarCuentas(),
        cargarPropietariosSinAcceso(),
      ]);

      cerrarCrearAcceso();
    } finally {
      setCreandoAcceso(false);
    }
  }

  async function desbloquearCuenta(cuenta: AccesoPropietario) {
    const propiedades = Array.isArray(cuenta.propiedades)
      ? cuenta.propiedades
      : [];

    const nombrePropietario =
      propiedades[0]?.propietario || `Cuenta #${cuenta.cuenta_id}`;

    const confirmar = window.confirm(
      `¿Desea desbloquear la cuenta de ${nombrePropietario}?\n\n` +
        `Cédula: ${formatearCedula(cuenta.cedula)}\n` +
        `Intentos fallidos: ${cuenta.intentos_fallidos || 0}\n\n` +
        "Esta acción limpiará los intentos fallidos y eliminará el bloqueo temporal. " +
        "No cambiará la contraseña del propietario."
    );

    if (!confirmar) return;

    setDesbloqueandoId(cuenta.cuenta_id);
    setMensaje("");

    try {
      const { data, error } = await supabase.rpc(
        "admin_desbloquear_cuenta_propietario",
        {
          p_cuenta_id: cuenta.cuenta_id,
        }
      );

      if (error) {
        setMensaje("No fue posible desbloquear la cuenta: " + error.message);
        return;
      }

      const respuesta = (data || {}) as {
        ok?: boolean;
        mensaje?: string;
      };

      if (!respuesta.ok) {
        setMensaje(
          respuesta.mensaje || "No fue posible desbloquear la cuenta."
        );
        return;
      }

      window.alert(
        respuesta.mensaje || "Cuenta desbloqueada correctamente."
      );

      await cargarCuentas();
    } finally {
      setDesbloqueandoId(null);
    }
  }

  async function cambiarEstadoCuenta(cuenta: AccesoPropietario) {
    const propiedades = Array.isArray(cuenta.propiedades)
      ? cuenta.propiedades
      : [];

    const nombrePropietario =
      propiedades[0]?.propietario || `Cuenta #${cuenta.cuenta_id}`;

    const nuevoEstado = !cuenta.activo;
    const accion = nuevoEstado ? "activar" : "inactivar";

    const detalle = nuevoEstado
      ? "El propietario podrá volver a iniciar sesión con su contraseña actual."
      : "El propietario no podrá iniciar sesión y se cerrarán todas sus sesiones activas.";

    const confirmar = window.confirm(
      `¿Desea ${accion} la cuenta de ${nombrePropietario}?\n\n` +
        `Cédula: ${formatearCedula(cuenta.cedula)}\n\n` +
        detalle
    );

    if (!confirmar) return;

    setCambiandoEstadoId(cuenta.cuenta_id);
    setMensaje("");

    try {
      const { data, error } = await supabase.rpc(
        "admin_cambiar_estado_cuenta_propietario",
        {
          p_cuenta_id: cuenta.cuenta_id,
          p_activo: nuevoEstado,
        }
      );

      if (error) {
        setMensaje(
          "No fue posible actualizar el estado de la cuenta: " + error.message
        );
        return;
      }

      const respuesta = (data || {}) as {
        ok?: boolean;
        mensaje?: string;
      };

      if (!respuesta.ok) {
        setMensaje(
          respuesta.mensaje || "No fue posible actualizar el estado de la cuenta."
        );
        return;
      }

      window.alert(
        respuesta.mensaje ||
          (nuevoEstado
            ? "Cuenta activada correctamente."
            : "Cuenta inactivada correctamente.")
      );

      await cargarCuentas();
    } finally {
      setCambiandoEstadoId(null);
    }
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
    <>
      <PageContainer>
        <ModuleMenu
          title="Accesos de propietarios"
          subtitle="Administración SaaS de cuentas, activaciones y seguridad de acceso de propietarios."
          tone="blue"
          items={[
            {
              href: "/super-admin",
              label: "Menú principal",
              icon: ShieldCheck,
            },
            {
              href: "/super-admin/accesos-propietarios",
              label: "Accesos propietarios",
              icon: Smartphone,
            },
            {
              href: "/super-admin/accesos-propietarios/codigos-activacion",
              label: "Códigos de activación",
              icon: KeyRound,
            },
          ]}
        />

        <ModuleToolbar
          title="Administración de accesos"
          subtitle={`Consulta global de cuentas de propietarios. Full Administrador: ${superNombre}`}
          icon={Smartphone}
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void abrirCrearAcceso()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
              >
                <PlusCircle className="h-4 w-4" />
                Crear acceso temporal
              </button>

              <button
                type="button"
                onClick={() => void cargarCuentas()}
                disabled={actualizando}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {actualizando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Actualizar
              </button>
            </div>
          }
        />

        {mensaje && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {mensaje}
          </div>
        )}

        <SectionCard
          title="Resumen de accesos"
          subtitle="Estado general de las cuentas de propietarios registradas en la plataforma."
        >
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <ResumenCard titulo="Cuentas" valor={resumen.total} icono={<UserRound className="h-5 w-5" />} />
            <ResumenCard titulo="Activas" valor={resumen.activas} icono={<ShieldCheck className="h-5 w-5" />} />
            <ResumenCard titulo="Bloqueadas" valor={resumen.bloqueadas} icono={<KeyRound className="h-5 w-5" />} />
            <ResumenCard titulo="Inactivas" valor={resumen.inactivas} icono={<Clock3 className="h-5 w-5" />} />
          </section>
        </SectionCard>

        <SectionCard
          title="Consulta de cuentas"
          subtitle="Busque por propietario, cédula, condominio, unidad, teléfono o correo."
        >
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
        </SectionCard>

        <SectionCard
          title="Cuentas de propietarios"
          subtitle={`${cuentasFiltradas.length} cuenta(s) mostrada(s) de ${cuentas.length} registrada(s).`}
        >
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

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-black ${estado.clase}`}
                      >
                        {estado.texto}
                      </span>

                      {(cuenta.intentos_fallidos > 0 ||
                        Boolean(cuenta.bloqueado_hasta)) && (
                        <button
                          type="button"
                          onClick={() => void desbloquearCuenta(cuenta)}
                          disabled={
                            desbloqueandoId === cuenta.cuenta_id ||
                            cambiandoEstadoId === cuenta.cuenta_id
                          }
                          className="inline-flex h-9 items-center gap-2 rounded-xl bg-amber-600 px-3 text-xs font-black text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {desbloqueandoId === cuenta.cuenta_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UnlockKeyhole className="h-4 w-4" />
                          )}
                          Desbloquear cuenta
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => void cambiarEstadoCuenta(cuenta)}
                        disabled={
                          cambiandoEstadoId === cuenta.cuenta_id ||
                          desbloqueandoId === cuenta.cuenta_id
                        }
                        className={`inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          cuenta.activo
                            ? "bg-red-700 hover:bg-red-800"
                            : "bg-emerald-700 hover:bg-emerald-800"
                        }`}
                      >
                        {cambiandoEstadoId === cuenta.cuenta_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : cuenta.activo ? (
                          <UserX className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                        {cuenta.activo ? "Inactivar cuenta" : "Activar cuenta"}
                      </button>
                    </div>
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
        </SectionCard>

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Esta versión permite consultar, crear accesos temporales, desbloquear,
          activar e inactivar cuentas de propietarios. Las claves temporales vencen
          en 48 horas y el propietario debe reemplazarlas por una contraseña personal.
          La contraseña actual nunca se muestra.
        </section>
      </PageContainer>

      {mostrarCrearAcceso && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-crear-acceso-temporal"
            className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl"
          >
            <header className="bg-gradient-to-r from-emerald-700 to-slate-950 px-5 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/15 p-3">
                    <KeyRound className="h-6 w-6" />
                  </div>

                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/70">
                      Soporte VAM
                    </p>

                    <h2
                      id="titulo-crear-acceso-temporal"
                      className="mt-1 text-xl font-black"
                    >
                      Crear acceso temporal
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-emerald-100">
                      El propietario utilizará su cédula como usuario y deberá
                      cambiar esta clave en su primer acceso.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={cerrarCrearAcceso}
                  disabled={creandoAcceso}
                  className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:opacity-50"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-600">
                  Propietario
                </label>

                <select
                  value={propietarioSeleccionadoId}
                  onChange={(event) =>
                    setPropietarioSeleccionadoId(event.target.value)
                  }
                  disabled={cargandoDisponibles || creandoAcceso}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                >
                  <option value="">
                    {cargandoDisponibles
                      ? "Cargando propietarios..."
                      : "Seleccione propietario"}
                  </option>

                  {propietariosSinAcceso.map((propietario) => (
                    <option
                      key={`${propietario.condominio_id}-${propietario.propietario_id}`}
                      value={propietario.propietario_id}
                    >
                      {propietario.condominio} · {propietario.unidad} ·{" "}
                      {propietario.nombre_propietario} ·{" "}
                      {formatearCedula(propietario.cedula)}
                    </option>
                  ))}
                </select>
              </div>

              {propietarioSeleccionadoId && (() => {
                const propietario = propietariosSinAcceso.find(
                  (item) =>
                    String(item.propietario_id) === propietarioSeleccionadoId
                );

                if (!propietario) return null;

                return (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-black text-slate-900">
                      {propietario.nombre_propietario}
                    </p>
                    <p className="mt-1 text-xs font-bold text-emerald-700">
                      {propietario.condominio} · {propietario.unidad}
                    </p>
                    <p className="mt-2 text-xs text-slate-600">
                      Usuario:{" "}
                      <span className="font-black">
                        {formatearCedula(propietario.cedula)}
                      </span>
                    </p>
                  </div>
                );
              })()}

              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-600">
                  Clave temporal
                </label>

                <div className="relative">
                  <input
                    type={mostrarClaveTemporal ? "text" : "password"}
                    value={claveTemporal}
                    onChange={(event) => setClaveTemporal(event.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    disabled={creandoAcceso}
                    autoComplete="new-password"
                    className="h-12 w-full rounded-xl border border-slate-200 px-3.5 pr-12 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setMostrarClaveTemporal((actual) => !actual)
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Mostrar u ocultar clave temporal"
                  >
                    {mostrarClaveTemporal ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-600">
                  Confirmar clave temporal
                </label>

                <div className="relative">
                  <input
                    type={mostrarConfirmarClaveTemporal ? "text" : "password"}
                    value={confirmarClaveTemporal}
                    onChange={(event) =>
                      setConfirmarClaveTemporal(event.target.value)
                    }
                    placeholder="Repita la clave temporal"
                    disabled={creandoAcceso}
                    autoComplete="new-password"
                    className="h-12 w-full rounded-xl border border-slate-200 px-3.5 pr-12 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setMostrarConfirmarClaveTemporal((actual) => !actual)
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Mostrar u ocultar confirmación"
                  >
                    {mostrarConfirmarClaveTemporal ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                La clave temporal vence en 48 horas. VAM no podrá ver la
                contraseña personal que el propietario cree posteriormente.
              </div>

              <button
                type="button"
                onClick={() => void crearAccesoTemporal()}
                disabled={creandoAcceso || cargandoDisponibles}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creandoAcceso ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}

                {creandoAcceso
                  ? "Creando acceso..."
                  : "Crear acceso temporal"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
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
