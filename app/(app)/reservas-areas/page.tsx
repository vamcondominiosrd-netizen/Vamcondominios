"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import PageHeader from "@/components/vam/enterprise/PageHeader";
import StatCard from "@/components/vam/enterprise/StatCard";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import ActionBar from "@/components/vam/enterprise/ActionBar";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";
import StatusBadge from "@/components/vam/enterprise/StatusBadge";
import PageDrawer from "@/components/vam/enterprise/PageDrawer";

type AreaSocial = { id: number; nombre_area: string; costo_reserva: number };
type Unidad = { id: number; codigo: string };

type Reserva = {
  id: number;
  condominio: string;
  no_apartamento: string;
  nombre_propietario: string;
  telefono: string;
  fecha_reserva: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string;
  cantidad_personas: number;
  monto_pagado: number;
  comprobante_url: string;
  estado: string;
  comentario_admin: string;
  created_at: string;
  areas_sociales?: { nombre_area: string };
};

export default function ReservasAreasAdminPage() {
  const [condominio, setCondominio] = useState("");
  const [condominioId, setCondominioId] = useState("");
  const [areas, setAreas] = useState<AreaSocial[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [comentarios, setComentarios] = useState<Record<number, string>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [buscar, setBuscar] = useState("");

  const [areaSocialId, setAreaSocialId] = useState("");
  const [unidadId, setUnidadId] = useState("");
  const [fechaReserva, setFechaReserva] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [motivo, setMotivo] = useState("");
  const [cantidadPersonas, setCantidadPersonas] = useState("");
  const [montoPagado, setMontoPagado] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const id = localStorage.getItem("condominio_id") || "";

    setCondominio(nombre);
    setCondominioId(id);

    if (nombre && id) cargarDatos(nombre, id);
  }, []);

  async function cargarDatos(nombre: string, id: string) {
    await Promise.all([
      cargarAreas(nombre),
      cargarUnidades(id),
      cargarReservas(nombre),
    ]);
  }

  async function cargarAreas(nombre: string) {
    const { data, error } = await supabase
      .from("areas_sociales")
      .select("id, nombre_area, costo_reserva")
      .eq("condominio", nombre)
      .eq("estado", "activa")
      .order("nombre_area");

    if (error) {
      alert("Error cargando áreas: " + error.message);
      return;
    }

    setAreas(data || []);
  }

  async function cargarUnidades(id: string) {
    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo");

    if (error) {
      alert("Error cargando unidades: " + error.message);
      return;
    }

    setUnidades(data || []);
  }

  async function cargarReservas(nombre: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("reservas_areas_sociales")
      .select(`*, areas_sociales(nombre_area)`)
      .eq("condominio", nombre)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando reservas: " + error.message);
      return;
    }

    setReservas((data as Reserva[]) || []);
  }

  function limpiarFormulario() {
    setAreaSocialId("");
    setUnidadId("");
    setFechaReserva("");
    setHoraInicio("");
    setHoraFin("");
    setMotivo("");
    setCantidadPersonas("");
    setMontoPagado("");
    setComprobante(null);
  }

  async function subirComprobante() {
    if (!comprobante) return "";

    const extension = comprobante.name.split(".").pop();
    const nombreArchivo = `${condominioId}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

    const { error } = await supabase.storage
      .from("comprobantes-reservas")
      .upload(nombreArchivo, comprobante);

    if (error) throw new Error(error.message);

    const { data } = supabase.storage
      .from("comprobantes-reservas")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  async function guardarReserva(e: React.FormEvent) {
    e.preventDefault();

    if (!areaSocialId || !unidadId || !fechaReserva || !horaInicio || !horaFin) {
      alert("Debe completar área, apartamento, fecha y horario.");
      return;
    }

    const unidad = unidades.find((u) => String(u.id) === unidadId);

    if (!unidad) {
      alert("Debe seleccionar una unidad válida.");
      return;
    }

    const { data: propietario, error: errorPropietario } = await supabase
      .from("propietarios_apartamentos")
      .select("id, nombre_propietario, cedula, telefono, no_apartamento")
      .eq("condominio_id", Number(condominioId))
      .eq("no_apartamento", unidad.codigo)
      .maybeSingle();

    if (errorPropietario || !propietario) {
      alert("No se encontró propietario para este apartamento.");
      return;
    }

    try {
      const comprobanteUrl = await subirComprobante();

      const { error } = await supabase.from("reservas_areas_sociales").insert([
        {
          area_social_id: Number(areaSocialId),
          propietario_id: propietario.id,
          condominio,
          no_apartamento: unidad.codigo,
          nombre_propietario: propietario.nombre_propietario,
          cedula: propietario.cedula,
          telefono: propietario.telefono,
          fecha_reserva: fechaReserva,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          motivo,
          cantidad_personas: Number(cantidadPersonas || 0),
          monto_pagado: Number(montoPagado || 0),
          comprobante_url: comprobanteUrl,
          estado: "Pendiente aprobación",
        },
      ]);

      if (error) {
        alert("Error guardando reserva: " + error.message);
        return;
      }

      alert("Reserva registrada correctamente.");
      limpiarFormulario();
      setDrawerOpen(false);

      const inputFile = document.getElementById(
        "comprobanteReserva"
      ) as HTMLInputElement | null;

      if (inputFile) inputFile.value = "";

      cargarReservas(condominio);
    } catch (err: any) {
      alert("Error subiendo comprobante: " + err.message);
    }
  }

  async function actualizarReserva(id: number, nuevoEstado: string) {
    const comentario = comentarios[id] || "";

    if ((nuevoEstado === "Rechazada" || nuevoEstado === "Cancelada") && !comentario) {
      alert("Debe escribir un comentario.");
      return;
    }

    const confirmar = confirm(`¿Desea cambiar la reserva a ${nuevoEstado}?`);
    if (!confirmar) return;

    const { error } = await supabase
      .from("reservas_areas_sociales")
      .update({
        estado: nuevoEstado,
        comentario_admin: comentario,
        fecha_aprobacion: nuevoEstado === "Aprobada" ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .eq("condominio", condominio);

    if (error) {
      alert("Error actualizando reserva: " + error.message);
      return;
    }

    alert("Reserva actualizada correctamente.");
    cargarReservas(condominio);
  }

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const reservasFiltradas = useMemo(() => {
    const texto = buscar.toLowerCase().trim();

    return reservas.filter((r) => {
      if (filtroEstado && r.estado !== filtroEstado) return false;

      if (!texto) return true;

      const combinado = `
        ${r.id}
        ${r.areas_sociales?.nombre_area || ""}
        ${r.no_apartamento || ""}
        ${r.nombre_propietario || ""}
        ${r.telefono || ""}
        ${r.fecha_reserva || ""}
        ${r.estado || ""}
        ${r.motivo || ""}
      `.toLowerCase();

      return combinado.includes(texto);
    });
  }, [reservas, buscar, filtroEstado]);

  const pendientes = reservas.filter((r) => r.estado === "Pendiente aprobación").length;
  const aprobadas = reservas.filter((r) => r.estado === "Aprobada").length;
  const rechazadas = reservas.filter((r) => r.estado === "Rechazada").length;

  return (
    <PageContainer>
      <PageHeader
        title="Reservas de Áreas Sociales"
        subtitle="Solicitud, aprobación y seguimiento de reservas."
        badge="Centro Residencial"
        icon={CalendarDays}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                limpiarFormulario();
                setDrawerOpen(true);
              }}
              className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
            >
              + Nueva Reserva
            </button>

            <button
              type="button"
              onClick={() => cargarDatos(condominio, condominioId)}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="Total reservas" value={reservas.length} subtitle="Registradas" icon={CalendarDays} tone="blue" />
        <StatCard title="Pendientes" value={pendientes} subtitle="Por aprobar" icon={Clock} tone="amber" />
        <StatCard title="Aprobadas" value={aprobadas} subtitle="Confirmadas" icon={CheckCircle} tone="green" />
        <StatCard title="Rechazadas" value={rechazadas} subtitle="No aprobadas" icon={XCircle} tone="red" />
      </div>

      <SectionCard
        title="Listado de reservas"
        subtitle={`Condominio activo: ${condominio || "No seleccionado"}`}
      >
        <ActionBar
          search={buscar}
          onSearch={setBuscar}
          placeholder="Buscar reserva, propietario, apartamento, área..."
        >
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700"
          >
            <option value="">Todos</option>
            <option value="Pendiente aprobación">Pendiente aprobación</option>
            <option value="Aprobada">Aprobada</option>
            <option value="Rechazada">Rechazada</option>
            <option value="Cancelada">Cancelada</option>
            <option value="Finalizada">Finalizada</option>
          </select>

          <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
            <Search className="h-4 w-4" />
            {reservasFiltradas.length} registros
          </div>
        </ActionBar>

        <div className="mt-4">
          {loading ? (
            <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500">
              Cargando reservas...
            </div>
          ) : reservasFiltradas.length === 0 ? (
            <EmptyState
              title="Sin reservas"
              description="No hay reservas registradas para esta consulta."
            />
          ) : (
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Reserva</th>
                  <th className="px-4 py-3 text-left">Propietario</th>
                  <th className="px-4 py-3 text-center">Fecha / Horario</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {reservasFiltradas.map((r) => (
                  <tr key={r.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-black text-slate-900">
                        #{r.id} · {r.areas_sociales?.nombre_area || "-"}
                      </p>
                      <p className="text-xs text-slate-500">{r.motivo || "Sin motivo"}</p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-bold">{r.nombre_propietario}</p>
                      <p className="text-xs text-slate-500">
                        Apto. {r.no_apartamento} · {r.telefono || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <p className="font-bold">{r.fecha_reserva}</p>
                      <p className="text-xs text-slate-500">
                        {r.hora_inicio} - {r.hora_fin}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-green-700">
                      RD$ {dinero(r.monto_pagado)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={r.estado} />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-center gap-2">
                        {r.comprobante_url && (
                          <a
                            href={r.comprobante_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                          >
                            Comprobante
                          </a>
                        )}

                        {r.estado === "Pendiente aprobación" && (
                          <>
                            <button
                              type="button"
                              onClick={() => actualizarReserva(r.id, "Aprobada")}
                              className="rounded-lg bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800"
                            >
                              Aprobar
                            </button>

                            <button
                              type="button"
                              onClick={() => actualizarReserva(r.id, "Rechazada")}
                              className="rounded-lg bg-red-700 px-3 py-1 text-xs font-bold text-white hover:bg-red-800"
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                      </div>

                      {r.estado === "Pendiente aprobación" && (
                        <textarea
                          value={comentarios[r.id] || ""}
                          onChange={(e) =>
                            setComentarios({
                              ...comentarios,
                              [r.id]: e.target.value,
                            })
                          }
                          placeholder="Comentario para rechazar/cancelar"
                          className="mt-2 w-full rounded-lg border px-3 py-2 text-xs"
                          rows={2}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </div>
      </SectionCard>

      <PageDrawer open={drawerOpen} title="Nueva Reserva" onClose={() => setDrawerOpen(false)}>
        <form onSubmit={guardarReserva} className="space-y-4">
          <select
            value={areaSocialId}
            onChange={(e) => setAreaSocialId(e.target.value)}
            className="w-full rounded-xl border px-4 py-3 text-sm"
          >
            <option value="">Seleccione área social</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre_area} - RD${dinero(a.costo_reserva)}
              </option>
            ))}
          </select>

          <select
            value={unidadId}
            onChange={(e) => setUnidadId(e.target.value)}
            className="w-full rounded-xl border px-4 py-3 text-sm"
          >
            <option value="">Seleccione apartamento</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.codigo}
              </option>
            ))}
          </select>

          <input type="date" value={fechaReserva} onChange={(e) => setFechaReserva(e.target.value)} className="w-full rounded-xl border px-4 py-3 text-sm" />

          <div className="grid grid-cols-2 gap-3">
            <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="w-full rounded-xl border px-4 py-3 text-sm" />
            <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className="w-full rounded-xl border px-4 py-3 text-sm" />
          </div>

          <input type="number" value={cantidadPersonas} onChange={(e) => setCantidadPersonas(e.target.value)} placeholder="Cantidad de personas" className="w-full rounded-xl border px-4 py-3 text-sm" />

          <input type="number" step="0.01" value={montoPagado} onChange={(e) => setMontoPagado(e.target.value)} placeholder="Monto pagado RD$" className="w-full rounded-xl border px-4 py-3 text-sm" />

          <input id="comprobanteReserva" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setComprobante(e.target.files?.[0] || null)} className="w-full rounded-xl border px-4 py-3 text-sm" />

          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo de la reserva" rows={3} className="w-full rounded-xl border px-4 py-3 text-sm" />

          <div className="flex gap-3 pt-3">
            <button type="submit" className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800">
              Guardar reserva
            </button>
            <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-xl border px-5 py-3 font-bold text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </form>
      </PageDrawer>
    </PageContainer>
  );
}