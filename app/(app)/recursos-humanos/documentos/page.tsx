"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Empleado = {
  id: number;
  numero_empleado: string;
  nombre: string;
  cargo: string;
  departamento: string;
  estado: string;
};

type DocumentoEmpleado = {
  id: number;
  condominio_id: number;
  condominio: string;

  empleado_id: number;
  numero_empleado: string;
  nombre_empleado: string;
  cargo: string;
  departamento: string;

  tipo_documento: string;
  nombre_documento: string;
  documento_url: string;

  fecha_documento: string;
  fecha_vencimiento: string;

  estado: string;
  observacion: string;

  created_at: string;
};

const tiposDocumento = [
  "Cédula",
  "Contrato firmado",
  "Certificado médico",
  "Carta de buena conducta",
  "Currículum",
  "Foto",
  "Licencia",
  "Certificación laboral",
  "Documento legal",
  "Otro",
];

export default function DocumentosRHPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoEmpleado[]>([]);

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [empleadoId, setEmpleadoId] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("Cédula");
  const [nombreDocumento, setNombreDocumento] = useState("");
  const [documentoUrl, setDocumentoUrl] = useState("");
  const [fechaDocumento, setFechaDocumento] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [estado, setEstado] = useState("Activo");
  const [observacion, setObservacion] = useState("");

  const [filtroEmpleado, setFiltroEmpleado] = useState("Todos");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (id) {
      cargarEmpleados(id);
      cargarDocumentos(id);
    }
  }, []);

  async function cargarEmpleados(id: string) {
    const { data, error } = await supabase
      .from("empleados")
      .select("id, numero_empleado, nombre, cargo, departamento, estado")
      .eq("condominio_id", Number(id))
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando empleados: " + error.message);
      return;
    }

    setEmpleados((data as Empleado[]) || []);
  }

  async function cargarDocumentos(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("rh_documentos_empleados")
      .select("*")
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Error cargando documentos: " + error.message);
      return;
    }

    setDocumentos((data as DocumentoEmpleado[]) || []);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setEmpleadoId("");
    setTipoDocumento("Cédula");
    setNombreDocumento("");
    setDocumentoUrl("");
    setFechaDocumento("");
    setFechaVencimiento("");
    setEstado("Activo");
    setObservacion("");
  }

  function editarDocumento(doc: DocumentoEmpleado) {
    setEditandoId(doc.id);
    setEmpleadoId(String(doc.empleado_id));
    setTipoDocumento(doc.tipo_documento || "Cédula");
    setNombreDocumento(doc.nombre_documento || "");
    setDocumentoUrl(doc.documento_url || "");
    setFechaDocumento(doc.fecha_documento || "");
    setFechaVencimiento(doc.fecha_vencimiento || "");
    setEstado(doc.estado || "Activo");
    setObservacion(doc.observacion || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function subirArchivo(archivo: File) {
    if (!archivo) return;

    if (!condominioId) {
      alert("No se encontró el condominio activo.");
      return;
    }

    try {
      setSubiendo(true);

      const extension = archivo.name.split(".").pop();
      const nombreLimpio = archivo.name
        .replace(/\s+/g, "-")
        .replace(/[^\w.-]/g, "");

      const nombreArchivo = `${condominioId}/${Date.now()}-${nombreLimpio}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("documentos-empleados")
        .upload(nombreArchivo, archivo, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        alert("Error subiendo documento: " + uploadError.message);
        setSubiendo(false);
        return;
      }

      const { data } = supabase.storage
        .from("documentos-empleados")
        .getPublicUrl(nombreArchivo);

      setDocumentoUrl(data.publicUrl);
      setSubiendo(false);

      alert("Documento subido correctamente.");
    } catch (error: any) {
      setSubiendo(false);
      alert("Error subiendo documento: " + error.message);
    }
  }

  async function guardarDocumento(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo.");
      return;
    }

    if (!empleadoId) {
      alert("Debe seleccionar un empleado.");
      return;
    }

    if (!tipoDocumento) {
      alert("Debe seleccionar el tipo de documento.");
      return;
    }

    if (!documentoUrl.trim()) {
      alert("Debe subir o indicar el documento.");
      return;
    }

    const empleado = empleados.find((emp) => String(emp.id) === empleadoId);

    if (!empleado) {
      alert("Empleado no encontrado.");
      return;
    }

    const registro = {
      condominio_id: Number(condominioId),
      condominio: condominioNombre,

      empleado_id: Number(empleadoId),
      numero_empleado: empleado.numero_empleado || "",
      nombre_empleado: empleado.nombre || "",
      cargo: empleado.cargo || "",
      departamento: empleado.departamento || "",

      tipo_documento: tipoDocumento,
      nombre_documento:
        nombreDocumento.trim() || `${tipoDocumento} - ${empleado.nombre}`,
      documento_url: documentoUrl.trim(),

      fecha_documento: fechaDocumento || null,
      fecha_vencimiento: fechaVencimiento || null,

      estado,
      observacion: observacion.trim(),
    };

    setGuardando(true);

    if (editandoId) {
      const { error } = await supabase
        .from("rh_documentos_empleados")
        .update(registro)
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      setGuardando(false);

      if (error) {
        alert("Error modificando documento: " + error.message);
        return;
      }

      alert("Documento modificado correctamente.");
      limpiarFormulario();
      cargarDocumentos(condominioId);
      return;
    }

    const { error } = await supabase
      .from("rh_documentos_empleados")
      .insert([registro]);

    setGuardando(false);

    if (error) {
      alert("Error guardando documento: " + error.message);
      return;
    }

    alert("Documento registrado correctamente.");
    limpiarFormulario();
    cargarDocumentos(condominioId);
  }

  async function eliminarDocumento(doc: DocumentoEmpleado) {
    const confirmar = confirm(
      `¿Seguro que desea eliminar el documento "${doc.nombre_documento}"?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("rh_documentos_empleados")
      .delete()
      .eq("id", doc.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error eliminando documento: " + error.message);
      return;
    }

    alert("Documento eliminado correctamente.");
    cargarDocumentos(condominioId);
  }

  const documentosFiltrados = documentos.filter((doc) => {
    const cumpleEmpleado =
      filtroEmpleado === "Todos" || String(doc.empleado_id) === filtroEmpleado;

    const cumpleTipo =
      filtroTipo === "Todos" || doc.tipo_documento === filtroTipo;

    const cumpleEstado =
      filtroEstado === "Todos" || doc.estado === filtroEstado;

    return cumpleEmpleado && cumpleTipo && cumpleEstado;
  });

  const totalDocumentos = documentos.length;
  const documentosActivos = documentos.filter(
    (d) => d.estado === "Activo"
  ).length;
  const documentosInactivos = documentos.filter(
    (d) => d.estado === "Inactivo"
  ).length;

  const vencidos = documentos.filter((d) => {
    if (!d.fecha_vencimiento) return false;
    return new Date(`${d.fecha_vencimiento}T00:00:00`) < new Date();
  }).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h1 className="text-4xl font-black text-slate-900">Documentos RH</h1>

        <p className="text-slate-500 mt-2">
          Expediente digital de documentos laborales, contratos, cédulas,
          certificaciones y archivos del personal.
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
          <p className="text-sm text-slate-500">Total documentos</p>
          <h2 className="text-3xl font-black">{totalDocumentos}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Activos</p>
          <h2 className="text-3xl font-black text-green-700">
            {documentosActivos}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Inactivos</p>
          <h2 className="text-3xl font-black text-red-700">
            {documentosInactivos}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Vencidos</p>
          <h2 className="text-3xl font-black text-yellow-700">{vencidos}</h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-xl font-black mb-4">
          {editandoId ? "Modificar documento" : "Registrar documento"}
        </h2>

        <form
          onSubmit={guardarDocumento}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">
              Empleado *
            </label>

            <select
              value={empleadoId}
              onChange={(e) => setEmpleadoId(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="">Seleccione empleado</option>

              {empleados.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.numero_empleado} - {emp.nombre} - {emp.cargo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Tipo de documento *
            </label>

            <select
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              {tiposDocumento.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Nombre del documento
            </label>

            <input
              type="text"
              value={nombreDocumento}
              onChange={(e) => setNombreDocumento(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Ej. Cédula frontal, contrato firmado..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Estado
            </label>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full bg-white"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Fecha del documento
            </label>

            <input
              type="date"
              value={fechaDocumento}
              onChange={(e) => setFechaDocumento(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Fecha vencimiento
            </label>

            <input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Subir documento
            </label>

            <label className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-3 rounded-xl font-bold cursor-pointer inline-block">
              {subiendo ? "Subiendo..." : "Seleccionar archivo"}

              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                disabled={subiendo}
                className="hidden"
                onChange={(e) => {
                  const archivo = e.target.files?.[0];

                  if (archivo) {
                    subirArchivo(archivo);
                  }

                  e.currentTarget.value = "";
                }}
              />
            </label>

            {documentoUrl && (
              <div className="mt-3 bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 text-sm">
                Documento cargado correctamente.{" "}
                <a
                  href={documentoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline"
                >
                  Ver documento
                </a>
              </div>
            )}
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
              placeholder="Observación del documento"
            />
          </div>

          <div className="md:col-span-2 flex flex-col md:flex-row gap-3">
            <button
              type="submit"
              disabled={guardando || subiendo}
              className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-5 py-3 rounded-xl font-bold"
            >
              {guardando
                ? "Guardando..."
                : editandoId
                ? "Guardar cambios"
                : "Guardar documento"}
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

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-black">Expediente digital</h2>

            <p className="text-sm text-slate-500">
              Documentos cargados para el personal del condominio activo.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Empleado
              </label>

              <select
                value={filtroEmpleado}
                onChange={(e) => setFiltroEmpleado(e.target.value)}
                className="border rounded-xl px-4 py-2 bg-white"
              >
                <option value="Todos">Todos</option>

                {empleados.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.numero_empleado} - {emp.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Tipo</label>

              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="border rounded-xl px-4 py-2 bg-white"
              >
                <option value="Todos">Todos</option>

                {tiposDocumento.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Estado</label>

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
        </div>

        {loading ? (
          <div>Cargando documentos...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Empleado</th>
                  <th className="p-3 border text-left">Documento</th>
                  <th className="p-3 border text-left">Fechas</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-left">Observación</th>
                  <th className="p-3 border text-center">Archivo</th>
                  <th className="p-3 border text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {documentosFiltrados.map((doc) => {
                  const vencido =
                    doc.fecha_vencimiento &&
                    new Date(`${doc.fecha_vencimiento}T00:00:00`) < new Date();

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50">
                      <td className="p-3 border">
                        <p className="font-bold">{doc.nombre_empleado}</p>
                        <p className="text-xs text-slate-500">
                          {doc.numero_empleado} · {doc.cargo || "-"}
                        </p>
                      </td>

                      <td className="p-3 border">
                        <p className="font-bold">{doc.tipo_documento}</p>
                        <p className="text-xs text-slate-500">
                          {doc.nombre_documento || "-"}
                        </p>
                      </td>

                      <td className="p-3 border">
                        <p>Fecha: {doc.fecha_documento || "-"}</p>
                        <p
                          className={`text-xs ${
                            vencido ? "text-red-600 font-bold" : "text-slate-500"
                          }`}
                        >
                          Vence: {doc.fecha_vencimiento || "No aplica"}
                        </p>
                      </td>

                      <td className="p-3 border text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            doc.estado === "Activo"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {doc.estado}
                        </span>
                      </td>

                      <td className="p-3 border">{doc.observacion || "-"}</td>

                      <td className="p-3 border text-center">
                        <a
                          href={doc.documento_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-lg text-xs font-bold inline-block"
                        >
                          Ver archivo
                        </a>
                      </td>

                      <td className="p-3 border">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => editarDocumento(doc)}
                            className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => eliminarDocumento(doc)}
                            className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {documentosFiltrados.length === 0 && (
                  <tr>
                    <td
                      className="p-6 border text-center text-slate-500"
                      colSpan={7}
                    >
                      No hay documentos registrados con este filtro.
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