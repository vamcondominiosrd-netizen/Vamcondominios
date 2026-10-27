"use client";

/*
 * VAM Administración de Condominios
 * Módulo: Gas / Medidores
 * Versión: v1.1.0
 * Fecha: 15/10/2026
 *
 * Funciones:
 * - Solo opera para condominios CON_MEDIDORES.
 * - Carga unidades, tanques y medidores del condominio activo.
 * - Registra y edita medidores individuales por apartamento.
 * - Evita crear dos medidores activos para la misma unidad.
 * - Permite lectura inicial, fecha de instalación, serie, tanque y unidad de medida.
 * - Permite foto opcional del medidor.
 */

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

const VERSION = "1.1.0";

type ModalidadGas = "SIN_MEDIDORES" | "CON_MEDIDORES";

type Unidad = {
  id: number;
  condominio_id: number;
  codigo: string;
  propietario_nombre: string | null;
  activa: boolean | null;
};

type GasTanque = {
  id: number;
  nombre: string;
  descripcion: string | null;
  capacidad_estimada: number | null;
  estado: string;
};

type UnidadMedida = {
  id: number;
  nombre: string;
  abreviatura: string | null;
  estado?: string | null;
};

type GasMedidor = {
  id: number;
  condominio_id: number;
  unidad_id: number;
  tanque_id: number;
  unidad_medida_id: number;
  numero_serie: string;
  lectura_inicial: number;
  fecha_lectura_inicial: string;
  fecha_instalacion: string | null;
  fecha_retiro: string | null;
  estado: string;
  foto_medidor_url: string | null;
  observacion: string | null;
  created_at: string | null;
  updated_at: string | null;

  unidades?: {
    codigo: string | null;
    propietario_nombre: string | null;
  } | null;

  gas_tanques?: {
    nombre: string | null;
  } | null;

  gas_unidades_medida?: {
    nombre: string | null;
    abreviatura: string | null;
  } | null;
};

function esMetroCubico(u: UnidadMedida) {
  const texto = `${u.nombre || ""} ${u.abreviatura || ""}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return /(?:m³|m3|metros? cubicos?|cubic meters?)/i.test(texto);
}

function fechaLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function numero(valor: number | string | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

export default function GasMedidoresPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [modalidad, setModalidad] = useState<ModalidadGas | null>(null);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [tanques, setTanques] = useState<GasTanque[]>([]);
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadMedida[]>([]);
  const [medidores, setMedidores] = useState<GasMedidor[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [buscar, setBuscar] = useState("");

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [unidadId, setUnidadId] = useState("");
  const [tanqueId, setTanqueId] = useState("");
  const [unidadMedidaId, setUnidadMedidaId] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [lecturaInicial, setLecturaInicial] = useState("");
  const [fechaLecturaInicial, setFechaLecturaInicial] = useState(fechaLocalISO());
  const [fechaInstalacion, setFechaInstalacion] = useState(fechaLocalISO());
  const [estado, setEstado] = useState("Activo");
  const [observacion, setObservacion] = useState("");
  const [fotoMedidor, setFotoMedidor] = useState<File | null>(null);
  const [fotoActualUrl, setFotoActualUrl] = useState("");
  const [tieneLecturas, setTieneLecturas] = useState(false);
  const [consultandoLecturas, setConsultandoLecturas] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
      setMensaje("No hay un condominio activo válido. Inicie sesión nuevamente.");
      return;
    }

    void cargarTodo(id);
  }, []);

  async function cargarTodo(id: string) {
    setLoading(true);
    setMensaje("");

    const modalidadOk = await cargarModalidad(id);

    if (!modalidadOk) {
      setLoading(false);
      return;
    }

    await Promise.all([
      cargarUnidades(id),
      cargarTanques(id),
      cargarUnidadesMedida(),
      cargarMedidores(id),
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

  async function cargarUnidades(id: string) {
    const { data, error } = await supabase
      .from("unidades")
      .select("id, condominio_id, codigo, propietario_nombre, activa")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo", { ascending: true });

    if (error) {
      setUnidades([]);
      setMensaje("Error cargando apartamentos: " + error.message);
      return;
    }

    setUnidades((data as Unidad[]) || []);
  }

  async function cargarTanques(id: string) {
    const { data, error } = await supabase
      .from("gas_tanques")
      .select("id, nombre, descripcion, capacidad_estimada, estado")
      .eq("condominio_id", Number(id))
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });

    if (error) {
      setTanques([]);
      setMensaje("Error cargando tanques: " + error.message);
      return;
    }

    setTanques((data as GasTanque[]) || []);

    if (!tanqueId && data && data.length === 1) {
      setTanqueId(String(data[0].id));
    }
  }

  async function cargarUnidadesMedida() {
    const { data, error } = await supabase
      .from("gas_unidades_medida")
      .select("id, nombre, abreviatura, estado")
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });

    if (error) {
      setUnidadesMedida([]);
      setMensaje("Error cargando unidades de medida: " + error.message);
      return;
    }

    const lista = (data as UnidadMedida[]) || [];
    setUnidadesMedida(lista);

    // El medidor registra m³; la conversión a galones ocurre al facturar.
    if (!unidadMedidaId) {
      const metrosCubicos = lista.find((u) => esMetroCubico(u));
      if (metrosCubicos) setUnidadMedidaId(String(metrosCubicos.id));
      else setMensaje("Debe configurar una unidad de medida m³ activa antes de registrar medidores.");
    }
  }

  async function cargarMedidores(id: string) {
    const { data, error } = await supabase
      .from("gas_medidores")
      .select(`
        id,
        condominio_id,
        unidad_id,
        tanque_id,
        unidad_medida_id,
        numero_serie,
        lectura_inicial,
        fecha_lectura_inicial,
        fecha_instalacion,
        fecha_retiro,
        estado,
        foto_medidor_url,
        observacion,
        created_at,
        updated_at,
        unidades(codigo, propietario_nombre),
        gas_tanques(nombre),
        gas_unidades_medida(nombre, abreviatura)
      `)
      .eq("condominio_id", Number(id))
      .order("estado", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      setMedidores([]);
      setMensaje("Error cargando medidores: " + error.message);
      return;
    }

    setMedidores((data as GasMedidor[]) || []);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setUnidadId("");
    setNumeroSerie("");
    setLecturaInicial("");
    setFechaLecturaInicial(fechaLocalISO());
    setFechaInstalacion(fechaLocalISO());
    setEstado("Activo");
    setObservacion("");
    setFotoMedidor(null);
    setFotoActualUrl("");

    if (tanques.length === 1) {
      setTanqueId(String(tanques[0].id));
    } else {
      setTanqueId("");
    }

    const metrosCubicos = unidadesMedida.find((u) => esMetroCubico(u));
    setUnidadMedidaId(metrosCubicos ? String(metrosCubicos.id) : "");
    setTieneLecturas(false);
    setConsultandoLecturas(false);
  }

  async function editarMedidor(medidor: GasMedidor) {
    setConsultandoLecturas(true);
    setTieneLecturas(true); // Bloqueo preventivo hasta comprobar el historial.
    const { count, error } = await supabase
      .from("gas_lecturas")
      .select("id", { count: "exact", head: true })
      .eq("condominio_id", Number(condominioId))
      .eq("medidor_id", medidor.id);
    if (error) {
      setMensaje("No se pudo verificar el historial del medidor. Sus datos de lectura quedan bloqueados por seguridad: " + error.message);
    } else {
      setTieneLecturas((count || 0) > 0);
    }
    setConsultandoLecturas(false);
    setEditandoId(medidor.id);
    setUnidadId(String(medidor.unidad_id));
    setTanqueId(String(medidor.tanque_id));
    setUnidadMedidaId(String(medidor.unidad_medida_id));
    setNumeroSerie(medidor.numero_serie || "");
    setLecturaInicial(String(medidor.lectura_inicial ?? ""));
    setFechaLecturaInicial(medidor.fecha_lectura_inicial || fechaLocalISO());
    setFechaInstalacion(medidor.fecha_instalacion || "");
    setEstado(medidor.estado || "Activo");
    setObservacion(medidor.observacion || "");
    setFotoActualUrl(medidor.foto_medidor_url || "");
    setFotoMedidor(null);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function subirFotoMedidor() {
    if (!fotoMedidor) return fotoActualUrl || null;
    if (!condominioId) throw new Error("No hay condominio activo.");

    const extension = fotoMedidor.name.split(".").pop() || "jpg";
    const nombreArchivo = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const ruta = `${condominioId}/medidores/${nombreArchivo}`;

    const { error } = await supabase.storage
      .from("fotos-gas")
      .upload(ruta, fotoMedidor);

    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from("fotos-gas").getPublicUrl(ruta);
    return data.publicUrl;
  }

  async function validarUnidadDisponible() {
    if (!condominioId || !unidadId) return true;

    let query = supabase
      .from("gas_medidores")
      .select("id, numero_serie, estado")
      .eq("condominio_id", Number(condominioId))
      .eq("unidad_id", Number(unidadId))
      .eq("estado", "Activo");

    if (editandoId) query = query.neq("id", editandoId);

    const { data, error } = await query.limit(1);

    if (error) throw new Error(error.message);

    return !data || data.length === 0;
  }

  async function validarSerieDisponible() {
    if (!condominioId || !numeroSerie.trim()) return true;

    let query = supabase
      .from("gas_medidores")
      .select("id")
      .eq("condominio_id", Number(condominioId))
      .ilike("numero_serie", numeroSerie.trim());

    if (editandoId) query = query.neq("id", editandoId);

    const { data, error } = await query.limit(1);

    if (error) throw new Error(error.message);

    return !data || data.length === 0;
  }

  async function guardarMedidor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId) {
      alert("No hay condominio activo.");
      return;
    }

    if (modalidad !== "CON_MEDIDORES") {
      alert("El condominio no está configurado con medidores.");
      return;
    }

    if (!unidadId) {
      alert("Debe seleccionar el apartamento.");
      return;
    }

    if (!tanqueId) {
      alert("Debe seleccionar el tanque.");
      return;
    }

    if (!unidadMedidaId) {
      alert("Debe seleccionar la unidad de medida.");
      return;
    }

    const unidadSeleccionada = unidades.find((u) => u.id === Number(unidadId));
    const tanqueSeleccionado = tanques.find((t) => t.id === Number(tanqueId));
    const medidaSeleccionada = unidadesMedida.find((u) => u.id === Number(unidadMedidaId));
    if (!unidadSeleccionada || unidadSeleccionada.condominio_id !== Number(condominioId) || !tanqueSeleccionado) {
      alert("Apartamento o tanque no pertenece a las opciones activas de este condominio.");
      return;
    }
    if (!medidaSeleccionada || !esMetroCubico(medidaSeleccionada)) {
      alert("La lectura de este medidor debe registrarse en metros cúbicos (m³).");
      return;
    }
    if (editandoId && (tieneLecturas || consultandoLecturas)) {
      alert("Este medidor tiene lecturas registradas o no se pudo verificar su historial. Para proteger las lecturas no se permite editar su configuración desde esta pantalla.");
      return;
    }

    if (!numeroSerie.trim()) {
      alert("Debe indicar el número de serie del medidor.");
      return;
    }

    const lectura = Number(lecturaInicial);

    if (!Number.isFinite(lectura) || lectura < 0) {
      alert("La lectura inicial debe ser un número mayor o igual a cero.");
      return;
    }

    if (!fechaLecturaInicial) {
      alert("Debe indicar la fecha de lectura inicial.");
      return;
    }

    setGuardando(true);
    setMensaje("");

    try {
      const unidadDisponible = await validarUnidadDisponible();

      if (!unidadDisponible && estado === "Activo") {
        alert("Este apartamento ya tiene un medidor activo registrado.");
        setGuardando(false);
        return;
      }

      const serieDisponible = await validarSerieDisponible();

      if (!serieDisponible) {
        alert("Ya existe un medidor con este número de serie en el condominio.");
        setGuardando(false);
        return;
      }

      const fotoUrl = await subirFotoMedidor();

      const registro = {
        condominio_id: Number(condominioId),
        unidad_id: Number(unidadId),
        tanque_id: Number(tanqueId),
        unidad_medida_id: Number(unidadMedidaId),
        numero_serie: numeroSerie.trim(),
        lectura_inicial: lectura,
        fecha_lectura_inicial: fechaLecturaInicial,
        fecha_instalacion: fechaInstalacion || null,
        fecha_retiro: estado === "Activo" ? null : fechaLocalISO(),
        estado,
        foto_medidor_url: fotoUrl,
        observacion: observacion.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editandoId) {
        const { error } = await supabase
          .from("gas_medidores")
          .update(registro)
          .eq("id", editandoId)
          .eq("condominio_id", Number(condominioId));

        if (error) throw new Error(error.message);

        alert("Medidor actualizado correctamente.");
      } else {
        const { error } = await supabase.from("gas_medidores").insert([
          {
            ...registro,
            created_at: new Date().toISOString(),
          },
        ]);

        if (error) throw new Error(error.message);

        alert("Medidor registrado correctamente.");
      }

      limpiarFormulario();
      await cargarMedidores(condominioId);
    } catch (error: any) {
      alert("Error guardando medidor: " + (error?.message || String(error)));
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(medidor: GasMedidor) {
    if (!condominioId) return;

    const nuevoEstado = medidor.estado === "Activo" ? "Inactivo" : "Activo";

    if (nuevoEstado === "Activo") {
      const otroActivo = medidores.find(
        (m) =>
          m.unidad_id === medidor.unidad_id &&
          m.id !== medidor.id &&
          m.estado === "Activo"
      );

      if (otroActivo) {
        alert(
          "No puede activar este medidor porque el apartamento ya tiene otro medidor activo."
        );
        return;
      }
    }

    const confirmar = window.confirm(
      `¿Desea cambiar el medidor ${medidor.numero_serie} a ${nuevoEstado}?`
    );

    if (!confirmar) return;

    // No se permite cambiar el estado sin comprobar el historial de lecturas.
    const { error: errorLecturas } = await supabase
      .from("gas_lecturas")
      .select("id", { count: "exact", head: true })
      .eq("condominio_id", Number(condominioId))
      .eq("medidor_id", medidor.id);
    if (errorLecturas) {
      alert("No fue posible verificar las lecturas de este medidor. Operación cancelada.");
      return;
    }

    const { error } = await supabase
      .from("gas_medidores")
      .update({
        estado: nuevoEstado,
        fecha_retiro: nuevoEstado === "Inactivo" ? fechaLocalISO() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", medidor.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error cambiando estado: " + error.message);
      return;
    }

    await cargarMedidores(condominioId);
  }

  const medidoresFiltrados = useMemo(() => {
    const texto = buscar.trim().toLowerCase();

    if (!texto) return medidores;

    return medidores.filter((medidor) => {
      const cadena = `
        ${medidor.id}
        ${medidor.numero_serie || ""}
        ${medidor.estado || ""}
        ${medidor.observacion || ""}
        ${medidor.unidades?.codigo || ""}
        ${medidor.unidades?.propietario_nombre || ""}
        ${medidor.gas_tanques?.nombre || ""}
        ${medidor.gas_unidades_medida?.nombre || ""}
      `.toLowerCase();

      return cadena.includes(texto);
    });
  }, [medidores, buscar]);

  const medidoresActivos = medidores.filter((m) => m.estado === "Activo").length;
  const medidoresInactivos = medidores.length - medidoresActivos;

  const unidadesConMedidorActivo = new Set(
    medidores
      .filter((m) => m.estado === "Activo")
      .map((m) => Number(m.unidad_id))
  ).size;

  const unidadesPendientes = Math.max(
    unidades.length - unidadesConMedidorActivo,
    0
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
                Módulo de Gas
              </p>
              <h1 className="mt-1 text-3xl font-black text-slate-900">
                Medidores por Apartamento
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Gas · Medidores v{VERSION}
              </p>
              <p className="mt-2 max-w-3xl text-slate-500">
                Registre el medidor individual de cada apartamento, su lectura
                inicial, tanque asociado y unidad de medida.
              </p>
              <p className="mt-3 text-sm font-bold text-blue-700">
                Condominio activo: {condominioNombre || "No seleccionado"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Modalidad:{" "}
                <strong>
                  {modalidad === "CON_MEDIDORES"
                    ? "Con medidores"
                    : modalidad === "SIN_MEDIDORES"
                      ? "Sin medidores"
                      : "Sin verificar"}
                </strong>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/gas"
                className="rounded-xl bg-slate-700 px-4 py-2 font-bold text-white hover:bg-slate-800"
              >
                Volver a Gas
              </Link>
              <button
                type="button"
                disabled={!condominioId || loading}
                onClick={() => void cargarTodo(condominioId)}
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
            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Apartamentos</p>
                <p className="text-3xl font-black text-slate-900">
                  {unidades.length}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Medidores activos</p>
                <p className="text-3xl font-black text-emerald-700">
                  {medidoresActivos}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Pendientes de medidor</p>
                <p className="text-3xl font-black text-amber-700">
                  {unidadesPendientes}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Inactivos / retirados</p>
                <p className="text-3xl font-black text-slate-700">
                  {medidoresInactivos}
                </p>
              </div>
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-black text-slate-900">
                {editandoId ? "Editar medidor" : "Registrar medidor"}
              </h2>

              {editandoId !== null && (tieneLecturas || consultandoLecturas) && (
                <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  Medidor con historial o historial no verificable: la edición queda bloqueada para proteger las lecturas y facturas existentes.
                  Puede cancelar la edición y consultar el medidor.
                </p>
              )}
              <form
                onSubmit={guardarMedidor}
                className="grid grid-cols-1 gap-4 md:grid-cols-4"
              >
                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Apartamento *
                  </label>
                  <select
                    disabled={editandoId !== null && (tieneLecturas || consultandoLecturas)}
                    value={unidadId}
                    onChange={(e) => setUnidadId(e.target.value)}
                    className="w-full rounded-xl border bg-white px-4 py-3"
                  >
                    <option value="">Seleccione</option>
                    {unidades.map((unidad) => (
                      <option key={unidad.id} value={unidad.id}>
                        {unidad.codigo} ·{" "}
                        {unidad.propietario_nombre || "Sin propietario"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Tanque *
                  </label>
                  <select
                    disabled={editandoId !== null && (tieneLecturas || consultandoLecturas)}
                    value={tanqueId}
                    onChange={(e) => setTanqueId(e.target.value)}
                    className="w-full rounded-xl border bg-white px-4 py-3"
                  >
                    <option value="">Seleccione</option>
                    {tanques.map((tanque) => (
                      <option key={tanque.id} value={tanque.id}>
                        {tanque.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Unidad de lectura (m³) *
                  </label>
                  <select
                    disabled={editandoId !== null && (tieneLecturas || consultandoLecturas)}
                    value={unidadMedidaId}
                    onChange={(e) => setUnidadMedidaId(e.target.value)}
                    className="w-full rounded-xl border bg-white px-4 py-3"
                  >
                    <option value="">Seleccione</option>
                    {unidadesMedida.map((unidad) => (
                      <option key={unidad.id} value={unidad.id}>
                        {unidad.nombre}
                        {unidad.abreviatura
                          ? ` (${unidad.abreviatura})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Número de serie *
                  </label>
                  <input
                    type="text"
                    value={numeroSerie}
                    onChange={(e) => setNumeroSerie(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                    placeholder="Ej. DJ-A1-M-001"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Lectura inicial (m³) *
                  </label>
                  <input
                    disabled={editandoId !== null && (tieneLecturas || consultandoLecturas)}
                    type="number"
                    min="0"
                    step="0.001"
                    value={lecturaInicial}
                    onChange={(e) => setLecturaInicial(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                    placeholder="0.000"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Fecha lectura inicial *
                  </label>
                  <input
                    disabled={editandoId !== null && (tieneLecturas || consultandoLecturas)}
                    type="date"
                    value={fechaLecturaInicial}
                    onChange={(e) =>
                      setFechaLecturaInicial(e.target.value)
                    }
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Fecha instalación
                  </label>
                  <input
                    type="date"
                    value={fechaInstalacion}
                    onChange={(e) => setFechaInstalacion(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Estado
                  </label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full rounded-xl border bg-white px-4 py-3"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold">
                    Foto del medidor
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setFotoMedidor(e.target.files?.[0] || null)
                    }
                    className="w-full rounded-xl border bg-white px-4 py-3"
                  />
                  {fotoActualUrl && (
                    <a
                      href={fotoActualUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs font-bold text-blue-700 underline"
                    >
                      Ver foto actual
                    </a>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold">
                    Observación
                  </label>
                  <textarea
                    rows={3}
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                    placeholder="Ubicación, condición o nota del medidor."
                  />
                </div>

                <div className="flex flex-wrap gap-2 md:col-span-4">
                  <button
                    type="submit"
                    disabled={guardando || loading || (editandoId !== null && (tieneLecturas || consultandoLecturas))}
                    className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {guardando
                      ? "Guardando..."
                      : editandoId
                        ? "Actualizar medidor"
                        : "Guardar medidor"}
                  </button>

                  {editandoId && (
                    <button
                      type="button"
                      onClick={limpiarFormulario}
                      className="rounded-xl border bg-slate-100 px-5 py-3 font-bold text-slate-800 hover:bg-slate-200"
                    >
                      Cancelar edición
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Medidores registrados
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Cada apartamento debe mantener un solo medidor activo.
                  </p>
                </div>

                <input
                  type="text"
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 md:w-80"
                  placeholder="Buscar apartamento, serie..."
                />
              </div>

              <div className="overflow-auto rounded-2xl border">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border p-3 text-left">Apartamento</th>
                      <th className="border p-3 text-left">Propietario</th>
                      <th className="border p-3 text-left">Serie</th>
                      <th className="border p-3 text-left">Tanque</th>
                      <th className="border p-3 text-left">Unidad</th>
                      <th className="border p-3 text-right">Lectura inicial</th>
                      <th className="border p-3 text-left">Fecha inicial</th>
                      <th className="border p-3 text-center">Estado</th>
                      <th className="border p-3 text-center">Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {medidoresFiltrados.map((medidor) => (
                      <tr key={medidor.id} className="hover:bg-slate-50">
                        <td className="border p-3 font-black">
                          {medidor.unidades?.codigo || "-"}
                        </td>
                        <td className="border p-3">
                          {medidor.unidades?.propietario_nombre ||
                            "Sin propietario"}
                        </td>
                        <td className="border p-3 font-semibold">
                          {medidor.numero_serie}
                        </td>
                        <td className="border p-3">
                          {medidor.gas_tanques?.nombre || "-"}
                        </td>
                        <td className="border p-3">
                          {medidor.gas_unidades_medida?.nombre || "-"}{" "}
                          {medidor.gas_unidades_medida?.abreviatura
                            ? `(${medidor.gas_unidades_medida.abreviatura})`
                            : ""}
                        </td>
                        <td className="border p-3 text-right font-bold">
                          {numero(medidor.lectura_inicial)}
                        </td>
                        <td className="border p-3">
                          {medidor.fecha_lectura_inicial || "-"}
                        </td>
                        <td className="border p-3 text-center">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              medidor.estado === "Activo"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {medidor.estado}
                          </span>
                        </td>
                        <td className="border p-3">
                          <div className="flex flex-wrap justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => void editarMedidor(medidor)}
                              className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700"
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => void cambiarEstado(medidor)}
                              className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                            >
                              {medidor.estado === "Activo"
                                ? "Inactivar"
                                : "Activar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {medidoresFiltrados.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="border p-8 text-center text-slate-500"
                        >
                          No hay medidores registrados para este condominio.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
