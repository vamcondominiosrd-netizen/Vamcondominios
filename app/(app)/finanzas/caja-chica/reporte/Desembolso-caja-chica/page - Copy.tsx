type CajaChicaRegistro = {
  id: number
  fecha: string
  concepto: string
  detalle_gasto?: string | null
  monto: number | string
  responsable?: string | null
  comprobante?: string | null
  condominio?: string | null
  estado?: string | null
  created_at?: string | null
}

function formatoRD(valor: number | string | null | undefined) {
  const numero = Number(valor || 0)

  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(numero)
}

function formatoFecha(fecha: string | null | undefined) {
  if (!fecha) return ""

  const [year, month, day] = fecha.split("-")
  if (!year || !month || !day) return fecha

  return `${day}/${month}/${year}`
}

function limpiarTexto(valor: string | number | null | undefined) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function imprimirConstanciaCajaChica(registro: CajaChicaRegistro) {
  const html = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Constancia Caja Chica</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 24px;
            color: #111827;
            background: #ffffff;
          }

          .comprobante {
            width: 720px;
            margin: 0 auto;
            border: 1px solid #111827;
            padding: 18px 22px;
          }

          .encabezado {
            text-align: center;
            border-bottom: 1px solid #111827;
            padding-bottom: 10px;
            margin-bottom: 14px;
          }

          .empresa {
            font-size: 17px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .titulo {
            font-size: 15px;
            font-weight: 700;
            margin-top: 4px;
          }

          .fila {
            display: flex;
            gap: 16px;
            margin-bottom: 8px;
          }

          .campo {
            flex: 1;
            font-size: 13px;
          }

          .label {
            font-weight: 700;
          }

          .valor {
            border-bottom: 1px solid #9ca3af;
            padding: 3px 4px;
            min-height: 22px;
          }

          .concepto {
            margin-top: 10px;
            margin-bottom: 12px;
          }

          .concepto .valor {
            min-height: 48px;
            line-height: 1.35;
            white-space: pre-wrap;
          }

          .monto {
            font-size: 15px;
            font-weight: 700;
          }

          .firmas {
            display: flex;
            gap: 24px;
            margin-top: 34px;
          }

          .firma {
            flex: 1;
            text-align: center;
            font-size: 12px;
          }

          .linea {
            border-top: 1px solid #111827;
            padding-top: 6px;
          }

          .nota {
            margin-top: 18px;
            font-size: 11px;
            color: #374151;
            text-align: center;
            border-top: 1px solid #d1d5db;
            padding-top: 8px;
          }

          @media print {
            body {
              padding: 0;
            }

            .comprobante {
              margin-top: 20px;
              width: 720px;
              page-break-inside: avoid;
            }
          }
        </style>
      </head>

      <body>
        <div class="comprobante">
          <div class="encabezado">
            <div class="empresa">VAM Administradora de Condominios</div>
            <div class="titulo">Constancia de Desembolso de Caja Chica</div>
          </div>

          <div class="fila">
            <div class="campo">
              <div class="label">Condominio</div>
              <div class="valor">${limpiarTexto(registro.condominio)}</div>
            </div>

            <div class="campo">
              <div class="label">Fecha Registro</div>
              <div class="valor">${limpiarTexto(formatoFecha(registro.fecha))}</div>
            </div>

            <div class="campo">
              <div class="label">No. Registro</div>
              <div class="valor">CC-${limpiarTexto(registro.id)}</div>
            </div>
          </div>

          <div class="fila">
            <div class="campo">
              <div class="label">Pagado a / Responsable</div>
              <div class="valor">${limpiarTexto(registro.responsable)}</div>
            </div>

            <div class="campo">
              <div class="label">Monto</div>
              <div class="valor monto">${limpiarTexto(formatoRD(registro.monto))}</div>
            </div>
          </div>

          <div class="concepto">
            <div class="label">Concepto</div>
            <div class="valor">${limpiarTexto(registro.concepto)}</div>
          </div>

          ${
            registro.detalle_gasto
              ? `
                <div class="concepto">
                  <div class="label">Detalle</div>
                  <div class="valor">${limpiarTexto(registro.detalle_gasto)}</div>
                </div>
              `
              : ""
          }

          ${
            registro.comprobante
              ? `
                <div class="fila">
                  <div class="campo">
                    <div class="label">Comprobante / Factura</div>
                    <div class="valor">${limpiarTexto(registro.comprobante)}</div>
                  </div>
                </div>
              `
              : ""
          }

          <div class="firmas">
            <div class="firma">
              <div class="linea">Aprobado por</div>
            </div>

            <div class="firma">
              <div class="linea">Recibido por</div>
            </div>
          </div>

          <div class="nota">
            Este documento sirve como constancia del desembolso realizado desde caja chica.
          </div>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
          }
        </script>
      </body>
    </html>
  `

  const ventana = window.open("", "_blank", "width=850,height=700")

  if (!ventana) {
    alert("No se pudo abrir la ventana de impresión. Verifica que el navegador no esté bloqueando ventanas emergentes.")
    return
  }

  ventana.document.open()
  ventana.document.write(html)
  ventana.document.close()
}