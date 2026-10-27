"use client";

/*
 * VAM Administración de Condominios
 * Módulo: Gas / Lecturas mensuales
 * Versión: v1.2.0
 * Fecha: 13/10/2026
 *
 * Funciones:
 * - Solo opera para condominios CON_MEDIDORES.
 * - Carga medidores activos del condominio seleccionado.
 * - Toma automáticamente la última lectura válida del medidor.
 * - Si no existen lecturas, usa la lectura inicial del medidor.
 * - Calcula consumo = lectura_actual - lectura_anterior.
 * - Registra evidencia fotográfica opcional.
 * - Permite corregir una lectura ya registrada.
 * - Evita duplicar el mismo período para un mismo medidor.
 */

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

const VERSION = "1.2.1";

type ModalidadGas = "SIN_MEDIDORES" | "CON_MEDIDORES";

type Medidor = {
  id: number;
  condominio_id: number;
  unidad_id: number;
  tanque_id: number;
  unidad_medida_id: number;
  numero_serie: string;
  lectura_inicial: number;
  fecha_lectura_inicial: string;
  estado: string;
  foto_medidor_url: string | null;
  unidades?: {
    codigo: string | null;
    propietario_nombre: string | null;
  } | null;
  gas_tanques?: {
    nombre: string | null;
  } | null;
  gas_unidades_medida?: {
    nombre: string | null;
    abreviatura: string | null;
  } | null;
};

type Lectura = {
  id: number;
  condominio_id: number;
  medidor_id: number;
  unidad_id: number;
  tanque_id: number;
  unidad_medida_id: number;
  periodo: string;
  fecha_lectura: string;
  fecha_lectura_anterior: string;
  lectura_anterior: number;
  lectura_actual: number;
  consumo: number;
  foto_medidor_url: string | null;
  responsable_user_id: string | null;
  responsable_nombre: string | null;
  observacion: string | null;
  estado: string;
  motivo_revision: string | null;
  created_at: string;
  updated_at: string;
  gas_medidores?: {
    numero_serie: string | null;
  } | null;
  unidades?: {
    codigo: string | null;
    propietario_nombre: string | null;
  } | null;
  gas_unidades_medida?: {
    nombre: string | null;
    abreviatura: string | null;
  } | null;
};

function fechaLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function periodoActual() {
  return fechaLocalISO().slice(0, 7);
}

function fechaPeriodo(valor: string) {
  return valor ? `${valor}-01` : "";
}

function numero(valor: number | string | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

export default function GasLecturasPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [modalidad, setModalidad] = useState<ModalidadGas | null>(null);

  const [medidores, setMedidores] = useState<Medidor[]>([]);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [buscar, setBuscar] = useState("");

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [medidorId, setMedidorId] = useState("");
  const [periodo, setPeriodo] = useState(periodoActual());
  const [fechaLectura, setFechaLectura] = useState(fechaLocalISO());

  const [fechaLecturaAnterior, setFechaLecturaAnterior] = useState("");
  const [lecturaAnterior, setLecturaAnterior] = useState("");
  const [lecturaActual, setLecturaActual] = useState("");

  const [observacion, setObservacion] = useState("");
  const [motivoRevision, setMotivoRevision] = useState("");

  const [fotoLectura, setFotoLectura] = useState<File | null>(null);
  const [fotoActualUrl, setFotoActualUrl] = useState("");
  const [fotoLecturaAnteriorUrl, setFotoLecturaAnteriorUrl] = useState("");

  const [responsableUserId, setResponsableUserId] = useState<string | null>(null);
  const [responsableNombre, setResponsableNombre] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const usuario =
      localStorage.getItem("usuario_nombre") ||
      localStorage.getItem("nombre_usuario") ||
      "Usuario del sistema";

    setCondominioId(id);
    setCondominioNombre(nombre);
    setResponsableNombre(usuario);

    if (!id || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
      setMensaje("No hay un condominio activo válido. Inicie sesión nuevamente.");
      return;
    }

    void cargarUsuario();
    void cargarTodo(id);
  }, []);

  async function cargarUsuario() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setResponsableUserId(user?.id || null);
  }

  async function cargarTodo(id: string) {
    setLoading(true);
    setMensaje("");

    const ok = await cargarModalidad(id);

    if (!ok) {
      setLoading(false);
      return;
    }

    await Promise.all([cargarMedidores(id), cargarLecturas(id)]);
    setLoading(false);
  }

  async function cargarModalidad(id: string) {
    const { data, error } = await supabase
      .from("gas_configuracion")
      .select("modalidad")
      .eq("condominio_id", Number(id))
      .maybeSingle();

    if (error) {
      setModalidad(null);
      setMensaje("Error consultando configuración de gas: " + error.message);
      return false;
    }

    if (!data || data.modalidad !== "CON_MEDIDORES") {
      setModalidad(
        data?.modalidad === "SIN_MEDIDORES" ? "SIN_MEDIDORES" : null
      );
      setMensaje(
        "Este condominio no está configurado con medidores. Revise Configuración de Gas."
      );
      return false;
    }

    setModalidad("CON_MEDIDORES");
    return true;
  }

  async function cargarMedidores(id: string) {
    const { data, error } = await supabase
      .from("gas_medidores")
      .select(`
        id,
        condominio_id,
        unidad_id,
        tanque_id,
        unidad_medida_id,
        numero_serie,
        lectura_inicial,
        fecha_lectura_inicial,
        estado,
        foto_medidor_url,
        unidades(codigo, propietario_nombre),
        gas_tanques(nombre),
        gas_unidades_medida(nombre, abreviatura)
      `)
      .eq("condominio_id", Number(id))
      .eq("estado", "Activo")
      .order("id", { ascending: true });

    if (error) {
      setMedidores([]);
      setMensaje("Error cargando medidores: " + error.message);
      return;
    }

    setMedidores((data as Medidor[]) || []);
  }

  async function cargarLecturas(id: string) {
    const { data, error } = await supabase
      .from("gas_lecturas")
      .select(`
        id,
        condominio_id,
        medidor_id,
        unidad_id,
        tanque_id,
        unidad_medida_id,
        periodo,
        fecha_lectura,
        fecha_lectura_anterior,
        lectura_anterior,
        lectura_actual,
        consumo,
        foto_medidor_url,
        responsable_user_id,
        responsable_nombre,
        observacion,
        estado,
        motivo_revision,
        created_at,
        updated_at,
        gas_medidores(numero_serie),
        unidades(codigo, propietario_nombre),
        gas_unidades_medida(nombre, abreviatura)
      `)
      .eq("condominio_id", Number(id))
      .order("periodo", { ascending: false })
      .order("fecha_lectura", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      setLecturas([]);
      setMensaje("Error cargando lecturas: " + error.message);
      return;
    }

    setLecturas((data as Lectura[]) || []);
  }

  const medidorSeleccionado = useMemo(() => {
    return (
      medidores.find((m) => String(m.id) === String(medidorId)) || null
    );
  }, [medidores, medidorId]);

  const consumoCalculado = useMemo(() => {
    const anterior = Number(lecturaAnterior);
    const actual = Number(lecturaActual);

    if (
      lecturaAnterior === "" ||
      lecturaActual === "" ||
      !Number.isFinite(anterior) ||
      !Number.isFinite(actual)
    ) {
      return 0;
    }

    return actual - anterior;
  }, [lecturaAnterior, lecturaActual]);

  async function seleccionarMedidor(id: string) {
    setMedidorId(id);
    setLecturaActual("");
    setMensaje("");

    if (!id) {
      setLecturaAnterior("");
      setFechaLecturaAnterior("");
      setFotoLecturaAnteriorUrl("");
      return;
    }

    const medidor = medidores.find((m) => String(m.id) === String(id));

    if (!medidor) {
      setLecturaAnterior("");
      setFechaLecturaAnterior("");
      setFotoLecturaAnteriorUrl("");
      return;
    }

    const { data, error } = await supabase
      .from("gas_lecturas")
      .select("id, lectura_actual, fecha_lectura, foto_medidor_url")
      .eq("condominio_id", Number(condominioId))
      .eq("medidor_id", Number(id))
      .lte("fecha_lectura", fechaLectura)
      .order("fecha_lectura", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setMensaje("Error consultando última lectura: " + error.message);
      return;
    }

    if (data) {
      setLecturaAnterior(String(data.lectura_actual));
      setFechaLecturaAnterior(String(data.fecha_lectura));
      setFotoLecturaAnteriorUrl(String(data.foto_medidor_url || ""));
    } else {
      setLecturaAnterior(String(medidor.lectura_inicial));
      setFechaLecturaAnterior(medidor.fecha_lectura_inicial);
      setFotoLecturaAnteriorUrl(String(medidor.foto_medidor_url || ""));
    }
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setMedidorId("");
    setPeriodo(periodoActual());
    setFechaLectura(fechaLocalISO());
    setFechaLecturaAnterior("");
    setLecturaAnterior("");
    setLecturaActual("");
    setObservacion("");
    setMotivoRevision("");
    setFotoLectura(null);
    setFotoActualUrl("");
    setFotoLecturaAnteriorUrl("");
  }

  async function editarLectura(lectura: Lectura) {
    setEditandoId(lectura.id);
    setMedidorId(String(lectura.medidor_id));
    setPeriodo(String(lectura.periodo || "").slice(0, 7));
    setFechaLectura(lectura.fecha_lectura);
    setFechaLecturaAnterior(lectura.fecha_lectura_anterior);
    setLecturaAnterior(String(lectura.lectura_anterior));
    setLecturaActual(String(lectura.lectura_actual));
    setObservacion(lectura.observacion || "");
    setMotivoRevision(lectura.motivo_revision || "");
    setFotoActualUrl(lectura.foto_medidor_url || "");
    setFotoLectura(null);
    setFotoLecturaAnteriorUrl("");

    const medidor = medidores.find(
      (m) => Number(m.id) === Number(lectura.medidor_id)
    );

    const { data: lecturaPrevia, error } = await supabase
      .from("gas_lecturas")
      .select("id, foto_medidor_url, fecha_lectura")
      .eq("condominio_id", Number(condominioId))
      .eq("medidor_id", Number(lectura.medidor_id))
      .neq("id", lectura.id)
      .lte("fecha_lectura", lectura.fecha_lectura_anterior)
      .order("fecha_lectura", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && lecturaPrevia) {
      setFotoLecturaAnteriorUrl(
        String(lecturaPrevia.foto_medidor_url || "")
      );
    } else if (medidor) {
      setFotoLecturaAnteriorUrl(String(medidor.foto_medidor_url || ""));
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function subirFoto() {
    if (!fotoLectura) return fotoActualUrl || null;
    if (!condominioId) throw new Error("No hay condominio activo.");

    const extension = fotoLectura.name.split(".").pop() || "jpg";
    const archivo = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const ruta = `${condominioId}/lecturas/${archivo}`;

    const { error } = await supabase.storage
      .from("fotos-gas")
      .upload(ruta, fotoLectura);

    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from("fotos-gas").getPublicUrl(ruta);
    return data.publicUrl;
  }

  async function validarPeriodoDuplicado() {
    if (!condominioId || !medidorId || !periodo) return false;

    let query = supabase
      .from("gas_lecturas")
      .select("id")
      .eq("condominio_id", Number(condominioId))
      .eq("medidor_id", Number(medidorId))
      .eq("periodo", fechaPeriodo(periodo));

    if (editandoId) {
      query = query.neq("id", editandoId);
    }

    const { data, error } = await query.limit(1);

    if (error) throw new Error(error.message);

    return Boolean(data && data.length > 0);
  }

  async function guardarLectura(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId) {
      alert("No hay condominio activo.");
      return;
    }

    if (modalidad !== "CON_MEDIDORES") {
      alert("El condominio no está configurado con medidores.");
      return;
    }

    if (!medidorSeleccionado) {
      alert("Debe seleccionar un medidor.");
      return;
    }

    if (!periodo) {
      alert("Debe seleccionar el período.");
      return;
    }

    // La lectura inicial vive en gas_medidores, no en gas_lecturas.
    // Evita crear un consumo ficticio en el mes de instalación.
    if (!editandoId && periodo <= String(medidorSeleccionado.fecha_lectura_inicial || "").slice(0, 7)) {
      alert(`El período ${periodo} corresponde al inicio del medidor.\n\nLa lectura inicial ya está registrada: ${numero(medidorSeleccionado.lectura_inicial)} el ${medidorSeleccionado.fecha_lectura_inicial}.\n\nNo cree una lectura mensual en agosto. Para corregir septiembre, pulse Corregir en el historial de septiembre.`);
      return;
    }

    if (!fechaLectura) {
      alert("Debe indicar la fecha de lectura.");
      return;
    }

    if (!fechaLecturaAnterior || lecturaAnterior === "") {
      alert("No se pudo determinar la lectura anterior.");
      return;
    }

    const anterior = Number(lecturaAnterior);
    const actual = Number(lecturaActual);

    if (lecturaActual.trim() === "" || !Number.isFinite(actual) || actual < 0) {
      alert("La lectura actual debe ser un número mayor o igual a cero.");
      return;
    }

    if (actual < anterior) {
      alert(
        "La lectura actual no puede ser menor que la lectura anterior. Si hubo cambio de medidor, registre primero el nuevo medidor."
      );
      return;
    }

    if (fechaLectura < fechaLecturaAnterior) {
      alert("La fecha de lectura no puede ser anterior a la lectura previa.");
      return;
    }

    setGuardando(true);
    setMensaje("");

    try {
      const duplicado = await validarPeriodoDuplicado();

      if (duplicado) {
        alert(
          "Ya existe una lectura registrada para este medidor en el período seleccionado."
        );
        setGuardando(false);
        return;
      }

      // Una lectura posterior depende de este valor: no reescribir cadenas históricas.
      const { data: posteriores, error: errorPosteriores } = await supabase
        .from("gas_lecturas")
        .select("id, periodo, fecha_lectura")
        .eq("condominio_id", Number(condominioId))
        .eq("medidor_id", medidorSeleccionado.id)
        .gt("fecha_lectura", fechaLectura)
        .order("fecha_lectura", { ascending: true })
        .limit(1);
      if (errorPosteriores) throw new Error(errorPosteriores.message);
      if (posteriores?.length) {
        throw new Error("Existe una lectura posterior (" + posteriores[0].fecha_lectura +
          "). No se puede guardar esta lectura sin recalcular las posteriores.");
      }

      // La fecha anterior debe ser realmente la última lectura anterior.
      const { data: previas, error: errorPrevias } = await supabase
        .from("gas_lecturas")
        .select("id, lectura_actual, fecha_lectura, foto_medidor_url")
        .eq("condominio_id", Number(condominioId))
        .eq("medidor_id", medidorSeleccionado.id)
        .lte("fecha_lectura", fechaLectura)
        .order("fecha_lectura", { ascending: false })
        .order("id", { ascending: false })
        .limit(editandoId ? 2 : 1);
      if (errorPrevias) throw new Error(errorPrevias.message);
      const previaReal = (previas || []).find(x => x.id !== editandoId);
      const valorPrevio = previaReal ? Number(previaReal.lectura_actual) : Number(medidorSeleccionado.lectura_inicial);
      const fechaPrevia = previaReal ? String(previaReal.fecha_lectura) : medidorSeleccionado.fecha_lectura_inicial;
      if (anterior !== valorPrevio || fechaLecturaAnterior !== fechaPrevia) {
        setLecturaAnterior(String(valorPrevio));
        setFechaLecturaAnterior(fechaPrevia);
        setFotoLecturaAnteriorUrl(previaReal?.foto_medidor_url || medidorSeleccionado.foto_medidor_url || "");
        throw new Error("La lectura anterior cambió. Se actualizó el formulario; revise el consumo y vuelva a guardar.");
      }
      if (fechaLectura < fechaPrevia) throw new Error("Fecha anterior al inicio del medidor.");
      if (fechaLectura.slice(0, 7) !== periodo) {
        throw new Error("La fecha de lectura debe corresponder al período seleccionado.");
      }

      const fotoUrl = await subirFoto();
      const consumo = Math.round((actual - anterior) * 10000) / 10000;

      const registro = {
        condominio_id: Number(condominioId),
        medidor_id: medidorSeleccionado.id,
        unidad_id: medidorSeleccionado.unidad_id,
        tanque_id: medidorSeleccionado.tanque_id,
        unidad_medida_id: medidorSeleccionado.unidad_medida_id,
        periodo: fechaPeriodo(periodo),
        fecha_lectura: fechaLectura,
        fecha_lectura_anterior: fechaLecturaAnterior,
        lectura_anterior: anterior,
        lectura_actual: actual,
        consumo,
        foto_medidor_url: fotoUrl,
        responsable_user_id: responsableUserId,
        responsable_nombre: responsableNombre || null,
        observacion: observacion.trim() || null,
        // No enviar un estado inventado: PostgreSQL aplica su DEFAULT permitido.
        // Al editar se conserva el estado actual.
        motivo_revision: motivoRevision.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editandoId) {
        const { data, error } = await supabase
          .from("gas_lecturas")
          .update(registro)
          .eq("id", editandoId)
          .eq("condominio_id", Number(condominioId))
          .select("id, fecha_lectura, lectura_actual");

        if (error) throw new Error(error.message);
        if (!data?.length) throw new Error("No se actualizó ninguna fila. Compruebe permisos y condominio.");

        alert("Lectura actualizada correctamente.");
      } else {
        const { data, error } = await supabase.from("gas_lecturas").insert([
          {
            ...registro,
            created_at: new Date().toISOString(),
          },
        ]).select("id, estado");

        if (error) throw new Error(error.message);
        if (!data?.length) throw new Error("No se confirmó el registro de la lectura.");

        alert(
          `Lectura registrada correctamente. Consumo: ${numero(consumo)}.`
        );
      }

      limpiarFormulario();
      await cargarLecturas(condominioId);
    } catch (error: any) {
      const detalle = error?.message || String(error);
      alert("Error guardando lectura: " + detalle +
        (detalle.includes("gas_lecturas_estado_check")
          ? "\nLa restricción de estados de Supabase no acepta su valor DEFAULT. Debe revisarse esa configuración antes de guardar; no se modificó la restricción."
          : ""));
    } finally {
      setGuardando(false);
    }
  }

  const lecturasFiltradas = useMemo(() => {
    const texto = buscar.trim().toLowerCase();

    if (!texto) return lecturas;

    return lecturas.filter((lectura) => {
      const cadena = `
        ${lectura.id}
        ${lectura.periodo || ""}
        ${lectura.fecha_lectura || ""}
        ${lectura.estado || ""}
        ${lectura.observacion || ""}
        ${lectura.responsable_nombre || ""}
        ${lectura.unidades?.codigo || ""}
        ${lectura.unidades?.propietario_nombre || ""}
        ${lectura.gas_medidores?.numero_serie || ""}
      `.toLowerCase();

      return cadena.includes(texto);
    });
  }, [lecturas, buscar]);

  const totalConsumo = lecturasFiltradas.reduce(
    (suma, lectura) => suma + Number(lectura.consumo || 0),
    0
  );

  const periodoFiltro = periodoActual();
  const lecturasPeriodoActual = lecturas.filter(
    (l) => String(l.periodo || "").slice(0, 7) === periodoFiltro
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
                Módulo de Gas
              </p>

              <h1 className="mt-1 text-3xl font-black text-slate-900">
                Lecturas Mensuales
              </h1>

              <p className="mt-1 text-xs text-slate-400">
                Gas · Lecturas v{VERSION}
              </p>

              <p className="mt-2 max-w-3xl text-slate-500">
                Registre la lectura de cada medidor. El sistema toma
                automáticamente la lectura anterior y calcula el consumo.
              </p>

              <p className="mt-3 text-sm font-bold text-blue-700">
                Condominio activo: {condominioNombre || "No seleccionado"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/gas/medidores"
                className="rounded-xl bg-slate-600 px-4 py-2 font-bold text-white hover:bg-slate-700"
              >
                Medidores
              </Link>

              <Link
                href="/gas"
                className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-white hover:bg-slate-900"
              >
                Volver a Gas
              </Link>

              <button
                type="button"
                disabled={!condominioId || loading}
                onClick={() => void cargarTodo(condominioId)}
                className="rounded-xl bg-blue-700 px-4 py-2 font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                Actualizar
              </button>
            </div>
          </div>
        </section>

        {mensaje && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            {mensaje}
          </div>
        )}

        {modalidad === "CON_MEDIDORES" && (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Medidores activos</p>
                <p className="text-3xl font-black text-slate-900">
                  {medidores.length}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Lecturas registradas</p>
                <p className="text-3xl font-black text-blue-700">
                  {lecturas.length}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Lecturas período actual
                </p>
                <p className="text-3xl font-black text-emerald-700">
                  {lecturasPeriodoActual}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Consumo mostrado
                </p>
                <p className="text-3xl font-black text-orange-700">
                  {numero(totalConsumo)}
                </p>
              </div>
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-black text-slate-900">
                {editandoId ? "Corregir lectura" : "Nueva lectura"}
              </h2>

              {medidorSeleccionado && (
                <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
                  <p className="font-bold">Lectura inicial registrada en el medidor</p>
                  <p className="mt-1">Fecha: {medidorSeleccionado.fecha_lectura_inicial} · Valor: {numero(medidorSeleccionado.lectura_inicial)} {medidorSeleccionado.gas_unidades_medida?.abreviatura || ""}</p>
                  <p className="mt-1">Esta lectura es la base del cálculo; no se registra como consumo mensual ni genera factura.</p>
                </div>
              )}
              <form
                onSubmit={guardarLectura}
                className="grid grid-cols-1 gap-4 md:grid-cols-4"
              >
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold">
                    Apartamento / Medidor *
                  </label>
                  <select
                    value={medidorId}
                    disabled={Boolean(editandoId)}
                    onChange={(e) => void seleccionarMedidor(e.target.value)}
                    className="w-full rounded-xl border bg-white px-4 py-3 disabled:bg-slate-100"
                  >
                    <option value="">Seleccione</option>
                    {medidores.map((medidor) => (
                      <option key={medidor.id} value={medidor.id}>
                        {medidor.unidades?.codigo || "Unidad"} ·{" "}
                        {medidor.numero_serie} ·{" "}
                        {medidor.unidades?.propietario_nombre ||
                          "Sin propietario"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Período *
                  </label>
                  <input
                    type="month"
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Fecha lectura *
                  </label>
                  <input
                    type="date"
                    value={fechaLectura}
                    onChange={(e) => setFechaLectura(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Fecha lectura anterior
                  </label>
                  <input
                    type="date"
                    readOnly
                    value={fechaLecturaAnterior}
                    className="w-full rounded-xl border bg-slate-100 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Lectura anterior
                  </label>
                  <input
                    type="number"
                    readOnly
                    value={lecturaAnterior}
                    className="w-full rounded-xl border bg-slate-100 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Lectura actual *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={lecturaActual}
                    onChange={(e) => setLecturaActual(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                    placeholder="0.000"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Consumo calculado
                  </label>
                  <div
                    className={`rounded-xl border px-4 py-3 font-black ${
                      consumoCalculado < 0
                        ? "border-red-300 bg-red-50 text-red-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800"
                    }`}
                  >
                    {numero(consumoCalculado)}{" "}
                    {medidorSeleccionado?.gas_unidades_medida?.abreviatura ||
                      ""}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold">
                    Evidencia de la lectura anterior
                  </label>

                  <div className="rounded-2xl border bg-slate-50 p-4">
                    {fotoLecturaAnteriorUrl ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <img
                          src={fotoLecturaAnteriorUrl}
                          alt="Foto de la lectura anterior del medidor"
                          className="h-32 w-full rounded-xl border bg-white object-contain sm:w-44"
                        />

                        <div className="text-sm text-slate-600">
                          <p>
                            <strong>Lectura anterior:</strong>{" "}
                            {lecturaAnterior === ""
                              ? "-"
                              : numero(lecturaAnterior)}
                          </p>
                          <p className="mt-1">
                            <strong>Fecha:</strong>{" "}
                            {fechaLecturaAnterior || "-"}
                          </p>

                          <a
                            href={fotoLecturaAnteriorUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-block font-bold text-blue-700 underline"
                          >
                            Ver foto completa
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">
                        <p className="font-bold text-slate-700">
                          Sin fotografía anterior
                        </p>
                        <p className="mt-1">
                          La lectura anterior está disponible, pero no tiene
                          evidencia fotográfica registrada.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold">Motivo de revisión / incidencia</label>
                  <input type="text" value={motivoRevision}
                    onChange={(e) => setMotivoRevision(e.target.value)}
                    className="w-full rounded-xl border bg-white px-4 py-3"
                    placeholder="Opcional: lectura atípica, fotografía ilegible..." />
                  <p className="mt-1 text-xs text-slate-500">
                    El estado lo define la base de datos. Al corregir una lectura se conserva su estado.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold">
                    Foto de la lectura actual
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) =>
                      setFotoLectura(e.target.files?.[0] || null)
                    }
                    className="w-full rounded-xl border bg-white px-4 py-3"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Esta evidencia quedará disponible para compararla con la
                    siguiente lectura y para el módulo móvil del propietario.
                  </p>
                  {fotoActualUrl && (
                    <a
                      href={fotoActualUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs font-bold text-blue-700 underline"
                    >
                      Ver evidencia actual
                    </a>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold">
                    Observación
                  </label>
                  <textarea
                    rows={3}
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                    placeholder="Nota opcional de la lectura."
                  />
                </div>

                <div className="md:col-span-4 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={
                      guardando ||
                      loading ||
                      !medidorSeleccionado ||
                      consumoCalculado < 0
                    }
                    className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {guardando
                      ? "Guardando..."
                      : editandoId
                        ? "Actualizar lectura"
                        : "Guardar lectura"}
                  </button>

                  {editandoId && (
                    <button
                      type="button"
                      onClick={limpiarFormulario}
                      className="rounded-xl border bg-slate-100 px-5 py-3 font-bold text-slate-800 hover:bg-slate-200"
                    >
                      Cancelar corrección
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Historial de lecturas
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Lecturas y consumos registrados para el condominio activo.
                  </p>
                </div>

                <input
                  type="text"
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 md:w-80"
                  placeholder="Buscar apartamento, serie, período..."
                />
              </div>

              <div className="overflow-auto rounded-2xl border">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border p-3 text-left">Período</th>
                      <th className="border p-3 text-left">Apartamento</th>
                      <th className="border p-3 text-left">Medidor</th>
                      <th className="border p-3 text-right">Anterior</th>
                      <th className="border p-3 text-right">Actual</th>
                      <th className="border p-3 text-right">Consumo</th>
                      <th className="border p-3 text-left">Fecha</th>
                      <th className="border p-3 text-center">Estado</th>
                      <th className="border p-3 text-left">Responsable</th>
                      <th className="border p-3 text-center">Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {lecturasFiltradas.map((lectura) => (
                      <tr key={lectura.id} className="hover:bg-slate-50">
                        <td className="border p-3 font-bold">
                          {String(lectura.periodo || "").slice(0, 7)}
                        </td>
                        <td className="border p-3 font-black">
                          {lectura.unidades?.codigo || "-"}
                        </td>
                        <td className="border p-3">
                          {lectura.gas_medidores?.numero_serie || "-"}
                        </td>
                        <td className="border p-3 text-right">
                          {numero(lectura.lectura_anterior)}
                        </td>
                        <td className="border p-3 text-right">
                          {numero(lectura.lectura_actual)}
                        </td>
                        <td className="border p-3 text-right font-black text-orange-700">
                          {numero(lectura.consumo)}
                        </td>
                        <td className="border p-3">
                          {lectura.fecha_lectura}
                        </td>
                        <td className="border p-3 text-center">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              lectura.estado === "Registrada"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {lectura.estado}
                          </span>
                        </td>
                        <td className="border p-3">
                          {lectura.responsable_nombre || "-"}
                        </td>
                        <td className="border p-3 text-center">
                          <button
                            type="button"
                            onClick={() => void editarLectura(lectura)}
                            className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700"
                          >
                            Corregir
                          </button>
                        </td>
                      </tr>
                    ))}

                    {lecturasFiltradas.length === 0 && (
                      <tr>
                        <td
                          colSpan={10}
                          className="border p-8 text-center text-slate-500"
                        >
                          No hay lecturas registradas para este condominio.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <p className="text-right text-xs text-slate-400">
          Gas · Lecturas v{VERSION}
        </p>
      </div>
    </main>
  );
}
