import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _req: Request,
  { params }: { params: { import_id: string } }
) {
  const importId = Number(params?.import_id);

  if (!Number.isFinite(importId) || importId <= 0) {
    return NextResponse.json(
      { error: `import_id inválido: "${params?.import_id}"` },
      { status: 400 }
    );
  }

  const { data: imp, error: impErr } = await supabaseAdmin
    .from("bank_imports")
    .select("id, client_id, condominio_id, filename, status, uploaded_at, uploaded_by")
    .eq("id", importId)
    .single();

  if (impErr) return NextResponse.json({ error: impErr.message }, { status: 500 });

  const { data: txs, error: txErr } = await supabaseAdmin
    .from("bank_transactions")
    .select("id, monto, hash, descripcion, referencia, fecha, import_id")
    .eq("import_id", importId);

  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

  const txList = txs || [];
  const txIds = txList.map((t: any) => t.id);

  if (txIds.length === 0) {
    return NextResponse.json({
      import: imp,
      summary: {
        tx_total: 0,
        matches_total: 0,
        ok_total: 0,
        revisar_total: 0,
        total_banco: 0,
        total_ok: 0,
        total_revisar: 0,
        ok_sin_unidad: 0,
        duplicados_hash: 0,
      },
      por_unidad_ok: [],
      duplicados: [],
      revisar_rows: [],
    });
  }

  const { data: matches, error: mErr } = await supabaseAdmin
    .from("bank_matches")
    .select("transaction_id, estado, confianza, unidad_codigo, unidad_id, nota")
    .in("transaction_id", txIds);

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const matchList = matches || [];
  const matchMap = new Map<number, any>();
  matchList.forEach((m: any) => matchMap.set(Number(m.transaction_id), m));

  let totalBanco = 0;
  let totalOK = 0;
  let totalRevisar = 0;
  let okTotal = 0;
  let revisarTotal = 0;
  let okSinUnidad = 0;

  const hashCount = new Map<string, { count: number; total: number }>();
  const porUnidad = new Map<string, { pagos: number; total: number }>();
  const revisarRows: any[] = [];

  for (const t of txList as any[]) {
    const monto = Number(t.monto) || 0;
    totalBanco += monto;

    const h = String(t.hash || "");
    if (h) {
      const curr = hashCount.get(h) || { count: 0, total: 0 };
      curr.count += 1;
      curr.total += monto;
      hashCount.set(h, curr);
    }

    const m = matchMap.get(Number(t.id));
    const estado = m?.estado || "REVISAR";
    const unidadCodigo = m?.unidad_codigo || null;

    if (estado === "OK") {
      okTotal += 1;
      totalOK += monto;

      if (!unidadCodigo) okSinUnidad += 1;

      const key = unidadCodigo || "(SIN UNIDAD)";
      const acc = porUnidad.get(key) || { pagos: 0, total: 0 };
      acc.pagos += 1;
      acc.total += monto;
      porUnidad.set(key, acc);
    } else {
      revisarTotal += 1;
      totalRevisar += monto;

      revisarRows.push({
        transaction_id: t.id,
        fecha: t.fecha,
        monto,
        referencia: t.referencia,
        descripcion: t.descripcion,
        estado,
        confianza: m?.confianza || "BAJA",
        unidad_codigo: unidadCodigo,
        nota: m?.nota || null,
      });
    }
  }

  const duplicados = Array.from(hashCount.entries())
    .filter(([_, v]) => v.count > 1)
    .map(([hash, v]) => ({ hash, repeticiones: v.count, total_monto: v.total }))
    .sort((a, b) => b.repeticiones - a.repeticiones);

  const porUnidadOk = Array.from(porUnidad.entries())
    .map(([unidad_codigo, v]) => ({
      unidad_codigo,
      pagos: v.pagos,
      total_monto: v.total,
    }))
    .sort((a, b) => String(a.unidad_codigo).localeCompare(String(b.unidad_codigo)));

  return NextResponse.json({
    import: imp,
    summary: {
      tx_total: txList.length,
      matches_total: matchList.length,
      ok_total: okTotal,
      revisar_total: revisarTotal,
      total_banco: totalBanco,
      total_ok: totalOK,
      total_revisar: totalRevisar,
      ok_sin_unidad: okSinUnidad,
      duplicados_hash: duplicados.length,
    },
    por_unidad_ok: porUnidadOk,
    duplicados,
    revisar_rows: revisarRows.slice(0, 200),
  });
}
