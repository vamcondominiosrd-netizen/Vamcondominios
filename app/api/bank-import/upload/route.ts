import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function norm(s: string) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function makeHash(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * POST body:
 * {
 *   client_id: number,
 *   condominio_id: number,
 *   filename: string,
 *   uploaded_by: string (UUID),
 *   rows: Array<{
 *     fecha?: string|null, // "2026-02-01" o ISO
 *     monto: number,
 *     referencia?: string|null,
 *     descripcion?: string|null
 *   }>
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const client_id = Number(body.client_id);
    const condominio_id = Number(body.condominio_id);
    const filename = String(body.filename || "").trim();
    const uploaded_by = String(body.uploaded_by || "").trim(); // ✅ UUID
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!client_id || !condominio_id) {
      return NextResponse.json({ error: "Faltan client_id o condominio_id" }, { status: 400 });
    }
    if (!filename) {
      return NextResponse.json({ error: "filename requerido" }, { status: 400 });
    }
    if (!uploaded_by) {
      return NextResponse.json({ error: "uploaded_by requerido (UUID del usuario)" }, { status: 400 });
    }
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "rows requerido (no puede venir vacío)" }, { status: 400 });
    }

    // 1) Crear import en STAGING (tu tabla exige uploaded_at)
    const { data: imp, error: impErr } = await supabaseAdmin
      .from("bank_imports")
      .insert([
        {
          client_id,
          condominio_id,
          filename,
          uploaded_by, // ✅ uuid
          uploaded_at: new Date().toISOString(), // ✅ requerido por tu tabla
          status: "STAGING",
        },
      ])
      .select("id")
      .single();

    if (impErr) {
      return NextResponse.json({ error: impErr.message }, { status: 500 });
    }

    const import_id = Number(imp.id);

    // 2) Insertar transacciones (incluye hash NOT NULL)
    const txInserts = rows.map((r: any, i: number) => {
      const fecha = r.fecha ?? null;
      const monto = Number(r.monto);
      const referencia = r.referencia ?? null;
      const descripcion = r.descripcion ?? null;

      const raw = [
        client_id,
        condominio_id,
        import_id,
        i,
        fecha ?? "",
        monto,
        referencia ?? "",
        descripcion ?? "",
      ].join("|");

      return {
        import_id,
        client_id,
        condominio_id,
        fecha,
        monto,
        referencia,
        descripcion,
        hash: makeHash(raw), // ✅ requerido por tu tabla
      };
    });

    const { data: txs, error: txErr } = await supabaseAdmin
      .from("bank_transactions")
      .insert(txInserts)
      .select("id, descripcion");

    if (txErr) {
      return NextResponse.json({ error: txErr.message }, { status: 500 });
    }

    // 3) Cargar alias del condominio (si existen)
    const { data: aliases, error: aErr } = await supabaseAdmin
      .from("bank_aliases")
      .select("alias_text, unidad_id, unidad_codigo")
      .eq("client_id", client_id)
      .eq("condominio_id", condominio_id);

    if (aErr) {
      return NextResponse.json({ error: aErr.message }, { status: 500 });
    }

    const aliasList =
      (aliases || []).map((a: any) => ({
        alias_text: norm(String(a.alias_text || "")),
        unidad_id: Number(a.unidad_id),
        unidad_codigo: String(a.unidad_codigo || ""),
      })) || [];

    // 4) Crear matches
    const matchInserts = (txs || []).map((t: any) => {
      const desc = norm(String(t.descripcion || ""));
      const hit = aliasList.find((a) => a.alias_text && desc.includes(a.alias_text));

      if (hit) {
        return {
          transaction_id: Number(t.id),
          client_id,
          condominio_id,
          unidad_id: hit.unidad_id,
          unidad_codigo: hit.unidad_codigo,
          estado: "OK",
          confianza: "ALTA",
          nota: "ALIAS",
        };
      }

      return {
        transaction_id: Number(t.id),
        client_id,
        condominio_id,
        estado: "REVISAR",
        confianza: "BAJA",
        nota: null,
      };
    });

    const { error: mErr } = await supabaseAdmin.from("bank_matches").insert(matchInserts);
    if (mErr) {
      return NextResponse.json({ error: mErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      import_id,
      inserted_transactions: (txs || []).length,
      auto_ok: matchInserts.filter((m: any) => m.estado === "OK").length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error inesperado" }, { status: 500 });
  }
}
