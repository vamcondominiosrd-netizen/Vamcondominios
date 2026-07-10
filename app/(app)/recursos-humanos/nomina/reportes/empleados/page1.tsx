"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Empleado = {
  id: number;
  condominio_id: number;
  condominio: string;
  numero_empleado: string;
  nombre: string;
  cedula: string;
  telefono: string;
  correo: string;
  cargo: string;
  departamento: string;
  tipo_contrato: string;
  fecha_ingreso: string;
  salario: number;
  estado: string;
  sexo: string;
  edad: number;
  foto_url: string | null;
};

const estados = ["Todos", "Activo", "Inactivo"];
const sexos = ["Todos", "Masculino", "Femenino"];

export default function ReporteEmpleadosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroDepartamento, setFiltroDepartamento] = useState("Todos");
  const [filtroCargo, setFiltroCargo] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroSexo, setFiltroSexo] = useState("Todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

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
      .select(
        "id, condominio_id, condominio, numero_empleado, nombre, cedula, telefono, correo, cargo, departamento, tipo_contrato, fecha_ingreso, salario, estado, sexo, edad, foto_url"
      )
      .eq("condominio_id", Number(id))
      .order("nombre", { ascending: true });

    setLoading(false);

    if (error) {
      alert("Error cargando empleados: " + error.message);
      return;
    }

    setEmpleados((data as Empleado[]) || []);
  }

  function moneda(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function fecha(valor: string) {
    if (!valor) return "-";

    const partes = valor.split("-");
    if (partes.length !== 3) return valor;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  const departamentos = useMemo(() => {
    const lista = empleados
      .map((e) => e.departamento)
      .filter((x) => x && x.trim() !== "");

    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [empleados]);

  const cargos = useMemo(() => {
    const lista = empleados
      .map((e) => e.cargo)
      .filter((x) => x && x.trim() !== "");

    return ["Todos", ...Array.from(new Set(lista)).sort()];
  }, [empleados]);

  const empleadosFiltrados = empleados.filter((emp) => {
    const texto = `${emp.numero_empleado || ""} ${emp.nombre || ""} ${
      emp.cedula || ""
    } ${emp.telefono || ""} ${emp.correo || ""} ${emp.cargo || ""} ${
      emp.departamento || ""
    }`
      .toLowerCase()
      .trim();

    const coincideBusqueda = texto.includes(busqueda.toLowerCase().trim());

    const coincideDepartamento =
      filtroDepartamento === "Todos" || emp.departamento === filtroDepartamento;

    const coincideCargo = filtroCargo === "Todos" || emp.cargo === filtroCargo;

    const coincideEstado =
      filtroEstado === "Todos" || emp.estado === filtroEstado;

    const coincideSexo = filtroSexo === "Todos" || emp.sexo === filtroSexo;

    const coincideDesde =
      !fechaDesde || (emp.fecha_ingreso && emp.fecha_ingreso >= fechaDesde);

    const coincideHasta =
      !fechaHasta || (emp.fecha_ingreso && emp.fecha_ingreso <= fechaHasta);

    return (
      coincideBusqueda &&
      coincideDepartamento &&
      coincideCargo &&
      coincideEstado &&
      coincideSexo &&
      coincideDesde &&
      coincideHasta
    );
  });

  const totalEmpleados = empleadosFiltrados.length;
  const activos = empleadosFiltrados.filter((e) => e.estado === "Activo").length;
  const inactivos = empleadosFiltrados.filter(
    (e) => e.estado === "Inactivo"
  ).length;

  const totalNominaMensual = empleadosFiltrados
    .filter((e) => e.estado === "Activo")
    .reduce((sum, e) => sum + Number(e.salario || 0), 0);

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroDepartamento("Todos");
    setFiltroCargo("Todos");
    setFiltroEstado("Todos");
    setFiltroSexo("Todos");
    setFechaDesde("");
    setFechaHasta("");
  }

  function imprimir() {
    window.print();
  }

  function exportarCSV() {
    const encabezados = [
      "No. Empleado",
      "Nombre",
      "Cedula",
      "Telefono",
      "Correo",
      "Cargo",
      "Departamento",
      "Tipo Contrato",
      "Fecha Ingreso",
      "Salario",
      "Estado",
      "Sexo",
      "Edad",
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
      Number(e.salario || 0).toFixed(2),
      e.estado || "",
      e.sexo || "",
      e.edad || "",
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
    a.download = `reporte_empleados_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <h1 className="text-4xl font-black text-slate-900">
          Reporte de Empleados
        </h1>

        <p className="text-slate-500 mt-2">
          Consulta general de empleados por estado, departamento, cargo y fecha de ingreso.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border no-print">
        <p className="text-sm text-slate-500">Condominio activo</p>

        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Empleados</p>
          <h2 className="text-3xl font-black">{totalEmpleados}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Activos</p>
          <h2 className="text-3xl font-black text-green-700">{activos}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Inactivos</p>
          <h2 className="text-3xl font-black text-red-700">{inactivos}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Nómina mensual activos</p>
          <h2 className="text-2xl font-black text-blue-700">
            RD${moneda(totalNominaMensual)}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6 no-print">
        <h2 className="text-xl font-black mb-4">Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Buscar</label>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Nombre, cédula, código..."
            />
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
            <label className="block text-sm font-semibold mb-1">Sexo</label>
            <select
              value={filtroSexo}
              onChange={(e) => setFiltroSexo(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {sexos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Ingreso desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Ingreso hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={limpiarFiltros}
              className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-3 rounded-xl font-bold w-full"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-5">
          <button
            onClick={() => condominioId && cargarEmpleados(condominioId)}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Actualizar
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
            Imprimir
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6 print-area">
        <div className="mb-5 hidden print:block">
          <h1 className="text-2xl font-black">Reporte de Empleados</h1>
          <p>{condominioNombre}</p>
          <p className="text-sm">Fecha: {new Date().toLocaleDateString("es-DO")}</p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-black">Listado de empleados</h2>
            <p className="text-sm text-slate-500">
              {empleadosFiltrados.length} registro(s) encontrado(s).
            </p>
          </div>

          <div className="text-sm text-slate-500">
            Total nómina activos:{" "}
            <span className="font-black text-blue-700">
              RD${moneda(totalNominaMensual)}
            </span>
          </div>
        </div>

        {loading ? (
          <div>Cargando empleados...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">No.</th>
                  <th className="p-3 border text-left">Empleado</th>
                  <th className="p-3 border text-left">Cédula</th>
                  <th className="p-3 border text-left">Contacto</th>
                  <th className="p-3 border text-left">Cargo</th>
                  <th className="p-3 border text-left">Departamento</th>
                  <th className="p-3 border text-left">Ingreso</th>
                  <th className="p-3 border text-right">Salario</th>
                  <th className="p-3 border text-center">Estado</th>
                </tr>
              </thead>

              <tbody>
                {empleadosFiltrados.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="p-3 border font-bold">
                      {emp.numero_empleado || emp.id}
                    </td>

                    <td className="p-3 border">
                      <p className="font-bold">{emp.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {emp.tipo_contrato || "-"} · {emp.sexo || "-"} ·{" "}
                        {emp.edad || "-"} años
                      </p>
                    </td>

                    <td className="p-3 border">{emp.cedula || "-"}</td>

                    <td className="p-3 border">
                      <p>{emp.telefono || "-"}</p>
                      <p className="text-xs text-slate-500">{emp.correo || "-"}</p>
                    </td>

                    <td className="p-3 border">{emp.cargo || "-"}</td>

                    <td className="p-3 border">{emp.departamento || "-"}</td>

                    <td className="p-3 border">{fecha(emp.fecha_ingreso)}</td>

                    <td className="p-3 border text-right font-bold">
                      RD${moneda(emp.salario)}
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          emp.estado === "Activo"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {emp.estado}
                      </span>
                    </td>
                  </tr>
                ))}

                {empleadosFiltrados.length === 0 && (
                  <tr>
                    <td className="p-6 border text-center text-slate-500" colSpan={9}>
                      No hay empleados para esta consulta.
                    </td>
                  </tr>
                )}
              </tbody>

              {empleadosFiltrados.length > 0 && (
                <tfoot className="bg-slate-100 font-black">
                  <tr>
                    <td className="p-3 border" colSpan={7}>
                      Totales
                    </td>
                    <td className="p-3 border text-right text-blue-700">
                      RD${moneda(totalNominaMensual)}
                    </td>
                    <td className="p-3 border text-center">
                      {activos} activos
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
            font-size: 11px !important;
          }

          .print-area {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }

          .print-area table {
            font-size: 9px !important;
          }

          .print-area th,
          .print-area td {
            padding: 4px 5px !important;
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
