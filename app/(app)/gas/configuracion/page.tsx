"use client";

/*
 * VAM Administración de Condominios
 * Módulo: Gas / Configuración
 * Versión: v1.1.0
 * Fecha: 12/10/2026
 *
 * OBJETIVO
 * - Consultar la modalidad de gas del condominio activo.
 * - Permitir a usuarios administradores seleccionar:
 *     SIN_MEDIDORES
 *     CON_MEDIDORES
 * - Registrar la fecha de inicio de medidores cuando aplique.
 * - Guardar la configuración en public.gas_configuracion.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type ModalidadGas = "SIN_MEDIDORES" | "CON_MEDIDORES";

type GasConfiguracion = {
  condominio_id: number;
  modalidad: ModalidadGas | null;
  fecha_inicio_medidores: string | null;
  factor_conversion_gas: number | null;
  unidad_lectura_gas: string | null;
  unidad_facturacion_gas: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const VERSION = "1.1.0";

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function fechaLocalISO() {
  const ahora = new Date();
  const year = ahora.getFullYear();
  const month = String(ahora.getMonth() + 1).padStart(2, "0");
  const day = String(ahora.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function GasConfiguracionPage() {
  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [condominioNombre, setCondominioNombre] = useState("");
  const [rolUsuario, setRolUsuario] = useState("");

  const [modalidad, setModalidad] = useState<ModalidadGas | null>(null);
  const [fechaInicioMedidores, setFechaInicioMedidores] = useState("");
  const [factorConversion, setFactorConversion] = useState("");
  const [unidadLectura, setUnidadLectura] = useState("M3");
  const [unidadFacturacion, setUnidadFacturacion] = useState("GLS");

  const [configuracionExiste, setConfiguracionExiste] = useState(false);
  const [configuracionOriginal, setConfiguracionOriginal] =
    useState<GasConfiguracion | null>(null);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<
    "ok" | "error" | "info" | ""
  >("");

  const esAdministrador = useMemo(() => {
    const rol = normalizarTexto(rolUsuario);

    return (
      rol.includes("ADMINISTRADOR GENERAL") ||
      rol.includes("ADMINISTRADOR CONDOMINIO") ||
      rol === "ADMINISTRADOR" ||
      rol === "ADMIN"
    );
  }, [rolUsuario]);

  useEffect(() => {
    const idTexto = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const rol =
      localStorage.getItem("usuario_rol") ||
      localStorage.getItem("rol") ||
      "";

    const id = Number(idTexto);

    setCondominioNombre(nombre);
    setRolUsuario(rol);

    if (!idTexto || !Number.isSafeInteger(id) || id <= 0) {
      setMensaje(
        "No hay un condominio válido seleccionado. Cierre sesión y vuelva a seleccionar el condominio."
      );
      setTipoMensaje("error");
      setCargando(false);
      return;
    }

    setCondominioId(id);
    void cargarConfiguracion(id);
  }, []);

  async function cargarConfiguracion(id: number) {
    setCargando(true);
    setMensaje("");
    setTipoMensaje("");

    const { data, error } = await supabase
      .from("gas_configuracion")
      .select(
        "condominio_id, modalidad, fecha_inicio_medidores, factor_conversion_gas, unidad_lectura_gas, unidad_facturacion_gas, created_at, updated_at"
      )
      .eq("condominio_id", id)
      .maybeSingle();

    if (error) {
      setMensaje(
        `No se pudo consultar la configuración de gas: ${error.message}`
      );
      setTipoMensaje("error");
      setCargando(false);
      return;
    }

    if (!data) {
      setConfiguracionExiste(false);
      setConfiguracionOriginal(null);
      setModalidad(null);
      setFechaInicioMedidores("");
      setFactorConversion("");
      setUnidadLectura("M3");
      setUnidadFacturacion("GLS");

      setMensaje(
        "Este condominio todavía no tiene una modalidad de gas configurada."
      );
      setTipoMensaje("info");
      setCargando(false);
      return;
    }

    const registro = data as GasConfiguracion;

    setConfiguracionExiste(true);
    setConfiguracionOriginal(registro);

    if (
      registro.modalidad === "SIN_MEDIDORES" ||
      registro.modalidad === "CON_MEDIDORES"
    ) {
      setModalidad(registro.modalidad);
    } else {
      setModalidad(null);
    }

    setFechaInicioMedidores(registro.fecha_inicio_medidores || "");
    setFactorConversion(registro.factor_conversion_gas == null ? "" : String(registro.factor_conversion_gas));
    setUnidadLectura(registro.unidad_lectura_gas || "M3");
    setUnidadFacturacion(registro.unidad_facturacion_gas || "GLS");
    setCargando(false);
  }

  function seleccionarModalidad(valor: ModalidadGas) {
    setModalidad(valor);
    setMensaje("");
    setTipoMensaje("");

    if (valor === "SIN_MEDIDORES") {
      setFechaInicioMedidores("");
      return;
    }

    if (!fechaInicioMedidores) {
      setFechaInicioMedidores(fechaLocalISO());
    }
  }

  async function guardarConfiguracion() {
    if (!condominioId) {
      setMensaje("No hay un condominio activo válido.");
      setTipoMensaje("error");
      return;
    }

    if (!esAdministrador) {
      setMensaje(
        "Solo un usuario administrador puede modificar la configuración de gas."
      );
      setTipoMensaje("error");
      return;
    }

    if (!modalidad) {
      setMensaje("Debe seleccionar una modalidad de gas.");
      setTipoMensaje("error");
      return;
    }

    if (modalidad === "CON_MEDIDORES" && !fechaInicioMedidores) {
      setMensaje(
        "Debe indicar la fecha de inicio para la modalidad con medidores."
      );
      setTipoMensaje("error");
      return;
    }

    const factorNumero = Number(factorConversion);
    if (modalidad === "CON_MEDIDORES" && (
      !factorConversion.trim() || !Number.isFinite(factorNumero) || factorNumero <= 0
    )) {
      setMensaje("Indique un factor de conversión válido mayor que cero.");
      setTipoMensaje("error");
      return;
    }
    if (modalidad === "CON_MEDIDORES" && unidadLectura === unidadFacturacion && factorNumero !== 1) {
      setMensaje("Si las unidades coinciden, el factor de conversión debe ser 1.");
      setTipoMensaje("error");
      return;
    }

    const descripcionModalidad =
      modalidad === "CON_MEDIDORES"
        ? "CON MEDIDORES"
        : "SIN MEDIDORES";

    const confirmar = window.confirm(
      `¿Desea guardar la modalidad ${descripcionModalidad} para ${condominioNombre || `el condominio ${condominioId}`}?`
    );

    if (!confirmar) return;

    setGuardando(true);
    setMensaje("");
    setTipoMensaje("");

    const valores = {
      modalidad,
      fecha_inicio_medidores:
        modalidad === "CON_MEDIDORES" ? fechaInicioMedidores : null,
      factor_conversion_gas: modalidad === "CON_MEDIDORES" ? factorNumero : null,
      unidad_lectura_gas: modalidad === "CON_MEDIDORES" ? unidadLectura : null,
      unidad_facturacion_gas: modalidad === "CON_MEDIDORES" ? unidadFacturacion : null,
      updated_at: new Date().toISOString(),
    };

    let errorGuardado: { message: string } | null = null;

    if (configuracionExiste) {
      const { error } = await supabase
        .from("gas_configuracion")
        .update(valores)
        .eq("condominio_id", condominioId);

      errorGuardado = error;
    } else {
      const { error } = await supabase.from("gas_configuracion").insert([
        {
          condominio_id: condominioId,
          ...valores,
        },
      ]);

      errorGuardado = error;
    }

    if (errorGuardado) {
      setMensaje(
        `No se pudo guardar la configuración: ${errorGuardado.message}`
      );
      setTipoMensaje("error");
      setGuardando(false);
      return;
    }

    await cargarConfiguracion(condominioId);

    setMensaje(
      `Configuración guardada correctamente: ${descripcionModalidad}.`
    );
    setTipoMensaje("ok");
    setGuardando(false);
  }

  const cambiosPendientes = useMemo(() => {
    if (!configuracionOriginal) {
      return modalidad !== null;
    }

    const fechaActual =
      modalidad === "CON_MEDIDORES" ? fechaInicioMedidores || null : null;

    return (
      configuracionOriginal.modalidad !== modalidad ||
      configuracionOriginal.fecha_inicio_medidores !== fechaActual ||
      (modalidad === "CON_MEDIDORES" && (
        (configuracionOriginal.factor_conversion_gas == null ? "" : String(configuracionOriginal.factor_conversion_gas)) !== factorConversion ||
        (configuracionOriginal.unidad_lectura_gas || "M3") !== unidadLectura ||
        (configuracionOriginal.unidad_facturacion_gas || "GLS") !== unidadFacturacion
      ))
    );
  }, [configuracionOriginal, modalidad, fechaInicioMedidores, factorConversion, unidadLectura, unidadFacturacion]);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
                Módulo de Gas
              </p>

              <h1 className="mt-1 text-3xl font-black text-slate-900">
                Configuración de Gas
              </h1>

              <p className="mt-1 text-xs text-slate-400">
                Configuración de Gas · v{VERSION}
              </p>

              <p className="mt-2 max-w-3xl text-slate-500">
                Defina cómo se controla el consumo de gas del condominio.
                Esta modalidad determinará las funciones disponibles en el
                módulo de Gas.
              </p>

              <div className="mt-4 space-y-1 text-sm text-slate-600">
                <p>
                  <strong>Condominio activo:</strong>{" "}
                  {condominioNombre || "No seleccionado"}
                </p>
                <p>
                  <strong>ID:</strong> {condominioId || "-"}
                </p>
                <p>
                  <strong>Rol:</strong> {rolUsuario || "No identificado"}
                </p>
              </div>
            </div>

            <Link
              href="/gas"
              className="rounded-xl bg-slate-800 px-4 py-2 text-center font-bold text-white hover:bg-slate-900"
            >
              Volver a Gas
            </Link>
          </div>
        </section>

        {mensaje && (
          <div
            role="alert"
            className={`rounded-2xl border p-4 text-sm font-semibold ${
              tipoMensaje === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : tipoMensaje === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {mensaje}
          </div>
        )}

        {!esAdministrador && !cargando && (
          <section className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-red-700">
              Acceso restringido
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Puede consultar la configuración, pero solo un Administrador
              General o Administrador de Condominio puede modificarla.
            </p>
          </section>
        )}

        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-black text-slate-900">
              Modalidad de consumo
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Seleccione la forma utilizada para medir y distribuir el consumo
              de gas en este condominio.
            </p>
          </div>

          {cargando ? (
            <div className="rounded-2xl border bg-slate-50 p-6 text-sm font-semibold text-slate-500">
              Consultando configuración...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <button
                type="button"
                disabled={!esAdministrador || guardando}
                onClick={() => seleccionarModalidad("SIN_MEDIDORES")}
                className={`rounded-3xl border-2 p-6 text-left transition ${
                  modalidad === "SIN_MEDIDORES"
                    ? "border-blue-700 bg-blue-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <div className="text-4xl" aria-hidden="true">
                  🛢️
                </div>
                <h3 className="mt-4 text-xl font-black text-slate-900">
                  Sin medidores
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  El condominio controla la recepción y el uso general del gas,
                  pero no registra lecturas individuales por apartamento.
                </p>

                <span
                  className={`mt-4 inline-block rounded-full px-3 py-1 text-xs font-black ${
                    modalidad === "SIN_MEDIDORES"
                      ? "bg-blue-700 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {modalidad === "SIN_MEDIDORES"
                    ? "Seleccionado"
                    : "Seleccionar"}
                </span>
              </button>

              <button
                type="button"
                disabled={!esAdministrador || guardando}
                onClick={() => seleccionarModalidad("CON_MEDIDORES")}
                className={`rounded-3xl border-2 p-6 text-left transition ${
                  modalidad === "CON_MEDIDORES"
                    ? "border-emerald-700 bg-emerald-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <div className="text-4xl" aria-hidden="true">
                  🔢
                </div>
                <h3 className="mt-4 text-xl font-black text-slate-900">
                  Con medidores
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Cada apartamento utiliza un medidor individual. El sistema
                  podrá registrar lecturas, calcular consumos y generar cargos
                  por residente.
                </p>

                <span
                  className={`mt-4 inline-block rounded-full px-3 py-1 text-xs font-black ${
                    modalidad === "CON_MEDIDORES"
                      ? "bg-emerald-700 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {modalidad === "CON_MEDIDORES"
                    ? "Seleccionado"
                    : "Seleccionar"}
                </span>
              </button>
            </div>
          )}
        </section>

        {modalidad === "CON_MEDIDORES" && !cargando && (
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-end">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Fecha de inicio de medidores
                </label>
                <input
                  type="date"
                  value={fechaInicioMedidores}
                  disabled={!esAdministrador || guardando}
                  onChange={(event) =>
                    setFechaInicioMedidores(event.target.value)
                  }
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />
                <p className="mt-2 text-xs text-slate-500">
                  A partir de esta fecha el sistema podrá considerar lecturas y
                  consumos individuales.
                </p>
              </div>

              <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-black text-slate-900">
                  Próximas funciones para condominios con medidores
                </p>
                <p className="mt-2">
                  Medidores por apartamento · Lecturas · Consumos · Recibos ·
                  Conciliación.
                </p>
              </div>
            </div>
          </section>
        )}

        {modalidad === "CON_MEDIDORES" && !cargando && (
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">Conversión para facturación</h2>
            <p className="mt-2 text-sm text-slate-600">
              Configure la equivalencia comercial que se aplicará al consumo de este condominio.
              No es una conversión física universal. El valor se almacena por condominio.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="gas-unidad-lectura" className="mb-2 block text-sm font-bold text-slate-700">Unidad del medidor</label>
                <select id="gas-unidad-lectura" value={unidadLectura} disabled={!esAdministrador || guardando}
                  onChange={(e) => { const v = e.target.value; setUnidadLectura(v); if (v === unidadFacturacion) setFactorConversion("1"); }}
                  className="w-full rounded-xl border bg-white px-4 py-3 disabled:bg-slate-100">
                  <option value="M3">Metros cúbicos (m³)</option><option value="GLS">Galones (GLS)</option>
                </select>
              </div>
              <div>
                <label htmlFor="gas-unidad-facturacion" className="mb-2 block text-sm font-bold text-slate-700">Unidad de facturación</label>
                <select id="gas-unidad-facturacion" value={unidadFacturacion} disabled={!esAdministrador || guardando}
                  onChange={(e) => { const v = e.target.value; setUnidadFacturacion(v); if (v === unidadLectura) setFactorConversion("1"); }}
                  className="w-full rounded-xl border bg-white px-4 py-3 disabled:bg-slate-100">
                  <option value="GLS">Galones (GLS)</option><option value="M3">Metros cúbicos (m³)</option>
                </select>
              </div>
              <div>
                <label htmlFor="gas-factor" className="mb-2 block text-sm font-bold text-slate-700">Factor de conversión</label>
                <input id="gas-factor" type="number" min="0.000001" step="any" inputMode="decimal"
                  value={factorConversion} disabled={!esAdministrador || guardando}
                  onChange={(e) => setFactorConversion(e.target.value)} placeholder="Ej.: 1.20"
                  className="w-full rounded-xl border bg-white px-4 py-3 disabled:bg-slate-100" />
              </div>
            </div>
            <div className="mt-4 rounded-2xl border bg-blue-50 p-4 text-sm text-slate-700">
              <p><strong>Fórmula:</strong> consumo medido × factor = consumo facturable.</p>
              <p className="mt-1">Ejemplo: 7.665 × {factorConversion || "(sin configurar)"} = {factorConversion && Number(factorConversion) > 0 ? (7.665 * Number(factorConversion)).toFixed(3) : "—"} {unidadFacturacion}.</p>
              <p className="mt-2 text-xs">Este formulario no genera facturas ni cargos. Consumos y Facturación deben leer este valor de Supabase.</p>
            </div>
          </section>
        )}

        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Estado de configuración
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {configuracionExiste
                  ? "El condominio ya tiene un registro de configuración."
                  : "El registro se creará al guardar por primera vez."}
              </p>

              <div className="mt-3 text-sm text-slate-600">
                <p>
                  <strong>Modalidad actual:</strong>{" "}
                  {modalidad === "CON_MEDIDORES"
                    ? "Con medidores"
                    : modalidad === "SIN_MEDIDORES"
                      ? "Sin medidores"
                      : "Sin configurar"}
                </p>
                {modalidad === "CON_MEDIDORES" && (
                  <p className="mt-1">
                    <strong>Inicio:</strong>{" "}
                    {fechaInicioMedidores || "Pendiente"}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={
                cargando ||
                guardando ||
                !esAdministrador ||
                !modalidad ||
                !cambiosPendientes
              }
              onClick={guardarConfiguracion}
              className="rounded-xl bg-blue-700 px-6 py-3 font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar configuración"}
            </button>
          </div>
        </section>

        <p className="text-right text-xs text-slate-400">
          Gas · Configuración v{VERSION}
        </p>
      </div>
    </main>
  );
}
