"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Car,
  CheckCircle,
  Trash2,
  BadgeCheck,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
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

const tiposVehiculo = ["Carro", "Jeepeta", "Motor", "Camioneta", "Otro"];

const marcasVehiculos = [
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

export default function VehiculosPropietariosPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(
    null
  );

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
  const [loadingLista, setLoadingLista] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("propietario_actual");

    if (!raw) {
      router.push("/movil/propietarios/login");
      return;
    }

    const prop = JSON.parse(raw);
    setPropietario(prop);
    cargarVehiculos(prop);
  }, [router]);

  async function cargarVehiculos(prop: PropietarioActual) {
    setLoadingLista(true);
    setMensaje("");

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
      .order("created_at", { ascending: false });

    setLoadingLista(false);

    if (error) {
      setMensaje("Error cargando vehículos: " + error.message);
      return;
    }

    setVehiculos(data || []);
  }

  async function guardarVehiculo() {
    if (!propietario) return;

    setMensaje("");
    setExito(false);

    if (!placa.trim()) {
      setMensaje("Debe indicar la placa del vehículo.");
      return;
    }

    if (marca === "Otra marca" && !marcaOtro.trim()) {
      setMensaje("Debe escribir la marca del vehículo.");
      return;
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

    setLoading(false);

    if (error) {
      setMensaje("Error registrando vehículo: " + error.message);
      return;
    }

    setExito(true);
    setMensaje("Vehículo registrado correctamente.");

    setTipoVehiculo("Carro");
    setMarca("");
    setMarcaOtro("");
    setModelo("");
    setColor("");
    setPlaca("");
    setAnio("");
    setObservaciones("");

    await cargarVehiculos(propietario);
  }

  async function eliminarVehiculo(id: number) {
    const confirmar = confirm("¿Seguro que desea eliminar este vehículo?");

    if (!confirmar) return;

    const { error } = await supabase
      .from("vehiculos_propietarios")
      .delete()
      .eq("id", id);

    if (error) {
      setMensaje("Error eliminando vehículo: " + error.message);
      return;
    }

    if (propietario) {
      await cargarVehiculos(propietario);
    }
  }

  if (!propietario) {
    return <div className="p-6 text-center text-slate-500">Cargando...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <header className="bg-slate-950 text-white rounded-3xl p-5 shadow">
        <button
          onClick={() => router.push("/movil/propietarios/dashboard")}
          className="flex items-center gap-2 text-sm text-slate-300 mb-4"
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <p className="text-sm text-slate-300">Control de parqueos</p>
        <h1 className="text-xl font-bold">Mis vehículos</h1>

        <p className="text-xs text-slate-300">
          {propietario.condominio_nombre} · {propietario.no_apartamento}
        </p>
      </header>

      {mensaje && (
        <div
          className={`rounded-2xl p-3 text-sm ${
            exito
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {exito && <CheckCircle className="inline mr-1" size={16} />}
          {mensaje}
        </div>
      )}

      <section className="bg-white rounded-3xl border shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Car className="text-blue-700" size={22} />
          <h2 className="font-bold text-slate-900">Registrar vehículo</h2>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Tipo de vehículo
          </label>

          <select
            value={tipoVehiculo}
            onChange={(e) => setTipoVehiculo(e.target.value)}
            className="w-full border rounded-2xl px-4 py-3 bg-white"
          >
            {tiposVehiculo.map((tipo) => (
              <option key={tipo}>{tipo}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Marca
          </label>

          <select
            value={marca}
            onChange={(e) => {
              setMarca(e.target.value);

              if (e.target.value !== "Otra marca") {
                setMarcaOtro("");
              }
            }}
            className="w-full border rounded-2xl px-4 py-3 bg-white"
          >
            <option value="">Seleccione marca</option>

            {marcasVehiculos.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {marca === "Otra marca" && (
            <input
              type="text"
              value={marcaOtro}
              onChange={(e) => setMarcaOtro(e.target.value)}
              placeholder="Escriba la marca"
              className="w-full border rounded-2xl px-4 py-3 mt-2"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Modelo
            </label>
            <input
              type="text"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              placeholder="Corolla"
              className="w-full border rounded-2xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Color
            </label>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="Blanco"
              className="w-full border rounded-2xl px-4 py-3"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Año
          </label>
          <input
            type="number"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            placeholder="2024"
            className="w-full border rounded-2xl px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Placa
          </label>

          <input
            type="text"
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            placeholder="A123456"
            className="w-full border rounded-2xl px-4 py-3 uppercase"
          />

          <p className="text-xs text-slate-500 mt-1">
            La placa es obligatoria para identificar el vehículo.
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Observaciones
          </label>

          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Ej. Vehículo principal del apartamento"
            rows={3}
            className="w-full border rounded-2xl px-4 py-3"
          />
        </div>

        <button
          type="button"
          onClick={guardarVehiculo}
          disabled={loading}
          className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white py-4 rounded-2xl font-bold text-lg"
        >
          {loading ? "Guardando..." : "Guardar vehículo"}
        </button>
      </section>

      <section className="bg-white rounded-3xl border shadow-sm p-5">
        <h2 className="font-bold text-slate-900 mb-3">
          Vehículos registrados
        </h2>

        {loadingLista ? (
          <p className="text-sm text-slate-500">Cargando vehículos...</p>
        ) : vehiculos.length === 0 ? (
          <p className="text-sm text-slate-500">
            No tiene vehículos registrados.
          </p>
        ) : (
          <div className="space-y-3">
            {vehiculos.map((v) => (
              <div key={v.id} className="border rounded-2xl p-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-blue-700">
                      {v.tipo_vehiculo || "Vehículo"}
                    </p>

                    <h3 className="font-black text-slate-900 text-lg">
                      {v.placa}
                    </h3>

                    <p className="text-sm text-slate-600">
                      {[v.marca, v.modelo].filter(Boolean).join(" ") ||
                        "Sin marca/modelo"}
                    </p>

                    <p className="text-xs text-slate-500">
                      {[v.color, v.anio ? String(v.anio) : ""]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-bold ${
                        v.estado === "Activo"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <BadgeCheck size={14} />
                      {v.estado || "Activo"}
                    </span>

                    <button
                      type="button"
                      onClick={() => eliminarVehiculo(v.id)}
                      className="bg-red-50 text-red-700 rounded-xl p-2"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                {v.observaciones && (
                  <p className="text-sm text-slate-500 mt-3">
                    {v.observaciones}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}