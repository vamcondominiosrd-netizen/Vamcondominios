"use client";

/*
 * VAM Administración de Condominios
 * Módulo: Reportes / Pagos por Propietarios
 * Versión: v2.0
 * Fecha de versión: 02/10/2026
 *
 * CAMBIOS v2.0
 * - Actualizado al formato visual Enterprise de VAM.
 * - Retirado el bloque mensual agregado para enfocar el reporte en cada propietario.
 * - Se conserva la consulta anual por apartamento y estado mes a mes.
 * - Se mantienen totales facturados, pagados, pendientes y unidades con deuda.
 */

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  ClipboardCheck,
  Coins,
  CreditCard,
  FileSpreadsheet,
  Landmark,
  ReceiptText,
  Users,
  WalletCards,
} from "lucide-react";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import StatCard from "@/components/vam/enterprise/StatCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

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

const MESES = [
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
  const [apartamentoSeleccionado, setApartamentoSeleccionado] = useState("");

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [propietarios, setPropietarios] = useState<PropietarioApartamento[]>([]);
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

    void cargarDatos(id, anio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarDatos(id: string, anioSeleccionado: number) {
    if (!id) return;

    setLoading(true);
    setMensaje("");

    try {
      await Promise.all([
        cargarUnidades(id),
        cargarPropietarios(id),
        cargarCargos(id, anioSeleccionado),
        cargarPagos(id, anioSeleccionado),
      ]);
    } finally {
      setLoading(false);
    }
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
      setUnidades([]);
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
      setPropietarios([]);
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
      setCargos([]);
      return;
    }

    const lista = ((data as CargoPeriodico[]) || []).filter((cargo) => {
      const tipo = normalizar(cargo.tipo_cargo);
      const anioCargo = obtenerAnioCargo(cargo);

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
      setPagos([]);
      return;
    }

    setPagos((data as Pago[]) || []);
  }

  function cambiarAnio(valor: string) {
    const nuevoAnio = Number(valor);

    setAnio(nuevoAnio);
    setApartamentoSeleccionado("");

    if (condominioId) {
      void cargarDatos(condominioId, nuevoAnio);
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
        (propietario) =>
          normalizar(propietario.no_apartamento) === codigoUnidad
      ) || null
    );
  }

  function crearFilaEstado(unidad: Unidad): FilaEstado {
    const propietario = buscarPropietarioPorUnidad(unidad);

    const mesesEstado: MesEstado[] = MESES.map((nombreMes, index) => {
      const numeroMes = index + 1;

      const cargosMes = cargos.filter((cargo) => {
        const mesCargo = obtenerMesCargo(cargo);

        return (
          Number(cargo.unidad_id) === Number(unidad.id) &&
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
        (sum, cargo) => sum + Number(cargo.monto || 0),
        0
      );

      const pagado = cargosMes.reduce(
        (sum, cargo) => sum + Number(cargo.monto_pagado || 0),
        0
      );

      const balance = cargosMes.reduce(
        (sum, cargo) => sum + Number(cargo.balance || 0),
        0
      );

      let estado: MesEstado["estado"] = "PENDIENTE";

      if (balance <= 0 && monto > 0) {
        estado = "PAGADO";
      } else if (pagado > 0 && balance > 0) {
        estado = "PARCIAL";
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
      (sum, mes) => sum + Number(mes.monto || 0),
      0
    );

    const totalPagado = mesesEstado.reduce(
      (sum, mes) => sum + Number(mes.pagado || 0),
      0
    );

    const totalPendiente = mesesEstado.reduce(
      (sum, mes) => sum + Number(mes.balance || 0),
      0
    );

    const mesesPagados = mesesEstado.filter(
      (mes) => mes.estado === "PAGADO"
    ).length;

    const mesesParciales = mesesEstado.filter(
      (mes) => mes.estado === "PARCIAL"
    ).length;

    const mesesPendientes = mesesEstado.filter(
      (mes) => mes.estado === "PENDIENTE"
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
    return unidades.map((unidad) => crearFilaEstado(unidad));
    // pagos se conserva como dependencia para que el reporte se refresque
    // junto con la consulta anual de pagos del módulo original.
  }, [unidades, propietarios, cargos, pagos]);

  const filaSeleccionada = useMemo(() => {
    if (!apartamentoSeleccionado) return null;

    return (
      filas.find(
        (fila) =>
          normalizar(fila.apartamento) ===
          normalizar(apartamentoSeleccionado)
      ) || null
    );
  }, [filas, apartamentoSeleccionado]);

  const filasFiltradas = useMemo(() => {
    if (!apartamentoSeleccionado) return filas;

    return filas.filter(
      (fila) =>
        normalizar(fila.apartamento) ===
        normalizar(apartamentoSeleccionado)
    );
  }, [filas, apartamentoSeleccionado]);

  const totalFacturadoGeneral = filasFiltradas.reduce(
    (sum, fila) => sum + fila.totalFacturado,
    0
  );

  const totalPagadoGeneral = filasFiltradas.reduce(
    (sum, fila) => sum + fila.totalPagado,
    0
  );

  const totalPendienteGeneral = filasFiltradas.reduce(
    (sum, fila) => sum + fila.totalPendiente,
    0
  );

  const unidadesConDeuda = filasFiltradas.filter(
    (fila) => fila.totalPendiente > 0
  ).length;

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function claseEstado(estado: MesEstado["estado"]) {
    if (estado === "PAGADO") {
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
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
    <PageContainer>
      <ModuleMenu
        title="Finanzas"
        subtitle="Control financiero del condominio: pagos, gastos, solicitudes, caja chica, bancos, reportes y configuraciones."
        tone="blue"
        items={[
          {
            href: "/finanzas",
            label: "Inicio finanzas",
            icon: WalletCards,
          },
          {
            href: "/pagos-mantenimiento",
            label: "Pagos",
            icon: CreditCard,
          },
          {
            href: "/gastos",
            label: "Gastos",
            icon: ReceiptText,
          },
          {
            href: "/solicitudes-pago",
            label: "Solicitudes",
            icon: ClipboardCheck,
          },
          {
            href: "/banco",
            label: "Banco / Fondos",
            icon: Landmark,
          },
          {
            href: "/finanzas/caja-chica",
            label: "Caja chica",
            icon: Coins,
          },
          {
            href: "/reportes",
            label: "Reportes",
            icon: BarChart3,
          },
          {
            href: "/finanzas/configuraciones/presupuesto",
            label: "Presupuesto",
            icon: Banknote,
          },
        ]}
      />

      <ModuleToolbar
        title="Pagos por Propietarios"
        subtitle="Consulta anual de cuotas pagadas, pagos parciales y balances pendientes por apartamento."
        icon={Users}
        actions={
          <ModuleActions
            onRefresh={() => {
              if (condominioId) {
                void cargarDatos(condominioId, anio);
              }
            }}
          />
        }
      />

      {mensaje && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          {mensaje}
        </div>
      )}

      <SectionCard
        title="Filtros del reporte"
        subtitle={`Condominio activo: ${
          condominioNombre || "No seleccionado"
        }`}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Año
            </label>
            <select
              value={anio}
              onChange={(e) => cambiarAnio(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              {[2024, 2025, 2026, 2027, 2028].map((valor) => (
                <option key={valor} value={valor}>
                  {valor}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Apartamento / propietario
            </label>

            <select
              value={apartamentoSeleccionado}
              onChange={(e) => setApartamentoSeleccionado(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Todos los apartamentos</option>

              {filas.map((fila) => (
                <option key={fila.unidad_id} value={fila.apartamento}>
                  {fila.apartamento} - {fila.propietario}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filaSeleccionada && (
          <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 md:grid-cols-4">
            <div>
              <p className="text-xs font-bold uppercase text-blue-700">
                Apartamento
              </p>
              <p className="mt-1 text-lg font-black text-slate-900">
                {filaSeleccionada.apartamento}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-blue-700">
                Propietario
              </p>
              <p className="mt-1 font-black text-slate-900">
                {filaSeleccionada.propietario}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-blue-700">
                Teléfono
              </p>
              <p className="mt-1 font-black text-slate-900">
                {filaSeleccionada.telefono}
              </p>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setApartamentoSeleccionado("")}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                Limpiar filtro
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total facturado"
          value={`RD$ ${dinero(totalFacturadoGeneral)}`}
          subtitle={`Año ${anio}`}
          icon={FileSpreadsheet}
          tone="blue"
        />

        <StatCard
          title="Total pagado"
          value={`RD$ ${dinero(totalPagadoGeneral)}`}
          subtitle="Aplicado a cargos"
          icon={CreditCard}
          tone="green"
        />

        <StatCard
          title="Total pendiente"
          value={`RD$ ${dinero(totalPendienteGeneral)}`}
          subtitle="Balance de mantenimiento"
          icon={AlertTriangle}
          tone="red"
        />

        <StatCard
          title="Unidades con deuda"
          value={unidadesConDeuda}
          subtitle={`${filasFiltradas.length} unidad(es) consultada(s)`}
          icon={Users}
          tone="amber"
        />
      </div>

      <SectionCard
        title="Pagos y deudas por propietario"
        subtitle="Detalle mensual de cuotas de mantenimiento por apartamento."
        action={
          <div className="text-right">
            <p className="text-xs font-bold uppercase text-slate-400">
              Registros
            </p>
            <p className="text-lg font-black text-slate-900">
              {filasFiltradas.length}
            </p>
          </div>
        }
      >
        {loading ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-500">
            Cargando información...
          </div>
        ) : filasFiltradas.length === 0 ? (
          <EmptyState
            title="Sin información"
            description="No hay pagos o cargos para los filtros seleccionados."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="sticky left-0 z-20 min-w-28 border-b border-r bg-slate-100 px-3 py-3 text-left">
                  Apartamento
                </th>
                <th className="min-w-52 border-b border-r px-3 py-3 text-left">
                  Propietario
                </th>
                <th className="min-w-32 border-b border-r px-3 py-3 text-left">
                  Teléfono
                </th>

                {MESES.map((mes) => (
                  <th
                    key={mes}
                    className="min-w-28 border-b border-r px-3 py-3 text-center"
                  >
                    {mes.slice(0, 3)}
                  </th>
                ))}

                <th className="min-w-32 border-b border-r px-3 py-3 text-right">
                  Facturado
                </th>
                <th className="min-w-32 border-b border-r px-3 py-3 text-right">
                  Pagado
                </th>
                <th className="min-w-32 border-b border-r px-3 py-3 text-right">
                  Pendiente
                </th>
                <th className="min-w-24 border-b px-3 py-3 text-center">
                  Meses pend.
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filasFiltradas.map((fila) => (
                <tr key={fila.unidad_id} className="bg-white hover:bg-slate-50">
                  <td className="sticky left-0 z-10 border-r bg-white px-3 py-3 font-black text-slate-900">
                    {fila.apartamento}
                  </td>

                  <td className="border-r px-3 py-3">
                    <div className="font-bold text-slate-900">
                      {fila.propietario}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      Cuota: RD$ {dinero(fila.cuota)}
                    </div>
                  </td>

                  <td className="border-r px-3 py-3 text-slate-600">
                    {fila.telefono}
                  </td>

                  {fila.meses.map((mes) => (
                    <td
                      key={mes.mes}
                      className="border-r px-2 py-2 text-center"
                    >
                      <div
                        className={`rounded-lg border px-2 py-1.5 text-[11px] font-black ${claseEstado(
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
                        <div className="mt-1 text-[10px] font-semibold text-slate-500">
                          RD$ {dinero(mes.pagado)}
                        </div>
                      )}
                    </td>
                  ))}

                  <td className="border-r px-3 py-3 text-right font-bold text-slate-800">
                    RD$ {dinero(fila.totalFacturado)}
                  </td>

                  <td className="border-r px-3 py-3 text-right font-black text-emerald-700">
                    RD$ {dinero(fila.totalPagado)}
                  </td>

                  <td className="border-r px-3 py-3 text-right font-black text-red-700">
                    RD$ {dinero(fila.totalPendiente)}
                  </td>

                  <td className="px-3 py-3 text-center">
                    <span
                      className={`inline-flex min-w-9 items-center justify-center rounded-full px-2 py-1 text-xs font-black ${
                        fila.mesesPendientes > 0
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {fila.mesesPendientes}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        <strong>Nota:</strong> Este reporte se basa en los cargos generados en{" "}
        <strong>cargos_periodicos</strong>. Un mes aparece como pagado cuando el
        balance del cargo está en cero. Se consideran cargos de mantenimiento
        los tipos <strong>ORDINARIO</strong> y <strong>MANTENIMIENTO</strong>.
        Si el campo <strong>mes</strong> está vacío, el sistema obtiene el mes
        desde <strong>periodo</strong>.
      </div>

      <p className="text-right text-[10px] font-semibold text-slate-400">
        Reportes · Pagos por Propietarios · v2.0
      </p>
    </PageContainer>
  );
}
