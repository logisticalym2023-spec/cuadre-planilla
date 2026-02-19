'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const billetes = [100000, 50000, 20000, 10000, 5000, 2000]

export default function BilletesPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [planilla, setPlanilla] = useState<any>(null)
  const [cantidades, setCantidades] = useState<Record<number, string>>({})
  const [billetesRegistrados, setBilletesRegistrados] = useState<any[]>([])

  useEffect(() => {
    if (id) {
      cargarPlanilla()
      cargarBilletes()
    }
  }, [id])

  const cargarPlanilla = async () => {
    const { data } = await supabase
      .from('cuadre_planilla')
      .select('*')
      .eq('id', id)
      .single()

    setPlanilla(data)
  }

  const cargarBilletes = async () => {
    const { data } = await supabase
      .from('cuadre_billetes')
      .select('*')
      .eq('cuadre_id', id)

    setBilletesRegistrados(data || [])
  }

  const guardarBilletes = async () => {
    const registros: any[] = []

    for (const denom of billetes) {
      const cantidad = Number(cantidades[denom] || 0)

      if (cantidad > 0) {
        registros.push({
          cuadre_id: id,
          denominacion: denom,
          cantidad: cantidad
        })
      }
    }

    // Si no hay billetes, simplemente seguimos
    if (registros.length > 0) {
      const { error } = await supabase
        .from('cuadre_billetes')
        .insert(registros)

      if (error) {
        console.log(error)
        alert('Error guardando billetes')
        return
      }
    }

    setCantidades({})
    await cargarBilletes()

    // 🔥 IMPORTANTE: NO redirige automáticamente
  }

  const totalEfectivo = billetesRegistrados.reduce(
    (acc, item) => acc + Number(item.total),
    0
  )

  if (!planilla) return <p>Cargando...</p>

  return (
    <div className="page-container">
      <h2>REGISTRO DE BILLETES</h2>

      <p><strong>Empresa:</strong> {planilla.empresa}</p>
      <p><strong>Planilla No:</strong> {planilla.planilla_no}</p>

      <hr />

      {billetes.map((denom) => (
        <div key={denom} style={{ marginBottom: 10 }}>
          <label style={{ marginRight: 10, fontWeight: 600 }}>
            {denom.toLocaleString()}:
          </label>
          <input
            type="number"
            min="0"
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

      <br />

      <button className="btn-primary" onClick={guardarBilletes}>
        Guardar Billetes
      </button>

      <hr />

      <h3>BILLETES REGISTRADOS</h3>

      {billetesRegistrados.map((b) => (
        <div key={b.id}>
          {Number(b.denominacion).toLocaleString()} x {b.cantidad} = ${Number(b.total).toLocaleString()}
        </div>
      ))}

      <hr />

      <h3>TOTAL EFECTIVO: ${totalEfectivo.toLocaleString()}</h3>

      <hr />

      {/* Volver a Monedas */}
      <button
        className="btn-secondary"
        onClick={() => router.push(`/cuadre/${id}`)}
      >
        ← Volver a Monedas
      </button>

      <br /><br />

      {/* Ir a Novedades */}
      <button
        className="btn-primary"
        onClick={() => router.push(`/cuadre/${id}/novedades`)}
      >
        Ir a Novedades →
      </button>
    </div>
  )
}
