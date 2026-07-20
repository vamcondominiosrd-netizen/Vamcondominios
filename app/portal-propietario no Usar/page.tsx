"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Propietario = {
  id: number;
  condominio: string;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string;
  telefono: string;
  correo: string;
  cuenta_banco: string;
};

type Condominio = {
  id: number;
  nombre: string;
  cuota_mensual: number;
};

export default function PortalPropietarioPage() {
  const [condominio, setCondominio] = useState("");
  const [noApartamento, setNoApartamento] = useState("");
  const [cedula, setCedula] = useState("");

  const [propietario, setPropietario] = useState<Propietario | null>(null);
  const [condominios, setCondominios] = useState<Condominio[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardandoPago, setGuardandoPago] = useState(false);

  const [fechaPago, setFechaPago] = useState("");
  const [mesPagado, setMesPagado] = useState("");
  const [montoPagado, setMontoPagado] = useState("");
  const [bancoOrigen, setBancoOrigen] = useState("");
  const [noReferencia, setNoReferencia] = useState("");
  const [comentario, setComentario] = useState("");
  const [comprobanteArchivo, setComprobanteArchivo] =
    useState<File | null>(null);

  useEffect(() => {
    cargarCondominios();
  }, []);

  async function cargarCondominios() {
    const { data, error } = await supabase
      .from("condominios")
      .select("id, nombre, cuota_mensual")
      .eq("estado", "activo")
      .order("nombre");

    if (error) {
      alert("Error cargando condominios: " + error.message);
      return;
    }

    setCondominios(data || []);
  }

  async function consultarPropietario(e: React.FormEvent) {
    e.preventDefault();

    if (!condominio || !noApartamento || !cedula) {
      alert("Debe completar condominio, apartamento y cédula.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("propietarios_apartamentos")
      .select(
        "id, condominio, no_apartamento, nombre_propietario, cedula, telefono, correo, cuenta_banco"
      )
      .eq("condominio", condominio)
      .ilike("no_apartamento", noApartamento)
      .eq("cedula", cedula)
      .maybeSingle();

    setLoading(false);

    if (error) {
      alert("Error consultando propietario: " + error.message);
      return;
    }

    if (!data) {
      alert("No se encontró propietario con los datos ingresados.");
      setPropietario(null);
      return;
    }

    setPropietario(data);
  }

  async function subirComprobante() {
    if (!comprobanteArchivo) return "";

    const extension = comprobanteArchivo.name.split(".").pop();

    const nombreArchivo = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

    const rutaArchivo = `${propietario?.condominio}/${propietario?.no_apartamento}/${nombreArchivo}`;

    const { error } = await supabase.storage
      .from("comprobantes-propietarios")
      .upload(rutaArchivo, comprobanteArchivo);

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from("comprobantes-propietarios")
      .getPublicUrl(rutaArchivo);

    return data.publicUrl;
  }

  async function reportarPago(e: React.FormEvent) {
    e.preventDefault();

    if (
      !fechaPago ||
      !mesPagado ||
      !montoPagado ||
      !bancoOrigen ||
      !noReferencia
    ) {
      alert(
        "Debe completar fecha, mes pagado, monto, banco y referencia."
      );
      return;
    }

    try {
      setGuardandoPago(true);

      let comprobanteUrl = "";

      if (comprobanteArchivo) {
        comprobanteUrl = await subirComprobante();
      }

      const { error } = await supabase
        .from("pagos_propietarios")
        .insert([
          {
            propietario_id: propietario?.id,
            condominio: propietario?.condominio,
            no_apartamento: propietario?.no_apartamento,
            nombre_propietario: propietario?.nombre_propietario,
            cedula: propietario?.cedula,
            fecha_pago: fechaPago,
            mes_pagado: mesPagado,
            monto_pagado: Number(montoPagado),
            banco_origen: bancoOrigen,
            no_referencia: noReferencia,
            comentario,
            comprobante_url: comprobanteUrl,
            estado: "Pendiente validación",
          },
        ]);

      setGuardandoPago(false);

      if (error) {
        alert("Error registrando pago: " + error.message);
        return;
      }

      alert(
        "Pago reportado correctamente. Será validado por la administración."
      );

      setFechaPago("");
      setMesPagado("");
      setMontoPagado("");
      setBancoOrigen("");
      setNoReferencia("");
      setComentario("");
      setComprobanteArchivo(null);

      const inputFile = document.getElementById(
        "comprobantePago"
      ) as HTMLInputElement | null;

      if (inputFile) inputFile.value = "";
    } catch (err: any) {
      setGuardandoPago(false);
      alert("Error subiendo comprobante: " + err.message);
    }
  }

  function cuotaMensual(nombreCondominio: string) {
    const info = condominios.find((c) => c.nombre === nombreCondominio);
    return Number(info?.cuota_mensual || 0);
  }

  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="bg-slate-950 text-white rounded-2xl p-6 text-center shadow">
          <h1 className="text-2xl font-bold">Portal de Propietarios</h1>
          <p className="text-sm text-slate-300 mt-1">
            VAM / SOTECDOM Administración
          </p>
        </div>

        {!propietario && (
          <div className="bg-white rounded-2xl p-6 shadow">
            <h2 className="text-xl font-bold mb-4">
              Consultar mi apartamento
            </h2>

            <form onSubmit={consultarPropietario} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Condominio
                </label>

                <select
                  value={condominio}
                  onChange={(e) => setCondominio(e.target.value)}
                  className="border rounded-lg px-3 py-3 w-full"
                >
                  <option value="">Seleccione condominio</option>
                  {condominios.map((c) => (
                    <option key={c.id} value={c.nombre}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  No. Apartamento
                </label>

                <input
                  type="text"
                  value={noApartamento}
                  onChange={(e) => setNoApartamento(e.target.value)}
                  className="border rounded-lg px-3 py-3 w-full"
                  placeholder="Ej. A1, B2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Cédula
                </label>

                <input
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  className="border rounded-lg px-3 py-3 w-full"
                  placeholder="000-0000000-0"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-700 text-white py-3 rounded-lg hover:bg-blue-800 disabled:opacity-50"
              >
                {loading ? "Consultando..." : "Consultar"}
              </button>
            </form>
          </div>
        )}

        {propietario && (
          <>
            <div className="bg-white rounded-2xl p-6 shadow space-y-4">
              <div>
                <p className="text-sm text-slate-500">Propietario</p>
                <h2 className="text-2xl font-bold">
                  {propietario.nombre_propietario}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Condominio</p>
                  <p className="font-bold">{propietario.condominio}</p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Apartamento</p>
                  <p className="font-bold">
                    {propietario.no_apartamento}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">
                    Cuota mensual
                  </p>

                  <p className="font-bold text-green-700">
                    RD$
                    {cuotaMensual(
                      propietario.condominio
                    ).toLocaleString("es-DO", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Estado</p>
                  <p className="font-bold text-blue-700">Validado</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow">
              <h2 className="text-xl font-bold mb-4">
                Reportar pago
              </h2>

              <form onSubmit={reportarPago} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Fecha del pago
                  </label>

                  <input
                    type="date"
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    className="border rounded-lg px-3 py-3 w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Mes pagado
                  </label>

                  <select
                    value={mesPagado}
                    onChange={(e) => setMesPagado(e.target.value)}
                    className="border rounded-lg px-3 py-3 w-full"
                  >
                    <option value="">Seleccione mes</option>

                    {meses.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Monto pagado
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    value={montoPagado}
                    onChange={(e) => setMontoPagado(e.target.value)}
                    className="border rounded-lg px-3 py-3 w-full"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Banco origen
                  </label>

                  <input
                    type="text"
                    value={bancoOrigen}
                    onChange={(e) => setBancoOrigen(e.target.value)}
                    className="border rounded-lg px-3 py-3 w-full"
                    placeholder="Banco Popular, Banreservas..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    No. referencia
                  </label>

                  <input
                    type="text"
                    value={noReferencia}
                    onChange={(e) => setNoReferencia(e.target.value)}
                    className="border rounded-lg px-3 py-3 w-full"
                    placeholder="Referencia bancaria"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Comentario
                  </label>

                  <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    className="border rounded-lg px-3 py-3 w-full"
                    rows={2}
                    placeholder="Comentario opcional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Subir comprobante
                  </label>

                  <input
                    id="comprobantePago"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) =>
                      setComprobanteArchivo(
                        e.target.files?.[0] || null
                      )
                    }
                    className="border rounded-lg px-3 py-3 w-full bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={guardandoPago}
                  className="w-full bg-green-700 text-white py-3 rounded-lg hover:bg-green-800 disabled:opacity-50"
                >
                  {guardandoPago
                    ? "Enviando..."
                    : "Enviar pago para validación"}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}