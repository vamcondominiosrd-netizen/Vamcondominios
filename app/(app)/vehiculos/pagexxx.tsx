'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/app/lib/supabaseClient'

type Opcion = {
  id: number
  nombre: string
  raw?: any
}

type Vehiculo = {
  id?: number
  condominio_id: number | null
  condominio: string | null
  unidad_id: number | null
  unidad: string | null
  propietario_id: number | null
  propietario: string | null
  tipo_relacion: string | null
  placa: string
  marca: string | null
  modelo: string | null
  color: string | null
  anio: number | null
  tipo_vehiculo: string | null
  nombre_conductor: string | null
  cedula_conductor: string | null
  telefono_conductor: string | null
  tiene_parqueo: boolean | null
  parqueo_asignado: string | null
  tipo_parqueo: string | null
  estado_parqueo: string | null
  numero_tarjeta_acceso: string | null
  tipo_dispositivo_acceso: string | null
  codigo_dispositivo_acceso: string | null
  fecha_asignacion_tarjeta: string | null
  estado_tarjeta_acceso: string | null
  observacion_tarjeta: string | null
  estado: string | null
  observacion: string | null
  fecha_registro?: string | null
  created_at?: string | null
  updated_at?: string | null
  descripcion_vehiculo?: string | null
  cantidad_parqueos_unidad?: number | null
  parqueos_unidad?: string | null
  estado_validacion?: string | null
}

type DatosComunes = {
  condominio_id: number | null
  condominio: string
  unidad_id: number | null
  unidad: string
  propietario_id: number | null
  propietario: string
  tipo_relacion: string
}

type VehiculoFormulario = {
  placa: string
  marca: string
  modelo: string
  color: string
  anio: number | null
  tipo_vehiculo: string
  nombre_conductor: string
  cedula_conductor: string
  telefono_conductor: string
  tiene_parqueo: boolean
  parqueo_asignado: string
  tipo_parqueo: string
  estado_parqueo: string
  numero_tarjeta_acceso: string
  tipo_dispositivo_acceso: string
  codigo_dispositivo_acceso: string
  fecha_asignacion_tarjeta: string
  estado_tarjeta_acceso: string
  observacion_tarjeta: string
  estado: string
  observacion: string
}

type ParqueoResumen = {
  condominio_id: number | null
  condominio: string | null
  unidad_id: number | null
  unidad: string | null
  propietario_id: number | null
  propietario: string | null
  cantidad_parqueos: number | null
  parqueos_asignados: string | null
  vehiculos_activos: number | null
  vehiculos_con_parqueo: number | null
  vehiculos_sin_parqueo: number | null
  estado_parqueo: string | null
}

const datosComunesInicial: DatosComunes = {
  condominio_id: null,
  condominio: '',
  unidad_id: null,
  unidad: '',
  propietario_id: null,
  propietario: '',
  tipo_relacion: 'Propietario',
}

const vehiculoFormularioInicial: VehiculoFormulario = {
  placa: '',
  marca: '',
  modelo: '',
  color: '',
  anio: null,
  tipo_vehiculo: 'Carro',
  nombre_conductor: '',
  cedula_conductor: '',
  telefono_conductor: '',
  tiene_parqueo: false,
  parqueo_asignado: '',
  tipo_parqueo: 'Sin parqueo',
  estado_parqueo: 'Sin asignar',
  numero_tarjeta_acceso: '',
  tipo_dispositivo_acceso: 'Tarjeta RFID',
  codigo_dispositivo_acceso: '',
  fecha_asignacion_tarjeta: '',
  estado_tarjeta_acceso: 'Activa',
  observacion_tarjeta: '',
  estado: 'Activo',
  observacion: '',
}

const tiposRelacion = [
  'Propietario',
  'Inquilino',
  'Familiar',
  'Empleado',
  'Visitante frecuente',
  'Servicio',
  'Otro',
]

const tiposVehiculo = ['Carro', 'Jeepeta', 'Camioneta', 'Motor', 'Camión', 'Otro']

const tiposParqueo = [
  'Asignado',
  'Visitante autorizado',
  'Parqueo común',
  'Parqueo alquilado',
  'Parqueo externo',
  'Motor',
  'Sin parqueo',
  'Otro',
]

const estadosParqueo = [
  'Asignado',
  'Sin asignar',
  'Pendiente',
  'Suspendido',
  'No autorizado',
]

const tiposDispositivo = [
  'Tarjeta RFID',
  'TAG vehicular',
  'Sticker RFID',
  'Control remoto',
  'Código QR',
  'Lector de placa',
  'Otro',
]

const estadosTarjeta = [
  'Activa',
  'Inactiva',
  'Bloqueada',
  'Extraviada',
  'Devuelta',
  'Pendiente',
]

const estadosVehiculo = [
  'Activo',
  'Inactivo',
  'Bloqueado',
  'Pendiente de validar',
]

function obtenerNombreUnidad(item: any) {
  return (
    item?.unidad ||
    item?.numero_unidad ||
    item?.apartamento ||
    item?.codigo ||
    item?.nombre ||
    item?.descripcion ||
    `Unidad ${item?.id ?? ''}`
  )
}

function obtenerNombrePropietario(item: any) {
  return (
    item?.propietario ||
    item?.nombre_propietario ||
    item?.nombre ||
    item?.nombres ||
    item?.nombre_completo ||
    item?.titular ||
    item?.representante ||
    item?.inquilino ||
    `Propietario ${item?.id ?? ''}`
  )
}

function textoSeguro(value: any) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function obtenerCondominioActual() {
  if (typeof window === 'undefined') return null

  const id =
    localStorage.getItem('condominio_id') ||
    localStorage.getItem('condominioId') ||
    localStorage.getItem('selectedCondominioId') ||
    localStorage.getItem('condominio_actual_id')

  const nombre =
    localStorage.getItem('condominio') ||
    localStorage.getItem('condominio_nombre') ||
    localStorage.getItem('selectedCondominioNombre') ||
    localStorage.getItem('nombre_condominio')

  if (!id) return null

  return {
    id: Number(id),
    nombre: nombre || `Condominio ${id}`,
  }
}

export default function VehiculosPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [parqueos, setParqueos] = useState<ParqueoResumen[]>([])
  const [unidades, setUnidades] = useState<Opcion[]>([])
  const [propietarios, setPropietarios] = useState<Opcion[]>([])
  const [condominioActual, setCondominioActual] = useState<Opcion | null>(null)

  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<number | null>(null)

  const [datosComunes, setDatosComunes] = useState<DatosComunes>(datosComunesInicial)
  const [vehiculosFormulario, setVehiculosFormulario] = useState<VehiculoFormulario[]>([
    { ...vehiculoFormularioInicial },
  ])

  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroEstadoTarjeta, setFiltroEstadoTarjeta] = useState('')
  const [filtroTipoVehiculo, setFiltroTipoVehiculo] = useState('')

  useEffect(() => {
    const actual = obtenerCondominioActual()

    if (actual) {
      setCondominioActual(actual)
      setDatosComunes((prev) => ({
        ...prev,
        condominio_id: actual.id,
        condominio: actual.nombre,
      }))
    }

    cargarDatos(actual)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cargarDatos(condominioParam?: Opcion | null) {
    setLoading(true)

    const actual = condominioParam || condominioActual || obtenerCondominioActual()

    if (actual) {
      setCondominioActual(actual)
    }

    await Promise.all([
      cargarVehiculos(actual),
      cargarParqueos(actual),
      cargarUnidades(actual),
      cargarPropietarios(actual),
    ])

    setLoading(false)
  }

  async function cargarVehiculos(condominioParam?: Opcion | null) {
    const actual = condominioParam || condominioActual || obtenerCondominioActual()

    let query = supabase
      .from('vw_vehiculos_detalle')
      .select('*')
      .order('created_at', { ascending: false })

    if (actual?.id) {
      query = query.eq('condominio_id', actual.id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error cargando vehículos:', error.message)

      let fallbackQuery = supabase
        .from('vehiculos')
        .select('*')
        .order('created_at', { ascending: false })

      if (actual?.id) {
        fallbackQuery = fallbackQuery.eq('condominio_id', actual.id)
      }

      const fallback = await fallbackQuery

      if (!fallback.error) {
        setVehiculos((fallback.data || []) as Vehiculo[])
      }

      return
    }

    setVehiculos((data || []) as Vehiculo[])
  }

  async function cargarParqueos(condominioParam?: Opcion | null) {
    const actual = condominioParam || condominioActual || obtenerCondominioActual()

    let query = supabase.from('vw_control_parqueos').select('*')

    if (actual?.id) {
      query = query.eq('condominio_id', actual.id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error cargando control de parqueos:', error.message)
      setParqueos([])
      return
    }

    setParqueos((data || []) as ParqueoResumen[])
  }

  async function cargarUnidades(condominioParam?: Opcion | null) {
    const actual = condominioParam || condominioActual || obtenerCondominioActual()

    let query = supabase.from('unidades').select('*').order('id', { ascending: true })

    if (actual?.id) {
      query = query.eq('condominio_id', actual.id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error cargando unidades:', error.message)
      setUnidades([])
      return
    }

    setUnidades(
      (data || []).map((item: any) => ({
        id: item.id,
        nombre: obtenerNombreUnidad(item),
        raw: item,
      }))
    )
  }

  async function cargarPropietarios(condominioParam?: Opcion | null) {
    const actual = condominioParam || condominioActual || obtenerCondominioActual()

    let query = supabase
      .from('propietarios_apartamentos')
      .select('*')
      .order('id', { ascending: true })

    if (actual?.id) {
      query = query.eq('condominio_id', actual.id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error cargando propietarios:', error.message)
      setPropietarios([])
      return
    }

    setPropietarios(
      (data || []).map((item: any) => ({
        id: item.id,
        nombre: obtenerNombrePropietario(item),
        raw: item,
      }))
    )
  }

  const vehiculosFiltrados = useMemo(() => {
    const texto = filtroTexto.trim().toLowerCase()

    return vehiculos.filter((v) => {
      const coincideTexto =
        !texto ||
        [
          v.placa,
          v.marca,
          v.modelo,
          v.color,
          v.unidad,
          v.propietario,
          v.nombre_conductor,
          v.numero_tarjeta_acceso,
          v.codigo_dispositivo_acceso,
          v.parqueo_asignado,
        ]
          .filter(Boolean)
          .some((campo) => String(campo).toLowerCase().includes(texto))

      const coincideEstado = !filtroEstado || String(v.estado || '') === filtroEstado

      const coincideTarjeta =
        !filtroEstadoTarjeta ||
        String(v.estado_tarjeta_acceso || '') === filtroEstadoTarjeta

      const coincideTipo =
        !filtroTipoVehiculo || String(v.tipo_vehiculo || '') === filtroTipoVehiculo

      return coincideTexto && coincideEstado && coincideTarjeta && coincideTipo
    })
  }, [vehiculos, filtroTexto, filtroEstado, filtroEstadoTarjeta, filtroTipoVehiculo])

  const resumen = useMemo(() => {
    const total = vehiculos.length
    const activos = vehiculos.filter((v) => v.estado === 'Activo').length
    const bloqueados = vehiculos.filter((v) => v.estado === 'Bloqueado').length
    const tarjetasBloqueadas = vehiculos.filter(
      (v) => v.estado_tarjeta_acceso === 'Bloqueada'
    ).length
    const excedidos = parqueos.filter((p) => p.estado_parqueo === 'Excede').length

    return { total, activos, bloqueados, tarjetasBloqueadas, excedidos }
  }, [vehiculos, parqueos])

  const parqueoUnidadActual = useMemo(() => {
    if (!datosComunes.unidad_id) return null

    return parqueos.find(
      (p) =>
        Number(p.unidad_id) === Number(datosComunes.unidad_id) &&
        Number(p.condominio_id) === Number(datosComunes.condominio_id)
    )
  }, [datosComunes.unidad_id, datosComunes.condominio_id, parqueos])

  function abrirNuevo() {
    const actual = condominioActual || obtenerCondominioActual()

    setEditandoId(null)
    setDatosComunes({
      ...datosComunesInicial,
      condominio_id: actual?.id || null,
      condominio: actual?.nombre || '',
    })
    setVehiculosFormulario([{ ...vehiculoFormularioInicial }])
    setModalAbierto(true)
  }

  function abrirEditar(v: Vehiculo) {
    setEditandoId(v.id || null)

    setDatosComunes({
      condominio_id: v.condominio_id,
      condominio: v.condominio || condominioActual?.nombre || '',
      unidad_id: v.unidad_id,
      unidad: v.unidad || '',
      propietario_id: v.propietario_id,
      propietario: v.propietario || '',
      tipo_relacion: v.tipo_relacion || 'Propietario',
    })

    setVehiculosFormulario([
      {
        placa: v.placa || '',
        marca: v.marca || '',
        modelo: v.modelo || '',
        color: v.color || '',
        anio: v.anio ? Number(v.anio) : null,
        tipo_vehiculo: v.tipo_vehiculo || 'Carro',
        nombre_conductor: v.nombre_conductor || '',
        cedula_conductor: v.cedula_conductor || '',
        telefono_conductor: v.telefono_conductor || '',
        tiene_parqueo: !!v.tiene_parqueo,
        parqueo_asignado: v.parqueo_asignado || '',
        tipo_parqueo: v.tipo_parqueo || 'Sin parqueo',
        estado_parqueo: v.estado_parqueo || 'Sin asignar',
        numero_tarjeta_acceso: v.numero_tarjeta_acceso || '',
        tipo_dispositivo_acceso: v.tipo_dispositivo_acceso || 'Tarjeta RFID',
        codigo_dispositivo_acceso: v.codigo_dispositivo_acceso || '',
        fecha_asignacion_tarjeta: v.fecha_asignacion_tarjeta || '',
        estado_tarjeta_acceso: v.estado_tarjeta_acceso || 'Activa',
        observacion_tarjeta: v.observacion_tarjeta || '',
        estado: v.estado || 'Activo',
        observacion: v.observacion || '',
      },
    ])

    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setEditandoId(null)
    setDatosComunes(datosComunesInicial)
    setVehiculosFormulario([{ ...vehiculoFormularioInicial }])
  }

  function actualizarDatoComun(campo: keyof DatosComunes, valor: any) {
    setDatosComunes((prev) => ({ ...prev, [campo]: valor }))
  }

  function seleccionarUnidad(id: string) {
    const item = unidades.find((u) => String(u.id) === id)

    const propietarioId =
      item?.raw?.propietario_id || item?.raw?.owner_id || item?.raw?.titular_id || null

    const propietarioNombre =
      item?.raw?.propietario ||
      item?.raw?.nombre_propietario ||
      item?.raw?.titular ||
      ''

    setDatosComunes((prev) => ({
      ...prev,
      unidad_id: item?.id || null,
      unidad: item?.nombre || '',
      propietario_id: propietarioId ? Number(propietarioId) : prev.propietario_id,
      propietario: propietarioNombre || prev.propietario,
    }))
  }

  function seleccionarPropietario(id: string) {
    const item = propietarios.find((p) => String(p.id) === id)

    setDatosComunes((prev) => ({
      ...prev,
      propietario_id: item?.id || null,
      propietario: item?.nombre || '',
    }))
  }

  function agregarVehiculoFormulario() {
    setVehiculosFormulario((prev) => [...prev, { ...vehiculoFormularioInicial }])
  }

  function eliminarVehiculoFormulario(index: number) {
    setVehiculosFormulario((prev) => {
      if (prev.length === 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  function actualizarVehiculoFormulario(
    index: number,
    campo: keyof VehiculoFormulario,
    valor: any
  ) {
    setVehiculosFormulario((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item))
    )
  }

  async function guardarVehiculo() {
    if (!datosComunes.condominio_id) {
      alert('No se detectó el condominio actual. Vuelve a entrar al sistema desde un condominio.')
      return
    }

    if (!datosComunes.unidad_id && !datosComunes.unidad) {
      alert('Debes seleccionar o escribir la unidad.')
      return
    }

    const vehiculosValidos = vehiculosFormulario.filter((v) => v.placa.trim())

    if (vehiculosValidos.length === 0) {
      alert('Debes colocar por lo menos una placa.')
      return
    }

    const placas = vehiculosValidos.map((v) => v.placa.trim().toUpperCase())
    const placasUnicas = new Set(placas)

    if (placas.length !== placasUnicas.size) {
      alert('Hay placas repetidas en el formulario. Verifica antes de guardar.')
      return
    }

    setGuardando(true)

    const crearPayload = (v: VehiculoFormulario) => ({
      condominio_id: datosComunes.condominio_id,
      condominio: datosComunes.condominio || null,
      unidad_id: datosComunes.unidad_id,
      unidad: datosComunes.unidad || null,
      propietario_id: datosComunes.propietario_id,
      propietario: datosComunes.propietario || null,
      tipo_relacion: datosComunes.tipo_relacion || null,

      placa: v.placa.trim().toUpperCase(),
      marca: v.marca || null,
      modelo: v.modelo || null,
      color: v.color || null,
      anio: v.anio || null,
      tipo_vehiculo: v.tipo_vehiculo || null,

      nombre_conductor: v.nombre_conductor || null,
      cedula_conductor: v.cedula_conductor || null,
      telefono_conductor: v.telefono_conductor || null,

      tiene_parqueo: !!v.tiene_parqueo,
      parqueo_asignado: v.parqueo_asignado || null,
      tipo_parqueo: v.tipo_parqueo || null,
      estado_parqueo: v.estado_parqueo || null,

      numero_tarjeta_acceso: v.numero_tarjeta_acceso || null,
      tipo_dispositivo_acceso: v.tipo_dispositivo_acceso || null,
      codigo_dispositivo_acceso: v.codigo_dispositivo_acceso || null,
      fecha_asignacion_tarjeta: v.fecha_asignacion_tarjeta || null,
      estado_tarjeta_acceso: v.estado_tarjeta_acceso || null,
      observacion_tarjeta: v.observacion_tarjeta || null,

      estado: v.estado || 'Activo',
      observacion: v.observacion || null,
    })

    if (editandoId) {
      const { error } = await supabase
        .from('vehiculos')
        .update(crearPayload(vehiculosValidos[0]))
        .eq('id', editandoId)

      setGuardando(false)

      if (error) {
        alert(`No se pudo actualizar el vehículo: ${error.message}`)
        return
      }

      await cargarDatos(condominioActual || obtenerCondominioActual())
      cerrarModal()
      return
    }

    const payload = vehiculosValidos.map((v) => crearPayload(v))

    const { error } = await supabase.from('vehiculos').insert(payload)

    setGuardando(false)

    if (error) {
      alert(`No se pudieron guardar los vehículos: ${error.message}`)
      return
    }

    await cargarDatos(condominioActual || obtenerCondominioActual())
    cerrarModal()
  }

  async function cambiarEstadoVehiculo(v: Vehiculo, nuevoEstado: string) {
    if (!v.id) return

    const confirmar = window.confirm(
      `¿Seguro que deseas cambiar el estado del vehículo ${v.placa} a "${nuevoEstado}"?`
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('vehiculos')
      .update({ estado: nuevoEstado })
      .eq('id', v.id)

    if (error) {
      alert(`No se pudo actualizar el estado: ${error.message}`)
      return
    }

    await cargarDatos(condominioActual || obtenerCondominioActual())
  }

  async function cambiarEstadoTarjeta(v: Vehiculo, nuevoEstado: string) {
    if (!v.id) return

    const confirmar = window.confirm(
      `¿Seguro que deseas cambiar la tarjeta/TAG del vehículo ${v.placa} a "${nuevoEstado}"?`
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('vehiculos')
      .update({ estado_tarjeta_acceso: nuevoEstado })
      .eq('id', v.id)

    if (error) {
      alert(`No se pudo actualizar la tarjeta: ${error.message}`)
      return
    }

    await cargarDatos(condominioActual || obtenerCondominioActual())
  }

  async function eliminarVehiculo(v: Vehiculo) {
    if (!v.id) return

    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar el vehículo ${v.placa}? Esta acción no se puede deshacer.`
    )

    if (!confirmar) return

    const { error } = await supabase.from('vehiculos').delete().eq('id', v.id)

    if (error) {
      alert(`No se pudo eliminar: ${error.message}`)
      return
    }

    await cargarDatos(condominioActual || obtenerCondominioActual())
  }

  function exportarCSV() {
    const encabezados = [
      'Placa',
      'Marca',
      'Modelo',
      'Color',
      'Unidad',
      'Propietario',
      'Conductor',
      'Parqueo',
      'Tarjeta',
      'Estado Vehículo',
      'Estado Tarjeta',
    ]

    const filas = vehiculosFiltrados.map((v) => [
      v.placa,
      v.marca,
      v.modelo,
      v.color,
      v.unidad,
      v.propietario,
      v.nombre_conductor,
      v.parqueo_asignado,
      v.numero_tarjeta_acceso,
      v.estado,
      v.estado_tarjeta_acceso,
    ])

    const csv = [encabezados, ...filas]
      .map((fila) =>
        fila.map((valor) => `"${String(valor || '').replace(/"/g, '""')}"`).join(',')
      )
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'vehiculos_vam.csv'
    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">VAM Condominio</p>
              <h1 className="text-2xl font-bold text-slate-900">Módulo de Vehículos</h1>
              <p className="mt-1 text-sm text-slate-500">
                Vehículos del condominio actual, con control de parqueos,
                tarjeta/TAG y preparación para control de acceso externo.
              </p>
              <div className="mt-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                {condominioActual?.nombre || 'Condominio actual no detectado'}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => cargarDatos(condominioActual || obtenerCondominioActual())}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Actualizar
              </button>

              <button
                onClick={exportarCSV}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Exportar CSV
              </button>

              <button
                onClick={abrirNuevo}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                + Nuevo Vehículo
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <ResumenCard titulo="Vehículos" valor={resumen.total} detalle="Total registrados" />
          <ResumenCard titulo="Activos" valor={resumen.activos} detalle="Permitidos" />
          <ResumenCard titulo="Bloqueados" valor={resumen.bloqueados} detalle="No permitidos" />
          <ResumenCard
            titulo="Tarjetas bloqueadas"
            valor={resumen.tarjetasBloqueadas}
            detalle="TAG / RFID"
          />
          <ResumenCard
            titulo="Parqueos excedidos"
            valor={resumen.excedidos}
            detalle="Unidades con alerta"
            alerta={resumen.excedidos > 0}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-5">
            <input
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar placa, unidad, propietario, tarjeta..."
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 md:col-span-2"
            />

            <input
              value={condominioActual?.nombre || ''}
              readOnly
              className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700 outline-none"
            />

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Todos los estados</option>
              {estadosVehiculo.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>

            <select
              value={filtroEstadoTarjeta}
              onChange={(e) => setFiltroEstadoTarjeta(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Estado tarjeta</option>
              {estadosTarjeta.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>

            <select
              value={filtroTipoVehiculo}
              onChange={(e) => setFiltroTipoVehiculo(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Tipo vehículo</option>
              {tiposVehiculo.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold text-slate-900">Vehículos registrados</h2>
            <p className="text-sm text-slate-500">
              Mostrando {vehiculosFiltrados.length} registro(s).
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">Cargando vehículos...</div>
          ) : vehiculosFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl">🚗</div>
              <h3 className="mt-2 font-semibold text-slate-900">
                No hay vehículos registrados
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Agrega el primer vehículo para iniciar el control.
              </p>
              <button
                onClick={abrirNuevo}
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                + Nuevo Vehículo
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Placa</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Vehículo
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Unidad / Propietario
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Parqueo
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Tarjeta / TAG
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {vehiculosFiltrados.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{textoSeguro(v.placa)}</div>
                        <div className="text-xs text-slate-500">{textoSeguro(v.tipo_vehiculo)}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {[v.marca, v.modelo].filter(Boolean).join(' ') || '—'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {textoSeguro(v.color)}
                          {v.anio ? ` • ${v.anio}` : ''}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{textoSeguro(v.unidad)}</div>
                        <div className="text-xs text-slate-500">{textoSeguro(v.propietario)}</div>
                        <div className="text-xs text-slate-400">
                          Relación: {textoSeguro(v.tipo_relacion)}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {v.tiene_parqueo ? textoSeguro(v.parqueo_asignado) : 'Sin parqueo'}
                        </div>
                        <div className="text-xs text-slate-500">{textoSeguro(v.estado_parqueo)}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {textoSeguro(v.numero_tarjeta_acceso)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {textoSeguro(v.tipo_dispositivo_acceso)}
                        </div>
                        <EstadoBadge estado={v.estado_tarjeta_acceso || 'Activa'} />
                      </td>

                      <td className="px-4 py-3">
                        <EstadoBadge estado={v.estado || 'Activo'} />
                        <div className="mt-1 text-xs text-slate-500">
                          {textoSeguro(v.estado_validacion)}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            onClick={() => abrirEditar(v)}
                            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Editar
                          </button>

                          {v.estado === 'Bloqueado' ? (
                            <button
                              onClick={() => cambiarEstadoVehiculo(v, 'Activo')}
                              className="rounded-lg border border-green-300 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-50"
                            >
                              Activar
                            </button>
                          ) : (
                            <button
                              onClick={() => cambiarEstadoVehiculo(v, 'Bloqueado')}
                              className="rounded-lg border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                            >
                              Bloquear
                            </button>
                          )}

                          {v.estado_tarjeta_acceso === 'Bloqueada' ? (
                            <button
                              onClick={() => cambiarEstadoTarjeta(v, 'Activa')}
                              className="rounded-lg border border-green-300 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-50"
                            >
                              Activar TAG
                            </button>
                          ) : (
                            <button
                              onClick={() => cambiarEstadoTarjeta(v, 'Bloqueada')}
                              className="rounded-lg border border-orange-300 px-3 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-50"
                            >
                              Bloquear TAG
                            </button>
                          )}

                          <button
                            onClick={() => eliminarVehiculo(v)}
                            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Control de parqueos</h2>
          <p className="text-sm text-slate-500">
            Comparación de cantidad de parqueos vs vehículos activos por unidad.
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Unidad</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Propietario
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">
                    Parqueos
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">
                    Vehículos
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">
                    Sin parqueo
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Estado</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {parqueos.slice(0, 15).map((p) => (
                  <tr key={`${p.condominio_id}-${p.unidad_id}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {textoSeguro(p.unidad)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{textoSeguro(p.propietario)}</td>
                    <td className="px-4 py-3 text-center">{p.cantidad_parqueos || 0}</td>
                    <td className="px-4 py-3 text-center">{p.vehiculos_activos || 0}</td>
                    <td className="px-4 py-3 text-center">{p.vehiculos_sin_parqueo || 0}</td>
                    <td className="px-4 py-3">
                      <ParqueoBadge estado={p.estado_parqueo || 'Sin información'} />
                    </td>
                  </tr>
                ))}

                {parqueos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      No hay datos de control de parqueos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-6xl rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {editandoId ? 'Editar vehículo' : 'Nuevo registro de vehículos'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Selecciona la unidad y propietario una sola vez. Luego puedes agregar
                    varios vehículos en la misma pantalla.
                  </p>
                </div>

                <button
                  onClick={cerrarModal}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="space-y-6 p-5">
              <Seccion titulo="Datos del condominio, unidad y propietario">
                <div className="grid gap-4 md:grid-cols-3">
                  <Campo label="Condominio">
                    <input
                      value={condominioActual?.nombre || datosComunes.condominio || ''}
                      readOnly
                      className="input-vam bg-slate-100 text-slate-700"
                    />
                  </Campo>

                  <Campo label="Unidad">
                    <select
                      value={datosComunes.unidad_id || ''}
                      onChange={(e) => seleccionarUnidad(e.target.value)}
                      className="input-vam"
                    >
                      <option value="">Seleccionar</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre}
                        </option>
                      ))}
                    </select>
                  </Campo>

                  <Campo label="Propietario">
                    <select
                      value={datosComunes.propietario_id || ''}
                      onChange={(e) => seleccionarPropietario(e.target.value)}
                      className="input-vam"
                    >
                      <option value="">Seleccionar</option>
                      {propietarios.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </Campo>

                  <Campo label="Nombre de unidad">
                    <input
                      value={datosComunes.unidad || ''}
                      onChange={(e) => actualizarDatoComun('unidad', e.target.value)}
                      className="input-vam"
                      placeholder="Ej: L9-A1"
                    />
                  </Campo>

                  <Campo label="Nombre propietario">
                    <input
                      value={datosComunes.propietario || ''}
                      onChange={(e) => actualizarDatoComun('propietario', e.target.value)}
                      className="input-vam"
                      placeholder="Nombre del propietario"
                    />
                  </Campo>

                  <Campo label="Relación">
                    <select
                      value={datosComunes.tipo_relacion || ''}
                      onChange={(e) => actualizarDatoComun('tipo_relacion', e.target.value)}
                      className="input-vam"
                    >
                      {tiposRelacion.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </Campo>
                </div>
              </Seccion>

              {parqueoUnidadActual && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <strong>Estado de parqueo de la unidad:</strong>{' '}
                  {parqueoUnidadActual.estado_parqueo}. Parqueos asignados:{' '}
                  {parqueoUnidadActual.cantidad_parqueos || 0}. Vehículos activos:{' '}
                  {parqueoUnidadActual.vehiculos_activos || 0}.
                </div>
              )}

              <Seccion titulo={editandoId ? 'Vehículo a editar' : 'Vehículos a registrar'}>
                <div className="space-y-5">
                  {vehiculosFormulario.map((vehiculoItem, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            Vehículo {index + 1}
                          </h4>
                          <p className="text-xs text-slate-500">
                            Registra placa, parqueo, tarjeta/TAG y datos del conductor.
                          </p>
                        </div>

                        {!editandoId && vehiculosFormulario.length > 1 && (
                          <button
                            type="button"
                            onClick={() => eliminarVehiculoFormulario(index)}
                            className="rounded-lg border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Quitar
                          </button>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-4">
                        <Campo label="Placa">
                          <input
                            value={vehiculoItem.placa}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(
                                index,
                                'placa',
                                e.target.value.toUpperCase()
                              )
                            }
                            className="input-vam"
                            placeholder="Ej: A123456"
                          />
                        </Campo>

                        <Campo label="Marca">
                          <input
                            value={vehiculoItem.marca}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(index, 'marca', e.target.value)
                            }
                            className="input-vam"
                            placeholder="Toyota"
                          />
                        </Campo>

                        <Campo label="Modelo">
                          <input
                            value={vehiculoItem.modelo}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(index, 'modelo', e.target.value)
                            }
                            className="input-vam"
                            placeholder="Corolla"
                          />
                        </Campo>

                        <Campo label="Color">
                          <input
                            value={vehiculoItem.color}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(index, 'color', e.target.value)
                            }
                            className="input-vam"
                            placeholder="Blanco"
                          />
                        </Campo>

                        <Campo label="Año">
                          <input
                            type="number"
                            value={vehiculoItem.anio || ''}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(
                                index,
                                'anio',
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                            className="input-vam"
                            placeholder="2020"
                          />
                        </Campo>

                        <Campo label="Tipo vehículo">
                          <select
                            value={vehiculoItem.tipo_vehiculo}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(
                                index,
                                'tipo_vehiculo',
                                e.target.value
                              )
                            }
                            className="input-vam"
                          >
                            {tiposVehiculo.map((tipo) => (
                              <option key={tipo} value={tipo}>
                                {tipo}
                              </option>
                            ))}
                          </select>
                        </Campo>

                        <Campo label="Estado vehículo">
                          <select
                            value={vehiculoItem.estado}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(index, 'estado', e.target.value)
                            }
                            className="input-vam"
                          >
                            {estadosVehiculo.map((estado) => (
                              <option key={estado} value={estado}>
                                {estado}
                              </option>
                            ))}
                          </select>
                        </Campo>

                        <Campo label="Nombre conductor">
                          <input
                            value={vehiculoItem.nombre_conductor}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(
                                index,
                                'nombre_conductor',
                                e.target.value
                              )
                            }
                            className="input-vam"
                            placeholder="Nombre completo"
                          />
                        </Campo>

                        <Campo label="Cédula conductor">
                          <input
                            value={vehiculoItem.cedula_conductor}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(
                                index,
                                'cedula_conductor',
                                e.target.value
                              )
                            }
                            className="input-vam"
                            placeholder="000-0000000-0"
                          />
                        </Campo>

                        <Campo label="Teléfono conductor">
                          <input
                            value={vehiculoItem.telefono_conductor}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(
                                index,
                                'telefono_conductor',
                                e.target.value
                              )
                            }
                            className="input-vam"
                            placeholder="809-000-0000"
                          />
                        </Campo>

                        <Campo label="¿Tiene parqueo?">
                          <select
                            value={vehiculoItem.tiene_parqueo ? 'si' : 'no'}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(
                                index,
                                'tiene_parqueo',
                                e.target.value === 'si'
                              )
                            }
                            className="input-vam"
                          >
                            <option value="no">No</option>
                            <option value="si">Sí</option>
                          </select>
                        </Campo>

                        <Campo label="Parqueo asignado">
                          <input
                            value={vehiculoItem.parqueo_asignado}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(
                                index,
                                'parqueo_asignado',
                                e.target.value
                              )
                            }
                            className="input-vam"
                            placeholder="Ej: P-01"
                          />
                        </Campo>

                        <Campo label="Tipo parqueo">
                          <select
                            value={vehiculoItem.tipo_parqueo}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(index, 'tipo_parqueo', e.target.value)
                            }
                            className="input-vam"
                          >
                            {tiposParqueo.map((tipo) => (
                              <option key={tipo} value={tipo}>
                                {tipo}
                              </option>
                            ))}
                          </select>
                        </Campo>

                        <Campo label="Estado parqueo">
                          <select
                            value={vehiculoItem.estado_parqueo}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(
                                index,
                                'estado_parqueo',
                                e.target.value
                              )
                            }
                            className="input-vam"
                          >
                            {estadosParqueo.map((estado) => (
                              <option key={estado} value={estado}>
                                {estado}
                              </option>
                            ))}
                          </select>
                        </Campo>

                        <Campo label="Número tarjeta / TAG">
                          <input
                            value={vehiculoItem.numero_tarjeta_acceso}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(
                                index,
                                'numero_tarjeta_acceso',
                                e.target.value
                              )
                            }
                            className="input-vam"
                            placeholder="00058291"
                          />
                        </Campo>

                        <Campo label="Tipo dispositivo">
                          <select
                            value={vehiculoItem.tipo_dispositivo_acceso}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(
                                index,
                                'tipo_dispositivo_acceso',
                                e.target.value
                              )
                            }
                            className="input-vam"
                          >
                            {tiposDispositivo.map((tipo) => (
                              <option key={tipo} value={tipo}>
                                {tipo}
                              </option>
                            ))}
                          </select>
                        </Campo>

                        <Campo label="Código externo leído">
                          <input
                            value={vehiculoItem.codigo_dispositivo_acceso}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(
                                index,
                                'codigo_dispositivo_acceso',
                                e.target.value
                              )
                            }
                            className="input-vam"
                            placeholder="RFID-00058291"
                          />
                        </Campo>

                        <Campo label="Fecha asignación">
                          <input
                            type="date"
                            value={vehiculoItem.fecha_asignacion_tarjeta}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(
                                index,
                                'fecha_asignacion_tarjeta',
                                e.target.value
                              )
                            }
                            className="input-vam"
                          />
                        </Campo>

                        <Campo label="Estado tarjeta">
                          <select
                            value={vehiculoItem.estado_tarjeta_acceso}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(
                                index,
                                'estado_tarjeta_acceso',
                                e.target.value
                              )
                            }
                            className="input-vam"
                          >
                            {estadosTarjeta.map((estado) => (
                              <option key={estado} value={estado}>
                                {estado}
                              </option>
                            ))}
                          </select>
                        </Campo>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <Campo label="Observación tarjeta">
                          <input
                            value={vehiculoItem.observacion_tarjeta}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(
                                index,
                                'observacion_tarjeta',
                                e.target.value
                              )
                            }
                            className="input-vam"
                            placeholder="Entregada, extraviada, pendiente..."
                          />
                        </Campo>

                        <Campo label="Observación general">
                          <input
                            value={vehiculoItem.observacion}
                            onChange={(e) =>
                              actualizarVehiculoFormulario(index, 'observacion', e.target.value)
                            }
                            className="input-vam"
                            placeholder="Notas internas del vehículo..."
                          />
                        </Campo>
                      </div>
                    </div>
                  ))}

                  {!editandoId && (
                    <button
                      type="button"
                      onClick={agregarVehiculoFormulario}
                      className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      + Agregar otro vehículo
                    </button>
                  )}
                </div>
              </Seccion>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 md:flex-row md:justify-end">
              <button
                onClick={cerrarModal}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>

              <button
                onClick={guardarVehiculo}
                disabled={guardando}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {guardando
                  ? 'Guardando...'
                  : editandoId
                    ? 'Actualizar vehículo'
                    : 'Guardar vehículos'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input-vam {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(203 213 225);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          background: white;
        }

        .input-vam:focus {
          border-color: rgb(59 130 246);
        }
      `}</style>
    </div>
  )
}

function ResumenCard({
  titulo,
  valor,
  detalle,
  alerta = false,
}: {
  titulo: string
  valor: number
  detalle: string
  alerta?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        alerta ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
      }`}
    >
      <p className="text-sm font-medium text-slate-500">{titulo}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{valor}</p>
      <p className="mt-1 text-xs text-slate-500">{detalle}</p>
    </div>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const normalizado = estado || 'Activo'

  let clases = 'bg-slate-100 text-slate-700 border-slate-200'

  if (['Activo', 'Activa', 'Autorizado'].includes(normalizado)) {
    clases = 'bg-green-50 text-green-700 border-green-200'
  }

  if (['Bloqueado', 'Bloqueada', 'Extraviada'].includes(normalizado)) {
    clases = 'bg-red-50 text-red-700 border-red-200'
  }

  if (['Pendiente', 'Pendiente de validar', 'Inactivo', 'Inactiva'].includes(normalizado)) {
    clases = 'bg-amber-50 text-amber-700 border-amber-200'
  }

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${clases}`}>
      {normalizado}
    </span>
  )
}

function ParqueoBadge({ estado }: { estado: string }) {
  let clases = 'bg-slate-100 text-slate-700 border-slate-200'

  if (estado === 'Correcto') {
    clases = 'bg-green-50 text-green-700 border-green-200'
  }

  if (estado === 'Disponible') {
    clases = 'bg-blue-50 text-blue-700 border-blue-200'
  }

  if (estado === 'Excede') {
    clases = 'bg-red-50 text-red-700 border-red-200'
  }

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${clases}`}>
      {estado}
    </span>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <h3 className="mb-4 font-semibold text-slate-900">{titulo}</h3>
      {children}
    </div>
  )
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}