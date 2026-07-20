"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type CajaChica = {
  id: number;
  condominio_id: number | null;
  condominio: string;
  fecha: string;
  concepto: string;
  detalle_gasto: string | null;
  monto: number;
  responsable: string | null;
  comprobante: string | null;
  factura_url: string | null;
  estado: string | null;
  created_at: string;
};

type CajaChicaFondo = {
  id: number;
  condominio_id: number | null;
  numero_fondo: number | null;
  condominio: string;
  fecha: string;
  tipo: string;
  monto: number;
  descripcion: string | null;
  responsable: string | null;
  created_at: string | null;
};

function fechaHoy() {
  return new Date().toISOString().split("T")[0];
}

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function MobileCajaChicaPage() {
  const router = useRouter();

  const [gastos, setGastos] = useState<CajaChica[]>([]);
  const [fondos, setFondos] = useState<CajaChicaFondo[]>([]);

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardandoFondo, setGuardandoFondo] = useState(false);

  const [condominio, setCondominio] = useState("");
  const [condominioId, setCondominioId] = useState("");

  const [mostrarFondo, setMostrarFondo] = useState(false);
  const [mostrarGasto, setMostrarGasto] = useState(false);
  const [buscar, setBuscar] = useState("");

  const [fecha, setFecha] = useState(fechaHoy());
  const [concepto, setConcepto] = useState("");
  const [detalleGasto, setDetalleGasto] = useState("");
  const [monto, setMonto] = useState("");
  const [responsable, setResponsable] = useState("");
  const [comprobante, setComprobante] = useState("");
  const [facturaArchivo, setFacturaArchivo] = useState<File | null>(null);

  const [fechaFondo, setFechaFondo] = useState(fechaHoy());
  const [montoFondo, setMontoFondo] = useState("");
  const [responsableFondo, setResponsableFondo] = useState("");
  const [descripcionFondo, setDescripcionFondo] = useState(
    "Fondo inicial de caja chica"
  );

  useEffect(() => {
    const idGuardado = localStorage.getItem("condominio_id") || "";
    const nombreGuardado = localStorage.getItem("condominio_nombre") || "";

    if (!idGuardado) {
      router.push("/mobile");
      return;
    }

    const nombreFinal = nombreGuardado || `Condominio ID ${idGuardado}`;

    setCondominioId(idGuardado);
    setCondominio(nombreFinal);
    setFecha(fechaHoy());
    setFechaFondo(fechaHoy());

    cargarInicial(idGuardado);
  }, [router]);

  async function cargarInicial(idCondominio: string) {
    setLoading(true);
    await Promise.all([cargarGastos(idCondominio), cargarFondos(idCondominio)]);
    setLoading(false);
  }

  async function cargarGastos(idCondominio: string) {
    if (!idCondominio) return;

    const { data, error } = await supabase
      .from("caja_chica")
      .select(
        "id, condominio_id, condominio, fecha, concepto, detalle_gasto, monto, responsable, comprobante, factura_url, estado, created_at"
      )
      .eq("condominio_id", Number(idCondominio))
      .order("fecha", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      alert("Error cargando caja chica: " + error.message);
      setGastos([]);
      return;
    }

    setGastos((data as CajaChica[]) || []);
  }

  async function cargarFondos(idCondominio: string) {
    if (!idCondominio) return;

    const { data, error } = await supabase
      .from("caja_chica_fondos")
      .select(
        "id, condominio_id, numero_fondo, condominio, fecha, tipo, monto, descripcion, responsable, created_at"
      )
      .eq("condominio_id", Number(idCondominio))
      .order("fecha", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      alert("Error cargando fondos de caja chica: " + error.message);
      setFondos([]);
      return;
    }

    setFondos((data as CajaChicaFondo[]) || []);
  }

  async function obtenerNumeroFondo() {
    const { data, error } = await supabase.rpc(
      "obtener_proximo_numero_fondo_caja_chica",
      {
        p_condominio_id: Number(condominioId),
      }
    );

    if (error) {
      throw new Error("Error generando número de fondo: " + error.message);
    }

    return Number(data || 1);
  }

  async function subirFactura() {
    if (!facturaArchivo) return "";

    const extension = facturaArchivo.name.split(".").pop();
    const nombreArchivo = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

    const rutaArchivo = `${condominioId || "general"}/${nombreArchivo}`;

    const { error: uploadError } = await supabase.storage
      .from("facturas-caja-chica")
      .upload(rutaArchivo, facturaArchivo);

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from("facturas-caja-chica")
      .getPublicUrl(rutaArchivo);

    return data.publicUrl;
  }

  async function guardarFondo(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominio || !fechaFondo || !montoFondo) {
      alert("Debe completar condominio, fecha y monto del fondo.");
      return;
    }

    const montoNumero = Number(montoFondo || 0);

    if (montoNumero <= 0) {
      alert("El monto del fondo debe ser mayor que cero.");
      return;
    }

    try {
      setGuardandoFondo(true);

      const numeroFondo = await obtenerNumeroFondo();

      const { error } = await supabase.from("caja_chica_fondos").insert([
        {
          condominio_id: Number(condominioId),
          numero_fondo: numeroFondo,
          condominio,
          fecha: fechaFondo,
          tipo: "fondo_inicial",
          monto: montoNumero,
          descripcion: descripcionFondo || "Fondo inicial de caja chica",
          responsable: responsableFondo,
        },
      ]);

      setGuardandoFondo(false);

      if (error) {
        alert("Error guardando fondo inicial: " + error.message);
        return;
      }

      alert(
        `Fondo registrado correctamente. No. ${String(numeroFondo).padStart(
          5,
          "0"
        )}`
      );

      setFechaFondo(fechaHoy());
      setMontoFondo("");
      setResponsableFondo("");
      setDescripcionFondo("Fondo inicial de caja chica");
      setMostrarFondo(false);

      cargarFondos(condominioId);
    } catch (err: any) {
      setGuardandoFondo(false);
      alert(err.message || "Error guardando fondo inicial.");
    }
  }

  async function guardarGasto(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominio || !fecha || !concepto || !monto) {
      alert("Debe completar condominio, fecha, concepto y monto.");
      return;
    }

    const montoNumero = Number(monto || 0);

    if (montoNumero <= 0) {
      alert("El monto del gasto debe ser mayor que cero.");
      return;
    }

    const totalFondos = fondos.reduce((sum, f) => sum + Number(f.monto || 0), 0);
    const totalGastos = gastos.reduce((sum, g) => sum + Number(g.monto || 0), 0);
    const disponible = totalFondos - totalGastos;

    if (montoNumero > disponible) {
      const continuar = confirm(
        `El gasto supera el disponible de caja chica.\n\nDisponible: RD$ ${dinero(
          disponible
        )}\nGasto: RD$ ${dinero(montoNumero)}\n\n¿Desea continuar?`
      );

      if (!continuar) return;
    }

    try {
      setGuardando(true);

      let facturaUrl = "";

      if (facturaArchivo) {
        facturaUrl = await subirFactura();
      }

      const { error } = await supabase.from("caja_chica").insert([
        {
          condominio_id: Number(condominioId),
          condominio,
          fecha,
          concepto,
          detalle_gasto: detalleGasto,
          monto: montoNumero,
          responsable,
          comprobante,
          factura_url: facturaUrl,
          estado: "registrado",
        },
      ]);

      setGuardando(false);

      if (error) {
        alert("Error guardando gasto: " + error.message);
        return;
      }

      alert("Desembolso de caja chica registrado correctamente.");

      setFecha(fechaHoy());
      setConcepto("");
      setDetalleGasto("");
      setMonto("");
      setResponsable("");
      setComprobante("");
      setFacturaArchivo(null);
      setMostrarGasto(false);

      const inputFile = document.getElementById(
        "facturaCajaChicaMobile"
      ) as HTMLInputElement | null;

      if (inputFile) inputFile.value = "";

      cargarGastos(condominioId);
    } catch (err: any) {
      setGuardando(false);
      alert("Error subiendo factura: " + err.message);
    }
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

  const gastosFiltrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();

    if (!q) return gastos;

    return gastos.filter((g) => {
      const texto = `${g.id || ""} ${g.fecha || ""} ${g.concepto || ""} ${
        g.detalle_gasto || ""
      } ${g.responsable || ""} ${g.comprobante || ""} ${
        g.estado || ""
      }`.toLowerCase();

      return texto.includes(q);
    });
  }, [gastos, buscar]);

  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.monto || 0), 0);
  const totalFondos = fondos.reduce((sum, f) => sum + Number(f.monto || 0), 0);
  const disponibleCajaChica = totalFondos - totalGastos;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-4">
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          Cargando caja chica...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <section className="bg-blue-800 text-white rounded-b-3xl p-5 shadow">
        <Link href="/mobile/admin" className="text-sm opacity-90">
          ← Volver al menú principal
        </Link>

        <h1 className="text-2xl font-black mt-3">Caja Chica</h1>

        <p className="text-sm opacity-90 mt-1">
          {condominio || "Condominio no seleccionado"}
        </p>

        <p className="text-sm opacity-90 mt-2">
          Control de fondos iniciales y desembolsos menores desde el celular.
        </p>
      </section>

      <section className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Fondos</p>
            <h2 className="text-xl font-black text-green-700">
              RD$ {dinero(totalFondos)}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Gastado</p>
            <h2 className="text-xl font-black text-red-700">
              RD$ {dinero(totalGastos)}
            </h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <p className="text-xs text-slate-500">Disponible caja chica</p>
          <h2
            className={`text-3xl font-black ${
              disponibleCajaChica >= 0 ? "text-blue-700" : "text-red-700"
            }`}
          >
            RD$ {dinero(disponibleCajaChica)}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setMostrarFondo(!mostrarFondo);
              setMostrarGasto(false);
            }}
            className="bg-green-700 text-white py-3 rounded-xl font-bold"
          >
            {mostrarFondo ? "Cerrar fondo" : "Nuevo fondo"}
          </button>

          <button
            onClick={() => {
              setMostrarGasto(!mostrarGasto);
              setMostrarFondo(false);
            }}
            className="bg-blue-700 text-white py-3 rounded-xl font-bold"
          >
            {mostrarGasto ? "Cerrar gasto" : "Nuevo gasto"}
          </button>
        </div>

        <button
          onClick={() => cargarInicial(condominioId)}
          className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold"
        >
          Actualizar caja chica
        </button>

        {mostrarFondo && (
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <h2 className="text-lg font-black text-slate-900 mb-4">
              Registrar fondo inicial
            </h2>

            <form onSubmit={guardarFondo} className="space-y-3">
              <div className="bg-slate-50 border rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500">Condominio</p>
                <p className="font-bold">{condominio}</p>
              </div>

              <input
                type="date"
                value={fechaFondo}
                onChange={(e) => setFechaFondo(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              />

              <input
                type="number"
                step="0.01"
                value={montoFondo}
                onChange={(e) => setMontoFondo(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Monto fondo inicial RD$"
              />

              <input
                type="text"
                value={responsableFondo}
                onChange={(e) => setResponsableFondo(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Responsable del fondo"
              />

              <textarea
                value={descripcionFondo}
                onChange={(e) => setDescripcionFondo(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                rows={3}
                placeholder="Descripción"
              />

              <button
                type="submit"
                disabled={guardandoFondo}
                className="w-full bg-green-700 text-white py-3 rounded-xl font-bold disabled:opacity-50"
              >
                {guardandoFondo ? "Guardando..." : "Guardar fondo"}
              </button>
            </form>
          </div>
        )}

        {mostrarGasto && (
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <h2 className="text-lg font-black text-slate-900 mb-4">
              Registrar desembolso
            </h2>

            <form onSubmit={guardarGasto} className="space-y-3">
              <div className="bg-slate-50 border rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500">Condominio</p>
                <p className="font-bold">{condominio}</p>
              </div>

              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              />

              <input
                type="number"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Monto RD$"
              />

              <input
                type="text"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Concepto"
              />

              <input
                type="text"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Responsable"
              />

              <input
                type="text"
                value={comprobante}
                onChange={(e) => setComprobante(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="No. factura o comprobante"
              />

              <input
                id="facturaCajaChicaMobile"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setFacturaArchivo(e.target.files?.[0] || null)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              />

              {facturaArchivo && (
                <p className="text-xs text-slate-500">
                  Archivo seleccionado: {facturaArchivo.name}
                </p>
              )}

              <textarea
                value={detalleGasto}
                onChange={(e) => setDetalleGasto(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                rows={3}
                placeholder="Detalle del gasto realizado"
              />

              <button
                type="submit"
                disabled={guardando}
                className="w-full bg-blue-700 text-white py-3 rounded-xl font-bold disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar desembolso"}
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <label className="block text-sm font-semibold mb-1">Buscar</label>

          <input
            type="text"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full"
            placeholder="Concepto, responsable, comprobante o estado..."
          />
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <h2 className="text-lg font-black text-slate-900">
            Fondos registrados
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Fondos iniciales disponibles para caja chica.
          </p>
        </div>

        <div className="space-y-3">
          {fondos.map((f) => (
            <div
              key={f.id}
              className="bg-white rounded-2xl border shadow-sm p-4"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-900">
                    Fondo No. {String(f.numero_fondo || f.id).padStart(5, "0")}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1">
                    Fecha: {f.fecha || "-"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-500">Monto</p>
                  <p className="text-lg font-black text-green-700">
                    RD$ {dinero(f.monto)}
                  </p>
                </div>
              </div>

              <div className="mt-3 text-sm">
                <p>
                  <span className="text-slate-500">Responsable:</span>{" "}
                  <span className="font-bold">{f.responsable || "-"}</span>
                </p>

                <p className="mt-1">
                  <span className="text-slate-500">Descripción:</span>{" "}
                  <span className="font-bold">{f.descripcion || "-"}</span>
                </p>
              </div>

              <Link
                href={`/caja-chica/fondos/reporte/${f.id}`}
                className="block mt-4 bg-purple-700 text-white py-3 rounded-xl text-center text-sm font-bold"
              >
                Reporte para firma
              </Link>
            </div>
          ))}

          {fondos.length === 0 && (
            <div className="bg-white rounded-2xl border shadow-sm p-6 text-center text-slate-500">
              No hay fondos iniciales registrados.
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <h2 className="text-lg font-black text-slate-900">
            Desembolsos registrados
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Gastos menores realizados con caja chica.
          </p>
        </div>

        <div className="space-y-3">
          {gastosFiltrados.map((g) => (
            <div
              key={g.id}
              className="bg-white rounded-2xl border shadow-sm p-4"
            >
              <div className="flex justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-black text-slate-900">
                    Desembolso #{g.id}
                  </h3>

                  <p className="font-bold text-slate-700 mt-2">
                    {g.concepto || "-"}
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    Fecha: {g.fecha || "-"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-500">Monto</p>
                  <p className="text-lg font-black text-red-700">
                    RD$ {dinero(g.monto)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Responsable</p>
                  <p className="font-bold">{g.responsable || "-"}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Comprobante</p>
                  <p className="font-bold">{g.comprobante || "-"}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Estado</p>
                  <p className="font-bold text-green-700">
                    {g.estado || "registrado"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Registro</p>
                  <p className="font-bold">
                    {g.created_at ? g.created_at.slice(0, 10) : "-"}
                  </p>
                </div>
              </div>

              {g.detalle_gasto && (
                <div className="mt-4 bg-slate-50 border rounded-xl p-3">
                  <p className="text-xs text-slate-500">Detalle</p>
                  <p className="text-sm mt-1">{g.detalle_gasto}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-4">
                {g.factura_url ? (
                  <a
                    href={g.factura_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-900 text-white py-3 rounded-xl text-center text-sm font-bold"
                  >
                    Ver factura
                  </a>
                ) : (
                  <div className="bg-slate-100 text-slate-400 py-3 rounded-xl text-center text-sm font-bold">
                    Sin factura
                  </div>
                )}

               <Link
  href={`/recibos/caja-chica/${g.id}`}
  className="bg-purple-700 text-white py-3 rounded-xl text-center text-sm font-bold"
>
  Recibo
</Link>
              </div>
            </div>
          ))}

          {gastosFiltrados.length === 0 && (
            <div className="bg-white rounded-2xl border shadow-sm p-6 text-center text-slate-500">
              No hay desembolsos registrados para este condominio.
            </div>
          )}
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-5 text-center">
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
            className="py-3 text-xs font-bold text-slate-700"
          >
            <div className="text-xl">💳</div>
            Pagos
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