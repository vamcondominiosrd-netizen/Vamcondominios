-- VAM Condominios | Homologación proveedor v1.1.0 | 2026-09-20
-- ORIGEN: funciones y vista reales exportadas desde Supabase, no inventadas.
-- PRECAUCIÓN: respaldo / entorno de pruebas antes de ejecutar en producción.
-- No modifica gastos históricos, importes, cheques, documentos previos o movimientos bancarios.
-- No elimina gastos.proveedor: consumidores heredados siguen activos.
-- Primero desplegar este SQL, luego reemplazar page.tsx adjunto.
-- IMPORTANTE: revisar privilegios de ejecución de la función tras despliegue.
BEGIN;

-- 1. Validar la fuente de proveedor y dejar compatible la función bancaria.
CREATE OR REPLACE FUNCTION public.pagar_solicitud_pago_bancaria(p_solicitud_id bigint, p_cuenta_bancaria_id bigint, p_fecha_pago date, p_metodo_pago text DEFAULT NULL::text, p_numero_documento text DEFAULT NULL::text, p_referencia_banco text DEFAULT NULL::text, p_cheque_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  s record;
  v_client_id bigint;
  v_gasto_id bigint;
  v_movimiento_banco_id bigint;
  v_movimiento_existente_id bigint;
  v_periodo_anterior text;
  v_cuenta_anterior bigint;
  v_total numeric;
  v_metodo_pago text;
  v_origen_banco text;
  v_descripcion_banco text;

  -- Caja Chica
  v_proveedor_nombre text;
  v_categoria_nombre text;
  v_proveedor_norm text;
  v_categoria_norm text;
  v_tipo_caja_chica text;
  v_es_caja_chica boolean := false;
  v_resultado_caja jsonb;
  v_fondo_existente_id bigint;
  v_fondo_movimiento_id bigint;
  v_total_pendiente_caja numeric := 0;
  v_total_gastos_caja numeric := 0;
  v_total_reposiciones_caja numeric := 0;
  v_fondo_inicial_caja numeric := 0;
  v_disponible_caja numeric := 0;
  v_cantidad_pendiente_caja integer := 0;
  v_estado_norm text;
BEGIN
  IF p_solicitud_id IS NULL THEN
    RAISE EXCEPTION 'Debe indicar la solicitud de pago.';
  END IF;

  IF p_cuenta_bancaria_id IS NULL THEN
    RAISE EXCEPTION 'Debe indicar la cuenta bancaria del condominio.';
  END IF;

  IF p_fecha_pago IS NULL THEN
    RAISE EXCEPTION 'Debe indicar la fecha real del pago.';
  END IF;

  SELECT sp.*
  INTO s
  FROM public.solicitudes_pago sp
  WHERE sp.id = p_solicitud_id
  FOR UPDATE;

  IF s.id IS NULL THEN
    RAISE EXCEPTION 'Solicitud de pago no encontrada.';
  END IF;

  IF s.condominio_id IS NULL THEN
    RAISE EXCEPTION 'La solicitud no tiene condominio_id.';
  END IF;

  v_total := COALESCE(s.total, 0);

  IF v_total <= 0 THEN
    v_total := COALESCE(s.monto, 0) + COALESCE(s.itbis, 0);
  END IF;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'El total de la solicitud debe ser mayor que cero.';
  END IF;

  SELECT c.client_id
  INTO v_client_id
  FROM public.condominios c
  WHERE c.id = s.condominio_id
  LIMIT 1;

  v_metodo_pago := COALESCE(
    NULLIF(TRIM(p_metodo_pago), ''),
    s.metodo_pago,
    'Transferencia'
  );

  -- ==============================================================
  -- DETECTAR OPERACION DE CAJA CHICA
  -- ==============================================================
  SELECT cp.nombre_proveedor
  INTO v_proveedor_nombre
  FROM public.catalogo_proveedores cp
  WHERE cp.id = s.proveedor_id
    AND cp.condominio_id = s.condominio_id
  LIMIT 1;

  SELECT ccg.nombre_categoria
  INTO v_categoria_nombre
  FROM public.catalogo_categoria_gastos ccg
  WHERE ccg.id = s.categoria_id
  LIMIT 1;

  v_proveedor_norm := translate(
    lower(trim(COALESCE(v_proveedor_nombre, ''))),
    'áéíóúüñ',
    'aeiouun'
  );

  v_categoria_norm := translate(
    lower(trim(COALESCE(v_categoria_nombre, ''))),
    'áéíóúüñ',
    'aeiouun'
  );

  IF v_proveedor_norm LIKE '%caja chica%'
     AND v_categoria_norm LIKE '%caja chica%'
  THEN
    IF v_categoria_norm LIKE '%fondo inicial%' THEN
      v_tipo_caja_chica := 'fondo_inicial';
      v_es_caja_chica := true;
    ELSIF v_categoria_norm LIKE '%reposicion%' THEN
      v_tipo_caja_chica := 'reposicion';
      v_es_caja_chica := true;
    END IF;
  END IF;

  -- ==============================================================
  -- FLUJO ESPECIAL CAJA CHICA
  -- ==============================================================
  IF v_es_caja_chica THEN
    v_estado_norm := translate(
      lower(trim(COALESCE(s.estado, ''))),
      'áéíóúüñ',
      'aeiouun'
    );

    -- La aprobación debe validarse por la evidencia real del flujo
    -- (fechas de revisión), no solamente por el texto del estado actual.
    -- Una solicitud aprobada pudo quedar como 'Gasto generado' por el
    -- flujo anterior antes de instalar la integración de Caja Chica.
    IF NOT (
      (
        s.fecha_revision_tesorero IS NOT NULL
        AND s.fecha_revision_presidente IS NOT NULL
      )
      OR v_estado_norm IN (
        'aprobado por presidente',
        'aprobada por presidente',
        'aprobado',
        'aprobada',
        'pagada'
      )
    ) THEN
      RAISE EXCEPTION
        'La solicitud de Caja Chica debe estar aprobada por tesorero y presidente antes de procesar el pago. Estado actual: %.',
        COALESCE(s.estado, 'Sin estado');
    END IF;

    -- Compatibilidad con solicitudes de Caja Chica que alcanzaron a
    -- ejecutar "Generar gasto" con el flujo anterior.
    -- Caja Chica NO debe conservar ese gasto operativo.
    -- Solo se elimina si todavía NO fue pagado y NO tiene egreso bancario.
    IF s.gasto_generado_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1
        FROM public.gastos g
        WHERE g.id = s.gasto_generado_id
          AND COALESCE(g.pagado, false) = true
      ) THEN
        RAISE EXCEPTION
          'La solicitud de Caja Chica tiene el gasto % marcado como pagado. No se puede convertir automáticamente; requiere revisión.',
          s.gasto_generado_id;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.banco_movimientos bm
        WHERE bm.referencia_id = s.gasto_generado_id
          AND bm.tipo_movimiento = 'EGRESO'
      ) THEN
        RAISE EXCEPTION
          'La solicitud de Caja Chica tiene un movimiento bancario previo asociado al gasto %. No se puede convertir automáticamente; requiere revisión.',
          s.gasto_generado_id;
      END IF;

      DELETE FROM public.gastos
      WHERE id = s.gasto_generado_id;

      UPDATE public.solicitudes_pago
      SET
        gasto_generado_id = NULL,
        gasto_generado_at = NULL
      WHERE id = s.id;
    END IF;

    -- Evitar procesar dos veces la misma solicitud.
    SELECT
      f.id,
      f.movimiento_banco_id
    INTO
      v_fondo_existente_id,
      v_fondo_movimiento_id
    FROM public.caja_chica_fondos f
    WHERE f.solicitud_pago_id = s.id
      AND lower(COALESCE(f.estado, 'registrado')) <> 'anulado'
    ORDER BY f.id
    LIMIT 1
    FOR UPDATE;

    IF v_fondo_movimiento_id IS NOT NULL THEN
      UPDATE public.solicitudes_pago
      SET estado = 'Pagada'
      WHERE id = s.id;

      RETURN jsonb_build_object(
        'ok', true,
        'ya_procesada', true,
        'solicitud_id', s.id,
        'fondo_id', v_fondo_existente_id,
        'movimiento_banco_id', v_fondo_movimiento_id,
        'monto_pagado', v_total,
        'mensaje', 'La solicitud de Caja Chica ya estaba procesada.'
      );
    END IF;

    -- Para reposición se usa el BALANCE FINANCIERO REAL.
    -- Compatibilidad: fondos históricos sin movimiento bancario se
    -- reconocen cuando solicitud_pago_id IS NULL; los fondos nuevos
    -- siguen exigiendo el flujo bancario centralizado.
    -- No se usa caja_chica.repuesto para calcular el dinero porque el
    -- histórico anterior no marcó correctamente ese campo.
    --
    -- Pendiente = Gastos acumulados hasta crear la solicitud
    --             - Reposiciones desembolsadas previas.
    --
    -- El Fondo Inicial es capital base y NO se resta como reposición.
    IF v_tipo_caja_chica = 'reposicion' THEN
      SELECT
        COUNT(*)::integer,
        COALESCE(SUM(cc.monto), 0)
      INTO
        v_cantidad_pendiente_caja,
        v_total_gastos_caja
      FROM public.caja_chica cc
      WHERE (
          cc.condominio_id = s.condominio_id
          OR (
            cc.condominio_id IS NULL
            AND lower(trim(COALESCE(cc.condominio, ''))) =
                lower(trim(COALESCE(s.condominio, '')))
          )
        )
        AND cc.created_at <= COALESCE(s.created_at, now());

      SELECT
        COALESCE(SUM(f.monto), 0)
      INTO v_total_reposiciones_caja
      FROM public.caja_chica_fondos f
      WHERE f.condominio_id = s.condominio_id
        AND lower(COALESCE(f.tipo, '')) = 'reposicion'
        AND lower(COALESCE(f.estado, '')) <> 'anulado'
        AND (
          f.movimiento_banco_id IS NOT NULL
          OR f.solicitud_pago_id IS NULL
        )
        AND f.created_at <= COALESCE(s.created_at, now());

      SELECT
        COALESCE(MAX(f.monto), 0)
      INTO v_fondo_inicial_caja
      FROM public.caja_chica_fondos f
      WHERE f.condominio_id = s.condominio_id
        AND lower(COALESCE(f.tipo, '')) = 'fondo_inicial'
        AND lower(COALESCE(f.estado, '')) <> 'anulado'
        AND (
          f.movimiento_banco_id IS NOT NULL
          OR f.solicitud_pago_id IS NULL
        )
        AND f.created_at <= COALESCE(s.created_at, now());

      IF v_fondo_inicial_caja <= 0 THEN
        RAISE EXCEPTION
          'No existe un Fondo Inicial de Caja Chica válido para este condominio.';
      END IF;

      v_total_pendiente_caja :=
        GREATEST(
          ROUND(v_total_gastos_caja - v_total_reposiciones_caja, 2),
          0
        );

      v_disponible_caja :=
        ROUND(
          v_fondo_inicial_caja
          + v_total_reposiciones_caja
          - v_total_gastos_caja,
          2
        );

      IF v_total_pendiente_caja <= 0 THEN
        RAISE EXCEPTION
          'Caja Chica no tiene monto pendiente de reposición.';
      END IF;

      IF ABS(v_total_pendiente_caja - v_total) > 0.01 THEN
        RAISE EXCEPTION
          'El monto de la solicitud no coincide con el balance real de Caja Chica. Fondo fijo: RD$ %, gastos acumulados: RD$ %, reposiciones desembolsadas: RD$ %, disponible: RD$ %, pendiente correcto: RD$ %, solicitud: RD$ %.',
          v_fondo_inicial_caja,
          v_total_gastos_caja,
          v_total_reposiciones_caja,
          v_disponible_caja,
          v_total_pendiente_caja,
          v_total;
      END IF;
    END IF;

    v_resultado_caja := public.registrar_fondo_caja_chica_bancario(
      s.condominio_id,
      s.condominio,
      p_cuenta_bancaria_id,
      p_fecha_pago,
      v_tipo_caja_chica,
      v_total,
      COALESCE(
        NULLIF(TRIM(s.detalle), ''),
        NULLIF(TRIM(s.concepto), ''),
        CASE
          WHEN v_tipo_caja_chica = 'reposicion'
            THEN 'Reposición de Caja Chica'
          ELSE 'Fondo Inicial de Caja Chica'
        END
      ),
      COALESCE(NULLIF(TRIM(s.created_by), ''), 'Caja Chica'),
      v_metodo_pago,
      p_numero_documento,
      COALESCE(NULLIF(TRIM(p_referencia_banco), ''), p_numero_documento),
      p_cheque_url,
      s.id,
      v_fondo_existente_id
    );

    v_movimiento_banco_id :=
      NULLIF(v_resultado_caja->>'movimiento_banco_id', '')::bigint;

    -- No se modifica masivamente caja_chica.repuesto.
    -- Ese campo histórico queda solo como referencia/auditoría y no participa
    -- en el cálculo financiero de la reposición.

    UPDATE public.solicitudes_pago
    SET estado = 'Pagada'
    WHERE id = s.id;

    RETURN jsonb_build_object(
      'ok', true,
      'solicitud_id', s.id,
      'tipo_operacion', v_tipo_caja_chica,
      'fondo_id', NULLIF(v_resultado_caja->>'fondo_id', '')::bigint,
      'movimiento_banco_id', v_movimiento_banco_id,
      'monto_pagado', v_total,
      'fecha_pago', p_fecha_pago,
      'gasto_operativo_generado', false,
      'mensaje',
        CASE
          WHEN v_tipo_caja_chica = 'reposicion'
            THEN 'Reposición de Caja Chica registrada correctamente. Banco disminuido y fondo de Caja Chica repuesto según el balance real.'
          ELSE 'Fondo Inicial de Caja Chica registrado correctamente. Banco disminuido y Caja Chica disponible para uso.'
        END
    );
  END IF;

  -- ==============================================================
  -- FLUJO NORMAL EXISTENTE
  -- ==============================================================
  -- No aceptar referencias a proveedores inexistentes/de otro condominio.
  -- Las solicitudes especiales sin proveedor (p. ej. nómina) siguen admitidas.
  IF s.proveedor_id IS NOT NULL
     AND NULLIF(BTRIM(COALESCE(v_proveedor_nombre, '')), '') IS NULL THEN
    RAISE EXCEPTION 'El proveedor de la solicitud no está vigente en el catálogo de este condominio.';
  END IF;

  v_origen_banco :=
    CASE
      WHEN LOWER(v_metodo_pago) LIKE '%cheque%' THEN 'CHEQUE'
      WHEN LOWER(v_metodo_pago) LIKE '%transfer%' THEN 'TRANSFERENCIA'
      ELSE 'PAGO_PROVEEDOR'
    END;

  v_descripcion_banco :=
    'Pago solicitud No. ' ||
    COALESCE(LPAD(s.numero_solicitud::text, 5, '0'), s.id::text) ||
    ' - ' ||
    COALESCE(s.concepto, 'Gasto');

  IF s.gasto_generado_id IS NOT NULL THEN
    v_gasto_id := s.gasto_generado_id;

    UPDATE public.gastos
    SET
      proveedor = CASE
        WHEN NULLIF(BTRIM(COALESCE(proveedor, '')), '') IS NULL
             AND s.proveedor_id IS NOT NULL THEN v_proveedor_nombre
        ELSE proveedor
      END,
      metodo_pago = v_metodo_pago,
      numero_cheque = p_numero_documento,
      cheque_url = p_cheque_url,
      fecha_pago = p_fecha_pago,
      pagado = true,
      estado = 'Pagado',
      cuenta_bancaria_id = p_cuenta_bancaria_id,
      total = v_total
    WHERE id = v_gasto_id;
  ELSE
    INSERT INTO public.gastos (
      client_id,
      condominio_id,
      condominio,
      fecha,
      descripcion,
      monto,
      proveedor_id,
      proveedor,
      categoria_id,
      concepto,
      detalle_gasto,
      itbis,
      total,
      no_factura,
      ncf,
      metodo_pago,
      cuenta_banco,
      factura_url,
      estado,
      aprobado_tesorero,
      aprobado_presidente,
      fecha_aprobacion_tesorero,
      fecha_aprobacion_presidente,
      cheque_url,
      numero_cheque,
      fecha_pago,
      pagado,
      cuenta_bancaria_id
    )
    VALUES (
      v_client_id,
      s.condominio_id,
      s.condominio,
      s.fecha_solicitud,
      COALESCE(s.detalle, s.concepto),
      COALESCE(s.monto, 0),
      s.proveedor_id,
      v_proveedor_nombre,
      s.categoria_id,
      s.concepto,
      s.detalle,
      COALESCE(s.itbis, 0),
      v_total,
      s.no_factura,
      s.ncf,
      v_metodo_pago,
      s.cuenta_banco,
      s.soporte_url,
      'Pagado',
      true,
      true,
      s.fecha_revision_tesorero,
      s.fecha_revision_presidente,
      p_cheque_url,
      p_numero_documento,
      p_fecha_pago,
      true,
      p_cuenta_bancaria_id
    )
    RETURNING id INTO v_gasto_id;
  END IF;

  SELECT id, periodo, cuenta_bancaria_id
  INTO v_movimiento_existente_id, v_periodo_anterior, v_cuenta_anterior
  FROM public.banco_movimientos
  WHERE condominio_id = s.condominio_id
    AND referencia_id = v_gasto_id
    AND tipo_movimiento = 'EGRESO'
  LIMIT 1;

  IF v_movimiento_existente_id IS NULL THEN
    v_movimiento_banco_id := public.registrar_movimiento_bancario_real(
      s.condominio_id,
      p_cuenta_bancaria_id,
      p_fecha_pago,
      'EGRESO',
      v_origen_banco,
      v_descripcion_banco,
      v_total,
      COALESCE(p_numero_documento, 'GASTO-' || v_gasto_id::text),
      COALESCE(s.concepto, 'Proveedor'),
      p_referencia_banco
    );

    UPDATE public.banco_movimientos
    SET referencia_id = v_gasto_id
    WHERE id = v_movimiento_banco_id;
  ELSE
    v_movimiento_banco_id := v_movimiento_existente_id;

    UPDATE public.banco_movimientos
    SET
      cuenta_bancaria_id = p_cuenta_bancaria_id,
      fecha_movimiento = p_fecha_pago,
      periodo = to_char(p_fecha_pago, 'YYYY-MM'),
      tipo_movimiento = 'EGRESO',
      origen = v_origen_banco,
      descripcion = v_descripcion_banco,
      monto = v_total,
      numero_documento = COALESCE(
        p_numero_documento,
        'GASTO-' || v_gasto_id::text
      ),
      referencia_banco = p_referencia_banco,
      beneficiario = COALESCE(s.concepto, 'Proveedor'),
      estado_banco = 'PENDIENTE',
      conciliado = false
    WHERE id = v_movimiento_banco_id;
  END IF;

  UPDATE public.solicitudes_pago
  SET
    estado = 'Pagada',
    gasto_generado_id = v_gasto_id,
    gasto_generado_at = COALESCE(gasto_generado_at, now())
  WHERE id = p_solicitud_id;

  IF v_periodo_anterior IS NOT NULL THEN
    PERFORM public.recalcular_saldo_movimientos_banco(
      s.condominio_id,
      COALESCE(v_cuenta_anterior, p_cuenta_bancaria_id),
      v_periodo_anterior
    );
  END IF;

  PERFORM public.recalcular_saldo_movimientos_banco(
    s.condominio_id,
    p_cuenta_bancaria_id,
    to_char(p_fecha_pago, 'YYYY-MM')
  );

  RETURN jsonb_build_object(
    'ok', true,
    'solicitud_id', p_solicitud_id,
    'gasto_id', v_gasto_id,
    'movimiento_banco_id', v_movimiento_banco_id,
    'monto_pagado', v_total,
    'fecha_pago', p_fecha_pago,
    'mensaje',
      'Solicitud pagada, gasto actualizado y egreso bancario registrado correctamente'
  );
END;
$function$;

-- 2. Proteger beneficiario histórico y resolver nombre ausente desde catálogo.
CREATE OR REPLACE FUNCTION public.preparar_gasto_documento()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_client_id bigint;
    v_condominio_id bigint;
    v_proveedor_id bigint;
    v_proveedor_nombre text;
    v_proveedor_nombre_catalogo text;
BEGIN
    SELECT
        g.client_id,
        g.condominio_id,
        g.proveedor_id,
        g.proveedor,
        cp.nombre_proveedor
    INTO
        v_client_id,
        v_condominio_id,
        v_proveedor_id,
        v_proveedor_nombre,
        v_proveedor_nombre_catalogo
    FROM public.gastos g
    LEFT JOIN public.catalogo_proveedores cp
      ON cp.id = g.proveedor_id
     AND cp.condominio_id = g.condominio_id
    WHERE g.id = NEW.gasto_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'El gasto % no existe.',
            NEW.gasto_id;
    END IF;

    IF v_condominio_id IS NULL THEN
        RAISE EXCEPTION
            'El gasto % no tiene condominio asignado. Debe corregirse antes de adjuntar documentos.',
            NEW.gasto_id;
    END IF;

    -- Nunca confiar en el condominio enviado desde la pantalla
    NEW.client_id := v_client_id;
    NEW.condominio_id := v_condominio_id;
    NEW.proveedor_id := v_proveedor_id;
    -- Documento: fotografía histórica del nombre, no dato de pantalla.
    -- Si se modifica el documento, no sobrescribir el nombre ya emitido.
    IF TG_OP = 'UPDATE' THEN
        NEW.proveedor_nombre := COALESCE(
            NULLIF(BTRIM(OLD.proveedor_nombre), ''),
            NULLIF(BTRIM(v_proveedor_nombre), ''),
            NULLIF(BTRIM(v_proveedor_nombre_catalogo), '')
        );
    ELSE
        NEW.proveedor_nombre := COALESCE(
            NULLIF(BTRIM(v_proveedor_nombre), ''),
            NULLIF(BTRIM(v_proveedor_nombre_catalogo), '')
        );
    END IF;

    NEW.updated_at := now();
    NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);

    IF TG_OP = 'INSERT' THEN
        NEW.created_by := COALESCE(auth.uid(), NEW.created_by);
        NEW.created_at := COALESCE(NEW.created_at, now());
    END IF;

    RETURN NEW;
END;
$function$;

-- 3. Vista documental obtiene nombre canónico por proveedor_id (mismo condominio).
CREATE OR REPLACE VIEW public.vw_gastos_control_documental AS
SELECT g.id AS gasto_id,
    g.client_id,
    g.condominio_id,
    g.proveedor_id,
    COALESCE(NULLIF(BTRIM(cp.nombre_proveedor), ''),
             NULLIF(BTRIM(g.proveedor), '')) AS proveedor,
    g.fecha,
    g.fecha_pago,
    g.descripcion,
    g.concepto,
    COALESCE(g.total, g.monto) AS total,
    g.estado AS estado_gasto,
    COALESCE(g.pagado, false) AS pagado,
    g.requiere_recibo_suplidor,
    g.motivo_recibo_no_requerido,
    count(d.id) FILTER (WHERE (d.estado = 'ACTIVO'::text)) AS cantidad_documentos,
    count(d.id) FILTER (WHERE ((d.estado = 'ACTIVO'::text) AND (d.tipo_documento = ANY (ARRAY['RECIBO_SUPLIDOR'::text, 'FACTURA_PAGADA'::text, 'CERTIFICACION_PAGO'::text, 'CARTA_DESCARGO'::text])))) AS cantidad_constancias_pago,
    max(d.created_at) FILTER (WHERE ((d.estado = 'ACTIVO'::text) AND (d.tipo_documento = ANY (ARRAY['RECIBO_SUPLIDOR'::text, 'FACTURA_PAGADA'::text, 'CERTIFICACION_PAGO'::text, 'CARTA_DESCARGO'::text])))) AS fecha_ultima_constancia,
        CASE
            WHEN (COALESCE(g.pagado, false) = false) THEN 'NO_APLICA'::text
            WHEN (g.requiere_recibo_suplidor = false) THEN 'NO_REQUERIDO'::text
            WHEN (count(d.id) FILTER (WHERE ((d.estado = 'ACTIVO'::text) AND (d.tipo_documento = ANY (ARRAY['RECIBO_SUPLIDOR'::text, 'FACTURA_PAGADA'::text, 'CERTIFICACION_PAGO'::text, 'CARTA_DESCARGO'::text])))) > 0) THEN 'DOCUMENTACION_COMPLETA'::text
            ELSE 'PENDIENTE_RECIBO'::text
        END AS estado_documentacion
   FROM public.gastos g
   LEFT JOIN public.catalogo_proveedores cp
     ON cp.id = g.proveedor_id
    AND cp.condominio_id = g.condominio_id
   LEFT JOIN public.gastos_documentos d
     ON d.gasto_id = g.id
  GROUP BY g.id, g.client_id, g.condominio_id, g.proveedor_id, g.proveedor, cp.nombre_proveedor, g.fecha, g.fecha_pago, g.descripcion, g.concepto, g.total, g.monto, g.estado, g.pagado, g.requiere_recibo_suplidor, g.motivo_recibo_no_requerido;

COMMIT;
