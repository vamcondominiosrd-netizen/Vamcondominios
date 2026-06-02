"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type CatalogoItem = {
  id: number;
  nombre: string;
  estado: string;
};

type Empleado = {
  id: number;
  condominio_id: number;
  condominio: string;

  numero_empleado: string;
  nombre: string;
  cedula: string;
  numero_seguridad_social: string;
  sexo: string;
  fecha_nacimiento: string;
  edad: number;

  telefono: string;
  correo: string;
  direccion: string;

  cargo_id: number | null;
  departamento_id: number | null;
  tipo_contrato_id: number | null;

  cargo: string;
  departamento: string;
  tipo_contrato: string;

  fecha_ingreso: string;
  salario: number;

  estado: string;
  observacion: string;

  contrato_firmado_url?: string;
  fecha_contrato_firmado?: string;
  observacion_contrato?: string;

  created_at: string;
};

export default function PersonalPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargos, setCargos] = useState<CatalogoItem[]>([]);
  const [departamentos, setDepartamentos] = useState<CatalogoItem[]>([]);
  const [contratos, setContratos] = useState<CatalogoItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [subiendoContratoId, setSubiendoContratoId] = useState<number | null>(
    null
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

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombreCondominio = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombreCondominio);

    if (id) {
      cargarTodo(id);
    }
  }, []);

  async function cargarTodo(id: string) {
    setLoading(true);

    const [empleadosResp, cargosResp, departamentosResp, contratosResp] =
      await Promise.all([
        supabase
          .from("empleados")
          .select("*")
          .eq("condominio_id", Number(id))
          .order("created_at", { ascending: false }),

        supabase
          .from("rh_cargos")
          .select("id, nombre, estado")
          .eq("condominio_id", Number(id))
          .eq("estado", "Activo")
          .order("nombre", { ascending: true }),

        supabase
          .from("rh_departamentos")
          .select("id, nombre, estado")
          .eq("condominio_id", Number(id))
          .eq("estado", "Activo")
          .order("nombre", { ascending: true }),

        supabase
          .from("rh_tipos_contrato")
          .select("id, nombre, estado")
          .eq("condominio_id", Number(id))
          .eq("estado", "Activo")
          .order("nombre", { ascending: true }),
      ]);

    setLoading(false);

    if (empleadosResp.error) {
      alert("Error cargando empleados: " + empleadosResp.error.message);
      return;
    }

    if (cargosResp.error) {
      alert("Error cargando cargos: " + cargosResp.error.message);
      return;
    }

    if (departamentosResp.error) {
      alert("Error cargando departamentos: " + departamentosResp.error.message);
      return;
    }

    if (contratosResp.error) {
      alert("Error cargando tipos de contrato: " + contratosResp.error.message);
      return;
    }

    setEmpleados((empleadosResp.data as Empleado[]) || []);
    setCargos(cargosResp.data || []);
    setDepartamentos(departamentosResp.data || []);
    setContratos(contratosResp.data || []);
  }

  function calcularEdad(fecha: string) {
    if (!fecha) return 0;

    const hoy = new Date();
    const nacimiento = new Date(fecha);

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

    if (!condominioId || !condominioNombre) {
      alert(
        "No se encontró el condominio activo. Debe iniciar sesión nuevamente."
      );
      return;
    }

    if (!numeroEmpleado.trim()) {
      alert("Debe indicar el número de empleado.");
      return;
    }

    if (!nombre.trim()) {
      alert("Debe indicar el nombre del empleado.");
      return;
    }

    if (!cedula.trim()) {
      alert("Debe indicar la cédula del empleado.");
      return;
    }

    if (!sexo) {
      alert("Debe seleccionar el sexo.");
      return;
    }

    if (!fechaNacimiento) {
      alert("Debe indicar la fecha de nacimiento.");
      return;
    }

    const edadCalculada = calcularEdad(fechaNacimiento);

    if (edadCalculada < 18) {
      alert("No se puede registrar un empleado menor de edad.");
      return;
    }

    if (!cargoId) {
      alert("Debe seleccionar el cargo o puesto.");
      return;
    }

    if (!departamentoId) {
      alert("Debe seleccionar el departamento.");
      return;
    }

    if (!tipoContratoId) {
      alert("Debe seleccionar el tipo de contrato.");
      return;
    }

    if (!fechaIngreso) {
      alert("Debe indicar la fecha de ingreso.");
      return;
    }

    const cargoNombre = obtenerNombreCatalogo(cargos, cargoId);
    const departamentoNombre = obtenerNombreCatalogo(
      departamentos,
      departamentoId
    );
    const contratoNombre = obtenerNombreCatalogo(contratos, tipoContratoId);

    const registro = {
      condominio_id: Number(condominioId),
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

    if (editandoId) {
      const { error } = await supabase
        .from("empleados")
        .update(registro)
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      setGuardando(false);

      if (error) {
        alert("Error modificando empleado: " + error.message);
        return;
      }

      alert("Empleado modificado correctamente.");
      limpiarFormulario();
      cargarTodo(condominioId);
      return;
    }

    const { error } = await supabase.from("empleados").insert([registro]);

    setGuardando(false);

    if (error) {
      alert("Error guardando empleado: " + error.message);
      return;
    }

    alert("Empleado registrado correctamente.");
    limpiarFormulario();
    cargarTodo(condominioId);
  }

  async function eliminarEmpleado(emp: Empleado) {
    const confirmar = confirm(
      `¿Seguro que desea eliminar al empleado "${emp.nombre}"?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("empleados")
      .delete()
      .eq("id", emp.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error eliminando empleado: " + error.message);
      return;
    }

    alert("Empleado eliminado correctamente.");
    cargarTodo(condominioId);
  }

  async function subirContratoFirmado(emp: Empleado, archivo: File) {
    if (!archivo) return;

    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

    const observacionContrato =
      prompt("Observación del contrato firmado:", "Contrato firmado y archivado") ||
      "";

    try {
      setSubiendoContratoId(emp.id);

      const extension = archivo.name.split(".").pop();
      const nombreArchivo = `${condominioId}/${emp.id}-${emp.numero_empleado}-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("contratos-empleados")
        .upload(nombreArchivo, archivo, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        alert("Error subiendo contrato: " + uploadError.message);
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
        .eq("condominio_id", Number(condominioId));

      setSubiendoContratoId(null);

      if (error) {
        alert(
          "Contrato subido, pero no se pudo actualizar el empleado: " +
            error.message
        );
        return;
      }

      alert("Contrato firmado adjuntado correctamente.");
      cargarTodo(condominioId);
    } catch (error: any) {
      setSubiendoContratoId(null);
      alert("Error adjuntando contrato: " + error.message);
    }
  }

  const empleadosFiltrados = empleados.filter((e) => {
    if (filtroEstado === "Todos") return true;
    return e.estado === filtroEstado;
  });

  const totalEmpleados = empleados.length;

  const empleadosActivos = empleados.filter(
    (e) => e.estado === "Activo"
  ).length;

  const empleadosInactivos = empleados.filter(
    (e) => e.estado === "Inactivo"
  ).length;

  const totalNomina = empleados
    .filter((e) => e.estado === "Activo")
    .reduce((sum, e) => sum + Number(e.salario || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">
          Personal / Empleados
        </h1>

        <p className="text-slate-500 mt-2">
          Registro y administración del personal del condominio activo.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>

        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Total empleados</p>
          <h2 className="text-3xl font-black">{totalEmpleados}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Activos</p>
          <h2 className="text-3xl font-black text-green-700">
            {empleadosActivos}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Inactivos</p>
          <h2 className="text-3xl font-black text-red-700">
            {empleadosInactivos}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Nómina mensual activa</p>
          <h2 className="text-3xl font-black text-blue-700">
            RD$
            {totalNomina.toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">
          {editandoId ? "Modificar empleado" : "Registrar empleado"}
        </h2>

        <form
          onSubmit={guardarEmpleado}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="md:col-span-2 bg-slate-50 border rounded-xl px-4 py-3">
            <label className="block text-sm font-semibold mb-1">
              Condominio
            </label>
            <p className="font-semibold text-slate-800">{condominioNombre}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Número de empleado *
            </label>
            <input
              value={numeroEmpleado}
              onChange={(e) => setNumeroEmpleado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Ejemplo: EMP-0001"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Nombre completo *
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Nombre completo del empleado"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Cédula *</label>
            <input
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="000-0000000-0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Número Seguridad Social
            </label>
            <input
              value={numeroSeguridadSocial}
              onChange={(e) => setNumeroSeguridadSocial(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="NSS"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Sexo *</label>
            <select
              value={sexo}
              onChange={(e) => setSexo(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="">Seleccione</option>
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Fecha de nacimiento *
            </label>
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => manejarFechaNacimiento(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Edad</label>
            <input
              value={edad ? `${edad} años` : ""}
              readOnly
              className={`border rounded-xl px-4 py-3 w-full bg-slate-100 ${
                edad > 0 && edad < 18 ? "text-red-700 font-bold" : ""
              }`}
              placeholder="Se calcula automáticamente"
            />

            {edad > 0 && edad < 18 && (
              <p className="text-xs text-red-600 mt-1">
                No se permite registrar empleados menores de edad.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Teléfono</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Teléfono"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Correo</label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">Dirección</label>
            <input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Dirección del empleado"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Cargo / Puesto *
            </label>
            <select
              value={cargoId}
              onChange={(e) => setCargoId(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
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
            <label className="block text-sm font-semibold mb-1">
              Departamento *
            </label>
            <select
              value={departamentoId}
              onChange={(e) => setDepartamentoId(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
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
            <label className="block text-sm font-semibold mb-1">
              Tipo de contrato *
            </label>
            <select
              value={tipoContratoId}
              onChange={(e) => setTipoContratoId(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
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
            <label className="block text-sm font-semibold mb-1">
              Fecha de ingreso *
            </label>
            <input
              type="date"
              value={fechaIngreso}
              onChange={(e) => setFechaIngreso(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Salario mensual RD$
            </label>
            <input
              type="number"
              step="0.01"
              value={salario}
              onChange={(e) => setSalario(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Observación
            </label>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              rows={3}
              placeholder="Observaciones laborales o administrativas"
            />
          </div>

          <div className="md:col-span-2 flex flex-col md:flex-row gap-3">
            <button
              type="submit"
              disabled={guardando}
              className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-5 py-3 rounded-xl font-bold"
            >
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
                className="bg-slate-600 hover:bg-slate-700 text-white px-5 py-3 rounded-xl font-bold"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Listado de empleados</h2>
            <p className="text-sm text-slate-500">
              Personal registrado para el condominio activo.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Filtrar estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border rounded-xl px-4 py-2 bg-white"
            >
              <option value="Todos">Todos</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-6">Cargando empleados...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">No. Empleado</th>
                  <th className="p-3 border text-left">Empleado</th>
                  <th className="p-3 border text-left">Cédula / NSS</th>
                  <th className="p-3 border text-left">Sexo / Edad</th>
                  <th className="p-3 border text-left">Cargo</th>
                  <th className="p-3 border text-left">Departamento</th>
                  <th className="p-3 border text-left">Contrato</th>
                  <th className="p-3 border text-right">Salario</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">
                    Contrato firmado
                  </th>
                  <th className="p-3 border text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {empleadosFiltrados.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="p-3 border font-black text-blue-700">
                      {emp.numero_empleado || "-"}
                    </td>

                    <td className="p-3 border">
                      <p className="font-bold">{emp.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {emp.telefono || "-"} · {emp.correo || "-"}
                      </p>
                    </td>

                    <td className="p-3 border">
                      <p>{emp.cedula || "-"}</p>
                      <p className="text-xs text-slate-500">
                        NSS: {emp.numero_seguridad_social || "-"}
                      </p>
                    </td>

                    <td className="p-3 border">
                      <p>{emp.sexo || "-"}</p>
                      <p className="text-xs text-slate-500">
                        {emp.edad ? `${emp.edad} años` : "-"}
                      </p>
                    </td>

                    <td className="p-3 border">{emp.cargo || "-"}</td>
                    <td className="p-3 border">{emp.departamento || "-"}</td>
                    <td className="p-3 border">{emp.tipo_contrato || "-"}</td>

                    <td className="p-3 border text-right font-bold">
                      RD$
                      {Number(emp.salario || 0).toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                      })}
                    </td>

                    <td className="p-3 border text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          emp.estado === "Activo"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {emp.estado}
                      </span>
                    </td>

                    <td className="p-3 border text-center">
                      {emp.contrato_firmado_url ? (
                        <div className="flex flex-col items-center gap-2">
                          <a
                            href={emp.contrato_firmado_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Ver firmado
                          </a>

                          <span className="text-[11px] text-slate-500">
                            {emp.fecha_contrato_firmado || ""}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Sin contrato
                        </span>
                      )}
                    </td>

                    <td className="p-3 border">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          onClick={() => editarEmpleado(emp)}
                          className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Editar
                        </button>

                        <Link
                          href={`/recursos-humanos/personal/contrato/${emp.id}`}
                          className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Contrato
                        </Link>

                       <Link
                      href={`/recursos-humanos/personal/carnet/${emp.id}`}
                     className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg text-xs font-bold"
                     >
                      Carnet
                     </Link>

                        <label className="bg-purple-700 hover:bg-purple-800 text-white px-3 py-2 rounded-lg text-xs font-bold cursor-pointer">
                          {subiendoContratoId === emp.id
                            ? "Subiendo..."
                            : emp.contrato_firmado_url
                            ? "Reemplazar firmado"
                            : "Subir firmado"}

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
                          onClick={() => eliminarEmpleado(emp)}
                          className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          Eliminar
                        </button>
                      </div>

                      {emp.observacion_contrato && (
                        <p className="text-[11px] text-slate-500 mt-2 text-center">
                          {emp.observacion_contrato}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}

                {empleadosFiltrados.length === 0 && (
                  <tr>
                    <td
                      className="p-6 border text-center text-slate-500"
                      colSpan={11}
                    >
                      No hay empleados registrados con este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}