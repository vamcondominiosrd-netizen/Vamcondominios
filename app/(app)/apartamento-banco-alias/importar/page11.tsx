"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Download,
  FileSpreadsheet,
  Filter,
  ListChecks,
  RefreshCw,
  Save,
  Search,
  SearchCheck,
  UploadCloud,
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

type BancoRow = {
  condominio_id: number;
  condominio: string;
  fecha_posteo: string;
  monto_transaccion: number;
  no_serial: string;
  descripcion: string;
  estado: string;
};

type BancoGuardado = {
  id: number;
  condominio_id: number;
  condominio: string;
  fecha_posteo: string;
  monto_transaccion: number;
  no_serial: string;
  descripcion: string;
  estado: string;
};

function obtenerValor(row: any, posiblesNombres: string[]) {
  const keys = Object.keys(row);

  for (const nombre of posiblesNombres) {
    const key = keys.find(
      (k) => k.trim().toLowerCase() === nombre.trim().toLowerCase(),
    );

    if (key) return row[key];
  }

  return "";
}

function normalizarFecha(value: any): string {
  if (!value) return "";

  if (typeof value === "number") {
    const fecha = XLSX.SSF.parse_date_code(value);

    if (!fecha) return "";

    const yyyy = fecha.y;
    const mm = String(fecha.m).padStart(2, "0");
    const dd = String(fecha.d).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  }

  const texto = String(value).trim();

  if (!texto) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    const [dd, mm, yyyy] = texto.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(texto)) {
    const [dd, mm, yyyy] = texto.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }

  const d = new Date(texto);

  if (Number.isNaN(d.getTime())) return "";

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function normalizarMonto(value: any): number {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") return value;

  const limpio = String(value)
    .replace("RD$", "")
    .replace("$", "")
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .trim();

  const numero = Number(limpio);

  return Number.isNaN(numero) ? 0 : numero;
}

function limpiarTexto(value: any) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatearMoneda(valor: number | null | undefined) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(valor || 0));
}

function claveTransaccion(row: {
  condominio_id: number;
  fecha_posteo: string;
  monto_transaccion: number;
  no_serial: string;
  descripcion: string;
}) {
  return [
    row.condominio_id,
    row.fecha_posteo || "",
    Number(row.monto_transaccion || 0).toFixed(2),
    limpiarTexto(row.no_serial || "").toLowerCase(),
    limpiarTexto(row.descripcion || "").toLowerCase(),
  ].join("|");
}

function obtenerRangoMes(mes: string) {
  if (!mes) return null;

  const [year, month] = mes.split("-").map(Number);

  if (!year || !month) return null;

  const desde = `${year}-${String(month).padStart(2, "0")}-01`;

  const siguienteMes = month === 12 ? 1 : month + 1;
  const siguienteYear = month === 12 ? year + 1 : year;

  const hasta = `${siguienteYear}-${String(siguienteMes).padStart(2, "0")}-01`;

  return { desde, hasta };
}

function fechaCorta(valor?: string | null) {
  if (!valor) return "-";
  return String(valor).split("T")[0];
}

export default function ImportarArchivoBancoPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [rows, setRows] = useState<BancoRow[]>([]);
  const [guardados, setGuardados] = useState<BancoGuardado[]>([]);

  const [loading, setLoading] = useState(false);
  const [cargandoGuardados, setCargandoGuardados] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  const [mesFiltro, setMesFiltro] = useState(() => {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
  });

  const [duplicadosInternos, setDuplicadosInternos] = useState(0);
  const [duplicadosExistentes, setDuplicadosExistentes] = useState(0);
  const [nombreArchivoActual, setNombreArchivoActual] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
    }
  }, []);

  useEffect(() => {
    if (condominioId) {
      cargarGuardados(condominioId, mesFiltro);
    }
  }, [condominioId, mesFiltro]);

  async function cargarGuardados(id: string, mes: string) {
    if (!id) return;

    setCargandoGuardados(true);

    let query = supabase
      .from("archivo_banco")
      .select(
        "id, condominio_id, condominio, fecha_posteo, monto_transaccion, no_serial, descripcion, estado",
      )
      .eq("condominio_id", Number(id))
      .order("fecha_posteo", { ascending: false })
      .order("id", { ascending: false });

    const rango = obtenerRangoMes(mes);

    if (rango) {
      query = query.gte("fecha_posteo", rango.desde).lt("fecha_posteo", rango.hasta);
    }

    const { data, error } = await query;

    setCargandoGuardados(false);

    if (error) {
      alert("Error cargando archivo banco: " + error.message);
      setGuardados([]);
      return;
    }

    setGuardados((data as BancoGuardado[]) || []);
  }

  async function refrescar() {
    if (!condominioId) return;
    await cargarGuardados(condominioId, mesFiltro);
  }

  function descargarPlantilla() {
    const data = [
      {
        "Fecha Posteo": "",
        "Monto Transacción": "",
        "No Serial": "",
        Descripción: "",
      },
      {
        "Fecha Posteo": "2026-06-01",
        "Monto Transacción": 4500,
        "No Serial": "EJEMPLO-001",
        Descripción: "Pago mantenimiento A1",
      },
    ];

    const hoja = XLSX.utils.json_to_sheet(data);
    const libro = XLSX.utils.book_new();

    hoja["!cols"] = [
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 45 },
    ];

    XLSX.utils.book_append_sheet(libro, hoja, "Plantilla Banco");
    XLSX.writeFile(libro, "plantilla-importacion-banco.xlsx");
  }

  async function verificarDuplicadosExistentes(registros: BancoRow[]) {
    if (!condominioId) return 0;

    const { data, error } = await supabase
      .from("archivo_banco")
      .select("id, condominio_id, fecha_posteo, monto_transaccion, no_serial, descripcion")
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error verificando duplicados: " + error.message);
      return 0;
    }

    const clavesExistentes = new Set(
      ((data as any[]) || []).map((item) =>
        claveTransaccion({
          condominio_id: Number(item.condominio_id),
          fecha_posteo: item.fecha_posteo || "",
          monto_transaccion: Number(item.monto_transaccion || 0),
          no_serial: item.no_serial || "",
          descripcion: item.descripcion || "",
        }),
      ),
    );

    const duplicados = registros.filter((row) =>
      clavesExistentes.has(claveTransaccion(row)),
    ).length;

    return duplicados;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    setNombreArchivoActual(file.name);
    setDuplicadosInternos(0);
    setDuplicadosExistentes(0);
    setRows([]);

    const reader = new FileReader();

    reader.onload = async (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const json: any[] = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: true,
      });

      const mappedRaw: BancoRow[] = json
        .map((r) => {
          const fecha = normalizarFecha(
            obtenerValor(r, [
              "Fecha Posteo",
              "Fecha",
              "Fecha Transaccion",
              "Fecha Transacción",
              "Fecha Movimiento",
              "Fecha Banco",
              "Fecha Pago",
            ]),
          );

          const monto = normalizarMonto(
            obtenerValor(r, [
              "Monto Transacción",
              "Monto Transaccion",
              "Monto",
              "Monto Pagado",
              "Valor",
              "Importe",
              "Credito",
              "Crédito",
              "Deposito",
              "Depósito",
            ]),
          );

          const serial = limpiarTexto(
            obtenerValor(r, [
              "No Serial",
              "No. Serial",
              "Serial",
              "Referencia",
              "Referencia Banco",
              "Documento",
              "No Documento",
            ]),
          );

          const descripcion = limpiarTexto(
            obtenerValor(r, [
              "Descripción",
              "Descripcion",
              "Descripcion Banco",
              "Descripción Banco",
              "Detalle",
              "Concepto",
              "Concepto Banco",
              "Comentario",
            ]),
          );

          return {
            condominio_id: Number(condominioId),
            condominio: condominioNombre,
            fecha_posteo: fecha,
            monto_transaccion: monto,
            no_serial: serial,
            descripcion,
            estado: "Revisar",
          };
        })
        .filter((r) => r.fecha_posteo && r.descripcion);

      const mapa = new Map<string, BancoRow>();

      mappedRaw.forEach((row) => {
        mapa.set(claveTransaccion(row), row);
      });

      const mapped = Array.from(mapa.values());

      const duplicadosDentroArchivo = mappedRaw.length - mapped.length;
      setDuplicadosInternos(duplicadosDentroArchivo);

      const duplicadosBD = await verificarDuplicadosExistentes(mapped);
      setDuplicadosExistentes(duplicadosBD);

      setRows(mapped);

      if (mapped.length === 0) {
        alert(
          "El archivo no contiene registros válidos. Verifique que tenga Fecha Posteo, Monto Transacción, No Serial y Descripción.",
        );
        return;
      }

      if (duplicadosBD === mapped.length) {
        alert(
          "ALERTA: Este archivo parece que ya fue subido anteriormente. Todos los registros ya existen en el sistema.",
        );
      } else if (duplicadosBD > 0) {
        alert(
          `ALERTA: Se encontraron ${duplicadosBD} registros que ya existen. El sistema solo importará los registros nuevos.`,
        );
      }
    };

    reader.readAsArrayBuffer(file);
  }

  async function guardarEnSupabase() {
    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    if (rows.length === 0) {
      alert("No hay datos para importar.");
      return;
    }

    setLoading(true);

    const { data: existentes, error: errorExistentes } = await supabase
      .from("archivo_banco")
      .select("id, condominio_id, fecha_posteo, monto_transaccion, no_serial, descripcion")
      .eq("condominio_id", Number(condominioId));

    if (errorExistentes) {
      setLoading(false);
      alert("Error verificando duplicados: " + errorExistentes.message);
      return;
    }

    const clavesExistentes = new Set(
      ((existentes as any[]) || []).map((item) =>
        claveTransaccion({
          condominio_id: Number(item.condominio_id),
          fecha_posteo: item.fecha_posteo || "",
          monto_transaccion: Number(item.monto_transaccion || 0),
          no_serial: item.no_serial || "",
          descripcion: item.descripcion || "",
        }),
      ),
    );

    const registrosNuevos = rows.filter(
      (row) => !clavesExistentes.has(claveTransaccion(row)),
    );

    if (registrosNuevos.length === 0) {
      setLoading(false);
      alert(
        "ALERTA: Este archivo ya fue subido anteriormente. No se importó ningún registro duplicado.",
      );
      return;
    }

    const confirmar = confirm(
      `Archivo: ${nombreArchivoActual || "Sin nombre"}\n\n` +
        `Condominio: ${condominioNombre}\n` +
        `Registros del archivo actual: ${rows.length}\n` +
        `Registros nuevos a importar: ${registrosNuevos.length}\n` +
        `Duplicados omitidos: ${rows.length - registrosNuevos.length}\n\n` +
        `¿Desea continuar?`,
    );

    if (!confirmar) {
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("archivo_banco").insert(registrosNuevos);

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Error al guardar los datos: " + error.message);
      return;
    }

    alert("Archivo del banco importado correctamente.");

    setRows([]);
    setDuplicadosInternos(0);
    setDuplicadosExistentes(0);
    setNombreArchivoActual("");

    cargarGuardados(condominioId, mesFiltro);
  }

  const guardadosFiltrados = useMemo(() => {
    return guardados.filter((item) => {
      const texto = `${item.fecha_posteo || ""} ${item.monto_transaccion || ""} ${
        item.no_serial || ""
      } ${item.descripcion || ""} ${item.estado || ""}`
        .toLowerCase()
        .trim();

      const coincideBusqueda = texto.includes(busqueda.toLowerCase().trim());

      const estadoReal = item.estado || "Revisar";

      const coincideEstado =
        filtroEstado === "Todos" ? true : estadoReal === filtroEstado;

      return coincideBusqueda && coincideEstado;
    });
  }, [guardados, busqueda, filtroEstado]);

  function exportarExcel() {
    const data = guardadosFiltrados.map((item) => ({
      Condominio: item.condominio || condominioNombre,
      Fecha: item.fecha_posteo || "",
      Monto: Number(item.monto_transaccion || 0),
      "No Serial": item.no_serial || "",
      Descripción: item.descripcion || "",
      Estado: item.estado || "Revisar",
    }));

    if (data.length === 0) {
      alert("No hay información para exportar.");
      return;
    }

    const hoja = XLSX.utils.json_to_sheet(data);
    const libro = XLSX.utils.book_new();

    hoja["!cols"] = [
      { wch: 35 },
      { wch: 15 },
      { wch: 18 },
      { wch: 18 },
      { wch: 45 },
      { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(libro, hoja, "Archivo Banco");

    const nombreArchivo = `archivo-banco-${condominioNombre || "condominio"}-${
      mesFiltro || "todos"
    }`
      .replace(/\s+/g, "-")
      .toLowerCase();

    XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
  }

  const totalPreview = rows.length;

  const montoPreview = rows.reduce(
    (sum, item) => sum + Number(item.monto_transaccion || 0),
    0,
  );

  const registrosNuevosPreview = Math.max(totalPreview - duplicadosExistentes, 0);

  const totalGuardados = guardados.length;

  const totalRevisar = guardados.filter(
    (item) => (item.estado || "Revisar") === "Revisar",
  ).length;

  const totalIdentificados = guardados.filter(
    (item) => item.estado === "Identificado",
  ).length;

  const montoGuardado = guardadosFiltrados.reduce(
    (sum, item) => sum + Number(item.monto_transaccion || 0),
    0,
  );

  return (
    <PageContainer>
      <ModuleMenu
        title="Pagos Bancarios"
        subtitle="Importación, identificación y validación de pagos."
        tone="blue"
        items={[
          {
            href: "/importar-banco",
            label: "Importar banco",
            icon: Banknote,
          },
          {
            href: "/identificar-pagos",
            label: "Identificar pagos",
            icon: SearchCheck,
          },
          {
            href: "/pagos-identificados",
            label: "Pagos identificados",
            icon: ListChecks,
          },
        ]}
      />

      <ModuleToolbar
        title="Importar Archivo del Banco"
        subtitle={`Carga de archivo bancario para identificación de pagos. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={UploadCloud}
        actions={
          <ModuleActions
            onRefresh={refrescar}
            extra={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={descargarPlantilla}
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Plantilla
                </button>

                <button
                  type="button"
                  onClick={exportarExcel}
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar
                </button>
              </div>
            }
          />
        }
      />

      {!condominioId && (
        <SectionCard
          title="Condominio no identificado"
          subtitle="No se encontró el condominio activo."
        >
          <EmptyState
            title="Debe iniciar sesión nuevamente"
            description="El sistema no pudo identificar el condominio activo para importar el archivo del banco."
          />
        </SectionCard>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="xl:col-span-2">
          <SectionCard
            title="Cargar archivo del banco"
            subtitle="Seleccione un archivo Excel o CSV para revisar antes de guardar."
            action={
              <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                {nombreArchivoActual || "Sin archivo seleccionado"}
              </div>
            }
          >
            <div className="space-y-5">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <UploadCloud className="mt-1 h-5 w-5 text-blue-700" />

                  <div>
                    <p className="text-sm font-black uppercase text-blue-800">
                      Importación bancaria
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      El sistema mostrará una vista previa antes de guardar y
                      validará duplicados contra registros ya importados.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Seleccionar archivo Excel o CSV
                </label>

                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFile}
                  className="block w-full rounded-xl border bg-white px-4 py-3 text-sm"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Columnas requeridas: Fecha Posteo, Monto Transacción, No
                  Serial y Descripción.
                </p>
              </div>

              {rows.length > 0 && (
                <button
                  type="button"
                  onClick={guardarEnSupabase}
                  disabled={loading || registrosNuevosPreview === 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {loading ? "Guardando..." : "Guardar en Archivo Banco"}
                </button>
              )}
            </div>
          </SectionCard>
        </section>

        <section className="space-y-5">
          <SectionCard title="Condominio activo" subtitle="Importación actual.">
            <div className="space-y-3">
              <InfoLine label="Condominio" value={condominioNombre || "No identificado"} />
              <InfoLine label="Mes consultado" value={mesFiltro || "Todos"} />
              <InfoLine label="Registros guardados" value={`${totalGuardados}`} />
              <InfoLine
                label="Monto visible"
                value={formatearMoneda(montoGuardado)}
                highlight
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Plantilla"
            subtitle="Archivo base para importar correctamente."
          >
            <button
              type="button"
              onClick={descargarPlantilla}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800"
            >
              <Download className="h-4 w-4" />
              Descargar plantilla Excel
            </button>
          </SectionCard>
        </section>
      </div>

      {rows.length > 0 && (
        <section className="space-y-5">
          <SectionCard
            title="Revisión previa del archivo actual"
            subtitle={`Archivo seleccionado: ${nombreArchivoActual || "Sin nombre"}`}
            action={
              duplicadosExistentes > 0 ? (
                <div className="inline-flex items-center gap-2 rounded-xl bg-yellow-50 px-4 py-2 text-sm font-black text-yellow-700">
                  <AlertTriangle className="h-4 w-4" />
                  Duplicados: {duplicadosExistentes}
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                  Sin duplicados existentes
                </div>
              )
            }
          >
            <div className="space-y-4">
              {duplicadosExistentes === rows.length && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                  ALERTA: Este archivo parece que ya fue subido anteriormente.
                  No se recomienda volver a importarlo.
                </div>
              )}

              {duplicadosExistentes > 0 && duplicadosExistentes < rows.length && (
                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-bold text-yellow-700">
                  ALERTA: Hay registros duplicados. El sistema solo importará
                  los registros nuevos.
                </div>
              )}

              {duplicadosInternos > 0 && (
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-bold text-orange-700">
                  Se encontraron {duplicadosInternos} registros repetidos dentro
                  del mismo archivo y fueron omitidos en la vista previa.
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <InfoBox label="Registros" value={`${totalPreview}`} />
                <InfoBox
                  label="Nuevos"
                  value={`${registrosNuevosPreview}`}
                  tone="emerald"
                />
                <InfoBox
                  label="Duplicados"
                  value={`${duplicadosExistentes}`}
                  tone="red"
                />
                <InfoBox
                  label="Monto total"
                  value={formatearMoneda(montoPreview)}
                  tone="blue"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Vista previa del archivo actual"
            subtitle="Estos registros se guardarán con estado inicial Revisar."
          >
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Condominio</th>
                  <th className="px-4 py-3 text-left">Fecha Posteo</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-left">No Serial</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {rows.map((r, i) => (
                  <tr key={i} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold">{r.condominio}</td>
                    <td className="px-4 py-3 font-bold">{fechaCorta(r.fecha_posteo)}</td>
                    <td className="px-4 py-3 text-right font-black">
                      {formatearMoneda(r.monto_transaccion)}
                    </td>
                    <td className="px-4 py-3">{r.no_serial || "-"}</td>
                    <td className="max-w-[420px] truncate px-4 py-3">
                      {r.descripcion}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-black text-yellow-700">
                        {r.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </SectionCard>
        </section>
      )}

      <SectionCard
        title="Archivos del banco importados"
        subtitle="Consulta las transacciones ya importadas por mes, estado y búsqueda."
        action={
          cargandoGuardados ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : (
            <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
              Registros: {guardadosFiltrados.length}
            </div>
          )
        }
      >
        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
          <InfoBox label="Total del mes" value={`${totalGuardados}`} />
          <InfoBox label="En revisar" value={`${totalRevisar}`} tone="yellow" />
          <InfoBox
            label="Identificados"
            value={`${totalIdentificados}`}
            tone="emerald"
          />
          <InfoBox
            label="Monto visible"
            value={formatearMoneda(montoGuardado)}
            tone="blue"
          />
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Mes</label>
            <input
              type="month"
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="Todos">Todos</option>
              <option value="Revisar">Revisar</option>
              <option value="Identificado">Identificado</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold">Buscar</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-xl border px-10 py-3 text-sm"
                placeholder="Fecha, descripción, serial..."
              />
            </div>
          </div>
        </div>

        {cargandoGuardados ? (
          <p className="text-sm text-slate-500">Cargando archivo banco...</p>
        ) : guardadosFiltrados.length === 0 ? (
          <EmptyState
            title="Sin registros"
            description="No hay registros del banco cargados para esta consulta."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-left">No Serial</th>
                <th className="px-4 py-3 text-left">Descripción</th>
                <th className="px-4 py-3 text-center">Estado</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {guardadosFiltrados.map((item) => (
                <tr key={item.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold">
                    {fechaCorta(item.fecha_posteo)}
                  </td>

                  <td className="px-4 py-3 text-right font-black">
                    {formatearMoneda(item.monto_transaccion)}
                  </td>

                  <td className="px-4 py-3">{item.no_serial || "-"}</td>

                  <td className="max-w-[520px] truncate px-4 py-3">
                    {item.descripcion || "-"}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        item.estado === "Identificado"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {item.estado || "Revisar"}
                    </span>
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

function InfoBox({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "red" | "blue" | "yellow";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "red"
        ? "bg-red-50 text-red-700 border-red-100"
        : tone === "blue"
          ? "bg-blue-50 text-blue-700 border-blue-100"
          : tone === "yellow"
            ? "bg-yellow-50 text-yellow-700 border-yellow-100"
            : "bg-white text-slate-800 border-slate-200";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2 className="mt-2 text-2xl font-black">{value}</h2>
    </div>
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
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span
        className={`text-right text-sm font-black ${
          highlight ? "text-blue-700" : "text-slate-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}