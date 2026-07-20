"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type UnidadRow = {
  id: number;
  condominio_id: number;
  codigo: string;
  propietario_nombre: string;
  activa: boolean;
};

type AliasRow = {
  id: number;
  condominio_id: number;
  unidad_id: number | null;
  no_apartamento: string;
  propietario: string | null;
  descripcion_banco: string;
  estado: string | null;
};

function limpiarTexto(value: any) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export default function MobileAliasApartamentosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [unidades, setUnidades] = useState<UnidadRow[]>([]);
  const [aliasRows, setAliasRows] = useState<AliasRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Activo");

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [unidadId, setUnidadId] = useState("");
  const [noApartamento, setNoApartamento] = useState("");
  const [propietario, setPropietario] = useState("");
  const [descripcionBanco, setDescripcionBanco] = useState("");
  const [estado, setEstado] = useState("Activo");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarDatos(id);
    } else {
      setLoading(false);
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
    }
  }, []);

  async function cargarDatos(id: string) {
    setLoading(true);

    const { data: unidadesData, error: unidadesError } = await supabase
      .from("unidades")
      .select("id, condominio_id, codigo, propietario_nombre, activa")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo", { ascending: true });

    if (unidadesError) {
      setLoading(false);
      alert("Error cargando unidades: " + unidadesError.message);
      return;
    }

    const { data: aliasData, error: aliasError } = await supabase
      .from("apartamento_banco_alias")
      .select(
        "id, condominio_id, unidad_id, no_apartamento, propietario, descripcion_banco, estado"
      )
      .eq("condominio_id", Number(id))
      .order("no_apartamento", { ascending: true })
      .order("id", { ascending: false });

    if (aliasError) {
      setLoading(false);
      alert("Error cargando alias de apartamentos: " + aliasError.message);
      return;
    }

    setUnidades((unidadesData as UnidadRow[]) || []);
    setAliasRows((aliasData as AliasRow[]) || []);
    setLoading(false);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setUnidadId("");
    setNoApartamento("");
    setPropietario("");
    setDescripcionBanco("");
    setEstado("Activo");
  }

  function seleccionarUnidad(id: string) {
    setUnidadId(id);

    if (!id) {
      setNoApartamento("");
      setPropietario("");
      return;
    }

    const unidad = unidades.find((item) => String(item.id) === id);

    if (!unidad) {
      setNoApartamento("");
      setPropietario("");
      return;
    }

    setNoApartamento(unidad.codigo || "");
    setPropietario(unidad.propietario_nombre || "");
  }

  function editarAlias(item: AliasRow) {
    setEditandoId(item.id);
    setUnidadId(item.unidad_id ? String(item.unidad_id) : "");
    setNoApartamento(item.no_apartamento || "");
    setPropietario(item.propietario || "");
    setDescripcionBanco(item.descripcion_banco || "");
    setEstado(item.estado || "Activo");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarAlias(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!noApartamento || !descripcionBanco) {
      alert("Debe completar el apartamento y la descripción bancaria.");
      return;
    }

    const payload = {
      condominio_id: Number(condominioId),
      unidad_id: unidadId ? Number(unidadId) : null,
      no_apartamento: limpiarTexto(noApartamento),
      propietario: limpiarTexto(propietario),
      descripcion_banco: limpiarTexto(descripcionBanco),
      estado,
    };

    setGuardando(true);

    if (editandoId) {
      const { error } = await supabase
        .from("apartamento_banco_alias")
        .update(payload)
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      setGuardando(false);

      if (error) {
        alert("Error actualizando alias: " + error.message);
        return;
      }

      alert("Alias actualizado correctamente.");
    } else {
      const { error } = await supabase
        .from("apartamento_banco_alias")
        .insert([payload]);

      setGuardando(false);

      if (error) {
        alert("Error guardando alias: " + error.message);
        return;
      }

      alert("Alias registrado correctamente.");
    }

    limpiarFormulario();
    cargarDatos(condominioId);
  }

  async function cambiarEstadoAlias(item: AliasRow) {
    if (!condominioId) return;

    const nuevoEstado = item.estado === "Activo" ? "Inactivo" : "Activo";

    const confirmar = confirm(
      `Se cambiará el alias del apartamento ${item.no_apartamento} a estado ${nuevoEstado}. ¿Desea continuar?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("apartamento_banco_alias")
      .update({ estado: nuevoEstado })
      .eq("id", item.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error cambiando estado: " + error.message);
      return;
    }

    cargarDatos(condominioId);
  }

  const aliasFiltrados = aliasRows.filter((item) => {
    const texto = `${item.no_apartamento || ""} ${item.propietario || ""} ${
      item.descripcion_banco || ""
    } ${item.estado || ""}`
      .toLowerCase()
      .trim();

    const coincideBusqueda = texto.includes(busqueda.toLowerCase().trim());

    const coincideEstado =
      filtroEstado === "Todos" ? true : (item.estado || "Activo") === filtroEstado;

    return coincideBusqueda && coincideEstado;
  });

  const totalActivos = aliasRows.filter(
    (item) => (item.estado || "Activo") === "Activo"
  ).length;

  const totalInactivos = aliasRows.filter(
    (item) => item.estado === "Inactivo"
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-orange-600 text-white rounded-b-3xl p-5 shadow-md">
        <Link href="/mobile/admin/banco" className="text-sm opacity-90">
          ← Volver a Banco
        </Link>

        <h1 className="text-2xl font-black mt-3">
          Alias Apartamentos
        </h1>

        <p className="text-sm opacity-90 mt-1">
          {condominioNombre || "Condominio no identificado"}
        </p>

        <p className="text-sm opacity-90 mt-2">
          Registra las descripciones usadas por el banco para identificar cada apartamento.
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-slate-500">Total</p>
            <h2 className="text-2xl font-black">{aliasRows.length}</h2>
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-slate-500">Activos</p>
            <h2 className="text-2xl font-black text-green-700">
              {totalActivos}
            </h2>
          </div>

          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-slate-500">Inactivos</p>
            <h2 className="text-2xl font-black text-red-700">
              {totalInactivos}
            </h2>
          </div>
        </div>

        <form
          onSubmit={guardarAlias}
          className="bg-white border rounded-2xl p-4 shadow-sm space-y-3"
        >
          <div>
            <h2 className="font-black text-slate-900">
              {editandoId ? "Editar alias" : "Nuevo alias"}
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              El alias ayuda al sistema a identificar automáticamente los pagos.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Apartamento
            </label>

            <select
              value={unidadId}
              onChange={(e) => seleccionarUnidad(e.target.value)}
              className="w-full border rounded-xl px-3 py-3 bg-white"
            >
              <option value="">Seleccione apartamento</option>

              {unidades.map((unidad) => (
                <option key={unidad.id} value={unidad.id}>
                  {unidad.codigo} - {unidad.propietario_nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              No. Apartamento *
            </label>

            <input
              value={noApartamento}
              onChange={(e) => setNoApartamento(e.target.value)}
              className="w-full border rounded-xl px-3 py-3"
              placeholder="Ej. A1, B2, G4"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Propietario
            </label>

            <input
              value={propietario}
              onChange={(e) => setPropietario(e.target.value)}
              className="w-full border rounded-xl px-3 py-3"
              placeholder="Nombre del propietario"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Descripción bancaria / alias *
            </label>

            <textarea
              value={descripcionBanco}
              onChange={(e) => setDescripcionBanco(e.target.value)}
              className="w-full border rounded-xl px-3 py-3"
              rows={3}
              placeholder="Ej. PAGO MANT A1, JUAN PEREZ A1, TRANSF APTO A1"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Estado
            </label>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full border rounded-xl px-3 py-3 bg-white"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="submit"
              disabled={guardando}
              className="bg-orange-600 text-white py-3 rounded-xl font-bold disabled:opacity-50"
            >
              {guardando ? "Guardando..." : editandoId ? "Actualizar" : "Guardar"}
            </button>

            <button
              type="button"
              onClick={limpiarFormulario}
              className="bg-slate-700 text-white py-3 rounded-xl font-bold"
            >
              Limpiar
            </button>
          </div>
        </form>

        <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Estado
            </label>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full border rounded-xl px-3 py-3 bg-white"
            >
              <option value="Todos">Todos</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Buscar
            </label>

            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full border rounded-xl px-3 py-3"
              placeholder="Apartamento, propietario o descripción..."
            />
          </div>

          <button
            onClick={() => cargarDatos(condominioId)}
            className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold"
          >
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            Cargando alias...
          </div>
        ) : (
          <div className="space-y-3">
            {aliasFiltrados.map((item) => (
              <div
                key={item.id}
                className="bg-white border rounded-2xl p-4 shadow-sm"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Apartamento</p>
                    <h2 className="text-xl font-black text-slate-900">
                      {item.no_apartamento || "-"}
                    </h2>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-500">Estado</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        item.estado === "Inactivo"
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {item.estado || "Activo"}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-xs text-slate-500">Propietario</p>
                  <p className="font-semibold">
                    {item.propietario || "-"}
                  </p>
                </div>

                <div className="mt-3">
                  <p className="text-xs text-slate-500">Alias banco</p>
                  <p className="text-sm font-semibold">
                    {item.descripcion_banco || "-"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    onClick={() => editarAlias(item)}
                    className="bg-blue-700 text-white py-2 rounded-xl text-sm font-bold"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => cambiarEstadoAlias(item)}
                    className={`py-2 rounded-xl text-sm font-bold text-white ${
                      item.estado === "Inactivo"
                        ? "bg-green-700"
                        : "bg-red-700"
                    }`}
                  >
                    {item.estado === "Inactivo" ? "Activar" : "Inactivar"}
                  </button>
                </div>
              </div>
            ))}

            {aliasFiltrados.length === 0 && (
              <div className="bg-white border rounded-2xl p-6 text-center text-slate-500 shadow-sm">
                No hay alias registrados para esta consulta.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}