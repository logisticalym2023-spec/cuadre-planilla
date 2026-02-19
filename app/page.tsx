'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [ultimos4, setUltimos4] = useState('')
  const [loading, setLoading] = useState(false)

  const iniciarSesion = async () => {
    if (ultimos4.length !== 4) {
      alert('Debe ingresar 4 dígitos')
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('personal_autorizado')
      .select('*')
      .eq('ultimos_4', ultimos4)
      .eq('activo', true)
      .single()

    if (error || !data) {
      alert('Usuario no autorizado')
      setLoading(false)
      return
    }

    localStorage.setItem('usuario', JSON.stringify(data))

    router.push('/dashboard')
  }

  return (
    <div className="page-container">
      <div className="section-card" style={{ maxWidth: 400, margin: '0 auto' }}>
        
        <h2 className="section-title">Ingreso al Sistema</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <input
            type="password"
            maxLength={4}
            placeholder="Últimos 4 dígitos"
            value={ultimos4}
            onChange={(e) => setUltimos4(e.target.value)}
            style={{ width: '100%' }}
          />

          <button
            className="btn-primary"
            onClick={iniciarSesion}
            disabled={loading}
          >
            {loading ? 'Validando...' : 'Ingresar'}
          </button>

        </div>

      </div>
    </div>
  )
}
