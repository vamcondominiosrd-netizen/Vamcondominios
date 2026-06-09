"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Unidad = {
  id: number;
  codigo: string;
  tipo: string | null;
  cuota_mensual_actual: number | null;
  activa: boolean | null;
};

type PropietarioApartamento = {
  id: number;
  condominio_id: number;
  no_apartamento: string | null;
  nombre_propietario: string | null;
  cedula: string | null;
  telefono: string | null;
  correo: string | null;
  estado: string | null;
};

type CargoPeriodico = {
  id: number;
  condominio_id: number;
  unidad_id: number;
  anio: number | null;
  mes: number | null;
  periodo: string | null;
  concepto: string | null;
  tipo_cargo: string | null;
  monto: number | null;
  monto_pagado: number | null;
  balance: number | null;
  estado: string | null;
};

type CargoEditable = CargoPeriodico & {
  mes_calculado: number;
  anio_calculado: number;
  nombre_mes: string;
};

const meses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default function CuadrePropietarioPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [unidadId, setUnidadId] = useState("");
  const [buscar, setBuscar] = useState("");

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [propietarios, setPropietarios] = useState<PropietarioApartamento[]>([]);
  const [cargos, setCargos] = useState<CargoEditable[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [cargoEditando, setCargoEditando] = useState<CargoEditable | null>(null);
  const [montoPagadoEdit, setMontoPagadoEdit] = useState("");
  const [balanceEdit, setBalanceEdit] = useState("");
  const [estadoEdit, setEstadoEdit] = useState("PENDIENTE");
  const [observacionEdit, setObservacionEdit] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const usuario = localStorage.getItem("usuario_nombre") || "Usuario del sistema";

    setCondominioId(id);
    setCondominioNombre(nombre);
    setUsuarioNombre(usuario);

    if (!id) {
      setMensaje("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarBase(id);
  }, []);

  async function cargarBase(id: string) {
    setLoading(true);
    setMensaje("");

    await Promise.all([cargarUnidades(id), cargarPropietarios(id)]);

    setLoading(false);
  }

  async function cargarUnidades(id: string) {
    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo, tipo, cuota_mensual_actual, activa")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo", { ascending: true });

    if (error) {
      setMensaje("Error cargando unidades: " + error.message);
      return;
    }

    setUnidades((data as Unidad[]) || []);
  }

  async function cargarPropietarios(id: string) {
    const { data, error } = await supabase
      .from("propietarios_apartamentos")
      .select(
        "id, condominio_id, no_apartamento, nombre_propietario, cedula, telefono, correo, estado"
      )
      .eq("condominio_id", Number(id))
      .order("no_apartamento", { ascending: true });

    if (error) {
      setMensaje("Error cargando propietarios: " + error.message);
      return;
    }

    setPropietarios((data as PropietarioApartamento[]) || []);
  }

  async function cargarCargosUnidad(idUnidad: string, anioSeleccionado: number) {
    if (!condominioId || !idUnidad) {
      setCargos([]);
      return;
    }

    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("cargos_periodicos")
      .select(
        "id, condominio_id, unidad_id, anio, mes, periodo, concepto, tipo_cargo, monto, monto_pagado, balance, estado"
      )
      .eq("condominio_id", Number(condominioId))
      .eq("unidad_id", Number(idUnidad))
      .order("periodo", { ascending: true })
      .order("id", { ascending: true });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando cargos del propietario: " + error.message);
      return;
    }

    const lista = ((data as CargoPeriodico[]) || [])
      .filter((c) => {
        const tipo = normalizar(c.tipo_cargo);
        const anioCargo = obtenerAnioCargo(c);

        return (
          anioCargo === anioSeleccionado &&
          (tipo === "MANTENIMIENTO" || tipo === "ORDINARIO")
        );
      })
      .map((c) => {
        const mesCalculado = obtenerMesCargo(c);
        const anioCalculado = obtenerAnioCargo(c);

        return {
          ...c,
          mes_calculado: mesCalculado,
          anio_calculado: anioCalculado,
          nombre_mes: meses[mesCalculado - 1] || "-",
        };
      });

    setCargos(lista);
  }

  function cambiarUnidad(valor: string) {
    setUnidadId(valor);
    setCargoEditando(null);

    if (valor) {
      cargarCargosUnidad(valor, anio);
    } else {
      setCargos([]);
    }
  }

  function cambiarAnio(valor: string) {
    const nuevoAnio = Number(valor);
    setAnio(nuevoAnio);
    setCargoEditando(null);

    if (unidadId) {
      cargarCargosUnidad(unidadId, nuevoAnio);
    }
  }

  function normalizar(valor: string | null | undefined) {
    return String(valor || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
  }

  function obtenerAnioCargo(cargo: CargoPeriodico) {
    if (cargo.anio) return Number(cargo.anio);

    if (cargo.periodo && /^\d{4}-\d{2}$/.test(cargo.periodo)) {
      return Number(cargo.periodo.split("-")[0]);
    }

    return 0;
  }

  function obtenerMesCargo(cargo: CargoPeriodico) {
    if (cargo.mes) return Number(cargo.mes);

    if (cargo.periodo && /^\d{4}-\d{2}$/.test(cargo.periodo)) {
      return Number(cargo.periodo.split("-")[1]);
    }

    return 0;
  }

  function buscarPropietarioPorUnidad(unidad: Unidad | null) {
    if (!unidad) return null;

    const codigoUnidad = normalizar(unidad.codigo);

    return (
      propietarios.find((p) => normalizar(p.no_apartamento) === codigoUnidad) ||
      null
    );
  }

  const unidadesFiltradas = useMemo(() => {
    const texto = buscar.toLowerCase().trim();

    if (!texto) return unidades;

    return unidades.filter((u) => {
      const propietario = buscarPropietarioPorUnidad(u);

      const combinado = `
        ${u.codigo}
        ${propietario?.nombre_propietario || ""}
        ${propietario?.telefono || ""}
        ${propietario?.cedula || ""}
      `.toLowerCase();

      return combinado.includes(texto);
    });
  }, [unidades, propietarios, buscar]);

  const unidadSeleccionada = useMemo(() => {
    return unidades.find((u) => String(u.id) === unidadId) || null;
  }, [unidades, unidadId]);

  const propietarioSeleccionado = useMemo(() => {
    return buscarPropietarioPorUnidad(unidadSeleccionada);
  }, [unidadSeleccionada, propietarios]);

  const totalFacturado = cargos.reduce((sum, c) => sum + Number(c.monto || 0), 0);
  const totalPagado = cargos.reduce(
    (sum, c) => sum + Number(c.monto_pagado || 0),
    0
  );
  const totalPendiente = cargos.reduce(
    (sum, c) => sum + Number(c.balance || 0),
    0
  );

  const mesesPagados = cargos.filter(
    (c) => Number(c.balance || 0) <= 0 && Number(c.monto || 0) > 0
  ).length;

  const mesesPendientes = cargos.filter(
    (c) => Number(c.balance || 0) > 0 && Number(c.monto_pagado || 0) <= 0
  ).length;

  const mesesParciales = cargos.filter(
    (c) => Number(c.balance || 0) > 0 && Number(c.monto_pagado || 0) > 0
  ).length;

  function abrirEditar(cargo: CargoEditable) {
    setCargoEditando(cargo);
    setMontoPagadoEdit(String(Number(cargo.monto_pagado || 0)));
    setBalanceEdit(String(Number(cargo.balance || 0)));
    setEstadoEdit(cargo.estado || calcularEstado(cargo));
    setObservacionEdit("");

    setTimeout(() => {
      const elemento = document.getElementById("panel-ajuste-cargo");
      elemento?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function calcularEstado(cargo: CargoPeriodico) {
    const monto = Number(cargo.monto || 0);
    const pagado = Number(cargo.monto_pagado || 0);
    const balance = Number(cargo.balance || 0);

    if (balance <= 0 && monto > 0) return "PAGADO";
    if (pagado > 0 && balance > 0) return "PARCIAL";
    return "PENDIENTE";
  }

  function sugerirEstadoPorMontos() {
    const montoPagado = Number(montoPagadoEdit || 0);
    const balance = Number(balanceEdit || 0);

    if (balance <= 0) {
      setEstadoEdit("PAGADO");
    } else if (montoPagado > 0 && balance > 0) {
      setEstadoEdit("PARCIAL");
    } else {
      setEstadoEdit("PENDIENTE");
    }
  }

  async function guardarAjuste() {
    if (!cargoEditando) return;

    if (!observacionEdit.trim()) {
      alert("Debe indicar una observación para justificar el ajuste.");
      return;
    }

    const montoPagadoNuevo = Number(montoPagadoEdit || 0);
    const balanceNuevo = Number(balanceEdit || 0);

    if (montoPagadoNuevo < 0 || balanceNuevo < 0) {
      alert("Los montos no pueden ser negativos.");
      return;
    }

    const confirmar = confirm(
      `Se ajustará el cargo de ${cargoEditando.nombre_mes} ${anio}.\n\n¿Desea continuar?`
    );

    if (!confirmar) return;

    setGuardando(true);
    setMensaje("");

    const estadoAnterior = cargoEditando.estado || calcularEstado(cargoEditando);

    const { error: errorHistorial } = await supabase
      .from("ajustes_cargos_propietarios")
      .insert([
        {
          condominio_id: Number(condominioId),
          unidad_id: Number(cargoEditando.unidad_id),
          cargo_id: Number(cargoEditando.id),
          anio: cargoEditando.anio_calculado,
          mes: cargoEditando.mes_calculado,
          periodo: cargoEditando.periodo,
          monto_anterior: Number(cargoEditando.monto || 0),
          monto_pagado_anterior: Number(cargoEditando.monto_pagado || 0),
          balance_anterior: Number(cargoEditando.balance || 0),
          estado_anterior: estadoAnterior,
          monto_pagado_nuevo: montoPagadoNuevo,
          balance_nuevo: balanceNuevo,
          estado_nuevo: estadoEdit,
          observacion: observacionEdit.trim(),
          usuario_nombre: usuarioNombre,
        },
      ]);

    if (errorHistorial) {
      setGuardando(false);
      setMensaje("Error guardando historial del ajuste: " + errorHistorial.message);
      return;
    }

    const { error: errorUpdate } = await supabase
      .from("cargos_periodicos")
      .update({
        monto_pagado: montoPagadoNuevo,
        balance: balanceNuevo,
        estado: estadoEdit,
      })
      .eq("id", cargoEditando.id)
      .eq("condominio_id", Number(condominioId))
      .eq("unidad_id", Number(cargoEditando.unidad_id));

    setGuardando(false);

    if (errorUpdate) {
      setMensaje("Error actualizando cargo: " + errorUpdate.message);
      return;
    }

    setMensaje("Ajuste guardado correctamente. El estado del propietario fue actualizado.");
    setCargoEditando(null);
    setMontoPagadoEdit("");
    setBalanceEdit("");
    setEstadoEdit("PENDIENTE");
    setObservacionEdit("");

    await cargarCargosUnidad(String(cargoEditando.unidad_id), anio);
  }

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  function claseEstado(estadoTexto: string | null | undefined, cargo?: CargoPeriodico) {
    const estado = normalizar(estadoTexto || (cargo ? calcularEstado(cargo) : ""));

    if (estado === "PAGADO") return "bg-green-100 text-green-700 border-green-200";
    if (estado === "PARCIAL") return "bg-blue-100 text-blue-700 border-blue-200";
    if (estado === "ANULADO") return "bg-slate-200 text-slate-700 border-slate-300";
    return "bg-red-100 text-red-700 border-red-200";
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-3xl shadow-sm p-6">
        <h1 className="text-3xl font-black text-slate-900">
          Cuadre de Propietario
        </h1>

        <p className="text-slate-500 mt-2">
          Consulta y ajuste operativo de cargos mensuales por apartamento.
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

      <div className="bg-white border rounded-2xl shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold mb-2">Año</label>
            <select
              value={anio}
              onChange={(e) => cambiarAnio(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Buscar propietario
            </label>
            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Apto, nombre, teléfono..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2">
              Apartamento / propietario
            </label>
            <select
              value={unidadId}
              onChange={(e) => cambiarUnidad(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="">Seleccione apartamento</option>

              {unidadesFiltradas.map((u) => {
                const propietario = buscarPropietarioPorUnidad(u);

                return (
                  <option key={u.id} value={u.id}>
                    {u.codigo} - {propietario?.nombre_propietario || "Sin propietario"}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {unidadSeleccionada && (
        <div className="bg-white border rounded-2xl shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <InfoCard titulo="Apartamento" valor={unidadSeleccionada.codigo} />
            <InfoCard
              titulo="Propietario"
              valor={propietarioSeleccionado?.nombre_propietario || "Sin propietario"}
            />
            <InfoCard
              titulo="Teléfono"
              valor={propietarioSeleccionado?.telefono || "-"}
            />
            <InfoCard
              titulo="Cuota actual"
              valor={`RD$ ${dinero(unidadSeleccionada.cuota_mensual_actual)}`}
            />
          </div>
        </div>
      )}

      {unidadSeleccionada && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <ResumenCard titulo="Facturado" valor={totalFacturado} color="text-blue-700" />
          <ResumenCard titulo="Pagado" valor={totalPagado} color="text-green-700" />
          <ResumenCard titulo="Pendiente" valor={totalPendiente} color="text-red-700" />
          <ResumenCard titulo="Meses pagados" valor={mesesPagados} color="text-emerald-700" esCantidad />
          <ResumenCard titulo="Meses pendientes" valor={mesesPendientes + mesesParciales} color="text-amber-700" esCantidad />
        </div>
      )}

      {cargoEditando && (
        <div
          id="panel-ajuste-cargo"
          className="bg-white border-2 border-blue-200 rounded-3xl shadow-sm p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Ajustar cargo - {cargoEditando.nombre_mes} {anio}
              </h2>

              <p className="text-sm text-slate-500">
                Cargo ID: {cargoEditando.id} | Período:{" "}
                {cargoEditando.periodo || `${anio}-${String(cargoEditando.mes_calculado).padStart(2, "0")}`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCargoEditando(null)}
              className="bg-slate-700 text-white px-4 py-2 rounded-xl font-bold text-sm"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Monto facturado
              </label>
              <input
                value={dinero(cargoEditando.monto)}
                disabled
                className="border rounded-xl px-4 py-3 w-full bg-slate-100 text-slate-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Monto pagado
              </label>
              <input
                type="number"
                step="0.01"
                value={montoPagadoEdit}
                onChange={(e) => setMontoPagadoEdit(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Balance pendiente
              </label>
              <input
                type="number"
                step="0.01"
                value={balanceEdit}
                onChange={(e) => setBalanceEdit(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Estado
              </label>
              <select
                value={estadoEdit}
                onChange={(e) => setEstadoEdit(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="PARCIAL">PARCIAL</option>
                <option value="PAGADO">PAGADO</option>
                <option value="ANULADO">ANULADO</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={sugerirEstadoPorMontos}
                className="bg-slate-900 text-white px-4 py-3 rounded-xl font-bold w-full"
              >
                Sugerir estado
              </button>
            </div>

            <div className="md:col-span-5">
              <label className="block text-sm font-semibold mb-1">
                Observación del ajuste *
              </label>
              <textarea
                value={observacionEdit}
                onChange={(e) => setObservacionEdit(e.target.value)}
                rows={3}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Ej. Ajuste realizado por validación de comprobante bancario..."
              />
            </div>

            <div className="md:col-span-5">
              <button
                type="button"
                disabled={guardando}
                onClick={guardarAjuste}
                className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-6 py-3 rounded-xl font-bold"
              >
                {guardando ? "Guardando ajuste..." : "Guardar ajuste"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-black text-lg">Estado mensual del propietario</h2>
        </div>

        {!unidadSeleccionada ? (
          <div className="p-8 text-center text-slate-500">
            Seleccione un apartamento para ver su estado mensual.
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-slate-500">
            Cargando cargos...
          </div>
        ) : cargos.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No hay cargos generados para este propietario en el año seleccionado.
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Mes</th>
                  <th className="p-3 border text-left">Período</th>
                  <th className="p-3 border text-left">Tipo</th>
                  <th className="p-3 border text-right">Facturado</th>
                  <th className="p-3 border text-right">Pagado</th>
                  <th className="p-3 border text-right">Balance</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {cargos.map((c) => {
                  const estadoReal = c.estado || calcularEstado(c);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-3 border font-bold">{c.nombre_mes}</td>

                      <td className="p-3 border">
                        {c.periodo ||
                          `${c.anio_calculado}-${String(c.mes_calculado).padStart(2, "0")}`}
                      </td>

                      <td className="p-3 border">{c.tipo_cargo || "-"}</td>

                      <td className="p-3 border text-right">
                        RD$ {dinero(c.monto)}
                      </td>

                      <td className="p-3 border text-right text-green-700 font-bold">
                        RD$ {dinero(c.monto_pagado)}
                      </td>

                      <td className="p-3 border text-right text-red-700 font-bold">
                        RD$ {dinero(c.balance)}
                      </td>

                      <td className="p-3 border text-center">
                        <span
                          className={`px-3 py-1 rounded-full border text-xs font-bold ${claseEstado(
                            estadoReal,
                            c
                          )}`}
                        >
                          {estadoReal}
                        </span>
                      </td>

                      <td className="p-3 border text-center">
                        <button
                          type="button"
                          onClick={() => abrirEditar(c)}
                          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold"
                        >
                          Ajustar
                        </button>
                      </td>
                    </tr>
                  );
                })}

                <tr className="bg-slate-100 font-black">
                  <td className="p-3 border" colSpan={3}>
                    TOTAL
                  </td>
                  <td className="p-3 border text-right">
                    RD$ {dinero(totalFacturado)}
                  </td>
                  <td className="p-3 border text-right text-green-700">
                    RD$ {dinero(totalPagado)}
                  </td>
                  <td className="p-3 border text-right text-red-700">
                    RD$ {dinero(totalPendiente)}
                  </td>
                  <td className="p-3 border text-center" colSpan={2}>
                    -
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Importante:</strong> Este módulo ajusta el estado de los cargos
        para cuadrar el propietario. No crea ingresos nuevos en banco ni registra
        pagos nuevos en la tabla pagos. Todo ajuste queda guardado en historial.
      </div>
    </div>
  );
}

function InfoCard({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="bg-slate-50 border rounded-2xl p-4">
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className="font-black text-slate-800 mt-1">{valor}</p>
    </div>
  );
}

function ResumenCard({
  titulo,
  valor,
  color,
  esCantidad = false,
}: {
  titulo: string;
  valor: number;
  color: string;
  esCantidad?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-4">
      <p className="text-xs text-slate-500">{titulo}</p>

      <h2 className={`text-xl font-black mt-1 ${color}`}>
        {esCantidad
          ? Number(valor || 0).toLocaleString("es-DO")
          : `RD$ ${Number(valor || 0).toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}`}
      </h2>
    </div>
  );
}