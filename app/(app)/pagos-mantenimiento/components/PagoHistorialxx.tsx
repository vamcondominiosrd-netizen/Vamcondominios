"use client";

import Link from "next/link";
import { Eye, ReceiptText } from "lucide-react";
import type { Pago } from "../types";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type Props = {
  pagos: Pago[];
  loading: boolean;
};

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
  });
}

export default function PagoHistorial({ pagos, loading }: Props) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="border-b p-4">
        <h2 className="font-black text-slate-900">
          Historial de pagos aplicados
        </h2>
        <p className="text-sm text-slate-500">
          Pagos registrados y aplicados a cargos de mantenimiento.
        </p>
      </div>

      {loading ? (
        <div className="p-6 text-sm text-slate-500">Cargando pagos...</div>
      ) : pagos.length === 0 ? (
        <EmptyState
          title="Sin pagos registrados"
          description="No existen pagos de mantenimiento para este condominio."
        />
      ) : (
        <DataTable>
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">Unidad</th>
              <th className="px-4 py-3 text-left">Propietario</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3 text-left">Fondo</th>
              <th className="px-4 py-3 text-left">Método</th>
              <th className="px-4 py-3 text-left">Origen</th>
              <th className="px-4 py-3 text-left">Referencia</th>
              <th className="px-4 py-3 text-center">Comprobante</th>
              <th className="px-4 py-3 text-center">Recibo</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {pagos.map((p) => (
              <tr key={p.id} className="bg-white hover:bg-slate-50">
                <td className="px-4 py-3 font-bold">
                  {p.unidades?.codigo || "N/A"}
                </td>

                <td className="px-4 py-3">
                  {p.unidades?.propietario_nombre || "-"}
                </td>

                <td className="px-4 py-3">{p.fecha_pago}</td>

                <td className="px-4 py-3 text-right font-black text-green-700">
                  RD$ {dinero(p.monto)}
                </td>

                <td className="px-4 py-3">{p.tipo_fondo || "-"}</td>
                <td className="px-4 py-3">{p.metodo_pago || "-"}</td>
                <td className="px-4 py-3">{p.origen || "-"}</td>
                <td className="px-4 py-3">{p.referencia || "-"}</td>

                <td className="px-4 py-3 text-center">
                  {p.comprobante_url ? (
                    <a
                      href={p.comprobante_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">Sin archivo</span>
                  )}
                </td>

                <td className="px-4 py-3 text-center">
                  <Link
                    href={`/recibos/pago/pagos/${p.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-purple-700 px-3 py-1 text-xs font-bold text-white hover:bg-purple-800"
                  >
                    <ReceiptText className="h-3.5 w-3.5" />
                    Recibo
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}