"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type SolicitudPago = {
  id: number;
  condominio_id: number | null;
  condominio: string | null;
  fecha_solicitud: string | null;
  concepto: string | null;
  detalle: string | null;
  monto: number | null;
  itbis: number | null;
  total: number | null;
  no_factura: string | null;
  ncf: string | null;
  metodo_pago: string | null;
  cuenta_banco: string | null;
  soporte_url: string | null;
  prioridad: string | null;
  estado: string | null;
  comentario_tesorero: string | null;
  catalogo_proveedores?: {
    nombre_proveedor: string | null;
  } | null;
  catalogo_categoria_gastos?: {
    nombre_categoria: string | null;
  } | null;
};

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fechaCorta(valor?: string | null) {
  if (!valor) return "-";
  return String(valor).split("T")[0];
}

function prioridadColor(prioridad?: string | null) {
  const p = String(prioridad || "").toLowerCase();

  if (p === "urgente") return "bg-red-50 text-red-700 border-red-100";
  if (p === "alta") return "bg-orange-50 text-orange-700 border-orange-100";
  if (p === "media") return "bg-yellow-50 text-yellow-700 border-yellow-100";

  return "bg-slate-50 text-slate-700 border-slate-100";
}

export default function AprobacionTesoreroPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [loading, setLoading] = useState(false);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [comentarios, setComentarios] = useState<Record<number, string>>({});

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    if (!id) {
      alert("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    const nombreFinal = nombre || `Condominio ID ${id}`;

    setCondominioId(id);
    setCondominioNombre(nombreFinal);

    cargarSolicitudes(id);
  }, []);

  async function cargarSolicitudes(id?: string) {
    const idActivo = id || condominioId;

    if (!idActivo) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("solicitudes_pago")
      .select(
        `
        id,
        condominio_id,
        condominio,
        fecha_solicitud,
        concepto,
        detalle,
        monto,
        itbis,
        total,
        no_factura,
        ncf,
        metodo_pago,
        cuenta_banco,
        soporte_url,
        prioridad,
        estado,
        comentario_tesorero,
        catalogo_proveedores(nombre_proveedor),
        catalogo_categoria_gastos(nombre_categoria)
      `,
      )
      .eq("condominio_id", Number(idActivo))
      .eq("estado", "Pendiente aprobación tesorero")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando solicitudes: " + error.message);
      setSolicitudes([]);
      return;
    }

    setSolicitudes((data as SolicitudPago[]) || []);
  }

  async function refrescar() {
    await cargarSolicitudes(condominioId);
  }

  async function actualizarEstado(id: number, nuevoEstado: string) {
    if (!condominioId) {
      alert("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    const comentario = String(comentarios[id] || "").trim();

    if (
      (nuevoEstado === "Rechazado por tesorero" ||
        nuevoEstado === "Devuelto para corrección") &&
      !comentario
    ) {
      alert("Debe escribir un comentario para rechazar o devolver.");
      return;
    }

    const confirmar = confirm(
      `¿Está seguro de cambiar esta solicitud a: ${nuevoEstado}?`,
    );

    if (!confirmar) return;

    setProcesandoId(id);

    const { error } = await supabase
      .from("solicitudes_pago")
      .update({
        estado: nuevoEstado,
        comentario_tesorero: comentario || null,
        fecha_revision_tesorero: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("condominio_id", Number(condominioId));

    setProcesandoId(null);

    if (error) {
      alert("Error actualizando solicitud: " + error.message);
      return;
    }

    alert("Solicitud actualizada correctamente.");
    cargarSolicitudes(condominioId);
  }

  const totalPendiente = useMemo(
    () => solicitudes.reduce((sum, s) => sum + Number(s.total || 0), 0),
    [solicitudes],
  );

  const urgentes = useMemo(
    () =>
      solicitudes.filter(
        (s) => String(s.prioridad || "").toLowerCase() === "urgente",
      ).length,
    [solicitudes],
  );

  const altas = useMemo(
    () =>
      solicitudes.filter(
        (s) => String(s.prioridad || "").toLowerCase() === "alta",
      ).length,
    [solicitudes],
  );

  return (
    <PageContainer>
      <ModuleMenu
        title="Solicitudes de Pago"
        subtitle="Registro, revisión, aprobación y seguimiento de pagos."
        tone="blue"
        items={[
          {
            href: "/solicitudes-pago",
            label: "Solicitudes",
            icon: ClipboardList,
          },
          {
            href: "/solicitudes-pago/tesorero",
            label: "Tesorero",
            icon: ShieldCheck,
          },
          {
            href: "/solicitudes-pago/presidente",
            label: "Presidente",
            icon: CheckCircle2,
          },
          {
            href: "/solicitudes-pago/historial",
            label: "Historial",
            icon: FileText,
          },
        ]}
      />

      <ModuleToolbar
        title="Aprobación del Tesorero"
        subtitle={`Solicitudes pendientes de revisión y aprobación por tesorería. Condominio: ${
          condominioNombre || "No seleccionado"
        }.`}
        icon={ShieldCheck}
        actions={<ModuleActions onRefresh={refrescar} />}
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <InfoBox
          label="Solicitudes pendientes"
          value={`${solicitudes.length}`}
          tone="blue"
        />

        <InfoBox
          label="Monto pendiente"
          value={`RD$ ${dinero(totalPendiente)}`}
          tone="yellow"
        />

        <InfoBox label="Urgentes" value={`${urgentes}`} tone="red" />

        <InfoBox label="Alta prioridad" value={`${altas}`} tone="orange" />
      </div>

      <SectionCard
        title="Solicitudes pendientes del tesorero"
        subtitle="Revise cada solicitud, valide el soporte y apruebe, devuelva o rechace según corresponda."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : (
            <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
              Registros: {solicitudes.length}
            </div>
          )
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500">Cargando solicitudes...</p>
        ) : !condominioId ? (
          <EmptyState
            title="Condominio no identificado"
            description="No se encontró el condominio activo. Debe iniciar sesión nuevamente."
          />
        ) : solicitudes.length === 0 ? (
          <EmptyState
            title="Sin solicitudes pendientes"
            description="No hay solicitudes pendientes de aprobación por tesorería para este condominio."
          />
        ) : (
          <div className="space-y-5">
            {solicitudes.map((s) => (
              <div
                key={s.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b bg-slate-50 px-5 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-slate-900">
                          Solicitud #{s.id} - {s.concepto || "Sin concepto"}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${prioridadColor(
                            s.prioridad,
                          )}`}
                        >
                          {s.prioridad || "Normal"}
                        </span>
                      </div>

                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {s.condominio || condominioNombre} | Fecha:{" "}
                        {fechaCorta(s.fecha_solicitud)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-emerald-50 px-5 py-3 text-right">
                      <p className="text-xs font-black uppercase text-emerald-600">
                        Total solicitado
                      </p>
                      <p className="text-2xl font-black text-emerald-700">
                        RD$ {dinero(s.total)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <InfoLine
                      label="Proveedor"
                      value={s.catalogo_proveedores?.nombre_proveedor || "-"}
                    />

                    <InfoLine
                      label="Categoría"
                      value={
                        s.catalogo_categoria_gastos?.nombre_categoria || "-"
                      }
                    />

                    <InfoLine
                      label="Método de pago"
                      value={s.metodo_pago || "-"}
                    />

                    <InfoLine label="Monto" value={`RD$ ${dinero(s.monto)}`} />

                    <InfoLine label="ITBIS" value={`RD$ ${dinero(s.itbis)}`} />

                    <InfoLine
                      label="Cuenta banco"
                      value={s.cuenta_banco || "-"}
                    />

                    <InfoLine
                      label="No. Factura"
                      value={s.no_factura || "-"}
                    />

                    <InfoLine label="NCF" value={s.ncf || "-"} />

                    <InfoLine label="Estado" value={s.estado || "-"} />
                  </div>

                  {s.detalle && (
                    <div className="mt-5 rounded-2xl border bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase text-slate-500">
                        Detalle
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {s.detalle}
                      </p>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {s.soporte_url ? (
                      <a
                        href={s.soporte_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                      >
                        <FileText className="h-4 w-4" />
                        Ver soporte
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-xl bg-yellow-50 px-4 py-2 text-sm font-bold text-yellow-700">
                        <AlertTriangle className="h-4 w-4" />
                        Sin soporte adjunto
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    <label className="mb-1 block text-sm font-semibold">
                      Comentario del tesorero
                    </label>

                    <textarea
                      value={comentarios[s.id] || ""}
                      onChange={(e) =>
                        setComentarios({
                          ...comentarios,
                          [s.id]: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border px-4 py-3 text-sm"
                      rows={3}
                      placeholder="Comentario de revisión. Obligatorio si devuelve o rechaza."
                    />
                  </div>

                  <div className="mt-5 flex flex-col gap-3 md:flex-row">
                    <button
                      type="button"
                      onClick={() =>
                        actualizarEstado(s.id, "Aprobado por tesorero")
                      }
                      disabled={procesandoId === s.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Aprobar
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        actualizarEstado(s.id, "Devuelto para corrección")
                      }
                      disabled={procesandoId === s.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Devolver
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        actualizarEstado(s.id, "Rechazado por tesorero")
                      }
                      disabled={procesandoId === s.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function InfoBox({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "blue" | "yellow" | "red" | "orange" | "emerald";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : tone === "yellow"
        ? "bg-yellow-50 text-yellow-700 border-yellow-100"
        : tone === "red"
          ? "bg-red-50 text-red-700 border-red-100"
          : tone === "orange"
            ? "bg-orange-50 text-orange-700 border-orange-100"
            : tone === "emerald"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-white text-slate-800 border-slate-200";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2 className="mt-2 text-2xl font-black">{value}</h2>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}