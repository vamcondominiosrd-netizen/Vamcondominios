"use client";

import { useEffect, useState } from "react";
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

type CajaChicaPendiente = {
  id: number;
  fecha: string;
  concepto: string;
  detalle_gasto: string | null;
  monto: number;
  repuesto: boolean | null;
};

export default function NuevaSolicitudPagoPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [calculandoCajaChica, setCalculandoCajaChica] = useState(false);

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

  const [montoPendienteCajaChica, setMontoPendienteCajaChica] = useState(0);
  const [cantidadGastosPendientes, setCantidadGastosPendientes] = useState(0);
  const [mensajeCajaChica, setMensajeCajaChica] = useState("");

  useEffect(() => {
    const idGuardado = localStorage.getItem("condominio_id") || "";
    const nombreGuardado = localStorage.getItem("condominio_nombre") || "";

    if (!idGuardado) {
      alert("No hay condominio activo. Debe iniciar sesión nuevamente.");
      return;
    }

    setCondominioId(idGuardado);
    setCondominio(nombreGuardado || `Condominio ID ${idGuardado}`);

    const hoy = new Date().toISOString().split("T")[0];
    setFechaSolicitud(hoy);

    cargarCatalogos(idGuardado);
  }, []);

  useEffect(() => {
    verificarReposicionCajaChica();
  }, [proveedorId, categoriaId, proveedores, categorias, condominio]);

  function normalizarTexto(valor: string | null | undefined) {
    return String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function dinero(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatoFecha(fecha?: string | null) {
    if (!fecha) return "-";

    const fechaLimpia = String(fecha).split("T")[0];
    const partes = fechaLimpia.split("-");

    if (partes.length === 3) {
      const [year, month, day] = partes;
      return `${day}/${month}/${year}`;
    }

    return fecha;
  }

  function esReposicionCajaChicaActual() {
    const proveedor = proveedores.find((p) => String(p.id) === proveedorId);
    const categoria = categorias.find((c) => String(c.id) === categoriaId);

    const nombreProveedor = normalizarTexto(proveedor?.nombre_proveedor);
    const nombreCategoria = normalizarTexto(categoria?.nombre_categoria);

    return (
      nombreProveedor.includes("caja chica") &&
      nombreCategoria.includes("reposicion") &&
      nombreCategoria.includes("caja chica")
    );
  }

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
      .eq("condominio_id", Number(id))
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

  async function verificarReposicionCajaChica() {
    setMensajeCajaChica("");
    setMontoPendienteCajaChica(0);
    setCantidadGastosPendientes(0);

    if (!proveedorId || !categoriaId || !condominio) return;

    if (!esReposicionCajaChicaActual()) return;

    await calcularMontoPendienteCajaChica();
  }

  async function calcularMontoPendienteCajaChica() {
    try {
      setCalculandoCajaChica(true);
      setMensajeCajaChica("");

      const { data, error } = await supabase
        .from("caja_chica")
        .select("id, fecha, concepto, detalle_gasto, monto, repuesto")
        .ilike("condominio", `%${condominio}%`)
        .or("repuesto.eq.false,repuesto.is.null")
        .order("fecha", { ascending: true });

      setCalculandoCajaChica(false);

      if (error) {
        setMensajeCajaChica(
          "No se pudo calcular la reposición de caja chica: " + error.message
        );
        return;
      }

      const gastosPendientes = (data || []) as CajaChicaPendiente[];

      const totalPendiente = gastosPendientes.reduce(
        (sum, g) => sum + Number(g.monto || 0),
        0
      );

      setMontoPendienteCajaChica(totalPendiente);
      setCantidadGastosPendientes(gastosPendientes.length);

      if (totalPendiente <= 0) {
        setMensajeCajaChica(
          "No hay gastos de caja chica pendientes de reposición para este condominio."
        );
        return;
      }

      setMonto(String(totalPendiente.toFixed(2)));
      setItbis("0");

      if (!metodoPago) {
        setMetodoPago("Cheque");
      }

      if (!concepto.trim()) {
        setConcepto("Reposición de caja chica");
      }

      const primerGasto = gastosPendientes[0];
      const ultimoGasto = gastosPendientes[gastosPendientes.length - 1];

      if (!detalle.trim()) {
        setDetalle(
          `Reposición de caja chica correspondiente a ${gastosPendientes.length} gasto(s) pendiente(s) de reposición. Período aproximado: ${formatoFecha(
            primerGasto?.fecha
          )} al ${formatoFecha(
            ultimoGasto?.fecha
          )}. Monto sugerido: RD$ ${dinero(totalPendiente)}.`
        );
      }

      setMensajeCajaChica(
        `Monto sugerido cargado desde caja chica: RD$ ${dinero(
          totalPendiente
        )}. Puede modificarlo si es necesario.`
      );
    } catch (error: any) {
      setCalculandoCajaChica(false);
      setMensajeCajaChica(
        error.message || "Error calculando reposición de caja chica."
      );
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

  async function obtenerNumeroSolicitud() {
    const { data, error } = await supabase.rpc(
      "obtener_proximo_numero_solicitud",
      {
        p_condominio_id: Number(condominioId),
      }
    );

    if (error) {
      throw new Error("Error generando número de solicitud: " + error.message);
    }

    return Number(data || 1);
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

      if (montoNumero <= 0) {
        setGuardando(false);
        alert("El monto debe ser mayor que cero.");
        return;
      }

      const numeroSolicitud = await obtenerNumeroSolicitud();

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
          numero_solicitud: numeroSolicitud,
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

      alert(
        `Solicitud de pago registrada correctamente. No. ${String(
          numeroSolicitud
        ).padStart(5, "0")}`
      );

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
      setMontoPendienteCajaChica(0);
      setCantidadGastosPendientes(0);
      setMensajeCajaChica("");

      const inputFile = document.getElementById(
        "soporteSolicitudPago"
      ) as HTMLInputElement | null;

      if (inputFile) inputFile.value = "";
    } catch (err: any) {
      setGuardando(false);
      alert(err.message || "Error guardando solicitud.");
    }
  }

  const totalCalculado = Number(monto || 0) + Number(itbis || 0);
  const esReposicionCajaChica = esReposicionCajaChicaActual();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nueva Solicitud de Pago</h1>
        <p className="text-slate-500">
          Registro inicial de solicitud para aprobación del tesorero.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Datos de la solicitud</h2>

        <form
          onSubmit={guardarSolicitud}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">
              Condominio *
            </label>
            <input
              type="text"
              value={condominio}
              disabled
              className="border rounded-lg px-3 py-2 w-full bg-slate-100 text-slate-700"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Fecha de solicitud *
            </label>
            <input
              type="date"
              value={fechaSolicitud}
              onChange={(e) => setFechaSolicitud(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Proveedor *
            </label>
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

          <div>
            <label className="block text-sm font-semibold mb-1">
              Categoría *
            </label>
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

            {categorias.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">
                No hay categorías activas registradas para este condominio.
              </p>
            )}
          </div>

          {esReposicionCajaChica && (
            <div className="md:col-span-2 border rounded-xl p-4 bg-blue-50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="font-black text-blue-900">
                    Reposición de Caja Chica detectada
                  </h3>

                  <p className="text-sm text-blue-800 mt-1">
                    El sistema calculó los gastos de caja chica pendientes de
                    reposición. El monto fue colocado automáticamente, pero
                    puede ser modificado.
                  </p>

                  {calculandoCajaChica && (
                    <p className="text-sm text-blue-700 mt-2 font-semibold">
                      Calculando monto pendiente...
                    </p>
                  )}

                  {mensajeCajaChica && (
                    <p className="text-sm text-blue-700 mt-2 font-semibold">
                      {mensajeCajaChica}
                    </p>
                  )}
                </div>

                <div className="bg-white border rounded-lg p-3 min-w-[220px] text-center">
                  <p className="text-xs text-slate-500 font-bold uppercase">
                    Pendiente sugerido
                  </p>
                  <p className="text-xl font-black text-blue-800">
                    RD$ {dinero(montoPendienteCajaChica)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {cantidadGastosPendientes} gasto(s) pendiente(s)
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-1">
              Concepto *
            </label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
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
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="Normal">Normal</option>
              <option value="Urgente">Urgente</option>
              <option value="Alta">Alta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Monto RD$ *
            </label>
            <input
              type="number"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="0.00"
            />

            {esReposicionCajaChica && (
              <p className="text-xs text-slate-500 mt-1">
                Monto sugerido cargado desde caja chica. Puede cambiarlo si es
                necesario.
              </p>
            )}
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
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Total RD$
            </label>
            <input
              type="text"
              value={`RD$${totalCalculado.toLocaleString("es-DO", {
                minimumFractionDigits: 2,
              })}`}
              readOnly
              className="border rounded-lg px-3 py-2 w-full bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Método de pago
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">Seleccione método</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Cheque">Cheque</option>
              <option value="Depósito">Depósito</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Cuenta bancaria proveedor
            </label>
            <input
              type="text"
              value={cuentaBanco}
              onChange={(e) => setCuentaBanco(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Cuenta bancaria del proveedor"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              No. Factura
            </label>
            <input
              type="text"
              value={noFactura}
              onChange={(e) => setNoFactura(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="Número de factura"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">NCF</label>
            <input
              type="text"
              value={ncf}
              onChange={(e) => setNcf(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="NCF"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Soporte / factura / cotización
            </label>
            <input
              id="soporteSolicitudPago"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setSoporteArchivo(e.target.files?.[0] || null)}
              className="border rounded-lg px-3 py-2 w-full bg-white"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Detalle / observación
            </label>
            <textarea
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              rows={3}
              placeholder="Detalle de la solicitud de pago"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={guardando}
              className="bg-blue-700 text-white px-5 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar solicitud"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}