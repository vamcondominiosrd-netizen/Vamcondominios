"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CalendarDays,
  CheckCircle,
  CreditCard,
  FileText,
  Landmark,
  Printer,
  ReceiptText,
  Save,
  Search,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";
import { generarAsientoPagoMantenimiento } from "@/app/lib/contabilidad/generarAsientoPagoMantenimiento";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import StatCard from "@/components/vam/enterprise/StatCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type Unidad = {
  id: number;
  client_id?: number | null;
  codigo: string;
  propietario_id?: number | null;
  propietario_nombre: string | null;
  propietario_cedula: string | null;
  propietario_telefono: string | null;
  cuota_mensual_actual: number | null;
};

type CuentaBancaria = {
  id: number;
  nombre_banco: string | null;
  numero_cuenta: string | null;
  fondo_tipo: string | null;
  balance_actual: number | null;
  fondo_ordinario: number | null;
  fondo_extraordinario: number | null;
  fondo_reserva: number | null;
};

type Pago = {
  id: number;
  monto: number | null;
  fecha_pago: string | null;
  referencia: string | null;
  metodo: string | null;
  metodo_pago: string | null;
  origen: string | null;
  tipo_fondo: string | null;
  descripcion: string | null;
  comprobante_url: string | null;
  unidades?: {
    codigo: string | null;
    propietario_nombre: string | null;
  } | null;
};

type CargoAbierto = {
  id: number;
  periodo: string | null;
  concepto: string | null;
  tipo_cargo: string | null;
  monto: number | null;
  monto_pagado: number | null;
  balance: number | null;
  estado: string | null;
  fecha_vencimiento: string | null;
};

type CreditoUnidad = {
  id: number;
  monto_disponible: number | null;
  concepto: string | null;
  estado: string | null;
};

function dinero(valor: number | string | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fechaCorta(valor?: string | null) {
  if (!valor) return "-";
  return String(valor).split("T")[0];
}

export default function PagosMantenimientoPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState<string>("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargosAbiertos, setCargosAbiertos] = useState<CargoAbierto[]>([]);
  const [creditos, setCreditos] = useState<CreditoUnidad[]>([]);

  const [unidadId, setUnidadId] = useState("");
  const [busquedaUnidad, setBusquedaUnidad] = useState("");
  const [mostrarResultados, setMostrarResultados] = useState(false);

  const [tipoFondo, setTipoFondo] = useState("ORDINARIO");
  const [fechaPago, setFechaPago] = useState("");
  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [referencia, setReferencia] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [ultimoPagoId, setUltimoPagoId] = useState<number | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      router.push("/login");
      return;
    }

    const hoy = new Date().toISOString().slice(0, 10);

    setCondominioId(id);
    setCondominioNombre(nombre);
    setFechaPago(hoy);

    cargarUnidades(id);
    cargarCuentas(id);
    cargarPagos(id);
  }, [router]);

  async function cargarUnidades(id: string) {
    const { data, error } = await supabase
      .from("unidades")
      .select(
        "id, client_id, codigo, propietario_id, propietario_nombre, propietario_cedula, propietario_telefono, cuota_mensual_actual"
      )
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo", { ascending: true });

    if (error) {
      alert("Error cargando unidades: " + error.message);
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
      alert("Error cargando cuentas: " + error.message);
      return;
    }

    setCuentas((data as CuentaBancaria[]) || []);
  }

  async function cargarPagos(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("pagos")
      .select(`
        id,
        monto,
        fecha_pago,
        referencia,
        metodo,
        metodo_pago,
        origen,
        tipo_fondo,
        descripcion,
        comprobante_url,
        unidades (
          codigo,
          propietario_nombre
        )
      `)
      .eq("condominio_id", Number(id))
      .order("fecha_pago", { ascending: false })
      .order("id", { ascending: false })
      .limit(20);

    setLoading(false);

    if (error) {
      alert("Error cargando pagos: " + error.message);
      return;
    }

    setPagos((data || []) as Pago[]);
  }

  async function cargarEstadoUnidad(idUnidad: string) {
    if (!condominioId || !idUnidad) {
      setCargosAbiertos([]);
      setCreditos([]);
      return;
    }

    const { data: cargos, error: errorCargos } = await supabase
      .from("cargos_periodicos")
      .select("id, periodo, concepto, tipo_cargo, monto, monto_pagado, balance, estado, fecha_vencimiento")
      .eq("condominio_id", Number(condominioId))
      .eq("unidad_id", Number(idUnidad))
      .gt("balance", 0)
      .neq("estado", "PAGADO")
      .order("anio", { ascending: true })
      .order("mes", { ascending: true })
      .order("id", { ascending: true });

    if (errorCargos) {
      alert("Error cargando cargos abiertos: " + errorCargos.message);
      return;
    }

    const { data: creditosData, error: errorCreditos } = await supabase
      .from("creditos_propietarios")
      .select("id, monto_disponible, concepto, estado")
      .eq("condominio_id", Number(condominioId))
      .eq("unidad_id", Number(idUnidad))
      .gt("monto_disponible", 0)
      .eq("estado", "DISPONIBLE")
      .order("id", { ascending: true });

    setCargosAbiertos((cargos as CargoAbierto[]) || []);
    setCreditos(errorCreditos ? [] : (creditosData as CreditoUnidad[]) || []);
  }

  async function refrescarDatos() {
    if (!condominioId) return;

    await Promise.all([
      cargarUnidades(condominioId),
      cargarCuentas(condominioId),
      cargarPagos(condominioId),
      unidadId ? cargarEstadoUnidad(unidadId) : Promise.resolve(),
    ]);
  }

  const cuentaAsignada = useMemo(() => {
    return cuentas.find((c) => c.fondo_tipo === tipoFondo) || null;
  }, [cuentas, tipoFondo]);

  const unidadSeleccionada = useMemo(() => {
    return unidades.find((u) => String(u.id) === unidadId) || null;
  }, [unidades, unidadId]);

  const unidadesFiltradas = useMemo(() => {
    const q = busquedaUnidad.toLowerCase().trim();
    if (!q) return unidades.slice(0, 8);

    return unidades
      .filter((u) => {
        const texto = `${u.codigo || ""} ${u.propietario_nombre || ""} ${
          u.propietario_cedula || ""
        } ${u.propietario_telefono || ""}`.toLowerCase();
        return texto.includes(q);
      })
      .slice(0, 10);
  }, [unidades, busquedaUnidad]);

  const saldoPendiente = cargosAbiertos.reduce(
    (sum, c) => sum + Number(c.balance || 0),
    0
  );

  const creditoDisponible = creditos.reduce(
    (sum, c) => sum + Number(c.monto_disponible || 0),
    0
  );

  const pagosHoy = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    return pagos.filter((p) => fechaCorta(p.fecha_pago) === hoy);
  }, [pagos]);

  const totalHoy = pagosHoy.reduce((sum, p) => sum + Number(p.monto || 0), 0);
  const totalPagosVisibles = pagos.reduce((sum, p) => sum + Number(p.monto || 0), 0);
  const pagosTransferencia = pagosHoy.filter((p) =>
    String(p.metodo_pago || "").toLowerCase().includes("transfer")
  ).length;

  function seleccionarUnidad(idUnidad: string) {
    setUnidadId(idUnidad);
    setMostrarResultados(false);

    const unidad = unidades.find((u) => String(u.id) === idUnidad);

    if (!unidad) {
      setBusquedaUnidad("");
      setMonto("");
      setCargosAbiertos([]);
      setCreditos([]);
      return;
    }

    setBusquedaUnidad(
      `${unidad.codigo || ""} - ${unidad.propietario_nombre || "Sin propietario"}`
    );

    const cuota = Number(unidad.cuota_mensual_actual || 0);
    setMonto(cuota > 0 ? String(cuota) : "");

    cargarEstadoUnidad(idUnidad);
  }

  async function subirComprobante(unidadIdPago: number) {
    if (!comprobante || !condominioId) return null;

    const extension = comprobante.name.split(".").pop();
    const nombreArchivo = `${condominioId}/${Date.now()}-unidad-${unidadIdPago}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("comprobantes-pagos")
      .upload(nombreArchivo, comprobante, { upsert: true });

    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage
      .from("comprobantes-pagos")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  async function actualizarBalanceCuenta(
    cuentaId: number,
    fondo: string,
    montoPago: number
  ) {
    const { data: cuentaActual, error: errorCuenta } = await supabase
      .from("cuentas_bancarias")
      .select("id,balance_actual,fondo_ordinario,fondo_extraordinario,fondo_reserva")
      .eq("id", cuentaId)
      .eq("condominio_id", Number(condominioId))
      .single();

    if (errorCuenta) {
      throw new Error(
        "El pago fue guardado, pero no se pudo leer la cuenta bancaria: " +
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

    if (fondo === "ORDINARIO") nuevoFondoOrdinario += montoPago;
    if (fondo === "EXTRAORDINARIO") nuevoFondoExtraordinario += montoPago;
    if (fondo === "RESERVA") nuevoFondoReserva += montoPago;

    const nuevoBalance = balanceActual + montoPago;

    const { error: errorUpdate } = await supabase
      .from("cuentas_bancarias")
      .update({
        fondo_ordinario: nuevoFondoOrdinario,
        fondo_extraordinario: nuevoFondoExtraordinario,
        fondo_reserva: nuevoFondoReserva,
        balance_actual: nuevoBalance,
      })
      .eq("id", cuentaId)
      .eq("condominio_id", Number(condominioId));

    if (errorUpdate) {
      throw new Error(
        "El pago fue guardado, pero no se pudo actualizar el balance bancario: " +
          errorUpdate.message
      );
    }
  }

  async function validarDuplicadoReferencia(referenciaLimpia: string, idCondominio: string) {
    if (!referenciaLimpia) return false;

    const { data, error } = await supabase
      .from("pagos")
      .select("id")
      .eq("condominio_id", Number(idCondominio))
      .eq("referencia", referenciaLimpia)
      .maybeSingle();

    if (error) {
      throw new Error("Error validando referencia duplicada: " + error.message);
    }

    return Boolean(data?.id);
  }

  async function guardarPago(e: React.FormEvent) {
    e.preventDefault();
    setMensaje("");
    setUltimoPagoId(null);

    if (!unidadId || !fechaPago || !monto) {
      alert("Debe completar unidad, fecha y monto.");
      return;
    }

    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!cuentaAsignada) {
      alert("No existe cuenta bancaria configurada para el fondo seleccionado.");
      return;
    }

    if (!metodoPago) {
      alert("Debe seleccionar el método de pago.");
      return;
    }

    const montoNumerico = Number(monto || 0);

    if (montoNumerico <= 0) {
      alert("El monto debe ser mayor que cero.");
      return;
    }

    const unidad = unidades.find((u) => String(u.id) === unidadId);

    if (!unidad) {
      alert("Debe seleccionar una unidad válida.");
      return;
    }

    const referenciaLimpia =
      referencia.trim() || `PAGO_MANUAL_${unidad.id}_${Date.now()}`;

    setGuardando(true);

    try {
      const referenciaExiste = await validarDuplicadoReferencia(
        referenciaLimpia,
        condominioId
      );

      if (referenciaExiste) {
        const continuar = confirm(
          "Ya existe un pago registrado con esta referencia. ¿Desea continuar de todas formas?"
        );

        if (!continuar) {
          setGuardando(false);
          return;
        }
      }

      const comprobanteUrl = await subirComprobante(unidad.id);

      const { data: pagoInsertado, error } = await supabase
        .from("pagos")
        .insert([
          {
            client_id: Number(unidad.client_id || 0) || null,
            condominio_id: Number(condominioId),
            unidad_id: unidad.id,
            cuenta_bancaria_id: cuentaAsignada.id,
            tipo_fondo: tipoFondo,
            monto: montoNumerico,
            fecha_pago: fechaPago,
            metodo: "MANUAL",
            metodo_pago: metodoPago,
            referencia: referenciaLimpia,
            origen: "MANUAL",
            descripcion: `Pago manual de mantenimiento - Unidad ${unidad.codigo}`,
            comprobante_url: comprobanteUrl,
          },
        ])
        .select("id")
        .single();

      if (error) {
        alert("Error guardando pago: " + error.message);
        setGuardando(false);
        return;
      }

      const { error: errorAplicacion } = await supabase.rpc(
        "aplicar_pago_a_cargos",
        {
          p_pago_id: pagoInsertado.id,
          p_condominio_id: Number(condominioId),
          p_unidad_id: unidad.id,
          p_monto: montoNumerico,
        }
      );

      if (errorAplicacion) {
        alert(
          "Pago guardado, pero no se pudo aplicar a los cargos. No se actualizó banco ni contabilidad para evitar descuadre: " +
            errorAplicacion.message
        );
        setGuardando(false);
        await cargarPagos(condominioId);
        return;
      }

      await actualizarBalanceCuenta(
        cuentaAsignada.id,
        tipoFondo,
        montoNumerico
      );

      const asientoResultado = await generarAsientoPagoMantenimiento({
        condominio_id: Number(condominioId),
        pago_id: pagoInsertado.id,
        fecha: fechaPago,
        monto: montoNumerico,
        referencia: referenciaLimpia,
        descripcion: `Pago de mantenimiento - Unidad ${unidad.codigo}`,
        usuario: null,
      });

      if (!asientoResultado.ok) {
        alert(
          "Pago registrado, aplicado y sumado al banco, pero no se pudo generar el asiento contable: " +
            asientoResultado.error
        );
      } else {
        setMensaje(
          asientoResultado.duplicado
            ? "Pago registrado correctamente. El asiento contable ya existía."
            : "Pago registrado, aplicado a cargos y asiento contable generado automáticamente."
        );
      }

      setUltimoPagoId(pagoInsertado.id);

      setUnidadId("");
      setBusquedaUnidad("");
      setTipoFondo("ORDINARIO");
      setFechaPago(new Date().toISOString().slice(0, 10));
      setMonto("");
      setMetodoPago("");
      setReferencia("");
      setComprobante(null);
      setCargosAbiertos([]);
      setCreditos([]);

      const inputFile = document.getElementById("comprobante") as HTMLInputElement | null;
      if (inputFile) inputFile.value = "";

      await cargarCuentas(condominioId);
      await cargarPagos(condominioId);
    } catch (error: any) {
      alert(error.message || "Error registrando el pago.");
    }

    setGuardando(false);
  }

  return (
    <PageContainer>
      <ModuleMenu
        title="Centro de Cobros"
        subtitle="Pagos, banco, recibos, créditos y cuadre diario."
        tone="green"
        items={[
          { href: "/pagos-mantenimiento", label: "Registrar Pago", icon: Banknote },
          { href: "/archivo-banco/importar", label: "Importar Banco", icon: Landmark },
          { href: "/archivo-banco/identificar", label: "Identificar", icon: CheckCircle },
          { href: "/pagos-identificados", label: "Identificados", icon: WalletCards },
          { href: "/pagos-mantenimiento/historial", label: "Historial", icon: FileText },
          { href: "/creditos", label: "Créditos", icon: CreditCard },
          { href: "/pagos-mantenimiento/cuadre", label: "Cuadre Diario", icon: ReceiptText },
        ]}
      />

      <ModuleToolbar
        title="Centro de Cobros"
        subtitle={`Registro rápido de pagos de mantenimiento. Condominio: ${
          condominioNombre || "No seleccionado"
        }.`}
        icon={Banknote}
        actions={
          <ModuleActions
            onRefresh={refrescarDatos}
            extra={
              <Link
                href="/pagos-mantenimiento/historial"
                className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" />
                Historial
              </Link>
            }
          />
        }
      />

      {mensaje && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          {mensaje}
          {ultimoPagoId && (
            <Link
              href={`/pagos-mantenimiento/recibo/${ultimoPagoId}`}
              className="ml-3 font-bold text-blue-900 underline"
            >
              Ver recibo
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Recaudado hoy"
          value={`RD$ ${dinero(totalHoy)}`}
          subtitle={`${pagosHoy.length} pago(s)`}
          icon={Banknote}
          tone="green"
        />

        <StatCard
          title="Transferencias hoy"
          value={pagosTransferencia}
          subtitle="Pagos por transferencia"
          icon={Landmark}
          tone="blue"
        />

        <StatCard
          title="Saldo unidad"
          value={`RD$ ${dinero(saldoPendiente)}`}
          subtitle={unidadSeleccionada?.codigo || "Seleccione una unidad"}
          icon={CalendarDays}
          tone={saldoPendiente > 0 ? "amber" : "green"}
        />

        <StatCard
          title="Crédito unidad"
          value={`RD$ ${dinero(creditoDisponible)}`}
          subtitle="Disponible"
          icon={CreditCard}
          tone={creditoDisponible > 0 ? "blue" : "slate"}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="xl:col-span-2">
          <SectionCard
            title="Registrar Pago"
            subtitle="Formulario rápido para registrar pagos en menos pasos."
          >
            <form
              onSubmit={guardarPago}
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <div className="relative md:col-span-2">
                <label className="mb-1 block text-sm font-semibold">
                  Buscar unidad / propietario / cédula / teléfono *
                </label>

                <div className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    value={busquedaUnidad}
                    onChange={(e) => {
                      setBusquedaUnidad(e.target.value);
                      setMostrarResultados(true);
                    }}
                    onFocus={() => setMostrarResultados(true)}
                    className="w-full bg-transparent outline-none"
                    placeholder="Ej. A101, Juan Pérez, 402..., 809..."
                  />
                </div>

                {mostrarResultados && unidadesFiltradas.length > 0 && (
                  <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border bg-white shadow-xl">
                    {unidadesFiltradas.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => seleccionarUnidad(String(u.id))}
                        className="block w-full border-b px-4 py-3 text-left hover:bg-emerald-50"
                      >
                        <p className="font-black text-slate-900">
                          {u.codigo} · {u.propietario_nombre || "Sin propietario"}
                        </p>
                        <p className="text-xs text-slate-500">
                          Cédula: {u.propietario_cedula || "-"} · Tel.: {" "}
                          {u.propietario_telefono || "-"} · Cuota: RD$ {" "}
                          {dinero(u.cuota_mensual_actual)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Monto RD$ *</label>
                <input
                  type="number"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Fecha *</label>
                <input
                  type="date"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Fondo *</label>
                <select
                  value={tipoFondo}
                  onChange={(e) => setTipoFondo(e.target.value)}
                  className="w-full rounded-xl border bg-white px-4 py-3"
                >
                  <option value="ORDINARIO">ORDINARIO</option>
                  <option value="EXTRAORDINARIO">EXTRAORDINARIO</option>
                  <option value="RESERVA">RESERVA</option>
                </select>

                {cuentaAsignada && (
                  <p className="mt-1 text-xs text-slate-500">
                    Cuenta: {cuentaAsignada.nombre_banco} · {" "}
                    {cuentaAsignada.numero_cuenta || "-"}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Método de pago *
                </label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full rounded-xl border bg-white px-4 py-3"
                >
                  <option value="">Seleccione método</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Depósito">Depósito</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Referencia</label>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                  placeholder="No. transacción, cheque o recibo"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Comprobante</label>
                <input
                  id="comprobante"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setComprobante(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border bg-white px-4 py-3"
                />
              </div>

              <div className="flex flex-col gap-3 md:col-span-2 md:flex-row">
                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {guardando ? "Guardando..." : "Guardar pago"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    alert("Primero guarde el pago. Luego use el enlace Ver recibo que aparece arriba.")
                  }
                  disabled={guardando}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  <Printer className="h-4 w-4" />
                  Guardar e imprimir
                </button>
              </div>
            </form>
          </SectionCard>
        </section>

        <section className="space-y-5">
          <SectionCard title="Estado de la Unidad" subtitle="Saldo, créditos y cargos abiertos.">
            {!unidadSeleccionada ? (
              <EmptyState
                title="Seleccione una unidad"
                description="Busque por unidad, propietario, cédula o teléfono."
              />
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Unidad</p>
                  <p className="text-xl font-black text-slate-900">
                    {unidadSeleccionada.codigo}
                  </p>
                  <p className="text-sm text-slate-600">
                    {unidadSeleccionada.propietario_nombre || "Sin propietario"}
                  </p>
                </div>

                <InfoLine
                  label="Saldo pendiente"
                  value={`RD$ ${dinero(saldoPendiente)}`}
                  danger={saldoPendiente > 0}
                />
                <InfoLine
                  label="Crédito disponible"
                  value={`RD$ ${dinero(creditoDisponible)}`}
                  success={creditoDisponible > 0}
                />
                <InfoLine
                  label="Cuota mensual"
                  value={`RD$ ${dinero(unidadSeleccionada.cuota_mensual_actual)}`}
                />

                <div>
                  <p className="mb-2 text-sm font-black text-slate-700">Cargos abiertos</p>

                  {cargosAbiertos.length === 0 ? (
                    <p className="rounded-xl border bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                      No tiene cargos abiertos.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {cargosAbiertos.slice(0, 5).map((cargo) => (
                        <div key={cargo.id} className="rounded-xl border bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-slate-900">
                                {cargo.concepto || cargo.periodo || "Cargo"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {cargo.tipo_cargo || "-"} · Vence: {" "}
                                {fechaCorta(cargo.fecha_vencimiento)}
                              </p>
                            </div>

                            <p className="font-black text-red-700">
                              RD$ {dinero(cargo.balance)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Link
                  href={`/estado-cuenta?unidad_id=${unidadSeleccionada.id}`}
                  className="inline-flex w-full items-center justify-center rounded-xl border bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Ver estado financiero
                </Link>
              </div>
            )}
          </SectionCard>
        </section>
      </div>

      <SectionCard
        title="Últimos pagos"
        subtitle="Solo se muestran los últimos 20 pagos para mantener la pantalla rápida."
        action={
          <div className="text-lg font-black text-emerald-700">
            RD$ {dinero(totalPagosVisibles)}
          </div>
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500">Cargando pagos...</p>
        ) : pagos.length === 0 ? (
          <EmptyState
            title="Sin pagos"
            description="No hay pagos registrados para este condominio."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Unidad</th>
                <th className="px-4 py-3 text-left">Propietario</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-left">Método</th>
                <th className="px-4 py-3 text-left">Referencia</th>
                <th className="px-4 py-3 text-center">Recibo</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {pagos.map((pago) => (
                <tr key={pago.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold">{fechaCorta(pago.fecha_pago)}</td>
                  <td className="px-4 py-3 font-black">{pago.unidades?.codigo || "-"}</td>
                  <td className="px-4 py-3">{pago.unidades?.propietario_nombre || "-"}</td>
                  <td className="px-4 py-3 text-right font-black text-emerald-700">
                    RD$ {dinero(pago.monto)}
                  </td>
                  <td className="px-4 py-3">{pago.metodo_pago || pago.metodo || "-"}</td>
                  <td className="px-4 py-3">{pago.referencia || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/pagos-mantenimiento/recibo/${pago.id}`}
                      className="inline-block rounded-lg bg-purple-700 px-3 py-1 text-xs font-bold text-white hover:bg-purple-800"
                    >
                      Recibo
                    </Link>
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

function InfoLine({
  label,
  value,
  success = false,
  danger = false,
}: {
  label: string;
  value: string;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span
        className={`text-sm font-black ${
          danger
            ? "text-red-700"
            : success
            ? "text-emerald-700"
            : "text-slate-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
