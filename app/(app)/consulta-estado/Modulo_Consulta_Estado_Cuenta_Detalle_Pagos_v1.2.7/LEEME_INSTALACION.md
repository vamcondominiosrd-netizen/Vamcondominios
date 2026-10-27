# Estado de Cuenta de Cargos v1.2.7 – Detalle de pagos realizados

Archivo modificado: `page.tsx`.

## Instalación
1. Respaldar el módulo actual de Consulta de Estado de Cuenta.
2. Reemplazar **únicamente** `app/consulta-estado/page.tsx` (o `src/app/consulta-estado/page.tsx`, según el proyecto) con el archivo incluido.
3. Desplegar la aplicación en el entorno de pruebas y verificar con el apartamento B2 del Condominio Don Juan I (ID 24):
   - Pago 557 (03/09/2026): RD$6,244.53 = Gas agosto RD$744.53 + mantenimiento septiembre RD$5,500.00.
   - Pago 558 (14/10/2026): RD$6,451.52 = Gas septiembre RD$951.52 + mantenimiento octubre RD$5,500.00.
4. Imprimir y confirmar que al final del PDF aparece la tabla "DETALLE DE LOS PAGOS REALIZADOS".
5. Verificar otros condominios con y sin pagos para garantizar que el resumen previo sigue igual.

## Funcionamiento
- Añade un historial cronológico de todos los pagos de la unidad, con referencia, fecha, importe recibido y detalle por concepto/período/monto aplicado.
- Un único pago con varias aplicaciones se contabiliza **una sola vez** como recibido.
- Los importes de cada aplicación se toman de `pagos_aplicaciones`, con la clasificación del cargo desde `cargos_periodicos`.
- Conserva separado el resumen de depósitos del año (sin modificar cálculos) del historial total registrado.
- Cuando falta trazabilidad se muestra "Sin aplicaciones vinculadas" o una alerta. Nunca infiere que la diferencia sea saldo a favor.
- No ejecuta SQL ni escrituras. No modifica el estado de cuenta, facturas, pagos, saldos ni NCF.

## Validación pendiente
Este código fue validado sintácticamente, pero falta probarlo en la aplicación real con acceso a Supabase y revisar la impresión en navegador.
