VAM - PRUEBA DE IMPRESIÓN DE CHEQUES
====================================

Contenido:
1) app/administracion/cheques/prueba/page.tsx
2) public/cheques/banco-popular-colinas-referencia.jpg

Instalación:
- Copiar la carpeta app/administracion/cheques/prueba dentro del proyecto VAM conservando la ruta.
- Copiar la imagen banco-popular-colinas-referencia.jpg dentro de public/cheques/.
- Abrir en el navegador: /administracion/cheques/prueba

Qué hace esta versión:
- Usa el cheque Banco Popular enviado como referencia visual de pantalla.
- La referencia NO se imprime al usar "Imprimir cheque".
- Imprime fecha, beneficiario, monto numérico y monto en letras.
- Permite calibración X/Y en milímetros por campo.
- Incluye Offset X/Y general para compensar diferencias de la impresora.
- Guarda automáticamente la calibración en localStorage del navegador.
- Permite descargar la configuración final en JSON.
- Incluye modo "Imprimir calibración" para probar primero en papel blanco.

IMPORTANTE PARA LA IMPRESIÓN:
- Configurar escala del navegador en 100% o Tamaño real.
- Desactivar encabezados y pies de página del navegador.
- No usar "Ajustar a página".
- El tamaño de referencia usado es 8 x 3 pulgadas (203.2 x 76.2 mm), estimado a partir del escaneo enviado.
- Antes de usar cheques reales, medir físicamente el cheque. Si la medida exacta difiere, ajustar CHEQUE_ANCHO_MM y CHEQUE_ALTO_MM en page.tsx.

Prueba recomendada:
1. Imprimir calibración en papel blanco.
2. Superponer la hoja sobre el cheque real.
3. Revisar contra luz.
4. Ajustar en pasos de 0.5 mm.
5. Cuando esté exacto, imprimir un cheque real de prueba.
