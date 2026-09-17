"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type Edificio = {
  id: number;
  codigo: string;
  nombre: string;
  estado: string;
};

type Distribucion = {
  id?: number;
  edificio_id: number;
  monto_asignado: number;
  porcentaje_asignado?: number | null;
  edificios?: {
    codigo: string | null;
    nombre: string | null;
  } | null;
};

type Solicitud = {
  id: number;
  numero_solicitud: number | null;
  gasto_generado_id: number | null;
  condominio_id: number | null;
  fecha_solicitud: string | null;
  concepto: string | null;
  detalle: string | null;
  total: number | string | null;
  estado: string | null;
  no_factura: string | null;
  ncf: string | null;
  alcance_gasto: string | null;
  catalogo_proveedores?: {
    nombre_proveedor: string | null;
  } | null;
  catalogo_categoria_gastos?: {
    nombre_categoria: string | null;
  } | null;
  solicitudes_pago_edificios?: Distribucion[] | null;
};

type FormDistribucion = {
  edificio_id: number;
  monto_asignado: number;
};

function toNumber(value: unknown): number {
  const numero = Number(value || 0);
  return Number.isFinite(numero) ? numero : 0;
}

function dinero(value: unknown): string {
  return toNumber(value).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fechaCorta(value?: string | null) {
  if (!value) return "-";
  const texto = String(value).slice(0, 10);
  const [anio, mes, dia] = texto.split("-");
  if (!anio || !mes || !dia) return texto;
  return `${dia}/${mes}/${anio}`;
}

function normalizar(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function redondear2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export default function CorreccionDistribucionEdificiosPage() {
  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [condominioNombre, setCondominioNombre] = useState("");

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [edificios, setEdificios] = useState<Edificio[]>([]);

  const [busqueda, setBusqueda] = useState("");
  const [busquedaEdificio, setBusquedaEdificio] = useState("");

  const [seleccionada, setSeleccionada] = useState<Solicitud | null>(null);
  const [alcance, setAlcance] = useState<"" | "COMUN" | "EDIFICIOS">("");
  const [distribucion, setDistribucion] = useState<FormDistribucion[]>([]);

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const id = Number(localStorage.getItem("condominio_id") || 0);
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    if (!id) {
      setError("No hay condominio activo. Debe iniciar sesión nuevamente.");
      setLoading(false);
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre || `Condominio ID ${id}`);

    void cargarDatos(id);
  }, []);

  async function cargarDatos(id?: number) {
    const idActivo = id || condominioId;
    if (!idActivo) return;

    setLoading(true);
    setError("");

    try {
      const [solicitudesResp, edificiosResp] = await Promise.all([
        supabase
          .from("solicitudes_pago")
          .select(
            `
            id,
            numero_solicitud,
            gasto_generado_id,
            condominio_id,
            fecha_solicitud,
            concepto,
            detalle,
            total,
            estado,
            no_factura,
            ncf,
            alcance_gasto,
            catalogo_proveedores(nombre_proveedor),
            catalogo_categoria_gastos(nombre_categoria),
            solicitudes_pago_edificios(
              id,
              edificio_id,
              monto_asignado,
              porcentaje_asignado,
              edificios(codigo,nombre)
            )
          `,
          )
          .eq("condominio_id", Number(idActivo))
          .not("gasto_generado_id", "is", null)
          .order("fecha_solicitud", { ascending: false })
          .order("id", { ascending: false }),

        supabase
          .from("edificios")
          .select("id,codigo,nombre,estado")
          .eq("condominio_id", Number(idActivo))
          .order("codigo", { ascending: true }),
      ]);

      if (solicitudesResp.error) throw solicitudesResp.error;
      if (edificiosResp.error) throw edificiosResp.error;

      setSolicitudes((solicitudesResp.data || []) as Solicitud[]);
      setEdificios((edificiosResp.data || []) as Edificio[]);

      if (seleccionada) {
        const actualizada = (solicitudesResp.data || []).find(
          (item: any) => Number(item.id) === seleccionada.id,
        ) as Solicitud | undefined;

        if (actualizada) {
          cargarSolicitudEnFormulario(actualizada);
        }
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "No fue posible cargar las solicitudes con gasto generado.",
      );
    } finally {
      setLoading(false);
    }
  }

  function cargarSolicitudEnFormulario(solicitud: Solicitud) {
    setSeleccionada(solicitud);
    setMensaje("");
    setError("");
    setBusquedaEdificio("");

    const alcanceActual =
      solicitud.alcance_gasto === "COMUN" ||
      solicitud.alcance_gasto === "EDIFICIOS"
        ? solicitud.alcance_gasto
        : "";

    setAlcance(alcanceActual);

    const actual = (solicitud.solicitudes_pago_edificios || []).map((item) => ({
      edificio_id: Number(item.edificio_id),
      monto_asignado: toNumber(item.monto_asignado),
    }));

    setDistribucion(actual);
  }

  function cancelarEdicion() {
    setSeleccionada(null);
    setAlcance("");
    setDistribucion([]);
    setBusquedaEdificio("");
    setMensaje("");
    setError("");
  }

  const solicitudesFiltradas = useMemo(() => {
    const texto = normalizar(busqueda);

    if (!texto) return solicitudes;

    return solicitudes.filter((s) => {
      const proveedor =
        s.catalogo_proveedores?.nombre_proveedor || "";
      const categoria =
        s.catalogo_categoria_gastos?.nombre_categoria || "";

      return [
        s.id,
        s.numero_solicitud,
        s.gasto_generado_id,
        s.fecha_solicitud,
        s.concepto,
        s.detalle,
        proveedor,
        categoria,
        s.no_factura,
        s.ncf,
        s.estado,
      ]
        .join(" ")
        .toLowerCase()
        .includes(texto);
    });
  }, [solicitudes, busqueda]);

  const edificiosFiltrados = useMemo(() => {
    const texto = normalizar(busquedaEdificio);

    return edificios.filter((edificio) => {
      if (!texto) return true;

      return `${edificio.codigo} ${edificio.nombre} ${edificio.estado}`
        .toLowerCase()
        .includes(texto);
    });
  }, [edificios, busquedaEdificio]);

  const seleccionadosIds = useMemo(
    () => new Set(distribucion.map((item) => item.edificio_id)),
    [distribucion],
  );

  const totalSolicitud = toNumber(seleccionada?.total);

  const totalDistribuido = useMemo(
    () =>
      redondear2(
        distribucion.reduce(
          (sum, item) => sum + toNumber(item.monto_asignado),
          0,
        ),
      ),
    [distribucion],
  );

  const pendiente = redondear2(totalSolicitud - totalDistribuido);
  const distribucionCuadra = Math.abs(pendiente) < 0.01;

  function toggleEdificio(edificio: Edificio) {
    const activo = normalizar(edificio.estado) === "activo";
    const seleccionado = seleccionadosIds.has(edificio.id);

    if (!activo && !seleccionado) {
      setError(
        `El edificio "${edificio.nombre}" está inactivo y no puede agregarse a una nueva distribución.`,
      );
      return;
    }

    setError("");

    if (seleccionado) {
      setDistribucion((actual) =>
        actual.filter((item) => item.edificio_id !== edificio.id),
      );
      return;
    }

    setDistribucion((actual) => [
      ...actual,
      {
        edificio_id: edificio.id,
        monto_asignado: 0,
      },
    ]);
  }

  function cambiarMonto(edificioId: number, value: string) {
    const monto = Math.max(0, toNumber(value));

    setDistribucion((actual) =>
      actual.map((item) =>
        item.edificio_id === edificioId
          ? { ...item, monto_asignado: monto }
          : item,
      ),
    );
  }

  function distribuirIgual() {
    if (!seleccionada || distribucion.length === 0) return;

    const totalCentavos = Math.round(totalSolicitud * 100);
    const cantidad = distribucion.length;
    const base = Math.floor(totalCentavos / cantidad);
    let residuo = totalCentavos - base * cantidad;

    const nueva = distribucion.map((item) => {
      const centavos = base + (residuo > 0 ? 1 : 0);
      if (residuo > 0) residuo -= 1;

      return {
        ...item,
        monto_asignado: centavos / 100,
      };
    });

    setDistribucion(nueva);
  }

  function seleccionarVisibles() {
    const activosVisibles = edificiosFiltrados.filter(
      (item) => normalizar(item.estado) === "activo",
    );

    setDistribucion((actual) => {
      const mapa = new Map(actual.map((item) => [item.edificio_id, item]));

      activosVisibles.forEach((edificio) => {
        if (!mapa.has(edificio.id)) {
          mapa.set(edificio.id, {
            edificio_id: edificio.id,
            monto_asignado: 0,
          });
        }
      });

      return Array.from(mapa.values());
    });
  }

  async function guardar() {
    if (!seleccionada) return;

    if (!alcance) {
      setError("Debe indicar si el gasto es común o corresponde a edificios.");
      return;
    }

    if (alcance === "EDIFICIOS") {
      if (distribucion.length === 0) {
        setError("Debe seleccionar por lo menos un edificio.");
        return;
      }

      if (distribucion.some((item) => item.monto_asignado <= 0)) {
        setError("Todos los edificios seleccionados deben tener un monto mayor que cero.");
        return;
      }

      if (!distribucionCuadra) {
        setError(
          `La distribución debe sumar exactamente RD$ ${dinero(
            totalSolicitud,
          )}. Actualmente existe una diferencia de RD$ ${dinero(
            Math.abs(pendiente),
          )}.`,
        );
        return;
      }
    }

    const confirmar = window.confirm(
      `¿Guardar la clasificación de la Solicitud #${
        seleccionada.numero_solicitud || seleccionada.id
      }?\n\n` +
        `Gasto generado: #${seleccionada.gasto_generado_id}\n` +
        `Total financiero: RD$ ${dinero(totalSolicitud)}\n\n` +
        "Esta acción solo modifica la información analítica por edificios. No cambia el gasto financiero.",
    );

    if (!confirmar) return;

    setGuardando(true);
    setMensaje("");
    setError("");

    try {
      const payload =
        alcance === "EDIFICIOS"
          ? distribucion.map((item) => ({
              edificio_id: item.edificio_id,
              monto_asignado: redondear2(item.monto_asignado),
            }))
          : [];

      const { error: rpcError } = await supabase.rpc(
        "guardar_clasificacion_solicitud_edificios",
        {
          p_solicitud_id: seleccionada.id,
          p_alcance: alcance,
          p_distribucion: payload,
        },
      );

      if (rpcError) throw rpcError;

      setMensaje(
        `Clasificación actualizada correctamente. El gasto #${seleccionada.gasto_generado_id} mantiene su monto financiero sin cambios.`,
      );

      await cargarDatos(condominioId || undefined);
    } catch (err: any) {
      setError(
        err?.message ||
          "No fue posible guardar la distribución por edificios.",
      );
    } finally {
      setGuardando(false);
    }
  }

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
            icon: UserCheck,
          },
          {
            href: "/solicitudes-pago/historial",
            label: "Historial",
            icon: FileText,
          },
          {
            href: "/solicitudes-pago/correccion-edificios",
            label: "Corregir edificios",
            icon: Building2,
          },
        ]}
      />

      <ModuleToolbar
        title="Corrección de Distribución por Edificios"
        subtitle={`Clasificación analítica de solicitudes que ya generaron un gasto. Condominio: ${
          condominioNombre || "No seleccionado"
        }.`}
        icon={Building2}
        actions={<ModuleActions onRefresh={() => cargarDatos()} />}
      />

      {error && (
        <div className="mb-4 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {mensaje && (
        <div className="mb-4 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{mensaje}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
        <SectionCard
          title="Buscar gasto"
          subtitle="Se muestran únicamente solicitudes que ya tienen un gasto generado."
          action={
            loading ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Cargando
              </div>
            ) : (
              <div className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
                {solicitudesFiltradas.length} registro(s)
              </div>
            )
          }
        >
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              className="w-full rounded-xl border px-10 py-3 text-sm"
              placeholder="Gasto, solicitud, concepto, factura..."
            />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando registros...
            </div>
          ) : solicitudesFiltradas.length === 0 ? (
            <EmptyState
              title="Sin gastos para corregir"
              description="No se encontraron solicitudes con gasto generado para los criterios indicados."
            />
          ) : (
            <div className="max-h-[680px] space-y-2 overflow-y-auto pr-1">
              {solicitudesFiltradas.map((s) => {
                const activa = seleccionada?.id === s.id;
                const clasificada = Boolean(s.alcance_gasto);

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => cargarSolicitudEnFormulario(s)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      activa
                        ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase text-blue-700">
                          Gasto #{s.gasto_generado_id}
                        </p>
                        <p className="mt-1 line-clamp-2 font-black text-slate-900">
                          {s.concepto || "Sin concepto"}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${
                          s.alcance_gasto === "EDIFICIOS"
                            ? "bg-blue-100 text-blue-800"
                            : s.alcance_gasto === "COMUN"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {s.alcance_gasto === "EDIFICIOS"
                          ? "Edificios"
                          : s.alcance_gasto === "COMUN"
                            ? "Común"
                            : "Pendiente"}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-500">
                      <span>
                        Solicitud #{s.numero_solicitud || s.id}
                      </span>
                      <span className="text-right">
                        {fechaCorta(s.fecha_solicitud)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="truncate text-xs font-semibold text-slate-500">
                        {s.catalogo_categoria_gastos?.nombre_categoria ||
                          "Sin categoría"}
                      </span>
                      <span className="shrink-0 font-black text-slate-900">
                        RD$ {dinero(s.total)}
                      </span>
                    </div>

                    {!clasificada && (
                      <p className="mt-2 text-xs font-black text-amber-700">
                        Requiere clasificación
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Clasificación y distribución"
          subtitle="Esta corrección afecta únicamente la información gerencial vinculada a la solicitud original."
        >
          {!seleccionada ? (
            <EmptyState
              title="Seleccione un gasto"
              description="Elija un registro del panel izquierdo para revisar o corregir su distribución por edificios."
            />
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">
                      Gasto #{seleccionada.gasto_generado_id} · Solicitud #
                      {seleccionada.numero_solicitud || seleccionada.id}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-slate-900">
                      {seleccionada.concepto || "Sin concepto"}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {fechaCorta(seleccionada.fecha_solicitud)} ·{" "}
                      {seleccionada.catalogo_proveedores?.nombre_proveedor || "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-emerald-50 px-5 py-3 text-right">
                    <p className="text-xs font-black uppercase text-emerald-600">
                      Total financiero
                    </p>
                    <p className="text-2xl font-black text-emerald-700">
                      RD$ {dinero(totalSolicitud)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <InfoLine
                    label="Categoría"
                    value={
                      seleccionada.catalogo_categoria_gastos?.nombre_categoria ||
                      "-"
                    }
                  />
                  <InfoLine
                    label="Factura"
                    value={seleccionada.no_factura || "-"}
                  />
                  <InfoLine label="NCF" value={seleccionada.ncf || "-"} />
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-black text-slate-800">
                  ¿Cómo se aplica este gasto?
                </p>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAlcance("COMUN");
                      setDistribucion([]);
                      setError("");
                    }}
                    className={`rounded-2xl border p-4 text-left ${
                      alcance === "COMUN"
                        ? "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-black text-slate-900">
                      Gasto común
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Corresponde al condominio en general.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAlcance("EDIFICIOS");
                      setError("");
                    }}
                    className={`rounded-2xl border p-4 text-left ${
                      alcance === "EDIFICIOS"
                        ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-black text-slate-900">
                      Uno o varios edificios
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Distribuya el total entre los edificios afectados.
                    </p>
                  </button>
                </div>
              </div>

              {alcance === "EDIFICIOS" && (
                <>
                  <div className="rounded-2xl border bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-black text-slate-900">
                          Edificios afectados
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          {distribucion.length} de {edificios.length} seleccionados
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={seleccionarVisibles}
                          className="rounded-xl border bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                        >
                          Seleccionar visibles
                        </button>
                        <button
                          type="button"
                          onClick={() => setDistribucion([])}
                          className="rounded-xl border bg-white px-3 py-2 text-xs font-black text-red-700 hover:bg-red-50"
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>

                    <div className="relative mt-3">
                      <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={busquedaEdificio}
                        onChange={(event) =>
                          setBusquedaEdificio(event.target.value)
                        }
                        className="w-full rounded-xl border px-10 py-3 text-sm"
                        placeholder="Buscar edificio por nombre o código..."
                      />
                    </div>

                    <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border">
                      {edificiosFiltrados.length === 0 ? (
                        <p className="p-4 text-sm text-slate-500">
                          No se encontraron edificios.
                        </p>
                      ) : (
                        edificiosFiltrados.map((edificio) => {
                          const checked = seleccionadosIds.has(edificio.id);
                          const activo =
                            normalizar(edificio.estado) === "activo";

                          return (
                            <label
                              key={edificio.id}
                              className={`flex cursor-pointer items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0 ${
                                checked ? "bg-blue-50" : "bg-white"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleEdificio(edificio)}
                                  className="h-4 w-4"
                                />
                                <div>
                                  <p className="font-black text-slate-900">
                                    {edificio.nombre}
                                  </p>
                                  <p className="text-xs font-semibold text-slate-500">
                                    Código {edificio.codigo}
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                                  activo
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {activo ? "Activo" : "Inactivo"}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {distribucion.length > 0 && (
                    <div className="rounded-2xl border bg-white p-4">
                      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-black text-slate-900">
                            Distribución
                          </p>
                          <p className="text-xs font-semibold text-slate-500">
                            La suma debe ser igual al total financiero.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={distribuirIgual}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Distribuir igual
                        </button>
                      </div>

                      <div className="space-y-2">
                        {distribucion.map((item) => {
                          const edificio = edificios.find(
                            (e) => e.id === item.edificio_id,
                          );

                          const porcentaje =
                            totalSolicitud > 0
                              ? (item.monto_asignado / totalSolicitud) * 100
                              : 0;

                          return (
                            <div
                              key={item.edificio_id}
                              className="grid grid-cols-[1fr_150px_80px_36px] items-center gap-3 rounded-xl border bg-slate-50 p-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-black text-slate-900">
                                  {edificio?.nombre ||
                                    `Edificio #${item.edificio_id}`}
                                </p>
                                <p className="text-xs font-semibold text-slate-500">
                                  {edificio?.codigo || "-"}
                                </p>
                              </div>

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.monto_asignado}
                                onChange={(event) =>
                                  cambiarMonto(
                                    item.edificio_id,
                                    event.target.value,
                                  )
                                }
                                className="rounded-xl border bg-white px-3 py-2 text-right text-sm font-black"
                              />

                              <p className="text-right text-sm font-black text-slate-700">
                                {porcentaje.toFixed(2)}%
                              </p>

                              <button
                                type="button"
                                onClick={() =>
                                  setDistribucion((actual) =>
                                    actual.filter(
                                      (d) =>
                                        d.edificio_id !== item.edificio_id,
                                    ),
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-xl text-red-600 hover:bg-red-50"
                                title="Quitar edificio"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <ResumenBox
                          label="Total gasto"
                          value={`RD$ ${dinero(totalSolicitud)}`}
                          tone="slate"
                        />
                        <ResumenBox
                          label="Distribuido"
                          value={`RD$ ${dinero(totalDistribuido)}`}
                          tone={distribucionCuadra ? "emerald" : "blue"}
                        />
                        <ResumenBox
                          label="Diferencia"
                          value={`RD$ ${dinero(Math.abs(pendiente))}`}
                          tone={distribucionCuadra ? "emerald" : "red"}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {!alcance && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                  Este registro todavía no tiene clasificación. Seleccione
                  “Gasto común” o “Uno o varios edificios”.
                </div>
              )}

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
                <strong>Control de seguridad:</strong> este módulo no modifica el
                total del gasto, estado de aprobación, proveedor, factura,
                cheque, banco ni pago. Solo actualiza la clasificación analítica
                utilizada por los reportes de edificios.
              </div>

              <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={guardar}
                  disabled={
                    guardando ||
                    !alcance ||
                    (alcance === "EDIFICIOS" &&
                      (!distribucion.length || !distribucionCuadra))
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Guardar corrección
                </button>

                <button
                  type="button"
                  onClick={() => cargarSolicitudEnFormulario(seleccionada)}
                  disabled={guardando}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restaurar
                </button>

                <button
                  type="button"
                  onClick={cancelarEdicion}
                  disabled={guardando}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-5 py-3 text-sm font-black text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function ResumenBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "slate" | "blue" | "emerald" | "red";
}) {
  const clases =
    tone === "blue"
      ? "border-blue-100 bg-blue-50 text-blue-800"
      : tone === "emerald"
        ? "border-emerald-100 bg-emerald-50 text-emerald-800"
        : tone === "red"
          ? "border-red-100 bg-red-50 text-red-800"
          : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <div className={`rounded-2xl border p-4 ${clases}`}>
      <p className="text-xs font-black uppercase opacity-70">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}
