"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Filter,
  ListChecks,
  Pencil,
  RefreshCw,
  Save,
  Search,
  SearchCheck,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type TipoPeriodo = "TODOS" | "MES" | "RANGO";

type BancoRow = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  fecha_posteo: string;
  monto_transaccion: number;
  no_serial: string | null;
  descripcion: string;
  estado?: string | null;
  unidad_id: number | null;
  apartamento: string | null;
  propietario: string | null;
  periodo: string | null;
};

type AliasRow = {
  id: number;
  condominio_id: number;
  unidad_id: number | null;
  no_apartamento: string;
  propietario: string | null;
  descripcion_banco: string;
  estado: string | null;
};

type UnidadRow = {
  id: number;
  condominio_id: number;
  codigo: string;
  propietario_nombre: string;
  activa: boolean;
};

type PagoIdentificadoRow = {
  id: number;
  archivo_banco_id: number;
  condominio_id: number;
  unidad_id: number | null;
  apartamento: string | null;
  no_apartamento: string | null;
  propietario: string | null;
  fecha_posteo: string | null;
  monto: number | null;
  monto_transaccion: number | null;
  no_serial: string | null;
  descripcion_banco: string | null;
  tipo_pago: string | null;
  periodo: string | null;
  estado: string | null;
  observacion: string | null;
};

type PagoMovilRow = {
  id: number;
  condominio_id: number;
  unidad_id: number | null;
  no_apartamento: string | null;
  monto: number | null;
  fecha_pago: string | null;
  estado: string | null;
};

type ResultadoRow = BancoRow & {
  alias_id: number | null;
  unidad_id: number | null;
  apartamento_identificado: string;
  propietario_identificado: string;
  alias_registrado: string;
  metodo_identificacion: string;
  puntos_coincidencia: number;
  estado_identificacion: "Identificado" | "Revisar";
  guardado_en_pagos_identificados: boolean;
};

function obtenerMesActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function limpiarTexto(texto: string | null | undefined) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarCodigo(valor: string | null | undefined) {
  return limpiarTexto(valor).replace(/\s+/g, "").replace(/-/g, "");
}

function escaparRegex(texto: string) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function obtenerPalabrasClave(texto: string) {
  const palabrasIgnoradas = [
    "pago", "pgo", "pag", "pagos", "transferencia", "transf",
    "deposito", "depositos", "depósito", "depósitos", "mantenimiento",
    "mant", "mto", "condominio", "residencial", "colinas", "oeste",
    "lote", "rd", "rd$", "dop", "del", "de", "la", "el", "los",
    "las", "por", "para", "desde", "cta", "cuenta", "banco",
    "popular", "bpd", "ach", "lbtr", "internet", "movil", "mobile",
    "canal", "servicio", "servicios", "concepto", "referencia", "debito",
    "credito", "crédito", "enero", "febrero", "marzo", "abril", "mayo",
    "junio", "julio", "agosto", "septiembre", "setiembre", "octubre",
    "noviembre", "diciembre",
  ];

  return limpiarTexto(texto)
    .split(" ")
    .map((p) => p.trim())
    .filter((p) => p.length >= 2)
    .filter((p) => !palabrasIgnoradas.includes(p))
    .filter((p) => !/^\d{4}$/.test(p));
}

function buscarUnidadPorCodigo(
  codigoOriginal: string | null | undefined,
  unidades: UnidadRow[],
) {
  const codigo = normalizarCodigo(codigoOriginal);
  if (!codigo) return null;

  const exacta = unidades.find(
    (unidad) => normalizarCodigo(unidad.codigo) === codigo,
  );
  if (exacta) return exacta;

  const candidatas = unidades.filter((unidad) => {
    const codigoUnidad = normalizarCodigo(unidad.codigo);
    return codigoUnidad.includes(codigo) || codigo.includes(codigoUnidad);
  });

  return candidatas.length === 1 ? candidatas[0] : null;
}

function buscarUnidadEnDescripcion(
  descripcionOriginal: string,
  unidades: UnidadRow[],
) {
  const descripcion = limpiarTexto(descripcionOriginal || "");
  if (!descripcion) return null;

  const unidadesOrdenadas = [...unidades].sort((a, b) => {
    const codigoA = limpiarTexto(a.codigo || "");
    const codigoB = limpiarTexto(b.codigo || "");
    return codigoB.length - codigoA.length;
  });

  return (
    unidadesOrdenadas.find((unidad) => {
      const codigo = limpiarTexto(unidad.codigo || "");
      if (!codigo) return false;

      const patron = new RegExp(`(^|\\s)${escaparRegex(codigo)}(\\s|$)`, "i");
      return patron.test(descripcion);
    }) || null
  );
}

function calcularCoincidenciaAlias(
  descripcionBancoOriginal: string,
  alias: AliasRow,
) {
  const descripcionBanco = limpiarTexto(descripcionBancoOriginal || "");
  const aliasTexto = limpiarTexto(alias.descripcion_banco || "");
  const apartamento = limpiarTexto(alias.no_apartamento || "");
  const propietario = limpiarTexto(alias.propietario || "");

  if (!descripcionBanco || !aliasTexto) return 0;
  if (descripcionBanco.includes(aliasTexto)) return 100;
  if (descripcionBanco.length >= 8 && aliasTexto.includes(descripcionBanco)) return 95;

  let puntos = 0;
  const palabrasAlias = obtenerPalabrasClave(aliasTexto);
  const palabrasPropietario = obtenerPalabrasClave(propietario);

  if (palabrasAlias.length > 0) {
    const encontradas = palabrasAlias.filter((palabra) =>
      descripcionBanco.includes(palabra),
    );
    const porcentaje = encontradas.length / palabrasAlias.length;
    puntos += Math.round(porcentaje * 75);
    if (porcentaje === 1) puntos += 10;
  }

  if (palabrasPropietario.length > 0) {
    const encontradas = palabrasPropietario.filter((palabra) =>
      descripcionBanco.includes(palabra),
    );
    const porcentaje = encontradas.length / palabrasPropietario.length;
    puntos += Math.round(porcentaje * 20);
    if (porcentaje === 1) puntos += 10;
  }

  if (apartamento) {
    const patron = new RegExp(
      `(^|\\s)${escaparRegex(apartamento)}(\\s|$)`,
      "i",
    );
    if (patron.test(descripcionBanco)) puntos += 20;
  }

  return Math.min(puntos, 100);
}

function buscarMejorAlias(descripcionBanco: string, aliasRows: AliasRow[]) {
  return (
    aliasRows
      .map((alias) => ({
        alias,
        puntos: calcularCoincidenciaAlias(descripcionBanco, alias),
      }))
      .filter((item) => item.puntos >= 60)
      .sort((a, b) => {
        if (b.puntos !== a.puntos) return b.puntos - a.puntos;
        return (
          limpiarTexto(b.alias.descripcion_banco || "").length -
          limpiarTexto(a.alias.descripcion_banco || "").length
        );
      })[0] || null
  );
}

function formatearMoneda(valor: number | null | undefined) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(valor || 0));
}

function obtenerPeriodo(fecha: string | null | undefined) {
  if (!fecha) return "";
  return String(fecha).slice(0, 7);
}

function fechaISO(fecha: string | null | undefined) {
  if (!fecha) return "";
  return String(fecha).slice(0, 10);
}

function montoIgual(a: number | null, b: number | null) {
  return Number(a || 0).toFixed(2) === Number(b || 0).toFixed(2);
}

function estadoPendienteMovil(estado: string | null) {
  const e = limpiarTexto(estado || "Pendiente");
  return e === "pendiente" || e === "reportado" || e === "en revision";
}

function fechaCorta(valor?: string | null) {
  if (!valor) return "-";
  return String(valor).split("T")[0];
}

export default function IdentificarPagosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [resultado, setResultado] = useState<ResultadoRow[]>([]);
  const [unidades, setUnidades] = useState<UnidadRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardandoManual, setGuardandoManual] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>("TODOS");
  const [mesFiltro, setMesFiltro] = useState(obtenerMesActual());
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [editando, setEditando] = useState<ResultadoRow | null>(null);
  const [editUnidadId, setEditUnidadId] = useState("");
  const [editApartamento, setEditApartamento] = useState("");
  const [editPropietario, setEditPropietario] = useState("");
  const [editObservacion, setEditObservacion] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarDatos(id);
    } else {
      setLoading(false);
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
    }
  }, []);

  async function cargarDatos(id: string) {
    setLoading(true);

    const [bancoResultado, unidadesResultado, aliasResultado, pagosResultado] =
      await Promise.all([
        supabase
          .from("archivo_banco")
          .select(
            "id, condominio_id, condominio, fecha_posteo, monto_transaccion, no_serial, descripcion, estado, unidad_id, apartamento, propietario, periodo",
          )
          .eq("condominio_id", Number(id))
          .order("fecha_posteo", { ascending: false }),
        supabase
          .from("unidades")
          .select("id, condominio_id, codigo, propietario_nombre, activa")
          .eq("condominio_id", Number(id))
          .eq("activa", true)
          .order("codigo", { ascending: true }),
        supabase
          .from("apartamento_banco_alias")
          .select(
            "id, condominio_id, unidad_id, no_apartamento, propietario, descripcion_banco, estado",
          )
          .eq("condominio_id", Number(id))
          .eq("estado", "Activo")
          .order("no_apartamento", { ascending: true }),
        supabase
          .from("pagos_identificados")
          .select(
            "id, archivo_banco_id, condominio_id, unidad_id, apartamento, no_apartamento, propietario, fecha_posteo, monto, monto_transaccion, no_serial, descripcion_banco, tipo_pago, periodo, estado, observacion",
          )
          .eq("condominio_id", Number(id)),
      ]);

    if (bancoResultado.error) {
      alert("Error cargando archivo_banco: " + bancoResultado.error.message);
      setLoading(false);
      return;
    }

    if (unidadesResultado.error) {
      alert("Error cargando unidades: " + unidadesResultado.error.message);
      setLoading(false);
      return;
    }

    if (aliasResultado.error) {
      alert("Error cargando alias bancarios: " + aliasResultado.error.message);
      setLoading(false);
      return;
    }

    if (pagosResultado.error) {
      alert("Error cargando pagos_identificados: " + pagosResultado.error.message);
      setLoading(false);
      return;
    }

    const unidadesData = (unidadesResultado.data || []) as UnidadRow[];
    setUnidades(unidadesData);

    compararDatos(
      (bancoResultado.data || []) as BancoRow[],
      (aliasResultado.data || []) as AliasRow[],
      unidadesData,
      (pagosResultado.data || []) as PagoIdentificadoRow[],
    );

    setLoading(false);
  }

  function compararDatos(
    bancoRows: BancoRow[],
    aliasRows: AliasRow[],
    unidadesRows: UnidadRow[],
    pagosRows: PagoIdentificadoRow[],
  ) {
    const pagosPorArchivo = new Map<number, PagoIdentificadoRow>();

    pagosRows.forEach((pago) => {
      if (pago.archivo_banco_id) {
        pagosPorArchivo.set(Number(pago.archivo_banco_id), pago);
      }
    });

    const aliasOrdenados = [...aliasRows].sort(
      (a, b) =>
        limpiarTexto(b.descripcion_banco || "").length -
        limpiarTexto(a.descripcion_banco || "").length,
    );

    const resultadoComparado: ResultadoRow[] = bancoRows.map((item) => {
      const pagoGuardado = pagosPorArchivo.get(item.id);

      // 1. Si ya está en pagos_identificados, conservarlo como identificado.
      if (pagoGuardado) {
        const apartamentoGuardado =
          pagoGuardado.no_apartamento || pagoGuardado.apartamento || "";

        return {
          ...item,
          alias_id: null,
          unidad_id: pagoGuardado.unidad_id || item.unidad_id || null,
          apartamento_identificado:
            apartamentoGuardado || item.apartamento || "",
          propietario_identificado:
            pagoGuardado.propietario || item.propietario || "",
          alias_registrado:
            pagoGuardado.observacion || "Registro guardado en pagos_identificados",
          metodo_identificacion: "Pago ya guardado",
          puntos_coincidencia: 100,
          estado_identificacion: "Identificado",
          guardado_en_pagos_identificados: true,
        };
      }

      // 2. Respetar la identificación que ya fue realizada al cargar el archivo.
      const unidadPorId = item.unidad_id
        ? unidadesRows.find(
            (unidad) => Number(unidad.id) === Number(item.unidad_id),
          ) || null
        : null;

      const unidadPorApartamento = buscarUnidadPorCodigo(
        item.apartamento,
        unidadesRows,
      );

      const unidadArchivo = unidadPorId || unidadPorApartamento;

      if (unidadArchivo && (item.apartamento || unidadArchivo.codigo)) {
        return {
          ...item,
          alias_id: null,
          unidad_id: unidadArchivo.id,
          apartamento_identificado:
            item.apartamento || unidadArchivo.codigo || "",
          propietario_identificado:
            item.propietario || unidadArchivo.propietario_nombre || "",
          alias_registrado:
            "Identificación existente en archivo_banco desde la importación",
          metodo_identificacion: "Identificado en archivo bancario",
          puntos_coincidencia: 100,
          estado_identificacion: "Identificado",
          guardado_en_pagos_identificados: false,
        };
      }

      // 3. Si no estaba identificado en archivo_banco, intentar por descripción.
      const unidadDetectada = buscarUnidadEnDescripcion(
        item.descripcion || "",
        unidadesRows,
      );

      if (unidadDetectada) {
        return {
          ...item,
          alias_id: null,
          unidad_id: unidadDetectada.id,
          apartamento_identificado: unidadDetectada.codigo || "",
          propietario_identificado: unidadDetectada.propietario_nombre || "",
          alias_registrado:
            "Identificado por número de apartamento en descripción",
          metodo_identificacion: "Apartamento en descripción",
          puntos_coincidencia: 100,
          estado_identificacion: "Identificado",
          guardado_en_pagos_identificados: false,
        };
      }

      // 4. Intentar por alias bancario.
      const evaluado = buscarMejorAlias(item.descripcion || "", aliasOrdenados);

      if (evaluado?.alias) {
        const encontrado = evaluado.alias;
        const unidadAlias = encontrado.unidad_id
          ? unidadesRows.find(
              (unidad) => Number(unidad.id) === Number(encontrado.unidad_id),
            ) || null
          : null;

        return {
          ...item,
          alias_id: encontrado.id,
          unidad_id: encontrado.unidad_id || null,
          apartamento_identificado:
            encontrado.no_apartamento || unidadAlias?.codigo || "",
          propietario_identificado:
            encontrado.propietario || unidadAlias?.propietario_nombre || "",
          alias_registrado: encontrado.descripcion_banco || "",
          metodo_identificacion: "Alias banco",
          puntos_coincidencia: evaluado.puntos,
          estado_identificacion: "Identificado",
          guardado_en_pagos_identificados: false,
        };
      }

      // 5. Solo aquí es realmente pendiente.
      return {
        ...item,
        alias_id: null,
        unidad_id: null,
        apartamento_identificado: "Pendiente",
        propietario_identificado: "",
        alias_registrado: "",
        metodo_identificacion: "Sin coincidencia",
        puntos_coincidencia: 0,
        estado_identificacion: "Revisar",
        guardado_en_pagos_identificados: false,
      };
    });

    setResultado(resultadoComparado);
  }

  async function actualizarPagoMovilRecibido(pagosGuardados: PagoIdentificadoRow[]) {
    if (!condominioId || pagosGuardados.length === 0) return;

    const { data: pagosMovilData, error } = await supabase
      .from("pagos_movil")
      .select(
        "id, condominio_id, unidad_id, no_apartamento, monto, fecha_pago, estado",
      )
      .eq("condominio_id", Number(condominioId));

    if (error) {
      console.error(error);
      return;
    }

    const pagosMovil = (pagosMovilData || []) as PagoMovilRow[];

    for (const pago of pagosGuardados) {
      const periodo = pago.periodo || obtenerPeriodo(pago.fecha_posteo || "");
      const montoPago = Number(pago.monto_transaccion || pago.monto || 0);

      const pagoMovil = pagosMovil.find((pm) => {
        const periodoMovil = obtenerPeriodo(pm.fecha_pago || "");
        const mismoApartamento =
          (pm.unidad_id &&
            pago.unidad_id &&
            Number(pm.unidad_id) === Number(pago.unidad_id)) ||
          limpiarTexto(pm.no_apartamento || "") ===
            limpiarTexto(pago.no_apartamento || pago.apartamento || "");

        return (
          estadoPendienteMovil(pm.estado) &&
          mismoApartamento &&
          montoIgual(Number(pm.monto || 0), montoPago) &&
          periodoMovil === periodo
        );
      });

      if (!pagoMovil) continue;

      await supabase
        .from("pagos_movil")
        .update({
          estado: "Recibido",
          fecha_validacion: new Date().toISOString(),
          archivo_banco_id: pago.archivo_banco_id,
          pago_identificado_id: pago.id,
          comentario_admin: "Pago confirmado contra archivo del banco.",
        })
        .eq("id", pagoMovil.id)
        .eq("condominio_id", Number(condominioId));
    }
  }

  function seleccionarUnidadManual(unidadId: string) {
    setEditUnidadId(unidadId);

    if (!unidadId) {
      setEditApartamento("");
      setEditPropietario("");
      return;
    }

    const unidad = unidades.find((item) => String(item.id) === unidadId);

    if (!unidad) return;

    setEditApartamento(unidad.codigo || "");
    setEditPropietario(unidad.propietario_nombre || "");
  }

  function abrirEdicionManual(item: ResultadoRow) {
    setEditando(item);
    setEditUnidadId(item.unidad_id ? String(item.unidad_id) : "");
    setEditApartamento(
      item.apartamento_identificado !== "Pendiente"
        ? item.apartamento_identificado || ""
        : "",
    );
    setEditPropietario(item.propietario_identificado || "");
    setEditObservacion(
      item.estado_identificacion === "Revisar"
        ? "Identificado manualmente desde revisión"
        : "Actualizado manualmente",
    );

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicionManual() {
    setEditando(null);
    setEditUnidadId("");
    setEditApartamento("");
    setEditPropietario("");
    setEditObservacion("");
  }

  async function guardarIdentificacionManual(e: React.FormEvent) {
    e.preventDefault();

    if (!editando || !condominioId) return;

    if (!editUnidadId || !editApartamento || !editPropietario) {
      alert("Debe seleccionar el apartamento correcto.");
      return;
    }

    const pago = {
      archivo_banco_id: editando.id,
      condominio_id: Number(condominioId),
      condominio: editando.condominio || condominioNombre,
      unidad_id: Number(editUnidadId),
      apartamento: editApartamento,
      no_apartamento: editApartamento,
      propietario: editPropietario,
      fecha_posteo: editando.fecha_posteo,
      monto: Number(editando.monto_transaccion || 0),
      monto_transaccion: Number(editando.monto_transaccion || 0),
      no_serial: editando.no_serial,
      descripcion_banco: editando.descripcion,
      tipo_pago: "Mantenimiento",
      periodo: editando.periodo || obtenerPeriodo(editando.fecha_posteo),
      estado: "Identificado",
      observacion:
        editObservacion ||
        `Identificado manualmente | Apartamento: ${editApartamento}`,
    };

    if (
      !confirm(
        `Se guardará la identificación para el apartamento ${editApartamento}. ¿Desea continuar?`,
      )
    ) {
      return;
    }

    setGuardandoManual(true);

    const { data: pagoGuardado, error: errorPago } = await supabase
      .from("pagos_identificados")
      .upsert([pago], { onConflict: "archivo_banco_id" })
      .select(
        "id, archivo_banco_id, condominio_id, unidad_id, apartamento, no_apartamento, propietario, fecha_posteo, monto, monto_transaccion, no_serial, descripcion_banco, tipo_pago, periodo, estado, observacion",
      )
      .single();

    if (errorPago) {
      setGuardandoManual(false);
      alert("Error guardando pago identificado: " + errorPago.message);
      return;
    }

    await supabase
      .from("archivo_banco")
      .update({
        estado: "Identificado",
        unidad_id: Number(editUnidadId),
        apartamento: editApartamento,
        propietario: editPropietario,
      })
      .eq("id", editando.id)
      .eq("condominio_id", Number(condominioId));

    await actualizarPagoMovilRecibido([pagoGuardado as PagoIdentificadoRow]);

    setGuardandoManual(false);
    cancelarEdicionManual();
    await cargarDatos(condominioId);
  }

  async function guardarPagosIdentificados() {
    if (!condominioId) return;

    // Solo guardamos identificados que todavía no existen en pagos_identificados.
    const nuevosIdentificados = resultado.filter(
      (r) =>
        r.estado_identificacion === "Identificado" &&
        !r.guardado_en_pagos_identificados &&
        Boolean(r.unidad_id) &&
        Boolean(r.apartamento_identificado) &&
        r.apartamento_identificado !== "Pendiente",
    );

    if (nuevosIdentificados.length === 0) {
      alert("No hay nuevas identificaciones pendientes de guardar.");
      return;
    }

    const pagos = nuevosIdentificados.map((r) => ({
      archivo_banco_id: r.id,
      condominio_id: Number(condominioId),
      condominio: r.condominio || condominioNombre,
      unidad_id: r.unidad_id,
      apartamento: r.apartamento_identificado,
      no_apartamento: r.apartamento_identificado,
      propietario: r.propietario_identificado,
      fecha_posteo: r.fecha_posteo,
      monto: Number(r.monto_transaccion || 0),
      monto_transaccion: Number(r.monto_transaccion || 0),
      no_serial: r.no_serial,
      descripcion_banco: r.descripcion,
      tipo_pago: "Mantenimiento",
      periodo: r.periodo || obtenerPeriodo(r.fecha_posteo),
      estado: "Identificado",
      observacion: `${r.metodo_identificacion} | Coincidencia: ${r.puntos_coincidencia}%`,
    }));

    if (
      !confirm(
        `Se guardarán ${pagos.length} nuevas identificaciones para ${condominioNombre}. ¿Desea continuar?`,
      )
    ) {
      return;
    }

    setGuardando(true);

    const { data: pagosGuardados, error } = await supabase
      .from("pagos_identificados")
      .upsert(pagos, { onConflict: "archivo_banco_id" })
      .select(
        "id, archivo_banco_id, condominio_id, unidad_id, apartamento, no_apartamento, propietario, fecha_posteo, monto, monto_transaccion, no_serial, descripcion_banco, tipo_pago, periodo, estado, observacion",
      );

    if (error) {
      setGuardando(false);
      alert("Error al guardar pagos identificados: " + error.message);
      return;
    }

    const idsIdentificados = nuevosIdentificados.map((r) => r.id);

    await supabase
      .from("archivo_banco")
      .update({ estado: "Identificado" })
      .in("id", idsIdentificados)
      .eq("condominio_id", Number(condominioId));

    await actualizarPagoMovilRecibido(
      (pagosGuardados || []) as PagoIdentificadoRow[],
    );

    setGuardando(false);
    await cargarDatos(condominioId);
  }

  async function refrescar() {
    if (!condominioId) return;
    await cargarDatos(condominioId);
  }

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroEstado("Todos");
    setTipoPeriodo("TODOS");
    setMesFiltro(obtenerMesActual());
    setFechaDesde("");
    setFechaHasta("");
  }

  const resultadoFiltrado = useMemo(() => {
    const textoBusqueda = busqueda.toLowerCase().trim();

    return resultado.filter((item) => {
      const texto = `${item.fecha_posteo || ""} ${item.monto_transaccion || ""} ${
        item.descripcion || ""
      } ${item.apartamento_identificado || ""} ${
        item.propietario_identificado || ""
      } ${item.metodo_identificacion || ""} ${item.estado_identificacion || ""}`
        .toLowerCase()
        .trim();

      const coincideBusqueda = !textoBusqueda || texto.includes(textoBusqueda);
      const coincideEstado =
        filtroEstado === "Todos" || item.estado_identificacion === filtroEstado;

      const fecha = fechaISO(item.fecha_posteo);
      let coincidePeriodo = true;

      if (tipoPeriodo === "MES") {
        coincidePeriodo = Boolean(mesFiltro) && fecha.slice(0, 7) === mesFiltro;
      }

      if (tipoPeriodo === "RANGO") {
        if (fechaDesde) coincidePeriodo = coincidePeriodo && fecha >= fechaDesde;
        if (fechaHasta) coincidePeriodo = coincidePeriodo && fecha <= fechaHasta;
      }

      return coincideBusqueda && coincideEstado && coincidePeriodo;
    });
  }, [
    resultado,
    busqueda,
    filtroEstado,
    tipoPeriodo,
    mesFiltro,
    fechaDesde,
    fechaHasta,
  ]);

  const resumen = useMemo(() => {
    const identificados = resultadoFiltrado.filter(
      (r) => r.estado_identificacion === "Identificado",
    );
    const pendientes = resultadoFiltrado.filter(
      (r) => r.estado_identificacion === "Revisar",
    );

    return {
      total: resultadoFiltrado.length,
      identificados: identificados.length,
      pendientes: pendientes.length,
      montoIdentificado: identificados.reduce(
        (total, item) => total + Number(item.monto_transaccion || 0),
        0,
      ),
      montoPendiente: pendientes.reduce(
        (total, item) => total + Number(item.monto_transaccion || 0),
        0,
      ),
    };
  }, [resultadoFiltrado]);

  return (
    <PageContainer>
      <ModuleMenu
        title="Pagos Bancarios"
        subtitle="Importación, identificación y validación de pagos."
        tone="blue"
        items={[
          {
            href: "/archivo-banco/importar",
            label: "Importar banco",
            icon: Banknote,
          },
          {
            href: "/archivo-banco/identificar",
            label: "Identificar pagos",
            icon: SearchCheck,
          },
          {
            href: "/pagos-identificados",
            label: "Pagos identificados",
            icon: ListChecks,
          },
        ]}
      />

      <ModuleToolbar
        title="Identificación de Pagos Bancarios"
        subtitle={`Valida la identificación realizada durante la importación y permite corregir excepciones. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={SearchCheck}
        actions={
          <ModuleActions
            onRefresh={refrescar}
            extra={
              <button
                onClick={guardarPagosIdentificados}
                disabled={guardando || loading || !condominioId}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {guardando ? "Guardando..." : "Guardar identificados"}
              </button>
            }
          />
        }
      />

      {editando && (
        <SectionCard
          title="Actualizar identificación"
          subtitle="Seleccione el apartamento correcto para corregir esta transacción."
          action={
            <button
              type="button"
              onClick={cancelarEdicionManual}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          }
        >
          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <InfoLine label="Fecha" value={fechaCorta(editando.fecha_posteo)} />
            <InfoLine
              label="Monto"
              value={formatearMoneda(editando.monto_transaccion)}
            />
            <InfoLine
              label="Estado"
              value={editando.estado_identificacion}
              danger={editando.estado_identificacion === "Revisar"}
            />
          </div>

          <div className="mb-5 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase text-slate-500">
              Descripción banco
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {editando.descripcion || "-"}
            </p>
          </div>

          <form
            onSubmit={guardarIdentificacionManual}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div>
              <label className="mb-1 block text-sm font-semibold">
                Apartamento correcto *
              </label>
              <select
                value={editUnidadId}
                onChange={(e) => seleccionarUnidadManual(e.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              >
                <option value="">Seleccione apartamento</option>
                {unidades.map((unidad) => (
                  <option key={unidad.id} value={unidad.id}>
                    {unidad.codigo} - {unidad.propietario_nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">Propietario</label>
              <input
                value={editPropietario}
                onChange={(e) => setEditPropietario(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">Apartamento</label>
              <input
                value={editApartamento}
                onChange={(e) => setEditApartamento(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">Período</label>
              <input
                value={editando.periodo || obtenerPeriodo(editando.fecha_posteo)}
                disabled
                className="w-full rounded-xl border bg-slate-100 px-4 py-3 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold">Observación</label>
              <textarea
                value={editObservacion}
                onChange={(e) => setEditObservacion(e.target.value)}
                rows={3}
                className="w-full rounded-xl border px-4 py-3 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={guardandoManual}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {guardandoManual ? "Guardando..." : "Guardar identificación"}
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <InfoBox label="Total" value={String(resumen.total)} />
        <InfoBox
          label="Identificados"
          value={String(resumen.identificados)}
          tone="emerald"
        />
        <InfoBox label="Pendientes" value={String(resumen.pendientes)} tone="red" />
        <InfoBox
          label="Monto identificado"
          value={formatearMoneda(resumen.montoIdentificado)}
          tone="emerald"
        />
        <InfoBox
          label="Monto pendiente"
          value={formatearMoneda(resumen.montoPendiente)}
          tone="red"
        />
      </div>

      <SectionCard
        title="Filtros"
        subtitle="Consulte por estado, mes bancario, rango de fechas o texto."
        action={
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
            <Filter className="h-4 w-4" />
            Registros: {resultadoFiltrado.length}
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div>
            <label className="mb-1 block text-sm font-semibold">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="Todos">Todos</option>
              <option value="Identificado">Identificado</option>
              <option value="Revisar">Revisar</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Período</label>
            <select
              value={tipoPeriodo}
              onChange={(e) => setTipoPeriodo(e.target.value as TipoPeriodo)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="TODOS">Todos los meses</option>
              <option value="MES">Por mes</option>
              <option value="RANGO">Rango de fechas</option>
            </select>
          </div>

          {tipoPeriodo === "MES" && (
            <div>
              <label className="mb-1 block text-sm font-semibold">Mes bancario</label>
              <input
                type="month"
                value={mesFiltro}
                onChange={(e) => setMesFiltro(e.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              />
            </div>
          )}

          {tipoPeriodo === "RANGO" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-semibold">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  min={fechaDesde || undefined}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                />
              </div>
            </>
          )}

          <div className={tipoPeriodo === "RANGO" ? "xl:col-span-1" : "xl:col-span-2"}>
            <label className="mb-1 block text-sm font-semibold">Buscar</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-xl border px-10 py-3 text-sm"
                placeholder="Descripción, apartamento, propietario..."
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Limpiar
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Resultado de identificación"
        subtitle="La identificación guardada durante la carga del archivo se respeta como fuente válida."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : (
            <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
              Identificados: {resumen.identificados}
            </div>
          )
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500">Cargando datos...</p>
        ) : resultadoFiltrado.length === 0 ? (
          <EmptyState
            title="Sin transacciones"
            description="No hay registros para mostrar con los filtros seleccionados."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-3 py-3 text-left">Fecha</th>
                    <th className="px-3 py-3 text-right">Monto</th>
                    <th className="px-3 py-3 text-left">Descripción banco</th>
                    <th className="px-3 py-3 text-left">Método</th>
                    <th className="px-3 py-3 text-left">Apartamento / propietario</th>
                    <th className="px-3 py-3 text-center">Estado</th>
                    <th className="px-3 py-3 text-center">Guardado</th>
                    <th className="px-3 py-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {resultadoFiltrado.map((r) => (
                    <tr key={r.id} className="bg-white hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-3">
                        {fechaCorta(r.fecha_posteo)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-black">
                        {formatearMoneda(r.monto_transaccion)}
                      </td>
                      <td className="max-w-[320px] px-3 py-3">
                        <p className="line-clamp-2 text-slate-700">
                          {r.descripcion || "-"}
                        </p>
                        {r.no_serial && (
                          <p className="mt-1 text-xs text-slate-500">
                            Serial: {r.no_serial}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-800">
                          {r.metodo_identificacion}
                        </p>
                        <p className="mt-1 text-xs text-blue-700">
                          Coincidencia: {r.puntos_coincidencia || 0}%
                        </p>
                      </td>
                      <td className="min-w-[220px] px-3 py-3">
                        <p className="font-black text-slate-900">
                          {r.apartamento_identificado || "Pendiente"}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {r.propietario_identificado || "-"}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                            r.estado_identificacion === "Identificado"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {r.estado_identificacion}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                            r.guardado_en_pagos_identificados
                              ? "bg-blue-50 text-blue-700"
                              : r.estado_identificacion === "Identificado"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {r.guardado_en_pagos_identificados
                            ? "Sí"
                            : r.estado_identificacion === "Identificado"
                              ? "Pendiente de guardar"
                              : "No"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => abrirEdicionManual(r)}
                          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-white ${
                            r.estado_identificacion === "Revisar"
                              ? "bg-blue-700 hover:bg-blue-800"
                              : "bg-slate-700 hover:bg-slate-800"
                          }`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {r.estado_identificacion === "Revisar" ? "Identificar" : "Corregir"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function InfoBox({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "red" | "blue";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "red"
        ? "bg-red-50 text-red-700 border-red-100"
        : tone === "blue"
          ? "bg-blue-50 text-blue-700 border-blue-100"
          : "bg-white text-slate-800 border-slate-200";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2 className="mt-2 text-2xl font-black">{value}</h2>
    </div>
  );
}

function InfoLine({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p
        className={`mt-1 text-sm font-black ${
          danger ? "text-red-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
