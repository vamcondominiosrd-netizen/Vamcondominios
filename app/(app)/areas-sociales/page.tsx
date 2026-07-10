"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle,
  CircleDollarSign,
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

type AreaSocial = {
  id: number;
  condominio: string;
  nombre_area: string;
  descripcion: string;
  costo_reserva: number;
  hora_inicio: string;
  hora_fin: string;
  reglas: string;
  estado: string;
  created_at: string;
};

export default function AreasSocialesPage() {
  const [areas, setAreas] = useState<AreaSocial[]>([]);
  const [loading, setLoading] = useState(false);

  const [condominio, setCondominio] = useState("");
  const [condominioId, setCondominioId] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [buscar, setBuscar] = useState("");

  const [nombreArea, setNombreArea] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [costoReserva, setCostoReserva] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [reglas, setReglas] = useState("");

  useEffect(() => {
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const id = localStorage.getItem("condominio_id") || "";

    setCondominio(nombre);
    setCondominioId(id);

    if (nombre) cargarAreas(nombre);
  }, []);

  async function cargarAreas(nombreCondominio: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("areas_sociales")
      .select("*")
      .eq("condominio", nombreCondominio)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando áreas sociales: " + error.message);
      return;
    }

    setAreas((data as AreaSocial[]) || []);
  }

  function limpiarFormulario() {
    setNombreArea("");
    setDescripcion("");
    setCostoReserva("");
    setHoraInicio("");
    setHoraFin("");
    setReglas("");
  }

  async function guardarArea(e: React.FormEvent) {
    e.preventDefault();

    if (!condominio || !nombreArea.trim()) {
      alert("Debe completar el nombre del área.");
      return;
    }

    const { error } = await supabase.from("areas_sociales").insert([
      {
        condominio,
        nombre_area: nombreArea.trim(),
        descripcion: descripcion.trim(),
        costo_reserva: Number(costoReserva || 0),
        hora_inicio: horaInicio || null,
        hora_fin: horaFin || null,
        reglas: reglas.trim(),
        estado: "activa",
      },
    ]);

    if (error) {
      alert("Error guardando área social: " + error.message);
      return;
    }

    alert("Área social registrada correctamente.");
    limpiarFormulario();
    setDrawerOpen(false);
    cargarAreas(condominio);
  }

  async function cambiarEstado(id: number, nuevoEstado: string) {
    const confirmar = confirm(`¿Desea cambiar el estado a ${nuevoEstado}?`);
    if (!confirmar) return;

    const { error } = await supabase
      .from("areas_sociales")
      .update({ estado: nuevoEstado })
      .eq("id", id)
      .eq("condominio", condominio);

    if (error) {
      alert("Error actualizando área: " + error.message);
      return;
    }

    cargarAreas(condominio);
  }

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const areasFiltradas = useMemo(() => {
    const texto = buscar.toLowerCase().trim();
    if (!texto) return areas;

    return areas.filter((a) => {
      const combinado = `
        ${a.nombre_area || ""}
        ${a.descripcion || ""}
        ${a.reglas || ""}
        ${a.estado || ""}
      `.toLowerCase();

      return combinado.includes(texto);
    });
  }, [areas, buscar]);

  const activas = areas.filter((a) => a.estado === "activa").length;
  const inactivas = areas.filter((a) => a.estado === "inactiva").length;

  const totalReservas = areas.reduce(
    (sum, a) => sum + Number(a.costo_reserva || 0),
    0
  );

  return (
    <PageContainer>
      <PageHeader
        title="Áreas Sociales"
        subtitle="Catálogo de áreas disponibles para reservas del condominio."
        badge="Centro Residencial"
        icon={Users}
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
              + Nueva Área
            </button>

            <button
              type="button"
              onClick={() => cargarAreas(condominio)}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Total áreas"
          value={areas.length}
          subtitle="Registradas"
          icon={Users}
          tone="blue"
        />

        <StatCard
          title="Activas"
          value={activas}
          subtitle="Disponibles"
          icon={CheckCircle}
          tone="green"
        />

        <StatCard
          title="Inactivas"
          value={inactivas}
          subtitle="Fuera de uso"
          icon={XCircle}
          tone="red"
        />

        <StatCard
          title="Costo total"
          value={`RD$ ${dinero(totalReservas)}`}
          subtitle="Suma tarifas"
          icon={CircleDollarSign}
          tone="amber"
        />
      </div>

      <SectionCard
        title="Áreas sociales registradas"
        subtitle={`Condominio activo: ${condominio || "No seleccionado"}`}
      >
        <ActionBar
          search={buscar}
          onSearch={setBuscar}
          placeholder="Buscar área, descripción, reglas o estado..."
        >
          <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
            <Search className="h-4 w-4" />
            {areasFiltradas.length} registros
          </div>
        </ActionBar>

        <div className="mt-4">
          {loading ? (
            <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500">
              Cargando áreas sociales...
            </div>
          ) : areasFiltradas.length === 0 ? (
            <EmptyState
              title="Sin áreas sociales"
              description="No hay áreas sociales registradas para este condominio."
            />
          ) : (
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Área</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-right">Costo</th>
                  <th className="px-4 py-3 text-center">Horario</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {areasFiltradas.map((a) => (
                  <tr key={a.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-black text-slate-900">
                        {a.nombre_area}
                      </p>
                      <p className="text-xs text-slate-500">ID {a.id}</p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="text-slate-700">
                        {a.descripcion || "-"}
                      </p>

                      {a.reglas && (
                        <p className="mt-1 text-xs text-slate-500">
                          Reglas: {a.reglas}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-green-700">
                      RD$ {dinero(a.costo_reserva)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        <Clock className="h-3.5 w-3.5" />
                        {a.hora_inicio || "--"} - {a.hora_fin || "--"}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={a.estado} />
                    </td>

                    <td className="px-4 py-3 text-center">
                      {a.estado === "activa" ? (
                        <button
                          type="button"
                          onClick={() => cambiarEstado(a.id, "inactiva")}
                          className="rounded-lg bg-red-700 px-3 py-1 text-xs font-bold text-white hover:bg-red-800"
                        >
                          Inactivar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => cambiarEstado(a.id, "activa")}
                          className="rounded-lg bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800"
                        >
                          Activar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </div>
      </SectionCard>

      <PageDrawer
        open={drawerOpen}
        title="Nueva Área Social"
        onClose={() => setDrawerOpen(false)}
      >
        <form onSubmit={guardarArea} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Nombre del área *
            </label>
            <input
              type="text"
              value={nombreArea}
              onChange={(e) => setNombreArea(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              placeholder="Ej. Gazebo, salón social"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Costo reserva RD$
            </label>
            <input
              type="number"
              step="0.01"
              value={costoReserva}
              onChange={(e) => setCostoReserva(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Hora inicio
              </label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Hora fin
              </label>
              <input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              rows={3}
              placeholder="Descripción del área"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Reglas
            </label>
            <textarea
              value={reglas}
              onChange={(e) => setReglas(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              rows={3}
              placeholder="Reglas de uso"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="submit"
              className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800"
            >
              Guardar área social
            </button>

            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-xl border px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </PageDrawer>
    </PageContainer>
  );
}