"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string;
  telefono: string;
  correo: string;
};

type UsuarioAdministrativo = {
  usuario_nombre: string;
  usuario_rol: string;
  condominio_id: string;
  condominio_nombre: string;
};

export default function MovilPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(
    null
  );

  const [usuarioAdmin, setUsuarioAdmin] = useState<UsuarioAdministrativo | null>(
    null
  );

  useEffect(() => {
    const propietarioData = localStorage.getItem("propietario_actual");

    if (propietarioData) {
      try {
        setPropietario(JSON.parse(propietarioData));
        return;
      } catch {
        localStorage.removeItem("propietario_actual");
      }
    }

    const usuario_nombre = localStorage.getItem("usuario_nombre") || "";
    const usuario_rol = localStorage.getItem("usuario_rol") || "";
    const condominio_id = localStorage.getItem("condominio_id") || "";
    const condominio_nombre = localStorage.getItem("condominio_nombre") || "";

    if (usuario_nombre && usuario_rol && condominio_id) {
      setUsuarioAdmin({
        usuario_nombre,
        usuario_rol,
        condominio_id,
        condominio_nombre,
      });

      return;
    }

    router.push("/movil-login");
  }, [router]);

  function cerrarSesion() {
    localStorage.removeItem("propietario_actual");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_admin_id");
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");

    router.push("/movil-login");
  }

  const rolNormalizado = usuarioAdmin?.usuario_rol?.toLowerCase() || "";

  const esTesorero =
    rolNormalizado.includes("tesorero") ||
    rolNormalizado.includes("tesoreria") ||
    rolNormalizado.includes("tesorería");

  const esPresidente = rolNormalizado.includes("presidente");

  const esAdmin =
    rolNormalizado.includes("admin") ||
    rolNormalizado.includes("administrador") ||
    rolNormalizado.includes("super");

  if (!propietario && !usuarioAdmin) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-slate-950 text-white rounded-3xl p-6 shadow">
          <p className="text-sm text-amber-300 font-semibold">
            VAM Administración de Condominios
          </p>

          <h1 className="text-2xl font-bold mt-3">
            {propietario ? "Portal del Propietario" : "Portal Directiva"}
          </h1>

          <p className="text-slate-300 text-sm mt-2">
            {propietario?.condominio_nombre ||
              usuarioAdmin?.condominio_nombre ||
              "Condominio activo"}
          </p>

          {propietario && (
            <p className="text-slate-300 text-sm">
              Apto. {propietario.no_apartamento}
            </p>
          )}

          <div className="mt-4 bg-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400">
              {propietario ? "Propietario" : "Usuario"}
            </p>

            <p className="font-bold">
              {propietario?.nombre_propietario || usuarioAdmin?.usuario_nombre}
            </p>

            {usuarioAdmin && (
              <p className="text-xs text-amber-300 mt-1">
                Rol: {usuarioAdmin.usuario_rol}
              </p>
            )}
          </div>
        </div>

        {propietario && (
          <div className="grid grid-cols-1 gap-4">
            <Link
              href="/movil/pagar"
              className="bg-green-700 text-white rounded-2xl p-5 shadow block"
            >
              <h2 className="text-lg font-bold">Realizar Pago</h2>
              <p className="text-sm text-green-100">
                Reportar pago y subir comprobante
              </p>
            </Link>

            <Link
              href="/movil/estado-cuenta"
              className="bg-white text-slate-900 rounded-2xl p-5 shadow-sm border block"
            >
              <h2 className="text-lg font-bold">Estado de Cuenta</h2>
              <p className="text-sm text-slate-500">
                Consultar balance, pagos y cargos pendientes
              </p>
            </Link>

            <Link
              href="/movil/recibos"
              className="bg-white text-slate-900 rounded-2xl p-5 shadow-sm border block"
            >
              <h2 className="text-lg font-bold">Recibos y Pagos</h2>
              <p className="text-sm text-slate-500">
                Ver historial de pagos registrados
              </p>
            </Link>

            <Link
              href="/movil/reservar-area"
              className="bg-white text-slate-900 rounded-2xl p-5 shadow-sm border block"
            >
              <h2 className="text-lg font-bold">Reservar Área Social</h2>
              <p className="text-sm text-slate-500">
                Solicitar reserva de áreas comunes
              </p>
            </Link>

            <Link
              href="/movil/incidencias"
              className="bg-white text-slate-900 rounded-2xl p-5 shadow-sm border block"
            >
              <h2 className="text-lg font-bold">Reportar Incidencia</h2>
              <p className="text-sm text-slate-500">
                Enviar reportes, averías o situaciones del condominio
              </p>
            </Link>

            <Link
              href="/movil/anuncios"
              className="bg-white text-slate-900 rounded-2xl p-5 shadow-sm border block"
            >
              <h2 className="text-lg font-bold">Anuncios</h2>
              <p className="text-sm text-slate-500">
                Ver comunicaciones oficiales del condominio
              </p>
            </Link>
          </div>
        )}

        {usuarioAdmin && (
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border">
              <h2 className="text-lg font-bold text-slate-900">
                Aprobaciones de Pago
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Revisión móvil de solicitudes pendientes según su rol.
              </p>
            </div>

            {(esTesorero || esAdmin) && (
              <Link
                href="/movil/solicitudes-pago/tesorero"
                className="bg-yellow-600 text-white rounded-2xl p-5 shadow block"
              >
                <h2 className="text-lg font-bold">Pendientes Tesorero</h2>
                <p className="text-sm text-yellow-100">
                  Aprobar, devolver o rechazar solicitudes pendientes
                </p>
              </Link>
            )}

            {(esPresidente || esAdmin) && (
              <Link
                href="/movil/solicitudes-pago/presidente"
                className="bg-blue-700 text-white rounded-2xl p-5 shadow block"
              >
                <h2 className="text-lg font-bold">Pendientes Presidente</h2>
                <p className="text-sm text-blue-100">
                  Aprobar, solicitar aclaración o rechazar solicitudes
                </p>
              </Link>
            )}

            <Link
              href="/movil/solicitudes-pago"
              className="bg-white text-slate-900 rounded-2xl p-5 shadow-sm border block"
            >
              <h2 className="text-lg font-bold">Listado de Solicitudes</h2>
              <p className="text-sm text-slate-500">
                Consultar solicitudes de pago del condominio activo
              </p>
            </Link>

            {!esTesorero && !esPresidente && !esAdmin && (
              <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-2xl p-4 text-sm">
                Su rol actual no tiene aprobaciones asignadas en el móvil.
              </div>
            )}
          </div>
        )}

        <button
          onClick={cerrarSesion}
          className="w-full bg-red-600 hover:bg-red-700 text-white rounded-2xl p-4 font-bold shadow"
        >
          Cerrar sesión
        </button>

        <p className="text-center text-xs text-slate-400 pt-4">
          VAM Administración de Condominios
        </p>
      </div>
    </main>
  );
}