"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { ArrowLeft } from "lucide-react";

type PropietarioActual = {
  propietario_id: number;
  condominio_id: number;
  condominio_nombre: string;
  unidad_id: number;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string;
  telefono?: string;
  correo?: string;
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
};

type AplicacionPago = {
  cargo_periodico_id: number;
  periodo: string;
  monto_aplicado: number;
};

type Pago = {
  id: number;
  fecha_pago: string;
  periodo: string | null;
  monto: number;
  referencia: string | null;
  descripcion: string | null;
  metodo: string | null;
  metodo_pago: string | null;
  origen: string | null;
  comprobante_url: string | null;
  periodos_aplicados: string[];
  aplicaciones: AplicacionPago[];
};

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(valor || 0);
}

function formatoFecha(fecha: string) {
  if (!fecha) return "-";

  const [anio, mes, dia] = fecha.split("-").map(Number);
  if (!anio || !mes || !dia) return fecha;

  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(anio, mes - 1, dia));
}

function nombrePeriodo(periodo: string) {
  if (!/^\d{4}-\d{2}$/.test(periodo || "")) return periodo || "-";

  const [anio, mes] = periodo.split("-").map(Number);

  return new Intl.DateTimeFormat("es-DO", {
    month: "long",
    year: "numeric",
  }).format(new Date(anio, mes - 1, 1));
}

function etiquetaMetodo(pago: Pago) {
  return (
    pago.metodo_pago ||
    pago.metodo ||
    pago.origen ||
    "Pago registrado en VAM"
  );
}

function periodoActualLocal() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function escapeHtml(valor: unknown) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function EstadoCuentaPropietarioPage() {
  const router = useRouter();

  const [propietario, setPropietario] = useState<PropietarioActual | null>(
    null
  );
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const [tipoReporte, setTipoReporte] = useState<"FECHA" | "MES">("FECHA");
  const [periodoReporte, setPeriodoReporte] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("propietario_actual");

    if (!raw) {
      router.push("/movil/propietarios/login");
      return;
    }

    const prop = JSON.parse(raw);
    setPropietario(prop);
    cargarEstado(prop);
  }, [router]);

  async function cargarEstado(prop: PropietarioActual) {
    setLoading(true);
    setMensaje("");

    try {
      const { data: cargosData, error: cargosError } = await supabase
        .from("cargos_periodicos")
        .select(
          "id, periodo, concepto, tipo_cargo, monto, monto_pagado, balance, estado"
        )
        .eq("condominio_id", prop.condominio_id)
        .eq("unidad_id", prop.unidad_id)
        .order("anio", { ascending: true })
        .order("mes", { ascending: true });

      if (cargosError) {
        throw new Error(
          "Error cargando estado de cuenta: " + cargosError.message
        );
      }

      const { data: pagosData, error: pagosError } = await supabase
        .from("pagos")
        .select(
          "id, fecha_pago, periodo, monto, referencia, descripcion, metodo, metodo_pago, origen, comprobante_url"
        )
        .eq("condominio_id", prop.condominio_id)
        .eq("unidad_id", prop.unidad_id)
        .order("fecha_pago", { ascending: false })
        .order("id", { ascending: false });

      if (pagosError) {
        throw new Error("Error cargando pagos: " + pagosError.message);
      }

      const pagosBase = (pagosData || []) as Omit<
        Pago,
        "periodos_aplicados" | "aplicaciones"
      >[];

      const pagoIds = pagosBase.map((p) => p.id);
      const periodosPorPago = new Map<number, string[]>();
      const aplicacionesPorPago = new Map<number, AplicacionPago[]>();

      if (pagoIds.length > 0) {
        const { data: aplicacionesData, error: aplicacionesError } =
          await supabase
            .from("pagos_aplicaciones")
            .select("pago_id, cargo_periodico_id, monto_aplicado")
            .in("pago_id", pagoIds);

        if (aplicacionesError) {
          throw new Error(
            "Error cargando aplicaciones de pagos: " +
              aplicacionesError.message
          );
        }

        const aplicaciones = aplicacionesData || [];
        const cargoIds = Array.from(
          new Set(
            aplicaciones
              .map((a: any) => Number(a.cargo_periodico_id))
              .filter((id: number) => Number.isFinite(id))
          )
        );

        const periodoPorCargo = new Map<number, string>();

        if (cargoIds.length > 0) {
          const { data: cargosAplicadosData, error: cargosAplicadosError } =
            await supabase
              .from("cargos_periodicos")
              .select("id, periodo")
              .in("id", cargoIds);

          if (cargosAplicadosError) {
            throw new Error(
              "Error cargando períodos aplicados: " +
                cargosAplicadosError.message
            );
          }

          for (const cargo of cargosAplicadosData || []) {
            periodoPorCargo.set(Number(cargo.id), String(cargo.periodo || ""));
          }
        }

        for (const aplicacion of aplicaciones) {
          const pagoId = Number((aplicacion as any).pago_id);
          const cargoId = Number((aplicacion as any).cargo_periodico_id);
          const periodo = periodoPorCargo.get(cargoId);

          if (!periodo) continue;

          const periodosActuales = periodosPorPago.get(pagoId) || [];
          if (!periodosActuales.includes(periodo)) {
            periodosActuales.push(periodo);
            periodosActuales.sort();
            periodosPorPago.set(pagoId, periodosActuales);
          }

          const aplicacionesActuales = aplicacionesPorPago.get(pagoId) || [];
          aplicacionesActuales.push({
            cargo_periodico_id: cargoId,
            periodo,
            monto_aplicado: Number((aplicacion as any).monto_aplicado || 0),
          });
          aplicacionesPorPago.set(pagoId, aplicacionesActuales);
        }
      }

      const pagosConPeriodos: Pago[] = pagosBase.map((p) => ({
        ...p,
        periodos_aplicados:
          periodosPorPago.get(p.id) || (p.periodo ? [p.periodo] : []),
        aplicaciones: aplicacionesPorPago.get(p.id) || [],
      }));

      const cargosFinales = (cargosData || []) as Cargo[];

      setCargos(cargosFinales);
      setPagos(pagosConPeriodos);

      const periodoActual = periodoActualLocal();
      const disponibles = cargosFinales
        .map((c) => c.periodo)
        .filter((p) => p && p <= periodoActual)
        .sort();

      if (disponibles.length > 0) {
        setPeriodoReporte((actual) => actual || disponibles[disponibles.length - 1]);
      }
    } catch (error: any) {
      setMensaje(error?.message || "No se pudo cargar el estado de cuenta.");
      setCargos([]);
      setPagos([]);
    } finally {
      setLoading(false);
    }
  }

  const totalFacturado = cargos.reduce(
    (sum, c) => sum + Number(c.monto || 0),
    0
  );

  const totalPagado = cargos.reduce(
    (sum, c) => sum + Number(c.monto_pagado || 0),
    0
  );

  const balancePendiente = cargos.reduce(
    (sum, c) => sum + Number(c.balance || 0),
    0
  );

  const ultimoMesPagado =
    cargos.filter((c) => c.estado === "PAGADO").slice(-1)[0]?.periodo ||
    "Sin pagos";

  const periodosDisponibles = Array.from(
    new Set(
      cargos
        .map((c) => c.periodo)
        .filter((p) => p && p <= periodoActualLocal())
    )
  ).sort((a, b) => b.localeCompare(a));

  function generarReporte() {
    if (!propietario) return;

    if (tipoReporte === "MES" && !periodoReporte) {
      setMensaje("Seleccione el mes que desea imprimir.");
      return;
    }

    setMensaje("");

    const periodoActual = periodoActualLocal();

    const cargosReporte =
      tipoReporte === "MES"
        ? cargos.filter((c) => c.periodo === periodoReporte)
        : cargos.filter((c) => c.periodo <= periodoActual);

    if (cargosReporte.length === 0) {
      setMensaje("No hay cargos disponibles para generar este reporte.");
      return;
    }

    const totalReporteFacturado = cargosReporte.reduce(
      (sum, c) => sum + Number(c.monto || 0),
      0
    );

    const totalReportePagado = cargosReporte.reduce(
      (sum, c) => sum + Number(c.monto_pagado || 0),
      0
    );

    const totalReporteBalance = cargosReporte.reduce(
      (sum, c) => sum + Number(c.balance || 0),
      0
    );

    const estadoGeneral =
      totalReporteBalance <= 0
        ? tipoReporte === "MES"
          ? "PAGADO"
          : "AL DÍA"
        : tipoReporte === "MES"
        ? cargosReporte.some((c) => c.estado === "PARCIAL")
          ? "PARCIAL"
          : "PENDIENTE"
        : "CON BALANCE PENDIENTE";

    const pagosReporte =
      tipoReporte === "MES"
        ? pagos
            .map((pago) => {
              const aplicacionesMes = pago.aplicaciones.filter(
                (a) => a.periodo === periodoReporte
              );

              const montoAplicado = aplicacionesMes.reduce(
                (sum, a) => sum + Number(a.monto_aplicado || 0),
                0
              );

              const coincidePorPeriodo =
                montoAplicado === 0 && pago.periodo === periodoReporte;

              return {
                pago,
                montoAplicado: coincidePorPeriodo
                  ? Number(pago.monto || 0)
                  : montoAplicado,
              };
            })
            .filter((item) => item.montoAplicado > 0)
        : pagos
            .filter((pago) => {
              if (pago.aplicaciones.length > 0) {
                return pago.aplicaciones.some(
                  (a) => a.periodo <= periodoActual
                );
              }

              if (pago.periodo) {
                return pago.periodo <= periodoActual;
              }

              return pago.fecha_pago <= `${periodoActual}-31`;
            })
            .map((pago) => ({
              pago,
              montoAplicado: Number(pago.monto || 0),
            }));

    const tituloReporte =
      tipoReporte === "MES"
        ? `Estado de cuenta - ${nombrePeriodo(periodoReporte)}`
        : "Estado de cuenta a la fecha";

    const detalleCargosHtml = cargosReporte
      .map(
        (cargo) => `
          <tr>
            <td>${escapeHtml(nombrePeriodo(cargo.periodo))}</td>
            <td>${escapeHtml(cargo.concepto || cargo.tipo_cargo || "Cargo")}</td>
            <td class="num">${escapeHtml(formatoMoneda(Number(cargo.monto)))}</td>
            <td class="num">${escapeHtml(
              formatoMoneda(Number(cargo.monto_pagado))
            )}</td>
            <td class="num">${escapeHtml(
              formatoMoneda(Number(cargo.balance))
            )}</td>
            <td><strong>${escapeHtml(cargo.estado)}</strong></td>
          </tr>
        `
      )
      .join("");

    const detallePagosHtml =
      pagosReporte.length > 0
        ? pagosReporte
            .map(({ pago, montoAplicado }) => {
              const periodos =
                pago.periodos_aplicados.length > 0
                  ? pago.periodos_aplicados.map(nombrePeriodo).join(", ")
                  : pago.periodo
                  ? nombrePeriodo(pago.periodo)
                  : "-";

              return `
                <tr>
                  <td>${escapeHtml(formatoFecha(pago.fecha_pago))}</td>
                  <td class="num">${escapeHtml(
                    formatoMoneda(
                      tipoReporte === "MES"
                        ? montoAplicado
                        : Number(pago.monto || 0)
                    )
                  )}</td>
                  <td>${escapeHtml(periodos)}</td>
                  <td>${escapeHtml(pago.referencia || "-")}</td>
                  <td>${escapeHtml(etiquetaMetodo(pago))}</td>
                </tr>
              `;
            })
            .join("")
        : `
            <tr>
              <td colspan="5" class="sin-datos">
                No hay pagos vinculados para mostrar en este período.
              </td>
            </tr>
          `;

    const hoy = new Intl.DateTimeFormat("es-DO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date());

    const ventana = window.open("", "_blank");

    if (!ventana) {
      setMensaje(
        "El navegador bloqueó la ventana del reporte. Habilite las ventanas emergentes e intente nuevamente."
      );
      return;
    }

    ventana.document.open();
    ventana.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(tituloReporte)}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              background: #f8fafc;
              color: #0f172a;
              font-family: Arial, Helvetica, sans-serif;
            }

            .pagina {
              max-width: 900px;
              margin: 24px auto;
              background: #ffffff;
              padding: 34px;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
            }

            .encabezado {
              border-bottom: 3px solid #0f172a;
              padding-bottom: 16px;
              margin-bottom: 22px;
            }

            .marca {
              font-size: 24px;
              font-weight: 800;
              letter-spacing: .3px;
            }

            .submarca {
              color: #475569;
              margin-top: 4px;
              font-size: 14px;
            }

            h1 {
              margin: 24px 0 6px;
              font-size: 24px;
            }

            .emitido {
              color: #64748b;
              font-size: 13px;
            }

            .datos {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px 24px;
              margin: 22px 0;
              padding: 16px;
              background: #f8fafc;
              border-radius: 12px;
            }

            .dato-label {
              color: #64748b;
              font-size: 12px;
              text-transform: uppercase;
            }

            .dato-valor {
              font-weight: 700;
              margin-top: 2px;
            }

            .resumen {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              margin: 20px 0;
            }

            .resumen-box {
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 14px;
            }

            .resumen-label {
              color: #64748b;
              font-size: 12px;
            }

            .resumen-valor {
              font-size: 18px;
              font-weight: 800;
              margin-top: 4px;
            }

            .estatus {
              margin: 18px 0 28px;
              padding: 16px;
              border: 2px solid #0f172a;
              border-radius: 12px;
              text-align: center;
            }

            .estatus-label {
              color: #475569;
              font-size: 12px;
              text-transform: uppercase;
            }

            .estatus-valor {
              font-size: 22px;
              font-weight: 900;
              margin-top: 4px;
            }

            h2 {
              font-size: 17px;
              margin: 24px 0 10px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
            }

            th {
              background: #f1f5f9;
              text-align: left;
              padding: 10px 8px;
              border: 1px solid #cbd5e1;
            }

            td {
              padding: 10px 8px;
              border: 1px solid #e2e8f0;
              vertical-align: top;
            }

            .num {
              text-align: right;
              white-space: nowrap;
            }

            .sin-datos {
              text-align: center;
              color: #64748b;
            }

            .nota {
              margin-top: 26px;
              padding-top: 14px;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 12px;
              line-height: 1.5;
            }

            .acciones {
              max-width: 900px;
              margin: 20px auto 0;
              display: flex;
              justify-content: flex-end;
              gap: 10px;
            }

            .acciones button {
              border: 0;
              border-radius: 10px;
              padding: 12px 18px;
              font-weight: 700;
              cursor: pointer;
            }

            .imprimir {
              background: #0f172a;
              color: white;
            }

            .cerrar {
              background: #e2e8f0;
              color: #0f172a;
            }

            @media (max-width: 700px) {
              .pagina {
                margin: 0;
                padding: 18px;
                border: 0;
                border-radius: 0;
              }

              .datos,
              .resumen {
                grid-template-columns: 1fr;
              }

              table {
                font-size: 11px;
              }

              th,
              td {
                padding: 7px 5px;
              }

              .acciones {
                padding: 0 12px;
              }
            }

            @media print {
              body {
                background: white;
              }

              .acciones {
                display: none !important;
              }

              .pagina {
                max-width: none;
                margin: 0;
                padding: 0;
                border: 0;
                border-radius: 0;
              }
            }
          </style>
        </head>

        <body>
          <div class="acciones">
            <button class="cerrar" onclick="window.close()">Cerrar</button>
            <button class="imprimir" onclick="window.print()">
              Imprimir / Guardar PDF
            </button>
          </div>

          <main class="pagina">
            <div class="encabezado">
              <div class="marca">VAM CONDOMINIOS</div>
              <div class="submarca">${escapeHtml(
                propietario.condominio_nombre
              )}</div>

              <h1>${escapeHtml(tituloReporte)}</h1>
              <div class="emitido">Emitido: ${escapeHtml(hoy)}</div>
            </div>

            <section class="datos">
              <div>
                <div class="dato-label">Propietario</div>
                <div class="dato-valor">${escapeHtml(
                  propietario.nombre_propietario
                )}</div>
              </div>

              <div>
                <div class="dato-label">Apartamento / Unidad</div>
                <div class="dato-valor">${escapeHtml(
                  propietario.no_apartamento
                )}</div>
              </div>

              <div>
                <div class="dato-label">Tipo de reporte</div>
                <div class="dato-valor">${
                  tipoReporte === "MES"
                    ? escapeHtml(nombrePeriodo(periodoReporte))
                    : "A la fecha"
                }</div>
              </div>

              <div>
                <div class="dato-label">Condominio</div>
                <div class="dato-valor">${escapeHtml(
                  propietario.condominio_nombre
                )}</div>
              </div>
            </section>

            <section class="resumen">
              <div class="resumen-box">
                <div class="resumen-label">Facturado</div>
                <div class="resumen-valor">${escapeHtml(
                  formatoMoneda(totalReporteFacturado)
                )}</div>
              </div>

              <div class="resumen-box">
                <div class="resumen-label">Pagado</div>
                <div class="resumen-valor">${escapeHtml(
                  formatoMoneda(totalReportePagado)
                )}</div>
              </div>

              <div class="resumen-box">
                <div class="resumen-label">Balance pendiente</div>
                <div class="resumen-valor">${escapeHtml(
                  formatoMoneda(totalReporteBalance)
                )}</div>
              </div>
            </section>

            <section class="estatus">
              <div class="estatus-label">Estatus</div>
              <div class="estatus-valor">${escapeHtml(estadoGeneral)}</div>
            </section>

            <h2>Detalle de cargos</h2>
            <table>
              <thead>
                <tr>
                  <th>Período</th>
                  <th>Concepto</th>
                  <th class="num">Facturado</th>
                  <th class="num">Pagado</th>
                  <th class="num">Balance</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${detalleCargosHtml}
              </tbody>
            </table>

            <h2>Pagos registrados</h2>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th class="num">${
                    tipoReporte === "MES" ? "Aplicado al mes" : "Monto"
                  }</th>
                  <th>Períodos</th>
                  <th>Referencia</th>
                  <th>Método</th>
                </tr>
              </thead>
              <tbody>
                ${detallePagosHtml}
              </tbody>
            </table>

            <div class="nota">
              Este reporte refleja la información oficial registrada en VAM
              para la unidad indicada al momento de su emisión.
              ${
                tipoReporte === "FECHA"
                  ? totalReporteBalance <= 0
                    ? " La unidad figura AL DÍA según los cargos incluidos a la fecha."
                    : ` La unidad presenta un balance pendiente de ${escapeHtml(
                        formatoMoneda(totalReporteBalance)
                      )}.`
                  : ""
              }
            </div>
          </main>
        </body>
      </html>
    `);

    ventana.document.close();
  }

  if (!propietario) {
    return <div className="p-6 text-center text-slate-500">Cargando...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <header className="bg-slate-950 text-white rounded-3xl p-5 shadow">
        <button
          onClick={() => router.push("/movil/propietarios/dashboard")}
          className="flex items-center gap-2 text-sm text-slate-300 mb-4"
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <p className="text-sm text-slate-300">Estado de cuenta</p>
        <h1 className="text-xl font-bold">{propietario.no_apartamento}</h1>
        <p className="text-xs text-slate-300">
          {propietario.condominio_nombre}
        </p>
      </header>

      {loading && (
        <div className="bg-white rounded-2xl p-5 text-center text-slate-500">
          Consultando estado de cuenta...
        </div>
      )}

      {mensaje && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          {mensaje}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3">
        <ResumenCard
          titulo="Balance pendiente"
          valor={formatoMoneda(balancePendiente)}
          clase={balancePendiente > 0 ? "text-red-700" : "text-green-700"}
        />

        <ResumenCard
          titulo="Total pagado"
          valor={formatoMoneda(totalPagado)}
          clase="text-green-700"
        />

        <ResumenCard
          titulo="Total facturado"
          valor={formatoMoneda(totalFacturado)}
          clase="text-slate-800"
        />

        <ResumenCard
          titulo="Último mes pagado"
          valor={ultimoMesPagado}
          clase="text-blue-700"
        />
      </section>

      <section className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Reporte</h2>
          <p className="text-sm text-slate-500">
            Genere un reporte de un mes específico o de su estado a la fecha.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTipoReporte("FECHA")}
            className={
              tipoReporte === "FECHA"
                ? "rounded-xl bg-slate-950 text-white py-3 px-3 text-sm font-semibold"
                : "rounded-xl bg-slate-100 text-slate-700 py-3 px-3 text-sm font-semibold"
            }
          >
            A la fecha
          </button>

          <button
            type="button"
            onClick={() => setTipoReporte("MES")}
            className={
              tipoReporte === "MES"
                ? "rounded-xl bg-slate-950 text-white py-3 px-3 text-sm font-semibold"
                : "rounded-xl bg-slate-100 text-slate-700 py-3 px-3 text-sm font-semibold"
            }
          >
            Mes específico
          </button>
        </div>

        {tipoReporte === "MES" && (
          <select
            value={periodoReporte}
            onChange={(e) => setPeriodoReporte(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800"
          >
            <option value="">Seleccione un mes</option>
            {periodosDisponibles.map((periodo) => (
              <option key={periodo} value={periodo}>
                {nombrePeriodo(periodo)}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={generarReporte}
          disabled={loading || cargos.length === 0}
          className="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 text-sm disabled:opacity-50"
        >
          Ver / Imprimir reporte
        </button>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Mis pagos</h2>
          <p className="text-sm text-slate-500">
            Pagos oficiales registrados en VAM.
          </p>
        </div>

        {pagos.map((pago) => (
          <div
            key={pago.id}
            className="bg-white rounded-2xl border shadow-sm p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">
                  {formatoFecha(pago.fecha_pago)}
                </p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {formatoMoneda(Number(pago.monto))}
                </p>
              </div>

              <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-bold">
                REGISTRADO
              </span>
            </div>

            <div className="mt-3 space-y-1 text-sm">
              {pago.periodos_aplicados.length > 0 && (
                <p>
                  <span className="text-slate-500">Período:</span>{" "}
                  <span className="font-semibold text-slate-800">
                    {pago.periodos_aplicados.map(nombrePeriodo).join(" • ")}
                  </span>
                </p>
              )}

              <p>
                <span className="text-slate-500">Método:</span>{" "}
                <span className="font-medium text-slate-800">
                  {etiquetaMetodo(pago)}
                </span>
              </p>

              {pago.referencia && (
                <p>
                  <span className="text-slate-500">Referencia:</span>{" "}
                  <span className="font-medium text-slate-800">
                    {pago.referencia}
                  </span>
                </p>
              )}

              {pago.descripcion && (
                <p className="text-slate-600">{pago.descripcion}</p>
              )}
            </div>

            <div className="mt-4">
              {pago.comprobante_url ? (
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      pago.comprobante_url as string,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                  className="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 text-sm active:scale-[0.99]"
                >
                  Ver volante bancario
                </button>
              ) : (
                <div className="w-full rounded-xl bg-slate-100 text-slate-500 py-3 px-3 text-center text-sm">
                  Comprobante no disponible
                </div>
              )}
            </div>
          </div>
        ))}

        {pagos.length === 0 && !loading && (
          <div className="bg-white rounded-2xl border shadow-sm p-6 text-center text-slate-500">
            No hay pagos registrados para este apartamento.
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Estado mensual de cargos
          </h2>
        </div>

        {cargos.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl border shadow-sm p-4">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-bold">{nombrePeriodo(c.periodo)}</p>
                <p className="text-sm text-slate-500">{c.concepto}</p>
                <p className="text-xs text-slate-400">{c.tipo_cargo}</p>
              </div>

              <span
                className={
                  c.estado === "PAGADO"
                    ? "bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-bold h-fit"
                    : c.estado === "PARCIAL"
                    ? "bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg text-xs font-bold h-fit"
                    : "bg-red-100 text-red-700 px-2 py-1 rounded-lg text-xs font-bold h-fit"
                }
              >
                {c.estado}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
              <div>
                <p className="text-slate-400">Facturado</p>
                <p className="font-bold">{formatoMoneda(Number(c.monto))}</p>
              </div>

              <div>
                <p className="text-slate-400">Pagado</p>
                <p className="font-bold text-green-700">
                  {formatoMoneda(Number(c.monto_pagado))}
                </p>
              </div>

              <div>
                <p className="text-slate-400">Balance</p>
                <p className="font-bold text-red-700">
                  {formatoMoneda(Number(c.balance))}
                </p>
              </div>
            </div>
          </div>
        ))}

        {cargos.length === 0 && !loading && (
          <div className="bg-white rounded-2xl border shadow-sm p-6 text-center text-slate-500">
            No hay cargos registrados para este apartamento.
          </div>
        )}
      </section>
    </div>
  );
}

function ResumenCard({
  titulo,
  valor,
  clase,
}: {
  titulo: string;
  valor: string;
  clase: string;
}) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-4">
      <p className="text-sm text-slate-500">{titulo}</p>
      <h2 className={`text-2xl font-bold mt-1 ${clase}`}>{valor}</h2>
    </div>
  );
}
