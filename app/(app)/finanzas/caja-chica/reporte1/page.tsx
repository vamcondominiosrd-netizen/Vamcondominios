"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Coins,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Search,
} from "lucide-react";
import * as XLSX from "xlsx";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";

type CajaChica = {
  id: number;
  condominio_id: number | null;
  condominio: string | null;
  fecha: string | null;
  concepto: string | null;
  detalle_gasto: string | null;
  monto: number | null;
  responsable: string | null;
  comprobante: string | null;
  factura_url: string | null;
  estado: string | null;
  created_at: string | null;
};

type CajaChicaFondo = {
  id: number;
  condominio_id: number | null;
  numero_fondo: number | null;
  condominio: string | null;
  fecha: string | null;
  tipo: string | null;
  monto: number | null;
  descripcion: string | null;
  responsable: string | null;
  created_at: string | null;
  estado: string | null;
};

type Condominio = {
  id: number;
  nombre: string | null;
  rnc: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  logo_url: string | null;
};

const MESES = [
  { valor: "01", nombre: "Enero" },
  { valor: "02", nombre: "Febrero" },
  { valor: "03", nombre: "Marzo" },
  { valor: "04", nombre: "Abril" },
  { valor: "05", nombre: "Mayo" },
  { valor: "06", nombre: "Junio" },
  { valor: "07", nombre: "Julio" },
  { valor: "08", nombre: "Agosto" },
  { valor: "09", nombre: "Septiembre" },
  { valor: "10", nombre: "Octubre" },
  { valor: "11", nombre: "Noviembre" },
  { valor: "12", nombre: "Diciembre" },
];

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fechaISO(valor?: string | null) {
  if (!valor) return "";
  return String(valor).split("T")[0];
}

function fechaDocumento(valor?: string | null) {
  const fecha = fechaISO(valor);
  const partes = fecha.split("-");

  if (partes.length !== 3) return valor || "-";

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function normalizarTexto(valor?: string | null) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function estaAnulado(estado?: string | null) {
  return normalizarTexto(estado).includes("anulad");
}

function nombreMes(mes: string) {
  return MESES.find((item) => item.valor === mes)?.nombre || mes;
}

function ultimoDiaMes(anio: string, mes: string) {
  const year = Number(anio);
  const month = Number(mes);

  if (!year || !month) return "";

  const ultimoDia = new Date(year, month, 0).getDate();
  return `${anio}-${mes}-${String(ultimoDia).padStart(2, "0")}`;
}

function numeroDesembolso(id: number, anio: string) {
  return `CC-${anio}-${String(id).padStart(5, "0")}`;
}

function textoEstado(estado?: string | null) {
  const valor = String(estado || "Registrado").trim();
  if (!valor) return "Registrado";

  return valor.charAt(0).toUpperCase() + valor.slice(1).toLowerCase();
}

function nombreArchivoSeguro(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function ReporteMensualCajaChicaPage() {
  const [gastos, setGastos] = useState<CajaChica[]>([]);
  const [fondos, setFondos] = useState<CajaChicaFondo[]>([]);
  const [condominio, setCondominio] = useState<Condominio | null>(null);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombreLocal, setCondominioNombreLocal] = useState("");

  const [anioFiltro, setAnioFiltro] = useState("");
  const [mesFiltro, setMesFiltro] = useState("");
  const [anioReporte, setAnioReporte] = useState("");
  const [mesReporte, setMesReporte] = useState("");

  const [fechaGeneracion, setFechaGeneracion] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorTexto, setErrorTexto] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const ahora = new Date();
    const anioActual = String(ahora.getFullYear());
    const mesActual = String(ahora.getMonth() + 1).padStart(2, "0");

    setCondominioId(id);
    setCondominioNombreLocal(nombre);
    setAnioFiltro(anioActual);
    setMesFiltro(mesActual);
    setAnioReporte(anioActual);
    setMesReporte(mesActual);
    setFechaGeneracion(
      ahora.toLocaleString("es-DO", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    );

    if (!id) {
      setErrorTexto(
        "No hay un condominio activo. Debe seleccionar un condominio e ingresar nuevamente.",
      );
      setLoading(false);
      return;
    }

    void cargarDatos(id);
  }, []);

  async function cargarDatos(idActivo = condominioId) {
    if (!idActivo) return;

    setLoading(true);
    setErrorTexto("");

    const [condominioResp, gastosResp, fondosResp] = await Promise.all([
      supabase
        .from("condominios")
        .select("id, nombre, rnc, direccion, telefono, correo, logo_url")
        .eq("id", Number(idActivo))
        .maybeSingle(),

      supabase
        .from("caja_chica")
        .select(
          "id, condominio_id, condominio, fecha, concepto, detalle_gasto, monto, responsable, comprobante, factura_url, estado, created_at",
        )
        .eq("condominio_id", Number(idActivo))
        .order("fecha", { ascending: true })
        .order("id", { ascending: true }),

      supabase
        .from("caja_chica_fondos")
        .select(
          "id, condominio_id, numero_fondo, condominio, fecha, tipo, monto, descripcion, responsable, created_at, estado",
        )
        .eq("condominio_id", Number(idActivo))
        .order("fecha", { ascending: true })
        .order("id", { ascending: true }),
    ]);

    setLoading(false);

    if (condominioResp.error) {
      setErrorTexto(
        "No se pudo cargar la información del condominio: " +
          condominioResp.error.message,
      );
      return;
    }

    if (gastosResp.error) {
      setErrorTexto(
        "No se pudieron cargar los gastos de caja chica: " +
          gastosResp.error.message,
      );
      return;
    }

    if (fondosResp.error) {
      setErrorTexto(
        "No se pudieron cargar los fondos de caja chica: " +
          fondosResp.error.message,
      );
      return;
    }

    setCondominio((condominioResp.data as Condominio | null) || null);
    setGastos((gastosResp.data as CajaChica[]) || []);
    setFondos((fondosResp.data as CajaChicaFondo[]) || []);
  }

  const aniosDisponibles = useMemo(() => {
    const anios = new Set<number>();
    anios.add(new Date().getFullYear());

    gastos.forEach((gasto) => {
      const anio = Number(fechaISO(gasto.fecha).slice(0, 4));
      if (anio) anios.add(anio);
    });

    fondos.forEach((fondo) => {
      const anio = Number(fechaISO(fondo.fecha).slice(0, 4));
      if (anio) anios.add(anio);
    });

    return Array.from(anios).sort((a, b) => b - a);
  }, [gastos, fondos]);

  const inicioPeriodo = useMemo(() => {
    if (!anioReporte || !mesReporte) return "";
    return `${anioReporte}-${mesReporte}-01`;
  }, [anioReporte, mesReporte]);

  const finPeriodo = useMemo(
    () => ultimoDiaMes(anioReporte, mesReporte),
    [anioReporte, mesReporte],
  );

  const gastosValidos = useMemo(
    () => gastos.filter((gasto) => !estaAnulado(gasto.estado)),
    [gastos],
  );

  const fondosValidos = useMemo(
    () => fondos.filter((fondo) => !estaAnulado(fondo.estado)),
    [fondos],
  );

  const fondosAnteriores = useMemo(
    () =>
      fondosValidos.filter(
        (fondo) => fechaISO(fondo.fecha) && fechaISO(fondo.fecha) < inicioPeriodo,
      ),
    [fondosValidos, inicioPeriodo],
  );

  const gastosAnteriores = useMemo(
    () =>
      gastosValidos.filter(
        (gasto) => fechaISO(gasto.fecha) && fechaISO(gasto.fecha) < inicioPeriodo,
      ),
    [gastosValidos, inicioPeriodo],
  );

  const fondosDelMes = useMemo(
    () =>
      fondosValidos.filter((fondo) => {
        const fecha = fechaISO(fondo.fecha);
        return fecha && fecha >= inicioPeriodo && fecha <= finPeriodo;
      }),
    [fondosValidos, inicioPeriodo, finPeriodo],
  );

  const gastosDelMes = useMemo(
    () =>
      gastosValidos
        .filter((gasto) => {
          const fecha = fechaISO(gasto.fecha);
          return fecha && fecha >= inicioPeriodo && fecha <= finPeriodo;
        })
        .sort((a, b) => {
          const fechaA = fechaISO(a.fecha);
          const fechaB = fechaISO(b.fecha);

          if (fechaA === fechaB) return a.id - b.id;
          return fechaA.localeCompare(fechaB);
        }),
    [gastosValidos, inicioPeriodo, finPeriodo],
  );

  const totalFondosAnteriores = useMemo(
    () =>
      fondosAnteriores.reduce(
        (total, fondo) => total + Number(fondo.monto || 0),
        0,
      ),
    [fondosAnteriores],
  );

  const totalGastosAnteriores = useMemo(
    () =>
      gastosAnteriores.reduce(
        (total, gasto) => total + Number(gasto.monto || 0),
        0,
      ),
    [gastosAnteriores],
  );

  const saldoInicial = totalFondosAnteriores - totalGastosAnteriores;

  const totalFondosMes = useMemo(
    () =>
      fondosDelMes.reduce(
        (total, fondo) => total + Number(fondo.monto || 0),
        0,
      ),
    [fondosDelMes],
  );

  const totalReposicionesMes = useMemo(
    () =>
      fondosDelMes
        .filter((fondo) => normalizarTexto(fondo.tipo) === "reposicion")
        .reduce((total, fondo) => total + Number(fondo.monto || 0), 0),
    [fondosDelMes],
  );

  const totalFondoInicialMes = useMemo(
    () =>
      fondosDelMes
        .filter((fondo) => normalizarTexto(fondo.tipo) === "fondo_inicial")
        .reduce((total, fondo) => total + Number(fondo.monto || 0), 0),
    [fondosDelMes],
  );

  const totalGastosMes = useMemo(
    () =>
      gastosDelMes.reduce(
        (total, gasto) => total + Number(gasto.monto || 0),
        0,
      ),
    [gastosDelMes],
  );

  const disponibleCierre = saldoInicial + totalFondosMes - totalGastosMes;

  const nombreCondominio =
    condominio?.nombre || condominioNombreLocal || "Condominio no identificado";

  function generarReporte() {
    if (!anioFiltro || !mesFiltro) {
      alert("Debe seleccionar el año y el mes del reporte.");
      return;
    }

    setAnioReporte(anioFiltro);
    setMesReporte(mesFiltro);
    setFechaGeneracion(
      new Date().toLocaleString("es-DO", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    );
  }

  function imprimirReporte() {
    setFechaGeneracion(
      new Date().toLocaleString("es-DO", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    );

    window.setTimeout(() => window.print(), 100);
  }

  function exportarExcel() {
    const resumen = [
      {
        Condominio: nombreCondominio,
        RNC: condominio?.rnc || "",
        Año: anioReporte,
        Mes: nombreMes(mesReporte),
        "Período desde": fechaDocumento(inicioPeriodo),
        "Período hasta": fechaDocumento(finPeriodo),
        "Disponible al inicio RD$": saldoInicial,
        "Fondo inicial recibido RD$": totalFondoInicialMes,
        "Reposiciones recibidas RD$": totalReposicionesMes,
        "Total fondos del mes RD$": totalFondosMes,
        "Total gastos del mes RD$": totalGastosMes,
        "Disponible al cierre RD$": disponibleCierre,
        "Cantidad de gastos": gastosDelMes.length,
      },
    ];

    const detalle = gastosDelMes.map((gasto) => ({
      Fecha: fechaDocumento(gasto.fecha),
      "No. desembolso": numeroDesembolso(gasto.id, anioReporte),
      Concepto: gasto.concepto || "",
      Detalle: gasto.detalle_gasto || "",
      "Responsable / beneficiario": gasto.responsable || "",
      "Factura / comprobante": gasto.comprobante || "",
      "Monto RD$": Number(gasto.monto || 0),
      Estado: textoEstado(gasto.estado),
      "URL soporte": gasto.factura_url || "",
    }));

    if (detalle.length === 0) {
      detalle.push({
        Fecha: "",
        "No. desembolso": "",
        Concepto: "No se registraron gastos en el período seleccionado.",
        Detalle: "",
        "Responsable / beneficiario": "",
        "Factura / comprobante": "",
        "Monto RD$": 0,
        Estado: "",
        "URL soporte": "",
      });
    }

    const hojaResumen = XLSX.utils.json_to_sheet(resumen);
    const hojaDetalle = XLSX.utils.json_to_sheet(detalle);

    hojaResumen["!cols"] = [
      { wch: 38 },
      { wch: 18 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 24 },
      { wch: 24 },
      { wch: 24 },
      { wch: 22 },
      { wch: 22 },
      { wch: 24 },
      { wch: 20 },
    ];

    hojaDetalle["!cols"] = [
      { wch: 14 },
      { wch: 20 },
      { wch: 28 },
      { wch: 45 },
      { wch: 28 },
      { wch: 24 },
      { wch: 16 },
      { wch: 15 },
      { wch: 65 },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hojaResumen, "Resumen mensual");
    XLSX.utils.book_append_sheet(libro, hojaDetalle, "Detalle de gastos");

    XLSX.writeFile(
      libro,
      `Caja_Chica_${nombreArchivoSeguro(nombreCondominio)}_${anioReporte}_${mesReporte}.xlsx`,
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="rounded-3xl border bg-white p-10 text-center shadow-sm">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-700" />
          <p className="mt-3 font-bold text-slate-700">
            Cargando reporte mensual de caja chica...
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="no-print">
        <ModuleMenu
          title="Caja Chica"
          subtitle="Movimientos, fondos, balance y reportes."
          tone="green"
          items={[
            {
              href: "/finanzas/caja-chica",
              label: "Dashboard",
              icon: BarChart3,
            },
            {
              href: "/finanzas/caja-chica/balance",
              label: "Balance",
              icon: BarChart3,
            },
            {
              href: "/finanzas/caja-chica/reporte",
              label: "Reporte",
              icon: FileSpreadsheet,
            },
            {
              href: "/finanzas/caja-chica/reporte1",
              label: "Reporte mensual",
              icon: FileSpreadsheet,
            },
          ]}
        />

        <ModuleToolbar
          title="Reporte mensual de Caja Chica"
          subtitle={`Detalle de gastos y movimiento del fondo. Condominio: ${nombreCondominio}.`}
          icon={FileSpreadsheet}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void cargarDatos()}
                className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </button>

              <button
                type="button"
                onClick={exportarExcel}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
              >
                <Download className="h-4 w-4" />
                Excel
              </button>

              <button
                type="button"
                onClick={imprimirReporte}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
              >
                <Printer className="h-4 w-4" />
                Imprimir / Guardar PDF
              </button>
            </div>
          }
        />

        {errorTexto && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {errorTexto}
          </div>
        )}

        <section className="mb-6 rounded-3xl border bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <div>
              <label className="mb-1 block text-sm font-black text-slate-700">
                Año
              </label>
              <select
                value={anioFiltro}
                onChange={(e) => setAnioFiltro(e.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3 font-semibold text-slate-800"
              >
                {aniosDisponibles.map((anio) => (
                  <option key={anio} value={anio}>
                    {anio}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-black text-slate-700">
                Mes
              </label>
              <select
                value={mesFiltro}
                onChange={(e) => setMesFiltro(e.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3 font-semibold text-slate-800"
              >
                {MESES.map((mes) => (
                  <option key={mes.valor} value={mes.valor}>
                    {mes.nombre}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={generarReporte}
              className="inline-flex h-[50px] items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 font-black text-white hover:bg-blue-800"
            >
              <Search className="h-4 w-4" />
              Generar reporte
            </button>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Mostrando exclusivamente la información del condominio activo:{" "}
              <strong>{nombreCondominio}</strong>. El saldo inicial considera
              todos los fondos y gastos válidos anteriores al mes seleccionado.
            </p>
          </div>
        </section>
      </div>

      <article
        id="reporte-caja-chica"
        className="mx-auto max-w-[1100px] bg-white p-4 text-slate-950 shadow-sm ring-1 ring-slate-200 print:max-w-none print:p-0 print:shadow-none print:ring-0"
      >
        <header className="grid grid-cols-[190px_1fr_190px] items-center gap-4 border-b-2 border-slate-900 pb-3">
          <div className="flex items-center gap-3">
            {condominio?.logo_url ? (
              <img
                src={condominio.logo_url}
                alt={`Logo de ${nombreCondominio}`}
                className="h-16 w-16 object-contain"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-blue-950 text-lg font-black text-blue-950">
                VAM
              </div>
            )}

            <div>
              <p className="text-2xl font-black tracking-tight text-blue-950">
                VAM
              </p>
              <p className="text-[9px] font-black uppercase leading-tight text-blue-950">
                Administradora
                <br />
                de Condominios
              </p>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-[22px] font-black uppercase leading-tight">
              Reporte de gastos de Caja Chica
            </h1>
            <p className="mt-1 text-[18px] font-black uppercase">Por mes</p>
          </div>

          <div className="border border-slate-700 p-2 text-[10px] leading-5">
            <p>
              <strong>Fecha del reporte:</strong>
            </p>
            <p>{fechaGeneracion || "-"}</p>
            <p className="mt-1">
              <strong>Formato:</strong> A4
            </p>
          </div>
        </header>

        <section className="mt-3 grid grid-cols-[1.35fr_0.9fr] gap-5">
          <div className="text-[11px] leading-5">
            <p className="font-black uppercase">Condominio:</p>
            <p className="text-[14px] font-black uppercase">
              {nombreCondominio}
            </p>
            <p className="mt-1">
              <strong>RNC:</strong> {condominio?.rnc || "No registrado"}
            </p>
            <p>
              <strong>Dirección:</strong>{" "}
              {condominio?.direccion || "No registrada"}
            </p>
            <p>
              <strong>Teléfono:</strong>{" "}
              {condominio?.telefono || "No registrado"}
            </p>
          </div>

          <div className="border border-slate-700">
            <p className="border-b border-slate-700 py-1 text-center text-[11px] font-black uppercase">
              Período del reporte
            </p>
            <div className="grid grid-cols-2">
              <div className="border-r border-slate-700 p-2 text-center">
                <p className="text-[9px] font-black uppercase">Año</p>
                <p className="mt-1 text-[16px] font-black">{anioReporte}</p>
              </div>
              <div className="p-2 text-center">
                <p className="text-[9px] font-black uppercase">Mes</p>
                <p className="mt-1 text-[16px] font-black uppercase">
                  {nombreMes(mesReporte)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-3">
          <h2 className="mb-1 text-[12px] font-black uppercase">
            Resumen del mes
          </h2>

          <div className="grid grid-cols-5 border border-slate-700">
            <ResumenImpresion
              titulo="Disponible al inicio del mes"
              valor={`RD$ ${dinero(saldoInicial)}`}
            />
            <ResumenImpresion
              titulo="Fondos / reposiciones"
              valor={`RD$ ${dinero(totalFondosMes)}`}
              border
            />
            <ResumenImpresion
              titulo="Total gastos realizados"
              valor={`RD$ ${dinero(totalGastosMes)}`}
              border
            />
            <ResumenImpresion
              titulo="Disponible al cierre"
              valor={`RD$ ${dinero(disponibleCierre)}`}
              border
            />
            <ResumenImpresion
              titulo="Cantidad de gastos"
              valor={String(gastosDelMes.length)}
              border
            />
          </div>

          <div className="mt-2 border border-slate-700 px-3 py-2 text-[10px]">
            <strong>PERÍODO CUBIERTO:</strong>{" "}
            {fechaDocumento(inicioPeriodo)} AL {fechaDocumento(finPeriodo)}
          </div>
        </section>

        <section className="mt-3">
          <h2 className="border border-b-0 border-slate-700 py-1 text-center text-[13px] font-black uppercase">
            Detalle de gastos del mes
          </h2>

          <table className="tabla-reporte w-full table-fixed border-collapse text-[8.5px]">
            <thead>
              <tr className="bg-slate-100 uppercase">
                <th className="w-[9%] border border-slate-700 px-1 py-2">
                  Fecha
                </th>
                <th className="w-[13%] border border-slate-700 px-1 py-2">
                  No. desembolso
                </th>
                <th className="w-[24%] border border-slate-700 px-1 py-2">
                  Concepto / detalle
                </th>
                <th className="w-[16%] border border-slate-700 px-1 py-2">
                  Responsable / beneficiario
                </th>
                <th className="w-[14%] border border-slate-700 px-1 py-2">
                  Factura / comprobante
                </th>
                <th className="w-[10%] border border-slate-700 px-1 py-2">
                  Monto RD$
                </th>
                <th className="w-[8%] border border-slate-700 px-1 py-2">
                  Estado
                </th>
                <th className="w-[6%] border border-slate-700 px-1 py-2">
                  Soporte
                </th>
              </tr>
            </thead>

            <tbody>
              {gastosDelMes.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="border border-slate-700 px-3 py-8 text-center text-[11px] font-bold text-slate-500"
                  >
                    No se registraron gastos de caja chica en el período
                    seleccionado.
                  </td>
                </tr>
              ) : (
                gastosDelMes.map((gasto) => (
                  <tr key={gasto.id} className="break-inside-avoid">
                    <td className="border border-slate-700 px-1 py-2 text-center">
                      {fechaDocumento(gasto.fecha)}
                    </td>
                    <td className="border border-slate-700 px-1 py-2 text-center font-bold">
                      {numeroDesembolso(gasto.id, anioReporte)}
                    </td>
                    <td className="border border-slate-700 px-2 py-2">
                      <p className="font-bold">{gasto.concepto || "-"}</p>
                      {gasto.detalle_gasto && (
                        <p className="mt-0.5 leading-tight text-slate-600">
                          {gasto.detalle_gasto}
                        </p>
                      )}
                    </td>
                    <td className="border border-slate-700 px-1 py-2 text-center">
                      {gasto.responsable || "-"}
                    </td>
                    <td className="border border-slate-700 px-1 py-2 text-center">
                      {gasto.comprobante || "-"}
                    </td>
                    <td className="border border-slate-700 px-1 py-2 text-right font-black">
                      {dinero(gasto.monto)}
                    </td>
                    <td className="border border-slate-700 px-1 py-2 text-center">
                      {textoEstado(gasto.estado)}
                    </td>
                    <td className="border border-slate-700 px-1 py-2 text-center">
                      {gasto.factura_url ? (
                        <a
                          href={gasto.factura_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-blue-800 underline print:no-underline"
                        >
                          Ver
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            <tfoot>
              <tr>
                <td
                  colSpan={5}
                  className="border border-slate-700 px-2 py-2 text-right text-[10px] font-black uppercase"
                >
                  Total gastos del mes:
                </td>
                <td
                  colSpan={3}
                  className="border border-slate-700 px-2 py-2 text-right text-[11px] font-black"
                >
                  RD$ {dinero(totalGastosMes)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="mt-3 border border-slate-700 p-3 text-[10px]">
          <div className="grid grid-cols-[1fr_145px] gap-4">
            <div>
              <p className="mb-1 font-black uppercase">
                Resumen financiero del mes
              </p>
              <LineaResumen
                etiqueta="Disponible al inicio del mes"
                valor={saldoInicial}
              />
              <LineaResumen
                etiqueta="Más: fondo inicial recibido en el mes"
                valor={totalFondoInicialMes}
              />
              <LineaResumen
                etiqueta="Más: reposiciones recibidas en el mes"
                valor={totalReposicionesMes}
              />
              <LineaResumen
                etiqueta="Subtotal disponible"
                valor={saldoInicial + totalFondosMes}
                fuerte
              />
              <LineaResumen
                etiqueta="Menos: gastos realizados"
                valor={totalGastosMes}
              />
              <LineaResumen
                etiqueta="Disponible al cierre del mes"
                valor={disponibleCierre}
                fuerte
              />
            </div>

            <div className="text-right">
              <p className="mb-1 font-black uppercase">Monto (RD$)</p>
              <p className="h-[18px]">RD$ {dinero(saldoInicial)}</p>
              <p className="h-[18px]">RD$ {dinero(totalFondoInicialMes)}</p>
              <p className="h-[18px]">RD$ {dinero(totalReposicionesMes)}</p>
              <p className="h-[18px] border-t border-slate-700 pt-1 font-bold">
                RD$ {dinero(saldoInicial + totalFondosMes)}
              </p>
              <p className="h-[18px]">RD$ {dinero(totalGastosMes)}</p>
              <p className="h-[18px] border-t border-slate-700 pt-1 font-black">
                RD$ {dinero(disponibleCierre)}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-2 border border-slate-700 p-2 text-[10px]">
          <p className="font-black uppercase">Observaciones:</p>
          <div className="mt-2 h-5 border-b border-slate-500" />
          <div className="h-5 border-b border-slate-500" />
        </section>

        <section className="mt-5 grid grid-cols-3 gap-12 text-[10px]">
          <Firma titulo="Elaborado por" />
          <Firma titulo="Revisado por" />
          <Firma titulo="Aprobado por" />
        </section>

        <footer className="mt-5 border-t border-slate-600 pt-2 text-center text-[8px] text-slate-600">
          Este reporte incluye los gastos válidos registrados en el período
          seleccionado. Los registros anulados no forman parte de los cálculos.
        </footer>
      </article>

      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 7mm;
        }

        @media print {
          html,
          body {
            background: white !important;
          }

          body * {
            visibility: hidden !important;
          }

          #reporte-caja-chica,
          #reporte-caja-chica * {
            visibility: visible !important;
          }

          #reporte-caja-chica {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }

          .no-print {
            display: none !important;
          }

          .tabla-reporte thead {
            display: table-header-group;
          }

          .tabla-reporte tfoot {
            display: table-row-group;
          }

          .tabla-reporte tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          a {
            color: black !important;
          }
        }
      `}</style>
    </PageContainer>
  );
}

function ResumenImpresion({
  titulo,
  valor,
  border = false,
}: {
  titulo: string;
  valor: string;
  border?: boolean;
}) {
  return (
    <div
      className={`min-h-[72px] p-2 text-center ${
        border ? "border-l border-slate-700" : ""
      }`}
    >
      <p className="text-[9px] font-black uppercase leading-tight">{titulo}</p>
      <p className="mt-2 text-[13px] font-black">{valor}</p>
    </div>
  );
}

function LineaResumen({
  etiqueta,
  valor,
  fuerte = false,
}: {
  etiqueta: string;
  valor: number;
  fuerte?: boolean;
}) {
  return (
    <div
      className={`flex h-[18px] items-center ${
        fuerte ? "font-black uppercase" : ""
      }`}
    >
      <span>{etiqueta}</span>
      <span className="mx-2 flex-1 border-b border-dotted border-slate-500" />
      <span className="sr-only">RD$ {dinero(valor)}</span>
    </div>
  );
}

function Firma({ titulo }: { titulo: string }) {
  return (
    <div className="text-center">
      <p className="font-black uppercase">{titulo}</p>
      <div className="mt-10 border-t border-slate-900 pt-1">
        <p>Nombre: __________________________</p>
        <p className="mt-1">Fecha: ____ / ____ / ______</p>
      </div>
    </div>
  );
}
