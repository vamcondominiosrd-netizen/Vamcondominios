"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardCheck,
  History,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  WalletCards,
  X,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type UnidadRow = {
  id: number;
  condominio_id: number;
  codigo: string;
  propietario_id: number | null;
  propietario_nombre: string | null;
  activa: boolean | null;
};

type SaldoInicialRow = {
  id: number;
  condominio_id: number;
  unidad_id: number;
  propietario_id: number | null;
  fecha_corte: string;
  monto_original: number;
  monto_pagado: number;
  balance: number;
  estado: "PENDIENTE" | "PARCIAL" | "PAGADO" | "ANULADO";
  observacion: string | null;
  documento_url: string | null;
  creado_por_nombre: string | null;
  created_at: string;
  updated_at: string;
  unidad_codigo: string;
  propietario_nombre: string;
};

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fechaCorta(valor: string | null | undefined) {
  if (!valor) return "-";
  return String(valor).split("T")[0];
}

function normalizar(valor: string | null | undefined) {
  return String(valor || "").trim().toUpperCase();
}

function calcularEstado(
  montoOriginal: number,
  montoPagado: number,
  balance: number,
) {
  if (balance <= 0 && montoOriginal > 0) return "PAGADO";
  if (montoPagado > 0 && balance > 0) return "PARCIAL";
  return "PENDIENTE";
}

function claseEstado(estado: string) {
  const valor = normalizar(estado);

  if (valor === "PAGADO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (valor === "PARCIAL") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (valor === "ANULADO") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function SaldosInicialesPropietariosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [usuarioNombre, setUsuarioNombre] = useState("Usuario del sistema");

  const [unidades, setUnidades] = useState<UnidadRow[]>([]);
  const [saldos, setSaldos] = useState<SaldoInicialRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [saldoEditando, setSaldoEditando] =
    useState<SaldoInicialRow | null>(null);
  const [unidadId, setUnidadId] = useState("");
  const [fechaCorte, setFechaCorte] = useState("");
  const [montoOriginal, setMontoOriginal] = useState("");
  const [observacion, setObservacion] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";
    const nombreUsuario =
      localStorage.getItem("usuario_nombre") || "Usuario del sistema";

    setCondominioId(id);
    setCondominioNombre(nombre);
    setUsuarioNombre(nombreUsuario);

    const hoy = new Date();
    hoy.setDate(0);
    setFechaCorte(hoy.toISOString().slice(0, 10));

    if (!id) {
      setMensaje(
        "No se encontró el condominio activo. Debe iniciar sesión nuevamente.",
      );
      return;
    }

    cargarDatos(id);
    cargarUsuario();
  }, []);

  async function cargarUsuario() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUsuarioId(user?.id || null);
  }

  async function cargarDatos(id: string) {
    setLoading(true);
    setMensaje("");

    await Promise.all([cargarUnidades(id), cargarSaldos(id)]);

    setLoading(false);
  }

  async function cargarUnidades(id: string) {
    const { data, error } = await supabase
      .from("unidades")
      .select(
        "id, condominio_id, codigo, propietario_id, propietario_nombre, activa",
      )
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo", { ascending: true });

    if (error) {
      setUnidades([]);
      setMensaje("Error cargando unidades: " + error.message);
      return;
    }

    setUnidades((data as UnidadRow[]) || []);
  }

  async function cargarSaldos(id: string) {
    const { data, error } = await supabase
      .from("saldos_iniciales_propietarios")
      .select(
        `
        id,
        condominio_id,
        unidad_id,
        propietario_id,
        fecha_corte,
        monto_original,
        monto_pagado,
        balance,
        estado,
        observacion,
        documento_url,
        creado_por_nombre,
        created_at,
        updated_at,
        unidades (
          codigo,
          propietario_nombre
        )
      `,
      )
      .eq("condominio_id", Number(id))
      .order("fecha_corte", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      setSaldos([]);
      setMensaje("Error cargando saldos iniciales: " + error.message);
      return;
    }

    const lista: SaldoInicialRow[] = (data || []).map((item: any) => {
      const unidadRelacion = Array.isArray(item.unidades)
        ? item.unidades[0]
        : item.unidades;

      return {
        id: Number(item.id),
        condominio_id: Number(item.condominio_id),
        unidad_id: Number(item.unidad_id),
        propietario_id: item.propietario_id
          ? Number(item.propietario_id)
          : null,
        fecha_corte: String(item.fecha_corte || ""),
        monto_original: Number(item.monto_original || 0),
        monto_pagado: Number(item.monto_pagado || 0),
        balance: Number(item.balance || 0),
        estado: item.estado || "PENDIENTE",
        observacion: item.observacion || null,
        documento_url: item.documento_url || null,
        creado_por_nombre: item.creado_por_nombre || null,
        created_at: String(item.created_at || ""),
        updated_at: String(item.updated_at || ""),
        unidad_codigo: unidadRelacion?.codigo || "-",
        propietario_nombre:
          unidadRelacion?.propietario_nombre || "Sin propietario",
      };
    });

    setSaldos(lista);
  }

  const unidadSeleccionada = useMemo(() => {
    return unidades.find((unidad) => String(unidad.id) === unidadId) || null;
  }, [unidades, unidadId]);

  const saldosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto) return saldos;

    return saldos.filter((saldo) => {
      const combinado = `
        ${saldo.unidad_codigo}
        ${saldo.propietario_nombre}
        ${saldo.fecha_corte}
        ${saldo.estado}
        ${saldo.observacion || ""}
      `.toLowerCase();

      return combinado.includes(texto);
    });
  }, [saldos, busqueda]);

  const totalOriginal = saldos
    .filter((saldo) => saldo.estado !== "ANULADO")
    .reduce((sum, saldo) => sum + Number(saldo.monto_original || 0), 0);

  const totalPagado = saldos
    .filter((saldo) => saldo.estado !== "ANULADO")
    .reduce((sum, saldo) => sum + Number(saldo.monto_pagado || 0), 0);

  const totalPendiente = saldos
    .filter((saldo) => saldo.estado !== "ANULADO")
    .reduce((sum, saldo) => sum + Number(saldo.balance || 0), 0);

  function limpiarFormulario() {
    setSaldoEditando(null);
    setUnidadId("");
    setMontoOriginal("");
    setObservacion("");

    const hoy = new Date();
    hoy.setDate(0);
    setFechaCorte(hoy.toISOString().slice(0, 10));
  }

  function abrirEditar(saldo: SaldoInicialRow) {
    setSaldoEditando(saldo);
    setUnidadId(String(saldo.unidad_id));
    setFechaCorte(saldo.fecha_corte);
    setMontoOriginal(String(Number(saldo.monto_original || 0)));
    setObservacion(saldo.observacion || "");

    setTimeout(() => {
      document
        .getElementById("formulario-saldo-inicial")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  async function guardarSaldo(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!unidadId || !fechaCorte || !montoOriginal) {
      alert("Debe completar unidad, fecha de corte y monto inicial.");
      return;
    }

    const montoNuevo = Number(montoOriginal || 0);

    if (montoNuevo <= 0) {
      alert("El monto inicial debe ser mayor que cero.");
      return;
    }

    const unidad = unidades.find((item) => String(item.id) === unidadId);

    if (!unidad || Number(unidad.condominio_id) !== Number(condominioId)) {
      alert("La unidad seleccionada no pertenece al condominio activo.");
      return;
    }

    setGuardando(true);
    setMensaje("");

    try {
      if (!saldoEditando) {
        const { data: saldoExistente, error: errorConsulta } = await supabase
          .from("saldos_iniciales_propietarios")
          .select("id, estado")
          .eq("condominio_id", Number(condominioId))
          .eq("unidad_id", Number(unidadId))
          .neq("estado", "ANULADO")
          .limit(1)
          .maybeSingle();

        if (errorConsulta) {
          throw new Error(
            "Error validando saldo existente: " + errorConsulta.message,
          );
        }

        if (saldoExistente?.id) {
          throw new Error(
            "Esta unidad ya tiene un saldo inicial activo. Use la opción Ajustar.",
          );
        }

        const { error } = await supabase
          .from("saldos_iniciales_propietarios")
          .insert([
            {
              condominio_id: Number(condominioId),
              unidad_id: Number(unidadId),
              propietario_id: unidad.propietario_id || null,
              fecha_corte: fechaCorte,
              monto_original: montoNuevo,
              monto_pagado: 0,
              balance: montoNuevo,
              estado: "PENDIENTE",
              observacion: observacion.trim() || null,
              documento_url: null,
              creado_por: usuarioId,
              creado_por_nombre: usuarioNombre,
              updated_at: new Date().toISOString(),
            },
          ]);

        if (error) {
          throw new Error("Error registrando saldo inicial: " + error.message);
        }

        setMensaje(
          `Saldo inicial registrado correctamente para la unidad ${unidad.codigo}.`,
        );
      } else {
        const pagadoActual = Number(saldoEditando.monto_pagado || 0);

        if (montoNuevo < pagadoActual) {
          throw new Error(
            `El monto original no puede ser menor que lo ya pagado: RD$ ${dinero(
              pagadoActual,
            )}.`,
          );
        }

        const balanceAnterior = Number(saldoEditando.balance || 0);
        const balanceNuevo = Math.max(montoNuevo - pagadoActual, 0);
        const estadoNuevo = calcularEstado(
          montoNuevo,
          pagadoActual,
          balanceNuevo,
        );

        const diferencia =
          montoNuevo - Number(saldoEditando.monto_original || 0);

        const { error: errorUpdate } = await supabase
          .from("saldos_iniciales_propietarios")
          .update({
            fecha_corte: fechaCorte,
            monto_original: montoNuevo,
            balance: balanceNuevo,
            estado: estadoNuevo,
            observacion: observacion.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", saldoEditando.id)
          .eq("condominio_id", Number(condominioId))
          .eq("unidad_id", Number(saldoEditando.unidad_id));

        if (errorUpdate) {
          throw new Error("Error actualizando saldo: " + errorUpdate.message);
        }

        if (diferencia !== 0) {
          const { error: errorMovimiento } = await supabase
            .from("saldos_iniciales_movimientos")
            .insert([
              {
                condominio_id: Number(condominioId),
                saldo_inicial_id: saldoEditando.id,
                unidad_id: saldoEditando.unidad_id,
                pago_id: null,
                tipo_movimiento:
                  diferencia > 0 ? "AJUSTE_AUMENTO" : "AJUSTE_DISMINUCION",
                monto: Math.abs(diferencia),
                balance_anterior: balanceAnterior,
                balance_nuevo: balanceNuevo,
                observacion:
                  observacion.trim() ||
                  "Ajuste manual del saldo inicial de la unidad.",
                usuario_id: usuarioId,
                usuario_nombre: usuarioNombre,
              },
            ]);

          if (errorMovimiento) {
            throw new Error(
              "El saldo fue actualizado, pero no se pudo guardar el historial: " +
                errorMovimiento.message,
            );
          }
        }

        setMensaje(
          `Saldo inicial ajustado correctamente para la unidad ${unidad.codigo}.`,
        );
      }

      limpiarFormulario();
      await cargarSaldos(condominioId);
    } catch (error: any) {
      setMensaje(error.message || "No se pudo guardar el saldo inicial.");
    } finally {
      setGuardando(false);
    }
  }

  async function refrescar() {
    if (!condominioId) return;
    await cargarDatos(condominioId);
  }

  return (
    <PageContainer>
      <ModuleMenu
        title="Cuentas por Cobrar"
        subtitle="Saldos iniciales, cargos, pagos y seguimiento de propietarios."
        tone="blue"
        items={[
          {
            href: "/finanzas/cuentas-por-cobrar/saldos-iniciales",
            label: "Saldos iniciales",
            icon: WalletCards,
          },
          {
            href: "/finanzas/pagos/cuadre-propietario",
            label: "Cuadre propietario",
            icon: ClipboardCheck,
          },
          {
            href: "/consulta-estado",
            label: "Estado de cuenta",
            icon: History,
          },
        ]}
      />

      <ModuleToolbar
        title="Saldos Iniciales de Propietarios"
        subtitle={`Registro de deudas recibidas al iniciar la administración. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={WalletCards}
        actions={
          <ModuleActions
            onRefresh={refrescar}
            extra={
              <button
                type="button"
                onClick={limpiarFormulario}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
              >
                <Plus className="h-4 w-4" />
                Nuevo saldo
              </button>
            }
          />
        }
      />

      {mensaje && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <InfoBox
          label="Saldo original"
          value={`RD$ ${dinero(totalOriginal)}`}
          tone="blue"
        />
        <InfoBox
          label="Pagado acumulado"
          value={`RD$ ${dinero(totalPagado)}`}
          tone="emerald"
        />
        <InfoBox
          label="Balance pendiente"
          value={`RD$ ${dinero(totalPendiente)}`}
          tone="amber"
        />
      </div>

      <SectionCard
        title={saldoEditando ? "Ajustar saldo inicial" : "Registrar saldo inicial"}
        subtitle={
          saldoEditando
            ? "Modifique el monto original. No puede ser menor que lo ya pagado."
            : "Registre una única deuda consolidada por apartamento."
        }
        action={
          saldoEditando ? (
            <button
              type="button"
              onClick={limpiarFormulario}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>
          ) : null
        }
      >
        <form
          id="formulario-saldo-inicial"
          onSubmit={guardarSaldo}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <div className="xl:col-span-2">
            <label className="mb-1 block text-sm font-semibold">
              Apartamento / propietario *
            </label>

            <select
              value={unidadId}
              onChange={(e) => setUnidadId(e.target.value)}
              disabled={Boolean(saldoEditando)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm disabled:bg-slate-100"
            >
              <option value="">Seleccione apartamento</option>
              {unidades.map((unidad) => (
                <option key={unidad.id} value={unidad.id}>
                  {unidad.codigo} -{" "}
                  {unidad.propietario_nombre || "Sin propietario"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Fecha de corte *
            </label>

            <input
              type="date"
              value={fechaCorte}
              onChange={(e) => setFechaCorte(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Monto inicial *
            </label>

            <input
              type="number"
              step="0.01"
              min="0.01"
              value={montoOriginal}
              onChange={(e) => setMontoOriginal(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              placeholder="0.00"
            />
          </div>

          {unidadSeleccionada && (
            <div className="rounded-xl border bg-slate-50 px-4 py-3 xl:col-span-2">
              <p className="text-xs font-black uppercase text-slate-500">
                Unidad seleccionada
              </p>
              <p className="mt-1 text-sm font-black text-slate-900">
                {unidadSeleccionada.codigo} -{" "}
                {unidadSeleccionada.propietario_nombre || "Sin propietario"}
              </p>
            </div>
          )}

          {saldoEditando && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-black uppercase text-emerald-600">
                Pagado acumulado
              </p>
              <p className="mt-1 text-sm font-black text-emerald-800">
                RD$ {dinero(saldoEditando.monto_pagado)}
              </p>
            </div>
          )}

          {saldoEditando && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-black uppercase text-amber-600">
                Nuevo balance calculado
              </p>
              <p className="mt-1 text-sm font-black text-amber-800">
                RD${" "}
                {dinero(
                  Math.max(
                    Number(montoOriginal || 0) -
                      Number(saldoEditando.monto_pagado || 0),
                    0,
                  ),
                )}
              </p>
            </div>
          )}

          <div className="md:col-span-2 xl:col-span-4">
            <label className="mb-1 block text-sm font-semibold">
              Observación
            </label>

            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              rows={3}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              placeholder="Ej. Saldo pendiente recibido de la administración anterior..."
            />
          </div>

          <div className="md:col-span-2 xl:col-span-4">
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {guardando
                ? "Guardando..."
                : saldoEditando
                  ? "Guardar ajuste"
                  : "Registrar saldo"}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Saldos registrados"
        subtitle="Cada unidad mantiene un saldo único que disminuirá con los pagos aplicados."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : (
            <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
              Registros: {saldosFiltrados.length}
            </div>
          )
        }
      >
        <div className="mb-5">
          <label className="mb-1 block text-sm font-semibold">Buscar</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-xl border px-10 py-3 text-sm"
              placeholder="Apartamento, propietario, estado u observación..."
            />
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Cargando saldos...</p>
        ) : saldosFiltrados.length === 0 ? (
          <EmptyState
            title="Sin saldos iniciales"
            description="Todavía no existen saldos iniciales registrados para este condominio."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {saldosFiltrados.map((saldo) => (
              <article
                key={saldo.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-black text-slate-900">
                      {saldo.unidad_codigo}
                    </p>
                    <p className="text-sm font-semibold text-slate-600">
                      {saldo.propietario_nombre}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Corte: {fechaCorta(saldo.fecha_corte)}
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black ${claseEstado(
                      saldo.estado,
                    )}`}
                  >
                    {saldo.estado}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <DatoMonto
                    label="Original"
                    value={`RD$ ${dinero(saldo.monto_original)}`}
                  />
                  <DatoMonto
                    label="Pagado"
                    value={`RD$ ${dinero(saldo.monto_pagado)}`}
                    tone="emerald"
                  />
                  <DatoMonto
                    label="Balance"
                    value={`RD$ ${dinero(saldo.balance)}`}
                    tone="amber"
                  />
                </div>

                {saldo.observacion && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase text-slate-500">
                      Observación
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">
                      {saldo.observacion}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Registrado por:{" "}
                    <span className="font-semibold">
                      {saldo.creado_por_nombre || "-"}
                    </span>
                  </p>

                  <button
                    type="button"
                    onClick={() => abrirEditar(saldo)}
                    disabled={saldo.estado === "ANULADO"}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-40"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Ajustar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />
          <p>
            <strong>Importante:</strong> esta pantalla registra únicamente la
            deuda inicial recibida. No crea ingresos, pagos, movimientos
            bancarios ni asientos contables. La aplicación automática de pagos
            contra este saldo se realizará en el siguiente paso.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}

function InfoBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "emerald" | "amber";
}) {
  const clase =
    tone === "blue"
      ? "border-blue-100 bg-blue-50 text-blue-700"
      : tone === "emerald"
        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
        : "border-amber-100 bg-amber-50 text-amber-700";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${clase}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2 className="mt-2 text-2xl font-black">{value}</h2>
    </div>
  );
}

function DatoMonto({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "amber";
}) {
  const clase =
    tone === "emerald"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-100 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <div className={`rounded-xl border px-3 py-3 ${clase}`}>
      <p className="text-xs font-black uppercase opacity-70">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}
