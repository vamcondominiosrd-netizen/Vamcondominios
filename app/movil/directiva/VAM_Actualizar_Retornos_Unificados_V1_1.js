#!/usr/bin/env node

/**
 * VAM - Ajuste de retornos para acceso unificado
 * Version 1.1
 *
 * Ejecutar desde la raiz del proyecto:
 *   node .\app\movil\directiva\VAM_Actualizar_Retornos_Unificados_V1_1.js
 *
 * Esta version NO falla si el texto de version del modulo es diferente.
 */

const fs = require("fs");
const path = require("path");

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

function replaceRequired(text, from, to, label) {
  const count = text.split(from).length - 1;
  if (count === 0) {
    // Si ya fue aplicado, no repetir.
    if (text.includes(to)) {
      console.log(`YA APLICADO: ${label}`);
      return text;
    }
    fail(`${label}: no se encontro el bloque esperado.`);
  }
  if (count > 1) {
    fail(`${label}: se encontraron ${count} coincidencias; no se modifica para evitar errores.`);
  }
  return text.replace(from, to);
}

function patchDirectiva(root) {
  const file = path.join(root, "app/movil/directiva/page.tsx");
  if (!fs.existsSync(file)) fail(`No existe ${file}`);

  let text = fs.readFileSync(file, "utf8");

  text = replaceRequired(
    text,
    `  AlertCircle,\n`,
    `  AlertCircle,\n  ArrowLeft,\n`,
    "Directiva/import ArrowLeft"
  );

  text = replaceRequired(
    text,
    `"validar_acceso_directiva",`,
    `"vam_validar_acceso_directiva_unificado",`,
    "Directiva/RPC unificado"
  );

  text = replaceRequired(
    text,
    `      router.replace("/");`,
    `      router.replace("/movil/inicio-unificado");`,
    "Directiva/redireccion sin contexto"
  );

  const oldSessionBlock = `  async function cerrarSesion() {
    await supabase.auth.signOut();
    localStorage.removeItem("directiva_actual");
    localStorage.removeItem("usuario_actual");
    localStorage.removeItem("sesion_usuario");
    localStorage.removeItem("usuario");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_admin_id");
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
    router.replace("/");
  }`;

  const newSessionBlock = `  function limpiarContextoDirectiva() {
    localStorage.removeItem("directiva_actual");
    localStorage.removeItem("usuario_actual");
    localStorage.removeItem("sesion_usuario");
    localStorage.removeItem("usuario");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_admin_id");
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
  }

  function volverAlInicioUnificado() {
    // Cambiar de modulo NO cierra la sesion Supabase.
    limpiarContextoDirectiva();
    router.replace("/movil/inicio-unificado");
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    limpiarContextoDirectiva();
    localStorage.removeItem("vam_contexto_usuario");
    localStorage.removeItem("propietario_actual");
    localStorage.removeItem("propietario_token");
    localStorage.removeItem("propietario_token_expira");
    router.replace("/movil/acceso-unificado");
  }`;

  text = replaceRequired(
    text,
    oldSessionBlock,
    newSessionBlock,
    "Directiva/funciones retorno"
  );

  const oldHeader = `            <div className="flex min-w-0 items-center gap-3">
              {sesion.condominio_logo_url ? (`;

  const newHeader = `            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={volverAlInicioUnificado}
                aria-label="Volver a Mi cuenta VAM"
                title="Volver a Mi cuenta VAM"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
              >
                <ArrowLeft size={19} />
              </button>

              {sesion.condominio_logo_url ? (`;

  text = replaceRequired(
    text,
    oldHeader,
    newHeader,
    "Directiva/boton retorno"
  );

  // Version informativa: si existe, la actualiza; si no, no detiene el script.
  text = text.replace(
    /Directiva Inicio · v[0-9.]+/g,
    "Directiva Inicio · v2.3"
  );

  fs.writeFileSync(file, text, "utf8");
  console.log(`OK: ${file}`);
}

function patchPropietario(root) {
  const file = path.join(root, "app/movil/propietarios/dashboard/page.tsx");
  if (!fs.existsSync(file)) fail(`No existe ${file}`);

  let text = fs.readFileSync(file, "utf8");

  text = replaceRequired(
    text,
    `  Bell,\n`,
    `  ArrowLeft,\n  Bell,\n`,
    "Propietario/import ArrowLeft"
  );

  const oldSessionBlock = `  function cerrarSesion() {
    localStorage.removeItem("propietario_actual");
    localStorage.removeItem("propietario_token");
    localStorage.removeItem("propietario_token_expira");
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
    router.replace("/movil/propietarios/login");
  }`;

  const newSessionBlock = `  function limpiarContextoPropietario() {
    localStorage.removeItem("propietario_actual");
    localStorage.removeItem("propietario_token");
    localStorage.removeItem("propietario_token_expira");
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
  }

  function volverAlInicioUnificado() {
    // Cambiar de modulo NO cierra la sesion Supabase.
    limpiarContextoPropietario();
    router.replace("/movil/inicio-unificado");
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    limpiarContextoPropietario();
    localStorage.removeItem("vam_contexto_usuario");
    localStorage.removeItem("directiva_actual");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_rol");
    router.replace("/movil/acceso-unificado");
  }`;

  text = replaceRequired(
    text,
    oldSessionBlock,
    newSessionBlock,
    "Propietario/funciones retorno"
  );

  const oldHeader = `            <div className="flex min-w-0 items-center gap-3">
              {propietario.condominio_logo_url ? (`;

  const newHeader = `            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={volverAlInicioUnificado}
                aria-label="Volver a Mi cuenta VAM"
                title="Volver a Mi cuenta VAM"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
              >
                <ArrowLeft size={19} />
              </button>

              {propietario.condominio_logo_url ? (`;

  text = replaceRequired(
    text,
    oldHeader,
    newHeader,
    "Propietario/boton retorno"
  );

  // Version informativa: si existe, actualiza sin exigir valor previo exacto.
  text = text.replace(
    /const MODULO_VERSION = "[0-9.]+";/,
    `const MODULO_VERSION = "2.2";`
  );

  fs.writeFileSync(file, text, "utf8");
  console.log(`OK: ${file}`);
}

const root = process.cwd();

patchDirectiva(root);
patchPropietario(root);

console.log("");
console.log("RETORNOS VAM ACTUALIZADOS CORRECTAMENTE");
console.log("Directiva -> /movil/inicio-unificado");
console.log("Propietario -> /movil/inicio-unificado");
console.log("Cerrar sesion -> /movil/acceso-unificado");
