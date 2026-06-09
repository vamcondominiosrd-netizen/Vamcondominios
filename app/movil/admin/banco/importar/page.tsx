"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type BancoRow = {
  condominio_id: number;
  condominio: string;
  fecha_posteo: string;
  monto_transaccion: number;
  no_serial: string;
  descripcion: string;
  estado: string;
};

function limpiarTexto(value: any) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function obtenerValor(row: any, posiblesNombres: string[]) {
  const keys = Object.keys(row);

  for (const nombre of posiblesNombres) {
    const key = keys.find(
      (k) => k.trim().toLowerCase() === nombre.trim().toLowerCase()
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

function formatearMoneda(valor: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(valor || 0));
}

function claveTransaccion(row: BancoRow) {
  return [
    row.condominio_id,
    row.fecha_posteo || "",
    Number(row.monto_transaccion || 0).toFixed(2),
    limpiarTexto(row.no_serial || "").toLowerCase(),
    limpiarTexto(row.descripcion || "").toLowerCase(),
  ].join("|");
}

export default function MobileImportarBancoPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [rows, setRows] = useState<BancoRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [nombreArchivo, setNombreArchivo] = useState("");
  const [duplicadosExistentes, setDuplicadosExistentes] = useState(0);
  const [duplicadosInternos, setDuplicadosInternos] = useState(0);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);
  }, []);

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

    XLSX.utils.book_append_sheet(libro, hoja, "Plantilla Banco");

    XLSX.writeFile(libro, "plantilla-importacion-banco.xlsx");
  }

  async function verificarDuplicadosExistentes(registros: BancoRow[]) {
    if (!condominioId) return 0;

    const { data, error } = await supabase
      .from("archivo_banco")
      .select(
        "id, condominio_id, fecha_posteo, monto_transaccion, no_serial, descripcion"
      )
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error verificando duplicados: " + error.message);
      return 0;
    }

    const clavesExistentes = new Set(
      ((data as any[]) || []).map((item) =>
        [
          item.condominio_id,
          item.fecha_posteo || "",
          Number(item.monto_transaccion || 0).toFixed(2),
          limpiarTexto(item.no_serial || "").toLowerCase(),
          limpiarTexto(item.descripcion || "").toLowerCase(),
        ].join("|")
      )
    );

    return registros.filter((row) =>
      clavesExistentes.has(claveTransaccion(row))
    ).length;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    setNombreArchivo(file.name);
    setRows([]);
    setDuplicadosExistentes(0);
    setDuplicadosInternos(0);

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
            ])
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
            ])
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
            ])
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
            ])
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

      const registrosUnicos = Array.from(mapa.values());

      setDuplicadosInternos(mappedRaw.length - registrosUnicos.length);

      const duplicadosBD = await verificarDuplicadosExistentes(registrosUnicos);

      setDuplicadosExistentes(duplicadosBD);
      setRows(registrosUnicos);

      if (registrosUnicos.length === 0) {
        alert("El archivo no contiene registros válidos.");
        return;
      }

      if (duplicadosBD === registrosUnicos.length) {
        alert("ALERTA: Este archivo parece que ya fue subido anteriormente.");
      } else if (duplicadosBD > 0) {
        alert(
          `ALERTA: Hay ${duplicadosBD} registros duplicados. Solo se importarán los nuevos.`
        );
      }
    };

    reader.readAsArrayBuffer(file);
  }

  async function guardarArchivoBanco() {
    if (!condominioId || rows.length === 0) {
      alert("No hay datos para guardar.");
      return;
    }

    setLoading(true);

    const { data: existentes, error: errorExistentes } = await supabase
      .from("archivo_banco")
      .select(
        "id, condominio_id, fecha_posteo, monto_transaccion, no_serial, descripcion"
      )
      .eq("condominio_id", Number(condominioId));

    if (errorExistentes) {
      setLoading(false);
      alert("Error verificando duplicados: " + errorExistentes.message);
      return;
    }

    const clavesExistentes = new Set(
      ((existentes as any[]) || []).map((item) =>
        [
          item.condominio_id,
          item.fecha_posteo || "",
          Number(item.monto_transaccion || 0).toFixed(2),
          limpiarTexto(item.no_serial || "").toLowerCase(),
          limpiarTexto(item.descripcion || "").toLowerCase(),
        ].join("|")
      )
    );

    const registrosNuevos = rows.filter(
      (row) => !clavesExistentes.has(claveTransaccion(row))
    );

    if (registrosNuevos.length === 0) {
      setLoading(false);
      alert("Este archivo ya fue subido. No se importó ningún registro.");
      return;
    }

    const confirmar = confirm(
      `Archivo: ${nombreArchivo}\n\n` +
        `Registros del archivo: ${rows.length}\n` +
        `Registros nuevos: ${registrosNuevos.length}\n` +
        `Duplicados omitidos: ${rows.length - registrosNuevos.length}\n\n` +
        `¿Desea guardar?`
    );

    if (!confirmar) {
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("archivo_banco")
      .insert(registrosNuevos);

    setLoading(false);

    if (error) {
      alert("Error guardando archivo banco: " + error.message);
      return;
    }

    alert("Archivo del banco importado correctamente.");

    setRows([]);
    setNombreArchivo("");
    setDuplicadosExistentes(0);
    setDuplicadosInternos(0);
  }

  const montoTotal = rows.reduce(
    (total, item) => total + Number(item.monto_transaccion || 0),
    0
  );

  const registrosNuevos = Math.max(rows.length - duplicadosExistentes, 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-blue-700 text-white rounded-b-3xl p-5 shadow-md">
        <Link href="/mobile/admin/banco" className="text-sm opacity-90">
          ← Volver a Banco
        </Link>

        <h1 className="text-2xl font-black mt-3">
          Importar Banco
        </h1>

        <p className="text-sm opacity-90 mt-1">
          {condominioNombre || "Condominio no identificado"}
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <h2 className="font-black text-slate-900">
            Plantilla del banco
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Descarga la plantilla para completar los datos correctamente.
          </p>

          <button
            onClick={descargarPlantilla}
            className="mt-3 w-full bg-green-700 text-white py-3 rounded-xl font-bold"
          >
            Descargar plantilla
          </button>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <h2 className="font-black text-slate-900">
            Subir archivo
          </h2>

          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFile}
            className="mt-3 block w-full border rounded-xl px-3 py-3 text-sm"
          />

          {nombreArchivo && (
            <p className="text-xs text-slate-500 mt-2">
              Archivo seleccionado: {nombreArchivo}
            </p>
          )}
        </div>

        {rows.length > 0 && (
          <>
            <div
              className={`rounded-2xl border p-4 ${
                duplicadosExistentes === rows.length
                  ? "bg-red-50 border-red-200"
                  : duplicadosExistentes > 0
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <h2 className="font-black text-slate-900">
                Vista previa del archivo actual
              </h2>

              <p className="text-sm mt-1">
                El sistema muestra solo el archivo cargado antes de guardarlo.
              </p>

              {duplicadosExistentes === rows.length && (
                <p className="text-sm text-red-700 font-bold mt-2">
                  Este archivo parece que ya fue subido anteriormente.
                </p>
              )}

              {duplicadosExistentes > 0 && duplicadosExistentes < rows.length && (
                <p className="text-sm text-yellow-700 font-bold mt-2">
                  Hay registros duplicados. Solo se guardarán los nuevos.
                </p>
              )}

              {duplicadosInternos > 0 && (
                <p className="text-sm text-orange-700 font-bold mt-2">
                  Se omitieron {duplicadosInternos} registros repetidos dentro
                  del mismo archivo.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-slate-500">Registros</p>
                <h3 className="text-2xl font-black">{rows.length}</h3>
              </div>

              <div className="bg-white border rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-slate-500">Nuevos</p>
                <h3 className="text-2xl font-black text-green-700">
                  {registrosNuevos}
                </h3>
              </div>

              <div className="bg-white border rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-slate-500">Duplicados</p>
                <h3 className="text-2xl font-black text-red-700">
                  {duplicadosExistentes}
                </h3>
              </div>

              <div className="bg-white border rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-slate-500">Monto total</p>
                <h3 className="text-lg font-black text-blue-700">
                  {formatearMoneda(montoTotal)}
                </h3>
              </div>
            </div>

            <button
              onClick={guardarArchivoBanco}
              disabled={loading || registrosNuevos === 0}
              className="w-full bg-blue-700 text-white py-3 rounded-xl font-bold disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Guardar archivo banco"}
            </button>

            <div className="space-y-3">
              {rows.map((item, index) => (
                <div
                  key={index}
                  className="bg-white border rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Fecha</p>
                      <p className="font-bold">{item.fecha_posteo}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-500">Monto</p>
                      <p className="font-black text-blue-700">
                        {formatearMoneda(item.monto_transaccion)}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mt-3">Descripción</p>

                  <p className="text-sm font-semibold line-clamp-2">
                    {item.descripcion}
                  </p>

                  <p className="text-xs text-slate-500 mt-2">
                    Serial: {item.no_serial || "-"}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}