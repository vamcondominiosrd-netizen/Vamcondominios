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
} from "lucide-react";

const modulos = [
  {
    titulo: "Personal / Empleados",
    descripcion: "Registro y control del personal del condominio.",
    href: "/recursos-humanos/personal",
    icono: Users,
    color: "bg-blue-100 text-blue-700",
  },
  {
    titulo: "Cargos y Puestos",
    descripcion: "Catálogo de cargos, funciones y departamentos.",
    href: "/recursos-humanos/cargos",
    icono: BriefcaseBusiness,
    color: "bg-slate-100 text-slate-700",
  },
  {
    titulo: "Asistencia",
    descripcion: "Control de entrada, salida, tardanzas y ausencias.",
    href: "/recursos-humanos/asistencia",
    icono: Clock,
    color: "bg-green-100 text-green-700",
  },
  {
    titulo: "Turnos",
    descripcion: "Asignación de horarios y turnos de trabajo.",
    href: "/recursos-humanos/turnos",
    icono: CalendarDays,
    color: "bg-purple-100 text-purple-700",
  },
  {
    titulo: "Nómina",
    descripcion: "Cálculo de salarios, descuentos y pagos al personal.",
    href: "/recursos-humanos/nomina",
    icono: Wallet,
    color: "bg-amber-100 text-amber-700",
  },
  {
    titulo: "Vacaciones / Permisos",
    descripcion: "Control de vacaciones, licencias y permisos laborales.",
    href: "/recursos-humanos/vacaciones",
    icono: UserCheck,
    color: "bg-cyan-100 text-cyan-700",
  },
  {
    titulo: "Seguridad / Vigilancia",
    descripcion: "Gestión del personal de vigilancia y reportes de seguridad.",
    href: "/recursos-humanos/seguridad",
    icono: ShieldCheck,
    color: "bg-red-100 text-red-700",
  },
  {
    titulo: "Documentos",
    descripcion: "Archivo digital de cédulas, contratos y documentos.",
    href: "/recursos-humanos/documentos",
    icono: FileText,
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    titulo: "Reportes RH",
    descripcion: "Reportes generales del área de Recursos Humanos.",
    href: "/recursos-humanos/reportes",
    icono: BarChart3,
    color: "bg-emerald-100 text-emerald-700",
  },
];

export default function RecursosHumanosPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">
          Recursos Humanos
        </h1>

        <p className="text-slate-500 mt-2">
          Panel central para la gestión del personal, asistencia, nómina,
          seguridad y documentos laborales del condominio.
        </p>
      </div>

      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-sm">
        <p className="text-sm text-slate-300">Módulo ERP</p>

        <h2 className="text-2xl font-black mt-1">
          Gestión Integral de Personal
        </h2>

        <p className="text-slate-300 mt-2 max-w-3xl">
          Desde este panel podrá administrar empleados, cargos, turnos,
          asistencia, pagos, vigilancia, permisos y reportes relacionados con el
          personal del condominio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {modulos.map((modulo) => {
          const Icono = modulo.icono;

          return (
            <Link
              key={modulo.href}
              href={modulo.href}
              className="bg-white border rounded-3xl p-6 shadow-sm hover:shadow-md transition block"
            >
              <div className="flex items-start gap-4">
                <div className={`p-4 rounded-2xl ${modulo.color}`}>
                  <Icono className="w-7 h-7" />
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {modulo.titulo}
                  </h2>

                  <p className="text-sm text-slate-500 mt-2">
                    {modulo.descripcion}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="bg-green-50 border border-green-200 text-green-800 rounded-3xl p-5">
        <h3 className="font-black mb-1">Estado actual del módulo</h3>

        <p className="text-sm">
          Ya están disponibles los submódulos de Personal / Empleados, Cargos y
          Puestos, Contratos, Carnet del Empleado y Asistencia. El próximo paso
          recomendado es continuar con Turnos, Nómina o Vacaciones / Permisos.
        </p>
      </div>
    </div>
  );
}