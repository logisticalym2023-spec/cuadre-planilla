'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const formatVisual = (n: number) =>
  new Intl.NumberFormat('es-CO').format(n || 0)

export default function CuadrePage() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [empresa, setEmpresa] = useState('')
  const hoy = new Date().toISOString().split('T')[0]
const [fecha, setFecha] = useState(hoy)
  const [vehiculo, setVehiculo] = useState('')
  const [planillaNo, setPlanillaNo] = useState('')
  const [planillaValor, setPlanillaValor] = useState<number>(0)

  useEffect(() => {
    const storedUser = localStorage.getItem('usuario')

    if (!storedUser) {
      router.push('/')
      return
    }

    setUser(JSON.parse(storedUser))
    setLoading(false)
  }, [])

  const crearPlanilla = async () => {
    if (!empresa || !fecha || !vehiculo || !planillaNo || !planillaValor) {
      alert('Todos los campos son obligatorios')
      return
    }

    const { data, error } = await supabase
      .from('cuadre_planilla')
      .insert([
        {
          personal_id: user.id,
          empresa,
          fecha,
          vehiculo: Number(vehiculo),
          planilla_no: planillaNo,
          planilla_valor: planillaValor,
          agotado: 0,
          consignacion_brinks: 0,
          consignacion_banco: 0,
          dev_mala: 0,
          dev_paseo: 0,
          legalizado: 0,
          diferencia: 0,
          redespacho_manana: 0,
          cerrado: false
        }
      ])
      .select()
      .single()

    if (error) {
      alert('Error creando planilla')
      return
    }

    router.push(`/cuadre/${data.id}`)
  }

  if (loading) return <p>Cargando...</p>

  return (
    <div className="page-container">
      <div className="section-card" style={{ maxWidth: 500, margin: '0 auto' }}>
        
        <h2 className="section-title">Nueva Planilla</h2>

        <p><strong>Usuario:</strong> {user.nombre}</p>

        <br />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          <div>
            <label><strong>Empresa</strong></label>
            <select
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              style={{ width: '100%', marginTop: 6 }}
            >
              <option value="">Seleccione empresa</option>
              <option value="C_Nutresa">C_Nutresa</option>
              <option value="Nutrefrio">Nutrefrio</option>
            </select>
          </div>

          <div>
            <label><strong>Fecha</strong></label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              style={{ width: '100%', marginTop: 6 }}
            />
          </div>

          <div>
            <label><strong>Vehículo</strong></label>
            <select
              value={vehiculo}
              onChange={(e) => setVehiculo(e.target.value)}
              style={{ width: '100%', marginTop: 6 }}
            >
              <option value="">Seleccione vehículo</option>
              {[1,2,3,4,5,6,7,8,9].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div>
            <label><strong>Número de Planilla</strong></label>
            <input
              value={planillaNo}
              onChange={(e) => setPlanillaNo(e.target.value)}
              placeholder="Ej: 001"
              style={{ width: '100%', marginTop: 6 }}
            />
          </div>

          <div>
            <label><strong>Valor Planilla</strong></label>

            <div style={{ position: 'relative', marginTop: 6 }}>
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
                value={planillaValor === 0 ? '' : formatVisual(planillaValor)}
                onChange={(e) => {
                  const numero =
                    Number(e.target.value.replace(/[^\d]/g, '')) || 0
                  setPlanillaValor(numero)
                }}
                style={{
                  width: '100%',
                  paddingLeft: 28,
                  textAlign: 'right'
                }}
                placeholder="0"
              />
            </div>
          </div>

          <br />

          <button
            className="btn-primary"
            onClick={crearPlanilla}
          >
            Crear Planilla →
          </button>

        </div>

      </div>
    </div>
  )
}
