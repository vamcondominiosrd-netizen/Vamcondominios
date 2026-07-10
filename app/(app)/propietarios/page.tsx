"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  UserRound,
  Users,
  CheckCircle,
} from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";
import * as XLSX from "xlsx";

import PageContainer from "@/components/vam/enterprise/PageContainer";
import PageHeader from "@/components/vam/enterprise/PageHeader";
import StatCard from "@/components/vam/enterprise/StatCard";
import SectionCard from "@/components/vam/enterprise/SectionCard";
import ActionBar from "@/components/vam/enterprise/ActionBar";

type Banco = {
  id: number;
  nombre_banco: string;
  codigo_banco: string | null;
  activo: boolean | null;
};

type Propietario = {
  id: number;
  condominio_id: number;
  no_apartamento: string;
  nombre_propietario: string;
  cedula: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  cuenta_banco: string | null;
  banco_id: number | null;
  tipo_cuenta: string | null;
  titular_cuenta: string | null;
  estado: string;
  catalogo_bancos?: {
    nombre_banco: string | null;
  } | null;
};

export default function PropietariosPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);

  const [propietarios, setPropietarios] = useState<Propietario[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);

  const [buscar, setBuscar] = useState("");
  const [loading, setLoading] = useState(false);
  const [importando, setImportando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [noApartamento, setNoApartamento] = useState("");
  const [nombrePropietario, setNombrePropietario] = useState("");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [cuentaBanco, setCuentaBanco] = useState("");
  const [bancoId, setBancoId] = useState("");
  const [tipoCuenta, setTipoCuenta] = useState("");
  const [titularCuenta, setTitularCuenta] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id");
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      router.push("/login");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre);

    cargarCondominio(id);
    cargarBancos();
    cargarPropietarios(id);
  }, [router]);

  async function cargarCondominio(id: string) {
    const { data } = await supabase
      .from("condominios")
      .select("client_id")
      .eq("id", Number(id))
      .single();

    setClientId(data?.client_id ?? null);
  }

  async function cargarBancos() {
    const { data, error } = await supabase
      .from("catalogo_bancos")
      .select("id, nombre_banco, codigo_banco, activo")
      .eq("activo", true)
      .order("nombre_banco", { ascending: true });

    if (error) {
      alert("Error cargando bancos: " + error.message);
      setBancos([]);
      return;
    }

    setBancos((data as Banco[]) || []);
  }

  async function cargarPropietarios(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("propietarios_apartamentos")
      .select(`
        id,
        condominio_id,
        no_apartamento,
        nombre_propietario,
        cedula,
        telefono,
        correo,
        direccion,
        cuenta_banco,
        banco_id,
        tipo_cuenta,
        titular_cuenta,
        estado,
        catalogo_bancos (
          nombre_banco
        )
      `)
      .eq("condominio_id", Number(id))
      .order("no_apartamento", { ascending: true });

    setLoading(false);

    if (error) {
      alert("Error cargando propietarios: " + error.message);
      setPropietarios([]);
      return;
    }

    setPropietarios((data as Propietario[]) || []);
  }

  async function actualizarUnidadesDesdePropietarios(id: string) {
    const { error } = await supabase.rpc("actualizar_unidades_propietarios", {
      p_condominio_id: Number(id),
    });

    if (error) {
      alert(
        "Propietarios cargados, pero no se actualizaron las unidades: " +
          error.message
      );
    }
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setNoApartamento("");
    setNombrePropietario("");
    setCedula("");
    setTelefono("");
    setCorreo("");
    setDireccion("");
    setCuentaBanco("");
    setBancoId("");
    setTipoCuenta("");
    setTitularCuenta("");
  }

  function editarPropietario(p: Propietario) {
    setEditandoId(p.id);
    setMostrarFormulario(true);
    setNoApartamento(p.no_apartamento || "");
    setNombrePropietario(p.nombre_propietario || "");
    setCedula(p.cedula || "");
    setTelefono(p.telefono || "");
    setCorreo(p.correo || "");
    setDireccion(p.direccion || "");
    setCuentaBanco(p.cuenta_banco || "");
    setBancoId(p.banco_id ? String(p.banco_id) : "");
    setTipoCuenta(p.tipo_cuenta || "");
    setTitularCuenta(p.titular_cuenta || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buscarBancoPorNombreONcodigo(valor: string) {
    const texto = String(valor || "").trim().toLowerCase();

    if (!texto) return null;

    return (
      bancos.find((b) => {
        const nombre = String(b.nombre_banco || "").trim().toLowerCase();
        const codigo = String(b.codigo_banco || "").trim().toLowerCase();

        return nombre === texto || codigo === texto;
      }) || null
    );
  }

  async function guardarPropietario(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId) {
      router.push("/login");
      return;
    }

    if (!noApartamento || !nombrePropietario) {
      alert("Debe completar apartamento y nombre del propietario.");
      return;
    }

    const registro: any = {
      condominio_id: Number(condominioId),
      condominio: condominioNombre,
      no_apartamento: noApartamento.trim().toUpperCase(),
      nombre_propietario: nombrePropietario.trim(),
      cedula: cedula.trim() || null,
      telefono: telefono.trim() || null,
      correo: correo.trim() || null,
      direccion: direccion.trim() || null,
      cuenta_banco: cuentaBanco.trim() || null,
      banco_id: bancoId ? Number(bancoId) : null,
      tipo_cuenta: tipoCuenta || null,
      titular_cuenta: titularCuenta.trim() || null,
      estado: "activo",
    };

    if (clientId) {
      registro.client_id = clientId;
    }

    if (editandoId) {
      const { error } = await supabase
        .from("propietarios_apartamentos")
        .update(registro)
        .eq("id", editandoId)
        .eq("condominio_id", Number(condominioId));

      if (error) {
        alert("Error modificando propietario: " + error.message);
        return;
      }

      alert("Propietario modificado correctamente.");
    } else {
      const { error } = await supabase
        .from("propietarios_apartamentos")
        .insert([registro]);

      if (error) {
        alert("Error guardando propietario: " + error.message);
        return;
      }

      alert("Propietario registrado correctamente.");
    }

    await actualizarUnidadesDesdePropietarios(condominioId);
    limpiarFormulario();
    setMostrarFormulario(false);
    await cargarPropietarios(condominioId);
  }

  async function borrarPropietario(p: Propietario) {
    const confirmar = confirm(
      `¿Seguro que desea borrar el propietario ${p.nombre_propietario} del apartamento ${p.no_apartamento}?`
    );

    if (!confirmar) return;

    await supabase.rpc("limpiar_unidades_propietario", {
      p_propietario_id: p.id,
    });

    const { error } = await supabase
      .from("propietarios_apartamentos")
      .delete()
      .eq("id", p.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error borrando propietario: " + error.message);
      return;
    }

    alert("Propietario borrado correctamente.");
    await cargarPropietarios(condominioId);
  }

  async function importarExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];

    if (!archivo) return;

    if (!condominioId) {
      alert("Debe seleccionar un condominio desde el login.");
      return;
    }

    setImportando(true);

    try {
      const buffer = await archivo.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const filas: any[] = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
      });

      const registros = filas
        .map((fila) => {
          const apartamento =
            fila["Apartamento"] ||
            fila["APARTAMENTO"] ||
            fila["No. Apartamento"] ||
            fila["No Apartamento"] ||
            fila["Unidad"] ||
            fila["UNIDAD"] ||
            fila["Codigo"] ||
            fila["Código"] ||
            fila["codigo"] ||
            fila["no_apartamento"] ||
            "";

          const propietario =
            fila["Propietario"] ||
            fila["PROPIETARIO"] ||
            fila["Nombre"] ||
            fila["NOMBRE"] ||
            fila["Nombre Propietario"] ||
            fila["Nombre del Propietario"] ||
            fila["nombre_propietario"] ||
            "";

          if (!apartamento || !propietario) return null;

          const bancoTexto =
            fila["Banco"] ||
            fila["BANCO"] ||
            fila["Nombre Banco"] ||
            fila["Nombre del Banco"] ||
            fila["codigo_banco"] ||
            fila["Código Banco"] ||
            "";

          const bancoEncontrado = buscarBancoPorNombreONcodigo(
            String(bancoTexto)
          );

          const registro: any = {
            condominio_id: Number(condominioId),
            condominio: condominioNombre,
            no_apartamento: String(apartamento).trim().toUpperCase(),
            nombre_propietario: String(propietario).trim(),
            cedula: String(
              fila["Cedula"] || fila["Cédula"] || fila["CEDULA"] || ""
            ).trim(),
            telefono: String(
              fila["Telefono"] ||
                fila["Teléfono"] ||
                fila["TELEFONO"] ||
                fila["Celular"] ||
                fila["WhatsApp"] ||
                fila["Whatsapp"] ||
                ""
            ).trim(),
            correo: String(
              fila["Correo"] ||
                fila["CORREO"] ||
                fila["Email"] ||
                fila["EMAIL"] ||
                fila["E-mail"] ||
                fila["Mail"] ||
                ""
            ).trim(),
            cuenta_banco: String(
              fila["Cuenta Banco"] ||
                fila["No. Cuenta"] ||
                fila["No Cuenta"] ||
                fila["Cuenta"] ||
                fila["CUENTA BANCO"] ||
                fila["Cuenta Bancaria"] ||
                ""
            ).trim(),
            banco_id: bancoEncontrado?.id || null,
            tipo_cuenta:
              String(
                fila["Tipo Cuenta"] ||
                  fila["Tipo de Cuenta"] ||
                  fila["TIPO CUENTA"] ||
                  ""
              ).trim() || null,
            titular_cuenta:
              String(
                fila["Titular Cuenta"] ||
                  fila["Titular de la Cuenta"] ||
                  fila["TITULAR CUENTA"] ||
                  ""
              ).trim() || null,
            direccion: String(
              fila["Direccion"] || fila["Dirección"] || fila["DIRECCION"] || ""
            ).trim(),
            estado: "activo",
          };

          if (clientId) registro.client_id = clientId;

          return registro;
        })
        .filter(Boolean);

      if (registros.length === 0) {
        alert(
          "No se encontraron filas válidas. Verifique las columnas Apartamento y Propietario."
        );
        setImportando(false);
        return;
      }

      const { error } = await supabase
        .from("propietarios_apartamentos")
        .insert(registros);

      if (error) {
        alert("Error importando propietarios: " + error.message);
        setImportando(false);
        return;
      }

      await actualizarUnidadesDesdePropietarios(condominioId);
      await cargarPropietarios(condominioId);

      alert(`Importación completada. Registros cargados: ${registros.length}`);
    } catch (error: any) {
      alert("Error leyendo Excel: " + error.message);
    }

    e.target.value = "";
    setImportando(false);
  }

  function descargarPlantilla() {
    const plantilla = [
      {
        Apartamento: "A1",
        Propietario: "Nombre del propietario",
        Cedula: "000-0000000-0",
        Telefono: "809-000-0000",
        Correo: "correo@ejemplo.com",
        Banco: "Banco Popular Dominicano",
        "Tipo Cuenta": "Ahorro",
        "Cuenta Banco": "000000000",
        "Titular Cuenta": "Nombre del titular",
        Direccion: "",
      },
    ];

    const hoja = XLSX.utils.json_to_sheet(plantilla);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Plantilla");
    XLSX.writeFile(libro, "Plantilla_Propietarios.xlsx");
  }

  function exportarExcel() {
    if (propietariosFiltrados.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const dataExcel = propietariosFiltrados.map((p) => ({
      Apartamento: p.no_apartamento,
      Propietario: p.nombre_propietario,
      Cedula: p.cedula || "",
      Telefono: p.telefono || "",
      Correo: p.correo || "",
      Banco: p.catalogo_bancos?.nombre_banco || "",
      "Tipo Cuenta": p.tipo_cuenta || "",
      "Cuenta Banco": p.cuenta_banco || "",
      "Titular Cuenta": p.titular_cuenta || "",
      Direccion: p.direccion || "",
      Estado: p.estado,
    }));

    const hoja = XLSX.utils.json_to_sheet(dataExcel);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Propietarios");

    XLSX.writeFile(
      libro,
      `Propietarios_${condominioNombre || condominioId}.xlsx`
    );
  }

  const propietariosFiltrados = useMemo(() => {
    return propietarios.filter((p) => {
      const texto = `${p.no_apartamento} ${p.nombre_propietario} ${
        p.cedula || ""
      } ${p.telefono || ""} ${p.correo || ""} ${
        p.catalogo_bancos?.nombre_banco || ""
      } ${p.tipo_cuenta || ""} ${p.cuenta_banco || ""} ${
        p.titular_cuenta || ""
      }`.toLowerCase();

      return texto.includes(buscar.toLowerCase());
    });
  }, [propietarios, buscar]);

  const totalActivos = propietariosFiltrados.filter(
    (p) => p.estado === "activo"
  ).length;

  return (
    <PageContainer>
      <PageHeader
        title="Propietarios"
        subtitle="Registro, importación y control de propietarios del condominio activo."
        badge="Centro Residencial"
        icon={Users}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                limpiarFormulario();
                setMostrarFormulario((actual) => !actual);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
            >
              <UserRound className="h-4 w-4" />
              {mostrarFormulario ? "Ocultar formulario" : "Nuevo propietario"}
            </button>

            <button
              type="button"
              onClick={descargarPlantilla}
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Plantilla
            </button>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-900">
              <Upload className="h-4 w-4" />
              {importando ? "Importando..." : "Importar"}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={importarExcel}
                className="hidden"
                disabled={importando}
              />
            </label>

            <button
              type="button"
              onClick={exportarExcel}
              className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-800"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Total propietarios"
          value={propietariosFiltrados.length}
          subtitle="Resultado filtrado"
          icon={Users}
          tone="blue"
        />

        <StatCard
          title="Activos"
          value={totalActivos}
          subtitle="Propietarios activos"
          icon={CheckCircle}
          tone="green"
        />

        <StatCard
          title="Bancos"
          value={bancos.length}
          subtitle="Catálogo activo"
          icon={FileSpreadsheet}
          tone="slate"
        />
      </div>

      {mostrarFormulario && (
        <SectionCard
          title={editandoId ? "Modificar propietario" : "Registrar propietario"}
          subtitle="Complete los datos generales y bancarios del propietario."
        >
          <form
            onSubmit={guardarPropietario}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <input
              type="text"
              value={noApartamento}
              onChange={(e) => setNoApartamento(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              placeholder="No. Apartamento *"
            />

            <input
              type="text"
              value={nombrePropietario}
              onChange={(e) => setNombrePropietario(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              placeholder="Nombre del propietario *"
            />

            <input
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              placeholder="Cédula"
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

            <select
              value={bancoId}
              onChange={(e) => setBancoId(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Seleccione banco</option>
              {bancos.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombre_banco}
                </option>
              ))}
            </select>

            <select
              value={tipoCuenta}
              onChange={(e) => setTipoCuenta(e.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Tipo de cuenta</option>
              <option value="Ahorro">Ahorro</option>
              <option value="Corriente">Corriente</option>
              <option value="Nómina">Nómina</option>
              <option value="Otro">Otro</option>
            </select>

            <input
              type="text"
              value={cuentaBanco}
              onChange={(e) => setCuentaBanco(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              placeholder="No. cuenta bancaria"
            />

            <input
              type="text"
              value={titularCuenta}
              onChange={(e) => setTitularCuenta(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm md:col-span-2"
              placeholder="Titular de la cuenta"
            />

            <textarea
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm md:col-span-2"
              rows={2}
              placeholder="Dirección"
            />

            <div className="flex gap-2 md:col-span-2">
              <button
                type="submit"
                className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800"
              >
                {editandoId ? "Guardar cambios" : "Guardar propietario"}
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
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard
        title="Listado de propietarios"
        subtitle={`Condominio activo: ${
          condominioNombre || `ID ${condominioId}`
        }`}
        action={
          <button
            type="button"
            onClick={() => cargarPropietarios(condominioId)}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        }
      >
        <ActionBar
          search={buscar}
          onSearch={setBuscar}
          placeholder="Buscar propietario, apartamento, cédula, banco..."
        />

        <div className="mt-4 overflow-auto rounded-2xl border">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">
              Cargando propietarios...
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Apartamento</th>
                  <th className="px-4 py-3 text-left">Propietario</th>
                  <th className="px-4 py-3 text-left">Contacto</th>
                  <th className="px-4 py-3 text-left">Banco</th>
                  <th className="px-4 py-3 text-left">Cuenta</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {propietariosFiltrados.map((p) => (
                  <tr key={p.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-black text-slate-900">
                        {p.no_apartamento}
                      </p>
                      <p className="text-xs text-slate-500">ID {p.id}</p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">
                        {p.nombre_propietario}
                      </p>
                      <p className="text-xs text-slate-500">
                        Cédula: {p.cedula || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p>{p.telefono || "-"}</p>
                      <p className="text-xs text-slate-500">
                        {p.correo || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      {p.catalogo_bancos?.nombre_banco || "-"}
                    </td>

                    <td className="px-4 py-3">
                      <p>{p.cuenta_banco || "-"}</p>
                      <p className="text-xs text-slate-500">
                        {p.tipo_cuenta || "-"} · {p.titular_cuenta || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                        {p.estado}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => editarPropietario(p)}
                          className="rounded-lg bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-800"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => borrarPropietario(p)}
                          className="rounded-lg bg-red-700 px-3 py-1 text-xs font-bold text-white hover:bg-red-800"
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {propietariosFiltrados.length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-8 text-center text-slate-500"
                      colSpan={7}
                    >
                      No hay propietarios registrados.
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