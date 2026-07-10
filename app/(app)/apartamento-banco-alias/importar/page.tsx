"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Download,
  FileSpreadsheet,
  Filter,
  ListChecks,
  Pencil,
  RefreshCw,
  Save,
  Search,
  SearchCheck,
  Trash2,
  UploadCloud,
  WalletCards,
} from "lucide-react";
import * as XLSX from "xlsx";

import { supabase } from "@/app/lib/supabaseClient";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import ModuleMenu from "@/components/vam/enterprise/ModuleMenu";
import ModuleToolbar from "@/components/vam/enterprise/ModuleToolbar";
import ModuleActions from "@/components/vam/enterprise/ModuleActions";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import DataTable from "@/components/vam/enterprise/DataTable";
import EmptyState from "@/components/vam/enterprise/EmptyState";

type Unidad = {
  id: number;
  condominio_id: number;
  codigo: string;
  propietario_nombre: string;
  activa: boolean;
};

type AliasRow = {
  condominio_id: number;
  condominio: string;
  unidad_id: number | null;
  no_apartamento: string;
  propietario: string;
  descripcion_banco: string;
  estado: string;
};

type AliasGuardado = {
  id: number;
  condominio_id: number;
  condominio: string;
  unidad_id: number | null;
  no_apartamento: string;
  propietario: string;
  descripcion_banco: string;
  estado: string;
  created_at: string;
};

function obtenerValor(row: any, posiblesNombres: string[]) {
  const keys = Object.keys(row);

  for (const nombre of posiblesNombres) {
    const key = keys.find(
      (k) => k.trim().toLowerCase() === nombre.trim().toLowerCase(),
    );

    if (key) return row[key];
  }

  return "";
}

function limpiarTexto(texto: string) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fechaCorta(valor?: string | null) {
  if (!valor) return "-";
  return String(valor).split("T")[0];
}

function estadoRealAlias(item: AliasGuardado) {
  if (!item.unidad_id || item.estado === "Pendiente") return "Pendiente";
  return item.estado || "Activo";
}

export default function ImportarCuentasBancoPropietariosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [rows, setRows] = useState<AliasRow[]>([]);
  const [aliasGuardados, setAliasGuardados] = useState<AliasGuardado[]>([]);

  const [loading, setLoading] = useState(false);
  const [cargandoUnidades, setCargandoUnidades] = useState(false);
  const [cargandoAlias, setCargandoAlias] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [nombreArchivoActual, setNombreArchivoActual] = useState("");

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editUnidadId, setEditUnidadId] = useState("");
  const [editNoApartamento, setEditNoApartamento] = useState("");
  const [editPropietario, setEditPropietario] = useState("");
  const [editDescripcionBanco, setEditDescripcionBanco] = useState("");
  const [editEstado, setEditEstado] = useState("Activo");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    cargarUnidades(id);
    cargarAliasGuardados(id);
  }, []);

  async function cargarUnidades(id: string) {
    setCargandoUnidades(true);

    const { data, error } = await supabase
      .from("unidades")
      .select("id, condominio_id, codigo, propietario_nombre, activa")
      .eq("condominio_id", Number(id))
      .eq("activa", true)
      .order("codigo", { ascending: true });

    setCargandoUnidades(false);

    if (error) {
      alert("Error cargando apartamentos: " + error.message);
      setUnidades([]);
      return;
    }

    setUnidades((data as Unidad[]) || []);
  }

  async function cargarAliasGuardados(id: string) {
    setCargandoAlias(true);

    const { data, error } = await supabase
      .from("apartamento_banco_alias")
      .select(
        "id, condominio_id, condominio, unidad_id, no_apartamento, propietario, descripcion_banco, estado, created_at",
      )
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false });

    setCargandoAlias(false);

    if (error) {
      alert("Error cargando alias banco propietarios: " + error.message);
      setAliasGuardados([]);
      return;
    }

    setAliasGuardados((data as AliasGuardado[]) || []);
  }

  async function refrescar() {
    if (!condominioId) return;

    await Promise.all([
      cargarUnidades(condominioId),
      cargarAliasGuardados(condominioId),
    ]);
  }

  function buscarUnidad(noApartamento: string) {
    const aptoLimpio = limpiarTexto(noApartamento);

    return (
      unidades.find((unidad) => limpiarTexto(unidad.codigo) === aptoLimpio) ||
      null
    );
  }

  function seleccionarUnidadEditar(id: string) {
    setEditUnidadId(id);

    if (!id) {
      setEditNoApartamento("");
      setEditPropietario("");
      setEditEstado("Pendiente");
      return;
    }

    const unidad = unidades.find((item) => String(item.id) === id);

    if (!unidad) {
      setEditNoApartamento("");
      setEditPropietario("");
      setEditEstado("Pendiente");
      return;
    }

    setEditNoApartamento(unidad.codigo || "");
    setEditPropietario(unidad.propietario_nombre || "");
    setEditEstado("Activo");
  }

  function descargarPlantilla() {
    const data = [
      {
        "No Apartamento": "",
        "Descripción Banco": "",
      },
      {
        "No Apartamento": "A1",
        "Descripción Banco": "PAGO MANTENIMIENTO A1",
      },
    ];

    const hoja = XLSX.utils.json_to_sheet(data);
    const libro = XLSX.utils.book_new();

    hoja["!cols"] = [{ wch: 18 }, { wch: 45 }];

    XLSX.utils.book_append_sheet(libro, hoja, "Alias Banco");
    XLSX.writeFile(libro, "plantilla-alias-banco-propietarios.xlsx");
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    if (unidades.length === 0) {
      alert("No hay apartamentos cargados para este condominio.");
      return;
    }

    setNombreArchivoActual(file.name);
    setRows([]);

    const reader = new FileReader();

    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const json: any[] = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
      });

      const mappedRaw: AliasRow[] = json
        .map((r) => {
          const noApartamento = String(
            obtenerValor(r, [
              "No Apartamento",
              "No. Apartamento",
              "Apartamento",
              "Unidad",
              "No Unidad",
              "Codigo",
              "Código",
              "Apto",
              "Apt",
            ]) || "",
          ).trim();

          const descripcionBanco = String(
            obtenerValor(r, [
              "Descripcion Banco",
              "Descripción Banco",
              "Descripcion",
              "Descripción",
              "Alias Banco",
              "Banco",
              "Concepto Banco",
              "Referencia Banco",
              "Referencia",
              "Detalle",
              "Concepto",
            ]) || "",
          ).trim();

          const unidad = buscarUnidad(noApartamento);

          return {
            condominio_id: Number(condominioId),
            condominio: condominioNombre,
            unidad_id: unidad?.id || null,
            no_apartamento: noApartamento,
            propietario: unidad?.propietario_nombre || "",
            descripcion_banco: descripcionBanco,
            estado: unidad ? "Activo" : "Pendiente",
          };
        })
        .filter((r) => r.descripcion_banco);

      const mapa = new Map<string, AliasRow>();

      mappedRaw.forEach((row) => {
        const clave = `${limpiarTexto(row.no_apartamento)}|${limpiarTexto(
          row.descripcion_banco,
        )}`;

        mapa.set(clave, row);
      });

      const mapped = Array.from(mapa.values());

      setRows(mapped);

      if (mapped.length === 0) {
        alert(
          "El archivo no contiene registros válidos. Verifique que tenga No Apartamento y Descripción Banco.",
        );
      }
    };

    reader.readAsArrayBuffer(file);
  }

  async function guardarEnSupabase() {
    if (!condominioId || !condominioNombre) {
      alert("No se encontró el condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    if (rows.length === 0) {
      alert("No hay datos para importar.");
      return;
    }

    const registrosValidos = rows.filter((r) => r.descripcion_banco);

    if (registrosValidos.length === 0) {
      alert("No hay registros válidos para importar.");
      return;
    }

    const confirmar = confirm(
      `Se importarán ${registrosValidos.length} alias bancarios para ${condominioNombre}. ¿Desea continuar?`,
    );

    if (!confirmar) return;

    setLoading(true);

    const { error } = await supabase
      .from("apartamento_banco_alias")
      .insert(registrosValidos);

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Error al guardar los datos: " + error.message);
      return;
    }

    alert("Alias banco propietarios importados correctamente.");

    setRows([]);
    setNombreArchivoActual("");
    cargarAliasGuardados(condominioId);
  }

  function editarAlias(item: AliasGuardado) {
    setEditandoId(item.id);
    setEditUnidadId(item.unidad_id ? String(item.unidad_id) : "");
    setEditNoApartamento(item.no_apartamento || "");
    setEditPropietario(item.propietario || "");
    setEditDescripcionBanco(item.descripcion_banco || "");
    setEditEstado(item.estado || "Activo");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setEditUnidadId("");
    setEditNoApartamento("");
    setEditPropietario("");
    setEditDescripcionBanco("");
    setEditEstado("Activo");
  }

  async function guardarActualizacionAlias(e: React.FormEvent) {
    e.preventDefault();

    if (!editandoId) {
      alert("Debe seleccionar un registro para actualizar.");
      return;
    }

    if (!editDescripcionBanco.trim()) {
      alert("Debe indicar la descripción banco.");
      return;
    }

    const registro = {
      unidad_id: editUnidadId ? Number(editUnidadId) : null,
      no_apartamento: editNoApartamento.trim(),
      propietario: editPropietario.trim(),
      descripcion_banco: editDescripcionBanco.trim(),
      estado: editUnidadId ? editEstado : "Pendiente",
    };

    const { error } = await supabase
      .from("apartamento_banco_alias")
      .update(registro)
      .eq("id", editandoId)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error actualizando alias banco propietario: " + error.message);
      return;
    }

    alert("Alias banco propietario actualizado correctamente.");

    cancelarEdicion();
    cargarAliasGuardados(condominioId);
  }

  async function cambiarEstado(item: AliasGuardado, nuevoEstado: string) {
    const confirmar = confirm(
      `¿Desea cambiar este alias bancario a estado "${nuevoEstado}"?`,
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("apartamento_banco_alias")
      .update({ estado: nuevoEstado })
      .eq("id", item.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error actualizando estado: " + error.message);
      return;
    }

    alert("Estado actualizado correctamente.");
    cargarAliasGuardados(condominioId);
  }

  async function eliminarAlias(item: AliasGuardado) {
    const confirmar = confirm(
      `¿Seguro que desea eliminar la referencia bancaria "${item.descripcion_banco}" del apartamento ${
        item.no_apartamento || "sin asignar"
      }?`,
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("apartamento_banco_alias")
      .delete()
      .eq("id", item.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error eliminando alias banco propietario: " + error.message);
      return;
    }

    alert("Registro eliminado correctamente.");
    cargarAliasGuardados(condominioId);
  }

  const aliasFiltrados = useMemo(() => {
    return aliasGuardados.filter((item) => {
      const texto = `${item.no_apartamento || ""} ${item.propietario || ""} ${
        item.descripcion_banco || ""
      } ${item.estado || ""}`
        .toLowerCase()
        .trim();

      const coincideBusqueda = texto.includes(busqueda.toLowerCase().trim());

      const estadoReal = estadoRealAlias(item);

      const coincideEstado =
        filtroEstado === "Todos" ? true : estadoReal === filtroEstado;

      return coincideBusqueda && coincideEstado;
    });
  }, [aliasGuardados, busqueda, filtroEstado]);

  function exportarExcel() {
    if (aliasFiltrados.length === 0) {
      alert("No hay información para exportar.");
      return;
    }

    const data = aliasFiltrados.map((item) => ({
      Condominio: item.condominio || condominioNombre,
      "No. Apartamento": item.no_apartamento || "",
      Propietario: item.propietario || "",
      "Descripción Banco": item.descripcion_banco || "",
      Estado: estadoRealAlias(item),
      "Unidad ID": item.unidad_id || "",
      "Fecha Registro": fechaCorta(item.created_at),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    worksheet["!cols"] = [
      { wch: 35 },
      { wch: 18 },
      { wch: 35 },
      { wch: 55 },
      { wch: 18 },
      { wch: 12 },
      { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Alias Banco");

    const nombreArchivo = `apartamento-banco-alias-${
      condominioNombre || "condominio"
    }.xlsx`
      .replace(/\s+/g, "-")
      .toLowerCase();

    XLSX.writeFile(workbook, nombreArchivo);
  }

  const totalSinUnidad = rows.filter((r) => !r.unidad_id).length;
  const totalConUnidad = rows.filter((r) => r.unidad_id).length;

  const totalGuardados = aliasGuardados.length;

  const totalActivos = aliasGuardados.filter(
    (item) => estadoRealAlias(item) === "Activo",
  ).length;

  const totalPendientes = aliasGuardados.filter(
    (item) => estadoRealAlias(item) === "Pendiente",
  ).length;

  const totalInactivos = aliasGuardados.filter(
    (item) => estadoRealAlias(item) === "Inactivo",
  ).length;

  const registroEditando = aliasGuardados.find(
    (item) => item.id === editandoId,
  );

  return (
    <PageContainer>
      <ModuleMenu
        title="Pagos Bancarios"
        subtitle="Importación, alias, identificación y validación de pagos."
        tone="blue"
        items={[
          {
            href: "/importar-banco",
            label: "Importar banco",
            icon: Banknote,
          },
          {
            href: "/importar-cuentas-banco-propietarios",
            label: "Alias banco",
            icon: WalletCards,
          },
          {
            href: "/identificar-pagos",
            label: "Identificar pagos",
            icon: SearchCheck,
          },
          {
            href: "/pagos-identificados",
            label: "Pagos identificados",
            icon: ListChecks,
          },
        ]}
      />

      <ModuleToolbar
        title="Importar Alias Banco Propietarios"
        subtitle={`Registro de alias bancarios para identificar pagos automáticamente. Condominio: ${
          condominioNombre || "No identificado"
        }.`}
        icon={UploadCloud}
        actions={
          <ModuleActions
            onRefresh={refrescar}
            extra={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={descargarPlantilla}
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Plantilla
                </button>

                <button
                  type="button"
                  onClick={exportarExcel}
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar
                </button>
              </div>
            }
          />
        }
      />

      {!condominioId && (
        <SectionCard
          title="Condominio no identificado"
          subtitle="No se encontró el condominio activo."
        >
          <EmptyState
            title="Debe iniciar sesión nuevamente"
            description="El sistema no pudo identificar el condominio activo para importar alias bancarios."
          />
        </SectionCard>
      )}

      {editandoId && registroEditando && (
        <SectionCard
          title="Actualizar alias banco propietario"
          subtitle="Seleccione el apartamento correcto y ajuste la descripción bancaria."
          action={
            <button
              type="button"
              onClick={cancelarEdicion}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          }
        >
          <div className="mb-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm font-black uppercase text-yellow-800">
              Registro seleccionado
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <InfoLine
                label="Apartamento actual"
                value={registroEditando.no_apartamento || "-"}
              />
              <InfoLine
                label="Propietario"
                value={registroEditando.propietario || "-"}
              />
              <InfoLine
                label="Estado"
                value={estadoRealAlias(registroEditando)}
                danger={estadoRealAlias(registroEditando) === "Pendiente"}
              />
            </div>
          </div>

          <form
            onSubmit={guardarActualizacionAlias}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div>
              <label className="mb-1 block text-sm font-semibold">
                Apartamento correcto
              </label>

              <select
                value={editUnidadId}
                onChange={(e) => seleccionarUnidadEditar(e.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
              >
                <option value="">Seleccione apartamento</option>

                {unidades.map((unidad) => (
                  <option key={unidad.id} value={unidad.id}>
                    {unidad.codigo} - {unidad.propietario_nombre}
                  </option>
                ))}
              </select>

              {!editUnidadId && (
                <p className="mt-1 text-xs font-semibold text-yellow-700">
                  Si no selecciona apartamento, quedará como Pendiente.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                No. Apartamento
              </label>

              <input
                value={editNoApartamento}
                onChange={(e) => setEditNoApartamento(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
                placeholder="Ej. C2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Propietario
              </label>

              <input
                value={editPropietario}
                onChange={(e) => setEditPropietario(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
                placeholder="Nombre del propietario"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">Estado</label>

              <select
                value={editEstado}
                onChange={(e) => setEditEstado(e.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
                disabled={!editUnidadId}
              >
                <option value="Activo">Activo</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold">
                Descripción / alias banco *
              </label>

              <textarea
                value={editDescripcionBanco}
                onChange={(e) => setEditDescripcionBanco(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
                rows={3}
                placeholder="Texto que aparece en la descripción del banco"
              />
            </div>

            <div className="flex flex-col gap-3 md:col-span-2 md:flex-row">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800"
              >
                <Save className="h-4 w-4" />
                Guardar actualización
              </button>

              <button
                type="button"
                onClick={cancelarEdicion}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                Cancelar
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="xl:col-span-2">
          <SectionCard
            title="Cargar archivo de alias bancarios"
            subtitle="Seleccione un archivo Excel o CSV para registrar referencias bancarias por apartamento."
            action={
              <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                {nombreArchivoActual || "Sin archivo seleccionado"}
              </div>
            }
          >
            <div className="space-y-5">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <UploadCloud className="mt-1 h-5 w-5 text-blue-700" />

                  <div>
                    <p className="text-sm font-black uppercase text-blue-800">
                      Importación de alias bancarios
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      Estos alias ayudan al sistema a relacionar la descripción
                      del banco con el apartamento y propietario correcto.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Seleccionar archivo Excel o CSV
                </label>

                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFile}
                  className="block w-full rounded-xl border bg-white px-4 py-3 text-sm"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Columnas esperadas: No Apartamento y Descripción Banco. También
                  acepta Apartamento, Unidad, Código, Alias Banco, Referencia o
                  Concepto.
                </p>
              </div>

              {rows.length > 0 && (
                <button
                  type="button"
                  onClick={guardarEnSupabase}
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {loading ? "Guardando..." : "Guardar alias banco propietarios"}
                </button>
              )}
            </div>
          </SectionCard>
        </section>

        <section className="space-y-5">
          <SectionCard title="Condominio activo" subtitle="Datos actuales.">
            <div className="space-y-3">
              <InfoLine
                label="Condominio"
                value={condominioNombre || "No identificado"}
              />
              <InfoLine
                label="Apartamentos activos"
                value={`${unidades.length}`}
                highlight
              />
              <InfoLine
                label="Alias registrados"
                value={`${totalGuardados}`}
              />
              <InfoLine
                label="Pendientes"
                value={`${totalPendientes}`}
                danger={totalPendientes > 0}
              />
            </div>

            {cargandoUnidades && (
              <p className="mt-3 text-sm text-slate-500">
                Cargando apartamentos...
              </p>
            )}
          </SectionCard>

          <SectionCard
            title="Plantilla"
            subtitle="Formato base para importar correctamente."
          >
            <button
              type="button"
              onClick={descargarPlantilla}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800"
            >
              <Download className="h-4 w-4" />
              Descargar plantilla Excel
            </button>
          </SectionCard>
        </section>
      </div>

      {rows.length > 0 && (
        <section className="space-y-5">
          <SectionCard
            title="Revisión previa antes de guardar"
            subtitle={`Archivo seleccionado: ${nombreArchivoActual || "Sin nombre"}`}
            action={
              totalSinUnidad > 0 ? (
                <div className="rounded-xl bg-yellow-50 px-4 py-2 text-sm font-black text-yellow-700">
                  Pendientes: {totalSinUnidad}
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                  Todo identificado
                </div>
              )
            }
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <InfoBox label="Registros leídos" value={`${rows.length}`} />
              <InfoBox
                label="Con apartamento"
                value={`${totalConUnidad}`}
                tone="emerald"
              />
              <InfoBox
                label="Pendientes"
                value={`${totalSinUnidad}`}
                tone="yellow"
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Vista previa del archivo actual"
            subtitle="Revise estos alias antes de importarlos."
          >
            <DataTable>
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">No. Apartamento</th>
                  <th className="px-4 py-3 text-left">Propietario</th>
                  <th className="px-4 py-3 text-left">Descripción Banco</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {rows.map((r, i) => (
                  <tr key={i} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 font-black">
                      {r.no_apartamento || "-"}
                    </td>

                    <td className="px-4 py-3">
                      {r.propietario || (
                        <span className="font-bold text-yellow-700">
                          Pendiente de actualizar
                        </span>
                      )}
                    </td>

                    <td className="max-w-[520px] truncate px-4 py-3">
                      {r.descripcion_banco}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <EstadoBadge estado={r.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </SectionCard>
        </section>
      )}

      <SectionCard
        title="Alias banco propietarios cargados"
        subtitle="Listado de referencias bancarias registradas para identificar automáticamente los pagos."
        action={
          cargandoAlias ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
              <Filter className="h-4 w-4" />
              Registros: {aliasFiltrados.length}
            </div>
          )
        }
      >
        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Total cargados</p>
            <h2 className="mt-1 text-3xl font-black text-slate-900">
              {totalGuardados}
            </h2>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Activos</p>
            <h2 className="mt-1 text-3xl font-black text-emerald-700">
              {totalActivos}
            </h2>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Pendientes</p>
            <h2 className="mt-1 text-3xl font-black text-yellow-700">
              {totalPendientes}
            </h2>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Inactivos</p>
            <h2 className="mt-1 text-3xl font-black text-red-700">
              {totalInactivos}
            </h2>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-semibold">Estado</label>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="Todos">Todos</option>
              <option value="Activo">Activo</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold">Buscar</label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />

              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-xl border px-10 py-3 text-sm"
                placeholder="Buscar por apartamento, propietario o descripción banco..."
              />
            </div>
          </div>
        </div>

        {cargandoAlias ? (
          <p className="text-sm text-slate-500">
            Cargando alias banco propietarios...
          </p>
        ) : aliasFiltrados.length === 0 ? (
          <EmptyState
            title="Sin registros"
            description="No hay alias banco propietarios cargados para esta consulta."
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-300 bg-white">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-900">
                  <th className="border border-slate-300 px-4 py-4 text-left font-black">
                    No
                    <br />
                    Apartamento
                  </th>

                  <th className="border border-slate-300 px-4 py-4 text-left font-black">
                    Propietario
                  </th>

                  <th className="border border-slate-300 px-4 py-4 text-left font-black">
                    Descripción Banco
                  </th>

                  <th className="border border-slate-300 px-4 py-4 text-center font-black">
                    Estado
                  </th>

                  <th className="border border-slate-300 px-4 py-4 text-center font-black">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {aliasFiltrados.map((item) => {
                  const estadoReal = estadoRealAlias(item);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="w-[130px] border border-slate-300 px-4 py-5 align-middle font-black text-slate-900">
                        {item.no_apartamento || "-"}
                      </td>

                      <td className="w-[280px] border border-slate-300 px-4 py-5 align-middle text-slate-900">
                        {item.propietario || (
                          <span className="font-bold text-yellow-700">
                            Pendiente de actualizar
                          </span>
                        )}
                      </td>

                      <td className="border border-slate-300 px-4 py-5 align-middle text-slate-900">
                        {item.descripcion_banco || "-"}
                      </td>

                      <td className="w-[110px] border border-slate-300 px-4 py-5 text-center align-middle">
                        <EstadoBadge estado={estadoReal} />
                      </td>

                      <td className="w-[160px] border border-slate-300 px-4 py-5 text-center align-middle">
                        <div className="flex flex-col items-center gap-2">
                          <button
                            type="button"
                            onClick={() => editarAlias(item)}
                            className="inline-flex w-[90px] items-center justify-center rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800"
                          >
                            Actualizar
                          </button>

                          {item.estado !== "Activo" && item.unidad_id ? (
                            <button
                              type="button"
                              onClick={() => cambiarEstado(item, "Activo")}
                              className="inline-flex w-[90px] items-center justify-center rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white hover:bg-emerald-800"
                            >
                              Activar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => cambiarEstado(item, "Inactivo")}
                              className="inline-flex w-[90px] items-center justify-center rounded-lg bg-yellow-700 px-3 py-2 text-xs font-black text-white hover:bg-yellow-800"
                            >
                              Inactivar
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => eliminarAlias(item)}
                            className="inline-flex w-[90px] items-center justify-center rounded-lg bg-red-700 px-3 py-2 text-xs font-black text-white hover:bg-red-800"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const e = estado || "Activo";

  const className =
    e === "Pendiente"
      ? "bg-yellow-50 text-yellow-700"
      : e === "Inactivo"
        ? "bg-red-50 text-red-700"
        : "bg-emerald-50 text-emerald-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${className}`}>
      {e}
    </span>
  );
}

function InfoBox({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "red" | "blue" | "yellow";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "red"
        ? "bg-red-50 text-red-700 border-red-100"
        : tone === "blue"
          ? "bg-blue-50 text-blue-700 border-blue-100"
          : tone === "yellow"
            ? "bg-yellow-50 text-yellow-700 border-yellow-100"
            : "bg-white text-slate-800 border-slate-200";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2 className="mt-2 text-2xl font-black">{value}</h2>
    </div>
  );
}

function InfoLine({
  label,
  value,
  highlight = false,
  danger = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-600">{label}</span>

      <span
        className={`text-right text-sm font-black ${
          danger
            ? "text-red-700"
            : highlight
              ? "text-blue-700"
              : "text-slate-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}