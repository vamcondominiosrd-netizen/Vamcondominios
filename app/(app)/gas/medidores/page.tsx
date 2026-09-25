"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/app/lib/supabaseClient";

/**
 * VAM · Gas / Medidores · v1.0.1
 * Administración: alta y edición controlada, SIN eliminación.
 * Requiere gas_configuracion = CON_MEDIDORES y políticas RLS de gas_medidores.
 * No implementa todavía carga de fotografías ni sustitución auditada de equipos.
 */
type Medidor = {
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
  estado: "Activo" | "Inactivo" | "Sustituido";
  foto_medidor_url: string | null;
  observacion: string | null;
};
type Unidad = { id: number; codigo: string; activa: boolean };
type Tanque = { id: number; nombre: string; estado: string | null };
type Medida = {
  id: number;
  nombre: string;
  abreviatura: string | null;
  estado: string | null;
};

const COLUMNAS_MEDIDORES =
  "id,condominio_id,unidad_id,tanque_id,unidad_medida_id,numero_serie,lectura_inicial,fecha_lectura_inicial,fecha_instalacion,fecha_retiro,estado,foto_medidor_url,observacion";

function hoyLocal(): string {
  const fecha = new Date();
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido.";
}

export default function GasMedidoresPage() {
  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [condominioNombre, setCondominioNombre] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState("");
  const [medidores, setMedidores] = useState<Medidor[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [tanques, setTanques] = useState<Tanque[]>([]);
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState<Medidor | null>(null);

  const [unidadId, setUnidadId] = useState("");
  const [tanqueId, setTanqueId] = useState("");
  const [medidaId, setMedidaId] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [lecturaInicial, setLecturaInicial] = useState("");
  const [fechaInicial, setFechaInicial] = useState(hoyLocal);
  const [fechaInstalacion, setFechaInstalacion] = useState("");
  const [fechaRetiro, setFechaRetiro] = useState("");
  const [estado, setEstado] = useState<"Activo" | "Inactivo">("Activo");
  const [observacion, setObservacion] = useState("");

  async function cargarDatos(id: number) {
    const [m, u, t, d] = await Promise.all([
      supabase.from("gas_medidores").select(COLUMNAS_MEDIDORES)
        .eq("condominio_id", id).order("id", { ascending: false }),
      supabase.from("unidades").select("id,codigo,activa")
        .eq("condominio_id", id).order("codigo"),
      supabase.from("gas_tanques").select("id,nombre,estado")
        .eq("condominio_id", id).order("nombre"),
      supabase.from("gas_unidades_medida").select("id,nombre,abreviatura,estado")
        .eq("condominio_id", id).order("nombre"),
    ]);
    const error = m.error || u.error || t.error || d.error;
    if (error) throw new Error(error.message);
    setMedidores((m.data || []) as Medidor[]);
    setUnidades((u.data || []) as Unidad[]);
    setTanques((t.data || []) as Tanque[]);
    setMedidas((d.data || []) as Medida[]);
  }

  useEffect(() => {
    let vigente = true;
    async function iniciar() {
      setCargando(true);
      setAutorizado(false);
      setMensaje("");
      const texto = localStorage.getItem("condominio_id") || "";
      const id = Number(texto);
      setCondominioNombre(localStorage.getItem("condominio_nombre") || "");
      if (!texto || !Number.isSafeInteger(id) || id <= 0) {
        setMensaje("Seleccione un condominio válido para abrir Medidores.");
        setCargando(false);
        return;
      }
      try {
        const config = await supabase.from("gas_configuracion")
          .select("modalidad").eq("condominio_id", id).maybeSingle();
        if (config.error) throw new Error(config.error.message);
        if (config.data?.modalidad !== "CON_MEDIDORES") {
          if (vigente) setMensaje(
            "Este condominio opera sin medidores o no tiene modalidad configurada. El módulo actual de Gas permanece disponible."
          );
          return;
        }
        const permiso = await supabase.rpc("vam_puede_administrar_medidores", {
          p_condominio_id: id,
        });
        if (permiso.error) throw new Error(permiso.error.message);
        if (permiso.data !== true) {
          if (vigente) setMensaje("Su cuenta no tiene permiso administrativo para gestionar los medidores de este condominio.");
          return;
        }
        if (!vigente) return;
        await cargarDatos(id);
        if (vigente) {
          setCondominioId(id);
          setAutorizado(true);
        }
      } catch (error) {
        if (vigente) setMensaje("No fue posible acceder a Medidores: " + mensajeError(error));
      } finally {
        if (vigente) setCargando(false);
      }
    }
    void iniciar();
    return () => { vigente = false; };
  }, []);

  function limpiarFormulario() {
    setEditando(null);
    setUnidadId("");
    setTanqueId("");
    setMedidaId("");
    setNumeroSerie("");
    setLecturaInicial("");
    setFechaInicial(hoyLocal());
    setFechaInstalacion("");
    setFechaRetiro("");
    setEstado("Activo");
    setObservacion("");
  }

  function nuevoMedidor() {
    limpiarFormulario();
    setMensaje("");
    setExito("");
    setMostrarFormulario(true);
  }

  function editarMedidor(m: Medidor) {
    setEditando(m);
    setUnidadId(String(m.unidad_id));
    setTanqueId(String(m.tanque_id));
    setMedidaId(String(m.unidad_medida_id));
    setNumeroSerie(m.numero_serie);
    setLecturaInicial(String(m.lectura_inicial));
    setFechaInicial(m.fecha_lectura_inicial);
    setFechaInstalacion(m.fecha_instalacion || "");
    setFechaRetiro(m.fecha_retiro || "");
    setEstado(m.estado === "Activo" ? "Activo" : "Inactivo");
    setObservacion(m.observacion || "");
    setMensaje("");
    setExito("");
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function actualizar() {
    if (!autorizado || !condominioId || guardando) return;
    setCargando(true);
    setMensaje("");
    try {
      await cargarDatos(condominioId);
    } catch (error) {
      setMensaje("Error al actualizar: " + mensajeError(error));
    } finally {
      setCargando(false);
    }
  }

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!autorizado || !condominioId || guardando) return;
    setMensaje("");
    setExito("");

    // La edición ordinaria NO altera identidad, asignación ni lectura inicial.
    if (editando) {
      if (estado === "Activo" && fechaRetiro) {
        setMensaje("Un medidor activo no puede tener fecha de retiro.");
        return;
      }
      if (fechaRetiro && fechaInstalacion && fechaRetiro < fechaInstalacion) {
        setMensaje("La fecha de retiro no puede ser anterior a la instalación.");
        return;
      }
      if (!confirm(`¿Actualizar el estado y observación del medidor ${editando.numero_serie}?`)) return;
      setGuardando(true);
      try {
        const { data, error } = await supabase.from("gas_medidores")
          .update({
            estado,
            fecha_retiro: estado === "Activo" ? null : fechaRetiro || null,
            observacion: observacion.trim() || null,
          })
          .eq("id", editando.id)
          .eq("condominio_id", condominioId)
          .eq("estado", editando.estado)
          .select("id");
        if (error) throw new Error(error.message);
        if (!data?.length) throw new Error("El registro cambió o dejó de estar disponible. Actualice el listado.");
        await cargarDatos(condominioId);
        limpiarFormulario();
        setMostrarFormulario(false);
        setExito("Medidor actualizado. Las lecturas y datos de origen no se modificaron.");
      } catch (error) {
        setMensaje("No se pudo actualizar: " + mensajeError(error));
      } finally {
        setGuardando(false);
      }
      return;
    }

    const serie = numeroSerie.trim().toUpperCase();
    const lecturaTexto = lecturaInicial.trim();
    const lectura = Number(lecturaTexto);
    const unidad = unidades.find(u => u.id === Number(unidadId) && u.activa);
    const tanque = tanques.find(t => t.id === Number(tanqueId) && t.estado === "Activo");
    const medida = medidas.find(m => m.id === Number(medidaId) && m.estado === "Activo");
    if (!unidad || !tanque || !medida || !serie || !fechaInicial || !lecturaTexto ||
        !Number.isFinite(lectura) || lectura < 0 || !/^\d+(\.\d{1,4})?$/.test(lecturaTexto)) {
      setMensaje("Complete apartamento, tanque, unidad, serie, fecha y lectura inicial válida (hasta cuatro decimales).");
      return;
    }
    if (fechaInstalacion && fechaInstalacion > fechaInicial) {
      setMensaje("La instalación no puede ser posterior a la lectura inicial.");
      return;
    }
    if (!confirm(`¿Registrar el medidor ${serie} para el apartamento ${unidad.codigo}?`)) return;
    setGuardando(true);
    try {
      const { data, error } = await supabase.from("gas_medidores")
        .insert({
          condominio_id: condominioId,
          unidad_id: unidad.id,
          tanque_id: tanque.id,
          unidad_medida_id: medida.id,
          numero_serie: serie,
          lectura_inicial: lectura,
          fecha_lectura_inicial: fechaInicial,
          fecha_instalacion: fechaInstalacion || null,
          estado: "Activo",
          observacion: observacion.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await cargarDatos(condominioId);
      limpiarFormulario();
      setMostrarFormulario(false);
      setExito(`Medidor registrado correctamente (ID ${data.id}).`);
    } catch (error) {
      setMensaje("No se pudo registrar: " + mensajeError(error));
    } finally {
      setGuardando(false);
    }
  }

  const unidadNombre = (id: number) => unidades.find(u => u.id === id)?.codigo || `Unidad #${id}`;
  const tanqueNombre = (id: number) => tanques.find(t => t.id === id)?.nombre || `Tanque #${id}`;
  const medidaNombre = (id: number) => {
    const medida = medidas.find(m => m.id === id);
    return medida?.abreviatura || medida?.nombre || "";
  };
  const filtrados = useMemo(() => medidores.filter(m => {
    if (filtroEstado !== "TODOS" && m.estado !== filtroEstado) return false;
    const texto = `${m.numero_serie} ${unidades.find(u => u.id === m.unidad_id)?.codigo || ""} ${tanques.find(t => t.id === m.tanque_id)?.nombre || ""}`.toLowerCase();
    return texto.includes(buscar.trim().toLowerCase());
  }), [medidores, filtroEstado, buscar, unidades, tanques]);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-blue-700">VAM · Gestión de gas</p>
              <h1 className="mt-1 text-3xl font-black text-slate-900">Configuración de Medidores</h1>
              <p className="mt-1 text-xs text-slate-500">Medidores · Versión 1.0.1 · Registro y edición controlada</p>
              <p className="mt-3 text-sm text-slate-600">Condominio: <strong>{condominioNombre || "No seleccionado"}</strong></p>
            </div>
            <Link href="/gas" className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-white">Volver a Gas</Link>
          </div>
        </header>

        {mensaje && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{mensaje}</div>}
        {exito && <div role="status" className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900">{exito}</div>}
        {cargando && <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">Consultando configuración y medidores…</p>}

        {!cargando && autorizado && (
          <>
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {([
                ["Total medidores", medidores.length],
                ["Activos", medidores.filter(m => m.estado === "Activo").length],
                ["Inactivos / sustituidos", medidores.filter(m => m.estado !== "Activo").length],
              ] as const).map(([titulo, valor]) => (
                <div key={titulo} className="rounded-2xl border bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">{titulo}</p>
                  <p className="mt-1 text-3xl font-black text-slate-900">{valor}</p>
                </div>
              ))}
            </section>

            <section className="rounded-3xl border bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">Medidores del condominio</h2>
                  <p className="text-sm text-slate-500">Registro, consulta y edición de estado/observaciones. Sin eliminación de medidores.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void actualizar()} disabled={guardando} className="rounded-xl bg-blue-700 px-4 py-2 font-bold text-white disabled:opacity-50">Actualizar</button>
                  <button type="button" onClick={nuevoMedidor} disabled={guardando} className="rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white disabled:opacity-50">Nuevo medidor</button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input aria-label="Buscar medidor" value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar serie, apartamento o tanque…" className="w-full rounded-xl border px-4 py-3" />
                <select aria-label="Filtrar por estado" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="w-full rounded-xl border bg-white px-4 py-3">
                  <option value="TODOS">Todos los estados</option><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option><option value="Sustituido">Sustituido</option>
                </select>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filtrados.map(m => (
                  <article key={m.id} className="min-w-0 rounded-2xl border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="break-all font-black text-slate-900">{m.numero_serie}</h3>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{m.estado}</span>
                    </div>
                    <dl className="mt-3 space-y-1 text-sm">
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">Apartamento</dt><dd className="font-semibold">{unidadNombre(m.unidad_id)}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">Tanque</dt><dd className="text-right">{tanqueNombre(m.tanque_id)}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">Lectura inicial</dt><dd>{Number(m.lectura_inicial).toLocaleString("es-DO", { maximumFractionDigits: 4 })} {medidaNombre(m.unidad_medida_id)}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">Fecha inicial</dt><dd>{m.fecha_lectura_inicial}</dd></div>
                      {m.fecha_retiro && <div className="flex justify-between gap-2"><dt className="text-slate-500">Retiro</dt><dd>{m.fecha_retiro}</dd></div>}
                    </dl>
                    {m.foto_medidor_url && <a href={m.foto_medidor_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-bold text-blue-700 underline">Ver fotografía registrada</a>}
                    {m.observacion && <p className="mt-2 text-xs text-slate-600">{m.observacion}</p>}
                    {m.estado !== "Sustituido" && <button type="button" disabled={guardando} onClick={() => editarMedidor(m)} className="mt-4 rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Editar estado / observación</button>}
                  </article>
                ))}
              </div>
              {filtrados.length === 0 && <p className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">No hay medidores que coincidan con los filtros.</p>}
            </section>

            {mostrarFormulario && (
              <section className="rounded-3xl border bg-white p-5 shadow-sm md:p-6">
                <h2 className="text-xl font-black">{editando ? `Editar ${editando.numero_serie}` : "Registrar nuevo medidor"}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {editando
                    ? "Para preservar el historial, solo se pueden modificar estado, fecha de retiro y observaciones. La sustitución formal se incorporará en otra versión."
                    : "Registre los datos físicos y la lectura inicial. No se podrán cambiar desde la edición ordinaria."}
                </p>
                <form onSubmit={guardar} className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-semibold">Apartamento
                    <select required disabled={Boolean(editando) || guardando} value={unidadId} onChange={e => setUnidadId(e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-3"><option value="">Seleccione</option>{unidades.filter(u => u.activa || u.id === editando?.unidad_id).map(u => <option key={u.id} value={u.id}>{u.codigo}</option>)}</select>
                  </label>
                  <label className="text-sm font-semibold">Tanque
                    <select required disabled={Boolean(editando) || guardando} value={tanqueId} onChange={e => setTanqueId(e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-3"><option value="">Seleccione</option>{tanques.filter(t => t.estado === "Activo" || t.id === editando?.tanque_id).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select>
                  </label>
                  <label className="text-sm font-semibold">Unidad de medida
                    <select required disabled={Boolean(editando) || guardando} value={medidaId} onChange={e => setMedidaId(e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-3"><option value="">Seleccione</option>{medidas.filter(m => m.estado === "Activo" || m.id === editando?.unidad_medida_id).map(m => <option key={m.id} value={m.id}>{m.nombre} {m.abreviatura ? `(${m.abreviatura})` : ""}</option>)}</select>
                  </label>
                  <label className="text-sm font-semibold">Número de serie
                    <input required disabled={Boolean(editando) || guardando} value={numeroSerie} onChange={e => setNumeroSerie(e.target.value)} className="mt-1 w-full rounded-xl border p-3" placeholder="Serie física del medidor" />
                  </label>
                  <label className="text-sm font-semibold">Lectura inicial
                    <input required type="number" min="0" step="0.0001" disabled={Boolean(editando) || guardando} value={lecturaInicial} onChange={e => setLecturaInicial(e.target.value)} className="mt-1 w-full rounded-xl border p-3" />
                  </label>
                  <label className="text-sm font-semibold">Fecha de lectura inicial
                    <input required type="date" disabled={Boolean(editando) || guardando} value={fechaInicial} onChange={e => setFechaInicial(e.target.value)} className="mt-1 w-full rounded-xl border p-3" />
                  </label>
                  <label className="text-sm font-semibold">Fecha de instalación (opcional)
                    <input type="date" disabled={Boolean(editando) || guardando} value={fechaInstalacion} onChange={e => setFechaInstalacion(e.target.value)} className="mt-1 w-full rounded-xl border p-3" />
                  </label>
                  {editando && <label className="text-sm font-semibold">Estado
                    <select value={estado} disabled={guardando} onChange={e => {
                      const nuevo = e.target.value === "Inactivo" ? "Inactivo" : "Activo";
                      setEstado(nuevo);
                      if (nuevo === "Activo") setFechaRetiro("");
                    }} className="mt-1 w-full rounded-xl border bg-white p-3"><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select>
                  </label>}
                  {editando && estado === "Inactivo" && <label className="text-sm font-semibold">Fecha de retiro (si corresponde)
                    <input type="date" disabled={guardando} value={fechaRetiro} onChange={e => setFechaRetiro(e.target.value)} className="mt-1 w-full rounded-xl border p-3" />
                  </label>}
                  <label className="text-sm font-semibold md:col-span-2">Observación
                    <textarea value={observacion} disabled={guardando} onChange={e => setObservacion(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border p-3" />
                  </label>
                  <div className="flex flex-wrap gap-2 md:col-span-2">
                    <button type="submit" disabled={guardando} className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white disabled:opacity-50">{guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar medidor"}</button>
                    <button type="button" disabled={guardando} onClick={() => { limpiarFormulario(); setMostrarFormulario(false); }} className="rounded-xl border bg-slate-100 px-5 py-3 font-bold text-slate-700 disabled:opacity-50">Cancelar</button>
                  </div>
                </form>
                <p className="mt-3 text-xs text-amber-800">Pendiente para una versión posterior: carga de fotografía, auditoría de cambios y sustitución completa con historial de lecturas.</p>
              </section>
            )}
          </>
        )}
        <p className="text-right text-xs text-slate-400">VAM · Gas / Medidores · v1.0.1</p>
      </div>
    </main>
  );
}
