"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type PagoRow = {
  id: number;
  condominio_id: number;
  unidad_id: number | null;
  monto: number | null;
  fecha_pago: string | null;
  referencia: string | null;
  metodo: string | null;
  metodo_pago: string | null;
  origen: string | null;
  tipo_fondo: string | null;
  descripcion: string | null;
  comprobante_url: string | null;
  created_at: string | null;
  unidades?: {
    codigo: string | null;
  } | null;
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

function fechaCorta(fecha: string | null) {
  if (!fecha) return "-";

  const d = new Date(`${fecha}T00:00:00`);

  if (Number.isNaN(d.getTime())) return fecha;

  return d.toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function obtenerPeriodoDesdeFecha(fecha: string | null) {
  if (!fecha || fecha.length < 7) return "";
  return fecha.slice(0, 7);
}

export default function MobileAdminPagosPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [pagos, setPagos] = useState<PagoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [mesFiltro, setMesFiltro] = useState(obtenerMesActual());
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    if (!id) {
      router.push("/mobile");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre || `Condominio ID ${id}`);
    cargarPagos(id, obtenerMesActual());
  }, [router]);

  useEffect(() => {
    if (condominioId) {
      cargarPagos(condominioId, mesFiltro);
    }
  }, [mesFiltro, condominioId]);

  async function cargarPagos(idCondominio: string, mes: string) {
    setLoading(true);

    let query = supabase
      .from("pagos")
      .select(
        `
        id,
        condominio_id,
        unidad_id,
        monto,
        fecha_pago,
        referencia,
        metodo,
        metodo_pago,
        origen,
        tipo_fondo,
        descripcion,
        comprobante_url,
        created_at,
        unidades (
          codigo
        )
      `
      )
      .eq("condominio_id", Number(idCondominio))
      .order("fecha_pago", { ascending: false })
      .order("id", { ascending: false });

    if (mes) {
      const desde = `${mes}-01`;
      const [anio, mesNumero] = mes.split("-").map(Number);
      const hastaDate = new Date(anio, mesNumero, 0);
      const hasta = `${anio}-${String(mesNumero).padStart(2, "0")}-${String(
        hastaDate.getDate()
      ).padStart(2, "0")}`;

      query = query.gte("fecha_pago", desde).lte("fecha_pago", hasta);
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      alert("Error cargando pagos: " + error.message);
      setPagos([]);
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
    localStorage.removeItem("super_admin_id");

    router.push("/mobile");
  }

  const pagosFiltrados = useMemo(() => {
    return pagos.filter((p) => {
      const apartamento = p.unidades?.codigo || "";

      const texto = `${apartamento} ${p.fecha_pago || ""} ${p.monto || ""} ${
        p.referencia || ""
      } ${p.metodo_pago || ""} ${p.metodo || ""} ${p.origen || ""} ${
        p.tipo_fondo || ""
      } ${p.descripcion || ""} ${obtenerPeriodoDesdeFecha(p.fecha_pago)}`
        .toLowerCase()
        .trim();

      return texto.includes(busqueda.toLowerCase().trim());
    });
  }, [pagos, busqueda]);

  const totalPagos = pagosFiltrados.length;

  const montoTotal = pagosFiltrados.reduce(
    (total, item) => total + Number(item.monto || 0),
    0
  );

  const pagosManual = pagosFiltrados.filter(
    (p) => String(p.origen || p.metodo || "").toUpperCase() === "MANUAL"
  ).length;

  const pagosBanco = pagosFiltrados.filter((p) => {
    const origen = String(p.origen || p.metodo || "").toUpperCase();
    return origen.includes("BANCO") || origen.includes("IMPORT");
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
          Consulta móvil de pagos registrados en la tabla nueva de pagos.
        </p>
      </section>

      <section className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Pagos</p>
            <h2 className="text-2xl font-black">{totalPagos}</h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Manual</p>
            <h2 className="text-2xl font-black text-green-700">
              {pagosManual}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Banco</p>
            <h2 className="text-2xl font-black text-purple-700">
              {pagosBanco}
            </h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <p className="text-xs text-slate-500">Monto total visible</p>
          <h2 className="text-2xl font-black text-blue-700 mt-1">
            {formatearMoneda(montoTotal)}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
         <Link
  href="/mobile/admin/pagos/nuevo"
  className="bg-green-700 text-white rounded-2xl p-4 shadow-sm text-center font-bold"
>
  Registrar pago
</Link>

          <Link
            href="/mobile/admin/banco"
            className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm text-center font-bold"
          >
            Banco
          </Link>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Mes del pago
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
              placeholder="Apartamento, referencia, método, descripción..."
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <button
            onClick={() => cargarPagos(condominioId, mesFiltro)}
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
              const apartamento = pago.unidades?.codigo || "Sin unidad";

              return (
                <div
                  key={pago.id}
                  className="bg-white rounded-2xl border shadow-sm p-4"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Apartamento</p>
                      <h2 className="text-xl font-black text-slate-900">
                        {apartamento}
                      </h2>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-500">Monto</p>
                      <p className="font-black text-blue-700">
                        {formatearMoneda(Number(pago.monto || 0))}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Fecha pago</p>
                      <p className="font-bold">{fechaCorta(pago.fecha_pago)}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Periodo</p>
                      <p className="font-bold">
                        {obtenerPeriodoDesdeFecha(pago.fecha_pago) || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Método pago</p>
                      <p className="font-bold">
                        {pago.metodo_pago || pago.metodo || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Fondo</p>
                      <p className="font-bold">{pago.tipo_fondo || "-"}</p>
                    </div>
                  </div>

                  {pago.referencia && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-500">Referencia</p>
                      <p className="text-sm font-semibold">
                        {pago.referencia}
                      </p>
                    </div>
                  )}

                  {pago.descripcion && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-500">Descripción</p>
                      <p className="text-sm line-clamp-3">
                        {pago.descripcion}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex justify-between items-center">
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                      {pago.origen || pago.metodo || "Registrado"}
                    </span>

                    <div className="flex items-center gap-3">
                      {pago.comprobante_url ? (
                        <a
                          href={pago.comprobante_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-700 font-bold underline"
                        >
                          Comprobante
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Sin comprobante
                        </span>
                      )}

                      <Link
                        href={`/recibos/pago/pagos/${pago.id}`}
                        className="text-xs text-purple-700 font-bold underline"
                      >
                        Recibo
                      </Link>
                    </div>
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

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
        <div className="grid grid-cols-5 text-xs text-center">
          <Link href="/mobile/admin" className="py-3 text-slate-600">
            <div>🏠</div>
            <span className="block mt-1">Inicio</span>
          </Link>

          <Link href="/mobile/admin/banco" className="py-3 text-slate-600">
            <div>🏦</div>
            <span className="block mt-1">Banco</span>
          </Link>

          <Link
            href="/mobile/admin/pagos"
            className="py-3 font-bold text-blue-700"
          >
            <div>💳</div>
            <span className="block mt-1">Pagos</span>
          </Link>

          <Link
            href="/mobile/admin/solicitudes-pagos"
            className="py-3 text-slate-600"
          >
            <div>💼</div>
            <span className="block mt-1">Solicitudes</span>
          </Link>

          <Link href="/mobile/admin/mas" className="py-3 text-slate-600">
            <div>☰</div>
            <span className="block mt-1">Más</span>
          </Link>
        </div>
      </nav>
    </main>
  );
}