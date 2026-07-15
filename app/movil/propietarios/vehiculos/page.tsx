"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Car,
  CheckCircle2,
  ChevronDown,
  Loader2,
  PlusCircle,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

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

type Vehiculo = {
  id: number;
  marca?: string | null;
  modelo?: string | null;
  color?: string | null;
  placa: string;
  anio?: number | null;
  tipo_vehiculo?: string | null;
  observaciones?: string | null;
  estado?: string | null;
  created_at?: string | null;
};

const TIPOS_VEHICULO = ["Carro", "Jeepeta", "Motor", "Camioneta", "Otro"];

const MARCAS_VEHICULOS = [
  "Toyota",
  "Honda",
  "Hyundai",
  "Kia",
  "Nissan",
  "Mitsubishi",
  "Mazda",
  "Suzuki",
  "Ford",
  "Chevrolet",
  "Jeep",
  "Mercedes-Benz",
  "BMW",
  "Lexus",
  "Volkswagen",
  "Audi",
  "Isuzu",
  "Daihatsu",
  "Otra marca",
];

function formatearFecha(fecha?: string | null) {
  if (!fecha) return "-";

  const valor = String(fecha).slice(0, 10);
  const [anio, mes, dia] = valor.split("-");

  if (!anio || !mes || !dia) return valor;

  return `${dia}/${mes}/${anio}`;
}

function claseEstado(estado?: string | null) {
  const valor = String(estado || "").trim().toLowerCase();

  if (valor === "activo") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export default function VehiculosPropietariosPage() {
  const router = useRouter();

  const [propietario, setPropietario] =
    useState<PropietarioActual | null>(null);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);

  const [tipoVehiculo, setTipoVehiculo] = useState("Carro");
  const [marca, setMarca] = useState("");
  const [marcaOtro, setMarcaOtro] = useState("");
  const [modelo, setModelo] = useState("");
  const [color, setColor] = useState("");
  const [placa, setPlaca] = useState("");
  const [anio, setAnio] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingLista, setLoadingLista] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  useEffect(() => {
    void inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function inicializar() {
    setLoadingLista(true);
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
      await cargarVehiculos(sesion);
    } catch {
      setMensaje("No se pudo cargar la información del propietario.");
      setExito(false);
    } finally {
      setLoadingLista(false);
    }
  }

  async function cargarVehiculos(
    prop: PropietarioActual,
    modoActualizacion = false,
    conservarMensaje = false
  ) {
    if (modoActualizacion) setActualizando(true);

    if (!conservarMensaje) {
      setMensaje("");
      setExito(false);
    }

    const { data, error } = await supabase
      .from("vehiculos_propietarios")
      .select(`
        id,
        marca,
        modelo,
        color,
        placa,
        anio,
        tipo_vehiculo,
        observaciones,
        estado,
        created_at
      `)
      .eq("condominio_id", prop.condominio_id)
      .eq("propietario_id", prop.propietario_id)
      .eq("unidad_id", prop.unidad_id)
      .order("created_at", { ascending: false });

    if (error) {
      setMensaje(`No se pudieron cargar los vehículos: ${error.message}`);
      setExito(false);
      setVehiculos([]);
    } else {
      setVehiculos((data || []) as Vehiculo[]);
    }

    if (modoActualizacion) setActualizando(false);
  }

  function limpiarFormulario() {
    setTipoVehiculo("Carro");
    setMarca("");
    setMarcaOtro("");
    setModelo("");
    setColor("");
    setPlaca("");
    setAnio("");
    setObservaciones("");
  }

  async function guardarVehiculo() {
    if (!propietario || loading) return;

    setMensaje("");
    setExito(false);

    if (!placa.trim()) {
      setMensaje("Debe indicar la placa del vehículo.");
      return;
    }

    if (!marca) {
      setMensaje("Debe seleccionar la marca del vehículo.");
      return;
    }

    if (marca === "Otra marca" && !marcaOtro.trim()) {
      setMensaje("Debe escribir la marca del vehículo.");
      return;
    }

    if (anio) {
      const anioNumero = Number(anio);
      const anioActual = new Date().getFullYear();

      if (anioNumero < 1950 || anioNumero > anioActual + 1) {
        setMensaje("Debe indicar un año de vehículo válido.");
        return;
      }
    }

    const marcaFinal = marca === "Otra marca" ? marcaOtro.trim() : marca;

    setLoading(true);

    const { error } = await supabase.from("vehiculos_propietarios").insert({
      condominio_id: propietario.condominio_id,
      condominio: propietario.condominio_nombre,
      propietario_id: propietario.propietario_id,
      unidad_id: propietario.unidad_id,
      no_apartamento: propietario.no_apartamento,
      nombre_propietario: propietario.nombre_propietario,
      marca: marcaFinal || null,
      modelo: modelo.trim() || null,
      color: color.trim() || null,
      placa: placa.trim().toUpperCase(),
      anio: anio ? Number(anio) : null,
      tipo_vehiculo: tipoVehiculo,
      observaciones: observaciones.trim() || null,
      estado: "Activo",
    });

    if (error) {
      setMensaje(`Error registrando vehículo: ${error.message}`);
      setExito(false);
      setLoading(false);
      return;
    }

    limpiarFormulario();
    setExito(true);
    setMensaje("Vehículo registrado correctamente.");

    await cargarVehiculos(propietario, false, true);
    setLoading(false);
  }

  async function eliminarVehiculo(id: number) {
    if (!propietario || eliminandoId) return;

    const confirmar = window.confirm(
      "¿Seguro que desea eliminar este vehículo?"
    );

    if (!confirmar) return;

    setEliminandoId(id);
    setMensaje("");
    setExito(false);

    const { error } = await supabase
      .from("vehiculos_propietarios")
      .delete()
      .eq("id", id)
      .eq("condominio_id", propietario.condominio_id)
      .eq("propietario_id", propietario.propietario_id)
      .eq("unidad_id", propietario.unidad_id);

    if (error) {
      setMensaje(`Error eliminando vehículo: ${error.message}`);
      setEliminandoId(null);
      return;
    }

    setExito(true);
    setMensaje("Vehículo eliminado correctamente.");
    await cargarVehiculos(propietario, false, true);
    setEliminandoId(null);
  }

  const vehiculosActivos = useMemo(
    () =>
      vehiculos.filter(
        (vehiculo) =>
          String(vehiculo.estado || "Activo").trim().toLowerCase() === "activo"
      ).length,
    [vehiculos]
  );

  if (loadingLista && !propietario) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            <Loader2 size={20} className="animate-spin text-blue-700" />
            Cargando vehículos...
          </div>
        </div>
      </main>
    );
  }

  if (!propietario) return null;

  return (
    <main className="min-h-dvh bg-slate-100 pb-8">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-7 pt-4 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/movil/propietarios/dashboard")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"
              aria-label="Volver"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="text-[11px] uppercase tracking-[0.16em] text-blue-200">
                Control de parqueos
              </p>
              <h1 className="truncate text-base font-black">
                Mis vehículos
              </h1>
            </div>

            <button
              type="button"
              onClick={() => cargarVehiculos(propietario, true)}
              disabled={actualizando}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 disabled:opacity-60"
              aria-label="Actualizar"
            >
              <RefreshCw
                size={18}
                className={actualizando ? "animate-spin" : ""}
              />
            </button>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3">
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
                {propietario.condominio_nombre}
              </p>
              <p className="mt-0.5 text-[11px] text-blue-100">
                Unidad {propietario.no_apartamento}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Car size={18} />
            </span>
            <p className="mt-3 text-[11px] font-bold uppercase text-slate-400">
              Registrados
            </p>
            <p className="mt-1 text-xl font-black text-slate-900">
              {vehiculos.length}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700">
              <BadgeCheck size={18} />
            </span>
            <p className="mt-3 text-[11px] font-bold uppercase text-emerald-700">
              Activos
            </p>
            <p className="mt-1 text-xl font-black text-emerald-800">
              {vehiculosActivos}
            </p>
          </div>
        </section>

        {mensaje && (
          <div
            className={`rounded-2xl border px-4 py-3 text-xs leading-5 ${
              exito
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <div className="flex items-start gap-2">
              {exito ? (
                <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle size={17} className="mt-0.5 shrink-0" />
              )}
              <span>{mensaje}</span>
            </div>
          </div>
        )}

        <section className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <PlusCircle size={20} />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Registrar vehículo
              </h2>
              <p className="text-[10px] text-slate-500">
                Complete los datos del vehículo
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Campo etiqueta="Tipo de vehículo">
              <div className="relative">
                <select
                  value={tipoVehiculo}
                  onChange={(event) => setTipoVehiculo(event.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {TIPOS_VEHICULO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </Campo>

            <Campo etiqueta="Marca">
              <div className="relative">
                <select
                  value={marca}
                  onChange={(event) => {
                    setMarca(event.target.value);

                    if (event.target.value !== "Otra marca") {
                      setMarcaOtro("");
                    }
                  }}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Seleccione marca</option>

                  {MARCAS_VEHICULOS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              {marca === "Otra marca" && (
                <input
                  type="text"
                  value={marcaOtro}
                  onChange={(event) => setMarcaOtro(event.target.value)}
                  placeholder="Escriba la marca"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              )}
            </Campo>

            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Modelo">
                <input
                  type="text"
                  value={modelo}
                  onChange={(event) => setModelo(event.target.value)}
                  placeholder="Corolla"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </Campo>

              <Campo etiqueta="Color">
                <input
                  type="text"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  placeholder="Blanco"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </Campo>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Año">
                <input
                  type="number"
                  min="1950"
                  max={new Date().getFullYear() + 1}
                  value={anio}
                  onChange={(event) => setAnio(event.target.value)}
                  placeholder="2024"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </Campo>

              <Campo etiqueta="Placa">
                <input
                  type="text"
                  value={placa}
                  onChange={(event) =>
                    setPlaca(event.target.value.toUpperCase())
                  }
                  placeholder="A123456"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </Campo>
            </div>

            <Campo etiqueta="Observaciones">
              <textarea
                value={observaciones}
                onChange={(event) => setObservaciones(event.target.value)}
                placeholder="Ej. Vehículo principal del apartamento"
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </Campo>

            <button
              type="button"
              onClick={guardarVehiculo}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-800 text-sm font-extrabold text-white transition hover:bg-blue-900 disabled:bg-slate-400"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={17} />
                  Guardar vehículo
                </>
              )}
            </button>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Vehículos registrados
              </h2>
              <p className="text-[10px] text-slate-500">
                Vehículos vinculados a esta unidad
              </p>
            </div>

            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-extrabold text-slate-700">
              {vehiculos.length}
            </span>
          </div>

          {loadingLista ? (
            <div className="flex items-center justify-center gap-2 rounded-[1.4rem] border border-slate-200 bg-white px-4 py-8 text-xs text-slate-500 shadow-sm">
              <Loader2 size={17} className="animate-spin text-blue-700" />
              Cargando vehículos...
            </div>
          ) : vehiculos.length === 0 ? (
            <div className="rounded-[1.4rem] border border-slate-200 bg-white px-5 py-8 text-center shadow-sm">
              <Car className="mx-auto text-blue-700" size={31} />
              <p className="mt-3 text-sm font-black text-slate-900">
                No tiene vehículos
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Los vehículos registrados aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {vehiculos.map((vehiculo) => (
                <article
                  key={vehiculo.id}
                  className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">
                        {vehiculo.tipo_vehiculo || "Vehículo"}
                      </p>

                      <h3 className="mt-1 text-lg font-black leading-6 text-slate-900">
                        {vehiculo.placa}
                      </h3>

                      <p className="mt-1 text-xs font-semibold text-slate-600">
                        {[vehiculo.marca, vehiculo.modelo]
                          .filter(Boolean)
                          .join(" ") || "Sin marca o modelo"}
                      </p>

                      <p className="mt-1 text-[11px] text-slate-400">
                        {[vehiculo.color, vehiculo.anio]
                          .filter(Boolean)
                          .join(" · ") || "Sin detalles adicionales"}
                      </p>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${claseEstado(
                        vehiculo.estado
                      )}`}
                    >
                      <BadgeCheck size={13} />
                      {vehiculo.estado || "Activo"}
                    </span>
                  </div>

                  {vehiculo.observaciones && (
                    <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
                      {vehiculo.observaciones}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-[10px] text-slate-400">
                      Registrado: {formatearFecha(vehiculo.created_at)}
                    </span>

                    <button
                      type="button"
                      onClick={() => eliminarVehiculo(vehiculo.id)}
                      disabled={eliminandoId === vehiculo.id}
                      className="flex h-9 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-[11px] font-extrabold text-red-700 disabled:opacity-60"
                    >
                      {eliminandoId === vehiculo.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Campo({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-extrabold text-slate-700">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}
