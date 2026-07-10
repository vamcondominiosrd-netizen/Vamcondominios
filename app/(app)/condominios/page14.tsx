"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle,
  CircleDollarSign,
  Hash,
  Plus,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import PageHeader from "@/components/vam/enterprise/PageHeader";
import StatCard from "@/components/vam/enterprise/StatCard";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import ActionBar from "@/components/vam/enterprise/ActionBar";

type Condominio = {
  id: number;
  client_id: number | null;
  nombre: string;
  rnc: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  cuota_mensual: number | null;
  porcentaje_mora: number | null;
  dia_inicio_mora: number | null;
  estado: string | null;
  activa?: boolean | null;
  logo_url: string | null;
  nombre_representante: string | null;
  cedula_representante: string | null;
  cargo_representante: string | null;
  created_at: string;
};

export default function CondominiosPage() {
  const [condominioActivoId, setCondominioActivoId] = useState("");
  const [condominioActivoNombre, setCondominioActivoNombre] = useState("");
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [buscar, setBuscar] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [nombre, setNombre] = useState("");
  const [rnc, setRnc] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [cuotaMensual, setCuotaMensual] = useState("");
  const [porcentajeMora, setPorcentajeMora] = useState("5");
  const [diaInicioMora, setDiaInicioMora] = useState("10");
  const [estado, setEstado] = useState("activo");
  const [nombreRepresentante, setNombreRepresentante] = useState("");
  const [cedulaRepresentante, setCedulaRepresentante] = useState("");
  const [cargoRepresentante, setCargoRepresentante] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombreActivo = localStorage.getItem("condominio_nombre") || "";

    setCondominioActivoId(id);
    setCondominioActivoNombre(nombreActivo);

    if (!id) {
      alert(
        "No se encontró el condominio activo. Debe iniciar sesión nuevamente.",
      );
      return;
    }

    cargarCondominios(id);
  }, []);

  async function cargarCondominios(idActivo?: string) {
    setLoading(true);

    const id =
      idActivo || localStorage.getItem("condominio_id") || condominioActivoId;

    if (!id) {
      setLoading(false);
      alert("No se encontró el condominio activo.");
      return;
    }

    const { data, error } = await supabase
      .from("condominios")
      .select("*")
      .eq("id", Number(id))
      .order("id", { ascending: true });

    setLoading(false);

    if (error) {
      alert("Error cargando condominio: " + error.message);
      return;
    }

    const lista = (data as Condominio[]) || [];
    setCondominios(lista);

    if (lista.length > 0 && !detalleId) {
      setDetalleId(lista[0].id);
    }
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setNombre("");
    setRnc("");
    setDireccion("");
    setTelefono("");
    setCorreo("");
    setLogoUrl("");
    setCuotaMensual("");
    setPorcentajeMora("5");
    setDiaInicioMora("10");
    setEstado("activo");
    setNombreRepresentante("");
    setCedulaRepresentante("");
    setCargoRepresentante("");
  }

  function editarCondominio(c: Condominio) {
    setEditandoId(c.id);
    setMostrarFormulario(true);
    setNombre(c.nombre || "");
    setRnc(c.rnc || "");
    setDireccion(c.direccion || "");
    setTelefono(c.telefono || "");
    setCorreo(c.correo || "");
    setLogoUrl(c.logo_url || "");
    setCuotaMensual(String(c.cuota_mensual || ""));
    setPorcentajeMora(String(c.porcentaje_mora || 5));
    setDiaInicioMora(String(c.dia_inicio_mora || 10));
    setEstado(c.estado || "activo");
    setNombreRepresentante(c.nombre_representante || "");
    setCedulaRepresentante(c.cedula_representante || "");
    setCargoRepresentante(c.cargo_representante || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarCondominio(e: React.FormEvent) {
    e.preventDefault();

    if (!nombre.trim()) {
      alert("Debe escribir el nombre del condominio.");
      return;
    }

    setGuardando(true);

    const registro = {
      client_id: 1,
      nombre: nombre.trim(),
      rnc: rnc.trim() || null,
      direccion: direccion.trim() || null,
      telefono: telefono.trim() || null,
      correo: correo.trim() || null,
      logo_url: logoUrl.trim() || null,
      cuota_mensual: Number(cuotaMensual || 0),
      porcentaje_mora: Number(porcentajeMora || 5),
      dia_inicio_mora: Number(diaInicioMora || 10),
      estado,
      nombre_representante: nombreRepresentante.trim() || null,
      cedula_representante: cedulaRepresentante.trim() || null,
      cargo_representante: cargoRepresentante.trim() || null,
    };

    if (editandoId) {
      const { error } = await supabase
        .from("condominios")
        .update(registro)
        .eq("id", editandoId);

      setGuardando(false);

      if (error) {
        alert("Error actualizando condominio: " + error.message);
        return;
      }

      if (String(editandoId) === String(condominioActivoId)) {
        localStorage.setItem("condominio_nombre", nombre.trim());

        if (logoUrl.trim()) {
          localStorage.setItem("condominio_logo_url", logoUrl.trim());
        } else {
          localStorage.removeItem("condominio_logo_url");
        }

        setCondominioActivoNombre(nombre.trim());
      }

      alert("Condominio actualizado correctamente.");
      limpiarFormulario();
      setMostrarFormulario(false);
      cargarCondominios(condominioActivoId);
      return;
    }

    const { data: nuevoCondominio, error } = await supabase
      .from("condominios")
      .insert([
        {
          ...registro,
          activa: String(estado).toLowerCase() === "activo",
        },
      ])
      .select("id, nombre")
      .single();

    if (error) {
      setGuardando(false);
      alert("Error guardando condominio: " + error.message);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const userId = authData?.user?.id || "";

    if (authError || !userId) {
      setGuardando(false);
      alert(
        "El condominio fue creado, pero no se pudo identificar el usuario para asignarlo. Cierre sesión e ingrese nuevamente.",
      );
      return;
    }

    const empresaId = Number(localStorage.getItem("empresa_id") || "1");

    const { data: asignacionExistente, error: errorBuscandoAsignacion } =
      await supabase
        .from("usuarios_condominios")
        .select("id, activo")
        .eq("user_id", userId)
        .eq("empresa_id", empresaId)
        .eq("condominio_id", nuevoCondominio.id)
        .maybeSingle();

    if (errorBuscandoAsignacion) {
      setGuardando(false);
      alert(
        "El condominio fue creado, pero no se pudo validar la asignación al usuario: " +
          errorBuscandoAsignacion.message,
      );
      return;
    }

    if (asignacionExistente?.id) {
      const { error: errorReactivando } = await supabase
        .from("usuarios_condominios")
        .update({
          rol_condominio: "Administrador General",
          activo: true,
        })
        .eq("id", asignacionExistente.id);

      if (errorReactivando) {
        setGuardando(false);
        alert(
          "El condominio fue creado, pero no se pudo reactivar la asignación al usuario: " +
            errorReactivando.message,
        );
        return;
      }
    } else {
      const { error: errorAsignando } = await supabase
        .from("usuarios_condominios")
        .insert({
          user_id: userId,
          empresa_id: empresaId,
          condominio_id: nuevoCondominio.id,
          rol_condominio: "Administrador General",
          activo: true,
        });

      if (errorAsignando) {
        setGuardando(false);
        alert(
          "El condominio fue creado, pero no se pudo asignar al usuario: " +
            errorAsignando.message,
        );
        return;
      }
    }

    setGuardando(false);
    alert(
      "Condominio registrado y asignado correctamente. Cierre sesión y vuelva a entrar para verlo en el selector.",
    );
    limpiarFormulario();
    setMostrarFormulario(false);
    cargarCondominios(condominioActivoId);
  }

  async function cambiarEstado(id: number, nuevoEstado: string) {
    const confirmar = confirm(`¿Desea cambiar el estado a ${nuevoEstado}?`);

    if (!confirmar) return;

    const { error } = await supabase
      .from("condominios")
      .update({ estado: nuevoEstado })
      .eq("id", id);

    if (error) {
      alert("Error actualizando estado: " + error.message);
      return;
    }

    cargarCondominios(condominioActivoId);
  }

  function verDetalle(id: number) {
    setDetalleId((actual) => (actual === id ? null : id));
  }

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  const condominiosFiltrados = useMemo(() => {
    const texto = buscar.toLowerCase().trim();

    if (!texto) return condominios;

    return condominios.filter((c) => {
      const combinado = `
        ${c.nombre || ""}
        ${c.rnc || ""}
        ${c.telefono || ""}
        ${c.correo || ""}
        ${c.direccion || ""}
      `.toLowerCase();

      return combinado.includes(texto);
    });
  }, [condominios, buscar]);

  const activos = condominios.filter((c) => c.estado === "activo").length;
  const inactivos = condominios.filter((c) => c.estado !== "activo").length;
  const condominioPrincipal = condominios[0];

  return (
    <PageContainer>
      <PageHeader
        title="Condominios"
        subtitle="Registro, configuración y administración del condominio activo."
        badge="Centro Residencial"
        icon={Building2}
        action={
          <button
            type="button"
            onClick={() => {
              limpiarFormulario();
              setMostrarFormulario((v) => !v);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
          >
            <Plus className="h-4 w-4" />
            {mostrarFormulario ? "Ocultar formulario" : "Nuevo / Editar"}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Total mostrado"
          value={condominios.length}
          subtitle="Condominio en sesión"
          icon={Building2}
          tone="blue"
        />

        <StatCard
          title="Activos"
          value={activos}
          subtitle="Estado activo"
          icon={CheckCircle}
          tone="green"
        />

        <StatCard
          title="Inactivos"
          value={inactivos}
          subtitle="Estado inactivo"
          icon={XCircle}
          tone="red"
        />

        <StatCard
          title="Cuota"
          value={`RD$ ${dinero(condominioPrincipal?.cuota_mensual)}`}
          subtitle={`ID ${condominioActivoId || "-"}`}
          icon={CircleDollarSign}
          tone="amber"
        />
      </div>

      {mostrarFormulario && (
        <SectionCard
          title={editandoId ? "Modificar condominio" : "Registrar condominio"}
          subtitle="Complete los datos generales, financieros y del representante."
        >
          <form onSubmit={guardarCondominio} className="space-y-5">
            <div>
              <h3 className="mb-3 border-b pb-2 text-sm font-black text-slate-800">
                Datos generales
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="Nombre del condominio *"
                />

                <input
                  type="text"
                  value={rnc}
                  onChange={(e) => setRnc(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="RNC"
                />

                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="Teléfono"
                />

                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="Correo"
                />

                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm md:col-span-2"
                  placeholder="URL del logo"
                />

                <textarea
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm md:col-span-2"
                  rows={3}
                  placeholder="Dirección completa"
                />
              </div>
            </div>

            <div>
              <h3 className="mb-3 border-b pb-2 text-sm font-black text-slate-800">
                Datos financieros
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <input
                  type="number"
                  step="0.01"
                  value={cuotaMensual}
                  onChange={(e) => setCuotaMensual(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="Cuota mensual"
                />

                <input
                  type="number"
                  step="0.01"
                  value={porcentajeMora}
                  onChange={(e) => setPorcentajeMora(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="% Mora"
                />

                <input
                  type="number"
                  value={diaInicioMora}
                  onChange={(e) => setDiaInicioMora(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="Día mora"
                />

                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            <div>
              <h3 className="mb-3 border-b pb-2 text-sm font-black text-slate-800">
                Representante para contratos
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <input
                  type="text"
                  value={nombreRepresentante}
                  onChange={(e) => setNombreRepresentante(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="Nombre del representante"
                />

                <input
                  type="text"
                  value={cedulaRepresentante}
                  onChange={(e) => setCedulaRepresentante(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="Cédula"
                />

                <input
                  type="text"
                  value={cargoRepresentante}
                  onChange={(e) => setCargoRepresentante(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="Cargo"
                />
              </div>
            </div>

            {logoUrl && (
              <div>
                <img
                  src={logoUrl}
                  alt="Logo condominio"
                  className="h-20 rounded-xl border bg-white object-contain p-2"
                />
              </div>
            )}

            <div className="flex flex-col gap-3 md:flex-row">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
              >
                {guardando
                  ? "Guardando..."
                  : editandoId
                    ? "Guardar cambios"
                    : "Guardar condominio"}
              </button>

              {editandoId && (
                <button
                  type="button"
                  onClick={() => {
                    limpiarFormulario();
                    setMostrarFormulario(false);
                  }}
                  className="rounded-xl bg-slate-600 px-5 py-3 font-bold text-white hover:bg-slate-700"
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard
        title="Condominio activo"
        subtitle={`Mostrando solamente: ${
          condominioActivoNombre || "No seleccionado"
        }`}
      >
        <ActionBar
          search={buscar}
          onSearch={setBuscar}
          placeholder="Buscar dentro del condominio activo..."
        >
          <button
            type="button"
            onClick={() => cargarCondominios(condominioActivoId)}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </ActionBar>

        <div className="mt-4 overflow-x-auto rounded-2xl border">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">
              Cargando condominio...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Condominio</th>
                  <th className="px-4 py-3 text-left">RNC</th>
                  <th className="px-4 py-3 text-left">Teléfono</th>
                  <th className="px-4 py-3 text-right">Cuota</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {condominiosFiltrados.map((c) => (
                  <Fragment key={c.id}>
                    <tr className="bg-white hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {c.logo_url ? (
                            <img
                              src={c.logo_url}
                              alt={c.nombre}
                              className="h-10 w-10 rounded-xl border bg-white object-contain p-1"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-slate-100 text-[10px] text-slate-400">
                              Logo
                            </div>
                          )}

                          <div>
                            <p className="font-black text-slate-900">
                              {c.nombre}
                            </p>
                            <p className="text-xs font-bold text-blue-700">
                              Condominio activo
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">{c.rnc || "-"}</td>
                      <td className="px-4 py-3">{c.telefono || "-"}</td>

                      <td className="px-4 py-3 text-right font-bold text-green-700">
                        RD$ {dinero(c.cuota_mensual)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            c.estado === "activo"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {c.estado || "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => verDetalle(c.id)}
                            className="rounded-lg bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-800"
                          >
                            {detalleId === c.id ? "Ocultar" : "Detalle"}
                          </button>

                          <button
                            type="button"
                            onClick={() => editarCondominio(c)}
                            className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                          >
                            Editar
                          </button>

                          {c.estado === "activo" ? (
                            <button
                              type="button"
                              onClick={() => cambiarEstado(c.id, "inactivo")}
                              className="rounded-lg bg-red-700 px-3 py-1 text-xs font-bold text-white hover:bg-red-800"
                            >
                              Inactivar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => cambiarEstado(c.id, "activo")}
                              className="rounded-lg bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800"
                            >
                              Activar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {detalleId === c.id && (
                      <tr className="bg-slate-50">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="rounded-2xl border bg-white p-5">
                            <div className="flex flex-col gap-4 md:flex-row">
                              {c.logo_url ? (
                                <img
                                  src={c.logo_url}
                                  alt={c.nombre}
                                  className="h-24 w-24 rounded-2xl border bg-white object-contain p-2"
                                />
                              ) : (
                                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border bg-slate-100 text-xs text-slate-400">
                                  Sin logo
                                </div>
                              )}

                              <div className="flex-1">
                                <h3 className="text-xl font-black text-slate-900">
                                  {c.nombre}
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                  {c.direccion || "-"}
                                </p>

                                <p className="mt-2 text-sm text-slate-500">
                                  RNC: {c.rnc || "-"} · Tel: {c.telefono || "-"}{" "}
                                  · Correo: {c.correo || "-"}
                                </p>

                                <div className="mt-5 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                                  <div className="rounded-xl border bg-slate-50 p-3">
                                    <p className="text-slate-500">
                                      Cuota mensual
                                    </p>
                                    <p className="font-bold text-green-700">
                                      RD$ {dinero(c.cuota_mensual)}
                                    </p>
                                  </div>

                                  <div className="rounded-xl border bg-slate-50 p-3">
                                    <p className="text-slate-500">% Mora</p>
                                    <p className="font-semibold">
                                      {c.porcentaje_mora || 0}%
                                    </p>
                                  </div>

                                  <div className="rounded-xl border bg-slate-50 p-3">
                                    <p className="text-slate-500">Día mora</p>
                                    <p className="font-semibold">
                                      Día {c.dia_inicio_mora || 10}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-5 rounded-xl border bg-slate-50 p-3 text-sm">
                                  <p className="font-bold text-slate-800">
                                    Representante contratos
                                  </p>

                                  <p className="text-slate-600">
                                    {c.nombre_representante || "-"} · Cédula:{" "}
                                    {c.cedula_representante || "-"} · Cargo:{" "}
                                    {c.cargo_representante || "-"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}

                {condominiosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay información para mostrar del condominio activo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </SectionCard>
    </PageContainer>
  );
}
