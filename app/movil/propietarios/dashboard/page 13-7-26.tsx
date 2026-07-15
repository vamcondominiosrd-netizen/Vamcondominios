"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  CreditCard,
  FileText,
  Wrench,
  Bell,
  CalendarDays,
  FolderOpen,
  Phone,
  User,
  Car,
} from "lucide-react";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  condominio_logo_url?: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string;
  telefono?: string;
  correo?: string;
};

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(valor || 0);
}

export default function DashboardPropietariosPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(
    null
  );

  const [balanceActual, setBalanceActual] = useState(0);
  const [cargandoBalance, setCargandoBalance] = useState(true);
  const [mensajeBalance, setMensajeBalance] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("propietario_actual");

    if (!raw) {
      router.push("/movil/propietarios/login");
      return;
    }

    const prop = JSON.parse(raw);
    setPropietario(prop);
    cargarBalance(prop);
  }, [router]);

  async function cargarBalance(prop: PropietarioActual) {
    setCargandoBalance(true);
    setMensajeBalance("");

    const { data, error } = await supabase
      .from("cargos_periodicos")
      .select("balance")
      .eq("condominio_id", prop.condominio_id)
      .eq("unidad_id", prop.unidad_id);

    if (error) {
      setMensajeBalance("No se pudo cargar el balance.");
      setCargandoBalance(false);
      return;
    }

    const balance = (data || []).reduce(
      (sum, item: any) => sum + Number(item.balance || 0),
      0
    );

    setBalanceActual(balance);
    setCargandoBalance(false);
  }

  if (!propietario) {
    return (
      <div className="p-6 text-center text-slate-500">
        Cargando información...
      </div>
    );
  }

  const accesos = [
    {
      titulo: "Estado Cuenta",
      icon: FileText,
      href: "/movil/propietarios/estado-cuenta",
    },
    {
      titulo: "Pagos",
      icon: CreditCard,
      href: "/movil/propietarios/pagos",
    },
    {
      titulo: "Incidencias",
      icon: Wrench,
      href: "/movil/propietarios/incidencias",
    },
    {
      titulo: "Anuncios",
      icon: Bell,
      href: "/movil/propietarios/anuncios",
    },
    {
      titulo: "Reservas",
      icon: CalendarDays,
      href: "/movil/propietarios/reservas",
    },
    {
      titulo: "Documentos",
      icon: FolderOpen,
      href: "/movil/propietarios/documentos",
    },
    {
     titulo: "Vehículos",
     icon: Car,
     href: "/movil/propietarios/vehiculos",
    },
    {
      titulo: "Directorio",
      icon: Phone,
      href: "/movil/propietarios/directorio",
    },
    {
      titulo: "Perfil",
      icon: User,
      href: "/movil/propietarios/perfil",
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <section className="bg-slate-950 text-white rounded-3xl p-5 shadow">
        <div className="flex items-center gap-3">
          {propietario.condominio_logo_url ? (
            <img
              src={propietario.condominio_logo_url}
              alt="Logo"
              className="w-14 h-14 object-contain rounded-full bg-white p-1"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-blue-700 flex items-center justify-center font-bold">
              VAM
            </div>
          )}

          <div>
            <p className="text-sm text-slate-300">Bienvenido</p>
            <h1 className="text-xl font-bold leading-tight">
              {propietario.nombre_propietario}
            </h1>
            <p className="text-xs text-slate-300">
              {propietario.condominio_nombre} · {propietario.no_apartamento}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-3xl p-5 border shadow-sm">
        <p className="text-sm text-slate-500 font-semibold">Balance actual</p>

        {cargandoBalance ? (
          <h2 className="text-xl font-bold text-slate-500 mt-2">
            Cargando balance...
          </h2>
        ) : (
          <h2
            className={`text-3xl font-extrabold mt-1 ${
              balanceActual > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {formatoMoneda(balanceActual)}
          </h2>
        )}

        <p className="text-xs text-slate-400 mt-1">
          Balance calculado desde el estado de cuenta.
        </p>

        {mensajeBalance && (
          <p className="text-xs text-red-600 mt-2">{mensajeBalance}</p>
        )}

        <button
          onClick={() => router.push("/movil/propietarios/pagos")}
          className="mt-4 w-full bg-blue-700 text-white rounded-2xl py-3 font-bold"
        >
          Pagar ahora
        </button>
      </section>

      <section className="grid grid-cols-4 gap-3">
        {accesos.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.titulo}
              onClick={() => router.push(item.href)}
              className="bg-white border rounded-2xl p-3 shadow-sm flex flex-col items-center justify-center gap-2 min-h-[86px]"
            >
              <Icon size={24} className="text-blue-700" />
              <span className="text-[11px] font-bold text-slate-700 text-center leading-tight">
                {item.titulo}
              </span>
            </button>
          );
        })}
      </section>

      <section className="bg-white rounded-3xl p-5 border shadow-sm">
        <h3 className="font-bold text-slate-900 mb-3">Avisos recientes</h3>

        <div className="space-y-3 text-sm">
          <div className="border rounded-2xl p-3">
            <p className="font-bold text-slate-800">Recordatorio de pago</p>
            <p className="text-slate-500 text-xs">
              Los pagos deben realizarse del 1 al 5 de cada mes.
            </p>
          </div>

          <div className="border rounded-2xl p-3">
            <p className="font-bold text-slate-800">Reglas del condominio</p>
            <p className="text-slate-500 text-xs">
              Mantener limpias y organizadas las áreas comunes.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}