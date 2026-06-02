"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import NominaMenu from "../NominaMenu";

type ConfigNomina = {
  id: number;
  condominio_id: number;
  condominio: string;

  porcentaje_afp: number;
  porcentaje_sfs: number;
  porcentaje_isr: number;

  isr_exento_hasta: number;
  isr_tramo1_hasta: number;
  isr_tramo1_porcentaje: number;
  isr_tramo2_hasta: number;
  isr_tramo2_monto_fijo: number;
  isr_tramo2_porcentaje: number;
  isr_tramo3_monto_fijo: number;
  isr_tramo3_porcentaje: number;

  fecha_vigencia_desde: string;
  fecha_vigencia_hasta: string;

  estado: string;
  observacion: string;

  created_at: string;
};

export default function ConfiguracionNominaPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [configuraciones, setConfiguraciones] = useState<ConfigNomina[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [porcentajeAfp, setPorcentajeAfp] = useState("2.87");
  const [porcentajeSfs, setPorcentajeSfs] = useState("3.04");

  const [isrExentoHasta, setIsrExentoHasta] = useState("416220");
  const [isrTramo1Hasta, setIsrTramo1Hasta] = useState("624329");
  const [isrTramo1Porcentaje, setIsrTramo1Porcentaje] = useState("15");

  const [isrTramo2Hasta, setIsrTramo2Hasta] = useState("867123");
  const [isrTramo2MontoFijo, setIsrTramo2MontoFijo] = useState("31216");
  const [isrTramo2Porcentaje, setIsrTramo2Porcentaje] = useState("20");

  const [isrTramo3MontoFijo, setIsrTramo3MontoFijo] = useState("79776");
  const [isrTramo3Porcentaje, setIsrTramo3Porcentaje] = useState("25");

  const [fechaDesde, setFechaDesde] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [fechaHasta, setFechaHasta] = useState("");

  const [estado, setEstado] = useState("Activo");
  const [observacion, setObservacion] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarConfiguraciones(id);
    }
  }, []);

  async function cargarConfiguraciones(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("rh_configuracion_nomina")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando configuración de nómina: " + error.message);
      return;
    }

    setConfiguraciones((data as ConfigNomina[]) || []);
  }

  function limpiarFormulario() {
    setEditandoId(null);

    setPorcentajeAfp("2.87");
    setPorcentajeSfs("3.04");

    setIsrExentoHasta("416220");
    setIsrTramo1Hasta("624329");
    setIsrTramo1Porcentaje("15");

    setIsrTramo2Hasta("867123");
    setIsrTramo2MontoFijo("31216");
    setIsrTramo2Porcentaje("20");

    setIsrTramo3MontoFijo("79776");
    setIsrTramo3Porcentaje("25");

    setFechaDesde(new Date().toISOString().slice(0, 10));
    setFechaHasta("");

    setEstado("Activo");
    setObservacion("");
  }

  function editarConfiguracion(config: ConfigNomina) {
    setEditandoId(config.id);

    setPorcentajeAfp(String(config.porcentaje_afp ?? 2.87));
    setPorcentajeSfs(String(config.porcentaje_sfs ?? 3.04));

    setIsrExentoHasta(String(config.isr_exento_hasta ?? 416220));
    setIsrTramo1Hasta(String(config.isr_tramo1_hasta ?? 624329));
    setIsrTramo1Porcentaje(String(config.isr_tramo1_porcentaje ?? 15));

    setIsrTramo2Hasta(String(config.isr_tramo2_hasta ?? 867123));
    setIsrTramo2MontoFijo(String(config.isr_tramo2_monto_fijo ?? 31216));
    setIsrTramo2Porcentaje(String(config.isr_tramo2_porcentaje ?? 20));

    setIsrTramo3MontoFijo(String(config.isr_tramo3_monto_fijo ?? 79776));
    setIsrTramo3Porcentaje(String(config.isr_tramo3_porcentaje ?? 25));

    setFechaDesde(config.fecha_vigencia_desde || "");
    setFechaHasta(config.fecha_vigencia_hasta || "");

    setEstado(config.estado || "Activo");
    setObservacion(config.observacion || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function desactivarConfiguracionesActivas() {
    if (!condominioId) return;

    await supabase
      .from("rh_configuracion_nomina")
      .update({
        estado: "Inactivo",
      })
      .eq("condominio_id", Number(condominioId))
      .eq("estado", "Activo");
  }

  async function guardarConfiguracion(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!porcentajeAfp || Number(porcentajeAfp) < 0) {
      alert("Debe indicar un porcentaje AFP válido.");
      return;
    }

    if (!porcentajeSfs || Number(porcentajeSfs) < 0) {
      alert("Debe indicar un porcentaje SFS válido.");
      return;
    }

    if (!fechaDesde) {
      alert("Debe indicar la fecha de vigencia desde.");
      return;
    }

    if (Number(isrExentoHasta) <= 0) {
      alert("Debe indicar el monto exento de ISR.");
      return;
    }

    if (Number(isrTramo1Hasta) <= Number(isrExentoHasta)) {
      alert("El tramo 1 debe ser mayor que el monto exento.");
      return;
    }

    if (Number(isrTramo2Hasta) <= Number(isrTramo1Hasta)) {
      alert("El tramo 2 debe ser mayor que el tramo 1.");
      return;
    }

    setGuardando(true);

    if (estado === "Activo" && !editandoId) {
      await desactivarConfiguracionesActivas();
    }

    const registro = {
      condominio_id: Number(condominioId),
      condominio: condominioNombre,

      porcentaje_afp: Number(porcentajeAfp || 0),
      porcentaje_sfs: Number(porcentajeSfs || 0),
      porcentaje_isr: 0,

      isr_exento_hasta: Number(isrExentoHasta || 0),
      isr_tramo1_hasta: Number(isrTramo1Hasta || 0),
      isr_tramo1_porcentaje: Number(isrTramo1Porcentaje || 0),

      isr_tramo2_hasta: Number(isrTramo2Hasta || 0),
      isr_tramo2_monto_fijo: Number(isrTramo2MontoFijo || 0),
      isr_tramo2_porcentaje: Number(isrTramo2Porcentaje || 0),

      isr_tramo3_monto_fijo: Number(isrTramo3MontoFijo || 0),
      isr_tramo3_porcentaje: Number(isrTramo3Porcentaje || 0),

      fecha_vigencia_desde: fechaDesde || null,
      fecha_vigencia_hasta: fechaHasta || null,

      estado,
      observacion: observacion.trim(),
    };

    if (editandoId) {
      if (estado === "Activo") {
        await supabase
          .from("rh_configuracion_nomina")
          .update({
            estado: "Inactivo",
          })
          .eq("condominio_id", Number(condominioId))
          .eq("estado", "Activo")
          .neq("id", editandoId);
      }

      const { error } = await supabase
        .from("rh_configuracion_nomina")
        .update(registro)
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      setGuardando(false);

      if (error) {
        alert("Error modificando configuración: " + error.message);
        return;
      }

      alert("Configuración modificada correctamente.");
      limpiarFormulario();
      cargarConfiguraciones(condominioId);
      return;
    }

    const { error } = await supabase
      .from("rh_configuracion_nomina")
      .insert([registro]);

    setGuardando(false);

    if (error) {
      alert("Error guardando configuración: " + error.message);
      return;
    }

    alert("Configuración registrada correctamente.");
    limpiarFormulario();
    cargarConfiguraciones(condominioId);
  }

  async function cambiarEstado(config: ConfigNomina, nuevoEstado: string) {
    const confirmar = confirm(
      `¿Desea cambiar esta configuración a "${nuevoEstado}"?`
    );

    if (!confirmar) return;

    if (nuevoEstado === "Activo") {
      await supabase
        .from("rh_configuracion_nomina")
        .update({
          estado: "Inactivo",
        })
        .eq("condominio_id", Number(condominioId))
        .eq("estado", "Activo")
        .neq("id", config.id);
    }

    const { error } = await supabase
      .from("rh_configuracion_nomina")
      .update({
        estado: nuevoEstado,
      })
      .eq("id", config.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error actualizando estado: " + error.message);
      return;
    }

    alert("Estado actualizado correctamente.");
    cargarConfiguraciones(condominioId);
  }

  async function eliminarConfiguracion(config: ConfigNomina) {
    const confirmar = confirm(
      "¿Seguro que desea eliminar esta configuración de nómina?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("rh_configuracion_nomina")
      .delete()
      .eq("id", config.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error eliminando configuración: " + error.message);
      return;
    }

    alert("Configuración eliminada correctamente.");
    cargarConfiguraciones(condominioId);
  }

  const activa = configuraciones.find((c) => c.estado === "Activo");

  function mostrarPorcentaje(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function moneda(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  return (
    <div className="space-y-6">
     <NominaMenu />
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">
          Configuración de Nómina
        </h1>

        <p className="text-slate-500 mt-2">
          Configura AFP, SFS y la escala progresiva de ISR usada para calcular
          la nómina.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>

        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-3xl p-5">
        <h2 className="font-black text-lg">Configuración activa</h2>

        {activa ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-sm">AFP</p>
              <p className="text-3xl font-black">
                {mostrarPorcentaje(activa.porcentaje_afp)}%
              </p>
            </div>

            <div>
              <p className="text-sm">SFS</p>
              <p className="text-3xl font-black">
                {mostrarPorcentaje(activa.porcentaje_sfs)}%
              </p>
            </div>

            <div>
              <p className="text-sm">ISR exento hasta</p>
              <p className="text-2xl font-black">
                RD${moneda(activa.isr_exento_hasta)}
              </p>
            </div>

            <div>
              <p className="text-sm">Vigente desde</p>
              <p className="text-xl font-black">
                {activa.fecha_vigencia_desde || "-"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm mt-2">
            No hay configuración activa. Registra una configuración para que el
            módulo de nómina pueda calcular AFP, SFS e ISR automáticamente.
          </p>
        )}
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">
          {editandoId
            ? "Modificar configuración"
            : "Registrar configuración"}
        </h2>

        <form
          onSubmit={guardarConfiguracion}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="md:col-span-2">
            <h3 className="font-black border-b pb-2">
              Descuentos porcentuales
            </h3>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">AFP %</label>

            <input
              type="number"
              step="0.01"
              value={porcentajeAfp}
              onChange={(e) => setPorcentajeAfp(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="2.87"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">SFS %</label>

            <input
              type="number"
              step="0.01"
              value={porcentajeSfs}
              onChange={(e) => setPorcentajeSfs(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="3.04"
            />
          </div>

          <div className="md:col-span-2 mt-4">
            <h3 className="font-black border-b pb-2">
              Escala anual ISR asalariados
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              El sistema calcula el ISR mensual anualizando el salario bruto,
              aplicando esta escala y dividiendo el ISR anual entre 12.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Exento hasta RD$
            </label>

            <input
              type="number"
              step="0.01"
              value={isrExentoHasta}
              onChange={(e) => setIsrExentoHasta(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="416220"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Tramo 1 hasta RD$
            </label>

            <input
              type="number"
              step="0.01"
              value={isrTramo1Hasta}
              onChange={(e) => setIsrTramo1Hasta(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="624329"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Tramo 1 %
            </label>

            <input
              type="number"
              step="0.01"
              value={isrTramo1Porcentaje}
              onChange={(e) => setIsrTramo1Porcentaje(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="15"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Tramo 2 hasta RD$
            </label>

            <input
              type="number"
              step="0.01"
              value={isrTramo2Hasta}
              onChange={(e) => setIsrTramo2Hasta(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="867123"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Tramo 2 monto fijo RD$
            </label>

            <input
              type="number"
              step="0.01"
              value={isrTramo2MontoFijo}
              onChange={(e) => setIsrTramo2MontoFijo(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="31216"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Tramo 2 %
            </label>

            <input
              type="number"
              step="0.01"
              value={isrTramo2Porcentaje}
              onChange={(e) => setIsrTramo2Porcentaje(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="20"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Tramo 3 monto fijo RD$
            </label>

            <input
              type="number"
              step="0.01"
              value={isrTramo3MontoFijo}
              onChange={(e) => setIsrTramo3MontoFijo(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="79776"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Tramo 3 %
            </label>

            <input
              type="number"
              step="0.01"
              value={isrTramo3Porcentaje}
              onChange={(e) => setIsrTramo3Porcentaje(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="25"
            />
          </div>

          <div className="md:col-span-2 mt-4">
            <h3 className="font-black border-b pb-2">Vigencia</h3>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Vigencia desde *
            </label>

            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Vigencia hasta
            </label>

            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Observación
            </label>

            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              rows={3}
              placeholder="Observación o referencia legal de la configuración"
            />
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
                : "Guardar configuración"}
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
          Historial de configuraciones
        </h2>

        {loading ? (
          <div>Cargando configuraciones...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Vigencia</th>
                  <th className="p-3 border text-right">AFP %</th>
                  <th className="p-3 border text-right">SFS %</th>
                  <th className="p-3 border text-right">ISR exento</th>
                  <th className="p-3 border text-right">Tramo 1</th>
                  <th className="p-3 border text-right">Tramo 2</th>
                  <th className="p-3 border text-right">Tramo 3</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-left">Observación</th>
                  <th className="p-3 border text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {configuraciones.map((config) => (
                  <tr key={config.id} className="hover:bg-slate-50">
                    <td className="p-3 border">
                      <p>Desde: {config.fecha_vigencia_desde || "-"}</p>
                      <p className="text-xs text-slate-500">
                        Hasta: {config.fecha_vigencia_hasta || "Indefinido"}
                      </p>
                    </td>

                    <td className="p-3 border text-right font-bold">
                      {mostrarPorcentaje(config.porcentaje_afp)}%
                    </td>

                    <td className="p-3 border text-right font-bold">
                      {mostrarPorcentaje(config.porcentaje_sfs)}%
                    </td>

                    <td className="p-3 border text-right font-bold">
                      RD${moneda(config.isr_exento_hasta)}
                    </td>

                    <td className="p-3 border text-right">
                      <p>Hasta RD${moneda(config.isr_tramo1_hasta)}</p>
                      <p className="text-xs font-bold">
                        {mostrarPorcentaje(config.isr_tramo1_porcentaje)}%
                      </p>
                    </td>

                    <td className="p-3 border text-right">
                      <p>Hasta RD${moneda(config.isr_tramo2_hasta)}</p>
                      <p className="text-xs">
                        Fijo RD${moneda(config.isr_tramo2_monto_fijo)}
                      </p>
                      <p className="text-xs font-bold">
                        {mostrarPorcentaje(config.isr_tramo2_porcentaje)}%
                      </p>
                    </td>

                    <td className="p-3 border text-right">
                      <p>Más de RD${moneda(config.isr_tramo2_hasta)}</p>
                      <p className="text-xs">
                        Fijo RD${moneda(config.isr_tramo3_monto_fijo)}
                      </p>
                      <p className="text-xs font-bold">
                        {mostrarPorcentaje(config.isr_tramo3_porcentaje)}%
                      </p>
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          config.estado === "Activo"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {config.estado}
                      </span>
                    </td>

                    <td className="p-3 border">
                      {config.observacion || "-"}
                    </td>

                    <td className="p-3 border">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          onClick={() => editarConfiguracion(config)}
                          className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Editar
                        </button>

                        {config.estado !== "Activo" ? (
                          <button
                            onClick={() => cambiarEstado(config, "Activo")}
                            className="bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Activar
                          </button>
                        ) : (
                          <button
                            onClick={() => cambiarEstado(config, "Inactivo")}
                            className="bg-yellow-700 hover:bg-yellow-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Inactivar
                          </button>
                        )}

                        <button
                          onClick={() => eliminarConfiguracion(config)}
                          className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {configuraciones.length === 0 && (
                  <tr>
                    <td
                      className="p-6 border text-center text-slate-500"
                      colSpan={10}
                    >
                      No hay configuraciones de nómina registradas.
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