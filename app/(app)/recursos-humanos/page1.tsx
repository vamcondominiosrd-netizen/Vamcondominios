"use client";

import Link from "next/link";

type MenuItem = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: string;
  estado?: "Listo" | "Revisar" | "Próximo";
};

type MenuSection = {
  titulo: string;
  descripcion: string;
  items: MenuItem[];
};

const secciones: MenuSection[] = [
  {
    titulo: "Panel principal",
    descripcion: "Vista ejecutiva del módulo de Recursos Humanos.",
    items: [
      {
        titulo: "Dashboard RH",
        descripcion: "Resumen general de empleados, nómina, vacaciones y prestaciones.",
        href: "/recursos-humanos/dashboard",
        icono: "📊",
        estado: "Listo",
      },
    ],
  },
  {
    titulo: "Personal",
    descripcion: "Administración de empleados y datos laborales.",
    items: [
      {
        titulo: "Empleados",
        descripcion: "Registro y mantenimiento del personal.",
        href: "/recursos-humanos/personal",
        icono: "👥",
        estado: "Revisar",
      },
    ],
  },
  {
    titulo: "Catálogos",
    descripcion: "Configuraciones base utilizadas por Recursos Humanos.",
    items: [
      {
        titulo: "Departamentos",
        descripcion: "Mantenimiento de departamentos.",
        href: "/recursos-humanos/departamentos",
        icono: "🏢",
        estado: "Revisar",
      },
      {
        titulo: "Cargos",
        descripcion: "Mantenimiento de cargos.",
        href: "/recursos-humanos/cargos",
        icono: "🧰",
        estado: "Revisar",
      },
      {
        titulo: "Tipos de Contrato",
        descripcion: "Contratos fijos, temporales u otros.",
        href: "/recursos-humanos/nomina/tipos",
        icono: "📄",
        estado: "Revisar",
      },
      {
        titulo: "Tipos de Nómina",
        descripcion: "Mensual, quincenal, vacaciones, regalía y liquidación.",
        href: "/recursos-humanos/nomina/tipos",
        icono: "🧾",
        estado: "Revisar",
      },
      {
        titulo: "Configuración Nómina",
        descripcion: "AFP, SFS, ISR y divisor de vacaciones.",
        href: "/recursos-humanos/nomina/configuracion",
        icono: "⚙️",
        estado: "Revisar",
      },
    ],
  },
  {
    titulo: "Nómina",
    descripcion: "Procesamiento, recibos y control de pagos.",
    items: [
      {
        titulo: "Procesar Nómina",
        descripcion: "Generar nóminas y solicitudes de pago.",
        href: "/recursos-humanos/nomina",
        icono: "💵",
        estado: "Listo",
      },
      {
        titulo: "Descuentos de Nómina",
        descripcion: "Catálogo y control de descuentos aplicados.",
        href: "/recursos-humanos/nomina/descuentos",
        icono: "➖",
        estado: "Revisar",
      },
    ],
  },
  {
    titulo: "Vacaciones",
    descripcion: "Solicitudes, balances y movimientos de vacaciones.",
    items: [
      {
        titulo: "Vacaciones / Permisos",
        descripcion: "Registro, aprobación y forma de pago de vacaciones.",
        href: "/recursos-humanos/vacaciones",
        icono: "🏖️",
        estado: "Listo",
      },
      {
        titulo: "Balance Vacaciones",
        descripcion: "Días generados, tomados, pagados y disponibles.",
        href: "/recursos-humanos/vacaciones/balance",
        icono: "📌",
        estado: "Revisar",
      },
      {
        titulo: "Movimientos Vacaciones",
        descripcion: "Histórico de movimientos por empleado.",
        href: "/recursos-humanos/vacaciones/movimientos",
        icono: "📚",
        estado: "Revisar",
      },
    ],
  },
  {
    titulo: "Prestaciones",
    descripcion: "Cálculo y recibos de prestaciones laborales.",
    items: [
      {
        titulo: "Prestaciones Laborales",
        descripcion: "Cálculo de preaviso, cesantía, vacaciones y regalía.",
        href: "/recursos-humanos/prestaciones",
        icono: "⚖️",
        estado: "Listo",
      },
      {
        titulo: "Recibos Prestaciones",
        descripcion: "Recibos generados por prestaciones.",
        href: "/recursos-humanos/prestaciones",
        icono: "🧾",
        estado: "Revisar",
      },
    ],
  },
  {
    titulo: "Reportes",
    descripcion: "Consultas gerenciales y exportaciones de Recursos Humanos.",
    items: [
      {
        titulo: "Reporte Empleados",
        descripcion: "Listado general de empleados.",
        href: "/recursos-humanos/nomina/reportes/empleados",
        icono: "👥",
        estado: "Listo",
      },
      {
        titulo: "Reporte Nómina",
        descripcion: "Resumen y detalle de nóminas.",
        href: "/recursos-humanos/nomina/reportes/nomina",
        icono: "💵",
        estado: "Listo",
      },
      {
        titulo: "Reporte Vacaciones",
        descripcion: "Balance e histórico de vacaciones.",
        href: "/recursos-humanos/nomina/reportes/vacaciones",
        icono: "🏖️",
        estado: "Listo",
      },
      {
        titulo: "Reporte Prestaciones",
        descripcion: "Detalle y totales de prestaciones laborales.",
        href: "/recursos-humanos/nomina/reportes/prestaciones",
        icono: "⚖️",
        estado: "Listo",
      },
      {
        titulo: "Más Reportes",
        descripcion: "Espacio reservado para nuevos reportes.",
        href: "#",
        icono: "➕",
        estado: "Próximo",
      },
    ],
  },
];

function estadoClase(estado?: MenuItem["estado"]) {
  if (estado === "Listo") return "bg-green-100 text-green-700";
  if (estado === "Próximo") return "bg-slate-100 text-slate-500";
  return "bg-yellow-100 text-yellow-700";
}

export default function RecursosHumanosPage() {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">
          Recursos Humanos
        </h1>

        <p className="text-slate-500 mt-2">
          Menú principal organizado por áreas: personal, catálogos, nómina,
          vacaciones, prestaciones y reportes.
        </p>
      </div>

      {secciones.map((seccion) => (
        <section key={seccion.titulo} className="space-y-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              {seccion.titulo}
            </h2>
            <p className="text-sm text-slate-500">{seccion.descripcion}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {seccion.items.map((item) => {
              const disabled = item.href === "#";

              const contenido = (
                <div
                  className={`bg-white rounded-3xl border shadow-sm p-5 h-full transition ${
                    disabled
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:shadow-md hover:-translate-y-1"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-4xl">{item.icono}</div>

                    <span
                      className={`text-xs font-black px-3 py-1 rounded-full ${estadoClase(
                        item.estado
                      )}`}
                    >
                      {item.estado || "Revisar"}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 mt-4">
                    {item.titulo}
                  </h3>

                  <p className="text-sm text-slate-500 mt-1">
                    {item.descripcion}
                  </p>

                  <p className="text-xs text-blue-700 font-bold mt-4 break-all">
                    {disabled ? "Pendiente de crear" : item.href}
                  </p>
                </div>
              );

              if (disabled) {
                return <div key={item.titulo}>{contenido}</div>;
              }

              return (
                <Link key={item.titulo} href={item.href}>
                  {contenido}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
