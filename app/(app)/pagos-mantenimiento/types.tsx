export type Unidad = {
  id: number;
  codigo: string;
  propietario_nombre: string | null;
  propietario_cedula: string | null;
  propietario_telefono: string | null;
  cuota_mensual_actual: number | null;
};

export type CuentaBancaria = {
  id: number;
  nombre_banco: string;
  numero_cuenta: string;
  fondo_tipo: string | null;
  balance_actual: number | null;
  fondo_ordinario: number | null;
  fondo_extraordinario: number | null;
  fondo_reserva: number | null;
};

export type Pago = {
  id: number;
  monto: number;
  fecha_pago: string;
  referencia: string | null;
  metodo_pago: string | null;
  metodo?: string | null;
  origen?: string | null;
  tipo_fondo: string | null;
  descripcion?: string | null;
  comprobante_url: string | null;
  unidades: {
    codigo: string;
    propietario_nombre?: string | null;
  } | null;
};