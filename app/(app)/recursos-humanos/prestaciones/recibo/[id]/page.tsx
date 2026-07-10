"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type Prestacion = {
  id: number;
  condominio_id: number;
  condominio: string | null;
  empleado_id: number;
  numero_empleado: string | null;
  nombre_empleado: string | null;
  cargo: string | null;
  departamento: string | null;
  fecha_ingreso: string | null;
  fecha_salida: string | null;
  salario_mensual: number | null;
  tipo_salida: string;
  tiempo_laborado: string | null;
  meses_laborados: number | null;
  anios_laborados: number | null;
  preaviso: number | null;
  cesantia: number | null;
  vacaciones_pendientes: number | null;
  regalia_proporcional: number | null;
  otros_pagos: number | null;
  descuentos: number | null;
  total_prestaciones: number | null;
  estado: string | null;
  observacion: string | null;
  calculado_por: string | null;
  fecha_calculo: string | null;
  created_at: string | null;
  salario_diario: number | null;
  dias_preaviso: number | null;
  dias_cesantia: number | null;
  dias_vacaciones: number | null;
};

type Detalle = {
  id: number;
  concepto: string;
  dias: number | null;
  monto: number | null;
  observacion: string | null;
};

export default function ReciboPrestacionesPage() {
  const params = useParams();
  const id = params?.id as string;

  const [prestacion, setPrestacion] = useState<Prestacion | null>(null);
  const [detalles, setDetalles] = useState<Detalle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      cargarPrestacion(id);
    }
  }, [id]);

  async function cargarPrestacion(prestacionId: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("rh_prestaciones_laborales")
      .select("*")
      .eq("id", Number(prestacionId))
      .maybeSingle();

    if (error) {
      setLoading(false);
      alert("Error cargando recibo de prestaciones: " + error.message);
      return;
    }

    setPrestacion((data as Prestacion) || null);

    const { data: dataDetalle, error: errorDetalle } = await supabase
      .from("rh_prestaciones_detalle")
      .select("id, concepto, dias, monto, observacion")
      .eq("prestacion_id", Number(prestacionId))
      .order("id", { ascending: true });

    setLoading(false);

    if (errorDetalle) {
      alert("Error cargando detalle de prestaciones: " + errorDetalle.message);
      return;
    }

    setDetalles((dataDetalle as Detalle[]) || []);
  }

  function moneda(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function fecha(valor: string | null | undefined) {
    if (!valor) return "-";

    const partes = valor.split("-");
    if (partes.length !== 3) return valor;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  function imprimir() {
    window.print();
  }

  function reciboNo(idValor: number) {
    return `PL-${String(idValor).padStart(6, "0")}`;
  }

  if (loading) {
    return <div className="p-6">Cargando recibo...</div>;
  }

  if (!prestacion) {
    return (
      <div className="p-6">
        <div className="bg-white border rounded-2xl p-6">
          <h1 className="text-2xl font-black">Recibo no encontrado</h1>
          <Link
            href="/recursos-humanos/prestaciones"
            className="inline-block mt-4 bg-slate-700 text-white px-5 py-3 rounded-xl font-bold"
          >
            Volver
          </Link>
        </div>
      </div>
    );
  }

  const detalleMostrar =
    detalles.length > 0
      ? detalles
      : [
          {
            id: 1,
            concepto: "Preaviso",
            dias: prestacion.dias_preaviso,
            monto: prestacion.preaviso,
            observacion: "",
          },
          {
            id: 2,
            concepto: "Cesantía",
            dias: prestacion.dias_cesantia,
            monto: prestacion.cesantia,
            observacion: "",
          },
          {
            id: 3,
            concepto: "Vacaciones pendientes",
            dias: prestacion.dias_vacaciones,
            monto: prestacion.vacaciones_pendientes,
            observacion: "",
          },
          {
            id: 4,
            concepto: "Regalía proporcional",
            dias: 0,
            monto: prestacion.regalia_proporcional,
            observacion: "",
          },
          {
            id: 5,
            concepto: "Otros pagos",
            dias: 0,
            monto: prestacion.otros_pagos,
            observacion: "",
          },
          {
            id: 6,
            concepto: "Descuentos",
            dias: 0,
            monto: prestacion.descuentos,
            observacion: "",
          },
        ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 print:bg-white print:p-0">
      <div className="max-w-5xl mx-auto mb-5 flex flex-col md:flex-row gap-3 justify-between print:hidden">
        <Link
          href="/recursos-humanos/prestaciones"
          className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-center"
        >
          Volver
        </Link>

        <button
          onClick={imprimir}
          className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold"
        >
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className="max-w-5xl mx-auto bg-white border shadow-sm rounded-3xl p-8 print:shadow-none print:border-0 print:rounded-none">
        <div className="border-b pb-5 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900">
                Recibo de Prestaciones Laborales
              </h1>
              <p className="text-slate-500 mt-1">
                VAM Administradora de Condominios
              </p>
              <p className="text-slate-500">
                {prestacion.condominio || "Condominio no identificado"}
              </p>
            </div>

            <div className="text-left md:text-right">
              <p className="text-sm text-slate-500">Recibo No.</p>
              <p className="text-2xl font-black text-blue-700">
                {reciboNo(prestacion.id)}
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Fecha cálculo: {fecha(prestacion.fecha_calculo)}
              </p>
              <p className="text-sm text-slate-500">
                Estado: {prestacion.estado || "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="border rounded-2xl p-5">
            <h2 className="font-black text-lg mb-3">Datos del empleado</h2>

            <div className="space-y-2 text-sm">
              <p>
                <span className="font-bold">Empleado:</span>{" "}
                {prestacion.nombre_empleado || "-"}
              </p>
              <p>
                <span className="font-bold">No. empleado:</span>{" "}
                {prestacion.numero_empleado || "-"}
              </p>
              <p>
                <span className="font-bold">Cargo:</span>{" "}
                {prestacion.cargo || "-"}
              </p>
              <p>
                <span className="font-bold">Departamento:</span>{" "}
                {prestacion.departamento || "-"}
              </p>
            </div>
          </div>

          <div className="border rounded-2xl p-5">
            <h2 className="font-black text-lg mb-3">Datos laborales</h2>

            <div className="space-y-2 text-sm">
              <p>
                <span className="font-bold">Fecha ingreso:</span>{" "}
                {fecha(prestacion.fecha_ingreso)}
              </p>
              <p>
                <span className="font-bold">Fecha salida:</span>{" "}
                {fecha(prestacion.fecha_salida)}
              </p>
              <p>
                <span className="font-bold">Tiempo laborado:</span>{" "}
                {prestacion.tiempo_laborado || "-"}
              </p>
              <p>
                <span className="font-bold">Tipo de salida:</span>{" "}
                {prestacion.tipo_salida || "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-50 border rounded-2xl p-5">
            <p className="text-sm text-slate-500">Salario mensual</p>
            <p className="text-2xl font-black">
              RD${moneda(prestacion.salario_mensual)}
            </p>
          </div>

          <div className="bg-slate-50 border rounded-2xl p-5">
            <p className="text-sm text-slate-500">Salario diario</p>
            <p className="text-2xl font-black">
              RD${moneda(prestacion.salario_diario)}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <p className="text-sm text-blue-700">Total a pagar</p>
            <p className="text-2xl font-black text-blue-800">
              RD${moneda(prestacion.total_prestaciones)}
            </p>
          </div>
        </div>

        <div className="border rounded-2xl overflow-hidden mb-6">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 border text-left">Concepto</th>
                <th className="p-3 border text-right">Días</th>
                <th className="p-3 border text-right">Monto</th>
              </tr>
            </thead>

            <tbody>
              {detalleMostrar.map((item) => {
                const esDescuento = item.concepto === "Descuentos";

                return (
                  <tr key={item.id}>
                    <td className="p-3 border font-bold">
                      {item.concepto}
                      {item.observacion && (
                        <p className="text-xs text-slate-500 font-normal mt-1">
                          {item.observacion}
                        </p>
                      )}
                    </td>

                    <td className="p-3 border text-right">
                      {Number(item.dias || 0) > 0 ? Number(item.dias || 0) : "-"}
                    </td>

                    <td
                      className={`p-3 border text-right font-bold ${
                        esDescuento ? "text-red-700" : "text-slate-900"
                      }`}
                    >
                      {esDescuento ? "-" : ""}RD${moneda(item.monto)}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot className="bg-slate-900 text-white">
              <tr>
                <td className="p-4 border font-black" colSpan={2}>
                  TOTAL A PAGAR
                </td>
                <td className="p-4 border text-right font-black text-xl">
                  RD${moneda(prestacion.total_prestaciones)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {prestacion.observacion && (
          <div className="border rounded-2xl p-5 mb-8">
            <h2 className="font-black text-lg mb-2">Observación</h2>
            <p className="text-sm text-slate-700">{prestacion.observacion}</p>
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="text-center">
            <div className="border-t border-slate-900 pt-3">
              <p className="font-black">Empleado</p>
              <p className="text-sm text-slate-500 mt-2">Nombre:</p>
              <p className="text-sm text-slate-500">Cédula:</p>
              <p className="text-sm text-slate-500">Fecha:</p>
            </div>
          </div>

          <div className="text-center">
            <div className="border-t border-slate-900 pt-3">
              <p className="font-black">Administración / Recursos Humanos</p>
              <p className="text-sm text-slate-500 mt-2">
                VAM Administradora de Condominios
              </p>
              <p className="text-sm text-slate-500">
                Calculado por: {prestacion.calculado_por || "-"}
              </p>
              <p className="text-sm text-slate-500">Fecha:</p>
            </div>
          </div>
        </div>

        <div className="mt-10 text-xs text-slate-500 border-t pt-4">
          <p>
            Este documento resume los valores calculados por concepto de
            prestaciones laborales según los datos registrados en el sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
