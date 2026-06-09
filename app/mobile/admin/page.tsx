"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type MenuItem = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: string;
  color: string;
  activo: boolean;
};

export default function MobileAdminHomePage() {
  const router = useRouter();

  const [condominioNombre, setCondominioNombre] = useState("");
  const [condominioLogoUrl, setCondominioLogoUrl] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");
  const [usuarioRol, setUsuarioRol] = useState("");

  useEffect(() => {
    const condominioId = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const logo = localStorage.getItem("condominio_logo_url") || "";
    const usuario = localStorage.getItem("usuario_nombre") || "";
    const rol = localStorage.getItem("usuario_rol") || "";

    if (!condominioId) {
      router.push("/mobile");
      return;
    }

    setCondominioNombre(nombre);
    setCondominioLogoUrl(logo);
    setUsuarioNombre(usuario);
    setUsuarioRol(rol);
  }, [router]);

  function cerrarSesion() {
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_admin_id");

    router.push("/mobile");
  }

  const modulos: MenuItem[] = [
    {
      titulo: "Banco",
      descripcion: "Importar banco, identificar pagos y revisar pagos identificados.",
      href: "/mobile/admin/banco",
      icono: "🏦",
      color: "from-emerald-700 to-green-500",
      activo: true,
    },
    {
      titulo: "Pagos",
      descripcion: "Registrar y consultar pagos de mantenimiento.",
      href: "/mobile/admin/pagos",
      icono: "💳",
      color: "from-blue-700 to-blue-500",
      activo: false,
    },
    {
      titulo: "Propietarios",
      descripcion: "Consultar apartamentos, propietarios y datos de contacto.",
      href: "/mobile/admin/propietarios",
      icono: "👥",
      color: "from-purple-700 to-fuchsia-500",
      activo: true,
    },
    {
      titulo: "Gastos",
      descripcion: "Registrar gastos, suplidores y comprobantes.",
      href: "/mobile/admin/gastos",
      icono: "🧾",
      color: "from-orange-600 to-red-500",
      activo: true,
    },
    {
      titulo: "Incidencias",
      descripcion: "Ver reportes, reclamos y solicitudes de residentes.",
      href: "/mobile/admin/incidencias",
      icono: "🛠️",
      color: "from-slate-800 to-slate-600",
      activo: false,
    },
    {
      titulo: "Anuncios",
      descripcion: "Publicar avisos y comunicaciones a los residentes.",
      href: "/mobile/admin/anuncios",
      icono: "📢",
      color: "from-cyan-700 to-sky-500",
      activo: false,
    },
    {
      titulo: "Reportes",
      descripcion: "Ingresos, gastos, balance y estado financiero.",
      href: "/mobile/admin/reportes",
      icono: "📊",
      color: "from-indigo-700 to-blue-500",
      activo: false,
    },
    {
      titulo: "Configuración",
      descripcion: "Parámetros del condominio y opciones del sistema.",
      href: "/mobile/admin/configuracion",
      icono: "⚙️",
      color: "from-zinc-700 to-zinc-500",
      activo: false,
    },
  ];

  const modulosActivos = modulos.filter((m) => m.activo).length;
  const modulosPendientes = modulos.filter((m) => !m.activo).length;

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <section className="bg-slate-950 text-white rounded-b-3xl p-5 shadow">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {condominioLogoUrl ? (
              <img
                src={condominioLogoUrl}
                alt={condominioNombre || "Logo"}
                className="h-14 w-14 rounded-2xl object-contain bg-white p-2"
              />
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl">
                🏢
              </div>
            )}

            <div>
              <p className="text-xs text-slate-300">Panel móvil</p>
              <h1 className="text-2xl font-black">VAM Admin</h1>
            </div>
          </div>

          <button
            onClick={cerrarSesion}
            className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl text-xs font-bold"
          >
            Salir
          </button>
        </div>

        <div className="mt-5">
          <p className="text-sm text-slate-300">Condominio</p>
          <h2 className="text-lg font-bold">
            {condominioNombre || "Condominio no identificado"}
          </h2>

          <p className="text-xs text-slate-400 mt-2">
            Usuario: {usuarioNombre || "Administrador"}{" "}
            {usuarioRol ? `• ${usuarioRol}` : ""}
          </p>
        </div>
      </section>

      <section className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Módulos</p>
            <h3 className="text-2xl font-black">{modulos.length}</h3>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Activos</p>
            <h3 className="text-2xl font-black text-green-700">
              {modulosActivos}
            </h3>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Pendientes</p>
            <h3 className="text-2xl font-black text-orange-600">
              {modulosPendientes}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <h2 className="text-lg font-black text-slate-900">
            Módulos administrativos
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Seleccione el módulo que desea trabajar desde el celular.
          </p>
        </div>

        <div className="space-y-3">
          {modulos.map((item) => {
            const card = (
              <div
                className={`rounded-2xl border shadow-sm overflow-hidden ${
                  item.activo
                    ? "bg-white"
                    : "bg-white opacity-70"
                }`}
              >
                <div className={`h-2 bg-gradient-to-r ${item.color}`} />

                <div className="p-4 flex items-center gap-4">
                  <div
                    className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center text-3xl shadow-sm`}
                  >
                    {item.icono}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900">
                        {item.titulo}
                      </h3>

                      {!item.activo && (
                        <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold">
                          Próximo
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-500 mt-1">
                      {item.descripcion}
                    </p>
                  </div>

                  <div className="text-slate-400 text-xl">›</div>
                </div>
              </div>
            );

            if (!item.activo) {
              return (
                <div key={item.titulo}>
                  {card}
                </div>
              );
            }

            return (
              <Link key={item.titulo} href={item.href}>
                {card}
              </Link>
            );
          })}
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-4 text-center">
          <Link
            href="/mobile/admin"
            className="py-3 text-xs font-bold text-slate-900"
          >
            <div className="text-xl">🏠</div>
            Inicio
          </Link>

          <Link
            href="/mobile/admin/banco"
            className="py-3 text-xs font-bold text-emerald-700"
          >
            <div className="text-xl">🏦</div>
            Banco
          </Link>

          <button
            type="button"
            className="py-3 text-xs font-bold text-slate-400"
          >
            <div className="text-xl">📊</div>
            Reportes
          </button>

          <button
            type="button"
            onClick={cerrarSesion}
            className="py-3 text-xs font-bold text-red-600"
          >
            <div className="text-xl">🚪</div>
            Salir
          </button>
        </div>
      </nav>
    </main>
  );
}