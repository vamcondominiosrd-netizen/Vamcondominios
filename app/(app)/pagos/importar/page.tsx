"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Banknote,
  BarChart3,
  ClipboardCheck,
  CreditCard,
  Download,
  FileSpreadsheet,
  Landmark,
  RefreshCw,
  ReceiptText,
  UploadCloud,
  WalletCards,
  Coins,
  Settings,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type ParsedRow = {
  fecha: string | null;
  monto: number;
  referencia: string | null;
  descripcion: string | null;
};

function numero(valor: string | number | null | undefined) {
  return Number(valor || 0);
}

function dinero(valor: string | number | null | undefined) {
  return numero(valor).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatearFechaISO(date: Date) {
  const yyyy = String(date.getFullYear()).padStart(4, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function excelDateToISO(v: any): string | null {
  if (v == null || v === "") return null;

  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);

    if (!d) return null;

    const yyyy = String(d.y).padStart(4, "0");
    const mm = String(d.m).padStart(2, "0");
    const dd = String(d.d).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  }

  if (v instanceof Date) {
    return formatearFechaISO(v);
  }

  if (typeof v === "string") {
    const s = v.trim();

    if (!s) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    const partesSlash = s.split("/");

    if (partesSlash.length === 3) {
      const dd = partesSlash[0].padStart(2, "0");
      const mm = partesSlash[1].padStart(2, "0");
      const yyyy = partesSlash[2].length === 2 ? `20${partesSlash[2]}` : partesSlash[2];

      if (yyyy.length === 4) return `${yyyy}-${mm}-${dd}`;
    }

    const dt = new Date(s);

    if (!isNaN(dt.getTime())) return formatearFechaISO(dt);

    return s;
  }

  return String(v);
}

function limpiarTexto(valor: any) {
  return String(valor || "").trim();
}

function obtenerValor(r: any, columnas: string[]) {
  for (const columna of columnas) {
    if (r[columna] !== undefined && r[columna] !== null && r[columna] !== "") {
      return r[columna];
    }
  }

  return "";
}

export default function ImportarPagosBancoPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [clientId, setClientId] = useState(1);

  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errores, setErrores] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    const cliente =
      Number(localStorage.getItem("client_id") || "") ||
      Number(localStorage.getItem("cliente_id") || "") ||
      1;

    setCondominioId(id);
    setCondominioNombre(nombre);
    setClientId(cliente);

    if (!id || !Number(id)) {
      setMensaje("No se encontró el condominio activo.");
    }
  }, []);

  async function procesarArchivo(archivo: File | null) {
    setFile(archivo);
    setRows([]);
    setErrores([]);
    setMensaje("");

    if (!archivo) return;

    try {
      const buf = await archivo.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];

      if (!sheetName) {
        setMensaje("El archivo no tiene hojas válidas.");
        return;
      }

      const ws = wb.Sheets[sheetName];
      const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const erroresLectura: string[] = [];

      const parsed = raw
        .map((r, index) => {
          const fecha = excelDateToISO(
            obtenerValor(r, [
              "Fecha Posteo",
              "Fecha",
              "fecha",
              "FECHA",
              "Fecha Transacción",
              "Fecha Transaccion",
            ]),
          );

          const montoRaw = obtenerValor(r, [
            "Monto Transacción",
            "Monto Transaccion",
            "Monto",
            "monto",
            "MONTO",
            "Importe",
            "Valor",
          ]);

          const monto = Number(
            String(montoRaw || "")
              .replace(/,/g, "")
              .replace("RD$", "")
              .replace("$", "")
              .trim(),
          );

          const referenciaRaw = obtenerValor(r, [
            "No Serial",
            "No. Serial",
            "Serial",
            "No. Referencia",
            "No Referencia",
            "Referencia",
            "referencia",
            "REFERENCIA",
          ]);

          const descripcionRaw = obtenerValor(r, [
            "Descripción",
            "Descripcion",
            "descripcion",
            "DESCRIPCION",
            "Detalle",
            "Concepto",
          ]);

          if (!monto || isNaN(monto)) {
            erroresLectura.push(
              `Fila ${index + 2}: monto no válido o vacío.`,
            );
            return null;
          }

          return {
            fecha,
            monto,
            referencia: limpiarTexto(referenciaRaw) || null,
            descripcion: limpiarTexto(descripcionRaw) || null,
          } as ParsedRow;
        })
        .filter(Boolean) as ParsedRow[];

      setRows(parsed);
      setErrores(erroresLectura);

      if (parsed.length === 0) {
        setMensaje(
          "No se encontraron filas válidas. Revise las columnas Fecha Posteo, Monto Transacción, No Serial y Descripción.",
        );
        return;
      }

      setMensaje(
        `Archivo leído correctamente. ${parsed.length} transacción(es) válida(s).`,
      );
    } catch (error: any) {
      setMensaje(error?.message || "Error leyendo el archivo Excel.");
    }
  }

  async function handleUpload() {
    setMensaje("");

    const condominioIdNumero = Number(condominioId);

    if (!condominioIdNumero) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    if (!file) {
      setMensaje("Seleccione un archivo Excel primero.");
      return;
    }

    if (rows.length === 0) {
      setMensaje("No hay transacciones válidas para importar.");
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const uid = sessionData.session?.user?.id;

      if (!uid) {
        setLoading(false);
        setMensaje("No hay sesión activa. Inicie sesión y vuelva a intentar.");
        return;
      }

      const res = await fetch("/api/bank-import/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          condominio_id: condominioIdNumero,
          filename: file.name,
          uploaded_by: uid,
          rows,
        }),
      });

      const out = await res.json();

      if (!res.ok) {
        setLoading(false);
        setMensaje(out?.error || "Error subiendo archivo.");
        return;
      }

      setLoading(false);

      setMensaje(
        `Importación creada: #${out.import_id} | Transacciones: ${out.inserted_transactions} | Auto OK: ${out.auto_ok}`,
      );

      router.push(`/pagos/importar/${out.import_id}`);
    } catch (error: any) {
      setLoading(false);
      setMensaje(error?.message || "Error inesperado importando archivo.");
    }
  }

  function limpiar() {
    setFile(null);
    setRows([]);
    setErrores([]);
    setMensaje("");
  }

  function descargarPlantilla() {
    const data = [
      {
        "Fecha Posteo": "2026-07-01",
        "Monto Transacción": 4500,
        "No Serial": "123456789",
        Descripción: "PAGO MANTENIMIENTO APTO A1",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "plantilla_importacion_banco.xlsx");
  }

  const totalMonto = useMemo(() => {
    return rows.reduce((sum, row) => sum + numero(row.monto), 0);
  }, [rows]);

  const filasConReferencia = useMemo(() => {
    return rows.filter((row) => row.referencia).length;
  }, [rows]);

  return (
    <PageContainer>
      <ModuleMenu
        title="Finanzas"
        subtitle="Control financiero del condominio: pagos, gastos, solicitudes, caja chica, bancos, reportes y configuraciones."
        tone="blue"
        items={[
          {
            href: "/finanzas",
            label: "Inicio finanzas",
            icon: WalletCards,
          },
          {
            href: "/pagos-mantenimiento",
            label: "Pagos",
            icon: CreditCard,
          },
          {
            href: "/gastos",
            label: "Gastos",
            icon: ReceiptText,
          },
          {
            href: "/solicitudes-pago",
            label: "Solicitudes",
            icon: ClipboardCheck,
          },
          {
            href: "/banco",
            label: "Banco / Fondos",
            icon: Landmark,
          },
          {
            href: "/finanzas/caja-chica",
            label: "Caja chica",
            icon: Coins,
          },
          {
            href: "/reportes",
            label: "Reportes",
            icon: BarChart3,
          },
          {
            href: "/finanzas/configuraciones/presupuesto",
            label: "Presupuesto",
            icon: Banknote,
          },
        ]}
      />

      <ModuleToolbar
        title="Importar Pagos del Banco"
        subtitle={`Carga de archivo Excel bancario para identificar pagos de propietarios. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={UploadCloud}
        actions={
          <ModuleActions
            onRefresh={limpiar}
            extra={
              <button
                type="button"
                onClick={descargarPlantilla}
                className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Plantilla
              </button>
            }
          />
        }
      />

      {mensaje && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          {mensaje}
        </div>
      )}

      <SectionCard
        title="Archivo bancario"
        subtitle="Seleccione el Excel descargado del banco. El sistema leerá las transacciones antes de crear la importación."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Subiendo
            </div>
          ) : (
            <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">
              {rows.length} fila(s)
            </span>
          )
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Condominio activo
            </label>
            <input
              value={condominioNombre || `ID ${condominioId || "-"}`}
              readOnly
              className="w-full rounded-xl border bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Condominio ID
            </label>
            <input
              value={condominioId || "-"}
              readOnly
              className="w-full rounded-xl border bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Archivo Excel
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => procesarArchivo(e.target.files?.[0] || null)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleUpload}
            disabled={loading || !file || rows.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
          >
            <UploadCloud className="h-4 w-4" />
            Subir Excel y crear importación
          </button>

          <button
            type="button"
            onClick={limpiar}
            className="rounded-xl bg-slate-700 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
          >
            Limpiar
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Resumen del archivo"
        subtitle="Totales detectados en la vista previa del Excel."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <InfoCompacta label="Filas válidas" value={`${rows.length}`} />

          <InfoCompacta
            label="Monto total"
            value={`RD$ ${dinero(totalMonto)}`}
          />

          <InfoCompacta
            label="Con referencia"
            value={`${filasConReferencia}`}
          />

          <InfoCompacta
            label="Errores detectados"
            value={`${errores.length}`}
          />
        </div>
      </SectionCard>

      {errores.length > 0 && (
        <SectionCard
          title="Observaciones de lectura"
          subtitle="Filas ignoradas o con datos incompletos."
        >
          <div className="max-h-64 overflow-auto rounded-2xl border bg-slate-50 p-4">
            <ul className="space-y-1 text-sm text-slate-600">
              {errores.slice(0, 50).map((error, index) => (
                <li key={`${error}-${index}`}>• {error}</li>
              ))}
            </ul>

            {errores.length > 50 && (
              <p className="mt-3 text-sm font-bold text-slate-500">
                Hay más observaciones no mostradas.
              </p>
            )}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Vista previa de transacciones"
        subtitle="Revise las primeras transacciones antes de crear la importación."
      >
        {rows.length === 0 ? (
          <EmptyState
            title="Sin transacciones"
            description="Seleccione un archivo Excel para ver la vista previa."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Referencia / Serial</th>
                <th className="px-4 py-3 text-left">Descripción</th>
                <th className="px-4 py-3 text-right">Monto</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {rows.slice(0, 25).map((row, index) => (
                <tr key={`${row.referencia || "sin-ref"}-${index}`}>
                  <td className="px-4 py-3 font-bold">
                    {row.fecha || "-"}
                  </td>

                  <td className="px-4 py-3">
                    {row.referencia || "-"}
                  </td>

                  <td className="min-w-80 px-4 py-3 text-sm text-slate-600">
                    {row.descripcion || "-"}
                  </td>

                  <td className="px-4 py-3 text-right font-black text-blue-700">
                    RD$ {dinero(row.monto)}
                  </td>
                </tr>
              ))}

              <tr className="bg-slate-100 font-black">
                <td className="px-4 py-3" colSpan={3}>
                  Total archivo
                </td>

                <td className="px-4 py-3 text-right text-blue-700">
                  RD$ {dinero(totalMonto)}
                </td>
              </tr>
            </tbody>
          </DataTable>
        )}

        {rows.length > 25 && (
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Mostrando las primeras 25 filas de {rows.length} transacciones.
          </p>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function InfoCompacta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <h3 className="mt-1 text-lg font-black text-slate-900">{value}</h3>
    </div>
  );
}