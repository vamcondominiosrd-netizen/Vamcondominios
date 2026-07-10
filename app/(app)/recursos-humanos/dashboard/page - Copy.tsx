"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type Empleado = {
  id: number;
  numero_empleado: string;
  nombre: string;
  cargo: string;
  departamento: string;
  salario: number;
  fecha_ingreso: string;
  estado: string;
  created_at: string;
};

type Nomina = {
  id: number;
  periodo: string;
  empleado_id: number;
  numero_empleado: string;
  nombre_empleado: string;
  cargo: string;
  departamento: string;
  tipo_nomina: string;
  total_ingresos: number;
  total_descuentos: number;
  neto_pagar: number;
  estado: string;
  fecha_pago: string;
  created_at: string;
};

type BalanceVacaciones = {
  id: number;
  empleado_id: number;
  numero_empleado: string;
  nombre_empleado: string;
  cargo: string;
  departamento: string;
  anio: number;
  dias_disponibles: number;
  estado: string;
};

type VacacionPermiso = {
  id: number;
  empleado_id: number;
  numero_empleado: string;
  nombre_empleado: string;
  cargo: string;
  departamento: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  cantidad_dias: number;
  estado: string;
};

type Prestacion = {
  id: number;
  empleado_id: number;
  numero_empleado: string;
  nombre_empleado: string;
  cargo: string;
  departamento: string;
  fecha_salida: string;
  tipo_salida: string;
  total_prestaciones: number;
  estado: string;
  created_at: string;
};

export default function DashboardRHPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [nominasMes, setNominasMes] = useState<Nomina[]>([]);
  const [balanceVacaciones, setBalanceVacaciones] = useState<BalanceVacaciones[]>([]);
  const [vacacionesAprobadas, setVacacionesAprobadas] = useState<VacacionPermiso[]>([]);
  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [loading, setLoading] = useState(false);

  const periodoActual = new Date().toISOString().slice(0, 7);
  const anioActual = new Date().getFullYear();

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarDashboard(id);
    }
  }, []);

  async function cargarDashboard(id: string) {
    setLoading(true);

    const [
      empleadosResp,
      nominaResp,
      balanceResp,
      vacacionesResp,
      prestacionesResp,
    ] = await Promise.all([
      supabase
        .from("empleados")
        .select("id, numero_empleado, nombre, cargo, departamento, salario, fecha_ingreso, estado, created_at")
        .eq("condominio_id", Number(id))
        .order("created_at", { ascending: false }),

      supabase
        .from("rh_nomina")
        .select("*")
        .eq("condominio_id", Number(id))
        .eq("periodo", periodoActual)
        .order("created_at", { ascending: false }),

      supabase
        .from("rh_balance_vacaciones")
        .select("*")
        .eq("condominio_id", Number(id))
        .eq("anio", anioActual)
        .eq("estado", "Activo")
        .order("dias_disponibles", { ascending: false }),

      supabase
        .from("rh_vacaciones_permisos")
        .select("*")
        .eq("condominio_id", Number(id))
        .eq("estado", "Aprobado")
        .order("fecha_inicio", { ascending: true })
        .limit(8),

      supabase
        .from("rh_prestaciones_laborales")
        .select("*")
        .eq("condominio_id", Number(id))
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    setLoading(false);

    if (empleadosResp.error) {
      alert("Error cargando empleados: " + empleadosResp.error.message);
      return;
    }

    if (nominaResp.error) {
      alert("Error cargando nómina: " + nominaResp.error.message);
      return;
    }

    if (balanceResp.error) {
      alert("Error cargando balance de vacaciones: " + balanceResp.error.message);
      return;
    }

    if (vacacionesResp.error) {
      alert("Error cargando vacaciones aprobadas: " + vacacionesResp.error.message);
      return;
    }

    if (prestacionesResp.error) {
      alert("Error cargando prestaciones: " + prestacionesResp.error.message);
      return;
    }

    setEmpleados((empleadosResp.data as Empleado[]) || []);
    setNominasMes((nominaResp.data as Nomina[]) || []);
    setBalanceVacaciones((balanceResp.data as BalanceVacaciones[]) || []);
    setVacacionesAprobadas((vacacionesResp.data as VacacionPermiso[]) || []);
    setPrestaciones((prestacionesResp.data as Prestacion[]) || []);
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

  const empleadosActivos = empleados.filter((e) => e.estado === "Activo");
  const empleadosInactivos = empleados.filter((e) => e.estado === "Inactivo");

  const nominaNetoMes = nominasMes.reduce(
    (sum, n) => sum + Number(n.neto_pagar || 0),
    0
  );

  const nominaPendiente = nominasMes
    .filter((n) => n.estado !== "Pagada" && n.estado !== "Anulada")
    .reduce((sum, n) => sum + Number(n.neto_pagar || 0), 0);

  const nominasPendientesCantidad = nominasMes.filter(
    (n) => n.estado === "Pendiente" || n.estado === "Aprobada"
  ).length;

  const vacacionesDisponiblesTotal = balanceVacaciones.reduce(
    (sum, b) => sum + Number(b.dias_disponibles || 0),
    0
  );

  const prestacionesPendientes = prestaciones.filter(
    (p) => p.estado !== "Pagada" && p.estado !== "Anulada"
  );

  const totalPrestacionesPendientes = prestacionesPendientes.reduce(
    (sum, p) => sum + Number(p.total_prestaciones || 0),
    0
  );

  const ultimosEmpleados = empleados.slice(0, 6);
  const topVacacionesDisponibles = balanceVacaciones.slice(0, 6);
  const ultimasPrestaciones = prestaciones.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900">
              Dashboard Recursos Humanos
            </h1>
            <p className="text-slate-500 mt-2">
              Vista general del personal, nómina, vacaciones y prestaciones.
            </p>
          </div>

          <button
            onClick={() => condominioId && cargarDashboard(condominioId)}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>
        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Empleados activos</p>
          <h2 className="text-4xl font-black text-green-700">
            {empleadosActivos.length}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Inactivos: {empleadosInactivos.length}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Nómina neta mes {periodoActual}</p>
          <h2 className="text-2xl font-black text-blue-700">
            RD${moneda(nominaNetoMes)}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Registros: {nominasMes.length}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Vacaciones disponibles</p>
          <h2 className="text-4xl font-black text-purple-700">
            {vacacionesDisponiblesTotal.toFixed(2)}
          </h2>
          <p className="text-xs text-slate-500 mt-1">Días acumulados</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Prestaciones pendientes</p>
          <h2 className="text-2xl font-black text-red-700">
            RD${moneda(totalPrestacionesPendientes)}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Casos: {prestacionesPendientes.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/recursos-humanos/nomina/reportes/empleados"
          className="bg-white hover:bg-slate-50 rounded-2xl p-5 shadow-sm border block"
        >
          <p className="text-sm text-slate-500">Reporte</p>
          <h2 className="text-xl font-black text-slate-900">
            Empleados
          </h2>
        </Link>

        <Link
          href="/recursos-humanos/nomina/reportes/nomina"
          className="bg-white hover:bg-slate-50 rounded-2xl p-5 shadow-sm border block"
        >
          <p className="text-sm text-slate-500">Reporte</p>
          <h2 className="text-xl font-black text-slate-900">
            Nómina
          </h2>
        </Link>

        <Link
          href="/recursos-humanos/nomina/reportes/vacaciones"
          className="bg-white hover:bg-slate-50 rounded-2xl p-5 shadow-sm border block"
        >
          <p className="text-sm text-slate-500">Reporte</p>
          <h2 className="text-xl font-black text-slate-900">
            Vacaciones
          </h2>
        </Link>

        <Link
          href="/recursos-humanos/nomina/reportes/prestaciones"
          className="bg-white hover:bg-slate-50 rounded-2xl p-5 shadow-sm border block"
        >
          <p className="text-sm text-slate-500">Reporte</p>
          <h2 className="text-xl font-black text-slate-900">
            Prestaciones
          </h2>
        </Link>

        <Link
          href="/recursos-humanos/nomina/reportes/nomina"
          className="bg-white hover:bg-slate-50 rounded-2xl p-5 shadow-sm border block"
        >
          <p className="text-sm text-slate-500">Módulo</p>
          <h2 className="text-xl font-black text-slate-900">
            Procesar Nómina
          </h2>
        </Link>

        <Link
          href="/recursos-humanos/nomina/reportes/prestaciones"
          className="bg-white hover:bg-slate-50 rounded-2xl p-5 shadow-sm border block"
        >
          <p className="text-sm text-slate-500">Módulo</p>
          <h2 className="text-xl font-black text-slate-900">
            Prestaciones Laborales
          </h2>
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-black">Nóminas pendientes</h2>
              <p className="text-sm text-slate-500">
                Pendientes o aprobadas del período actual.
              </p>
            </div>

            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">
              {nominasPendientesCantidad}
            </span>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Empleado</th>
                  <th className="p-3 border text-left">Tipo</th>
                  <th className="p-3 border text-right">Neto</th>
                  <th className="p-3 border text-center">Estado</th>
                </tr>
              </thead>

              <tbody>
                {nominasMes
                  .filter((n) => n.estado !== "Pagada" && n.estado !== "Anulada")
                  .slice(0, 6)
                  .map((n) => (
                    <tr key={n.id}>
                      <td className="p-3 border">
                        <p className="font-bold">{n.nombre_empleado}</p>
                        <p className="text-xs text-slate-500">
                          {n.numero_empleado || "-"} · {n.cargo || "-"}
                        </p>
                      </td>

                      <td className="p-3 border">
                        {n.tipo_nomina || "Nómina Regular"}
                      </td>

                      <td className="p-3 border text-right font-bold text-blue-700">
                        RD${moneda(n.neto_pagar)}
                      </td>

                      <td className="p-3 border text-center">
                        <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">
                          {n.estado}
                        </span>
                      </td>
                    </tr>
                  ))}

                {nominasPendientesCantidad === 0 && (
                  <tr>
                    <td className="p-5 border text-center text-slate-500" colSpan={4}>
                      No hay nóminas pendientes del mes actual.
                    </td>
                  </tr>
                )}
              </tbody>

              {nominasPendientesCantidad > 0 && (
                <tfoot className="bg-slate-100 font-black">
                  <tr>
                    <td className="p-3 border" colSpan={2}>Total pendiente</td>
                    <td className="p-3 border text-right text-blue-700">
                      RD${moneda(nominaPendiente)}
                    </td>
                    <td className="p-3 border"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="bg-white rounded-3xl border shadow-sm p-6">
          <h2 className="text-xl font-black mb-1">Últimos empleados</h2>
          <p className="text-sm text-slate-500 mb-4">
            Empleados registrados recientemente.
          </p>

          <div className="space-y-3">
            {ultimosEmpleados.map((e) => (
              <div key={e.id} className="border rounded-2xl p-4">
                <p className="font-black">{e.nombre}</p>
                <p className="text-sm text-slate-500">
                  {e.numero_empleado || "-"} · {e.cargo || "-"} ·{" "}
                  {e.departamento || "-"}
                </p>
                <p className="text-sm text-slate-500">
                  Ingreso: {fecha(e.fecha_ingreso)} · Salario: RD${moneda(e.salario)}
                </p>
              </div>
            ))}

            {ultimosEmpleados.length === 0 && (
              <div className="border rounded-2xl p-5 text-center text-slate-500">
                No hay empleados registrados.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border shadow-sm p-6">
          <h2 className="text-xl font-black mb-1">Mayor balance de vacaciones</h2>
          <p className="text-sm text-slate-500 mb-4">
            Empleados con más días disponibles.
          </p>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Empleado</th>
                  <th className="p-3 border text-left">Departamento</th>
                  <th className="p-3 border text-right">Días</th>
                </tr>
              </thead>

              <tbody>
                {topVacacionesDisponibles.map((b) => (
                  <tr key={b.id}>
                    <td className="p-3 border">
                      <p className="font-bold">{b.nombre_empleado}</p>
                      <p className="text-xs text-slate-500">
                        {b.numero_empleado || "-"} · {b.cargo || "-"}
                      </p>
                    </td>

                    <td className="p-3 border">{b.departamento || "-"}</td>

                    <td className="p-3 border text-right font-black text-purple-700">
                      {Number(b.dias_disponibles || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}

                {topVacacionesDisponibles.length === 0 && (
                  <tr>
                    <td className="p-5 border text-center text-slate-500" colSpan={3}>
                      No hay balance de vacaciones generado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-3xl border shadow-sm p-6">
          <h2 className="text-xl font-black mb-1">Vacaciones aprobadas</h2>
          <p className="text-sm text-slate-500 mb-4">
            Próximas o recientes solicitudes aprobadas.
          </p>

          <div className="space-y-3">
            {vacacionesAprobadas.map((v) => (
              <div key={v.id} className="border rounded-2xl p-4">
                <p className="font-black">{v.nombre_empleado}</p>
                <p className="text-sm text-slate-500">
                  {v.tipo} · {v.cantidad_dias} días
                </p>
                <p className="text-sm text-slate-500">
                  Desde {fecha(v.fecha_inicio)} hasta {fecha(v.fecha_fin)}
                </p>
              </div>
            ))}

            {vacacionesAprobadas.length === 0 && (
              <div className="border rounded-2xl p-5 text-center text-slate-500">
                No hay vacaciones aprobadas.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border shadow-sm p-6 xl:col-span-2">
          <h2 className="text-xl font-black mb-1">Últimas prestaciones calculadas</h2>
          <p className="text-sm text-slate-500 mb-4">
            Casos recientes de prestaciones laborales.
          </p>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Empleado</th>
                  <th className="p-3 border text-left">Salida</th>
                  <th className="p-3 border text-right">Total</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">Recibo</th>
                </tr>
              </thead>

              <tbody>
                {ultimasPrestaciones.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 border">
                      <p className="font-bold">{p.nombre_empleado}</p>
                      <p className="text-xs text-slate-500">
                        {p.numero_empleado || "-"} · {p.cargo || "-"}
                      </p>
                    </td>

                    <td className="p-3 border">
                      <p>{p.tipo_salida}</p>
                      <p className="text-xs text-slate-500">
                        {fecha(p.fecha_salida)}
                      </p>
                    </td>

                    <td className="p-3 border text-right font-black text-blue-700">
                      RD${moneda(p.total_prestaciones)}
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          p.estado === "Pagada"
                            ? "bg-green-100 text-green-700"
                            : p.estado === "Aprobada"
                            ? "bg-blue-100 text-blue-700"
                            : p.estado === "Anulada"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {p.estado}
                      </span>
                    </td>

                    <td className="p-3 border text-center">
                      <Link
                        href={`/recursos-humanos/prestaciones/recibo/${p.id}`}
                        className="bg-purple-700 hover:bg-purple-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                      >
                        Recibo
                      </Link>
                    </td>
                  </tr>
                ))}

                {ultimasPrestaciones.length === 0 && (
                  <tr>
                    <td className="p-5 border text-center text-slate-500" colSpan={5}>
                      No hay prestaciones registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
