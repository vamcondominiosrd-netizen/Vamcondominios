"use client";

/*
 * VAM Administración de Condominios
 * Módulo: Gas / Consumo por apartamento
 * Versión: v1.0.0
 * Fecha: 13/10/2026
 *
 * Objetivo:
 * - Revisar consumos ya calculados en gas_lecturas.
 * - Seleccionar el período.
 * - Determinar la tarifa de gas aplicable antes de facturar.
 * - Mostrar consumo, precio unitario e importe por apartamento.
 * - NO genera cargos todavía; esta pantalla es de revisión previa.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

const VERSION = "1.0.0";

type ModalidadGas = "SIN_MEDIDORES" | "CON_MEDIDORES";

type Lectura = {
  id: number;
  condominio_id: number;
  medidor_id: number;
  unidad_id: number;
  tanque_id: number;
  unidad_medida_id: number;
  periodo: string;
  fecha_lectura: string;
  lectura_anterior: number;
  lectura_actual: number;
  consumo: number;
  foto_medidor_url: string | null;
  estado: string;
  motivo_revision: string | null;
  observacion: string | null;
  gas_medidores?: {
    numero_serie: string | null;
  } | null;
  unidades?: {
    codigo: string | null;
    propietario_nombre: string | null;
  } | null;
  gas_unidades_medida?: {
    nombre: string | null;
    abreviatura: string | null;
  } | null;
};

type PrecioGas = {
  id: number;
  condominio_id: number;
  proveedor_id: number | null;
  unidad_medida_id: number;
  precio_unitario: number;
  fecha_inicio: string;
  estado: string;
  observacion: string | null;
  catalogo_proveedores?: {
    nombre_proveedor: string | null;
  } | null;
  gas_unidades_medida?: {
    nombre: string | null;
    abreviatura: string | null;
  } | null;
};

function fechaLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function periodoActual() {
  return fechaLocalISO().slice(0, 7);
}

function fechaPeriodo(periodo: string) {
  return periodo ? `${periodo}-01` : "";
}

function primerDiaMesSiguiente(periodo: string) {
  if (!periodo) return "";

  const [year, month] = periodo.split("-").map(Number);
  const d = new Date(year, month, 1);

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");

  return `${y}-${m}-01`;
}

function numero(valor: number | string | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function dinero(valor: number | string | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function GasConsumosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [modalidad, setModalidad] = useState<ModalidadGas | null>(null);

  const [periodo, setPeriodo] = useState(periodoActual());
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [precios, setPrecios] = useState<PrecioGas[]>([]);
  const [precioId, setPrecioId] = useState("");

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
      setMensaje("No hay un condominio activo válido. Inicie sesión nuevamente.");
      return;
    }

    void cargarTodo(id, periodoActual());
  }, []);

  async function cargarTodo(id: string, periodoSeleccionado: string) {
    setLoading(true);
    setMensaje("");
    setPrecioId("");

    const modalidadOk = await cargarModalidad(id);

    if (!modalidadOk) {
      setLoading(false);
      return;
    }

    await Promise.all([
      cargarLecturas(id, periodoSeleccionado),
      cargarPrecios(id, periodoSeleccionado),
    ]);

    setLoading(false);
  }

  async function cargarModalidad(id: string) {
    const { data, error } = await supabase
      .from("gas_configuracion")
      .select("modalidad")
      .eq("condominio_id", Number(id))
      .maybeSingle();

    if (error) {
      setModalidad(null);
      setMensaje("Error consultando configuración de gas: " + error.message);
      return false;
    }

    if (!data || data.modalidad !== "CON_MEDIDORES") {
      setModalidad(
        data?.modalidad === "SIN_MEDIDORES" ? "SIN_MEDIDORES" : null
      );
      setMensaje(
        "Este condominio no está configurado con medidores. Revise Configuración de Gas."
      );
      return false;
    }

    setModalidad("CON_MEDIDORES");
    return true;
  }

  async function cargarLecturas(id: string, periodoSeleccionado: string) {
    const { data, error } = await supabase
      .from("gas_lecturas")
      .select(`
        id,
        condominio_id,
        medidor_id,
        unidad_id,
        tanque_id,
        unidad_medida_id,
        periodo,
        fecha_lectura,
        lectura_anterior,
        lectura_actual,
        consumo,
        foto_medidor_url,
        estado,
        motivo_revision,
        observacion,
        gas_medidores(numero_serie),
        unidades(codigo, propietario_nombre),
        gas_unidades_medida(nombre, abreviatura)
      `)
      .eq("condominio_id", Number(id))
      .eq("periodo", fechaPeriodo(periodoSeleccionado))
      .order("unidad_id", { ascending: true });

    if (error) {
      setLecturas([]);
      setMensaje("Error cargando consumos: " + error.message);
      return;
    }

    setLecturas((data as Lectura[]) || []);
  }

  async function cargarPrecios(id: string, periodoSeleccionado: string) {
    const siguienteMes = primerDiaMesSiguiente(periodoSeleccionado);

    const { data, error } = await supabase
      .from("gas_precios")
      .select(`
        id,
        condominio_id,
        proveedor_id,
        unidad_medida_id,
        precio_unitario,
        fecha_inicio,
        estado,
        observacion,
        catalogo_proveedores(nombre_proveedor),
        gas_unidades_medida(nombre, abreviatura)
      `)
      .eq("condominio_id", Number(id))
      .lt("fecha_inicio", siguienteMes)
      .order("fecha_inicio", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      setPrecios([]);
      setMensaje("Error cargando tarifas de gas: " + error.message);
      return;
    }

    const lista = (data as PrecioGas[]) || [];

    /*
     * Conservamos únicamente el precio más reciente por proveedor
     * y unidad de medida para el período consultado.
     */
    const mapa = new Map<string, PrecioGas>();

    for (const precio of lista) {
      const clave = `${precio.proveedor_id ?? "SIN"}-${precio.unidad_medida_id}`;

      if (!mapa.has(clave)) {
        mapa.set(clave, precio);
      }
    }

    const aplicables = Array.from(mapa.values());
    setPrecios(aplicables);

    if (aplicables.length === 1) {
      setPrecioId(String(aplicables[0].id));
    }
  }

  async function cambiarPeriodo(valor: string) {
    setPeriodo(valor);

    if (!condominioId || !valor) return;

    await cargarTodo(condominioId, valor);
  }

  const precioSeleccionado = useMemo(() => {
    return precios.find((p) => String(p.id) === String(precioId)) || null;
  }, [precios, precioId]);

  const filas = useMemo(() => {
    return lecturas.map((lectura) => {
      const unidadCompatible =
        precioSeleccionado &&
        Number(precioSeleccionado.unidad_medida_id) ===
          Number(lectura.unidad_medida_id);

      const precio = unidadCompatible
        ? Number(precioSeleccionado?.precio_unitario || 0)
        : 0;

      const consumo = Number(lectura.consumo || 0);
      const importe = consumo * precio;

      return {
        ...lectura,
        precioAplicado: precio,
        importe,
        tarifaCompatible: Boolean(unidadCompatible),
        facturable:
          lectura.estado === "Registrada" &&
          Boolean(unidadCompatible) &&
          precio > 0,
      };
    });
  }, [lecturas, precioSeleccionado]);

  const filasFiltradas = useMemo(() => {
    const texto = buscar.trim().toLowerCase();

    if (!texto) return filas;

    return filas.filter((fila) => {
      const cadena = `
        ${fila.unidades?.codigo || ""}
        ${fila.unidades?.propietario_nombre || ""}
        ${fila.gas_medidores?.numero_serie || ""}
        ${fila.estado || ""}
        ${fila.observacion || ""}
      `.toLowerCase();

      return cadena.includes(texto);
    });
  }, [filas, buscar]);

  const totalConsumo = filasFiltradas.reduce(
    (suma, fila) => suma + Number(fila.consumo || 0),
    0
  );

  const totalImporte = filasFiltradas
    .filter((fila) => fila.facturable)
    .reduce((suma, fila) => suma + Number(fila.importe || 0), 0);

  const totalRevision = filas.filter((fila) => fila.estado === "Revisión").length;

  const totalFacturables = filas.filter((fila) => fila.facturable).length;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-orange-700">
                Módulo de Gas
              </p>

              <h1 className="mt-1 text-3xl font-black text-slate-900">
                Consumo por Apartamento
              </h1>

              <p className="mt-1 text-xs text-slate-400">
                Gas · Consumos v{VERSION}
              </p>

              <p className="mt-2 max-w-3xl text-slate-500">
                Revise el consumo del período y aplique una tarifa antes de
                generar los cargos de gas a los propietarios.
              </p>

              <p className="mt-3 text-sm font-bold text-blue-700">
                Condominio activo: {condominioNombre || "No seleccionado"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/gas/lecturas"
                className="rounded-xl bg-slate-600 px-4 py-2 font-bold text-white hover:bg-slate-700"
              >
                Lecturas
              </Link>

              <Link
                href="/gas"
                className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-white hover:bg-slate-900"
              >
                Volver a Gas
              </Link>

              <button
                type="button"
                disabled={!condominioId || loading}
                onClick={() => void cargarTodo(condominioId, periodo)}
                className="rounded-xl bg-blue-700 px-4 py-2 font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                Actualizar
              </button>
            </div>
          </div>
        </section>

        {mensaje && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            {mensaje}
          </div>
        )}

        {modalidad === "CON_MEDIDORES" && (
          <>
            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Período
                  </label>
                  <input
                    type="month"
                    value={periodo}
                    onChange={(e) => void cambiarPeriodo(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold">
                    Tarifa / proveedor para calcular
                  </label>

                  <select
                    value={precioId}
                    onChange={(e) => setPrecioId(e.target.value)}
                    className="w-full rounded-xl border bg-white px-4 py-3"
                  >
                    <option value="">Seleccione la tarifa aplicable</option>

                    {precios.map((precio) => (
                      <option key={precio.id} value={precio.id}>
                        {precio.catalogo_proveedores?.nombre_proveedor ||
                          "Proveedor sin nombre"}{" "}
                        · RD$ {dinero(precio.precio_unitario)} /{" "}
                        {precio.gas_unidades_medida?.abreviatura ||
                          precio.gas_unidades_medida?.nombre ||
                          "unidad"}{" "}
                        · desde {precio.fecha_inicio}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs text-slate-500">
                    El sistema muestra el precio más reciente disponible por
                    proveedor y unidad de medida para el período seleccionado.
                  </p>
                </div>
              </div>

              {!precioSeleccionado && lecturas.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Seleccione la tarifa que se utilizará para calcular el importe
                  de cada apartamento. Todavía no se generará ningún cargo.
                </div>
              )}
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Apartamentos leídos</p>
                <p className="text-3xl font-black text-slate-900">
                  {lecturas.length}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Consumo total</p>
                <p className="text-3xl font-black text-orange-700">
                  {numero(totalConsumo)}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Listos para facturar</p>
                <p className="text-3xl font-black text-emerald-700">
                  {totalFacturables}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Importe calculado</p>
                <p className="text-3xl font-black text-blue-700">
                  RD$ {dinero(totalImporte)}
                </p>
                {totalRevision > 0 && (
                  <p className="mt-2 text-xs font-bold text-amber-700">
                    {totalRevision} lectura(s) en revisión no incluidas.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Detalle del período {periodo}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Esta pantalla es de revisión. Los importes aún no se
                    convierten en cargos al propietario.
                  </p>
                </div>

                <input
                  type="text"
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 md:w-80"
                  placeholder="Buscar apartamento, propietario..."
                />
              </div>

              <div className="overflow-auto rounded-2xl border">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border p-3 text-left">Apartamento</th>
                      <th className="border p-3 text-left">Propietario</th>
                      <th className="border p-3 text-left">Medidor</th>
                      <th className="border p-3 text-right">Anterior</th>
                      <th className="border p-3 text-right">Actual</th>
                      <th className="border p-3 text-right">Consumo</th>
                      <th className="border p-3 text-right">Tarifa</th>
                      <th className="border p-3 text-right">Importe</th>
                      <th className="border p-3 text-center">Estado</th>
                      <th className="border p-3 text-center">Evidencia</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filasFiltradas.map((fila) => (
                      <tr key={fila.id} className="hover:bg-slate-50">
                        <td className="border p-3 font-black">
                          {fila.unidades?.codigo || "-"}
                        </td>

                        <td className="border p-3">
                          {fila.unidades?.propietario_nombre ||
                            "Sin propietario"}
                        </td>

                        <td className="border p-3">
                          {fila.gas_medidores?.numero_serie || "-"}
                        </td>

                        <td className="border p-3 text-right">
                          {numero(fila.lectura_anterior)}
                        </td>

                        <td className="border p-3 text-right">
                          {numero(fila.lectura_actual)}
                        </td>

                        <td className="border p-3 text-right font-black text-orange-700">
                          {numero(fila.consumo)}{" "}
                          {fila.gas_unidades_medida?.abreviatura || ""}
                        </td>

                        <td className="border p-3 text-right">
                          {fila.tarifaCompatible && fila.precioAplicado > 0
                            ? `RD$ ${dinero(fila.precioAplicado)}`
                            : "-"}
                        </td>

                        <td className="border p-3 text-right font-black text-blue-700">
                          {fila.facturable
                            ? `RD$ ${dinero(fila.importe)}`
                            : "-"}
                        </td>

                        <td className="border p-3 text-center">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              fila.estado === "Registrada"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {fila.estado}
                          </span>

                          {!fila.tarifaCompatible && precioSeleccionado && (
                            <p className="mt-1 text-[11px] font-bold text-red-600">
                              Unidad no compatible con tarifa
                            </p>
                          )}
                        </td>

                        <td className="border p-3 text-center">
                          {fila.foto_medidor_url ? (
                            <a
                              href={fila.foto_medidor_url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-blue-700 underline"
                            >
                              Ver foto
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}

                    {filasFiltradas.length === 0 && (
                      <tr>
                        <td
                          colSpan={10}
                          className="border p-8 text-center text-slate-500"
                        >
                          No hay lecturas registradas para este período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <p className="text-right text-xs text-slate-400">
          Gas · Consumos v{VERSION}
        </p>
      </div>
    </main>
  );
}
