"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import * as XLSX from "xlsx";

type PagoIdentificado = {
  id: number;
  condominio_id: number;
  archivo_banco_id: number | null;
  unidad_id: number | null;
  no_apartamento: string | null;
  apartamento: string | null;
  propietario: string | null;
  fecha_posteo: string | null;
  monto_transaccion: number | null;
  monto: number | null;
  no_serial: string | null;
  descripcion_banco: string | null;
  estado: string | null;
  tipo_pago: string | null;
  periodo: string | null;
  observacion: string | null;
  created_at: string;
};

type Unidad = {
  id: number;
  codigo: string;
};

type CuentaBancaria = {
  id: number;
  nombre_banco: string;
  numero_cuenta: string;
  fondo_tipo: string | null;
  balance_actual: number | null;
  fondo_ordinario: number | null;
  fondo_extraordinario: number | null;
  fondo_reserva: number | null;
};

export default function PagosIdentificadosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [pagos, setPagos] = useState<PagoIdentificado[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);

  const [cuentaBancariaId, setCuentaBancariaId] = useState("");
  const [tipoFondo, setTipoFondo] = useState("ORDINARIO");

  const [loading, setLoading] = useState(true);
  const [aplicando, setAplicando] = useState(false);
  const [filtroApartamento, setFiltroApartamento] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      setMensaje(
        "No se encontró el condominio activo. Debe iniciar sesión nuevamente."
      );
      setLoading(false);
      return;
    }

    cargarTodo(id);
  }, []);

  async function cargarTodo(id: string) {
    await Promise.all([cargarPagos(id), cargarUnidades(id), cargarCuentas(id)]);
  }

  async function cargarPagos(idActivo?: string) {
    setLoading(true);
    setMensaje("");

    const id = idActivo || localStorage.getItem("condominio_id") || condominioId;

    if (!id) {
      setMensaje("No se encontró el condominio activo.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("pagos_identificados")
      .select(`
        id,
        condominio_id,
        archivo_banco_id,
        unidad_id,
        no_apartamento,
        apartamento,
        propietario,
        fecha_posteo,
        monto_transaccion,
        monto,
        no_serial,
        descripcion_banco,
        estado,
        tipo_pago,
        periodo,
        observacion,
        created_at
      `)
      .eq("condominio_id", Number(id))
      .order("fecha_posteo", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      setMensaje("Error cargando pagos identificados: " + error.message);
      setLoading(false);
      return;
    }

    setPagos((data as PagoIdentificado[]) || []);
    setLoading(false);
  }

  async function cargarUnidades(id: string) {
    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(id))
      .order("codigo", { ascending: true });

    if (error) {
      setMensaje("Error cargando unidades: " + error.message);
      return;
    }

    setUnidades((data as Unidad[]) || []);
  }

  async function cargarCuentas(id: string) {
    const { data, error } = await supabase
      .from("cuentas_bancarias")
      .select(`
        id,
        nombre_banco,
        numero_cuenta,
        fondo_tipo,
        balance_actual,
        fondo_ordinario,
        fondo_extraordinario,
        fondo_reserva
      `)
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("nombre_banco", { ascending: true });

    if (error) {
      setMensaje("Error cargando cuentas bancarias: " + error.message);
      return;
    }

    const lista = (data as CuentaBancaria[]) || [];
    setCuentas(lista);

    const cuentaPreferida =
      lista.find((c) => c.fondo_tipo === "ORDINARIO") || lista[0];

    if (cuentaPreferida) {
      setCuentaBancariaId(String(cuentaPreferida.id));

      if (cuentaPreferida.fondo_tipo) {
        setTipoFondo(cuentaPreferida.fondo_tipo);
      }
    }
  }

  const pagosFiltrados = useMemo(() => {
    const texto = filtroApartamento.toLowerCase().trim();

    if (!texto) return pagos;

    return pagos.filter((p) => {
      const combinado = `
        ${p.no_apartamento || ""}
        ${p.apartamento || ""}
        ${p.propietario || ""}
        ${p.no_serial || ""}
        ${p.descripcion_banco || ""}
        ${p.estado || ""}
        ${p.observacion || ""}
      `.toLowerCase();

      return combinado.includes(texto);
    });
  }, [pagos, filtroApartamento]);

  const pagosPendientesAplicar = useMemo(() => {
    return pagosFiltrados.filter((p) => {
      const estado = (p.estado || "").trim().toUpperCase();

      return estado !== "APLICADO" && estado !== "PAGO APLICADO";
    });
  }, [pagosFiltrados]);

  const totalPagado = pagosFiltrados.reduce(
    (sum, p) => sum + montoPagoIdentificado(p),
    0
  );

  const totalPendienteAplicar = pagosPendientesAplicar.reduce(
    (sum, p) => sum + montoPagoIdentificado(p),
    0
  );

  const apartamentosUnicos = new Set(
    pagosFiltrados
      .map((p) => p.apartamento || p.no_apartamento || "")
      .filter((apto) => apto.trim() !== "")
  ).size;

  function montoPagoIdentificado(p: PagoIdentificado) {
    return Number(p.monto_transaccion || p.monto || 0);
  }

  function normalizarTexto(valor: string | null | undefined) {
    return (valor || "")
      .toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
  }

  function buscarUnidadPorPago(p: PagoIdentificado) {
    if (p.unidad_id) {
      const unidadPorId = unidades.find((u) => Number(u.id) === Number(p.unidad_id));

      if (unidadPorId) return unidadPorId;
    }

    const apto = normalizarTexto(p.apartamento || p.no_apartamento);

    if (!apto) return null;

    return (
      unidades.find((u) => normalizarTexto(u.codigo) === apto) ||
      unidades.find((u) => normalizarTexto(u.codigo).includes(apto)) ||
      null
    );
  }

  function fechaParaPago(fecha: string | null | undefined) {
    if (!fecha) {
      return new Date().toISOString().slice(0, 10);
    }

    const valor = fecha.trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(valor)) {
      return valor.slice(0, 10);
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
      const [dia, mes, anio] = valor.split("/");
      return `${anio}-${mes}-${dia}`;
    }

    const d = new Date(valor);

    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }

    return new Date().toISOString().slice(0, 10);
  }

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  function fechaLocal(fecha: string | null | undefined) {
    if (!fecha) return "-";

    const d = new Date(fecha);

    if (Number.isNaN(d.getTime())) return fecha;

    return d.toLocaleDateString("es-DO");
  }

  async function actualizarBalanceCuenta(
    cuentaId: number,
    fondo: string,
    montoPago: number
  ) {
    const { data: cuentaActual, error: errorCuenta } = await supabase
      .from("cuentas_bancarias")
      .select(`
        id,
        balance_actual,
        fondo_ordinario,
        fondo_extraordinario,
        fondo_reserva
      `)
      .eq("id", cuentaId)
      .eq("condominio_id", Number(condominioId))
      .single();

    if (errorCuenta) {
      throw new Error(
        "No se pudo leer la cuenta bancaria para actualizar balance: " +
          errorCuenta.message
      );
    }

    const fondoOrdinarioActual = Number(cuentaActual.fondo_ordinario || 0);
    const fondoExtraActual = Number(cuentaActual.fondo_extraordinario || 0);
    const fondoReservaActual = Number(cuentaActual.fondo_reserva || 0);
    const balanceActual = Number(cuentaActual.balance_actual || 0);

    let nuevoFondoOrdinario = fondoOrdinarioActual;
    let nuevoFondoExtraordinario = fondoExtraActual;
    let nuevoFondoReserva = fondoReservaActual;

    if (fondo === "ORDINARIO") {
      nuevoFondoOrdinario += montoPago;
    }

    if (fondo === "EXTRAORDINARIO") {
      nuevoFondoExtraordinario += montoPago;
    }

    if (fondo === "RESERVA") {
      nuevoFondoReserva += montoPago;
    }

    const { error: errorUpdate } = await supabase
      .from("cuentas_bancarias")
      .update({
        fondo_ordinario: nuevoFondoOrdinario,
        fondo_extraordinario: nuevoFondoExtraordinario,
        fondo_reserva: nuevoFondoReserva,
        balance_actual: balanceActual + montoPago,
      })
      .eq("id", cuentaId)
      .eq("condominio_id", Number(condominioId));

    if (errorUpdate) {
      throw new Error(
        "No se pudo actualizar el balance bancario: " + errorUpdate.message
      );
    }
  }

  async function aplicarPagoIdentificado(p: PagoIdentificado) {
    if (!condominioId) {
      throw new Error("No hay condominio activo.");
    }

    if (!cuentaBancariaId) {
      throw new Error("Debe seleccionar una cuenta bancaria.");
    }

    const unidad = buscarUnidadPorPago(p);

    if (!unidad) {
      throw new Error(
        `No se encontró la unidad/apartamento ${
          p.apartamento || p.no_apartamento || "-"
        } para el pago ID ${p.id}.`
      );
    }

    const montoPago = montoPagoIdentificado(p);

    if (montoPago <= 0) {
      throw new Error(`El pago ID ${p.id} tiene monto inválido.`);
    }

    const referenciaPago =
      (p.no_serial || "").trim() || `PAGO_IDENTIFICADO_${p.id}`;

    const { data: pagoExistente, error: errorExiste } = await supabase
      .from("pagos")
      .select("id")
      .eq("condominio_id", Number(condominioId))
      .eq("pago_identificado_id", p.id)
      .maybeSingle();

    if (errorExiste) {
      throw new Error(
        `Error verificando duplicidad del pago ID ${p.id}: ${errorExiste.message}`
      );
    }

    if (pagoExistente?.id) {
      await supabase
        .from("pagos_identificados")
        .update({
          estado: "APLICADO",
          observacion: `Pago ya guardado en tabla pagos. ID pago: ${pagoExistente.id}`,
        })
        .eq("id", p.id)
        .eq("condominio_id", Number(condominioId));

      return {
        ok: true,
        mensaje: `Pago ${p.id} ya existía en pagos.`,
      };
    }

    const { data: pagoInsertado, error: errorInsert } = await supabase
      .from("pagos")
      .insert([
        {
          condominio_id: Number(condominioId),
          unidad_id: unidad.id,
          cuenta_bancaria_id: Number(cuentaBancariaId),
          tipo_fondo: tipoFondo,
          monto: montoPago,
          fecha_pago: fechaParaPago(p.fecha_posteo),
          metodo: "BANCO",
          metodo_pago: "TRANSFERENCIA",
          referencia: referenciaPago,
          origen: "BANCO",
          bank_transaction_id: p.archivo_banco_id,
          pago_identificado_id: p.id,
          descripcion: p.descripcion_banco || `Pago identificado ID ${p.id}`,
          comprobante_url: null,
        },
      ])
      .select("id")
      .single();

    if (errorInsert) {
      throw new Error(
        `Error insertando pago ID ${p.id} en tabla pagos: ${errorInsert.message}`
      );
    }

    const { error: errorAplicacion } = await supabase.rpc(
      "aplicar_pago_a_cargos",
      {
        p_pago_id: pagoInsertado.id,
        p_condominio_id: Number(condominioId),
        p_unidad_id: unidad.id,
        p_monto: montoPago,
      }
    );

    if (errorAplicacion) {
      throw new Error(
        `Pago ${p.id} fue guardado, pero no se pudo aplicar a cargos: ${errorAplicacion.message}`
      );
    }

    await actualizarBalanceCuenta(Number(cuentaBancariaId), tipoFondo, montoPago);

    const { error: errorUpdate } = await supabase
      .from("pagos_identificados")
      .update({
        estado: "APLICADO",
        unidad_id: unidad.id,
        observacion: `Pago guardado en tabla pagos. ID pago: ${pagoInsertado.id}`,
      })
      .eq("id", p.id)
      .eq("condominio_id", Number(condominioId));

    if (errorUpdate) {
      throw new Error(
        `Pago ${p.id} fue aplicado, pero no se pudo marcar como APLICADO: ${errorUpdate.message}`
      );
    }

    return {
      ok: true,
      mensaje: `Pago ${p.id} aplicado correctamente.`,
    };
  }

  async function aplicarTodosLosPagos() {
    if (pagosPendientesAplicar.length === 0) {
      alert("No hay pagos pendientes de aplicar.");
      return;
    }

    if (!cuentaBancariaId) {
      alert("Debe seleccionar una cuenta bancaria.");
      return;
    }

    const confirmar = confirm(
      `Se aplicarán ${pagosPendientesAplicar.length} pagos por un total de RD$ ${dinero(
        totalPendienteAplicar
      )}. ¿Desea continuar?`
    );

    if (!confirmar) return;

    setAplicando(true);
    setMensaje("");

    let aplicados = 0;
    let errores = 0;
    const detalleErrores: string[] = [];

    for (const pago of pagosPendientesAplicar) {
      try {
        await aplicarPagoIdentificado(pago);
        aplicados += 1;
      } catch (error: any) {
        errores += 1;
        detalleErrores.push(error.message || `Error aplicando pago ${pago.id}`);
      }
    }

    setAplicando(false);

    await cargarTodo(condominioId);

    if (errores > 0) {
      setMensaje(
        `Proceso terminado. Aplicados: ${aplicados}. Con errores: ${errores}. ` +
          detalleErrores.slice(0, 5).join(" | ")
      );
      return;
    }

    setMensaje(`Proceso terminado correctamente. Pagos aplicados: ${aplicados}.`);
  }

  async function aplicarUno(p: PagoIdentificado) {
    const confirmar = confirm(
      `¿Desea aplicar este pago del apartamento ${
        p.apartamento || p.no_apartamento || "-"
      } por RD$ ${dinero(montoPagoIdentificado(p))}?`
    );

    if (!confirmar) return;

    setAplicando(true);
    setMensaje("");

    try {
      await aplicarPagoIdentificado(p);
      setMensaje("Pago aplicado correctamente.");
      await cargarTodo(condominioId);
    } catch (error: any) {
      setMensaje(error.message || "Error aplicando pago.");
    }

    setAplicando(false);
  }

  function exportarExcel() {
    if (pagosFiltrados.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const dataExcel = pagosFiltrados.map((p) => ({
      Condominio: condominioNombre || condominioId,
      Apartamento: p.apartamento || p.no_apartamento || "",
      Propietario: p.propietario || "",
      "Fecha Pago": p.fecha_posteo || "",
      "Monto RD$": montoPagoIdentificado(p),
      "No Serial": p.no_serial || "",
      "Descripción Banco": p.descripcion_banco || "",
      Estado: p.estado || "",
      Observación: p.observacion || "",
      "Fecha Registro": fechaLocal(p.created_at),
    }));

    const hoja = XLSX.utils.json_to_sheet(dataExcel);

    hoja["!cols"] = [
      { wch: 35 },
      { wch: 18 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 45 },
      { wch: 15 },
      { wch: 45 },
      { wch: 18 },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Pagos Identificados");

    const nombreArchivo = `Reporte_Pagos_Identificados_${
      condominioNombre || condominioId
    }.xlsx`
      .replaceAll(" ", "_")
      .replaceAll("/", "-");

    XLSX.writeFile(libro, nombreArchivo);
  }

  if (loading) {
    return <div className="p-6">Cargando pagos identificados...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              Reporte de Pagos Identificados
            </h1>

            <p className="text-slate-500 mt-2">
              Listado de pagos identificados desde el archivo del banco,
              filtrado por el condominio activo.
            </p>

            <p className="text-sm text-blue-700 font-bold mt-3">
              Condominio activo: {condominioNombre || "No seleccionado"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => cargarTodo(condominioId)}
              className="bg-slate-700 text-white px-5 py-3 rounded-xl hover:bg-slate-800 font-bold"
            >
              Actualizar listado
            </button>

            <button
              onClick={exportarExcel}
              className="bg-green-700 text-white px-5 py-3 rounded-xl hover:bg-green-800 font-bold"
            >
              Exportar a Excel
            </button>
          </div>
        </div>
      </div>

      {mensaje && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm">
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="border rounded-2xl p-5 bg-white shadow-sm">
          <p className="text-gray-500 text-sm">Condominio ID</p>
          <h2 className="text-3xl font-black text-blue-700">
            {condominioId || "-"}
          </h2>
        </div>

        <div className="border rounded-2xl p-5 bg-white shadow-sm">
          <p className="text-gray-500 text-sm">Total registros</p>
          <h2 className="text-3xl font-black">{pagosFiltrados.length}</h2>
        </div>

        <div className="border rounded-2xl p-5 bg-white shadow-sm">
          <p className="text-gray-500 text-sm">Pendientes aplicar</p>
          <h2 className="text-3xl font-black text-amber-700">
            {pagosPendientesAplicar.length}
          </h2>
        </div>

        <div className="border rounded-2xl p-5 bg-white shadow-sm">
          <p className="text-gray-500 text-sm">Total pendiente</p>
          <h2 className="text-3xl font-black text-green-700">
            RD$ {dinero(totalPendienteAplicar)}
          </h2>
        </div>

        <div className="border rounded-2xl p-5 bg-white shadow-sm">
          <p className="text-gray-500 text-sm">Apartamentos únicos</p>
          <h2 className="text-3xl font-black text-blue-700">
            {apartamentosUnicos}
          </h2>
        </div>
      </div>

      <div className="border rounded-2xl p-5 bg-white shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold mb-2">Buscar</label>

            <input
              type="text"
              value={filtroApartamento}
              onChange={(e) => setFiltroApartamento(e.target.value)}
              placeholder="Apartamento, serial, descripción o estado..."
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Fondo destino
            </label>

            <select
              value={tipoFondo}
              onChange={(e) => setTipoFondo(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="ORDINARIO">Fondo Ordinario</option>
              <option value="EXTRAORDINARIO">Fondo Extraordinario</option>
              <option value="RESERVA">Fondo Reserva</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Cuenta bancaria
            </label>

            <select
              value={cuentaBancariaId}
              onChange={(e) => setCuentaBancariaId(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="">Seleccione cuenta</option>

              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_banco} - {c.numero_cuenta} - {c.fondo_tipo || "-"}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={aplicarTodosLosPagos}
            disabled={aplicando || pagosPendientesAplicar.length === 0}
            className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-5 py-3 rounded-xl font-bold"
          >
            {aplicando ? "Aplicando..." : "Aplicar pagos identificados"}
          </button>
        </div>

        {cuentas.length === 0 && (
          <p className="text-sm text-red-600 font-semibold mt-3">
            No hay cuentas bancarias activas configuradas para este condominio.
          </p>
        )}

        <p className="text-xs text-slate-500 mt-3">
          Al aplicar, el sistema guarda el pago con origen BANCO y enlaza
          pagos.pago_identificado_id con pagos_identificados.id.
        </p>
      </div>

      <div className="overflow-auto border rounded-2xl bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 border text-left">Apartamento</th>
              <th className="p-3 border text-left">Propietario</th>
              <th className="p-3 border text-left">Fecha Pago</th>
              <th className="p-3 border text-right">Monto</th>
              <th className="p-3 border text-left">No Serial</th>
              <th className="p-3 border text-left">Descripción Banco</th>
              <th className="p-3 border text-center">Estado</th>
              <th className="p-3 border text-left">Observación</th>
              <th className="p-3 border text-center">Acción</th>
            </tr>
          </thead>

          <tbody>
            {pagosFiltrados.map((p) => {
              const estado = (p.estado || "").trim().toUpperCase();
              const aplicado =
                estado === "APLICADO" || estado === "PAGO APLICADO";

              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="p-3 border font-semibold">
                    {p.apartamento || p.no_apartamento || "-"}
                  </td>

                  <td className="p-3 border">{p.propietario || "-"}</td>

                  <td className="p-3 border">{p.fecha_posteo || "-"}</td>

                  <td className="p-3 border text-right font-bold text-green-700">
                    RD$ {dinero(montoPagoIdentificado(p))}
                  </td>

                  <td className="p-3 border">{p.no_serial || "-"}</td>

                  <td className="p-3 border">{p.descripcion_banco || "-"}</td>

                  <td className="p-3 border text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        aplicado
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {p.estado || "PENDIENTE"}
                    </span>
                  </td>

                  <td className="p-3 border text-xs">
                    {p.observacion || "-"}
                  </td>

                  <td className="p-3 border text-center">
                    {aplicado ? (
                      <span className="text-green-700 text-xs font-bold">
                        Aplicado
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => aplicarUno(p)}
                        disabled={aplicando}
                        className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-3 py-1 rounded-lg text-xs font-bold"
                      >
                        Aplicar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {pagosFiltrados.length === 0 && (
              <tr>
                <td
                  className="p-6 border text-center text-slate-500"
                  colSpan={9}
                >
                  No se encontraron pagos identificados para este condominio.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-50 border rounded-xl p-4 text-sm text-slate-600">
        Total general mostrado: <strong>RD$ {dinero(totalPagado)}</strong>
      </div>
    </div>
  );
}