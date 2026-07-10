"use client";

import { useEffect, useState } from "react";

export interface CondominioActivo {
  condominioId: number;
  condominioNombre: string;
  usuarioId?: string;
  usuarioNombre?: string;
}

export default function useCondominioActivo() {
  const [condominio, setCondominio] = useState<CondominioActivo>({
    condominioId: 0,
    condominioNombre: "",
    usuarioId: "",
    usuarioNombre: "",
  });

  useEffect(() => {
    const condominioId = Number(
      localStorage.getItem("condominio_id") ||
      localStorage.getItem("condominioId") ||
      0
    );

    const condominioNombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominioNombre") ||
      localStorage.getItem("condominio") ||
      "";

    const usuarioId =
      localStorage.getItem("usuario_id") ||
      localStorage.getItem("user_id") ||
      "";

    const usuarioNombre =
      localStorage.getItem("usuario_nombre") ||
      localStorage.getItem("user_name") ||
      "";

    setCondominio({
      condominioId,
      condominioNombre,
      usuarioId,
      usuarioNombre,
    });
  }, []);

  return condominio;
}