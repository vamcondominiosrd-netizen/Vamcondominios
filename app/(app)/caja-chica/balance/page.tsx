"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Coins,
  Download,
  FileSpreadsheet,
  WalletCards,
} from "lucide-react";
import * as XLSX from "xlsx";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type Fondo = {
  id: number;
  condominio_id: number | null;
  numero_fondo: number | null;
  condominio: string | null;
  fecha: string | null;
  tipo: string | null;
  monto: number | null;
  descripcion: string | null;
  responsable: string | null;
  created_at: string | null;
};

type Gasto = {
  id: number;
  condominio_id: number | null;
  condominio: string | null;
  fecha: string | null;
  concepto: string | null;
  detalle_gasto: string | null;
  monto: number | null;
  responsable: string | null;
  comprobante: string | null;
  factura_url: string | null;
  estado: string | null;
  created_at: string | null;
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

function numeroFondoTexto(numero?: number | null) {
  if (!numero) return "-";
  return String(numero).padStart(5, "0");
}

function tipoFondoTexto(tipo?: string | null) {
  const value = String(tipo || "").toLowerCase();

  if (value === "fondo_inicial") return "Fondo inicial";
  if (value === "reposicion") return "Reposición";

  return tipo || "-";
}

export default function BalanceCajaChicaPage() {
  const [fondos, setFondos] = useState<Fondo[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(false);

  const [condominio, setCondominio] = useState("");
  const [condominioId, setCondominioId] = useState("");

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

    cargarDatos(idGuardado, nombreCondominio);
  }, []);

  async function cargarDatos(idActivo?: string, nombreActivo?: string) {
    const idCondominio = idActivo || condominioId;
    const nombreCondominio = nombreActivo || condominio;

    if (!idCondominio && !nombreCondominio) return;

    setLoading(true);

    let fondosData: Fondo[] = [];
    let gastosData: Gasto[] = [];

    if (idCondominio) {
      const { data: fondosPorId, error: fondosError } = await supabase
        .from("caja_chica_fondos")
        .select(
          "id, condominio_id, numero_fondo, condominio, fecha, tipo, monto, descripcion, responsable, created_at"
        )
        .eq("condominio_id", Number(idCondominio))
        .order("fecha", { ascending: false })
        .order("id", { ascending: false });

      if (fondosError) {
        setLoading(false);
        alert("Error cargando fondos de caja chica: " + fondosError.message);
        setFondos([]);
        return;
      }

      fondosData = (fondosPorId || []) as Fondo[];

      const { data: gastosPorId, error: gastosError } = await supabase
        .from("caja_chica")
        .select(
          "id, condominio_id, condominio, fecha, concepto, detalle_gasto, monto, responsable, comprobante, factura_url, estado, created_at"
        )
        .eq("condominio_id", Number(idCondominio))
        .order("fecha", { ascending: false })
        .order("id", { ascending: false });

      if (gastosError) {
        setLoading(false);
        alert("Error cargando gastos de caja chica: " + gastosError.message);
        setGastos([]);
        return;
      }

      gastosData = (gastosPorId || []) as Gasto[];
    }

    if (fondosData.length === 0 && nombreCondominio) {
      const { data: fondosPorNombre, error: fondosNombreError } =
        await supabase
          .from("caja_chica_fondos")
          .select(
            "id, condominio_id, numero_fondo, condominio, fecha, tipo, monto, descripcion, responsable, created_at"
          )
          .ilike("condominio", `%${nombreCondominio}%`)
          .order("fecha", { ascending: false })
          .order("id", { ascending: false });

      if (fondosNombreError) {
        setLoading(false);
        alert(
          "Error cargando fondos de caja chica: " + fondosNombreError.message
        );
        setFondos([]);
        return;
      }

      fondosData = (fondosPorNombre || []) as Fondo[];
    }

    if (gastosData.length === 0 && nombreCondominio) {
      const { data: gastosPorNombre, error: gastosNombreError } = await supabase
        .from("caja_chica")
        .select(
          "id, condominio_id, condominio, fecha, concepto, detalle_gasto, monto, responsable, comprobante, factura_url, estado, created_at"
        )
        .ilike("condominio", `%${nombreCondominio}%`)
        .order("fecha", { ascending: false })
        .order("id", { ascending: false });

      if (gastosNombreError) {
        setLoading(false);
        alert(
          "Error cargando gastos de caja chica: " + gastosNombreError.message
        );
        setGastos([]);
        return;
      }

      gastosData = (gastosPorNombre || []) as Gasto[];
    }

    setFondos(fondosData);
    setGastos(gastosData);
    setLoading(false);
  }

  async function refrescar() {
    await cargarDatos(condominioId, condominio);
  }

  const totalFondos = useMemo(
    () => fondos.reduce((sum, f) => sum + Number(f.monto || 0), 0),
    [fondos]
  );

  const totalFondoInicial = useMemo(
    () =>
      fondos
        .filter((f) => String(f.tipo || "").toLowerCase() === "fondo_inicial")
        .reduce((sum, f) => sum + Number(f.monto || 0), 0),
    [fondos]
  );

  const totalReposiciones = useMemo(
    () =>
      fondos
        .filter((f) => String(f.tipo || "").toLowerCase() === "reposicion")
        .reduce((sum, f) => sum + Number(f.monto || 0), 0),
    [fondos]
  );

  const totalGastos = useMemo(
    () => gastos.reduce((sum, g) => sum + Number(g.monto || 0), 0),
    [gastos]
  );

  const balanceDisponible = totalFondos - totalGastos;

  const ultimosFondos = useMemo(() => fondos.slice(0, 5), [fondos]);
  const ultimosGastos = useMemo(() => gastos.slice(0, 5), [gastos]);

  function exportarExcel() {
    if (!condominio) {
      alert("No se encontró el condominio activo.");
      return;
    }

    const resumenExcel = [
      {
        Condominio: condominio,
        "Fondo Inicial RD$": Number(totalFondoInicial || 0),
        "Reposiciones RD$": Number(totalReposiciones || 0),
        "Total Fondos RD$": Number(totalFondos || 0),
        "Total Gastos RD$": Number(totalGastos || 0),
        "Balance Disponible RD$": Number(balanceDisponible || 0),
      },
    ];

    const fondosExcel = fondos.map((f) => ({
      No: numeroFondoTexto(f.numero_fondo),
      Fecha: fechaCorta(f.fecha),
      Tipo: tipoFondoTexto(f.tipo),
      Responsable: f.responsable || "",
      Descripción: f.descripcion || "",
      "Monto RD$": Number(f.monto || 0),
    }));

    const gastosExcel = gastos.map((g) => ({
      Fecha: fechaCorta(g.fecha),
      Concepto: g.concepto || "",
      Detalle: g.detalle_gasto || "",
      Responsable: g.responsable || "",
      Comprobante: g.comprobante || "",
      Estado: g.estado || "",
      "Monto RD$": Number(g.monto || 0),
    }));

    const hojaResumen = XLSX.utils.json_to_sheet(resumenExcel);
    const hojaFondos = XLSX.utils.json_to_sheet(fondosExcel);
    const hojaGastos = XLSX.utils.json_to_sheet(gastosExcel);

    hojaResumen["!cols"] = [
      { wch: 35 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 24 },
    ];

    hojaFondos["!cols"] = [
      { wch: 12 },
      { wch: 14 },
      { wch: 18 },
      { wch: 25 },
      { wch: 45 },
      { wch: 18 },
    ];

    hojaGastos["!cols"] = [
      { wch: 14 },
      { wch: 35 },
      { wch: 45 },
      { wch: 25 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
    ];

    const libro = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(libro, hojaResumen, "Resumen");
    XLSX.utils.book_append_sheet(libro, hojaFondos, "Fondos");
    XLSX.utils.book_append_sheet(libro, hojaGastos, "Gastos");

    XLSX.writeFile(
      libro,
      `Balance_Caja_Chica_${condominio.replaceAll(" ", "_")}.xlsx`
    );
  }

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
          {
            href: "/caja-chica/reporte",
            label: "Reportes",
            icon: FileSpreadsheet,
          },
        ]}
      />

      <ModuleToolbar
        title="Balance de Caja Chica"
        subtitle={`Resumen de fondos, gastos y balance disponible. Condominio: ${
          condominio || "No seleccionado"
        }.`}
        icon={BarChart3}
        actions={
          <ModuleActions
            onRefresh={refrescar}
            extra={
              <button
                onClick={exportarExcel}
                className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Exportar Excel
              </button>
            }
          />
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        <InfoBox
          label="Fondo inicial"
          value={`RD$ ${dinero(totalFondoInicial)}`}
          tone="blue"
        />

        <InfoBox
          label="Reposiciones"
          value={`RD$ ${dinero(totalReposiciones)}`}
          tone="emerald"
        />

        <InfoBox
          label="Gastos"
          value={`RD$ ${dinero(totalGastos)}`}
          tone="red"
        />

        <InfoBox
          label="Balance disponible"
          value={`RD$ ${dinero(balanceDisponible)}`}
          tone={balanceDisponible >= 0 ? "purple" : "red"}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="xl:col-span-2">
          <SectionCard
            title="Balance general"
            subtitle="Resultado consolidado de caja chica del condominio activo."
            action={
              <div
                className={`rounded-xl px-4 py-2 text-sm font-black ${
                  balanceDisponible >= 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                Disponible: RD$ {dinero(balanceDisponible)}
              </div>
            }
          >
            {loading ? (
              <p className="text-sm text-slate-500">
                Cargando balance de caja chica...
              </p>
            ) : !condominioId ? (
              <EmptyState
                title="Condominio no identificado"
                description="No se encontró un condominio activo. Debe iniciar sesión nuevamente."
              />
            ) : (
              <DataTable>
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Condominio</th>
                    <th className="px-4 py-3 text-right">Fondo inicial</th>
                    <th className="px-4 py-3 text-right">Reposiciones</th>
                    <th className="px-4 py-3 text-right">Total fondos</th>
                    <th className="px-4 py-3 text-right">Gastos</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  <tr className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {condominio || "No identificado"}
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-blue-700">
                      RD$ {dinero(totalFondoInicial)}
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-emerald-700">
                      RD$ {dinero(totalReposiciones)}
                    </td>

                    <td className="px-4 py-3 text-right font-black text-emerald-700">
                      RD$ {dinero(totalFondos)}
                    </td>

                    <td className="px-4 py-3 text-right font-black text-red-700">
                      RD$ {dinero(totalGastos)}
                    </td>

                    <td
                      className={`px-4 py-3 text-right font-black ${
                        balanceDisponible >= 0
                          ? "text-purple-700"
                          : "text-red-700"
                      }`}
                    >
                      RD$ {dinero(balanceDisponible)}
                    </td>
                  </tr>
                </tbody>
              </DataTable>
            )}
          </SectionCard>
        </section>

        <section>
          <SectionCard
            title="Resumen"
            subtitle="Estado financiero de caja chica."
          >
            <div className="space-y-3">
              <InfoLine
                label="Condominio activo"
                value={condominio || "No seleccionado"}
              />
              <InfoLine
                label="Total fondos"
                value={`RD$ ${dinero(totalFondos)}`}
              />
              <InfoLine
                label="Total gastos"
                value={`RD$ ${dinero(totalGastos)}`}
              />
              <InfoLine
                label="Balance disponible"
                value={`RD$ ${dinero(balanceDisponible)}`}
                highlight
                danger={balanceDisponible < 0}
              />
              <InfoLine label="Registros de fondos" value={`${fondos.length}`} />
              <InfoLine label="Registros de gastos" value={`${gastos.length}`} />
            </div>
          </SectionCard>
        </section>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard
          title="Últimos fondos registrados"
          subtitle="Fondo inicial y reposiciones recientes."
          action={
            <Link
              href="/caja-chica/fondos"
              className="text-sm font-bold text-emerald-700 hover:underline"
            >
              Ver fondos
            </Link>
          }
        >
          {loading ? (
            <p className="text-sm text-slate-500">Cargando fondos...</p>
          ) : ultimosFondos.length === 0 ? (
            <EmptyState
              title="Sin fondos"
              description="No hay fondos registrados para este condominio."
            />
          ) : (
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">No.</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {ultimosFondos.map((fondo) => (
                  <tr key={fondo.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {numeroFondoTexto(fondo.numero_fondo)}
                    </td>

                    <td className="px-4 py-3">{fechaCorta(fondo.fecha)}</td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                          String(fondo.tipo || "").toLowerCase() ===
                          "fondo_inicial"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {tipoFondoTexto(fondo.tipo)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-black text-emerald-700">
                      RD$ {dinero(fondo.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </SectionCard>

        <SectionCard
          title="Últimos gastos registrados"
          subtitle="Gastos recientes que afectan el balance."
          action={
            <Link
              href="/caja-chica/reporte"
              className="text-sm font-bold text-emerald-700 hover:underline"
            >
              Ver reporte
            </Link>
          }
        >
          {loading ? (
            <p className="text-sm text-slate-500">Cargando gastos...</p>
          ) : ultimosGastos.length === 0 ? (
            <EmptyState
              title="Sin gastos"
              description="No hay gastos registrados para este condominio."
            />
          ) : (
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Concepto</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {ultimosGastos.map((gasto) => (
                  <tr key={gasto.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3">{fechaCorta(gasto.fecha)}</td>

                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-700">
                        {gasto.concepto || "-"}
                      </p>

                      {gasto.detalle_gasto && (
                        <p className="mt-1 text-xs text-slate-500">
                          {gasto.detalle_gasto}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-black text-red-700">
                      RD$ {dinero(gasto.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </SectionCard>
      </div>
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
  tone?: "blue" | "emerald" | "red" | "purple" | "slate";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "red"
      ? "bg-red-50 text-red-700 border-red-100"
      : tone === "purple"
      ? "bg-purple-50 text-purple-700 border-purple-100"
      : "bg-slate-50 text-slate-700 border-slate-100";

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2 className="mt-2 text-2xl font-black">{value}</h2>
    </div>
  );
}

function InfoLine({
  label,
  value,
  highlight = false,
  danger = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-600">{label}</span>

      <span
        className={`text-right text-sm font-black ${
          danger
            ? "text-red-700"
            : highlight
            ? "text-emerald-700"
            : "text-slate-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}