import Link from "next/link";

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reportes</h1>
        <p className="text-slate-500">
          Módulo de reportes del sistema de pagos bancarios.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Reportes disponibles</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-2xl p-4">
            <h3 className="font-bold">Pagos Identificados</h3>
            <p className="text-sm text-slate-500 mt-2">
              Consulta pagos identificados por apartamento.
            </p>

            <Link
              href="/pagos-identificados"
              className="inline-block mt-4 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800"
            >
              Abrir reporte
            </Link>
          </div>

          <div className="border rounded-2xl p-4">
            <h3 className="font-bold">Pagos Pendientes</h3>
            <p className="text-sm text-slate-500 mt-2">
              Transacciones que aún requieren revisión.
            </p>

            <Link
              href="/archivo-banco/identificar"
              className="inline-block mt-4 bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800"
            >
              Ver pendientes
            </Link>
          </div>

          <div className="border rounded-2xl p-4">
            <h3 className="font-bold">Resumen General</h3>
            <p className="text-sm text-slate-500 mt-2">
              Total importado, identificado y pendiente.
            </p>

            <Link
              href="/dashboard"
              className="inline-block mt-4 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
            >
              Ver resumen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}