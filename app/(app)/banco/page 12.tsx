"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  FileSpreadsheet,
  Landmark,
  SearchCheck,
  Upload,
  WalletCards,
} from "lucide-react";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import StatCard from "@/components/vam/enterprise/StatCard";

type AccesoBanco = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
};

const accesosBanco: AccesoBanco[] = [
  {
    titulo: "Importar Banco",
    descripcion: "Subir archivo bancario del período para procesar transacciones.",
    href: "/archivo-banco/importar",
    icono: Upload,
  },
  {
    titulo: "Identificar Pagos",
    descripcion: "Relacionar transacciones bancarias con unidades y propietarios.",
    href: "/archivo-banco/identificar",
    icono: SearchCheck,
  },
  {
    titulo: "Pagos Identificados",
    descripcion: "Consultar pagos reconocidos desde el archivo del banco.",
    href: "/pagos-identificados",
    icono: WalletCards,
  },
  {
    titulo: "Alias Apartamentos",
    descripcion: "Administrar nombres usados por el banco para identificar unidades.",
    href: "/apartamento-banco-alias/importar",
    icono: FileSpreadsheet,
  },
  {
    titulo: "Archivo Banco Identificados",
    descripcion: "Subir Archivo del Banco con los Pagos Identificados.",
    href: "/archivo-banco/importar-banco-identificado",
    icono: SearchCheck,
  },
];

export default function BancoPage() {
  return (
    <PageContainer>
      <ModuleMenu
        title="Banco"
        subtitle="Importaciones, identificación de pagos, pagos identificados y alias."
        tone="green"
        items={[
          { href: "/banco", label: "Dashboard", icon: BarChart3 },
          { href: "/archivo-banco/importar", label: "Importar Banco", icon: Upload },
          { href: "/archivo-banco/identificar", label: "Identificar", icon: SearchCheck },
          { href: "/pagos-identificados", label: "Identificados", icon: WalletCards },
          { href: "/apartamento-banco-alias/importar", label: "Alias", icon: FileSpreadsheet },
          { href: "/archivo-banco/importar-banco-identificado", label: "Archivo Banco Identificados", icon: SearchCheck },
        ]}
      />

      <ModuleToolbar
        title="Dashboard Banco"
        subtitle="Centro operativo para importación bancaria, identificación de pagos y mantenimiento de alias."
        icon={Landmark}
        actions={
          <ModuleActions
            extra={
              <>
                <Link
                  href="/archivo-banco/importar"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  <Upload className="h-4 w-4" />
                  Importar banco
                </Link>

                <Link
                  href="/archivo-banco/identificar"
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <SearchCheck className="h-4 w-4" />
                  Identificar pagos
                </Link>
              </>
            }
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Paso 1"
          value="Importar"
          subtitle="Archivo bancario"
          icon={Upload}
          tone="blue"
        />

        <StatCard
          title="Paso 2"
          value="Identificar"
          subtitle="Unidades y propietarios"
          icon={SearchCheck}
          tone="green"
        />

        <StatCard
          title="Paso 3"
          value="Confirmar"
          subtitle="Pagos identificados"
          icon={WalletCards}
          tone="amber"
        />

        <StatCard
          title="Paso 4"
          value="Alias"
          subtitle="Nombres bancarios"
          icon={FileSpreadsheet}
          tone="slate"
        />

         <StatCard
          title="Paso 5"
          value="Archivo Banco"
          subtitle="Archivo Banco identificados"
          icon={WalletCards}
          tone="amber"
        />

      </div>

      <SectionCard
        title="Opciones de Banco"
        subtitle="Seleccione una opción para continuar el flujo bancario."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {accesosBanco.map((item) => {
            const Icon = item.icono || Landmark;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-slate-900 group-hover:text-emerald-700">
                      {item.titulo}
                    </h3>

                    <p className="mt-1 min-h-[40px] text-xs leading-relaxed text-slate-500">
                      {item.descripcion}
                    </p>

                    <p className="mt-3 text-xs font-bold text-emerald-700">
                      Abrir módulo →
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </SectionCard>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5" />

          <div>
            <h3 className="font-black">Flujo recomendado Banco</h3>

            <p className="mt-1 text-sm">
              Primero importe el archivo bancario, luego identifique las
              transacciones con sus unidades, revise los pagos identificados y
              mantenga actualizado el catálogo de alias para mejorar la
              identificación automática.
            </p>
          </div>
        </div>
      </section>
    </PageContainer>
  );
}
