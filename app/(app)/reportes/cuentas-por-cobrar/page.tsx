"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { getCondominioActual } from "@/app/lib/condominioActual";

type CargoPeriodico = {
  id: number;
  client_id: number | null;
  condominio_id: number | null;
  unidad_id: number | null;
  propietario_id: number | null;
  periodo: string | null;
  anio: number | null;
  mes: number | null;
  concepto: string | null;
  tipo_cargo: string | null;
  monto: number | null;
  monto_pagado: number | null;
  balance: number | null;
  estado: string | null;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  created_at: string | null;
};

type Unidad = {
  id: number;
  codigo: string;
  tipo: string | null;
  propietario_nombre: string | null;
  propietario_cedula: string | null;
  propietario_telefono: string | null;
  cuota_mensual_actual: number | null;
  activa: boolean | null;
};

type PropietarioApartamento = {
  id: number;
  condominio_id: number | null;
  no_apartamento: string;
  nombre_propietario: string | null;
  cedula: string | null;
  telefono: string | null;
  correo: string | null;
  estado: string | null;
};

type FilaCuentaCobrar = {
  unidad_id: number | null;
  apartamento: string;
  tipo_unidad: string;
  propietario: string;
  cedula: string;
  telefono: string;
  correo: string;
  cuota_mensual: number;
  total_cargos: number;
  total_pagado: number;
  balance: number;
  cantidad_periodos: number;
  periodos_pendientes: number;
  ultimo_periodo_pendiente: string;
  estado_general: string;
};

const MESES_NOMBRES: Record<number, string> = {
  1: "Enero",
  2: "Febrero",
  3: "Marzo",
  4: "Abril",
  5: "Mayo",
  6: "Junio",
  7: "Julio",
  8: "Agosto",
  9: "Septiembre",
  10: "Octubre",
  11: "Noviembre",
  12: "Diciembre",
};

export default function ReporteCuentasCobrarPage() {
  const router = useRouter();
  const condominio = getCondominioActual();

  const hoy = new Date();
  const anioActual = hoy.getFullYear();

  const [loading, setLoading] = useState(false);
  const [cargos, setCargos] = useState<CargoPeriodico[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [propietarios, setPropietarios] = useState<PropietarioApartamento[]>([]);

  const [anio, setAnio] = useState(String(anioActual));
  const [mes, setMes] = useState("todos");
  const [estado, setEstado] = useState("todos");
  const [soloConBalance, setSoloConBalance] = useState(true);
  const [todosLosAnios, setTodosLosAnios] = useState(false);

  useEffect(() => {
    if (!condominio.id) {
      router.push("/login");
      return;
    }

    cargarReporte();
  }, []);

  async function cargarReporte() {
    if (!condominio.id) return;

    setLoading(true);

    let query = supabase
      .from("cargos_periodicos")
      .select(
        "id, client_id, condominio_id, unidad_id, propietario_id, periodo, anio, mes, concepto, tipo_cargo, monto, monto_pagado, balance, estado, fecha_emision, fecha_vencimiento, created_at"
      )
      .eq("condominio_id", Number(condominio.id))
      .order("anio", { ascending: true })
      .order("mes", { ascending: true })
      .order("id", { ascending: true });

    if (!todosLosAnios) {
      query = query.eq("anio", Number(anio));
    }

    if (mes !== "todos") {
      query = query.eq("mes", Number(mes));
    }

    if (estado !== "todos") {
      query = query.eq("estado", estado);
    }

    const { data: cargosData, error: cargosError } = await query;

    if (cargosError) {
      alert("Error cargando cuentas por cobrar: " + cargosError.message);
      setLoading(false);
      return;
    }

    const cargosLimpios = ((cargosData || []) as CargoPeriodico[]).filter(
      (cargo) => {
        if (!soloConBalance) return true;
        return Number(cargo.balance || 0) > 0;
      }
    );

    setCargos(cargosLimpios);

    const unidadIds = Array.from(
      new Set(
        cargosLimpios
          .map((c) => c.unidad_id)
          .filter((id): id is number => Boolean(id))
      )
    );

    if (unidadIds.length > 0) {
      const { data: unidadesData, error: unidadesError } = await supabase
        .from("unidades")
        .select(
          "id, codigo, tipo, propietario_nombre, propietario_cedula, propietario_telefono, cuota_mensual_actual, activa"
        )
        .in("id", unidadIds);

      if (unidadesError) {
        alert("Error cargando unidades: " + unidadesError.message);
        setUnidades([]);
      } else {
        setUnidades((unidadesData || []) as Unidad[]);
      }
    } else {
      setUnidades([]);
    }

    const { data: propietariosData } = await supabase
      .from("propietarios_apartamentos")
      .select(
        "id, condominio_id, no_apartamento, nombre_propietario, cedula, telefono, correo, estado"
      )
      .eq("condominio_id", Number(condominio.id));

    setPropietarios((propietariosData || []) as PropietarioApartamento[]);

    setLoading(false);
  }

  const filas = useMemo(() => {
    const unidadesMap = new Map<number, Unidad>();
    unidades.forEach((u) => unidadesMap.set(u.id, u));

    const propietariosMap = new Map<string, PropietarioApartamento>();
    propietarios.forEach((p) => {
      propietariosMap.set(normalizar(p.no_apartamento), p);
    });

    const agrupado = new Map<string, FilaCuentaCobrar>();

    cargos.forEach((cargo) => {
      const unidad = cargo.unidad_id ? unidadesMap.get(cargo.unidad_id) : null;
      const apartamento = unidad?.codigo || `Unidad ${cargo.unidad_id || "-"}`;
      const propietarioRegistro = propietariosMap.get(normalizar(apartamento));

      const key = String(cargo.unidad_id || apartamento);

      const totalCargo = Number(cargo.monto || 0);
      const totalPagado = Number(cargo.monto_pagado || 0);
      const balance = Number(cargo.balance || 0);

      const periodoTexto =
        cargo.periodo ||
        `${cargo.anio || ""}-${String(cargo.mes || "").padStart(2, "0")}`;

      const existente =
        agrupado.get(key) ||
        ({
          unidad_id: cargo.unidad_id,
          apartamento,
          tipo_unidad: unidad?.tipo || "-",
          propietario:
            propietarioRegistro?.nombre_propietario ||
            unidad?.propietario_nombre ||
            "-",
          cedula:
            propietarioRegistro?.cedula || unidad?.propietario_cedula || "-",
          telefono:
            propietarioRegistro?.telefono ||
            unidad?.propietario_telefono ||
            "",
          correo: propietarioRegistro?.correo || "",
          cuota_mensual: Number(unidad?.cuota_mensual_actual || 0),
          total_cargos: 0,
          total_pagado: 0,
          balance: 0,
          cantidad_periodos: 0,
          periodos_pendientes: 0,
          ultimo_periodo_pendiente: "-",
          estado_general: "Al día",
        } as FilaCuentaCobrar);

      existente.total_cargos += totalCargo;
      existente.total_pagado += totalPagado;
      existente.balance += balance;
      existente.cantidad_periodos += 1;

      if (balance > 0) {
        existente.periodos_pendientes += 1;
        existente.ultimo_periodo_pendiente = periodoTexto;
      }

      if (existente.balance <= 0) {
        existente.estado_general = "Al día";
      } else if (existente.total_pagado > 0) {
        existente.estado_general = "Parcial";
      } else {
        existente.estado_general = "Pendiente";
      }

      agrupado.set(key, existente);
    });

    return Array.from(agrupado.values()).sort((a, b) => {
      if (b.balance !== a.balance) return b.balance - a.balance;
      return a.apartamento.localeCompare(b.apartamento);
    });
  }, [cargos, unidades, propietarios]);

  const totalFacturado = filas.reduce((sum, f) => sum + f.total_cargos, 0);
  const totalPagado = filas.reduce((sum, f) => sum + f.total_pagado, 0);
  const totalPorCobrar = filas.reduce((sum, f) => sum + f.balance, 0);
  const unidadesConDeuda = filas.filter((f) => f.balance > 0).length;
  const periodosPendientes = filas.reduce(
    (sum, f) => sum + f.periodos_pendientes,
    0
  );

  const porcentajeRecuperacion =
    totalFacturado > 0 ? Math.round((totalPagado / totalFacturado) * 100) : 0;

  function normalizar(valor: string | null | undefined) {
    return String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function dinero(valor: number | null | undefined) {
    return `RD$ ${Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function fechaHoy() {
    const fecha = new Date();
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mesActual = String(fecha.getMonth() + 1).padStart(2, "0");
    const year = fecha.getFullYear();

    return `${dia}/${mesActual}/${year}`;
  }

  function limpiarTelefonoWhatsApp(telefono?: string | null) {
    const numeros = String(telefono || "").replace(/\D/g, "");

    if (!numeros) return "";

    if (numeros.length === 10) return `1${numeros}`;
    if (numeros.length === 11 && numeros.startsWith("1")) return numeros;

    return numeros;
  }

  function enviarWhatsApp(fila: FilaCuentaCobrar) {
    const telefono = limpiarTelefonoWhatsApp(fila.telefono);

    if (!telefono) {
      alert("Este propietario no tiene teléfono registrado.");
      return;
    }

    const mensaje = `Estimado/a ${fila.propietario},

Le compartimos su balance pendiente de mantenimiento:

Condominio: ${condominio.nombre}
Unidad: ${fila.apartamento}
Total facturado: ${dinero(fila.total_cargos)}
Total pagado: ${dinero(fila.total_pagado)}
Balance pendiente: ${dinero(fila.balance)}
Períodos pendientes: ${fila.periodos_pendientes}
Último período pendiente: ${fila.ultimo_periodo_pendiente}

Favor ponerse al día con la administración.

VAM Administradora de Condominios
Tel. 829-792-9292`;

    window.open(
      `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`,
      "_blank"
    );
  }

  function exportarExcel() {
    const encabezados = [
      "Unidad",
      "Tipo unidad",
      "Propietario",
      "Cedula",
      "Telefono",
      "Correo",
      "Cuota mensual",
      "Total cargos",
      "Total pagado",
      "Balance",
      "Cantidad periodos",
      "Periodos pendientes",
      "Ultimo periodo pendiente",
      "Estado",
    ];

    const lineas = filas.map((f) => [
      f.apartamento,
      f.tipo_unidad,
      f.propietario,
      f.cedula,
      f.telefono,
      f.correo,
      f.cuota_mensual,
      f.total_cargos,
      f.total_pagado,
      f.balance,
      f.cantidad_periodos,
      f.periodos_pendientes,
      f.ultimo_periodo_pendiente,
      f.estado_general,
    ]);

    const csv = [encabezados, ...lineas]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `cuentas_por_cobrar_${condominio.nombre || "condominio"}_${
      todosLosAnios ? "todos" : anio
    }.csv`;

    link.click();
    URL.revokeObjectURL(url);
  }

  function imprimir() {
    window.print();
  }

  if (!condominio.id) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6 print:bg-white print:p-0">
      <style jsx global>{`
        @media print {
          @page {
            size: letter landscape;
            margin: 0.35in;
          }

          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .print-card {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }

          .print-table {
            font-size: 8px !important;
          }

          .print-table th,
          .print-table td {
            padding: 4px !important;
          }
        }
      `}</style>

      <section className="max-w-7xl mx-auto space-y-5">
        <div className="no-print flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800">
              Reporte de Cuentas por Cobrar
            </h1>

            <p className="text-slate-500 mt-1">
              Balance pendiente por unidad y propietario.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={cargarReporte}
              className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold"
            >
              Recargar
            </button>

            <button
              type="button"
              onClick={imprimir}
              className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl font-bold"
            >
              Imprimir / PDF
            </button>

            <button
              type="button"
              onClick={exportarExcel}
              className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl font-bold"
            >
              Exportar Excel
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border p-5 print-card">
          <div className="border-b pb-4 mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase">
                {condominio.nombre}
              </h2>

              <p className="text-sm text-slate-500">
                Fecha del reporte: {fechaHoy()}
              </p>
            </div>

            <div className="text-sm text-slate-600">
              <p>
                <strong>Filtro:</strong>{" "}
                {todosLosAnios ? "Todos los años" : `Año ${anio}`} /{" "}
                {mes === "todos"
                  ? "Todos los meses"
                  : MESES_NOMBRES[Number(mes)]}
              </p>
              <p>
                <strong>Estado:</strong>{" "}
                {estado === "todos" ? "Todos" : estado}
              </p>
            </div>
          </div>

          <div className="no-print bg-slate-50 border rounded-2xl p-4 mb-5">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600">
                  Año
                </label>
                <input
                  type="number"
                  value={anio}
                  onChange={(e) => setAnio(e.target.value)}
                  disabled={todosLosAnios}
                  className="w-full border rounded-xl px-3 py-2 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">
                  Mes
                </label>
                <select
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 mt-1"
                >
                  <option value="todos">Todos</option>
                  {Object.entries(MESES_NOMBRES).map(([numero, nombre]) => (
                    <option key={numero} value={numero}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">
                  Estado
                </label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 mt-1"
                >
                  <option value="todos">Todos</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="PARCIAL">PARCIAL</option>
                  <option value="PAGADO">PAGADO</option>
                  <option value="EN MORA">EN MORA</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 bg-white border rounded-xl px-3 py-2 w-full cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soloConBalance}
                    onChange={(e) => setSoloConBalance(e.target.checked)}
                  />
                  <span className="text-sm font-bold text-slate-700">
                    Solo con balance
                  </span>
                </label>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 bg-white border rounded-xl px-3 py-2 w-full cursor-pointer">
                  <input
                    type="checkbox"
                    checked={todosLosAnios}
                    onChange={(e) => setTodosLosAnios(e.target.checked)}
                  />
                  <span className="text-sm font-bold text-slate-700">
                    Todos los años
                  </span>
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={cargarReporte}
              className="mt-4 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-black"
            >
              Generar reporte
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-5">
            <ResumenCard title="Total facturado" value={dinero(totalFacturado)} />
            <ResumenCard title="Total cobrado" value={dinero(totalPagado)} />
            <ResumenCard title="Por cobrar" value={dinero(totalPorCobrar)} alert />
            <ResumenCard
              title="Unidades con deuda"
              value={String(unidadesConDeuda)}
            />
            <ResumenCard
              title="Períodos pendientes"
              value={String(periodosPendientes)}
            />
            <ResumenCard
              title="Recuperación"
              value={`${porcentajeRecuperacion}%`}
            />
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">
              Cargando reporte...
            </div>
          ) : (
            <div className="overflow-auto border rounded-2xl">
              <table className="min-w-full text-sm print-table">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="p-3 text-left">Unidad</th>
                    <th className="p-3 text-left">Tipo</th>
                    <th className="p-3 text-left">Propietario</th>
                    <th className="p-3 text-left">Teléfono</th>
                    <th className="p-3 text-right">Cuota</th>
                    <th className="p-3 text-right">Facturado</th>
                    <th className="p-3 text-right">Pagado</th>
                    <th className="p-3 text-right">Balance</th>
                    <th className="p-3 text-center">Períodos</th>
                    <th className="p-3 text-center">Último pendiente</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center no-print">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {filas.map((fila) => (
                    <tr key={fila.unidad_id || fila.apartamento} className="border-t hover:bg-slate-50">
                      <td className="p-3 font-black">{fila.apartamento}</td>
                      <td className="p-3">{fila.tipo_unidad}</td>
                      <td className="p-3">
                        <p className="font-bold">{fila.propietario}</p>
                        <p className="text-xs text-slate-500">
                          Cédula: {fila.cedula}
                        </p>
                      </td>
                      <td className="p-3">{fila.telefono || "-"}</td>
                      <td className="p-3 text-right">
                        {dinero(fila.cuota_mensual)}
                      </td>
                      <td className="p-3 text-right">
                        {dinero(fila.total_cargos)}
                      </td>
                      <td className="p-3 text-right text-green-700 font-bold">
                        {dinero(fila.total_pagado)}
                      </td>
                      <td className="p-3 text-right text-red-700 font-black">
                        {dinero(fila.balance)}
                      </td>
                      <td className="p-3 text-center">
                        {fila.periodos_pendientes}
                      </td>
                      <td className="p-3 text-center">
                        {fila.ultimo_periodo_pendiente}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black ${
                            fila.balance <= 0
                              ? "bg-green-100 text-green-700"
                              : fila.total_pagado > 0
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {fila.estado_general}
                        </span>
                      </td>
                      <td className="p-3 text-center no-print">
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => enviarWhatsApp(fila)}
                            className="bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded-lg text-xs font-bold"
                          >
                            WhatsApp
                          </button>

                          <Link
                            href="/estado-cuenta/propietarios"
                            className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded-lg text-xs font-bold"
                          >
                            Estado
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filas.length === 0 && (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-slate-500">
                        No hay cuentas por cobrar con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>

                {filas.length > 0 && (
                  <tfoot className="bg-slate-100 font-black">
                    <tr>
                      <td className="p-3 text-right" colSpan={5}>
                        TOTALES
                      </td>
                      <td className="p-3 text-right">
                        {dinero(totalFacturado)}
                      </td>
                      <td className="p-3 text-right">
                        {dinero(totalPagado)}
                      </td>
                      <td className="p-3 text-right text-red-700">
                        {dinero(totalPorCobrar)}
                      </td>
                      <td className="p-3 text-center">
                        {periodosPendientes}
                      </td>
                      <td className="p-3" colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          <div className="text-[10px] text-slate-500 flex justify-between border-t mt-4 pt-2">
            <span>
              Reporte generado desde cargos periódicos y unidades del condominio.
            </span>
            <span>VAM Administradora de Condominios</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function ResumenCard({
  title,
  value,
  alert = false,
}: {
  title: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        alert ? "bg-red-50 border-red-100" : "bg-slate-50"
      }`}
    >
      <p className="text-xs text-slate-500 font-bold uppercase">{title}</p>
      <p
        className={`text-lg font-black mt-1 ${
          alert ? "text-red-700" : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}