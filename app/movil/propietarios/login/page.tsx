"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type Condominio = {
  id: number;
  nombre: string;
  logo_url?: string | null;
};

type Unidad = {
  id: number;
  codigo: string;
};

type PropietarioApartamento = {
  id: number;
  nombre_propietario: string | null;
  cedula: string | null;
  telefono: string | null;
  correo: string | null;
  no_apartamento: string | null;
};

function limpiarCedula(valor: string) {
  return String(valor || "").replace(/\D/g, "");
}

export default function LoginPropietariosPage() {
  const router = useRouter();

  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [condominioLogoUrl, setCondominioLogoUrl] = useState("");

  const [unidadId, setUnidadId] = useState("");
  const [cedula, setCedula] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [cargandoCondominios, setCargandoCondominios] = useState(true);
  const [cargandoUnidades, setCargandoUnidades] = useState(false);

  useEffect(() => {
    void cargarCondominios();
  }, []);

  async function cargarCondominios() {
    setCargandoCondominios(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("condominios")
      .select("id, nombre, logo_url")
      .order("nombre");

    setCargandoCondominios(false);

    if (error) {
      setMensaje(error.message);
      return;
    }

    setCondominios(data || []);
  }

  async function seleccionarCondominio(id: string) {
    setCondominioId(id);
    setUnidadId("");
    setUnidades([]);
    setMensaje("");

    const seleccionado = condominios.find(
      (condominio) => String(condominio.id) === id
    );

    setCondominioNombre(seleccionado?.nombre || "");
    setCondominioLogoUrl(seleccionado?.logo_url || "");

    if (!id) return;

    setCargandoUnidades(true);

    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo");

    setCargandoUnidades(false);

    if (error) {
      setMensaje(error.message);
      return;
    }

    setUnidades(data || []);
  }

  function limpiarSesion() {
    localStorage.removeItem("propietario_actual");
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
  }

  async function entrar(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!condominioId || !unidadId || !cedula.trim()) {
      setMensaje("Debe completar condominio, apartamento y cédula.");
      return;
    }

    setLoading(true);
    setMensaje("");

    const unidadCodigo =
      unidades.find((unidad) => String(unidad.id) === unidadId)?.codigo || "";

    const cedulaLimpia = limpiarCedula(cedula);

    const { data, error } = await supabase
      .from("propietarios_apartamentos")
      .select(`
        id,
        nombre_propietario,
        cedula,
        telefono,
        correo,
        no_apartamento
      `)
      .eq("condominio_id", Number(condominioId))
      .eq("no_apartamento", unidadCodigo);

    setLoading(false);

    if (error) {
      setMensaje(error.message);
      return;
    }

    const propietario = ((data || []) as PropietarioApartamento[]).find(
      (registro) => limpiarCedula(registro.cedula || "") === cedulaLimpia
    );

    if (!propietario) {
      setMensaje("La cédula no coincide con el apartamento seleccionado.");
      return;
    }

    limpiarSesion();

    const sesionPropietario = {
      propietario_id: propietario.id,
      condominio_id: Number(condominioId),
      condominio_nombre: condominioNombre,
      condominio_logo_url: condominioLogoUrl,
      unidad_id: Number(unidadId),
      no_apartamento: unidadCodigo,
      nombre_propietario: propietario.nombre_propietario,
      cedula: propietario.cedula,
      telefono: propietario.telefono,
      correo: propietario.correo,
    };

    localStorage.setItem(
      "propietario_actual",
      JSON.stringify(sesionPropietario)
    );
    localStorage.setItem("condominio_id", String(condominioId));
    localStorage.setItem("condominio_nombre", condominioNombre);
    localStorage.setItem("condominio_logo_url", condominioLogoUrl);

    router.push("/movil/propietarios/dashboard");
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 px-3 py-3 sm:px-4 sm:py-5">
      <div className="mx-auto flex min-h-[calc(100dvh-24px)] w-full max-w-sm items-center justify-center">
        <section className="w-full overflow-hidden rounded-[1.6rem] bg-white shadow-2xl shadow-black/30">
          <div className="bg-gradient-to-r from-blue-800 to-blue-950 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              {condominioLogoUrl ? (
                <img
                  src={condominioLogoUrl}
                  alt={condominioNombre || "Logo del condominio"}
                  className="h-12 w-12 rounded-xl bg-white object-contain p-1.5"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-base font-black text-blue-900">
                  VAM
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-base font-extrabold">
                  VAM Propietarios
                </p>
                <p className="text-xs text-blue-100">
                  Acceso móvil al condominio
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 sm:px-5">
            <div className="mb-4">
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                Iniciar sesión
              </h1>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Seleccione su condominio, unidad y escriba su cédula.
              </p>
            </div>

            <form onSubmit={entrar} className="space-y-3">
              <div>
                <label
                  htmlFor="condominio"
                  className="mb-1 block text-xs font-bold text-slate-700"
                >
                  Condominio
                </label>
                <select
                  id="condominio"
                  value={condominioId}
                  onChange={(event) =>
                    void seleccionarCondominio(event.target.value)
                  }
                  disabled={cargandoCondominios || loading}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  <option value="">
                    {cargandoCondominios
                      ? "Cargando..."
                      : "Seleccione condominio"}
                  </option>

                  {condominios.map((condominio) => (
                    <option key={condominio.id} value={condominio.id}>
                      {condominio.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="unidad"
                  className="mb-1 block text-xs font-bold text-slate-700"
                >
                  Apartamento / Unidad
                </label>
                <select
                  id="unidad"
                  value={unidadId}
                  onChange={(event) => setUnidadId(event.target.value)}
                  disabled={!condominioId || cargandoUnidades || loading}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  <option value="">
                    {cargandoUnidades
                      ? "Cargando..."
                      : !condominioId
                        ? "Seleccione primero el condominio"
                        : "Seleccione unidad"}
                  </option>

                  {unidades.map((unidad) => (
                    <option key={unidad.id} value={unidad.id}>
                      {unidad.codigo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="cedula"
                  className="mb-1 block text-xs font-bold text-slate-700"
                >
                  Cédula del propietario
                </label>
                <input
                  id="cedula"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={cedula}
                  onChange={(event) => setCedula(event.target.value)}
                  placeholder="Digite su cédula"
                  disabled={loading}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </div>

              {mensaje && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700"
                >
                  {mensaje}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex h-11 w-full items-center justify-center rounded-xl bg-blue-800 px-4 text-sm font-extrabold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Validando..." : "Entrar"}
              </button>
            </form>

            <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-center text-[11px] leading-4 text-slate-500">
              Consulta estado de cuenta, pagos, recibos e incidencias.
            </div>

            <p className="mt-3 text-center text-[10px] text-slate-400">
              VAM Administración de Condominios
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
