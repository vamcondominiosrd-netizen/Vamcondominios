"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type Proveedor = {
  id: number;
  nombre_proveedor: string | null;
};

type GasTanque = {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: string | null;
};

type UnidadMedidaGas = {
  id: number;
  nombre: string;
  abreviatura: string | null;
  estado: string | null;
};

type GasRecepcion = {
  id: number;
  condominio_id: number;
  fecha_recepcion: string;
  proveedor_id: number | null;
  tanque_id: number | null;
  unidad_medida_id: number | null;
  no_conduce: string | null;
  fecha_conduce: string | null;
  cantidad: number;
  precio_unitario: number;
  total: number;
  responsable: string | null;
  observacion: string | null;
  conduce_url: string | null;
  foto_medidor_camion_inicio_url: string | null;
  foto_medidor_camion_final_url: string | null;
  foto_tanque_url: string | null;
  estado: string;
  created_at: string | null;
};

export default function MobileTecnicoRecepcionGasPage() {
  const router = useRouter();

  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [tanques, setTanques] = useState<GasTanque[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedidaGas[]>([]);
  const [recepciones, setRecepciones] = useState<GasRecepcion[]>([]);

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [proveedorId, setProveedorId] = useState("");
  const [tanqueId, setTanqueId] = useState("");
  const [unidadMedidaId, setUnidadMedidaId] = useState("");
  const [noConduce, setNoConduce] = useState("");
  const [fechaConduce, setFechaConduce] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [cantidad, setCantidad] = useState("");
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [observacion, setObservacion] = useState("");

  const [archivoConduce, setArchivoConduce] = useState<File | null>(null);
  const [archivoMedidorCamionInicio, setArchivoMedidorCamionInicio] =
    useState<File | null>(null);
  const [archivoMedidorCamionFinal, setArchivoMedidorCamionFinal] =
    useState<File | null>(null);
  const [archivoFotoTanque, setArchivoFotoTanque] = useState<File | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";
    const usuario = localStorage.getItem("usuario_nombre") || "";
    const rol = localStorage.getItem("usuario_rol") || "";

    if (!id || rol !== "tecnico") {
      router.push("/mobile/tecnico/login");
      return;
    }

    setCondominioId(id);
    setCondominioNombre(nombre);
    setUsuarioNombre(usuario);

    cargarTodo(id);
  }, [router]);

  useEffect(() => {
    if (condominioId && proveedorId && unidadMedidaId) {
      buscarPrecioActivo();
    }
  }, [condominioId, proveedorId, unidadMedidaId]);

  async function cargarTodo(id: string) {
    setLoading(true);
    setMensaje("");

    await Promise.all([
      cargarProveedores(),
      cargarTanques(id),
      cargarUnidades(),
      cargarRecepciones(id),
    ]);

    setLoading(false);
  }

  async function cargarProveedores() {
    const { data, error } = await supabase
      .from("catalogo_proveedores")
      .select("id, nombre_proveedor")
      .order("nombre_proveedor", { ascending: true });

    if (error) {
      setMensaje("Error cargando proveedores: " + error.message);
      return;
    }

    const lista = ((data as Proveedor[]) || []).filter(
      (p) => p.nombre_proveedor && p.nombre_proveedor.trim() !== ""
    );

    const mapa = new Map<string, Proveedor>();

    lista.forEach((p) => {
      const clave = String(p.nombre_proveedor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      if (!mapa.has(clave)) {
        mapa.set(clave, p);
      }
    });

    const proveedoresUnicos = Array.from(mapa.values()).sort((a, b) =>
      String(a.nombre_proveedor || "").localeCompare(
        String(b.nombre_proveedor || ""),
        "es"
      )
    );

    setProveedores(proveedoresUnicos);
  }

  async function cargarTanques(id: string) {
    const { data, error } = await supabase
      .from("gas_tanques")
      .select("id, nombre, descripcion, estado")
      .eq("condominio_id", Number(id))
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });

    if (error) {
      setMensaje("Error cargando tanques: " + error.message);
      return;
    }

    setTanques((data as GasTanque[]) || []);
  }

  async function cargarUnidades() {
    const { data, error } = await supabase
      .from("gas_unidades_medida")
      .select("id, nombre, abreviatura, estado")
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });

    if (error) {
      setMensaje("Error cargando unidades: " + error.message);
      return;
    }

    const unidadesData = (data as UnidadMedidaGas[]) || [];
    setUnidades(unidadesData);

    const galones = unidadesData.find(
      (u) => String(u.nombre || "").toLowerCase() === "galones"
    );

    if (galones) {
      setUnidadMedidaId(String(galones.id));
    } else {
      setMensaje(
        "No existe la unidad de medida Galones activa. Debe activarse en el catálogo de unidades."
      );
    }
  }

  async function cargarRecepciones(id: string) {
    const { data, error } = await supabase
      .from("gas_recepciones")
      .select(`
        id,
        condominio_id,
        fecha_recepcion,
        proveedor_id,
        tanque_id,
        unidad_medida_id,
        no_conduce,
        fecha_conduce,
        cantidad,
        precio_unitario,
        total,
        responsable,
        observacion,
        conduce_url,
        foto_medidor_camion_inicio_url,
        foto_medidor_camion_final_url,
        foto_tanque_url,
        estado,
        created_at
      `)
      .eq("condominio_id", Number(id))
      .order("id", { ascending: false })
      .limit(10);

    if (error) {
      setMensaje("Error cargando recepciones: " + error.message);
      return;
    }

    setRecepciones((data as GasRecepcion[]) || []);
  }

  async function buscarPrecioActivo() {
    const { data, error } = await supabase
      .from("gas_precios")
      .select("id, precio_unitario")
      .eq("condominio_id", Number(condominioId))
      .eq("proveedor_id", Number(proveedorId))
      .eq("unidad_medida_id", Number(unidadMedidaId))
      .eq("estado", "Activo")
      .order("fecha_inicio", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setMensaje("Error buscando precio activo: " + error.message);
      return;
    }

    if (data) {
      setPrecioUnitario(String(data.precio_unitario || ""));
      setMensaje("");
    } else {
      setPrecioUnitario("");
      setMensaje(
        "No hay precio activo para este proveedor en Galones. Debe crearse en el catálogo de precios de gas."
      );
    }
  }

  function limpiarFormulario() {
    setProveedorId("");
    setTanqueId("");
    setNoConduce("");
    setFechaConduce(new Date().toISOString().slice(0, 10));
    setCantidad("");
    setPrecioUnitario("");
    setObservacion("");
    setArchivoConduce(null);
    setArchivoMedidorCamionInicio(null);
    setArchivoMedidorCamionFinal(null);
    setArchivoFotoTanque(null);

    const galones = unidades.find(
      (u) => String(u.nombre || "").toLowerCase() === "galones"
    );

    if (galones) {
      setUnidadMedidaId(String(galones.id));
    }
  }

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function fechaDominicana(fecha: string | null | undefined) {
    if (!fecha) return "-";

    const d = new Date(fecha);

    if (Number.isNaN(d.getTime())) return fecha;

    return d.toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function nombreProveedor(id: number | null) {
    return (
      proveedores.find((p) => Number(p.id) === Number(id))?.nombre_proveedor ||
      "-"
    );
  }

  function nombreTanque(id: number | null) {
    return tanques.find((t) => Number(t.id) === Number(id))?.nombre || "-";
  }

  function unidadGalonesTexto() {
    const unidad = unidades.find((u) => Number(u.id) === Number(unidadMedidaId));

    if (!unidad) return "Galones";

    return `${unidad.nombre}${unidad.abreviatura ? ` (${unidad.abreviatura})` : ""}`;
  }

  function abreviaturaUnidad(id: number | null) {
    const unidad = unidades.find((u) => Number(u.id) === Number(id));
    if (!unidad) return "GLS";
    return unidad.abreviatura || unidad.nombre || "GLS";
  }

  async function subirArchivo(
    bucket: string,
    archivo: File | null,
    carpeta: string
  ) {
    if (!archivo) return null;

    const extension = archivo.name.split(".").pop();
    const nombreArchivo = `${condominioId}/${carpeta}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(nombreArchivo, archivo);

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  async function guardarRecepcion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!condominioId) {
      alert("No hay condominio activo.");
      return;
    }

    if (!fechaConduce) {
      alert("Debe indicar la fecha del conduce.");
      return;
    }

    if (!proveedorId) {
      alert("Debe seleccionar el proveedor.");
      return;
    }

    if (!tanqueId) {
      alert("Debe seleccionar el tanque / ubicación del condominio.");
      return;
    }

    if (!unidadMedidaId) {
      alert("No se encontró la unidad de medida Galones.");
      return;
    }

    if (!noConduce.trim()) {
      alert("Debe indicar el número de conduce.");
      return;
    }

    const cantidadFinal = Number(cantidad || 0);
    const precioFinal = Number(precioUnitario || 0);
    const totalFinal = cantidadFinal * precioFinal;

    if (cantidadFinal <= 0) {
      alert("La cantidad recibida debe ser mayor que cero.");
      return;
    }

    if (precioFinal <= 0) {
      alert("No hay precio activo para este proveedor en Galones.");
      return;
    }

    const confirmar = confirm(
      `¿Desea registrar esta recepción por RD$ ${dinero(totalFinal)}?`
    );

    if (!confirmar) return;

    setLoading(true);
    setMensaje("");

    try {
      const conduceUrl = await subirArchivo(
        "conduces-gas",
        archivoConduce,
        "conduces"
      );

      const camionInicioUrl = await subirArchivo(
        "fotos-gas",
        archivoMedidorCamionInicio,
        "medidor-camion-inicio"
      );

      const camionFinalUrl = await subirArchivo(
        "fotos-gas",
        archivoMedidorCamionFinal,
        "medidor-camion-final"
      );

      const fotoTanqueUrl = await subirArchivo(
        "fotos-gas",
        archivoFotoTanque,
        "tanque-condominio"
      );

      const { error } = await supabase.from("gas_recepciones").insert([
        {
          condominio_id: Number(condominioId),
          fecha_recepcion: fechaConduce,
          proveedor_id: Number(proveedorId),
          tanque_id: Number(tanqueId),
          unidad_medida_id: Number(unidadMedidaId),
          no_conduce: noConduce.trim(),
          fecha_conduce: fechaConduce,
          cantidad: cantidadFinal,
          precio_unitario: precioFinal,
          total: totalFinal,
          responsable: usuarioNombre || "Técnico VAM",
          observacion: observacion.trim() || null,
          conduce_url: conduceUrl,
          foto_medidor_camion_inicio_url: camionInicioUrl,
          foto_medidor_camion_final_url: camionFinalUrl,
          foto_tanque_url: fotoTanqueUrl,
          estado: "Registrado",
        },
      ]);

      if (error) {
        alert("Error guardando recepción: " + error.message);
        setLoading(false);
        return;
      }

      alert("Recepción de gas registrada correctamente.");
      limpiarFormulario();
      await cargarRecepciones(condominioId);
    } catch (error: any) {
      alert("Error subiendo archivos: " + error.message);
    }

    setLoading(false);
  }

  async function cerrarSesion() {
    localStorage.removeItem("condominio_id");
    localStorage.removeItem("condominio_nombre");
    localStorage.removeItem("condominio_logo_url");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_admin_id");

    await supabase.auth.signOut();

    router.push("/mobile/tecnico/login");
  }

  const totalFormulario = useMemo(() => {
    return Number(cantidad || 0) * Number(precioUnitario || 0);
  }, [cantidad, precioUnitario]);

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-md space-y-4">
        <section className="rounded-3xl bg-white border shadow-sm p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                VAM Administradora
              </p>
              <h1 className="text-2xl font-black text-slate-900">
                Recibir Gas
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Registro simple por conduce desde el celular.
              </p>
            </div>

            <button
              type="button"
              onClick={cerrarSesion}
              className="rounded-xl bg-red-700 px-3 py-2 text-xs font-bold text-white"
            >
              Salir
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 border p-3 text-sm">
            <p className="text-slate-500">Técnico</p>
            <p className="font-bold text-slate-900">
              {usuarioNombre || "Técnico VAM"}
            </p>

            <p className="text-slate-500 mt-2">Condominio</p>
            <p className="font-bold text-slate-900">
              {condominioNombre || "No seleccionado"}
            </p>
          </div>

          <div className="mt-4 flex gap-2">
            <Link
              href="/mobile/tecnico"
              className="flex-1 rounded-xl bg-slate-800 px-4 py-3 text-center text-sm font-bold text-white"
            >
              Menú
            </Link>

            <button
              type="button"
              onClick={() => cargarTodo(condominioId)}
              className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white"
            >
              Actualizar
            </button>
          </div>
        </section>

        {mensaje && (
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3 text-sm font-bold text-yellow-800">
            {mensaje}
          </div>
        )}

        <section className="rounded-3xl bg-white border shadow-sm p-5">
          <h2 className="text-lg font-black text-slate-900 mb-4">
            Nueva recepción
          </h2>

          <form onSubmit={guardarRecepcion} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">
                Fecha del conduce
              </label>
              <input
                type="date"
                value={fechaConduce}
                onChange={(e) => setFechaConduce(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              />
              <p className="mt-1 text-xs text-slate-500">
                Esta misma fecha se guardará como fecha de recepción.
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Proveedor
              </label>
              <select
                value={proveedorId}
                onChange={(e) => setProveedorId(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 bg-white"
              >
                <option value="">Seleccione</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre_proveedor || `Proveedor ${p.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Tanque / ubicación condominio
              </label>
              <select
                value={tanqueId}
                onChange={(e) => setTanqueId(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 bg-white"
              >
                <option value="">Seleccione</option>
                {tanques.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                No. conduce
              </label>
              <input
                type="text"
                value={noConduce}
                onChange={(e) => setNoConduce(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
                placeholder="Número de conduce"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Cantidad recibida
              </label>
              <input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
                placeholder="Ej. 75"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Unidad de medida
              </label>
              <div className="w-full rounded-xl border px-4 py-3 bg-slate-100 font-bold text-slate-700">
                {unidadGalonesTexto()}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                La unidad está fija en Galones.
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Precio unitario
              </label>
              <div className="w-full rounded-xl border px-4 py-3 bg-slate-100 font-bold text-slate-700">
                RD$ {dinero(Number(precioUnitario || 0))}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                El precio se toma automáticamente del catálogo de precios.
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-sm text-blue-700 font-bold">
                Total estimado
              </p>
              <p className="text-2xl font-black text-blue-900">
                RD$ {dinero(totalFormulario)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Imagen del conduce
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => setArchivoConduce(e.target.files?.[0] || null)}
                className="w-full rounded-xl border px-4 py-3 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Foto inicial medidor camión
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) =>
                  setArchivoMedidorCamionInicio(e.target.files?.[0] || null)
                }
                className="w-full rounded-xl border px-4 py-3 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Foto final medidor camión
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) =>
                  setArchivoMedidorCamionFinal(e.target.files?.[0] || null)
                }
                className="w-full rounded-xl border px-4 py-3 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Foto tanque / medidor condominio
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) =>
                  setArchivoFotoTanque(e.target.files?.[0] || null)
                }
                className="w-full rounded-xl border px-4 py-3 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Observación
              </label>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
                rows={3}
                placeholder="Observación de la recepción..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-700 py-3 font-black text-white disabled:opacity-60"
            >
              {loading ? "Guardando..." : "Guardar recepción"}
            </button>

            <button
              type="button"
              onClick={limpiarFormulario}
              className="w-full rounded-xl border bg-slate-50 py-3 font-bold text-slate-800"
            >
              Limpiar
            </button>
          </form>
        </section>

        <section className="rounded-3xl bg-white border shadow-sm p-5">
          <h2 className="text-lg font-black text-slate-900">
            Últimas recepciones
          </h2>

          <div className="mt-4 space-y-3">
            {recepciones.map((r) => (
              <div key={r.id} className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900">
                      Conduce {r.no_conduce || "-"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {fechaDominicana(r.fecha_conduce || r.fecha_recepcion)}
                    </p>
                  </div>

                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
                    {r.estado}
                  </span>
                </div>

                <div className="mt-3 text-sm text-slate-600 space-y-1">
                  <p>
                    <strong>Proveedor:</strong> {nombreProveedor(r.proveedor_id)}
                  </p>
                  <p>
                    <strong>Tanque:</strong> {nombreTanque(r.tanque_id)}
                  </p>
                  <p>
                    <strong>Cantidad:</strong> {dinero(r.cantidad)}{" "}
                    {abreviaturaUnidad(r.unidad_medida_id)}
                  </p>
                  <p>
                    <strong>Precio:</strong> RD$ {dinero(r.precio_unitario)}
                  </p>
                  <p>
                    <strong>Total:</strong> RD$ {dinero(r.total)}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {r.conduce_url && (
                    <a
                      href={r.conduce_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white"
                    >
                      Conduce
                    </a>
                  )}

                  {r.foto_medidor_camion_inicio_url && (
                    <a
                      href={r.foto_medidor_camion_inicio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-indigo-700 px-3 py-2 text-xs font-bold text-white"
                    >
                      Inicio camión
                    </a>
                  )}

                  {r.foto_medidor_camion_final_url && (
                    <a
                      href={r.foto_medidor_camion_final_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-purple-700 px-3 py-2 text-xs font-bold text-white"
                    >
                      Final camión
                    </a>
                  )}

                  {r.foto_tanque_url && (
                    <a
                      href={r.foto_tanque_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white"
                    >
                      Tanque
                    </a>
                  )}
                </div>
              </div>
            ))}

            {recepciones.length === 0 && (
              <p className="text-sm text-slate-500">
                No hay recepciones registradas.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}