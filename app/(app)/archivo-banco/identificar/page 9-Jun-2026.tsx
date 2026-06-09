"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

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
  unidades: UnidadRow[]
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
  alias: AliasRow
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
      descripcionBanco.includes(palabra)
    );

    const porcentajeAlias = encontradasAlias.length / palabrasAlias.length;

    puntos += Math.round(porcentajeAlias * 75);

    if (porcentajeAlias === 1) {
      puntos += 10;
    }
  }

  if (palabrasPropietario.length > 0) {
    const encontradasPropietario = palabrasPropietario.filter((palabra) =>
      descripcionBanco.includes(palabra)
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
      "i"
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

function formatearMoneda(valor: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(valor || 0));
}

function obtenerPeriodo(fecha: string) {
  if (!fecha) return "";
  return fecha.slice(0, 7);
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
    const nombre = localStorage.getItem("condominio_nombre") || "";

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
        "id, condominio_id, condominio, fecha_posteo, monto_transaccion, no_serial, descripcion, estado"
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
        "id, condominio_id, unidad_id, no_apartamento, propietario, descripcion_banco, estado"
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
        "id, archivo_banco_id, condominio_id, unidad_id, apartamento, no_apartamento, propietario, fecha_posteo, monto, monto_transaccion, no_serial, descripcion_banco, tipo_pago, periodo, estado, observacion"
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
      (pagosData as PagoIdentificadoRow[]) || []
    );

    setLoading(false);
  }

  function compararDatos(
    bancoRows: BancoRow[],
    aliasRows: AliasRow[],
    unidadesRows: UnidadRow[],
    pagosRows: PagoIdentificadoRow[]
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
        unidadesRows
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
        "id, condominio_id, unidad_id, no_apartamento, monto, fecha_pago, estado"
      )
      .eq("condominio_id", Number(condominioId));

    if (error) {
      console.error(error);
      alert(
        "Los pagos identificados fueron guardados, pero hubo error consultando pagos_movil: " +
          error.message
      );
      return;
    }

    const pagosMovil = (pagosMovilData as PagoMovilRow[]) || [];

    for (const pago of pagos) {
      const periodo = pago.periodo || obtenerPeriodo(pago.fecha_posteo || "");
      const montoPago = Number(
        pago.monto_transaccion || pago.monto || 0
      );

      const pagoMovil = pagosMovil.find((pm) => {
        const periodoMovil = obtenerPeriodo(pm.fecha_pago || "");
        const mismoApartamento =
          (pm.unidad_id && pago.unidad_id && Number(pm.unidad_id) === Number(pago.unidad_id)) ||
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
          comentario_admin:
            "Pago confirmado contra archivo del banco.",
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
        : ""
    );

    setEditPropietario(item.propietario_identificado || "");

    setEditObservacion(
      item.estado_identificacion === "Revisar"
        ? "Identificado manualmente desde revisión"
        : "Actualizado manualmente"
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
      `Se actualizará este pago como identificado para el apartamento ${editApartamento}. ¿Desea continuar?`
    );

    if (!confirmar) return;

    setGuardandoManual(true);

    const { data: pagoGuardado, error: errorPago } = await supabase
      .from("pagos_identificados")
      .upsert([pago], { onConflict: "archivo_banco_id" })
      .select(
        "id, archivo_banco_id, condominio_id, unidad_id, apartamento, no_apartamento, propietario, fecha_posteo, monto, monto_transaccion, no_serial, descripcion_banco, tipo_pago, periodo, estado, observacion"
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
          errorBanco.message
      );
      return;
    }

    await actualizarPagoMovilRecibido([
      pagoGuardado as PagoIdentificadoRow,
    ]);

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
          r.apartamento_identificado !== "Pendiente"
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
        observacion: `${r.metodo_identificacion} | ${r.alias_registrado} | Coincidencia: ${r.puntos_coincidencia}%`,
      }));

    if (pagos.length === 0) {
      alert("No hay pagos identificados para guardar.");
      return;
    }

    const confirmar = confirm(
      `Se procesarán ${pagos.length} pagos identificados para ${condominioNombre}. Si alguno ya existe, se actualizará. ¿Desea continuar?`
    );

    if (!confirmar) return;

    setGuardando(true);

    const { data: pagosGuardados, error } = await supabase
      .from("pagos_identificados")
      .upsert(pagos, { onConflict: "archivo_banco_id" })
      .select(
        "id, archivo_banco_id, condominio_id, unidad_id, apartamento, no_apartamento, propietario, fecha_posteo, monto, monto_transaccion, no_serial, descripcion_banco, tipo_pago, periodo, estado, observacion"
      );

    if (error) {
      setGuardando(false);
      console.error(error);
      alert("Error al guardar pagos identificados: " + error.message);
      return;
    }

    await marcarArchivoBancoIdentificado();

    await actualizarPagoMovilRecibido(
      (pagosGuardados as PagoIdentificadoRow[]) || []
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

  const resultadoFiltrado = resultado.filter((item) => {
    const texto = `${item.fecha_posteo || ""} ${item.monto_transaccion || ""} ${
      item.no_serial || ""
    } ${item.descripcion || ""} ${item.apartamento_identificado || ""} ${
      item.propietario_identificado || ""
    } ${item.alias_registrado || ""} ${item.metodo_identificacion || ""} ${
      item.estado_identificacion || ""
    }`
      .toLowerCase()
      .trim();

    const coincideBusqueda = texto.includes(busqueda.toLowerCase().trim());

    const coincideEstado =
      filtroEstado === "Todos"
        ? true
        : item.estado_identificacion === filtroEstado;

    return coincideBusqueda && coincideEstado;
  });

  const identificados = resultado.filter(
    (r) => r.estado_identificacion === "Identificado"
  ).length;

  const pendientes = resultado.filter(
    (r) => r.estado_identificacion === "Revisar"
  ).length;

  const montoIdentificado = resultado
    .filter((r) => r.estado_identificacion === "Identificado")
    .reduce((total, item) => total + Number(item.monto_transaccion || 0), 0);

  const montoPendiente = resultado
    .filter((r) => r.estado_identificacion === "Revisar")
    .reduce((total, item) => total + Number(item.monto_transaccion || 0), 0);

  if (loading) {
    return <div className="p-6">Cargando datos...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              Identificación Automática de Pagos
            </h1>

            <p className="text-slate-500 mt-2">
              Primero busca el apartamento dentro de la descripción del banco.
              Si no lo encuentra, usa los alias cargados en apartamento_banco_alias.
            </p>

            <p className="text-sm text-slate-500 mt-2">
              Condominio activo:{" "}
              <span className="font-bold text-slate-900">
                {condominioNombre || "No identificado"}
              </span>
            </p>
          </div>

          <button
            onClick={guardarPagosIdentificados}
            disabled={guardando}
            className="bg-blue-700 text-white px-5 py-3 rounded-xl hover:bg-blue-800 disabled:opacity-50 font-bold"
          >
            {guardando ? "Guardando..." : "Guardar pagos identificados"}
          </button>
        </div>
      </div>

      {editando && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-3xl p-6">
          <h2 className="text-xl font-black text-yellow-900">
            Actualizar pago en revisión
          </h2>

          <p className="text-sm text-yellow-800 mt-1">
            Selecciona el apartamento correcto para guardar este registro como
            pago identificado.
          </p>

          <div className="bg-white rounded-2xl border p-4 my-5">
            <p className="text-sm text-slate-500">Transacción seleccionada</p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3 text-sm">
              <div>
                <p className="text-slate-500">Fecha</p>
                <p className="font-bold">{editando.fecha_posteo}</p>
              </div>

              <div>
                <p className="text-slate-500">Monto</p>
                <p className="font-bold">
                  {formatearMoneda(editando.monto_transaccion)}
                </p>
              </div>

              <div>
                <p className="text-slate-500">Serial</p>
                <p className="font-bold">{editando.no_serial || "-"}</p>
              </div>

              <div>
                <p className="text-slate-500">Estado actual</p>
                <p className="font-bold">{editando.estado_identificacion}</p>
              </div>
            </div>

            <p className="text-sm text-slate-500 mt-4">Descripción banco</p>
            <p className="font-semibold">{editando.descripcion || "-"}</p>
          </div>

          <form
            onSubmit={guardarIdentificacionManual}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-semibold mb-1">
                Apartamento correcto *
              </label>

              <select
                value={editUnidadId}
                onChange={(e) => seleccionarUnidadManual(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
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
              <label className="block text-sm font-semibold mb-1">
                No. Apartamento
              </label>

              <input
                value={editApartamento}
                onChange={(e) => setEditApartamento(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Ej. G1"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Propietario
              </label>

              <input
                value={editPropietario}
                onChange={(e) => setEditPropietario(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Nombre del propietario"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Período
              </label>

              <input
                value={obtenerPeriodo(editando.fecha_posteo)}
                disabled
                className="border rounded-xl px-4 py-3 w-full bg-slate-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">
                Observación
              </label>

              <textarea
                value={editObservacion}
                onChange={(e) => setEditObservacion(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                rows={3}
              />
            </div>

            <div className="md:col-span-2 flex flex-col md:flex-row gap-3">
              <button
                type="submit"
                disabled={guardandoManual}
                className="bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-xl font-bold disabled:opacity-50"
              >
                {guardandoManual
                  ? "Guardando..."
                  : "Guardar como identificado"}
              </button>

              <button
                type="button"
                onClick={cancelarEdicionManual}
                className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="border rounded-2xl p-5 bg-white shadow-sm">
          <p className="text-slate-500 text-sm">Total transacciones</p>
          <h2 className="text-3xl font-black">{resultado.length}</h2>
        </div>

        <div className="border rounded-2xl p-5 bg-white shadow-sm">
          <p className="text-slate-500 text-sm">Identificadas</p>
          <h2 className="text-3xl font-black text-green-700">
            {identificados}
          </h2>
        </div>

        <div className="border rounded-2xl p-5 bg-white shadow-sm">
          <p className="text-slate-500 text-sm">Pendientes</p>
          <h2 className="text-3xl font-black text-red-700">{pendientes}</h2>
        </div>

        <div className="border rounded-2xl p-5 bg-white shadow-sm">
          <p className="text-slate-500 text-sm">Monto identificado</p>
          <h2 className="text-2xl font-black text-green-700">
            {formatearMoneda(montoIdentificado)}
          </h2>
        </div>

        <div className="border rounded-2xl p-5 bg-white shadow-sm">
          <p className="text-slate-500 text-sm">Monto pendiente</p>
          <h2 className="text-2xl font-black text-red-700">
            {formatearMoneda(montoPendiente)}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="Todos">Todos</option>
              <option value="Identificado">Identificado</option>
              <option value="Revisar">Revisar</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">Buscar</label>

            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Buscar por descripción, apartamento, propietario, serial..."
            />
          </div>
        </div>
      </div>

      <div className="overflow-auto border rounded-2xl bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 border text-left">Fecha</th>
              <th className="p-3 border text-right">Monto</th>
              <th className="p-3 border text-left">No Serial</th>
              <th className="p-3 border text-left">Descripción Banco</th>
              <th className="p-3 border text-left">Método</th>
              <th className="p-3 border text-left">Referencia encontrada</th>
              <th className="p-3 border text-center">% Coincidencia</th>
              <th className="p-3 border text-left">Apartamento</th>
              <th className="p-3 border text-left">Propietario</th>
              <th className="p-3 border text-center">Estado</th>
              <th className="p-3 border text-center">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {resultadoFiltrado.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="p-3 border">{r.fecha_posteo}</td>

                <td className="p-3 border text-right font-bold">
                  {formatearMoneda(r.monto_transaccion)}
                </td>

                <td className="p-3 border">{r.no_serial || "-"}</td>

                <td className="p-3 border max-w-[360px]">
                  {r.descripcion || "-"}
                </td>

                <td className="p-3 border">
                  {r.metodo_identificacion || "-"}
                </td>

                <td className="p-3 border max-w-[280px]">
                  {r.alias_registrado || "-"}
                </td>

                <td className="p-3 border text-center font-bold">
                  {r.puntos_coincidencia > 0
                    ? `${r.puntos_coincidencia}%`
                    : "-"}
                </td>

                <td className="p-3 border font-black">
                  {r.apartamento_identificado || "Pendiente"}
                </td>

                <td className="p-3 border">
                  {r.propietario_identificado || "-"}
                </td>

                <td className="p-3 border text-center">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      r.estado_identificacion === "Identificado"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {r.estado_identificacion}
                  </span>
                </td>

                <td className="p-3 border text-center">
                  <button
                    onClick={() => abrirEdicionManual(r)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold text-white ${
                      r.estado_identificacion === "Revisar"
                        ? "bg-blue-700 hover:bg-blue-800"
                        : "bg-slate-700 hover:bg-slate-800"
                    }`}
                  >
                    {r.estado_identificacion === "Revisar"
                      ? "Actualizar"
                      : "Corregir"}
                  </button>
                </td>
              </tr>
            ))}

            {resultadoFiltrado.length === 0 && (
              <tr>
                <td
                  className="p-6 border text-center text-slate-500"
                  colSpan={11}
                >
                  No hay transacciones para mostrar con esta consulta.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}