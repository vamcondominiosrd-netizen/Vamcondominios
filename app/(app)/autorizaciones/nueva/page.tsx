"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

type Catalogo = {
  id: number;
  nombre: string;
};

export default function NuevaAutorizacionPage() {
  const [tiposSolicitud, setTiposSolicitud] = useState<Catalogo[]>([]);
  const [tiposTrabajo, setTiposTrabajo] = useState<Catalogo[]>([]);
  const [tiposServicio, setTiposServicio] = useState<Catalogo[]>([]);
  const [tiposVisitantes, setTiposVisitantes] = useState<Catalogo[]>([]);
  const [areasAcceso, setAreasAcceso] = useState<Catalogo[]>([]);

  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    condominio_id: "",
    condominio: "",
    propietario: "",
    unidad: "",
    tipo_solicitud_id: "",
    tipo_solicitud: "",
    tipo_trabajo_id: "",
    tipo_trabajo: "",
    tipo_servicio_id: "",
    tipo_servicio: "",
    tipo_visitante_id: "",
    tipo_visitante: "",
    area_acceso_id: "",
    area_acceso: "",
    fecha_programada: "",
    hora_entrada: "",
    hora_salida_estimada: "",
    nombre_visitante: "",
    cedula_visitante: "",
    telefono_visitante: "",
    empresa: "",
    vehiculo_marca: "",
    vehiculo_modelo: "",
    vehiculo_color: "",
    vehiculo_placa: "",
    cantidad_personas: "1",
    articulos_entran: "",
    articulos_salen: "",
    descripcion: "",
  });

  function cambiarCampo(campo: string, valor: string) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  async function cargarCatalogos() {
    const [
      solicitudRes,
      trabajoRes,
      servicioRes,
      visitanteRes,
      areasRes,
    ] = await Promise.all([
      supabase
        .from("autorizaciones_tipos_solicitud")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("autorizaciones_tipos_trabajo")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("autorizaciones_tipos_servicio")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("autorizaciones_tipos_visitantes")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("autorizaciones_areas_acceso")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre"),
    ]);

    if (solicitudRes.data) setTiposSolicitud(solicitudRes.data);
    if (trabajoRes.data) setTiposTrabajo(trabajoRes.data);
    if (servicioRes.data) setTiposServicio(servicioRes.data);
    if (visitanteRes.data) setTiposVisitantes(visitanteRes.data);
    if (areasRes.data) setAreasAcceso(areasRes.data);
  }

  function seleccionarCatalogo(
    campoId: string,
    campoNombre: string,
    valor: string,
    lista: Catalogo[]
  ) {
    const item = lista.find((x) => String(x.id) === valor);

    setForm((prev) => ({
      ...prev,
      [campoId]: valor,
      [campoNombre]: item?.nombre || "",
    }));
  }

  function generarCodigo() {
    const fecha = new Date();
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, "0");
    const d = String(fecha.getDate()).padStart(2, "0");
    const random = Math.floor(100000 + Math.random() * 900000);

    return `ACC-${y}${m}${d}-${random}`;
  }

  async function guardarSolicitud(e: React.FormEvent) {
    e.preventDefault();

    if (!form.condominio_id || !form.fecha_programada || !form.tipo_solicitud_id) {
      alert("Debe completar condominio, tipo de solicitud y fecha programada.");
      return;
    }

    setGuardando(true);

    const codigo = generarCodigo();

    const { error } = await supabase.from("autorizaciones").insert({
      condominio_id: Number(form.condominio_id),
      condominio: form.condominio || null,

      codigo_autorizacion: codigo,

      propietario: form.propietario || null,
      unidad: form.unidad || null,

      tipo_solicitud_id: Number(form.tipo_solicitud_id),
      tipo_solicitud: form.tipo_solicitud || null,

      tipo_trabajo_id: form.tipo_trabajo_id
        ? Number(form.tipo_trabajo_id)
        : null,
      tipo_trabajo: form.tipo_trabajo || null,

      tipo_servicio_id: form.tipo_servicio_id
        ? Number(form.tipo_servicio_id)
        : null,
      tipo_servicio: form.tipo_servicio || null,

      tipo_visitante_id: form.tipo_visitante_id
        ? Number(form.tipo_visitante_id)
        : null,
      tipo_visitante: form.tipo_visitante || null,

      area_acceso_id: form.area_acceso_id
        ? Number(form.area_acceso_id)
        : null,
      area_acceso: form.area_acceso || null,

      fecha_programada: form.fecha_programada,
      hora_entrada: form.hora_entrada || null,
      hora_salida_estimada: form.hora_salida_estimada || null,

      nombre_visitante: form.nombre_visitante || null,
      cedula_visitante: form.cedula_visitante || null,
      telefono_visitante: form.telefono_visitante || null,

      empresa: form.empresa || null,

      vehiculo_marca: form.vehiculo_marca || null,
      vehiculo_modelo: form.vehiculo_modelo || null,
      vehiculo_color: form.vehiculo_color || null,
      vehiculo_placa: form.vehiculo_placa || null,

      cantidad_personas: Number(form.cantidad_personas || 1),

      articulos_entran: form.articulos_entran || null,
      articulos_salen: form.articulos_salen || null,
      descripcion: form.descripcion || null,

      estado: "Pendiente",
      estado_financiero: "Pendiente de validar",
      qr_code: codigo,
    });

    setGuardando(false);

    if (error) {
      console.error("Error guardando autorización:", error);
      alert("Error guardando la solicitud. Verifique las columnas de la tabla.");
      return;
    }

    alert(`Solicitud creada correctamente. Código: ${codigo}`);
    window.location.href = "/autorizaciones/pendientes";
  }

  useEffect(() => {
    cargarCatalogos();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div>
          <Link
            href="/autorizaciones"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al módulo
          </Link>

          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            Nueva Solicitud
          </h1>
          <p className="text-sm text-slate-500">
            Registra permisos de trabajo, mudanzas, servicios, entregas o retiros.
          </p>
        </div>

        <form onSubmit={guardarSolicitud} className="space-y-5">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              Datos del Condominio y Unidad
            </h2>

            <div className="grid gap-4 md:grid-cols-4">
              <Input
                label="Condominio ID"
                value={form.condominio_id}
                onChange={(v) => cambiarCampo("condominio_id", v)}
                placeholder="Ej: 1, 2, 15"
              />
              <Input
                label="Condominio"
                value={form.condominio}
                onChange={(v) => cambiarCampo("condominio", v)}
                placeholder="Ej: Lote 9"
              />
              <Input
                label="Propietario"
                value={form.propietario}
                onChange={(v) => cambiarCampo("propietario", v)}
                placeholder="Nombre del propietario"
              />
              <Input
                label="Unidad"
                value={form.unidad}
                onChange={(v) => cambiarCampo("unidad", v)}
                placeholder="Ej: A1, B3"
              />
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              Datos de la Solicitud
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <Select
                label="Tipo de Solicitud"
                value={form.tipo_solicitud_id}
                onChange={(v) =>
                  seleccionarCatalogo(
                    "tipo_solicitud_id",
                    "tipo_solicitud",
                    v,
                    tiposSolicitud
                  )
                }
                options={tiposSolicitud}
              />

              <Select
                label="Tipo de Trabajo"
                value={form.tipo_trabajo_id}
                onChange={(v) =>
                  seleccionarCatalogo(
                    "tipo_trabajo_id",
                    "tipo_trabajo",
                    v,
                    tiposTrabajo
                  )
                }
                options={tiposTrabajo}
              />

              <Select
                label="Tipo de Servicio"
                value={form.tipo_servicio_id}
                onChange={(v) =>
                  seleccionarCatalogo(
                    "tipo_servicio_id",
                    "tipo_servicio",
                    v,
                    tiposServicio
                  )
                }
                options={tiposServicio}
              />

              <Select
                label="Tipo de Visitante"
                value={form.tipo_visitante_id}
                onChange={(v) =>
                  seleccionarCatalogo(
                    "tipo_visitante_id",
                    "tipo_visitante",
                    v,
                    tiposVisitantes
                  )
                }
                options={tiposVisitantes}
              />

              <Select
                label="Área de Acceso"
                value={form.area_acceso_id}
                onChange={(v) =>
                  seleccionarCatalogo(
                    "area_acceso_id",
                    "area_acceso",
                    v,
                    areasAcceso
                  )
                }
                options={areasAcceso}
              />

              <Input
                label="Cantidad de Personas"
                value={form.cantidad_personas}
                onChange={(v) => cambiarCampo("cantidad_personas", v)}
                placeholder="1"
              />
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              Fecha y Horario
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Fecha Programada"
                type="date"
                value={form.fecha_programada}
                onChange={(v) => cambiarCampo("fecha_programada", v)}
              />
              <Input
                label="Hora Entrada"
                type="time"
                value={form.hora_entrada}
                onChange={(v) => cambiarCampo("hora_entrada", v)}
              />
              <Input
                label="Hora Salida Estimada"
                type="time"
                value={form.hora_salida_estimada}
                onChange={(v) => cambiarCampo("hora_salida_estimada", v)}
              />
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              Persona Autorizada
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Nombre"
                value={form.nombre_visitante}
                onChange={(v) => cambiarCampo("nombre_visitante", v)}
                placeholder="Nombre completo"
              />
              <Input
                label="Cédula"
                value={form.cedula_visitante}
                onChange={(v) => cambiarCampo("cedula_visitante", v)}
                placeholder="000-0000000-0"
              />
              <Input
                label="Teléfono"
                value={form.telefono_visitante}
                onChange={(v) => cambiarCampo("telefono_visitante", v)}
                placeholder="809-000-0000"
              />
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              Empresa y Vehículo
            </h2>

            <div className="grid gap-4 md:grid-cols-4">
              <Input
                label="Empresa"
                value={form.empresa}
                onChange={(v) => cambiarCampo("empresa", v)}
                placeholder="Empresa o suplidor"
              />
              <Input
                label="Marca"
                value={form.vehiculo_marca}
                onChange={(v) => cambiarCampo("vehiculo_marca", v)}
                placeholder="Ej: Hyundai"
              />
              <Input
                label="Modelo"
                value={form.vehiculo_modelo}
                onChange={(v) => cambiarCampo("vehiculo_modelo", v)}
                placeholder="Ej: Camión"
              />
              <Input
                label="Color"
                value={form.vehiculo_color}
                onChange={(v) => cambiarCampo("vehiculo_color", v)}
                placeholder="Color"
              />
              <Input
                label="Placa"
                value={form.vehiculo_placa}
                onChange={(v) => cambiarCampo("vehiculo_placa", v)}
                placeholder="Placa"
              />
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              Artículos y Observaciones
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <TextArea
                label="Artículos que entran"
                value={form.articulos_entran}
                onChange={(v) => cambiarCampo("articulos_entran", v)}
              />
              <TextArea
                label="Artículos que salen"
                value={form.articulos_salen}
                onChange={(v) => cambiarCampo("articulos_salen", v)}
              />
            </div>

            <div className="mt-4">
              <TextArea
                label="Descripción / Observación"
                value={form.descripcion}
                onChange={(v) => cambiarCampo("descripcion", v)}
              />
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-blue-800 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {guardando ? "Guardando..." : "Guardar Solicitud"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Catalogo[];
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500"
      >
        <option value="">Seleccione...</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
    </div>
  );
}