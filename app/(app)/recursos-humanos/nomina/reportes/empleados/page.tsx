"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type Empleado = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  nombre: string;
  cedula: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  cargo: string | null;
  departamento: string | null;
  tipo_contrato: string | null;
  fecha_ingreso: string | null;
  salario: number | null;
  estado: string | null;
  observacion: string | null;
  created_at: string | null;
  numero_seguridad_social: string | null;
  sexo: string | null;
  fecha_nacimiento: string | null;
  edad: number | null;
  numero_empleado: string | null;
  contrato_firmado_url: string | null;
  fecha_contrato_firmado: string | null;
  observacion_contrato: string | null;
  foto_url: string | null;
  fecha_emision_carnet: string | null;
  codigo_qr: string | null;
};

const estados = ["Todos", "Activo", "Inactivo"];

export default function ReporteEmpleadosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroDepartamento, setFiltroDepartamento] = useState("Todos");
  const [filtroCargo, setFiltroCargo] = useState("Todos");
  const [filtroContrato, setFiltroContrato] = useState("Todos");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarEmpleados(id);
    }
  }, []);

  async function cargarEmpleados(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("empleados")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("nombre", { ascending: true });

    setLoading(false);

    if (error) {
      alert("Error cargando empleados: " + error.message);
      return;
    }

    setEmpleados((data as Empleado[]) || []);
  }

  function fecha(valor: string | null | undefined) {
    if (!valor) return "-";

    const partes = valor.split("-");
    if (partes.length !== 3) return valor;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  function moneda(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function calcularTiempoServicio(fechaIngreso: string | null | undefined) {
    if (!fechaIngreso) return "-";

    const ingreso = new Date(`${fechaIngreso}T00:00:00`);
    const hoy = new Date();

    let anios = hoy.getFullYear() - ingreso.getFullYear();
    let meses = hoy.getMonth() - ingreso.getMonth();

    if (hoy.getDate() < ingreso.getDate()) {
      meses -= 1;
    }

    if (meses < 0) {
      anios -= 1;
      meses += 12;
    }

    if (anios < 0) return "-";

    return `${anios} año(s), ${meses} mes(es)`;
  }

  const departamentos = useMemo(() => {
    const lista = empleados
      .map((e) => e.departamento || "")
      .filter((x) => x.trim() !== "");

    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [empleados]);

  const cargos = useMemo(() => {
    const lista = empleados
      .map((e) => e.cargo || "")
      .filter((x) => x.trim() !== "");

    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [empleados]);

  const contratos = useMemo(() => {
    const lista = empleados
      .map((e) => e.tipo_contrato || "")
      .filter((x) => x.trim() !== "");

    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [empleados]);

  const empleadosFiltrados = empleados.filter((e) => {
    const texto = `${e.numero_empleado || ""} ${e.nombre || ""} ${
      e.cedula || ""
    } ${e.telefono || ""} ${e.correo || ""} ${e.cargo || ""} ${
      e.departamento || ""
    } ${e.tipo_contrato || ""}`
      .toLowerCase()
      .trim();

    const coincideBusqueda = texto.includes(busqueda.toLowerCase().trim());
    const coincideEstado =
      filtroEstado === "Todos" || (e.estado || "") === filtroEstado;
    const coincideDepartamento =
      filtroDepartamento === "Todos" || e.departamento === filtroDepartamento;
    const coincideCargo = filtroCargo === "Todos" || e.cargo === filtroCargo;
    const coincideContrato =
      filtroContrato === "Todos" || e.tipo_contrato === filtroContrato;

    return (
      coincideBusqueda &&
      coincideEstado &&
      coincideDepartamento &&
      coincideCargo &&
      coincideContrato
    );
  });

  const totalActivos = empleadosFiltrados.filter(
    (e) => e.estado === "Activo"
  ).length;

  const totalInactivos = empleadosFiltrados.filter(
    (e) => e.estado === "Inactivo"
  ).length;

  const totalSalarios = empleadosFiltrados.reduce(
    (sum, e) => sum + Number(e.salario || 0),
    0
  );

  const promedioSalario =
    empleadosFiltrados.length > 0 ? totalSalarios / empleadosFiltrados.length : 0;

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroEstado("Todos");
    setFiltroDepartamento("Todos");
    setFiltroCargo("Todos");
    setFiltroContrato("Todos");
  }

  function imprimir() {
    window.print();
  }

  function exportarCSV() {
    const encabezados = [
      "No. Empleado",
      "Nombre",
      "Cédula",
      "Teléfono",
      "Correo",
      "Cargo",
      "Departamento",
      "Tipo Contrato",
      "Fecha Ingreso",
      "Tiempo Servicio",
      "Salario",
      "Estado",
      "Sexo",
      "Edad",
      "NSS",
      "Contrato Firmado",
      "Fecha Contrato",
      "Fecha Carnet",
      "Observación",
    ];

    const filas = empleadosFiltrados.map((e) => [
      e.numero_empleado || "",
      e.nombre || "",
      e.cedula || "",
      e.telefono || "",
      e.correo || "",
      e.cargo || "",
      e.departamento || "",
      e.tipo_contrato || "",
      e.fecha_ingreso || "",
      calcularTiempoServicio(e.fecha_ingreso),
      Number(e.salario || 0).toFixed(2),
      e.estado || "",
      e.sexo || "",
      e.edad || "",
      e.numero_seguridad_social || "",
      e.contrato_firmado_url ? "Sí" : "No",
      e.fecha_contrato_firmado || "",
      e.fecha_emision_carnet || "",
      e.observacion || "",
    ]);

    const contenido = [encabezados, ...filas]
      .map((fila) =>
        fila
          .map((campo) => `"${String(campo).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_empleados_${condominioNombre || "condominio"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900">
              Reporte de Empleados
            </h1>

            <p className="text-slate-500 mt-2">
              Reporte imprimible del personal con los datos más relevantes para
              Recursos Humanos.
            </p>
          </div>

          <Link
            href="/recursos-humanos"
            className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-center"
          >
            Volver a RH
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border no-print">
        <p className="text-sm text-slate-500">Condominio activo</p>
        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Total empleados</p>
          <h2 className="text-3xl font-black">{empleadosFiltrados.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Activos</p>
          <h2 className="text-3xl font-black text-green-700">{totalActivos}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Inactivos</p>
          <h2 className="text-3xl font-black text-red-700">{totalInactivos}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Promedio salario</p>
          <h2 className="text-2xl font-black text-blue-700">
            RD${moneda(promedioSalario)}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <h2 className="text-xl font-black mb-4">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Buscar</label>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Nombre, cédula, cargo..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {estados.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Departamento
            </label>
            <select
              value={filtroDepartamento}
              onChange={(e) => setFiltroDepartamento(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {departamentos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Cargo</label>
            <select
              value={filtroCargo}
              onChange={(e) => setFiltroCargo(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {cargos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Tipo contrato
            </label>
            <select
              value={filtroContrato}
              onChange={(e) => setFiltroContrato(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {contratos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-5">
          <button
            onClick={() => condominioId && cargarEmpleados(condominioId)}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Buscar / Actualizar
          </button>

          <button
            onClick={limpiarFiltros}
            className="bg-slate-600 hover:bg-slate-700 text-white px-5 py-3 rounded-xl font-bold"
          >
            Limpiar
          </button>

          <button
            onClick={exportarCSV}
            className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Exportar Excel
          </button>

          <button
            onClick={imprimir}
            className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Imprimir / PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6 print-area">
        <div className="hidden print:block mb-5 border-b pb-3">
          <h1 className="text-2xl font-black text-center">
            REPORTE DE EMPLEADOS
          </h1>

          <p className="text-center font-bold">{condominioNombre}</p>

          <p className="text-center text-sm">
            Fecha impresión: {new Date().toLocaleDateString("es-DO")}
          </p>
        </div>

        <div className="mb-5">
          <h2 className="text-xl font-black">Detalle de empleados</h2>
          <p className="text-sm text-slate-500">
            {empleadosFiltrados.length} empleado(s) encontrado(s).
          </p>
        </div>

        {loading ? (
          <div>Cargando empleados...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 border text-left">No.</th>
                  <th className="p-2 border text-left">Empleado</th>
                  <th className="p-2 border text-left">Identificación</th>
                  <th className="p-2 border text-left">Contacto</th>
                  <th className="p-2 border text-left">Cargo / Departamento</th>
                  <th className="p-2 border text-left">Contrato</th>
                  <th className="p-2 border text-left">Ingreso</th>
                  <th className="p-2 border text-right">Salario</th>
                  <th className="p-2 border text-center">Estado</th>
                  <th className="p-2 border text-center">Documentos</th>
                </tr>
              </thead>

              <tbody>
                {empleadosFiltrados.map((e, index) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="p-2 border font-bold">{index + 1}</td>

                    <td className="p-2 border">
                      <p className="font-black">{e.nombre}</p>
                      <p className="text-xs text-slate-500">
                        Código: {e.numero_empleado || "-"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Sexo: {e.sexo || "-"} · Edad: {e.edad || "-"}
                      </p>
                    </td>

                    <td className="p-2 border">
                      <p>Cédula: {e.cedula || "-"}</p>
                      <p className="text-xs text-slate-500">
                        NSS: {e.numero_seguridad_social || "-"}
                      </p>
                    </td>

                    <td className="p-2 border">
                      <p>Tel.: {e.telefono || "-"}</p>
                      <p className="text-xs text-slate-500">
                        {e.correo || "-"}
                      </p>
                    </td>

                    <td className="p-2 border">
                      <p className="font-bold">{e.cargo || "-"}</p>
                      <p className="text-xs text-slate-500">
                        {e.departamento || "-"}
                      </p>
                    </td>

                    <td className="p-2 border">
                      <p>{e.tipo_contrato || "-"}</p>
                      <p className="text-xs text-slate-500">
                        Contrato: {e.contrato_firmado_url ? "Firmado" : "Pendiente"}
                      </p>
                    </td>

                    <td className="p-2 border">
                      <p>{fecha(e.fecha_ingreso)}</p>
                      <p className="text-xs text-slate-500">
                        {calcularTiempoServicio(e.fecha_ingreso)}
                      </p>
                    </td>

                    <td className="p-2 border text-right font-bold">
                      RD${moneda(e.salario)}
                    </td>

                    <td className="p-2 border text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          e.estado === "Activo"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {e.estado || "-"}
                      </span>
                    </td>

                    <td className="p-2 border text-center">
                      <p>Contrato: {e.contrato_firmado_url ? "Sí" : "No"}</p>
                      <p className="text-xs text-slate-500">
                        Carnet: {e.fecha_emision_carnet ? "Sí" : "No"}
                      </p>
                    </td>
                  </tr>
                ))}

                {empleadosFiltrados.length === 0 && (
                  <tr>
                    <td className="p-6 border text-center text-slate-500" colSpan={10}>
                      No hay empleados para esta consulta.
                    </td>
                  </tr>
                )}
              </tbody>

              {empleadosFiltrados.length > 0 && (
                <tfoot className="bg-slate-100 font-black">
                  <tr>
                    <td className="p-2 border" colSpan={7}>
                      Totales
                    </td>
                    <td className="p-2 border text-right">
                      RD${moneda(totalSalarios)}
                    </td>
                    <td className="p-2 border text-center" colSpan={2}>
                      Activos: {totalActivos} · Inactivos: {totalInactivos}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          aside,
          nav,
          header {
            display: none !important;
          }

          body {
            background: white !important;
            font-size: 10px !important;
          }

          .print-area {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }

          .print-area table {
            font-size: 8px !important;
          }

          .print-area th,
          .print-area td {
            padding: 3px 4px !important;
          }

          @page {
            size: landscape;
            margin: 0.25in;
          }
        }
      `}</style>
    </div>
  );
}
