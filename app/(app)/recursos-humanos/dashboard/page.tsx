"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  FileText,
  HandCoins,
  RefreshCw,
  ReceiptText,
  UserCheck,
  Users,
  WalletCards,
  Boxes,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type Empleado = {
  id: number;
  condominio_id?: number | null;
  numero_empleado: string | null;
  nombre: string | null;
  cargo: string | null;
  departamento: string | null;
  salario: number | null;
  fecha_ingreso: string | null;
  estado: string | null;
  created_at: string | null;
};

type Nomina = {
  id: number;
  condominio_id?: number | null;
  periodo: string | null;
  empleado_id: number | null;
  numero_empleado: string | null;
  nombre_empleado: string | null;
  cargo: string | null;
  departamento: string | null;
  tipo_nomina: string | null;
  total_ingresos: number | null;
  total_descuentos: number | null;
  neto_pagar: number | null;
  estado: string | null;
  fecha_pago: string | null;
  created_at: string | null;
};

type BalanceVacaciones = {
  id: number;
  condominio_id?: number | null;
  empleado_id: number | null;
  numero_empleado: string | null;
  nombre_empleado: string | null;
  cargo: string | null;
  departamento: string | null;
  anio: number | null;
  dias_disponibles: number | null;
  estado: string | null;
};

type VacacionPermiso = {
  id: number;
  condominio_id?: number | null;
  empleado_id: number | null;
  numero_empleado: string | null;
  nombre_empleado: string | null;
  cargo: string | null;
  departamento: string | null;
  tipo: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  cantidad_dias: number | null;
  estado: string | null;
};

type Prestacion = {
  id: number;
  condominio_id?: number | null;
  empleado_id: number | null;
  numero_empleado: string | null;
  nombre_empleado: string | null;
  cargo: string | null;
  departamento: string | null;
  fecha_salida: string | null;
  tipo_salida: string | null;
  total_prestaciones: number | null;
  estado: string | null;
  created_at: string | null;
};

type ModuloRH = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
  color: string;
  bg: string;
};

function numero(valor: string | number | null | undefined) {
  return Number(valor || 0);
}

function moneda(valor: string | number | null | undefined) {
  return numero(valor).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fecha(valor: string | null | undefined) {
  if (!valor) return "-";

  const limpio = String(valor).split("T")[0];
  const partes = limpio.split("-");

  if (partes.length !== 3) return limpio;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function estadoClass(estado: string | null | undefined) {
  if (estado === "Pagada" || estado === "Activo" || estado === "Aprobada") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (estado === "Pendiente") {
    return "border-yellow-100 bg-yellow-50 text-yellow-700";
  }

  if (estado === "Anulada" || estado === "Inactivo") {
    return "border-red-100 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function DashboardRHPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [nominasMes, setNominasMes] = useState<Nomina[]>([]);
  const [balanceVacaciones, setBalanceVacaciones] = useState<
    BalanceVacaciones[]
  >([]);
  const [vacacionesAprobadas, setVacacionesAprobadas] = useState<
    VacacionPermiso[]
  >([]);
  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [loading, setLoading] = useState(false);

  const periodoActual = new Date().toISOString().slice(0, 7);
  const anioActual = new Date().getFullYear();

  const modulos: ModuloRH[] = [
    {
      titulo: "Empleados",
      descripcion:
        "Registro, consulta y mantenimiento de empleados del condominio.",
      href: "/recursos-humanos/personal",
      icono: Users,
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      titulo: "Procesar Nómina",
      descripcion:
        "Generar, aprobar y consultar nóminas mensuales del condominio.",
      href: "/recursos-humanos/nomina",
      icono: WalletCards,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      titulo: "Vacaciones y Permisos",
      descripcion:
        "Solicitudes, aprobación y balance anual de vacaciones.",
      href: "/recursos-humanos/vacaciones",
      icono: CalendarDays,
      color: "text-purple-700",
      bg: "bg-purple-50",
    },
    {
      titulo: "Prestaciones Laborales",
      descripcion:
        "Cálculo de liquidación, prestaciones y recibos de salida.",
      href: "/recursos-humanos/prestaciones",
      icono: HandCoins,
      color: "text-orange-700",
      bg: "bg-orange-50",
    },
    {
      titulo: "Reportes Empleados",
      descripcion:
        "Listado general de empleados, cargos, departamentos y salarios.",
      href: "/recursos-humanos/nomina/reportes/empleados",
      icono: FileText,
      color: "text-slate-700",
      bg: "bg-slate-100",
    },
    {
      titulo: "Reportes Nómina",
      descripcion:
        "Reporte por período de ingresos, descuentos y neto a pagar.",
      href: "/recursos-humanos/nomina/reportes/nomina",
      icono: BarChart3,
      color: "text-sky-700",
      bg: "bg-sky-50",
    },
    {
      titulo: "Reportes Vacaciones",
      descripcion:
        "Balance de vacaciones tomadas, disponibles y pendientes.",
      href: "/recursos-humanos/nomina/reportes/vacaciones",
      icono: CalendarCheck,
      color: "text-indigo-700",
      bg: "bg-indigo-50",
    },
    {
      titulo: "Reportes Prestaciones",
      descripcion:
        "Historial de prestaciones calculadas, aprobadas y pagadas.",
      href: "/recursos-humanos/nomina/reportes/prestaciones",
      icono: ReceiptText,
      color: "text-red-700",
      bg: "bg-red-50",
    },
  ];

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id || !Number(id)) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    cargarDashboard(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarDashboard(id: string) {
    const condominioIdNumero = Number(id);

    if (!condominioIdNumero) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    setLoading(true);
    setMensaje("");

    const [
      empleadosResp,
      nominaResp,
      balanceResp,
      vacacionesResp,
      prestacionesResp,
    ] = await Promise.all([
      supabase
        .from("empleados")
        .select(
          "id, condominio_id, numero_empleado, nombre, cargo, departamento, salario, fecha_ingreso, estado, created_at",
        )
        .eq("condominio_id", condominioIdNumero)
        .order("created_at", { ascending: false }),

      supabase
        .from("rh_nomina")
        .select("*")
        .eq("condominio_id", condominioIdNumero)
        .eq("periodo", periodoActual)
        .order("created_at", { ascending: false }),

      supabase
        .from("rh_balance_vacaciones")
        .select("*")
        .eq("condominio_id", condominioIdNumero)
        .eq("anio", anioActual)
        .eq("estado", "Activo")
        .order("dias_disponibles", { ascending: false }),

      supabase
        .from("rh_vacaciones_permisos")
        .select("*")
        .eq("condominio_id", condominioIdNumero)
        .eq("estado", "Aprobado")
        .order("fecha_inicio", { ascending: true })
        .limit(8),

      supabase
        .from("rh_prestaciones_laborales")
        .select("*")
        .eq("condominio_id", condominioIdNumero)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    setLoading(false);

    if (empleadosResp.error) {
      setMensaje("Error cargando empleados: " + empleadosResp.error.message);
      return;
    }

    if (nominaResp.error) {
      setMensaje("Error cargando nómina: " + nominaResp.error.message);
      return;
    }

    if (balanceResp.error) {
      setMensaje(
        "Error cargando balance de vacaciones: " + balanceResp.error.message,
      );
      return;
    }

    if (vacacionesResp.error) {
      setMensaje(
        "Error cargando vacaciones aprobadas: " +
          vacacionesResp.error.message,
      );
      return;
    }

    if (prestacionesResp.error) {
      setMensaje(
        "Error cargando prestaciones: " + prestacionesResp.error.message,
      );
      return;
    }

    setEmpleados(
      ((empleadosResp.data as Empleado[]) || []).filter(
        (e) => Number(e.condominio_id) === condominioIdNumero,
      ),
    );

    setNominasMes(
      ((nominaResp.data as Nomina[]) || []).filter(
        (n) => Number(n.condominio_id) === condominioIdNumero,
      ),
    );

    setBalanceVacaciones(
      ((balanceResp.data as BalanceVacaciones[]) || []).filter(
        (b) => Number(b.condominio_id) === condominioIdNumero,
      ),
    );

    setVacacionesAprobadas(
      ((vacacionesResp.data as VacacionPermiso[]) || []).filter(
        (v) => Number(v.condominio_id) === condominioIdNumero,
      ),
    );

    setPrestaciones(
      ((prestacionesResp.data as Prestacion[]) || []).filter(
        (p) => Number(p.condominio_id) === condominioIdNumero,
      ),
    );
  }

  async function refrescar() {
    if (!condominioId || !Number(condominioId)) return;
    await cargarDashboard(condominioId);
  }

  const empleadosSeguros = useMemo(() => {
    const condominioIdNumero = Number(condominioId);

    if (!condominioIdNumero) return [];

    return empleados.filter(
      (e) => Number(e.condominio_id) === condominioIdNumero,
    );
  }, [empleados, condominioId]);

  const nominasSeguras = useMemo(() => {
    const condominioIdNumero = Number(condominioId);

    if (!condominioIdNumero) return [];

    return nominasMes.filter(
      (n) => Number(n.condominio_id) === condominioIdNumero,
    );
  }, [nominasMes, condominioId]);

  const balanceVacacionesSeguro = useMemo(() => {
    const condominioIdNumero = Number(condominioId);

    if (!condominioIdNumero) return [];

    return balanceVacaciones.filter(
      (b) => Number(b.condominio_id) === condominioIdNumero,
    );
  }, [balanceVacaciones, condominioId]);

  const vacacionesAprobadasSeguras = useMemo(() => {
    const condominioIdNumero = Number(condominioId);

    if (!condominioIdNumero) return [];

    return vacacionesAprobadas.filter(
      (v) => Number(v.condominio_id) === condominioIdNumero,
    );
  }, [vacacionesAprobadas, condominioId]);

  const prestacionesSeguras = useMemo(() => {
    const condominioIdNumero = Number(condominioId);

    if (!condominioIdNumero) return [];

    return prestaciones.filter(
      (p) => Number(p.condominio_id) === condominioIdNumero,
    );
  }, [prestaciones, condominioId]);

  const empleadosActivos = empleadosSeguros.filter(
    (e) => e.estado === "Activo",
  );

  const empleadosInactivos = empleadosSeguros.filter(
    (e) => e.estado === "Inactivo",
  );

  const nominaNetoMes = nominasSeguras.reduce(
    (sum, n) => sum + numero(n.neto_pagar),
    0,
  );

  const nominasPendientes = nominasSeguras.filter(
    (n) => n.estado !== "Pagada" && n.estado !== "Anulada",
  );

  const nominaPendiente = nominasPendientes.reduce(
    (sum, n) => sum + numero(n.neto_pagar),
    0,
  );

  const vacacionesDisponiblesTotal = balanceVacacionesSeguro.reduce(
    (sum, b) => sum + numero(b.dias_disponibles),
    0,
  );

  const prestacionesPendientes = prestacionesSeguras.filter(
    (p) => p.estado !== "Pagada" && p.estado !== "Anulada",
  );

  const totalPrestacionesPendientes = prestacionesPendientes.reduce(
    (sum, p) => sum + numero(p.total_prestaciones),
    0,
  );

  const ultimosEmpleados = empleadosSeguros.slice(0, 6);
  const topVacacionesDisponibles = balanceVacacionesSeguro.slice(0, 6);
  const ultimasPrestaciones = prestacionesSeguras.slice(0, 6);

  return (
    <PageContainer>
      <ModuleMenu
        title="Recursos Humanos"
        subtitle="Gestión de empleados, nómina, vacaciones, permisos, prestaciones y reportes."
        tone="blue"
        items={[
          {
            href: "/recursos-humanos",
            label: "Inicio RH",
            icon: BriefcaseBusiness,
          },
          {
            href: "/recursos-humanos/personal",
            label: "Empleados",
            icon: Users,
          },
          {
            href: "/recursos-humanos/nomina",
            label: "Nómina",
            icon: WalletCards,
          },
          {
            href: "/recursos-humanos/vacaciones",
            label: "Vacaciones",
            icon: CalendarDays,
          },
          {
            href: "/recursos-humanos/prestaciones",
            label: "Prestaciones",
            icon: HandCoins,
          },
          {
            href: "/recursos-humanos/cargos",
            label: "Cargos",
            icon: Boxes,
           },
          {
            href: "/recursos-humanos/nomina/reportes/nomina",
            label: "Reportes",
            icon: BarChart3,
          },
        ]}
      />

      <ModuleToolbar
        title="Dashboard Recursos Humanos"
        subtitle={`Vista general del personal, nómina, vacaciones y prestaciones. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={BriefcaseBusiness}
        actions={<ModuleActions onRefresh={refrescar} />}
      />

      {mensaje && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          {mensaje}
        </div>
      )}

      <SectionCard
        title="Resumen general"
        subtitle={`Indicadores principales del período ${periodoActual}.`}
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Actualizando
            </div>
          ) : (
            <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">
              {empleadosSeguros.length} empleado(s)
            </span>
          )
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <InfoCompacta
            label="Empleados activos"
            value={`${empleadosActivos.length}`}
            detalle={`Inactivos: ${empleadosInactivos.length}`}
          />

          <InfoCompacta
            label={`Nómina neta ${periodoActual}`}
            value={`RD$ ${moneda(nominaNetoMes)}`}
            detalle={`Registros: ${nominasSeguras.length}`}
          />

          <InfoCompacta
            label="Vacaciones disponibles"
            value={`${vacacionesDisponiblesTotal.toFixed(2)}`}
            detalle="Días acumulados"
          />

          <InfoCompacta
            label="Prestaciones pendientes"
            value={`RD$ ${moneda(totalPrestacionesPendientes)}`}
            detalle={`Casos: ${prestacionesPendientes.length}`}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Opciones de Recursos Humanos"
        subtitle="Seleccione una opción para continuar trabajando."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {modulos.map((modulo) => {
            const Icono = modulo.icono;

            return (
              <Link
                key={`${modulo.titulo}-${modulo.href}`}
                href={modulo.href}
                className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${modulo.bg}`}
                  >
                    <Icono className={`h-6 w-6 ${modulo.color}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black text-slate-900 group-hover:text-blue-700">
                      {modulo.titulo}
                    </h3>

                    <p className="mt-1 min-h-[52px] text-sm leading-relaxed text-slate-500">
                      {modulo.descripcion}
                    </p>

                    <div className="mt-3 flex items-center gap-2 text-sm font-black text-blue-700">
                      <span>Abrir módulo</span>
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard
          title="Nóminas pendientes"
          subtitle="Pendientes o aprobadas del período actual."
          action={
            <span className="rounded-full border border-yellow-100 bg-yellow-50 px-3 py-1 text-xs font-black text-yellow-700">
              {nominasPendientes.length}
            </span>
          }
        >
          {nominasPendientes.length === 0 ? (
            <EmptyState
              title="Sin nóminas pendientes"
              description="No hay nóminas pendientes del mes actual."
            />
          ) : (
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Empleado</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-right">Neto</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {nominasPendientes.slice(0, 6).map((n) => (
                  <tr key={n.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-black">{n.nombre_empleado || "-"}</p>
                      <p className="text-xs text-slate-500">
                        {n.numero_empleado || "-"} · {n.cargo || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      {n.tipo_nomina || "Nómina Regular"}
                    </td>

                    <td className="px-4 py-3 text-right font-black text-blue-700">
                      RD$ {moneda(n.neto_pagar)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${estadoClass(
                          n.estado,
                        )}`}
                      >
                        {n.estado || "-"}
                      </span>
                    </td>
                  </tr>
                ))}

                <tr className="bg-slate-100 font-black">
                  <td className="px-4 py-3" colSpan={2}>
                    Total pendiente
                  </td>
                  <td className="px-4 py-3 text-right text-blue-700">
                    RD$ {moneda(nominaPendiente)}
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tbody>
            </DataTable>
          )}
        </SectionCard>

        <SectionCard
          title="Últimos empleados"
          subtitle="Empleados registrados recientemente."
        >
          {ultimosEmpleados.length === 0 ? (
            <EmptyState
              title="Sin empleados"
              description="No hay empleados registrados para este condominio."
            />
          ) : (
            <div className="space-y-3">
              {ultimosEmpleados.map((e) => (
                <div key={e.id} className="rounded-2xl border bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-black text-slate-900">
                        {e.nombre || "-"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {e.numero_empleado || "-"} · {e.cargo || "-"} ·{" "}
                        {e.departamento || "-"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Ingreso: {fecha(e.fecha_ingreso)}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Salario
                      </p>
                      <p className="font-black text-blue-700">
                        RD$ {moneda(e.salario)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Mayor balance de vacaciones"
          subtitle="Empleados con más días disponibles."
        >
          {topVacacionesDisponibles.length === 0 ? (
            <EmptyState
              title="Sin balance"
              description="No hay balance de vacaciones generado."
            />
          ) : (
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Empleado</th>
                  <th className="px-4 py-3 text-left">Departamento</th>
                  <th className="px-4 py-3 text-right">Días</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {topVacacionesDisponibles.map((b) => (
                  <tr key={b.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-black">{b.nombre_empleado || "-"}</p>
                      <p className="text-xs text-slate-500">
                        {b.numero_empleado || "-"} · {b.cargo || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-3">{b.departamento || "-"}</td>

                    <td className="px-4 py-3 text-right font-black text-purple-700">
                      {numero(b.dias_disponibles).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </SectionCard>

        <SectionCard
          title="Vacaciones aprobadas"
          subtitle="Próximas o recientes solicitudes aprobadas."
        >
          {vacacionesAprobadasSeguras.length === 0 ? (
            <EmptyState
              title="Sin vacaciones aprobadas"
              description="No hay vacaciones aprobadas registradas."
            />
          ) : (
            <div className="space-y-3">
              {vacacionesAprobadasSeguras.map((v) => (
                <div key={v.id} className="rounded-2xl border bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-black text-slate-900">
                        {v.nombre_empleado || "-"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {v.tipo || "-"} · {numero(v.cantidad_dias)} días
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Desde {fecha(v.fecha_inicio)} hasta {fecha(v.fecha_fin)}
                      </p>
                    </div>

                    <span
                      className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black ${estadoClass(
                        v.estado,
                      )}`}
                    >
                      {v.estado || "-"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Últimas prestaciones calculadas"
          subtitle="Casos recientes de prestaciones laborales."
        >
          {ultimasPrestaciones.length === 0 ? (
            <EmptyState
              title="Sin prestaciones"
              description="No hay prestaciones registradas."
            />
          ) : (
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Empleado</th>
                  <th className="px-4 py-3 text-left">Salida</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Recibo</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {ultimasPrestaciones.map((p) => (
                  <tr key={p.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-black">{p.nombre_empleado || "-"}</p>
                      <p className="text-xs text-slate-500">
                        {p.numero_empleado || "-"} · {p.cargo || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p>{p.tipo_salida || "-"}</p>
                      <p className="text-xs text-slate-500">
                        {fecha(p.fecha_salida)}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-right font-black text-blue-700">
                      RD$ {moneda(p.total_prestaciones)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${estadoClass(
                          p.estado,
                        )}`}
                      >
                        {p.estado || "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/recursos-humanos/prestaciones/recibo/${p.id}`}
                        className="inline-flex rounded-xl bg-purple-700 px-3 py-2 text-xs font-bold text-white hover:bg-purple-800"
                      >
                        Recibo
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Flujo recomendado de Recursos Humanos"
        subtitle="Orden sugerido para mantener control laboral y financiero del personal."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FlujoPaso
            numero="1"
            titulo="Empleados"
            descripcion="Registrar empleados, cargos, salarios y fecha de ingreso."
          />

          <FlujoPaso
            numero="2"
            titulo="Nómina"
            descripcion="Generar, aprobar y pagar nómina mensual."
          />

          <FlujoPaso
            numero="3"
            titulo="Vacaciones"
            descripcion="Controlar balance, permisos y vacaciones aprobadas."
          />

          <FlujoPaso
            numero="4"
            titulo="Prestaciones"
            descripcion="Calcular prestaciones y generar recibos de salida."
          />
        </div>
      </SectionCard>
    </PageContainer>
  );
}

function InfoCompacta({
  label,
  value,
  detalle,
}: {
  label: string;
  value: string;
  detalle?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <h3 className="mt-1 text-lg font-black text-slate-900">{value}</h3>

      {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
    </div>
  );
}

function FlujoPaso({
  numero,
  titulo,
  descripcion,
}: {
  numero: string;
  titulo: string;
  descripcion: string;
}) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-sm font-black text-white">
        {numero}
      </div>

      <p className="font-black text-slate-900">{titulo}</p>

      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {descripcion}
      </p>
    </div>
  );
}