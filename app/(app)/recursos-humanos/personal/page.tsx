"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  HandCoins,
  IdCard,
  RefreshCw,
  Save,
  UploadCloud,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type CatalogoItem = {
  id: number;
  nombre: string;
  estado: string;
  condominio_id?: number | null;
};

type Empleado = {
  id: number;
  condominio_id: number;
  condominio: string | null;

  numero_empleado: string | null;
  nombre: string | null;
  cedula: string | null;
  numero_seguridad_social: string | null;
  sexo: string | null;
  fecha_nacimiento: string | null;
  edad: number | null;

  telefono: string | null;
  correo: string | null;
  direccion: string | null;

  cargo_id: number | null;
  departamento_id: number | null;
  tipo_contrato_id: number | null;

  cargo: string | null;
  departamento: string | null;
  tipo_contrato: string | null;

  fecha_ingreso: string | null;
  salario: number | null;

  estado: string | null;
  observacion: string | null;

  contrato_firmado_url?: string | null;
  fecha_contrato_firmado?: string | null;
  observacion_contrato?: string | null;

  created_at: string | null;
};

type ModuloRH = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: any;
  color: string;
  bg: string;
};

function numero(valor: string | number | null | undefined) {
  return Number(valor || 0);
}

function moneda(valor: string | number | null | undefined) {
  return numero(valor).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fecha(valor: string | null | undefined) {
  if (!valor) return "-";

  const limpio = String(valor).split("T")[0];
  const partes = limpio.split("-");

  if (partes.length !== 3) return limpio;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function estadoClass(estado: string | null | undefined) {
  if (estado === "Activo") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (estado === "Inactivo") {
    return "border-red-100 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function PersonalPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargos, setCargos] = useState<CatalogoItem[]>([]);
  const [departamentos, setDepartamentos] = useState<CatalogoItem[]>([]);
  const [contratos, setContratos] = useState<CatalogoItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [subiendoContratoId, setSubiendoContratoId] = useState<number | null>(
    null,
  );

  const [filtroEstado, setFiltroEstado] = useState("Todos");

  const [numeroEmpleado, setNumeroEmpleado] = useState("");
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [numeroSeguridadSocial, setNumeroSeguridadSocial] = useState("");
  const [sexo, setSexo] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [edad, setEdad] = useState(0);

  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");

  const [cargoId, setCargoId] = useState("");
  const [departamentoId, setDepartamentoId] = useState("");
  const [tipoContratoId, setTipoContratoId] = useState("");

  const [fechaIngreso, setFechaIngreso] = useState("");
  const [salario, setSalario] = useState("");
  const [estado, setEstado] = useState("Activo");
  const [observacion, setObservacion] = useState("");

  const modulos: ModuloRH[] = [
    {
      titulo: "Dashboard RH",
      descripcion: "Vista general del personal, nómina, vacaciones y prestaciones.",
      href: "/recursos-humanos/dashboard",
      icono: BriefcaseBusiness,
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      titulo: "Empleados",
      descripcion: "Registro, consulta y mantenimiento de empleados del condominio.",
      href: "/recursos-humanos/personal",
      icono: Users,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      titulo: "Nómina",
      descripcion: "Procesar nómina mensual, aprobar pagos y consultar historial.",
      href: "/recursos-humanos/nomina",
      icono: WalletCards,
      color: "text-purple-700",
      bg: "bg-purple-50",
    },
    {
      titulo: "Vacaciones",
      descripcion: "Solicitudes, permisos y balance anual de vacaciones.",
      href: "/recursos-humanos/vacaciones",
      icono: CalendarDays,
      color: "text-indigo-700",
      bg: "bg-indigo-50",
    },
    {
      titulo: "Prestaciones",
      descripcion: "Cálculo de liquidación y prestaciones laborales.",
      href: "/recursos-humanos/prestaciones",
      icono: HandCoins,
      color: "text-orange-700",
      bg: "bg-orange-50",
    },
    {
      titulo: "Reportes",
      descripcion: "Reportes de empleados, nómina, vacaciones y prestaciones.",
      href: "/recursos-humanos/nomina/reportes/nomina",
      icono: BarChart3,
      color: "text-sky-700",
      bg: "bg-sky-50",
    },
  ];

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombreCondominio =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombreCondominio);

    if (!id || !Number(id)) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    cargarTodo(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarTodo(id: string) {
    const condominioIdNumero = Number(id);

    if (!condominioIdNumero) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    setLoading(true);
    setMensaje("");

    const [empleadosResp, cargosResp, departamentosResp, contratosResp] =
      await Promise.all([
        supabase
          .from("empleados")
          .select("*")
          .eq("condominio_id", condominioIdNumero)
          .order("created_at", { ascending: false }),

        supabase
          .from("rh_cargos")
          .select("id, nombre, estado, condominio_id")
          .eq("condominio_id", condominioIdNumero)
          .eq("estado", "Activo")
          .order("nombre", { ascending: true }),

        supabase
          .from("rh_departamentos")
          .select("id, nombre, estado, condominio_id")
          .eq("condominio_id", condominioIdNumero)
          .eq("estado", "Activo")
          .order("nombre", { ascending: true }),

        supabase
          .from("rh_tipos_contrato")
          .select("id, nombre, estado, condominio_id")
          .eq("condominio_id", condominioIdNumero)
          .eq("estado", "Activo")
          .order("nombre", { ascending: true }),
      ]);

    setLoading(false);

    if (empleadosResp.error) {
      setMensaje("Error cargando empleados: " + empleadosResp.error.message);
      return;
    }

    if (cargosResp.error) {
      setMensaje("Error cargando cargos: " + cargosResp.error.message);
      return;
    }

    if (departamentosResp.error) {
      setMensaje(
        "Error cargando departamentos: " + departamentosResp.error.message,
      );
      return;
    }

    if (contratosResp.error) {
      setMensaje(
        "Error cargando tipos de contrato: " + contratosResp.error.message,
      );
      return;
    }

    setEmpleados(
      ((empleadosResp.data as Empleado[]) || []).filter(
        (e) => Number(e.condominio_id) === condominioIdNumero,
      ),
    );

    setCargos(
      ((cargosResp.data as CatalogoItem[]) || []).filter(
        (c) => Number(c.condominio_id) === condominioIdNumero,
      ),
    );

    setDepartamentos(
      ((departamentosResp.data as CatalogoItem[]) || []).filter(
        (d) => Number(d.condominio_id) === condominioIdNumero,
      ),
    );

    setContratos(
      ((contratosResp.data as CatalogoItem[]) || []).filter(
        (t) => Number(t.condominio_id) === condominioIdNumero,
      ),
    );
  }

  function calcularEdad(fechaValor: string) {
    if (!fechaValor) return 0;

    const hoy = new Date();
    const nacimiento = new Date(fechaValor);

    let edadCalculada = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edadCalculada--;
    }

    return edadCalculada;
  }

  function manejarFechaNacimiento(valor: string) {
    setFechaNacimiento(valor);
    setEdad(calcularEdad(valor));
  }

  function limpiarFormulario() {
    setEditandoId(null);

    setNumeroEmpleado("");
    setNombre("");
    setCedula("");
    setNumeroSeguridadSocial("");
    setSexo("");
    setFechaNacimiento("");
    setEdad(0);

    setTelefono("");
    setCorreo("");
    setDireccion("");

    setCargoId("");
    setDepartamentoId("");
    setTipoContratoId("");

    setFechaIngreso("");
    setSalario("");
    setEstado("Activo");
    setObservacion("");
  }

  function obtenerNombreCatalogo(lista: CatalogoItem[], id: string) {
    const item = lista.find((i) => String(i.id) === String(id));
    return item?.nombre || "";
  }

  function editarEmpleado(emp: Empleado) {
    setEditandoId(emp.id);

    setNumeroEmpleado(emp.numero_empleado || "");
    setNombre(emp.nombre || "");
    setCedula(emp.cedula || "");
    setNumeroSeguridadSocial(emp.numero_seguridad_social || "");
    setSexo(emp.sexo || "");
    setFechaNacimiento(emp.fecha_nacimiento || "");
    setEdad(Number(emp.edad || calcularEdad(emp.fecha_nacimiento || "")));

    setTelefono(emp.telefono || "");
    setCorreo(emp.correo || "");
    setDireccion(emp.direccion || "");

    setCargoId(emp.cargo_id ? String(emp.cargo_id) : "");
    setDepartamentoId(emp.departamento_id ? String(emp.departamento_id) : "");
    setTipoContratoId(emp.tipo_contrato_id ? String(emp.tipo_contrato_id) : "");

    setFechaIngreso(emp.fecha_ingreso || "");
    setSalario(String(emp.salario || ""));
    setEstado(emp.estado || "Activo");
    setObservacion(emp.observacion || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarEmpleado(e: React.FormEvent) {
    e.preventDefault();

    const condominioIdNumero = Number(condominioId);

    if (!condominioIdNumero || !condominioNombre) {
      setMensaje(
        "No se encontró el condominio activo. Debe iniciar sesión nuevamente.",
      );
      return;
    }

    if (!numeroEmpleado.trim()) {
      setMensaje("Debe indicar el número de empleado.");
      return;
    }

    if (!nombre.trim()) {
      setMensaje("Debe indicar el nombre del empleado.");
      return;
    }

    if (!cedula.trim()) {
      setMensaje("Debe indicar la cédula del empleado.");
      return;
    }

    if (!sexo) {
      setMensaje("Debe seleccionar el sexo.");
      return;
    }

    if (!fechaNacimiento) {
      setMensaje("Debe indicar la fecha de nacimiento.");
      return;
    }

    const edadCalculada = calcularEdad(fechaNacimiento);

    if (edadCalculada < 18) {
      setMensaje("No se puede registrar un empleado menor de edad.");
      return;
    }

    if (!cargoId) {
      setMensaje("Debe seleccionar el cargo o puesto.");
      return;
    }

    if (!departamentoId) {
      setMensaje("Debe seleccionar el departamento.");
      return;
    }

    if (!tipoContratoId) {
      setMensaje("Debe seleccionar el tipo de contrato.");
      return;
    }

    if (!fechaIngreso) {
      setMensaje("Debe indicar la fecha de ingreso.");
      return;
    }

    const cargoNombre = obtenerNombreCatalogo(cargos, cargoId);
    const departamentoNombre = obtenerNombreCatalogo(
      departamentos,
      departamentoId,
    );
    const contratoNombre = obtenerNombreCatalogo(contratos, tipoContratoId);

    const registro = {
      condominio_id: condominioIdNumero,
      condominio: condominioNombre,

      numero_empleado: numeroEmpleado.trim(),
      nombre: nombre.trim(),
      cedula: cedula.trim(),
      numero_seguridad_social: numeroSeguridadSocial.trim(),
      sexo,
      fecha_nacimiento: fechaNacimiento,
      edad: edadCalculada,

      telefono: telefono.trim(),
      correo: correo.trim(),
      direccion: direccion.trim(),

      cargo_id: Number(cargoId),
      departamento_id: Number(departamentoId),
      tipo_contrato_id: Number(tipoContratoId),

      cargo: cargoNombre,
      departamento: departamentoNombre,
      tipo_contrato: contratoNombre,

      fecha_ingreso: fechaIngreso,
      salario: Number(salario || 0),

      estado,
      observacion: observacion.trim(),
    };

    setGuardando(true);
    setMensaje("");

    if (editandoId) {
      const { error } = await supabase
        .from("empleados")
        .update(registro)
        .eq("id", editandoId)
        .eq("condominio_id", condominioIdNumero);

      setGuardando(false);

      if (error) {
        setMensaje("Error modificando empleado: " + error.message);
        return;
      }

      setMensaje("Empleado modificado correctamente.");
      limpiarFormulario();
      cargarTodo(condominioId);
      return;
    }

    const { error } = await supabase.from("empleados").insert([registro]);

    setGuardando(false);

    if (error) {
      setMensaje("Error guardando empleado: " + error.message);
      return;
    }

    setMensaje("Empleado registrado correctamente.");
    limpiarFormulario();
    cargarTodo(condominioId);
  }

  async function eliminarEmpleado(emp: Empleado) {
    const confirmar = confirm(
      `¿Seguro que desea eliminar al empleado "${emp.nombre}"?`,
    );

    if (!confirmar) return;

    const condominioIdNumero = Number(condominioId);

    const { error } = await supabase
      .from("empleados")
      .delete()
      .eq("id", emp.id)
      .eq("condominio_id", condominioIdNumero);

    if (error) {
      setMensaje("Error eliminando empleado: " + error.message);
      return;
    }

    setMensaje("Empleado eliminado correctamente.");
    cargarTodo(condominioId);
  }

  async function subirContratoFirmado(emp: Empleado, archivo: File) {
    if (!archivo) return;

    const condominioIdNumero = Number(condominioId);

    if (!condominioIdNumero) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    const observacionContrato =
      prompt(
        "Observación del contrato firmado:",
        "Contrato firmado y archivado",
      ) || "";

    try {
      setSubiendoContratoId(emp.id);
      setMensaje("");

      const extension = archivo.name.split(".").pop();
      const nombreArchivo = `${condominioId}/${emp.id}-${
        emp.numero_empleado || "empleado"
      }-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("contratos-empleados")
        .upload(nombreArchivo, archivo, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        setMensaje("Error subiendo contrato: " + uploadError.message);
        setSubiendoContratoId(null);
        return;
      }

      const { data } = supabase.storage
        .from("contratos-empleados")
        .getPublicUrl(nombreArchivo);

      const hoy = new Date().toISOString().slice(0, 10);

      const { error } = await supabase
        .from("empleados")
        .update({
          contrato_firmado_url: data.publicUrl,
          fecha_contrato_firmado: hoy,
          observacion_contrato: observacionContrato,
        })
        .eq("id", emp.id)
        .eq("condominio_id", condominioIdNumero);

      setSubiendoContratoId(null);

      if (error) {
        setMensaje(
          "Contrato subido, pero no se pudo actualizar el empleado: " +
            error.message,
        );
        return;
      }

      setMensaje("Contrato firmado adjuntado correctamente.");
      cargarTodo(condominioId);
    } catch (error: any) {
      setSubiendoContratoId(null);
      setMensaje("Error adjuntando contrato: " + error.message);
    }
  }

  async function refrescar() {
    if (!condominioId || !Number(condominioId)) return;
    await cargarTodo(condominioId);
  }

  const empleadosSeguros = useMemo(() => {
    const condominioIdNumero = Number(condominioId);

    if (!condominioIdNumero) return [];

    return empleados.filter(
      (e) => Number(e.condominio_id) === condominioIdNumero,
    );
  }, [empleados, condominioId]);

  const empleadosFiltrados = useMemo(() => {
    return empleadosSeguros.filter((e) => {
      if (filtroEstado === "Todos") return true;
      return e.estado === filtroEstado;
    });
  }, [empleadosSeguros, filtroEstado]);

  const totalEmpleados = empleadosSeguros.length;

  const empleadosActivos = empleadosSeguros.filter(
    (e) => e.estado === "Activo",
  ).length;

  const empleadosInactivos = empleadosSeguros.filter(
    (e) => e.estado === "Inactivo",
  ).length;

  const totalNomina = empleadosSeguros
    .filter((e) => e.estado === "Activo")
    .reduce((sum, e) => sum + Number(e.salario || 0), 0);

  return (
    <PageContainer>
      <ModuleMenu
        title="Recursos Humanos"
        subtitle="Gestión de empleados, nómina, vacaciones, permisos, prestaciones y reportes."
        tone="blue"
        items={[
          {
            href: "/recursos-humanos",
            label: "Inicio RH",
            icon: BriefcaseBusiness,
          },
          {
            href: "/recursos-humanos/personal",
            label: "Empleados",
            icon: Users,
          },
          {
            href: "/recursos-humanos/nomina",
            label: "Nómina",
            icon: WalletCards,
          },
          {
            href: "/recursos-humanos/vacaciones",
            label: "Vacaciones",
            icon: CalendarDays,
          },
          {
            href: "/recursos-humanos/prestaciones",
            label: "Prestaciones",
            icon: HandCoins,
          },
          {
            href: "/recursos-humanos/nomina/reportes/nomina",
            label: "Reportes",
            icon: BarChart3,
          },
        ]}
      />

      <ModuleToolbar
        title="Personal / Empleados"
        subtitle={`Registro y administración del personal del condominio activo. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={Users}
        actions={<ModuleActions onRefresh={refrescar} />}
      />

      {mensaje && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
          {mensaje}
        </div>
      )}

      <SectionCard
        title="Resumen del personal"
        subtitle="Indicadores generales de empleados registrados."
        action={
          loading ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Actualizando
            </div>
          ) : (
            <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">
              {totalEmpleados} empleado(s)
            </span>
          )
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <InfoCompacta
            label="Total empleados"
            value={`${totalEmpleados}`}
            detalle="Registrados"
          />

          <InfoCompacta
            label="Activos"
            value={`${empleadosActivos}`}
            detalle="Disponibles para nómina"
          />

          <InfoCompacta
            label="Inactivos"
            value={`${empleadosInactivos}`}
            detalle="No incluidos en nómina"
          />

          <InfoCompacta
            label="Nómina mensual activa"
            value={`RD$ ${moneda(totalNomina)}`}
            detalle="Salario base activo"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Opciones de Recursos Humanos"
        subtitle="Accesos rápidos del módulo."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {modulos.map((modulo) => {
            const Icono = modulo.icono;

            return (
              <Link
                key={`${modulo.titulo}-${modulo.href}`}
                href={modulo.href}
                className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${modulo.bg}`}
                  >
                    <Icono className={`h-6 w-6 ${modulo.color}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black text-slate-900 group-hover:text-blue-700">
                      {modulo.titulo}
                    </h3>

                    <p className="mt-1 min-h-[52px] text-sm leading-relaxed text-slate-500">
                      {modulo.descripcion}
                    </p>

                    <div className="mt-3 flex items-center gap-2 text-sm font-black text-blue-700">
                      <span>Abrir módulo</span>
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title={editandoId ? "Modificar empleado" : "Registrar empleado"}
        subtitle="Complete los datos laborales y personales del empleado."
        action={
          editandoId ? (
            <button
              type="button"
              onClick={limpiarFormulario}
              className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              Cancelar edición
            </button>
          ) : (
            <span className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
              Nuevo registro
            </span>
          )
        }
      >
        <form
          onSubmit={guardarEmpleado}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div className="rounded-xl border bg-slate-50 px-4 py-3 md:col-span-2">
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Condominio
            </label>
            <p className="font-black text-slate-900">
              {condominioNombre || "No identificado"}
            </p>
          </div>

          <CampoTexto
            label="Número de empleado *"
            value={numeroEmpleado}
            onChange={setNumeroEmpleado}
            placeholder="Ejemplo: EMP-0001"
          />

          <CampoTexto
            label="Nombre completo *"
            value={nombre}
            onChange={setNombre}
            placeholder="Nombre completo del empleado"
          />

          <CampoTexto
            label="Cédula *"
            value={cedula}
            onChange={setCedula}
            placeholder="000-0000000-0"
          />

          <CampoTexto
            label="Número Seguridad Social"
            value={numeroSeguridadSocial}
            onChange={setNumeroSeguridadSocial}
            placeholder="NSS"
          />

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Sexo *
            </label>
            <select
              value={sexo}
              onChange={(e) => setSexo(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Seleccione</option>
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Fecha de nacimiento *
            </label>
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => manejarFechaNacimiento(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Edad
            </label>
            <input
              value={edad ? `${edad} años` : ""}
              readOnly
              className={`w-full rounded-xl border bg-slate-100 px-4 py-3 text-sm ${
                edad > 0 && edad < 18 ? "font-bold text-red-700" : ""
              }`}
              placeholder="Se calcula automáticamente"
            />

            {edad > 0 && edad < 18 && (
              <p className="mt-1 text-xs font-semibold text-red-600">
                No se permite registrar empleados menores de edad.
              </p>
            )}
          </div>

          <CampoTexto
            label="Teléfono"
            value={telefono}
            onChange={setTelefono}
            placeholder="Teléfono"
          />

          <CampoTexto
            label="Correo"
            type="email"
            value={correo}
            onChange={setCorreo}
            placeholder="correo@ejemplo.com"
          />

          <div className="md:col-span-2">
            <CampoTexto
              label="Dirección"
              value={direccion}
              onChange={setDireccion}
              placeholder="Dirección del empleado"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Cargo / Puesto *
            </label>
            <select
              value={cargoId}
              onChange={(e) => setCargoId(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Seleccione cargo</option>
              {cargos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Departamento *
            </label>
            <select
              value={departamentoId}
              onChange={(e) => setDepartamentoId(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Seleccione departamento</option>
              {departamentos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Tipo de contrato *
            </label>
            <select
              value={tipoContratoId}
              onChange={(e) => setTipoContratoId(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Seleccione contrato</option>
              {contratos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Fecha de ingreso *
            </label>
            <input
              type="date"
              value={fechaIngreso}
              onChange={(e) => setFechaIngreso(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Salario mensual RD$
            </label>
            <input
              type="number"
              step="0.01"
              value={salario}
              onChange={(e) => setSalario(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Estado
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Observación
            </label>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              rows={3}
              placeholder="Observaciones laborales o administrativas"
            />
          </div>

          <div className="flex flex-col gap-3 md:col-span-2 md:flex-row">
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
            >
              <Save className="h-4 w-4" />
              {guardando
                ? "Guardando..."
                : editandoId
                ? "Guardar cambios"
                : "Guardar empleado"}
            </button>

            {editandoId && (
              <button
                type="button"
                onClick={limpiarFormulario}
                className="rounded-xl bg-slate-700 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Listado de empleados"
        subtitle="Personal registrado para el condominio activo."
        action={
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">
              Filtrar estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="rounded-xl border bg-white px-4 py-2 text-sm"
            >
              <option value="Todos">Todos</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        }
      >
        {loading ? (
          <div className="rounded-2xl border bg-slate-50 p-6 text-sm font-bold text-slate-600">
            Cargando empleados...
          </div>
        ) : empleadosFiltrados.length === 0 ? (
          <EmptyState
            title="Sin empleados"
            description="No hay empleados registrados con este filtro."
          />
        ) : (
          <DataTable>
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">No. empleado</th>
                <th className="px-4 py-3 text-left">Empleado</th>
                <th className="px-4 py-3 text-left">Cédula / NSS</th>
                <th className="px-4 py-3 text-left">Sexo / Edad</th>
                <th className="px-4 py-3 text-left">Cargo</th>
                <th className="px-4 py-3 text-left">Departamento</th>
                <th className="px-4 py-3 text-left">Contrato</th>
                <th className="px-4 py-3 text-right">Salario</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Firmado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {empleadosFiltrados.map((emp) => (
                <tr key={emp.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-black text-blue-700">
                    {emp.numero_empleado || "-"}
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-black text-slate-900">
                      {emp.nombre || "-"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {emp.telefono || "-"} · {emp.correo || "-"}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    <p>{emp.cedula || "-"}</p>
                    <p className="text-xs text-slate-500">
                      NSS: {emp.numero_seguridad_social || "-"}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    <p>{emp.sexo || "-"}</p>
                    <p className="text-xs text-slate-500">
                      {emp.edad ? `${emp.edad} años` : "-"}
                    </p>
                  </td>

                  <td className="px-4 py-3">{emp.cargo || "-"}</td>

                  <td className="px-4 py-3">{emp.departamento || "-"}</td>

                  <td className="px-4 py-3">{emp.tipo_contrato || "-"}</td>

                  <td className="px-4 py-3 text-right font-black text-blue-700">
                    RD$ {moneda(emp.salario)}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${estadoClass(
                        emp.estado,
                      )}`}
                    >
                      {emp.estado || "-"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    {emp.contrato_firmado_url ? (
                      <div className="flex flex-col items-center gap-2">
                        <a
                          href={emp.contrato_firmado_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                        >
                          Ver firmado
                        </a>

                        <span className="text-[11px] text-slate-500">
                          {fecha(emp.fecha_contrato_firmado)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">
                        Sin contrato
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => editarEmpleado(emp)}
                        className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        Editar
                      </button>

                      <Link
                        href={`/recursos-humanos/personal/contrato/${emp.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Contrato
                      </Link>

                      <Link
                        href={`/recursos-humanos/personal/carnet/${emp.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700"
                      >
                        <IdCard className="h-3.5 w-3.5" />
                        Carnet
                      </Link>

                      <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-purple-700 px-3 py-2 text-xs font-bold text-white hover:bg-purple-800">
                        <UploadCloud className="h-3.5 w-3.5" />
                        {subiendoContratoId === emp.id
                          ? "Subiendo..."
                          : emp.contrato_firmado_url
                          ? "Reemplazar"
                          : "Subir"}

                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          disabled={subiendoContratoId === emp.id}
                          onChange={(e) => {
                            const archivo = e.target.files?.[0];

                            if (archivo) {
                              subirContratoFirmado(emp, archivo);
                            }

                            e.currentTarget.value = "";
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => eliminarEmpleado(emp)}
                        className="rounded-xl bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800"
                      >
                        Eliminar
                      </button>
                    </div>

                    {emp.observacion_contrato && (
                      <p className="mt-2 text-center text-[11px] text-slate-500">
                        {emp.observacion_contrato}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function InfoCompacta({
  label,
  value,
  detalle,
}: {
  label: string;
  value: string;
  detalle?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <h3 className="mt-1 text-lg font-black text-slate-900">{value}</h3>

      {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
    </div>
  );
}

function CampoTexto({
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
      <label className="mb-1 block text-sm font-bold text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
        placeholder={placeholder}
      />
    </div>
  );
}