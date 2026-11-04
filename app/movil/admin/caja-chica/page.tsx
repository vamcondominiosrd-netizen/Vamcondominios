"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RequireAuth from "@/app/components/RequireAuth";
import { supabase } from "@/app/lib/supabaseClient";

type CajaChica = {
  id: number;
  fecha: string;
  concepto: string;
  detalle_gasto: string | null;
  monto: number;
  responsable: string | null;
  comprobante: string | null;
  factura_url: string | null;
  estado: string | null;
  origen?: string | null;
  created_at: string | null;
};

type CajaChicaFondo = {
  id: number;
  monto: number;
  estado: string | null;
};

type SoporteSubido = {
  ruta: string;
  url: string;
};

const ROLES_ADMIN = [
  "admin",
  "administrador",
  "presidente",
  "tesorero",
  "secretario",
  "supervisor",
  "super_admin",
  "super",
];

const MAX_ARCHIVO_BYTES = 10 * 1024 * 1024;
const EXTENSIONES_PERMITIDAS = ["pdf", "jpg", "jpeg", "png", "webp"];

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function hoyLocalISO() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const day = String(hoy.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fechaCorta(valor?: string | null) {
  if (!valor) return "-";
  const [year, month, day] = String(valor).split("T")[0].split("-");
  if (!year || !month || !day) return String(valor);
  return `${day}/${month}/${year}`;
}

export default function MobileCajaChicaPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");

  const [gastos, setGastos] = useState<CajaChica[]>([]);
  const [fondos, setFondos] = useState<CajaChicaFondo[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [fecha, setFecha] = useState(hoyLocalISO());
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [detalle, setDetalle] = useState("");
  const [comprobante, setComprobante] = useState("");
  const [soporte, setSoporte] = useState<File | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const usuario = localStorage.getItem("usuario_nombre") || "Usuario VAM";

    if (!id) {
      router.push("/movil/admin/login");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre || `Condominio ID ${id}`);
    setUsuarioNombre(usuario);

    cargarDatos(id);
  }, [router]);

  async function cargarDatos(id: string) {
    if (!id) return;

    setLoading(true);

    const [gastosResultado, fondosResultado] = await Promise.all([
      supabase
        .from("caja_chica")
        .select(
          "id, fecha, concepto, detalle_gasto, monto, responsable, comprobante, factura_url, estado, origen, created_at",
        )
        .eq("condominio_id", Number(id))
        .order("fecha", { ascending: false })
        .order("id", { ascending: false }),
      supabase
        .from("caja_chica_fondos")
        .select("id, monto, estado")
        .eq("condominio_id", Number(id))
        .order("fecha", { ascending: false })
        .order("id", { ascending: false }),
    ]);

    if (gastosResultado.error) {
      alert("Error cargando gastos: " + gastosResultado.error.message);
      setGastos([]);
    } else {
      setGastos((gastosResultado.data || []) as CajaChica[]);
    }

    if (fondosResultado.error) {
      alert("Error cargando fondos: " + fondosResultado.error.message);
      setFondos([]);
    } else {
      setFondos((fondosResultado.data || []) as CajaChicaFondo[]);
    }

    setLoading(false);
  }

  const totalFondos = useMemo(
    () =>
      fondos.reduce(
        (sum, fondo) =>
          String(fondo.estado || "").toLowerCase() === "anulado"
            ? sum
            : sum + Number(fondo.monto || 0),
        0,
      ),
    [fondos],
  );

  const totalGastos = useMemo(
    () => gastos.reduce((sum, gasto) => sum + Number(gasto.monto || 0), 0),
    [gastos],
  );

  const disponible = totalFondos - totalGastos;
  const ultimosGastos = gastos.slice(0, 8);

  function validarArchivo(archivo: File) {
    if (archivo.size > MAX_ARCHIVO_BYTES) {
      throw new Error("El archivo no puede superar 10 MB.");
    }

    const extension = archivo.name.split(".").pop()?.toLowerCase() || "";

    if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
      throw new Error("Formato no permitido. Use PDF, JPG, JPEG, PNG o WEBP.");
    }
  }

  async function subirSoporte(archivo: File): Promise<SoporteSubido> {
    validarArchivo(archivo);

    const extension = archivo.name.split(".").pop()?.toLowerCase() || "jpg";
    const nombreArchivo = `movil-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const ruta = `${condominioId}/${nombreArchivo}`;

    const { error } = await supabase.storage
      .from("facturas-caja-chica")
      .upload(ruta, archivo, {
        cacheControl: "3600",
        upsert: false,
        contentType: archivo.type || undefined,
      });

    if (error) {
      throw new Error("Error subiendo el soporte: " + error.message);
    }

    const { data } = supabase.storage
      .from("facturas-caja-chica")
      .getPublicUrl(ruta);

    return {
      ruta,
      url: data.publicUrl,
    };
  }

  async function eliminarSoporte(ruta?: string | null) {
    if (!ruta) return;
    await supabase.storage.from("facturas-caja-chica").remove([ruta]);
  }

  function limpiarFormulario() {
    setFecha(hoyLocalISO());
    setMonto("");
    setConcepto("");
    setDetalle("");
    setComprobante("");
    setSoporte(null);

    const foto = document.getElementById(
      "fotoCajaChica",
    ) as HTMLInputElement | null;
    const archivo = document.getElementById(
      "archivoCajaChica",
    ) as HTMLInputElement | null;

    if (foto) foto.value = "";
    if (archivo) archivo.value = "";
  }

  async function guardarGasto(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!condominioId) {
      alert("No hay un condominio activo.");
      return;
    }

    const montoNumero = Number(monto || 0);

    if (!fecha || !concepto.trim() || montoNumero <= 0) {
      alert("Debe completar fecha, concepto y un monto mayor que cero.");
      return;
    }

    if (montoNumero > disponible) {
      alert(
        `El gasto supera el disponible de caja chica.\n\nDisponible: RD$ ${dinero(
          disponible,
        )}\nMonto: RD$ ${dinero(montoNumero)}`,
      );
      return;
    }

    const confirmar = confirm(
      `¿Registrar este gasto?\n\n${concepto.trim()}\nMonto: RD$ ${dinero(
        montoNumero,
      )}\nDisponible actual: RD$ ${dinero(disponible)}`,
    );

    if (!confirmar) return;

    setGuardando(true);
    let soporteSubido: SoporteSubido | null = null;

    try {
      if (soporte) {
        soporteSubido = await subirSoporte(soporte);
      }

      const { data, error } = await supabase.rpc(
        "registrar_gasto_caja_chica",
        {
          p_condominio_id: Number(condominioId),
          p_fecha: fecha,
          p_concepto: concepto.trim(),
          p_detalle_gasto: detalle.trim() || null,
          p_monto: montoNumero,
          p_responsable: usuarioNombre || "Usuario VAM",
          p_comprobante: comprobante.trim() || null,
          p_factura_url: soporteSubido?.url || null,
          p_origen: "MOVIL",
        },
      );

      if (error) {
        await eliminarSoporte(soporteSubido?.ruta);
        throw new Error(error.message);
      }

      const nuevoDisponible =
        data?.disponible_actual !== undefined
          ? Number(data.disponible_actual)
          : disponible - montoNumero;

      alert(
        `Gasto registrado correctamente.\n\nMonto: RD$ ${dinero(
          montoNumero,
        )}\nDisponible: RD$ ${dinero(nuevoDisponible)}`,
      );

      limpiarFormulario();
      await cargarDatos(condominioId);
    } catch (error: any) {
      alert(error?.message || "No fue posible registrar el gasto.");
    } finally {
      setGuardando(false);
    }
  }

  async function cerrarSesion() {
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_admin_id");

    await supabase.auth.signOut();
    router.push("/movil/admin/login");
  }

  return (
    <RequireAuth allowedRoles={ROLES_ADMIN} redirectTo="/movil/admin/login">
      <main className="min-h-screen bg-slate-100 pb-24">
        <section className="rounded-b-3xl bg-emerald-700 p-5 text-white shadow">
          <Link href="/movil/admin" className="text-sm font-semibold opacity-90">
            ← Volver a Administración
          </Link>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide opacity-80">
                VAM Administración
              </p>
              <h1 className="text-2xl font-black">Caja Chica</h1>
              <p className="mt-1 text-sm opacity-90">
                {condominioNombre || "Condominio activo"}
              </p>
            </div>

            <div className="rounded-2xl bg-white/15 px-3 py-2 text-right">
              <p className="text-[11px] opacity-80">Disponible</p>
              <p className="text-lg font-black">RD$ {dinero(disponible)}</p>
            </div>
          </div>
        </section>

        <section className="space-y-4 p-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border bg-white p-3 shadow-sm">
              <p className="text-[11px] text-slate-500">Fondos</p>
              <p className="mt-1 text-sm font-black text-slate-900">
                RD$ {dinero(totalFondos)}
              </p>
            </div>

            <div className="rounded-2xl border bg-white p-3 shadow-sm">
              <p className="text-[11px] text-slate-500">Gastado</p>
              <p className="mt-1 text-sm font-black text-red-700">
                RD$ {dinero(totalGastos)}
              </p>
            </div>

            <div className="rounded-2xl border bg-white p-3 shadow-sm">
              <p className="text-[11px] text-slate-500">Disponible</p>
              <p
                className={`mt-1 text-sm font-black ${
                  disponible < 0 ? "text-red-700" : "text-emerald-700"
                }`}
              >
                RD$ {dinero(disponible)}
              </p>
            </div>
          </div>

          <form
            onSubmit={guardarGasto}
            className="space-y-4 rounded-3xl border bg-white p-4 shadow-sm"
          >
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Registrar gasto
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                El gasto aparecerá inmediatamente en la Caja Chica del sistema.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Fecha *
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Monto RD$ *
              </label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className={`w-full rounded-xl border px-4 py-3 text-lg font-black ${
                  Number(monto || 0) > disponible
                    ? "border-red-300 bg-red-50"
                    : ""
                }`}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Concepto *
              </label>
              <input
                type="text"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Ej. Compra de bombillos"
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Detalle
              </label>
              <textarea
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                rows={3}
                placeholder="Descripción breve del gasto"
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Comprobante / referencia
              </label>
              <input
                type="text"
                value={comprobante}
                onChange={(e) => setComprobante(e.target.value)}
                placeholder="Número de factura o recibo"
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div className="rounded-2xl border bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Responsable</p>
              <p className="font-bold text-slate-900">
                {usuarioNombre || "Usuario VAM"}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Se toma automáticamente del usuario que inició sesión.
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-bold text-slate-700">
                Soporte del gasto
              </p>

              <div className="grid grid-cols-2 gap-2">
                <label className="cursor-pointer rounded-xl bg-blue-700 px-3 py-3 text-center text-sm font-bold text-white">
                  📷 Tomar foto
                  <input
                    id="fotoCajaChica"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => setSoporte(e.target.files?.[0] || null)}
                  />
                </label>

                <label className="cursor-pointer rounded-xl bg-slate-800 px-3 py-3 text-center text-sm font-bold text-white">
                  📎 Seleccionar
                  <input
                    id="archivoCajaChica"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => setSoporte(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {soporte && (
                <div className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                  Archivo seleccionado: {soporte.name}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={guardando || disponible <= 0}
              className="w-full rounded-xl bg-emerald-700 px-4 py-4 text-base font-black text-white disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar gasto"}
            </button>

            {disponible <= 0 && (
              <p className="text-center text-xs font-bold text-red-600">
                No hay fondos disponibles para registrar nuevos gastos.
              </p>
            )}
          </form>

          <div className="rounded-3xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Últimos movimientos
                </h2>
                <p className="text-sm text-slate-500">
                  Gastos recientes del condominio.
                </p>
              </div>

              <button
                type="button"
                onClick={() => cargarDatos(condominioId)}
                disabled={loading}
                className="rounded-xl border px-3 py-2 text-xs font-bold text-slate-700"
              >
                {loading ? "..." : "Actualizar"}
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {loading ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Cargando movimientos...
                </p>
              ) : ultimosGastos.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No hay gastos registrados.
                </p>
              ) : (
                ultimosGastos.map((gasto) => (
                  <div
                    key={gasto.id}
                    className="rounded-2xl border bg-slate-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900">
                          {gasto.concepto}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {fechaCorta(gasto.fecha)}
                          {gasto.responsable
                            ? ` · ${gasto.responsable}`
                            : ""}
                        </p>

                        {gasto.detalle_gasto && (
                          <p className="mt-1 text-xs text-slate-600">
                            {gasto.detalle_gasto}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap gap-2">
                          {gasto.factura_url && (
                            <a
                              href={gasto.factura_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-bold text-white"
                            >
                              Ver soporte
                            </a>
                          )}

                          {gasto.origen && (
                            <span className="rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-slate-500">
                              {gasto.origen}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="whitespace-nowrap font-black text-red-700">
                        RD$ {dinero(gasto.monto)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <div className="max-w-md mx-auto grid grid-cols-4 text-center">
            <Link
              href="/movil/admin"
              className="py-3 text-xs font-bold text-slate-700"
            >
              <div className="text-xl">🏠</div>
              Inicio
            </Link>

            <Link
              href="/movil/admin/caja-chica"
              className="py-3 text-xs font-bold text-emerald-700"
            >
              <div className="text-xl">💵</div>
              Caja Chica
            </Link>

            <button
              type="button"
              onClick={() => cargarDatos(condominioId)}
              className="py-3 text-xs font-bold text-slate-700"
            >
              <div className="text-xl">🔄</div>
              Actualizar
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
    </RequireAuth>
  );
}
