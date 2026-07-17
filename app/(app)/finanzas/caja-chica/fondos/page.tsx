"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  FileSpreadsheet,
  Plus,
  Save,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type TipoFondo = "fondo_inicial" | "reposicion";

type CajaChicaFondo = {
  id: number;
  condominio_id: number | null;
  numero_fondo: number | null;
  condominio: string | null;
  fecha: string;
  tipo: string;
  monto: number;
  descripcion: string | null;
  responsable: string | null;
  created_at: string | null;
};

const tiposFondos: { value: TipoFondo; label: string }[] = [
  { value: "fondo_inicial", label: "Fondo inicial" },
  { value: "reposicion", label: "Reposición" },
];

const tipoLabels: Record<TipoFondo, string> = {
  fondo_inicial: "Fondo inicial",
  reposicion: "Reposición",
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

function hoyISO() {
  return new Date().toISOString().split("T")[0];
}

function numeroFondoTexto(numero?: number | null) {
  if (!numero) return "-";
  return String(numero).padStart(5, "0");
}

export default function FondosCajaChicaPage() {
  const [fondos, setFondos] = useState<CajaChicaFondo[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [condominio, setCondominio] = useState("");
  const [condominioId, setCondominioId] = useState("");

  const [fecha, setFecha] = useState("");
  const [tipo, setTipo] = useState<TipoFondo>("fondo_inicial");
  const [monto, setMonto] = useState("");
  const [responsable, setResponsable] = useState("");
  const [descripcion, setDescripcion] = useState("");

  useEffect(() => {
    const idGuardado = localStorage.getItem("condominio_id") || "";
    const nombreGuardado =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    if (!idGuardado) {
      alert("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    const nombreCondominio = nombreGuardado || `Condominio ID ${idGuardado}`;

    setCondominioId(idGuardado);
    setCondominio(nombreCondominio);
    setFecha(hoyISO());
    setTipo("fondo_inicial");
    setDescripcion("Fondo inicial de caja chica");

    cargarFondos(idGuardado);
  }, []);

  async function cargarFondos(idCondominio?: string) {
    const idActivo = idCondominio || condominioId;
    if (!idActivo) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("caja_chica_fondos")
      .select(
        "id, condominio_id, numero_fondo, condominio, fecha, tipo, monto, descripcion, responsable, created_at",
      )
      .eq("condominio_id", Number(idActivo))
      .order("fecha", { ascending: false })
      .order("id", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando fondos de caja chica: " + error.message);
      setFondos([]);
      return;
    }

    const listaFondos = (data || []) as CajaChicaFondo[];
    setFondos(listaFondos);

    const tieneFondoInicial = listaFondos.some(
      (f) => String(f.tipo).toLowerCase() === "fondo_inicial",
    );

    if (tieneFondoInicial) {
      setTipo("reposicion");
      setDescripcion("Reposición de caja chica");
    } else {
      setTipo("fondo_inicial");
      setDescripcion("Fondo inicial de caja chica");
    }
  }

  async function refrescar() {
    await cargarFondos(condominioId);
  }

  async function obtenerNumeroFondo() {
    const { data, error } = await supabase.rpc(
      "obtener_proximo_numero_fondo_caja_chica",
      {
        p_condominio_id: Number(condominioId),
      },
    );

    if (error) {
      const mayorNumero = fondos.reduce(
        (max, fondo) => Math.max(max, Number(fondo.numero_fondo || 0)),
        0,
      );

      return mayorNumero + 1;
    }

    return Number(data || 1);
  }

  async function guardarFondo(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominio) {
      alert("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    if (!fecha || !tipo || !monto) {
      alert("Debe completar fecha, tipo de fondo y monto.");
      return;
    }

    const montoNumerico = Number(monto || 0);

    if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
      alert("El monto debe ser mayor que cero.");
      return;
    }

    const yaTieneFondoInicial = fondos.some(
      (f) => String(f.tipo).toLowerCase() === "fondo_inicial",
    );

    if (tipo === "fondo_inicial" && yaTieneFondoInicial) {
      alert(
        "Este condominio ya tiene un fondo inicial registrado. Para aumentar el fondo use una reposición.",
      );
      return;
    }

    try {
      setGuardando(true);

      const numeroFondo = await obtenerNumeroFondo();

      const { error } = await supabase.from("caja_chica_fondos").insert([
        {
          condominio_id: Number(condominioId),
          numero_fondo: numeroFondo,
          condominio,
          fecha,
          tipo,
          monto: montoNumerico,
          descripcion:
            descripcion.trim() ||
            (tipo === "fondo_inicial"
              ? "Fondo inicial de caja chica"
              : "Reposición de caja chica"),
          responsable: responsable.trim() || null,
        },
      ]);

      setGuardando(false);

      if (error) {
        alert("Error guardando fondo de caja chica: " + error.message);
        return;
      }

      alert(
        `Fondo registrado correctamente. No. ${String(numeroFondo).padStart(
          5,
          "0",
        )}`,
      );

      setFecha(hoyISO());
      setMonto("");
      setResponsable("");
      setTipo("reposicion");
      setDescripcion("Reposición de caja chica");

      cargarFondos(condominioId);
    } catch (err: any) {
      setGuardando(false);
      alert(err?.message || "Error guardando fondo de caja chica.");
    }
  }

  const totalFondos = useMemo(
    () => fondos.reduce((sum, f) => sum + Number(f.monto || 0), 0),
    [fondos],
  );

  const totalFondoInicial = useMemo(
    () =>
      fondos
        .filter((f) => String(f.tipo).toLowerCase() === "fondo_inicial")
        .reduce((sum, f) => sum + Number(f.monto || 0), 0),
    [fondos],
  );

  const totalReposiciones = useMemo(
    () =>
      fondos
        .filter((f) => String(f.tipo).toLowerCase() === "reposicion")
        .reduce((sum, f) => sum + Number(f.monto || 0), 0),
    [fondos],
  );

  const puedeRegistrarFondoInicial = !fondos.some(
    (f) => String(f.tipo).toLowerCase() === "fondo_inicial",
  );

  const ultimoFondo = fondos[0];

  return (
    <PageContainer>
      <ModuleMenu
        title="Caja Chica"
        subtitle="Movimientos, fondos, balance y reportes."
        tone="green"
        items={[
          { href: "/finanzas/caja-chica", label: "Dashboard", icon: BarChart3 },
          { href: "/finanzas/caja-chica/fondos", label: "Fondos", icon: WalletCards },
          { href: "/finanzas/caja-chica/balance", label: "Balance", icon: BarChart3 },
          
          {
            href: "/finanzas/caja-chica/reporte",
            label: "Reporte",
            icon: FileSpreadsheet,
          },
          {
            href: "/finanzas/caja-chica/reporte1",
            label: "Reporte Mensual",
            icon: FileSpreadsheet,
          },
        ]}
      />

      <ModuleToolbar
        title="Fondos de Caja Chica"
        subtitle={`Registro principal de fondo inicial y reposiciones. Condominio: ${
          condominio || "No seleccionado"
        }.`}
        icon={WalletCards}
        actions={
          <ModuleActions
            onRefresh={refrescar}
            extra={
              <Link
                href="/caja-chica/reporte"
                className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Reporte
              </Link>
            }
          />
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="xl:col-span-2">
          <SectionCard
            title="Registrar fondo de caja chica"
            subtitle="Digite aquí el fondo inicial o una reposición para alimentar la caja chica del condominio."
            action={
              <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                Total disponible registrado: RD$ {dinero(totalFondos)}
              </div>
            }
          >
            <form onSubmit={guardarFondo} className="space-y-5">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-black uppercase tracking-wide text-emerald-700">
                    Captura principal
                  </p>
                  <p className="text-sm text-slate-600">
                    El administrador debe registrar primero el fondo inicial.
                    Después de registrado, el sistema solo permitirá registrar
                    reposiciones.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Tipo de fondo *
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => {
                      const nuevoTipo = e.target.value as TipoFondo;
                      setTipo(nuevoTipo);
                      setDescripcion(
                        nuevoTipo === "fondo_inicial"
                          ? "Fondo inicial de caja chica"
                          : "Reposición de caja chica",
                      );
                    }}
                    className="w-full rounded-xl border bg-white px-4 py-3"
                  >
                    {tiposFondos.map((tipoFondo) => {
                      if (
                        tipoFondo.value === "fondo_inicial" &&
                        !puedeRegistrarFondoInicial
                      ) {
                        return null;
                      }

                      return (
                        <option key={tipoFondo.value} value={tipoFondo.value}>
                          {tipoFondo.label}
                        </option>
                      );
                    })}
                  </select>

                  {!puedeRegistrarFondoInicial && (
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      El fondo inicial ya fue registrado. Solo puede agregar
                      reposiciones.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Monto RD$ *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3 text-lg font-black text-emerald-700"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Responsable
                  </label>
                  <input
                    type="text"
                    value={responsable}
                    onChange={(e) => setResponsable(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                    placeholder="Persona que entrega o registra"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Descripción
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                  rows={3}
                  placeholder="Detalle del fondo inicial o reposición"
                />
              </div>

              <button
                type="submit"
                disabled={guardando || loading || !condominioId}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-4 text-base font-black text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {guardando ? (
                  <>
                    <Save className="h-5 w-5" />
                    Guardando fondo...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    Guardar fondo de caja chica
                  </>
                )}
              </button>
            </form>
          </SectionCard>
        </section>

        <section className="space-y-5">
          <SectionCard title="Resumen de fondos" subtitle="Estado actual.">
            <div className="space-y-3">
              <InfoLine
                label="Fondo inicial"
                value={`RD$ ${dinero(totalFondoInicial)}`}
              />
              <InfoLine
                label="Reposiciones"
                value={`RD$ ${dinero(totalReposiciones)}`}
              />
              <InfoLine
                label="Total fondos"
                value={`RD$ ${dinero(totalFondos)}`}
                highlight
              />
              <InfoLine
                label="Último movimiento"
                value={ultimoFondo ? fechaCorta(ultimoFondo.fecha) : "-"}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Regla del módulo"
            subtitle="Control administrativo."
          >
            <div className="space-y-3 text-sm text-slate-600">
              <p>
                El fondo inicial se registra una sola vez por condominio.
              </p>
              <p>
                Cuando el fondo inicial ya existe, los nuevos registros deben
                realizarse como reposición.
              </p>
              <p className="rounded-xl bg-slate-50 p-3 font-semibold text-slate-700">
                Condominio activo: {condominio || "No seleccionado"}
              </p>
            </div>
          </SectionCard>
        </section>
      </div>

      <section className="mt-5">
        <SectionCard
          title="Historial de fondos"
          subtitle="Movimientos registrados únicamente para el condominio activo."
          action={
            <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
              Registros: {fondos.length}
            </div>
          }
        >
          {loading ? (
            <p className="text-sm text-slate-500">Cargando fondos...</p>
          ) : fondos.length === 0 ? (
            <EmptyState
              title="Sin fondos registrados"
              description="Este condominio todavía no tiene fondo inicial ni reposiciones de caja chica."
            />
          ) : (
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">No.</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Responsable</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {fondos.map((fondo) => (
                  <tr key={fondo.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {numeroFondoTexto(fondo.numero_fondo)}
                    </td>
                    <td className="px-4 py-3">{fechaCorta(fondo.fecha)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                          String(fondo.tipo).toLowerCase() === "fondo_inicial"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {tipoLabels[fondo.tipo as TipoFondo] || fondo.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">{fondo.responsable || "-"}</td>
                    <td className="px-4 py-3">{fondo.descripcion || "-"}</td>
                    <td className="px-4 py-3 text-right font-black text-emerald-700">
                      RD$ {dinero(fondo.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </SectionCard>
      </section>
    </PageContainer>
  );
}

function InfoLine({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span
        className={`text-sm font-black ${
          highlight ? "text-emerald-700" : "text-slate-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}