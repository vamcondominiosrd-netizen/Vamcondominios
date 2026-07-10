"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Landmark,
  ReceiptText,
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

type Gasto = {
  id: number;
  condominio_id?: number;
  condominio: string | null;
  fecha: string | null;
  concepto: string | null;
  detalle_gasto: string | null;
  monto: number | null;
  itbis: number | null;
  total: number | null;
  no_factura: string | null;
  ncf: string | null;
  metodo_pago: string | null;
  cuenta_banco: string | null;
  factura_url: string | null;
  estado: string | null;
  categoria_id?: number | null;
  proveedor_id?: number | null;
  aprobado_tesorero?: boolean | null;
  aprobado_presidente?: boolean | null;
  fecha_aprobacion_tesorero?: string | null;
  fecha_aprobacion_presidente?: string | null;
  cheque_url?: string | null;
  numero_cheque?: string | null;
  fecha_pago?: string | null;
  pagado?: boolean | null;
  catalogo_proveedores?: { nombre_proveedor: string | null } | null;
  catalogo_categoria_gastos?: { nombre_categoria: string | null } | null;
};

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
  });
}

function estadoColor(g: Gasto) {
  if (g.pagado) return "bg-green-100 text-green-700";
  if (g.aprobado_tesorero && g.aprobado_presidente && !g.pagado) {
    return "bg-blue-100 text-blue-700";
  }
  if (g.aprobado_tesorero && !g.aprobado_presidente) {
    return "bg-yellow-100 text-yellow-700";
  }
  return "bg-slate-100 text-slate-700";
}

function etiquetaEstado(g: Gasto) {
  if (g.pagado) return "Pagado";
  if (g.aprobado_tesorero && g.aprobado_presidente && !g.pagado) {
    return "Aprobado pendiente de pago";
  }
  if (g.aprobado_tesorero && !g.aprobado_presidente) {
    return "Pendiente presidente";
  }
  return g.estado || "Sin estado";
}

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(false);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      alert("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    const nombreFinal = nombre || `Condominio ID ${id}`;

    setCondominioId(id);
    setCondominioNombre(nombreFinal);
    cargarGastos(id, nombreFinal);
  }, []);

  async function cargarGastos(id: string, nombreCondominio: string) {
    if (!id && !nombreCondominio) return;

    setLoading(true);

    let query = supabase
      .from("gastos")
      .select(`
        id,
        condominio_id,
        condominio,
        fecha,
        concepto,
        detalle_gasto,
        monto,
        itbis,
        total,
        no_factura,
        ncf,
        metodo_pago,
        cuenta_banco,
        factura_url,
        estado,
        categoria_id,
        proveedor_id,
        aprobado_tesorero,
        aprobado_presidente,
        fecha_aprobacion_tesorero,
        fecha_aprobacion_presidente,
        cheque_url,
        numero_cheque,
        fecha_pago,
        pagado,
        catalogo_proveedores(nombre_proveedor),
        catalogo_categoria_gastos(nombre_categoria)
      `)
      .order("fecha", { ascending: false });

    if (id) {
      query = query.eq("condominio_id", Number(id));
    } else {
      query = query.eq("condominio", nombreCondominio);
    }

    const { data, error } = await query;

    setLoading(false);

    if (error) {
      alert("Error cargando gastos: " + error.message);
      return;
    }

    setGastos((data as Gasto[]) || []);
  }

  const gastosFiltrados = useMemo(() => {
    return gastos.filter((g) => {
      let cumpleEstado = true;

      if (filtroEstado === "pagado") {
        cumpleEstado = g.pagado === true;
      }

      if (filtroEstado === "pendiente_pago") {
        cumpleEstado =
          g.aprobado_tesorero === true &&
          g.aprobado_presidente === true &&
          g.pagado !== true;
      }

      if (filtroEstado === "pendiente_presidente") {
        cumpleEstado =
          g.aprobado_tesorero === true && g.aprobado_presidente !== true;
      }

      if (filtroEstado === "sin_pagar") {
        cumpleEstado = g.pagado !== true;
      }

      const texto = `${g.id || ""} ${g.fecha || ""} ${g.concepto || ""} ${
        g.detalle_gasto || ""
      } ${g.no_factura || ""} ${g.ncf || ""} ${g.metodo_pago || ""} ${
        g.numero_cheque || ""
      } ${g.catalogo_proveedores?.nombre_proveedor || ""} ${
        g.catalogo_categoria_gastos?.nombre_categoria || ""
      } ${g.estado || ""}`.toLowerCase();

      return cumpleEstado && texto.includes(buscar.toLowerCase().trim());
    });
  }, [gastos, buscar, filtroEstado]);

  const totalGastos = gastosFiltrados.reduce(
    (sum, g) => sum + Number(g.total || 0),
    0
  );

  const totalPagado = gastosFiltrados
    .filter((g) => g.pagado)
    .reduce((sum, g) => sum + Number(g.total || 0), 0);

  const totalPendientePago = gastosFiltrados
    .filter(
      (g) =>
        g.aprobado_tesorero === true &&
        g.aprobado_presidente === true &&
        g.pagado !== true
    )
    .reduce((sum, g) => sum + Number(g.total || 0), 0);

  const cantidadPagados = gastosFiltrados.filter((g) => g.pagado).length;

  const cantidadPendientePago = gastosFiltrados.filter(
    (g) =>
      g.aprobado_tesorero === true &&
      g.aprobado_presidente === true &&
      g.pagado !== true
  ).length;

  return (
    <PageContainer>
      <ModuleMenu
        title="Finanzas"
        subtitle="Pagos, gastos, solicitudes, caja chica, banco y reportes."
        tone="green"
        items={[
          { href: "/finanzas", label: "Dashboard", icon: BarChart3 },
          { href: "/finanzas/pagos", label: "Pagos", icon: CreditCard },
          { href: "/pagos-mantenimiento", label: "Mantenimiento", icon: WalletCards },
          { href: "/gastos", label: "Gastos", icon: ReceiptText },
          { href: "/finanzas/caja-chica", label: "Caja Chica", icon: WalletCards },
          { href: "/banco", label: "Banco", icon: Landmark },
          { href: "/solicitudes-pago", label: "Solicitudes", icon: FileText },
          { href: "/presupuesto", label: "Presupuesto", icon: FileSpreadsheet },
        ]}
      />

      <ModuleToolbar
        title="Gastos"
        subtitle="Consulta financiera de gastos generados desde Solicitudes de Pago."
        icon={ReceiptText}
        actions={
          <ModuleActions
            onRefresh={() => cargarGastos(condominioId, condominioNombre)}
            extra={
              <Link
                href="/solicitudes-pago"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
              >
                <FileText className="h-4 w-4" />
                Ir a solicitudes
              </Link>
            }
          />
        }
      />

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        Los gastos ya no se registran ni se aprueban desde este módulo. El ciclo
        completo se maneja desde <strong>Solicitudes de Pago</strong>. Este
        módulo queda como consulta financiera y contable.
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Registros"
          value={gastosFiltrados.length}
          subtitle="Filtrados"
          icon={ReceiptText}
          tone="slate"
        />

        <StatCard
          title="Monto total"
          value={`RD$ ${dinero(totalGastos)}`}
          subtitle="Según filtros"
          icon={FileSpreadsheet}
          tone="red"
        />

        <StatCard
          title="Pagados"
          value={cantidadPagados}
          subtitle={`RD$ ${dinero(totalPagado)}`}
          icon={CheckCircle}
          tone="green"
        />

        <StatCard
          title="Pendientes pago"
          value={cantidadPendientePago}
          subtitle={`RD$ ${dinero(totalPendientePago)}`}
          icon={RefreshCw}
          tone="blue"
        />
      </div>

      <SectionCard
        title="Filtros"
        subtitle={`Condominio activo: ${condominioNombre || "No seleccionado"}`}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold">Estado</label>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3"
            >
              <option value="">Todos</option>
              <option value="pagado">Pagados</option>
              <option value="pendiente_pago">Aprobados pendientes de pago</option>
              <option value="pendiente_presidente">Pendientes presidente</option>
              <option value="sin_pagar">Sin pagar</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Buscar</label>

            <div className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="w-full bg-transparent outline-none"
                placeholder="Proveedor, concepto, factura, NCF o cheque..."
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Gastos registrados"
        subtitle="Listado de gastos generados desde el flujo de Solicitudes de Pago."
        action={
          <div className="text-lg font-black text-red-700">
            RD$ {dinero(totalGastos)}
          </div>
        }
      >
        {loading ? (
          <p className="text-slate-500">Cargando gastos...</p>
        ) : gastosFiltrados.length === 0 ? (
          <EmptyState
            title="Sin gastos"
            description="No hay gastos registrados para esta consulta."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Proveedor</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-left">Concepto</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Factura</th>
                <th className="px-4 py-3 text-center">Cheque</th>
                <th className="px-4 py-3 text-center">Pago</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {gastosFiltrados.map((g) => (
                <tr key={g.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3">{g.fecha || "-"}</td>

                  <td className="px-4 py-3">
                    {g.catalogo_proveedores?.nombre_proveedor || "-"}
                  </td>

                  <td className="px-4 py-3">
                    {g.catalogo_categoria_gastos?.nombre_categoria || "-"}
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-semibold">{g.concepto || "-"}</p>

                    {g.detalle_gasto && (
                      <p className="mt-1 text-xs text-slate-500">
                        {g.detalle_gasto}
                      </p>
                    )}

                    <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                      {g.no_factura && <p>Factura: {g.no_factura}</p>}
                      {g.ncf && <p>NCF: {g.ncf}</p>}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-right font-bold">
                    RD$ {dinero(g.total)}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${estadoColor(
                        g
                      )}`}
                    >
                      {etiquetaEstado(g)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    {g.factura_url ? (
                      <a
                        href={g.factura_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white"
                      >
                        Ver factura
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Sin factura</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {g.cheque_url ? (
                      <a
                        href={g.cheque_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block rounded-lg bg-green-700 px-3 py-1 text-xs font-bold text-white"
                      >
                        Ver cheque
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Sin cheque</span>
                    )}

                    {g.numero_cheque && (
                      <p className="mt-1 text-xs text-slate-500">
                        No. {g.numero_cheque}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {g.pagado ? (
                      <div>
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                          Pagado
                        </span>

                        {g.fecha_pago && (
                          <p className="mt-1 text-xs text-slate-500">
                            {g.fecha_pago}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                        Pendiente
                      </span>
                    )}
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
