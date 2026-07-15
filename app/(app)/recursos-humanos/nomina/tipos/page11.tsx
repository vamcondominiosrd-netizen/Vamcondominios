"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import NominaMenu from "../NominaMenu";

type TipoNomina = {
  id: number;
  condominio_id: number;
  condominio: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  frecuencia_pago: string;
  dias_periodo: number;
  requiere_afp: boolean;
  requiere_sfs: boolean;
  requiere_isr: boolean;
  requiere_tss: boolean;
  es_predeterminada: boolean;
  orden: number;
  estado: string;
};

const frecuencias = ["Mensual", "Quincenal", "Semanal", "Especial", "Anual"];
const estados = ["Activo", "Inactivo"];

export default function TiposNominaPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [tipos, setTipos] = useState<TipoNomina[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [frecuenciaPago, setFrecuenciaPago] = useState("Mensual");
  const [diasPeriodo, setDiasPeriodo] = useState("30");
  const [requiereAFP, setRequiereAFP] = useState(true);
  const [requiereSFS, setRequiereSFS] = useState(true);
  const [requiereISR, setRequiereISR] = useState(true);
  const [requiereTSS, setRequiereTSS] = useState(true);
  const [esPredeterminada, setEsPredeterminada] = useState(false);
  const [orden, setOrden] = useState("1");
  const [estado, setEstado] = useState("Activo");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombreLocal = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombreLocal);

    if (id) {
      cargarTipos(id);
    }
  }, []);

  async function cargarTipos(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("rh_tipos_nomina")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("orden", { ascending: true })
      .order("nombre", { ascending: true });

    setLoading(false);

    if (error) {
      alert("Error cargando tipos de nómina: " + error.message);
      return;
    }

    setTipos((data as TipoNomina[]) || []);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setCodigo("");
    setNombre("");
    setDescripcion("");
    setFrecuenciaPago("Mensual");
    setDiasPeriodo("30");
    setRequiereAFP(true);
    setRequiereSFS(true);
    setRequiereISR(true);
    setRequiereTSS(true);
    setEsPredeterminada(false);
    setOrden("1");
    setEstado("Activo");
  }

  function editarTipo(tipo: TipoNomina) {
    setEditandoId(tipo.id);
    setCodigo(tipo.codigo || "");
    setNombre(tipo.nombre || "");
    setDescripcion(tipo.descripcion || "");
    setFrecuenciaPago(tipo.frecuencia_pago || "Mensual");
    setDiasPeriodo(String(tipo.dias_periodo || 30));
    setRequiereAFP(Boolean(tipo.requiere_afp));
    setRequiereSFS(Boolean(tipo.requiere_sfs));
    setRequiereISR(Boolean(tipo.requiere_isr));
    setRequiereTSS(Boolean(tipo.requiere_tss));
    setEsPredeterminada(Boolean(tipo.es_predeterminada));
    setOrden(String(tipo.orden || 1));
    setEstado(tipo.estado || "Activo");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarTipo(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!codigo.trim()) {
      alert("Debe indicar el código del tipo de nómina.");
      return;
    }

    if (!nombre.trim()) {
      alert("Debe indicar el nombre del tipo de nómina.");
      return;
    }

    if (!diasPeriodo || Number(diasPeriodo) <= 0) {
      alert("Debe indicar los días del período.");
      return;
    }

    const registro = {
      condominio_id: Number(condominioId),
      condominio: condominioNombre,
      codigo: codigo.trim().toUpperCase(),
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      frecuencia_pago: frecuenciaPago,
      dias_periodo: Number(diasPeriodo || 0),
      requiere_afp: requiereAFP,
      requiere_sfs: requiereSFS,
      requiere_isr: requiereISR,
      requiere_tss: requiereTSS,
      es_predeterminada: esPredeterminada,
      orden: Number(orden || 1),
      estado,
    };

    setGuardando(true);

    try {
      if (esPredeterminada) {
        await supabase
          .from("rh_tipos_nomina")
          .update({ es_predeterminada: false })
          .eq("condominio_id", Number(condominioId));
      }

      if (editandoId) {
        const { error } = await supabase
          .from("rh_tipos_nomina")
          .update(registro)
          .eq("id", editandoId)
          .eq("condominio_id", Number(condominioId));

        if (error) throw new Error(error.message);

        setGuardando(false);
        alert("Tipo de nómina modificado correctamente.");
        limpiarFormulario();
        cargarTipos(condominioId);
        return;
      }

      const { data: existente, error: errorExiste } = await supabase
        .from("rh_tipos_nomina")
        .select("id")
        .eq("condominio_id", Number(condominioId))
        .eq("codigo", codigo.trim().toUpperCase())
        .maybeSingle();

      if (errorExiste) throw new Error(errorExiste.message);

      if (existente) {
        setGuardando(false);
        alert("Ya existe un tipo de nómina con ese código.");
        return;
      }

      const { error } = await supabase
        .from("rh_tipos_nomina")
        .insert([registro]);

      if (error) throw new Error(error.message);

      setGuardando(false);
      alert("Tipo de nómina registrado correctamente.");
      limpiarFormulario();
      cargarTipos(condominioId);
    } catch (error: any) {
      setGuardando(false);
      alert("Error guardando tipo de nómina: " + error.message);
    }
  }

  async function cambiarEstado(tipo: TipoNomina, nuevoEstado: string) {
    const confirmar = confirm(
      `¿Desea cambiar "${tipo.nombre}" a ${nuevoEstado}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("rh_tipos_nomina")
      .update({ estado: nuevoEstado })
      .eq("id", tipo.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error actualizando estado: " + error.message);
      return;
    }

    alert("Estado actualizado correctamente.");
    cargarTipos(condominioId);
  }

  async function eliminarTipo(tipo: TipoNomina) {
    const confirmar = confirm(
      `¿Seguro que desea eliminar el tipo de nómina "${tipo.nombre}"?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("rh_tipos_nomina")
      .delete()
      .eq("id", tipo.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error eliminando tipo de nómina: " + error.message);
      return;
    }

    alert("Tipo de nómina eliminado correctamente.");
    cargarTipos(condominioId);
  }

  function siNo(valor: boolean) {
    return valor ? "Sí" : "No";
  }

  return (
    <div className="space-y-6">
      <NominaMenu />

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">
          Tipos de Nómina
        </h1>

        <p className="text-slate-500 mt-2">
          Catálogo para definir nómina mensual, quincenal, vacaciones, regalía,
          liquidación y otros pagos especiales.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>
        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">
          {editandoId ? "Modificar tipo de nómina" : "Registrar tipo de nómina"}
        </h2>

        <form
          onSubmit={guardarTipo}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">
              Código *
            </label>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="MEN, QUI, VAC, REG, LIQ"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Nombre *
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Nómina Mensual"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Frecuencia de pago
            </label>
            <select
              value={frecuenciaPago}
              onChange={(e) => setFrecuenciaPago(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {frecuencias.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Días del período
            </label>
            <input
              type="number"
              value={diasPeriodo}
              onChange={(e) => setDiasPeriodo(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="30"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Orden</label>
            <input
              type="number"
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="1"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {estados.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
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
              placeholder="Descripción del tipo de nómina"
            />
          </div>

          <div className="md:col-span-2 bg-slate-50 border rounded-2xl p-5">
            <h3 className="font-black mb-3">Aplicación de descuentos</h3>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={requiereAFP}
                  onChange={(e) => setRequiereAFP(e.target.checked)}
                />
                Requiere AFP
              </label>

              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={requiereSFS}
                  onChange={(e) => setRequiereSFS(e.target.checked)}
                />
                Requiere SFS
              </label>

              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={requiereISR}
                  onChange={(e) => setRequiereISR(e.target.checked)}
                />
                Requiere ISR
              </label>

              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={requiereTSS}
                  onChange={(e) => setRequiereTSS(e.target.checked)}
                />
                Requiere TSS
              </label>

              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={esPredeterminada}
                  onChange={(e) => setEsPredeterminada(e.target.checked)}
                />
                Predeterminada
              </label>
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col md:flex-row gap-3">
            <button
              type="submit"
              disabled={guardando}
              className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-5 py-3 rounded-xl font-bold"
            >
              {guardando
                ? "Guardando..."
                : editandoId
                ? "Guardar cambios"
                : "Guardar tipo"}
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

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">
          Listado de tipos de nómina
        </h2>

        {loading ? (
          <div>Cargando tipos de nómina...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Código</th>
                  <th className="p-3 border text-left">Nombre</th>
                  <th className="p-3 border text-left">Frecuencia</th>
                  <th className="p-3 border text-center">Días</th>
                  <th className="p-3 border text-center">AFP</th>
                  <th className="p-3 border text-center">SFS</th>
                  <th className="p-3 border text-center">ISR</th>
                  <th className="p-3 border text-center">TSS</th>
                  <th className="p-3 border text-center">Pred.</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {tipos.map((tipo) => (
                  <tr key={tipo.id} className="hover:bg-slate-50">
                    <td className="p-3 border font-black">{tipo.codigo}</td>

                    <td className="p-3 border">
                      <p className="font-bold">{tipo.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {tipo.descripcion || "-"}
                      </p>
                    </td>

                    <td className="p-3 border">{tipo.frecuencia_pago}</td>

                    <td className="p-3 border text-center font-bold">
                      {tipo.dias_periodo}
                    </td>

                    <td className="p-3 border text-center">
                      {siNo(tipo.requiere_afp)}
                    </td>

                    <td className="p-3 border text-center">
                      {siNo(tipo.requiere_sfs)}
                    </td>

                    <td className="p-3 border text-center">
                      {siNo(tipo.requiere_isr)}
                    </td>

                    <td className="p-3 border text-center">
                      {siNo(tipo.requiere_tss)}
                    </td>

                    <td className="p-3 border text-center">
                      {tipo.es_predeterminada ? (
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                          Sí
                        </span>
                      ) : (
                        "No"
                      )}
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          tipo.estado === "Activo"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {tipo.estado}
                      </span>
                    </td>

                    <td className="p-3 border">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          onClick={() => editarTipo(tipo)}
                          className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Editar
                        </button>

                        {tipo.estado === "Activo" ? (
                          <button
                            onClick={() => cambiarEstado(tipo, "Inactivo")}
                            className="bg-yellow-700 hover:bg-yellow-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Inactivar
                          </button>
                        ) : (
                          <button
                            onClick={() => cambiarEstado(tipo, "Activo")}
                            className="bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Activar
                          </button>
                        )}

                        <button
                          onClick={() => eliminarTipo(tipo)}
                          className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {tipos.length === 0 && (
                  <tr>
                    <td
                      className="p-6 border text-center text-slate-500"
                      colSpan={11}
                    >
                      No hay tipos de nómina registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}