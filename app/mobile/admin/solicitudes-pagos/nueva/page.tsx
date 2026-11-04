"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type Proveedor = {
  id: number;
  nombre_proveedor: string;
  cuenta_banco: string;
};

type Categoria = {
  id: number;
  nombre_categoria: string;
};

function formatearMoneda(valor: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(Number(valor || 0));
}

export default function MobileNuevaSolicitudPagoPage() {
  const router = useRouter();

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [guardando, setGuardando] = useState(false);

  const [condominioId, setCondominioId] = useState("");
  const [condominio, setCondominio] = useState("");

  const [fechaSolicitud, setFechaSolicitud] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [concepto, setConcepto] = useState("");
  const [detalle, setDetalle] = useState("");
  const [monto, setMonto] = useState("");
  const [itbis, setItbis] = useState("");
  const [noFactura, setNoFactura] = useState("");
  const [ncf, setNcf] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [cuentaBanco, setCuentaBanco] = useState("");
  const [prioridad, setPrioridad] = useState("Normal");
  const [soporteArchivo, setSoporteArchivo] = useState<File | null>(null);

  useEffect(() => {
    const idGuardado = localStorage.getItem("condominio_id") || "";
    const nombreGuardado = localStorage.getItem("condominio_nombre") || "";

    if (!idGuardado) {
      router.push("/mobile");
      return;
    }

    setCondominioId(idGuardado);
    setCondominio(nombreGuardado || `Condominio ID ${idGuardado}`);

    const hoy = new Date().toISOString().split("T")[0];
    setFechaSolicitud(hoy);

    cargarCatalogos(idGuardado);
  }, [router]);

  async function cargarCatalogos(id: string) {
    if (!id) {
      alert("No hay condominio activo para cargar proveedores.");
      return;
    }

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

  function seleccionarProveedor(id: string) {
    setProveedorId(id);

    const proveedor = proveedores.find((p) => String(p.id) === id);

    if (proveedor?.cuenta_banco) {
      setCuentaBanco(proveedor.cuenta_banco);
    } else {
      setCuentaBanco("");
    }
  }

  async function subirSoporte() {
    if (!soporteArchivo) return "";

    const extension = soporteArchivo.name.split(".").pop();
    const nombreArchivo = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

    const carpetaCondominio = condominioId || "general";
    const rutaArchivo = `${carpetaCondominio}/${nombreArchivo}`;

    const { error } = await supabase.storage
      .from("soportes-solicitudes-pago")
      .upload(rutaArchivo, soporteArchivo);

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from("soportes-solicitudes-pago")
      .getPublicUrl(rutaArchivo);

    return data.publicUrl;
  }

  function limpiarFormulario() {
    const hoy = new Date().toISOString().split("T")[0];

    setFechaSolicitud(hoy);
    setProveedorId("");
    setCategoriaId("");
    setConcepto("");
    setDetalle("");
    setMonto("");
    setItbis("");
    setNoFactura("");
    setNcf("");
    setMetodoPago("");
    setCuentaBanco("");
    setPrioridad("Normal");
    setSoporteArchivo(null);

    const inputFile = document.getElementById(
      "soporteSolicitudPagoMobile"
    ) as HTMLInputElement | null;

    if (inputFile) inputFile.value = "";
  }

  async function guardarSolicitud(e: React.FormEvent) {
    e.preventDefault();

    if (
      !condominioId ||
      !condominio ||
      !fechaSolicitud ||
      !proveedorId ||
      !categoriaId ||
      !concepto ||
      !monto
    ) {
      alert(
        "Debe completar condominio, fecha, proveedor, categoría, concepto y monto."
      );
      return;
    }

    try {
      setGuardando(true);

      const montoNumero = Number(monto || 0);
      const itbisNumero = Number(itbis || 0);
      const totalNumero = montoNumero + itbisNumero;

      let soporteUrl = "";

      if (soporteArchivo) {
        soporteUrl = await subirSoporte();
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("solicitudes_pago").insert([
        {
          condominio_id: Number(condominioId),
          condominio,
          fecha_solicitud: fechaSolicitud,
          proveedor_id: Number(proveedorId),
          categoria_id: Number(categoriaId),
          concepto,
          detalle,
          monto: montoNumero,
          itbis: itbisNumero,
          total: totalNumero,
          no_factura: noFactura,
          ncf,
          metodo_pago: metodoPago,
          cuenta_banco: cuentaBanco,
          soporte_url: soporteUrl,
          prioridad,
          estado: "Pendiente aprobación tesorero",
          created_by:
            user?.email ||
            localStorage.getItem("usuario_nombre") ||
            "Usuario del sistema",
        },
      ]);

      setGuardando(false);

      if (error) {
        alert("Error guardando solicitud: " + error.message);
        return;
      }

      alert("Solicitud de pago registrada correctamente.");
      limpiarFormulario();
      router.push("/mobile/admin/solicitudes-pagos");
    } catch (err: any) {
      setGuardando(false);
      alert("Error subiendo soporte: " + err.message);
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

  const totalCalculado = Number(monto || 0) + Number(itbis || 0);

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <section className="bg-blue-700 text-white rounded-b-3xl p-5 shadow">
        <Link
          href="/mobile/admin/solicitudes-pagos"
          className="text-sm opacity-90"
        >
          ← Volver a solicitudes-pagos
        </Link>

        <h1 className="text-2xl font-black mt-3">Nueva Solicitud</h1>

        <p className="text-sm opacity-90 mt-1">
          {condominio || "Condominio no seleccionado"}
        </p>

        <p className="text-sm opacity-90 mt-2">
          Registro inicial de solicitud para aprobación del tesorero.
        </p>
      </section>

      <section className="p-4 space-y-4">
        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <p className="text-xs text-slate-500">Total calculado</p>
          <h2 className="text-2xl font-black text-blue-700">
            {formatearMoneda(totalCalculado)}
          </h2>

          <p className="text-xs text-slate-500 mt-2">
            Estado inicial: Pendiente aprobación tesorero
          </p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <h2 className="text-lg font-black text-slate-900 mb-4">
            Datos de la solicitud
          </h2>

          <form onSubmit={guardarSolicitud} className="space-y-3">
            <div className="bg-slate-50 border rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500">Condominio</p>
              <p className="font-bold">{condominio}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Fecha de solicitud *
              </label>

              <input
                type="date"
                value={fechaSolicitud}
                onChange={(e) => setFechaSolicitud(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Proveedor *
              </label>

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
                <p className="text-xs text-orange-600 mt-1">
                  No hay proveedores activos registrados para este condominio.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Categoría *
              </label>

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
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Concepto *
              </label>

              <input
                type="text"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full"
                placeholder="Ej. Pago reparación bomba de agua"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Prioridad
              </label>

              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="Normal">Normal</option>
                <option value="Urgente">Urgente</option>
                <option value="Alta">Alta</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Monto RD$ *
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  ITBIS RD$
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={itbis}
                  onChange={(e) => setItbis(e.target.value)}
                  className="border rounded-xl px-4 py-3 w-full"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <p className="text-xs text-blue-600 font-semibold">Total RD$</p>

              <p className="text-2xl font-black text-blue-800">
                {formatearMoneda(totalCalculado)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Método de pago
              </label>

              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              >
                <option value="">Seleccione método</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Cheque">Cheque</option>
                <option value="Depósito">Depósito</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <input
              type="text"
              value={cuentaBanco}
              onChange={(e) => setCuentaBanco(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              placeholder="Cuenta bancaria proveedor"
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

            <div>
              <label className="block text-sm font-semibold mb-1">
                Soporte / factura / cotización
              </label>

              <input
                id="soporteSolicitudPagoMobile"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setSoporteArchivo(e.target.files?.[0] || null)}
                className="border rounded-xl px-4 py-3 w-full bg-white"
              />

              {soporteArchivo && (
                <p className="text-xs text-slate-500 mt-1">
                  Archivo seleccionado: {soporteArchivo.name}
                </p>
              )}
            </div>

            <textarea
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              className="border rounded-xl px-4 py-3 w-full"
              rows={3}
              placeholder="Detalle / observación"
            />

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="submit"
                disabled={guardando}
                className="bg-blue-700 text-white py-3 rounded-xl font-bold disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>

              <button
                type="button"
                onClick={limpiarFormulario}
                className="bg-slate-500 text-white py-3 rounded-xl font-bold"
              >
                Limpiar
              </button>
            </div>
          </form>
        </div>
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
            href="/mobile/admin/gastos"
            className="py-3 text-xs font-bold text-slate-700"
          >
            <div className="text-xl">🧾</div>
            Gastos
          </Link>

          <Link
            href="/mobile/admin/solicitudes-pagos"
            className="py-3 text-xs font-bold text-indigo-700"
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