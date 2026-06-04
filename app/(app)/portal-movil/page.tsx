"use client";

import Link from "next/link";
import {
  Smartphone,
  LogIn,
  Home,
  WalletCards,
  ReceiptText,
  AlertTriangle,
  CalendarDays,
  Megaphone,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";

type ModuloPortalMovil = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
  fondo: string;
  iconoColor: string;
};

export default function PortalMovilPage() {
  const modulos: ModuloPortalMovil[] = [
    {
      titulo: "Login Móvil",
      descripcion:
        "Acceso móvil para propietarios, residentes y miembros de la directiva.",
      href: "/movil-login",
      icono: LogIn,
      fondo: "from-blue-600 to-blue-800",
      iconoColor: "text-blue-700",
    },
    {
      titulo: "Inicio Móvil",
      descripcion:
        "Pantalla principal del portal móvil según el tipo de usuario.",
      href: "/movil",
      icono: Home,
      fondo: "from-slate-700 to-slate-950",
      iconoColor: "text-slate-700",
    },
    {
      titulo: "Pagar Mantenimiento",
      descripcion:
        "Registrar pagos de mantenimiento desde el portal móvil.",
      href: "/movil/pagos",
      icono: WalletCards,
      fondo: "from-emerald-600 to-emerald-800",
      iconoColor: "text-emerald-700",
    },
    {
      titulo: "Estado de Cuenta",
      descripcion:
        "Consultar cargos, pagos, balances y créditos desde el móvil.",
      href: "/movil/estado-cuenta",
      icono: ReceiptText,
      fondo: "from-purple-600 to-purple-800",
      iconoColor: "text-purple-700",
    },
    {
      titulo: "Reportar Incidencia",
      descripcion:
        "Permitir a residentes reportar incidencias con fotos y detalles.",
      href: "/movil/incidencias",
      icono: AlertTriangle,
      fondo: "from-red-600 to-red-800",
      iconoColor: "text-red-700",
    },
    {
      titulo: "Reservar Área Social",
      descripcion:
        "Solicitar reservas de áreas sociales desde el portal móvil.",
      href: "/movil/reservas",
      icono: CalendarDays,
      fondo: "from-amber-500 to-orange-700",
      iconoColor: "text-amber-700",
    },
    {
      titulo: "Anuncios",
      descripcion:
        "Consultar avisos, comunicados e informaciones publicadas.",
      href: "/movil/anuncios",
      icono: Megaphone,
      fondo: "from-pink-600 to-rose-800",
      iconoColor: "text-pink-700",
    },
    {
      titulo: "Solicitudes de Pago Móvil",
      descripcion:
        "Acceso móvil para revisar y aprobar solicitudes de pago.",
      href: "/movil/solicitudes-pago",
      icono: ClipboardCheck,
      fondo: "from-indigo-600 to-indigo-900",
      iconoColor: "text-indigo-700",
    },
    {
      titulo: "Aprobación Tesorero",
      descripcion:
        "Revisar solicitudes pendientes de aprobación por tesorería.",
      href: "/movil/solicitudes-pago/tesorero",
      icono: ClipboardCheck,
      fondo: "from-teal-600 to-teal-800",
      iconoColor: "text-teal-700",
    },
    {
      titulo: "Aprobación Presidente",
      descripcion:
        "Autorizar solicitudes aprobadas previamente por tesorería.",
      href: "/movil/solicitudes-pago/presidente",
      icono: ClipboardCheck,
      fondo: "from-cyan-600 to-cyan-800",
      iconoColor: "text-cyan-700",
    },
  ];

  return (
    <main className="space-y-5">
      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wide">
              Módulo
            </p>

            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
              Portal Móvil
            </h1>

            <p className="text-sm text-slate-500 mt-2 max-w-3xl">
              Centralice los accesos móviles para propietarios, residentes,
              tesorería, presidencia y administración del condominio.
            </p>
          </div>

          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-600 to-slate-900 flex items-center justify-center shadow-lg">
            <Smartphone className="h-9 w-9 text-white" />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            Opciones del Portal Móvil
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Seleccione una opción para revisar o probar el acceso móvil.
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
                  <h3 className="font-black text-slate-900 text-base group-hover:text-cyan-700">
                    {modulo.titulo}
                  </h3>

                  <p className="text-xs text-slate-500 mt-2 min-h-[54px] leading-relaxed">
                    {modulo.descripcion}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-xs font-bold text-cyan-700">
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
        <h2 className="text-lg font-bold">Flujo recomendado Portal Móvil</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-sm">
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-cyan-300 font-bold">1. Login</p>
            <p className="text-slate-300 mt-1 text-xs">
              El usuario entra como propietario, residente o directiva.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-cyan-300 font-bold">2. Consulta</p>
            <p className="text-slate-300 mt-1 text-xs">
              Revisa estado de cuenta, anuncios y pagos pendientes.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-cyan-300 font-bold">3. Gestión</p>
            <p className="text-slate-300 mt-1 text-xs">
              Reporta incidencias, reservas o pagos desde el móvil.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-cyan-300 font-bold">4. Aprobaciones</p>
            <p className="text-slate-300 mt-1 text-xs">
              Tesorero y presidente pueden aprobar solicitudes.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}