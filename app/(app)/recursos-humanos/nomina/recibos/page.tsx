"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";
import NominaMenu from "../NominaMenu";

type Nomina = {
  id: number;
  condominio_id: number;
  condominio: string;

  empleado_id: number;
  numero_empleado: string;
  nombre_empleado: string;
  cargo: string;
  departamento: string;

  periodo: string;
  fecha_pago: string;

  salario_base: number;
  dias_trabajados: number;

  horas_extras: number;
  monto_horas_extras: number;
  bonificacion: number;

  vacaciones_id: number | null;
  pago_vacaciones: number;
  dias_vacaciones: number;

  afp: number;
  sfs: number;
  isr: number;
  otros_descuentos: number;

  total_ingresos: number;
  total_descuentos: number;
  neto_pagar: number;

  estado: string;
  observacion: string;

  pagado_por: string;
  fecha_registro_pago: string;

  created_at: string;
};

const estadosNomina = ["Todos", "Pendiente", "Aprobada", "Pagada", "Anulada"];

export default function RecibosNominaPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [nominas, setNominas] = useState<Nomina[]>([]);
  const [loading, setLoading] = useState(false);

  const [filtroPeriodo, setFiltroPeriodo] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarRecibos(id, filtroPeriodo);
    }
  }, []);

  async function cargarRecibos(id: string, periodoBuscar: string) {
    setLoading(true);

    let query = supabase
      .from("rh_nomina")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false });

    if (periodoBuscar) {
      query = query.eq("periodo", periodoBuscar);
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      alert("Error cargando recibos de nómina: " + error.message);
      return;
    }

    setNominas((data as Nomina[]) || []);
  }

  function moneda(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  function buscar() {
    if (!condominioId) return;
    cargarRecibos(condominioId, filtroPeriodo);
  }

  const recibosFiltrados = nominas.filter((item) => {
    const texto = `${item.nombre_empleado || ""} ${
      item.numero_empleado || ""
    } ${item.cargo || ""} ${item.departamento || ""}`
      .toLowerCase()
      .trim();

    const coincideBusqueda = texto.includes(busqueda.toLowerCase().trim());

    const coincideEstado =
      filtroEstado === "Todos" ? true : item.estado === filtroEstado;

    return coincideBusqueda && coincideEstado;
  });

  const totalIngresos = recibosFiltrados.reduce(
    (sum, item) => sum + Number(item.total_ingresos || 0),
    0
  );

  const totalDescuentos = recibosFiltrados.reduce(
    (sum, item) => sum + Number(item.total_descuentos || 0),
    0
  );

  const totalNeto = recibosFiltrados.reduce(
    (sum, item) => sum + Number(item.neto_pagar || 0),
    0
  );

  const totalPagados = recibosFiltrados.filter(
    (item) => item.estado === "Pagada"
  ).length;

  const totalPendientes = recibosFiltrados.filter(
    (item) => item.estado === "Pendiente"
  ).length;

  return (
    <div className="space-y-6">
      <NominaMenu />

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">
          Recibos de Nómina
        </h1>

        <p className="text-slate-500 mt-2">
          Consulta, imprime y guarda los recibos de pago generados desde la
          nómina.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>

        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Recibos</p>
          <h2 className="text-3xl font-black">{recibosFiltrados.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Pagados</p>
          <h2 className="text-3xl font-black text-green-700">
            {totalPagados}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Pendientes</p>
          <h2 className="text-3xl font-black text-yellow-700">
            {totalPendientes}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Total descuentos</p>
          <h2 className="text-2xl font-black text-red-700">
            RD${moneda(totalDescuentos)}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Total neto</p>
          <h2 className="text-2xl font-black text-blue-700">
            RD${moneda(totalNeto)}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Buscar recibos</h2>

            <p className="text-sm text-slate-500">
              Filtra los recibos por período, estado, empleado, cargo o
              departamento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full md:w-auto">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Período
              </label>

              <input
                type="month"
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Estado</label>

              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                {estadosNomina.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Buscar empleado
              </label>

              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Nombre, código, cargo..."
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={buscar}
                className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold w-full"
              >
                Buscar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-black">Listado de recibos</h2>

            <p className="text-sm text-slate-500">
              Desde aquí puedes abrir cada recibo para imprimirlo o guardarlo en
              PDF.
            </p>
          </div>

          <div className="text-sm text-slate-500">
            Total ingresos:{" "}
            <span className="font-black text-green-700">
              RD${moneda(totalIngresos)}
            </span>
          </div>
        </div>

        {loading ? (
          <div>Cargando recibos...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Empleado</th>
                  <th className="p-3 border text-left">Período</th>
                  <th className="p-3 border text-right">Ingresos</th>
                  <th className="p-3 border text-right">Descuentos</th>
                  <th className="p-3 border text-right">Neto</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-left">Fecha pago</th>
                  <th className="p-3 border text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {recibosFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 border">
                      <p className="font-bold">{item.nombre_empleado}</p>
                      <p className="text-xs text-slate-500">
                        {item.numero_empleado || "-"} · {item.cargo || "-"}
                      </p>
                    </td>

                    <td className="p-3 border">
                      <p className="font-bold">{item.periodo}</p>
                      <p className="text-xs text-slate-500">
                        Recibo No. RH-{String(item.id).padStart(6, "0")}
                      </p>
                    </td>

                    <td className="p-3 border text-right font-bold text-green-700">
                      RD${moneda(item.total_ingresos)}
                    </td>

                    <td className="p-3 border text-right font-bold text-red-700">
                      RD${moneda(item.total_descuentos)}
                    </td>

                    <td className="p-3 border text-right font-black text-blue-700">
                      RD${moneda(item.neto_pagar)}
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          item.estado === "Pagada"
                            ? "bg-green-100 text-green-700"
                            : item.estado === "Aprobada"
                            ? "bg-blue-100 text-blue-700"
                            : item.estado === "Anulada"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {item.estado}
                      </span>
                    </td>

                    <td className="p-3 border">
                      <p>{item.fecha_pago || "-"}</p>
                      <p className="text-xs text-slate-500">
                        Pagado por: {item.pagado_por || "-"}
                      </p>
                    </td>

                    <td className="p-3 border">
                      <div className="flex flex-wrap justify-center gap-2">
                        <Link
                          href={`/recursos-humanos/nomina/recibo/${item.id}`}
                          className="bg-purple-700 hover:bg-purple-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Ver recibo
                        </Link>

                        <Link
                          href="/recursos-humanos/nomina"
                          className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Nómina
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}

                {recibosFiltrados.length === 0 && (
                  <tr>
                    <td
                      className="p-6 border text-center text-slate-500"
                      colSpan={8}
                    >
                      No hay recibos registrados para esta consulta.
                    </td>
                  </tr>
                )}
              </tbody>

              {recibosFiltrados.length > 0 && (
                <tfoot className="bg-slate-100 font-black">
                  <tr>
                    <td className="p-3 border" colSpan={2}>
                      Totales
                    </td>

                    <td className="p-3 border text-right text-green-700">
                      RD${moneda(totalIngresos)}
                    </td>

                    <td className="p-3 border text-right text-red-700">
                      RD${moneda(totalDescuentos)}
                    </td>

                    <td className="p-3 border text-right text-blue-700">
                      RD${moneda(totalNeto)}
                    </td>

                    <td className="p-3 border" colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}