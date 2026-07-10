import Link from "next/link";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  Clock3,
  DoorOpen,
  DoorClosed,
  Users,
  QrCode,
  Search,
  FileText,
  Settings,
  Truck,
  Wrench,
  Building2,
  MapPin,
} from "lucide-react";

export default function AutorizacionesPage() {
  const dashboard = [
    {
      titulo: "Pendientes",
      valor: "0",
      descripcion: "Solicitudes por revisar",
      icono: Clock,
      href: "/autorizaciones/pendientes",
    },
    {
      titulo: "Aprobadas Hoy",
      valor: "0",
      descripcion: "Autorizadas para hoy",
      icono: CheckCircle2,
      href: "/autorizaciones/aprobadas",
    },
    {
      titulo: "Rechazadas",
      valor: "0",
      descripcion: "Solicitudes no aprobadas",
      icono: XCircle,
      href: "/autorizaciones/rechazadas",
    },
    {
      titulo: "Dentro",
      valor: "0",
      descripcion: "Personas dentro del condominio",
      icono: Users,
      href: "/autorizaciones/en-proceso",
    },
  ];

  const operaciones = [
    {
      titulo: "Nueva Solicitud",
      descripcion: "Registrar permiso o autorización",
      icono: ClipboardList,
      href: "/autorizaciones/nueva",
    },
    {
      titulo: "Solicitudes Pendientes",
      descripcion: "Revisar solicitudes nuevas",
      icono: Clock,
      href: "/autorizaciones/pendientes",
    },
    {
      titulo: "Solicitudes Aprobadas",
      descripcion: "Ver autorizaciones aprobadas",
      icono: CheckCircle2,
      href: "/autorizaciones/aprobadas",
    },
    {
      titulo: "Solicitudes Rechazadas",
      descripcion: "Historial de rechazos",
      icono: XCircle,
      href: "/autorizaciones/rechazadas",
    },
    {
      titulo: "En Proceso",
      descripcion: "Personas actualmente dentro",
      icono: Users,
      href: "/autorizaciones/en-proceso",
    },
    {
      titulo: "Finalizadas",
      descripcion: "Solicitudes cerradas",
      icono: CheckCircle2,
      href: "/autorizaciones/finalizadas",
    },
  ];

  const acceso = [
    {
      titulo: "Entradas de Hoy",
      descripcion: "Registrar y consultar entradas",
      icono: DoorOpen,
      href: "/autorizaciones/entradas",
    },
    {
      titulo: "Salidas de Hoy",
      descripcion: "Registrar salidas",
      icono: DoorClosed,
      href: "/autorizaciones/salidas",
    },
    {
     titulo: "Centro de Control",
     descripcion: "Personas dentro, entradas, salidas y alertas",
     icono: History,
     href: "/autorizaciones/centro-control",
    },
    {
      titulo: "Escanear QR",
      descripcion: "Validar autorización por código QR",
      icono: QrCode,
      href: "/autorizaciones/escanear-qr",
    },
    {
      titulo: "Historial de Accesos",
      descripcion: "Consulta general de entradas y salidas",
      icono: FileText,
      href: "/autorizaciones/historial-accesos",
    },
  ];

  const consultas = [
    {
      titulo: "Por Propietario",
      descripcion: "Buscar autorizaciones por propietario",
      icono: Search,
      href: "/autorizaciones/consulta-propietario",
    },
    {
      titulo: "Por Unidad",
      descripcion: "Buscar por apartamento, casa o solar",
      icono: Building2,
      href: "/autorizaciones/consulta-unidad",
    },
    {
      titulo: "Por Vehículo",
      descripcion: "Consulta por placa o datos del vehículo",
      icono: Truck,
      href: "/autorizaciones/consulta-vehiculo",
    },
    {
      titulo: "Por Cédula",
      descripcion: "Buscar visitante, chofer o técnico",
      icono: Search,
      href: "/autorizaciones/consulta-cedula",
    },
  ];

  const catalogos = [
    {
      titulo: "Tipos de Solicitud",
      descripcion: "Trabajo, mudanza, servicio, entrega",
      icono: ClipboardList,
      href: "/autorizaciones/catalogos/tipos-solicitud",
    },
    {
      titulo: "Tipos de Trabajo",
      descripcion: "Plomería, electricidad, pintura, etc.",
      icono: Wrench,
      href: "/autorizaciones/catalogos/tipos-trabajo",
    },
    {
      titulo: "Empresas Frecuentes",
      descripcion: "Proveedores y compañías comunes",
      icono: Building2,
      href: "/autorizaciones/catalogos/empresas",
    },
    {
      titulo: "Motivos de Rechazo",
      descripcion: "Razones para rechazar solicitudes",
      icono: XCircle,
      href: "/autorizaciones/catalogos/motivos-rechazo",
    },
    {
      titulo: "Tipos de Visitantes",
      descripcion: "Técnicos, choferes y proveedores",
      icono: Users,
      href: "/autorizaciones/catalogos/tipos-visitantes",
    },
    {
      titulo: "Áreas de Acceso",
      descripcion: "Entradas, parqueos y áreas comunes",
      icono: MapPin,
      href: "/autorizaciones/catalogos/areas-acceso",
    },
    {
      titulo: "Horarios Permitidos",
      descripcion: "Horarios disponibles para autorizaciones",
      icono: Clock3,
      href: "/autorizaciones/catalogos/horarios",
    },
    {
      titulo: "Configuración",
      descripcion: "Reglas, morosidad y QR",
      icono: Settings,
      href: "/autorizaciones/configuracion",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-200">
                VAM Condominio
              </p>
              <h1 className="mt-1 text-2xl font-bold md:text-3xl">
                Autorizaciones y Control de Acceso
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-200">
                Gestión de permisos de trabajo, mudanzas, entradas de servicios,
                entregas, retiros de artículos y control de acceso por QR.
              </p>
            </div>

            <Link
              href="/autorizaciones/nueva"
              className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-semibold text-slate-900 shadow hover:bg-blue-50"
            >
              Nueva Solicitud
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboard.map((item, index) => {
            const Icon = item.icono;

            return (
              <Link
                key={`${item.href}-${index}`}
                href={item.href}
                className="rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-2xl font-bold text-slate-900">
                    {item.valor}
                  </span>
                </div>
                <h2 className="mt-4 text-base font-bold text-slate-900">
                  {item.titulo}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {item.descripcion}
                </p>
              </Link>
            );
          })}
        </section>

        <MenuSection titulo="Operaciones" items={operaciones} />
        <MenuSection titulo="Control de Acceso / Seguridad" items={acceso} />
        <MenuSection titulo="Consultas" items={consultas} />
        <MenuSection titulo="Catálogos y Configuración" items={catalogos} />
      </div>
    </main>
  );
}

function MenuSection({
  titulo,
  items,
}: {
  titulo: string;
  items: {
    titulo: string;
    descripcion: string;
    href: string;
    icono: any;
  }[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        {items.map((item, index) => {
          const Icon = item.icono;

          return (
            <Link
              key={`${item.href}-${index}`}
              href={item.href}
              className="group rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-slate-900 text-white shadow">
                <Icon className="h-6 w-6" />
              </div>

              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700">
                {item.titulo}
              </h3>

              <p className="mt-1 text-sm leading-5 text-slate-500">
                {item.descripcion}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}