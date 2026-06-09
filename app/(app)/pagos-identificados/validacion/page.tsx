"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import * as XLSX from "xlsx";

type PagoIdentificado = {
  id: number;
  condominio_id: number;
  no_apartamento: string | null;
  fecha_posteo: string | null;
  monto_transaccion: number | null;
  no_serial: string | null;
  descripcion_banco: string | null;
  estado: string | null;
  created_at: string;
};

type Pago = {
  id: number;
  condominio_id: number;
  unidad_id: number | null;
  monto: number | null;
  fecha_pago: string | null;
  referencia: string | null;
  metodo_pago: string | null;
  tipo_fondo: string | null;
  created_at: string;
};

type Unidad = {
  id: number;
  codigo: string;
};

type ResultadoValidacion = {
  pagoIdentificado: PagoIdentificado;
  unidadEncontrada: Unidad | null;
  pagosEncontrados: Pago[];
  estadoValidacion: "CORRECTO" | "PENDIENTE" | "ERROR" | "DUPLICADO" | "DIFERENCIA";
  razon: string;
};

export default function ValidacionPagosBancoPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [pagosIdentificados, setPagosIdentificados] = useState<PagoIdentificado[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);

  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      setMensaje("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      setLoading(false);
      return;
    }

    cargarTodo(id);
  }, []);

  async function cargarTodo(id: string) {
    setLoading(true);
    setMensaje("");

    await Promise.all([
      cargarPagosIdentificados(id),
      cargarPagos(id),
      cargarUnidades(id),
    ]);

    setLoading(false);
  }

  async function cargarPagosIdentificados(id: string) {
    const { data, error } = await supabase
      .from("pagos_identificados")
      .select(`
        id,
        condominio_id,
        no_apartamento,
        fecha_posteo,
        monto_transaccion,
        no_serial,
        descripcion_banco,
        estado,
        created_at
      `)
      .eq("condominio_id", Number(id))
      .order("fecha_posteo", { ascending: false });

    if (error) {
      setMensaje("Error cargando pagos identificados: " + error.message);
      return;
    }

    setPagosIdentificados((data as PagoIdentificado[]) || []);
  }

  async function cargarPagos(id: string) {
    const { data, error } = await supabase
      .from("pagos")
      .select(`
        id,
        condominio_id,
        unidad_id,
        monto,
        fecha_pago,
        referencia,
        metodo_pago,
        tipo_fondo,
        created_at
      `)
      .eq("condominio_id", Number(id))
      .order("fecha_pago", { ascending: false });

    if (error) {
      setMensaje("Error cargando pagos reales: " + error.message);
      return;
    }

    setPagos((data as Pago[]) || []);
  }

  async function cargarUnidades(id: string) {
    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(id))
      .order("codigo", { ascending: true });

    if (error) {
      setMensaje("Error cargando unidades: " + error.message);
      return;
    }

    setUnidades((data as Unidad[]) || []);
  }

  function normalizarTexto(valor: string | null | undefined) {
    return (valor || "")
      .toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/-/g, "")
      .replace(/\./g, "")
      .replace(/_/g, "");
  }

  function buscarUnidad(noApartamento: string | null | undefined) {
    const apto = normalizarTexto(noApartamento);

    if (!apto) return null;

    return (
      unidades.find((u) => normalizarTexto(u.codigo) === apto) ||
      unidades.find((u) => normalizarTexto(u.codigo).includes(apto)) ||
      unidades.find((u) => apto.includes(normalizarTexto(u.codigo))) ||
      null
    );
  }

  function referenciasValidasPagoIdentificado(p: PagoIdentificado) {
    const serialBanco = (p.no_serial || "").trim();
    const referenciaFallback = `PAGO_IDENTIFICADO_${p.id}`;

    return [serialBanco, referenciaFallback]
      .filter((ref) => ref && ref.trim() !== "")
      .map((ref) => ref.trim());
  }

  function estaAplicado(estado: string | null | undefined) {
    const valor = (estado || "").trim().toUpperCase();

    return valor === "APLICADO" || valor === "PAGO APLICADO";
  }

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  function fechaLocal(fecha: string | null | undefined) {
    if (!fecha) return "-";

    const d = new Date(fecha);

    if (Number.isNaN(d.getTime())) return fecha;

    return d.toLocaleDateString("es-DO");
  }

  const resultados = useMemo<ResultadoValidacion[]>(() => {
    return pagosIdentificados.map((pi) => {
      const unidad = buscarUnidad(pi.no_apartamento);
      const montoIdentificado = Number(pi.monto_transaccion || 0);

      const referenciasValidas = referenciasValidasPagoIdentificado(pi);

      const pagosEncontrados = pagos.filter((p) =>
        referenciasValidas.includes((p.referencia || "").trim())
      );

      if (!unidad) {
        return {
          pagoIdentificado: pi,
          unidadEncontrada: null,
          pagosEncontrados,
          estadoValidacion: "ERROR",
          razon: `No se encontró la unidad/apartamento ${pi.no_apartamento || "-"}.`,
        };
      }

      if (pagosEncontrados.length === 0) {
        if (estaAplicado(pi.estado)) {
          return {
            pagoIdentificado: pi,
            unidadEncontrada: unidad,
            pagosEncontrados,
            estadoValidacion: "ERROR",
            razon:
              "Está marcado como APLICADO en pagos_identificados, pero no existe en la tabla pagos con no_serial ni con PAGO_IDENTIFICADO_ID.",
          };
        }

        return {
          pagoIdentificado: pi,
          unidadEncontrada: unidad,
          pagosEncontrados,
          estadoValidacion: "PENDIENTE",
          razon: "No ha sido aplicado a la tabla pagos.",
        };
      }

      if (pagosEncontrados.length > 1) {
        return {
          pagoIdentificado: pi,
          unidadEncontrada: unidad,
          pagosEncontrados,
          estadoValidacion: "DUPLICADO",
          razon: `Se encontraron ${pagosEncontrados.length} pagos con la misma referencia. Revisar posible duplicidad.`,
        };
      }

      const pago = pagosEncontrados[0];

      if (Number(pago.monto || 0) !== montoIdentificado) {
        return {
          pagoIdentificado: pi,
          unidadEncontrada: unidad,
          pagosEncontrados,
          estadoValidacion: "DIFERENCIA",
          razon: `Monto identificado RD$ ${dinero(
            montoIdentificado
          )}, pero en pagos aparece RD$ ${dinero(pago.monto)}.`,
        };
      }

      if (Number(pago.unidad_id) !== Number(unidad.id)) {
        return {
          pagoIdentificado: pi,
          unidadEncontrada: unidad,
          pagosEncontrados,
          estadoValidacion: "DIFERENCIA",
          razon: `El pago existe por referencia, pero está asociado a otra unidad. Unidad esperada: ${unidad.codigo}.`,
        };
      }

      return {
        pagoIdentificado: pi,
        unidadEncontrada: unidad,
        pagosEncontrados,
        estadoValidacion: "CORRECTO",
        razon: "Pago identificado aplicado correctamente en la tabla pagos.",
      };
    });
  }, [pagosIdentificados, pagos, unidades]);

  const resultadosFiltrados = useMemo(() => {
    const texto = buscar.toLowerCase().trim();

    return resultados.filter((r) => {
      const cumpleFiltro = filtro === "" || r.estadoValidacion === filtro;

      const combinado = `
        ${r.pagoIdentificado.id}
        ${r.pagoIdentificado.no_apartamento || ""}
        ${r.pagoIdentificado.no_serial || ""}
        ${r.pagoIdentificado.descripcion_banco || ""}
        ${r.pagoIdentificado.estado || ""}
        ${r.unidadEncontrada?.codigo || ""}
        ${r.pagosEncontrados.map((p) => p.referencia || "").join(" ")}
        ${r.razon}
      `.toLowerCase();

      const cumpleBusqueda = !texto || combinado.includes(texto);

      return cumpleFiltro && cumpleBusqueda;
    });
  }, [resultados, buscar, filtro]);

  const totalCorrectos = resultados.filter(
    (r) => r.estadoValidacion === "CORRECTO"
  ).length;

  const totalPendientes = resultados.filter(
    (r) => r.estadoValidacion === "PENDIENTE"
  ).length;

  const totalErrores = resultados.filter(
    (r) => r.estadoValidacion === "ERROR"
  ).length;

  const totalDuplicados = resultados.filter(
    (r) => r.estadoValidacion === "DUPLICADO"
  ).length;

  const totalDiferencias = resultados.filter(
    (r) => r.estadoValidacion === "DIFERENCIA"
  ).length;

  const montoIdentificado = resultadosFiltrados.reduce(
    (sum, r) => sum + Number(r.pagoIdentificado.monto_transaccion || 0),
    0
  );

  const montoCorrectamenteAplicado = resultadosFiltrados.reduce((sum, r) => {
    if (r.estadoValidacion !== "CORRECTO") return sum;

    return sum + Number(r.pagoIdentificado.monto_transaccion || 0);
  }, 0);

  const montoPendiente = resultadosFiltrados.reduce((sum, r) => {
    if (r.estadoValidacion !== "PENDIENTE" && r.estadoValidacion !== "ERROR") {
      return sum;
    }

    return sum + Number(r.pagoIdentificado.monto_transaccion || 0);
  }, 0);

  function claseEstado(estado: ResultadoValidacion["estadoValidacion"]) {
    if (estado === "CORRECTO") return "bg-green-100 text-green-700";
    if (estado === "PENDIENTE") return "bg-amber-100 text-amber-700";
    if (estado === "ERROR") return "bg-red-100 text-red-700";
    if (estado === "DUPLICADO") return "bg-purple-100 text-purple-700";
    if (estado === "DIFERENCIA") return "bg-orange-100 text-orange-700";

    return "bg-slate-100 text-slate-700";
  }

  function exportarExcel() {
    if (resultadosFiltrados.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const dataExcel = resultadosFiltrados.map((r) => ({
      "ID pago identificado": r.pagoIdentificado.id,
      Condominio: condominioNombre || condominioId,
      Apartamento: r.pagoIdentificado.no_apartamento || "",
      "Unidad encontrada": r.unidadEncontrada?.codigo || "",
      "Fecha banco": r.pagoIdentificado.fecha_posteo || "",
      "Monto banco": Number(r.pagoIdentificado.monto_transaccion || 0),
      "Serial banco": r.pagoIdentificado.no_serial || "",
      "Referencia fallback": `PAGO_IDENTIFICADO_${r.pagoIdentificado.id}`,
      "Estado banco": r.pagoIdentificado.estado || "",
      "ID pago real": r.pagosEncontrados.map((p) => p.id).join(", "),
      "Referencia pago real": r.pagosEncontrados
        .map((p) => p.referencia || "")
        .join(", "),
      "Monto pago real": r.pagosEncontrados
        .map((p) => Number(p.monto || 0))
        .join(", "),
      Validación: r.estadoValidacion,
      Razón: r.razon,
    }));

    const hoja = XLSX.utils.json_to_sheet(dataExcel);

    hoja["!cols"] = [
      { wch: 20 },
      { wch: 35 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 25 },
      { wch: 18 },
      { wch: 15 },
      { wch: 25 },
      { wch: 18 },
      { wch: 18 },
      { wch: 70 },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Validacion");

    const nombreArchivo = `Validacion_Pagos_Banco_${
      condominioNombre || condominioId
    }.xlsx`
      .replaceAll(" ", "_")
      .replaceAll("/", "-");

    XLSX.writeFile(libro, nombreArchivo);
  }

  if (loading) {
    return <div className="p-6">Validando pagos del banco...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              Validación de Pagos del Banco
            </h1>

            <p className="text-slate-500 mt-2">
              Comparación estricta entre pagos identificados del banco y pagos aplicados en el sistema.
            </p>

            <p className="text-sm text-blue-700 font-bold mt-3">
              Condominio activo: {condominioNombre || "No seleccionado"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => cargarTodo(condominioId)}
              className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold"
            >
              Actualizar validación
            </button>

            <button
              type="button"
              onClick={exportarExcel}
              className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-xl font-bold"
            >
              Exportar Excel
            </button>
          </div>
        </div>
      </div>

      {mensaje && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Correctos</p>
          <h2 className="text-3xl font-black text-green-700">
            {totalCorrectos}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pendientes</p>
          <h2 className="text-3xl font-black text-amber-700">
            {totalPendientes}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Errores</p>
          <h2 className="text-3xl font-black text-red-700">
            {totalErrores}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Duplicados</p>
          <h2 className="text-3xl font-black text-purple-700">
            {totalDuplicados}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Diferencias</p>
          <h2 className="text-3xl font-black text-orange-700">
            {totalDiferencias}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Monto identificado filtrado</p>
          <h2 className="text-3xl font-black text-blue-700">
            RD$ {dinero(montoIdentificado)}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Monto correctamente aplicado</p>
          <h2 className="text-3xl font-black text-green-700">
            RD$ {dinero(montoCorrectamenteAplicado)}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Monto pendiente / error</p>
          <h2 className="text-3xl font-black text-red-700">
            RD$ {dinero(montoPendiente)}
          </h2>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Filtro</label>

            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="">Todos</option>
              <option value="CORRECTO">Correctos</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="ERROR">Errores</option>
              <option value="DUPLICADO">Duplicados</option>
              <option value="DIFERENCIA">Diferencias</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Buscar</label>

            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Apartamento, serial, razón, estado..."
            />
          </div>
        </div>
      </div>

      <div className="overflow-auto border rounded-2xl bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 border text-left">ID Banco</th>
              <th className="p-3 border text-left">Apartamento</th>
              <th className="p-3 border text-left">Unidad</th>
              <th className="p-3 border text-left">Fecha Banco</th>
              <th className="p-3 border text-right">Monto Banco</th>
              <th className="p-3 border text-left">Serial</th>
              <th className="p-3 border text-left">Fallback</th>
              <th className="p-3 border text-center">Estado Banco</th>
              <th className="p-3 border text-center">Pago Sistema</th>
              <th className="p-3 border text-center">Validación</th>
              <th className="p-3 border text-left">Razón</th>
            </tr>
          </thead>

          <tbody>
            {resultadosFiltrados.map((r) => (
              <tr key={r.pagoIdentificado.id} className="hover:bg-slate-50">
                <td className="p-3 border font-bold">
                  {r.pagoIdentificado.id}
                </td>

                <td className="p-3 border">
                  {r.pagoIdentificado.no_apartamento || "-"}
                </td>

                <td className="p-3 border">
                  {r.unidadEncontrada?.codigo || "-"}
                </td>

                <td className="p-3 border">
                  {r.pagoIdentificado.fecha_posteo || "-"}
                </td>

                <td className="p-3 border text-right font-bold">
                  RD$ {dinero(r.pagoIdentificado.monto_transaccion)}
                </td>

                <td className="p-3 border">
                  {r.pagoIdentificado.no_serial || "-"}
                </td>

                <td className="p-3 border">
                  PAGO_IDENTIFICADO_{r.pagoIdentificado.id}
                </td>

                <td className="p-3 border text-center">
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">
                    {r.pagoIdentificado.estado || "SIN ESTADO"}
                  </span>
                </td>

                <td className="p-3 border text-center">
                  {r.pagosEncontrados.length > 0 ? (
                    <div className="space-y-1">
                      {r.pagosEncontrados.map((pago) => (
                        <div
                          key={pago.id}
                          className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-xs font-bold"
                        >
                          Pago ID {pago.id}
                          <br />
                          Ref: {pago.referencia || "-"}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400">No encontrado</span>
                  )}
                </td>

                <td className="p-3 border text-center">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${claseEstado(
                      r.estadoValidacion
                    )}`}
                  >
                    {r.estadoValidacion}
                  </span>
                </td>

                <td className="p-3 border">{r.razon}</td>
              </tr>
            ))}

            {resultadosFiltrados.length === 0 && (
              <tr>
                <td
                  className="p-6 border text-center text-slate-500"
                  colSpan={11}
                >
                  No hay registros para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}