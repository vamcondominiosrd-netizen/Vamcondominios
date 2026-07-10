"use client";

import Link from "next/link";

type ModuloRH = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: string;
  color: string;
  estado?: "Activo" | "En desarrollo" | "Próximo";
};

const modulos: ModuloRH[] = [
  {
    titulo: "Personal / Empleados",
    descripcion: "Registro y control del personal del condominio.",
    href: "/recursos-humanos/personal",
    icono: "👥",
    color: "from-blue-600 to-blue-800",
    estado: "Activo",
  },
  {
    titulo: "Cargos y Puestos",
    descripcion: "Departamentos, cargos, puestos y tipos de contrato.",
    href: "/recursos-humanos/cargos",
    icono: "💼",
    color: "from-slate-800 to-slate-950",
    estado: "Activo",
  },
  {
    titulo: "Asistencia",
    descripcion: "Control de entrada, salida, tardanzas y ausencias.",
    href: "/recursos-humanos/asistencia",
    icono: "🕘",
    color: "from-green-600 to-green-800",
    estado: "Activo",
  },
  {
    titulo: "Nómina",
    descripcion: "Cálculo de salarios, descuentos, vacaciones y pagos.",
    href: "/recursos-humanos/nomina",
    icono: "💵",
    color: "from-orange-600 to-orange-800",
    estado: "Activo",
  },
  {
    titulo: "Vacaciones / Permisos",
    descripcion: "Solicitudes, balances, permisos laborales y pagos.",
    href: "/recursos-humanos/vacaciones",
    icono: "🏖️",
    color: "from-cyan-600 to-cyan-800",
    estado: "Activo",
  },
  {
    titulo: "Documentos",
    descripcion: "Archivo digital de cédulas, contratos y documentos.",
    href: "/recursos-humanos/documentos",
    icono: "📄",
    color: "from-indigo-600 to-indigo-800",
    estado: "Activo",
  },
  {
    titulo: "Reportes RH",
    descripcion: "Reportes generales del área de Recursos Humanos.",
    href: "/recursos-humanos/nomina/reportes/empleados",
    icono: "📊",
    color: "from-emerald-600 to-emerald-800",
    estado: "Activo",
  },
];

function estadoClase(estado?: ModuloRH["estado"]) {
  if (estado === "Activo") return "bg-green-100 text-green-700";
  if (estado === "En desarrollo") return "bg-yellow-100 text-yellow-700";
  return "bg-slate-100 text-slate-600";
}

export default function RecursosHumanosPage() {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">
          Recursos Humanos
        </h1>

        <p className="text-slate-500 mt-2">
          Seleccione una opción para continuar trabajando.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-5">
        {modulos.map((modulo) => (
          <Link key={modulo.titulo} href={modulo.href}>
            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden h-full hover:shadow-md hover:-translate-y-1 transition">
              <div
                className={`bg-gradient-to-r ${modulo.color} h-20 flex items-center justify-center`}
              >
                <div className="bg-white/90 rounded-2xl w-14 h-14 flex items-center justify-center text-3xl shadow-sm">
                  {modulo.icono}
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-black text-slate-900">
                    {modulo.titulo}
                  </h2>

                  <span
                    className={`text-xs font-black px-3 py-1 rounded-full ${estadoClase(
                      modulo.estado
                    )}`}
                  >
                    {modulo.estado || "Activo"}
                  </span>
                </div>

                <p className="text-sm text-slate-500 mt-3 min-h-[44px]">
                  {modulo.descripcion}
                </p>

                <div className="mt-5 flex items-center justify-between text-blue-700 font-black text-sm">
                  <span>Abrir módulo</span>
                  <span>→</span>
                </div>

                <p className="text-xs text-slate-400 mt-3 break-all">
                  {modulo.href}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-3xl p-5">
        <h2 className="font-black text-blue-900">Estructura RH organizada</h2>
        <p className="text-sm text-blue-700 mt-1">
          Este menú usa las rutas reales confirmadas para evitar errores 404.
          Luego podemos agregar submenús internos en Nómina, Vacaciones y Reportes.
        </p>
      </div>
    </div>
  );
}
