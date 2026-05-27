"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Condominio = { id: number; nombre: string };
type Unidad = { id: number; codigo: string };

type Cargo = {
  id: number;
  periodo: string;
  concepto: string;
  tipo_cargo: string;
  monto: number;
  monto_pagado: number;
  balance: number;
  estado: string;
};

export default function ConsultaEstadoPage() {
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);

  const [condominioId, setCondominioId] = useState("");
  const [unidadId, setUnidadId] = useState("");
  const [cedula, setCedula] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const [ultimoMesPagado, setUltimoMesPagado] = useState("");
  const [mesesPendientes, setMesesPendientes] = useState(0);
  const [cargosExtraordinarios, setCargosExtraordinarios] = useState(0);

  useEffect(() => {
    cargarCondominios();
  }, []);

  async function cargarCondominios() {
    const { data, error } = await supabase
      .from("condominios")
      .select("id, nombre")
      .order("nombre");

    if (error) {
      setMensaje(error.message);
      return;
    }

    setCondominios(data || []);
  }

  async function cargarUnidades(id: string) {
    setCondominioId(id);
    setUnidadId("");
    setCargos([]);

    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(id))
      .order("codigo");

    if (error) {
      setMensaje(error.message);
      return;
    }

    setUnidades(data || []);
  }

  async function consultarEstado() {
    if (!condominioId || !unidadId || !cedula) {
      setMensaje("Debe completar condominio, unidad y cédula.");
      return;
    }

    setLoading(true);
    setMensaje("");

    const cedulaLimpia = cedula.replace(/\D/g, "");
    const unidadCodigo = unidades.find((u) => String(u.id) === unidadId)?.codigo;

    const { data: propietarios, error: errorPropietario } = await supabase
      .from("propietarios_apartamentos")
      .select("id, cedula, no_apartamento, condominio_id")
      .eq("condominio_id", Number(condominioId))
      .eq("no_apartamento", unidadCodigo);

    if (errorPropietario) {
      setLoading(false);
      setMensaje(errorPropietario.message);
      return;
    }

    const propietarioValido = (propietarios || []).find((p: any) => {
      const cedulaDB = String(p.cedula || "").replace(/\D/g, "");
      return cedulaDB === cedulaLimpia;
    });

    if (!propietarioValido) {
      setLoading(false);
      setMensaje("La cédula no coincide con la unidad seleccionada.");
      return;
    }

    const { data, error } = await supabase
      .from("cargos_periodicos")
      .select("id, periodo, concepto, tipo_cargo, monto, monto_pagado, balance, estado")
      .eq("condominio_id", Number(condominioId))
      .eq("unidad_id", Number(unidadId))
      .order("anio")
      .order("mes");

    setLoading(false);

    if (error) {
      setMensaje(error.message);
      return;
    }

    const cargosData = data || [];
    setCargos(cargosData);

    const pagados = cargosData.filter((c) => c.estado === "PAGADO");
    setUltimoMesPagado(pagados.length > 0 ? pagados[pagados.length - 1]?.periodo || "" : "Sin pagos");

    setMesesPendientes(
      cargosData.filter((c) => Number(c.balance || 0) > 0).length
    );

    setCargosExtraordinarios(
      cargosData
        .filter((c) => c.tipo_cargo === "EXTRAORDINARIO")
        .reduce((sum, c) => sum + Number(c.balance || 0), 0)
    );
  }

  const totalFacturado = cargos.reduce((sum, c) => sum + Number(c.monto || 0), 0);
  const totalPagado = cargos.reduce((sum, c) => sum + Number(c.monto_pagado || 0), 0);
  const balancePendiente = cargos.reduce((sum, c) => sum + Number(c.balance || 0), 0);

  function descargarPDF() {
    const condominioNombre =
      condominios.find((c) => String(c.id) === condominioId)?.nombre || "";

    const unidadCodigo =
      unidades.find((u) => String(u.id) === unidadId)?.codigo || "";

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Estado de Cuenta", 14, 18);

    doc.setFontSize(10);
    doc.text(`Condominio: ${condominioNombre}`, 14, 28);
    doc.text(`Unidad: ${unidadCodigo}`, 14, 35);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-DO")}`, 14, 42);

    doc.text(`Total facturado: RD$ ${totalFacturado.toLocaleString("es-DO")}`, 14, 54);
    doc.text(`Total pagado: RD$ ${totalPagado.toLocaleString("es-DO")}`, 14, 61);
    doc.text(`Balance pendiente: RD$ ${balancePendiente.toLocaleString("es-DO")}`, 14, 68);
    doc.text(`Último mes pagado: ${ultimoMesPagado}`, 14, 75);
    doc.text(`Meses pendientes: ${mesesPendientes}`, 14, 82);
    doc.text(`Extraordinarios pendientes: RD$ ${cargosExtraordinarios.toLocaleString("es-DO")}`, 14, 89);

    autoTable(doc, {
      startY: 98,
      head: [["Periodo", "Concepto", "Tipo", "Facturado", "Pagado", "Balance", "Estado"]],
      body: cargos.map((c) => [
        c.periodo,
        c.concepto,
        c.tipo_cargo,
        `RD$ ${Number(c.monto).toLocaleString("es-DO")}`,
        `RD$ ${Number(c.monto_pagado).toLocaleString("es-DO")}`,
        `RD$ ${Number(c.balance).toLocaleString("es-DO")}`,
        c.estado,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`Estado_Cuenta_${unidadCodigo}.pdf`);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h1 className="text-3xl font-bold">Estado de Cuenta Inteligente</h1>
          <p className="text-slate-500 mt-2">Consulta financiera del propietario.</p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select value={condominioId} onChange={(e) => cargarUnidades(e.target.value)} className="border rounded-xl px-4 py-3">
              <option value="">Seleccione condominio</option>
              {condominios.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>

            <select value={unidadId} onChange={(e) => setUnidadId(e.target.value)} className="border rounded-xl px-4 py-3">
              <option value="">Seleccione unidad</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>{u.codigo}</option>
              ))}
            </select>

            <input type="text" value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="Cédula" className="border rounded-xl px-4 py-3" />

            <button onClick={consultarEstado} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-3">
              {loading ? "Consultando..." : "Consultar"}
            </button>
          </div>

          {mensaje && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700">
              {mensaje}
            </div>
          )}
        </div>

        {cargos.length > 0 && (
          <>
            <button
              onClick={descargarPDF}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5 py-3"
            >
              Descargar PDF
            </button>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card title="Total Facturado" value={`RD$ ${totalFacturado.toLocaleString()}`} color="text-slate-800" />
              <Card title="Total Pagado" value={`RD$ ${totalPagado.toLocaleString()}`} color="text-green-700" />
              <Card title="Balance Pendiente" value={`RD$ ${balancePendiente.toLocaleString()}`} color="text-red-700" />
              <Card title="Último Mes Pagado" value={ultimoMesPagado} color="text-blue-700" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="Meses Pendientes" value={String(mesesPendientes)} color="text-orange-700" />
              <Card title="Cargos Extraordinarios" value={`RD$ ${cargosExtraordinarios.toLocaleString()}`} color="text-purple-700" />
            </div>

            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="font-bold">Estado detallado</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Periodo</th>
                      <th className="px-4 py-3 text-left">Concepto</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-right">Facturado</th>
                      <th className="px-4 py-3 text-right">Pagado</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3 text-center">Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {cargos.map((c) => (
                      <tr key={c.id} className="border-t">
                        <td className="px-4 py-3 font-medium">{c.periodo}</td>
                        <td className="px-4 py-3">{c.concepto}</td>
                        <td className="px-4 py-3">{c.tipo_cargo}</td>
                        <td className="px-4 py-3 text-right">RD$ {Number(c.monto).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-green-700 font-bold">RD$ {Number(c.monto_pagado).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-red-700 font-bold">RD$ {Number(c.balance).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={
                            c.estado === "PAGADO"
                              ? "bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-bold"
                              : c.estado === "PARCIAL"
                              ? "bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-xs font-bold"
                              : "bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-bold"
                          }>
                            {c.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Card({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className={`text-2xl font-bold mt-2 ${color}`}>{value}</h2>
    </div>
  );
}