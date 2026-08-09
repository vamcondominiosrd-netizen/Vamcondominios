"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Unidad = {
  id: number;
  codigo: string | null;
  propietario_nombre?: string | null;
};

type Pago = {
  id: number;
  client_id: number | null;
  condominio_id: number;
  unidad_id: number | null;
  fecha_pago: string | null;
  periodo: string | null;
  monto: number | string | null;
  metodo: string | null;
  metodo_pago: string | null;
  referencia: string | null;
  descripcion: string | null;
  origen: string | null;
  cuenta_bancaria_id: number | null;
  tipo_fondo: string | null;
  created_at: string | null;
};

type BancoMap = Record<
  string,
  {
    id: number;
    periodo: string | null;
    monto: number | string | null;
    saldo_movimiento: number | string | null;
  }
>;

type EditForm = {
  id: number;
  unidad_codigo: string;
  fecha_pago: string;
  periodo: string;
  monto: string;
  referencia: string;
  descripcion: string;
  cuenta_bancaria_id: string;
  metodo_pago: string;
  tipo_fondo: string;
};

function money(value: number | string | null | undefined) {
  const n = Number(value || 0);
  return n.toLocaleString("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  });
}

function safeDate(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function AdminPagosPage() {
  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [bancoMap, setBancoMap] = useState<BancoMap>({});

  const [unidadFiltro, setUnidadFiltro] = useState("");
  const [fechaDesdeFiltro, setFechaDesdeFiltro] = useState("");
  const [fechaHastaFiltro, setFechaHastaFiltro] = useState("");
  const [textoFiltro, setTextoFiltro] = useState("");

  const [editando, setEditando] = useState<EditForm | null>(null);

  const unidadMap = useMemo(() => {
    const map: Record<number, Unidad> = {};
    unidades.forEach((u) => {
      map[u.id] = u;
    });
    return map;
  }, [unidades]);

  useEffect(() => {
    const id =
      localStorage.getItem("condominio_id") ||
      localStorage.getItem("condominioId") ||
      localStorage.getItem("id_condominio");

    if (id && !Number.isNaN(Number(id))) {
      setCondominioId(Number(id));
      return;
    }

    cargarCondominioDesdePerfil();
  }, []);

  useEffect(() => {
    if (!condominioId) return;
    cargarUnidades();
    cargarPagos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condominioId]);

  async function cargarCondominioDesdePerfil() {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;

    if (!userId) {
      setError("No se pudo identificar el usuario logueado.");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("condominio_id")
      .eq("id", userId)
      .single();

    if (error || !data?.condominio_id) {
      setError("No se pudo identificar el condominio del usuario logueado.");
      return;
    }

    setCondominioId(Number(data.condominio_id));
  }

  async function cargarUnidades() {
    if (!condominioId) return;

    const { data, error } = await supabase
      .from("unidades")
      .select("id,codigo,propietario_nombre")
      .eq("condominio_id", condominioId)
      .order("codigo", { ascending: true });

    if (error) {
      setError("Error cargando unidades: " + error.message);
      return;
    }

    setUnidades((data || []) as Unidad[]);
  }

  async function cargarPagos() {
    if (!condominioId) return;

    setLoading(true);
    setError("");
    setMensaje("");

    let query = supabase
      .from("pagos")
      .select(
        "id,client_id,condominio_id,unidad_id,fecha_pago,periodo,monto,metodo,metodo_pago,referencia,descripcion,origen,cuenta_bancaria_id,tipo_fondo,created_at"
      )
      .eq("condominio_id", condominioId)
      .order("fecha_pago", { ascending: false })
      .order("id", { ascending: false })
      .limit(300);

    if (unidadFiltro) {
      query = query.eq("unidad_id", Number(unidadFiltro));
    }

    if (fechaDesdeFiltro) {
      query = query.gte("fecha_pago", fechaDesdeFiltro);
    }

    if (fechaHastaFiltro) {
      query = query.lte("fecha_pago", fechaHastaFiltro);
    }

    if (textoFiltro.trim()) {
      const t = textoFiltro.trim();
      query = query.or(
        `descripcion.ilike.%${t}%,referencia.ilike.%${t}%,periodo.ilike.%${t}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      setError("Error cargando pagos: " + error.message);
      setLoading(false);
      return;
    }

    const lista = (data || []) as Pago[];
    setPagos(lista);
    await cargarBancoDePagos(lista);
    setLoading(false);
  }

  async function cargarBancoDePagos(lista: Pago[]) {
    const ids = lista.map((p) => String(p.id));
    if (ids.length === 0 || !condominioId) {
      setBancoMap({});
      return;
    }

    const { data, error } = await supabase
      .from("banco_movimientos")
      .select("id,numero_documento,periodo,monto,saldo_movimiento")
      .eq("condominio_id", condominioId)
      .eq("origen", "PAGO_PROPIETARIO")
      .in("numero_documento", ids);

    if (error) {
      setBancoMap({});
      return;
    }

    const map: BancoMap = {};
    (data || []).forEach((b: any) => {
      if (b.numero_documento) map[b.numero_documento] = b;
    });
    setBancoMap(map);
  }

  function abrirEdicion(p: Pago) {
    const unidad = p.unidad_id ? unidadMap[p.unidad_id] : null;

    setEditando({
      id: p.id,
      unidad_codigo: unidad?.codigo || "",
      fecha_pago: safeDate(p.fecha_pago),
      periodo: p.periodo || "",
      monto: String(p.monto || ""),
      referencia: p.referencia || "",
      descripcion: p.descripcion || "",
      cuenta_bancaria_id: p.cuenta_bancaria_id ? String(p.cuenta_bancaria_id) : "",
      metodo_pago: p.metodo_pago || p.metodo || "",
      tipo_fondo: p.tipo_fondo || "ORDINARIO",
    });
  }

  async function guardarEdicion() {
    if (!editando) return;

    const monto = Number(editando.monto);
    if (!editando.fecha_pago) {
      alert("Debe indicar fecha de pago.");
      return;
    }
    if (!monto || monto <= 0) {
      alert("El monto debe ser mayor que cero.");
      return;
    }

    const confirmar = confirm(
      "Esta acción actualizará el pago, reversará y reaplicará cargos, y sincronizará el movimiento bancario. ¿Continuar?"
    );
    if (!confirmar) return;

    setSaving(true);
    setError("");

    const { data, error } = await supabase.rpc("admin_actualizar_pago_seguro", {
      p_pago_id: editando.id,
      p_fecha_pago: editando.fecha_pago,
      p_periodo: editando.periodo || null,
      p_monto: monto,
      p_referencia: editando.referencia || null,
      p_descripcion: editando.descripcion || null,
      p_cuenta_bancaria_id: editando.cuenta_bancaria_id
        ? Number(editando.cuenta_bancaria_id)
        : null,
      p_metodo_pago: editando.metodo_pago || null,
      p_tipo_fondo: editando.tipo_fondo || null,
    });

    setSaving(false);

    if (error) {
      setError("Error actualizando pago: " + error.message);
      return;
    }

    setMensaje(data?.mensaje || "Pago actualizado correctamente.");
    setEditando(null);
    await cargarPagos();
  }

  async function eliminarPago(p: Pago) {
    const unidad = p.unidad_id ? unidadMap[p.unidad_id]?.codigo : "";
    const confirmar = confirm(
      `¿Seguro que desea eliminar este pago?\n\nID: ${p.id}\nUnidad: ${unidad}\nMonto: ${money(
        p.monto
      )}\n\nSe reversarán cargos, créditos y banco_movimientos.`
    );

    if (!confirmar) return;

    const confirmarFinal = prompt(
      "Para confirmar escriba ELIMINAR. Esta acción no se puede deshacer."
    );

    if (confirmarFinal !== "ELIMINAR") return;

    setSaving(true);
    setError("");

    const { data, error } = await supabase.rpc("admin_eliminar_pago_seguro", {
      p_pago_id: p.id,
    });

    setSaving(false);

    if (error) {
      setError("Error eliminando pago: " + error.message);
      return;
    }

    setMensaje(data?.mensaje || "Pago eliminado correctamente.");
    await cargarPagos();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Administración de Pagos
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Pantalla de corrección para pagos registrados. Al actualizar o borrar, se sincronizan cargos y Control Bancario.
              </p>
            </div>

            <button
              onClick={cargarPagos}
              disabled={loading || saving}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? "Cargando..." : "Actualizar lista"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Apartamento / Unidad
              </label>
              <select
                value={unidadFiltro}
                onChange={(e) => setUnidadFiltro(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.codigo || `Unidad ${u.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Fecha desde
              </label>
              <input
                type="date"
                value={fechaDesdeFiltro}
                onChange={(e) => setFechaDesdeFiltro(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Fecha hasta
              </label>
              <input
                type="date"
                value={fechaHastaFiltro}
                onChange={(e) => setFechaHastaFiltro(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase text-slate-500">
                Buscar
              </label>
              <input
                value={textoFiltro}
                onChange={(e) => setTextoFiltro(e.target.value)}
                placeholder="Referencia, descripción o período"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={cargarPagos}
                disabled={loading || saving}
                className="w-full rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                Filtrar
              </button>
              <button
                onClick={() => {
                  setUnidadFiltro("");
                  setFechaDesdeFiltro("");
                  setFechaHastaFiltro("");
                  setTextoFiltro("");
                  setTimeout(cargarPagos, 100);
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {mensaje}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Unidad</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Período pago</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Monto</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Referencia</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Banco</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Descripción</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pagos.map((p) => {
                  const unidad = p.unidad_id ? unidadMap[p.unidad_id] : null;
                  const banco = bancoMap[String(p.id)];

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{p.id}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {unidad?.codigo || p.unidad_id || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{safeDate(p.fecha_pago)}</td>
                      <td className="px-4 py-3 text-slate-700">{p.periodo || "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {money(p.monto)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{p.referencia || "-"}</td>
                      <td className="px-4 py-3">
                        {banco ? (
                          <div className="space-y-1">
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                              En banco {banco.periodo}
                            </span>
                            <div className="text-xs text-slate-500">
                              {money(banco.monto)} · Saldo {money(banco.saldo_movimiento)}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                            Falta en banco
                          </span>
                        )}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-slate-600">
                        <div className="line-clamp-2">{p.descripcion || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => abrirEdicion(p)}
                            className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => eliminarPago(p)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!loading && pagos.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                      No hay pagos para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Editar pago #{editando.id}
                </h2>
                <p className="text-sm text-slate-500">
                  Unidad {editando.unidad_codigo || "-"}
                </p>
              </div>
              <button
                onClick={() => setEditando(null)}
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Fecha de pago real banco
                </label>
                <input
                  type="date"
                  value={editando.fecha_pago}
                  onChange={(e) => setEditando({ ...editando, fecha_pago: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Período que paga
                </label>
                <input
                  type="month"
                  value={editando.periodo}
                  onChange={(e) => setEditando({ ...editando, periodo: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Monto
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editando.monto}
                  onChange={(e) => setEditando({ ...editando, monto: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Cuenta bancaria ID
                </label>
                <input
                  type="number"
                  value={editando.cuenta_bancaria_id}
                  onChange={(e) =>
                    setEditando({ ...editando, cuenta_bancaria_id: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Método de pago
                </label>
                <input
                  value={editando.metodo_pago}
                  onChange={(e) => setEditando({ ...editando, metodo_pago: e.target.value })}
                  placeholder="Transferencia / Depósito / Efectivo"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Tipo fondo
                </label>
                <select
                  value={editando.tipo_fondo}
                  onChange={(e) => setEditando({ ...editando, tipo_fondo: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="ORDINARIO">ORDINARIO</option>
                  <option value="EXTRAORDINARIO">EXTRAORDINARIO</option>
                  <option value="RESERVA">RESERVA</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Referencia
                </label>
                <input
                  value={editando.referencia}
                  onChange={(e) => setEditando({ ...editando, referencia: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Descripción
                </label>
                <textarea
                  value={editando.descripcion}
                  onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-end">
              <button
                onClick={() => setEditando(null)}
                disabled={saving}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEdicion}
                disabled={saving}
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
