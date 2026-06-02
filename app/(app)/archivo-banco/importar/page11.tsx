"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/app/lib/supabaseClient";

type BancoRow = {
  condominio_id: number;
  condominio: string;
  fecha_posteo: string | null;
  monto_transaccion: number;
  no_serial: string;
  descripcion: string;
  estado: string;
};

export default function ImportarArchivoBancoPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [rows, setRows] = useState<BancoRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);
  }, []);

  function normalizarTexto(value: any) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  function normalizarMonto(value: any) {
    if (value === null || value === undefined || value === "") return 0;

    if (typeof value === "number") return value;

    const texto = String(value)
      .replace("RD$", "")
      .replace("$", "")
      .replace(/,/g, "")
      .trim();

    const numero = Number(texto);

    return isNaN(numero) ? 0 : numero;
  }

  function normalizarFecha(value: any) {
    if (!value) return null;

    if (typeof value === "number") {
      const fecha = XLSX.SSF.parse_date_code(value);

      if (!fecha) return null;

      const yyyy = fecha.y;
      const mm = String(fecha.m).padStart(2, "0");
      const dd = String(fecha.d).padStart(2, "0");

      return `${yyyy}-${mm}-${dd}`;
    }

    const d = new Date(value);

    if (isNaN(d.getTime())) return null;

    return d.toISOString().slice(0, 10);
  }

  function buscarValor(row: any, nombres: string[]) {
    for (const nombre of nombres) {
      if (row[nombre] !== undefined && row[nombre] !== null) {
        return row[nombre];
      }
    }

    return "";
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    const reader = new FileReader();

    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const json: any[] = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
      });

      const mapped: BancoRow[] = json
        .map((r) => {
          const fecha = buscarValor(r, [
            "Fecha Posteo",
            "Fecha",
            "FECHA",
            "Fecha Transacción",
            "Fecha Transaccion",
          ]);

          const monto = buscarValor(r, [
            "Monto Transacción",
            "Monto Transaccion",
            "Monto",
            "MONTO",
            "Crédito",
            "Credito",
            "Débito",
            "Debito",
            "Valor",
          ]);

          const serial = buscarValor(r, [
            "No Serial",
            "No. Serial",
            "Serial",
            "Referencia",
            "No Referencia",
            "No. Referencia",
            "Número Referencia",
            "Numero Referencia",
          ]);

          const descripcion = buscarValor(r, [
            "Descripción",
            "Descripcion",
            "DESCRIPCION",
            "Concepto",
            "Detalle",
            "Comentario",
          ]);

          return {
            condominio_id: Number(condominioId),
            condominio: condominioNombre,

            fecha_posteo: normalizarFecha(fecha),
            monto_transaccion: normalizarMonto(monto),
            no_serial: normalizarTexto(serial),
            descripcion: normalizarTexto(descripcion),

            estado: "Revisar",
          };
        })
        .filter((r) => {
          return (
            r.fecha_posteo !== null ||
            r.monto_transaccion > 0 ||
            r.no_serial !== "" ||
            r.descripcion !== ""
          );
        });

      setRows(mapped);
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

    const registrosValidos = rows.filter((r) => {
      return r.fecha_posteo && Number(r.monto_transaccion || 0) !== 0;
    });

    if (registrosValidos.length === 0) {
      alert("No hay registros válidos para importar.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("archivo_banco").insert(registrosValidos);

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Error al guardar los datos: " + error.message);
      return;
    }

    alert("Archivo importado correctamente.");
    setRows([]);
  }

  function moneda(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  const totalMonto = rows.reduce(
    (sum, item) => sum + Number(item.monto_transaccion || 0),
    0
  );

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-3xl font-black text-slate-900">
          Importar Archivo del Banco
        </h1>

        <p className="text-slate-500 mt-2">
          Sube el archivo Excel o CSV enviado por el banco para registrarlo en la
          tabla archivo_banco.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>

        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>

        {!condominioId && (
          <p className="text-sm text-red-600 mt-2">
            No se encontró condominio activo. Debe iniciar sesión nuevamente.
          </p>
        )}
      </div>

      <div className="border rounded-2xl p-5 bg-white shadow-sm">
        <label className="block text-sm font-semibold mb-2">
          Seleccionar archivo Excel o CSV
        </label>

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          className="block w-full border rounded-xl px-4 py-3"
        />

        <p className="text-xs text-slate-500 mt-2">
          Columnas esperadas: Fecha Posteo, Monto Transacción, No Serial y
          Descripción. También acepta variaciones como Fecha, Monto, Referencia y
          Concepto.
        </p>
      </div>

      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border">
              <p className="text-sm text-slate-500">Registros leídos</p>
              <h2 className="text-3xl font-black">{rows.length}</h2>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border">
              <p className="text-sm text-slate-500">Monto total</p>
              <h2 className="text-2xl font-black text-blue-700">
                RD${moneda(totalMonto)}
              </h2>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border">
              <p className="text-sm text-slate-500">Estado inicial</p>
              <h2 className="text-2xl font-black text-yellow-700">Revisar</h2>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="text-lg font-bold">
              Vista previa: {rows.length} registros
            </h2>

            <button
              onClick={guardarEnSupabase}
              disabled={loading}
              className="bg-blue-700 text-white px-5 py-3 rounded-xl hover:bg-blue-800 disabled:opacity-50 font-bold"
            >
              {loading ? "Guardando..." : "Guardar en Archivo Banco"}
            </button>
          </div>

          <div className="overflow-auto border rounded-2xl bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Condominio</th>
                  <th className="p-3 border text-left">Fecha Posteo</th>
                  <th className="p-3 border text-right">Monto Transacción</th>
                  <th className="p-3 border text-left">No Serial</th>
                  <th className="p-3 border text-left">Descripción</th>
                  <th className="p-3 border text-center">Estado</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="p-3 border font-semibold">
                      {r.condominio}
                    </td>

                    <td className="p-3 border">{r.fecha_posteo || "-"}</td>

                    <td className="p-3 border text-right font-bold text-blue-700">
                      RD${moneda(r.monto_transaccion)}
                    </td>

                    <td className="p-3 border">{r.no_serial || "-"}</td>

                    <td className="p-3 border">{r.descripcion || "-"}</td>

                    <td className="p-3 border text-center">
                      <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">
                        {r.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot className="bg-slate-100 font-black">
                <tr>
                  <td className="p-3 border" colSpan={2}>
                    Total
                  </td>

                  <td className="p-3 border text-right text-blue-700">
                    RD${moneda(totalMonto)}
                  </td>

                  <td className="p-3 border" colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}