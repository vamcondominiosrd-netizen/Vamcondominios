"use client";

import Link from "next/link";
import {
  Users,
  BriefcaseBusiness,
  Clock,
  CalendarDays,
  Wallet,
  ShieldCheck,
  FileText,
  BarChart3,
  UserCheck,
  ArrowRight,
} from "lucide-react";

type ModuloRH = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
  fondo: string;
  iconoColor: string;
};

const modulos: ModuloRH[] = [
  {
    titulo: "Personal / Empleados",
    descripcion: "Registro y control del personal del condominio.",
    href: "/recursos-humanos/personal",
    icono: Users,
    fondo: "from-blue-600 to-blue-800",
    iconoColor: "text-blue-700",
  },
  {
    titulo: "Cargos y Puestos",
    descripcion: "Catálogo de cargos, funciones y departamentos.",
    href: "/recursos-humanos/cargos",
    icono: BriefcaseBusiness,
    fondo: "from-slate-700 to-slate-950",
    iconoColor: "text-slate-700",
  },
  {
    titulo: "Asistencia",
    descripcion: "Control de entrada, salida, tardanzas y ausencias.",
    href: "/recursos-humanos/asistencia",
    icono: Clock,
    fondo: "from-green-600 to-green-800",
    iconoColor: "text-green-700",
  },
  {
    titulo: "Turnos",
    descripcion: "Asignación de horarios y turnos de trabajo.",
    href: "/recursos-humanos/turnos",
    icono: CalendarDays,
    fondo: "from-purple-600 to-purple-800",
    iconoColor: "text-purple-700",
  },
  {
    titulo: "Nómina",
    descripcion: "Cálculo de salarios, descuentos y pagos al personal.",
    href: "/recursos-humanos/nomina",
    icono: Wallet,
    fondo: "from-amber-500 to-orange-700",
    iconoColor: "text-amber-700",
  },
  {
    titulo: "Vacaciones / Permisos",
    descripcion: "Control de vacaciones, licencias y permisos laborales.",
    href: "/recursos-humanos/vacaciones",
    icono: UserCheck,
    fondo: "from-cyan-600 to-cyan-800",
    iconoColor: "text-cyan-700",
  },
  {
    titulo: "Seguridad / Vigilancia",
    descripcion: "Gestión del personal de vigilancia y reportes de seguridad.",
    href: "/recursos-humanos/seguridad",
    icono: ShieldCheck,
    fondo: "from-red-600 to-red-800",
    iconoColor: "text-red-700",
  },
  {
    titulo: "Documentos",
    descripcion: "Archivo digital de cédulas, contratos y documentos.",
    href: "/recursos-humanos/documentos",
    icono: FileText,
    fondo: "from-indigo-600 to-indigo-900",
    iconoColor: "text-indigo-700",
  },
  {
    titulo: "Reportes RH",
    descripcion: "Reportes generales del área de Recursos Humanos.",
    href: "/recursos-humanos/nomina/reportes/empleados",
    icono: BarChart3,
    fondo: "from-emerald-600 to-emerald-800",
    iconoColor: "text-emerald-700",
  },
];

export default function RecursosHumanosPage() {
  return (
    <main className="space-y-5">
      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              Módulo
            </p>

            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
              Recursos Humanos
            </h1>

            <p className="text-sm text-slate-500 mt-2 max-w-3xl">
              Panel central para la gestión del personal, asistencia, nómina,
              seguridad, documentos laborales y reportes del condominio.
            </p>
          </div>

          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-slate-900 flex items-center justify-center shadow-lg">
            <Users className="h-9 w-9 text-white" />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            Opciones de Recursos Humanos
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Seleccione una opción para continuar trabajando.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {modulos.map((modulo) => {
            const Icono = modulo.icono;

            return (
              <Link
                key={modulo.href}
                href={modulo.href}
                className="group rounded-2xl border bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition overflow-hidden"
              >
                <div
                  className={`h-20 bg-gradient-to-br ${modulo.fondo} flex items-center justify-center relative`}
                >
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_white,_transparent_35%)]" />

                  <div className="h-14 w-14 rounded-2xl bg-white/95 flex items-center justify-center shadow-md relative z-10 group-hover:scale-105 transition">
                    <Icono className={`h-8 w-8 ${modulo.iconoColor}`} />
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-black text-slate-900 text-base group-hover:text-blue-700">
                    {modulo.titulo}
                  </h3>

                  <p className="text-xs text-slate-500 mt-2 min-h-[54px] leading-relaxed">
                    {modulo.descripcion}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-xs font-bold text-blue-700">
                    <span>Abrir módulo</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm p-5">
        <h2 className="text-lg font-bold">Flujo recomendado RH</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-sm">
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-blue-300 font-bold">1. Empleados</p>
            <p className="text-slate-300 mt-1 text-xs">
              Registrar y mantener los datos del personal.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-blue-300 font-bold">2. Nómina</p>
            <p className="text-slate-300 mt-1 text-xs">
              Procesar salarios, descuentos y pagos.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-blue-300 font-bold">3. Reportes</p>
            <p className="text-slate-300 mt-1 text-xs">
              Revisar reportes de nómina, empleados y descuentos.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-blue-300 font-bold">4. Configuración</p>
            <p className="text-slate-300 mt-1 text-xs">
              Ajustar cargos, puestos, turnos y parámetros RH.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}