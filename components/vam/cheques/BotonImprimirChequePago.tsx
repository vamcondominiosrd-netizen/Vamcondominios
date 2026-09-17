"use client";

import { Printer } from "lucide-react";

type CuentaCheque = {
  id: number;
  nombre_banco: string;
  numero_cuenta: string;
};

type Props = {
  solicitudId: number;
  numeroSolicitud: string;
  beneficiario: string;
  monto: number;
  fecha: string;
  numeroCheque: string;
  concepto?: string;
  metodoPago: string;
  cuenta: CuentaCheque | null;
  condominio?: string;
  className?: string;
};

const DATOS_PAGO_STORAGE_KEY = "vam_cheque_impresion_actual";

function normalizar(valor: string | null | undefined) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function BotonImprimirChequePago({
  solicitudId,
  numeroSolicitud,
  beneficiario,
  monto,
  fecha,
  numeroCheque,
  concepto = "",
  metodoPago,
  cuenta,
  condominio = "",
  className = "",
}: Props) {
  function abrirImpresion() {
    if (!normalizar(metodoPago).includes("cheque")) {
      alert("La impresión de cheque solo está disponible cuando el método de pago es Cheque.");
      return;
    }

    if (!cuenta) {
      alert("Debe seleccionar la cuenta bancaria antes de imprimir el cheque.");
      return;
    }

    if (!normalizar(cuenta.nombre_banco).includes("popular")) {
      alert(
        `La plantilla calibrada actualmente corresponde a Banco Popular.\n\nCuenta seleccionada: ${cuenta.nombre_banco}`,
      );
      return;
    }

    if (!fecha) {
      alert("Debe indicar la fecha del cheque.");
      return;
    }

    if (!numeroCheque.trim()) {
      alert("Debe indicar el número de cheque antes de imprimir.");
      return;
    }

    if (!beneficiario.trim()) {
      alert("La solicitud no tiene un proveedor/beneficiario identificado.");
      return;
    }

    if (!(Number(monto) > 0)) {
      alert("El monto del cheque debe ser mayor que cero.");
      return;
    }

    const datos = {
      solicitud_id: solicitudId,
      numero_solicitud: numeroSolicitud,
      beneficiario: beneficiario.trim(),
      monto: Number(monto),
      fecha,
      numero_cheque: numeroCheque.trim(),
      concepto: concepto.trim(),
      banco: cuenta.nombre_banco,
      cuenta_bancaria_id: cuenta.id,
      numero_cuenta: cuenta.numero_cuenta,
      condominio,
    };

    sessionStorage.setItem(DATOS_PAGO_STORAGE_KEY, JSON.stringify(datos));

    window.open("/administracion/cheques/imprimir", "_blank");
  }

  return (
    <button
      type="button"
      onClick={abrirImpresion}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 ${className}`}
    >
      <Printer className="h-4 w-4" />
      Imprimir cheque
    </button>
  );
}
