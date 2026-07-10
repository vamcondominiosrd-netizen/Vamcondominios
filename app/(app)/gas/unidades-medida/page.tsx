"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type UnidadMedidaGas = {
  id: number;
  condominio_id: number;
  nombre: string;
  abreviatura: string | null;
  estado: string | null;
  created_at: string | null;
};

export default function GasUnidadesMedidaPage() {
  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [unidades, setUnidades] = useState<UnidadMedidaGas[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [abreviatura, setAbreviatura] = useState("");
  const [estado, setEstado] = useState("Activo");
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    iniciarModulo();
  }, []);

  function leerCondominioLocal(): number | null {
    if (typeof window === "undefined") return null;

    const posiblesKeys = [
      "condominio_id",
      "condominioId",
      "activeCondominioId",
      "condominio_activo_id",
    ];

    for (const key of posiblesKeys) {
      const valor = window.localStorage.getItem(key);
      const numero = valor ? Number(valor) : NaN;

      if (Number.isFinite(numero) && numero > 0) {
        return numero;
      }
    }

    return null;
  }

  async function obtenerCondominioActivo(): Promise<number | null> {
    const localId = leerCondominioLocal();

    if (localId) {
      return localId;
    }

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    if (!userId) {
      return null;
    }

    const { data: perfil } = await supabase
      .from("profiles")
      .select("condominio_id")
      .eq("id", userId)
      .maybeSingle();

    const perfilCondominioId = Number(perfil?.condominio_id || 0);

    if (perfilCondominioId > 0) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("condominio_id", String(perfilCondominioId));
      }

      return perfilCondominioId;
    }

    return null;
  }

  async function iniciarModulo() {
    setLoading(true);
    setMensaje("");

    const id = await obtenerCondominioActivo();

    if (!id) {
      setMensaje(
        "No se pudo identificar el condominio activo. Revisa el perfil del usuario o el condominio seleccionado."
      );
      setLoading(false);
      return;
    }

    setCondominioId(id);
    await cargarUnidades(id);
    setLoading(false);
  }

  async function cargarUnidades(idParam?: number) {
    const id = idParam || condominioId;

    if (!id) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("gas_unidades_medida")
      .select("id, condominio_id, nombre, abreviatura, estado, created_at")
      .eq("condominio_id", id)
      .order("nombre", { ascending: true });

    if (error) {
      setMensaje("Error cargando unidades de medida: " + error.message);
      setLoading(false);
      return;
    }

    setUnidades((data as UnidadMedidaGas[]) || []);
    setLoading(false);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setNombre("");
    setAbreviatura("");
    setEstado("Activo");
  }

  function editarUnidad(unidad: UnidadMedidaGas) {
    setEditandoId(unidad.id);
    setNombre(unidad.nombre || "");
    setAbreviatura(unidad.abreviatura || "");
    setEstado(unidad.estado || "Activo");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function validarNombreDuplicado(
    nombreFinal: string,
    idActual?: number | null
  ) {
    if (!condominioId) return false;

    const { data, error } = await supabase
      .from("gas_unidades_medida")
      .select("id")
      .eq("condominio_id", condominioId)
      .ilike("nombre", nombreFinal);

    if (error) {
      console.error("Error validando duplicado:", error.message);
      return false;
    }

    const registros = data || [];

    return registros.some((item) => item.id !== idActual);
  }

  async function guardarUnidad(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const id = condominioId || (await obtenerCondominioActivo());

    if (!id) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!condominioId) {
      setCondominioId(id);
    }

    const nombreFinal = nombre.trim();
    const abreviaturaFinal = abreviatura.trim().toUpperCase();

    if (!nombreFinal) {
      alert("Debe indicar el nombre de la unidad de medida.");
      return;
    }

    setLoading(true);
    setMensaje("");

    const existeDuplicado = await validarNombreDuplicado(
      nombreFinal,
      editandoId
    );

    if (existeDuplicado) {
      alert("Ya existe una unidad de medida con ese nombre en este condominio.");
      setLoading(false);
      return;
    }

    if (editandoId) {
      const { error } = await supabase
        .from("gas_unidades_medida")
        .update({
          nombre: nombreFinal,
          abreviatura: abreviaturaFinal || null,
          estado,
        })
        .eq("id", editandoId)
        .eq("condominio_id", id);

      if (error) {
        alert("Error actualizando unidad: " + error.message);
        setLoading(false);
        return;
      }

      alert("Unidad actualizada correctamente.");
    } else {
      const { error } = await supabase.from("gas_unidades_medida").insert([
        {
          condominio_id: id,
          nombre: nombreFinal,
          abreviatura: abreviaturaFinal || null,
          estado,
        },
      ]);

      if (error) {
        alert("Error creando unidad: " + error.message);
        setLoading(false);
        return;
      }

      alert("Unidad creada correctamente.");
    }

    limpiarFormulario();
    await cargarUnidades(id);
    setLoading(false);
  }

  async function cambiarEstado(unidad: UnidadMedidaGas) {
    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

    const nuevoEstado = unidad.estado === "Activo" ? "Inactivo" : "Activo";

    const confirmar = confirm(
      `¿Desea cambiar la unidad "${unidad.nombre}" a estado ${nuevoEstado}?`
    );

    if (!confirmar) return;

    setLoading(true);

    const { error } = await supabase
      .from("gas_unidades_medida")
      .update({ estado: nuevoEstado })
      .eq("id", unidad.id)
      .eq("condominio_id", condominioId);

    if (error) {
      alert("Error cambiando estado: " + error.message);
      setLoading(false);
      return;
    }

    await cargarUnidades(condominioId);
    setLoading(false);
  }

  const unidadesFiltradas = useMemo(() => {
    const texto = buscar.toLowerCase().trim();

    if (!texto) return unidades;

    return unidades.filter((u) => {
      const cadena = `${u.nombre || ""} ${u.abreviatura || ""} ${
        u.estado || ""
      }`.toLowerCase();

      return cadena.includes(texto);
    });
  }, [unidades, buscar]);

  const totalActivas = unidades.filter((u) => u.estado === "Activo").length;
  const totalInactivas = unidades.filter((u) => u.estado !== "Activo").length;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-purple-700 uppercase tracking-wide">
                Módulo de Gas
              </p>

              <h1 className="text-3xl font-black text-slate-900 mt-1">
                Unidades de Medida
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Catálogo de unidades usadas para registrar la recepción de gas.
                Esta pantalla trabaja únicamente con el condominio activo.
              </p>

              {condominioId && (
                <p className="text-xs text-slate-400 mt-2">
                  Condominio activo ID:{" "}
                  <span className="font-bold">{condominioId}</span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/gas"
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold"
              >
                Volver a Gas
              </Link>

              <button
                type="button"
                onClick={() => cargarUnidades()}
                disabled={loading || !condominioId}
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl font-bold disabled:opacity-60"
              >
                Actualizar
              </button>
            </div>
          </div>
        </section>

        {mensaje && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-bold">
            {mensaje}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Total unidades</p>
            <h2 className="text-3xl font-black text-slate-900">
              {unidades.length}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Activas</p>
            <h2 className="text-3xl font-black text-green-700">
              {totalActivas}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm text-slate-500">Inactivas</p>
            <h2 className="text-3xl font-black text-red-700">
              {totalInactivas}
            </h2>
          </div>
        </section>

        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <h2 className="text-xl font-black text-slate-900 mb-4">
            {editandoId ? "Editar unidad" : "Nueva unidad"}
          </h2>

          <form
            onSubmit={guardarUnidad}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
          >
            <div>
              <label className="block text-sm font-semibold mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Ej. Galones"
                disabled={!condominioId}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Abreviatura
              </label>
              <input
                type="text"
                value={abreviatura}
                onChange={(e) => setAbreviatura(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full uppercase"
                placeholder="Ej. GLS"
                disabled={!condominioId}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Estado
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
                disabled={!condominioId}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading || !condominioId}
                className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-3 rounded-xl font-bold disabled:opacity-60"
              >
                {editandoId ? "Actualizar" : "Guardar"}
              </button>

              {editandoId && (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 border px-5 py-3 rounded-xl font-bold"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Listado de unidades
              </h2>
              <p className="text-sm text-slate-500">
                Solo se muestran las unidades del condominio activo.
              </p>
            </div>

            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full md:w-80"
              placeholder="Buscar unidad..."
            />
          </div>

          <div className="overflow-auto border rounded-2xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">ID</th>
                  <th className="p-3 border text-left">Nombre</th>
                  <th className="p-3 border text-left">Abreviatura</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {unidadesFiltradas.map((unidad) => (
                  <tr key={unidad.id} className="hover:bg-slate-50">
                    <td className="p-3 border font-bold">{unidad.id}</td>

                    <td className="p-3 border">{unidad.nombre}</td>

                    <td className="p-3 border">
                      {unidad.abreviatura || "-"}
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          unidad.estado === "Activo"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {unidad.estado || "Sin estado"}
                      </span>
                    </td>

                    <td className="p-3 border text-center">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => editarUnidad(unidad)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-lg text-xs font-bold"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => cambiarEstado(unidad)}
                          className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1 rounded-lg text-xs font-bold"
                        >
                          {unidad.estado === "Activo"
                            ? "Inactivar"
                            : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {unidadesFiltradas.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-6 border text-center text-slate-500"
                    >
                      {loading
                        ? "Cargando unidades..."
                        : "No hay unidades registradas para este condominio."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}