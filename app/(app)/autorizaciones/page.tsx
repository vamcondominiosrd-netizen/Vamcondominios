"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Clock3,
  DoorClosed,
  DoorOpen,
  FileText,
  History,
  MapPin,
  Megaphone,
  Package,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  Wrench,
  XCircle,
} from "lucide-react";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import SectionCard from "@/components/vam/enterprise/SectionCard";

type MenuItem = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
  color?: string;
  bg?: string;
};

type Indicador = {
  titulo: string;
  valor: string;
  descripcion: string;
  icono: any;
  href: string;
  color: string;
  bg: string;
};

export default function AutorizacionesPage() {
  const dashboard: Indicador[] = [
    {
      titulo: "Pendientes",
      valor: "0",
      descripcion: "Solicitudes por revisar",
      icono: Clock,
      href: "/autorizaciones/pendientes",
      color: "text-yellow-700",
      bg: "bg-yellow-50",
    },
    {
      titulo: "Aprobadas hoy",
      valor: "0",
      descripcion: "Autorizadas para hoy",
      icono: CheckCircle2,
      href: "/autorizaciones/aprobadas",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      titulo: "Rechazadas",
      valor: "0",
      descripcion: "Solicitudes no aprobadas",
      icono: XCircle,
      href: "/autorizaciones/rechazadas",
      color: "text-red-700",
      bg: "bg-red-50",
    },
    {
      titulo: "Personas dentro",
      valor: "0",
      descripcion: "Accesos actualmente activos",
      icono: Users,
      href: "/autorizaciones/en-proceso",
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
  ];

  const operaciones: MenuItem[] = [
    {
      titulo: "Nueva solicitud",
      descripcion: "Registrar permiso, trabajo, mudanza, entrega o servicio.",
      icono: ClipboardList,
      href: "/autorizaciones/nueva",
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      titulo: "Solicitudes pendientes",
      descripcion: "Revisar solicitudes nuevas pendientes de aprobación.",
      icono: Clock,
      href: "/autorizaciones/pendientes",
      color: "text-yellow-700",
      bg: "bg-yellow-50",
    },
    {
      titulo: "Solicitudes aprobadas",
      descripcion: "Ver autorizaciones aprobadas para entrada o ejecución.",
      icono: CheckCircle2,
      href: "/autorizaciones/aprobadas",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      titulo: "Solicitudes rechazadas",
      descripcion: "Historial de solicitudes no aprobadas.",
      icono: XCircle,
      href: "/autorizaciones/rechazadas",
      color: "text-red-700",
      bg: "bg-red-50",
    },
    {
      titulo: "En proceso",
      descripcion: "Personas o servicios actualmente dentro del condominio.",
      icono: Users,
      href: "/autorizaciones/en-proceso",
      color: "text-purple-700",
      bg: "bg-purple-50",
    },
    {
      titulo: "Finalizadas",
      descripcion: "Solicitudes cerradas con entrada y salida completadas.",
      icono: CheckCircle2,
      href: "/autorizaciones/finalizadas",
      color: "text-slate-700",
      bg: "bg-slate-100",
    },
  ];

  const acceso: MenuItem[] = [
    {
      titulo: "Entradas de hoy",
      descripcion: "Registrar y consultar entradas del día.",
      icono: DoorOpen,
      href: "/autorizaciones/entradas",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      titulo: "Salidas de hoy",
      descripcion: "Registrar salidas y cierre de acceso.",
      icono: DoorClosed,
      href: "/autorizaciones/salidas",
      color: "text-orange-700",
      bg: "bg-orange-50",
    },
    {
      titulo: "Centro de control",
      descripcion: "Personas dentro, entradas, salidas y alertas.",
      icono: History,
      href: "/autorizaciones/centro-control",
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      titulo: "Escanear QR",
      descripcion: "Validar autorización por código QR.",
      icono: QrCode,
      href: "/autorizaciones/escanear-qr",
      color: "text-purple-700",
      bg: "bg-purple-50",
    },
    {
      titulo: "Historial de accesos",
      descripcion: "Consulta general de entradas y salidas.",
      icono: FileText,
      href: "/autorizaciones/historial-accesos",
      color: "text-slate-700",
      bg: "bg-slate-100",
    },
  ];

  const consultas: MenuItem[] = [
    {
      titulo: "Por propietario",
      descripcion: "Buscar autorizaciones por propietario.",
      icono: Search,
      href: "/autorizaciones/consulta-propietario",
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      titulo: "Por unidad",
      descripcion: "Buscar por apartamento, casa, local o solar.",
      icono: Building2,
      href: "/autorizaciones/consulta-unidad",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      titulo: "Por vehículo",
      descripcion: "Consulta por placa o datos del vehículo.",
      icono: Truck,
      href: "/autorizaciones/consulta-vehiculo",
      color: "text-orange-700",
      bg: "bg-orange-50",
    },
    {
      titulo: "Por cédula",
      descripcion: "Buscar visitante, chofer, técnico o proveedor.",
      icono: Search,
      href: "/autorizaciones/consulta-cedula",
      color: "text-purple-700",
      bg: "bg-purple-50",
    },
  ];

  const catalogos: MenuItem[] = [
    {
      titulo: "Tipos de solicitud",
      descripcion: "Trabajo, mudanza, servicio, entrega o retiro.",
      icono: ClipboardList,
      href: "/autorizaciones/catalogos/tipos-solicitud",
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      titulo: "Tipos de trabajo",
      descripcion: "Plomería, electricidad, pintura, instalación y otros.",
      icono: Wrench,
      href: "/autorizaciones/catalogos/tipos-trabajo",
      color: "text-orange-700",
      bg: "bg-orange-50",
    },
    {
      titulo: "Empresas frecuentes",
      descripcion: "Proveedores y compañías comunes.",
      icono: Building2,
      href: "/autorizaciones/catalogos/empresas",
      color: "text-slate-700",
      bg: "bg-slate-100",
    },
    {
      titulo: "Motivos de rechazo",
      descripcion: "Razones para rechazar solicitudes.",
      icono: XCircle,
      href: "/autorizaciones/catalogos/motivos-rechazo",
      color: "text-red-700",
      bg: "bg-red-50",
    },
    {
      titulo: "Tipos de visitantes",
      descripcion: "Técnicos, choferes, proveedores y visitantes.",
      icono: Users,
      href: "/autorizaciones/catalogos/tipos-visitantes",
      color: "text-purple-700",
      bg: "bg-purple-50",
    },
    {
      titulo: "Áreas de acceso",
      descripcion: "Entradas, parqueos, áreas comunes y puntos de control.",
      icono: MapPin,
      href: "/autorizaciones/catalogos/areas-acceso",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      titulo: "Horarios permitidos",
      descripcion: "Horarios disponibles para autorizaciones.",
      icono: Clock3,
      href: "/autorizaciones/catalogos/horarios",
      color: "text-yellow-700",
      bg: "bg-yellow-50",
    },
    {
      titulo: "Configuración",
      descripcion: "Reglas, morosidad, QR y parámetros de seguridad.",
      icono: Settings,
      href: "/autorizaciones/configuracion",
      color: "text-slate-700",
      bg: "bg-slate-100",
    },
  ];

  return (
    <PageContainer>
      <ModuleMenu
        title="Operaciones"
        subtitle="Gestión operativa del condominio: incidencias, reservas, anuncios, documentos, mantenimiento, inventario y autorizaciones."
        tone="orange"
        items={[
          {
            href: "/operaciones",
            label: "Inicio operaciones",
            icon: ClipboardList,
          },
          {
            href: "/incidencias",
            label: "Incidencias",
            icon: AlertTriangle,
          },
          {
            href: "/reservas-areas",
            label: "Reservas",
            icon: CalendarDays,
          },
          {
            href: "/anuncios",
            label: "Anuncios",
            icon: Megaphone,
          },
          {
            href: "/documentos",
            label: "Documentos",
            icon: FileText,
          },
          {
            href: "/trabajos-tecnicos",
            label: "Mantenimiento",
            icon: Wrench,
          },
          {
            href: "/administracion/inventario",
            label: "Inventario",
            icon: Package,
          },
          {
            href: "/autorizaciones",
            label: "Autorizaciones",
            icon: ShieldCheck,
          },
        ]}
      />

      <ModuleToolbar
        title="Autorizaciones y Control de Acceso"
        subtitle="Gestión de permisos de trabajo, mudanzas, entregas, servicios y control de acceso por QR."
        icon={ShieldCheck}
      />

      <SectionCard
        title="Resumen de autorizaciones"
        subtitle="Indicadores rápidos del control de acceso."
        action={
          <Link
            href="/autorizaciones/nueva"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-700 px-4 py-2 text-sm font-bold text-white hover:bg-orange-800"
          >
            Nueva solicitud
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboard.map((item) => {
            const Icon = item.icono;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.bg}`}
                  >
                    <Icon className={`h-6 w-6 ${item.color}`} />
                  </div>

                  <span className="text-2xl font-black text-slate-900">
                    {item.valor}
                  </span>
                </div>

                <h3 className="mt-4 text-base font-black text-slate-900 group-hover:text-orange-700">
                  {item.titulo}
                </h3>

                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  {item.descripcion}
                </p>
              </Link>
            );
          })}
        </div>
      </SectionCard>

      <MenuSection
        titulo="Operaciones"
        descripcion="Solicitudes y estado general de permisos."
        items={operaciones}
      />

      <MenuSection
        titulo="Control de acceso / Seguridad"
        descripcion="Entradas, salidas, QR y control de personas dentro."
        items={acceso}
      />

      <MenuSection
        titulo="Consultas"
        descripcion="Búsquedas rápidas por propietario, unidad, vehículo o cédula."
        items={consultas}
      />

      <MenuSection
        titulo="Catálogos y configuración"
        descripcion="Parámetros internos del módulo de autorizaciones."
        items={catalogos}
      />

      <SectionCard
        title="Flujo recomendado"
        subtitle="Orden sugerido para gestionar autorizaciones y accesos."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FlujoPaso
            numero="1"
            titulo="Solicitud"
            descripcion="Registrar permiso desde administración o propietario."
          />

          <FlujoPaso
            numero="2"
            titulo="Aprobación"
            descripcion="Validar datos, propietario, unidad, fecha y motivo."
          />

          <FlujoPaso
            numero="3"
            titulo="Acceso"
            descripcion="Seguridad valida QR o registra entrada manual."
          />

          <FlujoPaso
            numero="4"
            titulo="Salida"
            descripcion="Cerrar autorización con salida y control histórico."
          />
        </div>
      </SectionCard>
    </PageContainer>
  );
}

function MenuSection({
  titulo,
  descripcion,
  items,
}: {
  titulo: string;
  descripcion: string;
  items: MenuItem[];
}) {
  return (
    <SectionCard title={titulo} subtitle={descripcion}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icono;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    item.bg || "bg-orange-50"
                  }`}
                >
                  <Icon className={`h-6 w-6 ${item.color || "text-orange-700"}`} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-black text-slate-900 group-hover:text-orange-700">
                    {item.titulo}
                  </h3>

                  <p className="mt-1 min-h-[48px] text-sm leading-relaxed text-slate-500">
                    {item.descripcion}
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-sm font-black text-orange-700">
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
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-orange-700 text-sm font-black text-white">
        {numero}
      </div>

      <p className="font-black text-slate-900">{titulo}</p>

      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {descripcion}
      </p>
    </div>
  );
}