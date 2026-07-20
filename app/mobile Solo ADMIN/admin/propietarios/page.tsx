"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import * as XLSX from "xlsx";

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
  estado: string;
};

export default function MobileAdminPropietariosPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);

  const [propietarios, setPropietarios] = useState<Propietario[]>([]);
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

  useEffect(() => {
    const id = localStorage.getItem("condominio_id");
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      router.push("/mobile");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre);

    cargarCondominio(id);
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

  async function cargarPropietarios(id: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("propietarios_apartamentos")
      .select(
        "id, condominio_id, no_apartamento, nombre_propietario, cedula, telefono, correo, direccion, cuenta_banco, estado"
      )
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
    setMostrarFormulario(false);
  }

  function nuevoPropietario() {
    limpiarFormulario();
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editarPropietario(p: Propietario) {
    setEditandoId(p.id);
    setNoApartamento(p.no_apartamento || "");
    setNombrePropietario(p.nombre_propietario || "");
    setCedula(p.cedula || "");
    setTelefono(p.telefono || "");
    setCorreo(p.correo || "");
    setDireccion(p.direccion || "");
    setCuentaBanco(p.cuenta_banco || "");
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarPropietario(e: React.FormEvent) {
    e.preventDefault();

    if (!condominioId) {
      router.push("/mobile");
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
      cedula,
      telefono,
      correo,
      direccion,
      cuenta_banco: cuentaBanco,
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
      alert("Debe iniciar sesión nuevamente.");
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

          const registro: any = {
            condominio_id: Number(condominioId),
            condominio: condominioNombre,
            no_apartamento: String(apartamento).trim().toUpperCase(),
            nombre_propietario: String(propietario).trim(),
            cedula: String(
              fila["Cedula"] || fila["Cédula"] || fila["CEDULA"] || ""
            ),
            telefono: String(
              fila["Telefono"] ||
                fila["Teléfono"] ||
                fila["TELEFONO"] ||
                fila["Celular"] ||
                fila["WhatsApp"] ||
                fila["Whatsapp"] ||
                ""
            ),
            correo: String(
              fila["Correo"] ||
                fila["CORREO"] ||
                fila["Email"] ||
                fila["EMAIL"] ||
                fila["E-mail"] ||
                fila["Mail"] ||
                ""
            ),
            cuenta_banco: String(
              fila["Cuenta Banco"] ||
                fila["Cuenta"] ||
                fila["CUENTA BANCO"] ||
                fila["Cuenta Bancaria"] ||
                ""
            ),
            direccion: String(
              fila["Direccion"] || fila["Dirección"] || fila["DIRECCION"] || ""
            ),
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
        "Cuenta Banco": "",
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
      "Cuenta Banco": p.cuenta_banco || "",
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

  function cerrarSesion() {
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_admin_id");

    router.push("/mobile");
  }

  const propietariosFiltrados = propietarios.filter((p) => {
    const texto = `${p.no_apartamento} ${p.nombre_propietario} ${
      p.cedula || ""
    } ${p.telefono || ""} ${p.correo || ""} ${
      p.cuenta_banco || ""
    }`.toLowerCase();

    return texto.includes(buscar.toLowerCase());
  });

  const totalActivos = propietariosFiltrados.filter(
    (p) => p.estado === "activo"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <section className="bg-purple-700 text-white rounded-b-3xl p-5 shadow">
        <Link href="/mobile/admin" className="text-sm opacity-90">
          ← Volver al menú
        </Link>

        <h1 className="text-2xl font-black mt-3">Propietarios</h1>

        <p className="text-sm opacity-90 mt-1">
          {condominioNombre || `ID ${condominioId}`}
        </p>

        <p className="text-sm opacity-90 mt-2">
          Consulta, registro e importación de propietarios desde el celular.
        </p>
      </section>

      <section className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Propietarios</p>
            <h2 className="text-2xl font-black">
              {propietariosFiltrados.length}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Activos</p>
            <h2 className="text-2xl font-black text-green-700">
              {totalActivos}
            </h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
          <button
            onClick={nuevoPropietario}
            className="w-full bg-purple-700 text-white py-3 rounded-xl font-bold"
          >
            + Registrar propietario
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={descargarPlantilla}
              className="bg-slate-700 text-white py-3 rounded-xl text-sm font-bold"
            >
              Plantilla
            </button>

            <button
              onClick={exportarExcel}
              className="bg-green-700 text-white py-3 rounded-xl text-sm font-bold"
            >
              Exportar
            </button>
          </div>

          <label className="block w-full bg-blue-700 text-white py-3 rounded-xl text-sm font-bold text-center cursor-pointer">
            {importando ? "Importando..." : "Importar Excel"}
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={importarExcel}
              className="hidden"
              disabled={importando}
            />
          </label>
        </div>

        {mostrarFormulario && (
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <h2 className="text-lg font-black text-slate-900 mb-4">
              {editandoId ? "Modificar propietario" : "Registrar propietario"}
            </h2>

            <form onSubmit={guardarPropietario} className="space-y-3">
              <input
                type="text"
                value={noApartamento}
                onChange={(e) => setNoApartamento(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="No. Apartamento *"
              />

              <input
                type="text"
                value={nombrePropietario}
                onChange={(e) => setNombrePropietario(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Nombre del propietario *"
              />

              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Cédula"
              />

              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Teléfono"
              />

              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Correo"
              />

              <input
                type="text"
                value={cuentaBanco}
                onChange={(e) => setCuentaBanco(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Cuenta banco"
              />

              <textarea
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                rows={2}
                placeholder="Dirección"
              />

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="submit"
                  className="bg-purple-700 text-white py-3 rounded-xl font-bold"
                >
                  {editandoId ? "Guardar" : "Registrar"}
                </button>

                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="bg-slate-500 text-white py-3 rounded-xl font-bold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <label className="block text-sm font-semibold mb-1">Buscar</label>

          <input
            type="text"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="border rounded-xl px-4 py-3 w-full"
            placeholder="Apartamento, propietario, cédula, teléfono..."
          />
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            Cargando propietarios...
          </div>
        ) : (
          <div className="space-y-3">
            {propietariosFiltrados.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border shadow-sm p-4"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Apartamento</p>
                    <h2 className="text-xl font-black text-slate-900">
                      {p.no_apartamento}
                    </h2>
                  </div>

                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold h-fit">
                    {p.estado || "activo"}
                  </span>
                </div>

                <div className="mt-3">
                  <p className="text-xs text-slate-500">Propietario</p>
                  <p className="font-bold text-slate-900">
                    {p.nombre_propietario}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Cédula</p>
                    <p className="font-semibold">{p.cedula || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Teléfono</p>
                    <p className="font-semibold">{p.telefono || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Correo</p>
                    <p className="font-semibold break-all">{p.correo || "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Cuenta Banco</p>
                    <p className="font-semibold break-all">
                      {p.cuenta_banco || "-"}
                    </p>
                  </div>
                </div>

                {p.direccion && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500">Dirección</p>
                    <p className="text-sm">{p.direccion}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    onClick={() => editarPropietario(p)}
                    className="bg-blue-600 text-white py-2 rounded-xl font-bold"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => borrarPropietario(p)}
                    className="bg-red-600 text-white py-2 rounded-xl font-bold"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))}

            {propietariosFiltrados.length === 0 && (
              <div className="bg-white rounded-2xl border shadow-sm p-6 text-center text-slate-500">
                No hay propietarios registrados.
              </div>
            )}
          </div>
        )}
      </section>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-4 text-center">
          <Link
            href="/mobile/admin"
            className="py-3 text-xs font-bold text-slate-700"
          >
            <div className="text-xl">🏠</div>
            Inicio
          </Link>

          <Link
            href="/mobile/admin/banco"
            className="py-3 text-xs font-bold text-slate-700"
          >
            <div className="text-xl">🏦</div>
            Banco
          </Link>

          <Link
            href="/mobile/admin/propietarios"
            className="py-3 text-xs font-bold text-purple-700"
          >
            <div className="text-xl">👥</div>
            Propietarios
          </Link>

          <button
            type="button"
            onClick={cerrarSesion}
            className="py-3 text-xs font-bold text-red-600"
          >
            <div className="text-xl">🚪</div>
            Salir
          </button>
        </div>
      </nav>
    </main>
  );
}