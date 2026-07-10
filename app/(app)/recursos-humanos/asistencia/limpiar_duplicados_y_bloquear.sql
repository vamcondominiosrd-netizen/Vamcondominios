-- Ejecutar una sola vez en Supabase SQL Editor.
-- Elimina duplicados dejando el primer registro por condominio + empleado + fecha.

WITH duplicados AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY condominio_id, empleado_id, fecha
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS fila
  FROM public.rh_asistencia
)
DELETE FROM public.rh_asistencia a
USING duplicados d
WHERE a.id = d.id
  AND d.fila > 1;

-- Luego crea una protección para que no vuelva a duplicar.
CREATE UNIQUE INDEX IF NOT EXISTS ux_rh_asistencia_cond_emp_fecha
ON public.rh_asistencia (condominio_id, empleado_id, fecha);
