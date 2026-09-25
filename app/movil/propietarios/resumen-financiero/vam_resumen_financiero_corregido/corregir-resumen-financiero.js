// VAM: actualizar únicamente el resumen financiero de propietarios.
// Ejecutar desde la RAÍZ del repositorio: node vam_resumen_financiero_corregido/corregir-resumen-financiero.js
// No ejecuta SQL, no realiza git commit ni publica en Vercel.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const raiz = process.cwd();
const rutaPagina = path.join(raiz, 'app', 'movil', 'propietarios', 'resumen-financiero', 'page.tsx');
const rutaApi = path.join(raiz, 'app', 'api', 'propietarios', 'soportes-gastos', 'route.ts');
const rutaMetodo = path.join(__dirname, 'nuevo_metodo.ts.txt');

function verificar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje + ' No se cambió ningún archivo.');
}
function reemplazoUnico(texto, expresion, reemplazo, descripcion) {
  const ocurrencias = [...texto.matchAll(new RegExp(expresion.source, expresion.flags.includes('g') ? expresion.flags : expresion.flags + 'g'))];
  verificar(ocurrencias.length === 1, `No se reconoció exactamente una vez ${descripcion} (encontradas: ${ocurrencias.length}).`);
  return texto.replace(expresion, reemplazo);
}

try {
  verificar(fs.existsSync(rutaPagina), `No existe el resumen esperado: ${rutaPagina}.`);
  verificar(fs.existsSync(rutaApi), `Falta la API segura: ${rutaApi}. Copie route.ts del paquete a esa ruta.`);
  verificar(fs.existsSync(rutaMetodo), 'No se encuentra nuevo_metodo.ts.txt al lado del script.');
  const api = fs.readFileSync(rutaApi, 'utf8');
  verificar(api.includes('validar_sesion_propietario') && api.includes('SUPABASE_SERVICE_ROLE_KEY') && api.includes('documentos: resultado'),
    'La API existente no coincide con la versión segura de soportes-gastos; revisar antes de continuar.');

  const original = fs.readFileSync(rutaPagina, 'utf8');
  const finLinea = original.includes('\r\n') ? '\r\n' : '\n';
  let texto = original.replace(/\r\n/g, '\n');
  verificar(texto.includes('export default function TransparenciaFinancieraPage()') && texto.includes('Resumen mensual'),
    'Este NO parece ser el archivo de resumen financiero para propietarios.');

  const marcaInicio = '  async function cargarSoportesPropietario(gastosBase: Gasto[]) {';
  const marcaFin = '  async function cargarPeriodo(s: PropietarioActual, p: string) {';
  verificar(texto.includes(marcaInicio), 'No se encontró el método original. Podría estar modificado o ya actualizado.');
  verificar(texto.split(marcaInicio).length === 2, 'El método original aparece más de una vez.');
  const inicio = texto.indexOf(marcaInicio);
  const fin = texto.indexOf(marcaFin, inicio + marcaInicio.length);
  verificar(fin > inicio, 'No se encontró el límite del método cargarSoportesPropietario.');

  let metodo = fs.readFileSync(rutaMetodo, 'utf8').replace(/\r\n/g, '\n');
  metodo = metodo.slice(metodo.indexOf('async function cargarSoportesPropietario(')).trimEnd();
  verificar(metodo.startsWith('async function cargarSoportesPropietario(') && metodo.includes('/api/propietarios/soportes-gastos'),
    'El método proporcionado no corresponde a la API requerida.');
  // Indentar el método dentro del componente y conservar el resto del archivo sin recrearlo.
  const metodoIndentado = metodo.split('\n').map(linea => linea ? '  ' + linea : '').join('\n') + '\n\n';
  texto = texto.slice(0, inicio) + metodoIndentado + texto.slice(fin);
  texto = reemplazoUnico(
    texto,
    /const gastosConSoportes = await cargarSoportesPropietario\(gastosBase\);/g,
    'const gastosConSoportes = await cargarSoportesPropietario(gastosBase, s, p);',
    'la invocación del método',
  );

  // Retirar exclusivamente las definiciones sustituidas por la API; los demás módulos permanecen intactos.
  texto = reemplazoUnico(texto, /^type DocumentoGastoPropietario = \{[\s\S]*?^\};\n(?:\n)?/gm, '', 'el tipo DocumentoGastoPropietario');
  texto = reemplazoUnico(texto, /^const BUCKET_DOCUMENTOS = "gastos-documentos";\n/gm, '', 'BUCKET_DOCUMENTOS');
  texto = reemplazoUnico(texto, /^const TIPOS_RECIBO = \[[\s\S]*?^\];\n/gm, '', 'TIPOS_RECIBO');
  texto = reemplazoUnico(texto, /^const TIPOS_SOPORTE_PROPIETARIO = \[[\s\S]*?^\];\n(?:\n)?/gm, '', 'TIPOS_SOPORTE_PROPIETARIO');
  texto = reemplazoUnico(
    texto,
    /^async function resolverUrlDocumento\(ruta\?: string \| null\) \{[\s\S]*?^\}\n(?:\n)?/gm,
    '',
    'resolverUrlDocumento',
  );

  verificar(!texto.includes('from("gastos_documentos")'), 'El acceso directo a gastos_documentos no fue eliminado.');
  verificar(!/createSignedUrl\s*\(/.test(texto), 'La generación de enlaces sigue ocurriendo en el navegador.');
  verificar(texto.includes('cargarSoportesPropietario(gastosBase, s, p)') && texto.includes('propietario_token'),
    'No se reconocen todas las modificaciones esperadas.');
  verificar(texto !== original.replace(/\r\n/g, '\n'), 'No hubo cambios.');

  // Verificación de sintaxis TSX cuando TypeScript está instalado en el proyecto.
  let typescript = null;
  try { typescript = require(require.resolve('typescript', { paths: [raiz] })); } catch { /* opcional */ }
  if (typescript) {
    const fuente = typescript.createSourceFile('page.tsx', texto, typescript.ScriptTarget.Latest, true, typescript.ScriptKind.TSX);
    const errores = fuente.parseDiagnostics;
    verificar(errores.length === 0,
      'La sintaxis TSX presenta errores: ' + errores.map(e => typescript.flattenDiagnosticMessageText(e.messageText, ' ')).join('; '));
  }

  // Copia de seguridad fuera del repositorio para evitar que git add . la incluya.
  const hash = crypto.createHash('sha256').update(original).digest('hex').slice(0, 12);
  const carpetaBackup = fs.mkdtempSync(path.join(os.tmpdir(), 'vam-resumen-backup-'));
  const backup = path.join(carpetaBackup, `page-${hash}.tsx`);
  fs.writeFileSync(backup, original, { flag: 'wx' });
  const temporal = rutaPagina + '.vam-temporal';
  try {
    fs.writeFileSync(temporal, texto.replace(/\n/g, finLinea), { flag: 'wx' });
    fs.renameSync(temporal, rutaPagina);
  } catch (error) {
    try { if (fs.existsSync(temporal)) fs.unlinkSync(temporal); } catch { /* preservar error original */ }
    throw error;
  }

  console.log('OK: Confirmado, es app/movil/propietarios/resumen-financiero/page.tsx.');
  console.log('OK: Se conectó el método de soportes a /api/propietarios/soportes-gastos.');
  console.log('OK: Se retiró el acceso directo a gastos_documentos y las definiciones sin uso.');
  console.log(`COPIA DE SEGURIDAD: ${backup}`);
  console.log('PENDIENTE: ejecutar npm run build; probar en incógnito antes de git push.');
} catch (error) {
  console.error('ERROR:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
