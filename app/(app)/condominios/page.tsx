"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Condominio = {
  id: number;
  nombre: string;
  rnc: string;
  direccion: string;
  telefono: string;
  correo: string;
  cuota_mensual: number;
  porcentaje_mora: number;
  dia_inicio_mora: number;
  estado: string;
  created_at: string;
};

export default function CondominiosPage() {
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [loading, setLoading] = useState(false);

  const [nombre, setNombre] = useState("");
  const [rnc, setRnc] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [cuotaMensual, setCuotaMensual] = useState("");
  const [porcentajeMora, setPorcentajeMora] = useState("5");
  const [diaInicioMora, setDiaInicioMora] = useState("10");

  useEffect(() => {
    cargarCondominios();
  }, []);

  async function cargarCondominios() {
    setLoading(true);

    const { data, error } = await supabase
      .from("condominios")
      .select("*")
      .order("nombre");

    setLoading(false);

    if (error) {
      alert("Error cargando condominios: " + error.message);
      return;
    }

    setCondominios(data || []);
  }

  async function guardarCondominio(e: React.FormEvent) {
    e.preventDefault();

    if (!nombre) {
      alert("Debe escribir el nombre del condominio.");
      return;
    }

    const { error } = await supabase
      .from("condominios")
      .insert([
        {
          client_id: 1,
          nombre,
          rnc,
          direccion,
          telefono,
          correo,
          cuota_mensual: Number(cuotaMensual || 0),
          porcentaje_mora: Number(porcentajeMora || 5),
          dia_inicio_mora: Number(diaInicioMora || 10),
          estado: "activo",
        },
      ]);

    if (error) {
      alert("Error guardando condominio: " + error.message);
      return;
    }

    alert("Condominio registrado correctamente.");

    setNombre("");
    setRnc("");
    setDireccion("");
    setTelefono("");
    setCorreo("");
    setCuotaMensual("");
    setPorcentajeMora("5");
    setDiaInicioMora("10");

    cargarCondominios();
  }

  async function cambiarEstado(
    id: number,
    nuevoEstado: string
  ) {
    const confirmar = confirm(
      `¿Desea cambiar el estado a ${nuevoEstado}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("condominios")
      .update({
        estado: nuevoEstado,
      })
      .eq("id", id);

    if (error) {
      alert("Error actualizando estado.");
      return;
    }

    cargarCondominios();
  }

  const activos = condominios.filter(
    (c) => c.estado === "activo"
  ).length;

  const inactivos = condominios.filter(
    (c) => c.estado !== "activo"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Condominios
        </h1>

        <p className="text-slate-500">
          Configuración multi-condominio del sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total condominios
          </p>

          <h2 className="text-2xl font-bold">
            {condominios.length}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Activos
          </p>

          <h2 className="text-2xl font-bold text-green-700">
            {activos}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Inactivos
          </p>

          <h2 className="text-2xl font-bold text-red-700">
            {inactivos}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">
          Registrar condominio
        </h2>

        <form
          onSubmit={guardarCondominio}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">
              Nombre *
            </label>

            <input
              type="text"
              value={nombre}
              onChange={(e) =>
                setNombre(e.target.value)
              }
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Ej. Lote 9"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              RNC
            </label>

            <input
              type="text"
              value={rnc}
              onChange={(e) =>
                setRnc(e.target.value)
              }
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Teléfono
            </label>

            <input
              type="text"
              value={telefono}
              onChange={(e) =>
                setTelefono(e.target.value)
              }
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Correo
            </label>

            <input
              type="email"
              value={correo}
              onChange={(e) =>
                setCorreo(e.target.value)
              }
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Cuota mensual
            </label>

            <input
              type="number"
              step="0.01"
              value={cuotaMensual}
              onChange={(e) =>
                setCuotaMensual(e.target.value)
              }
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              % Mora
            </label>

            <input
              type="number"
              step="0.01"
              value={porcentajeMora}
              onChange={(e) =>
                setPorcentajeMora(e.target.value)
              }
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Día inicio mora
            </label>

            <input
              type="number"
              value={diaInicioMora}
              onChange={(e) =>
                setDiaInicioMora(e.target.value)
              }
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Dirección
            </label>

            <textarea
              value={direccion}
              onChange={(e) =>
                setDireccion(e.target.value)
              }
              className="border rounded-lg px-3 py-2 w-full"
              rows={3}
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="bg-blue-700 text-white px-5 py-2 rounded-lg hover:bg-blue-800"
            >
              Guardar condominio
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">
          Listado de condominios
        </h2>

        {loading ? (
          <p>Cargando condominios...</p>
        ) : (
          <div className="space-y-4">
            {condominios.map((c) => (
              <div
                key={c.id}
                className="border rounded-2xl p-5"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold">
                      {c.nombre}
                    </h3>

                    <p className="text-sm text-slate-500">
                      {c.direccion || "-"}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
                      <div>
                        <p className="text-slate-500">
                          Cuota mensual
                        </p>

                        <p className="font-bold text-green-700">
                          RD$
                          {Number(
                            c.cuota_mensual || 0
                          ).toLocaleString("es-DO", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-500">
                          % Mora
                        </p>

                        <p className="font-semibold">
                          {c.porcentaje_mora || 0}%
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-500">
                          Día mora
                        </p>

                        <p className="font-semibold">
                          Día {c.dia_inicio_mora || 10}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        c.estado === "activo"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {c.estado}
                    </span>

                    <div className="mt-4">
                      {c.estado === "activo" ? (
                        <button
                          onClick={() =>
                            cambiarEstado(
                              c.id,
                              "inactivo"
                            )
                          }
                          className="bg-red-700 text-white px-4 py-2 rounded-lg"
                        >
                          Inactivar
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            cambiarEstado(
                              c.id,
                              "activo"
                            )
                          }
                          className="bg-green-700 text-white px-4 py-2 rounded-lg"
                        >
                          Activar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {condominios.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                No hay condominios registrados.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}