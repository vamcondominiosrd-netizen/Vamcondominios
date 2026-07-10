"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Plus,
  Search,
  X,
  Save,
  Trash2,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type Asiento = {
  id: number;
  fecha: string;
  referencia: string | null;
  descripcion: string;
  estado: string;
  total_debito: number;
  total_credito: number;
  origen: string | null;
};

type Cuenta = {
  id: number;
  codigo: string;
  nombre: string;
};

type Linea = {
  cuenta_id: string;
  debito: string;
  credito: string;
  comentario: string;
};

const condominioId = 1;

export default function AsientosPage() {
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    tipo_documento: "DIARIO",
    referencia: "",
    descripcion: "",
  });

  const [lineas, setLineas] = useState<Linea[]>([
    { cuenta_id: "", debito: "", credito: "", comentario: "" },
    { cuenta_id: "", debito: "", credito: "", comentario: "" },
  ]);

  async function cargarAsientos() {
    setCargando(true);
    setError("");

    const { data, error } = await supabase
      .from("contabilidad_asientos")
      .select("id,fecha,referencia,descripcion,estado,total_debito,total_credito,origen")
      .eq("condominio_id", condominioId)
      .order("id", { ascending: false });

    if (error) {
      setError(error.message);
      setAsientos([]);
    } else {
      setAsientos(data || []);
    }

    setCargando(false);
  }

  async function cargarCuentas() {
    const { data, error } = await supabase
      .from("contabilidad_cuentas")
      .select("id,codigo,nombre")
      .eq("condominio_id", condominioId)
      .eq("estado", "Activo")
      .eq("permite_movimiento", true)
      .order("codigo", { ascending: true });

    if (error) {
      setError(error.message);
      setCuentas([]);
    } else {
      setCuentas(data || []);
    }
  }

  useEffect(() => {
    cargarAsientos();
    cargarCuentas();
  }, []);

  const totales = useMemo(() => {
    const debito = lineas.reduce((acc, l) => acc + Number(l.debito || 0), 0);
    const credito = lineas.reduce((acc, l) => acc + Number(l.credito || 0), 0);
    return { debito, credito, diferencia: debito - credito };
  }, [lineas]);

  function formatoMonto(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function limpiarFormulario() {
    setForm({
      fecha: new Date().toISOString().slice(0, 10),
      tipo_documento: "DIARIO",
      referencia: "",
      descripcion: "",
    });

    setLineas([
      { cuenta_id: "", debito: "", credito: "", comentario: "" },
      { cuenta_id: "", debito: "", credito: "", comentario: "" },
    ]);
  }

  function actualizarLinea(index: number, campo: keyof Linea, valor: string) {
    const nuevas = [...lineas];
    nuevas[index] = { ...nuevas[index], [campo]: valor };
    setLineas(nuevas);
  }

  function agregarLinea() {
    setLineas([...lineas, { cuenta_id: "", debito: "", credito: "", comentario: "" }]);
  }

  function eliminarLinea(index: number) {
    if (lineas.length <= 2) {
      setError("El asiento debe tener mínimo dos líneas.");
      return;
    }

    setLineas(lineas.filter((_, i) => i !== index));
  }

  async function guardarAsientoCompleto() {
    setError("");

    if (!form.fecha) {
      setError("La fecha es obligatoria.");
      return;
    }

    if (!form.descripcion.trim()) {
      setError("La descripción es obligatoria.");
      return;
    }

    const lineasValidas = lineas
      .map((l) => ({
        cuenta_id: l.cuenta_id,
        debito: Number(l.debito || 0),
        credito: Number(l.credito || 0),
        comentario: l.comentario.trim() || null,
      }))
      .filter((l) => l.cuenta_id || l.debito > 0 || l.credito > 0);

    if (lineasValidas.length < 2) {
      setError("El asiento debe tener mínimo dos líneas con cuenta y monto.");
      return;
    }

    for (const linea of lineasValidas) {
      if (!linea.cuenta_id) {
        setError("Todas las líneas deben tener una cuenta seleccionada.");
        return;
      }

      if (linea.debito <= 0 && linea.credito <= 0) {
        setError("Cada línea debe tener débito o crédito.");
        return;
      }

      if (linea.debito > 0 && linea.credito > 0) {
        setError("Una misma línea no puede tener débito y crédito al mismo tiempo.");
        return;
      }
    }

    if (Math.abs(totales.diferencia) >= 0.01) {
      setError(`El asiento no está cuadrado. Diferencia RD$ ${formatoMonto(totales.diferencia)}.`);
      return;
    }

    setGuardando(true);

    const { data: asientoCreado, error: errorAsiento } = await supabase
      .from("contabilidad_asientos")
      .insert({
        condominio_id: condominioId,
        fecha: form.fecha,
        tipo_documento: form.tipo_documento,
        referencia: form.referencia.trim() || null,
        descripcion: form.descripcion.trim(),
        estado: "Cuadrado",
        total_debito: totales.debito,
        total_credito: totales.credito,
        origen: "MANUAL",
      })
      .select("id")
      .single();

    if (errorAsiento || !asientoCreado) {
      setError(errorAsiento?.message || "No se pudo crear el asiento.");
      setGuardando(false);
      return;
    }

    const detallePayload = lineasValidas.map((linea) => ({
      asiento_id: asientoCreado.id,
      cuenta_id: Number(linea.cuenta_id),
      debito: linea.debito,
      credito: linea.credito,
      comentario: linea.comentario,
    }));

    const { error: errorDetalle } = await supabase
      .from("contabilidad_asientos_detalle")
      .insert(detallePayload);

    if (errorDetalle) {
      await supabase.from("contabilidad_asientos").delete().eq("id", asientoCreado.id);
      setError(errorDetalle.message);
      setGuardando(false);
      return;
    }

    setModalAbierto(false);
    limpiarFormulario();
    await cargarAsientos();
    setGuardando(false);
  }

  const asientosFiltrados = asientos.filter((a) => {
    const texto = busqueda.toLowerCase();
    return (
      a.descripcion?.toLowerCase().includes(texto) ||
      a.referencia?.toLowerCase().includes(texto) ||
      a.origen?.toLowerCase().includes(texto)
    );
  });

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/contabilidad" className="mb-3 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-700">
              <ArrowLeft className="h-4 w-4" />
              Volver a Contabilidad
            </Link>

            <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                <FileText className="h-6 w-6" />
              </span>
              Asientos Contables
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Registro de asientos manuales y automáticos del sistema.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError("");
              setModalAbierto(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo Asiento
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex justify-end">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar..."
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Referencia</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-left">Origen</th>
                  <th className="px-4 py-3 text-right">Débito</th>
                  <th className="px-4 py-3 text-right">Crédito</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {cargando ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      Cargando asientos...
                    </td>
                  </tr>
                ) : asientosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      No existen asientos contables registrados.
                    </td>
                  </tr>
                ) : (
                  asientosFiltrados.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{item.id}</td>
                      <td className="px-4 py-3">{item.fecha}</td>
                      <td className="px-4 py-3">{item.referencia || "-"}</td>
                      <td className="px-4 py-3">{item.descripcion}</td>
                      <td className="px-4 py-3">{item.origen || "MANUAL"}</td>
                      <td className="px-4 py-3 text-right">RD$ {formatoMonto(Number(item.total_debito || 0))}</td>
                      <td className="px-4 py-3 text-right">RD$ {formatoMonto(Number(item.total_credito || 0))}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          {item.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Nuevo Asiento Contable</h2>
              <button
                type="button"
                onClick={() => {
                  setModalAbierto(false);
                  limpiarFormulario();
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Fecha</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Tipo documento</label>
                  <select
                    value={form.tipo_documento}
                    onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="DIARIO">Diario</option>
                    <option value="PAGO">Pago</option>
                    <option value="GASTO">Gasto</option>
                    <option value="NOMINA">Nómina</option>
                    <option value="AJUSTE">Ajuste</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Referencia</label>
                  <input
                    value={form.referencia}
                    onChange={(e) => setForm({ ...form, referencia: e.target.value })}
                    placeholder="Ej: AS-0001"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Descripción del asiento contable"
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 p-3">
                  <h3 className="font-semibold text-slate-800">Detalle del asiento</h3>

                  <button
                    type="button"
                    onClick={agregarLinea}
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar línea
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Cuenta</th>
                        <th className="px-3 py-2 text-right">Débito</th>
                        <th className="px-3 py-2 text-right">Crédito</th>
                        <th className="px-3 py-2 text-left">Comentario</th>
                        <th className="px-3 py-2 text-center">Acción</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                      {lineas.map((linea, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2">
                            <select
                              value={linea.cuenta_id}
                              onChange={(e) => actualizarLinea(index, "cuenta_id", e.target.value)}
                              className="min-w-72 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                              <option value="">Seleccione cuenta</option>
                              {cuentas.map((cuenta) => (
                                <option key={cuenta.id} value={cuenta.id}>
                                  {cuenta.codigo} - {cuenta.nombre}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={linea.debito}
                              onChange={(e) => actualizarLinea(index, "debito", e.target.value)}
                              className="w-32 rounded-xl border border-slate-300 px-3 py-2 text-right text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={linea.credito}
                              onChange={(e) => actualizarLinea(index, "credito", e.target.value)}
                              className="w-32 rounded-xl border border-slate-300 px-3 py-2 text-right text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              value={linea.comentario}
                              onChange={(e) => actualizarLinea(index, "comentario", e.target.value)}
                              className="min-w-56 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              placeholder="Opcional"
                            />
                          </td>

                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => eliminarLinea(index)}
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 border-t border-slate-200 p-4 md:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm text-slate-500">Total Débito</p>
                    <p className="text-xl font-bold text-slate-800">RD$ {formatoMonto(totales.debito)}</p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm text-slate-500">Total Crédito</p>
                    <p className="text-xl font-bold text-slate-800">RD$ {formatoMonto(totales.credito)}</p>
                  </div>

                  <div className={`rounded-xl p-3 ${Math.abs(totales.diferencia) < 0.01 ? "bg-green-50" : "bg-red-50"}`}>
                    <p className="text-sm text-slate-500">Diferencia</p>
                    <p className={`text-xl font-bold ${Math.abs(totales.diferencia) < 0.01 ? "text-green-700" : "text-red-700"}`}>
                      RD$ {formatoMonto(totales.diferencia)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalAbierto(false);
                    limpiarFormulario();
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={guardarAsientoCompleto}
                  disabled={guardando}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {guardando ? "Guardando..." : "Guardar asiento"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}