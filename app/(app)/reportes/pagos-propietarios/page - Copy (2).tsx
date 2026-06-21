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

type Pago = {
  id: number;
  condominio_id: number;
  unidad_id: number;
  fecha_pago: string | null;
  monto: number | null;
  metodo_pago: string | null;
  referencia: string | null;
  origen: string | null;
};

type MesEstado = {
  mes: number;
  nombre: string;
  corto: string;
  estado: "PAGADO" | "PARCIAL" | "PENDIENTE" | "SIN_CARGO";
  monto: number;
  pagado: number;
  balance: number;
};

type FilaEstado = {
  unidad_id: number;
  apartamento: string;
  propietario: string;
  telefono: string;
  cuota: number;
  meses: MesEstado[];
  totalFacturado: number;
  totalPagado: number;
  totalPendiente: number;
  mesesPagados: number;
  mesesParciales: number;
  mesesPendientes: number;
};

const meses = [
  { nombre: "Enero", corto: "Ene" },
  { nombre: "Febrero", corto: "Feb" },
  { nombre: "Marzo", corto: "Mar" },
  { nombre: "Abril", corto: "Abr" },
  { nombre: "Mayo", corto: "May" },
  { nombre: "Junio", corto: "Jun" },
  { nombre: "Julio", corto: "Jul" },
  { nombre: "Agosto", corto: "Ago" },
  { nombre: "Septiembre", corto: "Sep" },
  { nombre: "Octubre", corto: "Oct" },
  { nombre: "Noviembre", corto: "Nov" },
  { nombre: "Diciembre", corto: "Dic" },
];

export default function ReportePagosPropietariosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [propietarios, setPropietarios] = useState<PropietarioApartamento[]>(
    []
  );
  const [cargos, setCargos] = useState<CargoPeriodico[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    cargarDatos(id, anio);
  }, []);

  async function cargarDatos(id: string, anioSeleccionado: number) {
    setLoading(true);
    setMensaje("");

    await Promise.all([
      cargarUnidades(id),
      cargarPropietarios(id),
      cargarCargos(id, anioSeleccionado),
      cargarPagos(id, anioSeleccionado),
    ]);

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

  async function cargarCargos(id: string, anioSeleccionado: number) {
    const { data, error } = await supabase
      .from("cargos_periodicos")
      .select(
        "id, condominio_id, unidad_id, anio, mes, periodo, concepto, tipo_cargo, monto, monto_pagado, balance, estado"
      )
      .eq("condominio_id", Number(id))
      .order("periodo", { ascending: true })
      .order("unidad_id", { ascending: true });

    if (error) {
      setMensaje("Error cargando cargos: " + error.message);
      return;
    }

    const lista = ((data as CargoPeriodico[]) || []).filter((c) => {
      const tipo = normalizar(c.tipo_cargo);
      const anioCargo = obtenerAnioCargo(c);

      const esTipoMantenimiento =
        tipo === "MANTENIMIENTO" || tipo === "ORDINARIO";

      return esTipoMantenimiento && anioCargo === anioSeleccionado;
    });

    setCargos(lista);
  }

  async function cargarPagos(id: string, anioSeleccionado: number) {
    const fechaInicio = `${anioSeleccionado}-01-01`;
    const fechaFin = `${anioSeleccionado + 1}-01-01`;

    const { data, error } = await supabase
      .from("pagos")
      .select(
        "id, condominio_id, unidad_id, fecha_pago, monto, metodo_pago, referencia, origen"
      )
      .eq("condominio_id", Number(id))
      .gte("fecha_pago", fechaInicio)
      .lt("fecha_pago", fechaFin)
      .order("fecha_pago", { ascending: true });

    if (error) {
      setMensaje("Error cargando pagos: " + error.message);
      return;
    }

    setPagos((data as Pago[]) || []);
  }

  function cambiarAnio(valor: string) {
    const nuevoAnio = Number(valor);

    setAnio(nuevoAnio);

    if (condominioId) {
      cargarDatos(condominioId, nuevoAnio);
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

  function buscarPropietarioPorUnidad(unidad: Unidad) {
    const codigoUnidad = normalizar(unidad.codigo);

    return (
      propietarios.find((p) => normalizar(p.no_apartamento) === codigoUnidad) ||
      null
    );
  }

  function crearFilaEstado(unidad: Unidad): FilaEstado {
    const propietario = buscarPropietarioPorUnidad(unidad);

    const mesesEstado: MesEstado[] = meses.map((mesInfo, index) => {
      const numeroMes = index + 1;

      const cargosMes = cargos.filter((c) => {
        const mesCargo = obtenerMesCargo(c);

        return (
          Number(c.unidad_id) === Number(unidad.id) &&
          Number(mesCargo) === numeroMes
        );
      });

      if (cargosMes.length === 0) {
        return {
          mes: numeroMes,
          nombre: mesInfo.nombre,
          corto: mesInfo.corto,
          estado: "SIN_CARGO",
          monto: 0,
          pagado: 0,
          balance: 0,
        };
      }

      const monto = cargosMes.reduce(
        (sum, c) => sum + Number(c.monto || 0),
        0
      );

      const pagado = cargosMes.reduce(
        (sum, c) => sum + Number(c.monto_pagado || 0),
        0
      );

      const balance = cargosMes.reduce(
        (sum, c) => sum + Number(c.balance || 0),
        0
      );

      let estado: MesEstado["estado"] = "PENDIENTE";

      if (balance <= 0 && monto > 0) {
        estado = "PAGADO";
      } else if (pagado > 0 && balance > 0) {
        estado = "PARCIAL";
      } else {
        estado = "PENDIENTE";
      }

      return {
        mes: numeroMes,
        nombre: mesInfo.nombre,
        corto: mesInfo.corto,
        estado,
        monto,
        pagado,
        balance,
      };
    });

    const totalFacturado = mesesEstado.reduce(
      (sum, m) => sum + Number(m.monto || 0),
      0
    );

    const totalPagado = mesesEstado.reduce(
      (sum, m) => sum + Number(m.pagado || 0),
      0
    );

    const totalPendiente = mesesEstado.reduce(
      (sum, m) => sum + Number(m.balance || 0),
      0
    );

    const mesesPagados = mesesEstado.filter((m) => m.estado === "PAGADO").length;

    const mesesParciales = mesesEstado.filter(
      (m) => m.estado === "PARCIAL"
    ).length;

    const mesesPendientes = mesesEstado.filter(
      (m) => m.estado === "PENDIENTE"
    ).length;

    return {
      unidad_id: unidad.id,
      apartamento: unidad.codigo,
      propietario: propietario?.nombre_propietario || "Sin propietario",
      telefono: propietario?.telefono || "-",
      cuota: Number(unidad.cuota_mensual_actual || 0),
      meses: mesesEstado,
      totalFacturado,
      totalPagado,
      totalPendiente,
      mesesPagados,
      mesesParciales,
      mesesPendientes,
    };
  }

  const filas = useMemo(() => {
    return unidades.map((u) => crearFilaEstado(u));
  }, [unidades, propietarios, cargos, pagos]);

  const filasFiltradas = useMemo(() => {
    const texto = buscar.toLowerCase().trim();

    let lista = filas;

    if (texto) {
      lista = lista.filter((f) => {
        const combinado = `
          ${f.apartamento}
          ${f.propietario}
          ${f.telefono}
        `.toLowerCase();

        return combinado.includes(texto);
      });
    }

    if (filtroEstado === "CON_DEUDA") {
      lista = lista.filter((f) => f.totalPendiente > 0);
    }

    if (filtroEstado === "AL_DIA") {
      lista = lista.filter((f) => f.totalPendiente <= 0 && f.totalFacturado > 0);
    }

    if (filtroEstado === "SIN_CARGOS") {
      lista = lista.filter((f) => f.totalFacturado <= 0);
    }

    return lista;
  }, [filas, buscar, filtroEstado]);

  const resumenMeses = useMemo(() => {
    return meses.map((mesInfo, index) => {
      const numeroMes = index + 1;

      const cargosMes = cargos.filter(
        (c) => obtenerMesCargo(c) === numeroMes
      );

      const facturado = cargosMes.reduce(
        (sum, c) => sum + Number(c.monto || 0),
        0
      );

      const pagado = cargosMes.reduce(
        (sum, c) => sum + Number(c.monto_pagado || 0),
        0
      );

      const pendiente = cargosMes.reduce(
        (sum, c) => sum + Number(c.balance || 0),
        0
      );

      return {
        mes: numeroMes,
        nombre: mesInfo.nombre,
        corto: mesInfo.corto,
        cantidad: cargosMes.length,
        facturado,
        pagado,
        pendiente,
      };
    });
  }, [cargos]);

  const totalFacturadoGeneral = filasFiltradas.reduce(
    (sum, f) => sum + f.totalFacturado,
    0
  );

  const totalPagadoGeneral = filasFiltradas.reduce(
    (sum, f) => sum + f.totalPagado,
    0
  );

  const totalPendienteGeneral = filasFiltradas.reduce(
    (sum, f) => sum + f.totalPendiente,
    0
  );

  const unidadesConDeuda = filasFiltradas.filter(
    (f) => f.totalPendiente > 0
  ).length;

  const unidadesAlDia = filasFiltradas.filter(
    (f) => f.totalPendiente <= 0 && f.totalFacturado > 0
  ).length;

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  function claseEstado(estado: MesEstado["estado"]) {
    if (estado === "PAGADO") {
      return "bg-green-100 text-green-700 border-green-200";
    }

    if (estado === "PARCIAL") {
      return "bg-blue-100 text-blue-700 border-blue-200";
    }

    if (estado === "PENDIENTE") {
      return "bg-red-100 text-red-700 border-red-200";
    }

    return "bg-slate-100 text-slate-400 border-slate-200";
  }

  function textoEstado(estado: MesEstado["estado"]) {
    if (estado === "PAGADO") return "P";
    if (estado === "PARCIAL") return "PA";
    if (estado === "PENDIENTE") return "PD";
    return "-";
  }

  function descripcionEstado(estado: MesEstado["estado"]) {
    if (estado === "PAGADO") return "Pagado";
    if (estado === "PARCIAL") return "Parcial";
    if (estado === "PENDIENTE") return "Pendiente";
    return "Sin cargo";
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Pagos por Propietario
            </h1>

            <p className="text-slate-500 text-sm mt-1">
              Relación compacta de meses pagados, parciales y pendientes.
            </p>

            <p className="text-sm text-blue-700 font-bold mt-2">
              Condominio activo: {condominioNombre || "No seleccionado"}
            </p>
          </div>

          <div className="flex gap-2 text-xs">
            <span className="bg-green-100 text-green-700 border border-green-200 rounded-full px-3 py-1 font-bold">
              P = Pagado
            </span>
            <span className="bg-blue-100 text-blue-700 border border-blue-200 rounded-full px-3 py-1 font-bold">
              PA = Parcial
            </span>
            <span className="bg-red-100 text-red-700 border border-red-200 rounded-full px-3 py-1 font-bold">
              PD = Pendiente
            </span>
          </div>
        </div>
      </div>

      {mensaje && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm">
          {mensaje}
        </div>
      )}

      <div className="bg-white rounded-2xl border shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-sm font-semibold mb-1">Año</label>
            <select
              value={anio}
              onChange={(e) => cambiarAnio(e.target.value)}
              className="border rounded-xl px-3 py-2 w-full bg-white text-sm"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border rounded-xl px-3 py-2 w-full bg-white text-sm"
            >
              <option value="TODOS">Todos</option>
              <option value="CON_DEUDA">Con deuda</option>
              <option value="AL_DIA">Al día</option>
              <option value="SIN_CARGOS">Sin cargos</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">Buscar</label>
            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="border rounded-xl px-3 py-2 w-full text-sm"
              placeholder="Apartamento, propietario o teléfono..."
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <ResumenCard
          titulo="Facturado"
          valor={totalFacturadoGeneral}
          color="text-blue-700"
        />

        <ResumenCard
          titulo="Pagado"
          valor={totalPagadoGeneral}
          color="text-green-700"
        />

        <ResumenCard
          titulo="Pendiente"
          valor={totalPendienteGeneral}
          color="text-red-700"
        />

        <ResumenCard
          titulo="Con deuda"
          valor={unidadesConDeuda}
          color="text-amber-700"
          esCantidad
        />

        <ResumenCard
          titulo="Al día"
          valor={unidadesAlDia}
          color="text-emerald-700"
          esCantidad
        />
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-4">
        <h2 className="font-black text-sm mb-3">Resumen por mes</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {resumenMeses.map((r) => (
            <div
              key={r.mes}
              className="border rounded-xl p-3 bg-slate-50 text-xs"
            >
              <div className="flex items-center justify-between">
                <p className="font-black text-slate-800">{r.corto}</p>
                <span className="text-slate-500">{r.cantidad} cargos</span>
              </div>

              <p className="text-blue-700 font-bold mt-2">
                RD$ {dinero(r.facturado)}
              </p>

              <p className="text-green-700 mt-1">
                Pagado: RD$ {dinero(r.pagado)}
              </p>

              <p className="text-red-700 mt-1">
                Pend.: RD$ {dinero(r.pendiente)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <h2 className="font-black text-lg">Detalle compacto</h2>

          <p className="text-xs text-slate-500">
            Cada columna muestra el estado del mes. Coloca el cursor encima para
            ver monto, pagado y balance.
          </p>
        </div>

        {loading ? (
          <div className="p-6">Cargando información...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 border text-left sticky left-0 bg-slate-100 z-20 min-w-24">
                    Apto
                  </th>
                  <th className="p-2 border text-left min-w-52">
                    Propietario
                  </th>

                  {meses.map((m) => (
                    <th key={m.corto} className="p-2 border text-center">
                      {m.corto}
                    </th>
                  ))}

                  <th className="p-2 border text-right min-w-24">Pagado</th>
                  <th className="p-2 border text-right min-w-24">Pend.</th>
                  <th className="p-2 border text-center min-w-20">Meses</th>
                </tr>
              </thead>

              <tbody>
                {filasFiltradas.map((fila) => (
                  <tr key={fila.unidad_id} className="hover:bg-slate-50">
                    <td className="p-2 border font-black sticky left-0 bg-white z-10">
                      {fila.apartamento}
                    </td>

                    <td className="p-2 border">
                      <div className="font-semibold text-slate-800">
                        {fila.propietario}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {fila.telefono}
                      </div>
                    </td>

                    {fila.meses.map((mes) => (
                      <td key={mes.mes} className="p-1 border text-center">
                        <div
                          className={`inline-flex items-center justify-center w-8 h-7 border rounded-lg text-[10px] font-black ${claseEstado(
                            mes.estado
                          )}`}
                          title={`${mes.nombre} - ${descripcionEstado(
                            mes.estado
                          )} | Monto: RD$ ${dinero(
                            mes.monto
                          )} | Pagado: RD$ ${dinero(
                            mes.pagado
                          )} | Balance: RD$ ${dinero(mes.balance)}`}
                        >
                          {textoEstado(mes.estado)}
                        </div>
                      </td>
                    ))}

                    <td className="p-2 border text-right font-bold text-green-700">
                      RD$ {dinero(fila.totalPagado)}
                    </td>

                    <td className="p-2 border text-right font-bold text-red-700">
                      RD$ {dinero(fila.totalPendiente)}
                    </td>

                    <td className="p-2 border text-center font-black text-red-700">
                      {fila.mesesPendientes}
                    </td>
                  </tr>
                ))}

                {filasFiltradas.length === 0 && (
                  <tr>
                    <td
                      colSpan={18}
                      className="p-6 border text-center text-slate-500"
                    >
                      No hay información para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-slate-50 border rounded-xl p-4 text-xs text-slate-600">
        <p>
          <strong>Nota:</strong> Este reporte toma cargos tipo{" "}
          <strong>MANTENIMIENTO</strong> y <strong>ORDINARIO</strong>. Si el
          campo <strong>mes</strong> está vacío, el sistema calcula el mes desde{" "}
          <strong>periodo</strong>.
        </p>
      </div>
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