"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ReporteCajaChicaViejoPage() {
  const router = useRouter();
  const params = useParams();

  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  useEffect(() => {
    if (id) {
      router.replace(`/caja-chica/reporte/Desembolso-caja-chica/${id}`);
    } else {
      router.replace("/caja-chica");
    }
  }, [id, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="rounded-2xl bg-white p-6 text-center shadow">
        <p className="text-sm font-semibold text-slate-700">
          Redirigiendo al reporte de caja chica...
        </p>
      </div>
    </main>
  );
}