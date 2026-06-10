"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

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

export default function MovilPagarPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(
    null
  );

  const [concepto, setConcepto] = useState("Pago de mantenimiento");
  const [monto, setMonto] = useState("");
  const [fechaPago, setFechaPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("Transferencia");
  const [banco, setBanco] = useState("");
  const [referencia, setReferencia] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem("propietario_actual");

    if (!data) {
      router.push("/movil-login");
      return;
    }

    const prop = JSON.parse(data);
    setPropietario(prop);

    const hoy = new Date().toISOString().slice(0, 10);
    setFechaPago(hoy);
  }, [router]);

  async function subirComprobante() {
    if (!comprobante) return "";

    const extension = comprobante.name.split(".").pop();
    const nombreArchivo = `pago-${Date.now()}.${extension}`;

    const ruta = `${propietario?.condominio_id}/${propietario?.unidad_id}/${nombreArchivo}`;

    const { error } = await supabase.storage
      .from("comprobantes-pagos")
      .upload(ruta, comprobante, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from("comprobantes-pagos")
      .getPublicUrl(ruta);

    return data.publicUrl;
  }

  async function registrarPago(e: React.FormEvent) {
    e.preventDefault();

    if (!propietario) return;

    setMensaje("");
    setExito(false);

    if (!monto || Number(monto) <= 0) {
      setMensaje("Debe indicar un monto válido.");
      return;
    }

    if (!fechaPago) {
      setMensaje("Debe indicar la fecha del pago.");
      return;
    }

    if (!referencia.trim()) {
      setMensaje("Debe indicar el número de referencia.");
      return;
    }

    if (!comprobante) {
      setMensaje("Debe subir el comprobante del pago.");
      return;
    }

    try {
      setLoading(true);

      const comprobanteUrl = await subirComprobante();

      const { error } = await supabase.from("pagos_movil").insert({
        condominio_id: propietario.condominio_id,
        condominio: propietario.condominio_nombre,
        unidad_id: propietario.unidad_id,
        no_apartamento: propietario.no_apartamento,
        propietario_id: propietario.propietario_id,
        nombre_propietario: propietario.nombre_propietario,
        cedula: propietario.cedula,
        telefono: propietario.telefono,

        concepto,
        monto: Number(monto),
        fecha_pago: fechaPago,
        metodo_pago: metodoPago,
        banco,
        referencia,
        comprobante_url: comprobanteUrl,

        estado: "Pendiente de validación",
      });

      if (error) {
        setMensaje(error.message);
        setLoading(false);
        return;
      }

      setExito(true);
      setMensaje("Pago enviado correctamente. Quedará pendiente de validación.");

      setMonto("");
      setBanco("");
      setReferencia("");
      setComprobante(null);
      setConcepto("Pago de mantenimiento");
      setMetodoPago("Transferencia");

      const hoy = new Date().toISOString().slice(0, 10);
      setFechaPago(hoy);
    } catch (error: any) {
      setMensaje(error.message || "Error al registrar el pago.");
    } finally {
      setLoading(false);
    }
  }

  if (!propietario) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-slate-950 text-white rounded-3xl p-6 shadow">
          <Link href="/movil" className="text-sm text-amber-300">
            ← Volver
          </Link>

          <h1 className="text-2xl font-bold mt-3">Realizar Pago</h1>

          <p className="text-slate-300 text-sm mt-1">
            {propietario.condominio_nombre}
          </p>

          <p className="text-slate-300 text-sm">
            Apto. {propietario.no_apartamento}
          </p>
        </div>

        <div className="bg-white rounded-3xl border shadow-sm p-5">
          <div className="mb-4">
            <p className="text-sm text-slate-500">Propietario</p>
            <h2 className="font-bold text-slate-900">
              {propietario.nombre_propietario}
            </h2>
          </div>

          <form onSubmit={registrarPago} className="space-y-4">
            <div>
              <label className="text-sm font-semibold">Concepto</label>

              <select
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="w-full mt-1 border rounded-xl px-4 py-3 bg-white"
              >
                <option>Pago de mantenimiento</option>
                <option>Pago extraordinario</option>
                <option>Pago de mora</option>
                <option>Pago de reserva área social</option>
                <option>Otro pago</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold">Monto pagado</label>

              <input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="Ejemplo: 4500"
                className="w-full mt-1 border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Fecha del pago</label>

              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="w-full mt-1 border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Método de pago</label>

              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full mt-1 border rounded-xl px-4 py-3 bg-white"
              >
                <option>Transferencia</option>
                <option>Depósito</option>
                <option>Efectivo</option>
                <option>Cheque</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold">Banco</label>

              <input
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                placeholder="Ejemplo: Banco Popular"
                className="w-full mt-1 border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">
                Número de referencia
              </label>

              <input
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Referencia del depósito o transferencia"
                className="w-full mt-1 border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">
                Comprobante del pago
              </label>

              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) =>
                  setComprobante(e.target.files ? e.target.files[0] : null)
                }
                className="w-full mt-1 border rounded-xl px-4 py-3 bg-white"
              />

              <p className="text-xs text-slate-500 mt-1">
                Puede subir una imagen o PDF del comprobante.
              </p>
            </div>

            {mensaje && (
              <div
                className={`rounded-xl p-3 text-sm ${
                  exito
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}
              >
                {mensaje}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full bg-green-700 hover:bg-green-800 disabled:bg-slate-400 text-white py-4 rounded-2xl font-bold text-lg"
            >
              {loading ? "Enviando pago..." : "Enviar pago"}
            </button>
          </form>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          <p className="font-bold mb-1">Importante</p>
          <p>
            Este pago quedará pendiente hasta que la administración valide el
            comprobante.
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 pt-4">
          VAM Administración de Condominios
        </p>
      </div>
    </main>
  );
}