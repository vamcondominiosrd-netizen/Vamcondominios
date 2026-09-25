"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

/** VAM Condominios — Catálogo de medidores v1.0.0.
 *  Etapa 1: consulta y preparación de formulario. NO realiza escrituras.
 *  Requiere gas_configuracion.modalidad = CON_MEDIDORES y RLS autorizado.
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
  estado: string;
  foto_medidor_url: string | null;
  observacion: string | null;
};
type Unidad = { id: number; codigo: string; activa: boolean };
type Tanque = { id: number; nombre: string; estado: string | null };
type Medida = { id: number; nombre: string; abreviatura: string | null; estado: string | null };

function fechaHoy() {
  const ahora = new Date();
  return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);
}

export default function GasMedidoresPage() {
  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [nombreCondominio, setNombreCondominio] = useState("");
  const [permitido, setPermitido] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [medidores, setMedidores] = useState<Medidor[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [tanques, setTanques] = useState<Tanque[]>([]);
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [unidadId, setUnidadId] = useState("");
  const [tanqueId, setTanqueId] = useState("");
  const [medidaId, setMedidaId] = useState("");
  const [serie, setSerie] = useState("");
  const [lecturaInicial, setLecturaInicial] = useState("");
  const [fechaInicial, setFechaInicial] = useState(fechaHoy);
  const [fechaInstalacion, setFechaInstalacion] = useState("");
  const [observacion, setObservacion] = useState("");

  async function cargarDatos(id: number) {
    const [m, u, t, d] = await Promise.all([
      supabase.from("gas_medidores")
        .select("id,condominio_id,unidad_id,tanque_id,unidad_medida_id,numero_serie,lectura_inicial,fecha_lectura_inicial,fecha_instalacion,fecha_retiro,estado,foto_medidor_url,observacion")
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
      setMensaje("");
      setPermitido(false);
      const texto = localStorage.getItem("condominio_id") || "";
      const id = Number(texto);
      setNombreCondominio(localStorage.getItem("condominio_nombre") || "");
      if (!texto || !Number.isSafeInteger(id) || id <= 0) {
        setMensaje("Seleccione un condominio válido antes de abrir Medidores.");
        setCargando(false);
        return;
      }
      try {
        const { data, error } = await supabase.from("gas_configuracion")
          .select("modalidad").eq("condominio_id", id).maybeSingle();
        if (error) throw new Error(error.message);
        if (data?.modalidad !== "CON_MEDIDORES") {
          if (vigente) setMensaje("Este condominio no tiene habilitada la modalidad con medidores. El módulo actual de Gas permanece disponible.");
          return;
        }
        if (!vigente) return;
        setCondominioId(id);
        await cargarDatos(id);
        if (vigente) setPermitido(true);
      } catch (e) {
        if (vigente) setMensaje("No se pudieron cargar los medidores. Verifique su acceso y la configuración: " + (e instanceof Error ? e.message : "error desconocido"));
      } finally {
        if (vigente) setCargando(false);
      }
    }
    void iniciar();
    return () => { vigente = false; };
  }, []);

  async function actualizar() {
    if (!permitido || !condominioId) return;
    setCargando(true);
    setMensaje("");
    try { await cargarDatos(condominioId); }
    catch (e) { setMensaje(e instanceof Error ? e.message : "Error al actualizar."); }
    finally { setCargando(false); }
  }

  const unidadNombre = (id: number) => unidades.find(u => u.id === id)?.codigo || `Unidad #${id}`;
  const tanqueNombre = (id: number) => tanques.find(t => t.id === id)?.nombre || `Tanque #${id}`;
  const medidaNombre = (id: number) => {
    const m = medidas.find(d => d.id === id);
    return m?.abreviatura || m?.nombre || "";
  };
  const filtrados = useMemo(() => medidores.filter(m => {
    if (filtroEstado !== "TODOS" && m.estado !== filtroEstado) return false;
    const cadena = `${m.numero_serie} ${unidades.find(u => u.id === m.unidad_id)?.codigo || ""} ${tanques.find(t => t.id === m.tanque_id)?.nombre || ""}`.toLowerCase();
    return cadena.includes(buscar.trim().toLowerCase());
  }), [medidores, filtroEstado, buscar, unidades, tanques]);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-blue-700">VAM · Gestión de gas</p>
              <h1 className="mt-1 text-3xl font-black text-slate-900">Configuración de Medidores</h1>
              <p className="mt-1 text-xs text-slate-500">Medidores · Versión 1.0.0 · Etapa de consulta</p>
              <p className="mt-3 text-sm text-slate-600">Condominio: <strong>{nombreCondominio || "No seleccionado"}</strong></p>
            </div>
            <Link href="/gas" className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-white">Volver a Gas</Link>
          </div>
        </header>

        {mensaje && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{mensaje}</div>}
        {cargando && <p role="status" className="rounded-xl bg-white p-4 text-sm text-slate-600">Consultando configuración y medidores…</p>}

        {!cargando && permitido && (
          <>
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ["Total medidores", medidores.length],
                ["Activos", medidores.filter(m => m.estado === "Activo").length],
                ["Inactivos / sustituidos", medidores.filter(m => m.estado !== "Activo").length],
              ].map(([titulo, valor]) => (
                <div key={String(titulo)} className="rounded-2xl border bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">{titulo}</p>
                  <p className="mt-1 text-3xl font-black text-slate-900">{valor}</p>
                </div>
              ))}
            </section>
            <section className="rounded-3xl border bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">Medidores del condominio</h2>
                  <p className="text-sm text-slate-500">Vista de consulta. Los permisos de registro y edición se habilitarán después de validar los roles administrativos.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void actualizar()} className="rounded-xl bg-blue-700 px-4 py-2 font-bold text-white">Actualizar</button>
                  <button type="button" onClick={() => setMostrarFormulario(v => !v)} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-white">{mostrarFormulario ? "Ocultar formulario" : "Preparar registro"}</button>
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
                    </dl>
                    {m.foto_medidor_url && <a href={m.foto_medidor_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-bold text-blue-700 underline">Ver fotografía registrada</a>}
                    {m.observacion && <p className="mt-2 text-xs text-slate-600">{m.observacion}</p>}
                  </article>
                ))}
              </div>
              {filtrados.length === 0 && <p className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">No hay medidores que coincidan con los filtros.</p>}
            </section>
            {mostrarFormulario && (
              <section className="rounded-3xl border bg-white p-5 shadow-sm md:p-6">
                <h2 className="text-xl font-black">Nuevo medidor · Formulario preparado</h2>
                <p className="mt-1 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">El registro está temporalmente deshabilitado. Esta pantalla no guarda datos hasta que configuremos permisos de escritura y auditoría.</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-semibold">Apartamento
                    <select value={unidadId} onChange={e => setUnidadId(e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-3"><option value="">Seleccione</option>{unidades.filter(u => u.activa).map(u => <option key={u.id} value={u.id}>{u.codigo}</option>)}</select>
                  </label>
                  <label className="text-sm font-semibold">Tanque
                    <select value={tanqueId} onChange={e => setTanqueId(e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-3"><option value="">Seleccione</option>{tanques.filter(t => t.estado === "Activo").map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select>
                  </label>
                  <label className="text-sm font-semibold">Unidad de medida
                    <select value={medidaId} onChange={e => setMedidaId(e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-3"><option value="">Seleccione</option>{medidas.filter(m => m.estado === "Activo").map(m => <option key={m.id} value={m.id}>{m.nombre} {m.abreviatura ? `(${m.abreviatura})` : ""}</option>)}</select>
                  </label>
                  <label className="text-sm font-semibold">Número de serie
                    <input value={serie} onChange={e => setSerie(e.target.value)} className="mt-1 w-full rounded-xl border p-3" placeholder="Serie física del medidor" />
                  </label>
                  <label className="text-sm font-semibold">Lectura inicial
                    <input type="number" min="0" step="0.0001" value={lecturaInicial} onChange={e => setLecturaInicial(e.target.value)} className="mt-1 w-full rounded-xl border p-3" />
                  </label>
                  <label className="text-sm font-semibold">Fecha de lectura inicial
                    <input type="date" value={fechaInicial} onChange={e => setFechaInicial(e.target.value)} className="mt-1 w-full rounded-xl border p-3" />
                  </label>
                  <label className="text-sm font-semibold">Fecha de instalación (opcional)
                    <input type="date" value={fechaInstalacion} onChange={e => setFechaInstalacion(e.target.value)} className="mt-1 w-full rounded-xl border p-3" />
                  </label>
                  <label className="text-sm font-semibold">Observación
                    <textarea value={observacion} onChange={e => setObservacion(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border p-3" />
                  </label>
                </div>
                <button type="button" disabled className="mt-4 cursor-not-allowed rounded-xl bg-slate-300 px-5 py-3 font-bold text-slate-600" title="Pendiente de permisos de escritura">Guardar medidor (pendiente de habilitar)</button>
              </section>
            )}
          </>
        )}
        <p className="text-right text-xs text-slate-400">VAM · Gas / Medidores · v1.0.0</p>
      </div>
    </main>
  );
}
