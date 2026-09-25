# Corrección del resumen financiero móvil de VAM

**Archivo correcto confirmado en GitHub:** `app/movil/propietarios/resumen-financiero/page.tsx`.

El paquete contiene la API segura, el método de sustitución y un script que corrige el archivo **real de su repositorio local**, respetando los demás componentes. No contiene un `page.tsx` genérico: evita sobrescribir con una versión incompleta el archivo actual del proyecto.

## Instrucciones

1. Descomprima la carpeta `vam_resumen_financiero_corregido` dentro de la carpeta raíz del repositorio VAM, junto a `package.json`.
2. La API que creó antes debe existir en `app/api/propietarios/soportes-gastos/route.ts`. Si falta, copie allí el `route.ts` incluido en este paquete; NO lo ponga en `app/movil/propietarios/recibos/[id]`.
3. Desde la raíz de VAM, ejecute en PowerShell:

   ```powershell
   node .\vam_resumen_financiero_corregido\corregir-resumen-financiero.js
   npm run build
   git diff -- app/movil/propietarios/resumen-financiero/page.tsx
   ```

4. Si `npm run build` finaliza sin errores, pruebe localmente en ventana privada con una sesión únicamente de propietario: julio 2026, gasto 125, 2 soportes. También pruebe token caducado y propiedad no autorizada para comprobar que no se exponen documentos.
5. **Solo después** de validar y revisar el diff, haga el commit y despliegue habitual en Vercel.

El script crea copia de seguridad en la carpeta temporal del sistema operativo y se niega a editar si la versión del archivo o la API no coinciden. No ejecuta SQL, no modifica RLS, no hace commit ni publica.
