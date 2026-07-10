"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Coins,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import StatCard from "@/components/vam/enterprise/StatCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type FondoCaja = {
  id: number;
  condominio: string | null;
  fecha: string | null;
  tipo: string | null;
  monto: number | null;
  descripcion: string | null;
  responsable: string | null;
  created_at: string | null;
  condominio_id: number | null;
  numero_fondo: number | null;
};

type MovimientoCaja = {
  id: number;
  fecha: string | null;
  concepto: string | null;
  detalle_gasto: string | null;
  monto: number | null;
  responsable: string | null;
  comprobante: string | null;
  condominio: string | null;
  estado: string | null;
  created_at: string | null;
  factura_url: string | null;
  reposicion_solicitud_id: number | null;
  repuesto: boolean | null;
  fecha_reposicion: string | null;
  condominio_id: number | null;
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

function tipoNormalizado(tipo?: string | null) {
  return String(tipo || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function esEntradaFondo(tipo?: string | null) {
  const t = tipoNormalizado(tipo);
  return (
    t.includes("entrada") ||
    t.includes("ingreso") ||
    t.includes("fondo") ||
    t.includes("reposicion") ||
    t.includes("apertura") ||
    t.includes("asignacion")
  );
}

export default function FinanzasCajaChicaPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [fondos, setFondos] = useState<FondoCaja[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      setMensaje("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre || `Condominio ID ${id}`);
    cargarDashboard(id);
  }, []);

  async function cargarDashboard(idActual = condominioId) {
    if (!idActual) return;

    setLoading(true);
    setMensaje("");

    await Promise.all([cargarFondos(idActual), cargarMovimientos(idActual)]);

    setLoading(false);
  }

  async function cargarFondos(idActual: string) {
    const { data, error } = await supabase
      .from("caja_chica_fondos")
      .select(
        "id, condominio, fecha, tipo, monto, descripcion, responsable, created_at, condominio_id, numero_fondo"
      )
      .eq("condominio_id", Number(idActual))
      .order("fecha", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      setMensaje("Error cargando fondos de caja chica: " + error.message);
      setFondos([]);
      return;
    }

    setFondos((data as FondoCaja[]) || []);
  }

  async function cargarMovimientos(idActual: string) {
    const { data, error } = await supabase
      .from("caja_chica")
      .select(
        "id, fecha, concepto, detalle_gasto, monto, responsable, comprobante, condominio, estado, created_at, factura_url, reposicion_solicitud_id, repuesto, fecha_reposicion, condominio_id"
      )
      .eq("condominio_id", Number(idActual))
      .order("fecha", { ascending: false })
      .order("id", { ascending: false })
      .limit(300);

    if (error) {
      setMensaje("Error cargando movimientos de caja chica: " + error.message);
      setMovimientos([]);
      return;
    }

    setMovimientos((data as MovimientoCaja[]) || []);
  }

  const hoy = new Date();
  const periodoActual = `${hoy.getFullYear()}-${String(
    hoy.getMonth() + 1
  ).padStart(2, "0")}`;

  const totalFondosAsignados = fondos.reduce(
    (sum, f) => sum + Number(f.monto || 0),
    0
  );

  const totalGastos = movimientos.reduce(
    (sum, m) => sum + Number(m.monto || 0),
    0
  );

  const movimientosMes = movimientos.filter((m) =>
    String(m.fecha || "").startsWith(periodoActual)
  );

  const gastosMes = movimientosMes.reduce(
    (sum, m) => sum + Number(m.monto || 0),
    0
  );

  const pendientesReposicion = movimientos.filter((m) => m.repuesto !== true);
  const totalPendienteReposicion = pendientesReposicion.reduce(
    (sum, m) => sum + Number(m.monto || 0),
    0
  );

  const disponibleEstimado = totalFondosAsignados - totalPendienteReposicion;
  const fondosUnicos = new Set(
    fondos
      .map((f) => f.numero_fondo)
      .filter((n) => n !== null && n !== undefined)
      .map(String)
  );

  const ultimosMovimientos = movimientos.slice(0, 10);

  const resumenPorFondo = useMemo(() => {
    const mapa = new Map<
      string,
      {
        numero: string;
        asignado: number;
        gastado: number;
        pendiente: number;
        disponible: number;
      }
    >();

    fondos.forEach((fondo) => {
      const numero = fondo.numero_fondo ? String(fondo.numero_fondo) : "Sin fondo";
      const actual =
        mapa.get(numero) ||
        {
          numero,
          asignado: 0,
          gastado: 0,
          pendiente: 0,
          disponible: 0,
        };

      actual.asignado += Number(fondo.monto || 0);
      actual.disponible = actual.asignado - actual.pendiente;
      mapa.set(numero, actual);
    });

    // La tabla caja_chica no tiene numero_fondo. Los gastos se muestran como pendientes globales.
    // Por eso el disponible por fondo se calcula con fondos asignados, y el gasto real se muestra en KPI.
    return Array.from(mapa.values()).slice(0, 6);
  }, [fondos]);

  return (
    <PageContainer>
      <ModuleMenu
        title="Caja Chica"
        subtitle="Movimientos, fondos, balance y reportes."
        tone="green"
        items={[
          { href: "/finanzas/caja-chica", label: "Dashboard", icon: BarChart3 },
          { href: "/caja-chica", label: "Movimientos", icon: Coins },
          { href: "/caja-chica/fondos", label: "Fondos", icon: WalletCards },
          { href: "/caja-chica/balance", label: "Balance", icon: BarChart3 },
          { href: "/caja-chica/reporte", label: "Reportes", icon: FileSpreadsheet },
        ]}
      />

      <ModuleToolbar
        title="Dashboard Caja Chica"
        subtitle={`Resumen ejecutivo de caja chica. Condominio: ${
          condominioNombre || "No seleccionado"
        }.`}
        icon={Coins}
        actions={
          <ModuleActions
            onRefresh={() => cargarDashboard()}
            extra={
              <>
                <Link
                  href="/caja-chica"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo movimiento
                </Link>

                <Link
                  href="/caja-chica/reporte"
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Reportes
                </Link>
              </>
            }
          />
        }
      />

      {mensaje && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Disponible estimado"
          value={`RD$ ${dinero(disponibleEstimado)}`}
          subtitle="Fondos menos pendiente"
          icon={WalletCards}
          tone={disponibleEstimado >= 0 ? "green" : "red"}
        />

        <StatCard
          title="Fondos asignados"
          value={`RD$ ${dinero(totalFondosAsignados)}`}
          subtitle={`${fondosUnicos.size || 0} fondo(s)`}
          icon={WalletCards}
          tone="blue"
        />

        <StatCard
          title="Pendiente reposición"
          value={`RD$ ${dinero(totalPendienteReposicion)}`}
          subtitle={`${pendientesReposicion.length} gasto(s)`}
          icon={RefreshCw}
          tone={totalPendienteReposicion > 0 ? "amber" : "green"}
        />

        <StatCard
          title="Gastado este mes"
          value={`RD$ ${dinero(gastosMes)}`}
          subtitle={`${movimientosMes.length} movimiento(s)`}
          icon={Coins}
          tone="slate"
        />
      </div>

      <section
        className={`rounded-2xl border p-5 ${
          disponibleEstimado < 0
            ? "border-red-200 bg-red-50 text-red-900"
            : totalPendienteReposicion > 0
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-emerald-200 bg-emerald-50 text-emerald-900"
        }`}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5" />
          <div>
            <h3 className="font-black">Lectura gerencial</h3>
            <p className="mt-1 text-sm">
              {disponibleEstimado < 0
                ? "La caja chica presenta balance negativo según fondos asignados y gastos pendientes."
                : totalPendienteReposicion > 0
                ? `Hay RD$ ${dinero(totalPendienteReposicion)} pendiente de reposición.`
                : "La caja chica no presenta gastos pendientes de reposición."}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard
          title="Resumen de fondos"
          subtitle="Fondos asignados registrados."
          action={
            <Link
              href="/caja-chica/fondos"
              className="text-sm font-bold text-emerald-700 hover:underline"
            >
              Ver fondos
            </Link>
          }
        >
          {resumenPorFondo.length === 0 ? (
            <EmptyState
              title="Sin fondos"
              description="No hay fondos de caja chica configurados."
            />
          ) : (
            <div className="space-y-3">
              {resumenPorFondo.map((fondo) => (
                <div
                  key={fondo.numero}
                  className="flex items-center justify-between rounded-2xl border bg-slate-50 p-4"
                >
                  <div>
                    <p className="font-black text-slate-900">
                      Fondo {fondo.numero}
                    </p>
                    <p className="text-xs text-slate-500">Asignado</p>
                  </div>

                  <p className="font-black text-emerald-700">
                    RD$ {dinero(fondo.asignado)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Acciones rápidas"
          subtitle="Operaciones frecuentes de caja chica."
        >
          <div className="grid grid-cols-1 gap-3">
            <QuickLink href="/caja-chica" title="Registrar movimiento" description="Salida o comprobante." icon={Coins} />
            <QuickLink href="/caja-chica/fondos" title="Administrar fondos" description="Fondos y responsables." icon={WalletCards} />
            <QuickLink href="/caja-chica/balance" title="Consultar balance" description="Disponible y gastos." icon={BarChart3} />
            <QuickLink href="/caja-chica/reporte" title="Generar reporte" description="Movimientos y reposiciones." icon={FileSpreadsheet} />
          </div>
        </SectionCard>

        <SectionCard title="Indicadores" subtitle="Lectura rápida del comportamiento actual.">
          <div className="space-y-3">
            <MiniMetric label="Movimientos del mes" value={String(movimientosMes.length)} />
            <MiniMetric label="Total gastado" value={`RD$ ${dinero(totalGastos)}`} />
            <MiniMetric label="Pendientes de reposición" value={String(pendientesReposicion.length)} />
            <MiniMetric label="Disponible estimado" value={`RD$ ${dinero(disponibleEstimado)}`} />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Últimos movimientos"
        subtitle="Vista rápida de los movimientos más recientes de caja chica."
        action={
          <Link href="/caja-chica" className="text-sm font-bold text-emerald-700 hover:underline">
            Ver movimientos
          </Link>
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500">Cargando caja chica...</p>
        ) : ultimosMovimientos.length === 0 ? (
          <EmptyState title="Sin movimientos" description="No hay movimientos de caja chica registrados." />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Concepto</th>
                <th className="px-4 py-3 text-left">Detalle</th>
                <th className="px-4 py-3 text-left">Responsable</th>
                <th className="px-4 py-3 text-center">Reposición</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-center">Soporte</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {ultimosMovimientos.map((mov) => (
                <tr key={mov.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3">{fechaCorta(mov.fecha)}</td>
                  <td className="px-4 py-3 font-semibold">{mov.concepto || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{mov.detalle_gasto || "-"}</td>
                  <td className="px-4 py-3">{mov.responsable || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    {mov.repuesto ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                        Repuesto
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-red-700">
                    RD$ {dinero(mov.monto)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {mov.factura_url ? (
                      <a
                        href={mov.factura_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white"
                      >
                        Ver
                      </a>
                    ) : mov.comprobante ? (
                      <span className="text-xs text-slate-500">{mov.comprobante}</span>
                    ) : (
                      <span className="text-xs text-slate-400">Sin soporte</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function QuickLink({ href, title, description, icon: Icon }: { href: string; title: string; description: string; icon: any }) {
  return (
    <Link href={href} className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-black text-slate-900 group-hover:text-emerald-700">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
      </div>
    </Link>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}
