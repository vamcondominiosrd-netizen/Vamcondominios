"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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


const CLAVES_SESION = [
  "user_id",
  "empresa_id",
  "empresa_nombre",
  "condominio_id",
  "condominio_nombre",
  "condominio_logo_url",
  "usuario_rol",
  "usuario_nombre",
  "usuario_admin_id",
  "permisos_usuario",
];

function normalizarRol(valor?: string | null) {
  return String(valor || "").trim().toLowerCase();
}

function rolAdministrativoPermitido(
  ...roles: Array<string | null | undefined>
) {
  return roles.some((rol) => {
    const valor = normalizarRol(rol);

    return (
      valor.includes("admin") ||
      valor.includes("administrador") ||
      valor.includes("presidente") ||
      valor.includes("tesorero") ||
      valor.includes("tesoreria") ||
      valor.includes("tesorería") ||
      valor.includes("secretario") ||
      valor.includes("supervisor") ||
      valor.includes("super")
    );
  });
}

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
  const [validandoAcceso, setValidandoAcceso] = useState(true);
  const [autorizado, setAutorizado] = useState(false);

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
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [iniciandoCamara, setIniciandoCamara] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function limpiarSesionLocal() {
    CLAVES_SESION.forEach((clave) => localStorage.removeItem(clave));
  }

  function detenerCamara() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCamaraAbierta(false);
  }

  async function abrirCamara() {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      alert(
        "Este navegador no permite abrir la cámara directamente. Use la opción Seleccionar.",
      );
      return;
    }

    setIniciandoCamara(true);

    try {
      detenerCamara();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
        },
      });

      streamRef.current = stream;
      setCamaraAbierta(true);

      window.setTimeout(async () => {
        if (!videoRef.current) return;

        videoRef.current.srcObject = stream;

        try {
          await videoRef.current.play();
        } catch {
          // El atributo autoPlay también intentará iniciar la reproducción.
        }
      }, 0);
    } catch (error: any) {
      const mensaje =
        error?.name === "NotAllowedError"
          ? "Debe permitir el acceso a la cámara para tomar la foto."
          : "No fue posible abrir la cámara del dispositivo.";

      alert(mensaje);
      detenerCamara();
    } finally {
      setIniciandoCamara(false);
    }
  }

  async function capturarFoto() {
    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      alert("La cámara todavía no está lista. Intente nuevamente.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const contexto = canvas.getContext("2d");

    if (!contexto) {
      alert("No fue posible capturar la fotografía.");
      return;
    }

    contexto.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.9);
    });

    if (!blob) {
      alert("No fue posible generar la fotografía.");
      return;
    }

    const archivo = new File(
      [blob],
      `caja-chica-${Date.now()}.jpg`,
      { type: "image/jpeg" },
    );

    setSoporte(archivo);
    detenerCamara();
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let activo = true;

    async function validarAcceso() {
      setValidandoAcceso(true);

      const id = localStorage.getItem("condominio_id") || "";

      if (!id) {
        limpiarSesionLocal();
        if (activo) router.replace("/mobile/admin/login");
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        limpiarSesionLocal();
        if (activo) router.replace("/mobile/admin/login");
        return;
      }

      const { data: acceso, error: accesoError } = await supabase
        .from("usuarios_condominios")
        .select("condominio_id, empresa_id, rol_condominio, activo")
        .eq("user_id", session.user.id)
        .eq("condominio_id", Number(id))
        .eq("activo", true)
        .maybeSingle();

      if (accesoError || !acceso) {
        await supabase.auth.signOut();
        limpiarSesionLocal();
        if (activo) router.replace("/mobile/admin/login");
        return;
      }

      const empresaId = Number(
        (acceso as any).empresa_id ||
          localStorage.getItem("empresa_id") ||
          0,
      );

      const { data: empresaUsuario, error: empresaError } = await supabase
        .from("usuarios_empresas")
        .select("empresa_id, nombre_usuario, rol_global, activo")
        .eq("user_id", session.user.id)
        .eq("empresa_id", empresaId)
        .eq("activo", true)
        .maybeSingle();

      if (
        empresaError ||
        !empresaUsuario ||
        !rolAdministrativoPermitido(
          (empresaUsuario as any).rol_global,
          (acceso as any).rol_condominio,
        )
      ) {
        await supabase.auth.signOut();
        limpiarSesionLocal();
        if (activo) router.replace("/mobile/admin/login");
        return;
      }

      if (!activo) return;

      const nombre =
        localStorage.getItem("condominio_nombre") ||
        `Condominio ID ${id}`;
      const usuario =
        (empresaUsuario as any).nombre_usuario ||
        localStorage.getItem("usuario_nombre") ||
        session.user.email ||
        "Usuario VAM";
      const rol =
        (acceso as any).rol_condominio ||
        (empresaUsuario as any).rol_global ||
        "Administrador";

      localStorage.setItem("user_id", session.user.id);
      localStorage.setItem("usuario_admin_id", session.user.id);
      localStorage.setItem("empresa_id", String(empresaId));
      localStorage.setItem("usuario_nombre", usuario);
      localStorage.setItem("usuario_rol", String(rol));

      setCondominioId(id);
      setCondominioNombre(nombre);
      setUsuarioNombre(usuario);
      setAutorizado(true);
      setValidandoAcceso(false);

      await cargarDatos(id);
    }

    validarAcceso();

    return () => {
      activo = false;
    };
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

    detenerCamara();

    const archivo = document.getElementById(
      "archivoCajaChica",
    ) as HTMLInputElement | null;

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
    limpiarSesionLocal();
    await supabase.auth.signOut();
    router.replace("/mobile/admin/login");
  }

  if (validandoAcceso) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="rounded-2xl border bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-sm">
          Validando acceso seguro...
        </div>
      </main>
    );
  }

  if (!autorizado) return null;

  return (
      <main className="min-h-screen bg-slate-100 pb-24">
        <section className="rounded-b-3xl bg-emerald-700 p-5 text-white shadow">
          <Link href="/mobile/admin" className="text-sm font-semibold opacity-90">
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
                <button
                  type="button"
                  onClick={abrirCamara}
                  disabled={iniciandoCamara}
                  className="rounded-xl bg-blue-700 px-3 py-3 text-center text-sm font-bold text-white disabled:opacity-50"
                >
                  {iniciandoCamara ? "Abriendo..." : "📷 Tomar foto"}
                </button>

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

        {camaraAbierta && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-black">
            <div className="flex items-center justify-between bg-black px-4 py-3 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Caja Chica
                </p>
                <h2 className="text-lg font-black">Tomar fotografía</h2>
              </div>

              <button
                type="button"
                onClick={detenerCamara}
                className="rounded-xl bg-white/15 px-3 py-2 text-sm font-bold"
              >
                Cancelar
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-contain"
              />
            </div>

            <div className="bg-black px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
              <button
                type="button"
                onClick={capturarFoto}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20 shadow"
                aria-label="Capturar fotografía"
              >
                <span className="h-12 w-12 rounded-full bg-white" />
              </button>

              <p className="mt-3 text-center text-xs font-semibold text-white/70">
                Enfoque el recibo o factura y pulse el botón para capturar.
              </p>
            </div>
          </div>
        )}

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
              href="/mobile/admin/caja-chica"
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
  );
}
