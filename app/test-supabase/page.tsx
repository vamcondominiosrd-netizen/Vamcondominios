"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

export default function TestSupabasePage() {
  const [estado, setEstado] = useState("Probando conexión...");
  const [detalle, setDetalle] = useState("");

  useEffect(() => {
    async function probarConexion() {
      try {
        const { data, error } = await supabase
          .from("archivo_banco")
          .select("id, fecha_posteo, monto_transaccion, no_serial, descripcion")
          .limit(1);

        if (error) {
          setEstado("Error de conexión o permisos");
          setDetalle(error.message);
          console.error(error);
          return;
        }

        setEstado("Conexión correcta con Supabase");
        setDetalle(`Respuesta recibida. Registros encontrados: ${data?.length ?? 0}`);
      } catch (err: any) {
        setEstado("Error general al conectar");
        setDetalle(err?.message || String(err));
        console.error(err);
      }
    }

    probarConexion();
  }, []);

  return (
    <div style={{ padding: 30, fontFamily: "Arial" }}>
      <h1>Prueba de conexión Supabase</h1>
      <h2>{estado}</h2>
      <p>{detalle}</p>

      <hr />

      <p>
        Si aquí dice <strong>Conexión correcta con Supabase</strong>, entonces la conexión
        está funcionando y el problema puede estar en el guardado o en los datos del Excel.
      </p>
    </div>
  );
}