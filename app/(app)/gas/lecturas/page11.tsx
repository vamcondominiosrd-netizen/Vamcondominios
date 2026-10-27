"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { supabase } from "@/app/lib/supabaseClient";

/**
 * VAM · Gas / Lecturas · v1.0.0
 * Primera versión operativa para pruebas administrativas.
 *
 * - Requiere gas_configuracion = CON_MEDIDORES.
 * - Usa gas_medidores y gas_lecturas.
 * - El usuario registra lectura actual, fecha, foto y observación.
 * - La BD recalcula lectura anterior y consumo mediante trg_preparar_lectura_gas.
 * - No genera cargos ni recibos todavía.
 */

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
};

type Unidad = {
  id: number;
  codigo: string;
  activa: boolean;
};

type Tanque = {
  id: number;
  nombre: string;
  estado: string | null;
};

type UnidadMedida = {
  id: number;
  nombre: string;
  abreviatura: string | null;
  estado: string | null;
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
  responsable_nombre: string | null;
  observacion: string | null;
  estado: "REGISTRADA" | "EN_REVISION" | "APROBADA" | "ANULADA";
};

type MedidorFila = {
  medidor: Medidor;
  unidad: Unidad | null;
  tanque: Tanque | null;
  medida: UnidadMedida | null;
  lecturaPeriodo: Lectura | null;
  lecturaAnterior: number;
  fechaAnterior: string;
};

const VERSION = "1.0.0";

function hoyLocal(): string {
  const fecha = new Date();
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function periodoActual(): string {
  return `${hoyLocal().slice(0, 7)}-01`;
}

function primerDiaMes(valor: string): string {
  if (!valor) return periodoActual();
  return `${valor.slice(0, 7)}-01`;
}

function numero(valor: number | null | undefined, decimales = 4): string {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

function fechaDO(valor: string | null | undefined): string {
  if (!valor) return "-";
  const partes = valor.slice(0, 10).split("-");
  if (partes.length !== 3) return valor;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function mesTexto(valor: string): string {
  if (!valor) return "-";
  const [anio, mes] = valor.slice(0, 7).split("-").map(Number);
  const d = new Date(anio, mes - 1, 1);
  return d.toLocaleDateString("es-DO", {
    month: "long",
    year: "numeric",
  });
}

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido.";
}

export default function GasLecturasPage() {
  const [condominioId, setCondominioId] = useState<number | null>(null);
  const [condominioNombre, setCondominioNombre] = useState("");
  const [responsableNombre, setResponsableNombre] = useState("");
  const [autorizado, setAutorizado] = useState(false);

  const [medidores, setMedidores] = useState<Medidor[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [tanques, setTanques] = useState<Tanque[]>([]);
  const [medidas, setMedidas] = useState<UnidadMedida[]>([]);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);

  const [periodo, setPeriodo] = useState(periodoActual());
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState<"TODOS" | "PENDIENTES" | "REALIZADAS">(
    "PENDIENTES"
  );

  const [medidorSeleccionado, setMedidorSeleccionado] =
    useState<MedidorFila | null>(null);
  const [lecturaActual, setLecturaActual] = useState("");
  const [fechaLectura, setFechaLectura] = useState(hoyLocal());
  const [observacion, setObservacion] = useState("");
  const [foto, setFoto] = useState<File | null>(null);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState("");

  const fotoRef = useRef<HTMLInputElement | null>(null);

  async function cargarCatalogos(id: number) {
    const [m, u, t, um] = await Promise.all([
      supabase
        .from("gas_medidores")
        .select(
          "id,condominio_id,unidad_id,tanque_id,unidad_medida_id,numero_serie,lectura_inicial,fecha_lectura_inicial,estado"
        )
        .eq("condominio_id", id)
        .eq("estado", "Activo")
        .order("id", { ascending: true }),

      supabase
        .from("unidades")
        .select("id,codigo,activa")
        .eq("condominio_id", id)
        .order("codigo", { ascending: true }),

      supabase
        .from("gas_tanques")
        .select("id,nombre,estado")
        .eq("condominio_id", id)
        .order("nombre", { ascending: true }),

      supabase
        .from("gas_unidades_medida")
        .select("id,nombre,abreviatura,estado")
        .eq("condominio_id", id)
        .order("nombre", { ascending: true }),
    ]);

    const error = m.error || u.error || t.error || um.error;
    if (error) throw new Error(error.message);

    setMedidores((m.data || []) as Medidor[]);
    setUnidades((u.data || []) as Unidad[]);
    setTanques((t.data || []) as Tanque[]);
    setMedidas((um.data || []) as UnidadMedida[]);
  }

  async function cargarLecturas(id: number) {
    const { data, error } = await supabase
      .from("gas_lecturas")
      .select(
        "id,condominio_id,medidor_id,unidad_id,tanque_id,unidad_medida_id,periodo,fecha_lectura,fecha_lectura_anterior,lectura_anterior,lectura_actual,consumo,foto_medidor_url,responsable_nombre,observacion,estado"
      )
      .eq("condominio_id", id)
      .neq("estado", "ANULADA")
      .order("periodo", { ascending: false })
      .order("id", { ascending: false });

    if (error) throw new Error(error.message);
    setLecturas((data || []) as Lectura[]);
  }

  async function cargarTodo(id: number) {
    await Promise.all([cargarCatalogos(id), cargarLecturas(id)]);
  }

  useEffect(() => {
    let vigente = true;

    async function iniciar() {
      setCargando(true);
      setMensaje("");
      setExito("");
      setAutorizado(false);

      const idTexto = localStorage.getItem("condominio_id") || "";
      const nombre = localStorage.getItem("condominio_nombre") || "";
      const usuario =
        localStorage.getItem("usuario_nombre") ||
        localStorage.getItem("nombre_usuario") ||
        "";

      const id = Number(idTexto);

      setCondominioNombre(nombre);
      setResponsableNombre(usuario);

      if (!idTexto || !Number.isSafeInteger(id) || id <= 0) {
        setMensaje("No hay un condominio válido seleccionado.");
        setCargando(false);
        return;
      }

      try {
        const config = await supabase
          .from("gas_configuracion")
          .select("modalidad")
          .eq("condominio_id", id)
          .maybeSingle();

        if (config.error) throw new Error(config.error.message);

        if (config.data?.modalidad !== "CON_MEDIDORES") {
          if (vigente) {
            setMensaje(
              "Este condominio opera sin medidores. Utilice el módulo tradicional de Gas."
            );
          }
          return;
        }

        const permiso = await supabase.rpc("vam_puede_administrar_medidores", {
          p_condominio_id: id,
        });

        if (permiso.error) throw new Error(permiso.error.message);

        if (permiso.data !== true) {
          if (vigente) {
            setMensaje(
              "Su cuenta no tiene permiso administrativo para registrar lecturas de este condominio."
            );
          }
          return;
        }

        await cargarTodo(id);

        if (vigente) {
          setCondominioId(id);
          setAutorizado(true);
        }
      } catch (error) {
        if (vigente) {
          setMensaje(
            "No fue posible abrir Lecturas de Gas: " + mensajeError(error)
          );
        }
      } finally {
        if (vigente) setCargando(false);
      }
    }

    void iniciar();

    return () => {
      vigente = false;
    };
  }, []);

  const filas = useMemo<MedidorFila[]>(() => {
    const mapaUnidades = new Map(unidades.map((u) => [u.id, u]));
    const mapaTanques = new Map(tanques.map((t) => [t.id, t]));
    const mapaMedidas = new Map(medidas.map((m) => [m.id, m]));

    return medidores.map((medidor) => {
      const lecturaPeriodo =
        lecturas.find(
          (l) =>
            l.medidor_id === medidor.id &&
            l.periodo.slice(0, 7) === periodo.slice(0, 7) &&
            l.estado !== "ANULADA"
        ) || null;

      const anteriores = lecturas
        .filter(
          (l) =>
            l.medidor_id === medidor.id &&
            l.periodo < primerDiaMes(periodo) &&
            l.estado !== "ANULADA"
        )
        .sort((a, b) => {
          const porPeriodo = b.periodo.localeCompare(a.periodo);
          if (porPeriodo !== 0) return porPeriodo;
          return b.id - a.id;
        });

      const ultima = anteriores[0] || null;

      return {
        medidor,
        unidad: mapaUnidades.get(medidor.unidad_id) || null,
        tanque: mapaTanques.get(medidor.tanque_id) || null,
        medida: mapaMedidas.get(medidor.unidad_medida_id) || null,
        lecturaPeriodo,
        lecturaAnterior: ultima
          ? Number(ultima.lectura_actual)
          : Number(medidor.lectura_inicial),
        fechaAnterior: ultima
          ? ultima.fecha_lectura
          : medidor.fecha_lectura_inicial,
      };
    });
  }, [medidores, unidades, tanques, medidas, lecturas, periodo]);

  const filasFiltradas = useMemo(() => {
    let lista = filas;

    if (filtro === "PENDIENTES") {
      lista = lista.filter((f) => !f.lecturaPeriodo);
    }

    if (filtro === "REALIZADAS") {
      lista = lista.filter((f) => !!f.lecturaPeriodo);
    }

    const texto = buscar.trim().toLowerCase();

    if (texto) {
      lista = lista.filter((f) => {
        const cadena = `
          ${f.unidad?.codigo || ""}
          ${f.medidor.numero_serie || ""}
          ${f.tanque?.nombre || ""}
          ${f.medida?.nombre || ""}
          ${f.medida?.abreviatura || ""}
        `.toLowerCase();

        return cadena.includes(texto);
      });
    }

    return lista;
  }, [filas, filtro, buscar]);

  const totalRealizadas = filas.filter((f) => !!f.lecturaPeriodo).length;
  const totalPendientes = filas.length - totalRealizadas;
  const totalConsumo = filas.reduce(
    (sum, f) => sum + Number(f.lecturaPeriodo?.consumo || 0),
    0
  );
  const totalRevision = filas.filter(
    (f) => f.lecturaPeriodo?.estado === "EN_REVISION"
  ).length;

  function abrirLectura(fila: MedidorFila) {
    if (fila.lecturaPeriodo) {
      setMensaje(
        `El medidor ${fila.medidor.numero_serie} ya tiene una lectura registrada para ${mesTexto(
          periodo
        )}.`
      );
      return;
    }

    setMedidorSeleccionado(fila);
    setLecturaActual("");
    setFechaLectura(hoyLocal());
    setObservacion("");
    setFoto(null);
    setMensaje("");
    setExito("");

    if (fotoRef.current) fotoRef.current.value = "";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cerrarFormulario() {
    setMedidorSeleccionado(null);
    setLecturaActual("");
    setObservacion("");
    setFoto(null);
    setFechaLectura(hoyLocal());

    if (fotoRef.current) fotoRef.current.value = "";
  }

  function seleccionarSiguiente() {
    if (!medidorSeleccionado) return;

    const pendientes = filas.filter((f) => !f.lecturaPeriodo);
    const indice = pendientes.findIndex(
      (f) => f.medidor.id === medidorSeleccionado.medidor.id
    );

    const siguiente =
      indice >= 0 && indice + 1 < pendientes.length
        ? pendientes[indice + 1]
        : null;

    if (siguiente) {
      setMedidorSeleccionado(siguiente);
      setLecturaActual("");
      setObservacion("");
      setFoto(null);
      setFechaLectura(hoyLocal());

      if (fotoRef.current) fotoRef.current.value = "";
    } else {
      cerrarFormulario();
    }
  }

  async function subirFoto(
    archivo: File,
    id: number,
    medidorId: number
  ): Promise<string> {
    const extension = archivo.name.split(".").pop()?.toLowerCase() || "jpg";
    const ruta = `${id}/lecturas-medidores/${periodo.slice(
      0,
      7
    )}/medidor-${medidorId}-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from("fotos-gas")
      .upload(ruta, archivo, {
        upsert: false,
        contentType: archivo.type || undefined,
      });

    if (error) throw new Error("No se pudo subir la foto: " + error.message);

    const { data } = supabase.storage.from("fotos-gas").getPublicUrl(ruta);
    return data.publicUrl;
  }

  async function guardarLectura(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (
      !autorizado ||
      !condominioId ||
      !medidorSeleccionado ||
      guardando
    ) {
      return;
    }

    setMensaje("");
    setExito("");

    const actualTexto = lecturaActual.trim();
    const actual = Number(actualTexto);
    const anterior = medidorSeleccionado.lecturaAnterior;

    if (
      !actualTexto ||
      !Number.isFinite(actual) ||
      actual < 0 ||
      !/^\d+(\.\d{1,4})?$/.test(actualTexto)
    ) {
      setMensaje("Digite una lectura actual válida, con hasta cuatro decimales.");
      return;
    }

    if (actual < anterior) {
      setMensaje(
        `La lectura actual no puede ser menor que ${numero(
          anterior
        )}. Si el medidor fue sustituido, utilice primero el proceso de sustitución.`
      );
      return;
    }

    if (!fechaLectura) {
      setMensaje("Indique la fecha de lectura.");
      return;
    }

    if (fechaLectura < medidorSeleccionado.fechaAnterior) {
      setMensaje(
        `La fecha no puede ser anterior a ${fechaDO(
          medidorSeleccionado.fechaAnterior
        )}.`
      );
      return;
    }

    const consumoVista = actual - anterior;

    const confirmar = confirm(
      `¿Registrar la lectura de ${
        medidorSeleccionado.unidad?.codigo || "la unidad"
      }?\n\nAnterior: ${numero(anterior)}\nActual: ${numero(
        actual
      )}\nConsumo estimado: ${numero(consumoVista)} ${
        medidorSeleccionado.medida?.abreviatura || ""
      }`
    );

    if (!confirmar) return;

    setGuardando(true);

    try {
      let fotoUrl: string | null = null;

      if (foto) {
        fotoUrl = await subirFoto(
          foto,
          condominioId,
          medidorSeleccionado.medidor.id
        );
      }

      /*
       * lectura_anterior, fecha_lectura_anterior y consumo son requeridos
       * por la tabla, pero el trigger los recalcula antes de validar el INSERT.
       * Los valores enviados aquí son únicamente marcadores no negativos.
       */
      const { data, error } = await supabase
        .from("gas_lecturas")
        .insert({
          condominio_id: condominioId,
          medidor_id: medidorSeleccionado.medidor.id,
          unidad_id: medidorSeleccionado.medidor.unidad_id,
          tanque_id: medidorSeleccionado.medidor.tanque_id,
          unidad_medida_id: medidorSeleccionado.medidor.unidad_medida_id,
          periodo: primerDiaMes(periodo),
          fecha_lectura: fechaLectura,
          fecha_lectura_anterior: medidorSeleccionado.fechaAnterior,
          lectura_anterior: anterior,
          lectura_actual: actual,
          consumo: consumoVista,
          foto_medidor_url: fotoUrl,
          responsable_nombre: responsableNombre.trim() || null,
          observacion: observacion.trim() || null,
          estado: "REGISTRADA",
        })
        .select(
          "id,lectura_anterior,lectura_actual,consumo,fecha_lectura_anterior,fecha_lectura,estado"
        )
        .single();

      if (error) throw new Error(error.message);

      await cargarLecturas(condominioId);

      setExito(
        `Lectura registrada correctamente. Consumo confirmado por el sistema: ${numero(
          Number(data.consumo)
        )} ${medidorSeleccionado.medida?.abreviatura || ""}.`
      );

      seleccionarSiguiente();
    } catch (error) {
      setMensaje("No se pudo registrar la lectura: " + mensajeError(error));
    } finally {
      setGuardando(false);
    }
  }

  async function actualizar() {
    if (!condominioId || !autorizado || cargando) return;

    setCargando(true);
    setMensaje("");
    setExito("");

    try {
      await cargarTodo(condominioId);
    } catch (error) {
      setMensaje("No se pudo actualizar: " + mensajeError(error));
    } finally {
      setCargando(false);
    }
  }

  function cambiarPeriodo(e: ChangeEvent<HTMLInputElement>) {
    const valor = e.target.value;
    if (!valor) return;

    setPeriodo(`${valor}-01`);
    cerrarFormulario();
    setMensaje("");
    setExito("");
  }

  const consumoVista =
    medidorSeleccionado && lecturaActual.trim() !== ""
      ? Number(lecturaActual) - medidorSeleccionado.lecturaAnterior
      : 0;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-orange-700 uppercase tracking-wide">
                Módulo de Gas
              </p>

              <h1 className="text-3xl font-black text-slate-900 mt-1">
                Lecturas de Gas
              </h1>

              <p className="text-xs text-slate-400 mt-1">
                Lecturas de Gas · v{VERSION}
              </p>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Registro mensual de lecturas de medidores individuales. La
                lectura anterior y el consumo son calculados y validados
                automáticamente por VAM.
              </p>

              <p className="text-sm text-blue-700 font-bold mt-3">
                Condominio activo: {condominioNombre || "No seleccionado"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/gas"
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold"
              >
                Volver a Gas
              </Link>

              <button
                type="button"
                onClick={actualizar}
                disabled={!autorizado || cargando}
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl font-bold disabled:opacity-60"
              >
                Actualizar
              </button>
            </div>
          </div>
        </section>

        {mensaje && (
          <div
            className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-bold"
            role="alert"
          >
            {mensaje}
          </div>
        )}

        {exito && (
          <div
            className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 text-sm font-bold"
            role="status"
          >
            {exito}
          </div>
        )}

        {cargando && (
          <section className="bg-white rounded-3xl border shadow-sm p-8 text-center text-slate-500">
            Cargando lecturas...
          </section>
        )}

        {!cargando && autorizado && (
          <>
            <section className="bg-white rounded-3xl border shadow-sm p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Período de lectura
                  </label>

                  <input
                    type="month"
                    value={periodo.slice(0, 7)}
                    onChange={cambiarPeriodo}
                    className="border rounded-xl px-4 py-3 w-full bg-white"
                  />

                  <p className="text-xs text-slate-500 mt-1 capitalize">
                    {mesTexto(periodo)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Buscar
                  </label>

                  <input
                    type="text"
                    value={buscar}
                    onChange={(e) => setBuscar(e.target.value)}
                    className="border rounded-xl px-4 py-3 w-full"
                    placeholder="Apartamento o medidor..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Mostrar
                  </label>

                  <select
                    value={filtro}
                    onChange={(e) =>
                      setFiltro(
                        e.target.value as
                          | "TODOS"
                          | "PENDIENTES"
                          | "REALIZADAS"
                      )
                    }
                    className="border rounded-xl px-4 py-3 w-full bg-white"
                  >
                    <option value="PENDIENTES">Pendientes</option>
                    <option value="REALIZADAS">Realizadas</option>
                    <option value="TODOS">Todas</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-white rounded-2xl border shadow-sm p-4">
                <p className="text-xs text-slate-500">Medidores activos</p>
                <p className="text-2xl font-black text-slate-900">
                  {filas.length}
                </p>
              </div>

              <div className="bg-white rounded-2xl border shadow-sm p-4">
                <p className="text-xs text-slate-500">Realizadas</p>
                <p className="text-2xl font-black text-green-700">
                  {totalRealizadas}
                </p>
              </div>

              <div className="bg-white rounded-2xl border shadow-sm p-4">
                <p className="text-xs text-slate-500">Pendientes</p>
                <p className="text-2xl font-black text-orange-700">
                  {totalPendientes}
                </p>
              </div>

              <div className="bg-white rounded-2xl border shadow-sm p-4">
                <p className="text-xs text-slate-500">En revisión</p>
                <p className="text-2xl font-black text-red-700">
                  {totalRevision}
                </p>
              </div>

              <div className="bg-white rounded-2xl border shadow-sm p-4 col-span-2 lg:col-span-1">
                <p className="text-xs text-slate-500">Consumo del período</p>
                <p className="text-2xl font-black text-blue-700">
                  {numero(totalConsumo)}
                </p>
                <p className="text-[11px] text-slate-400">
                  Suma informativa de las unidades registradas
                </p>
              </div>
            </section>

            {medidorSeleccionado && (
              <section className="bg-white rounded-3xl border-2 border-orange-300 shadow-sm p-5 md:p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
                      Registrar lectura
                    </p>

                    <h2 className="text-2xl font-black text-slate-900 mt-1">
                      {medidorSeleccionado.unidad?.codigo || "Unidad"}
                    </h2>

                    <p className="text-sm text-slate-500 mt-1">
                      Medidor {medidorSeleccionado.medidor.numero_serie}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={cerrarFormulario}
                    className="bg-slate-100 hover:bg-slate-200 border px-4 py-2 rounded-xl font-bold"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                  <div className="rounded-2xl bg-slate-50 border p-4">
                    <p className="text-xs text-slate-500">Lectura anterior</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">
                      {numero(medidorSeleccionado.lecturaAnterior)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {medidorSeleccionado.medida?.abreviatura || ""}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border p-4">
                    <p className="text-xs text-slate-500">Fecha anterior</p>
                    <p className="text-lg font-black text-slate-900 mt-1">
                      {fechaDO(medidorSeleccionado.fechaAnterior)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border p-4">
                    <p className="text-xs text-slate-500">Tanque</p>
                    <p className="text-sm font-black text-slate-900 mt-1">
                      {medidorSeleccionado.tanque?.nombre || "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border p-4">
                    <p className="text-xs text-slate-500">Unidad de medida</p>
                    <p className="text-sm font-black text-slate-900 mt-1">
                      {medidorSeleccionado.medida?.nombre || "-"}{" "}
                      {medidorSeleccionado.medida?.abreviatura
                        ? `(${medidorSeleccionado.medida.abreviatura})`
                        : ""}
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={guardarLectura}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5"
                >
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      Lectura actual *
                    </label>

                    <input
                      type="number"
                      inputMode="decimal"
                      value={lecturaActual}
                      onChange={(e) => setLecturaActual(e.target.value)}
                      className="border-2 border-orange-200 focus:border-orange-500 rounded-xl px-4 py-4 w-full text-2xl font-black"
                      placeholder="0.0000"
                      min="0"
                      step="0.0001"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      Fecha de lectura *
                    </label>

                    <input
                      type="date"
                      value={fechaLectura}
                      onChange={(e) => setFechaLectura(e.target.value)}
                      className="border rounded-xl px-4 py-4 w-full"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div
                      className={`rounded-2xl border p-4 ${
                        lecturaActual &&
                        Number.isFinite(Number(lecturaActual)) &&
                        consumoVista >= 0
                          ? "bg-green-50 border-green-200"
                          : "bg-slate-50"
                      }`}
                    >
                      <p className="text-xs text-slate-500">
                        Consumo estimado
                      </p>

                      <p className="text-3xl font-black text-green-700 mt-1">
                        {lecturaActual &&
                        Number.isFinite(Number(lecturaActual)) &&
                        consumoVista >= 0
                          ? numero(consumoVista)
                          : "—"}{" "}
                        <span className="text-base">
                          {medidorSeleccionado.medida?.abreviatura || ""}
                        </span>
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        El cálculo definitivo será validado nuevamente por
                        Supabase al guardar.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      Foto del medidor
                    </label>

                    <input
                      ref={fotoRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => setFoto(e.target.files?.[0] || null)}
                      className="border rounded-xl px-4 py-3 w-full bg-white"
                    />

                    <p className="text-xs text-slate-500 mt-1">
                      Desde el celular puede abrir directamente la cámara.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      Observación
                    </label>

                    <textarea
                      value={observacion}
                      onChange={(e) => setObservacion(e.target.value)}
                      className="border rounded-xl px-4 py-3 w-full"
                      rows={3}
                      placeholder="Opcional..."
                    />
                  </div>

                  <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
                    <button
                      type="submit"
                      disabled={guardando}
                      className="bg-orange-700 hover:bg-orange-800 text-white px-6 py-4 rounded-xl font-black disabled:opacity-60"
                    >
                      {guardando
                        ? "Guardando..."
                        : "Guardar lectura y continuar"}
                    </button>

                    <button
                      type="button"
                      onClick={cerrarFormulario}
                      disabled={guardando}
                      className="bg-slate-100 hover:bg-slate-200 border px-6 py-4 rounded-xl font-bold disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </section>
            )}

            <section className="bg-white rounded-3xl border shadow-sm overflow-hidden">
              <div className="p-5 border-b">
                <h2 className="text-xl font-black text-slate-900">
                  Medidores del período
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {filasFiltradas.length} registro(s) visibles ·{" "}
                  <span className="capitalize">{mesTexto(periodo)}</span>
                </p>
              </div>

              <div className="md:hidden divide-y">
                {filasFiltradas.map((fila) => (
                  <article key={fila.medidor.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black text-slate-900">
                          {fila.unidad?.codigo || `Unidad ${fila.medidor.unidad_id}`}
                        </h3>

                        <p className="text-sm text-slate-500 mt-1">
                          {fila.medidor.numero_serie}
                        </p>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          fila.lecturaPeriodo
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {fila.lecturaPeriodo ? "Realizada" : "Pendiente"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Anterior</p>
                        <p className="font-black">
                          {numero(fila.lecturaAnterior)}{" "}
                          {fila.medida?.abreviatura || ""}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Actual</p>
                        <p className="font-black">
                          {fila.lecturaPeriodo
                            ? `${numero(fila.lecturaPeriodo.lectura_actual)} ${
                                fila.medida?.abreviatura || ""
                              }`
                            : "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Consumo</p>
                        <p className="font-black text-blue-700">
                          {fila.lecturaPeriodo
                            ? `${numero(fila.lecturaPeriodo.consumo)} ${
                                fila.medida?.abreviatura || ""
                              }`
                            : "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Tanque</p>
                        <p className="font-semibold">
                          {fila.tanque?.nombre || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      {fila.lecturaPeriodo ? (
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs bg-slate-100 px-3 py-2 rounded-lg font-bold">
                            {fechaDO(fila.lecturaPeriodo.fecha_lectura)}
                          </span>

                          {fila.lecturaPeriodo.foto_medidor_url && (
                            <a
                              href={fila.lecturaPeriodo.foto_medidor_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-blue-700 text-white px-3 py-2 rounded-lg font-bold"
                            >
                              Ver foto
                            </a>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => abrirLectura(fila)}
                          className="w-full bg-orange-700 hover:bg-orange-800 text-white px-4 py-3 rounded-xl font-black"
                        >
                          Registrar lectura
                        </button>
                      )}
                    </div>
                  </article>
                ))}

                {filasFiltradas.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    No hay medidores que coincidan con el filtro.
                  </div>
                )}
              </div>

              <div className="hidden md:block overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3 border text-left">Apartamento</th>
                      <th className="p-3 border text-left">Medidor</th>
                      <th className="p-3 border text-right">Anterior</th>
                      <th className="p-3 border text-right">Actual</th>
                      <th className="p-3 border text-right">Consumo</th>
                      <th className="p-3 border text-left">Lectura</th>
                      <th className="p-3 border text-center">Estado</th>
                      <th className="p-3 border text-center">Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filasFiltradas.map((fila) => (
                      <tr key={fila.medidor.id} className="hover:bg-slate-50">
                        <td className="p-3 border font-black">
                          {fila.unidad?.codigo || "-"}
                        </td>

                        <td className="p-3 border">
                          <p className="font-semibold">
                            {fila.medidor.numero_serie}
                          </p>
                          <p className="text-xs text-slate-500">
                            {fila.medida?.abreviatura || ""}
                          </p>
                        </td>

                        <td className="p-3 border text-right">
                          {numero(fila.lecturaAnterior)}
                        </td>

                        <td className="p-3 border text-right font-bold">
                          {fila.lecturaPeriodo
                            ? numero(fila.lecturaPeriodo.lectura_actual)
                            : "—"}
                        </td>

                        <td className="p-3 border text-right font-black text-blue-700">
                          {fila.lecturaPeriodo
                            ? numero(fila.lecturaPeriodo.consumo)
                            : "—"}
                        </td>

                        <td className="p-3 border">
                          {fila.lecturaPeriodo
                            ? fechaDO(fila.lecturaPeriodo.fecha_lectura)
                            : "Pendiente"}
                        </td>

                        <td className="p-3 border text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              fila.lecturaPeriodo
                                ? fila.lecturaPeriodo.estado === "EN_REVISION"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {fila.lecturaPeriodo
                              ? fila.lecturaPeriodo.estado
                              : "PENDIENTE"}
                          </span>
                        </td>

                        <td className="p-3 border text-center">
                          {fila.lecturaPeriodo ? (
                            <div className="flex flex-wrap justify-center gap-2">
                              {fila.lecturaPeriodo.foto_medidor_url && (
                                <a
                                  href={fila.lecturaPeriodo.foto_medidor_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-bold"
                                >
                                  Foto
                                </a>
                              )}

                              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold">
                                Registrada
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => abrirLectura(fila)}
                              className="bg-orange-700 hover:bg-orange-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                            >
                              Registrar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}

                    {filasFiltradas.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-8 border text-center text-slate-500"
                        >
                          No hay medidores que coincidan con el filtro.
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
