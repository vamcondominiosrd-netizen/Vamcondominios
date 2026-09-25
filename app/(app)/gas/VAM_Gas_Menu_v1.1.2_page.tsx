"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type ModalidadGas = "SIN_MEDIDORES" | "CON_MEDIDORES";

type ModuloGas = {
  titulo: string;
  descripcion: string;
  href: string;
  icono: string;
  color: string;
};

type ModuloMedidores = {
  titulo: string;
  descripcion: string;
  href?: string;
  icono: string;
  disponible: boolean;
};

const VERSION = "1.1.2";

const modulosActuales: ModuloGas[] = [
  {
    titulo: "Recepción de Gas",
    descripcion:
      "Registrar conduces, cantidades recibidas, tanque abastecido y evidencias.",
    href: "/gas/recepcion",
    icono: "🚚",
    color: "from-blue-800 to-cyan-600",
  },
  {
    titulo: "Ubicación de Tanques",
    descripcion:
      "Configurar los tanques o áreas donde se recibe el gas del condominio.",
    href: "/gas/tanques",
    icono: "🛢️",
    color: "from-slate-800 to-slate-500",
  },
  {
    titulo: "Precios de Gas",
    descripcion:
      "Registrar el precio activo por proveedor y unidad de medida.",
    href: "/gas/precios",
    icono: "💰",
    color: "from-emerald-700 to-green-500",
  },
  {
    titulo: "Unidades de Medida",
    descripcion: "Mantener unidades como Galones, Libras o Metros cúbicos.",
    href: "/gas/unidades-medida",
    icono: "📏",
    color: "from-purple-800 to-fuchsia-600",
  },
];

const modulosConMedidores: ModuloMedidores[] = [
  {
    titulo: "Medidores",
    descripcion:
      "Asignar y consultar los medidores individuales por apartamento y tanque.",
    href: "/gas/medidores",
    icono: "🔢",
    disponible: true,
  },
  {
    titulo: "Lecturas mensuales",
    descripcion:
      "Registrar lecturas, fotografías y consumo mensual por apartamento.",
    href: "/gas/lecturas",
    icono: "📸",
    disponible: true,
  },
  {
    titulo: "Consumo por apartamento",
    descripcion:
      "Revisar consumos, tarifas, períodos y cargos antes de facturar.",
    icono: "🔥",
    disponible: false,
  },
  {
    titulo: "Recibos de consumo",
    descripcion:
      "Consultar el detalle de las lecturas y el importe por apartamento.",
    icono: "🧾",
    disponible: false,
  },
  {
    titulo: "Morosidad y conciliación",
    descripcion:
      "Revisar facturas pendientes y comparar recepciones con consumos.",
    icono: "📊",
    disponible: false,
  },
];

export default function GasPage() {
  const [condominioNombre, setCondominioNombre] = useState("");
  const [modalidad, setModalidad] = useState<ModalidadGas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    let vigente = true;

    async function cargarModalidad() {
      const idTexto = localStorage.getItem("condominio_id") || "";
      const nombre = localStorage.getItem("condominio_nombre") || "";
      const id = Number(idTexto);

      setCondominioNombre(nombre);
      setModalidad(null);
      setAviso("");
      setCargando(true);

      if (!idTexto || !Number.isSafeInteger(id) || id <= 0) {
        if (vigente) {
          setAviso(
            "No hay un condominio válido seleccionado. Inicie sesión o seleccione uno."
          );
          setCargando(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("gas_configuracion")
        .select("modalidad")
        .eq("condominio_id", id)
        .maybeSingle();

      if (!vigente) return;

      if (error) {
        setAviso(
          "No se pudo consultar la configuración de gas. Las funciones con medidores permanecerán deshabilitadas."
        );
      } else if (!data) {
        setAviso(
          "Este condominio aún no tiene modalidad de gas configurada. Las funciones con medidores permanecerán deshabilitadas."
        );
      } else if (
        data.modalidad === "SIN_MEDIDORES" ||
        data.modalidad === "CON_MEDIDORES"
      ) {
        setModalidad(data.modalidad);
      } else {
        setAviso(
          "Modalidad de gas no reconocida. Las funciones con medidores permanecerán deshabilitadas."
        );
      }

      setCargando(false);
    }

    void cargarModalidad();

    return () => {
      vigente = false;
    };
  }, []);

  const conMedidores = modalidad === "CON_MEDIDORES";

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-blue-700 uppercase tracking-wide">
                Operaciones del condominio
              </p>

              <h1 className="text-3xl font-black text-slate-900 mt-1">
                Módulo de Gas
              </h1>

              <p className="text-xs text-slate-400 mt-1">
                Menú de Gas · v{VERSION}
              </p>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Control de recepción de gas, tanques, precios, medidores y
                consumo individual según la modalidad del condominio.
              </p>

              <p className="text-sm text-slate-600 mt-3">
                <strong>Condominio activo:</strong>{" "}
                {condominioNombre || "No seleccionado"}
              </p>

              <p className="text-sm text-slate-600 mt-1" aria-live="polite">
                <strong>Modalidad:</strong>{" "}
                {cargando
                  ? "Consultando..."
                  : modalidad === "CON_MEDIDORES"
                  ? "Con medidores"
                  : modalidad === "SIN_MEDIDORES"
                  ? "Sin medidores"
                  : "Sin verificar"}
              </p>
            </div>

            <Link
              href="/finanzas/pagos"
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-center"
            >
              Volver al inicio
            </Link>
          </div>
        </section>

        {aviso && (
          <div
            className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-sm"
            role="alert"
          >
            {aviso}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {modulosActuales.map((modulo) => (
            <Link
              key={modulo.href}
              href={modulo.href}
              className="group bg-white rounded-3xl border shadow-sm hover:shadow-lg transition overflow-hidden"
            >
              <div className={`h-2 bg-gradient-to-r ${modulo.color}`} />

              <div className="p-5">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${modulo.color} flex items-center justify-center text-3xl shadow-sm group-hover:scale-105 transition`}
                >
                  {modulo.icono}
                </div>

                <h2 className="text-xl font-black text-slate-900 mt-4">
                  {modulo.titulo}
                </h2>

                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  {modulo.descripcion}
                </p>

                <div className="mt-4 text-sm font-black text-blue-700">
                  Abrir módulo →
                </div>
              </div>
            </Link>
          ))}
        </section>

        {conMedidores && (
          <section className="bg-white rounded-3xl border shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Consumo individual por medidores
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Funciones disponibles únicamente para condominios configurados
                con medidores.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {modulosConMedidores.map((modulo) =>
                modulo.disponible && modulo.href ? (
                  <Link
                    key={modulo.titulo}
                    href={modulo.href}
                    className="group rounded-2xl border bg-slate-50 p-5 hover:bg-white hover:shadow-md transition"
                  >
                    <span aria-hidden="true" className="text-3xl">
                      {modulo.icono}
                    </span>

                    <h3 className="text-lg font-black mt-3 text-slate-900">
                      {modulo.titulo}
                    </h3>

                    <p className="text-sm text-slate-500 mt-2">
                      {modulo.descripcion}
                    </p>

                    <span className="inline-block mt-4 text-xs font-black text-blue-700">
                      Abrir módulo →
                    </span>
                  </Link>
                ) : (
                  <div
                    key={modulo.titulo}
                    className="rounded-2xl border bg-slate-50 p-5 opacity-80"
                    aria-disabled="true"
                  >
                    <span aria-hidden="true" className="text-3xl">
                      {modulo.icono}
                    </span>

                    <h3 className="text-lg font-black mt-3 text-slate-900">
                      {modulo.titulo}
                    </h3>

                    <p className="text-sm text-slate-500 mt-2">
                      {modulo.descripcion}
                    </p>

                    <span className="inline-block mt-4 text-xs font-bold text-amber-800 bg-amber-100 rounded-full px-3 py-1">
                      En desarrollo
                    </span>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <h2 className="text-xl font-black text-slate-900">
            Flujo recomendado
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4 text-sm">
            <div className="border rounded-2xl p-4 bg-slate-50">
              <p className="font-black">1. Configurar unidades</p>
              <p className="text-slate-500 mt-1">
                Definir las unidades de medida.
              </p>
            </div>

            <div className="border rounded-2xl p-4 bg-slate-50">
              <p className="font-black">2. Crear tanques</p>
              <p className="text-slate-500 mt-1">
                Ubicación o área abastecida.
              </p>
            </div>

            <div className="border rounded-2xl p-4 bg-slate-50">
              <p className="font-black">3. Registrar precios</p>
              <p className="text-slate-500 mt-1">
                Precio activo por proveedor.
              </p>
            </div>

            <div className="border rounded-2xl p-4 bg-slate-50">
              <p className="font-black">4. Recibir gas</p>
              <p className="text-slate-500 mt-1">
                Conduce, cantidad y evidencias.
              </p>
            </div>

            <div className="border rounded-2xl p-4 bg-slate-50">
              <p className="font-black">
                {conMedidores ? "5. Leer medidores" : "5. Solicitud de pago"}
              </p>
              <p className="text-slate-500 mt-1">
                {conMedidores
                  ? "Registrar consumo individual del período."
                  : "Continuar con el flujo de aprobación."}
              </p>
            </div>
          </div>
        </section>

        <p className="text-right text-xs text-slate-400">
          Gas · Menú v{VERSION}
        </p>
      </div>
    </main>
  );
}
