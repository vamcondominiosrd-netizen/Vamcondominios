"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ClipboardCheck,
  CreditCard,
  FileText,
  Filter,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type CreditoPropietario = {
  id: number;
  condominio_id: number;
  unidad_id: number;
  pago_id: number | null;
  monto_original: number;
  monto_disponible: number;
  concepto: string;
  estado: string;
  created_at: string | null;
};

type Unidad = {
  id: number;
  codigo: string;
};

type PropietarioApartamento = {
  id: number;
  condominio_id: number;
  no_apartamento: string | null;
  nombre_propietario: string | null;
  telefono: string | null;
};

type FilaCredito = CreditoPropietario & {
  apartamento: string;
  propietario: string;
  telefono: string;
};

function normalizar(valor: string | null | undefined) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fechaDominicana(fecha: string | null) {
  if (!fecha) return "-";

  return new Date(fecha).toLocaleDateString("es-DO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function claseEstado(estado: string) {
  const valor = normalizar(estado);

  if (valor === "DISPONIBLE") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  if (valor === "APLICADO") {
    return "bg-blue-50 text-blue-700 border-blue-100";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function CreditosPropietariosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [creditos, setCreditos] = useState<CreditoPropietario[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [propietarios, setPropietarios] = useState<PropietarioApartamento[]>(
    [],
  );

  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [apartamentoSeleccionado, setApartamentoSeleccionado] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [nuevoCreditoUnidadId, setNuevoCreditoUnidadId] = useState("");
  const [nuevoCreditoMonto, setNuevoCreditoMonto] = useState("");
  const [nuevoCreditoConcepto, setNuevoCreditoConcepto] = useState(
    "Crédito inicial registrado por apertura del condominio",
  );

  const [loading, setLoading] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [guardandoCredito, setGuardandoCredito] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      setMensaje("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarDatos(id);
  }, []);

  async function cargarDatos(id: string) {
    setLoading(true);
    setMensaje("");

    await Promise.all([
      cargarCreditos(id),
      cargarUnidades(id),
      cargarPropietarios(id),
    ]);

    setLoading(false);
  }

  async function cargarCreditos(id: string) {
    const { data, error } = await supabase
      .from("creditos_propietarios")
      .select(
        "id, condominio_id, unidad_id, pago_id, monto_original, monto_disponible, concepto, estado, created_at",
      )
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      setMensaje("Error cargando saldos a favor: " + error.message);
      setCreditos([]);
      return;
    }

    setCreditos((data as CreditoPropietario[]) || []);
  }

  async function cargarUnidades(id: string) {
    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(id))
      .order("codigo", { ascending: true });

    if (error) {
      setMensaje("Error cargando unidades: " + error.message);
      setUnidades([]);
      return;
    }

    setUnidades((data as Unidad[]) || []);
  }

  async function cargarPropietarios(id: string) {
    const { data, error } = await supabase
      .from("propietarios_apartamentos")
      .select("id, condominio_id, no_apartamento, nombre_propietario, telefono")
      .eq("condominio_id", Number(id))
      .order("no_apartamento", { ascending: true });

    if (error) {
      setMensaje("Error cargando propietarios: " + error.message);
      setPropietarios([]);
      return;
    }

    setPropietarios((data as PropietarioApartamento[]) || []);
  }

  async function refrescar() {
    if (!condominioId) return;
    await cargarDatos(condominioId);
  }

  function obtenerUnidad(unidadId: number) {
    return unidades.find((u) => Number(u.id) === Number(unidadId)) || null;
  }

  function obtenerPropietario(apartamento: string) {
    return (
      propietarios.find(
        (p) => normalizar(p.no_apartamento) === normalizar(apartamento),
      ) || null
    );
  }

  const filas = useMemo<FilaCredito[]>(() => {
    return creditos.map((credito) => {
      const unidad = obtenerUnidad(credito.unidad_id);
      const apartamento = unidad?.codigo || `Unidad ${credito.unidad_id}`;
      const propietario = obtenerPropietario(apartamento);

      return {
        ...credito,
        apartamento,
        propietario: propietario?.nombre_propietario || "Sin propietario",
        telefono: propietario?.telefono || "-",
      };
    });
  }, [creditos, unidades, propietarios]);

  const filasFiltradas = useMemo(() => {
    let lista = filas;

    if (filtroEstado !== "TODOS") {
      lista = lista.filter(
        (f) => normalizar(f.estado) === normalizar(filtroEstado),
      );
    }

    if (apartamentoSeleccionado) {
      lista = lista.filter(
        (f) => normalizar(f.apartamento) === normalizar(apartamentoSeleccionado),
      );
    }

    if (busqueda.trim()) {
      const textoBusqueda = busqueda.toLowerCase().trim();

      lista = lista.filter((f) => {
        const texto = `
          ${f.apartamento || ""}
          ${f.propietario || ""}
          ${f.telefono || ""}
          ${f.concepto || ""}
          ${f.estado || ""}
          ${f.pago_id || ""}
        `.toLowerCase();

        return texto.includes(textoBusqueda);
      });
    }

    return lista;
  }, [filas, filtroEstado, apartamentoSeleccionado, busqueda]);

  const apartamentosConCredito = useMemo(() => {
    const mapa = new Map<string, string>();

    filas.forEach((fila) => {
      if (!mapa.has(fila.apartamento)) {
        mapa.set(fila.apartamento, fila.propietario);
      }
    });

    return Array.from(mapa.entries())
      .map(([apartamento, propietario]) => ({
        apartamento,
        propietario,
      }))
      .sort((a, b) => a.apartamento.localeCompare(b.apartamento));
  }, [filas]);

  const unidadesParaCredito = useMemo(() => {
    return unidades.map((unidad) => {
      const propietario = obtenerPropietario(unidad.codigo);

      return {
        id: unidad.id,
        apartamento: unidad.codigo,
        propietario: propietario?.nombre_propietario || "Sin propietario",
      };
    });
  }, [unidades, propietarios]);

  const totalOriginal = filasFiltradas.reduce(
    (sum, f) => sum + Number(f.monto_original || 0),
    0,
  );

  const totalDisponible = filasFiltradas.reduce(
    (sum, f) => sum + Number(f.monto_disponible || 0),
    0,
  );

  const totalAplicado = totalOriginal - totalDisponible;

  const cantidadDisponible = filasFiltradas.filter(
    (f) => normalizar(f.estado) === "DISPONIBLE" && Number(f.monto_disponible) > 0,
  ).length;

  const apartamentosConSaldo = new Set(
    filasFiltradas
      .filter((f) => Number(f.monto_disponible || 0) > 0)
      .map((f) => f.apartamento),
  ).size;

  async function guardarCreditoManual(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    if (!nuevoCreditoUnidadId) {
      setMensaje("Debe seleccionar la unidad a la que se le adicionará el crédito.");
      return;
    }

    const montoNumerico = Number(nuevoCreditoMonto || 0);

    if (!montoNumerico || montoNumerico <= 0) {
      setMensaje("El monto del crédito debe ser mayor que cero.");
      return;
    }

    const conceptoLimpio = nuevoCreditoConcepto.trim();

    if (!conceptoLimpio) {
      setMensaje("Debe indicar el concepto del crédito.");
      return;
    }

    const unidad = unidades.find(
      (item) => String(item.id) === String(nuevoCreditoUnidadId),
    );

    const confirmar = window.confirm(
      `Se adicionará un crédito disponible de RD$ ${dinero(montoNumerico)} a la unidad ${
        unidad?.codigo || nuevoCreditoUnidadId
      }.\n\n¿Desea continuar?`,
    );

    if (!confirmar) return;

    setGuardandoCredito(true);
    setMensaje("");

    const { error } = await supabase.from("creditos_propietarios").insert({
      condominio_id: Number(condominioId),
      unidad_id: Number(nuevoCreditoUnidadId),
      pago_id: null,
      monto_original: montoNumerico,
      monto_disponible: montoNumerico,
      concepto: conceptoLimpio,
      estado: "DISPONIBLE",
    });

    if (error) {
      setGuardandoCredito(false);
      setMensaje("Error adicionando crédito: " + error.message);
      return;
    }

    setNuevoCreditoUnidadId("");
    setNuevoCreditoMonto("");
    setNuevoCreditoConcepto(
      "Crédito inicial registrado por apertura del condominio",
    );

    await cargarDatos(condominioId);

    setGuardandoCredito(false);
    setMensaje("Crédito adicionado correctamente.");
  }

  async function aplicarCreditos() {
    if (!condominioId) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    const confirmar = window.confirm(
      "¿Desea aplicar los saldos a favor disponibles a los cargos pendientes del condominio?",
    );

    if (!confirmar) return;

    setAplicando(true);
    setMensaje("");

    const { error } = await supabase.rpc("aplicar_creditos_a_cargos", {
      p_condominio_id: Number(condominioId),
    });

    if (error) {
      setAplicando(false);
      setMensaje("Error aplicando saldos a favor: " + error.message);
      return;
    }

    await cargarDatos(condominioId);

    setAplicando(false);
    setMensaje("Saldos a favor aplicados correctamente.");
  }

  function limpiarFiltros() {
    setFiltroEstado("TODOS");
    setApartamentoSeleccionado("");
    setBusqueda("");
  }

  return (
    <PageContainer>
      <ModuleMenu
        title="Control y Seguimiento"
        subtitle="Revisión de pagos, créditos, estados de cuenta y reportes financieros."
        tone="blue"
        items={[
          {
            href: "/finanzas/pagos/cuadre-propietario",
            label: "Cuadre de pagos",
            icon: ClipboardCheck,
          },
          {
            href: "/creditos-propietarios",
            label: "Saldos a favor",
            icon: WalletCards,
          },
          {
            href: "/consulta-estado",
            label: "Estado de cuenta",
            icon: FileText,
          },
          {
            href: "/reportes",
            label: "Reporte financiero",
            icon: BarChart3,
          },
        ]}
      />

      <ModuleToolbar
        title="Saldos a Favor / Créditos a Propietarios"
        subtitle={`Créditos generados por pagos excedentes o adelantados. Condominio: ${
          condominioNombre || "No seleccionado"
        }.`}
        icon={WalletCards}
        actions={
          <ModuleActions
            onRefresh={refrescar}
            extra={
              <button
                type="button"
                onClick={aplicarCreditos}
                disabled={aplicando || loading || !condominioId}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                <CreditCard className="h-4 w-4" />
                {aplicando ? "Aplicando..." : "Aplicar créditos"}
              </button>
            }
          />
        }
      />

      {mensaje && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
        <InfoBox
          label="Crédito original"
          value={`RD$ ${dinero(totalOriginal)}`}
          tone="blue"
        />

        <InfoBox
          label="Disponible"
          value={`RD$ ${dinero(totalDisponible)}`}
          tone="emerald"
        />

        <InfoBox
          label="Aplicado"
          value={`RD$ ${dinero(totalAplicado)}`}
          tone="indigo"
        />

        <InfoBox
          label="Registros disponibles"
          value={`${cantidadDisponible}`}
          tone="yellow"
        />

        <InfoBox
          label="Aptos con saldo"
          value={`${apartamentosConSaldo}`}
          tone="emerald"
        />
      </div>

      <SectionCard
        title="Adicionar crédito manual"
        subtitle="Registre saldos iniciales a favor durante el proceso de apertura del lote."
        action={
          <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
            <PlusCircle className="h-4 w-4" />
            Crédito inicial
          </div>
        }
      >
        <form
          onSubmit={guardarCreditoManual}
          className="grid grid-cols-1 gap-4 lg:grid-cols-12"
        >
          <div className="lg:col-span-4">
            <label className="mb-1 block text-sm font-semibold">
              Unidad / Apartamento
            </label>

            <select
              value={nuevoCreditoUnidadId}
              onChange={(e) => setNuevoCreditoUnidadId(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              disabled={guardandoCredito || loading}
            >
              <option value="">Seleccione una unidad</option>

              {unidadesParaCredito.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.apartamento} - {item.propietario}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-sm font-semibold">
              Monto crédito
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={nuevoCreditoMonto}
              onChange={(e) => setNuevoCreditoMonto(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              placeholder="0.00"
              disabled={guardandoCredito || loading}
            />
          </div>

          <div className="lg:col-span-4">
            <label className="mb-1 block text-sm font-semibold">Concepto</label>

            <input
              value={nuevoCreditoConcepto}
              onChange={(e) => setNuevoCreditoConcepto(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              placeholder="Ej.: Saldo a favor inicial"
              disabled={guardandoCredito || loading}
            />
          </div>

          <div className="flex items-end lg:col-span-2">
            <button
              type="submit"
              disabled={guardandoCredito || loading || !condominioId}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {guardandoCredito ? "Guardando..." : "Guardar crédito"}
            </button>
          </div>
        </form>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
          <strong>Importante:</strong> este crédito queda disponible para la unidad seleccionada.
          Luego puede aplicarse contra cargos pendientes usando el botón <strong>Aplicar créditos</strong>.
        </div>
      </SectionCard>

      <SectionCard
        title="Filtros de consulta"
        subtitle="Filtre por estado, apartamento, propietario, teléfono, concepto o pago."
        action={
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
            <Filter className="h-4 w-4" />
            Registros: {filasFiltradas.length}
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm font-semibold">Estado</label>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="TODOS">Todos</option>
              <option value="DISPONIBLE">Disponible</option>
              <option value="APLICADO">Aplicado</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">
              Apartamento
            </label>

            <select
              value={apartamentoSeleccionado}
              onChange={(e) => setApartamentoSeleccionado(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Todos</option>

              {apartamentosConCredito.map((item) => (
                <option key={item.apartamento} value={item.apartamento}>
                  {item.apartamento} - {item.propietario}
                </option>
              ))}
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
                placeholder="Buscar por apartamento, propietario, concepto o pago..."
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex w-full items-center justify-center rounded-xl border bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Detalle de saldos a favor"
        subtitle="Los créditos disponibles se aplican contra cargos pendientes de la misma unidad."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : (
            <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
              Registros: {filasFiltradas.length}
            </div>
          )
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500">Cargando información...</p>
        ) : !condominioId ? (
          <EmptyState
            title="Condominio no identificado"
            description="No se encontró el condominio activo. Debe iniciar sesión nuevamente."
          />
        ) : filasFiltradas.length === 0 ? (
          <EmptyState
            title="Sin saldos a favor"
            description="No hay saldos a favor para mostrar con los filtros seleccionados."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Apartamento</th>
                <th className="px-4 py-3 text-left">Propietario</th>
                <th className="px-4 py-3 text-center">Pago ID</th>
                <th className="px-4 py-3 text-right">Monto original</th>
                <th className="px-4 py-3 text-right">Disponible</th>
                <th className="px-4 py-3 text-right">Aplicado</th>
                <th className="px-4 py-3 text-left">Concepto</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Fecha</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filasFiltradas.map((fila) => {
                const aplicado =
                  Number(fila.monto_original || 0) -
                  Number(fila.monto_disponible || 0);

                return (
                  <tr key={fila.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 font-black text-slate-900">
                      {fila.apartamento}
                    </td>

                    <td className="min-w-56 px-4 py-3">
                      <div className="font-bold text-slate-800">
                        {fila.propietario}
                      </div>
                      <div className="text-xs text-slate-500">
                        {fila.telefono}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      {fila.pago_id || "-"}
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-blue-700">
                      RD$ {dinero(fila.monto_original)}
                    </td>

                    <td className="px-4 py-3 text-right font-black text-emerald-700">
                      RD$ {dinero(fila.monto_disponible)}
                    </td>

                    <td className="px-4 py-3 text-right font-black text-indigo-700">
                      RD$ {dinero(aplicado)}
                    </td>

                    <td className="min-w-64 px-4 py-3">
                      {fila.concepto || "Crédito a favor"}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${claseEstado(
                          fila.estado,
                        )}`}
                      >
                        {fila.estado || "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      {fechaDominicana(fila.created_at)}
                    </td>
                  </tr>
                );
              })}

              <tr className="bg-slate-100 font-black">
                <td className="px-4 py-3" colSpan={3}>
                  TOTAL
                </td>

                <td className="px-4 py-3 text-right text-blue-700">
                  RD$ {dinero(totalOriginal)}
                </td>

                <td className="px-4 py-3 text-right text-emerald-700">
                  RD$ {dinero(totalDisponible)}
                </td>

                <td className="px-4 py-3 text-right text-indigo-700">
                  RD$ {dinero(totalAplicado)}
                </td>

                <td className="px-4 py-3 text-center" colSpan={3}>
                  -
                </td>
              </tr>
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p>
          <strong>Nota:</strong> este módulo consulta y registra en la tabla{" "}
          <strong>creditos_propietarios</strong>. Los créditos manuales se usan
          para cargar saldos iniciales a favor durante la apertura del lote. El monto disponible representa
          el saldo pendiente de aplicar. Al usar{" "}
          <strong>Aplicar créditos</strong>, el sistema ejecuta la función{" "}
          <strong>aplicar_creditos_a_cargos</strong> para rebajar cargos
          pendientes en <strong>cargos_periodicos</strong>.
        </p>
      </div>
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
  tone?: "slate" | "blue" | "emerald" | "red" | "yellow" | "indigo";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : tone === "emerald"
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : tone === "red"
          ? "bg-red-50 text-red-700 border-red-100"
          : tone === "yellow"
            ? "bg-yellow-50 text-yellow-700 border-yellow-100"
            : tone === "indigo"
              ? "bg-indigo-50 text-indigo-700 border-indigo-100"
              : "bg-white text-slate-800 border-slate-200";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2 className="mt-2 text-2xl font-black">{value}</h2>
    </div>
  );
}