import Link from "next/link";
import {
  ArrowLeft,
  ClipboardList,
  Wrench,
  Briefcase,
  Building2,
  XCircle,
  Users,
  MapPin,
  Clock,
  Settings,
} from "lucide-react";

const catalogos = [
  {
    titulo: "Tipos de Solicitud",
    descripcion: "Trabajo, mudanza, servicio, entrega, retiro y otros.",
    href: "/autorizaciones/catalogos",
    icono: ClipboardList,
  },
  {
    titulo: "Tipos de Trabajo",
    descripcion: "Plomería, electricidad, pintura, remodelación y más.",
    href: "/autorizaciones/catalogos/tipos-trabajo",
    icono: Wrench,
  },
  {
    titulo: "Tipos de Servicio",
    descripcion: "Entrega, instalación, servicio técnico y retiro.",
    href: "/autorizaciones/catalogos/tipos-servicio",
    icono: Briefcase,
  },
  {
    titulo: "Empresas Frecuentes",
    descripcion: "Proveedores, técnicos y compañías recurrentes.",
    href: "/autorizaciones/catalogos/empresas",
    icono: Building2,
  },
  {
    titulo: "Motivos de Rechazo",
    descripcion: "Deuda, horario, documentación o casos especiales.",
    href: "/autorizaciones/catalogos/motivos-rechazo",
    icono: XCircle,
  },
  {
    titulo: "Tipos de Visitantes",
    descripcion: "Técnico, chofer, proveedor, mudancero y visitante.",
    href: "/autorizaciones/catalogos/tipos-visitantes",
    icono: Users,
  },
  {
    titulo: "Áreas de Acceso",
    descripcion: "Entrada, parqueo, lobby, ascensor, escalera y carga.",
    href: "/autorizaciones/catalogos/areas-acceso",
    icono: MapPin,
  },
  {
    titulo: "Horarios Permitidos",
    descripcion: "Reglas de horarios por tipo de solicitud.",
    href: "/autorizaciones/catalogos/horarios",
    icono: Clock,
  },
  {
    titulo: "Configuración",
    descripcion: "Parámetros por condominio, morosidad, QR y excepciones.",
    href: "/autorizaciones/configuracion",
    icono: Settings,
  },
];

export default function CatalogosAutorizacionesPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <Link
            href="/autorizaciones"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al módulo
          </Link>

          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            Catálogos Generales
          </h1>
          <p className="text-sm text-slate-500">
            Mantenimientos del módulo de Autorizaciones y Control de Acceso.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          {catalogos.map((item) => {
            const Icon = item.icono;

            return (
              <Link
                key={item.titulo}
                href={item.href}
                className="group rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-slate-900 text-white shadow">
                  <Icon className="h-6 w-6" />
                </div>

                <h2 className="text-base font-bold text-slate-900 group-hover:text-blue-700">
                  {item.titulo}
                </h2>

                <p className="mt-1 text-sm leading-5 text-slate-500">
                  {item.descripcion}
                </p>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}