"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Car,
  ChevronDown,
  Clock3,
  Loader2,
  Package,
  Send,
  ShieldCheck,
  UserRound,
  UsersRound,
  Wrench,
} from "lucide-react";

type Catalogo = {
  id: number;
  nombre: string;
};

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  condominio_logo_url?: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
  cedula?: string;
  telefono?: string;
  correo?: string;
};

type Formulario = {
  tipo_solicitud_id: string;
  tipo_solicitud: string;
  tipo_trabajo_id: string;
  tipo_trabajo: string;
  tipo_servicio_id: string;
  tipo_servicio: string;
  tipo_visitante_id: string;
  tipo_visitante: string;
  area_acceso_id: string;
  area_acceso: string;
  fecha_programada: string;
  hora_entrada: string;
  hora_salida_estimada: string;
  nombre_visitante: string;
  cedula_visitante: string;
  telefono_visitante: string;
  empresa: string;
  vehiculo_marca: string;
  vehiculo_modelo: string;
  vehiculo_color: string;
  vehiculo_placa: string;
  cantidad_personas: string;
  articulos_entran: string;
  articulos_salen: string;
  descripcion: string;
};

const formularioInicial: Formulario = {
  tipo_solicitud_id: "",
  tipo_solicitud: "",
  tipo_trabajo_id: "",
  tipo_trabajo: "",
  tipo_servicio_id: "",
  tipo_servicio: "",
  tipo_visitante_id: "",
  tipo_visitante: "",
  area_acceso_id: "",
  area_acceso: "",
  fecha_programada: "",
  hora_entrada: "",
  hora_salida_estimada: "",
  nombre_visitante: "",
  cedula_visitante: "",
  telefono_visitante: "",
  empresa: "",
  vehiculo_marca: "",
  vehiculo_modelo: "",
  vehiculo_color: "",
  vehiculo_placa: "",
  cantidad_personas: "1",
  articulos_entran: "",
  articulos_salen: "",
  descripcion: "",
};

function fechaMinima() {
  const fecha = new Date();
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generarCodigo() {
  const fecha = new Date();
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  const random = Math.floor(100000 + Math.random() * 900000);

  return `ACC-${year}${month}${day}-${random}`;
}

export default function NuevaAutorizacionPropietarioPage() {
  const router = useRouter();

  const [propietario, setPropietario] =
    useState<PropietarioActual | null>(null);

  const [tiposSolicitud, setTiposSolicitud] = useState<Catalogo[]>([]);
  const [tiposTrabajo, setTiposTrabajo] = useState<Catalogo[]>([]);
  const [tiposServicio, setTiposServicio] = useState<Catalogo[]>([]);
  const [tiposVisitantes, setTiposVisitantes] = useState<Catalogo[]>([]);
  const [areasAcceso, setAreasAcceso] = useState<Catalogo[]>([]);

  const [form, setForm] = useState<Formulario>(formularioInicial);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mensajeTipo, setMensajeTipo] = useState<"error" | "exito">("error");

  useEffect(() => {
    void inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function inicializar() {
    setCargando(true);
    setMensaje("");

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
        router.replace("/movil/propietarios/login");
        return;
      }

      setPropietario(sesion);
      await cargarCatalogos();
    } catch {
      setMensajeTipo("error");
      setMensaje("No se pudo cargar la información del propietario.");
    } finally {
      setCargando(false);
    }
  }

  async function cargarCatalogos() {
    const [
      solicitudRes,
      trabajoRes,
      servicioRes,
      visitanteRes,
      areasRes,
    ] = await Promise.all([
      supabase
        .from("autorizaciones_tipos_solicitud")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("autorizaciones_tipos_trabajo")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("autorizaciones_tipos_servicio")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("autorizaciones_tipos_visitantes")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("autorizaciones_areas_acceso")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre"),
    ]);

    const errores = [
      solicitudRes.error,
      trabajoRes.error,
      servicioRes.error,
      visitanteRes.error,
      areasRes.error,
    ].filter(Boolean);

    if (errores.length > 0) {
      throw new Error("No se pudieron cargar los catálogos de autorizaciones.");
    }

    setTiposSolicitud(solicitudRes.data || []);
    setTiposTrabajo(trabajoRes.data || []);
    setTiposServicio(servicioRes.data || []);
    setTiposVisitantes(visitanteRes.data || []);
    setAreasAcceso(areasRes.data || []);
  }

  function cambiarCampo(campo: keyof Formulario, valor: string) {
    setForm((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function seleccionarCatalogo(
    campoId: keyof Formulario,
    campoNombre: keyof Formulario,
    valor: string,
    lista: Catalogo[]
  ) {
    const item = lista.find((registro) => String(registro.id) === valor);

    setForm((anterior) => ({
      ...anterior,
      [campoId]: valor,
      [campoNombre]: item?.nombre || "",
    }));
  }

  async function enviarSolicitud(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!propietario) return;

    if (!form.tipo_solicitud_id || !form.fecha_programada) {
      setMensajeTipo("error");
      setMensaje("Complete el tipo de solicitud y la fecha programada.");
      return;
    }

    if (!form.nombre_visitante.trim()) {
      setMensajeTipo("error");
      setMensaje("Indique el nombre de la persona autorizada.");
      return;
    }

    setEnviando(true);
    setMensaje("");

    const codigo = generarCodigo();

    const { error } = await supabase.from("autorizaciones").insert({
      condominio_id: propietario.condominio_id,
      condominio: propietario.condominio_nombre || null,

      codigo_autorizacion: codigo,

      propietario_id: propietario.propietario_id,
      propietario: propietario.nombre_propietario || null,

      unidad_id: propietario.unidad_id,
      unidad: propietario.no_apartamento || null,

      tipo_solicitud_id: Number(form.tipo_solicitud_id),
      tipo_solicitud: form.tipo_solicitud || null,

      tipo_trabajo_id: form.tipo_trabajo_id
        ? Number(form.tipo_trabajo_id)
        : null,
      tipo_trabajo: form.tipo_trabajo || null,

      tipo_servicio_id: form.tipo_servicio_id
        ? Number(form.tipo_servicio_id)
        : null,
      tipo_servicio: form.tipo_servicio || null,

      tipo_visitante_id: form.tipo_visitante_id
        ? Number(form.tipo_visitante_id)
        : null,
      tipo_visitante: form.tipo_visitante || null,

      area_acceso_id: form.area_acceso_id
        ? Number(form.area_acceso_id)
        : null,
      area_acceso: form.area_acceso || null,

      fecha_solicitud: fechaMinima(),
      fecha_programada: form.fecha_programada,
      hora_entrada: form.hora_entrada || null,
      hora_salida_estimada: form.hora_salida_estimada || null,

      nombre_visitante: form.nombre_visitante.trim(),
      cedula_visitante: form.cedula_visitante || null,
      telefono_visitante: form.telefono_visitante || null,

      empresa: form.empresa || null,

      vehiculo_marca: form.vehiculo_marca || null,
      vehiculo_modelo: form.vehiculo_modelo || null,
      vehiculo_color: form.vehiculo_color || null,
      vehiculo_placa: form.vehiculo_placa
        ? form.vehiculo_placa.toUpperCase()
        : null,

      cantidad_personas: Math.max(
        1,
        Number(form.cantidad_personas || 1)
      ),

      articulos_entran: form.articulos_entran || null,
      articulos_salen: form.articulos_salen || null,
      descripcion: form.descripcion || null,

      estado: "Pendiente",
      estado_financiero: "Pendiente de validar",
      qr_code: codigo,
    });

    setEnviando(false);

    if (error) {
      console.error("Error enviando autorización:", error);
      setMensajeTipo("error");
      setMensaje(
        `No se pudo enviar la solicitud: ${error.message}`
      );
      return;
    }

    setMensajeTipo("exito");
    setMensaje(`Solicitud enviada correctamente. Código: ${codigo}`);
    setForm(formularioInicial);

    window.setTimeout(() => {
      router.push("/movil/propietarios/autorizaciones");
    }, 1400);
  }

  if (cargando) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            <Loader2 className="animate-spin text-blue-700" size={20} />
            Cargando solicitud...
          </div>
        </div>
      </main>
    );
  }

  if (!propietario) return null;

  return (
    <main className="min-h-dvh bg-slate-100 pb-8">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-6 pt-4 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"
              aria-label="Volver"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="text-[11px] uppercase tracking-[0.16em] text-blue-200">
                Autorizaciones
              </p>
              <h1 className="truncate text-base font-black">
                Nueva solicitud
              </h1>
            </div>

            <div className="h-10 w-10" />
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-3">
            <div className="flex items-center gap-3">
              {propietario.condominio_logo_url ? (
                <img
                  src={propietario.condominio_logo_url}
                  alt={propietario.condominio_nombre}
                  className="h-11 w-11 rounded-xl bg-white object-contain p-1.5"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xs font-black text-blue-900">
                  VAM
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">
                  {propietario.nombre_propietario}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-blue-100">
                  <Building2 size={12} />
                  {propietario.condominio_nombre} · Unidad{" "}
                  {propietario.no_apartamento}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-4">
        <form onSubmit={enviarSolicitud} className="space-y-4">
          <Seccion
            titulo="Tipo de solicitud"
            icono={<Wrench size={18} />}
          >
            <CampoSelect
              label="Tipo de solicitud *"
              value={form.tipo_solicitud_id}
              onChange={(valor) =>
                seleccionarCatalogo(
                  "tipo_solicitud_id",
                  "tipo_solicitud",
                  valor,
                  tiposSolicitud
                )
              }
              opciones={tiposSolicitud}
            />

            <div className="grid grid-cols-2 gap-3">
              <CampoSelect
                label="Tipo de trabajo"
                value={form.tipo_trabajo_id}
                onChange={(valor) =>
                  seleccionarCatalogo(
                    "tipo_trabajo_id",
                    "tipo_trabajo",
                    valor,
                    tiposTrabajo
                  )
                }
                opciones={tiposTrabajo}
              />

              <CampoSelect
                label="Tipo de servicio"
                value={form.tipo_servicio_id}
                onChange={(valor) =>
                  seleccionarCatalogo(
                    "tipo_servicio_id",
                    "tipo_servicio",
                    valor,
                    tiposServicio
                  )
                }
                opciones={tiposServicio}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <CampoSelect
                label="Tipo de visitante"
                value={form.tipo_visitante_id}
                onChange={(valor) =>
                  seleccionarCatalogo(
                    "tipo_visitante_id",
                    "tipo_visitante",
                    valor,
                    tiposVisitantes
                  )
                }
                opciones={tiposVisitantes}
              />

              <CampoSelect
                label="Área de acceso"
                value={form.area_acceso_id}
                onChange={(valor) =>
                  seleccionarCatalogo(
                    "area_acceso_id",
                    "area_acceso",
                    valor,
                    areasAcceso
                  )
                }
                opciones={areasAcceso}
              />
            </div>
          </Seccion>

          <Seccion
            titulo="Fecha y horario"
            icono={<CalendarDays size={18} />}
          >
            <CampoInput
              label="Fecha programada *"
              type="date"
              min={fechaMinima()}
              value={form.fecha_programada}
              onChange={(valor) =>
                cambiarCampo("fecha_programada", valor)
              }
            />

            <div className="grid grid-cols-2 gap-3">
              <CampoInput
                label="Hora entrada"
                type="time"
                value={form.hora_entrada}
                onChange={(valor) =>
                  cambiarCampo("hora_entrada", valor)
                }
              />

              <CampoInput
                label="Hora salida"
                type="time"
                value={form.hora_salida_estimada}
                onChange={(valor) =>
                  cambiarCampo("hora_salida_estimada", valor)
                }
              />
            </div>
          </Seccion>

          <Seccion
            titulo="Persona autorizada"
            icono={<UserRound size={18} />}
          >
            <CampoInput
              label="Nombre completo *"
              value={form.nombre_visitante}
              onChange={(valor) =>
                cambiarCampo("nombre_visitante", valor)
              }
              placeholder="Nombre de la persona"
            />

            <div className="grid grid-cols-2 gap-3">
              <CampoInput
                label="Cédula"
                value={form.cedula_visitante}
                onChange={(valor) =>
                  cambiarCampo("cedula_visitante", valor)
                }
                placeholder="000-0000000-0"
                inputMode="numeric"
              />

              <CampoInput
                label="Teléfono"
                value={form.telefono_visitante}
                onChange={(valor) =>
                  cambiarCampo("telefono_visitante", valor)
                }
                placeholder="809-000-0000"
                inputMode="tel"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <CampoInput
                label="Empresa"
                value={form.empresa}
                onChange={(valor) =>
                  cambiarCampo("empresa", valor)
                }
                placeholder="Empresa o suplidor"
              />

              <CampoInput
                label="Cantidad"
                type="number"
                min="1"
                value={form.cantidad_personas}
                onChange={(valor) =>
                  cambiarCampo("cantidad_personas", valor)
                }
                inputMode="numeric"
              />
            </div>
          </Seccion>

          <Seccion
            titulo="Vehículo"
            icono={<Car size={18} />}
            opcional
          >
            <div className="grid grid-cols-2 gap-3">
              <CampoInput
                label="Marca"
                value={form.vehiculo_marca}
                onChange={(valor) =>
                  cambiarCampo("vehiculo_marca", valor)
                }
              />

              <CampoInput
                label="Modelo"
                value={form.vehiculo_modelo}
                onChange={(valor) =>
                  cambiarCampo("vehiculo_modelo", valor)
                }
              />

              <CampoInput
                label="Color"
                value={form.vehiculo_color}
                onChange={(valor) =>
                  cambiarCampo("vehiculo_color", valor)
                }
              />

              <CampoInput
                label="Placa"
                value={form.vehiculo_placa}
                onChange={(valor) =>
                  cambiarCampo("vehiculo_placa", valor.toUpperCase())
                }
              />
            </div>
          </Seccion>

          <Seccion
            titulo="Artículos y observaciones"
            icono={<Package size={18} />}
            opcional
          >
            <CampoTexto
              label="Artículos que entran"
              value={form.articulos_entran}
              onChange={(valor) =>
                cambiarCampo("articulos_entran", valor)
              }
              placeholder="Detalle los artículos que ingresarán"
            />

            <CampoTexto
              label="Artículos que salen"
              value={form.articulos_salen}
              onChange={(valor) =>
                cambiarCampo("articulos_salen", valor)
              }
              placeholder="Detalle los artículos que saldrán"
            />

            <CampoTexto
              label="Descripción / observación"
              value={form.descripcion}
              onChange={(valor) =>
                cambiarCampo("descripcion", valor)
              }
              placeholder="Agregue cualquier información importante"
            />
          </Seccion>

          {mensaje && (
            <div
              className={`rounded-2xl border px-4 py-3 text-xs leading-5 ${
                mensajeTipo === "exito"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {mensaje}
            </div>
          )}

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
            <div className="flex items-start gap-2.5">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-blue-700"
              />
              <p className="text-[11px] leading-5 text-blue-800">
                La administración revisará la solicitud y notificará cuando
                sea aprobada o requiera información adicional.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-950 text-sm font-extrabold text-white shadow-lg shadow-blue-900/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Enviando solicitud...
              </>
            ) : (
              <>
                <Send size={18} />
                Enviar solicitud
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

function Seccion({
  titulo,
  icono,
  opcional,
  children,
}: {
  titulo: string;
  icono: React.ReactNode;
  opcional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            {icono}
          </span>
          <h2 className="text-sm font-black text-slate-900">{titulo}</h2>
        </div>

        {opcional && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Opcional
          </span>
        )}
      </div>

      <div className="space-y-3">{children}</div>
    </section>
  );
}

function CampoInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold text-slate-600">
        {label}
      </label>
      <input
        type={type}
        min={min}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function CampoSelect({
  label,
  value,
  onChange,
  opciones,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  opciones: Catalogo[];
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold text-slate-600">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">Seleccione...</option>
          {opciones.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nombre}
            </option>
          ))}
        </select>

        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </div>
  );
}

function CampoTexto({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold text-slate-600">
        {label}
      </label>
      <textarea
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}
