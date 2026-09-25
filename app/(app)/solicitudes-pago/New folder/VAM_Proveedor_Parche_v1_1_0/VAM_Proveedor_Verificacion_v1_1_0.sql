-- CONSULTAS DE VERIFICACIÓN (solo lectura)
-- Ejecutar después del despliegue SQL.
-- A. Resumen de faltantes históricos; se conservan sin UPDATE deliberadamente.
SELECT g.condominio_id, COUNT(*) AS gastos_con_proveedor_id,
 COUNT(*) FILTER (WHERE NULLIF(BTRIM(g.proveedor), '') IS NULL) AS nombres_heredados_vacios,
 COUNT(*) FILTER (WHERE p.id IS NULL) AS proveedores_sin_catalogo
FROM public.gastos g
LEFT JOIN public.catalogo_proveedores p
 ON p.id = g.proveedor_id AND p.condominio_id = g.condominio_id
WHERE g.proveedor_id IS NOT NULL
GROUP BY g.condominio_id ORDER BY g.condominio_id;

-- B. La vista debe mostrar el proveedor aunque el campo heredado esté vacío.
SELECT g.id AS gasto_id, g.proveedor_id, g.proveedor AS valor_heredado,
 v.proveedor AS nombre_mostrado, p.nombre_proveedor AS nombre_catalogo
FROM public.gastos g
JOIN public.vw_gastos_control_documental v ON v.gasto_id = g.id
LEFT JOIN public.catalogo_proveedores p
 ON p.id = g.proveedor_id AND p.condominio_id = g.condominio_id
WHERE g.condominio_id = 1
 AND g.proveedor_id IS NOT NULL
 AND NULLIF(BTRIM(g.proveedor), '') IS NULL
ORDER BY g.id DESC LIMIT 30;

-- C. Estado final y definición instalada, sin ejecutar pagos.
SELECT proname AS funcion, pg_get_functiondef(oid) AS definicion
FROM pg_proc WHERE oid IN (
 'public.pagar_solicitud_pago_bancaria(bigint,bigint,date,text,text,text,text)'::regprocedure,
 'public.preparar_gasto_documento()'::regprocedure
);
