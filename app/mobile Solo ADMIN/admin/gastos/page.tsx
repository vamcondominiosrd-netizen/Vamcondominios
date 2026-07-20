"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  condominio: string | null;
  fecha: string | null;
  concepto: string | null;
  detalle_gasto: string | null;
  monto: number | null;
  itbis: number | null;
  total: number | null;
  no_factura: string | null;
  ncf: string | null;
  metodo_pago: string | null;
  cuenta_banco: string | null;
  factura_url: string | null;
  estado: string | null;
  categoria_id?: number | null;
  proveedor_id?: number | null;
  aprobado_tesorero?: boolean | null;
  aprobado_presidente?: boolean | null;
  fecha_aprobacion_tesorero?: string | null;
  fecha_aprobacion_presidente?: string | null;
  cheque_url?: string | null;
  numero_cheque?: string | null;
  fecha_pago?: string | null;
  pagado?: boolean | null;
  catalogo_proveedores?: { nombre_proveedor: string | null } | null;
  catalogo_categoria_gastos?: { nombre_categoria: string | null } | null;
};

function formatearMoneda(valor: number | null | undefined) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(valor || 0));
}

function fechaHoy() {
  return new Date().toISOString().split("T")[0];
}

function estadoColor(g: Gasto) {
  if (g.pagado) return "bg-green-100 text-green-700";
  if (g.aprobado_presidente) return "bg-blue-100 text-blue-700";
  if (g.aprobado_tesorero) return "bg-yellow-100 text-yellow-700";
  return "bg-slate-100 text-slate-700";
}

export default function MobileGastosPage() {
  const router = useRouter();

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [buscar, setBuscar] = useState("");

  const [fecha, setFecha] = useState(fechaHoy());
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
      router.push("/mobile");
      return;
    }

    const nombreFinal = nombre || `Condominio ID ${id}`;

    setCondominioId(id);
    setCondominioNombre(nombreFinal);
    setFecha(fechaHoy());

    cargarInicial(id, nombreFinal);
  }, [router]);

  async function cargarInicial(id: string, nombreCondominio: string) {
    setLoading(true);
    await Promise.all([cargarCatalogos(id), cargarGastos(id, nombreCondominio)]);
    setLoading(false);
  }

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
      .order("fecha", { ascending: false })
      .order("id", { ascending: false });

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
    setFecha(fechaHoy());
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
      "facturaGastoMobile"
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
    setFecha(g.fecha || fechaHoy());
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
    setMostrarFormulario(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function borrarGasto(g: Gasto) {
    const confirmar = confirm(
      `¿Seguro que desea borrar el gasto "${g.concepto || "sin concepto"}"?`
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
    const confirmar = confirm(`¿Aprobar por tesorero el gasto #${g.id}?`);
    if (!confirmar) return;

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

    alert("Gasto aprobado por tesorero.");
    cargarGastos(condominioId, condominioNombre);
  }

  async function aprobarPresidente(g: Gasto) {
    if (!g.aprobado_tesorero) {
      alert("Primero debe aprobar el tesorero.");
      return;
    }

    const confirmar = confirm(`¿Aprobar por presidente el gasto #${g.id}?`);
    if (!confirmar) return;

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

    alert("Gasto aprobado por presidente.");
    cargarGastos(condominioId, condominioNombre);
  }

  async function marcarPagado(g: Gasto) {
    if (!g.aprobado_presidente) {
      alert("Primero debe aprobar el presidente.");
      return;
    }

    const numeroCheque = prompt("Número de cheque emitido:");
    if (!numeroCheque) return;

    const fechaPago = prompt("Fecha de pago en formato YYYY-MM-DD:", fechaHoy());
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

    alert("Gasto marcado como pagado.");
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
      alert(
        "Cheque subido, pero no se pudo actualizar el gasto: " + error.message
      );
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

    const montoNumero = Number(monto || 0);

    if (montoNumero <= 0) {
      alert("El monto debe ser mayor que cero.");
      return;
    }

    try {
      setGuardando(true);

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
      setMostrarFormulario(false);
      cargarGastos(condominioId, condominioNombre);
    } catch (err: any) {
      setGuardando(false);
      alert("Error subiendo factura: " + err.message);
    }
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

  const gastosFiltrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();

    if (!q) return gastos;

    return gastos.filter((g) => {
      const texto = `${g.id || ""} ${g.fecha || ""} ${g.concepto || ""} ${
        g.detalle_gasto || ""
      } ${g.no_factura || ""} ${g.ncf || ""} ${
        g.numero_cheque || ""
      } ${g.catalogo_proveedores?.nombre_proveedor || ""} ${
        g.catalogo_categoria_gastos?.nombre_categoria || ""
      } ${g.estado || ""}`.toLowerCase();

      return texto.includes(q);
    });
  }, [gastos, buscar]);

  const totalGastos = gastosFiltrados.reduce(
    (sum, g) => sum + Number(g.total || 0),
    0
  );

  const totalPagados = gastosFiltrados.filter((g) => g.pagado).length;
  const totalPendientes = gastosFiltrados.filter((g) => !g.pagado).length;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-4">
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          Cargando gastos...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <section className="bg-red-700 text-white rounded-b-3xl p-5 shadow">
        <Link href="/mobile/admin" className="text-sm opacity-90">
          ← Volver al menú principal
        </Link>

        <h1 className="text-2xl font-black mt-3">Gastos Mobile</h1>

        <p className="text-sm opacity-90 mt-1">
          {condominioNombre || "Condominio no seleccionado"}
        </p>

        <p className="text-sm opacity-90 mt-2">
          Registro, aprobación, cheque y pago de gastos.
        </p>
      </section>

      <section className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Registros</p>
            <h2 className="text-2xl font-black text-slate-800">
              {gastosFiltrados.length}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Pagados</p>
            <h2 className="text-2xl font-black text-green-700">
              {totalPagados}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-slate-500">Pend.</p>
            <h2 className="text-2xl font-black text-red-700">
              {totalPendientes}
            </h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <p className="text-xs text-slate-500">Monto total filtrado</p>
          <h2 className="text-2xl font-black text-red-700">
            {formatearMoneda(totalGastos)}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              limpiarFormulario();
              setMostrarFormulario(!mostrarFormulario);
            }}
            className="bg-red-700 text-white py-3 rounded-xl font-bold"
          >
            {mostrarFormulario ? "Cerrar formulario" : "Nuevo gasto"}
          </button>

          <button
            onClick={() => cargarGastos(condominioId, condominioNombre)}
            className="bg-slate-900 text-white py-3 rounded-xl font-bold"
          >
            Actualizar
          </button>
        </div>

        {mostrarFormulario && (
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <h2 className="text-lg font-black text-slate-900 mb-4">
              {editandoId ? "Modificar gasto" : "Registrar gasto"}
            </h2>

            <form onSubmit={guardarGasto} className="space-y-3">
              <div className="bg-slate-50 border rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500">Condominio</p>
                <p className="font-bold">{condominioNombre}</p>
              </div>

              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              />

              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="">Seleccione categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_categoria}
                  </option>
                ))}
              </select>

              <select
                value={proveedorId}
                onChange={(e) => seleccionarProveedor(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="">Seleccione proveedor</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre_proveedor}
                  </option>
                ))}
              </select>

              {proveedores.length === 0 && (
                <p className="text-xs text-orange-600">
                  No hay proveedores activos registrados para este condominio.
                </p>
              )}

              <input
                type="text"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Concepto"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                  placeholder="Monto"
                />

                <input
                  type="number"
                  step="0.01"
                  value={itbis}
                  onChange={(e) => setItbis(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                  placeholder="ITBIS"
                />
              </div>

              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-xs text-red-600 font-bold">Total</p>
                <p className="text-2xl font-black text-red-700">
                  {formatearMoneda(Number(monto || 0) + Number(itbis || 0))}
                </p>
              </div>

              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
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
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Cuenta banco"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={noFactura}
                  onChange={(e) => setNoFactura(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                  placeholder="No. Factura"
                />

                <input
                  type="text"
                  value={ncf}
                  onChange={(e) => setNcf(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                  placeholder="NCF"
                />
              </div>

              <input
                id="facturaGastoMobile"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setFacturaArchivo(e.target.files?.[0] || null)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              />

              {facturaActualUrl && (
                <p className="text-sm">
                  Factura actual:{" "}
                  <a
                    href={facturaActualUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline font-bold"
                  >
                    Ver factura
                  </a>
                </p>
              )}

              <textarea
                value={detalleGasto}
                onChange={(e) => setDetalleGasto(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                rows={3}
                placeholder="Detalle del gasto"
              />

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-blue-700 text-white py-3 rounded-xl font-bold disabled:opacity-50"
                >
                  {guardando
                    ? "Guardando..."
                    : editandoId
                    ? "Guardar cambios"
                    : "Guardar gasto"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    limpiarFormulario();
                    setMostrarFormulario(false);
                  }}
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
            placeholder="Proveedor, concepto, factura, NCF, cheque o estado..."
          />
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <h2 className="text-lg font-black text-slate-900">
            Últimos gastos registrados
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Gestión completa desde el celular.
          </p>
        </div>

        <div className="space-y-3">
          {gastosFiltrados.map((g) => (
            <div key={g.id} className="bg-white rounded-2xl border shadow-sm p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black text-slate-900">
                      Gasto #{g.id}
                    </h2>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${estadoColor(
                        g
                      )}`}
                    >
                      {g.estado || "Pendiente"}
                    </span>
                  </div>

                  <p className="font-bold text-slate-700 mt-2">
                    {g.concepto || "-"}
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    Fecha: {g.fecha || "-"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="text-lg font-black text-red-700">
                    {formatearMoneda(g.total)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Proveedor</p>
                  <p className="font-bold">
                    {g.catalogo_proveedores?.nombre_proveedor || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Categoría</p>
                  <p className="font-bold">
                    {g.catalogo_categoria_gastos?.nombre_categoria || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Factura</p>
                  <p className="font-bold">{g.no_factura || "-"}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">NCF</p>
                  <p className="font-bold">{g.ncf || "-"}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Método</p>
                  <p className="font-bold">{g.metodo_pago || "-"}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Cheque</p>
                  <p className="font-bold">{g.numero_cheque || "-"}</p>
                </div>
              </div>

              {g.detalle_gasto && (
                <div className="mt-4 bg-slate-50 border rounded-xl p-3">
                  <p className="text-xs text-slate-500">Detalle</p>
                  <p className="text-sm mt-1">{g.detalle_gasto}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-4">
                {g.factura_url ? (
                  <a
                    href={g.factura_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-900 text-white py-3 rounded-xl text-center text-sm font-bold"
                  >
                    Ver factura
                  </a>
                ) : (
                  <div className="bg-slate-100 text-slate-400 py-3 rounded-xl text-center text-sm font-bold">
                    Sin factura
                  </div>
                )}

                {g.cheque_url ? (
                  <a
                    href={g.cheque_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-700 text-white py-3 rounded-xl text-center text-sm font-bold"
                  >
                    Ver cheque
                  </a>
                ) : g.aprobado_presidente ? (
                  <label className="bg-blue-700 text-white py-3 rounded-xl text-center text-sm font-bold cursor-pointer">
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
                  <div className="bg-slate-100 text-slate-400 py-3 rounded-xl text-center text-sm font-bold">
                    Pend. aprobación
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                {!g.aprobado_tesorero && (
                  <button
                    onClick={() => aprobarTesorero(g)}
                    className="bg-yellow-600 text-white py-3 rounded-xl text-sm font-bold"
                  >
                    Aprobar tesorero
                  </button>
                )}

                {g.aprobado_tesorero && !g.aprobado_presidente && (
                  <button
                    onClick={() => aprobarPresidente(g)}
                    className="bg-blue-700 text-white py-3 rounded-xl text-sm font-bold"
                  >
                    Aprobar presidente
                  </button>
                )}

                {g.aprobado_presidente && !g.pagado && (
                  <button
                    onClick={() => marcarPagado(g)}
                    className="bg-green-700 text-white py-3 rounded-xl text-sm font-bold"
                  >
                    Marcar pagado
                  </button>
                )}

                <button
                  onClick={() => editarGasto(g)}
                  className="bg-slate-700 text-white py-3 rounded-xl text-sm font-bold"
                >
                  Editar
                </button>

                <button
                  onClick={() => borrarGasto(g)}
                  className="bg-red-700 text-white py-3 rounded-xl text-sm font-bold"
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}

          {gastosFiltrados.length === 0 && (
            <div className="bg-white rounded-2xl border shadow-sm p-6 text-center text-slate-500">
              No hay gastos registrados para este condominio.
            </div>
          )}
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-5 text-center">
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
            href="/mobile/admin/pagos"
            className="py-3 text-xs font-bold text-slate-700"
          >
            <div className="text-xl">💳</div>
            Pagos
          </Link>

          <Link
            href="/mobile/admin/solicitudes-pagos"
            className="py-3 text-xs font-bold text-slate-700"
          >
            <div className="text-xl">💼</div>
            Solicitudes
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