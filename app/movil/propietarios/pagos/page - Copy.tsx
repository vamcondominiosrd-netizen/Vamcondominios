"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { ArrowLeft, Upload, CheckCircle } from "lucide-react";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string;
  telefono?: string;
  correo?: string;
};

type BancoNombre = {
  id: number;
  nombre_banco: string;
};

export default function PagosPropietariosPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(null);
  const [bancos, setBancos] = useState<BancoNombre[]>([]);

  const [concepto, setConcepto] = useState("Pago de mantenimiento");
  const [monto, setMonto] = useState("");
  const [fechaPago, setFechaPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("Transferencia");
  const [banco, setBanco] = useState("");
  const [bancoOtro, setBancoOtro] = useState("");
  const [referencia, setReferencia] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("propietario_actual");

    if (!raw) {
      router.push("/movil/propietarios/login");
      return;
    }

    setPropietario(JSON.parse(raw));
    setFechaPago(new Date().toISOString().slice(0, 10));
    cargarBancos();
  }, [router]);

  async function cargarBancos() {
    const { data, error } = await supabase
      .from("banco_nombre")
      .select("id, nombre_banco")
      .eq("estado", "activo")
      .order("orden", { ascending: true })
      .order("nombre_banco", { ascending: true });

    if (error) {
      setMensaje("Error cargando bancos: " + error.message);
      return;
    }

    setBancos(data || []);
  }

  async function subirComprobante() {
    if (!comprobante || !propietario) return "";

    const extension = comprobante.name.split(".").pop();
    const nombreArchivo = `pago-${Date.now()}.${extension}`;
    const ruta = `${propietario.condominio_id}/${propietario.unidad_id}/${nombreArchivo}`;

    const { error } = await supabase.storage
      .from("comprobantes-pagos")
      .upload(ruta, comprobante, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error("Error subiendo comprobante: " + error.message);
    }

    const { data } = supabase.storage
      .from("comprobantes-pagos")
      .getPublicUrl(ruta);

    return data.publicUrl;
  }

  async function registrarPago() {
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

    if (metodoPago !== "Efectivo" && !banco) {
      setMensaje("Debe seleccionar el banco.");
      return;
    }

    if (banco === "Otro banco" && !bancoOtro.trim()) {
      setMensaje("Debe escribir el nombre del banco.");
      return;
    }

    if (!referencia.trim() && metodoPago !== "Efectivo") {
      setMensaje("Debe indicar la referencia o número de transacción.");
      return;
    }

    if (!comprobante) {
      setMensaje("Debe subir el comprobante del pago.");
      return;
    }

    try {
      setLoading(true);

      const comprobanteUrl = await subirComprobante();

      const bancoFinal =
        metodoPago === "Efectivo"
          ? ""
          : banco === "Otro banco"
          ? bancoOtro.trim()
          : banco;

      const { error } = await supabase.from("pagos_movil").insert({
        condominio_id: propietario.condominio_id,
        condominio: propietario.condominio_nombre,
        unidad_id: propietario.unidad_id,
        no_apartamento: propietario.no_apartamento,
        propietario_id: propietario.propietario_id,
        nombre_propietario: propietario.nombre_propietario,
        cedula: propietario.cedula,
        telefono: propietario.telefono || "",

        concepto,
        monto: Number(monto),
        fecha_pago: fechaPago,
        metodo_pago: metodoPago,
        banco: bancoFinal,
        referencia: metodoPago === "Efectivo" ? "" : referencia.trim(),
        comprobante_url: comprobanteUrl,

        estado: "Pendiente de validación",
      });

      if (error) {
        setMensaje("Error registrando pago: " + error.message);
        return;
      }

      setExito(true);
      setMensaje("Pago enviado correctamente. Quedará pendiente de validación.");

      setConcepto("Pago de mantenimiento");
      setMonto("");
      setFechaPago(new Date().toISOString().slice(0, 10));
      setMetodoPago("Transferencia");
      setBanco("");
      setBancoOtro("");
      setReferencia("");
      setComprobante(null);
    } catch (error: any) {
      setMensaje(error.message || "Error al registrar el pago.");
    } finally {
      setLoading(false);
    }
  }

  if (!propietario) {
    return <div className="p-6 text-center text-slate-500">Cargando...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <header className="bg-slate-950 text-white rounded-3xl p-5 shadow">
        <button
          onClick={() => router.push("/movil/propietarios/dashboard")}
          className="flex items-center gap-2 text-sm text-slate-300 mb-4"
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <p className="text-sm text-slate-300">Registrar pago</p>
        <h1 className="text-xl font-bold">{propietario.no_apartamento}</h1>
        <p className="text-xs text-slate-300">{propietario.condominio_nombre}</p>
      </header>

      {mensaje && (
        <div
          className={`rounded-2xl p-3 text-sm ${
            exito
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {exito && <CheckCircle className="inline mr-1" size={16} />}
          {mensaje}
        </div>
      )}

      <section className="bg-white rounded-3xl border shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Concepto
          </label>
          <select
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            className="w-full border rounded-2xl px-4 py-3 bg-white"
          >
            <option>Pago de mantenimiento</option>
            <option>Pago extraordinario</option>
            <option>Pago de mora</option>
            <option>Pago de reserva área social</option>
            <option>Otro pago</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Monto pagado
          </label>
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Ejemplo: 4500"
            className="w-full border rounded-2xl px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Fecha del pago
          </label>
          <input
            type="date"
            value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)}
            className="w-full border rounded-2xl px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Método de pago
          </label>
          <select
            value={metodoPago}
            onChange={(e) => {
              setMetodoPago(e.target.value);
              if (e.target.value === "Efectivo") {
                setBanco("");
                setBancoOtro("");
                setReferencia("");
              }
            }}
            className="w-full border rounded-2xl px-4 py-3 bg-white"
          >
            <option>Transferencia</option>
            <option>Depósito</option>
            <option>Efectivo</option>
            <option>Cheque</option>
            <option>Link de Pago</option>
          </select>
        </div>

        {metodoPago !== "Efectivo" && (
          <>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Banco
              </label>
              <select
                value={banco}
                onChange={(e) => {
                  setBanco(e.target.value);
                  if (e.target.value !== "Otro banco") setBancoOtro("");
                }}
                className="w-full border rounded-2xl px-4 py-3 bg-white"
              >
                <option value="">Seleccione banco</option>

                {bancos.map((b) => (
                  <option key={b.id} value={b.nombre_banco}>
                    {b.nombre_banco}
                  </option>
                ))}

                <option value="Otro banco">Otro banco</option>
              </select>
            </div>

            {banco === "Otro banco" && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Especifique banco
                </label>
                <input
                  type="text"
                  value={bancoOtro}
                  onChange={(e) => setBancoOtro(e.target.value)}
                  placeholder="Escriba el banco"
                  className="w-full border rounded-2xl px-4 py-3"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Referencia / No. transacción
              </label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Digite la referencia"
                className="w-full border rounded-2xl px-4 py-3"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Comprobante del pago
          </label>

          <label className="border-2 border-dashed rounded-3xl p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50">
            <Upload className="text-blue-700 mb-2" size={28} />
            <span className="text-sm font-bold text-slate-700">
              Subir comprobante
            </span>
            <span className="text-xs text-slate-500 mt-1">
              Imagen o PDF del pago
            </span>

            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) =>
                setComprobante(e.target.files ? e.target.files[0] : null)
              }
              className="hidden"
            />
          </label>

          {comprobante && (
            <p className="text-xs text-slate-600 mt-2">
              Archivo seleccionado: <b>{comprobante.name}</b>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={registrarPago}
          disabled={loading}
          className="w-full bg-green-700 hover:bg-green-800 disabled:bg-slate-400 text-white py-4 rounded-2xl font-bold text-lg"
        >
          {loading ? "Enviando pago..." : "Enviar pago"}
        </button>
      </section>
    </div>
  );
}