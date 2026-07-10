"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CreditCard,
  FileText,
  RefreshCw,
  Search,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

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
  codigo: string;
  propietario_nombre: string | null;
  propietario_cedula: string | null;
  propietario_telefono: string | null;
  cuota_mensual_actual: number | null;
};

type Cargo = {
  id: number;
  periodo: string;
  concepto: string;
  tipo_cargo: string;
  monto: number;
  monto_pagado: number;
  balance: number;
  estado: string;
  fecha_emision?: string | null;
  fecha_vencimiento?: string | null;
};

type Credito = {
  id: number;
  monto_original: number | null;
  monto_disponible: number | null;
  concepto: string | null;
  estado: string | null;
};

function dinero(valor: string | number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fechaCorta(valor?: string | null) {
  if (!valor) return "-";
  return String(valor).split("T")[0];
}

export default function EstadoCuentaPage() {
  const searchParams = useSearchParams();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [unidadId, setUnidadId] = useState("");
  const [buscarUnidad, setBuscarUnidad] = useState("");
  const [mostrarResultados, setMostrarResultados] = useState(false);

  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [creditos, setCreditos] = useState<Credito[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const unidadQuery = searchParams.get("unidad_id") || "";

    if (!id) return;

    setCondominioId(id);
    setCondominioNombre(nombre);
    cargarUnidades(id, unidadQuery);
  }, [searchParams]);

  async function cargarUnidades(id: string, unidadInicial = "") {
    const { data, error } = await supabase
      .from("unidades")
      .select(
        "id, codigo, propietario_nombre, propietario_cedula, propietario_telefono, cuota_mensual_actual"
      )
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo");

    if (error) {
      alert("Error cargando unidades: " + error.message);
      return;
    }

    const lista = (data as Unidad[]) || [];
    setUnidades(lista);

    if (unidadInicial) {
      const unidad = lista.find((u) => String(u.id) === String(unidadInicial));
      if (unidad) {
        setUnidadId(String(unidad.id));
        setBuscarUnidad(`${unidad.codigo} - ${unidad.propietario_nombre || "Sin propietario"}`);
        cargarEstadoCuenta(String(unidad.id), id);
      }
    }
  }

  async function cargarEstadoCuenta(unidad: string, idCondominio = condominioId) {
    if (!unidad || !idCondominio) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("cargos_periodicos")
      .select(`
        id,
        periodo,
        concepto,
        tipo_cargo,
        monto,
        monto_pagado,
        balance,
        estado,
        fecha_emision,
        fecha_vencimiento
      `)
      .eq("condominio_id", Number(idCondominio))
      .eq("unidad_id", Number(unidad))
      .order("anio", { ascending: true })
      .order("mes", { ascending: true })
      .order("id", { ascending: true });

    const { data: creditosData } = await supabase
      .from("creditos_propietarios")
      .select("id, monto_original, monto_disponible, concepto, estado")
      .eq("condominio_id", Number(idCondominio))
      .eq("unidad_id", Number(unidad))
      .gt("monto_disponible", 0)
      .eq("estado", "DISPONIBLE")
      .order("id", { ascending: true });

    setLoading(false);

    if (error) {
      alert("Error cargando estado financiero: " + error.message);
      return;
    }

    setCargos((data as Cargo[]) || []);
    setCreditos((creditosData as Credito[]) || []);
  }

  async function refrescar() {
    if (unidadId) await cargarEstadoCuenta(unidadId);
  }

  function seleccionarUnidad(id: string) {
    const unidad = unidades.find((u) => String(u.id) === id);
    setUnidadId(id);
    setMostrarResultados(false);

    if (unidad) {
      setBuscarUnidad(`${unidad.codigo} - ${unidad.propietario_nombre || "Sin propietario"}`);
    }

    cargarEstadoCuenta(id);
  }

  const unidadesFiltradas = useMemo(() => {
    const q = buscarUnidad.toLowerCase().trim();
    if (!q) return unidades.slice(0, 8);

    return unidades
      .filter((u) => {
        const texto = `${u.codigo || ""} ${u.propietario_nombre || ""} ${
          u.propietario_cedula || ""
        } ${u.propietario_telefono || ""}`.toLowerCase();

        return texto.includes(q);
      })
      .slice(0, 10);
  }, [unidades, buscarUnidad]);

  const unidadSeleccionada = useMemo(() => {
    return unidades.find((u) => String(u.id) === unidadId) || null;
  }, [unidades, unidadId]);

  const totalFacturado = cargos.reduce((sum, c) => sum + Number(c.monto || 0), 0);
  const totalPagado = cargos.reduce((sum, c) => sum + Number(c.monto_pagado || 0), 0);
  const balancePendiente = cargos.reduce((sum, c) => sum + Number(c.balance || 0), 0);
  const creditoDisponible = creditos.reduce(
    (sum, c) => sum + Number(c.monto_disponible || 0),
    0
  );

  const cargosPendientes = cargos.filter((c) => Number(c.balance || 0) > 0);
  const cargosPagados = cargos.filter((c) => String(c.estado || "") === "PAGADO");

  return (
    <PageContainer>
      <ModuleMenu
        title="Centro de Cobros"
        subtitle="Pagos, banco, recibos, créditos y estado financiero."
        tone="green"
        items={[
          { href: "/pagos-mantenimiento", label: "Registrar Pago", icon: Banknote },
          { href: "/archivo-banco/importar", label: "Importar Banco", icon: WalletCards },
          { href: "/archivo-banco/identificar", label: "Identificar", icon: RefreshCw },
          { href: "/pagos-mantenimiento/historial", label: "Historial", icon: FileText },
          { href: "/creditos", label: "Créditos", icon: CreditCard },
          { href: "/estado-cuenta", label: "Estado Financiero", icon: CalendarDays },
        ]}
      />

      <ModuleToolbar
        title="Estado Financiero de la Unidad"
        subtitle={`Facturación, pagos, balance y créditos. Condominio: ${
          condominioNombre || "No seleccionado"
        }.`}
        icon={CalendarDays}
        actions={
          <ModuleActions
            onRefresh={refrescar}
            extra={
              <Link
                href="/pagos-mantenimiento"
                className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a cobros
              </Link>
            }
          />
        }
      />

      <SectionCard
        title="Buscar unidad"
        subtitle="Puede buscar por unidad, propietario, cédula o teléfono."
      >
        <div className="relative">
          <div className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={buscarUnidad}
              onChange={(e) => {
                setBuscarUnidad(e.target.value);
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
                    Cédula: {u.propietario_cedula || "-"} · Tel.:{" "}
                    {u.propietario_telefono || "-"} · Cuota: RD${" "}
                    {dinero(u.cuota_mensual_actual)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Facturado"
          value={`RD$ ${dinero(totalFacturado)}`}
          subtitle={`${cargos.length} cargo(s)`}
          icon={FileText}
          tone="blue"
        />

        <StatCard
          title="Pagado"
          value={`RD$ ${dinero(totalPagado)}`}
          subtitle={`${cargosPagados.length} pagado(s)`}
          icon={Banknote}
          tone="green"
        />

        <StatCard
          title="Balance"
          value={`RD$ ${dinero(balancePendiente)}`}
          subtitle={`${cargosPendientes.length} pendiente(s)`}
          icon={CalendarDays}
          tone={balancePendiente > 0 ? "amber" : "green"}
        />

        <StatCard
          title="Crédito"
          value={`RD$ ${dinero(creditoDisponible)}`}
          subtitle="Disponible"
          icon={CreditCard}
          tone={creditoDisponible > 0 ? "blue" : "slate"}
        />
      </div>

      {unidadSeleccionada && (
        <SectionCard title="Resumen de la unidad" subtitle="Datos principales.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <InfoLine label="Unidad" value={unidadSeleccionada.codigo} />
            <InfoLine label="Propietario" value={unidadSeleccionada.propietario_nombre || "-"} />
            <InfoLine
              label="Cuota mensual"
              value={`RD$ ${dinero(unidadSeleccionada.cuota_mensual_actual)}`}
            />
            <InfoLine label="Teléfono" value={unidadSeleccionada.propietario_telefono || "-"} />
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Detalle financiero"
        subtitle="Cargos generados, pagos aplicados y balance pendiente."
      >
        {loading ? (
          <p className="text-sm text-slate-500">Cargando estado financiero...</p>
        ) : !unidadId ? (
          <EmptyState
            title="Seleccione una unidad"
            description="Seleccione una unidad para consultar su estado financiero."
          />
        ) : cargos.length === 0 ? (
          <EmptyState
            title="Sin cargos"
            description="No hay cargos generados para esta unidad."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Período</th>
                <th className="px-4 py-3 text-left">Concepto</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-right">Facturado</th>
                <th className="px-4 py-3 text-right">Pagado</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-center">Estado</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {cargos.map((c) => (
                <tr key={c.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-black">{c.periodo}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{c.concepto || "-"}</p>
                    <p className="text-xs text-slate-500">
                      Vence: {fechaCorta(c.fecha_vencimiento)}
                    </p>
                  </td>
                  <td className="px-4 py-3">{c.tipo_cargo || "-"}</td>
                  <td className="px-4 py-3 text-right font-bold">
                    RD$ {dinero(c.monto)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">
                    RD$ {dinero(c.monto_pagado)}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-red-700">
                    RD$ {dinero(c.balance)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        c.estado === "PAGADO"
                          ? "bg-green-100 text-green-700"
                          : c.estado === "PARCIAL"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {c.estado || "PENDIENTE"}
                    </span>
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

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-black text-slate-900">{value}</p>
    </div>
  );
}
