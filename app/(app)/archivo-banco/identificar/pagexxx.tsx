"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type TransaccionBanco = {
  id: number;
  condominio_id: number | null;
  condominio: string | null;

  fecha_posteo: string;
  monto_transaccion: number;
  no_serial: string;
  descripcion: string;

  estado: string | null;

  unidad_id: number | null;
  apartamento: string | null;
  propietario: string | null;

  tipo_pago: string | null;
  periodo: string | null;
  observacion: string | null;

  created_at: string;
};

type Unidad = {
  id: number;
  condominio_id: number;
  codigo: string;
  propietario_nombre: string;
  activa: boolean;
};

const estadosFiltro = ["Todos", "Revisar", "Pendiente", "Identificado"];
const tiposPago = ["Mantenimiento", "Extraordinario", "Otro"];

export default function IdentificarArchivoBancoPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [transacciones, setTransacciones] = useState<TransaccionBanco[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [filtroEstado, setFiltroEstado] = useState("Revisar");
  const [busqueda, setBusqueda] = useState("");

  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [unidadId, setUnidadId] = useState("");
  const [apartamento, setApartamento] = useState("");
  const [propietario, setPropietario] = useState("");
  const [tipoPago, setTipoPago] = useState("Mantenimiento");
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7));
  const [observacion, setObservacion] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarUnidades(id);
      cargarTransacciones(id);
    }
  }, []);

  async function cargarUnidades(id: string) {
    const { data, error } = await supabase
      .from("unidades")
      .select("id, condominio_id, codigo, propietario_nombre, activa")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo", { ascending: true });

    if (error) {
      alert("Error cargando apartamentos: " + error.message);
      return;
    }

    setUnidades((data as Unidad[]) || []);
  }

  async function cargarTransacciones(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("archivo_banco")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("fecha_posteo", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando archivo del banco: " + error.message);
      return;
    }

    setTransacciones((data as TransaccionBanco[]) || []);
  }

  function moneda(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  function obtenerPropietarioUnidad(unidad: Unidad) {
    return unidad.propietario_nombre || "";
  }

  function seleccionarUnidad(id: string) {
    setUnidadId(id);

    if (!id) {
      setApartamento("");
      setPropietario("");
      return;
    }

    const unidad = unidades.find((item) => String(item.id) === id);

    if (!unidad) {
      setApartamento("");
      setPropietario("");
      return;
    }

    setApartamento(unidad.codigo || "");
    setPropietario(obtenerPropietarioUnidad(unidad));
  }

  function editarRegistro(item: TransaccionBanco) {
    setEditandoId(item.id);

    setUnidadId(item.unidad_id ? String(item.unidad_id) : "");
    setApartamento(item.apartamento || "");
    setPropietario(item.propietario || "");
    setTipoPago(item.tipo_pago || "Mantenimiento");
    setPeriodo(item.periodo || new Date().toISOString().slice(0, 7));
    setObservacion(item.observacion || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setUnidadId("");
    setApartamento("");
    setPropietario("");
    setTipoPago("Mantenimiento");
    setPeriodo(new Date().toISOString().slice(0, 7));
    setObservacion("");
  }

  async function guardarIdentificacion(e: React.FormEvent) {
    e.preventDefault();

    if (!editandoId) {
      alert("Debe seleccionar un registro del banco para modificar.");
      return;
    }

    if (!unidadId) {
      alert("Debe seleccionar el apartamento correcto.");
      return;
    }

    if (!apartamento.trim()) {
      alert("Debe indicar el apartamento.");
      return;
    }

    if (!periodo) {
      alert("Debe indicar el período del pago.");
      return;
    }

    const transaccion = transacciones.find((item) => item.id === editandoId);

    if (!transaccion) {
      alert("No se encontró la transacción seleccionada.");
      return;
    }

    const registroActualizado = {
      condominio_id: Number(condominioId),
      condominio: condominioNombre,
      unidad_id: Number(unidadId),
      apartamento: apartamento.trim(),
      propietario: propietario.trim(),
      tipo_pago: tipoPago,
      periodo,
      observacion: observacion.trim(),
      estado: "Identificado",
    };

    setGuardando(true);

    const { error: errorUpdate } = await supabase
      .from("archivo_banco")
      .update(registroActualizado)
      .eq("id", editandoId);

    if (errorUpdate) {
      setGuardando(false);
      alert("Error actualizando registro del banco: " + errorUpdate.message);
      return;
    }

    const { data: existePago, error: errorExistePago } = await supabase
      .from("pagos_identificados")
      .select("id")
      .eq("condominio_id", Number(condominioId))
      .eq("archivo_banco_id", editandoId)
      .maybeSingle();

    if (errorExistePago) {
      setGuardando(false);
      alert(
        "El registro fue actualizado, pero hubo error validando pagos identificados: " +
          errorExistePago.message
      );
      return;
    }

  const pagoIdentificado = {
  condominio_id: Number(condominioId),
  condominio: condominioNombre,

  archivo_banco_id: editandoId,

  unidad_id: Number(unidadId),

  apartamento: apartamento.trim(),
  no_apartamento: apartamento.trim(),

  propietario: propietario.trim(),

  fecha_posteo: transaccion.fecha_posteo,
  monto: Number(transaccion.monto_transaccion || 0),
  no_serial: transaccion.no_serial || "",
  descripcion_banco: transaccion.descripcion || "",

  tipo_pago: tipoPago,
  periodo,
  estado: "Identificado",
  observacion: observacion.trim(),
};

    if (existePago) {
      const { error: errorPagoUpdate } = await supabase
        .from("pagos_identificados")
        .update(pagoIdentificado)
        .eq("id", existePago.id)
        .eq("condominio_id", Number(condominioId));

      if (errorPagoUpdate) {
        setGuardando(false);
        alert(
          "El banco fue actualizado, pero hubo error actualizando pagos identificados: " +
            errorPagoUpdate.message
        );
        return;
      }
    } else {
      const { error: errorPagoInsert } = await supabase
        .from("pagos_identificados")
        .insert([pagoIdentificado]);

      if (errorPagoInsert) {
        setGuardando(false);
        alert(
          "El banco fue actualizado, pero hubo error creando pago identificado: " +
            errorPagoInsert.message
        );
        return;
      }
    }

    setGuardando(false);

    alert("Registro identificado correctamente.");

    limpiarFormulario();
    cargarTransacciones(condominioId);
  }

  async function cambiarARevisar(item: TransaccionBanco) {
    const confirmar = confirm(
      "¿Desea enviar este registro nuevamente al estado Revisar?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("archivo_banco")
      .update({
        estado: "Revisar",
        observacion: "Enviado nuevamente a revisión manual.",
      })
      .eq("id", item.id);

    if (error) {
      alert("Error actualizando registro: " + error.message);
      return;
    }

    await supabase
      .from("pagos_identificados")
      .delete()
      .eq("archivo_banco_id", item.id)
      .eq("condominio_id", Number(condominioId));

    alert("Registro enviado a revisión correctamente.");
    cargarTransacciones(condominioId);
  }

  const transaccionesFiltradas = transacciones.filter((item) => {
    const estadoRegistro = item.estado || "Pendiente";

    const texto = `${item.fecha_posteo || ""} ${item.no_serial || ""} ${
      item.descripcion || ""
    } ${item.apartamento || ""} ${item.propietario || ""} ${estadoRegistro}`
      .toLowerCase()
      .trim();

    const coincideBusqueda = texto.includes(busqueda.toLowerCase().trim());

    const coincideEstado =
      filtroEstado === "Todos" ? true : estadoRegistro === filtroEstado;

    return coincideBusqueda && coincideEstado;
  });

  const totalRegistros = transaccionesFiltradas.length;

  const totalMonto = transaccionesFiltradas.reduce(
    (sum, item) => sum + Number(item.monto_transaccion || 0),
    0
  );

  const totalRevisar = transacciones.filter(
    (item) => (item.estado || "Pendiente") === "Revisar"
  ).length;

  const totalIdentificados = transacciones.filter(
    (item) => (item.estado || "Pendiente") === "Identificado"
  ).length;

  const totalPendientes = transacciones.filter(
    (item) => (item.estado || "Pendiente") === "Pendiente"
  ).length;

  const registroEditando = transacciones.find(
    (item) => item.id === editandoId
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">
          Identificar Pagos del Banco
        </h1>

        <p className="text-slate-500 mt-2">
          Revisa las transacciones importadas del banco, corrige manualmente los
          registros en estado Revisar y conviértelos en pagos identificados.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>

        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Registros filtrados</p>
          <h2 className="text-3xl font-black">{totalRegistros}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Monto filtrado</p>
          <h2 className="text-2xl font-black text-blue-700">
            RD${moneda(totalMonto)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Revisar</p>
          <h2 className="text-3xl font-black text-yellow-700">
            {totalRevisar}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Identificados</p>
          <h2 className="text-3xl font-black text-green-700">
            {totalIdentificados}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Pendientes</p>
          <h2 className="text-3xl font-black text-red-700">
            {totalPendientes}
          </h2>
        </div>
      </div>

      {editandoId && registroEditando && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-3xl p-6">
          <h2 className="text-xl font-black text-yellow-900 mb-4">
            Corrección manual del registro
          </h2>

          <div className="bg-white border rounded-2xl p-4 mb-5">
            <p className="text-sm text-slate-500">Descripción banco</p>
            <p className="font-bold text-slate-900">
              {registroEditando.descripcion || "-"}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <div>
                <p className="text-sm text-slate-500">Fecha</p>
                <p className="font-bold">{registroEditando.fecha_posteo}</p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Monto</p>
                <p className="font-bold text-blue-700">
                  RD${moneda(registroEditando.monto_transaccion)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Referencia</p>
                <p className="font-bold">
                  {registroEditando.no_serial || "-"}
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={guardarIdentificacion}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-semibold mb-1">
                Apartamento correcto *
              </label>

              <select
                value={unidadId}
                onChange={(e) => seleccionarUnidad(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="">Seleccione apartamento</option>

                {unidades.map((unidad) => (
                  <option key={unidad.id} value={unidad.id}>
                    {unidad.codigo} - {obtenerPropietarioUnidad(unidad)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Propietario
              </label>

              <input
                value={propietario}
                onChange={(e) => setPropietario(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Nombre del propietario"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Tipo de pago
              </label>

              <select
                value={tipoPago}
                onChange={(e) => setTipoPago(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                {tiposPago.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Período del pago *
              </label>

              <input
                type="month"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
              />
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
                placeholder="Comentario sobre la corrección manual"
              />
            </div>

            <div className="md:col-span-2 flex flex-col md:flex-row gap-3">
              <button
                type="submit"
                disabled={guardando}
                className="bg-green-700 hover:bg-green-800 disabled:bg-slate-400 text-white px-5 py-3 rounded-xl font-bold"
              >
                {guardando
                  ? "Guardando..."
                  : "Guardar y marcar como identificado"}
              </button>

              <button
                type="button"
                onClick={limpiarFormulario}
                className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-black">Buscar transacciones</h2>

            <p className="text-sm text-slate-500">
              Filtra por estado, descripción, referencia, apartamento o
              propietario.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full md:w-auto">
            <div>
              <label className="block text-sm font-semibold mb-1">Estado</label>

              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                {estadosFiltro.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Buscar</label>

              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Descripción, apartamento..."
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => cargarTransacciones(condominioId)}
                className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold w-full"
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div>Cargando transacciones del banco...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Fecha</th>
                  <th className="p-3 border text-right">Monto</th>
                  <th className="p-3 border text-left">Referencia</th>
                  <th className="p-3 border text-left">Descripción</th>
                  <th className="p-3 border text-left">Apartamento</th>
                  <th className="p-3 border text-left">Propietario</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {transaccionesFiltradas.map((item) => {
                  const estadoRegistro = item.estado || "Pendiente";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3 border">
                        {item.fecha_posteo || "-"}
                      </td>

                      <td className="p-3 border text-right font-bold text-blue-700">
                        RD${moneda(item.monto_transaccion)}
                      </td>

                      <td className="p-3 border">{item.no_serial || "-"}</td>

                      <td className="p-3 border">
                        <p className="font-semibold">
                          {item.descripcion || "-"}
                        </p>

                        {item.observacion && (
                          <p className="text-xs text-slate-500 mt-1">
                            {item.observacion}
                          </p>
                        )}
                      </td>

                      <td className="p-3 border font-bold">
                        {item.apartamento || "-"}
                      </td>

                      <td className="p-3 border">
                        {item.propietario || "-"}
                      </td>

                      <td className="p-3 border text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            estadoRegistro === "Identificado"
                              ? "bg-green-100 text-green-700"
                              : estadoRegistro === "Revisar"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {estadoRegistro}
                        </span>
                      </td>

                      <td className="p-3 border">
                        <div className="flex flex-wrap justify-center gap-2">
                          <button
                            onClick={() => editarRegistro(item)}
                            className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Corregir
                          </button>

                          {estadoRegistro === "Identificado" && (
                            <button
                              onClick={() => cambiarARevisar(item)}
                              className="bg-yellow-700 hover:bg-yellow-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                            >
                              Revisar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {transaccionesFiltradas.length === 0 && (
                  <tr>
                    <td
                      className="p-6 border text-center text-slate-500"
                      colSpan={8}
                    >
                      No hay transacciones para esta consulta.
                    </td>
                  </tr>
                )}
              </tbody>

              {transaccionesFiltradas.length > 0 && (
                <tfoot className="bg-slate-100 font-black">
                  <tr>
                    <td className="p-3 border">Totales</td>
                    <td className="p-3 border text-right text-blue-700">
                      RD${moneda(totalMonto)}
                    </td>
                    <td className="p-3 border" colSpan={6}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}