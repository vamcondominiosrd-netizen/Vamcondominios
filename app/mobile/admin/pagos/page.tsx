"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type PagoRow = {
  id: number;
  condominio: string | null;
  no_apartamento: string | null;
  fecha_pago: string | null;
  mes_pagado: string | null;
  monto_pagado: number | null;
  metodo_pago: string | null;
  no_referencia: string | null;
  descripcion: string | null;
  estado: string | null;
  created_at: string | null;
  comprobante_url: string | null;
};

function obtenerMesActual() {
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function formatearMoneda(valor: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(valor || 0));
}

export default function MobileAdminPagosPage() {
  const router = useRouter();

  const [condominioNombre, setCondominioNombre] = useState("");
  const [pagos, setPagos] = useState<PagoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [mesFiltro, setMesFiltro] = useState(obtenerMesActual());
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id || !nombre) {
      router.push("/mobile");
      return;
    }

    setCondominioNombre(nombre);
    cargarPagos(nombre, obtenerMesActual());
  }, [router]);

  useEffect(() => {
    if (condominioNombre) {
      cargarPagos(condominioNombre, mesFiltro);
    }
  }, [mesFiltro, condominioNombre]);

  async function cargarPagos(nombreCondominio: string, mes: string) {
    setLoading(true);

    let query = supabase
      .from("pagos_mantenimiento")
      .select(
        "id, condominio, no_apartamento, fecha_pago, mes_pagado, monto_pagado, metodo_pago, no_referencia, descripcion, estado, created_at, comprobante_url"
      )
      .eq("condominio", nombreCondominio)
      .order("fecha_pago", { ascending: false })
      .order("id", { ascending: false });

    if (mes) {
      query = query.eq("mes_pagado", mes);
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      alert("Error cargando pagos: " + error.message);
      return;
    }

    setPagos((data as PagoRow[]) || []);
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

  const pagosFiltrados = pagos.filter((p) => {
    const texto = `${p.condominio || ""} ${p.no_apartamento || ""} ${
      p.fecha_pago || ""
    } ${p.mes_pagado || ""} ${p.monto_pagado || ""} ${
      p.metodo_pago || ""
    } ${p.no_referencia || ""} ${p.descripcion || ""} ${
      p.estado || ""
    }`
      .toLowerCase()
      .trim();

    return texto.includes(busqueda.toLowerCase().trim());
  });

  const totalPagos = pagosFiltrados.length;

  const montoTotal = pagosFiltrados.reduce(
    (total, item) => total + Number(item.monto_pagado || 0),
    0
  );

  const pagosConfirmados = pagosFiltrados.filter((p) => {
    const estado = String(p.estado || "").toLowerCase();
    return (
      estado.includes("confirm") ||
      estado.includes("pagado") ||
      estado.includes("registrado")
    );
  }).length;

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <section className="bg-blue-700 text-white rounded-b-3xl p-5 shadow">
        <Link href="/mobile/admin" className="text-sm opacity-90">
          ← Volver al menú
        </Link>

        <h1 className="text-2xl font-black mt-3">Pagos</h1>

        <p className="text-sm opacity-90 mt-1">
          {condominioNombre || "Condominio no identificado"}
        </p>

        <p className="text-sm opacity-90 mt-2">
          Consulta móvil de pagos de mantenimiento.
        </p>
      </section>

      <section className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Pagos</p>
            <h2 className="text-2xl font-black">{totalPagos}</h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Confirmados</p>
            <h2 className="text-2xl font-black text-green-700">
              {pagosConfirmados}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Monto</p>
            <h2 className="text-sm font-black text-blue-700">
              {formatearMoneda(montoTotal)}
            </h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Mes pagado
            </label>

            <input
              type="month"
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Buscar</label>

            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Apartamento, referencia, descripción..."
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <button
            onClick={() => cargarPagos(condominioNombre, mesFiltro)}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold"
          >
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            Cargando pagos...
          </div>
        ) : (
          <div className="space-y-3">
            {pagosFiltrados.map((pago) => {
              return (
                <div
                  key={pago.id}
                  className="bg-white rounded-2xl border shadow-sm p-4"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Apartamento</p>
                      <h2 className="text-xl font-black text-slate-900">
                        {pago.no_apartamento || "-"}
                      </h2>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-500">Monto</p>
                      <p className="font-black text-blue-700">
                        {formatearMoneda(Number(pago.monto_pagado || 0))}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Fecha pago</p>
                      <p className="font-bold">{pago.fecha_pago || "-"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Mes pagado</p>
                      <p className="font-bold">{pago.mes_pagado || "-"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Método</p>
                      <p className="font-bold">{pago.metodo_pago || "-"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Referencia</p>
                      <p className="font-bold">{pago.no_referencia || "-"}</p>
                    </div>
                  </div>

                  {pago.descripcion && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-500">Descripción</p>
                      <p className="text-sm">{pago.descripcion}</p>
                    </div>
                  )}

                  <div className="mt-4 flex justify-between items-center">
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                      {pago.estado || "Registrado"}
                    </span>

                    {pago.comprobante_url ? (
                      <a
                        href={pago.comprobante_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-700 font-bold underline"
                      >
                        Ver comprobante
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Sin comprobante
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {pagosFiltrados.length === 0 && (
              <div className="bg-white rounded-2xl border shadow-sm p-6 text-center text-slate-500">
                No hay pagos para esta consulta.
              </div>
            )}
          </div>
        )}
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
            href="/mobile/admin/banco"
            className="py-3 text-xs font-bold text-slate-700"
          >
            <div className="text-xl">🏦</div>
            Banco
          </Link>

          <Link
            href="/mobile/admin/pagos"
            className="py-3 text-xs font-bold text-blue-700"
          >
            <div className="text-xl">💳</div>
            Pagos
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