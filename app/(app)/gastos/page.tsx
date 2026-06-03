"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Proveedor = {
  id: number;
  nombre_proveedor: string;
  cuenta_banco: string | null;
};

type Categoria = {
  id: number;
  nombre_categoria: string;
};

type Gasto = {
  id: number;
  condominio_id?: number;
  condominio: string;
  fecha: string;
  concepto: string;
  detalle_gasto: string;
  monto: number;
  itbis: number;
  total: number;
  no_factura: string;
  ncf: string;
  metodo_pago: string;
  cuenta_banco: string;
  factura_url: string;
  estado: string;
  categoria_id?: number;
  proveedor_id?: number;
  aprobado_tesorero?: boolean;
  aprobado_presidente?: boolean;
  fecha_aprobacion_tesorero?: string;
  fecha_aprobacion_presidente?: string;
  cheque_url?: string;
  numero_cheque?: string;
  fecha_pago?: string;
  pagado?: boolean;
  catalogo_proveedores?: { nombre_proveedor: string };
  catalogo_categoria_gastos?: { nombre_categoria: string };
};

export default function GastosPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [fecha, setFecha] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [concepto, setConcepto] = useState("");
  const [detalleGasto, setDetalleGasto] = useState("");
  const [monto, setMonto] = useState("");
  const [itbis, setItbis] = useState("");
  const [noFactura, setNoFactura] = useState("");
  const [ncf, setNcf] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [cuentaBanco, setCuentaBanco] = useState("");
  const [facturaArchivo, setFacturaArchivo] = useState<File | null>(null);
  const [facturaActualUrl, setFacturaActualUrl] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    if (!id) {
      alert("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    const nombreFinal = nombre || `Condominio ID ${id}`;
    const hoy = new Date().toISOString().split("T")[0];

    setCondominioId(id);
    setCondominioNombre(nombreFinal);
    setFecha(hoy);

    cargarCatalogos(id);
    cargarGastos(id, nombreFinal);
  }, []);

  async function cargarCatalogos(id: string) {
    if (!id) return;

    const { data: proveedoresData, error: proveedoresError } = await supabase
      .from("catalogo_proveedores")
      .select("id, nombre_proveedor, cuenta_banco")
      .eq("estado", "activo")
      .eq("condominio_id", Number(id))
      .order("nombre_proveedor", { ascending: true });

    if (proveedoresError) {
      alert("Error cargando proveedores: " + proveedoresError.message);
      return;
    }

    const { data: categoriasData, error: categoriasError } = await supabase
      .from("catalogo_categoria_gastos")
      .select("id, nombre_categoria")
      .eq("estado", "activo")
      .order("nombre_categoria", { ascending: true });

    if (categoriasError) {
      alert("Error cargando categorías: " + categoriasError.message);
      return;
    }

    setProveedores(proveedoresData || []);
    setCategorias(categoriasData || []);
  }

  async function cargarGastos(id: string, nombreCondominio: string) {
    if (!id && !nombreCondominio) return;

    let query = supabase
      .from("gastos")
      .select(`
        id,
        condominio_id,
        condominio,
        fecha,
        concepto,
        detalle_gasto,
        monto,
        itbis,
        total,
        no_factura,
        ncf,
        metodo_pago,
        cuenta_banco,
        factura_url,
        estado,
        categoria_id,
        proveedor_id,
        aprobado_tesorero,
        aprobado_presidente,
        fecha_aprobacion_tesorero,
        fecha_aprobacion_presidente,
        cheque_url,
        numero_cheque,
        fecha_pago,
        pagado,
        catalogo_proveedores(nombre_proveedor),
        catalogo_categoria_gastos(nombre_categoria)
      `)
      .order("fecha", { ascending: false });

    if (id) {
      query = query.eq("condominio_id", Number(id));
    } else {
      query = query.eq("condominio", nombreCondominio);
    }

    const { data, error } = await query;

    if (error) {
      alert("Error cargando gastos: " + error.message);
      return;
    }

    setGastos((data as Gasto[]) || []);
  }

  async function subirFactura() {
    if (!facturaArchivo) return facturaActualUrl || "";

    const extension = facturaArchivo.name.split(".").pop();
    const nombreArchivo = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

    const rutaArchivo = `${condominioId || "general"}/${nombreArchivo}`;

    const { error } = await supabase.storage
      .from("facturas-gastos")
      .upload(rutaArchivo, facturaArchivo);

    if (error) throw new Error(error.message);

    const { data } = supabase.storage
      .from("facturas-gastos")
      .getPublicUrl(rutaArchivo);

    return data.publicUrl;
  }

  function limpiarFormulario() {
    setEditandoId(null);

    const hoy = new Date().toISOString().split("T")[0];

    setFecha(hoy);
    setCategoriaId("");
    setProveedorId("");
    setConcepto("");
    setDetalleGasto("");
    setMonto("");
    setItbis("");
    setNoFactura("");
    setNcf("");
    setMetodoPago("");
    setCuentaBanco("");
    setFacturaArchivo(null);
    setFacturaActualUrl("");

    const inputFile = document.getElementById(
      "facturaGasto"
    ) as HTMLInputElement | null;

    if (inputFile) inputFile.value = "";
  }

  function seleccionarProveedor(id: string) {
    setProveedorId(id);

    const proveedor = proveedores.find((p) => String(p.id) === id);

    if (proveedor?.cuenta_banco) {
      setCuentaBanco(proveedor.cuenta_banco);
    } else {
      setCuentaBanco("");
    }
  }

  function editarGasto(g: Gasto) {
    setEditandoId(g.id);
    setFecha(g.fecha || "");
    setCategoriaId(g.categoria_id ? String(g.categoria_id) : "");
    setProveedorId(g.proveedor_id ? String(g.proveedor_id) : "");
    setConcepto(g.concepto || "");
    setDetalleGasto(g.detalle_gasto || "");
    setMonto(String(g.monto || 0));
    setItbis(String(g.itbis || 0));
    setNoFactura(g.no_factura || "");
    setNcf(g.ncf || "");
    setMetodoPago(g.metodo_pago || "");
    setCuentaBanco(g.cuenta_banco || "");
    setFacturaActualUrl(g.factura_url || "");
    setFacturaArchivo(null);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function borrarGasto(g: Gasto) {
    const confirmar = confirm(
      `¿Seguro que desea borrar el gasto "${g.concepto}"?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("gastos")
      .delete()
      .eq("id", g.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error borrando gasto: " + error.message);
      return;
    }

    alert("Gasto borrado correctamente.");
    cargarGastos(condominioId, condominioNombre);
  }

  async function aprobarTesorero(g: Gasto) {
    const { error } = await supabase
      .from("gastos")
      .update({
        aprobado_tesorero: true,
        fecha_aprobacion_tesorero: new Date().toISOString(),
        estado: "Aprobado por tesorero",
      })
      .eq("id", g.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error aprobando por tesorero: " + error.message);
      return;
    }

    cargarGastos(condominioId, condominioNombre);
  }

  async function aprobarPresidente(g: Gasto) {
    if (!g.aprobado_tesorero) {
      alert("Primero debe aprobar el tesorero.");
      return;
    }

    const { error } = await supabase
      .from("gastos")
      .update({
        aprobado_presidente: true,
        fecha_aprobacion_presidente: new Date().toISOString(),
        estado: "Aprobado por presidente",
      })
      .eq("id", g.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error aprobando por presidente: " + error.message);
      return;
    }

    cargarGastos(condominioId, condominioNombre);
  }

  async function marcarPagado(g: Gasto) {
    if (!g.aprobado_presidente) {
      alert("Primero debe aprobar el presidente.");
      return;
    }

    const numeroCheque = prompt("Número de cheque emitido:");
    if (!numeroCheque) return;

    const fechaPago = prompt("Fecha de pago en formato YYYY-MM-DD:");
    if (!fechaPago) return;

    const { error } = await supabase
      .from("gastos")
      .update({
        pagado: true,
        numero_cheque: numeroCheque,
        fecha_pago: fechaPago,
        estado: "Pagado",
      })
      .eq("id", g.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Error marcando como pagado: " + error.message);
      return;
    }

    cargarGastos(condominioId, condominioNombre);
  }

  async function subirCheque(g: Gasto, archivo: File) {
    if (!archivo) return;

    const extension = archivo.name.split(".").pop();
    const nombreArchivo = `${condominioId || "general"}/${
      g.id
    }-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("cheques-gastos")
      .upload(nombreArchivo, archivo);

    if (uploadError) {
      alert("Error subiendo cheque: " + uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from("cheques-gastos")
      .getPublicUrl(nombreArchivo);

    const { error } = await supabase
      .from("gastos")
      .update({
        cheque_url: data.publicUrl,
      })
      .eq("id", g.id)
      .eq("condominio_id", Number(condominioId));

    if (error) {
      alert("Cheque subido, pero no se pudo actualizar el gasto: " + error.message);
      return;
    }

    alert("Cheque subido correctamente.");
    cargarGastos(condominioId, condominioNombre);
  }

  async function guardarGasto(e: React.FormEvent) {
    e.preventDefault();

    if (
      !condominioId ||
      !condominioNombre ||
      !fecha ||
      !categoriaId ||
      !proveedorId ||
      !concepto ||
      !monto
    ) {
      alert(
        "Debe completar condominio, fecha, categoría, proveedor, concepto y monto."
      );
      return;
    }

    try {
      setGuardando(true);

      const montoNumero = Number(monto || 0);
      const itbisNumero = Number(itbis || 0);
      const totalNumero = montoNumero + itbisNumero;
      const facturaUrl = await subirFactura();

      const registro: any = {
        condominio_id: Number(condominioId),
        condominio: condominioNombre,
        fecha,
        categoria_id: Number(categoriaId),
        proveedor_id: Number(proveedorId),
        concepto,
        detalle_gasto: detalleGasto,
        monto: montoNumero,
        itbis: itbisNumero,
        total: totalNumero,
        no_factura: noFactura,
        ncf,
        metodo_pago: metodoPago,
        cuenta_banco: cuentaBanco,
        factura_url: facturaUrl,
      };

      if (editandoId) {
        const { error } = await supabase
          .from("gastos")
          .update(registro)
          .eq("id", editandoId)
          .eq("condominio_id", Number(condominioId));

        setGuardando(false);

        if (error) {
          alert("Error modificando gasto: " + error.message);
          return;
        }

        alert("Gasto modificado correctamente.");
      } else {
        registro.estado = "Pendiente aprobación tesorero";
        registro.aprobado_tesorero = false;
        registro.aprobado_presidente = false;
        registro.pagado = false;

        const { error } = await supabase.from("gastos").insert([registro]);

        setGuardando(false);

        if (error) {
          alert("Error guardando gasto: " + error.message);
          return;
        }

        alert("Gasto registrado correctamente.");
      }

      limpiarFormulario();
      cargarGastos(condominioId, condominioNombre);
    } catch (err: any) {
      setGuardando(false);
      alert("Error subiendo factura: " + err.message);
    }
  }

  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.total || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gastos Profesionales</h1>
        <p className="text-slate-500">
          Registro, aprobación y pago de gastos del condominio activo.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Condominio activo
        </p>
        <p className="font-bold text-slate-800 mt-1">
          {condominioNombre || "No seleccionado"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total registros</p>
          <h2 className="text-2xl font-bold">{gastos.length}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Monto total gastos</p>
          <h2 className="text-2xl font-bold text-red-700">
            RD$
            {totalGastos.toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">Modo</p>
          <h2 className="text-2xl font-bold text-blue-700">
            {editandoId ? "Editando" : "Nuevo"}
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">
          {editandoId ? "Modificar gasto" : "Registrar gasto"}
        </h2>

        <form
          onSubmit={guardarGasto}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="md:col-span-2 bg-slate-50 border rounded-lg px-3 py-3">
            <label className="block text-sm font-semibold mb-1">
              Condominio
            </label>
            <p className="font-semibold text-slate-800">
              {condominioNombre || "No seleccionado"}
            </p>
          </div>

          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
          />

          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
          >
            <option value="">Seleccione categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre_categoria}
              </option>
            ))}
          </select>

          <div>
            <select
              value={proveedorId}
              onChange={(e) => seleccionarProveedor(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">Seleccione proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre_proveedor}
                </option>
              ))}
            </select>

            {proveedores.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">
                No hay proveedores activos registrados para este condominio.
              </p>
            )}
          </div>

          <input
            type="text"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
            placeholder="Concepto"
          />

          <input
            type="number"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
            placeholder="Monto RD$"
          />

          <input
            type="number"
            step="0.01"
            value={itbis}
            onChange={(e) => setItbis(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
            placeholder="ITBIS RD$"
          />

          <input
            type="text"
            value={`RD$${(
              Number(monto || 0) + Number(itbis || 0)
            ).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`}
            readOnly
            className="border rounded-lg px-3 py-2 w-full bg-slate-100"
          />

          <input
            type="text"
            value={noFactura}
            onChange={(e) => setNoFactura(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
            placeholder="No. Factura"
          />

          <input
            type="text"
            value={ncf}
            onChange={(e) => setNcf(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
            placeholder="NCF"
          />

          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
          >
            <option value="">Seleccione método</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Cheque">Cheque</option>
            <option value="Depósito">Depósito</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Otro">Otro</option>
          </select>

          <input
            type="text"
            value={cuentaBanco}
            onChange={(e) => setCuentaBanco(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
            placeholder="Cuenta banco"
          />

          <div className="md:col-span-2">
            <input
              id="facturaGasto"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setFacturaArchivo(e.target.files?.[0] || null)}
              className="border rounded-lg px-3 py-2 w-full bg-white"
            />

            {facturaActualUrl && (
              <p className="text-sm mt-2">
                Factura actual:{" "}
                <a
                  href={facturaActualUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Ver factura
                </a>
              </p>
            )}
          </div>

          <textarea
            value={detalleGasto}
            onChange={(e) => setDetalleGasto(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full md:col-span-2"
            rows={3}
            placeholder="Detalle del gasto"
          />

          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={guardando}
              className="bg-blue-700 text-white px-5 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {guardando
                ? "Guardando..."
                : editandoId
                ? "Guardar cambios"
                : "Guardar gasto"}
            </button>

            {editandoId && (
              <button
                type="button"
                onClick={limpiarFormulario}
                className="bg-slate-500 text-white px-5 py-2 rounded-lg hover:bg-slate-600"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Últimos gastos registrados</h2>

        <div className="overflow-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Fecha</th>
                <th className="p-2 border">Proveedor</th>
                <th className="p-2 border">Concepto</th>
                <th className="p-2 border">Total</th>
                <th className="p-2 border">Estado</th>
                <th className="p-2 border">Factura</th>
                <th className="p-2 border">Cheque</th>
                <th className="p-2 border">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {gastos.map((g) => (
                <tr key={g.id}>
                  <td className="p-2 border">{g.fecha}</td>

                  <td className="p-2 border">
                    {g.catalogo_proveedores?.nombre_proveedor || "-"}
                  </td>

                  <td className="p-2 border">{g.concepto}</td>

                  <td className="p-2 border text-right font-bold">
                    RD$
                    {Number(g.total).toLocaleString("es-DO", {
                      minimumFractionDigits: 2,
                    })}
                  </td>

                  <td className="p-2 border text-center font-semibold">
                    {g.estado}
                  </td>

                  <td className="p-2 border text-center">
                    {g.factura_url ? (
                      <a
                        href={g.factura_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-900 text-white px-3 py-1 rounded-lg"
                      >
                        Factura
                      </a>
                    ) : (
                      <span className="text-slate-400">Sin factura</span>
                    )}
                  </td>

                  <td className="p-2 border text-center">
                    {g.cheque_url ? (
                      <a
                        href={g.cheque_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-700 text-white px-3 py-1 rounded-lg"
                      >
                        Ver cheque
                      </a>
                    ) : g.aprobado_presidente ? (
                      <label className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded-lg text-xs cursor-pointer inline-block">
                        Subir cheque
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={(e) => {
                            const archivo = e.target.files?.[0];
                            if (archivo) subirCheque(g, archivo);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Pendiente aprobación
                      </span>
                    )}
                  </td>

                  <td className="p-2 border text-center">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {!g.aprobado_tesorero && (
                        <button
                          onClick={() => aprobarTesorero(g)}
                          className="bg-yellow-600 text-white px-3 py-1 rounded-lg text-xs"
                        >
                          Tesorero
                        </button>
                      )}

                      {g.aprobado_tesorero && !g.aprobado_presidente && (
                        <button
                          onClick={() => aprobarPresidente(g)}
                          className="bg-blue-700 text-white px-3 py-1 rounded-lg text-xs"
                        >
                          Presidente
                        </button>
                      )}

                      {g.aprobado_presidente && !g.pagado && (
                        <button
                          onClick={() => marcarPagado(g)}
                          className="bg-green-700 text-white px-3 py-1 rounded-lg text-xs"
                        >
                          Pagado
                        </button>
                      )}

                      <button
                        onClick={() => editarGasto(g)}
                        className="bg-slate-700 text-white px-3 py-1 rounded-lg text-xs"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => borrarGasto(g)}
                        className="bg-red-700 text-white px-3 py-1 rounded-lg text-xs"
                      >
                        Borrar
                      </button>
                    </div>

                    {g.numero_cheque && (
                      <div className="text-xs text-slate-600 mt-1">
                        Cheque: {g.numero_cheque}
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {gastos.length === 0 && (
                <tr>
                  <td className="p-4 border text-center" colSpan={8}>
                    No hay gastos registrados para este condominio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}