'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const monedas = [1000, 500, 200, 100, 50]

const formatCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(n || 0)

export default function MonedasPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [planilla, setPlanilla] = useState<any>(null)
  const [cantidades, setCantidades] = useState<Record<number, string>>({})
  const [monedasRegistradas, setMonedasRegistradas] = useState<any[]>([])
  const [esAdmin, setEsAdmin] = useState(false)

  useEffect(() => {
    if (id) {
      verificarRol()
      cargarPlanilla()
      cargarMonedas()
    }
  }, [id])

  const verificarRol = () => {
    const usuarioGuardado = localStorage.getItem('usuario')
    const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null

    if (usuario?.rol === 'admin') {
      setEsAdmin(true)
    }
  }

  const cargarPlanilla = async () => {
    const { data } = await supabase
      .from('cuadre_planilla')
      .select('*')
      .eq('id', id)
      .single()

    setPlanilla(data)
  }

  const cargarMonedas = async () => {
    const { data } = await supabase
      .from('cuadre_monedas')
      .select('*')
      .eq('cuadre_id', id)

    setMonedasRegistradas(data || [])
  }

  const guardarMonedas = async () => {

    // 🔒 BLOQUEO SI ESTÁ CERRADA Y NO ES ADMIN
    if (planilla.cerrado && !esAdmin) {
      alert('Esta planilla está cerrada y no puede modificarse')
      return
    }

    const registros = []

    for (const denom of monedas) {
      const cantidad = Number(cantidades[denom] || 0)

      if (cantidad > 0) {
        registros.push({
          cuadre_id: id,
          denominacion: denom,
          cantidad: cantidad
        })
      }
    }

    if (registros.length > 0) {
      const { error } = await supabase
        .from('cuadre_monedas')
        .insert(registros)

      if (error) {
        alert('Error guardando monedas')
        return
      }
    }

    setCantidades({})
    await cargarMonedas()
  }

  const totalMonedas = monedasRegistradas.reduce(
    (acc, item) => acc + Number(item.total),
    0
  )

  if (!planilla) return <p>Cargando...</p>

  const estaCerrada = planilla.cerrado && !esAdmin

  return (
    <div className="page-container">
      <div className="section-card">

        <h2 className="section-title">Registro de Monedas</h2>

        {estaCerrada && (
          <p className="text-red-600 font-bold">
            PLANILLA CERRADA - SOLO ADMIN PUEDE MODIFICAR
          </p>
        )}

        <p><strong>Empresa:</strong> {planilla.empresa}</p>
        <p><strong>Planilla No:</strong> {planilla.planilla_no}</p>

        <hr />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 300 }}>
          {monedas.map((denom) => (
            <div key={denom} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{formatCOP(denom)}</strong>
              <input
                type="number"
                min="0"
                disabled={estaCerrada}
                value={cantidades[denom] || ''}
                onChange={(e) =>
                  setCantidades({
                    ...cantidades,
                    [denom]: e.target.value
                  })
                }
              />
            </div>
          ))}
        </div>

        <br />

        {!estaCerrada && (
          <button
            className="btn-primary"
            onClick={guardarMonedas}
          >
            Guardar Monedas
          </button>
        )}

        <hr />

        <h3>Monedas Registradas</h3>

        {monedasRegistradas.map((m) => (
          <div key={m.id}>
            {formatCOP(Number(m.denominacion))} x {m.cantidad} = {formatCOP(Number(m.total))}
          </div>
        ))}

        <hr />

        <h3>Total Monedas: {formatCOP(totalMonedas)}</h3>

        <br />

        <div style={{ display: 'flex', gap: 15 }}>
          <button
            className="btn-secondary"
            onClick={() => router.back()}
          >
            ← Volver
          </button>

          <button
            className="btn-primary"
            onClick={() => router.push(`/cuadre/${id}/billetes`)}
          >
            Ir a Billetes →
          </button>
        </div>

      </div>
    </div>
  )
}
