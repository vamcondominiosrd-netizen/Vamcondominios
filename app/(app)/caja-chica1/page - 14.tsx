"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Coins,
  FileSpreadsheet,
  Plus,
  ReceiptText,
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

type CajaChica = {
  id: number;
  condominio: string;
  fecha: string;
  concepto: string;
  detalle_gasto: string;
  monto: number;
  responsable: string;
  comprobante: string;
  factura_url: string;
  estado: string;
  created_at: string;
};

type CajaChicaFondo = {
  id: number;
  condominio_id: number | null;
  numero_fondo: number | null;
  condominio: string;
  fecha: string;
  tipo: string;
  monto: number;
  descripcion: string | null;
  responsable: string | null;
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

export default function CajaChicaPage() {
  const [gastos, setGastos] = useState<CajaChica[]>([]);
  const [fondos, setFondos] = useState<CajaChicaFondo[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardandoFondo, setGuardandoFondo] = useState(false);

  const [condominio, setCondominio] = useState("");
  const [condominioId, setCondominioId] = useState("");

  const [fecha, setFecha] = useState("");
  const [concepto, setConcepto] = useState("");
  const [detalleGasto, setDetalleGasto] = useState("");
  const [monto, setMonto] = useState("");
  const [responsable, setResponsable] = useState("");
  const [comprobante, setComprobante] = useState("");
  const [facturaArchivo, setFacturaArchivo] = useState<File | null>(null);

  const [fechaFondo, setFechaFondo] = useState("");
  const [tipoFondo, setTipoFondo] = useState("fondo_inicial");
  const [montoFondo, setMontoFondo] = useState("");
  const [responsableFondo, setResponsableFondo] = useState("");
  const [descripcionFondo, setDescripcionFondo] = useState("");

  useEffect(() => {
    const idGuardado = localStorage.getItem("condominio_id") || "";
    const nombreGuardado = localStorage.getItem("condominio_nombre") || "";

    if (!idGuardado) {
      alert("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    const hoy = new Date().toISOString().split("T")[0];

    setCondominioId(idGuardado);
    setCondominio(nombreGuardado || `Condominio ID ${idGuardado}`);
    setFecha(hoy);
    setFechaFondo(hoy);
    setDescripcionFondo("Fondo inicial de caja chica");

    cargarGastos(nombreGuardado || `Condominio ID ${idGuardado}`);
    cargarFondos(idGuardado, nombreGuardado || `Condominio ID ${idGuardado}`);
  }, []);

  async function cargarGastos(condominioActivo: string) {
    if (!condominioActivo) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("caja_chica")
      .select(
        "id, condominio, fecha, concepto, detalle_gasto, monto, responsable, comprobante, factura_url, estado, created_at"
      )
      .eq("condominio", condominioActivo)
      .order("fecha", { ascending: false })
      .order("id", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando caja chica: " + error.message);
      return;
    }

    setGastos(data || []);
  }

  async function cargarFondos(idCondominio: string, nombreCondominio?: string) {
    if (!idCondominio && !nombreCondominio) return;

    let fondosData: CajaChicaFondo[] = [];

    if (idCondominio) {
      const { data, error } = await supabase
        .from("caja_chica_fondos")
        .select(
          "id, condominio_id, numero_fondo, condominio, fecha, tipo, monto, descripcion, responsable, created_at"
        )
        .eq("condominio_id", Number(idCondominio))
        .order("fecha", { ascending: false })
        .order("id", { ascending: false });

      if (error) {
        alert("Error cargando fondos de caja chica: " + error.message);
        setFondos([]);
        return;
      }

      fondosData = (data || []) as CajaChicaFondo[];
    }

    if (fondosData.length === 0 && nombreCondominio) {
      const { data, error } = await supabase
        .from("caja_chica_fondos")
        .select(
          "id, condominio_id, numero_fondo, condominio, fecha, tipo, monto, descripcion, responsable, created_at"
        )
        .ilike("condominio", `%${nombreCondominio}%`)
        .order("fecha", { ascending: false })
        .order("id", { ascending: false });

      if (error) {
        alert("Error cargando fondos de caja chica: " + error.message);
        setFondos([]);
        return;
      }

      fondosData = (data || []) as CajaChicaFondo[];
    }

    setFondos(fondosData);
  }

  async function refrescar() {
    if (!condominioId) return;
    await Promise.all([
      cargarGastos(condominio),
      cargarFondos(condominioId, condominio),
    ]);
  }

  async function obtenerNumeroFondo() {
    const { data, error } = await supabase.rpc(
      "obtener_proximo_numero_fondo_caja_chica",
      {
        p_condominio_id: Number(condominioId),
      }
    );

    if (error) {
      throw new Error("Error generando número de fondo: " + error.message);
    }

    return Number(data || 1);
  }

  async function guardarFondo(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominio || !fechaFondo || !montoFondo) {
      alert("Debe completar condominio, fecha y monto del fondo inicial.");
      return;
    }

    try {
      setGuardandoFondo(true);

      const numeroFondo = await obtenerNumeroFondo();

      const { error } = await supabase.from("caja_chica_fondos").insert([
        {
          condominio_id: Number(condominioId),
          numero_fondo: numeroFondo,
          condominio,
          fecha: fechaFondo,
          tipo: tipoFondo,
          monto: Number(montoFondo || 0),
          descripcion: descripcionFondo || "Fondo inicial de caja chica",
          responsable: responsableFondo,
        },
      ]);

      setGuardandoFondo(false);

      if (error) {
        alert("Error guardando fondo inicial: " + error.message);
        return;
      }

      alert(
        `Fondo inicial registrado correctamente. No. ${String(
          numeroFondo
        ).padStart(5, "0")}`
      );

      const hoy = new Date().toISOString().split("T")[0];

      setFechaFondo(hoy);
      setTipoFondo("fondo_inicial");
      setMontoFondo("");
      setResponsableFondo("");
      setDescripcionFondo("Fondo inicial de caja chica");

      cargarFondos(condominioId, condominio);
    } catch (err: any) {
      setGuardandoFondo(false);
      alert(err.message || "Error guardando fondo inicial.");
    }
  }

  async function subirFactura() {
    if (!facturaArchivo) return "";

    const extension = facturaArchivo.name.split(".").pop();
    const nombreArchivo = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

    const carpetaCondominio = condominioId || "general";
    const rutaArchivo = `${carpetaCondominio}/${nombreArchivo}`;

    const { error: uploadError } = await supabase.storage
      .from("facturas-caja-chica")
      .upload(rutaArchivo, facturaArchivo);

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from("facturas-caja-chica")
      .getPublicUrl(rutaArchivo);

    return data.publicUrl;
  }

  async function guardarGasto(e: React.FormEvent) {
    e.preventDefault();

    if (!condominio || !fecha || !concepto || !monto) {
      alert("Debe completar condominio, fecha, concepto y monto.");
      return;
    }

    const montoNumerico = Number(monto || 0);

    if (montoNumerico > disponibleCajaChica) {
      alert(
        `No se puede registrar este gasto porque supera el fondo disponible de caja chica.\n\nDisponible: RD$ ${dinero(
          disponibleCajaChica
        )}\nMonto gasto: RD$ ${dinero(montoNumerico)}\nDiferencia: RD$ ${dinero(
          montoNumerico - disponibleCajaChica
        )}`
      );
      return;
    }

    try {
      setGuardando(true);

      let facturaUrl = "";

      if (facturaArchivo) {
        facturaUrl = await subirFactura();
      }

      const { error } = await supabase.from("caja_chica").insert([
        {
          condominio,
          fecha,
          concepto,
          detalle_gasto: detalleGasto,
          monto: montoNumerico,
          responsable,
          comprobante,
          factura_url: facturaUrl,
          estado: "registrado",
          condominio_id: Number(condominioId),
        },
      ]);

      setGuardando(false);

      if (error) {
        alert("Error guardando gasto: " + error.message);
        return;
      }

      alert("Gasto de caja chica registrado correctamente.");

      const hoy = new Date().toISOString().split("T")[0];

      setFecha(hoy);
      setConcepto("");
      setDetalleGasto("");
      setMonto("");
      setResponsable("");
      setComprobante("");
      setFacturaArchivo(null);

      const inputFile = document.getElementById(
        "facturaArchivo"
      ) as HTMLInputElement | null;

      if (inputFile) inputFile.value = "";

      cargarGastos(condominio);
    } catch (err: any) {
      setGuardando(false);
      alert("Error subiendo factura: " + err.message);
    }
  }

  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.monto || 0), 0);
  const totalFondos = fondos.reduce((sum, f) => sum + Number(f.monto || 0), 0);
  const disponibleCajaChica = totalFondos - totalGastos;

  const ultimosGastos = useMemo(() => gastos.slice(0, 6), [gastos]);
  const ultimoFondo = fondos[0];

  return (
    <PageContainer>
      <ModuleMenu
        title="Caja Chica"
        subtitle="Movimientos, fondos, balance y reportes."
        tone="green"
        items={[
          { href: "/finanzas/caja-chica", label: "Dashboard", icon: BarChart3 },
          { href: "/caja-chica", label: "Movimientos", icon: Coins },
          { href: "/caja-chica/fondos", label: "Fondos", icon: BarChart3 },
          { href: "/caja-chica/balance", label: "Balance", icon: BarChart3 },
          { href: "/caja-chica/reporte", label: "Reportes", icon: FileSpreadsheet },
        ]}
      />

      <ModuleToolbar
        title="Movimiento de Caja Chica"
        subtitle={`Registro rápido de gastos menores. Condominio: ${
          condominio || "No seleccionado"
        }.`}
        icon={Coins}
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
            title="Registrar gasto"
            subtitle="Formulario principal para uso diario."
            action={
              <div
                className={`rounded-xl px-4 py-2 text-sm font-black ${
                  disponibleCajaChica >= 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                Disponible: RD$ {dinero(disponibleCajaChica)}
              </div>
            }
          >
            <form
              onSubmit={guardarGasto}
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <div>
                <label className="mb-1 block text-sm font-semibold">Fecha *</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Monto RD$ *</label>
                <input
                  type="number"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-3 ${
                    Number(monto || 0) > disponibleCajaChica
                      ? "border-red-300 bg-red-50"
                      : ""
                  }`}
                  placeholder="0.00"
                />

                {Number(monto || 0) > disponibleCajaChica && (
                  <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <p className="font-black">Monto supera el fondo disponible</p>
                    <p className="mt-1">
                      Disponible: RD$ {dinero(disponibleCajaChica)} · Monto:
                      RD$ {dinero(Number(monto || 0))} · Diferencia: RD${" "}
                      {dinero(Number(monto || 0) - disponibleCajaChica)}
                    </p>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold">Concepto *</label>
                <input
                  type="text"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                  placeholder="Ej. Compra de bombillos, limpieza, materiales..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Responsable</label>
                <input
                  type="text"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                  placeholder="Persona que realizó el gasto"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Comprobante / Factura
                </label>
                <input
                  type="text"
                  value={comprobante}
                  onChange={(e) => setComprobante(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                  placeholder="Número o referencia"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold">
                  Soporte del gasto
                </label>
                <input
                  id="facturaArchivo"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setFacturaArchivo(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border bg-white px-4 py-3"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold">
                  Detalle
                </label>
                <textarea
                  value={detalleGasto}
                  onChange={(e) => setDetalleGasto(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                  rows={3}
                  placeholder="Detalle breve del gasto realizado"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {guardando ? "Guardando..." : "Guardar gasto"}
                </button>
              </div>
            </form>
          </SectionCard>
        </section>

        <section className="space-y-5">
          <SectionCard
            title="Registrar Fondo"
            subtitle="Apertura inicial o reposición de caja chica."
          >
            <form onSubmit={guardarFondo} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Tipo de fondo
                </label>
                <select
                  value={tipoFondo}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setTipoFondo(valor);
                    setDescripcionFondo(
                      valor === "reposicion"
                        ? "Reposición de caja chica"
                        : "Fondo inicial de caja chica"
                    );
                  }}
                  className="w-full rounded-xl border bg-white px-4 py-3"
                >
                  <option value="fondo_inicial">Fondo inicial</option>
                  <option value="reposicion">Reposición</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Fecha</label>
                <input
                  type="date"
                  value={fechaFondo}
                  onChange={(e) => setFechaFondo(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Monto RD$
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={montoFondo}
                  onChange={(e) => setMontoFondo(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Responsable
                </label>
                <input
                  type="text"
                  value={responsableFondo}
                  onChange={(e) => setResponsableFondo(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                  placeholder="Responsable del fondo"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Descripción
                </label>
                <textarea
                  value={descripcionFondo}
                  onChange={(e) => setDescripcionFondo(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                  rows={2}
                  placeholder="Ej. Reposición de caja chica, fondo inicial, ajuste de fondo..."
                />
              </div>

              <button
                type="submit"
                disabled={guardandoFondo}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {guardandoFondo
                  ? "Guardando..."
                  : tipoFondo === "reposicion"
                  ? "Guardar reposición"
                  : "Guardar fondo inicial"}
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Resumen" subtitle="Estado actual de la caja.">
            <div className="space-y-3">
              <InfoLine label="Fondos" value={`RD$ ${dinero(totalFondos)}`} />
              <InfoLine label="Gastado" value={`RD$ ${dinero(totalGastos)}`} />
              <InfoLine
                label="Disponible"
                value={`RD$ ${dinero(disponibleCajaChica)}`}
                highlight
                danger={disponibleCajaChica < 0}
              />
              <InfoLine
                label="Último fondo"
                value={ultimoFondo ? fechaCorta(ultimoFondo.fecha) : "-"}
              />
            </div>
          </SectionCard>
        </section>
      </div>

      <SectionCard
        title="Últimos gastos"
        subtitle="Vista rápida. La consulta completa está en reportes."
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
          <p className="text-sm text-slate-500">Cargando registros...</p>
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
                <th className="px-4 py-3 text-left">Responsable</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-center">Factura</th>
                <th className="px-4 py-3 text-center">Reporte</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {ultimosGastos.map((g) => (
                <tr key={g.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3">{fechaCorta(g.fecha)}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{g.concepto}</p>
                    {g.detalle_gasto && (
                      <p className="mt-1 text-xs text-slate-500">
                        {g.detalle_gasto}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">{g.responsable || "-"}</td>
                  <td className="px-4 py-3 text-right font-black text-red-700">
                    RD$ {dinero(g.monto)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {g.factura_url ? (
                      <a
                        href={g.factura_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white"
                      >
                        Ver
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Sin factura</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/caja-chica/gastos/reporte/${g.id}`}
                      className="inline-block rounded-lg bg-purple-700 px-3 py-1 text-xs font-bold text-white hover:bg-purple-800"
                    >
                      Reporte
                    </Link>
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
    <div className="flex items-center justify-between rounded-xl border bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span
        className={`text-sm font-black ${
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
