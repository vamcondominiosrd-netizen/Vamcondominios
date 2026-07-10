"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type ModuloInventario = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: string;
  color: string;
  estado: "Operativo" | "En desarrollo" | "Próximo";
};

const modulos: ModuloInventario[] = [
  {
    titulo: "Inventario General",
    descripcion:
      "Módulo principal para registrar y administrar herramientas, equipos, materiales y activos.",
    href: "/administracion/inventario",
    icono: "🧰",
    color: "from-slate-700 to-slate-950",
    estado: "Operativo",
  },
  {
    titulo: "Catálogos",
    descripcion:
      "Categorías, unidades, estados, movimientos, ubicaciones, marcas y tipos de activos.",
    href: "/administracion/inventario/catalogos",
    icono: "📚",
    color: "from-blue-600 to-blue-800",
    estado: "Operativo",
  },
  {
    titulo: "Artículos",
    descripcion:
      "Registro detallado de activos con tipo, categoría, ubicación, responsable y valor actual.",
    href: "/administracion/inventario/articulos",
    icono: "📦",
    color: "from-indigo-600 to-indigo-800",
    estado: "Operativo",
  },
  {
    titulo: "Movimientos",
    descripcion:
      "Entradas, salidas, asignaciones, devoluciones, traslados, reparaciones y bajas.",
    href: "/administracion/inventario/movimientos",
    icono: "🔄",
    color: "from-green-600 to-green-800",
    estado: "Operativo",
  },
  {
    titulo: "Mantenimiento Preventivo",
    descripcion:
      "Programación, alertas, historial y costos de mantenimiento de activos.",
    href: "/administracion/inventario/mantenimiento",
    icono: "🔧",
    color: "from-orange-600 to-orange-800",
    estado: "Operativo",
  },
  {
    titulo: "Reportes",
    descripcion:
      "Inventario general, categorías, responsables, ubicaciones, movimientos y costos.",
    href: "/administracion/inventario/reportes",
    icono: "📊",
    color: "from-purple-600 to-purple-800",
    estado: "En desarrollo",
  },
];

export default function InventarioDashboardPage() {
  const [condominioNombre, setCondominioNombre] = useState("");

  const [totalArticulos, setTotalArticulos] = useState(0);
  const [disponibles, setDisponibles] = useState(0);
  const [enUso, setEnUso] = useState(0);
  const [reparacion, setReparacion] = useState(0);
  const [bajas, setBajas] = useState(0);
  const [valorActual, setValorActual] = useState(0);

  const [movimientosMes, setMovimientosMes] = useState(0);
  const [mantPendientes, setMantPendientes] = useState(0);
  const [mantVencidos, setMantVencidos] = useState(0);
  const [mantAlertas, setMantAlertas] = useState(0);

  useEffect(() => {
    const id = localStorage.getItem("condominio_id") || "";
    const nombre = localStorage.getItem("condominio_nombre") || "";

    setCondominioNombre(nombre);

    if (id) {
      cargarIndicadores(id);
    }
  }, []);

  function numero(valor: any) {
    return Number(valor || 0);
  }

  function moneda(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function estadoClase(estado: ModuloInventario["estado"]) {
    if (estado === "Operativo") return "bg-green-100 text-green-700";
    if (estado === "En desarrollo") return "bg-yellow-100 text-yellow-700";
    return "bg-slate-100 text-slate-600";
  }

  function diasHasta(fechaObjetivo: string | null | undefined) {
    if (!fechaObjetivo) return 999999;

    const hoy = new Date(new Date().toISOString().slice(0, 10));
    const futuro = new Date(`${fechaObjetivo}T00:00:00`);

    return Math.ceil((futuro.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  }

  async function cargarIndicadores(id: string) {
    const inicioMes = new Date().toISOString().slice(0, 7) + "-01";
    const hoy = new Date().toISOString().slice(0, 10);

    const [itemsResp, movimientosResp, mantenimientoResp] = await Promise.all([
      supabase
        .from("inventario_items")
        .select("estado, cantidad, valor_actual")
        .eq("condominio_id", Number(id)),

      supabase
        .from("inventario_movimientos")
        .select("id")
        .eq("condominio_id", Number(id))
        .gte("fecha_movimiento", inicioMes),

      supabase
        .from("inventario_mantenimiento")
        .select("estado, fecha_proximo_mantenimiento, dias_alerta")
        .eq("condominio_id", Number(id)),
    ]);

    if (itemsResp.data) {
      const items = itemsResp.data || [];

      setTotalArticulos(items.length);
      setDisponibles(items.filter((i: any) => i.estado === "Disponible").length);

      setEnUso(
        items.filter(
          (i: any) => i.estado === "En Uso" || i.estado === "En uso"
        ).length
      );

      setReparacion(
        items.filter(
          (i: any) =>
            i.estado === "En Reparación" || i.estado === "En reparación"
        ).length
      );

      setBajas(
        items.filter((i: any) =>
          ["Dañado", "Perdido", "Dado de Baja", "Dado de baja"].includes(
            i.estado || ""
          )
        ).length
      );

      setValorActual(
        items.reduce(
          (sum: number, i: any) =>
            sum + numero(i.valor_actual) * numero(i.cantidad || 1),
          0
        )
      );
    }

    if (movimientosResp.data) {
      setMovimientosMes(movimientosResp.data.length);
    }

    if (mantenimientoResp.data) {
      const mantenimientos = mantenimientoResp.data || [];

      setMantPendientes(
        mantenimientos.filter((m: any) => m.estado === "Pendiente").length
      );

      setMantVencidos(
        mantenimientos.filter((m: any) => {
          if (m.estado === "Cancelado" || m.estado === "Realizado") return false;
          return m.fecha_proximo_mantenimiento && m.fecha_proximo_mantenimiento < hoy;
        }).length
      );

      setMantAlertas(
        mantenimientos.filter((m: any) => {
          if (m.estado === "Cancelado" || m.estado === "Realizado") return false;

          const dias = diasHasta(m.fecha_proximo_mantenimiento);
          return dias >= 0 && dias <= numero(m.dias_alerta || 7);
        }).length
      );
    }
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900">
              Inventario
            </h1>

            <p className="text-slate-500 mt-2">
              Centro de control de activos, herramientas, equipos, movimientos y mantenimiento preventivo.
            </p>
          </div>

          <Link
            href="/administracion"
            className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-center"
          >
            Volver Administración
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border">
        <p className="text-sm text-slate-500">Condominio activo</p>
        <h2 className="text-lg font-bold text-slate-900">
          {condominioNombre || "No identificado"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Artículos</p>
          <h2 className="text-3xl font-black">{totalArticulos}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Disponibles</p>
          <h2 className="text-3xl font-black text-green-700">{disponibles}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">En uso</p>
          <h2 className="text-3xl font-black text-blue-700">{enUso}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Reparación</p>
          <h2 className="text-3xl font-black text-yellow-700">{reparacion}</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Baja / Perdidos</p>
          <h2 className="text-3xl font-black text-red-700">{bajas}</h2>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-300">Valor actual</p>
          <h2 className="text-2xl font-black text-white">
            RD${moneda(valorActual)}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Movimientos mes</p>
          <h2 className="text-3xl font-black text-purple-700">
            {movimientosMes}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Mant. pendientes</p>
          <h2 className="text-3xl font-black text-yellow-700">
            {mantPendientes}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Mant. vencidos</p>
          <h2 className="text-3xl font-black text-red-700">
            {mantVencidos}
          </h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm text-slate-500">Alertas próximas</p>
          <h2 className="text-3xl font-black text-orange-700">
            {mantAlertas}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-5">
        {modulos.map((modulo) => (
          <Link key={modulo.titulo} href={modulo.href}>
            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden h-full hover:shadow-md hover:-translate-y-1 transition">
              <div
                className={`bg-gradient-to-r ${modulo.color} h-20 flex items-center justify-center`}
              >
                <div className="bg-white/90 rounded-2xl w-14 h-14 flex items-center justify-center text-3xl shadow-sm">
                  {modulo.icono}
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-black text-slate-900">
                    {modulo.titulo}
                  </h2>

                  <span
                    className={`text-xs font-black px-3 py-1 rounded-full ${estadoClase(
                      modulo.estado
                    )}`}
                  >
                    {modulo.estado}
                  </span>
                </div>

                <p className="text-sm text-slate-500 mt-3 min-h-[74px]">
                  {modulo.descripcion}
                </p>

                <div className="mt-5 flex items-center justify-between text-blue-700 font-black text-sm">
                  <span>Abrir módulo</span>
                  <span>→</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-3xl p-5">
        <h2 className="font-black text-blue-900">Flujo recomendado</h2>
        <p className="text-sm text-blue-700 mt-1">
          Primero configure los catálogos, registre los artículos, controle los movimientos y luego programe mantenimiento preventivo.
        </p>
      </div>
    </div>
  );
}
