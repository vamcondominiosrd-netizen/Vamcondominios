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
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type BancoRow = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  fecha_posteo: string;
  monto_transaccion: number;
  no_serial: string;
  descripcion: string;
  estado?: string | null;
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
};

function limpiarTexto(texto: string) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escaparRegex(texto: string) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function obtenerPalabrasClave(texto: string) {
  const palabrasIgnoradas = [
    "pago",
    "pgo",
    "pag",
    "pagos",
    "transferencia",
    "transf",
    "deposito",
    "depositos",
    "depósito",
    "depósitos",
    "mantenimiento",
    "mant",
    "mto",
    "condominio",
    "residencial",
    "colinas",
    "oeste",
    "lote",
    "rd",
    "rd$",
    "dop",
    "del",
    "de",
    "la",
    "el",
    "los",
    "las",
    "por",
    "para",
    "desde",
    "cta",
    "cuenta",
    "banco",
    "popular",
    "bpd",
    "ach",
    "lbtr",
    "internet",
    "movil",
    "mobile",
    "canal",
    "servicio",
    "servicios",
    "concepto",
    "referencia",
    "debito",
    "credito",
    "crédito",
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "setiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  return limpiarTexto(texto)
    .split(" ")
    .map((p) => p.trim())
    .filter((p) => p.length >= 2)
    .filter((p) => !palabrasIgnoradas.includes(p))
    .filter((p) => !/^\d{4}$/.test(p));
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

  if (descripcionBanco.length >= 8 && aliasTexto.includes(descripcionBanco)) {
    return 95;
  }

  let puntos = 0;

  const palabrasAlias = obtenerPalabrasClave(aliasTexto);
  const palabrasPropietario = obtenerPalabrasClave(propietario);

  if (palabrasAlias.length > 0) {
    const encontradasAlias = palabrasAlias.filter((palabra) =>
      descripcionBanco.includes(palabra),
    );

    const porcentajeAlias = encontradasAlias.length / palabrasAlias.length;

    puntos += Math.round(porcentajeAlias * 75);

    if (porcentajeAlias === 1) {
      puntos += 10;
    }
  }

  if (palabrasPropietario.length > 0) {
    const encontradasPropietario = palabrasPropietario.filter((palabra) =>
      descripcionBanco.includes(palabra),
    );

    const porcentajePropietario =
      encontradasPropietario.length / palabrasPropietario.length;

    puntos += Math.round(porcentajePropietario * 20);

    if (porcentajePropietario === 1) {
      puntos += 10;
    }
  }

  if (apartamento) {
    const patronApto = new RegExp(
      `(^|\\s)${escaparRegex(apartamento)}(\\s|$)`,
      "i",
    );

    if (patronApto.test(descripcionBanco)) {
      puntos += 20;
    }
  }

  return puntos > 100 ? 100 : puntos;
}

function buscarMejorAlias(descripcionBanco: string, aliasRows: AliasRow[]) {
  const evaluados = aliasRows
    .map((alias) => ({
      alias,
      puntos: calcularCoincidenciaAlias(descripcionBanco, alias),
    }))
    .filter((item) => item.puntos >= 60)
    .sort((a, b) => {
      if (b.puntos !== a.puntos) return b.puntos - a.puntos;

      const largoB = limpiarTexto(b.alias.descripcion_banco || "").length;
      const largoA = limpiarTexto(a.alias.descripcion_banco || "").length;

      return largoB - largoA;
    });

  return evaluados[0] || null;
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

function montoIgual(a: number | null, b: number | null) {
  return Number(a || 0).toFixed(2) === Number(b || 0).toFixed(2);
}

function estadoPendienteMovil(estado: string | null) {
  const e = limpiarTexto(estado || "Pendiente");

  return (
    e === "pendiente" ||
    e === "reportado" ||
    e === "en revision" ||
    e === "en revisión"
  );
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

    const { data: bancoData, error: bancoError } = await supabase
      .from("archivo_banco")
      .select(
        "id, condominio_id, condominio, fecha_posteo, monto_transaccion, no_serial, descripcion, estado",
      )
      .eq("condominio_id", Number(id))
      .order("fecha_posteo", { ascending: false });

    if (bancoError) {
      alert("Error cargando archivo_banco: " + bancoError.message);
      setLoading(false);
      return;
    }

    const { data: unidadesData, error: unidadesError } = await supabase
      .from("unidades")
      .select("id, condominio_id, codigo, propietario_nombre, activa")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo", { ascending: true });

    if (unidadesError) {
      alert("Error cargando unidades: " + unidadesError.message);
      setLoading(false);
      return;
    }

    const { data: aliasData, error: aliasError } = await supabase
      .from("apartamento_banco_alias")
      .select(
        "id, condominio_id, unidad_id, no_apartamento, propietario, descripcion_banco, estado",
      )
      .eq("condominio_id", Number(id))
      .eq("estado", "Activo")
      .order("no_apartamento", { ascending: true });

    if (aliasError) {
      alert("Error cargando apartamento_banco_alias: " + aliasError.message);
      setLoading(false);
      return;
    }

    const { data: pagosData, error: pagosError } = await supabase
      .from("pagos_identificados")
      .select(
        "id, archivo_banco_id, condominio_id, unidad_id, apartamento, no_apartamento, propietario, fecha_posteo, monto, monto_transaccion, no_serial, descripcion_banco, tipo_pago, periodo, estado, observacion",
      )
      .eq("condominio_id", Number(id));

    if (pagosError) {
      alert("Error cargando pagos_identificados: " + pagosError.message);
      setLoading(false);
      return;
    }

    setUnidades((unidadesData as UnidadRow[]) || []);

    compararDatos(
      (bancoData as BancoRow[]) || [],
      (aliasData as AliasRow[]) || [],
      (unidadesData as UnidadRow[]) || [],
      (pagosData as PagoIdentificadoRow[]) || [],
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

    const aliasOrdenados = [...aliasRows].sort((a, b) => {
      const textoA = limpiarTexto(a.descripcion_banco || "");
      const textoB = limpiarTexto(b.descripcion_banco || "");

      return textoB.length - textoA.length;
    });

    const resultadoComparado: ResultadoRow[] = bancoRows.map((item) => {
      const pagoGuardado = pagosPorArchivo.get(item.id);

      if (pagoGuardado) {
        const apartamentoGuardado =
          pagoGuardado.no_apartamento || pagoGuardado.apartamento || "";

        return {
          ...item,
          alias_id: null,
          unidad_id: pagoGuardado.unidad_id || null,
          apartamento_identificado: apartamentoGuardado,
          propietario_identificado: pagoGuardado.propietario || "",
          alias_registrado:
            pagoGuardado.observacion ||
            "Registro guardado en pagos_identificados",
          metodo_identificacion: "Pago ya guardado",
          puntos_coincidencia: 100,
          estado_identificacion: "Identificado",
        };
      }

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
        };
      }

      const evaluado = buscarMejorAlias(item.descripcion || "", aliasOrdenados);

      if (evaluado?.alias) {
        const encontrado = evaluado.alias;

        return {
          ...item,
          alias_id: encontrado.id,
          unidad_id: encontrado.unidad_id || null,
          apartamento_identificado: encontrado.no_apartamento || "",
          propietario_identificado: encontrado.propietario || "",
          alias_registrado: encontrado.descripcion_banco || "",
          metodo_identificacion: "Alias banco",
          puntos_coincidencia: evaluado.puntos,
          estado_identificacion: "Identificado",
        };
      }

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
      };
    });

    setResultado(resultadoComparado);
  }

  async function actualizarPagoMovilRecibido(pagos: PagoIdentificadoRow[]) {
    if (!condominioId || pagos.length === 0) return;

    const { data: pagosMovilData, error } = await supabase
      .from("pagos_movil")
      .select(
        "id, condominio_id, unidad_id, no_apartamento, monto, fecha_pago, estado",
      )
      .eq("condominio_id", Number(condominioId));

    if (error) {
      console.error(error);
      alert(
        "Los pagos identificados fueron guardados, pero hubo error consultando pagos_movil: " +
          error.message,
      );
      return;
    }

    const pagosMovil = (pagosMovilData as PagoMovilRow[]) || [];

    for (const pago of pagos) {
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

      const { error: updateError } = await supabase
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

      if (updateError) {
        console.error(updateError);
      }
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

    if (!unidad) {
      setEditApartamento("");
      setEditPropietario("");
      return;
    }

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

    if (!editando) {
      alert("Debe seleccionar una transacción.");
      return;
    }

    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

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
      periodo: obtenerPeriodo(editando.fecha_posteo),
      estado: "Identificado",
      observacion:
        editObservacion ||
        `Identificado manualmente | Apartamento: ${editApartamento}`,
    };

    const confirmar = confirm(
      `Se actualizará este pago como identificado para el apartamento ${editApartamento}. ¿Desea continuar?`,
    );

    if (!confirmar) return;

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
      console.error(errorPago);
      alert("Error guardando pago identificado: " + errorPago.message);
      return;
    }

    const { error: errorBanco } = await supabase
      .from("archivo_banco")
      .update({ estado: "Identificado" })
      .eq("id", editando.id)
      .eq("condominio_id", Number(condominioId));

    if (errorBanco) {
      setGuardandoManual(false);
      alert(
        "El pago fue guardado, pero hubo error actualizando archivo_banco: " +
          errorBanco.message,
      );
      return;
    }

    await actualizarPagoMovilRecibido([pagoGuardado as PagoIdentificadoRow]);

    setGuardandoManual(false);

    alert("Pago actualizado e identificado correctamente.");

    cancelarEdicionManual();
    cargarDatos(condominioId);
  }

  async function guardarPagosIdentificados() {
    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

    const pagos = resultado
      .filter(
        (r) =>
          r.estado_identificacion === "Identificado" &&
          r.apartamento_identificado &&
          r.apartamento_identificado !== "Pendiente",
      )
      .map((r) => ({
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
        periodo: obtenerPeriodo(r.fecha_posteo),
        estado: "Identificado",
        observacion: `${r.metodo_identificacion} | Coincidencia: ${r.puntos_coincidencia}%`,
      }));

    if (pagos.length === 0) {
      alert("No hay pagos identificados para guardar.");
      return;
    }

    const confirmar = confirm(
      `Se procesarán ${pagos.length} pagos identificados para ${condominioNombre}. Si alguno ya existe, se actualizará. ¿Desea continuar?`,
    );

    if (!confirmar) return;

    setGuardando(true);

    const { data: pagosGuardados, error } = await supabase
      .from("pagos_identificados")
      .upsert(pagos, { onConflict: "archivo_banco_id" })
      .select(
        "id, archivo_banco_id, condominio_id, unidad_id, apartamento, no_apartamento, propietario, fecha_posteo, monto, monto_transaccion, no_serial, descripcion_banco, tipo_pago, periodo, estado, observacion",
      );

    if (error) {
      setGuardando(false);
      console.error(error);
      alert("Error al guardar pagos identificados: " + error.message);
      return;
    }

    await marcarArchivoBancoIdentificado();

    await actualizarPagoMovilRecibido(
      (pagosGuardados as PagoIdentificadoRow[]) || [],
    );

    setGuardando(false);

    alert("Pagos identificados guardados correctamente.");
    cargarDatos(condominioId);
  }

  async function marcarArchivoBancoIdentificado() {
    const idsIdentificados = resultado
      .filter((r) => r.estado_identificacion === "Identificado")
      .map((r) => r.id);

    const idsPendientes = resultado
      .filter((r) => r.estado_identificacion === "Revisar")
      .map((r) => r.id);

    if (idsIdentificados.length > 0) {
      await supabase
        .from("archivo_banco")
        .update({ estado: "Identificado" })
        .in("id", idsIdentificados)
        .eq("condominio_id", Number(condominioId));
    }

    if (idsPendientes.length > 0) {
      await supabase
        .from("archivo_banco")
        .update({ estado: "Revisar" })
        .in("id", idsPendientes)
        .eq("condominio_id", Number(condominioId));
    }
  }

  async function refrescar() {
    if (!condominioId) return;
    await cargarDatos(condominioId);
  }

  const resultadoFiltrado = useMemo(() => {
    return resultado.filter((item) => {
      const texto = `${item.fecha_posteo || ""} ${item.monto_transaccion || ""} ${
        item.descripcion || ""
      } ${item.apartamento_identificado || ""} ${
        item.propietario_identificado || ""
      } ${item.metodo_identificacion || ""} ${item.estado_identificacion || ""}`
        .toLowerCase()
        .trim();

      const coincideBusqueda = texto.includes(busqueda.toLowerCase().trim());

      const coincideEstado =
        filtroEstado === "Todos"
          ? true
          : item.estado_identificacion === filtroEstado;

      return coincideBusqueda && coincideEstado;
    });
  }, [resultado, busqueda, filtroEstado]);

  const identificados = resultado.filter(
    (r) => r.estado_identificacion === "Identificado",
  ).length;

  const pendientes = resultado.filter(
    (r) => r.estado_identificacion === "Revisar",
  ).length;

  const montoIdentificado = resultado
    .filter((r) => r.estado_identificacion === "Identificado")
    .reduce((total, item) => total + Number(item.monto_transaccion || 0), 0);

  const montoPendiente = resultado
    .filter((r) => r.estado_identificacion === "Revisar")
    .reduce((total, item) => total + Number(item.monto_transaccion || 0), 0);

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
          {
            href: "/archivo-banco/importar-banco-identificado",
            label: "Archivo Banco Identificados",
            icon: Banknote,
          },
        ]}
      />

      <ModuleToolbar
        title="Identificación Automática de Pagos"
        subtitle={`Cruce de pagos bancarios contra apartamentos y alias. Condominio: ${
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
          title="Actualizar pago en revisión"
          subtitle="Seleccione el apartamento correcto para guardar este registro como identificado."
          action={
            <button
              type="button"
              onClick={cancelarEdicionManual}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          }
        >
          <div className="mb-5 rounded-2xl border bg-yellow-50 p-4">
            <p className="text-sm font-black uppercase text-yellow-800">
              Transacción seleccionada
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
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

            <div className="mt-4 rounded-xl bg-white p-3">
              <p className="text-xs font-bold uppercase text-slate-500">
                Descripción banco
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {editando.descripcion || "-"}
              </p>
            </div>
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
              <label className="mb-1 block text-sm font-semibold">
                No. Apartamento
              </label>

              <input
                value={editApartamento}
                onChange={(e) => setEditApartamento(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
                placeholder="Ej. G1"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Propietario
              </label>

              <input
                value={editPropietario}
                onChange={(e) => setEditPropietario(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
                placeholder="Nombre del propietario"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Período
              </label>

              <input
                value={obtenerPeriodo(editando.fecha_posteo)}
                disabled
                className="w-full rounded-xl border bg-slate-100 px-4 py-3 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold">
                Observación
              </label>

              <textarea
                value={editObservacion}
                onChange={(e) => setEditObservacion(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-3 md:col-span-2 md:flex-row">
              <button
                type="submit"
                disabled={guardandoManual}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {guardandoManual ? "Guardando..." : "Guardar como identificado"}
              </button>

              <button
                type="button"
                onClick={cancelarEdicionManual}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                Cancelar
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
        <InfoBox
          label="Total transacciones"
          value={`${resultado.length}`}
          tone="slate"
        />

        <InfoBox
          label="Identificadas"
          value={`${identificados}`}
          tone="emerald"
        />

        <InfoBox label="Pendientes" value={`${pendientes}`} tone="red" />

        <InfoBox
          label="Monto identificado"
          value={formatearMoneda(montoIdentificado)}
          tone="emerald"
        />

        <InfoBox
          label="Monto pendiente"
          value={formatearMoneda(montoPendiente)}
          tone="red"
        />
      </div>

      <SectionCard
        title="Filtros"
        subtitle="Filtre las transacciones por estado, descripción, apartamento o propietario."
        action={
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
            <Filter className="h-4 w-4" />
            Registros: {resultadoFiltrado.length}
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold">Buscar</label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-xl border px-10 py-3 text-sm"
                placeholder="Buscar por descripción, apartamento o propietario..."
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Resultado de identificación"
        subtitle="Transacciones importadas del banco comparadas contra unidades y alias bancarios."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : (
            <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
              Identificadas: {identificados}
            </div>
          )
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500">Cargando datos...</p>
        ) : !condominioId ? (
          <EmptyState
            title="Condominio no identificado"
            description="No se encontró el condominio activo. Debe iniciar sesión nuevamente."
          />
        ) : resultadoFiltrado.length === 0 ? (
          <EmptyState
            title="Sin transacciones"
            description="No hay transacciones para mostrar con esta consulta."
          />
        ) : (
          <DataTable>
            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-left">Descripción Banco</th>
                <th className="px-4 py-3 text-left">Método</th>
                <th className="px-4 py-3 text-center">% Coincidencia</th>
                <th className="px-4 py-3 text-left">Apartamento</th>
                <th className="px-4 py-3 text-left">Propietario</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {resultadoFiltrado.map((r) => (
                <tr key={r.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3">{fechaCorta(r.fecha_posteo)}</td>

                  <td className="px-4 py-3 text-right font-black text-slate-800">
                    {formatearMoneda(r.monto_transaccion)}
                  </td>

                  <td className="max-w-[340px] truncate px-4 py-3">
                    {r.descripcion || "-"}
                  </td>

                  <td className="px-4 py-3">
                    {r.metodo_identificacion || "-"}
                  </td>

                  <td className="px-4 py-3 text-center font-black">
                    {r.puntos_coincidencia > 0
                      ? `${r.puntos_coincidencia}%`
                      : "-"}
                  </td>

                  <td className="px-4 py-3 font-black">
                    {r.apartamento_identificado || "Pendiente"}
                  </td>

                  <td className="max-w-[220px] truncate px-4 py-3">
                    {r.propietario_identificado || "-"}
                  </td>

                  <td className="px-4 py-3 text-center">
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

                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => abrirEdicionManual(r)}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-white ${
                        r.estado_identificacion === "Revisar"
                          ? "bg-blue-700 hover:bg-blue-800"
                          : "bg-slate-700 hover:bg-slate-800"
                      }`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {r.estado_identificacion === "Revisar"
                        ? "Actualizar"
                        : "Corregir"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
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