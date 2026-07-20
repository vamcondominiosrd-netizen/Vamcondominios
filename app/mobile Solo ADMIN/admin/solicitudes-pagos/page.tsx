"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type MenuItem = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: string;
  color: string;
};

export default function MobileSolicitudesPagosMenuPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [pendienteTesorero, setPendienteTesorero] = useState(0);
  const [pendientePresidente, setPendientePresidente] = useState(0);
  const [aprobadas, setAprobadas] = useState(0);
  const [gastoGenerado, setGastoGenerado] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      router.push("/mobile");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre || `Condominio ID ${id}`);
    cargarResumen(id);
  }, [router]);

  async function cargarResumen(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("solicitudes_pago")
      .select("id, estado, gasto_generado_id")
      .eq("condominio_id", Number(id));

    if (error) {
      setLoading(false);
      alert("Error cargando resumen: " + error.message);
      return;
    }

    const lista = data || [];

    setPendienteTesorero(
      lista.filter((s) => s.estado === "Pendiente aprobación tesorero").length
    );

    setPendientePresidente(
      lista.filter((s) => s.estado === "Aprobado por tesorero").length
    );

    setAprobadas(
      lista.filter(
        (s) => s.estado === "Aprobado por presidente" && !s.gasto_generado_id
      ).length
    );

    setGastoGenerado(
      lista.filter((s) => s.estado === "Gasto generado").length
    );

    setLoading(false);
  }

  function cerrarSesion() {
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_admin_id");

    router.push("/mobile");
  }

  const opciones: MenuItem[] = [
    {
      titulo: "Nueva Solicitud",
      descripcion: "Crear una solicitud de pago con soporte, proveedor y monto.",
      href: "/mobile/admin/solicitudes-pagos/nueva",
      icono: "➕",
      color: "from-blue-700 to-blue-500",
    },
    {
      titulo: "Firma Tesorero",
      descripcion: "Revisar, aprobar, devolver o rechazar solicitudes.",
      href: "/mobile/admin/solicitudes-pagos/tesorero",
      icono: "✍️",
      color: "from-yellow-600 to-orange-500",
    },
    {
      titulo: "Firma Presidente",
      descripcion: "Aprobación final de solicitudes revisadas por tesorería.",
      href: "/mobile/admin/solicitudes-pagos/presidente",
      icono: "🖊️",
      color: "from-indigo-700 to-blue-500",
    },
    {
      titulo: "Aprobadas",
      descripcion: "Solicitudes aprobadas pendientes de generar gasto.",
      href: "/mobile/admin/solicitudes-pagos/aprobadas",
      icono: "✅",
      color: "from-green-700 to-emerald-500",
    },
    {
      titulo: "Pagadas / Historial",
      descripcion: "Consultar solicitudes completadas y pagos realizados.",
      href: "/mobile/admin/solicitudes-pagos/pagadas",
      icono: "📁",
      color: "from-slate-800 to-slate-600",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <section className="bg-indigo-700 text-white rounded-b-3xl p-5 shadow">
        <Link href="/mobile/admin" className="text-sm opacity-90">
          ← Volver al menú principal
        </Link>

        <h1 className="text-2xl font-black mt-3">Solicitudes-pagos</h1>

        <p className="text-sm opacity-90 mt-1">
          {condominioNombre || "Condominio no seleccionado"}
        </p>

        <p className="text-sm opacity-90 mt-2">
          Submenú para crear, firmar, aprobar y generar gastos.
        </p>
      </section>

      <section className="p-4 space-y-4">
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded-2xl border shadow-sm p-3">
            <p className="text-[11px] text-slate-500">Tesorero</p>
            <h2 className="text-xl font-black text-yellow-700">
              {loading ? "..." : pendienteTesorero}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-3">
            <p className="text-[11px] text-slate-500">Presid.</p>
            <h2 className="text-xl font-black text-blue-700">
              {loading ? "..." : pendientePresidente}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-3">
            <p className="text-[11px] text-slate-500">Aprob.</p>
            <h2 className="text-xl font-black text-green-700">
              {loading ? "..." : aprobadas}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-3">
            <p className="text-[11px] text-slate-500">Gener.</p>
            <h2 className="text-xl font-black text-slate-700">
              {loading ? "..." : gastoGenerado}
            </h2>
          </div>
        </div>

        <button
          onClick={() => cargarResumen(condominioId)}
          className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold"
        >
          Actualizar resumen
        </button>

        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <h2 className="text-lg font-black text-slate-900">
            Submenú solicitudes-pagos
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Seleccione la opción que desea trabajar desde el celular.
          </p>
        </div>

        <div className="space-y-3">
          {opciones.map((item) => (
            <Link key={item.titulo} href={item.href}>
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${item.color}`} />

                <div className="p-4 flex items-center gap-4">
                  <div
                    className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center text-3xl shadow-sm`}
                  >
                    {item.icono}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-black text-slate-900">
                      {item.titulo}
                    </h3>

                    <p className="text-sm text-slate-500 mt-1">
                      {item.descripcion}
                    </p>
                  </div>

                  <div className="text-slate-400 text-xl">›</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-4 text-center">
          <Link
            href="/mobile/admin"
            className="py-3 text-xs font-bold text-slate-700"
          >
            <div className="text-xl">🏠</div>
            Inicio
          </Link>

          <Link
            href="/mobile/admin/solicitudes-pagos/nueva"
            className="py-3 text-xs font-bold text-slate-700"
          >
            <div className="text-xl">➕</div>
            Nueva
          </Link>

          <Link
            href="/mobile/admin/solicitudes-pagos"
            className="py-3 text-xs font-bold text-indigo-700"
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