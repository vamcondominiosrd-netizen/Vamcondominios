"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  PlusCircle,
  RefreshCcw,
  Search,
  ShieldCheck,
  UnlockKeyhole,
  UserCheck,
  UserRound,
  UserX,
  X,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

type CondominioOpcion = {
  condominio_id: number;
  condominio: string;
};

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
  cuenta_id_existente: number | null;
  cuenta_activa: boolean | null;
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
      texto: "Cuenta VAM inactiva",
      clase: "bg-slate-100 text-slate-700 border-slate-200",
    };
  }

  if (
    bloqueadoHasta &&
    !Number.isNaN(bloqueadoHasta.getTime()) &&
    bloqueadoHasta > ahora
  ) {
    return {
      texto: "Cuenta bloqueada",
      clase: "bg-red-50 text-red-700 border-red-200",
    };
  }

  return {
    texto: "Cuenta VAM activa",
    clase: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
}

export default function AccesosPropietariosPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [superNombre, setSuperNombre] = useState("");

  const [condominios, setCondominios] = useState<CondominioOpcion[]>([]);
  const [condominioSeleccionadoId, setCondominioSeleccionadoId] = useState("");

  const [cuentas, setCuentas] = useState<AccesoPropietario[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [desbloqueandoId, setDesbloqueandoId] = useState<number | null>(null);
  const [reactivandoCuentaId, setReactivandoCuentaId] = useState<number | null>(null);
  const [cambiandoVinculoId, setCambiandoVinculoId] = useState<number | null>(null);

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
    await cargarCondominios();
    setLoading(false);
  }

  async function cargarCondominios() {
    const { data, error } = await supabase.rpc(
      "admin_listar_condominios_accesos_propietarios",
    );

    if (error) {
      setMensaje("No fue posible cargar los condominios: " + error.message);
      setCondominios([]);
      setCuentas([]);
      return;
    }

    const lista = (data || []) as CondominioOpcion[];
    setCondominios(lista);

    if (lista.length === 0) {
      setMensaje("No hay condominios disponibles para administrar.");
      setCuentas([]);
      return;
    }

    const guardado = localStorage.getItem("vam_super_condominio_accesos") || "";
    const guardadoValido = lista.some(
      (item) => String(item.condominio_id) === guardado,
    );

    // Durante la implementación inicial se prioriza Lote 9 (id=1).
    // Si el usuario ya seleccionó otro condominio, se conserva su selección.
    const lote9Existe = lista.some((item) => Number(item.condominio_id) === 1);
    const inicial = guardadoValido
      ? guardado
      : lote9Existe
        ? "1"
        : String(lista[0].condominio_id);

    setCondominioSeleccionadoId(inicial);
    await cargarCuentas(inicial);
  }

  async function seleccionarCondominio(id: string) {
    setCondominioSeleccionadoId(id);
    setBusqueda("");
    setCuentas([]);
    setMensaje("");
    cerrarCrearAcceso(true);

    if (!id) return;

    localStorage.setItem("vam_super_condominio_accesos", id);
    await cargarCuentas(id);
  }

  async function cargarCuentas(id = condominioSeleccionadoId) {
    if (!id) {
      setCuentas([]);
      return;
    }

    setActualizando(true);
    setMensaje("");

    const { data, error } = await supabase.rpc(
      "admin_listar_accesos_propietarios",
      {
        p_condominio_id: Number(id),
      },
    );

    setActualizando(false);

    if (error) {
      setMensaje(
        "No fue posible cargar los accesos de propietarios: " + error.message,
      );
      setCuentas([]);
      return;
    }

    setCuentas((data || []) as AccesoPropietario[]);
  }

  async function cargarPropietariosSinAcceso(id = condominioSeleccionadoId) {
    if (!id) {
      setPropietariosSinAcceso([]);
      return;
    }

    setCargandoDisponibles(true);
    setMensaje("");

    const { data, error } = await supabase.rpc(
      "admin_listar_propietarios_sin_acceso",
      {
        p_condominio_id: Number(id),
      },
    );

    setCargandoDisponibles(false);

    if (error) {
      setMensaje(
        "No fue posible cargar los propietarios disponibles: " + error.message,
      );
      setPropietariosSinAcceso([]);
      return;
    }

    setPropietariosSinAcceso((data || []) as PropietarioSinAcceso[]);
  }

  async function abrirCrearAcceso() {
    if (!condominioSeleccionadoId) {
      setMensaje("Seleccione un condominio antes de crear o vincular un acceso.");
      return;
    }

    setPropietarioSeleccionadoId("");
    setClaveTemporal("");
    setConfirmarClaveTemporal("");
    setMostrarClaveTemporal(false);
    setMostrarConfirmarClaveTemporal(false);
    setMostrarCrearAcceso(true);
    await cargarPropietariosSinAcceso(condominioSeleccionadoId);
  }

  function cerrarCrearAcceso(forzar = false) {
    if (creandoAcceso && !forzar) return;

    setMostrarCrearAcceso(false);
    setPropietarioSeleccionadoId("");
    setClaveTemporal("");
    setConfirmarClaveTemporal("");
    setMostrarClaveTemporal(false);
    setMostrarConfirmarClaveTemporal(false);
    setPropietariosSinAcceso([]);
  }

  async function crearOVincularAcceso() {
    const propietario = propietariosSinAcceso.find(
      (item) => String(item.propietario_id) === propietarioSeleccionadoId,
    );

    if (!propietario) {
      setMensaje("Seleccione el propietario al que desea gestionar el acceso.");
      return;
    }

    const tieneCuentaExistente = Boolean(propietario.cuenta_id_existente);

    if (!tieneCuentaExistente) {
      if (claveTemporal.length < 8) {
        setMensaje("La clave temporal debe tener al menos 8 caracteres.");
        return;
      }

      if (claveTemporal !== confirmarClaveTemporal) {
        setMensaje("Las claves temporales no coinciden.");
        return;
      }
    }

    const detalleCuenta = tieneCuentaExistente
      ? `Esta cédula ya posee la cuenta VAM #${propietario.cuenta_id_existente}. Se agregará únicamente esta propiedad y no se modificará su contraseña.`
      : "Se creará una nueva cuenta con clave temporal por 48 horas. El propietario deberá cambiarla al iniciar sesión.";

    const confirmar = window.confirm(
      `¿Desea ${tieneCuentaExistente ? "vincular esta propiedad" : "crear el acceso"} para ${propietario.nombre_propietario}?\n\n` +
        `Condominio: ${propietario.condominio}\n` +
        `Unidad: ${propietario.unidad}\n` +
        `Cédula: ${formatearCedula(propietario.cedula)}\n\n` +
        detalleCuenta,
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
          p_clave_temporal: tieneCuentaExistente ? "" : claveTemporal,
        },
      );

      if (error) {
        setMensaje("No fue posible gestionar el acceso: " + error.message);
        return;
      }

      const respuesta = (data || {}) as {
        ok?: boolean;
        codigo?: string;
        mensaje?: string;
        cuenta_id?: number;
        cedula?: string;
        cuenta_existente?: boolean;
        cuenta_activa?: boolean;
        clave_temporal_hasta?: string;
      };

      if (!respuesta.ok) {
        setMensaje(respuesta.mensaje || "No fue posible gestionar el acceso.");
        return;
      }

      if (tieneCuentaExistente || respuesta.cuenta_existente) {
        window.alert(
          `Propiedad vinculada correctamente.\n\n` +
            `Propietario: ${propietario.nombre_propietario}\n` +
            `Usuario: ${formatearCedula(propietario.cedula)}\n` +
            `Unidad: ${propietario.unidad}\n\n` +
            `${respuesta.mensaje || "La contraseña existente no fue modificada."}`,
        );
      } else {
        window.alert(
          `Acceso temporal creado correctamente.\n\n` +
            `Propietario: ${propietario.nombre_propietario}\n` +
            `Usuario: ${formatearCedula(propietario.cedula)}\n` +
            `Clave temporal: ${claveTemporal}\n\n` +
            "Entregue estos datos al propietario. La clave temporal vence en 48 horas y deberá cambiarla al iniciar sesión.",
        );
      }

      await Promise.all([
        cargarCuentas(condominioSeleccionadoId),
        cargarPropietariosSinAcceso(condominioSeleccionadoId),
      ]);

      cerrarCrearAcceso(true);
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
      `¿Desea desbloquear la cuenta VAM de ${nombrePropietario}?\n\n` +
        `Cédula: ${formatearCedula(cuenta.cedula)}\n` +
        `Intentos fallidos: ${cuenta.intentos_fallidos || 0}\n\n` +
        "Esta acción es global para la cuenta: limpiará los intentos fallidos y el bloqueo temporal. No cambiará la contraseña ni los vínculos de propiedades.",
    );

    if (!confirmar) return;

    setDesbloqueandoId(cuenta.cuenta_id);
    setMensaje("");

    try {
      const { data, error } = await supabase.rpc(
        "admin_desbloquear_cuenta_propietario",
        {
          p_cuenta_id: cuenta.cuenta_id,
        },
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
        setMensaje(respuesta.mensaje || "No fue posible desbloquear la cuenta.");
        return;
      }

      window.alert(respuesta.mensaje || "Cuenta desbloqueada correctamente.");
      await cargarCuentas(condominioSeleccionadoId);
    } finally {
      setDesbloqueandoId(null);
    }
  }

  async function reactivarCuentaGlobal(cuenta: AccesoPropietario) {
    const propiedades = Array.isArray(cuenta.propiedades)
      ? cuenta.propiedades
      : [];

    const nombrePropietario =
      propiedades[0]?.propietario || `Cuenta #${cuenta.cuenta_id}`;

    const confirmar = window.confirm(
      `¿Desea reactivar la cuenta VAM global de ${nombrePropietario}?\n\n` +
        `Cédula: ${formatearCedula(cuenta.cedula)}\n\n` +
        "Esta acción reactiva la identidad VAM del propietario. Los accesos a cada condominio continúan controlados por sus vínculos individuales.",
    );

    if (!confirmar) return;

    setReactivandoCuentaId(cuenta.cuenta_id);
    setMensaje("");

    try {
      const { data, error } = await supabase.rpc(
        "admin_cambiar_estado_cuenta_propietario",
        {
          p_cuenta_id: cuenta.cuenta_id,
          p_activo: true,
        },
      );

      if (error) {
        setMensaje("No fue posible reactivar la cuenta VAM: " + error.message);
        return;
      }

      const respuesta = (data || {}) as {
        ok?: boolean;
        mensaje?: string;
      };

      if (!respuesta.ok) {
        setMensaje(respuesta.mensaje || "No fue posible reactivar la cuenta VAM.");
        return;
      }

      window.alert(respuesta.mensaje || "Cuenta VAM reactivada correctamente.");
      await cargarCuentas(condominioSeleccionadoId);
    } finally {
      setReactivandoCuentaId(null);
    }
  }

  async function cambiarEstadoVinculo(
    cuenta: AccesoPropietario,
    propiedad: PropiedadVinculada,
  ) {
    if (!condominioSeleccionadoId) return;

    const nuevoEstado = !propiedad.vinculo_activo;
    const accion = nuevoEstado ? "activar" : "inactivar";

    const confirmar = window.confirm(
      `¿Desea ${accion} el acceso de ${propiedad.propietario || "este propietario"} a esta propiedad?\n\n` +
        `Condominio: ${propiedad.condominio}\n` +
        `Unidad: ${propiedad.unidad}\n` +
        `Cédula: ${formatearCedula(cuenta.cedula)}\n\n` +
        "Esta acción solo afecta este vínculo. La cuenta VAM y las propiedades del propietario en otros condominios no serán modificadas.",
    );

    if (!confirmar) return;

    setCambiandoVinculoId(propiedad.vinculo_id);
    setMensaje("");

    try {
      const { data, error } = await supabase.rpc(
        "admin_cambiar_estado_vinculo_propietario",
        {
          p_vinculo_id: propiedad.vinculo_id,
          p_condominio_id: Number(condominioSeleccionadoId),
          p_activo: nuevoEstado,
        },
      );

      if (error) {
        setMensaje("No fue posible actualizar el acceso: " + error.message);
        return;
      }

      const respuesta = (data || {}) as {
        ok?: boolean;
        mensaje?: string;
      };

      if (!respuesta.ok) {
        setMensaje(respuesta.mensaje || "No fue posible actualizar el acceso.");
        return;
      }

      window.alert(
        respuesta.mensaje ||
          (nuevoEstado
            ? "Acceso activado correctamente."
            : "Acceso inactivado correctamente."),
      );

      await cargarCuentas(condominioSeleccionadoId);
    } finally {
      setCambiandoVinculoId(null);
    }
  }

  const condominioSeleccionado = useMemo(
    () =>
      condominios.find(
        (item) => String(item.condominio_id) === condominioSeleccionadoId,
      ) || null,
    [condominios, condominioSeleccionadoId],
  );

  const propietarioSeleccionado = useMemo(
    () =>
      propietariosSinAcceso.find(
        (item) => String(item.propietario_id) === propietarioSeleccionadoId,
      ) || null,
    [propietariosSinAcceso, propietarioSeleccionadoId],
  );

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
            .join(" "),
        )
        .join(" ");

      return [cuenta.cedula, formatearCedula(cuenta.cedula), textoPropiedades]
        .join(" ")
        .toLowerCase()
        .includes(termino);
    });
  }, [busqueda, cuentas]);

  const resumen = useMemo(() => {
    let accesosActivos = 0;
    let accesosInactivos = 0;

    for (const cuenta of cuentas) {
      const propiedades = Array.isArray(cuenta.propiedades)
        ? cuenta.propiedades
        : [];

      for (const propiedad of propiedades) {
        if (cuenta.activo && propiedad.vinculo_activo) {
          accesosActivos += 1;
        } else {
          accesosInactivos += 1;
        }
      }
    }

    return {
      total: cuentas.length,
      accesosActivos,
      accesosInactivos,
      bloqueadas: cuentas.filter((c) => estadoCuenta(c).texto === "Cuenta bloqueada")
        .length,
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
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Panel Global SaaS · Accesos por condominio
              </p>

              <h1 className="mt-1 text-3xl font-black text-slate-900">
                Accesos de propietarios
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Bienvenido, {superNombre}. Cada condominio se administra de forma
                independiente sin mezclar propietarios ni vínculos de otros lotes.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/super-admin")}
                className="flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-3 font-bold text-slate-800 hover:bg-slate-300"
              >
                <Building2 className="h-5 w-5" />
                Menú principal
              </button>

              <button
                type="button"
                onClick={() => void abrirCrearAcceso()}
                disabled={!condominioSeleccionadoId}
                className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlusCircle className="h-5 w-5" />
                Crear / vincular acceso
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push("/super-admin/accesos-propietarios/codigos-activacion")
                }
                className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800"
              >
                <KeyRound className="h-5 w-5" />
                Códigos de activación
              </button>

              <button
                type="button"
                onClick={() => void cargarCuentas(condominioSeleccionadoId)}
                disabled={actualizando || !condominioSeleccionadoId}
                className="flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-3 font-bold text-slate-800 hover:bg-slate-300 disabled:opacity-60"
              >
                {actualizando ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <RefreshCcw className="h-5 w-5" />
                )}
                Actualizar
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Condominio a administrar
              </label>
              <select
                value={condominioSeleccionadoId}
                onChange={(event) => void seleccionarCondominio(event.target.value)}
                disabled={actualizando}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              >
                <option value="">Seleccione condominio</option>
                {condominios.map((item) => (
                  <option key={item.condominio_id} value={item.condominio_id}>
                    {item.condominio}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-800">
              Vista aislada: {condominioSeleccionado?.condominio || "Sin selección"}
            </div>
          </div>
        </section>

        {mensaje && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {mensaje}
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ResumenCard
            titulo="Cuentas vinculadas"
            valor={resumen.total}
            icono={<UserRound className="h-5 w-5" />}
          />
          <ResumenCard
            titulo="Accesos activos"
            valor={resumen.accesosActivos}
            icono={<ShieldCheck className="h-5 w-5" />}
          />
          <ResumenCard
            titulo="Accesos inactivos"
            valor={resumen.accesosInactivos}
            icono={<UserX className="h-5 w-5" />}
          />
          <ResumenCard
            titulo="Cuentas bloqueadas"
            valor={resumen.bloqueadas}
            icono={<KeyRound className="h-5 w-5" />}
          />
        </section>

        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar dentro de este condominio por propietario, cédula, unidad, teléfono o correo..."
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
                          Cuenta VAM #{cuenta.cuenta_id}
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
                          disabled={desbloqueandoId === cuenta.cuenta_id}
                          className="inline-flex h-9 items-center gap-2 rounded-xl bg-amber-600 px-3 text-xs font-black text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {desbloqueandoId === cuenta.cuenta_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UnlockKeyhole className="h-4 w-4" />
                          )}
                          Desbloquear cuenta VAM
                        </button>
                      )}

                      {!cuenta.activo && (
                        <button
                          type="button"
                          onClick={() => void reactivarCuentaGlobal(cuenta)}
                          disabled={reactivandoCuentaId === cuenta.cuenta_id}
                          className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-700 px-3 text-xs font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {reactivandoCuentaId === cuenta.cuenta_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                          Reactivar cuenta VAM
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-4 md:grid-cols-4 md:p-5">
                  <Dato
                    titulo="Último acceso"
                    valor={formatearFecha(cuenta.ultimo_acceso)}
                  />
                  <Dato
                    titulo="Sesiones activas"
                    valor={String(cuenta.sesiones_activas || 0)}
                  />
                  <Dato
                    titulo="Intentos fallidos"
                    valor={String(cuenta.intentos_fallidos || 0)}
                  />
                  <Dato
                    titulo="Cuenta creada"
                    valor={formatearFecha(cuenta.fecha_creacion)}
                  />
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
                      Propiedades de este condominio ({propiedades.length})
                    </h2>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    {propiedades.map((propiedad) => (
                      <div
                        key={propiedad.vinculo_id}
                        className="rounded-xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-black text-slate-900">
                              {propiedad.condominio}
                            </p>
                            <p className="mt-1 text-sm font-bold text-blue-700">
                              {propiedad.unidad}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={
                                propiedad.vinculo_activo
                                  ? "rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700"
                                  : "rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600"
                              }
                            >
                              {propiedad.vinculo_activo
                                ? "Acceso activo"
                                : "Acceso inactivo"}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                void cambiarEstadoVinculo(cuenta, propiedad)
                              }
                              disabled={cambiandoVinculoId === propiedad.vinculo_id}
                              className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                propiedad.vinculo_activo
                                  ? "bg-red-700 hover:bg-red-800"
                                  : "bg-emerald-700 hover:bg-emerald-800"
                              }`}
                            >
                              {cambiandoVinculoId === propiedad.vinculo_id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : propiedad.vinculo_activo ? (
                                <UserX className="h-3.5 w-3.5" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5" />
                              )}
                              {propiedad.vinculo_activo
                                ? "Inactivar en este condominio"
                                : "Activar en este condominio"}
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 space-y-1 text-xs text-slate-600">
                          <p>
                            <span className="font-bold">Propietario:</span>{" "}
                            {propiedad.propietario || "-"}
                          </p>
                          <p>
                            <span className="font-bold">Teléfono:</span>{" "}
                            {propiedad.telefono || "-"}
                          </p>
                          <p>
                            <span className="font-bold">Correo:</span>{" "}
                            {propiedad.correo || "-"}
                          </p>
                        </div>
                      </div>
                    ))}

                    {propiedades.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                        Esta cuenta no tiene propiedades vinculadas en el condominio
                        seleccionado.
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
                No se encontraron cuentas vinculadas a este condominio.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Revise el filtro o utilice “Crear / vincular acceso”.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <span className="font-black">Versión 2.1 · Accesos por condominio.</span>{" "}
          Una cédula mantiene una sola cuenta VAM, pero cada propiedad se activa o
          inactiva mediante su vínculo independiente. Inactivar una propiedad aquí no
          afecta los demás condominios del propietario.
        </section>
      </div>

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
                      Soporte VAM · {condominioSeleccionado?.condominio || "Condominio"}
                    </p>

                    <h2
                      id="titulo-crear-acceso-temporal"
                      className="mt-1 text-xl font-black"
                    >
                      Crear o vincular acceso
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-emerald-100">
                      Si la cédula ya posee una cuenta VAM, solo se agregará esta
                      propiedad y se conservará su contraseña actual.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => cerrarCrearAcceso()}
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
                  Propietario / unidad pendiente de acceso
                </label>

                <select
                  value={propietarioSeleccionadoId}
                  onChange={(event) => {
                    setPropietarioSeleccionadoId(event.target.value);
                    setClaveTemporal("");
                    setConfirmarClaveTemporal("");
                  }}
                  disabled={cargandoDisponibles || creandoAcceso}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                >
                  <option value="">
                    {cargandoDisponibles
                      ? "Cargando propietarios..."
                      : propietariosSinAcceso.length === 0
                        ? "No hay propietarios pendientes"
                        : "Seleccione propietario"}
                  </option>

                  {propietariosSinAcceso.map((propietario) => (
                    <option
                      key={`${propietario.condominio_id}-${propietario.propietario_id}`}
                      value={propietario.propietario_id}
                    >
                      {propietario.unidad} · {propietario.nombre_propietario} ·{" "}
                      {formatearCedula(propietario.cedula)}
                      {propietario.cuenta_id_existente
                        ? ` · Cuenta VAM #${propietario.cuenta_id_existente}`
                        : " · Cuenta nueva"}
                    </option>
                  ))}
                </select>
              </div>

              {propietarioSeleccionado && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        {propietarioSeleccionado.nombre_propietario}
                      </p>
                      <p className="mt-1 text-xs font-bold text-emerald-700">
                        {propietarioSeleccionado.condominio} ·{" "}
                        {propietarioSeleccionado.unidad}
                      </p>
                    </div>

                    <span
                      className={
                        propietarioSeleccionado.cuenta_id_existente
                          ? "rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black text-blue-800"
                          : "rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-800"
                      }
                    >
                      {propietarioSeleccionado.cuenta_id_existente
                        ? `Cuenta VAM #${propietarioSeleccionado.cuenta_id_existente}`
                        : "Cuenta nueva"}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-600">
                    Usuario: {" "}
                    <span className="font-black">
                      {formatearCedula(propietarioSeleccionado.cedula)}
                    </span>
                  </p>

                  {propietarioSeleccionado.cuenta_id_existente && (
                    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                      Esta cédula ya tiene una cuenta VAM. Al continuar se vinculará
                      solamente {propietarioSeleccionado.unidad}; no se solicitará ni
                      cambiará la contraseña existente.
                    </div>
                  )}
                </div>
              )}

              {propietarioSeleccionado &&
                !propietarioSeleccionado.cuenta_id_existente && (
                  <>
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
                          type={
                            mostrarConfirmarClaveTemporal ? "text" : "password"
                          }
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
                  </>
                )}

              <button
                type="button"
                onClick={() => void crearOVincularAcceso()}
                disabled={
                  creandoAcceso ||
                  cargandoDisponibles ||
                  !propietarioSeleccionado
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creandoAcceso ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}

                {creandoAcceso
                  ? "Procesando..."
                  : propietarioSeleccionado?.cuenta_id_existente
                    ? "Vincular propiedad a cuenta existente"
                    : "Crear acceso temporal"}
              </button>
            </div>
          </section>
        </div>
      )}
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
