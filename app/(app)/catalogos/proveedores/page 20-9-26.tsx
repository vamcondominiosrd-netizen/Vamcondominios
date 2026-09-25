"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  Building2,
  CalendarDays,
  Download,
  FileSpreadsheet,
  FolderOpen,
  RefreshCw,
  Save,
  Search,
  Settings,
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

type Proveedor = {
  id: number;
  condominio_id: number | null;
  condominio: string | null;
  nombre_proveedor: string | null;
  rnc_cedula: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  cuenta_banco: string | null;
  estado: string | null;
  created_at: string | null;
};

function normalizarTexto(valor: string | null | undefined) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function fechaCorta(valor?: string | null) {
  if (!valor) return "-";
  return String(valor).split("T")[0];
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [condominioId, setCondominioId] = useState("");
  const [condominio, setCondominio] = useState("");

  const [nombreProveedor, setNombreProveedor] = useState("");
  const [rncCedula, setRncCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [cuentaBanco, setCuentaBanco] = useState("");
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    const idGuardado = localStorage.getItem("condominio_id") || "";
    const nombreGuardado =
      localStorage.getItem("condominio_nombre") ||
      localStorage.getItem("condominio") ||
      "";

    if (!idGuardado) {
      alert("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    setCondominioId(idGuardado);
    setCondominio(nombreGuardado || `Condominio ID ${idGuardado}`);

    cargarProveedores(idGuardado);
  }, []);

  async function cargarProveedores(id = condominioId) {
    if (!id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("catalogo_proveedores")
      .select(
        "id, condominio_id, condominio, nombre_proveedor, rnc_cedula, telefono, correo, direccion, cuenta_banco, estado, created_at",
      )
      .eq("condominio_id", Number(id))
      .order("nombre_proveedor", { ascending: true });

    setLoading(false);

    if (error) {
      alert("Error cargando proveedores: " + error.message);
      return;
    }

    setProveedores((data as Proveedor[]) || []);
  }

  function limpiarFormulario() {
    setNombreProveedor("");
    setRncCedula("");
    setTelefono("");
    setCorreo("");
    setDireccion("");
    setCuentaBanco("");
  }

  async function guardarProveedor(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId || !condominio) {
      alert("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    if (!nombreProveedor.trim()) {
      alert("Debe completar el nombre del proveedor.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.from("catalogo_proveedores").insert([
      {
        condominio_id: Number(condominioId),
        condominio,
        nombre_proveedor: nombreProveedor.trim(),
        rnc_cedula: rncCedula.trim(),
        telefono: telefono.trim(),
        correo: correo.trim(),
        direccion: direccion.trim(),
        cuenta_banco: cuentaBanco.trim(),
        estado: "activo",
      },
    ]);

    setGuardando(false);

    if (error) {
      alert("Error guardando proveedor: " + error.message);
      return;
    }

    alert("Proveedor registrado correctamente.");

    limpiarFormulario();
    cargarProveedores(condominioId);
  }

  const proveedoresFiltrados = useMemo(() => {
    const filtro = normalizarTexto(buscar);

    return proveedores.filter((p) => {
      const texto = normalizarTexto(
        `${p.nombre_proveedor || ""} ${p.rnc_cedula || ""} ${
          p.telefono || ""
        } ${p.correo || ""} ${p.cuenta_banco || ""} ${p.direccion || ""}`,
      );

      return !filtro || texto.includes(filtro);
    });
  }, [proveedores, buscar]);

  const activos = useMemo(
    () =>
      proveedoresFiltrados.filter((p) => normalizarTexto(p.estado) === "activo")
        .length,
    [proveedoresFiltrados],
  );

  const inactivos = proveedoresFiltrados.length - activos;

  function exportarExcel() {
    if (proveedoresFiltrados.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const dataExcel = proveedoresFiltrados.map((p) => ({
      Condominio: p.condominio || "",
      Proveedor: p.nombre_proveedor || "",
      "RNC / Cédula": p.rnc_cedula || "",
      Teléfono: p.telefono || "",
      Correo: p.correo || "",
      Dirección: p.direccion || "",
      "Cuenta Banco": p.cuenta_banco || "",
      Estado: p.estado || "",
      "Fecha registro": fechaCorta(p.created_at),
    }));

    const hoja = XLSX.utils.json_to_sheet(dataExcel);

    hoja["!cols"] = [
      { wch: 35 },
      { wch: 35 },
      { wch: 18 },
      { wch: 18 },
      { wch: 30 },
      { wch: 45 },
      { wch: 25 },
      { wch: 15 },
      { wch: 18 },
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Proveedores");

    XLSX.writeFile(
      libro,
      `Catalogo_Proveedores_${(condominio || "Condominio").replaceAll(
        " ",
        "_",
      )}.xlsx`,
    );
  }

  return (
    <PageContainer>
      <ModuleMenu
        title="Catálogos"
        subtitle="Catálogos base del sistema: proveedores, categorías, fondos, áreas sociales, técnicos y parámetros."
        tone="purple"
        items={[
          {
            href: "/catalogos",
            label: "Inicio catálogos",
            icon: FolderOpen,
          },
          {
            href: "/catalogos/proveedores",
            label: "Proveedores",
            icon: Building2,
          },
          {
            href: "/catalogos/categorias-gastos",
            label: "Categorías",
            icon: FolderOpen,
          },
          {
            href: "/catalogos/fondos",
            label: "Fondos",
            icon: WalletCards,
          },
          {
            href: "/areas-sociales",
            label: "Áreas sociales",
            icon: CalendarDays,
          },
          {
            href: "/catalogo-tecnicos",
            label: "Técnicos",
            icon: FileSpreadsheet,
          },
          {
            href: "/catalogos/parametros",
            label: "Parámetros",
            icon: Settings,
          },
        ]}
      />

      <ModuleToolbar
        title="Catálogo de Proveedores"
        subtitle={`Registro, consulta y exportación de proveedores. Condominio: ${
          condominio || "No seleccionado"
        }.`}
        icon={Building2}
        actions={
          <ModuleActions
            onRefresh={() => cargarProveedores(condominioId)}
            extra={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/catalogos"
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </Link>

                <button
                  type="button"
                  onClick={exportarExcel}
                  disabled={proveedoresFiltrados.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Exportar Excel
                </button>
              </div>
            }
          />
        }
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <InfoBox
          label="Total proveedores"
          value={`${proveedoresFiltrados.length}`}
          tone="slate"
        />

        <InfoBox label="Activos" value={`${activos}`} tone="emerald" />

        <InfoBox label="Inactivos" value={`${inactivos}`} tone="amber" />

        <InfoBox
          label="Condominio activo"
          value={condominio || "No seleccionado"}
          tone="blue"
          compact
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="xl:col-span-1">
          <SectionCard
            title="Registrar proveedor"
            subtitle="Complete los datos principales del proveedor."
          >
            <form onSubmit={guardarProveedor} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Condominio
                </label>

                <input
                  type="text"
                  value={condominio}
                  disabled
                  className="w-full rounded-xl border bg-slate-100 px-4 py-3 text-sm text-slate-700"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Nombre del proveedor *
                </label>

                <input
                  type="text"
                  value={nombreProveedor}
                  onChange={(e) => setNombreProveedor(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="Nombre comercial o razón social"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  RNC / Cédula
                </label>

                <input
                  type="text"
                  value={rncCedula}
                  onChange={(e) => setRncCedula(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="RNC o cédula"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Teléfono
                </label>

                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="809-000-0000"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Correo
                </label>

                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="correo@proveedor.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Cuenta de banco
                </label>

                <input
                  type="text"
                  value={cuentaBanco}
                  onChange={(e) => setCuentaBanco(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="Número de cuenta bancaria"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Dirección
                </label>

                <textarea
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  rows={3}
                  placeholder="Dirección del proveedor"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {guardando ? "Guardando..." : "Guardar proveedor"}
                </button>

                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-700 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Limpiar
                </button>
              </div>
            </form>
          </SectionCard>
        </section>

        <section className="xl:col-span-2">
          <SectionCard
            title="Listado de proveedores"
            subtitle="Mostrando solamente proveedores del condominio activo."
            action={
              loading ? (
                <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Cargando
                </div>
              ) : (
                <div className="rounded-xl bg-purple-50 px-4 py-2 text-sm font-black text-purple-700">
                  Registros: {proveedoresFiltrados.length}
                </div>
              )
            }
          >
            <div className="mb-4">
              <label className="mb-1 block text-sm font-semibold">Buscar</label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />

                <input
                  type="text"
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  className="w-full rounded-xl border px-10 py-3 text-sm"
                  placeholder="Buscar por proveedor, RNC, teléfono, correo, cuenta o dirección..."
                />
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">
                Cargando proveedores...
              </p>
            ) : !condominioId ? (
              <EmptyState
                title="Condominio no identificado"
                description="No se encontró un condominio activo. Debe iniciar sesión nuevamente."
              />
            ) : proveedoresFiltrados.length === 0 ? (
              <EmptyState
                title="Sin proveedores"
                description="No hay proveedores registrados o no coinciden con la búsqueda."
              />
            ) : (
              <DataTable>
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Proveedor</th>
                    <th className="px-4 py-3 text-left">RNC / Cédula</th>
                    <th className="px-4 py-3 text-left">Teléfono</th>
                    <th className="px-4 py-3 text-left">Correo</th>
                    <th className="px-4 py-3 text-left">Cuenta Banco</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {proveedoresFiltrados.map((p) => (
                    <tr key={p.id} className="bg-white hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-black text-slate-900">
                            {p.nombre_proveedor || "-"}
                          </p>
                          <p className="mt-1 max-w-[320px] truncate text-xs text-slate-500">
                            {p.direccion || "Sin dirección registrada"}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3">{p.rnc_cedula || "-"}</td>
                      <td className="px-4 py-3">{p.telefono || "-"}</td>
                      <td className="px-4 py-3">{p.correo || "-"}</td>
                      <td className="px-4 py-3">{p.cuenta_banco || "-"}</td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                            normalizarTexto(p.estado) === "activo"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {p.estado || "activo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </SectionCard>
        </section>
      </div>

      <SectionCard
        title="Flujo recomendado"
        subtitle="Orden sugerido para mantener el catálogo de proveedores actualizado."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FlujoPaso
            numero="1"
            titulo="Registrar"
            descripcion="Crear proveedores con datos de contacto y cuenta bancaria."
          />

          <FlujoPaso
            numero="2"
            titulo="Validar"
            descripcion="Confirmar RNC, teléfono, correo y datos bancarios."
          />

          <FlujoPaso
            numero="3"
            titulo="Usar"
            descripcion="Seleccionar proveedores en gastos y solicitudes de pago."
          />

          <FlujoPaso
            numero="4"
            titulo="Exportar"
            descripcion="Generar respaldo en Excel para revisión administrativa."
          />
        </div>
      </SectionCard>
    </PageContainer>
  );
}

function InfoBox({
  label,
  value,
  tone = "slate",
  compact = false,
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "amber" | "blue";
  compact?: boolean;
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : tone === "blue"
          ? "bg-blue-50 text-blue-700 border-blue-100"
          : "bg-white text-slate-800 border-slate-200";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-bold opacity-80">{label}</p>
      <h2
        className={`mt-2 font-black ${
          compact ? "truncate text-lg" : "text-2xl"
        }`}
        title={value}
      >
        {value}
      </h2>
    </div>
  );
}

function FlujoPaso({
  numero,
  titulo,
  descripcion,
}: {
  numero: string;
  titulo: string;
  descripcion: string;
}) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-purple-700 text-sm font-black text-white">
        {numero}
      </div>

      <p className="font-black text-slate-900">{titulo}</p>

      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {descripcion}
      </p>
    </div>
  );
}
