"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, RefreshCw, XCircle } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type MotivoRechazo = {
  id: number;
  condominio_id: number | null;
  condominio: string | null;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
};

export default function MotivosRechazoPage() {
  const [motivos, setMotivos] = useState<MotivoRechazo[]>([]);
  const [loading, setLoading] = useState(true);

  const [condominioId, setCondominioId] = useState<number>(0);
  const [condominioNombre, setCondominioNombre] = useState<string>("");

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

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

  async function cargarMotivos() {
    setLoading(true);

    const { id } = cargarCondominioActivo();

    if (!id) {
      setMotivos([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("autorizaciones_motivos_rechazo")
      .select(
        "id, condominio_id, condominio, codigo, nombre, descripcion, activo"
      )
      .or(`condominio_id.eq.${id},condominio_id.is.null`)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error cargando motivos de rechazo:", error);
      alert("Error cargando motivos de rechazo");
    } else {
      setMotivos(data || []);
    }

    setLoading(false);
  }

  async function guardarMotivo(e: React.FormEvent) {
    e.preventDefault();

    if (!codigo.trim() || !nombre.trim()) {
      alert("Debe completar código y nombre.");
      return;
    }

    const { id, nombreActivo } = cargarCondominioActivo();

    if (!id) {
      alert("No se encontró el condominio activo. Cierre sesión e ingrese nuevamente.");
      return;
    }

    const { error } = await supabase
      .from("autorizaciones_motivos_rechazo")
      .insert({
        condominio_id: id,
        condominio: nombreActivo || null,
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        activo: true,
      });

    if (error) {
      console.error("Error guardando motivo:", error);
      alert("Error guardando motivo de rechazo");
      return;
    }

    setCodigo("");
    setNombre("");
    setDescripcion("");

    await cargarMotivos();
  }

  async function cambiarEstado(id: number, activo: boolean) {
    const { error } = await supabase
      .from("autorizaciones_motivos_rechazo")
      .update({ activo: !activo })
      .eq("id", id);

    if (error) {
      console.error("Error actualizando estado:", error);
      alert("Error actualizando estado");
      return;
    }

    await cargarMotivos();
  }

  useEffect(() => {
    cargarMotivos();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/autorizaciones/catalogos"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a catálogos
            </Link>

            <h1 className="mt-3 text-2xl font-bold text-slate-900">
              Motivos de Rechazo
            </h1>
            <p className="text-sm text-slate-500">
              Condominio activo:{" "}
              <span className="font-semibold text-slate-800">
                {condominioNombre || "No detectado"}
              </span>
            </p>
          </div>

          <button
            onClick={cargarMotivos}
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
            Refrescar
          </button>
        </div>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-red-100 p-3 text-red-700">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">
                Nuevo motivo de rechazo
              </h2>
              <p className="text-sm text-slate-500">
                Registra motivos específicos para el condominio logeado.
              </p>
            </div>
          </div>

          <form onSubmit={guardarMotivo} className="grid gap-4 md:grid-cols-3">
            <Input
              label="Código"
              value={codigo}
              onChange={setCodigo}
              placeholder="Ej: DEUDA"
            />

            <Input
              label="Nombre"
              value={nombre}
              onChange={setNombre}
              placeholder="Ej: Propietario con deuda"
            />

            <Input
              label="Descripción"
              value={descripcion}
              onChange={setDescripcion}
              placeholder="Opcional"
            />

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-blue-700 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-blue-800"
              >
                Guardar Motivo
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">
                  Listado de motivos
                </h2>
                <p className="text-sm text-slate-500">
                  Total registrados: {motivos.length}
                </p>
              </div>
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
                    <td
                      colSpan={6}
                      className="px-5 py-8 text-center text-slate-500"
                    >
                      Cargando motivos...
                    </td>
                  </tr>
                ) : motivos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-8 text-center text-slate-500"
                    >
                      No hay motivos registrados para este condominio.
                    </td>
                  </tr>
                ) : (
                  motivos.map((motivo) => (
                    <tr key={motivo.id} className="border-t">
                      <td className="px-5 py-3 font-semibold text-slate-900">
                        {motivo.codigo}
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {motivo.nombre}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {motivo.descripcion || "-"}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {motivo.condominio_id ? motivo.condominio : "General"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            motivo.activo
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {motivo.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => cambiarEstado(motivo.id, motivo.activo)}
                          className="rounded-xl border px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {motivo.activo ? "Desactivar" : "Activar"}
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

function Input({
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
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
    </div>
  );
}