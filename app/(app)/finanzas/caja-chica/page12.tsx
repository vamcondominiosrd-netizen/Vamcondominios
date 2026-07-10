"use client";

import Link from "next/link";
import {
  BarChart3,
  Coins,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Landmark,
  Plus,
  ReceiptText,
  WalletCards,
} from "lucide-react";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import StatCard from "@/components/vam/enterprise/StatCard";

type Modulo = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
};

const modulos: Modulo[] = [
  {
    titulo: "Movimientos",
    descripcion: "Registrar ingresos, salidas y comprobantes de caja chica.",
    href: "/caja-chica",
    icono: Coins,
  },
  {
    titulo: "Fondos",
    descripcion: "Administrar fondos disponibles y responsables de caja chica.",
    href: "/caja-chica/fondos",
    icono: WalletCards,
  },
  {
    titulo: "Balance",
    descripcion: "Consultar balances disponibles por fondo de caja chica.",
    href: "/caja-chica/balance",
    icono: BarChart3,
  },
  {
    titulo: "Reportes",
    descripcion: "Generar reportes de movimientos, fondos y balances.",
    href: "/caja-chica/reporte",
    icono: FileSpreadsheet,
  },
];

export default function FinanzasCajaChicaPage() {
  return (
    <PageContainer>
     <ModuleMenu
        title="Caja Chica"
        subtitle="Movimientos, fondos, balance y reportes."
        tone="green"
        items={[
          { href: "/finanzas/caja-chica", label: "Centro Caja", icon: BarChart3 },
          { href: "/caja-chica", label: "Movimientos", icon: Coins },
          { href: "/caja-chica/fondos", label: "Fondos", icon: WalletCards },
          { href: "/caja-chica/balance", label: "Balance", icon: BarChart3 },
          { href: "/caja-chica/reporte", label: "Reportes", icon: FileSpreadsheet },
        ]}
      />

      <ModuleToolbar
        title="Centro de Caja Chica"
        subtitle="Controle movimientos menores, fondos disponibles, balances y reportes de caja chica."
        icon={Coins}
        actions={
          <ModuleActions
            extra={
              <>
                <Link
                  href="/caja-chica"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo movimiento
                </Link>

                <Link
                  href="/caja-chica/fondos"
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <WalletCards className="h-4 w-4" />
                  Fondos
                </Link>
              </>
            }
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Movimientos"
          value="Caja"
          subtitle="Ingresos y salidas"
          icon={Coins}
          tone="green"
        />

        <StatCard
          title="Fondos"
          value="Control"
          subtitle="Responsables"
          icon={WalletCards}
          tone="blue"
        />

        <StatCard
          title="Balance"
          value="Disponible"
          subtitle="Consulta por fondo"
          icon={BarChart3}
          tone="amber"
        />

        <StatCard
          title="Reportes"
          value="Excel"
          subtitle="Movimientos"
          icon={FileSpreadsheet}
          tone="slate"
        />
      </div>

      <SectionCard
        title="Opciones de Caja Chica"
        subtitle="Seleccione una opción para continuar trabajando."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {modulos.map((modulo) => {
            const Icono = modulo.icono || Coins;

            return (
              <Link
                key={modulo.href}
                href={modulo.href}
                className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white">
                    <Icono className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-slate-900 group-hover:text-emerald-700">
                      {modulo.titulo}
                    </h3>

                    <p className="mt-1 min-h-[40px] text-xs leading-relaxed text-slate-500">
                      {modulo.descripcion}
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
        <h3 className="font-black">Flujo recomendado</h3>
        <p className="mt-1 text-sm">
          Registre los movimientos de caja chica, controle los fondos asignados,
          revise el balance disponible y genere los reportes cuando corresponda
          la reposición.
        </p>
      </section>
    </PageContainer>
  );
}
