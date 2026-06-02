"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/app/lib/supabaseClient";

type AliasRow = {
  condominio_id: number;
  condominio: string;
  unidad_id: number | null;
  no_apartamento: string;
  propietario: string;
  descripcion_banco: string;
  periodo_pago: string;
  estado: string;
};

type AliasGuardado = {
  id: number;
  condominio_id: number;
  condominio: string;
  unidad_id: number | null;
  no_apartamento: string;
  propietario: string;
  descripcion_banco: string;
  periodo_pago: string;
  estado: string;
  created_at: string;
};

type Unidad = {
  id: number;
  condominio_id: number;
  codigo: string;
  propietario_nombre: string;
  activa: boolean;
};

function obtenerValor(row: any, posiblesNombres: string[]) {
  const keys = Object.keys(row);

  for (const nombre of posiblesNombres) {
    const key = keys.find(
      (k) => k.trim().toLowerCase() === nombre.trim().toLowerCase()
    );

    if (key) return row[key];
  }

  return "";
}

function limpiarTexto(texto: string) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function ImportarCuentasBancoPropietariosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [rows, setRows] = useState<AliasRow[]>([]);
  const [aliasGuardados, setAliasGuardados] = useState<AliasGuardado[]>([]);

  const [loading, setLoading] = useState(false);
  const [cargandoUnidades, setCargandoUnidades] = useState(false);
  const [cargandoAlias, setCargandoAlias] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [periodoPago, setPeriodoPago] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editUnidadId, setEditUnidadId] = useState("");
  const [editNoApartamento, setEditNoApartamento] = useState("");
  const [editPropietario, setEditPropietario] = useState("");
  const [editDescripcionBanco, setEditDescripcionBanco] = useState("");
  const [editPeriodoPago, setEditPeriodoPago] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [editEstado, setEditEstado] = useState("Activo");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarUnidades(id);
      cargarAliasGuardados(id);
    }
  }, []);

  async function cargarUnidades(id: string) {
    setCargandoUnidades(true);

    const { data, error } = await supabase
      .from("unidades")
      .select("id, condominio_id, codigo, propietario_nombre, activa")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo", { ascending: true });

    setCargandoUnidades(false);

    if (error) {
      alert("Error cargando apartamentos: " + error.message);
      return;
    }

    setUnidades((data as Unidad[]) || []);
  }

  async function cargarAliasGuardados(id: string) {
    setCargandoAlias(true);

    const { data, error } = await supabase
      .from("apartamento_banco_alias")
      .select(
        "id, condominio_id, condominio, unidad_id, no_apartamento, propietario, descripcion_banco, periodo_pago, estado, created_at"
      )
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false });

    setCargandoAlias(false);

    if (error) {
      alert("Error cargando cuentas banco propietarios: " + error.message);
      return;
    }

    setAliasGuardados((data as AliasGuardado[]) || []);
  }

  function buscarUnidad(noApartamento: string) {
    const aptoLimpio = limpiarTexto(noApartamento);

    return (
      unidades.find((unidad) => limpiarTexto(unidad.codigo) === aptoLimpio) ||
      null
    );
  }

  function seleccionarUnidadEditar(id: string) {
    setEditUnidadId(id);

    if (!id) {
      setEditNoApartamento("");
      setEditPropietario("");
      setEditEstado("Pendiente");
      return;
    }

    const unidad = unidades.find((item) => String(item.id) === id);

    if (!unidad) {
      setEditNoApartamento("");
      setEditPropietario("");
      setEditEstado("Pendiente");
      return;
    }

    setEditNoApartamento(unidad.codigo || "");
    setEditPropietario(unidad.propietario_nombre || "");
    setEditEstado("Activo");
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    if (!periodoPago) {
      alert("Debe seleccionar el mes de pago antes de cargar el archivo.");
      return;
    }

    if (unidades.length === 0) {
      alert("No hay apartamentos cargados para este condominio.");
      return;
    }

    const reader = new FileReader();

    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const json: any[] = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
      });

      const mapped: AliasRow[] = json
        .map((r) => {
          const noApartamento = String(
            obtenerValor(r, [
              "No Apartamento",
              "No. Apartamento",
              "Apartamento",
              "Unidad",
              "No Unidad",
              "Código",
              "Codigo",
            ]) || ""
          ).trim();

          const descripcionBanco = String(
            obtenerValor(r, [
              "Descripcion Banco",
              "Descripción Banco",
              "Descripcion",
              "Descripción",
              "Banco",
              "Alias Banco",
              "Concepto Banco",
              "Referencia Banco",
            ]) || ""
          ).trim();

          const periodoArchivo = String(
            obtenerValor(r, [
              "Periodo",
              "Período",
              "Mes",
              "Mes Pago",
              "Periodo Pago",
              "Período Pago",
            ]) || ""
          ).trim();

          const unidad = buscarUnidad(noApartamento);

          return {
            condominio_id: Number(condominioId),
            condominio: condominioNombre,

            unidad_id: unidad?.id || null,
            no_apartamento: noApartamento,
            propietario: unidad?.propietario_nombre || "",

            descripcion_banco: descripcionBanco,
            periodo_pago: periodoArchivo || periodoPago,
            estado: unidad ? "Activo" : "Pendiente",
          };
        })
        .filter((r) => r.no_apartamento && r.descripcion_banco);

      setRows(mapped);
    };

    reader.readAsArrayBuffer(file);
  }

  async function guardarEnSupabase() {
    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    if (rows.length === 0) {
      alert("No hay datos para importar.");
      return;
    }

    const registrosValidos = rows.filter(
      (r) => r.no_apartamento && r.descripcion_banco && r.periodo_pago
    );

    if (registrosValidos.length === 0) {
      alert("No hay registros válidos para importar.");
      return;
    }

    const confirmar = confirm(
      `Se importarán ${registrosValidos.length} cuentas banco propietarios para ${condominioNombre}, período ${periodoPago}. ¿Desea continuar?`
    );

    if (!confirmar) return;

    setLoading(true);

    const { error } = await supabase
      .from("apartamento_banco_alias")
      .insert(registrosValidos);

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Error al guardar los datos: " + error.message);
      return;
    }

    alert("Cuentas banco propietarios importadas correctamente.");
    setRows([]);
    cargarAliasGuardados(condominioId);
  }

  function editarAlias(item: AliasGuardado) {
    setEditandoId(item.id);
    setEditUnidadId(item.unidad_id ? String(item.unidad_id) : "");
    setEditNoApartamento(item.no_apartamento || "");
    setEditPropietario(item.propietario || "");
    setEditDescripcionBanco(item.descripcion_banco || "");
    setEditPeriodoPago(item.periodo_pago || periodoPago);
    setEditEstado(item.estado || "Activo");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setEditUnidadId("");
    setEditNoApartamento("");
    setEditPropietario("");
    setEditDescripcionBanco("");
    setEditPeriodoPago(periodoPago);
    setEditEstado("Activo");
  }

  async function guardarActualizacionAlias(e: React.FormEvent) {
    e.preventDefault();

    if (!editandoId) {
      alert("Debe seleccionar un registro para actualizar.");
      return;
    }

    if (!editNoApartamento.trim()) {
      alert("Debe seleccionar o indicar el apartamento.");
      return;
    }

    if (!editDescripcionBanco.trim()) {
      alert("Debe indicar la descripción banco.");
      return;
    }

    if (!editPeriodoPago) {
      alert("Debe indicar el mes de pago.");
      return;
    }

    const registro = {
      unidad_id: editUnidadId ? Number(editUnidadId) : null,
      no_apartamento: editNoApartamento.trim(),
      propietario: editPropietario.trim(),
      descripcion_banco: editDescripcionBanco.trim(),
      periodo_pago: editPeriodoPago,
      estado: editUnidadId ? editEstado : "Pendiente",
    };

    const { error } = await supabase
      .from("apartamento_banco_alias")
      .update(registro)
      .eq("id", editandoId)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error actualizando cuenta banco propietario: " + error.message);
      return;
    }

    alert("Cuenta banco propietario actualizada correctamente.");
    cancelarEdicion();
    cargarAliasGuardados(condominioId);
  }

  async function cambiarEstado(item: AliasGuardado, nuevoEstado: string) {
    const confirmar = confirm(
      `¿Desea cambiar esta cuenta bancaria a estado "${nuevoEstado}"?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("apartamento_banco_alias")
      .update({ estado: nuevoEstado })
      .eq("id", item.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error actualizando estado: " + error.message);
      return;
    }

    alert("Estado actualizado correctamente.");
    cargarAliasGuardados(condominioId);
  }

  async function eliminarAlias(item: AliasGuardado) {
    const confirmar = confirm(
      `¿Seguro que desea eliminar la cuenta bancaria "${item.descripcion_banco}" del apartamento ${item.no_apartamento}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("apartamento_banco_alias")
      .delete()
      .eq("id", item.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error eliminando cuenta banco propietario: " + error.message);
      return;
    }

    alert("Registro eliminado correctamente.");
    cargarAliasGuardados(condominioId);
  }

  const totalSinUnidad = rows.filter((r) => !r.unidad_id).length;
  const totalConUnidad = rows.filter((r) => r.unidad_id).length;

  const aliasFiltrados = aliasGuardados.filter((item) => {
    const texto = `${item.no_apartamento || ""} ${item.propietario || ""} ${
      item.descripcion_banco || ""
    } ${item.periodo_pago || ""} ${item.estado || ""}`
      .toLowerCase()
      .trim();

    const coincideBusqueda = texto.includes(busqueda.toLowerCase().trim());

    const coincideEstado =
      filtroEstado === "Todos" ? true : item.estado === filtroEstado;

    return coincideBusqueda && coincideEstado;
  });

  const totalGuardados = aliasGuardados.length;
  const totalActivos = aliasGuardados.filter(
    (item) => item.estado === "Activo"
  ).length;
  const totalPendientes = aliasGuardados.filter(
    (item) => item.estado === "Pendiente" || !item.unidad_id
  ).length;
  const totalInactivos = aliasGuardados.filter(
    (item) => item.estado === "Inactivo"
  ).length;

  const registroEditando = aliasGuardados.find(
    (item) => item.id === editandoId
  );

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-3xl font-black text-slate-900">
          Importar Cuentas Banco Propietarios
        </h1>

        <p className="text-slate-500 mt-2">
          Sube el archivo Excel con las cuentas, referencias o descripciones que
          aparecen en el banco para identificar automáticamente a qué apartamento
          o propietario pertenece cada pago.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>

        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          Apartamentos activos cargados:{" "}
          <span className="font-bold text-blue-700">{unidades.length}</span>
        </p>

        {cargandoUnidades && (
          <p className="text-sm text-slate-500 mt-2">
            Cargando apartamentos...
          </p>
        )}

        {!condominioId && (
          <p className="text-sm text-red-600 mt-2">
            No se encontró condominio activo. Debe iniciar sesión nuevamente.
          </p>
        )}
      </div>

      {editandoId && registroEditando && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-3xl p-6">
          <h2 className="text-xl font-black text-yellow-900 mb-4">
            Actualizar cuenta banco propietario
          </h2>

          <div className="bg-white border rounded-2xl p-4 mb-5">
            <p className="text-sm text-slate-500">Registro seleccionado</p>
            <p className="font-bold text-slate-900">
              {registroEditando.descripcion_banco || "-"}
            </p>

            <p className="text-sm text-slate-500 mt-1">
              Estado actual:{" "}
              <span className="font-bold">{registroEditando.estado}</span>
            </p>
          </div>

          <form
            onSubmit={guardarActualizacionAlias}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-semibold mb-1">
                Apartamento correcto *
              </label>

              <select
                value={editUnidadId}
                onChange={(e) => seleccionarUnidadEditar(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="">Seleccione apartamento</option>

                {unidades.map((unidad) => (
                  <option key={unidad.id} value={unidad.id}>
                    {unidad.codigo} - {unidad.propietario_nombre}
                  </option>
                ))}
              </select>

              {!editUnidadId && (
                <p className="text-xs text-yellow-700 mt-1">
                  Si no selecciona apartamento, quedará como Pendiente.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                No. Apartamento
              </label>

              <input
                value={editNoApartamento}
                onChange={(e) => setEditNoApartamento(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Ej. C2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Propietario
              </label>

              <input
                value={editPropietario}
                onChange={(e) => setEditPropietario(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Nombre del propietario"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Mes de pago *
              </label>

              <input
                type="month"
                value={editPeriodoPago}
                onChange={(e) => setEditPeriodoPago(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Estado
              </label>

              <select
                value={editEstado}
                onChange={(e) => setEditEstado(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
                disabled={!editUnidadId}
              >
                <option value="Activo">Activo</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">
                Descripción banco *
              </label>

              <textarea
                value={editDescripcionBanco}
                onChange={(e) => setEditDescripcionBanco(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                rows={3}
                placeholder="Texto o referencia que aparece en el banco"
              />
            </div>

            <div className="md:col-span-2 flex flex-col md:flex-row gap-3">
              <button
                type="submit"
                className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-xl font-bold"
              >
                Guardar actualización
              </button>

              <button
                type="button"
                onClick={cancelarEdicion}
                className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="border rounded-2xl p-5 bg-white shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Mes de pago de la importación
            </label>

            <input
              type="month"
              value={periodoPago}
              onChange={(e) => setPeriodoPago(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2">
              Seleccionar archivo Excel o CSV
            </label>

            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              className="block w-full border rounded-xl px-4 py-3"
            />
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-2">
          Columnas esperadas: No Apartamento y Descripción Banco. También acepta
          Apartamento, Unidad, Código, Descripción, Banco o Alias Banco.
        </p>
      </div>

      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <h2 className="text-lg font-black text-blue-900">
              Revisión previa antes de guardar
            </h2>

            <p className="text-sm text-blue-700 mt-1">
              Revisa estos datos antes de importarlos. Los registros sin
              propietario se guardarán como Pendiente para ser actualizados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border">
              <p className="text-sm text-slate-500">Registros leídos</p>
              <h2 className="text-3xl font-black">{rows.length}</h2>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border">
              <p className="text-sm text-slate-500">Con apartamento</p>
              <h2 className="text-3xl font-black text-green-700">
                {totalConUnidad}
              </h2>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border">
              <p className="text-sm text-slate-500">Pendientes</p>
              <h2 className="text-3xl font-black text-yellow-700">
                {totalSinUnidad}
              </h2>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border">
              <p className="text-sm text-slate-500">Mes de pago</p>
              <h2 className="text-2xl font-black text-blue-700">
                {periodoPago}
              </h2>
            </div>
          </div>

          {totalSinUnidad > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl p-4">
              Hay {totalSinUnidad} cuentas cuyo apartamento no fue encontrado en
              la tabla de unidades. Se importarán como Pendiente.
            </div>
          )}

          <div className="flex items-center justify-between bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="text-lg font-bold">
              Vista previa: {rows.length} registros
            </h2>

            <button
              onClick={guardarEnSupabase}
              disabled={loading}
              className="bg-blue-700 text-white px-5 py-3 rounded-xl hover:bg-blue-800 disabled:opacity-50 font-bold"
            >
              {loading
                ? "Guardando..."
                : "Guardar cuentas banco propietarios"}
            </button>
          </div>

          <div className="overflow-auto border rounded-2xl bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Condominio</th>
                  <th className="p-3 border text-left">Mes pago</th>
                  <th className="p-3 border text-left">No Apartamento</th>
                  <th className="p-3 border text-left">Propietario</th>
                  <th className="p-3 border text-left">Descripción Banco</th>
                  <th className="p-3 border text-center">Estado</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="p-3 border font-semibold">
                      {r.condominio}
                    </td>

                    <td className="p-3 border font-bold">
                      {r.periodo_pago}
                    </td>

                    <td className="p-3 border font-bold">
                      {r.no_apartamento}
                    </td>

                    <td className="p-3 border">
                      {r.propietario || (
                        <span className="text-yellow-700 font-bold">
                          Pendiente de actualizar
                        </span>
                      )}
                    </td>

                    <td className="p-3 border">{r.descripcion_banco}</td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          r.estado === "Activo"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {r.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-black">
              Cuentas banco propietarios cargadas
            </h2>

            <p className="text-sm text-slate-500">
              Aquí puedes revisar cuáles cuentas ya tienen apartamento asignado
              y cuáles están pendientes de actualizar.
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
                <option value="Todos">Todos</option>
                <option value="Activo">Activo</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Buscar</label>

              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Apartamento, propietario..."
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => cargarAliasGuardados(condominioId)}
                className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold w-full"
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
          <div className="bg-slate-50 rounded-2xl p-5 border">
            <p className="text-sm text-slate-500">Total cargadas</p>
            <h2 className="text-3xl font-black">{totalGuardados}</h2>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border">
            <p className="text-sm text-slate-500">Activas</p>
            <h2 className="text-3xl font-black text-green-700">
              {totalActivos}
            </h2>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border">
            <p className="text-sm text-slate-500">Pendientes</p>
            <h2 className="text-3xl font-black text-yellow-700">
              {totalPendientes}
            </h2>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border">
            <p className="text-sm text-slate-500">Inactivas</p>
            <h2 className="text-3xl font-black text-red-700">
              {totalInactivos}
            </h2>
          </div>
        </div>

        {cargandoAlias ? (
          <div>Cargando cuentas banco propietarios...</div>
        ) : (
          <div className="overflow-auto border rounded-2xl bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Mes pago</th>
                  <th className="p-3 border text-left">No Apartamento</th>
                  <th className="p-3 border text-left">Propietario</th>
                  <th className="p-3 border text-left">Descripción Banco</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {aliasFiltrados.map((item) => {
                  const estaPendiente = item.estado === "Pendiente" || !item.unidad_id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3 border font-bold">
                        {item.periodo_pago || "-"}
                      </td>

                      <td className="p-3 border font-black">
                        {item.no_apartamento || "-"}
                      </td>

                      <td className="p-3 border">
                        {item.propietario || (
                          <span className="text-yellow-700 font-bold">
                            Pendiente de actualizar
                          </span>
                        )}
                      </td>

                      <td className="p-3 border">
                        {item.descripcion_banco || "-"}
                      </td>

                      <td className="p-3 border text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            estaPendiente
                              ? "bg-yellow-100 text-yellow-700"
                              : item.estado === "Activo"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {estaPendiente ? "Pendiente" : item.estado || "Activo"}
                        </span>
                      </td>

                      <td className="p-3 border">
                        <div className="flex flex-wrap justify-center gap-2">
                          <button
                            onClick={() => editarAlias(item)}
                            className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Actualizar
                          </button>

                          {item.estado !== "Activo" && item.unidad_id ? (
                            <button
                              onClick={() => cambiarEstado(item, "Activo")}
                              className="bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                            >
                              Activar
                            </button>
                          ) : (
                            <button
                              onClick={() => cambiarEstado(item, "Inactivo")}
                              className="bg-yellow-700 hover:bg-yellow-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                            >
                              Inactivar
                            </button>
                          )}

                          <button
                            onClick={() => eliminarAlias(item)}
                            className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {aliasFiltrados.length === 0 && (
                  <tr>
                    <td
                      className="p-6 border text-center text-slate-500"
                      colSpan={6}
                    >
                      No hay cuentas banco propietarios cargadas para esta
                      consulta.
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