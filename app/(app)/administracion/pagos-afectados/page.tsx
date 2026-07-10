"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type AnyRow = Record<string, any>;

type TableConfig = {
  key: string;
  label: string;
  table: string;
  description: string;
  icon: string;
  columns: string[];
  moneyFields?: string[];
  dateFields?: string[];
  numberFields?: string[];
  readonlyFields?: string[];
  orderBy?: string;
};

const TABLES: TableConfig[] = [
  {
    key: "pagos",
    label: "Pagos",
    table: "pagos",
    icon: "💳",
    description: "Registro principal del pago digitado por administración.",
    orderBy: "id",
    columns: [
      "id",
      "condominio_id",
      "unidad_id",
      "fecha_pago",
      "periodo",
      "monto",
      "metodo",
      "metodo_pago",
      "referencia",
      "descripcion",
      "origen",
      "cuenta_bancaria_id",
      "tipo_fondo",
      "comprobante_url",
      "created_at",
    ],
    moneyFields: ["monto"],
    dateFields: ["fecha_pago"],
    numberFields: ["condominio_id", "unidad_id", "cuenta_bancaria_id"],
    readonlyFields: ["id", "created_at"],
  },
  {
    key: "cargos_periodicos",
    label: "Cargos periódicos",
    table: "cargos_periodicos",
    icon: "📌",
    description: "Deuda oficial por unidad y período. Aquí se ve pendiente, parcial o pagado.",
    orderBy: "id",
    columns: [
      "id",
      "condominio_id",
      "unidad_id",
      "propietario_id",
      "periodo",
      "anio",
      "mes",
      "concepto",
      "tipo_cargo",
      "monto",
      "monto_pagado",
      "balance",
      "estado",
      "fecha_emision",
      "fecha_vencimiento",
      "created_at",
    ],
    moneyFields: ["monto", "monto_pagado", "balance"],
    dateFields: ["fecha_emision", "fecha_vencimiento"],
    numberFields: ["condominio_id", "unidad_id", "propietario_id", "anio", "mes"],
    readonlyFields: ["id", "created_at"],
  },
  {
    key: "creditos_propietarios",
    label: "Créditos propietarios",
    table: "creditos_propietarios",
    icon: "🟢",
    description: "Saldo a favor generado cuando el pago supera la deuda pendiente.",
    orderBy: "id",
    columns: [
      "id",
      "condominio_id",
      "unidad_id",
      "pago_id",
      "monto_original",
      "monto_disponible",
      "concepto",
      "estado",
      "created_at",
    ],
    moneyFields: ["monto_original", "monto_disponible"],
    numberFields: ["condominio_id", "unidad_id", "pago_id"],
    readonlyFields: ["id", "created_at"],
  },
  {
    key: "banco_movimientos",
    label: "Movimientos banco",
    table: "banco_movimientos",
    icon: "🏦",
    description: "Libro bancario real: ingresos, egresos, impuestos, cargos y ajustes.",
    orderBy: "id",
    columns: [
      "id",
      "condominio_id",
      "cuenta_bancaria_id",
      "fecha_movimiento",
      "periodo",
      "tipo_movimiento",
      "origen",
      "descripcion",
      "monto",
      "numero_documento",
      "beneficiario",
      "referencia_banco",
      "estado_banco",
      "conciliado",
      "created_at",
    ],
    moneyFields: ["monto"],
    dateFields: ["fecha_movimiento"],
    numberFields: ["condominio_id", "cuenta_bancaria_id"],
    readonlyFields: ["id", "created_at"],
  },
  {
    key: "banco_cierres_mensuales",
    label: "Cierres banco",
    table: "banco_cierres_mensuales",
    icon: "📊",
    description: "Resumen mensual del banco: saldo inicial, ingresos, gastos y saldo final.",
    orderBy: "id",
    columns: [
      "id",
      "condominio_id",
      "cuenta_bancaria_id",
      "periodo",
      "anio",
      "mes",
      "balance_inicial",
      "total_ingresos",
      "total_gastos",
      "balance_final",
      "estado",
      "origen_balance",
      "fecha_apertura",
      "fecha_cierre",
      "updated_at",
      "created_at",
    ],
    moneyFields: ["balance_inicial", "total_ingresos", "total_gastos", "balance_final"],
    dateFields: ["fecha_apertura", "fecha_cierre"],
    numberFields: ["condominio_id", "cuenta_bancaria_id", "anio", "mes"],
    readonlyFields: ["id", "created_at", "updated_at"],
  },
];

function formatMoney(value: any) {
  const n = Number(value || 0);
  return n.toLocaleString("es-DO", { style: "currency", currency: "DOP" });
}

function normalizeValue(value: any, field: string, config: TableConfig) {
  if (value === "") return null;
  if (config.numberFields?.includes(field) || config.moneyFields?.includes(field)) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "boolean") return value;
  return value;
}

function emptyForm(config: TableConfig, condominioId: number): AnyRow {
  const base: AnyRow = {};
  config.columns.forEach((c) => {
    if (config.readonlyFields?.includes(c)) return;
    if (c === "condominio_id") base[c] = condominioId;
    else if (c === "estado") base[c] = "PENDIENTE";
    else if (c === "estado_banco") base[c] = "PENDIENTE";
    else if (c === "tipo_movimiento") base[c] = "INGRESO";
    else if (c === "origen") base[c] = "AJUSTE_BANCARIO";
    else if (c === "tipo_fondo") base[c] = "ORDINARIO";
    else if (c === "periodo") base[c] = new Date().toISOString().slice(0, 7);
    else if (config.moneyFields?.includes(c)) base[c] = 0;
    else base[c] = "";
  });
  return base;
}

function getLocalCondominioId(): number | null {
  if (typeof window === "undefined") return null;
  const keys = [
    "condominio_id",
    "condominioId",
    "selectedCondominioId",
    "condominioActivoId",
    "vam_condominio_id",
  ];
  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (value && Number(value)) return Number(value);
  }
  const raw = window.localStorage.getItem("condominioActivo") || window.localStorage.getItem("condominio");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.id && Number(parsed.id)) return Number(parsed.id);
      if (parsed?.condominio_id && Number(parsed.condominio_id)) return Number(parsed.condominio_id);
    } catch (_) {}
  }
  return null;
}

export default function AdministracionPagosAfectadosPage() {
  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [activeKey, setActiveKey] = useState(TABLES[0].key);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [selected, setSelected] = useState<AnyRow | null>(null);
  const [form, setForm] = useState<AnyRow>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<string>("");
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7));
  const [busqueda, setBusqueda] = useState("");

  const config = useMemo(() => TABLES.find((t) => t.key === activeKey) || TABLES[0], [activeKey]);

  useEffect(() => {
    const id = getLocalCondominioId();
    setCondominioId(id || 15);
  }, []);

  useEffect(() => {
    if (condominioId) cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condominioId, activeKey, periodo]);

  async function cargarDatos() {
    if (!condominioId) return;
    setLoading(true);
    setMensaje("");
    setSelected(null);
    try {
      let query = supabase.from(config.table).select("*").eq("condominio_id", condominioId).limit(200);
      if (["pagos", "cargos_periodicos", "banco_movimientos", "banco_cierres_mensuales"].includes(config.table)) {
        query = query.or(`periodo.eq.${periodo},periodo.is.null`);
      }
      if (config.orderBy) query = query.order(config.orderBy, { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      setRows(data || []);
      setForm(emptyForm(config, condominioId));
    } catch (e: any) {
      setMensaje(`ERROR cargando ${config.label}: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  function seleccionar(row: AnyRow) {
    setSelected(row);
    const next: AnyRow = {};
    config.columns.forEach((col) => {
      if (config.readonlyFields?.includes(col)) return;
      let value = row[col] ?? "";
      if (config.dateFields?.includes(col) && typeof value === "string") value = value.slice(0, 10);
      next[col] = value;
    });
    setForm(next);
  }

  function nuevo() {
    if (!condominioId) return;
    setSelected(null);
    setForm(emptyForm(config, condominioId));
    setMensaje("Nuevo registro listo para insertar.");
  }

  async function guardar() {
    if (!condominioId) return;
    setSaving(true);
    setMensaje("");
    try {
      const payload: AnyRow = {};
      Object.keys(form).forEach((k) => {
        if (config.readonlyFields?.includes(k)) return;
        payload[k] = normalizeValue(form[k], k, config);
      });
      payload.condominio_id = condominioId;

      if (selected?.id) {
        const { error } = await supabase.from(config.table).update(payload).eq("id", selected.id).eq("condominio_id", condominioId);
        if (error) throw error;
        setMensaje(`Registro actualizado correctamente en ${config.label}.`);
      } else {
        const { error } = await supabase.from(config.table).insert(payload);
        if (error) throw error;
        setMensaje(`Registro insertado correctamente en ${config.label}.`);
      }
      await cargarDatos();
    } catch (e: any) {
      setMensaje(`ERROR guardando: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  }

  async function eliminar() {
    if (!selected?.id || !condominioId) return;
    const ok = window.confirm(`¿Seguro que deseas eliminar el registro ID ${selected.id} de ${config.label}?`);
    if (!ok) return;
    setSaving(true);
    try {
      const { error } = await supabase.from(config.table).delete().eq("id", selected.id).eq("condominio_id", condominioId);
      if (error) throw error;
      setMensaje(`Registro eliminado de ${config.label}.`);
      await cargarDatos();
    } catch (e: any) {
      setMensaje(`ERROR eliminando: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  }

  async function recalcularBanco() {
    if (!condominioId) return;
    const cuenta = Number(form.cuenta_bancaria_id || selected?.cuenta_bancaria_id || 6);
    if (!cuenta || !periodo) {
      setMensaje("Falta cuenta bancaria o período para recalcular.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("recalcular_cierre_bancario_mensual", {
        p_condominio_id: condominioId,
        p_cuenta_bancaria_id: cuenta,
        p_periodo: periodo,
      });
      if (error) throw error;
      setMensaje(`Cierre bancario recalculado para ${periodo}.`);
      await cargarDatos();
    } catch (e: any) {
      setMensaje(`ERROR recalculando banco: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  }

  const filteredRows = rows.filter((r) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return JSON.stringify(r).toLowerCase().includes(q);
  });

  const resumen = useMemo(() => {
    const total = rows.length;
    const monto = rows.reduce((acc, r) => acc + Number(r.monto || r.balance_final || r.balance || 0), 0);
    return { total, monto };
  }, [rows]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Administración / Soporte</p>
              <h1 className="text-2xl font-bold text-slate-900">Menú de tablas afectadas por pagos</h1>
              <p className="mt-1 text-sm text-slate-600">
                Herramienta temporal para revisar, modificar, eliminar y actualizar registros afectados por el motor de pagos.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm md:w-[360px]">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-500">Condominio</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  type="number"
                  value={condominioId || ""}
                  onChange={(e) => setCondominioId(Number(e.target.value || 0))}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-500">Período</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  type="month"
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {TABLES.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveKey(t.key)}
              className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                activeKey === t.key
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="text-2xl">{t.icon}</div>
              <div className="mt-2 font-bold text-slate-900">{t.label}</div>
              <div className="mt-1 text-xs leading-5 text-slate-500">{t.description}</div>
            </button>
          ))}
        </div>

        {mensaje && (
          <div className={`rounded-2xl border p-4 text-sm ${mensaje.startsWith("ERROR") ? "border-red-200 bg-red-50 text-red-700" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
            {mensaje}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{config.icon} {config.label}</h2>
                  <p className="text-sm text-slate-500">{resumen.total} registros cargados · Referencia: {formatMoney(resumen.monto)}</p>
                </div>
                <div className="flex gap-2">
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm md:w-64"
                    placeholder="Buscar..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                  <button onClick={cargarDatos} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Actualizar</button>
                  <button onClick={nuevo} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Nuevo</button>
                </div>
              </div>
            </div>

            <div className="max-h-[620px] overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-500">
                  <tr>
                    {config.columns.slice(0, 9).map((c) => (
                      <th key={c} className="whitespace-nowrap px-3 py-3 font-bold">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="p-6 text-center text-slate-500">Cargando...</td></tr>
                  ) : filteredRows.length === 0 ? (
                    <tr><td colSpan={9} className="p-6 text-center text-slate-500">No hay registros para este filtro.</td></tr>
                  ) : (
                    filteredRows.map((r) => (
                      <tr
                        key={`${config.table}-${r.id}`}
                        onClick={() => seleccionar(r)}
                        className={`cursor-pointer border-b border-slate-100 hover:bg-blue-50 ${selected?.id === r.id ? "bg-blue-50" : ""}`}
                      >
                        {config.columns.slice(0, 9).map((c) => (
                          <td key={c} className="max-w-[220px] truncate whitespace-nowrap px-3 py-3 text-slate-700">
                            {config.moneyFields?.includes(c) ? formatMoney(r[c]) : String(r[c] ?? "-")}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Formulario individual</h2>
                <p className="text-sm text-slate-500">{selected?.id ? `Editando ID ${selected.id}` : "Nuevo registro"}</p>
              </div>
              <button onClick={nuevo} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Limpiar</button>
            </div>

            <div className="grid max-h-[620px] grid-cols-1 gap-3 overflow-auto pr-1 md:grid-cols-2">
              {config.columns.map((field) => {
                const readonly = config.readonlyFields?.includes(field);
                const isDate = config.dateFields?.includes(field);
                const isMoney = config.moneyFields?.includes(field);
                const isNumber = config.numberFields?.includes(field) || isMoney;
                const value = readonly ? selected?.[field] ?? "" : form[field] ?? "";

                return (
                  <label key={field} className={field === "descripcion" || field === "comprobante_url" ? "md:col-span-2" : ""}>
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{field}</span>
                    {field === "descripcion" || field === "comprobante_url" ? (
                      <textarea
                        className="min-h-[76px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                        disabled={readonly}
                        value={String(value ?? "")}
                        onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                      />
                    ) : field === "estado" ? (
                      <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={String(value ?? "")} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}>
                        <option value="PENDIENTE">PENDIENTE</option>
                        <option value="PARCIAL">PARCIAL</option>
                        <option value="PAGADO">PAGADO</option>
                        <option value="ABIERTO">ABIERTO</option>
                        <option value="CERRADO">CERRADO</option>
                        <option value="Activo">Activo</option>
                        <option value="ANULADO">ANULADO</option>
                      </select>
                    ) : field === "tipo_movimiento" ? (
                      <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={String(value ?? "")} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}>
                        <option value="INGRESO">INGRESO</option>
                        <option value="EGRESO">EGRESO</option>
                      </select>
                    ) : field === "origen" ? (
                      <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={String(value ?? "")} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}>
                        <option value="PAGO_PROPIETARIO">PAGO_PROPIETARIO</option>
                        <option value="PAGO_PROVEEDOR">PAGO_PROVEEDOR</option>
                        <option value="REPOSICION_CAJA_CHICA">REPOSICION_CAJA_CHICA</option>
                        <option value="APERTURA_CAJA_CHICA">APERTURA_CAJA_CHICA</option>
                        <option value="CARGO_BANCARIO">CARGO_BANCARIO</option>
                        <option value="IMPUESTO_BANCARIO">IMPUESTO_BANCARIO</option>
                        <option value="INTERES_BANCARIO">INTERES_BANCARIO</option>
                        <option value="AJUSTE_BANCARIO">AJUSTE_BANCARIO</option>
                        <option value="MANUAL">MANUAL</option>
                      </select>
                    ) : field === "estado_banco" ? (
                      <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={String(value ?? "")} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}>
                        <option value="PENDIENTE">PENDIENTE</option>
                        <option value="CONCILIADO">CONCILIADO</option>
                        <option value="DIFERENCIA">DIFERENCIA</option>
                        <option value="ANULADO">ANULADO</option>
                      </select>
                    ) : (
                      <input
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                        disabled={readonly}
                        type={isDate ? "date" : isNumber ? "number" : "text"}
                        step={isMoney ? "0.01" : undefined}
                        value={String(value ?? "")}
                        onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                      />
                    )}
                  </label>
                );
              })}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-3">
              <button disabled={saving} onClick={guardar} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                {selected?.id ? "Actualizar" : "Insertar"}
              </button>
              <button disabled={saving || !selected?.id} onClick={eliminar} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
                Eliminar
              </button>
              <button disabled={saving} onClick={recalcularBanco} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">
                Recalcular banco
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Uso administrativo. Antes de eliminar registros productivos, valida pagos, cargos, banco y cierre mensual.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
