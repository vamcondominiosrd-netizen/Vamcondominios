"use client";

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
};

type Condominio = {
  id: number;
  nombre: string;
  rnc: string;
  direccion: string;
  telefono: string;
  correo: string;
  logo_url: string;
  nombre_representante: string;
  cedula_representante: string;
  cargo_representante: string;
};

export default function ContratoEmpleadoPage() {
  const params = useParams();
  const router = useRouter();

  const empleadoId = params?.id as string;

  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [loading, setLoading] = useState(true);

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
      .select(
        "id, nombre, rnc, direccion, telefono, correo, logo_url, nombre_representante, cedula_representante, cargo_representante"
      )
      .eq("id", Number(idCondominio))
      .maybeSingle();

    setLoading(false);

    if (condominioError) {
      alert("Error cargando condominio: " + condominioError.message);
      return;
    }

    setEmpleado(empleadoData as Empleado);
    setCondominio((condominioData as Condominio) || null);
  }

  function dinero(valor: number) {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
    });
  }

  function fechaLarga(fecha: string) {
    if (!fecha) return "________________";

    return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-DO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function imprimirContrato() {
    window.print();
  }

  if (loading) {
    return <div className="p-6">Cargando contrato...</div>;
  }

  if (!empleado || !condominio) {
    return (
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        No se encontraron los datos necesarios para generar el contrato.
      </div>
    );
  }

  const representante = condominio.nombre_representante || "________________";
  const cedulaRepresentante =
    condominio.cedula_representante || "________________";
  const cargoRepresentante =
    condominio.cargo_representante || "Administrador";

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white rounded-3xl border shadow-sm p-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Contrato de Trabajo
          </h1>
          <p className="text-slate-500">
            Contrato generado para {empleado.nombre}
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/recursos-humanos/personal"
            className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Volver
          </Link>

          <button
            onClick={imprimirContrato}
            className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-bold"
          >
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-8 print:shadow-none print:border-none print:p-0">
        <div className="max-w-4xl mx-auto text-slate-900 leading-8 text-justify">
          <div className="text-center mb-8">
            {condominio.logo_url && (
              <img
                src={condominio.logo_url}
                alt={condominio.nombre}
                className="h-20 mx-auto mb-4 object-contain"
              />
            )}

            <h2 className="text-2xl font-black uppercase">
              Contrato de Trabajo
            </h2>

            <p className="text-sm mt-2">
              No. Empleado:{" "}
              <strong>{empleado.numero_empleado || "__________"}</strong>
            </p>
          </div>

          <p>
            Entre una parte, <strong>{condominio.nombre}</strong>, entidad
            ubicada en <strong>{condominio.direccion || "________________"}</strong>
            {condominio.rnc ? (
              <>
                , RNC No. <strong>{condominio.rnc}</strong>
              </>
            ) : null}
            , debidamente representada por{" "}
            <strong>{representante}</strong>, dominicano(a), mayor de edad,
            portador(a) de la cédula de identidad y electoral No.{" "}
            <strong>{cedulaRepresentante}</strong>, quien actúa en calidad de{" "}
            <strong>{cargoRepresentante}</strong>, quien en lo adelante se
            denominará <strong>EL EMPLEADOR</strong>.
          </p>

          <p className="mt-5">
            Y de la otra parte, <strong>{empleado.nombre}</strong>, dominicano(a),
            mayor de edad, portador(a) de la cédula de identidad y electoral
            No. <strong>{empleado.cedula}</strong>, con domicilio en{" "}
            <strong>{empleado.direccion || "________________"}</strong>, quien en
            lo adelante se denominará <strong>EL EMPLEADO</strong>.
          </p>

          <p className="mt-5">
            Ambas partes han convenido celebrar el presente contrato de trabajo,
            sujeto a las leyes laborales vigentes en la República Dominicana y a
            las condiciones establecidas en las cláusulas siguientes:
          </p>

          <h3 className="font-black mt-8 uppercase">Primera: Cargo</h3>
          <p>
            EL EMPLEADO prestará sus servicios en calidad de{" "}
            <strong>{empleado.cargo || "________________"}</strong>, dentro del
            departamento de{" "}
            <strong>{empleado.departamento || "________________"}</strong>, o en
            cualquier otra función compatible con sus capacidades y con las
            necesidades operativas del condominio.
          </p>

          <h3 className="font-black mt-8 uppercase">Segunda: Tipo de contrato</h3>
          <p>
            El presente contrato corresponde a la modalidad de{" "}
            <strong>{empleado.tipo_contrato || "________________"}</strong>,
            iniciando en fecha{" "}
            <strong>{fechaLarga(empleado.fecha_ingreso)}</strong>.
          </p>

          <h3 className="font-black mt-8 uppercase">Tercera: Jornada laboral</h3>
          <p>
            EL EMPLEADO se compromete a cumplir la jornada laboral y los horarios
            establecidos por EL EMPLEADOR, conforme a las necesidades del
            servicio, las políticas internas del condominio y las disposiciones
            legales aplicables.
          </p>

          <h3 className="font-black mt-8 uppercase">Cuarta: Salario</h3>
          <p>
            EL EMPLEADOR pagará a EL EMPLEADO un salario mensual de{" "}
            <strong>RD$ {dinero(empleado.salario)}</strong>, sujeto a las
            deducciones legales y a las condiciones de pago establecidas por la
            administración.
          </p>

          <h3 className="font-black mt-8 uppercase">
            Quinta: Obligaciones del empleado
          </h3>
          <p>
            EL EMPLEADO se obliga a desempeñar sus funciones con responsabilidad,
            puntualidad, disciplina, respeto, confidencialidad y apego a las
            normas internas del condominio. Asimismo, deberá cuidar los bienes,
            herramientas, documentos y recursos puestos bajo su responsabilidad.
          </p>

          <h3 className="font-black mt-8 uppercase">
            Sexta: Obligaciones del empleador
          </h3>
          <p>
            EL EMPLEADOR se compromete a cumplir con el pago del salario acordado,
            ofrecer las condiciones necesarias para el desempeño de las labores y
            respetar los derechos laborales que correspondan conforme a la ley.
          </p>

          <h3 className="font-black mt-8 uppercase">Séptima: Conducta y disciplina</h3>
          <p>
            EL EMPLEADO deberá mantener una conducta adecuada, respetuosa y
            profesional frente a residentes, visitantes, compañeros de trabajo,
            suplidores y representantes del condominio. Cualquier incumplimiento
            podrá dar lugar a las medidas disciplinarias correspondientes.
          </p>

          <h3 className="font-black mt-8 uppercase">Octava: Terminación</h3>
          <p>
            El presente contrato podrá ser terminado por cualquiera de las partes
            conforme a las disposiciones del Código de Trabajo de la República
            Dominicana y demás normativas aplicables.
          </p>

          <h3 className="font-black mt-8 uppercase">Novena: Aceptación</h3>
          <p>
            Leído el presente contrato por ambas partes y en señal de conformidad,
            se firma en dos originales de un mismo tenor y efecto, en la ciudad
            de Santo Domingo, República Dominicana, a los ______ días del mes de
            __________________ del año ______.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-20 text-center">
            <div>
              <div className="border-t border-slate-900 pt-3">
                <p className="font-black">{representante}</p>
                <p>{cargoRepresentante}</p>
                <p>{condominio.nombre}</p>
                <p>Cédula: {cedulaRepresentante}</p>
                <p>EL EMPLEADOR</p>
              </div>
            </div>

            <div>
              <div className="border-t border-slate-900 pt-3">
                <p className="font-black">{empleado.nombre}</p>
                <p>Cédula: {empleado.cedula}</p>
                <p>No. Empleado: {empleado.numero_empleado}</p>
                <p>EL EMPLEADO</p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-sm text-slate-600">
            <p>
              Teléfono del condominio: {condominio.telefono || "__________"} ·
              Correo: {condominio.correo || "__________"}
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          aside {
            display: none !important;
          }

          main {
            padding: 0 !important;
          }

          .print\\:shadow-none {
            box-shadow: none !important;
          }

          .print\\:border-none {
            border: none !important;
          }

          .print\\:p-0 {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}