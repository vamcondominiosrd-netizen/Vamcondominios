"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type CreditoPropietario = {
  id: number;
  condominio_id: number;
  unidad_id: number;
  pago_id: number | null;
  monto_original: number;
  monto_disponible: number;
  concepto: string;
  estado: string;
  created_at: string | null;
};

type Unidad = {
  id: number;
  codigo: string;
};

type PropietarioApartamento = {
  id: number;
  condominio_id: number;
  no_apartamento: string | null;
  nombre_propietario: string | null;
  telefono: string | null;
};

type FilaCredito = CreditoPropietario & {
  apartamento: string;
  propietario: string;
  telefono: string;
};

export default function CreditosPropietariosPage() {
  const [condominioId, setCondominioId] = useState("");
  const [condominioNombre, setCondominioNombre] = useState("");

  const [creditos, setCreditos] = useState<CreditoPropietario[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [propietarios, setPropietarios] = useState<PropietarioApartamento[]>(
    []
  );

  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [apartamentoSeleccionado, setApartamentoSeleccionado] = useState("");

  const [loading, setLoading] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioId(id);
    setCondominioNombre(nombre);

    if (!id) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    cargarDatos(id);
  }, []);

  async function cargarDatos(id: string) {
    setLoading(true);
    setMensaje("");

    await Promise.all([
      cargarCreditos(id),
      cargarUnidades(id),
      cargarPropietarios(id),
    ]);

    setLoading(false);
  }

  async function cargarCreditos(id: string) {
    const { data, error } = await supabase
      .from("creditos_propietarios")
      .select(
        "id, condominio_id, unidad_id, pago_id, monto_original, monto_disponible, concepto, estado, created_at"
      )
      .eq("condominio_id", Number(id))
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      setMensaje("Error cargando saldos a favor: " + error.message);
      return;
    }

    setCreditos((data as CreditoPropietario[]) || []);
  }

  async function cargarUnidades(id: string) {
    const { data, error } = await supabase
      .from("unidades")
      .select("id, codigo")
      .eq("condominio_id", Number(id))
      .order("codigo", { ascending: true });

    if (error) {
      setMensaje("Error cargando unidades: " + error.message);
      return;
    }

    setUnidades((data as Unidad[]) || []);
  }

  async function cargarPropietarios(id: string) {
    const { data, error } = await supabase
      .from("propietarios_apartamentos")
      .select("id, condominio_id, no_apartamento, nombre_propietario, telefono")
      .eq("condominio_id", Number(id))
      .order("no_apartamento", { ascending: true });

    if (error) {
      setMensaje("Error cargando propietarios: " + error.message);
      return;
    }

    setPropietarios((data as PropietarioApartamento[]) || []);
  }

  function normalizar(valor: string | null | undefined) {
    return String(valor || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
  }

  function obtenerUnidad(unidadId: number) {
    return unidades.find((u) => Number(u.id) === Number(unidadId)) || null;
  }

  function obtenerPropietario(apartamento: string) {
    return (
      propietarios.find(
        (p) => normalizar(p.no_apartamento) === normalizar(apartamento)
      ) || null
    );
  }

  const filas = useMemo<FilaCredito[]>(() => {
    return creditos.map((credito) => {
      const unidad = obtenerUnidad(credito.unidad_id);
      const apartamento = unidad?.codigo || `Unidad ${credito.unidad_id}`;
      const propietario = obtenerPropietario(apartamento);

      return {
        ...credito,
        apartamento,
        propietario: propietario?.nombre_propietario || "Sin propietario",
        telefono: propietario?.telefono || "-",
      };
    });
  }, [creditos, unidades, propietarios]);

  const filasFiltradas = useMemo(() => {
    let lista = filas;

    if (filtroEstado !== "TODOS") {
      lista = lista.filter(
        (f) => normalizar(f.estado) === normalizar(filtroEstado)
      );
    }

    if (apartamentoSeleccionado) {
      lista = lista.filter(
        (f) => normalizar(f.apartamento) === normalizar(apartamentoSeleccionado)
      );
    }

    return lista;
  }, [filas, filtroEstado, apartamentoSeleccionado]);

  const apartamentosConCredito = useMemo(() => {
    const mapa = new Map<string, string>();

    filas.forEach((fila) => {
      if (!mapa.has(fila.apartamento)) {
        mapa.set(fila.apartamento, fila.propietario);
      }
    });

    return Array.from(mapa.entries())
      .map(([apartamento, propietario]) => ({
        apartamento,
        propietario,
      }))
      .sort((a, b) => a.apartamento.localeCompare(b.apartamento));
  }, [filas]);

  const totalOriginal = filasFiltradas.reduce(
    (sum, f) => sum + Number(f.monto_original || 0),
    0
  );

  const totalDisponible = filasFiltradas.reduce(
    (sum, f) => sum + Number(f.monto_disponible || 0),
    0
  );

  const totalAplicado = totalOriginal - totalDisponible;

  const cantidadDisponible = filasFiltradas.filter(
    (f) => normalizar(f.estado) === "DISPONIBLE" && Number(f.monto_disponible) > 0
  ).length;

  const apartamentosConSaldo = new Set(
    filasFiltradas
      .filter((f) => Number(f.monto_disponible || 0) > 0)
      .map((f) => f.apartamento)
  ).size;

  function dinero(valor: number | null | undefined) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  function fechaDominicana(fecha: string | null) {
    if (!fecha) return "-";

    return new Date(fecha).toLocaleDateString("es-DO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  function claseEstado(estado: string) {
    const valor = normalizar(estado);

    if (valor === "DISPONIBLE") {
      return "bg-green-100 text-green-700 border-green-200";
    }

    if (valor === "APLICADO") {
      return "bg-blue-100 text-blue-700 border-blue-200";
    }

    return "bg-slate-100 text-slate-600 border-slate-200";
  }

  async function aplicarCreditos() {
    if (!condominioId) {
      setMensaje("No se encontró el condominio activo.");
      return;
    }

    const confirmar = window.confirm(
      "¿Deseas aplicar los saldos a favor disponibles a los cargos pendientes del condominio?"
    );

    if (!confirmar) return;

    setAplicando(true);
    setMensaje("");

    const { error } = await supabase.rpc("aplicar_creditos_a_cargos", {
      p_condominio_id: Number(condominioId),
    });

    if (error) {
      setAplicando(false);
      setMensaje("Error aplicando saldos a favor: " + error.message);
      return;
    }

    await cargarDatos(condominioId);

    setAplicando(false);
    setMensaje("Saldos a favor aplicados correctamente.");
  }

  function limpiarFiltros() {
    setFiltroEstado("TODOS");
    setApartamentoSeleccionado("");
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Saldos a Favor
            </h1>

            <p className="text-slate-500 text-sm mt-1">
              Créditos generados por pagos excedentes o pagos adelantados de los
              propietarios.
            </p>

            <p className="text-sm text-blue-700 font-bold mt-2">
              Condominio activo: {condominioNombre || "No seleccionado"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={aplicarCreditos}
              disabled={aplicando || loading}
              className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-4 py-3 rounded-xl font-bold text-sm"
            >
              {aplicando ? "Aplicando..." : "Aplicar créditos disponibles"}
            </button>

            <button
              type="button"
              onClick={() => condominioId && cargarDatos(condominioId)}
              disabled={loading}
              className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white px-4 py-3 rounded-xl font-bold text-sm"
            >
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {mensaje && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm font-semibold">
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <ResumenCard
          titulo="Crédito original"
          valor={totalOriginal}
          color="text-blue-700"
        />

        <ResumenCard
          titulo="Disponible"
          valor={totalDisponible}
          color="text-green-700"
        />

        <ResumenCard
          titulo="Aplicado"
          valor={totalAplicado}
          color="text-indigo-700"
        />

        <ResumenCard
          titulo="Registros disponibles"
          valor={cantidadDisponible}
          color="text-amber-700"
          esCantidad
        />

        <ResumenCard
          titulo="Aptos con saldo"
          valor={apartamentosConSaldo}
          color="text-emerald-700"
          esCantidad
        />
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-sm font-semibold mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border rounded-xl px-3 py-2 w-full bg-white text-sm"
            >
              <option value="TODOS">Todos</option>
              <option value="DISPONIBLE">Disponible</option>
              <option value="APLICADO">Aplicado</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">
              Apartamento
            </label>

            <select
              value={apartamentoSeleccionado}
              onChange={(e) => setApartamentoSeleccionado(e.target.value)}
              className="border rounded-xl px-3 py-2 w-full bg-white text-sm"
            >
              <option value="">Todos los apartamentos</option>

              {apartamentosConCredito.map((item) => (
                <option key={item.apartamento} value={item.apartamento}>
                  {item.apartamento} - {item.propietario}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={limpiarFiltros}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 border px-4 py-2 rounded-xl font-bold text-sm"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <h2 className="font-black text-lg">Detalle de saldos a favor</h2>

          <p className="text-xs text-slate-500">
            Los créditos disponibles se aplican contra cargos pendientes de la
            misma unidad.
          </p>
        </div>

        {loading ? (
          <div className="p-6 text-slate-600">Cargando información...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 border text-left">Apartamento</th>
                  <th className="p-3 border text-left">Propietario</th>
                  <th className="p-3 border text-center">Pago ID</th>
                  <th className="p-3 border text-right">Monto original</th>
                  <th className="p-3 border text-right">Disponible</th>
                  <th className="p-3 border text-right">Aplicado</th>
                  <th className="p-3 border text-left">Concepto</th>
                  <th className="p-3 border text-center">Estado</th>
                  <th className="p-3 border text-center">Fecha</th>
                </tr>
              </thead>

              <tbody>
                {filasFiltradas.map((fila) => {
                  const aplicado =
                    Number(fila.monto_original || 0) -
                    Number(fila.monto_disponible || 0);

                  return (
                    <tr key={fila.id} className="hover:bg-slate-50">
                      <td className="p-3 border font-black text-slate-900">
                        {fila.apartamento}
                      </td>

                      <td className="p-3 border min-w-56">
                        <div className="font-bold text-slate-800">
                          {fila.propietario}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {fila.telefono}
                        </div>
                      </td>

                      <td className="p-3 border text-center">
                        {fila.pago_id || "-"}
                      </td>

                      <td className="p-3 border text-right font-bold text-blue-700">
                        RD$ {dinero(fila.monto_original)}
                      </td>

                      <td className="p-3 border text-right font-bold text-green-700">
                        RD$ {dinero(fila.monto_disponible)}
                      </td>

                      <td className="p-3 border text-right font-bold text-indigo-700">
                        RD$ {dinero(aplicado)}
                      </td>

                      <td className="p-3 border min-w-64">
                        {fila.concepto || "Crédito a favor"}
                      </td>

                      <td className="p-3 border text-center">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full border font-black text-[10px] ${claseEstado(
                            fila.estado
                          )}`}
                        >
                          {fila.estado}
                        </span>
                      </td>

                      <td className="p-3 border text-center">
                        {fechaDominicana(fila.created_at)}
                      </td>
                    </tr>
                  );
                })}

                {filasFiltradas.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-6 border text-center text-slate-500"
                    >
                      No hay saldos a favor para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-slate-50 border rounded-xl p-4 text-xs text-slate-600">
        <p>
          <strong>Nota:</strong> Este módulo consulta la tabla{" "}
          <strong>creditos_propietarios</strong>. El monto disponible representa
          el saldo pendiente de aplicar. Al usar el botón{" "}
          <strong>Aplicar créditos disponibles</strong>, el sistema ejecuta la
          función <strong>aplicar_creditos_a_cargos</strong> para rebajar cargos
          pendientes en <strong>cargos_periodicos</strong>.
        </p>
      </div>
    </div>
  );
}

function ResumenCard({
  titulo,
  valor,
  color,
  esCantidad = false,
}: {
  titulo: string;
  valor: number;
  color: string;
  esCantidad?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-4">
      <p className="text-xs text-slate-500">{titulo}</p>

      <h2 className={`text-xl font-black mt-1 ${color}`}>
        {esCantidad
          ? Number(valor || 0).toLocaleString("es-DO")
          : `RD$ ${Number(valor || 0).toLocaleString("es-DO", {
              minimumFractionDigits: 2,
            })}`}
      </h2>
    </div>
  );
}