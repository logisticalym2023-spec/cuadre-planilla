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
  const [esAdmin, setEsAdmin] = useState(false)

  useEffect(() => {
    if (id) {
      verificarRol()
      cargarPlanilla()
      cargarBilletes()
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

  const cargarBilletes = async () => {
    const { data } = await supabase
      .from('cuadre_billetes')
      .select('*')
      .eq('cuadre_id', id)

    setBilletesRegistrados(data || [])
  }

  const guardarBilletes = async () => {

    // 🔒 BLOQUEO SI ESTÁ CERRADA Y NO ES ADMIN
    if (planilla.cerrado && !esAdmin) {
      alert('Esta planilla está cerrada y no puede modificarse')
      return
    }

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
  }

  const totalEfectivo = billetesRegistrados.reduce(
    (acc, item) => acc + Number(item.total),
    0
  )

  if (!planilla) return <p>Cargando...</p>

  const estaCerrada = planilla.cerrado && !esAdmin

  return (
    <div className="page-container">
      <h2>REGISTRO DE BILLETES</h2>

      {estaCerrada && (
        <p className="text-red-600 font-bold">
          PLANILLA CERRADA - SOLO ADMIN PUEDE MODIFICAR
        </p>
      )}

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

      <br />

      {!estaCerrada && (
        <button className="btn-primary" onClick={guardarBilletes}>
          Guardar Billetes
        </button>
      )}

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

      <button
        className="btn-secondary"
        onClick={() => router.push(`/cuadre/${id}`)}
      >
        ← Volver a Monedas
      </button>

      <br /><br />

      <button
        className="btn-primary"
        onClick={() => router.push(`/cuadre/${id}/novedades`)}
      >
        Ir a Novedades →
      </button>
    </div>
  )
}