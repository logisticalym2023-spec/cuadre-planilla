'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type FormKeys =
  | 'dev_paseo'
  | 'dev_mala'
  | 'consignacion_brinks'
  | 'consignacion_banco'
  | 'redespacho_manana'
  | 'peajes'
  | 'combustible'
  | 'fletes'
  | 'acompanamiento'
  | 'gasto_oficina'
  | 'descuento_clientes'
  | 'vale'
  | 'agotado'

const KEYS: FormKeys[] = [
  'dev_paseo',
  'dev_mala',
  'consignacion_brinks',
  'consignacion_banco',
  'redespacho_manana',
  'peajes',
  'combustible',
  'fletes',
  'acompanamiento',
  'gasto_oficina',
  'descuento_clientes',
  'vale',
  'agotado'
]

const formatCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(n || 0)

type InputProps = {
  label: string
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

const InputRow = ({ label, value, onChange, disabled }: InputProps) => {
  const formatVisual = (n: number) =>
    new Intl.NumberFormat('es-CO').format(n || 0)

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
      <div style={{ width: 220 }}>
        <strong>{label}</strong>
      </div>

      <div style={{ position: 'relative', maxWidth: 260 }}>
        <span
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#555'
          }}
        >
          $
        </span>

        <input
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={value === 0 ? '' : formatVisual(value)}
          onChange={(e) => {
            const numero =
              Number(e.target.value.replace(/[^\d]/g, '')) || 0
            onChange(numero)
          }}
          className="input"
          style={{
            paddingLeft: 25,
            textAlign: 'right'
          }}
        />
      </div>
    </div>
  )
}

export default function NovedadesPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [planilla, setPlanilla] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [esAdmin, setEsAdmin] = useState(false)

  const [form, setForm] = useState<Record<FormKeys, number>>({
    dev_paseo: 0,
    dev_mala: 0,
    consignacion_brinks: 0,
    consignacion_banco: 0,
    redespacho_manana: 0,
    peajes: 0,
    combustible: 0,
    fletes: 0,
    acompanamiento: 0,
    gasto_oficina: 0,
    descuento_clientes: 0,
    vale: 0,
    agotado: 0
  })

  useEffect(() => {
    if (id) {
      verificarRol()
      cargarDatos()
    }
  }, [id])

  const verificarRol = () => {
    const usuarioGuardado = localStorage.getItem('usuario')
    const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null

    if (usuario?.rol === 'admin') {
      setEsAdmin(true)
    }
  }

  const cargarDatos = async () => {
    const { data } = await supabase
      .from('cuadre_planilla')
      .select('*')
      .eq('id', id)
      .single()

    if (data) {
      setPlanilla(data)

      const valores: Record<FormKeys, number> = {} as any
      KEYS.forEach((key) => {
        valores[key] = Number(data[key] || 0)
      })

      setForm(valores)
    }

    setLoading(false)
  }

  const handleChange = (campo: FormKeys, numero: number) => {

    if (campo === 'agotado') {
      const valorPlanilla = Number(planilla?.planilla_valor || 0)

      if (numero > valorPlanilla) {
        alert('El valor agotado no puede ser mayor al valor de la planilla')
        return
      }
    }

    setForm((prev) => ({
      ...prev,
      [campo]: numero
    }))
  }

  const totalNovedades = useMemo(() => {
    return KEYS
      .filter(key => key !== 'agotado')
      .reduce((acc, key) => acc + form[key], 0)
  }, [form])

  const guardarYContinuar = async () => {

    if (planilla.cerrado && !esAdmin) {
      alert('Esta planilla está cerrada y no puede modificarse')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('cuadre_planilla')
      .update(form)
      .eq('id', id)

    if (error) {
      alert('Error guardando novedades')
      setSaving(false)
      return
    }

    router.push(`/cuadre/${id}/resumen`)
  }

  if (loading) return <p>Cargando...</p>
  if (!planilla) return <p>No se encontró la planilla</p>

  const estaCerrada = planilla.cerrado && !esAdmin

  return (
    <div className="page-container">
      <div className="section-card">

        <h2 className="section-title">Novedades y Gastos</h2>

        {estaCerrada && (
          <p className="text-red-600 font-bold">
            PLANILLA CERRADA - SOLO ADMIN PUEDE MODIFICAR
          </p>
        )}

        <p><strong>Empresa:</strong> {planilla.empresa}</p>
        <p><strong>Fecha:</strong> {planilla.fecha}</p>
        <p><strong>Vehículo:</strong> {planilla.vehiculo}</p>
        <p><strong>Planilla No:</strong> {planilla.planilla_no}</p>
        <p><strong>Valor Planilla:</strong> {formatCOP(planilla.planilla_valor)}</p>

        <hr />

        {KEYS.map((key) => (
          <InputRow
            key={key}
            label={key.replace('_', ' ').toUpperCase()}
            value={form[key]}
            onChange={(v) => handleChange(key, v)}
            disabled={estaCerrada}
          />
        ))}

        <hr />

        <p>
          <strong>Total Novedades + Gastos:</strong> {formatCOP(totalNovedades)}
        </p>

        <br />

        <div style={{ display: 'flex', gap: 15 }}>
          <button
            className="btn-secondary"
            onClick={() => router.push(`/cuadre/${id}/billetes`)}
          >
            ← Volver
          </button>

          {!estaCerrada && (
            <button
              className="btn-primary"
              onClick={guardarYContinuar}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar y Continuar →'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}