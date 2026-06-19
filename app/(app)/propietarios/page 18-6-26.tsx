"use client";

import { useEffect, useState } from "react";
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

export default function PropietariosPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);

  const [propietarios, setPropietarios] = useState<Propietario[]>([]);
  const [buscar, setBuscar] = useState("");
  const [loading, setLoading] = useState(false);
  const [importando, setImportando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

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
      router.push("/login");
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

    setPropietarios(data || []);
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
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Propietarios</h1>
          <p className="text-slate-500">
            Condominio activo: {condominioNombre || `ID ${condominioId}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={descargarPlantilla}
            className="bg-slate-700 text-white px-4 py-2 rounded-lg"
          >
            Descargar plantilla
          </button>

          <label className="bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer">
            {importando ? "Importando..." : "Importar Excel"}
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={importarExcel}
              className="hidden"
              disabled={importando}
            />
          </label>

          <button
            onClick={exportarExcel}
            className="bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Total propietarios</p>
          <h2 className="text-2xl font-bold">{propietariosFiltrados.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Activos</p>
          <h2 className="text-2xl font-bold text-green-700">{totalActivos}</h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <h2 className="text-xl font-bold mb-4">
          {editandoId ? "Modificar propietario" : "Registrar propietario"}
        </h2>

        <form
          onSubmit={guardarPropietario}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <input
            type="text"
            value={noApartamento}
            onChange={(e) => setNoApartamento(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
            placeholder="No. Apartamento *"
          />

          <input
            type="text"
            value={nombrePropietario}
            onChange={(e) => setNombrePropietario(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
            placeholder="Nombre del propietario *"
          />

          <input
            type="text"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
            placeholder="Cédula"
          />

          <input
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
            placeholder="Teléfono"
          />

          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
            placeholder="Correo"
          />

          <input
            type="text"
            value={cuentaBanco}
            onChange={(e) => setCuentaBanco(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
            placeholder="Cuenta banco"
          />

          <textarea
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full md:col-span-2"
            rows={2}
            placeholder="Dirección"
          />

          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              className="bg-amber-500 text-white px-5 py-2 rounded-lg"
            >
              {editandoId ? "Guardar cambios" : "Guardar propietario"}
            </button>

            {editandoId && (
              <button
                type="button"
                onClick={limpiarFormulario}
                className="bg-slate-500 text-white px-5 py-2 rounded-lg"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">Listado de propietarios</h2>
            <p className="text-sm text-slate-500">
              Solo se muestran propietarios del condominio activo.
            </p>
          </div>

          <input
            type="text"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full md:w-80"
            placeholder="Buscar propietario..."
          />
        </div>

        {loading ? (
          <p>Cargando propietarios...</p>
        ) : (
          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Apartamento</th>
                  <th className="p-2 border">Propietario</th>
                  <th className="p-2 border">Cédula</th>
                  <th className="p-2 border">Teléfono</th>
                  <th className="p-2 border">Correo</th>
                  <th className="p-2 border">Cuenta Banco</th>
                  <th className="p-2 border">Dirección</th>
                  <th className="p-2 border">Estado</th>
                  <th className="p-2 border">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {propietariosFiltrados.map((p) => (
                  <tr key={p.id}>
                    <td className="p-2 border font-semibold">
                      {p.no_apartamento}
                    </td>
                    <td className="p-2 border">{p.nombre_propietario}</td>
                    <td className="p-2 border">{p.cedula}</td>
                    <td className="p-2 border">{p.telefono}</td>
                    <td className="p-2 border">{p.correo}</td>
                    <td className="p-2 border">{p.cuenta_banco}</td>
                    <td className="p-2 border">{p.direccion}</td>
                    <td className="p-2 border text-green-700 font-semibold">
                      {p.estado}
                    </td>
                    <td className="p-2 border">
                      <div className="flex gap-2">
                        <button
                          onClick={() => editarPropietario(p)}
                          className="bg-blue-600 text-white px-3 py-1 rounded"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => borrarPropietario(p)}
                          className="bg-red-600 text-white px-3 py-1 rounded"
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {propietariosFiltrados.length === 0 && (
                  <tr>
                    <td className="p-4 border text-center" colSpan={9}>
                      No hay propietarios registrados.
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