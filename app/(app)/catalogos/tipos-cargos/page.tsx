"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type TipoCargo = {
  id: number;
  condominio_id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  afecta_mantenimiento: boolean;
  genera_mora: boolean;
  estado: string;
  created_at: string;
};

export default function TiposCargosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [tipos, setTipos] = useState<TipoCargo[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [afectaMantenimiento, setAfectaMantenimiento] = useState(false);
  const [generaMora, setGeneraMora] = useState(false);
  const [estado, setEstado] = useState("ACTIVO");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombreCondominio = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombreCondominio);

    if (!id) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    cargarTipos(id);
  }, []);

  async function cargarTipos(id: string) {
    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("tipos_cargos")
      .select(
        "id, condominio_id, codigo, nombre, descripcion, afecta_mantenimiento, genera_mora, estado, created_at"
      )
      .eq("condominio_id", Number(id))
      .order("codigo", { ascending: true });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando tipos de cargos: " + error.message);
      return;
    }

    setTipos((data as TipoCargo[]) || []);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setCodigo("");
    setNombre("");
    setDescripcion("");
    setAfectaMantenimiento(false);
    setGeneraMora(false);
    setEstado("ACTIVO");
  }

  async function guardarTipo(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    if (!codigo.trim()) {
      setMensaje("Debe indicar el código del tipo de cargo.");
      return;
    }

    if (!nombre.trim()) {
      setMensaje("Debe indicar el nombre del tipo de cargo.");
      return;
    }

    const codigoFinal = codigo.trim().toUpperCase().replace(/\s+/g, "_");

    setGuardando(true);
    setMensaje("");

    const registro = {
      condominio_id: Number(condominioId),
      codigo: codigoFinal,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      afecta_mantenimiento: afectaMantenimiento,
      genera_mora: generaMora,
      estado,
    };

    let error;

    if (editandoId) {
      const respuesta = await supabase
        .from("tipos_cargos")
        .update(registro)
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      error = respuesta.error;
    } else {
      const respuesta = await supabase.from("tipos_cargos").insert([registro]);
      error = respuesta.error;
    }

    setGuardando(false);

    if (error) {
      setMensaje("Error guardando tipo de cargo: " + error.message);
      return;
    }

    setMensaje(
      editandoId
        ? "Tipo de cargo actualizado correctamente."
        : "Tipo de cargo registrado correctamente."
    );

    limpiarFormulario();
    cargarTipos(condominioId);
  }

  function cargarParaEditar(item: TipoCargo) {
    setEditandoId(item.id);
    setCodigo(item.codigo || "");
    setNombre(item.nombre || "");
    setDescripcion(item.descripcion || "");
    setAfectaMantenimiento(Boolean(item.afecta_mantenimiento));
    setGeneraMora(Boolean(item.genera_mora));
    setEstado(item.estado || "ACTIVO");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function cambiarEstado(item: TipoCargo) {
    const nuevoEstado = item.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";

    const confirmar = confirm(
      `¿Desea cambiar el tipo de cargo "${item.nombre}" a ${nuevoEstado}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("tipos_cargos")
      .update({
        estado: nuevoEstado,
      })
      .eq("id", item.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      setMensaje("Error cambiando estado: " + error.message);
      return;
    }

    setMensaje("Estado actualizado correctamente.");
    cargarTipos(condominioId);
  }

  async function cargarTiposBasicos() {
    if (!condominioId) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    const confirmar = confirm(
      `Se cargarán los tipos básicos de cargos para el condominio:\n\n${condominioNombre}\n\n¿Desea continuar?`
    );

    if (!confirmar) return;

    const registros = [
      {
        condominio_id: Number(condominioId),
        codigo: "MANTENIMIENTO",
        nombre: "Mantenimiento mensual",
        descripcion:
          "Cargo mensual ordinario de mantenimiento del condominio.",
        afecta_mantenimiento: true,
        genera_mora: true,
        estado: "ACTIVO",
      },
      {
        condominio_id: Number(condominioId),
        codigo: "MORA",
        nombre: "Mora por atraso",
        descripcion: "Cargo por pago fuera de la fecha límite.",
        afecta_mantenimiento: false,
        genera_mora: false,
        estado: "ACTIVO",
      },
      {
        condominio_id: Number(condominioId),
        codigo: "EXTRAORDINARIO",
        nombre: "Cargo extraordinario",
        descripcion:
          "Cargo especial aprobado por la administración o asamblea.",
        afecta_mantenimiento: false,
        genera_mora: false,
        estado: "ACTIVO",
      },
      {
        condominio_id: Number(condominioId),
        codigo: "RESERVA",
        nombre: "Fondo de reserva",
        descripcion: "Cargo destinado al fondo de reserva del condominio.",
        afecta_mantenimiento: false,
        genera_mora: false,
        estado: "ACTIVO",
      },
    ];

    const { error } = await supabase.from("tipos_cargos").upsert(registros, {
      onConflict: "condominio_id,codigo",
    });

    if (error) {
      setMensaje("Error cargando tipos básicos: " + error.message);
      return;
    }

    setMensaje("Tipos básicos cargados correctamente.");
    cargarTipos(condominioId);
  }

  const activos = tipos.filter((t) => t.estado === "ACTIVO").length;
  const inactivos = tipos.filter((t) => t.estado !== "ACTIVO").length;
  const mantenimiento = tipos.filter((t) => t.afecta_mantenimiento).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-3xl font-black text-slate-900">
          Tipos de Cargos
        </h1>

        <p className="text-slate-500 mt-2">
          Catálogo para definir los cargos que puede generar el sistema:
          mantenimiento, mora, extraordinarios y reservas.
        </p>

        <p className="text-sm text-blue-700 font-bold mt-3">
          Condominio activo: {condominioNombre || "No seleccionado"}
        </p>
      </div>

      {mensaje && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm">
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ResumenCard titulo="Tipos activos" valor={activos} color="text-green-700" />
        <ResumenCard titulo="Tipos inactivos" valor={inactivos} color="text-red-700" />
        <ResumenCard
          titulo="Afectan mantenimiento"
          valor={mantenimiento}
          color="text-blue-700"
        />
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <h2 className="text-xl font-black">
            {editandoId ? "Editar tipo de cargo" : "Registrar tipo de cargo"}
          </h2>

          <button
            type="button"
            onClick={cargarTiposBasicos}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl font-bold"
          >
            Cargar tipos básicos
          </button>
        </div>

        <form
          onSubmit={guardarTipo}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">
              Código *
            </label>

            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Ej. MANTENIMIENTO"
            />

            <p className="text-xs text-slate-500 mt-1">
              Se guardará en mayúscula y sin espacios.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Nombre *
            </label>

            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Ej. Mantenimiento mensual"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Descripción
            </label>

            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              rows={3}
              placeholder="Descripción del tipo de cargo"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              ¿Afecta mantenimiento mensual?
            </label>

            <select
              value={afectaMantenimiento ? "SI" : "NO"}
              onChange={(e) => setAfectaMantenimiento(e.target.value === "SI")}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="SI">Sí</option>
              <option value="NO">No</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              ¿Genera mora?
            </label>

            <select
              value={generaMora ? "SI" : "NO"}
              onChange={(e) => setGeneraMora(e.target.value === "SI")}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="SI">Sí</option>
              <option value="NO">No</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Estado
            </label>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="ACTIVO">ACTIVO</option>
              <option value="INACTIVO">INACTIVO</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={guardando}
              className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-5 py-3 rounded-xl font-bold"
            >
              {guardando
                ? "Guardando..."
                : editandoId
                ? "Actualizar tipo"
                : "Guardar tipo"}
            </button>

            {editandoId && (
              <button
                type="button"
                onClick={limpiarFormulario}
                className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-black text-lg">Tipos registrados</h2>
        </div>

        {loading ? (
          <div className="p-6">Cargando tipos de cargos...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Código</th>
                  <th className="p-3 border text-left">Nombre</th>
                  <th className="p-3 border text-left">Descripción</th>
                  <th className="p-3 border text-center">Mantenimiento</th>
                  <th className="p-3 border text-center">Mora</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {tipos.map((t) => (
                  <tr key={t.id}>
                    <td className="p-3 border font-black">{t.codigo}</td>
                    <td className="p-3 border">{t.nombre}</td>
                    <td className="p-3 border">{t.descripcion || "-"}</td>

                    <td className="p-3 border text-center">
                      {t.afecta_mantenimiento ? "Sí" : "No"}
                    </td>

                    <td className="p-3 border text-center">
                      {t.genera_mora ? "Sí" : "No"}
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={
                          t.estado === "ACTIVO"
                            ? "bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold"
                            : "bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold"
                        }
                      >
                        {t.estado}
                      </span>
                    </td>

                    <td className="p-3 border text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => cargarParaEditar(t)}
                          className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => cambiarEstado(t)}
                          className={
                            t.estado === "ACTIVO"
                              ? "bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold"
                              : "bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold"
                          }
                        >
                          {t.estado === "ACTIVO" ? "Inactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {tipos.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-6 border text-center text-slate-500"
                    >
                      No hay tipos de cargos registrados para este condominio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-slate-50 border rounded-xl p-4 text-sm text-slate-600">
        <p>
          <strong>Regla del sistema:</strong> El cargo mensual ordinario del
          condominio debe usar el código <strong>MANTENIMIENTO</strong>. Los
          demás cargos se usarán para mora, fondos de reserva o cargos
          extraordinarios.
        </p>
      </div>
    </div>
  );
}

function ResumenCard({
  titulo,
  valor,
  color,
}: {
  titulo: string;
  valor: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5">
      <p className="text-sm text-slate-500">{titulo}</p>

      <h2 className={`text-3xl font-black mt-2 ${color}`}>
        {Number(valor || 0).toLocaleString("es-DO")}
      </h2>
    </div>
  );
}