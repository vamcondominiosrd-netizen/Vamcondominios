"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  IdCard,
  Loader2,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  User,
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

export default function PerfilPropietarioPage() {
  const router = useRouter();

  const [propietario, setPropietario] =
    useState<PropietarioActual | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("propietario_actual");

      if (!raw) {
        router.replace("/movil/propietarios/login");
        return;
      }

      const sesion = JSON.parse(raw) as PropietarioActual;

      if (
        !sesion?.propietario_id ||
        !sesion?.condominio_id ||
        !sesion?.unidad_id
      ) {
        router.replace("/movil/propietarios/login");
        return;
      }

      setPropietario(sesion);
    } catch {
      router.replace("/movil/propietarios/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  function cerrarSesion() {
    localStorage.removeItem("propietario_actual");
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");

    router.replace("/movil/propietarios/login");
  }

  if (loading) {
    return (
      <main className="min-h-dvh bg-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            <Loader2 size={20} className="animate-spin text-blue-700" />
            Cargando perfil...
          </div>
        </div>
      </main>
    );
  }

  if (!propietario) return null;

  return (
    <main className="min-h-dvh bg-slate-100 pb-8">
      <header className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-4 pb-7 pt-4 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/movil/propietarios/dashboard")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"
              aria-label="Volver"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="text-[11px] uppercase tracking-[0.16em] text-blue-200">
                Cuenta del propietario
              </p>
              <h1 className="truncate text-base font-black">
                Mi perfil
              </h1>
            </div>

            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10">
              <ShieldCheck size={18} />
            </span>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3">
            {propietario.condominio_logo_url ? (
              <img
                src={propietario.condominio_logo_url}
                alt={propietario.condominio_nombre}
                className="h-14 w-14 rounded-2xl bg-white object-contain p-1.5"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-sm font-black text-blue-900">
                VAM
              </div>
            )}

            <div className="min-w-0">
              <h2 className="truncate text-sm font-black">
                {propietario.nombre_propietario}
              </h2>
              <p className="mt-1 truncate text-[11px] text-blue-100">
                {propietario.condominio_nombre}
              </p>
              <p className="mt-0.5 text-[11px] text-blue-200">
                Unidad {propietario.no_apartamento}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        <section className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-black text-slate-900">
              Datos personales
            </h2>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Información registrada en VAM
            </p>
          </div>

          <div className="space-y-2.5">
            <InfoItem
              icon={<User size={18} />}
              titulo="Propietario"
              valor={propietario.nombre_propietario || "No registrado"}
            />

            <InfoItem
              icon={<IdCard size={18} />}
              titulo="Cédula"
              valor={propietario.cedula || "No registrada"}
            />

            <InfoItem
              icon={<Phone size={18} />}
              titulo="Teléfono"
              valor={propietario.telefono || "No registrado"}
              href={
                propietario.telefono
                  ? `tel:${propietario.telefono.replace(/\D/g, "")}`
                  : undefined
              }
            />

            <InfoItem
              icon={<Mail size={18} />}
              titulo="Correo"
              valor={propietario.correo || "No registrado"}
              href={
                propietario.correo
                  ? `mailto:${propietario.correo}`
                  : undefined
              }
            />
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-black text-slate-900">
              Datos del condominio
            </h2>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Unidad vinculada a esta sesión
            </p>
          </div>

          <div className="space-y-2.5">
            <InfoItem
              icon={<Building2 size={18} />}
              titulo="Condominio"
              valor={propietario.condominio_nombre || "No registrado"}
            />

            <InfoItem
              icon={<Building2 size={18} />}
              titulo="Apartamento / Unidad"
              valor={propietario.no_apartamento || "No registrado"}
            />
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={19}
              className="mt-0.5 shrink-0 text-blue-700"
            />
            <div>
              <h3 className="text-xs font-black text-blue-900">
                Sesión protegida
              </h3>
              <p className="mt-1 text-[11px] leading-5 text-blue-800">
                Esta cuenta solo muestra información correspondiente al
                condominio y la unidad vinculados al propietario.
              </p>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={cerrarSesion}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </main>
  );
}

function InfoItem({
  icon,
  titulo,
  valor,
  href,
}: {
  icon: React.ReactNode;
  titulo: string;
  valor: string;
  href?: string;
}) {
  const contenido = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-slate-400">{titulo}</p>
        <p className="mt-0.5 break-words text-xs font-extrabold text-slate-800">
          {valor}
        </p>
      </div>

      {href && (
        <ChevronRight size={16} className="shrink-0 text-slate-300" />
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"
      >
        {contenido}
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      {contenido}
    </div>
  );
}
