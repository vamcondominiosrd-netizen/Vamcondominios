"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type Modulo = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: string;
  color: string;
  activo: boolean;
};


const CLAVES_SESION = [
  "user_id",
  "empresa_id",
  "empresa_nombre",
  "condominio_id",
  "condominio_nombre",
  "condominio_logo_url",
  "usuario_rol",
  "usuario_nombre",
  "usuario_admin_id",
  "permisos_usuario",
];

function normalizarRol(valor?: string | null) {
  return String(valor || "").trim().toLowerCase();
}

function rolAdministrativoPermitido(
  ...roles: Array<string | null | undefined>
) {
  return roles.some((rol) => {
    const valor = normalizarRol(rol);

    return (
      valor.includes("admin") ||
      valor.includes("administrador") ||
      valor.includes("presidente") ||
      valor.includes("tesorero") ||
      valor.includes("tesoreria") ||
      valor.includes("tesorería") ||
      valor.includes("secretario") ||
      valor.includes("supervisor") ||
      valor.includes("super")
    );
  });
}

export default function MobileAdminPage() {
  const router = useRouter();

  const [condominioNombre, setCondominioNombre] = useState("");
  const [condominioLogo, setCondominioLogo] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");
  const [usuarioRol, setUsuarioRol] = useState("");
  const [validandoAcceso, setValidandoAcceso] = useState(true);
  const [autorizado, setAutorizado] = useState(false);

  function limpiarSesionLocal() {
    CLAVES_SESION.forEach((clave) => localStorage.removeItem(clave));
  }

  useEffect(() => {
    let activo = true;

    async function validarAcceso() {
      setValidandoAcceso(true);

      const id = localStorage.getItem("condominio_id") || "";

      if (!id) {
        limpiarSesionLocal();
        if (activo) router.replace("/mobile/admin/login");
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        limpiarSesionLocal();
        if (activo) router.replace("/mobile/admin/login");
        return;
      }

      const { data: acceso, error: accesoError } = await supabase
        .from("usuarios_condominios")
        .select("condominio_id, empresa_id, rol_condominio, activo")
        .eq("user_id", session.user.id)
        .eq("condominio_id", Number(id))
        .eq("activo", true)
        .maybeSingle();

      if (accesoError || !acceso) {
        await supabase.auth.signOut();
        limpiarSesionLocal();
        if (activo) router.replace("/mobile/admin/login");
        return;
      }

      const empresaId = Number(
        (acceso as any).empresa_id ||
          localStorage.getItem("empresa_id") ||
          0,
      );

      const { data: empresaUsuario, error: empresaError } = await supabase
        .from("usuarios_empresas")
        .select("empresa_id, nombre_usuario, rol_global, activo")
        .eq("user_id", session.user.id)
        .eq("empresa_id", empresaId)
        .eq("activo", true)
        .maybeSingle();

      if (
        empresaError ||
        !empresaUsuario ||
        !rolAdministrativoPermitido(
          (empresaUsuario as any).rol_global,
          (acceso as any).rol_condominio,
        )
      ) {
        await supabase.auth.signOut();
        limpiarSesionLocal();
        if (activo) router.replace("/mobile/admin/login");
        return;
      }

      if (!activo) return;

      const nombreGuardado =
        localStorage.getItem("condominio_nombre") ||
        `Condominio ID ${id}`;
      const nombreUsuario =
        (empresaUsuario as any).nombre_usuario ||
        localStorage.getItem("usuario_nombre") ||
        session.user.email ||
        "Usuario";
      const rol =
        (acceso as any).rol_condominio ||
        (empresaUsuario as any).rol_global ||
        "Administrador";

      localStorage.setItem("user_id", session.user.id);
      localStorage.setItem("usuario_admin_id", session.user.id);
      localStorage.setItem("empresa_id", String(empresaId));
      localStorage.setItem("usuario_nombre", nombreUsuario);
      localStorage.setItem("usuario_rol", String(rol));

      setCondominioNombre(nombreGuardado);
      setCondominioLogo(
        localStorage.getItem("condominio_logo_url") || "",
      );
      setUsuarioNombre(nombreUsuario);
      setUsuarioRol(String(rol));
      setAutorizado(true);
      setValidandoAcceso(false);
    }

    validarAcceso();

    return () => {
      activo = false;
    };
  }, [router]);

  async function cerrarSesion() {
    limpiarSesionLocal();
    await supabase.auth.signOut();
    router.replace("/mobile/admin/login");
  }

  const modulos: Modulo[] = [
    {
      titulo: "Caja Chica",
      descripcion:
        "Registrar gastos menores, tomar foto del soporte y consultar el disponible.",
      href: "/mobile/admin/caja-chica",
      icono: "💵",
      color: "from-emerald-700 to-green-500",
      activo: true,
    },
    {
      titulo: "Banco",
      descripcion: "Importar banco, identificar pagos y revisar movimientos.",
      href: "/mobile/admin/banco",
      icono: "🏦",
      color: "from-blue-700 to-blue-500",
      activo: true,
    },
    {
      titulo: "Pagos",
      descripcion: "Consultar pagos de mantenimiento registrados.",
      href: "/mobile/admin/pagos",
      icono: "💳",
      color: "from-green-700 to-emerald-500",
      activo: true,
    },
    {
      titulo: "Solicitudes-pagos",
      descripcion: "Crear, firmar, aprobar y generar gastos.",
      href: "/mobile/admin/solicitudes-pagos",
      icono: "💼",
      color: "from-indigo-700 to-blue-500",
      activo: true,
    },
    {
      titulo: "Gastos",
      descripcion: "Registrar gastos, aprobar pagos y marcar pagados.",
      href: "/mobile/admin/gastos",
      icono: "🧾",
      color: "from-orange-700 to-amber-500",
      activo: true,
    },
    {
      titulo: "Propietarios",
      descripcion: "Administrar propietarios y apartamentos.",
      href: "/mobile/admin/propietarios",
      icono: "👥",
      color: "from-purple-700 to-fuchsia-500",
      activo: true,
    },
    {
      titulo: "Incidencias",
      descripcion: "Revisar reportes, quejas y solicitudes de residentes.",
      href: "/mobile/admin/incidencias",
      icono: "🛠️",
      color: "from-slate-800 to-slate-600",
      activo: true,
    },
    {
      titulo: "Anuncios",
      descripcion: "Publicar avisos y comunicaciones a residentes.",
      href: "/mobile/admin/anuncios",
      icono: "📢",
      color: "from-cyan-700 to-sky-500",
      activo: true,
    },
    {
      titulo: "Reportes",
      descripcion: "Ver reportes financieros y administrativos.",
      href: "/mobile/admin/reportes",
      icono: "📊",
      color: "from-rose-700 to-pink-500",
      activo: false,
    },
    {
      titulo: "Configuración",
      descripcion: "Parámetros generales del condominio.",
      href: "/mobile/admin/configuracion",
      icono: "⚙️",
      color: "from-zinc-700 to-zinc-500",
      activo: false,
    },
  ];

  if (validandoAcceso) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="rounded-2xl border bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-sm">
          Validando acceso seguro...
        </div>
      </main>
    );
  }

  if (!autorizado) return null;

  return (
      <main className="min-h-screen bg-slate-100 pb-24">
        <section className="bg-slate-900 text-white rounded-b-3xl p-5 shadow">
          <div className="flex items-center gap-4">
            {condominioLogo ? (
              <img
                src={condominioLogo}
                alt="Logo condominio"
                className="h-14 w-14 rounded-2xl object-cover bg-white"
              />
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">
                🏢
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-xl font-black leading-tight">
                VAM Administración
              </h1>
              <p className="text-sm opacity-90 leading-tight">
                {condominioNombre || "Condominio activo"}
              </p>
            </div>
          </div>

          <div className="mt-4 bg-white/10 rounded-2xl p-4">
            <p className="text-sm opacity-90">Usuario</p>
            <p className="font-bold">{usuarioNombre}</p>
            <p className="text-xs opacity-80 mt-1">Rol: {usuarioRol}</p>
          </div>
        </section>

        <section className="p-4 space-y-4">
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <h2 className="text-lg font-black text-slate-900">
              Menú de Administración
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Caja Chica queda como acceso principal. Los demás módulos se
              seguirán desarrollando según las necesidades.
            </p>
          </div>

          <div className="space-y-3">
            {modulos.map((modulo) => {
              const contenido = (
                <div
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                    !modulo.activo ? "opacity-60" : ""
                  }`}
                >
                  <div className={`h-2 bg-gradient-to-r ${modulo.color}`} />

                  <div className="p-4 flex items-center gap-4">
                    <div
                      className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${modulo.color} text-white flex items-center justify-center text-3xl shadow-sm`}
                    >
                      {modulo.icono}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900">
                          {modulo.titulo}
                        </h3>

                        {!modulo.activo && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-bold">
                            Próximo
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-500 mt-1">
                        {modulo.descripcion}
                      </p>
                    </div>

                    <div className="text-slate-400 text-xl">›</div>
                  </div>
                </div>
              );

              if (!modulo.activo) {
                return <div key={modulo.titulo}>{contenido}</div>;
              }

              return (
                <Link key={modulo.titulo} href={modulo.href}>
                  {contenido}
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
              href="/mobile/admin/caja-chica"
              className="py-3 text-xs font-bold text-emerald-700"
            >
              <div className="text-xl">💵</div>
              Caja Chica
            </Link>

            <Link
              href="/mobile/admin/solicitudes-pagos"
              className="py-3 text-xs font-bold text-slate-700"
            >
              <div className="text-xl">💼</div>
              Solicitudes
            </Link>

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
