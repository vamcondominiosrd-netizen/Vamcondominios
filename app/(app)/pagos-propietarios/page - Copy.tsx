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

type ResumenMes = {
  mes: number;
  nombre: string;
  cantidad: number;
  facturado: number;
  pagado: number;
  pendiente: number;
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

export default function ReportePagosPropietariosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [buscar, setBuscar] = useState("");

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
    /*
      Cargamos los cargos del condominio y filtramos el año en JavaScript.
      Esto evita que se pierdan cargos si anio o mes vienen vacíos, pero periodo
      sí viene correcto, por ejemplo: 2026-02.
    */
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
      propietarios.find(
        (p) => normalizar(p.no_apartamento) === codigoUnidad
      ) || null
    );
  }

  function crearFilaEstado(unidad: Unidad): FilaEstado {
    const propietario = buscarPropietarioPorUnidad(unidad);

    const mesesEstado: MesEstado[] = meses.map((nombreMes, index) => {
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
          nombre: nombreMes,
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
        nombre: nombreMes,
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

    if (!texto) return filas;

    return filas.filter((f) => {
      const combinado = `
        ${f.apartamento}
        ${f.propietario}
        ${f.telefono}
      `.toLowerCase();

      return combinado.includes(texto);
    });
  }, [filas, buscar]);

  const resumenMeses = useMemo<ResumenMes[]>(() => {
    return meses.map((nombreMes, index) => {
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
        nombre: nombreMes,
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

    return "bg-slate-100 text-slate-500 border-slate-200";
  }

  function textoEstado(estado: MesEstado["estado"]) {
    if (estado === "PAGADO") return "Pagado";
    if (estado === "PARCIAL") return "Parcial";
    if (estado === "PENDIENTE") return "Pendiente";
    return "Sin cargo";
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-3xl font-black text-slate-900">
          Relación de Pagos por Propietario
        </h1>

        <p className="text-slate-500 mt-2">
          Vista mensual de pagos realizados, pagos parciales y meses pendientes
          por apartamento.
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

      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2">Buscar</label>
            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Buscar por apartamento, propietario o teléfono..."
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ResumenCard
          titulo="Total facturado"
          valor={totalFacturadoGeneral}
          color="text-blue-700"
        />

        <ResumenCard
          titulo="Total pagado"
          valor={totalPagadoGeneral}
          color="text-green-700"
        />

        <ResumenCard
          titulo="Total pendiente"
          valor={totalPendienteGeneral}
          color="text-red-700"
        />

        <ResumenCard
          titulo="Unidades con deuda"
          valor={unidadesConDeuda}
          color="text-amber-700"
          esCantidad
        />
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-black text-lg">Resumen de cargos por mes</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 border text-left">Mes</th>
                <th className="p-3 border text-center">Cantidad cargos</th>
                <th className="p-3 border text-right">Facturado</th>
                <th className="p-3 border text-right">Pagado</th>
                <th className="p-3 border text-right">Pendiente</th>
              </tr>
            </thead>

            <tbody>
              {resumenMeses.map((r) => (
                <tr key={r.mes}>
                  <td className="p-3 border font-bold">{r.nombre}</td>
                  <td className="p-3 border text-center">{r.cantidad}</td>
                  <td className="p-3 border text-right">
                    RD$ {dinero(r.facturado)}
                  </td>
                  <td className="p-3 border text-right text-green-700">
                    RD$ {dinero(r.pagado)}
                  </td>
                  <td className="p-3 border text-right text-red-700 font-bold">
                    RD$ {dinero(r.pendiente)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-black text-lg">
            Pagos mes por mes de propietarios
          </h2>
        </div>

        {loading ? (
          <div className="p-6">Cargando información...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left sticky left-0 bg-slate-100 z-10">
                    Apartamento
                  </th>
                  <th className="p-3 border text-left">Propietario</th>
                  <th className="p-3 border text-left">Teléfono</th>

                  {meses.map((m) => (
                    <th key={m} className="p-3 border text-center">
                      {m.slice(0, 3)}
                    </th>
                  ))}

                  <th className="p-3 border text-right">Facturado</th>
                  <th className="p-3 border text-right">Pagado</th>
                  <th className="p-3 border text-right">Pendiente</th>
                  <th className="p-3 border text-center">Meses Pend.</th>
                </tr>
              </thead>

              <tbody>
                {filasFiltradas.map((fila) => (
                  <tr key={fila.unidad_id} className="hover:bg-slate-50">
                    <td className="p-3 border font-black sticky left-0 bg-white z-10">
                      {fila.apartamento}
                    </td>

                    <td className="p-3 border min-w-52">
                      {fila.propietario}
                    </td>

                    <td className="p-3 border">{fila.telefono}</td>

                    {fila.meses.map((mes) => (
                      <td key={mes.mes} className="p-2 border text-center">
                        <div
                          className={`border rounded-lg px-2 py-1 font-bold ${claseEstado(
                            mes.estado
                          )}`}
                          title={`Monto: RD$ ${dinero(
                            mes.monto
                          )} | Pagado: RD$ ${dinero(
                            mes.pagado
                          )} | Balance: RD$ ${dinero(mes.balance)}`}
                        >
                          {textoEstado(mes.estado)}
                        </div>

                        {mes.estado !== "SIN_CARGO" && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            RD$ {dinero(mes.pagado)}
                          </div>
                        )}
                      </td>
                    ))}

                    <td className="p-3 border text-right font-bold">
                      RD$ {dinero(fila.totalFacturado)}
                    </td>

                    <td className="p-3 border text-right font-bold text-green-700">
                      RD$ {dinero(fila.totalPagado)}
                    </td>

                    <td className="p-3 border text-right font-bold text-red-700">
                      RD$ {dinero(fila.totalPendiente)}
                    </td>

                    <td className="p-3 border text-center font-black text-red-700">
                      {fila.mesesPendientes}
                    </td>
                  </tr>
                ))}

                {filasFiltradas.length === 0 && (
                  <tr>
                    <td
                      colSpan={19}
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

      <div className="bg-slate-50 border rounded-xl p-4 text-sm text-slate-600">
        <p>
          <strong>Nota:</strong> Este reporte se basa en los cargos generados en{" "}
          <strong>cargos_periodicos</strong>. Un mes aparecerá como pagado
          cuando el balance del cargo esté en cero. También toma como cargos de
          mantenimiento los tipos <strong>ORDINARIO</strong> y{" "}
          <strong>MANTENIMIENTO</strong>. Si el campo <strong>mes</strong> viene
          vacío, el sistema obtiene el mes desde <strong>periodo</strong>.
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
    <div className="bg-white rounded-2xl border shadow-sm p-5">
      <p className="text-sm text-slate-500">{titulo}</p>

      <h2 className={`text-2xl font-black mt-2 ${color}`}>
        {esCantidad
          ? Number(valor || 0).toLocaleString("es-DO")
          : `RD$ ${Number(valor || 0).toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}`}
      </h2>
    </div>
  );
}