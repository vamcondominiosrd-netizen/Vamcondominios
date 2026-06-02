"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Condominio = {
  id: number;
  client_id: number;
  nombre: string;
  rnc: string;
  direccion: string;
  telefono: string;
  correo: string;
  cuota_mensual: number;
  porcentaje_mora: number;
  dia_inicio_mora: number;
  estado: string;
  logo_url: string;
  nombre_representante: string;
  cedula_representante: string;
  cargo_representante: string;
  created_at: string;
};

export default function CondominiosPage() {
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [nombre, setNombre] = useState("");
  const [rnc, setRnc] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const [cuotaMensual, setCuotaMensual] = useState("");
  const [porcentajeMora, setPorcentajeMora] = useState("5");
  const [diaInicioMora, setDiaInicioMora] = useState("10");
  const [estado, setEstado] = useState("activo");

  const [nombreRepresentante, setNombreRepresentante] = useState("");
  const [cedulaRepresentante, setCedulaRepresentante] = useState("");
  const [cargoRepresentante, setCargoRepresentante] = useState("");

  useEffect(() => {
    cargarCondominios();
  }, []);

  async function cargarCondominios() {
    setLoading(true);

    const { data, error } = await supabase
      .from("condominios")
      .select("*")
      .order("nombre", { ascending: true });

    setLoading(false);

    if (error) {
      alert("Error cargando condominios: " + error.message);
      return;
    }

    setCondominios((data as Condominio[]) || []);
  }

  function limpiarFormulario() {
    setEditandoId(null);

    setNombre("");
    setRnc("");
    setDireccion("");
    setTelefono("");
    setCorreo("");
    setLogoUrl("");

    setCuotaMensual("");
    setPorcentajeMora("5");
    setDiaInicioMora("10");
    setEstado("activo");

    setNombreRepresentante("");
    setCedulaRepresentante("");
    setCargoRepresentante("");
  }

  function editarCondominio(c: Condominio) {
    setEditandoId(c.id);

    setNombre(c.nombre || "");
    setRnc(c.rnc || "");
    setDireccion(c.direccion || "");
    setTelefono(c.telefono || "");
    setCorreo(c.correo || "");
    setLogoUrl(c.logo_url || "");

    setCuotaMensual(String(c.cuota_mensual || ""));
    setPorcentajeMora(String(c.porcentaje_mora || 5));
    setDiaInicioMora(String(c.dia_inicio_mora || 10));
    setEstado(c.estado || "activo");

    setNombreRepresentante(c.nombre_representante || "");
    setCedulaRepresentante(c.cedula_representante || "");
    setCargoRepresentante(c.cargo_representante || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarCondominio(e: React.FormEvent) {
    e.preventDefault();

    if (!nombre.trim()) {
      alert("Debe escribir el nombre del condominio.");
      return;
    }

    setGuardando(true);

    const registro = {
      client_id: 1,
      nombre: nombre.trim(),
      rnc: rnc.trim(),
      direccion: direccion.trim(),
      telefono: telefono.trim(),
      correo: correo.trim(),
      logo_url: logoUrl.trim(),

      cuota_mensual: Number(cuotaMensual || 0),
      porcentaje_mora: Number(porcentajeMora || 5),
      dia_inicio_mora: Number(diaInicioMora || 10),
      estado,

      nombre_representante: nombreRepresentante.trim(),
      cedula_representante: cedulaRepresentante.trim(),
      cargo_representante: cargoRepresentante.trim(),
    };

    if (editandoId) {
      const { error } = await supabase
        .from("condominios")
        .update(registro)
        .eq("id", editandoId);

      setGuardando(false);

      if (error) {
        alert("Error actualizando condominio: " + error.message);
        return;
      }

      alert("Condominio actualizado correctamente.");
      limpiarFormulario();
      cargarCondominios();
      return;
    }

    const { error } = await supabase.from("condominios").insert([registro]);

    setGuardando(false);

    if (error) {
      alert("Error guardando condominio: " + error.message);
      return;
    }

    alert("Condominio registrado correctamente.");
    limpiarFormulario();
    cargarCondominios();
  }

  async function cambiarEstado(id: number, nuevoEstado: string) {
    const confirmar = confirm(`¿Desea cambiar el estado a ${nuevoEstado}?`);

    if (!confirmar) return;

    const { error } = await supabase
      .from("condominios")
      .update({
        estado: nuevoEstado,
      })
      .eq("id", id);

    if (error) {
      alert("Error actualizando estado: " + error.message);
      return;
    }

    cargarCondominios();
  }

  const activos = condominios.filter((c) => c.estado === "activo").length;
  const inactivos = condominios.filter((c) => c.estado !== "activo").length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">Condominios</h1>

        <p className="text-slate-500 mt-2">
          Configuración general, financiera y legal de cada condominio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Total condominios</p>
          <h2 className="text-3xl font-black">{condominios.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Activos</p>
          <h2 className="text-3xl font-black text-green-700">{activos}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Inactivos</p>
          <h2 className="text-3xl font-black text-red-700">{inactivos}</h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border">
        <h2 className="text-xl font-black mb-4">
          {editandoId ? "Modificar condominio" : "Registrar condominio"}
        </h2>

        <form
          onSubmit={guardarCondominio}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="md:col-span-2">
            <h3 className="font-black text-slate-800 border-b pb-2">
              Datos generales
            </h3>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Nombre *</label>

            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Ej. Condominio Residencial Colinas del Oeste Lote 9"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">RNC</label>

            <input
              type="text"
              value={rnc}
              onChange={(e) => setRnc(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="RNC del condominio"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Teléfono</label>

            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Teléfono"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Correo</label>

            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              URL del logo
            </label>

            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="https://..."
            />

            {logoUrl && (
              <div className="mt-3">
                <img
                  src={logoUrl}
                  alt="Logo condominio"
                  className="h-20 object-contain border rounded-xl p-2 bg-white"
                />
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Dirección
            </label>

            <textarea
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              rows={3}
              placeholder="Dirección completa del condominio"
            />
          </div>

          <div className="md:col-span-2 mt-4">
            <h3 className="font-black text-slate-800 border-b pb-2">
              Datos financieros
            </h3>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Cuota mensual RD$
            </label>

            <input
              type="number"
              step="0.01"
              value={cuotaMensual}
              onChange={(e) => setCuotaMensual(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">% Mora</label>

            <input
              type="number"
              step="0.01"
              value={porcentajeMora}
              onChange={(e) => setPorcentajeMora(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="5"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Día inicio mora
            </label>

            <input
              type="number"
              value={diaInicioMora}
              onChange={(e) => setDiaInicioMora(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="10"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div className="md:col-span-2 mt-4">
            <h3 className="font-black text-slate-800 border-b pb-2">
              Representante para contratos
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Estos datos se utilizarán automáticamente para generar contratos
              de empleados.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Nombre del representante
            </label>

            <input
              type="text"
              value={nombreRepresentante}
              onChange={(e) => setNombreRepresentante(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Nombre del administrador o representante"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Cédula del representante
            </label>

            <input
              type="text"
              value={cedulaRepresentante}
              onChange={(e) => setCedulaRepresentante(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="000-0000000-0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Cargo del representante
            </label>

            <input
              type="text"
              value={cargoRepresentante}
              onChange={(e) => setCargoRepresentante(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Administrador / Presidente / Representante"
            />
          </div>

          <div className="md:col-span-2 flex flex-col md:flex-row gap-3 mt-3">
            <button
              type="submit"
              disabled={guardando}
              className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-5 py-3 rounded-xl font-bold"
            >
              {guardando
                ? "Guardando..."
                : editandoId
                ? "Guardar cambios"
                : "Guardar condominio"}
            </button>

            {editandoId && (
              <button
                type="button"
                onClick={limpiarFormulario}
                className="bg-slate-600 hover:bg-slate-700 text-white px-5 py-3 rounded-xl font-bold"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border">
        <h2 className="text-xl font-black mb-4">Listado de condominios</h2>

        {loading ? (
          <p>Cargando condominios...</p>
        ) : (
          <div className="space-y-4">
            {condominios.map((c) => (
              <div key={c.id} className="border rounded-2xl p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex gap-4">
                    {c.logo_url ? (
                      <img
                        src={c.logo_url}
                        alt={c.nombre}
                        className="h-20 w-20 object-contain border rounded-2xl p-2 bg-white"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-2xl bg-slate-100 border flex items-center justify-center text-slate-400 text-xs">
                        Sin logo
                      </div>
                    )}

                    <div>
                      <h3 className="text-xl font-black">{c.nombre}</h3>

                      <p className="text-sm text-slate-500">
                        {c.direccion || "-"}
                      </p>

                      <p className="text-sm text-slate-500 mt-1">
                        RNC: {c.rnc || "-"} · Tel: {c.telefono || "-"} · Correo:{" "}
                        {c.correo || "-"}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
                        <div>
                          <p className="text-slate-500">Cuota mensual</p>

                          <p className="font-bold text-green-700">
                            RD$
                            {Number(c.cuota_mensual || 0).toLocaleString(
                              "es-DO",
                              {
                                minimumFractionDigits: 2,
                              }
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500">% Mora</p>

                          <p className="font-semibold">
                            {c.porcentaje_mora || 0}%
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500">Día mora</p>

                          <p className="font-semibold">
                            Día {c.dia_inicio_mora || 10}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 bg-slate-50 border rounded-xl p-3 text-sm">
                        <p className="font-bold text-slate-800">
                          Representante contratos
                        </p>

                        <p className="text-slate-600">
                          {c.nombre_representante || "-"} · Cédula:{" "}
                          {c.cedula_representante || "-"} · Cargo:{" "}
                          {c.cargo_representante || "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right min-w-[160px]">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        c.estado === "activo"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {c.estado}
                    </span>

                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        onClick={() => editarCondominio(c)}
                        className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold"
                      >
                        Editar
                      </button>

                      {c.estado === "activo" ? (
                        <button
                          onClick={() => cambiarEstado(c.id, "inactivo")}
                          className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg text-sm font-bold"
                        >
                          Inactivar
                        </button>
                      ) : (
                        <button
                          onClick={() => cambiarEstado(c.id, "activo")}
                          className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-bold"
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