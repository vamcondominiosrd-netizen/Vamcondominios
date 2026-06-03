"use client";
export const runtime = "edge";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type Empleado = {
  id: number;
  numero_empleado: string;
  condominio_id: number;
  condominio: string;
  nombre: string;
  cedula: string;
  numero_seguridad_social: string;
  sexo: string;
  fecha_nacimiento: string;
  edad: number;
  telefono: string;
  correo: string;
  direccion: string;
  cargo: string;
  departamento: string;
  tipo_contrato: string;
  fecha_ingreso: string;
  salario: number;
  estado: string;
  observacion: string;
  foto_url?: string;
  fecha_emision_carnet?: string;
  codigo_qr?: string;
};

type Condominio = {
  id: number;
  nombre: string;
  rnc: string;
  direccion: string;
  telefono: string;
  correo: string;
  logo_url: string;
};

export default function CarnetEmpleadoPage() {
  const params = useParams();
  const router = useRouter();

  const empleadoId = params?.id as string;

  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [loading, setLoading] = useState(true);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  useEffect(() => {
    const condominioId = localStorage.getItem("condominio_id") || "";

    if (!condominioId) {
      router.push("/login");
      return;
    }

    if (empleadoId) {
      cargarDatos(empleadoId, condominioId);
    }
  }, [empleadoId, router]);

  async function cargarDatos(idEmpleado: string, idCondominio: string) {
    setLoading(true);

    const { data: empleadoData, error: empleadoError } = await supabase
      .from("empleados")
      .select("*")
      .eq("id", Number(idEmpleado))
      .eq("condominio_id", Number(idCondominio))
      .maybeSingle();

    if (empleadoError) {
      alert("Error cargando empleado: " + empleadoError.message);
      setLoading(false);
      return;
    }

    if (!empleadoData) {
      alert("No se encontró el empleado.");
      setLoading(false);
      return;
    }

    const { data: condominioData, error: condominioError } = await supabase
      .from("condominios")
      .select("id, nombre, rnc, direccion, telefono, correo, logo_url")
      .eq("id", Number(idCondominio))
      .maybeSingle();

    setLoading(false);

    if (condominioError) {
      alert("Error cargando condominio: " + condominioError.message);
      return;
    }

    setEmpleado(empleadoData as Empleado);
    setCondominio((condominioData as Condominio) || null);

    if (!empleadoData.codigo_qr || !empleadoData.fecha_emision_carnet) {
      await actualizarDatosCarnet(empleadoData as Empleado);
    }
  }

  async function actualizarDatosCarnet(emp: Empleado) {
    const codigoQR = `EMPLEADO:${emp.numero_empleado}|NOMBRE:${emp.nombre}|CEDULA:${emp.cedula}|CONDOMINIO:${emp.condominio}|ID:${emp.id}`;

    const hoy = new Date().toISOString().slice(0, 10);

    await supabase
      .from("empleados")
      .update({
        codigo_qr: codigoQR,
        fecha_emision_carnet: emp.fecha_emision_carnet || hoy,
      })
      .eq("id", emp.id)
      .eq("condominio_id", emp.condominio_id);
  }

  async function subirFotoEmpleado(archivo: File) {
    if (!archivo || !empleado) return;

    try {
      setSubiendoFoto(true);

      const extension = archivo.name.split(".").pop();
      const nombreArchivo = `${empleado.condominio_id}/${empleado.id}-${empleado.numero_empleado}-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("fotos-empleados")
        .upload(nombreArchivo, archivo, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        alert("Error subiendo foto: " + uploadError.message);
        setSubiendoFoto(false);
        return;
      }

      const { data } = supabase.storage
        .from("fotos-empleados")
        .getPublicUrl(nombreArchivo);

      const { error } = await supabase
        .from("empleados")
        .update({
          foto_url: data.publicUrl,
        })
        .eq("id", empleado.id)
        .eq("condominio_id", empleado.condominio_id);

      setSubiendoFoto(false);

      if (error) {
        alert("La foto subió, pero no se pudo actualizar el empleado: " + error.message);
        return;
      }

      alert("Foto del empleado actualizada correctamente.");

      setEmpleado({
        ...empleado,
        foto_url: data.publicUrl,
      });
    } catch (error: any) {
      setSubiendoFoto(false);
      alert("Error subiendo foto: " + error.message);
    }
  }

  function imprimirCarnet() {
    window.print();
  }

  function fecha(fechaValor?: string) {
    if (!fechaValor) return new Date().toLocaleDateString("es-DO");

    return new Date(`${fechaValor}T00:00:00`).toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  if (loading) {
    return <div className="p-6">Cargando carnet...</div>;
  }

  if (!empleado || !condominio) {
    return (
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        No se encontraron los datos necesarios para generar el carnet.
      </div>
    );
  }

  const qrTexto =
    empleado.codigo_qr ||
    `EMPLEADO:${empleado.numero_empleado}|NOMBRE:${empleado.nombre}|CEDULA:${empleado.cedula}|CONDOMINIO:${empleado.condominio}|ID:${empleado.id}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    qrTexto
  )}`;

  return (
    <div className="space-y-6">
      <div className="no-print bg-white rounded-3xl border shadow-sm p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Carnet del Empleado
          </h1>

          <p className="text-slate-500">
            Carnet generado para {empleado.nombre}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/recursos-humanos/personal"
            className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Volver
          </Link>

          <label className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-3 rounded-xl font-bold cursor-pointer">
            {subiendoFoto ? "Subiendo..." : "Subir foto"}

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              disabled={subiendoFoto}
              onChange={(e) => {
                const archivo = e.target.files?.[0];

                if (archivo) {
                  subirFotoEmpleado(archivo);
                }

                e.currentTarget.value = "";
              }}
            />
          </label>

          <button
            onClick={imprimirCarnet}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-8 print:p-0 print:border-none print:shadow-none">
        <div className="flex flex-col lg:flex-row gap-10 justify-center items-start">
          <div className="carnet-card w-[360px] h-[560px] rounded-[28px] overflow-hidden border-4 border-slate-900 shadow-2xl bg-white relative">
            <div className="bg-slate-900 text-white p-5 text-center">
              {condominio.logo_url ? (
                <img
                  src={condominio.logo_url}
                  alt={condominio.nombre}
                  className="h-16 mx-auto mb-3 object-contain bg-white rounded-xl p-1"
                />
              ) : (
                <div className="h-16 w-16 mx-auto mb-3 bg-white rounded-xl flex items-center justify-center text-slate-900 font-black">
                  LOGO
                </div>
              )}

              <h2 className="text-lg font-black leading-tight uppercase">
                {condominio.nombre}
              </h2>

              <p className="text-xs text-slate-300 mt-1">Carnet de Identificación</p>
            </div>

            <div className="p-5 text-center">
              <div className="w-36 h-36 mx-auto rounded-2xl overflow-hidden border-4 border-slate-200 bg-slate-100 flex items-center justify-center">
                {empleado.foto_url ? (
                  <img
                    src={empleado.foto_url}
                    alt={empleado.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-slate-400 text-sm font-bold">
                    SIN FOTO
                  </div>
                )}
              </div>

              <h3 className="text-2xl font-black text-slate-900 mt-4 leading-tight">
                {empleado.nombre}
              </h3>

              <p className="text-blue-700 font-black mt-1">
                {empleado.numero_empleado || "EMP-0000"}
              </p>

              <div className="mt-5 text-left space-y-2 text-sm">
                <div className="bg-slate-50 rounded-xl p-3 border">
                  <p className="text-slate-500 text-xs">Cédula</p>
                  <p className="font-bold">{empleado.cedula || "-"}</p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border">
                  <p className="text-slate-500 text-xs">Cargo</p>
                  <p className="font-bold">{empleado.cargo || "-"}</p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border">
                  <p className="text-slate-500 text-xs">Departamento</p>
                  <p className="font-bold">{empleado.departamento || "-"}</p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-slate-900 text-white text-center py-3">
              <p className="text-xs">Estado</p>
              <p className="font-black uppercase">{empleado.estado}</p>
            </div>
          </div>

          <div className="carnet-card w-[360px] h-[560px] rounded-[28px] overflow-hidden border-4 border-slate-900 shadow-2xl bg-white relative">
            <div className="bg-slate-900 text-white p-6 text-center">
              <h2 className="text-xl font-black uppercase">
                Validación del Carnet
              </h2>

              <p className="text-xs text-slate-300 mt-2">
                Información interna del empleado
              </p>
            </div>

            <div className="p-6 text-center">
              <div className="bg-white border rounded-2xl p-4 inline-block">
                <img
                  src={qrUrl}
                  alt="Código QR"
                  className="w-44 h-44 object-contain"
                />
              </div>

              <div className="mt-5 text-left space-y-3 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Empleado</p>
                  <p className="font-bold">{empleado.nombre}</p>
                </div>

                <div>
                  <p className="text-slate-500 text-xs">No. Empleado</p>
                  <p className="font-bold">{empleado.numero_empleado}</p>
                </div>

                <div>
                  <p className="text-slate-500 text-xs">Fecha de ingreso</p>
                  <p className="font-bold">{fecha(empleado.fecha_ingreso)}</p>
                </div>

                <div>
                  <p className="text-slate-500 text-xs">Fecha emisión carnet</p>
                  <p className="font-bold">
                    {fecha(empleado.fecha_emision_carnet)}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 text-xs">Teléfono</p>
                  <p className="font-bold">{empleado.telefono || "-"}</p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-slate-900 text-white text-center py-4 px-5">
              <p className="text-xs leading-tight">
                Este carnet es propiedad de {condominio.nombre}. En caso de pérdida,
                favor comunicarse con la administración.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          aside,
          .no-print {
            display: none !important;
          }

          main {
            padding: 0 !important;
          }

          .carnet-card {
            page-break-inside: avoid;
            box-shadow: none !important;
          }

          @page {
            size: letter;
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  );
}