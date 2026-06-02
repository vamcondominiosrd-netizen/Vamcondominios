"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
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

function limpiarTexto(value: any) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatearMoneda(valor: number) {
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

export default function ImportarArchivoBancoPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [rows, setRows] = useState<BancoRow[]>([]);
  const [guardados, setGuardados] = useState<BancoGuardado[]>([]);

  const [loading, setLoading] = useState(false);
  const [cargandoGuardados, setCargandoGuardados] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarGuardados(id);
    }
  }, []);

  async function cargarGuardados(id: string) {
    setCargandoGuardados(true);

    const { data, error } = await supabase
      .from("archivo_banco")
      .select(
        "id, condominio_id, condominio, fecha_posteo, monto_transaccion, no_serial, descripcion, estado"
      )
      .eq("condominio_id", Number(id))
      .order("fecha_posteo", { ascending: false })
      .order("id", { ascending: false });

    setCargandoGuardados(false);

    if (error) {
      alert("Error cargando archivo banco: " + error.message);
      return;
    }

    setGuardados((data as BancoGuardado[]) || []);
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
        raw: true,
      });

      const mapped: BancoRow[] = json
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

      mapped.forEach((row) => {
        mapa.set(claveTransaccion(row), row);
      });

      setRows(Array.from(mapa.values()));
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
        claveTransaccion({
          condominio_id: Number(item.condominio_id),
          fecha_posteo: item.fecha_posteo || "",
          monto_transaccion: Number(item.monto_transaccion || 0),
          no_serial: item.no_serial || "",
          descripcion: item.descripcion || "",
        })
      )
    );

    const registrosNuevos = rows.filter(
      (row) => !clavesExistentes.has(claveTransaccion(row))
    );

    if (registrosNuevos.length === 0) {
      setLoading(false);
      alert("Todos los registros del archivo ya existen. No se importó nada.");
      return;
    }

    const confirmar = confirm(
      `Se importarán ${registrosNuevos.length} registros nuevos para ${condominioNombre}. Se omitieron ${
        rows.length - registrosNuevos.length
      } duplicados. ¿Desea continuar?`
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
      console.error(error);
      alert("Error al guardar los datos: " + error.message);
      return;
    }

    alert("Archivo del banco importado correctamente.");
    setRows([]);
    cargarGuardados(condominioId);
  }

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

    XLSX.utils.book_append_sheet(libro, hoja, "Archivo Banco");

    const nombreArchivo = `archivo-banco-${condominioNombre || "condominio"}`
      .replace(/\s+/g, "-")
      .toLowerCase();

    XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
  }

  const totalPreview = rows.length;

  const montoPreview = rows.reduce(
    (sum, item) => sum + Number(item.monto_transaccion || 0),
    0
  );

  const guardadosFiltrados = guardados.filter((item) => {
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

  const totalGuardados = guardados.length;

  const totalRevisar = guardados.filter(
    (item) => (item.estado || "Revisar") === "Revisar"
  ).length;

  const totalIdentificados = guardados.filter(
    (item) => item.estado === "Identificado"
  ).length;

  const montoGuardado = guardadosFiltrados.reduce(
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
          Sube el archivo Excel del banco. Cada transacción se guardará con el
          condominio activo para que luego pueda ser identificada correctamente.
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
          Descripción. También acepta Fecha, Monto, Referencia, Detalle o
          Concepto.
        </p>
      </div>

      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <h2 className="text-lg font-black text-blue-900">
              Revisión previa antes de guardar
            </h2>

            <p className="text-sm text-blue-700 mt-1">
              Estos registros se guardarán en archivo_banco con estado inicial
              Revisar y con el condominio activo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border">
              <p className="text-sm text-slate-500">Registros leídos</p>
              <h2 className="text-3xl font-black">{totalPreview}</h2>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border">
              <p className="text-sm text-slate-500">Monto total</p>
              <h2 className="text-2xl font-black text-blue-700">
                {formatearMoneda(montoPreview)}
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
                  <th className="p-3 border text-right">Monto</th>
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

                    <td className="p-3 border font-bold">
                      {r.fecha_posteo}
                    </td>

                    <td className="p-3 border text-right font-bold">
                      {formatearMoneda(r.monto_transaccion)}
                    </td>

                    <td className="p-3 border">{r.no_serial || "-"}</td>

                    <td className="p-3 border">{r.descripcion}</td>

                    <td className="p-3 border text-center">
                      <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">
                        {r.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-black">
              Archivo banco cargado
            </h2>

            <p className="text-sm text-slate-500">
              Aquí puedes revisar las transacciones ya importadas para el
              condominio activo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full md:w-auto">
            <div>
              <label className="block text-sm font-semibold mb-1">Estado</label>

              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="Todos">Todos</option>
                <option value="Revisar">Revisar</option>
                <option value="Identificado">Identificado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Buscar</label>

              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Fecha, descripción, serial..."
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => cargarGuardados(condominioId)}
                className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold w-full"
              >
                Actualizar
              </button>
            </div>

            <div className="flex items-end">
              <button
                onClick={exportarExcel}
                className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-xl font-bold w-full"
              >
                Exportar Excel
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
          <div className="bg-slate-50 rounded-2xl p-5 border">
            <p className="text-sm text-slate-500">Total cargados</p>
            <h2 className="text-3xl font-black">{totalGuardados}</h2>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border">
            <p className="text-sm text-slate-500">En revisar</p>
            <h2 className="text-3xl font-black text-yellow-700">
              {totalRevisar}
            </h2>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border">
            <p className="text-sm text-slate-500">Identificados</p>
            <h2 className="text-3xl font-black text-green-700">
              {totalIdentificados}
            </h2>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border">
            <p className="text-sm text-slate-500">Monto visible</p>
            <h2 className="text-2xl font-black text-blue-700">
              {formatearMoneda(montoGuardado)}
            </h2>
          </div>
        </div>

        {cargandoGuardados ? (
          <div>Cargando archivo banco...</div>
        ) : (
          <div className="overflow-auto border rounded-2xl bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Fecha</th>
                  <th className="p-3 border text-right">Monto</th>
                  <th className="p-3 border text-left">No Serial</th>
                  <th className="p-3 border text-left">Descripción</th>
                  <th className="p-3 border text-center">Estado</th>
                </tr>
              </thead>

              <tbody>
                {guardadosFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 border font-bold">
                      {item.fecha_posteo || "-"}
                    </td>

                    <td className="p-3 border text-right font-bold">
                      {formatearMoneda(item.monto_transaccion)}
                    </td>

                    <td className="p-3 border">{item.no_serial || "-"}</td>

                    <td className="p-3 border">{item.descripcion || "-"}</td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          item.estado === "Identificado"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {item.estado || "Revisar"}
                      </span>
                    </td>
                  </tr>
                ))}

                {guardadosFiltrados.length === 0 && (
                  <tr>
                    <td
                      className="p-6 border text-center text-slate-500"
                      colSpan={5}
                    >
                      No hay registros del banco cargados para esta consulta.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}