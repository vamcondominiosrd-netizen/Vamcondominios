"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  CreditCard,
  FileText,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  UserRound,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
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

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

function calcularEstado(cargo: CargoPeriodico) {
  const monto = Number(cargo.monto || 0);
  const pagado = Number(cargo.monto_pagado || 0);
  const balance = Number(cargo.balance || 0);

  if (balance <= 0 && monto > 0) return "PAGADO";
  if (pagado > 0 && balance > 0) return "PARCIAL";
  return "PENDIENTE";
}

function claseEstado(estadoTexto: string | null | undefined, cargo?: CargoPeriodico) {
  const estado = normalizar(estadoTexto || (cargo ? calcularEstado(cargo) : ""));

  if (estado === "PAGADO") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  if (estado === "PARCIAL") {
    return "bg-blue-50 text-blue-700 border-blue-100";
  }

  if (estado === "ANULADO") {
    return "bg-slate-100 text-slate-700 border-slate-200";
  }

  return "bg-red-50 text-red-700 border-red-100";
}

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
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";
    const usuario =
      localStorage.getItem("usuario_nombre") || "Usuario del sistema";

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
      setUnidades([]);
      return;
    }

    setUnidades((data as Unidad[]) || []);
  }

  async function cargarPropietarios(id: string) {
    const { data, error } = await supabase
      .from("propietarios_apartamentos")
      .select(
        "id, condominio_id, no_apartamento, nombre_propietario, cedula, telefono, correo, estado",
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
        "id, condominio_id, unidad_id, anio, mes, periodo, concepto, tipo_cargo, monto, monto_pagado, balance, estado",
      )
      .eq("condominio_id", Number(condominioId))
      .eq("unidad_id", Number(idUnidad))
      .order("periodo", { ascending: true })
      .order("id", { ascending: true });

    setLoading(false);

    if (error) {
      setMensaje("Error cargando cargos del propietario: " + error.message);
      setCargos([]);
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

  async function refrescar() {
    if (!condominioId) return;

    await cargarBase(condominioId);

    if (unidadId) {
      await cargarCargosUnidad(unidadId, anio);
    }
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

  const totalFacturado = cargos.reduce(
    (sum, c) => sum + Number(c.monto || 0),
    0,
  );

  const totalPagado = cargos.reduce(
    (sum, c) => sum + Number(c.monto_pagado || 0),
    0,
  );

  const totalPendiente = cargos.reduce(
    (sum, c) => sum + Number(c.balance || 0),
    0,
  );

  const mesesPagados = cargos.filter(
    (c) => Number(c.balance || 0) <= 0 && Number(c.monto || 0) > 0,
  ).length;

  const mesesPendientes = cargos.filter(
    (c) => Number(c.balance || 0) > 0 && Number(c.monto_pagado || 0) <= 0,
  ).length;

  const mesesParciales = cargos.filter(
    (c) => Number(c.balance || 0) > 0 && Number(c.monto_pagado || 0) > 0,
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
      `Se ajustará el cargo de ${cargoEditando.nombre_mes} ${anio}.\n\n¿Desea continuar?`,
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

  return (
    <PageContainer>
      <ModuleMenu
        title="Control y Seguimiento"
        subtitle="Revisión de pagos, créditos, estados de cuenta y reportes financieros."
        tone="blue"
        items={[
          {
            href: "/finanzas/pagos/cuadre-propietario",
            label: "Cuadre de pagos",
            icon: ClipboardCheck,
          },
          {
            href: "/creditos-propietarios",
            label: "Saldos a favor",
            icon: WalletCards,
          },
          {
            href: "/consulta-estado",
            label: "Estado de cuenta",
            icon: FileText,
          },
          {
            href: "/reportes",
            label: "Reporte financiero",
            icon: BarChart3,
          },
        ]}
      />

      <ModuleToolbar
        title="Cuadre de Propietario"
        subtitle={`Consulta y ajuste operativo de cargos mensuales por apartamento. Condominio: ${
          condominioNombre || "No seleccionado"
        }.`}
        icon={ClipboardCheck}
        actions={<ModuleActions onRefresh={refrescar} />}
      />

      {mensaje && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          {mensaje}
        </div>
      )}

      <SectionCard
        title="Seleccionar propietario"
        subtitle="Busque por apartamento, nombre, teléfono o cédula para consultar el estado mensual."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : (
            <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
              Unidades: {unidadesFiltradas.length}
            </div>
          )
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Año</label>
            <select
              value={anio}
              onChange={(e) => cambiarAnio(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Buscar propietario
            </label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />

              <input
                type="text"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="w-full rounded-xl border px-10 py-3 text-sm"
                placeholder="Apto, nombre, teléfono..."
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold">
              Apartamento / propietario
            </label>

            <select
              value={unidadId}
              onChange={(e) => cambiarUnidad(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Seleccione apartamento</option>

              {unidadesFiltradas.map((u) => {
                const propietario = buscarPropietarioPorUnidad(u);

                return (
                  <option key={u.id} value={u.id}>
                    {u.codigo} -{" "}
                    {propietario?.nombre_propietario || "Sin propietario"}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </SectionCard>

      {unidadSeleccionada && (
        <SectionCard
          title="Datos del propietario"
          subtitle="Información principal del apartamento seleccionado."
          action={
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
              <UserRound className="h-4 w-4" />
              {unidadSeleccionada.codigo}
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <InfoLine label="Apartamento" value={unidadSeleccionada.codigo} />
            <InfoLine
              label="Propietario"
              value={
                propietarioSeleccionado?.nombre_propietario || "Sin propietario"
              }
            />
            <InfoLine
              label="Teléfono"
              value={propietarioSeleccionado?.telefono || "-"}
            />
            <InfoLine
              label="Cuota actual"
              value={`RD$ ${dinero(unidadSeleccionada.cuota_mensual_actual)}`}
              highlight
            />
          </div>
        </SectionCard>
      )}

      {unidadSeleccionada && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
          <InfoBox
            label="Facturado"
            value={`RD$ ${dinero(totalFacturado)}`}
            tone="blue"
          />

          <InfoBox
            label="Pagado"
            value={`RD$ ${dinero(totalPagado)}`}
            tone="emerald"
          />

          <InfoBox
            label="Pendiente"
            value={`RD$ ${dinero(totalPendiente)}`}
            tone="red"
          />

          <InfoBox
            label="Meses pagados"
            value={`${mesesPagados}`}
            tone="emerald"
          />

          <InfoBox
            label="Meses pendientes"
            value={`${mesesPendientes + mesesParciales}`}
            tone="yellow"
          />
        </div>
      )}

      {cargoEditando && (
        <SectionCard
          title={`Ajustar cargo - ${cargoEditando.nombre_mes} ${anio}`}
          subtitle={`Cargo ID: ${cargoEditando.id} | Período: ${
            cargoEditando.periodo ||
            `${anio}-${String(cargoEditando.mes_calculado).padStart(2, "0")}`
          }`}
          action={
            <button
              type="button"
              onClick={() => setCargoEditando(null)}
              className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              Cancelar
            </button>
          }
        >
          <div id="panel-ajuste-cargo" className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-sm font-semibold">
                Monto facturado
              </label>

              <input
                value={dinero(cargoEditando.monto)}
                disabled
                className="w-full rounded-xl border bg-slate-100 px-4 py-3 text-sm text-slate-600"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Monto pagado
              </label>

              <input
                type="number"
                step="0.01"
                value={montoPagadoEdit}
                onChange={(e) => setMontoPagadoEdit(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Balance pendiente
              </label>

              <input
                type="number"
                step="0.01"
                value={balanceEdit}
                onChange={(e) => setBalanceEdit(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">Estado</label>

              <select
                value={estadoEdit}
                onChange={(e) => setEstadoEdit(e.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Sugerir
              </button>
            </div>

            <div className="md:col-span-5">
              <label className="mb-1 block text-sm font-semibold">
                Observación del ajuste *
              </label>

              <textarea
                value={observacionEdit}
                onChange={(e) => setObservacionEdit(e.target.value)}
                rows={3}
                className="w-full rounded-xl border px-4 py-3 text-sm"
                placeholder="Ej. Ajuste realizado por validación de comprobante bancario..."
              />
            </div>

            <div className="md:col-span-5">
              <button
                type="button"
                disabled={guardando}
                onClick={guardarAjuste}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {guardando ? "Guardando ajuste..." : "Guardar ajuste"}
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Estado mensual del propietario"
        subtitle="Detalle de cargos, pagos, balances y estado mensual."
        action={
          unidadSeleccionada ? (
            <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
              Año: {anio}
            </div>
          ) : null
        }
      >
        {!unidadSeleccionada ? (
          <EmptyState
            title="Seleccione un apartamento"
            description="Seleccione un apartamento para ver su estado mensual."
          />
        ) : loading ? (
          <p className="text-sm text-slate-500">Cargando cargos...</p>
        ) : cargos.length === 0 ? (
          <EmptyState
            title="Sin cargos generados"
            description="No hay cargos generados para este propietario en el año seleccionado."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Mes</th>
                <th className="px-4 py-3 text-left">Período</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-right">Facturado</th>
                <th className="px-4 py-3 text-right">Pagado</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acción</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {cargos.map((c) => {
                const estadoReal = c.estado || calcularEstado(c);

                return (
                  <tr key={c.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 font-black">{c.nombre_mes}</td>

                    <td className="px-4 py-3">
                      {c.periodo ||
                        `${c.anio_calculado}-${String(c.mes_calculado).padStart(
                          2,
                          "0",
                        )}`}
                    </td>

                    <td className="px-4 py-3">{c.tipo_cargo || "-"}</td>

                    <td className="px-4 py-3 text-right font-bold">
                      RD$ {dinero(c.monto)}
                    </td>

                    <td className="px-4 py-3 text-right font-black text-emerald-700">
                      RD$ {dinero(c.monto_pagado)}
                    </td>

                    <td className="px-4 py-3 text-right font-black text-red-700">
                      RD$ {dinero(c.balance)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${claseEstado(
                          estadoReal,
                          c,
                        )}`}
                      >
                        {estadoReal}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => abrirEditar(c)}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        Ajustar
                      </button>
                    </td>
                  </tr>
                );
              })}

              <tr className="bg-slate-100 font-black">
                <td className="px-4 py-3" colSpan={3}>
                  TOTAL
                </td>

                <td className="px-4 py-3 text-right">
                  RD$ {dinero(totalFacturado)}
                </td>

                <td className="px-4 py-3 text-right text-emerald-700">
                  RD$ {dinero(totalPagado)}
                </td>

                <td className="px-4 py-3 text-right text-red-700">
                  RD$ {dinero(totalPendiente)}
                </td>

                <td className="px-4 py-3 text-center" colSpan={2}>
                  -
                </td>
              </tr>
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />

          <p>
            <strong>Importante:</strong> Este módulo ajusta el estado de los
            cargos para cuadrar el propietario. No crea ingresos nuevos en banco
            ni registra pagos nuevos en la tabla pagos. Todo ajuste queda
            guardado en historial.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}

function InfoBox({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "blue" | "emerald" | "red" | "yellow";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : tone === "emerald"
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : tone === "red"
          ? "bg-red-50 text-red-700 border-red-100"
          : tone === "yellow"
            ? "bg-yellow-50 text-yellow-700 border-yellow-100"
            : "bg-white text-slate-800 border-slate-200";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2 className="mt-2 text-2xl font-black">{value}</h2>
    </div>
  );
}

function InfoLine({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p
        className={`mt-1 text-sm font-black ${
          highlight ? "text-blue-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}