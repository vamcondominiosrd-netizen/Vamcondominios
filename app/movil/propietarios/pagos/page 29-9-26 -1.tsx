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


type RespuestaPagosContexto = {
  ok?: boolean;
  codigo?: string;
  mensaje?: string;
  balance?: number | string | null;
  bancos?: BancoNombre[];
};

const RPC_PAGOS_CONTEXTO = "vam_propietario_pagos_contexto";
const API_REGISTRAR_PAGO = "/api/propietarios/pagos/registrar";
const MODULO_VERSION = "2.0";

function normalizarRespuesta<T>(data: unknown): T {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as T;
  }

  if (
    Array.isArray(data) &&
    data.length > 0 &&
    data[0] &&
    typeof data[0] === "object"
  ) {
    return data[0] as T;
  }

  return {} as T;
}

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(valor || 0);
}

export default function PagosPropietariosPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(
    null
  );
  const [bancos, setBancos] = useState<BancoNombre[]>([]);

  const [balancePendiente, setBalancePendiente] = useState(0);
  const [cargandoBalance, setCargandoBalance] = useState(true);

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
    void inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function limpiarSesionPropietario() {
    localStorage.removeItem("propietario_actual");
    localStorage.removeItem("propietario_token");
    localStorage.removeItem("propietario_token_expira");
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
  }

  function codigoSesionInvalida(codigo?: string) {
    return [
      "SESION_INVALIDA",
      "SESION_VENCIDA",
      "CUENTA_INACTIVA",
      "CAMBIO_CLAVE_PENDIENTE",
      "SIN_ACCESO",
    ].includes(String(codigo || ""));
  }

  function enviarALogin(mensaje?: string) {
    if (mensaje) {
      setMensaje(mensaje);
      setExito(false);
    }

    limpiarSesionPropietario();

    window.setTimeout(() => {
      router.replace("/movil/propietarios/login");
    }, mensaje ? 700 : 0);
  }

  function fechaLocalHoy() {
    const hoy = new Date();

    return [
      hoy.getFullYear(),
      String(hoy.getMonth() + 1).padStart(2, "0"),
      String(hoy.getDate()).padStart(2, "0"),
    ].join("-");
  }

  async function inicializar() {
    setCargandoBalance(true);
    setMensaje("");
    setExito(false);

    try {
      const raw = localStorage.getItem("propietario_actual");
      const token = String(
        localStorage.getItem("propietario_token") || ""
      ).trim();

      if (!raw || !token) {
        enviarALogin();
        return;
      }

      const prop = JSON.parse(raw) as PropietarioActual;

      if (
        !prop?.propietario_id ||
        !prop?.condominio_id ||
        !prop?.unidad_id
      ) {
        enviarALogin();
        return;
      }

      setPropietario(prop);
      setFechaPago(fechaLocalHoy());

      await cargarContextoPagos(prop, token);
    } catch (error) {
      console.error("Error inicializando pagos:", error);
      setMensaje("No se pudo cargar la información para registrar el pago.");
      setExito(false);
      setBancos([]);
      setBalancePendiente(0);
    } finally {
      setCargandoBalance(false);
    }
  }

  async function cargarContextoPagos(
    prop: PropietarioActual,
    tokenRecibido?: string
  ) {
    setCargandoBalance(true);

    try {
      const token = String(
        tokenRecibido ||
          localStorage.getItem("propietario_token") ||
          ""
      ).trim();

      if (!token) {
        enviarALogin("La sesión ha vencido. Inicie sesión nuevamente.");
        return;
      }

      const { data, error } = await supabase.rpc(
        RPC_PAGOS_CONTEXTO,
        {
          p_token: token,
          p_condominio_id: Number(prop.condominio_id),
          p_unidad_id: Number(prop.unidad_id),
        }
      );

      if (error) {
        console.error("Error cargando contexto de pagos:", error);
        setMensaje("No se pudo cargar el balance en este momento.");
        setExito(false);
        setBancos([]);
        setBalancePendiente(0);
        return;
      }

      const respuesta =
        normalizarRespuesta<RespuestaPagosContexto>(data);

      if (respuesta.ok !== true) {
        if (codigoSesionInvalida(respuesta.codigo)) {
          enviarALogin(
            respuesta.mensaje ||
              "La sesión ha vencido. Inicie sesión nuevamente."
          );
          return;
        }

        setMensaje(
          respuesta.mensaje ||
            "No se pudo cargar la información de pagos."
        );
        setExito(false);
        setBancos([]);
        setBalancePendiente(0);
        return;
      }

      const balance = Number(respuesta.balance || 0);

      setBancos(
        Array.isArray(respuesta.bancos)
          ? respuesta.bancos
          : []
      );
      setBalancePendiente(balance);

      if (balance > 0) {
        setMonto(balance.toFixed(2));
      }
    } catch (error) {
      console.error("Error inesperado cargando pagos:", error);
      setMensaje("No se pudo cargar la información de pagos.");
      setExito(false);
      setBancos([]);
      setBalancePendiente(0);
    } finally {
      setCargandoBalance(false);
    }
  }

  async function registrarPago() {
    if (!propietario || loading) return;

    setMensaje("");
    setExito(false);

    const montoNumero = Number(monto);

    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      setMensaje("Debe indicar un monto válido.");
      return;
    }

    if (!fechaPago) {
      setMensaje("Debe indicar la fecha del pago.");
      return;
    }

    if (fechaPago > fechaLocalHoy()) {
      setMensaje("La fecha del pago no puede ser futura.");
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

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!tiposPermitidos.includes(comprobante.type)) {
      setMensaje("El comprobante debe ser JPG, PNG, WEBP o PDF.");
      return;
    }

    if (comprobante.size <= 0 || comprobante.size > 10 * 1024 * 1024) {
      setMensaje("El comprobante no puede superar 10 MB.");
      return;
    }

    const token = String(
      localStorage.getItem("propietario_token") || ""
    ).trim();

    if (!token) {
      enviarALogin("La sesión ha vencido. Inicie sesión nuevamente.");
      return;
    }

    const bancoFinal =
      metodoPago === "Efectivo"
        ? ""
        : banco === "Otro banco"
        ? bancoOtro.trim()
        : banco;

    const formData = new FormData();
    formData.append("condominio_id", String(propietario.condominio_id));
    formData.append("unidad_id", String(propietario.unidad_id));
    formData.append("concepto", concepto);
    formData.append("monto", String(montoNumero));
    formData.append("fecha_pago", fechaPago);
    formData.append("metodo_pago", metodoPago);
    formData.append("banco", bancoFinal);
    formData.append(
      "referencia",
      metodoPago === "Efectivo" ? "" : referencia.trim()
    );
    formData.append("file", comprobante);

    try {
      setLoading(true);

      const response = await fetch(API_REGISTRAR_PAGO, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        cache: "no-store",
      });

      const resultado = await response.json().catch(() => ({}));

      if (
        response.status === 401 ||
        codigoSesionInvalida(resultado?.codigo)
      ) {
        enviarALogin(
          resultado?.mensaje ||
            "La sesión ha vencido. Inicie sesión nuevamente."
        );
        return;
      }

      if (!response.ok || resultado?.ok !== true) {
        throw new Error(
          resultado?.mensaje ||
            "No se pudo registrar el pago."
        );
      }

      setExito(true);
      setMensaje(
        resultado?.mensaje ||
          "Pago enviado correctamente. Quedará pendiente de validación."
      );

      setConcepto("Pago de mantenimiento");
      setMonto(
        balancePendiente > 0
          ? balancePendiente.toFixed(2)
          : ""
      );
      setFechaPago(fechaLocalHoy());
      setMetodoPago("Transferencia");
      setBanco("");
      setBancoOtro("");
      setReferencia("");
      setComprobante(null);
    } catch (error: any) {
      console.error("Error registrando pago:", error);
      setMensaje(
        error?.message || "Error al registrar el pago."
      );
      setExito(false);
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
        <p className="text-xs text-slate-300">
          {propietario.condominio_nombre}
        </p>
      </header>

      <section className="bg-white rounded-3xl border shadow-sm p-5">
        <p className="text-sm font-bold text-slate-500">Balance pendiente</p>

        {cargandoBalance ? (
          <p className="text-slate-500 mt-2">Cargando balance...</p>
        ) : (
          <>
            <h2
              className={`text-3xl font-extrabold mt-1 ${
                balancePendiente > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {formatoMoneda(balancePendiente)}
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              El monto a pagar se cargó automáticamente, pero puede modificarlo
              si realizará un pago parcial.
            </p>

            {balancePendiente > 0 && (
              <button
                type="button"
                onClick={() => setMonto(balancePendiente.toFixed(2))}
                className="mt-4 w-full bg-slate-100 text-slate-800 rounded-2xl py-3 font-bold"
              >
                Pagar balance completo
              </button>
            )}
          </>
        )}
      </section>

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
            Monto a pagar
          </label>

          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Ejemplo: 4500"
            className="w-full border rounded-2xl px-4 py-3"
          />

          {monto && (
            <p className="text-xs text-slate-500 mt-1">
              {formatoMoneda(Number(monto))}
            </p>
          )}
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

                  if (e.target.value !== "Otro banco") {
                    setBancoOtro("");
                  }
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

      <footer className="pb-2 pt-1 text-center">
        <p className="text-[10px] text-slate-400">
          VAM Administración de Condominios · Pagos Propietario V{MODULO_VERSION}
        </p>
      </footer>
    </div>
  );
}