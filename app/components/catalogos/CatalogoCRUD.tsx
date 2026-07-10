"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Registro = {
  id: number;
  condominio_id: number | null;
  condominio: string | null;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
};

export default function CatalogoCRUD({
  tabla,
  titulo,
  descripcion,
  volverHref,
  icono: Icon,
}: {
  tabla: string;
  titulo: string;
  descripcion: string;
  volverHref: string;
  icono: any;
}) {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [condominioId, setCondominioId] = useState(0);
  const [condominioNombre, setCondominioNombre] = useState("");

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [detalle, setDetalle] = useState("");

  function cargarCondominioActivo() {
    const id = Number(
      localStorage.getItem("condominio_id") ||
        localStorage.getItem("condominioId") ||
        0
    );

    const nombreActivo =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominioNombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombreActivo);

    return { id, nombreActivo };
  }

  async function cargarRegistros() {
    setLoading(true);

    const { id } = cargarCondominioActivo();

    if (!id) {
      setRegistros([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from(tabla)
      .select("id, condominio_id, condominio, codigo, nombre, descripcion, activo")
      .or(`condominio_id.eq.${id},condominio_id.is.null`)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error cargando catálogo:", error);
      alert("Error cargando catálogo");
    } else {
      setRegistros(data || []);
    }

    setLoading(false);
  }

  async function guardarRegistro(e: React.FormEvent) {
    e.preventDefault();

    if (!codigo.trim() || !nombre.trim()) {
      alert("Debe completar código y nombre.");
      return;
    }

    const { id, nombreActivo } = cargarCondominioActivo();

    if (!id) {
      alert("No se encontró el condominio activo.");
      return;
    }

    const { error } = await supabase.from(tabla).insert({
      condominio_id: id,
      condominio: nombreActivo || null,
      codigo: codigo.trim().toUpperCase(),
      nombre: nombre.trim(),
      descripcion: detalle.trim() || null,
      activo: true,
    });

    if (error) {
      console.error("Error guardando registro:", error);
      alert("Error guardando registro");
      return;
    }

    setCodigo("");
    setNombre("");
    setDetalle("");

    await cargarRegistros();
  }

  async function cambiarEstado(id: number, activo: boolean) {
    const { error } = await supabase
      .from(tabla)
      .update({ activo: !activo })
      .eq("id", id);

    if (error) {
      console.error("Error actualizando estado:", error);
      alert("Error actualizando estado");
      return;
    }

    await cargarRegistros();
  }

  useEffect(() => {
    cargarRegistros();
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    if (!q) return registros;

    return registros.filter(
      (r) =>
        r.codigo?.toLowerCase().includes(q) ||
        r.nombre?.toLowerCase().includes(q) ||
        r.descripcion?.toLowerCase().includes(q)
    );
  }, [busqueda, registros]);

  const activos = registros.filter((r) => r.activo).length;
  const inactivos = registros.length - activos;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href={volverHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>

            <h1 className="mt-3 text-2xl font-bold text-slate-900">
              {titulo}
            </h1>

            <p className="text-sm text-slate-500">{descripcion}</p>

            <p className="mt-1 text-sm text-slate-500">
              Condominio activo:{" "}
              <span className="font-semibold text-slate-800">
                {condominioNombre || "No detectado"}
              </span>
            </p>
          </div>

          <button
            onClick={cargarRegistros}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
            Refrescar
          </button>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <Card titulo="Total" valor={registros.length} />
          <Card titulo="Activos" valor={activos} />
          <Card titulo="Inactivos" valor={inactivos} />
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
              <Plus className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">Nuevo registro</h2>
              <p className="text-sm text-slate-500">
                Se guardará en el condominio activo.
              </p>
            </div>
          </div>

          <form onSubmit={guardarRegistro} className="grid gap-4 md:grid-cols-3">
            <Input label="Código" value={codigo} onChange={setCodigo} />
            <Input label="Nombre" value={nombre} onChange={setNombre} />
            <Input label="Descripción" value={detalle} onChange={setDetalle} />

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-blue-700 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-blue-800"
              >
                Guardar
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <Icon className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">Listado</h2>
                <p className="text-sm text-slate-500">
                  Total registros: {filtrados.length}
                </p>
              </div>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar..."
                className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-5 py-3">Código</th>
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">Descripción</th>
                  <th className="px-5 py-3">Condominio</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acción</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                      Cargando...
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                      No hay registros.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-5 py-3 font-semibold text-slate-900">
                        {item.codigo}
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {item.nombre}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {item.descripcion || "-"}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {item.condominio_id ? item.condominio : "General"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.activo
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => cambiarEstado(item.id, item.activo)}
                          className="rounded-xl border px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {item.activo ? "Desactivar" : "Activar"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{valor}</p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
    </div>
  );
}