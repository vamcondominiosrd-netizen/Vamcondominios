"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

const apartamentos = [
  "L4-G1",
  "L4-G2",
  "L4-G3",
  "L4-G4",
  "L4-H1",
  "L4-H2",
  "L4-H3",
  "L4-H4",
  "L4-I1",
  "L4-I2",
  "L4-I3",
  "L4-I4",
  "L4-J1",
  "L4-J2",
  "L4-J3",
  "L4-J4",
  "L4-K1",
  "L4-K2",
  "L4-K3",
  "L4-K4",
  "L4-L1",
  "L4-L2",
  "L4-L3",
  "L4-L4",
  ];

export default function RegistroPropietarioPage() {
  const [noApartamento, setNoApartamento] = useState("");

  const [nombrePropietario, setNombrePropietario] = useState("");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");

  const [condicionApartamento, setCondicionApartamento] = useState("");

  const [nombreInquilino, setNombreInquilino] = useState("");
  const [telefonoInquilino, setTelefonoInquilino] = useState("");

  const [tieneMascota, setTieneMascota] = useState("No");
  const [tipoMascota, setTipoMascota] = useState("");
  const [cantidadMascotas, setCantidadMascotas] = useState("");
  const [observacionMascota, setObservacionMascota] = useState("");

  const [aceptoConfirmacion, setAceptoConfirmacion] = useState(false);

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState(false);

  function limpiarFormulario() {
    setNoApartamento("");
    setNombrePropietario("");
    setCedula("");
    setTelefono("");
    setCorreo("");
    setCondicionApartamento("");
    setNombreInquilino("");
    setTelefonoInquilino("");
    setTieneMascota("No");
    setTipoMascota("");
    setCantidadMascotas("");
    setObservacionMascota("");
    setAceptoConfirmacion(false);
  }

  async function guardarRegistro(e: React.FormEvent) {
    e.preventDefault();

    setMensaje("");
    setExito(false);

    if (!noApartamento) {
      setMensaje("Debe seleccionar el apartamento.");
      return;
    }

    if (!nombrePropietario.trim()) {
      setMensaje("Debe indicar el nombre completo del propietario.");
      return;
    }

    if (!cedula.trim()) {
      setMensaje("Debe indicar la cédula del propietario.");
      return;
    }

    if (!telefono.trim()) {
      setMensaje("Debe indicar el teléfono o WhatsApp.");
      return;
    }

    if (!correo.trim()) {
      setMensaje("Debe indicar el correo electrónico.");
      return;
    }

    if (!condicionApartamento) {
      setMensaje("Debe seleccionar la condición del apartamento.");
      return;
    }

    if (condicionApartamento === "Alquilado") {
      if (!nombreInquilino.trim()) {
        setMensaje("Debe indicar el nombre completo del inquilino.");
        return;
      }

      if (!telefonoInquilino.trim()) {
        setMensaje("Debe indicar el teléfono del inquilino.");
        return;
      }
    }

    if (tieneMascota === "Sí") {
      if (!tipoMascota) {
        setMensaje("Debe seleccionar el tipo de mascota.");
        return;
      }

      if (!cantidadMascotas || Number(cantidadMascotas) <= 0) {
        setMensaje("Debe indicar la cantidad de mascotas.");
        return;
      }
    }

    if (!aceptoConfirmacion) {
      setMensaje("Debe aceptar la confirmación de la información.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from("registro_propietarios_movil")
        .insert({
          condominio: "Colinas del Oeste Lote 4",
          no_apartamento: noApartamento,

          nombre_propietario: nombrePropietario.trim(),
          cedula: cedula.trim(),
          telefono: telefono.trim(),
          correo: correo.trim(),

          condicion_apartamento: condicionApartamento,

          nombre_inquilino:
            condicionApartamento === "Alquilado"
              ? nombreInquilino.trim()
              : null,

          telefono_inquilino:
            condicionApartamento === "Alquilado"
              ? telefonoInquilino.trim()
              : null,

          tiene_mascota: tieneMascota === "Sí",
          tipo_mascota: tieneMascota === "Sí" ? tipoMascota : null,
          cantidad_mascotas:
            tieneMascota === "Sí" ? Number(cantidadMascotas || 0) : null,
          observacion_mascota:
            tieneMascota === "Sí" ? observacionMascota.trim() || null : null,

          acepto_confirmacion: aceptoConfirmacion,
          estado: "Pendiente de revisión",
        });

      if (error) {
        setMensaje("Error guardando información: " + error.message);
        return;
      }

      setExito(true);
      setMensaje(
        "Información enviada correctamente. La administración revisará los datos suministrados."
      );

      limpiarFormulario();
    } catch (error: any) {
      setMensaje(error.message || "Error enviando información.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="max-w-md mx-auto space-y-5">
        <div className="bg-slate-950 text-white rounded-3xl p-6 shadow text-center">
          <div className="flex justify-center mb-3">
            <img
              src="/logo.jpg"
              alt="Logo VAM Administradora de Condominios"
              className="h-20 w-20 object-contain rounded-full bg-white p-2"
            />
          </div>

          <h1 className="text-xl font-black text-white">
            VAM Administradora de Condominios
          </h1>

          <p className="text-amber-300 text-sm font-semibold mt-1">
            Registro Básico de Propietarios
          </p>

          <p className="text-slate-300 text-sm mt-2">
            Colinas del Oeste Lote 4
          </p>
        </div>

        <div className="bg-white rounded-3xl border shadow-sm p-5">
          <form onSubmit={guardarRegistro} className="space-y-5">
            <section>
              <h2 className="text-lg font-black text-slate-900 mb-3">
                1. Datos del apartamento
              </h2>

              <label className="text-sm font-semibold">Condominio</label>
              <input
                value="Colinas del Oeste Lote 4"
                readOnly
                className="w-full mt-1 mb-4 border rounded-xl px-4 py-3 bg-slate-100 text-slate-700"
              />

              <label className="text-sm font-semibold">Apartamento</label>
              <select
                value={noApartamento}
                onChange={(e) => setNoApartamento(e.target.value)}
                className="w-full mt-1 border rounded-xl px-4 py-3 bg-white"
              >
                <option value="">Seleccione apartamento</option>
                {apartamentos.map((apto) => (
                  <option key={apto} value={apto}>
                    {apto}
                  </option>
                ))}
              </select>
            </section>

            <section>
              <h2 className="text-lg font-black text-slate-900 mb-3">
                2. Datos del propietario
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold">
                    Nombre completo del propietario
                  </label>
                  <input
                    value={nombrePropietario}
                    onChange={(e) => setNombrePropietario(e.target.value)}
                    className="w-full mt-1 border rounded-xl px-4 py-3"
                    placeholder="Nombre completo"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Cédula</label>
                  <input
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    className="w-full mt-1 border rounded-xl px-4 py-3"
                    placeholder="000-0000000-0"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full mt-1 border rounded-xl px-4 py-3"
                    placeholder="809-000-0000"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="w-full mt-1 border rounded-xl px-4 py-3"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-black text-slate-900 mb-3">
                3. Condición del apartamento
              </h2>

              <select
                value={condicionApartamento}
                onChange={(e) => {
                  setCondicionApartamento(e.target.value);

                  if (e.target.value !== "Alquilado") {
                    setNombreInquilino("");
                    setTelefonoInquilino("");
                  }
                }}
                className="w-full border rounded-xl px-4 py-3 bg-white"
              >
                <option value="">Seleccione condición</option>
                <option value="Propietario residente">
                  Propietario residente
                </option>
                <option value="Propietario no residente">
                  Propietario no residente
                </option>
                <option value="Alquilado">Alquilado</option>
              </select>
            </section>

            {condicionApartamento === "Alquilado" && (
              <section className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <h2 className="text-lg font-black text-blue-900 mb-3">
                  4. Datos del inquilino
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold">
                      Nombre completo del inquilino
                    </label>
                    <input
                      value={nombreInquilino}
                      onChange={(e) => setNombreInquilino(e.target.value)}
                      className="w-full mt-1 border rounded-xl px-4 py-3 bg-white"
                      placeholder="Nombre completo"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold">
                      Teléfono del inquilino
                    </label>
                    <input
                      value={telefonoInquilino}
                      onChange={(e) => setTelefonoInquilino(e.target.value)}
                      className="w-full mt-1 border rounded-xl px-4 py-3 bg-white"
                      placeholder="809-000-0000"
                    />
                  </div>
                </div>
              </section>
            )}

            <section>
              <h2 className="text-lg font-black text-slate-900 mb-3">
                Mascotas
              </h2>

              <label className="text-sm font-semibold">¿Tiene mascota?</label>

              <select
                value={tieneMascota}
                onChange={(e) => {
                  setTieneMascota(e.target.value);

                  if (e.target.value === "No") {
                    setTipoMascota("");
                    setCantidadMascotas("");
                    setObservacionMascota("");
                  }
                }}
                className="w-full mt-1 border rounded-xl px-4 py-3 bg-white"
              >
                <option>No</option>
                <option>Sí</option>
              </select>

              {tieneMascota === "Sí" && (
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-semibold">
                      Tipo de mascota
                    </label>

                    <select
                      value={tipoMascota}
                      onChange={(e) => setTipoMascota(e.target.value)}
                      className="w-full mt-1 border rounded-xl px-4 py-3 bg-white"
                    >
                      <option value="">Seleccione tipo</option>
                      <option value="Perro">Perro</option>
                      <option value="Gato">Gato</option>
                      <option value="Aves">Aves</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold">Cantidad</label>

                    <input
                      type="number"
                      value={cantidadMascotas}
                      onChange={(e) => setCantidadMascotas(e.target.value)}
                      className="w-full mt-1 border rounded-xl px-4 py-3"
                      placeholder="Cantidad"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold">Observación</label>

                    <textarea
                      value={observacionMascota}
                      onChange={(e) => setObservacionMascota(e.target.value)}
                      className="w-full mt-1 border rounded-xl px-4 py-3"
                      rows={3}
                      placeholder="Detalle u observación opcional"
                    />
                  </div>
                </div>
              )}
            </section>

            <section className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <h2 className="text-lg font-black text-amber-900 mb-2">
                Confirmación
              </h2>

              <p className="text-sm text-amber-800 mb-3">
                Confirmo que las informaciones suministradas son correctas y
                autorizo a la administración del condominio a utilizarlas para
                fines de contacto, control administrativo y comunicación
                interna.
              </p>

              <label className="flex items-start gap-3 text-sm text-amber-900 font-semibold">
                <input
                  type="checkbox"
                  checked={aceptoConfirmacion}
                  onChange={(e) => setAceptoConfirmacion(e.target.checked)}
                  className="mt-1"
                />
                <span>Acepto términos y confirmo la información.</span>
              </label>
            </section>

            {mensaje && (
              <div
                className={`rounded-xl p-3 text-sm ${
                  exito
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}
              >
                {mensaje}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 hover:bg-green-800 disabled:bg-slate-400 text-white py-4 rounded-2xl font-bold text-lg"
            >
              {loading ? "Enviando información..." : "Enviar información"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 pt-4">
          VAM Administradora de Condominios
        </p>
      </div>
    </main>
  );
}