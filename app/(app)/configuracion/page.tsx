"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CircleDollarSign,
  Database,
  KeyRound,
  Package,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
} from "lucide-react";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import PageHeader from "@/components/vam/enterprise/PageHeader";
import SectionCard from "@/components/vam/enterprise/SectionCard";

type ConfigCard = {
  title: string;
  description: string;
  href: string;
  icon: any;
  status: "Activo" | "Pendiente";
  tone: "blue" | "green" | "purple" | "amber" | "slate" | "red";
};

const tarjetasConfiguracion: ConfigCard[] = [
  {
    title: "Cargos y Generación",
    description:
      "Configura cuota ordinaria, mora, día de generación y vencimiento de cargos mensuales.",
    href: "/consulta-estado/configuracion-cargos",
    icon: CircleDollarSign,
    status: "Activo",
    tone: "green",
  },
  {
    title: "Tipos de Cargos",
    description:
      "Administra los tipos de cargos ordinarios, extraordinarios, mora y otros conceptos del condominio.",
    href: "/configuracion/tipos-cargos",
    icon: KeyRound,
    status: "Activo",
    tone: "blue",
  },
  {
    title: "Módulos Habilitados",
    description:
      "Consulta los módulos de VAM habilitados para el condominio según su configuración y plan contratado.",
    href: "/configuracion/configuracion-usuarios-sistema/modulos",
    icon: Package,
    status: "Activo",
    tone: "amber",
  },
  {
    title: "Usuarios y Accesos",
    description:
      "Crea usuarios del condominio, asigna roles y activa o bloquea sus accesos al sistema VAM.",
    href: "/configuracion/configuracion-usuarios-sistema/usuarios",
    icon: UserCog,
    status: "Activo",
    tone: "blue",
  },
  {
    title: "Roles y Permisos",
    description:
      "Crea roles del condominio y configura los permisos disponibles para cada módulo y operación.",
    href: "/configuracion/configuracion-usuarios-sistema/roles",
    icon: ShieldCheck,
    status: "Activo",
    tone: "purple",
  },
  {
    title: "Empresa y Sucursales",
    description:
      "Espacio reservado para datos de empresa, sucursales y parámetros administrativos.",
    href: "#",
    icon: Building2,
    status: "Pendiente",
    tone: "amber",
  },
  {
    title: "Crear usuarios a Propietarios",
    description:
      "Crear usuarios a los propietarios.",
    href: "/super-admin/accesos-propietarios",
    icon: SlidersHorizontal,
    status: "Activo",
    tone: "slate",
  },
  {
    title: "Integraciones y Datos",
    description:
      "Espacio reservado para integraciones, respaldos, importaciones y procesos técnicos.",
    href: "#",
    icon: Database,
    status: "Pendiente",
    tone: "red",
  },
];

function toneClasses(tone: ConfigCard["tone"]) {
  if (tone === "green") {
    return {
      card: "border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/40",
      icon: "bg-emerald-100 text-emerald-700",
      badge: "bg-emerald-100 text-emerald-700",
      link: "text-emerald-700",
    };
  }

  if (tone === "blue") {
    return {
      card: "border-blue-100 hover:border-blue-300 hover:bg-blue-50/40",
      icon: "bg-blue-100 text-blue-700",
      badge: "bg-blue-100 text-blue-700",
      link: "text-blue-700",
    };
  }

  if (tone === "purple") {
    return {
      card: "border-purple-100 hover:border-purple-300 hover:bg-purple-50/40",
      icon: "bg-purple-100 text-purple-700",
      badge: "bg-purple-100 text-purple-700",
      link: "text-purple-700",
    };
  }

  if (tone === "amber") {
    return {
      card: "border-amber-100 hover:border-amber-300 hover:bg-amber-50/40",
      icon: "bg-amber-100 text-amber-700",
      badge: "bg-amber-100 text-amber-700",
      link: "text-amber-700",
    };
  }

  if (tone === "red") {
    return {
      card: "border-red-100 hover:border-red-300 hover:bg-red-50/40",
      icon: "bg-red-100 text-red-700",
      badge: "bg-red-100 text-red-700",
      link: "text-red-700",
    };
  }

  return {
    card: "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
    icon: "bg-slate-100 text-slate-700",
    badge: "bg-slate-100 text-slate-700",
    link: "text-slate-700",
  };
}

export default function ConfiguracionPage() {
  const activos = tarjetasConfiguracion.filter((item) => item.status === "Activo").length;
  const pendientes = tarjetasConfiguracion.filter((item) => item.status === "Pendiente").length;

  return (
    <PageContainer>
      <PageHeader
        title="Configuración del Sistema VAM"
        subtitle="Centro de parámetros generales, reglas administrativas y módulos de configuración."
        badge="Configuración"
        icon={Settings}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ResumenBox label="Módulos configurables" value={tarjetasConfiguracion.length} />
        <ResumenBox label="Activos" value={activos} tone="green" />
        <ResumenBox label="Pendientes" value={pendientes} tone="amber" />
      </div>

      <SectionCard
        title="Módulos de configuración"
        subtitle="Seleccione la configuración que desea administrar. Se irán agregando las demás opciones según avance el sistema."
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {tarjetasConfiguracion.map((item) => (
            <ConfigModuleCard key={item.title} item={item} />
          ))}
        </div>
      </SectionCard>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
        <h3 className="font-black">Nota operativa</h3>
        <p className="mt-1 text-sm">
          Los catálogos deben manejarse desde la opción Catálogos. Esta pantalla queda reservada para configuraciones generales del sistema VAM.
        </p>
      </div>
    </PageContainer>
  );
}

function ConfigModuleCard({ item }: { item: ConfigCard }) {
  const Icon = item.icon;
  const tone = toneClasses(item.tone);
  const disabled = item.href === "#";

  const content = (
    <div
      className={`group flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm transition ${tone.card} ${
        disabled ? "opacity-85" : "hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone.icon}`}>
          <Icon className="h-6 w-6" />
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-black ${tone.badge}`}>
          {item.status}
        </span>
      </div>

      <div className="mt-5 flex-1">
        <h2 className="text-lg font-black text-slate-900">{item.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
      </div>

      <div className={`mt-5 inline-flex items-center gap-2 text-sm font-black ${tone.link}`}>
        {disabled ? "Pendiente de configurar" : "Abrir módulo"}
        {!disabled && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />}
      </div>
    </div>
  );

  if (disabled) return content;

  return <Link href={item.href}>{content}</Link>;
}

function ResumenBox({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "green" | "amber";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-100 bg-emerald-50 text-emerald-800"
      : tone === "amber"
        ? "border-amber-100 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-white text-slate-900";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2 className="mt-2 text-3xl font-black">{value}</h2>
    </div>
  );
}
