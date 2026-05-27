"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Condominio = { id: number; nombre: string };

export default function CondominioSelector() {
  const [condos, setCondos] = useState<Condominio[]>([]);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    // cargar selección guardada
    const saved = localStorage.getItem("condominio_id");
    if (saved) setSelected(saved);

    // cargar condominios dinámicamente
    (async () => {
      const { data, error } = await supabase
        .from("condominios")
        .select("id, nombre")
        .order("nombre", { ascending: true });

      if (!error && data) setCondos(data as Condominio[]);
    })();
  }, []);

  function onChange(v: string) {
    setSelected(v);
    if (!v) localStorage.removeItem("condominio_id");
    else localStorage.setItem("condominio_id", v);

    // refresca la página actual para aplicar filtros
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-300">Condominio:</span>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white outline-none"
      >
        <option value="">(Todos)</option>
        {condos.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
