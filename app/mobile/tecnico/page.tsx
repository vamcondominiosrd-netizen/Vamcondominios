"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type MenuItem = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: string;
  color: string;
  disponible: boolean;
};

export default function MenuTecnicoVAMPage() {
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");
  const [usuarioRol, setUsuarioRol] = useState("");

  useEffect(() => {
    setCondominioNombre(localStorage.getItem("condominio_nombre") || "");
    setUsuarioNombre(localStorage.getItem("usuario_nombre") || "");
    setUsuarioRol(localStorage.getItem("usuario_rol") || "");
  }, []);

  const menu: MenuItem[] = [
    {
      titulo: "Recibir Gas",
      descripcion: "Registrar conduce, fotos del camión y tanque del condominio.",
      href: "/mobile/tecnico/gas/recepcion",
      icono: "🔥",
      color: "from-orange-500 to-red-600",
      disponible: true,
    },
    {
      titulo: "Incidencias",
      descripcion: "Consultar incidencias pendientes y en proceso.",
      href: "/mobile/tecnico/incidencias",
      icono: "🛠️",
      color: "from-blue-500 to-indigo-700",
      disponible: true,
    },
    {
      titulo: "Cerrar Incidencias",
      descripcion: "Subir evidencia final y cerrar trabajos realizados.",
      href: "/mobile/tecnico/incidencias",
      icono: "✅",
      color: "from-green-500 to-emerald-700",
      disponible: true,
    },
    {
      titulo: "Registrar Evidencias",
      descripcion: "Subir fotos operativas de áreas comunes o trabajos realizados.",
      href: "/mobile/tecnico/evidencias",
      icono: "📸",
      color: "from-purple-500 to-fuchsia-700",
      disponible: true,
    },
    {
      titulo: "Mis Trabajos",
     descripcion: "Ver, iniciar y completar trabajos asignados.",
     href: "/mobile/tecnico/trabajos",
     icono: "🧰",
     color: "from-amber-500 to-orange-700",
     disponible: true,
    },
    {
      titulo: "Checklist de Visita",
      descripcion: "Completar revisión operativa del condominio.",
      href: "/mobile/tecnico/checklist-visita",
      icono: "📋",
      color: "from-cyan-500 to-blue-700",
      disponible: true,
    },
 
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-md space-y-4">
        <section className="rounded-3xl bg-white border shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-700 to-slate-900 flex items-center justify-center text-white text-2xl shadow">
              👷
            </div>

            <div>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                VAM Administradora
              </p>
              <h1 className="text-2xl font-black text-slate-900">
                Panel Técnico
              </h1>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 border p-3 text-sm">
            <p className="text-slate-500">Usuario</p>
            <p className="font-bold text-slate-900">
              {usuarioNombre || "Técnico VAM"}
            </p>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <p className="text-slate-500">Rol</p>
                <p className="font-bold text-slate-900">
                  {usuarioRol || "tecnico"}
                </p>
              </div>

              <div>
                <p className="text-slate-500">Condominio</p>
                <p className="font-bold text-slate-900 line-clamp-1">
                  {condominioNombre || "No seleccionado"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {menu.map((item) => {
            const contenido = (
              <div
                className={`rounded-3xl border bg-white p-4 shadow-sm ${
                  item.disponible
                    ? "hover:shadow-md active:scale-[0.98] transition-all"
                    : "opacity-60"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white text-2xl shadow`}
                  >
                    {item.icono}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-lg font-black text-slate-900">
                        {item.titulo}
                      </h2>

                      {!item.disponible && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                          Próximo
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-500 mt-1">
                      {item.descripcion}
                    </p>
                  </div>
                </div>
              </div>
            );

            if (!item.disponible) {
              return (
                <div key={item.titulo} title="Módulo pendiente de crear">
                  {contenido}
                </div>
              );
            }

            return (
              <Link key={item.titulo} href={item.href}>
                {contenido}
              </Link>
            );
          })}
        </section>

        <section className="rounded-3xl bg-white border shadow-sm p-4">
          <p className="text-sm font-bold text-slate-900">
            Flujo operativo recomendado
          </p>

          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>1. Seleccionar la tarea operativa.</p>
            <p>2. Registrar información y evidencias desde el celular.</p>
            <p>3. Guardar el registro para revisión de administración.</p>
          </div>
        </section>
      </div>
    </main>
  );
}