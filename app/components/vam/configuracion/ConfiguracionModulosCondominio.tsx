"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Home,
  LockKeyhole,
  Megaphone,
  Package,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";
import PageContainer from "@/components/vam/enterprise/PageContainer";
import PageHeader from "@/components/vam/enterprise/PageHeader";
import SectionCard from "@/components/vam/enterprise/SectionCard";

type ModuloCondominio = {
  modulo_id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  ruta_base: string | null;
  icono: string | null;
  orden: number;
  obligatorio: boolean;
  habilitado: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  observacion: string | null;
  editable: boolean;
};

const ICONOS: Record<string, any> = {
  dashboard: Home,
  residencial: Building2,
  finanzas: WalletCards,
  operaciones: Megaphone,
  inventario: Package,
  recursos_humanos: Users,
  nomina: WalletCards,
  contabilidad: Calculator,
  proyectos: ClipboardList,
  reportes: BarChart3,
  portal_movil: Smartphone,
  seguridad: ShieldCheck,
  configuracion: Settings,
};

const NOMBRES_CATEGORIA: Record<string, string> = {
  GENERAL: "General",
  ADMINISTRACION: "Administración residencial",
  FINANZAS: "Finanzas",
  OPERACIONES: "Operaciones",
  CAPITAL_HUMANO: "Capital humano",
  CONTABILIDAD: "Contabilidad",
  ANALITICA: "Análisis y reportes",
  PORTALES: "Portales",
  CONFIGURACION: "Configuración y seguridad",
};

function textoFecha(valor: string | null) {
  if (!valor) return "—";

  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${valor}T00:00:00`));
}

export default function ConfiguracionModulosCondominioPage() {
  const searchParams = useSearchParams();
  const condominioQuery = searchParams.get("condominio_id") || "";

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [modulos, setModulos] = useState<ModuloCondominio[]>([]);
  const [buscar, setBuscar] = useState("");
  const [loading, setLoading] = useState(true);
  const [procesandoCodigo, setProcesandoCodigo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<"ok" | "error" | "info">(
    "info"
  );

  const cargar = useCallback(async () => {
    setLoading(true);
    setMensaje("");

    try {
      const id =
        condominioQuery || localStorage.getItem("condominio_id") || "";

      if (!id || !Number(id)) {
        throw new Error(
          "No se encontró el condominio. Abra esta pantalla desde el Full Administrador o desde la configuración del condominio."
        );
      }

      setCondominioId(id);

      const { data: condominio, error: condominioError } = await supabase
        .from("condominios")
        .select("id, nombre")
        .eq("id", Number(id))
        .maybeSingle();

      if (condominioError) {
        throw new Error(
          `No fue posible cargar el condominio: ${condominioError.message}`
        );
      }

      setCondominioNombre(
        condominio?.nombre ||
          localStorage.getItem("condominio_nombre") ||
          `Condominio ${id}`
      );

      const { data, error } = await supabase.rpc(
        "listar_modulos_condominio",
        {
          p_condominio_id: Number(id),
        }
      );

      if (error) {
        throw new Error(`No fue posible cargar los módulos: ${error.message}`);
      }

      setModulos((data || []) as ModuloCondominio[]);
    } catch (error) {
      setTipoMensaje("error");
      setMensaje(
        error instanceof Error
          ? error.message
          : "No fue posible cargar la configuración de módulos."
      );
    } finally {
      setLoading(false);
    }
  }, [condominioQuery]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const editable = modulos.some((modulo) => modulo.editable);
  const habilitados = modulos.filter((modulo) => modulo.habilitado).length;
  const obligatorios = modulos.filter((modulo) => modulo.obligatorio).length;

  const modulosFiltrados = useMemo(() => {
    const termino = buscar.trim().toLowerCase();

    if (!termino) return modulos;

    return modulos.filter((modulo) =>
      [modulo.nombre, modulo.descripcion, modulo.categoria, modulo.codigo]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termino))
    );
  }, [buscar, modulos]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, ModuloCondominio[]>();

    modulosFiltrados.forEach((modulo) => {
      const categoria = modulo.categoria || "GENERAL";
      const existentes = mapa.get(categoria) || [];
      existentes.push(modulo);
      mapa.set(categoria, existentes);
    });

    return Array.from(mapa.entries());
  }, [modulosFiltrados]);

  async function cambiarEstado(modulo: ModuloCondominio) {
    if (!editable) return;

    if (modulo.obligatorio && modulo.habilitado) {
      setTipoMensaje("info");
      setMensaje("Este módulo es obligatorio y no puede deshabilitarse.");
      return;
    }

    const nuevoEstado = !modulo.habilitado;
    const confirmar = window.confirm(
      `¿Desea ${nuevoEstado ? "habilitar" : "deshabilitar"} el módulo ${modulo.nombre} para ${condominioNombre}?`
    );

    if (!confirmar) return;

    setProcesandoCodigo(modulo.codigo);
    setMensaje("");

    try {
      const observacion = nuevoEstado
        ? "Módulo habilitado desde la configuración SaaS."
        : "Módulo deshabilitado desde la configuración SaaS.";

      const { data, error } = await supabase.rpc(
        "actualizar_modulo_condominio",
        {
          p_condominio_id: Number(condominioId),
          p_modulo_codigo: modulo.codigo,
          p_habilitado: nuevoEstado,
          p_observacion: observacion,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      const resultado = data as { ok?: boolean; mensaje?: string } | null;

      if (!resultado?.ok) {
        throw new Error(
          resultado?.mensaje || "No fue posible actualizar el módulo."
        );
      }

      setModulos((actuales) =>
        actuales.map((item) =>
          item.codigo === modulo.codigo
            ? {
                ...item,
                habilitado: nuevoEstado,
                fecha_inicio: nuevoEstado
                  ? item.fecha_inicio || new Date().toISOString().slice(0, 10)
                  : item.fecha_inicio,
                fecha_fin: nuevoEstado
                  ? null
                  : new Date().toISOString().slice(0, 10),
                observacion,
              }
            : item
        )
      );

      setTipoMensaje("ok");
      setMensaje(
        resultado.mensaje ||
          `Módulo ${nuevoEstado ? "habilitado" : "deshabilitado"}.`
      );
    } catch (error) {
      setTipoMensaje("error");
      setMensaje(
        error instanceof Error
          ? error.message
          : "No fue posible actualizar el módulo."
      );
    } finally {
      setProcesandoCodigo("");
    }
  }

  const accionActualizar = (
    <button
      type="button"
      onClick={() => void cargar()}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
    >
      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      Actualizar
    </button>
  );

  const buscador = (
    <div className="flex h-11 w-full items-center rounded-xl border border-slate-300 bg-white px-3 md:w-80">
      <Search className="h-4 w-4 text-slate-400" />
      <input
        value={buscar}
        onChange={(event) => setBuscar(event.target.value)}
        placeholder="Buscar módulo..."
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
      />
    </div>
  );

  return (
    <PageContainer>
      <PageHeader
        title="Módulos del Condominio"
        subtitle={`${condominioNombre || "Cargando condominio..."}. Consulte las áreas de VAM disponibles según el servicio contratado.`}
        badge="Configuración"
        icon={Package}
        action={accionActualizar}
      />

      {mensaje && (
        <div
          className={`rounded-2xl border p-4 text-sm font-semibold ${
            tipoMensaje === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : tipoMensaje === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ResumenBox
          label="Módulos disponibles"
          value={modulos.length}
          detail="Catálogo activo de VAM"
          icon={Settings}
          tone="blue"
        />
        <ResumenBox
          label="Módulos habilitados"
          value={habilitados}
          detail="Visibles para este condominio"
          icon={CheckCircle2}
          tone="green"
        />
        <ResumenBox
          label="Módulos obligatorios"
          value={obligatorios}
          detail="No pueden deshabilitarse"
          icon={LockKeyhole}
          tone="amber"
        />
      </div>

      <SectionCard
        title="Catálogo contratado"
        subtitle={
          editable
            ? "Como Full Administrador puede habilitar o deshabilitar módulos no obligatorios."
            : "El representante puede consultar los módulos habilitados; solamente VAM puede modificar el plan contratado."
        }
        action={buscador}
      >
        {!editable && !loading && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-black">Vista informativa</p>
              <p className="mt-1 text-sm leading-5">
                Para solicitar un módulo adicional, el representante debe
                contactar al Full Administrador de VAM.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center text-sm font-bold text-slate-500">
            Cargando módulos del condominio...
          </div>
        ) : grupos.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center text-sm font-bold text-slate-500">
            No se encontraron módulos con el criterio indicado.
          </div>
        ) : (
          <div className="space-y-5">
            {grupos.map(([categoria, elementos]) => (
              <div
                key={categoria}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <h2 className="font-black text-slate-900">
                    {NOMBRES_CATEGORIA[categoria] || categoria}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {elementos.length} módulo(s)
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
                  {elementos.map((modulo) => (
                    <TarjetaModulo
                      key={modulo.codigo}
                      modulo={modulo}
                      editable={editable}
                      procesando={procesandoCodigo === modulo.codigo}
                      onToggle={() => void cambiarEstado(modulo)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function ResumenBox({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: any;
  tone: "blue" | "green" | "amber";
}) {
  const estilos = {
    blue: {
      box: "border-blue-100 bg-blue-50/40",
      icon: "bg-blue-100 text-blue-700",
      value: "text-blue-900",
    },
    green: {
      box: "border-emerald-100 bg-emerald-50/40",
      icon: "bg-emerald-100 text-emerald-700",
      value: "text-emerald-900",
    },
    amber: {
      box: "border-amber-100 bg-amber-50/40",
      icon: "bg-amber-100 text-amber-700",
      value: "text-amber-900",
    },
  };

  const style = estilos[tone];

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${style.box}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-600">{label}</p>
          <p className={`mt-1 text-3xl font-black ${style.value}`}>{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${style.icon}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function TarjetaModulo({
  modulo,
  editable,
  procesando,
  onToggle,
}: {
  modulo: ModuloCondominio;
  editable: boolean;
  procesando: boolean;
  onToggle: () => void;
}) {
  const Icono = ICONOS[modulo.codigo] || Settings;

  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        modulo.habilitado
          ? "border-emerald-200 bg-emerald-50/40"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            modulo.habilitado
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-500"
          }`}
        >
          <Icono className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-slate-900">{modulo.nombre}</h3>

                {modulo.obligatorio && (
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase text-blue-700">
                    Obligatorio
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs font-semibold text-slate-400">
                {modulo.codigo}
              </p>
            </div>

            <button
              type="button"
              onClick={onToggle}
              disabled={
                !editable ||
                procesando ||
                (modulo.obligatorio && modulo.habilitado)
              }
              aria-label={`${modulo.habilitado ? "Deshabilitar" : "Habilitar"} ${modulo.nombre}`}
              className={`relative h-7 w-12 rounded-full transition ${
                modulo.habilitado ? "bg-emerald-600" : "bg-slate-300"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                  modulo.habilitado ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {modulo.descripcion || "Sin descripción."}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-white/80 p-3">
              <p className="font-bold text-slate-400">Estado</p>
              <p
                className={`mt-1 font-black ${
                  modulo.habilitado ? "text-emerald-700" : "text-slate-500"
                }`}
              >
                {procesando
                  ? "Actualizando..."
                  : modulo.habilitado
                    ? "Habilitado"
                    : "Deshabilitado"}
              </p>
            </div>

            <div className="rounded-xl bg-white/80 p-3">
              <p className="font-bold text-slate-400">Fecha de inicio</p>
              <p className="mt-1 font-black text-slate-700">
                {textoFecha(modulo.fecha_inicio)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
